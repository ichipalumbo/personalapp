// [TAG-SCHEDULING-SERIALIZER] scheduling-serializer.js
// Responsabilidade: validar e serializar o rascunho do fluxo de agendamento
//                   para o payload legado persistido em aulas.
// Depende de: scheduling-flow-state.js, utils-datetime.js, widget-bloqueio.js,
//             agenda-conflitos.js
// Expoe: window.serializarRascunhoAgendamento

(function () {
    const TIPOS_VALIDOS = Object.freeze(['aula', 'bloqueio', 'deslocamento', 'reposicao']);

    function criarResultadoErro(errorMessage) {
        return {
            ok: false,
            errorMessage
        };
    }

    function normalizarDraft(draft) {
        if (typeof window.criarEstadoFluxoAgendamento === 'function') {
            return window.criarEstadoFluxoAgendamento(draft || {});
        }
        return draft || {};
    }

    function normalizarTipo(tipo) {
        return TIPOS_VALIDOS.includes(tipo) ? tipo : 'aula';
    }

    function formatarDataPtBrSegura(dataIso) {
        if (!dataIso || typeof window.formatarDataPtBr !== 'function') return '';
        return window.formatarDataPtBr(dataIso) || '';
    }

    function criarDataIsoMeioDia(dataIso) {
        if (!dataIso) return '';
        const data = new Date(`${dataIso}T12:00:00`);
        if (Number.isNaN(data.getTime())) return '';
        return data.toISOString();
    }

    function obterDiaSemanaPorIso(dataIso) {
        if (!dataIso) return '';
        const data = new Date(`${dataIso}T12:00:00`);
        if (Number.isNaN(data.getTime())) return '';

        const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        return dias[data.getDay()] || '';
    }

    function obterSlotContext(draft, options) {
        const custom = options && options.slotContext ? options.slotContext : {};
        const base = draft && draft.slotContext ? draft.slotContext : {};
        const dataIso = custom.dataIso || base.dataIso || '';
        const dataPtBr = custom.dataPtBr || base.dataPtBr || formatarDataPtBrSegura(dataIso);
        return {
            dataIso,
            dataPtBr,
            diaSemana: custom.diaSemana || base.diaSemana || obterDiaSemanaPorIso(dataIso),
            horaSugerida: custom.horaSugerida || base.horaSugerida || '',
            origem: custom.origem || base.origem || 'slot-picker'
        };
    }

    function derivarHorarioEDuracao(draft, slotContext) {
        const tipo = normalizarTipo(draft.creationType);
        const diaInteiro = tipo === 'bloqueio' && draft.mainForm && draft.mainForm.fullDay === true;
        const duracaoMinutos = diaInteiro
            ? window.BLOQUEIO_DIA_INTEIRO_DURACAO
            : Math.max(1, parseInt(draft.mainForm && draft.mainForm.duracaoMinutos ? draft.mainForm.duracaoMinutos : 60, 10) || 60);
        const horarioInicio = diaInteiro
            ? window.BLOQUEIO_DIA_INTEIRO_INICIO
            : ((draft.mainForm && draft.mainForm.horarioInicio) || slotContext.horaSugerida || '');

        if (!horarioInicio) {
            return criarResultadoErro('Selecione um horário de início para o agendamento.');
        }
        if (typeof window.somarMinutos !== 'function') {
            return criarResultadoErro('Não foi possível calcular o horário final do agendamento.');
        }

        const horarioFim = diaInteiro
            ? window.BLOQUEIO_DIA_INTEIRO_FIM
            : window.somarMinutos(horarioInicio, duracaoMinutos);

        return {
            ok: true,
            diaInteiro,
            duracaoMinutos,
            horarioInicio,
            horarioFim
        };
    }

    function validarCamposObrigatorios(tipo, draft) {
        if (tipo === 'aula' && !(draft.mainForm && draft.mainForm.alunoId)) {
            return criarResultadoErro('Selecione um aluno para agendar a aula.');
        }

        if (tipo === 'bloqueio' && !(draft.mainForm && draft.mainForm.descricao && draft.mainForm.descricao.trim())) {
            return criarResultadoErro('Informe uma descrição para o bloqueio.');
        }

        return { ok: true };
    }

    function validarLimitesDuracao(tipo, diaInteiro, duracaoMinutos) {
        if (tipo === 'bloqueio' && !diaInteiro && duracaoMinutos > window.BLOQUEIO_MAX_MINUTOS) {
            return criarResultadoErro('Bloqueios por hora podem ter no máximo 8h. Para mais tempo, use dia inteiro.');
        }

        if ((tipo === 'aula' || tipo === 'deslocamento') && duracaoMinutos > window.DURACAO_MAX_AULA_DESLOCAMENTO) {
            return criarResultadoErro('Aulas e deslocamentos podem ter no máximo 2h.');
        }

        return { ok: true };
    }

    function validarRecorrencia(draft, slotContext) {
        const recurrence = draft.recurrence || {};
        if (recurrence.enabled !== true) {
            return { ok: true };
        }

        const startDateIso = recurrence.startDateIso || slotContext.dataIso || '';
        if (!startDateIso) {
            return criarResultadoErro('Selecione a data de início da recorrência.');
        }

        if (recurrence.pattern === 'semanal' && (!Array.isArray(recurrence.daysOfWeek) || recurrence.daysOfWeek.length === 0)) {
            return criarResultadoErro('Selecione ao menos um dia da semana para a recorrência semanal.');
        }

        if (
            recurrence.endCondition === 'untilDate'
            && recurrence.untilDateIso
            && recurrence.untilDateIso < startDateIso
        ) {
            return criarResultadoErro('A data final da recorrência deve ser igual ou posterior à data de início.');
        }

        if (recurrence.endCondition === 'occurrences' && (parseInt(recurrence.occurrencesCount, 10) || 0) < 1) {
            return criarResultadoErro('Informe ao menos 1 ocorrência para encerrar a série.');
        }

        return { ok: true };
    }

    function montarPayloadBase(draft, slotContext, horario) {
        const tipo = normalizarTipo(draft.creationType);
        const recurrence = draft.recurrence || {};
        const dia = slotContext.diaSemana
            || (Array.isArray(recurrence.daysOfWeek) && recurrence.daysOfWeek.length > 0 ? recurrence.daysOfWeek[0] : '')
            || obterDiaSemanaPorIso(recurrence.startDateIso || slotContext.dataIso || '');
        const data = slotContext.dataPtBr || formatarDataPtBrSegura(slotContext.dataIso || recurrence.startDateIso || '');

        if (!data) {
            return criarResultadoErro('Não foi possível determinar a data do agendamento.');
        }

        return {
            ok: true,
            payload: {
                id: Date.now().toString(),
                tipo,
                dia,
                data,
                horarioInicio: horario.horarioInicio,
                horarioFim: horario.horarioFim,
                frequencia: recurrence.enabled === true ? 'semanal' : 'uma_vez'
            }
        };
    }

    function aplicarCamposPorTipo(payload, draft) {
        const tipo = payload.tipo;
        const mainForm = draft.mainForm || {};

        if (tipo === 'aula') {
            payload.alunoId = mainForm.alunoId || '';
            return;
        }

        if (tipo === 'bloqueio') {
            payload.descricao = (mainForm.descricao || '').trim();
            if (mainForm.fullDay === true) payload.fullDay = true;
            return;
        }

        if (tipo === 'deslocamento') {
            payload.descricao = 'Trânsito / Deslocamento';
            return;
        }

        if (tipo === 'reposicao') {
            if (mainForm.alunoId) payload.alunoId = mainForm.alunoId;
            if (mainForm.descricao) payload.descricao = mainForm.descricao.trim();
            if (mainForm.reposicaoReferenciaId) payload.reposicaoReferenciaId = mainForm.reposicaoReferenciaId;
        }
    }

    function aplicarRecorrenciaLegada(payload, draft, slotContext) {
        const recurrence = draft.recurrence || {};
        if (recurrence.enabled !== true) return;

        const startDateIso = recurrence.startDateIso || slotContext.dataIso || '';
        const startDatePtBr = formatarDataPtBrSegura(startDateIso) || slotContext.dataPtBr || payload.data;
        const daysOfWeek = recurrence.pattern === 'semanal'
            ? ((Array.isArray(recurrence.daysOfWeek) && recurrence.daysOfWeek.length > 0)
                ? recurrence.daysOfWeek.slice()
                : (slotContext.diaSemana ? [slotContext.diaSemana] : []))
            : [];

        payload.tipoRecorrencia = recurrence.pattern || 'semanal';
        payload.intervaloRecorrencia = Number(recurrence.interval || 1);
        payload.diasSemana = daysOfWeek;
        payload.recorrenciaEscopo = recurrence.scope || 'fromDate';
        payload.recorrenciaDataInicio = startDatePtBr;
        payload.data = startDatePtBr || payload.data;
        if (daysOfWeek.length > 0) {
            payload.dia = daysOfWeek[0];
        } else if (!payload.dia) {
            payload.dia = obterDiaSemanaPorIso(startDateIso);
        }
        payload.dataCriacao = criarDataIsoMeioDia(startDateIso) || new Date().toISOString();
        payload.excecoes = [];
        payload.excecoesDetalhadas = [];

        if (recurrence.endCondition && recurrence.endCondition !== 'never') {
            payload.recorrenciaFimCondicao = recurrence.endCondition;
        }
        if (recurrence.endCondition === 'untilDate' && recurrence.untilDateIso) {
            payload.recorrenciaDataFim = formatarDataPtBrSegura(recurrence.untilDateIso);
        }
        if (recurrence.endCondition === 'occurrences') {
            payload.recorrenciaQuantidadeOcorrencias = Math.max(1, parseInt(recurrence.occurrencesCount || 1, 10));
        }
    }

    function validarConflitos(payload) {
        if (typeof window.getConflitosNoDia !== 'function') {
            return { ok: true };
        }

        if (payload.frequencia === 'uma_vez') {
            const iso = typeof window.converterPtBrParaISO === 'function' ? window.converterPtBrParaISO(payload.data) : '';
            if (!iso) {
                return criarResultadoErro('Não foi possível validar conflitos para a data selecionada.');
            }
            const data = new Date(`${iso}T12:00:00`);
            if (Number.isNaN(data.getTime())) {
                return criarResultadoErro('Não foi possível validar conflitos para a data selecionada.');
            }
            const conflitos = window.getConflitosNoDia(payload, data);
            if (conflitos.length > 0) {
                return criarResultadoErro(`Conflito detectado com ${conflitos[0].nome} (${conflitos[0].faixa}).`);
            }
            return { ok: true };
        }

        if (
            typeof window.getDatasConflitoRecorrencia !== 'function'
            || typeof window.getConflitosRecorrenciaEmDatas !== 'function'
            || typeof window.gerarResumoConflitosDatas !== 'function'
        ) {
            return { ok: true };
        }

        const datas = window.getDatasConflitoRecorrencia(payload, 20);
        const conflitos = window.getConflitosRecorrenciaEmDatas(payload, datas);
        if (conflitos.length > 0) {
            const resumo = window.gerarResumoConflitosDatas(conflitos, 5);
            return criarResultadoErro(`Não foi possível salvar. Existem conflitos em: ${resumo}.`);
        }

        return {
            ok: true,
            conflitoDatas: datas
        };
    }

    window.serializarRascunhoAgendamento = function (draft, options) {
        const normalizedDraft = normalizarDraft(draft);
        const slotContext = obterSlotContext(normalizedDraft, options || {});
        const tipo = normalizarTipo(normalizedDraft.creationType);

        const camposObrigatorios = validarCamposObrigatorios(tipo, normalizedDraft);
        if (!camposObrigatorios.ok) return camposObrigatorios;

        const horario = derivarHorarioEDuracao(normalizedDraft, slotContext);
        if (!horario.ok) return horario;

        const limites = validarLimitesDuracao(tipo, horario.diaInteiro, horario.duracaoMinutos);
        if (!limites.ok) return limites;

        const recorrencia = validarRecorrencia(normalizedDraft, slotContext);
        if (!recorrencia.ok) return recorrencia;

        const base = montarPayloadBase(normalizedDraft, slotContext, horario);
        if (!base.ok) return base;

        const payload = base.payload;
        aplicarCamposPorTipo(payload, normalizedDraft);

        // O engine legado entra no ramo recorrente quando frequencia === 'semanal',
        // mesmo para padroes diaria, mensal e anual.
        aplicarRecorrenciaLegada(payload, normalizedDraft, slotContext);

        const conflitos = validarConflitos(payload);
        if (!conflitos.ok) return conflitos;

        return {
            ok: true,
            payload,
            conflitoDatas: conflitos.conflitoDatas || []
        };
    };
})();
