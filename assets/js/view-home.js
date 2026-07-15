// [TAG-VIEW-HOME] view-home.js
// Responsabilidade: View da aba Home — agenda diária, dashboard de stats e navegação de datas
// Depende de: state.js (aulas, aulasParaRepor, agendaConfig, HORARIOS), storage.js (carregarDados, salvarDados, atualizarLimitesGrade),
//             utils-datetime.js (getDiaTextoSelecionado), calendario-engine.js (checarCompromissoNaData),
//             widget-bloqueio.js (ehBloqueioDiaInteiroCompromisso),
//             modal-agendamento.js (abrirEscolhaTipoModal), modal-acao-slot.js (abrirModalAcaoSlot, renderizarListaReposicoes, inicializarMultiSelectPills)
// Expõe: window.dataSelecionada, window.dataAlvoAcaoStr, window.horarioSelecionadoSlot,
//         window.reagendamentoDirectCardId, window.__sincronizacaoInicialConcluida,
//         window.__homeCarregando, window.getAluno, window.renderizarLoadingHome,
//         window.inicializarHome, window.atualizarDataAtual, window.atualizarDashboardStats,
//         window.renderizarAgendaDia

// ── Estado global da view ─────────────────────────────────────────────────────────────────────

window.dataSelecionada = window.dataSelecionada || new Date();
window.dataAlvoAcaoStr = null;
window.horarioSelecionadoSlot = null;
window.reagendamentoDirectCardId = null;
window.__sincronizacaoInicialConcluida = window.__sincronizacaoInicialConcluida || false;
window.__homeCarregando = window.__homeCarregando || false;

const DIAS_DA_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

// ── Lookup de aluno (centralizado aqui, exposto para outros módulos) ───────────────────────────

window.getAluno = function(id) {
    if (typeof alunos !== 'undefined') {
        return alunos.find(a => a.id === id);
    }
    return null;
};

// ── Loading State ─────────────────────────────────────────────────────────────────────────────

window.renderizarLoadingHome = function() {
    const elementoData = document.getElementById('dataAtual');
    const elAulasHoje = document.getElementById('totalAulasHoje');
    const elAulasRepor = document.getElementById('totalAulasRepor');
    const grid = document.getElementById('agendaGridHome');

    if (elementoData) {
        elementoData.innerHTML = `<i class="fa-solid fa-calendar-minus" style="color: #FFD700; margin-right: 8px;"></i>Sincronizando agenda...`;
    }
    if (elAulasHoje) elAulasHoje.textContent = '...';
    if (elAulasRepor) elAulasRepor.textContent = '...';
    if (grid) {
        const htmlLoading = Array.from({ length: 6 }).map((_, idx) => {
            const hora = String(7 + idx).padStart(2, '0') + ':00';
            return `
                <div class="agenda-dia-linha home-loading-line">
                    <div class="agenda-dia-horario home-loading-pill">${hora}</div>
                    <div class="home-loading-block"></div>
                </div>
            `;
        }).join('');
        grid.innerHTML = htmlLoading;
    }
};

// ── Inicialização da Home ─────────────────────────────────────────────────────────────────────

window.inicializarHome = async function(opcoes = {}) {
    const deveSincronizar = opcoes.sincronizar === true || !window.__sincronizacaoInicialConcluida;

    if (!agendaConfig) agendaConfig = { horaInicio: 7, horaFim: 21 };
    if (!aulasParaRepor) aulasParaRepor = [];

    if (deveSincronizar) {
        window.__homeCarregando = true;
        window.renderizarLoadingHome();

        try {
            if (typeof carregarDados === 'function') {
                await carregarDados({ forcarRender: false });
            }
            window.__sincronizacaoInicialConcluida = true;
        } finally {
            window.__homeCarregando = false;
        }
    }

    window.atualizarDataAtual();
    window.atualizarDashboardStats();
    window.renderizarAgendaDia();
    window.renderizarListaReposicoes();
    window.inicializarMultiSelectPills();
};

// ── Dashboard Stats ───────────────────────────────────────────────────────────────────────────

window.atualizarDataAtual = function() {
    const elementoData = document.getElementById('dataAtual');
    if (!elementoData) return;
    const dia = String(window.dataSelecionada.getDate()).padStart(2, '0');
    const mes = String(window.dataSelecionada.getMonth() + 1).padStart(2, '0');
    const nomeDia = DIAS_DA_SEMANA[window.dataSelecionada.getDay()];

    elementoData.innerHTML = `<i class="fa-solid fa-calendar-minus" style="color: #FFD700; margin-right: 8px;"></i>${nomeDia} <span style="color: #FFD700; font-weight: 800;">(${dia}/${mes})</span>`;
};

window.atualizarDashboardStats = function() {
    const elAulasHoje = document.getElementById('totalAulasHoje');
    const elAulasRepor = document.getElementById('totalAulasRepor');

    if (elAulasHoje && typeof aulas !== 'undefined') {
        const aulasHoje = aulas.filter(a => {
            if (a.tipo && a.tipo !== 'aula') return false;
            return window.checarCompromissoNaData(a, window.dataSelecionada);
        });
        elAulasHoje.textContent = aulasHoje.length;
    }
    if (elAulasRepor) elAulasRepor.textContent = aulasParaRepor.length;
};

// ── Renderização da Grade Diária ──────────────────────────────────────────────────────────────

window.renderizarAgendaDia = function() {
    const grid = document.getElementById('agendaGridHome');
    if (!grid) return;

    const diaTexto = window.getDiaTextoSelecionado();
    let html = '';

    const inicio = agendaConfig.horaInicio;
    const fim = agendaConfig.horaFim;

    const slotsDoDia = HORARIOS.filter(h => {
        const horaInt = parseInt(h.split(':')[0]);
        return horaInt >= inicio && horaInt < fim;
    });

    const agora = new Date();
    const agoraMinutos = agora.getHours() * 60 + agora.getMinutes();
    const ehHoje = window.dataSelecionada.toDateString() === agora.toDateString();

    let i = 0;
    let slotAtualIdSetado = false;

    while (i < slotsDoDia.length) {
        const horaStr = slotsDoDia[i];
        const [slotH, slotM] = horaStr.split(':').map(Number);
        const slotMinutos = slotH * 60 + slotM;
        const ehSlotMomentoAtual = ehHoje && (agoraMinutos >= slotMinutos && agoraMinutos < slotMinutos + 30);
        const compromisso = aulas.find(a => window.checarCompromissoNaData(a, window.dataSelecionada, horaStr));
        let ehCompromissoNoMomentoAtual = false;
        if (compromisso && ehHoje) {
            const [cIniH, cIniM] = compromisso.horarioInicio.split(':').map(Number);
            const [cFimH, cFimM] = compromisso.horarioFim.split(':').map(Number);
            const cIniMin = cIniH * 60 + cIniM;
            const cFimMin = cFimH * 60 + cFimM;
            ehCompromissoNoMomentoAtual = agoraMinutos >= cIniMin && agoraMinutos < cFimMin;
        }

        const destacarLinha = ehSlotMomentoAtual || ehCompromissoNoMomentoAtual;
        const atribuirIdScroll = destacarLinha && !slotAtualIdSetado;
        if (atribuirIdScroll) {
            slotAtualIdSetado = true;
        }

        if (compromisso) {
            let cardHtml = '';
            const tipo = compromisso.tipo || 'aula';
            const bloqueioDiaInteiro = window.ehBloqueioDiaInteiroCompromisso(compromisso);
            const periodoExibicao = bloqueioDiaInteiro
                ? 'Dia inteiro'
                : `${compromisso.horarioInicio} - ${compromisso.horarioFim}`;
            let tagVisualHtml = '';

            if (tipo === 'aula') {
                const aluno = window.getAluno(compromisso.alunoId);
                const nome = aluno ? aluno.nome : '❓ Aluno Removido';
                const objetivo = aluno ? aluno.objetivo : 'Outro';
                const local = aluno ? (aluno.local || 'Não definido') : 'Não definido';
                if (compromisso.reagendada || compromisso.isReposicao) {
                    tagVisualHtml = `<span class="badge-tag-tipo" style="background: rgba(100, 181, 246, 0.15); color: #64B5F6; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;"><i class="fa-solid fa-arrows-rotate"></i> Reposição</span>`;
                } else if (compromisso.frequencia === 'semanal') {
                    tagVisualHtml = `<span class="badge-tag-tipo" style="background: rgba(255, 215, 0, 0.15); color: #FFD700; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;"><i class="fa-solid fa-infinity"></i> Recorrente</span>`;
                } else {
                    tagVisualHtml = `<span class="badge-tag-tipo" style="background: rgba(129, 199, 132, 0.15); color: #81C784; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;"><i class="fa-solid fa-thumbtack"></i> Único</span>`;
                }
                
                cardHtml = `
                    <div class="agenda-dia-aula objetivo-${objetivo.replace(/\s/g,'')}" onclick="abrirModalAcaoSlot('${compromisso.id}')">
                        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px; margin-bottom: 3px;">
                            <span class="agenda-dia-aula-nome"><i class="fa-solid fa-graduation-cap"></i> ${nome}</span>
                            ${tagVisualHtml}
                        </div>
                        <span class="agenda-dia-aula-local"><i class="fa-solid fa-location-dot"></i> ${local}</span>
                        <span class="agenda-dia-aula-detalhes">${objetivo} (${periodoExibicao})</span>
                    </div>
                `;
            } else if (tipo === 'deslocamento') {
                tagVisualHtml = `<span class="badge-tag-tipo" style="background: rgba(255, 152, 0, 0.15); color: #FF9800; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;"><i class="fa-solid fa-car-side"></i> Trânsito</span>`;
                
                cardHtml = `
                    <div class="agenda-dia-aula slot-deslocamento" onclick="abrirModalAcaoSlot('${compromisso.id}')">
                        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px; margin-bottom: 3px;">
                            <span class="agenda-dia-aula-nome" style="color: #FF9800;"><i class="fa-solid fa-car-side"></i> Deslocamento</span>
                            ${tagVisualHtml}
                        </div>
                        <span class="agenda-dia-aula-local" style="color: #DDD;">${compromisso.descricao || 'Trânsito'} (${periodoExibicao})</span>
                    </div>
                `;
            } else if (tipo === 'bloqueio') {
                tagVisualHtml = `<span class="badge-tag-tipo" style="background: rgba(239, 83, 80, 0.15); color: #EF5350; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;"><i class="fa-solid fa-lock"></i> ${bloqueioDiaInteiro ? 'Dia inteiro' : 'Bloqueio'}</span>`;

                cardHtml = `
                    <div class="agenda-dia-aula slot-bloqueado" onclick="abrirModalAcaoSlot('${compromisso.id}')">
                        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px; margin-bottom: 3px;">
                            <span class="agenda-dia-aula-nome" style="color: #EF5350;"><i class="fa-solid fa-lock"></i> ${bloqueioDiaInteiro ? 'Dia bloqueado' : 'Bloqueado'}</span>
                            ${tagVisualHtml}
                        </div>
                        <span class="agenda-dia-aula-local" style="color: #DDD;">${compromisso.descricao || 'Compromisso'} (${periodoExibicao})</span>
                    </div>
                `;
            }

            html += `
                <div class="agenda-dia-linha ${destacarLinha ? 'linha-hora-atual' : ''}" ${atribuirIdScroll ? 'id="slot-hora-atual"' : ''}>
                    <div class="agenda-dia-horario">
                        ${horaStr}
                        ${destacarLinha ? '<span class="pulse-indicador-agora"></span>' : ''}
                    </div>
                    ${cardHtml}
                </div>
            `;

            while (i < slotsDoDia.length && slotsDoDia[i] < compromisso.horarioFim) {
                i++;
            }
        } else {
            html += `
                <div class="agenda-dia-linha ${destacarLinha ? 'linha-hora-atual' : ''}" ${atribuirIdScroll ? 'id="slot-hora-atual"' : ''}>
                    <div class="agenda-dia-horario">
                        ${horaStr}
                        ${destacarLinha ? '<span class="pulse-indicador-agora"></span>' : ''}
                    </div>
                    <div class="agenda-dia-vago" onclick="window.abrirEscolhaTipoModal('${diaTexto}', '${horaStr}')">
                        <span class="agenda-dia-vago-texto"><i class="fa-regular fa-calendar-plus" style="color: #FFD700;"></i> Vago — Toque para agendar</span>
                    </div>
                </div>
            `;
            i++;
        }
    }

    grid.innerHTML = html;
};

// ── Event Listeners (DOMContentLoaded) ────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    const btnConfig = document.getElementById('btnConfigAgenda');
    if (btnConfig) {
        btnConfig.addEventListener('click', () => {
            const selectInicio = document.getElementById('configHoraInicio');
            const selectFim = document.getElementById('configHoraFim');
            selectInicio.value = agendaConfig.horaInicio;
            selectFim.value = agendaConfig.horaFim;
            document.getElementById('modalConfigAgenda').style.display = 'flex';
        });
    }

    if (document.getElementById('btnFecharConfig')) {
        document.getElementById('btnFecharConfig').addEventListener('click', () => {
            document.getElementById('modalConfigAgenda').style.display = 'none';
        });
    }

    if (document.getElementById('formConfigAgenda')) {
        document.getElementById('formConfigAgenda').addEventListener('submit', (e) => {
            e.preventDefault();
            const inicio = parseInt(document.getElementById('configHoraInicio').value);
            const fim = parseInt(document.getElementById('configHoraFim').value);
            if (inicio >= fim) {
                alert("Início deve ser menor que o fim!");
                return;
            }
            agendaConfig.horaInicio = inicio;
            agendaConfig.horaFim = fim;
            if (typeof atualizarLimitesGrade === 'function') {
                atualizarLimitesGrade({
                    inicio: `${inicio.toString().padStart(2, '0')}:00`,
                    fim: `${fim.toString().padStart(2, '0')}:00`
                });
            }
            if (typeof salvarDados === 'function') salvarDados();
            document.getElementById('modalConfigAgenda').style.display = 'none';
            window.inicializarHome();
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('btnAnterior')) {
        document.getElementById('btnAnterior').addEventListener('click', () => {
            window.dataSelecionada.setDate(window.dataSelecionada.getDate() - 1);
            window.inicializarHome();
        });
    }
    if (document.getElementById('btnProximo')) {
        document.getElementById('btnProximo').addEventListener('click', () => {
            window.dataSelecionada.setDate(window.dataSelecionada.getDate() + 1);
            window.inicializarHome();
        });
    }
    if (document.getElementById('btnHoje')) {
        document.getElementById('btnHoje').addEventListener('click', () => {
            window.dataSelecionada = new Date();
            window.inicializarHome();
        });
    }
});
