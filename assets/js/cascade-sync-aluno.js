// [TAG-CASCADE-SYNC] cascade-sync-aluno.js
// Responsabilidade: Sincronização em cascata quando um aluno é atualizado
// Propósito: Atualizar todos os agendamentos futuros do aluno (nome, local) em MongoDB
// Depende de: state.js (window.aulas, window.alunos)

/**
 * [TAG-ENRICH-APPOINTMENT] Enriquece um agendamento com dados FRESCOS do aluno
 * Chamado logo antes de enviar agendamento para GCal para garantir dados atualizados
 * 
 * @param {Object} agendamento - Agendamento que pode ter dados obsoletos
 * @returns {Object} Agendamento com dados frescos do aluno
 */
function enriquecerAgendamentoComDadosFrescos(agendamento) {
    if (!agendamento || !agendamento.alunoId) {
        return agendamento;
    }

    const aluno = typeof window.getAluno === 'function'
        ? window.getAluno(agendamento.alunoId)
        : ((Array.isArray(window.alunos) ? window.alunos : []).find(function (a) { return a.id === agendamento.alunoId; }) || null);

    if (aluno) {
        // Atualiza o agendamento com dados frescos do aluno
        agendamento.alunoNome = aluno.nome || agendamento.alunoNome;
        agendamento.local = aluno.local || agendamento.local;
        agendamento.objetivo = aluno.objetivo || agendamento.objetivo;

        window.log.debug('[enrich]', 'Agendamento enriquecido com dados frescos', {
            alunoNome: agendamento.alunoNome,
            local: agendamento.local,
            objetivo: agendamento.objetivo
        });
    }

    return agendamento;
}

// Expõe globalmente para ser usado antes de salvar agendamento
window.enriquecerAgendamentoComDadosFrescos = enriquecerAgendamentoComDadosFrescos;

/**
 * [TAG-CASCADE-UPDATE] Sincroniza agendamentos futuros de um aluno após edição do perfil
 * 1. Encontra todos os agendamentos futuros para este aluno
 * 2. Atualiza cada agendamento em MongoDB com o novo nome/local do aluno
 *
 * @param {string} alunoId - ID do aluno que foi atualizado
 * @param {Object} alunoNovosDados - Novos dados do aluno { nome, local, objetivo }
 */
async function sincronizarAgendamentosDoAluno(alunoId, alunoNovosDados) {
    if (!alunoId || !alunoNovosDados) {
        window.log.warn('[cascade]', 'sincronizarAgendamentosDoAluno: parâmetros inválidos');
        return;
    }

    try {
        // 1. Encontra agendamentos deste aluno que precisam ser atualizados.
        //
        // Regras de inclusão:
        //   - Séries recorrentes (frequencia === 'semanal'): sempre incluídas — o documento
        //     representa a série inteira (passado + futuro). O GCal recebe um único evento
        //     recorrente, então deve ser atualizado independente da data do campo `data`.
        //   - Eventos pontuais (frequencia === 'uma_vez'): incluídos apenas se a data for
        //     hoje ou futura. `aula.data` está em PT-BR (dd/mm/yyyy), então convertemos
        //     para ISO antes de comparar com a data de hoje.
        //
        // Bloqueios sem alunoId já são excluídos pelo primeiro predicado (alunoId ===).
        // Eventos externos (source === 'google_external') são filtrados em _persistirAgendamentosNoBackend.
        const hojeIso = new Date().toISOString().slice(0, 10);

        function _dataAulaEhFutura(aula) {
            if (aula.frequencia === 'semanal') return true;
            if (!aula.data) return false;
            const iso = typeof window.converterPtBrParaISO === 'function'
                ? window.converterPtBrParaISO(aula.data)
                : null;
            return iso ? iso >= hojeIso : false;
        }

        const agendamentosFuturos = (window.aulas || []).filter(function (aula) {
            return aula.alunoId === alunoId
                && aula.tipo !== 'bloqueio'
                && _dataAulaEhFutura(aula);
        });

        if (agendamentosFuturos.length === 0) {
            window.log.debug('[cascade]', 'Nenhum agendamento futuro para o aluno', { id: alunoId });
            return;
        }

        const series = agendamentosFuturos.filter(function (a) { return a.frequencia === 'semanal'; }).length;
        const pontuais = agendamentosFuturos.length - series;
        window.log.debug('[cascade]', 'Encontrados agendamentos para atualizar', {
            total: agendamentosFuturos.length,
            series: series,
            pontuais: pontuais
        });

        // 2. Atualiza cada agendamento localmente com os novos dados
        agendamentosFuturos.forEach(function (aula) {
            aula.alunoNome = alunoNovosDados.nome;
            aula.local = alunoNovosDados.local;
            aula.objetivo = alunoNovosDados.objetivo; // Novo campo opcional
        });

        // 3. Persiste as mudanças no MongoDB
        await _persistirAgendamentosNoBackend(agendamentosFuturos);

        window.log.info('[aluno]', 'Cascade concluído', {
            id: alunoId,
            agendamentosAfetados: agendamentosFuturos.length
        });
        if (typeof mostrarToast === 'function') {
            mostrarToast('✅ ' + agendamentosFuturos.length + ' agendamento(s) atualizado(s) com os novos dados do aluno!', 'success');
        }

    } catch (err) {
        if (err && (err.message === 'AUTH_REQUIRED' || err.code === 'AUTH_REQUIRED')) {
            window.log.warn('[cascade]', 'Sessão Google ausente ou expirada. Login necessário para sincronizar agendamentos.');
            if (typeof mostrarToast === 'function') {
                mostrarToast('Faça login com Google para sincronizar os agendamentos.', 'warning');
            }
            return;
        }
        window.log.error('[cascade]', 'Erro ao sincronizar agendamentos do aluno', err);
        if (typeof mostrarToast === 'function') {
            mostrarToast('⚠️ Erro ao atualizar agendamentos. Verifique o console.', 'warning');
        }
    }
}

/**
 * Persiste agendamentos atualizados no backend MongoDB
 * @param {Array} agendamentos - Array de agendamentos para atualizar
 */
async function _persistirAgendamentosNoBackend(agendamentos) {
    try {
        const aulasData = agendamentos.filter(a => a.source !== 'google_external');

        const executar = typeof window.executarOperacaoRemotaComFeedback === 'function'
            ? window.executarOperacaoRemotaComFeedback
            : async (fn) => fn();
        const apiFetch = typeof window.apiFetchBackend === 'function'
            ? window.apiFetchBackend
            : async function () {
                throw new Error('AUTH_REQUIRED');
            };

        const res = await executar(async function () {
            for (const agendamento of aulasData) {
                if (!agendamento || !agendamento.id) continue;

                const rota = 'https://personal-app-api.vercel.app/api/agendamentos/' + encodeURIComponent(agendamento.id);
                let resp = await apiFetch(rota, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(agendamento)
                });

                if (resp.status === 404) {
                    resp = await apiFetch('https://personal-app-api.vercel.app/api/agendamentos', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(agendamento)
                    });
                }

                if (!resp.ok) {
                    return resp;
                }
            }

            return { ok: true, status: 200 };
        }, {
            onRetry: function () {
                return _persistirAgendamentosNoBackend(agendamentos);
            }
        });

        if (!res.ok) {
            throw new Error('Backend retornou ' + res.status);
        }

        window.log.debug('[cascade]', 'Agendamentos persistidos no MongoDB');
    } catch (err) {
        if (err && (err.message === 'AUTH_REQUIRED' || err.code === 'AUTH_REQUIRED')) {
            throw err;
        }
        window.log.error('[cascade]', 'Erro ao persistir agendamentos no backend', err);
        throw err;
    }
}

// Expõe globalmente
window.sincronizarAgendamentosDoAluno = sincronizarAgendamentosDoAluno;
