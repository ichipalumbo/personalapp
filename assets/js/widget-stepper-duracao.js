// [TAG-WIDGET-STEPPER] widget-stepper-duracao.js
// Responsabilidade: Widget de seleção de duração com botões +/- (stepper) e labels formatadas
// Depende de: state.js (aulas — em runtime), widget-bloqueio.js (BLOQUEIO_MAX_MINUTOS — em runtime),
//             modal-acao-slot.js (window.idCompromissoSelecionado — em runtime)
// Expõe: window.formatarDuracaoMinutosLabel, window.getValoresDuracaoDisponiveis,
//         window.aplicarMaxDuracaoSelect, window.aplicarLimitesDuracaoPorContexto,
//         window.atualizarLabelStepperDuracao, window.configurarStepperDuracao,
//         window.inicializarSteppersDuracao, window.sincronizarSteppersDuracao

/** @param {string|number} valor - minutos @returns {string} Ex: "1h 30min" | "45 min" */
window.formatarDuracaoMinutosLabel = function(valor) {
    const minutos = parseInt(valor, 10);
    if (Number.isNaN(minutos) || minutos <= 0) return '--';
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    if (horas === 0) return `${resto} min`;
    return `${horas}h ${resto.toString().padStart(2, '0')}min`;
};

/** @param {HTMLSelectElement} select @returns {number[]} lista de valores de minutos disponíveis */
window.getValoresDuracaoDisponiveis = function(select) {
    const valoresBase = Array.from(select.options)
        .map(opt => parseInt(opt.value, 10))
        .filter(v => !Number.isNaN(v));
    const maxDuracao = parseInt(select.dataset.maxDuracao || '', 10);
    if (Number.isNaN(maxDuracao) || maxDuracao <= 0) return valoresBase;
    return valoresBase.filter(v => v <= maxDuracao);
};

/** @param {string} selectId @param {number} maxDuracao - máximo permitido em minutos */
window.aplicarMaxDuracaoSelect = function(selectId, maxDuracao) {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.dataset.maxDuracao = String(maxDuracao);
    const valoresPermitidos = window.getValoresDuracaoDisponiveis(select);
    if (valoresPermitidos.length === 0) return;

    const atual = parseInt(select.value, 10);
    if (Number.isNaN(atual) || !valoresPermitidos.includes(atual)) {
        select.value = String(valoresPermitidos[valoresPermitidos.length - 1]);
    }
};

/** Aplica o limite de duração correto para o contexto do modal ('agenda' | 'recorrencia' | 'edicao') */
window.aplicarLimitesDuracaoPorContexto = function(contexto) {
    if (contexto === 'agenda') {
        const tipo = document.getElementById('agendaTipo')?.value || 'aula';
        const max = tipo === 'bloqueio' ? window.BLOQUEIO_MAX_MINUTOS : window.DURACAO_MAX_AULA_DESLOCAMENTO;
        window.aplicarMaxDuracaoSelect('agendaDuracao', max);
        window.sincronizarSteppersDuracao();
        return;
    }

    if (contexto === 'recorrencia') {
        const tipo = document.getElementById('recorrenciaTipo')?.value || 'aula';
        const max = tipo === 'bloqueio' ? window.BLOQUEIO_MAX_MINUTOS : window.DURACAO_MAX_AULA_DESLOCAMENTO;
        window.aplicarMaxDuracaoSelect('recorrenciaDuracao', max);
        window.sincronizarSteppersDuracao();
        return;
    }

    if (contexto === 'edicao') {
        const compromisso = aulas.find(a => a.id === window.idCompromissoSelecionado);
        const tipo = compromisso?.tipo || 'aula';
        const max = tipo === 'bloqueio' ? window.BLOQUEIO_MAX_MINUTOS : window.DURACAO_MAX_AULA_DESLOCAMENTO;
        window.aplicarMaxDuracaoSelect('editDuracao', max);
        window.sincronizarSteppersDuracao();
    }
};

/** Atualiza o label de texto de um stepper com base no select associado @param {HTMLElement} stepper */
window.atualizarLabelStepperDuracao = function(stepper) {
    if (!stepper) return;
    const selectId = stepper.getAttribute('data-target-select');
    const select = selectId ? document.getElementById(selectId) : null;
    const label = stepper.querySelector('.duracao-stepper-value');
    if (!select || !label) return;
    label.textContent = window.formatarDuracaoMinutosLabel(select.value);
};

/** Inicializa os botões +/- de um stepper e seus event listeners @param {HTMLElement} stepper */
window.configurarStepperDuracao = function(stepper) {
    if (!stepper || stepper.dataset.stepperReady === 'true') return;
    const selectId = stepper.getAttribute('data-target-select');
    const select = selectId ? document.getElementById(selectId) : null;
    if (!select) return;

    const getValores = () => window.getValoresDuracaoDisponiveis(select);

    stepper.querySelectorAll('.duracao-stepper-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (select.disabled) return;
            const valores = getValores();
            if (valores.length === 0) return;

            let atual = parseInt(select.value, 10);
            if (Number.isNaN(atual) || !valores.includes(atual)) atual = valores[0];
            const idx = valores.indexOf(atual);
            const acao = btn.getAttribute('data-action');
            const novoIdx = acao === 'decrease'
                ? Math.max(0, idx - 1)
                : Math.min(valores.length - 1, idx + 1);

            select.value = String(valores[novoIdx]);
            select.dispatchEvent(new Event('change', { bubbles: true }));
            select.dispatchEvent(new Event('input', { bubbles: true }));
            window.atualizarLabelStepperDuracao(stepper);
        });
    });

    select.addEventListener('change', () => window.atualizarLabelStepperDuracao(stepper));
    select.addEventListener('input', () => window.atualizarLabelStepperDuracao(stepper));

    stepper.dataset.stepperReady = 'true';
    window.atualizarLabelStepperDuracao(stepper);
};

/** Inicializa todos os steppers de duração presentes no DOM */
window.inicializarSteppersDuracao = function() {
    document.querySelectorAll('.duracao-stepper').forEach(window.configurarStepperDuracao);
};

/** Sincroniza os labels de todos os steppers de duração com seus selects */
window.sincronizarSteppersDuracao = function() {
    document.querySelectorAll('.duracao-stepper').forEach(window.atualizarLabelStepperDuracao);
};

document.addEventListener('DOMContentLoaded', () => {
    window.inicializarSteppersDuracao();
    window.sincronizarSteppersDuracao();
});
