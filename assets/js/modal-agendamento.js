// [TAG-MODAL-AGENDAMENTO] modal-agendamento.js
// Responsabilidade: Modais de criação de compromissos — Escolha inicial, modal principal unificado e recorrência
// Depende de: state.js (aulas, alunos, aulasParaRepor, HORARIOS), storage.js (salvarDados),
//             utils-datetime.js (formatarDataPtBr, converterPtBrParaISO, abrirDatePickerNativo, somarMinutos, getDataSelecionadaPtBr, getDiaTextoSelecionado),
//             widget-stepper-duracao.js (sincronizarSteppersDuracao, aplicarLimitesDuracaoPorContexto),
//             widget-bloqueio.js (atualizarEstadoBloqueioDiaInteiro*),
//             agenda-conflitos.js (getDatasConflitoRecorrencia, getConflitosRecorrenciaEmDatas, gerarResumoConflitosDatas),
//             scheduling-serializer.js (serializarRascunhoAgendamento),
//             utils-kpi.js (mostrarToast), view-home.js (inicializarHome — em runtime),
//             modal-acao-slot.js (abrirReagendarAulaModalSlot — em runtime)
// Expõe: window.abrirNovoAgendamento, window.abrirEscolhaTipoModal, window.fecharEscolhaTipoModal,
//         window.abrirAgendamentoModal, window.selecionarTipoAgendamento,
//         window.inicializarMultiSelectPills, window.atualizarTextoPreviewRecorrencia,
//         window.atualizarResumoRecorrenciaCadastro, window.mudarPadraoRecorrencia,
//         window.abrirModalRecorrencia, window.selecionarTipoRecorrente,
//         window.obterResumoEscopoCriacaoRecorrencia, window.atualizarResumoEscopoCriacaoRecorrencia,
//         window.configurarEscopoCriacaoRecorrencia

// ── Variáveis de estado do modal (privadas a este módulo) ──────────────────────────────────────
let slotSelecionadoHora = "";
let slotSelecionadoDiaTexto = "";
let rascunhoFluxoAgendamento = typeof window.criarRascunhoFluxoAgendamento === 'function'
    ? window.criarRascunhoFluxoAgendamento()
    : null;
let rascunhoRecorrenciaTemporario = null;
let ultimoFocoAntesModalRecorrencia = null;
let trapFocoRecorrenciaAtivo = null;

function getDataSelecionadaAtualPtBr() {
    if (typeof window.getDataSelecionadaPtBr === 'function') {
        return window.getDataSelecionadaPtBr() || '';
    }
    if (window.dataSelecionada instanceof Date && !Number.isNaN(window.dataSelecionada.getTime())) {
        return window.dataSelecionada.toLocaleDateString('pt-BR');
    }
    return '';
}

function normalizarDataLocal(dataReferencia) {
    if (!(dataReferencia instanceof Date) || Number.isNaN(dataReferencia.getTime())) {
        return null;
    }
    return new Date(
        dataReferencia.getFullYear(),
        dataReferencia.getMonth(),
        dataReferencia.getDate(),
        0,
        0,
        0,
        0
    );
}

function resolverDataContextoAgendamento(opcoes = {}) {
    const dataOpcional = normalizarDataLocal(opcoes.dataSelecionada);
    if (dataOpcional) return dataOpcional;

    const dataGlobal = normalizarDataLocal(window.dataSelecionada);
    if (dataGlobal) return dataGlobal;

    return normalizarDataLocal(new Date());
}

function getDataSelecionadaAtualIso() {
    if (typeof window.formatarDataLocalParaISODate === 'function') {
        return window.formatarDataLocalParaISODate(window.dataSelecionada);
    }
    if (!(window.dataSelecionada instanceof Date) || Number.isNaN(window.dataSelecionada.getTime())) {
        return '';
    }
    const ano = window.dataSelecionada.getFullYear();
    const mes = String(window.dataSelecionada.getMonth() + 1).padStart(2, '0');
    const dia = String(window.dataSelecionada.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function atualizarInfoHorarioAlvoModal(dia) {
    const infoHorario = document.getElementById('infoHorarioAlvo');
    if (!infoHorario) return;
    const dataSelecionadaTexto = getDataSelecionadaAtualPtBr();
    infoHorario.textContent = dataSelecionadaTexto
        ? `${dia} • ${dataSelecionadaTexto} — Definir Período`
        : `${dia} — Definir Período`;
}

function atualizarCampoDataModalAgendamento() {
    const inputDataAgenda = document.getElementById('agendaDataSelecionadaInput');
    if (!inputDataAgenda) return;
    inputDataAgenda.value = getDataSelecionadaAtualIso();
}

function sincronizarCamposDataModalAgendamento() {
    atualizarCampoDataModalAgendamento();
    const campoDataLegada = document.getElementById('agendaData');
    if (campoDataLegada) {
        campoDataLegada.value = getDataSelecionadaAtualPtBr();
    }
}

function criarContextoSlotAgendamento(dia, hora) {
    const dataPtBr = getDataSelecionadaAtualPtBr();
    return {
        dataIso: typeof window.converterPtBrParaISO === 'function' ? window.converterPtBrParaISO(dataPtBr) || '' : '',
        dataPtBr,
        diaSemana: dia || slotSelecionadoDiaTexto || '',
        horaSugerida: hora || window.horarioSelecionadoSlot || '08:00',
        origem: 'slot-picker'
    };
}

function criarMetaTipoAgendamento(tipo) {
    if (tipo === 'bloqueio') {
        return {
            titulo: 'Agendar Bloqueio',
            subtitulo: 'Defina uma indisponibilidade pontual agora e, em seguida, conecte a repetição se precisar.',
            infoTipo: 'Bloqueio',
            submitLabel: 'Salvar Bloqueio',
            icone: 'fa-lock'
        };
    }
    if (tipo === 'deslocamento') {
        return {
            titulo: 'Agendar Deslocamento',
            subtitulo: 'Use o mesmo formulário principal para reservar janelas de trânsito ou deslocamento.',
            infoTipo: 'Deslocamento',
            submitLabel: 'Salvar Deslocamento',
            icone: 'fa-car-side'
        };
    }
    return {
        titulo: 'Agendar Aula',
        subtitulo: 'Complete os dados principais da aula e ajuste a repetição como um atributo do compromisso.',
        infoTipo: 'Aula',
        submitLabel: 'Agendar Aula',
        icone: 'fa-graduation-cap'
    };
}

function atualizarCabecalhoModalAgendamento(tipo) {
    const meta = criarMetaTipoAgendamento(tipo);
    const titulo = document.getElementById('agendaTituloModal');
    const subtitulo = document.getElementById('agendaSubtituloModal');
    const infoTipo = document.getElementById('infoTipoAgendamento');
    const submitButton = document.getElementById('btnSalvarAgendamento');

    if (titulo) {
        titulo.innerHTML = `<i class="fa-solid ${meta.icone}" style="color: #ffd700; margin-right: 8px"></i>${meta.titulo}`;
    }
    if (subtitulo) subtitulo.textContent = meta.subtitulo;
    if (infoTipo) infoTipo.textContent = meta.infoTipo;
    if (submitButton) submitButton.textContent = meta.submitLabel;
}

function atualizarResumoRecorrenciaAgendamentoPrincipal() {
    const resumo = document.getElementById('agendaResumoRecorrencia');
    const resumoAux = document.getElementById('agendaResumoRecorrenciaAux');
    if (!resumo || !resumoAux) return;

    const recurrence = rascunhoFluxoAgendamento && rascunhoFluxoAgendamento.recurrence
        ? rascunhoFluxoAgendamento.recurrence
        : { enabled: false, summaryText: 'Não se repete' };

    resumo.textContent = recurrence.summaryText || 'Não se repete';
    resumoAux.textContent = recurrence.enabled
        ? 'A configuração detalhada será refinada no próximo passo do fluxo.'
        : 'A configuração detalhada da repetição será conectada no próximo passo.';
}

function atualizarRascunhoPrincipalAgendamento(partialMainForm) {
    if (typeof window.criarEstadoFluxoAgendamento !== 'function') return;

    const base = rascunhoFluxoAgendamento || window.criarRascunhoFluxoAgendamento();
    rascunhoFluxoAgendamento = window.criarEstadoFluxoAgendamento({
        ...base,
        mainForm: {
            ...base.mainForm,
            ...(partialMainForm || {})
        }
    });
}

function capturarFormularioPrincipalNoRascunho() {
    atualizarRascunhoPrincipalAgendamento({
        alunoId: document.getElementById('agendaAluno')?.value || '',
        descricao: document.getElementById('agendaDescricao')?.value.trim() || '',
        horarioInicio: document.getElementById('agendaHoraInicio')?.value || '',
        duracaoMinutos: parseInt(document.getElementById('agendaDuracao')?.value || '60', 10) || 60,
        fullDay: document.getElementById('agendaBloqueioDiaInteiro')?.checked === true
    });
}

// ── Modal: Escolha de Tipo ─────────────────────────────────────────────────────────────────────

window.abrirNovoAgendamento = function(opcoes = {}) {
    window.dataSelecionada = resolverDataContextoAgendamento(opcoes);

    const dia = opcoes.dia || window.getDiaTextoSelecionado();
    const hora = opcoes.hora || window.horarioSelecionadoSlot || '08:00';
    window.horarioSelecionadoSlot = hora;
    slotSelecionadoDiaTexto = dia;
    slotSelecionadoHora = hora;

    if (typeof window.aplicarContextoAoFluxoAgendamento === 'function') {
        rascunhoFluxoAgendamento = window.aplicarContextoAoFluxoAgendamento(
            rascunhoFluxoAgendamento || window.criarRascunhoFluxoAgendamento(),
            criarContextoSlotAgendamento(dia, hora)
        );
    }

    window.abrirEscolhaTipoModal(dia, hora);
};

window.abrirEscolhaTipoModal = function(dia, hora) {
    slotSelecionadoHora = hora;
    slotSelecionadoDiaTexto = dia;
    window.horarioSelecionadoSlot = hora;

    if (typeof window.aplicarContextoAoFluxoAgendamento === 'function') {
        rascunhoFluxoAgendamento = window.aplicarContextoAoFluxoAgendamento(
            rascunhoFluxoAgendamento || window.criarRascunhoFluxoAgendamento(),
            criarContextoSlotAgendamento(dia, hora)
        );
    }

    const modal = document.getElementById('modalEscolhaTipo');
    if (modal) {
        const nomeDiaEscolha = (dia === 'Sábado' || dia === 'Domingo') ? dia : `${dia}-feira`;
        const info = document.getElementById('infoEscolhaSlot');
        const dataSelecionadaTexto = typeof window.getDataSelecionadaPtBr === 'function'
            ? window.getDataSelecionadaPtBr()
            : '';
        if (info) {
            info.textContent = dataSelecionadaTexto
                ? `Agendar às ${hora} de ${nomeDiaEscolha} • ${dataSelecionadaTexto}`
                : `Agendar às ${hora} de ${nomeDiaEscolha}`;
        }
        modal.style.display = 'flex';
    }
};

window.fecharEscolhaTipoModal = function() {
    const modal = document.getElementById('modalEscolhaTipo');
    if (modal) {
        modal.style.display = 'none';
    }
};

// ── Modal: Agendamento Único ───────────────────────────────────────────────────────────────────

window.abrirAgendamentoModal = function(dia, hora, tipoInicial = 'aula') {
    slotSelecionadoHora = hora;
    slotSelecionadoDiaTexto = dia;
    const tipoSelecionado = ['aula', 'bloqueio', 'deslocamento'].includes(tipoInicial) ? tipoInicial : 'aula';

    const modal = document.getElementById('modalAgendamento');
    atualizarInfoHorarioAlvoModal(dia);

    if (document.getElementById('formAgendamento')) {
        document.getElementById('formAgendamento').reset();
    }
    sincronizarCamposDataModalAgendamento();

    const selectInicio = document.getElementById('agendaHoraInicio');
    const selectDuracao = document.getElementById('agendaDuracao');
    
    const optionsHtml = HORARIOS.map(h => `<option value="${h}">${h}</option>`).join('');
    selectInicio.innerHTML = optionsHtml;
    selectInicio.value = hora || window.horarioSelecionadoSlot || "08:00";
    if (selectDuracao) {
        selectDuracao.value = "60"; 
    }
    window.sincronizarSteppersDuracao();

    const selectAluno = document.getElementById('agendaAluno');
    if (selectAluno) {
        selectAluno.innerHTML = '<option value="">Selecione um aluno...</option>' + 
            alunos.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
    }

    const bloqueioDesc = document.getElementById('agendaDescricao');
    if (bloqueioDesc) bloqueioDesc.value = '';
    const checkDiaInteiro = document.getElementById('agendaBloqueioDiaInteiro');
    if (checkDiaInteiro) checkDiaInteiro.checked = false;
    window.atualizarEstadoBloqueioDiaInteiroAgenda();

    if (typeof window.criarRascunhoFluxoAgendamento === 'function') {
        rascunhoFluxoAgendamento = window.criarRascunhoFluxoAgendamento({
            creationType: tipoSelecionado,
            slotContext: criarContextoSlotAgendamento(dia, hora),
            mainForm: {
                horarioInicio: hora || window.horarioSelecionadoSlot || "08:00",
                duracaoMinutos: 60
            }
        });
    }

    window.selecionarTipoAgendamento(tipoSelecionado);
    atualizarResumoRecorrenciaAgendamentoPrincipal();
    if (modal) modal.style.display = 'flex';
};

window.selecionarTipoAgendamento = function(tipo) {
    document.getElementById('agendaTipo').value = tipo;
    const tabAula = document.getElementById('tabAgendarAula');
    const tabDeslocamento = document.getElementById('tabAgendarDeslocamento');
    const tabBloqueio = document.getElementById('tabAgendarBloqueio');
    const camposAula = document.getElementById('camposTipoAula');
    const camposBloqueio = document.getElementById('camposTipoBloqueio');
    const camposBloqueioDiaInteiro = document.getElementById('camposTipoBloqueioDiaInteiro');
    const checkDiaInteiro = document.getElementById('agendaBloqueioDiaInteiro');

    if (typeof window.redefinirFormularioPrincipalAgendamento === 'function') {
        rascunhoFluxoAgendamento = window.redefinirFormularioPrincipalAgendamento(
            rascunhoFluxoAgendamento || window.criarRascunhoFluxoAgendamento(),
            tipo
        );
    }

    tabAula.classList.remove('active');
    tabDeslocamento.classList.remove('active');
    tabBloqueio.classList.remove('active');

    if (tipo === 'aula') {
        tabAula.classList.add('active');
        camposAula.style.display = 'block';
        camposBloqueio.style.display = 'none';
        if (camposBloqueioDiaInteiro) camposBloqueioDiaInteiro.style.display = 'none';
        if (checkDiaInteiro) checkDiaInteiro.checked = false;
        window.atualizarEstadoBloqueioDiaInteiroAgenda();
        window.aplicarLimitesDuracaoPorContexto('agenda');
        document.getElementById('agendaAluno').required = true;
        document.getElementById('agendaDescricao').required = false;
    } else if (tipo === 'deslocamento') {
        tabDeslocamento.classList.add('active');
        camposAula.style.display = 'none';
        camposBloqueio.style.display = 'none'; 
        if (camposBloqueioDiaInteiro) camposBloqueioDiaInteiro.style.display = 'none';
        if (checkDiaInteiro) checkDiaInteiro.checked = false;
        window.atualizarEstadoBloqueioDiaInteiroAgenda();
        window.aplicarLimitesDuracaoPorContexto('agenda');
        document.getElementById('agendaAluno').required = false;
        document.getElementById('agendaDescricao').required = false;
    } else if (tipo === 'bloqueio') {
        tabBloqueio.classList.add('active');
        camposAula.style.display = 'none';
        camposBloqueio.style.display = 'block'; 
        if (camposBloqueioDiaInteiro) camposBloqueioDiaInteiro.style.display = 'block';
        window.atualizarEstadoBloqueioDiaInteiroAgenda();
        window.aplicarLimitesDuracaoPorContexto('agenda');
        document.getElementById('agendaAluno').required = false;
        document.getElementById('agendaDescricao').required = true;
    }

    atualizarCabecalhoModalAgendamento(tipo);
    atualizarResumoRecorrenciaAgendamentoPrincipal();
};

// ── Modal: Agendamento Recorrente ──────────────────────────────────────────────────────────────

function clonarEstadoRecorrenciaAgendamento(recorrencia) {
    if (typeof window.criarEstadoRecorrenciaAgendamento === 'function') {
        return window.criarEstadoRecorrenciaAgendamento(JSON.parse(JSON.stringify(recorrencia || {})));
    }
    return JSON.parse(JSON.stringify(recorrencia || {}));
}

function obterRecorrenciaAtualDoFluxo() {
    if (!rascunhoFluxoAgendamento) {
        return typeof window.criarEstadoInicialRecorrenciaAgendamento === 'function'
            ? window.criarEstadoInicialRecorrenciaAgendamento(criarContextoSlotAgendamento(slotSelecionadoDiaTexto, slotSelecionadoHora))
            : null;
    }

    const recurrence = rascunhoFluxoAgendamento.recurrence || {};
    const clonado = clonarEstadoRecorrenciaAgendamento(recurrence);
    if (!clonado.startDateIso && rascunhoFluxoAgendamento.slotContext?.dataIso) {
        clonado.startDateIso = rascunhoFluxoAgendamento.slotContext.dataIso;
    }
    if ((!clonado.daysOfWeek || clonado.daysOfWeek.length === 0) && rascunhoFluxoAgendamento.slotContext?.diaSemana) {
        clonado.daysOfWeek = [rascunhoFluxoAgendamento.slotContext.diaSemana];
    }
    return clonado;
}

function getRecurrenceFocusableElements() {
    const modal = document.getElementById('modalRecorrencia');
    if (!modal) return [];

    return Array.from(
        modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter((el) => !el.disabled && el.offsetParent !== null);
}

function ativarTrapFocoModalRecorrencia() {
    if (trapFocoRecorrenciaAtivo) {
        document.removeEventListener('keydown', trapFocoRecorrenciaAtivo, true);
    }

    trapFocoRecorrenciaAtivo = function (event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            window.fecharModalRecorrencia();
            return;
        }

        if (event.key !== 'Tab') return;
        const focusables = getRecurrenceFocusableElements();
        if (focusables.length === 0) return;

        const primeiro = focusables[0];
        const ultimo = focusables[focusables.length - 1];
        const ativo = document.activeElement;

        if (event.shiftKey && ativo === primeiro) {
            event.preventDefault();
            ultimo.focus();
        } else if (!event.shiftKey && ativo === ultimo) {
            event.preventDefault();
            primeiro.focus();
        }
    };

    document.addEventListener('keydown', trapFocoRecorrenciaAtivo, true);

    const focusables = getRecurrenceFocusableElements();
    if (focusables.length > 0) {
        focusables[0].focus();
    } else {
        document.getElementById('modalRecorrencia')?.focus();
    }
}

function desativarTrapFocoModalRecorrencia() {
    if (!trapFocoRecorrenciaAtivo) return;
    document.removeEventListener('keydown', trapFocoRecorrenciaAtivo, true);
    trapFocoRecorrenciaAtivo = null;
}

function bloquearModalPrincipalParaRecorrencia() {
    const modalPrincipal = document.getElementById('modalAgendamento');
    if (!modalPrincipal) return;
    modalPrincipal.classList.add('modal-underlay-blocked');
    modalPrincipal.setAttribute('aria-hidden', 'true');
}

function desbloquearModalPrincipalParaRecorrencia() {
    const modalPrincipal = document.getElementById('modalAgendamento');
    if (!modalPrincipal) return;
    modalPrincipal.classList.remove('modal-underlay-blocked');
    modalPrincipal.removeAttribute('aria-hidden');
}

function getLabelPadraoRecorrencia(padrao) {
    if (padrao === 'diaria') return 'Diária';
    if (padrao === 'mensal') return 'Mensal';
    if (padrao === 'anual') return 'Anual';
    return 'Semanal';
}

function getTextoIntervaloRecorrencia(padrao, intervalo) {
    const valor = intervalo > 0 ? intervalo : 1;
    if (padrao === 'diaria') return valor === 1 ? 'todos os dias úteis' : `a cada ${valor} dias úteis`;
    if (padrao === 'mensal') return valor === 1 ? 'todo mês' : `a cada ${valor} meses`;
    if (padrao === 'anual') return valor === 1 ? 'todo ano' : `a cada ${valor} anos`;
    return valor === 1 ? 'toda semana' : `a cada ${valor} semanas`;
}

function getTextoDiasRecorrencia(diasSemana) {
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
}

function getTextoFimRecorrencia(recorrencia) {
    if (!recorrencia) return 'sem data final';
    if (recorrencia.endCondition === 'untilDate' && recorrencia.untilDateIso) {
        return `até ${window.formatarDataPtBr(recorrencia.untilDateIso)}`;
    }
    if (recorrencia.endCondition === 'occurrences') {
        return `${recorrencia.occurrencesCount || 1} ocorrência(s)`;
    }
    return 'sem data final';
}

function montarResumoRecorrencia(recorrencia) {
    if (!recorrencia || recorrencia.enabled !== true) {
        return 'Não se repete';
    }

    const padrao = getLabelPadraoRecorrencia(recorrencia.pattern);
    const dias = recorrencia.pattern === 'semanal' ? getTextoDiasRecorrencia(recorrencia.daysOfWeek) : '';
    const partes = [padrao];

    if (dias) {
        partes.push(dias);
    } else {
        partes.push(getTextoIntervaloRecorrencia(recorrencia.pattern, recorrencia.interval));
    }

    if (recorrencia.endCondition === 'untilDate' && recorrencia.untilDateIso) {
        partes.push(`até ${window.formatarDataPtBr(recorrencia.untilDateIso)}`);
    } else if (recorrencia.endCondition === 'occurrences') {
        partes.push(`${recorrencia.occurrencesCount || 1}x`);
    }

    return partes.join(' • ');
}

function montarPreviewRecorrencia(recorrencia) {
    if (!recorrencia) return '';

    const inicio = recorrencia.startDateIso ? window.formatarDataPtBr(recorrencia.startDateIso) : '';
    const dias = recorrencia.pattern === 'semanal' ? getTextoDiasRecorrencia(recorrencia.daysOfWeek) : '';
    const partes = [
        `${getLabelPadraoRecorrencia(recorrencia.pattern)} ${getTextoIntervaloRecorrencia(recorrencia.pattern, recorrencia.interval)}`
    ];

    if (dias) partes.push(`nos dias ${dias}`);
    if (inicio) partes.push(`a partir de ${inicio}`);
    partes.push(getTextoFimRecorrencia(recorrencia));

    return partes.join(' • ');
}

function preencherFormularioRecorrencia(recorrencia) {
    const recurrenceState = clonarEstadoRecorrenciaAgendamento(recorrencia);
    const inputPadrao = document.getElementById('recorrenciaPadrao');
    const inputIntervalo = document.getElementById('recorrenciaIntervalo');
    const inputDataInicio = document.getElementById('recorrenciaDataInicio');
    const inputCondicaoFim = document.getElementById('recorrenciaEndCondition');
    const inputDataFim = document.getElementById('recorrenciaUntilDate');
    const inputOcorrencias = document.getElementById('recorrenciaOccurrencesCount');
    const inputEscopo = document.getElementById('recorrenciaEscopoCriacao');
    const inputIncluirMesAtual = document.getElementById('recorrenciaIncluirMesAtualRetroativo');

    if (inputPadrao) inputPadrao.value = recurrenceState.pattern || 'semanal';
    if (inputIntervalo) inputIntervalo.value = `${recurrenceState.interval || 1}`;
    if (inputDataInicio) inputDataInicio.value = recurrenceState.startDateIso || '';
    if (inputCondicaoFim) inputCondicaoFim.value = recurrenceState.endCondition || 'never';
    if (inputDataFim) inputDataFim.value = recurrenceState.untilDateIso || '';
    if (inputOcorrencias) inputOcorrencias.value = `${recurrenceState.occurrencesCount || 1}`;
    if (inputEscopo) inputEscopo.value = recurrenceState.scope || 'fromDate';
    if (inputIncluirMesAtual) inputIncluirMesAtual.checked = recurrenceState.includeCurrentMonthBackfill === true;

    document.querySelectorAll('#containerDiasSemanaRecorrencia .btn-dia-pill').forEach((btn) => {
        btn.classList.toggle('active', recurrenceState.daysOfWeek.includes(btn.getAttribute('data-dia')));
    });

    window.mudarPadraoRecorrencia();
    window.atualizarEstadoFimRecorrencia();
    window.atualizarTextoPreviewRecorrencia();
    window.atualizarResumoEscopoCriacaoRecorrencia();
}

function lerFormularioRecorrencia() {
    const pattern = document.getElementById('recorrenciaPadrao')?.value || 'semanal';
    const interval = parseInt(document.getElementById('recorrenciaIntervalo')?.value || '1', 10) || 1;
    const startDateIso = document.getElementById('recorrenciaDataInicio')?.value || '';
    const endCondition = document.getElementById('recorrenciaEndCondition')?.value || 'never';
    const untilDateIso = document.getElementById('recorrenciaUntilDate')?.value || '';
    const occurrencesCount = parseInt(document.getElementById('recorrenciaOccurrencesCount')?.value || '1', 10) || 1;
    const scope = 'fromDate';
    const includeCurrentMonthBackfill = document.getElementById('recorrenciaIncluirMesAtualRetroativo')?.checked === true;
    const daysOfWeek = [];

    document.querySelectorAll('#containerDiasSemanaRecorrencia .btn-dia-pill.active').forEach((btn) => {
        daysOfWeek.push(btn.getAttribute('data-dia'));
    });

    return window.criarEstadoRecorrenciaAgendamento({
        ...(rascunhoRecorrenciaTemporario || {}),
        enabled: true,
        pattern,
        interval,
        daysOfWeek: pattern === 'semanal' ? daysOfWeek : [],
        startDateIso,
        endCondition,
        untilDateIso: endCondition === 'untilDate' ? untilDateIso : '',
        occurrencesCount: endCondition === 'occurrences' ? occurrencesCount : 1,
        scope,
        includeCurrentMonthBackfill,
        hasCustomSettings: true
    });
}

window.inicializarMultiSelectPills = function() {
    document.querySelectorAll('#containerDiasSemanaRecorrencia .btn-dia-pill').forEach(btn => {
        const novoBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(novoBtn, btn);
        
        novoBtn.addEventListener('click', () => {
            novoBtn.classList.toggle('active');
            window.atualizarTextoPreviewRecorrencia();
        });
    });

    const inputIntervalo = document.getElementById('recorrenciaIntervalo');
    if (inputIntervalo) {
        inputIntervalo.addEventListener('input', () => {
            window.atualizarTextoPreviewRecorrencia();
        });
    }
};

window.atualizarTextoPreviewRecorrencia = function() {
    const infoText = document.getElementById('textoInfoMensalAnual');
    const recorrencia = lerFormularioRecorrencia();
    rascunhoRecorrenciaTemporario = clonarEstadoRecorrenciaAgendamento(recorrencia);
    const msg = montarPreviewRecorrencia(recorrencia);

    if (infoText) {
        infoText.innerHTML = `<i class="fa-solid fa-circle-info" style="margin-right: 6px;"></i>${msg}`;
    }

    window.atualizarResumoRecorrenciaCadastro();
};

window.atualizarResumoRecorrenciaCadastro = function() {
    const container = document.getElementById('resumoRecorrenciaCadastro');
    if (!container) return;
    const recorrencia = lerFormularioRecorrencia();
    const escopoTxt = recorrencia.includeCurrentMonthBackfill
        ? 'Daqui pra frente + incluir mês atual'
        : 'Daqui pra frente';
    const inicioFmt = recorrencia.startDateIso
        ? window.formatarDataPtBrLegivel(window.formatarDataPtBr(recorrencia.startDateIso))
        : 'sem data';

    container.innerHTML = `
        <strong style="display:block; margin-bottom:4px; color:#FFD700;">Resumo da repetição</strong>
        <span style="display:block; font-size:0.78rem; color:#DDD;">${montarResumoRecorrencia({ ...recorrencia, enabled: true })}</span>
        <span style="display:block; font-size:0.78rem; color:#BBB; margin-top:2px;">Início: ${inicioFmt} • Escopo: ${escopoTxt}</span>
    `;
};

window.mudarPadraoRecorrencia = function() {
    const padrao = document.getElementById('recorrenciaPadrao')?.value || 'semanal';
    const containerDias = document.getElementById('containerDiasSemanaRecorrencia');
    const labelUnidade = document.getElementById('labelUnidadeRecorrencia');

    if (padrao === 'diaria') {
        containerDias.style.display = 'none';
        labelUnidade.textContent = 'dia(s)';
    } else if (padrao === 'semanal') {
        containerDias.style.display = 'block';
        labelUnidade.textContent = 'semana(s)';
    } else if (padrao === 'mensal') {
        containerDias.style.display = 'none';
        labelUnidade.textContent = 'mês(es)';
    } else if (padrao === 'anual') {
        containerDias.style.display = 'none';
        labelUnidade.textContent = 'ano(s)';
    }

    window.atualizarTextoPreviewRecorrencia();
};

window.atualizarEstadoFimRecorrencia = function() {
    const endCondition = document.getElementById('recorrenciaEndCondition')?.value || 'never';
    const containerDataFim = document.getElementById('containerDataFimRecorrencia');
    const containerOcorrencias = document.getElementById('containerOcorrenciasRecorrencia');
    const inputDataFim = document.getElementById('recorrenciaUntilDate');
    const inputOcorrencias = document.getElementById('recorrenciaOccurrencesCount');

    if (containerDataFim) containerDataFim.style.display = endCondition === 'untilDate' ? 'flex' : 'none';
    if (containerOcorrencias) containerOcorrencias.style.display = endCondition === 'occurrences' ? 'flex' : 'none';
    if (inputDataFim) inputDataFim.required = endCondition === 'untilDate';
    if (inputOcorrencias) inputOcorrencias.required = endCondition === 'occurrences';
};

window.abrirModalRecorrencia = function(dia, hora) {
    const modal = document.getElementById('modalRecorrencia');
    if (!modal || !window.podeUsarRecorrenciaNoFluxoAgendamento?.(rascunhoFluxoAgendamento?.creationType || 'aula')) {
        return;
    }

    if (typeof window.aplicarContextoAoFluxoAgendamento === 'function') {
        rascunhoFluxoAgendamento = window.aplicarContextoAoFluxoAgendamento(
            rascunhoFluxoAgendamento || window.criarRascunhoFluxoAgendamento(),
            criarContextoSlotAgendamento(dia || slotSelecionadoDiaTexto, hora || slotSelecionadoHora)
        );
    }

    capturarFormularioPrincipalNoRascunho();
    ultimoFocoAntesModalRecorrencia = document.activeElement;
    rascunhoRecorrenciaTemporario = obterRecorrenciaAtualDoFluxo();
    preencherFormularioRecorrencia(rascunhoRecorrenciaTemporario);

    modal.classList.add('modal-overlay-secondary');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('tabindex', '-1');
    bloquearModalPrincipalParaRecorrencia();
    modal.style.display = 'flex';
    ativarTrapFocoModalRecorrencia();
};

window.fecharModalRecorrencia = function() {
    const modal = document.getElementById('modalRecorrencia');
    if (!modal) return;

    modal.style.display = 'none';
    modal.classList.remove('modal-overlay-secondary');
    desbloquearModalPrincipalParaRecorrencia();
    desativarTrapFocoModalRecorrencia();
    rascunhoRecorrenciaTemporario = null;

    if (ultimoFocoAntesModalRecorrencia && typeof ultimoFocoAntesModalRecorrencia.focus === 'function') {
        ultimoFocoAntesModalRecorrencia.focus();
    }
    ultimoFocoAntesModalRecorrencia = null;
};

window.selecionarTipoRecorrente = function() {
    return rascunhoFluxoAgendamento?.creationType || 'aula';
};

// ── Escopo de Criação da Recorrência ──────────────────────────────────────────────────────────

window.obterResumoEscopoCriacaoRecorrencia = function(incluirMesAtualRetroativo) {
    if (incluirMesAtualRetroativo === true) {
        return 'Cria desta data em diante e inclui datas válidas anteriores neste mês.';
    }
    return 'Cria a série desta data em diante.';
};

window.atualizarResumoEscopoCriacaoRecorrencia = function() {
    const inputIncluirMesAtual = document.getElementById('recorrenciaIncluirMesAtualRetroativo');
    const resumo = document.getElementById('recorrenciaEscopoCriacaoResumo');
    if (!resumo) return;
    resumo.textContent = window.obterResumoEscopoCriacaoRecorrencia(inputIncluirMesAtual?.checked === true);
};

window.configurarEscopoCriacaoRecorrencia = function() {
    const inputEscopo = document.getElementById('recorrenciaEscopoCriacao');
    const inputIncluirMesAtual = document.getElementById('recorrenciaIncluirMesAtualRetroativo');
    if (inputEscopo) inputEscopo.value = 'fromDate';
    if (!inputIncluirMesAtual) {
        window.atualizarResumoEscopoCriacaoRecorrencia();
        return;
    }
    const novoInput = inputIncluirMesAtual.cloneNode(true);
    inputIncluirMesAtual.parentNode.replaceChild(novoInput, inputIncluirMesAtual);
    novoInput.addEventListener('change', () => {
        window.atualizarResumoEscopoCriacaoRecorrencia();
        window.atualizarResumoRecorrenciaCadastro();
    });
    window.atualizarResumoEscopoCriacaoRecorrencia();
};

function obterMensagemConfirmacaoConflitosRecorrencia(conflitosResumo) {
    if (!conflitosResumo) {
        return 'Foram detectados conflitos na projeção retroativa do mês atual. Deseja salvar mesmo assim?';
    }
    return `Foram detectados conflitos na projeção retroativa do mês atual (${conflitosResumo}). Deseja salvar mesmo assim?`;
}

function confirmarConflitosRecorrenciaSeNecessario(resultadoSerializacao) {
    if (!resultadoSerializacao?.conflitosPendentesConfirmacao || resultadoSerializacao.conflitosPendentesConfirmacao.length === 0) {
        return true;
    }
    return window.confirm(obterMensagemConfirmacaoConflitosRecorrencia(resultadoSerializacao.conflitosResumo || ''));
}

// ── Event Listeners (DOMContentLoaded) ────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    const btnRecorrencia = document.getElementById('btnRecorrenciaAgenda');
    if (btnRecorrencia) {
        btnRecorrencia.addEventListener('click', () => {
            window.abrirNovoAgendamento();
        });
    }

    const btnFecharRecorrencia = document.getElementById('btnFecharModalRecorrencia');
    if (btnFecharRecorrencia) {
        btnFecharRecorrencia.addEventListener('click', () => {
            window.fecharModalRecorrencia();
        });
    }

    const btnEscolhaAula = document.getElementById('btnEscolhaAula');
    if (btnEscolhaAula) {
        btnEscolhaAula.addEventListener('click', () => {
            window.fecharEscolhaTipoModal();
            window.abrirAgendamentoModal(slotSelecionadoDiaTexto, slotSelecionadoHora, 'aula');
        });
    }

    const btnEscolhaBloqueio = document.getElementById('btnEscolhaBloqueio');
    if (btnEscolhaBloqueio) {
        btnEscolhaBloqueio.addEventListener('click', () => {
            window.fecharEscolhaTipoModal();
            window.abrirAgendamentoModal(slotSelecionadoDiaTexto, slotSelecionadoHora, 'bloqueio');
        });
    }

    const btnEscolhaDeslocamento = document.getElementById('btnEscolhaDeslocamento');
    if (btnEscolhaDeslocamento) {
        btnEscolhaDeslocamento.addEventListener('click', () => {
            window.fecharEscolhaTipoModal();
            window.abrirAgendamentoModal(slotSelecionadoDiaTexto, slotSelecionadoHora, 'deslocamento');
        });
    }

    const btnEscolhaReposicao = document.getElementById('btnEscolhaReposicao');
    if (btnEscolhaReposicao) {
        btnEscolhaReposicao.addEventListener('click', () => {
            window.fecharEscolhaTipoModal();
            window.abrirReagendarAulaModalSlot(slotSelecionadoDiaTexto, slotSelecionadoHora);
        });
    }

    const btnConfigurarRecorrenciaAgendamento = document.getElementById('btnConfigurarRecorrenciaAgendamento');
    if (btnConfigurarRecorrenciaAgendamento) {
        btnConfigurarRecorrenciaAgendamento.addEventListener('click', () => {
            capturarFormularioPrincipalNoRascunho();
            window.abrirModalRecorrencia(slotSelecionadoDiaTexto, slotSelecionadoHora);
        });
    }

    const formAgendamento = document.getElementById('formAgendamento');
    if (formAgendamento) {
        formAgendamento.addEventListener('submit', (e) => {
            e.preventDefault();
            capturarFormularioPrincipalNoRascunho();

            if (typeof window.serializarRascunhoAgendamento !== 'function') {
                alert('Não foi possível preparar o agendamento para salvar.');
                return;
            }

            const resultado = window.serializarRascunhoAgendamento(rascunhoFluxoAgendamento);

            if (!resultado || resultado.ok !== true) {
                alert(resultado?.errorMessage);
                return;
            }

            if (!resultado.payload) {
                alert('Não foi possível salvar o agendamento.');
                return;
            }

            if (!confirmarConflitosRecorrenciaSeNecessario(resultado)) {
                return;
            }

            aulas.push(resultado.payload);
            // Fecha o modal imediatamente; o overlay bloqueará re-interação durante o salvamento
            document.getElementById('modalAgendamento').style.display = 'none';

            if (typeof window.salvarEventoComGCal === 'function' && window.gcal && window.gcal.isSignedIn()) {
                // MongoDB primeiro, GCal segundo — overlay bloqueia até ambos resolverem
                window.salvarEventoComGCal(resultado.payload, { operacao: 'criar' }).then(() => {
                    window.inicializarHome();
                });
            } else {
                if (typeof salvarDados === 'function') salvarDados();
                window.inicializarHome();
                if (typeof mostrarToast === 'function') mostrarToast('✅ Horário agendado com sucesso!');
            }
        });
    }

    const formRecorrencia = document.getElementById('formRecorrencia');
    if (formRecorrencia) {
        formRecorrencia.addEventListener('submit', (e) => {
            e.preventDefault();

            const recorrenciaDraft = lerFormularioRecorrencia();
            if (!recorrenciaDraft.startDateIso) {
                alert('Selecione a data de início da recorrência.');
                return;
            }

            if (recorrenciaDraft.pattern === 'semanal' && recorrenciaDraft.daysOfWeek.length === 0) {
                alert('Selecione ao menos um dia da semana para a recorrência semanal.');
                return;
            }

            if (
                recorrenciaDraft.endCondition === 'untilDate'
                && recorrenciaDraft.untilDateIso
                && recorrenciaDraft.untilDateIso < recorrenciaDraft.startDateIso
            ) {
                alert('A data final da recorrência deve ser igual ou posterior à data de início.');
                return;
            }

            if (recorrenciaDraft.endCondition === 'occurrences' && recorrenciaDraft.occurrencesCount < 1) {
                alert('Informe ao menos 1 ocorrência para encerrar a série.');
                return;
            }

            const recorrenciaSalva = window.criarEstadoRecorrenciaAgendamento({
                ...recorrenciaDraft,
                enabled: true,
                summaryText: montarResumoRecorrencia({ ...recorrenciaDraft, enabled: true }),
                previewText: montarPreviewRecorrencia(recorrenciaDraft),
                hasCustomSettings: true,
                lastSavedAt: new Date().toISOString()
            });

            rascunhoFluxoAgendamento = window.criarEstadoFluxoAgendamento({
                ...(rascunhoFluxoAgendamento || window.criarRascunhoFluxoAgendamento()),
                recurrence: recorrenciaSalva
            });
            atualizarResumoRecorrenciaAgendamentoPrincipal();
            window.fecharModalRecorrencia();
        });
    }

    const inputDataRecorrencia = document.getElementById('recorrenciaDataInicio');
    if (inputDataRecorrencia) {
        inputDataRecorrencia.addEventListener('click', () => window.abrirDatePickerNativo(inputDataRecorrencia));
        inputDataRecorrencia.addEventListener('change', () => {
            window.atualizarTextoPreviewRecorrencia();
        });
    }

    const inputDataAgenda = document.getElementById('agendaDataSelecionadaInput');
    if (inputDataAgenda) {
        inputDataAgenda.addEventListener('focus', () => window.abrirDatePickerNativo(inputDataAgenda));
        inputDataAgenda.addEventListener('click', () => window.abrirDatePickerNativo(inputDataAgenda));
        inputDataAgenda.addEventListener('change', () => {
            const dataIso = inputDataAgenda.value || '';
            const dataLocal = typeof window.converterISODateParaDataLocal === 'function'
                ? window.converterISODateParaDataLocal(dataIso)
                : null;

            if (!(dataLocal instanceof Date) || Number.isNaN(dataLocal.getTime())) {
                alert('Informe uma data válida para o agendamento.');
                sincronizarCamposDataModalAgendamento();
                return;
            }

            window.dataSelecionada = dataLocal;
            slotSelecionadoDiaTexto = typeof window.getDiaTextoSelecionado === 'function'
                ? window.getDiaTextoSelecionado()
                : slotSelecionadoDiaTexto;

            atualizarInfoHorarioAlvoModal(slotSelecionadoDiaTexto);

            sincronizarCamposDataModalAgendamento();

            if (typeof window.aplicarContextoAoFluxoAgendamento === 'function') {
                const horaAtual = document.getElementById('agendaHoraInicio')?.value
                    || slotSelecionadoHora
                    || window.horarioSelecionadoSlot
                    || '08:00';
                rascunhoFluxoAgendamento = window.aplicarContextoAoFluxoAgendamento(
                    rascunhoFluxoAgendamento || window.criarRascunhoFluxoAgendamento(),
                    criarContextoSlotAgendamento(slotSelecionadoDiaTexto, horaAtual)
                );
            }

            capturarFormularioPrincipalNoRascunho();
        });
    }

    const inputDataFimRecorrencia = document.getElementById('recorrenciaUntilDate');
    if (inputDataFimRecorrencia) {
        inputDataFimRecorrencia.addEventListener('focus', () => window.abrirDatePickerNativo(inputDataFimRecorrencia));
        inputDataFimRecorrencia.addEventListener('click', () => window.abrirDatePickerNativo(inputDataFimRecorrencia));
    }

    ['recorrenciaPadrao', 'recorrenciaIntervalo', 'recorrenciaEndCondition', 'recorrenciaUntilDate', 'recorrenciaOccurrencesCount'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', () => {
            if (id === 'recorrenciaEndCondition') window.atualizarEstadoFimRecorrencia();
            window.atualizarTextoPreviewRecorrencia();
        });
        if (el) el.addEventListener('input', () => window.atualizarTextoPreviewRecorrencia());
    });

    ['agendaAluno', 'agendaDescricao', 'agendaHoraInicio', 'agendaDuracao'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', capturarFormularioPrincipalNoRascunho);
        if (el) el.addEventListener('input', capturarFormularioPrincipalNoRascunho);
    });

    const checkAgendaDiaInteiro = document.getElementById('agendaBloqueioDiaInteiro');
    if (checkAgendaDiaInteiro) checkAgendaDiaInteiro.addEventListener('change', () => {
        window.atualizarEstadoBloqueioDiaInteiroAgenda();
        capturarFormularioPrincipalNoRascunho();
    });

    const overlayRecorrencia = document.getElementById('modalRecorrencia');
    if (overlayRecorrencia) {
        overlayRecorrencia.addEventListener('mousedown', (event) => {
            if (event.target === overlayRecorrencia) {
                window.fecharModalRecorrencia();
            }
        });
    }

    window.configurarEscopoCriacaoRecorrencia();
    window.inicializarMultiSelectPills();
    window.atualizarEstadoFimRecorrencia();
    window.atualizarTextoPreviewRecorrencia();

    if (document.getElementById('btnFecharModal')) {
        document.getElementById('btnFecharModal').addEventListener('click', () => {
            document.getElementById('modalAgendamento').style.display = 'none';
            window.reposicaoIdEmReagendamento = null; 
        });
    }
});
