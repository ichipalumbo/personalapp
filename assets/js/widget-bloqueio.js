// [TAG-WIDGET-BLOQUEIO] widget-bloqueio.js
// Responsabilidade: Constantes de bloqueio e helpers de estado para o toggle "Dia Inteiro"
// Depende de: widget-stepper-duracao.js (aplicarLimitesDuracaoPorContexto, sincronizarSteppersDuracao)
//             modal-agendamento.js (atualizarResumoRecorrenciaCadastro — em runtime)
//             modal-acao-slot.js (atualizarAvisoConflitoEdicao — em runtime)
// Expõe: window.BLOQUEIO_MAX_MINUTOS, window.DURACAO_MAX_AULA_DESLOCAMENTO,
//         window.BLOQUEIO_DIA_INTEIRO_INICIO, window.BLOQUEIO_DIA_INTEIRO_FIM,
//         window.BLOQUEIO_DIA_INTEIRO_DURACAO, window.ehBloqueioDiaInteiroCompromisso,
//         window.atualizarEstadoCamposBloqueioDiaInteiro, window.atualizarEstadoBloqueioDiaInteiroAgenda,
//         window.atualizarEstadoBloqueioDiaInteiroRecorrencia, window.atualizarEstadoBloqueioDiaInteiroEdicao

window.BLOQUEIO_MAX_MINUTOS = 480;
window.DURACAO_MAX_AULA_DESLOCAMENTO = 120;
window.BLOQUEIO_DIA_INTEIRO_INICIO = '00:00';
window.BLOQUEIO_DIA_INTEIRO_FIM = '23:59';
window.BLOQUEIO_DIA_INTEIRO_DURACAO = 1439;

/** @param {Object} compromisso @returns {boolean} */
window.ehBloqueioDiaInteiroCompromisso = function(compromisso) {
    if (!compromisso || compromisso.tipo !== 'bloqueio') return false;
    if (compromisso.fullDay === true) return true;
    return compromisso.horarioInicio === window.BLOQUEIO_DIA_INTEIRO_INICIO
        && compromisso.horarioFim === window.BLOQUEIO_DIA_INTEIRO_FIM;
};

/**
 * Aplica ou reverte o estado "dia inteiro" nos campos de hora e duração de um modal de bloqueio
 * @param {{ checkboxId: string, horaId: string, duracaoId: string, gridId: string }} cfg
 */
window.atualizarEstadoCamposBloqueioDiaInteiro = function(cfg) {
    const checkbox = document.getElementById(cfg.checkboxId);
    const campoHora = document.getElementById(cfg.horaId);
    const campoDuracao = document.getElementById(cfg.duracaoId);
    const grid = document.getElementById(cfg.gridId);
    if (!checkbox || !campoHora || !campoDuracao || !grid) return;

    const ativo = checkbox.checked;
    if (ativo) {
        if (!campoHora.dataset.valorAnterior) campoHora.dataset.valorAnterior = campoHora.value;
        if (!campoDuracao.dataset.valorAnterior) campoDuracao.dataset.valorAnterior = campoDuracao.value;
        campoHora.value = window.BLOQUEIO_DIA_INTEIRO_INICIO;
        campoDuracao.value = String(window.BLOQUEIO_MAX_MINUTOS);
    } else {
        if (campoHora.dataset.valorAnterior) campoHora.value = campoHora.dataset.valorAnterior;
        if (campoDuracao.dataset.valorAnterior) campoDuracao.value = campoDuracao.dataset.valorAnterior;
        delete campoHora.dataset.valorAnterior;
        delete campoDuracao.dataset.valorAnterior;
    }

    campoHora.disabled = ativo;
    campoDuracao.disabled = ativo;
    grid.classList.toggle('bloqueio-dia-inteiro-ativo', ativo);
    if (cfg.duracaoId === 'agendaDuracao') window.aplicarLimitesDuracaoPorContexto('agenda');
    if (cfg.duracaoId === 'recorrenciaDuracao') window.aplicarLimitesDuracaoPorContexto('recorrencia');
    if (cfg.duracaoId === 'editDuracao') window.aplicarLimitesDuracaoPorContexto('edicao');
    window.sincronizarSteppersDuracao();
};

window.atualizarEstadoBloqueioDiaInteiroAgenda = function() {
    window.atualizarEstadoCamposBloqueioDiaInteiro({
        checkboxId: 'agendaBloqueioDiaInteiro',
        horaId: 'agendaHoraInicio',
        duracaoId: 'agendaDuracao',
        gridId: 'agendaHorarioDuracaoGrid'
    });
};

window.atualizarEstadoBloqueioDiaInteiroRecorrencia = function() {
    window.atualizarEstadoCamposBloqueioDiaInteiro({
        checkboxId: 'recorrenciaBloqueioDiaInteiro',
        horaId: 'recorrenciaHoraInicio',
        duracaoId: 'recorrenciaDuracao',
        gridId: 'recorrenciaHorarioDuracaoGrid'
    });
    window.atualizarResumoRecorrenciaCadastro();
};

window.atualizarEstadoBloqueioDiaInteiroEdicao = function() {
    window.atualizarEstadoCamposBloqueioDiaInteiro({
        checkboxId: 'editBloqueioDiaInteiro',
        horaId: 'editHoraInicio',
        duracaoId: 'editDuracao',
        gridId: 'editHorarioDuracaoGrid'
    });
    window.atualizarAvisoConflitoEdicao();
};
