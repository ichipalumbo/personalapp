// [TAG-MODAL-ACAO-SLOT] modal-acao-slot.js
// Responsabilidade: Modais de ação sobre slots existentes — Edição, Cancelamento, Reagendamento e Reposição
// Depende de: state.js (aulas, alunos, aulasParaRepor, HORARIOS), storage.js (salvarDados),
//             utils-datetime.js (somarMinutos, diferencaMinutos, converterPtBrParaISO, getDataSelecionadaPtBr, formatarDataPtBrLegivel),
//             widget-stepper-duracao.js (aplicarLimitesDuracaoPorContexto, sincronizarSteppersDuracao),
//             widget-bloqueio.js (ehBloqueioDiaInteiroCompromisso, atualizarEstadoBloqueioDiaInteiroEdicao),
//             agenda-conflitos.js (getCompromissoSerializadoParaConflito, getConflitosNoDia, getDatasConflitoRecorrencia, getConflitosRecorrenciaEmDatas, gerarResumoConflitosDatas),
//             utils-kpi.js (mostrarToast), view-home.js (inicializarHome, dataSelecionada, dataAlvoAcaoStr — em runtime)
// Expõe: window.idCompromissoSelecionado, window.abrirModalAcaoSlot, window.fecharModalAcaoSlot,
//         window.atualizarAvisoConflitoEdicao, window.getLabelEscopoRecorrencia,
//         window.getResumoEscopoRecorrencia, window.atualizarResumoEscopoRecorrencia,
//         window.configurarEscopoRecorrenciaEdicao, window.abrirReagendarAulaModalSlot,
//         window.iniciarReagendamentoReposicao, window.fecharReagendarAulaModal,
//         window.togglePainelReposicoes, window.renderizarListaReposicoes, window.resolverReposicao

// Exposto em window para acesso cross-módulo (widget-stepper-duracao usa para edicao)
window.idCompromissoSelecionado = window.idCompromissoSelecionado || "";

// ── Escopo de Edição da Recorrência ───────────────────────────────────────────────────────────

/** @param {string} escopo @returns {string} label curto do escopo */
window.getLabelEscopoRecorrencia = function(escopo) {
    if (escopo === 'occurrence') return 'Somente esta aula';
    if (escopo === 'monthOfDate') return 'Este mês todo';
    if (escopo === 'entireSeries') return 'Todas as aulas da série';
    return 'Daqui pra frente';
};

/** @param {string} escopo @returns {string} descrição completa do escopo */
window.getResumoEscopoRecorrencia = function(escopo) {
    if (escopo === 'occurrence') return 'Vai aplicar somente nesta aula específica.';
    if (escopo === 'monthOfDate') return 'Vai aplicar nas aulas deste mês.';
    if (escopo === 'entireSeries') return 'Vai aplicar na série inteira.';
    return 'Vai aplicar nesta aula e nas próximas da série.';
};

window.atualizarResumoEscopoRecorrencia = function() {
    const inputEscopo = document.getElementById('editEscopoRecorrencia');
    const resumo = document.getElementById('editEscopoResumo');
    if (!inputEscopo || !resumo) return;
    resumo.textContent = window.getResumoEscopoRecorrencia(inputEscopo.value || 'fromDate');
};

window.configurarEscopoRecorrenciaEdicao = function() {
    const grid = document.getElementById('editEscopoRecorrenciaGrid');
    const inputEscopo = document.getElementById('editEscopoRecorrencia');
    if (!grid || !inputEscopo) return;

    grid.querySelectorAll('.btn-escopo-recorrencia').forEach(btn => {
        const novoBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(novoBtn, btn);
        novoBtn.addEventListener('click', () => {
            const escopo = novoBtn.dataset.escopo || 'fromDate';
            inputEscopo.value = escopo;
            grid.querySelectorAll('.btn-escopo-recorrencia').forEach(b => {
                b.classList.toggle('active', b.dataset.escopo === escopo);
            });
            window.atualizarResumoEscopoRecorrencia();
            window.atualizarAvisoConflitoEdicao();
        });
    });

    inputEscopo.value = 'fromDate';
    window.atualizarResumoEscopoRecorrencia();
};

// ── Modal: Ação sobre Slot ─────────────────────────────────────────────────────────────────────

window.abrirModalAcaoSlot = function(id) {
    window.idCompromissoSelecionado = id;
    const modal = document.getElementById('modalAcaoSlot');
    const compromisso = aulas.find(a => a.id === id);
    if (!compromisso) return;

    const freq = compromisso.frequencia || 'uma_vez';
    document.getElementById('editCompromissoFrequencia').value = freq;

    const badge = document.getElementById('badgeTipoCompromisso');
    const containerDiaSemana = document.getElementById('editDiaSemanaContainer');

    const acoesUnico = document.getElementById('acoesCompromissoUnico');
    const acoesRecorrente = document.getElementById('acoesCompromissoRecorrente');
    const btnMandarReposicao = document.getElementById('btnMandarParaReposicao');
    const btnReagendarInstancia = document.getElementById('btnReagendarInstancia');
    const recorrenteTopRow = document.querySelector('#acoesCompromissoRecorrente > div');

    const dataAlvoStr = window.dataAlvoAcaoStr || window.dataSelecionada.toLocaleDateString('pt-BR');
    const containerEscopo = document.getElementById('editEscopoRecorrenciaContainer');
    const inputEscopo = document.getElementById('editEscopoRecorrencia');
    const impactoEscopo = document.getElementById('editEscopoImpacto');
    const tipo = compromisso.tipo || 'aula';

    if (tipo !== 'aula') {
        if (btnMandarReposicao) btnMandarReposicao.style.display = 'none';
        if (btnReagendarInstancia) btnReagendarInstancia.style.display = 'none';
        if (acoesUnico) acoesUnico.style.gridTemplateColumns = '1fr';
        if (recorrenteTopRow) recorrenteTopRow.style.gridTemplateColumns = '1fr';
    } else {
        if (btnMandarReposicao) btnMandarReposicao.style.display = 'inline-flex';
        if (btnReagendarInstancia) btnReagendarInstancia.style.display = 'inline-flex';
        if (acoesUnico) acoesUnico.style.gridTemplateColumns = '1fr 1fr';
        if (recorrenteTopRow) recorrenteTopRow.style.gridTemplateColumns = '1fr 1fr';
    }

    if (freq === 'semanal') {
        const padraoNome = compromisso.tipoRecorrencia ? compromisso.tipoRecorrencia.toUpperCase() : "SEMANAL";
        badge.innerHTML = `<i class="fa-solid fa-infinity"></i> ${padraoNome}`;
        badge.className = "modal-badge badge-aula"; 
        
        containerDiaSemana.style.display = 'block';
        document.getElementById('editDiaSemana').value = compromisso.dia || "Segunda";
        document.getElementById('editInfoDia').textContent = `Série Recorrente • Gerenciando dia: ${dataAlvoStr}`;
        if (containerEscopo) containerEscopo.style.display = 'block';
        if (inputEscopo) inputEscopo.value = 'fromDate';
        document.querySelectorAll('#editEscopoRecorrenciaGrid .btn-escopo-recorrencia').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.escopo === 'fromDate');
        });
        if (impactoEscopo) {
            impactoEscopo.textContent = `Escopo atual: ${window.getLabelEscopoRecorrencia('fromDate')}`;
        }
        window.atualizarResumoEscopoRecorrencia();
        window.atualizarAvisoConflitoEdicao();
        if (acoesUnico) acoesUnico.style.display = 'none';
        if (acoesRecorrente) acoesRecorrente.style.display = 'flex';
    } else {
        badge.innerHTML = `<i class="fa-solid fa-calendar-day"></i> ÚNICO`;
        badge.className = "modal-badge badge-desloc"; 
        
        containerDiaSemana.style.display = 'none';
        document.getElementById('editInfoDia').textContent = `Agendado para: ${compromisso.data || compromisso.dia}`;
        if (containerEscopo) containerEscopo.style.display = 'none';
        if (impactoEscopo) impactoEscopo.textContent = '';
        if (acoesUnico) acoesUnico.style.gridTemplateColumns = '1fr 1fr';
        if (acoesUnico) acoesUnico.style.display = 'grid';
        if (acoesRecorrente) acoesRecorrente.style.display = 'none';
    }
    
    const selectInicio = document.getElementById('editHoraInicio');
    const selectDuracao = document.getElementById('editDuracao');
    
    const optionsHtml = HORARIOS.map(h => `<option value="${h}">${h}</option>`).join('');
    selectInicio.innerHTML = optionsHtml;
    selectInicio.value = compromisso.horarioInicio;

    const minutes = window.diferencaMinutos(compromisso.horarioInicio, compromisso.horarioFim);
    selectDuracao.value = minutes.toString();
    window.aplicarLimitesDuracaoPorContexto('edicao');
    window.sincronizarSteppersDuracao();

    const camposAula = document.getElementById('editCamposTipoAula');
    const camposBloqueio = document.getElementById('editCamposTipoBloqueio');
    const camposBloqueioDiaInteiro = document.getElementById('editCamposTipoBloqueioDiaInteiro');
    const checkDiaInteiro = document.getElementById('editBloqueioDiaInteiro');
    const ehDiaInteiro = window.ehBloqueioDiaInteiroCompromisso(compromisso);

    if (tipo === 'aula') {
        camposAula.style.display = 'block';
        camposBloqueio.style.display = 'none';
        if (camposBloqueioDiaInteiro) camposBloqueioDiaInteiro.style.display = 'none';
        if (checkDiaInteiro) checkDiaInteiro.checked = false;
        window.atualizarEstadoBloqueioDiaInteiroEdicao();

        const selectAluno = document.getElementById('editAluno');
        if (selectAluno) {
            selectAluno.innerHTML = alunos.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
            selectAluno.value = compromisso.alunoId;
        }
    } else if (tipo === 'deslocamento') {
        camposAula.style.display = 'none';
        camposBloqueio.style.display = 'none';
        if (camposBloqueioDiaInteiro) camposBloqueioDiaInteiro.style.display = 'none';
        if (checkDiaInteiro) checkDiaInteiro.checked = false;
        window.atualizarEstadoBloqueioDiaInteiroEdicao();
    } else if (tipo === 'bloqueio') {
        camposAula.style.display = 'none';
        camposBloqueio.style.display = 'block';
        if (camposBloqueioDiaInteiro) camposBloqueioDiaInteiro.style.display = 'block';
        if (checkDiaInteiro) checkDiaInteiro.checked = ehDiaInteiro;
        window.atualizarEstadoBloqueioDiaInteiroEdicao();
        document.getElementById('editDescricao').value = compromisso.descricao || '';
    }

    if (modal) modal.style.display = 'flex';
};

window.fecharModalAcaoSlot = function() {
    document.getElementById('modalAcaoSlot').style.display = 'none';
};

window.atualizarAvisoConflitoEdicao = function() {
    const impacto = document.getElementById('editEscopoImpacto');
    const compromisso = aulas.find(a => a.id === window.idCompromissoSelecionado);
    if (!impacto || !compromisso) return;

    const freq = compromisso.frequencia || 'uma_vez';
    const escopo = document.getElementById('editEscopoRecorrencia')?.value || 'fromDate';
    impacto.textContent = `Escopo atual: ${window.getLabelEscopoRecorrencia(escopo)}`;

    if (freq !== 'semanal') return;

    const dataAlvoStr = window.dataAlvoAcaoStr || window.getDataSelecionadaPtBr();
    const ehDiaInteiroEdicao = document.getElementById('editBloqueioDiaInteiro')?.checked
        && (compromisso.tipo || 'aula') === 'bloqueio';
    const horarioInicio = ehDiaInteiroEdicao
        ? window.BLOQUEIO_DIA_INTEIRO_INICIO
        : (document.getElementById('editHoraInicio')?.value || compromisso.horarioInicio);
    const horarioFim = ehDiaInteiroEdicao
        ? window.BLOQUEIO_DIA_INTEIRO_FIM
        : window.somarMinutos(
            horarioInicio,
            document.getElementById('editDuracao')?.value || window.diferencaMinutos(compromisso.horarioInicio, compromisso.horarioFim)
        );
    const candidato = window.getCompromissoSerializadoParaConflito({
        ...compromisso,
        horarioInicio,
        horarioFim,
        fullDay: ehDiaInteiroEdicao
    }, dataAlvoStr);

    if (escopo === 'occurrence') {
        const iso = window.converterPtBrParaISO(dataAlvoStr);
        if (!iso) return;
        const data = new Date(`${iso}T12:00:00`);
        const conflitos = window.getConflitosNoDia(candidato, data, { ignorarIds: [compromisso.id] });
        if (conflitos.length > 0) {
            impacto.textContent = `Conflito detectado em ${window.formatarDataPtBrLegivel(dataAlvoStr)}.`;
        }
        return;
    }

    const datas = window.getDatasConflitoRecorrencia(candidato, 16);
    const conflitos = window.getConflitosRecorrenciaEmDatas(candidato, datas, { ignorarIds: [compromisso.id] });
    if (conflitos.length > 0) {
        impacto.textContent = `Conflitos previstos em: ${window.gerarResumoConflitosDatas(conflitos, 4)}.`;
    }
};

// ── Modal: Reagendar Aula ──────────────────────────────────────────────────────────────────────

window.abrirReagendarAulaModalSlot = function(dia, hora) {
    window.reagendamentoDirectCardId = null;

    const modal = document.getElementById('modalReagendarAula');
    if (!modal) return;
    document.getElementById('containerSeletorReagendarAluno').style.display = 'block';
    document.getElementById('containerLockReagendarAluno').style.display = 'none';
    const selectAluno = document.getElementById('reagendarAluno');
    if (selectAluno) {
        const alunosComFila = [];
        const idsUnicos = new Set();
        
        aulasParaRepor.forEach(rep => {
            if (!idsUnicos.has(rep.alunoId)) {
                idsUnicos.add(rep.alunoId);
                const alunoObj = window.getAluno(rep.alunoId);
                if (alunoObj) {
                    alunosComFila.push(alunoObj);
                }
            }
        });

        if (alunosComFila.length === 0) {
            selectAluno.innerHTML = '<option value="">Não existem alunos com reposição pendente!</option>';
        } else {
            selectAluno.innerHTML = '<option value="">Selecione o aluno...</option>' + 
                alunosComFila.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
        }
    }
    document.getElementById('reagendarDia').value = dia;

    const selectInicio = document.getElementById('reagendarHoraInicio');
    const optionsHtml = HORARIOS.map(h => `<option value="${h}">${h}</option>`).join('');
    selectInicio.innerHTML = optionsHtml;
    selectInicio.value = hora;

    const nomeDiaReagendamento = (dia === 'Sábado' || dia === 'Domingo') ? dia : `${dia}-feira`;
    document.getElementById('infoReagendamentoSlot').textContent = `Agendar reposição às ${hora} de ${nomeDiaReagendamento}`;

    modal.style.display = 'flex';
};

window.iniciarReagendamentoReposicao = function(id) {
    const rep = aulasParaRepor.find(r => r.id === id);
    if (!rep) return;
    window.reagendamentoDirectCardId = id;

    const modal = document.getElementById('modalReagendarAula');
    if (!modal) return;
    document.getElementById('containerSeletorReagendarAluno').style.display = 'none';
    document.getElementById('containerLockReagendarAluno').style.display = 'block';

    const aluno = window.getAluno(rep.alunoId);
    document.getElementById('reagendarAlunoLockedNome').textContent = aluno ? aluno.nome : 'Aluno';
    document.getElementById('reagendarAlunoIdLocked').value = rep.alunoId;
    const diaTexto = window.getDiaTextoSelecionado();
    document.getElementById('reagendarDia').value = diaTexto;

    const selectInicio = document.getElementById('reagendarHoraInicio');
    const optionsHtml = HORARIOS.map(h => `<option value="${h}">${h}</option>`).join('');
    selectInicio.innerHTML = optionsHtml;
    selectInicio.value = window.horarioSelecionadoSlot || "08:00"; 

    document.getElementById('infoReagendamentoSlot').textContent = `Agendamento direto • Fila de espera`;

    modal.style.display = 'flex';
};

window.fecharReagendarAulaModal = function() {
    const modal = document.getElementById('modalReagendarAula');
    if (modal) {
        modal.style.display = 'none';
    }
    window.reagendamentoDirectCardId = null;
};

// ── Painel de Reposições Pendentes ────────────────────────────────────────────────────────────

window.togglePainelReposicoes = function() {
    const painel = document.getElementById('painelReposicoesPendentes');
    if (painel.style.display === 'none') {
        painel.style.display = 'block';
        window.renderizarListaReposicoes();
    } else {
        painel.style.display = 'none';
    }
};

window.renderizarListaReposicoes = function() {
    const container = document.getElementById('listaReposicoesPendentes');
    if (!container) return;
    if (!aulasParaRepor || aulasParaRepor.length === 0) {
        container.innerHTML = `<p style="font-size: 0.8rem; color: #666; text-align: center; padding: 10px;">Sem reposições pendentes.</p>`;
        return;
    }
    container.innerHTML = aulasParaRepor.map(rep => {
        const aluno = window.getAluno(rep.alunoId);
        return `
            <div class="aluno-card" style="border-left-color: #FF5252; display: flex; flex-direction: column; gap: 10px; padding: 12px 14px; background: #222;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <strong style="display: block; color: #FFF; font-size: 0.9rem;">${aluno ? aluno.nome : 'Aluno'}</strong>
                        <span style="font-size: 0.72rem; color: #FF5252; font-weight: 600;">Cancelada em ${rep.dataCancelamento}</span>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <button class="btn btn-primary btn-sm" onclick="iniciarReagendamentoReposicao('${rep.id}')" style="background: #FFD700; color: #0D0D0D; font-size: 0.7rem; border: none; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="fa-solid fa-calendar-check"></i> Reagendar
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="resolverReposicao('${rep.id}')" style="background: #111; color: #AAA; border: 1px solid #333; font-size: 0.7rem; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="fa-solid fa-trash"></i> Descartar
                    </button>
                </div>
            </div>
        `;
    }).join('');
};

window.resolverReposicao = function(id) {
    aulasParaRepor = aulasParaRepor.filter(r => r.id !== id);
    if (typeof salvarDados === 'function') salvarDados();
    window.inicializarHome();
};

// ── Event Listeners (DOMContentLoaded) ────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    window.configurarEscopoRecorrenciaEdicao();

    const formReagendarAula = document.getElementById('formReagendarAula');
    if (formReagendarAula) {
        formReagendarAula.addEventListener('submit', (e) => {
            e.preventDefault();
            
            let alunoId = "";
            let repId = "";

            if (window.reagendamentoDirectCardId) {
                const repObj = aulasParaRepor.find(r => r.id === window.reagendamentoDirectCardId);
                if (!repObj) return;
                alunoId = repObj.alunoId;
                repId = repObj.id;
            } else {
                alunoId = document.getElementById('reagendarAluno').value;
                if (!alunoId) {
                    alert("Selecione um aluno para agendar a reposição.");
                    return;
                }
                const repObj = aulasParaRepor.find(r => r.alunoId === alunoId);
                if (repObj) {
                    repId = repObj.id;
                }
            }

            const dia = document.getElementById('reagendarDia').value;
            const hInicio = document.getElementById('reagendarHoraInicio').value;
            const duracao = document.getElementById('reagendarDuracao').value;
            const hFim = window.somarMinutos(hInicio, duracao);
            let novoCompromisso = {
                id: Date.now().toString(),
                dia: dia,
                data: window.dataSelecionada.toLocaleDateString('pt-BR'),
                horarioInicio: hInicio,
                horarioFim: hFim,
                tipo: 'aula',
                alunoId: alunoId,
                frequencia: 'uma_vez',
                isReposicao: true,
                reagendada: true
            };

            aulas.push(novoCompromisso);
            if (repId) {
                aulasParaRepor = aulasParaRepor.filter(r => r.id !== repId);
            }

            if (typeof salvarDados === 'function') salvarDados();

            window.fecharReagendarAulaModal();
            window.inicializarHome();
            if (typeof mostrarToast === 'function') mostrarToast('✅ Reposição marcada com sucesso!');
        });
    }

    const formEditar = document.getElementById('formEditarCompromisso');
    if (formEditar) {
        formEditar.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const compromisso = aulas.find(a => a.id === window.idCompromissoSelecionado);
            if (!compromisso) return;

            const tipo = compromisso.tipo || 'aula';
            const diaInteiro = tipo === 'bloqueio' && document.getElementById('editBloqueioDiaInteiro')?.checked;
            const hInicio = diaInteiro ? window.BLOQUEIO_DIA_INTEIRO_INICIO : document.getElementById('editHoraInicio').value;
            const duracaoMinutos = diaInteiro
                ? window.BLOQUEIO_DIA_INTEIRO_DURACAO
                : parseInt(document.getElementById('editDuracao').value, 10);
            const hFim = diaInteiro ? window.BLOQUEIO_DIA_INTEIRO_FIM : window.somarMinutos(hInicio, duracaoMinutos);
            const freq = document.getElementById('editCompromissoFrequencia').value;
            const escopoRecorrencia = document.getElementById('editEscopoRecorrencia')?.value || 'fromDate';
            const dataAlvoStr = window.dataAlvoAcaoStr || window.getDataSelecionadaPtBr();

            if (!diaInteiro && hInicio >= hFim) {
                alert("O horário de término deve ser posterior ao início!");
                return;
            }
            if (tipo === 'bloqueio' && !diaInteiro && duracaoMinutos > window.BLOQUEIO_MAX_MINUTOS) {
                alert('Bloqueios por hora podem ter no máximo 8h. Para mais tempo, use dia inteiro.');
                return;
            }
            if ((tipo === 'aula' || tipo === 'deslocamento') && duracaoMinutos > window.DURACAO_MAX_AULA_DESLOCAMENTO) {
                alert('Aulas e deslocamentos podem ter no máximo 2h.');
                return;
            }

            const candidato = window.getCompromissoSerializadoParaConflito({
                ...compromisso,
                horarioInicio: hInicio,
                horarioFim: hFim,
                fullDay: diaInteiro
            }, dataAlvoStr);

            if (freq === 'semanal') {
                if (escopoRecorrencia === 'occurrence') {
                    const iso = window.converterPtBrParaISO(dataAlvoStr);
                    if (!iso) {
                        alert('Não foi possível identificar a data da aula.');
                        return;
                    }
                    const data = new Date(`${iso}T12:00:00`);
                    const conflitos = window.getConflitosNoDia(candidato, data, { ignorarIds: [compromisso.id] });
                    if (conflitos.length > 0) {
                        alert(`Conflito detectado com ${conflitos[0].nome} (${conflitos[0].faixa}).`);
                        return;
                    }

                    if (!Array.isArray(compromisso.excecoes)) compromisso.excecoes = [];
                    if (!Array.isArray(compromisso.excecoesDetalhadas)) compromisso.excecoesDetalhadas = [];
                    if (!compromisso.excecoes.includes(dataAlvoStr)) compromisso.excecoes.push(dataAlvoStr);

                    const novoId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                    const novoCompromisso = {
                        ...compromisso,
                        id: novoId,
                        frequencia: 'uma_vez',
                        data: dataAlvoStr,
                        dia: compromisso.dia,
                        horarioInicio: hInicio,
                        horarioFim: hFim,
                        fullDay: diaInteiro,
                        excecoes: [],
                        excecoesDetalhadas: []
                    };
                    aulas.push(novoCompromisso);
                } else {
                    const datas = window.getDatasConflitoRecorrencia(candidato, 20);
                    const conflitos = window.getConflitosRecorrenciaEmDatas(candidato, datas, { ignorarIds: [compromisso.id] });
                    if (conflitos.length > 0) {
                        const resumo = window.gerarResumoConflitosDatas(conflitos, 5);
                        alert(`Não foi possível salvar. Existem conflitos em: ${resumo}.`);
                        return;
                    }

                    compromisso.horarioInicio = hInicio;
                    compromisso.horarioFim = hFim;
                    compromisso.fullDay = diaInteiro;
                    compromisso.recorrenciaEscopo = escopoRecorrencia;
                    compromisso.recorrenciaDataInicio = dataAlvoStr;
                    if (escopoRecorrencia === 'monthOfDate') {
                        compromisso.dataCriacao = new Date(`${window.converterPtBrParaISO(dataAlvoStr)}T12:00:00`).toISOString();
                    }
                }
            } else {
                const iso = window.converterPtBrParaISO(dataAlvoStr);
                if (iso) {
                    const data = new Date(`${iso}T12:00:00`);
                    const conflitos = window.getConflitosNoDia(candidato, data, { ignorarIds: [compromisso.id] });
                    if (conflitos.length > 0) {
                        alert(`Conflito detectado com ${conflitos[0].nome} (${conflitos[0].faixa}).`);
                        return;
                    }
                }
                compromisso.horarioInicio = hInicio;
                compromisso.horarioFim = hFim;
                compromisso.fullDay = diaInteiro;
            }

            if (freq === 'semanal') {
                compromisso.dia = document.getElementById('editDiaSemana').value;
                delete compromisso.data;
            }

            if (tipo === 'bloqueio') {
                compromisso.descricao = document.getElementById('editDescricao').value.trim();
                if (!diaInteiro) delete compromisso.fullDay;
            }

            if (typeof salvarDados === 'function') salvarDados();

            window.fecharModalAcaoSlot();
            window.inicializarHome();
            if (typeof mostrarToast === 'function') mostrarToast('✅ Alterações salvas com sucesso!');
        });
    }

    const inputEditHora = document.getElementById('editHoraInicio');
    const inputEditDuracao = document.getElementById('editDuracao');
    if (inputEditHora) inputEditHora.addEventListener('change', () => window.atualizarAvisoConflitoEdicao());
    if (inputEditDuracao) inputEditDuracao.addEventListener('change', () => window.atualizarAvisoConflitoEdicao());
    const checkEditDiaInteiro = document.getElementById('editBloqueioDiaInteiro');
    if (checkEditDiaInteiro) checkEditDiaInteiro.addEventListener('change', () => window.atualizarEstadoBloqueioDiaInteiroEdicao());

    // ── Ações sobre Slots ─────────────────────────────────────────────────────────────────────
    const btnDeletar = document.getElementById('btnDeletarDefinitivo');
    if (btnDeletar) {
        btnDeletar.addEventListener('click', () => {
            aulas = aulas.filter(a => a.id !== window.idCompromissoSelecionado);
            if (typeof salvarDados === 'function') salvarDados();
            
            window.fecharModalAcaoSlot();
            window.inicializarHome();
            if (typeof mostrarToast === 'function') mostrarToast('🗑️ Compromisso único cancelado!');
        });
    }

    const btnMandarReposicao = document.getElementById('btnMandarParaReposicao');
    if (btnMandarReposicao) {
        btnMandarReposicao.addEventListener('click', () => {
            const compromisso = aulas.find(a => a.id === window.idCompromissoSelecionado);
            if (!compromisso) return;

            aulasParaRepor.push({
                id: Date.now().toString(),
                alunoId: compromisso.alunoId,
                dataCancelamento: compromisso.data || new Date().toLocaleDateString('pt-BR')
            });
            
            aulas = aulas.filter(a => a.id !== window.idCompromissoSelecionado);
            if (typeof salvarDados === 'function') salvarDados();

            window.fecharModalAcaoSlot();
            window.inicializarHome();
            if (typeof mostrarToast === 'function') mostrarToast('🔄 Aula única enviada para reposição!');
        });
    }

    const btnDeletarInstancia = document.getElementById('btnDeletarInstancia');
    if (btnDeletarInstancia) {
        btnDeletarInstancia.addEventListener('click', () => {
            const compromisso = aulas.find(a => a.id === window.idCompromissoSelecionado);
            if (!compromisso) return;

            const dataAlvoStr = window.dataAlvoAcaoStr || window.dataSelecionada.toLocaleDateString('pt-BR');
            if (!compromisso.excecoes) compromisso.excecoes = [];
            if (!compromisso.excecoes.includes(dataAlvoStr)) {
                compromisso.excecoes.push(dataAlvoStr);
            }

            if (typeof salvarDados === 'function') salvarDados();
            
            window.fecharModalAcaoSlot();
            window.inicializarHome();
            if (typeof mostrarToast === 'function') mostrarToast(`📅 Aula de ${dataAlvoStr} cancelada!`);
        });
    }

    const btnReagendarInstancia = document.getElementById('btnReagendarInstancia');
    if (btnReagendarInstancia) {
        btnReagendarInstancia.addEventListener('click', () => {
            const compromisso = aulas.find(a => a.id === window.idCompromissoSelecionado);
            if (!compromisso) return;

            const dataAlvoStr = window.dataAlvoAcaoStr || window.dataSelecionada.toLocaleDateString('pt-BR');
            if (!compromisso.excecoes) compromisso.excecoes = [];
            if (!compromisso.excecoes.includes(dataAlvoStr)) {
                compromisso.excecoes.push(dataAlvoStr);
            }

            aulasParaRepor.push({
                id: Date.now().toString(),
                alunoId: compromisso.alunoId,
                dataCancelamento: dataAlvoStr
            });

            if (typeof salvarDados === 'function') salvarDados();
            
            window.fecharModalAcaoSlot();
            window.inicializarHome();
            if (typeof mostrarToast === 'function') mostrarToast(`🔄 Aula de ${dataAlvoStr} enviada para reposição!`);
        });
    }

    const btnDeletarSerie = document.getElementById('btnDeletarSerie');
    if (btnDeletarSerie) {
        btnDeletarSerie.addEventListener('click', () => {
            aulas = aulas.filter(a => a.id !== window.idCompromissoSelecionado);
            if (typeof salvarDados === 'function') salvarDados();
            
            window.fecharModalAcaoSlot();
            window.inicializarHome();
            if (typeof mostrarToast === 'function') mostrarToast('🗑️ Série recorrente excluída do calendário!');
        });
    }
});
