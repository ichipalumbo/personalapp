// [TAG-CASCADE-SYNC] cascade-sync-aluno.js
// Responsabilidade: Sincronização em cascata quando um aluno é atualizado
// Propósito: Atualizar todos os agendamentos futuros do aluno (nome, local) em MongoDB e GCal
// Depende de: state.js (window.aulas, window.alunos), google-calendar.js (window.gcal, window.salvarEventoComGCal)

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

    // Busca dados frescos do aluno
    if (typeof window.alunos !== 'undefined' && Array.isArray(window.alunos)) {
        const aluno = window.alunos.find(function (a) { return a.id === agendamento.alunoId; });
        if (aluno) {
            // Atualiza o agendamento com dados frescos do aluno
            agendamento.alunoNome = aluno.nome || agendamento.alunoNome;
            agendamento.local = aluno.local || agendamento.local;
            agendamento.objetivo = aluno.objetivo || agendamento.objetivo;
            
            console.log('[enrich] Agendamento enriquecido com dados frescos:', {
                alunoNome: agendamento.alunoNome,
                local: agendamento.local,
                objetivo: agendamento.objetivo
            });
        }
    }

    return agendamento;
}

// Expõe globalmente para ser usado antes de salvar agendamento
window.enriquecerAgendamentoComDadosFrescos = enriquecerAgendamentoComDadosFrescos;

/**
 * [TAG-CASCADE-UPDATE] Sincroniza agendamentos futuros de um aluno após edição do perfil
 * 1. Encontra todos os agendamentos futuros para este aluno
 * 2. Atualiza cada agendamento em MongoDB com o novo nome/local do aluno
 * 3. Para agendamentos com googleCalendarEventId, atualiza o evento no GCal
 * 
 * @param {string} alunoId - ID do aluno que foi atualizado
 * @param {Object} alunoNovosDados - Novos dados do aluno { nome, local, objetivo }
 */
async function sincronizarAgendamentosDoAluno(alunoId, alunoNovosDados) {
    if (!alunoId || !alunoNovosDados) {
        console.warn('[cascade] sincronizarAgendamentosDoAluno: parâmetros inválidos');
        return;
    }

    try {
        // 1. Encontra agendamentos futuros deste aluno
        const hoje = new Date().toISOString().slice(0, 10);
        const agendamentosFuturos = (window.aulas || []).filter(function (aula) {
            return aula.alunoId === alunoId 
                && aula.data 
                && aula.data >= hoje
                && aula.tipo === 'aula'; // Só atualiza aulas, não bloqueios
        });

        if (agendamentosFuturos.length === 0) {
            console.log('[cascade] Nenhum agendamento futuro para o aluno', alunoId);
            return;
        }

        console.log('[cascade] Encontrados ' + agendamentosFuturos.length + ' agendamento(s) futuro(s) para atualizar.');

        // 2. Atualiza cada agendamento localmente com os novos dados
        agendamentosFuturos.forEach(function (aula) {
            aula.alunoNome = alunoNovosDados.nome;
            aula.local = alunoNovosDados.local;
            aula.objetivo = alunoNovosDados.objetivo; // Novo campo opcional
        });

        // 3. Persiste as mudanças no MongoDB
        await _persistirAgendamentosNoBackend(agendamentosFuturos);

        // 4. Se autenticado no GCal, atualiza os eventos no Google Calendar
        if (window.gcal && window.gcal.isSignedIn()) {
            await _atualizarAgendamentosNoGCal(agendamentosFuturos);
        }

        console.log('[cascade] ✅ Cascade sync concluído para ' + agendamentosFuturos.length + ' agendamento(s).');
        if (typeof mostrarToast === 'function') {
            mostrarToast('✅ ' + agendamentosFuturos.length + ' agendamento(s) atualizado(s) com os novos dados do aluno!', 'success');
        }

    } catch (err) {
        console.error('[cascade] Erro ao sincronizar agendamentos do aluno:', err);
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
        
        const res = await fetch('https://personal-app-api.vercel.app/api/agendamentos/sincronizar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agendamentos: aulasData })
        });

        if (!res.ok) {
            throw new Error('Backend retornou ' + res.status);
        }

        console.log('[cascade] ✅ Agendamentos persistidos no MongoDB');
    } catch (err) {
        console.error('[cascade] Erro ao persistir agendamentos no backend:', err);
        throw err;
    }
}

/**
 * Atualiza eventos no Google Calendar usando o token do frontend
 * @param {Array} agendamentos - Array de agendamentos com googleCalendarEventId
 */
async function _atualizarAgendamentosNoGCal(agendamentos) {
    if (!window.gcal) {
        console.warn('[cascade] Google Calendar não disponível');
        return;
    }

    const agendamentosComGCal = agendamentos.filter(function (a) {
        return a.googleCalendarEventId;
    });

    if (agendamentosComGCal.length === 0) {
        console.log('[cascade] Nenhum agendamento com googleCalendarEventId para atualizar');
        return;
    }

    console.log('[cascade] Atualizando ' + agendamentosComGCal.length + ' evento(s) no Google Calendar...');

    let sucessos = 0;
    let erros = 0;

    for (const agendamento of agendamentosComGCal) {
        try {
            // Usa a função existente updateEvent que já constrói o payload correto
            await window.gcal.updateEvent(agendamento.googleCalendarEventId, agendamento);
            sucessos++;
            console.log('[cascade] ✅ GCal atualizado para agendamento ' + agendamento.id);
        } catch (err) {
            erros++;
            console.warn('[cascade] ❌ Erro ao atualizar GCal para ' + agendamento.id + ':', err.message);
        }
    }

    console.log('[cascade] GCal sync: ' + sucessos + ' sucesso(s), ' + erros + ' erro(s)');
}

// Expõe globalmente
window.sincronizarAgendamentosDoAluno = sincronizarAgendamentosDoAluno;
