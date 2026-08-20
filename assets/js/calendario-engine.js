// [TAG-CALENDARIO-ENGINE] calendario-engine.js
// Responsabilidade: Motor de recorrência (math engine) e renderização do grid mensal
// Depende de: state.js (aulas, mesAtual, anoAtual, DIAS_SEMANA), view-calendario.js (filtroAlunoMensalId, alternarModoCalendario, semanaReferencia — em runtime)
// Expõe: window.parseDataFlex, window.resolverCompromissoRecorrenteNaData, window.checarCompromissoNaData,
//         renderizarCalendario, navegarMes, irParaSemana

const recurrenceHelpers = window.recurrenceHelpers;
if (!recurrenceHelpers) {
    throw new Error('recurrenceHelpers não encontrado. Carregue assets/js/shared/recurrence-helpers.js antes de calendario-engine.js.');
}

window.parseDataFlex = recurrenceHelpers.parseDataFlex;
window.resolverCompromissoRecorrenteNaData = recurrenceHelpers.resolverCompromissoRecorrenteNaData;
window.checarCompromissoNaData = function (comp, dataAlvo, horaStr) {
    const diasSemanaMap = typeof window.getNomesDiasSemana === 'function'
        ? window.getNomesDiasSemana()
        : recurrenceHelpers.DEFAULT_DIAS_SEMANA;
    return recurrenceHelpers.checarCompromissoNaData(comp, dataAlvo, horaStr, diasSemanaMap);
};

function obterNomesDiasSemanaCalendario() {
    return typeof window.getNomesDiasSemana === 'function'
        ? window.getNomesDiasSemana()
        : recurrenceHelpers.DEFAULT_DIAS_SEMANA;
}

const getDiasNoMes = recurrenceHelpers.getDiasNoMes;
const getPrimeiroDiaSemana = recurrenceHelpers.getPrimeiroDiaSemana;

function getNomeMes(mes) {
    const nomes = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return nomes[mes];
}
function getAulasDoDia(dia, mes, ano) {
    const data = new Date(ano, mes, dia);
    return aulas.filter(a => window.checarCompromissoNaData(a, data));
}
function renderizarCalendario() {
    const grid = document.getElementById('calendarioGrid');
    if (!grid) return;
    
    const label = document.getElementById('nomeMesAno');
    if (label) {
        label.textContent = `${getNomeMes(mesAtual)} de ${anoAtual}`;
    }
    
    const totalDias = getDiasNoMes(mesAtual, anoAtual);
    const primeiroDia = getPrimeiroDiaSemana(mesAtual, anoAtual);
    const hoje = new Date();
    const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
    const anoAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;
    const diasMesAnterior = getDiasNoMes(mesAnterior, anoAnterior);
    
    let html = '';
    DIAS_SEMANA.forEach(d => {
        html += `<div class="dia-header">${d}</div>`;
    });
    const inicioPreenchimento = primeiroDia;
    for (let i = inicioPreenchimento; i > 0; i--) {
        html += `<div class="dia-cell outro-mes"><div class="dia-numero">${diasMesAnterior - i + 1}</div></div>`;
    }
    for (let d = 1; d <= totalDias; d++) {
        const ehHoje = d === hoje.getDate() && mesAtual === hoje.getMonth() && anoAtual === hoje.getFullYear();
        let aulasDoDia = getAulasDoDia(d, mesAtual, anoAtual);
        
        // [FILTERED] Apply student filter if set and hide deslocamento/bloqueio types
        if (window.filtroAlunoMensalId) {
            aulasDoDia = aulasDoDia.filter(a => a.alunoId === window.filtroAlunoMensalId);
        }
        
        // Only count aulas (hide deslocamento/bloqueio in month view)
        const totalAulas = aulasDoDia.filter(a => !a.tipo || a.tipo === 'aula' || a.tipo === 'reposição').length;

        let aulasHtml = '';
        if (totalAulas > 0) {
            aulasHtml += `<div class="dia-stats-badges">`;
            aulasHtml += `
                <div class="badge-stat-mensal badge-aula" title="${totalAulas} Aula(s)">
                    <i class="fa-solid fa-graduation-cap"></i><span>${totalAulas}</span>
                </div>
            `;
            aulasHtml += `</div>`;
        }
        html += `
            <div class="dia-cell ${ehHoje ? 'hoje' : ''}" onclick="irParaSemana(${d})">
                <div class="dia-numero">${d}</div>
                ${aulasHtml}
            </div>
        `;
    }
    const totalCells = inicioPreenchimento + totalDias;
    const resto = totalCells % 7;
    if (resto > 0) {
        for (let i = 1; i <= (7 - resto); i++) {
            html += `<div class="dia-cell outro-mes"><div class="dia-numero">${i}</div></div>`;
        }
    }
    
    grid.innerHTML = html;
}

function navegarMes(delta) {
    mesAtual += delta;
    if (mesAtual > 11) {
        mesAtual = 0;
        anoAtual++;
    } else if (mesAtual < 0) {
        mesAtual = 11;
        anoAtual--;
    }
    renderizarCalendario();
}
function irParaSemana(dia) {
    const dataAlvo = new Date(anoAtual, mesAtual, dia);
    
    if (typeof dataSelecionada !== 'undefined') {
        dataSelecionada = dataAlvo;
    }
    if (window.semanaReferencia) {
        window.semanaReferencia = dataAlvo;
    }

    if (typeof alternarModoCalendario === 'function') {
        window.alternarModoCalendario('semanal');
    }
}
