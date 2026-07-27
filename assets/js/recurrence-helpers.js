// [TAG-RECURRENCE-HELPERS] recurrence-helpers.js
// Responsabilidade: Helpers compartilhados de rótulos e textos de recorrência.
// Expõe: window.recorrenciaGetLabelEscopo, window.recorrenciaGetResumoEscopo,
//        window.recorrenciaGetLabelPadrao, window.recorrenciaGetTextoIntervalo,
//        window.recorrenciaGetTextoDias

window.recorrenciaGetLabelEscopo = function(escopo) {
    if (escopo === 'occurrence') return 'Somente esta aula';
    if (escopo === 'entireSeries') return 'Todas as aulas da série';
    return 'Daqui pra frente';
};

window.recorrenciaGetResumoEscopo = function(escopo) {
    if (escopo === 'occurrence') return 'Vai aplicar somente nesta aula específica.';
    if (escopo === 'entireSeries') return 'Vai aplicar na série inteira.';
    return 'Vai aplicar nesta aula e nas próximas da série.';
};

window.recorrenciaGetLabelPadrao = function(padrao) {
    if (padrao === 'diaria') return 'Diária';
    if (padrao === 'mensal') return 'Mensal';
    if (padrao === 'anual') return 'Anual';
    return 'Semanal';
};

window.recorrenciaGetTextoIntervalo = function(padrao, intervalo) {
    const valor = intervalo > 0 ? intervalo : 1;
    if (padrao === 'diaria') return valor === 1 ? 'todos os dias úteis' : `a cada ${valor} dias úteis`;
    if (padrao === 'mensal') return valor === 1 ? 'todo mês' : `a cada ${valor} meses`;
    if (padrao === 'anual') return valor === 1 ? 'todo ano' : `a cada ${valor} anos`;
    return valor === 1 ? 'toda semana' : `a cada ${valor} semanas`;
};

window.recorrenciaGetTextoDias = function(diasSemana) {
    const mapa = {
        Domingo: 'Dom',
        Segunda: 'Seg',
        'Terça': 'Ter',
        Quarta: 'Qua',
        Quinta: 'Qui',
        Sexta: 'Sex',
        'Sábado': 'Sáb'
    };
    if (!Array.isArray(diasSemana) || diasSemana.length === 0) return '';
    return diasSemana.map((dia) => mapa[dia] || dia).join(', ');
};