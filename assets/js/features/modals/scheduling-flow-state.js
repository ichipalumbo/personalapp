// [TAG-SCHEDULING-FLOW-STATE] scheduling-flow-state.js
// Responsabilidade: factories e helpers para o estado intermediario do fluxo de agendamento.
// Nao depende de DOM e pode ser validado antes da refatoracao de HTML/CSS.

(function () {
    const TIPOS_CRIACAO = Object.freeze(['aula', 'bloqueio', 'deslocamento', 'reposicao']);
    const PADROES_RECORRENCIA = Object.freeze(['diaria', 'semanal', 'mensal', 'anual']);
    const ESCOPOS_RECORRENCIA = Object.freeze(['fromDate', 'monthOfDate']);
    const TERMINOS_RECORRENCIA = Object.freeze(['never', 'untilDate', 'occurrences']);
    const DIAS_SEMANA_VALIDOS = Object.freeze(['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']);

    function normalizarTipoCriacao(tipo) {
        return TIPOS_CRIACAO.includes(tipo) ? tipo : 'aula';
    }

    function normalizarPadraoRecorrencia(padrao) {
        return PADROES_RECORRENCIA.includes(padrao) ? padrao : 'semanal';
    }

    function normalizarEscopoRecorrencia(escopo) {
        return ESCOPOS_RECORRENCIA.includes(escopo) ? escopo : 'fromDate';
    }

    function normalizarTerminoRecorrencia(termino) {
        return TERMINOS_RECORRENCIA.includes(termino) ? termino : 'never';
    }

    function normalizarDiasSemana(diasSemana) {
        if (!Array.isArray(diasSemana)) return [];

        const diasUnicos = [];
        diasSemana.forEach((dia) => {
            if (DIAS_SEMANA_VALIDOS.includes(dia) && !diasUnicos.includes(dia)) {
                diasUnicos.push(dia);
            }
        });
        return diasUnicos;
    }

    function normalizarQuantidadeOcorrencias(valor) {
        return Number.isFinite(valor) && valor > 0 ? Math.floor(valor) : 1;
    }

    function criarContextoSlotAgendamento(overrides) {
        const custom = overrides || {};
        return {
            dataIso: custom.dataIso || '',
            dataPtBr: custom.dataPtBr || '',
            diaSemana: custom.diaSemana || '',
            horaSugerida: custom.horaSugerida || '08:00',
            origem: custom.origem || 'quick-add'
        };
    }

    function criarFormularioPrincipalAgendamento(overrides) {
        const custom = overrides || {};
        return {
            alunoId: custom.alunoId || '',
            descricao: custom.descricao || '',
            horarioInicio: custom.horarioInicio || '',
            duracaoMinutos: Number.isFinite(custom.duracaoMinutos) ? custom.duracaoMinutos : 60,
            fullDay: custom.fullDay === true,
            reposicaoReferenciaId: custom.reposicaoReferenciaId ?? null
        };
    }

    function criarEstadoRecorrenciaAgendamento(overrides) {
        const custom = overrides || {};
        return {
            enabled: custom.enabled === true,
            pattern: normalizarPadraoRecorrencia(custom.pattern),
            interval: Number.isFinite(custom.interval) && custom.interval > 0 ? custom.interval : 1,
            daysOfWeek: normalizarDiasSemana(custom.daysOfWeek),
            startDateIso: custom.startDateIso || '',
            endCondition: normalizarTerminoRecorrencia(custom.endCondition),
            untilDateIso: custom.untilDateIso || '',
            occurrencesCount: normalizarQuantidadeOcorrencias(custom.occurrencesCount),
            scope: normalizarEscopoRecorrencia(custom.scope),
            summaryText: custom.summaryText || 'Não se repete',
            previewText: custom.previewText || '',
            hasCustomSettings: custom.hasCustomSettings === true,
            lastSavedAt: custom.lastSavedAt || ''
        };
    }

    function criarEstadoUiAgendamento(overrides) {
        const custom = overrides || {};
        return {
            recurrenceModalOpen: custom.recurrenceModalOpen === true,
            isDirty: custom.isDirty === true,
            touchedFields: custom.touchedFields && typeof custom.touchedFields === 'object'
                ? { ...custom.touchedFields }
                : {}
        };
    }

    window.criarEstadoFluxoAgendamento = function (overrides) {
        const custom = overrides || {};
        return {
            creationType: normalizarTipoCriacao(custom.creationType),
            slotContext: criarContextoSlotAgendamento(custom.slotContext),
            mainForm: criarFormularioPrincipalAgendamento(custom.mainForm),
            recurrence: criarEstadoRecorrenciaAgendamento(custom.recurrence),
            ui: criarEstadoUiAgendamento(custom.ui)
        };
    };

    window.podeUsarRecorrenciaNoFluxoAgendamento = function (creationType) {
        return normalizarTipoCriacao(creationType) !== 'reposicao';
    };

    window.criarEstadoInicialRecorrenciaAgendamento = function (slotContext) {
        const contexto = criarContextoSlotAgendamento(slotContext);
        return criarEstadoRecorrenciaAgendamento({
            enabled: false,
            pattern: 'semanal',
            interval: 1,
            daysOfWeek: contexto.diaSemana ? [contexto.diaSemana] : [],
            startDateIso: contexto.dataIso || '',
            endCondition: 'never',
            untilDateIso: '',
            occurrencesCount: 1,
            scope: 'fromDate',
            summaryText: 'Não se repete',
            previewText: '',
            hasCustomSettings: false,
            lastSavedAt: ''
        });
    };

    window.criarEstadoRecorrenciaAgendamento = function (overrides) {
        return criarEstadoRecorrenciaAgendamento(overrides);
    };

    window.criarRascunhoFluxoAgendamento = function (opcoes) {
        const custom = opcoes || {};
        const creationType = normalizarTipoCriacao(custom.creationType || 'aula');
        const slotContext = criarContextoSlotAgendamento(custom.slotContext);
        return window.criarEstadoFluxoAgendamento({
            creationType,
            slotContext,
            mainForm: criarFormularioPrincipalAgendamento({
                ...(custom.mainForm || {}),
                horarioInicio: custom.mainForm && custom.mainForm.horarioInicio
                    ? custom.mainForm.horarioInicio
                    : slotContext.horaSugerida
            }),
            recurrence: !window.podeUsarRecorrenciaNoFluxoAgendamento(creationType)
                ? window.criarEstadoInicialRecorrenciaAgendamento(slotContext)
                : custom.recurrence
                ? criarEstadoRecorrenciaAgendamento(custom.recurrence)
                : window.criarEstadoInicialRecorrenciaAgendamento(slotContext),
            ui: criarEstadoUiAgendamento(custom.ui)
        });
    };

    window.redefinirFormularioPrincipalAgendamento = function (state, creationType) {
        const draft = window.criarEstadoFluxoAgendamento(state);
        const tipoNormalizado = normalizarTipoCriacao(creationType || draft.creationType);
        const horarioAtual = draft.mainForm.horarioInicio || draft.slotContext.horaSugerida || '';

        draft.creationType = tipoNormalizado;
        draft.mainForm = criarFormularioPrincipalAgendamento({
            horarioInicio: horarioAtual,
            duracaoMinutos: draft.mainForm.duracaoMinutos,
            fullDay: tipoNormalizado === 'bloqueio' ? draft.mainForm.fullDay : false,
            alunoId: tipoNormalizado === 'aula' ? draft.mainForm.alunoId : '',
            descricao: tipoNormalizado === 'bloqueio' ? draft.mainForm.descricao : '',
            reposicaoReferenciaId: tipoNormalizado === 'reposicao' ? draft.mainForm.reposicaoReferenciaId : null
        });

        if (tipoNormalizado === 'reposicao') {
            draft.recurrence = window.criarEstadoInicialRecorrenciaAgendamento(draft.slotContext);
        }

        return draft;
    };

    window.aplicarContextoAoFluxoAgendamento = function (state, slotContext) {
        const draft = window.criarEstadoFluxoAgendamento(state);
        const proximoContexto = criarContextoSlotAgendamento(slotContext);

        draft.slotContext = proximoContexto;
        if (!draft.mainForm.horarioInicio) {
            draft.mainForm.horarioInicio = proximoContexto.horaSugerida || '';
        }

        if (!draft.recurrence.hasCustomSettings) {
            draft.recurrence.startDateIso = proximoContexto.dataIso || '';
            draft.recurrence.daysOfWeek = proximoContexto.diaSemana
                ? [proximoContexto.diaSemana]
                : [];
        }

        return draft;
    };

    window.redefinirRecorrenciaFluxoAgendamento = function (state) {
        const draft = window.criarEstadoFluxoAgendamento(state);
        draft.recurrence = window.criarEstadoInicialRecorrenciaAgendamento(draft.slotContext);
        return draft;
    };

    window.atualizarResumoRecorrenciaFluxoAgendamento = function (state, summaryText, previewText) {
        const draft = window.criarEstadoFluxoAgendamento(state);
        draft.recurrence.summaryText = summaryText || 'Não se repete';
        draft.recurrence.previewText = previewText || '';
        draft.recurrence.enabled = draft.recurrence.summaryText !== 'Não se repete';
        return draft;
    };

    window.__schedulingFlowState = Object.freeze({
        TIPOS_CRIACAO,
        PADROES_RECORRENCIA,
        ESCOPOS_RECORRENCIA,
        TERMINOS_RECORRENCIA,
        DIAS_SEMANA_VALIDOS
    });
})();
