// [TAG-CALENDARIO-ENGINE] calendario-engine.js
// Responsabilidade: Motor de recorrência (math engine) compartilhado com o backend
// Depende de: shared/recurrence-helpers.js
// Expõe: window.parseDataFlex, window.resolverCompromissoRecorrenteNaData, window.checarCompromissoNaData

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
