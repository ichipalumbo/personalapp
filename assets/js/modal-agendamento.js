// [TAG-MODAL-AGENDAMENTO] modal-agendamento.js
// Responsabilidade: Modais de criação de compromissos — Tipo, Agendamento Único e Recorrente
// Depende de: state.js (aulas, alunos, aulasParaRepor, HORARIOS), storage.js (salvarDados),
//             utils-datetime.js (formatarDataPtBr, converterPtBrParaISO, abrirDatePickerNativo, somarMinutos, getDataSelecionadaPtBr, getDiaTextoSelecionado),
//             widget-stepper-duracao.js (sincronizarSteppersDuracao, aplicarLimitesDuracaoPorContexto),
//             widget-bloqueio.js (atualizarEstadoBloqueioDiaInteiro*),
//             agenda-conflitos.js (getDatasConflitoRecorrencia, getConflitosRecorrenciaEmDatas, gerarResumoConflitosDatas),
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

// ── Modal: Escolha de Tipo ─────────────────────────────────────────────────────────────────────

window.abrirNovoAgendamento = function(opcoes = {}) {
    const dia = opcoes.dia || window.getDiaTextoSelecionado();
    const hora = opcoes.hora || window.horarioSelecionadoSlot || '08:00';
    window.horarioSelecionadoSlot = hora;
    slotSelecionadoDiaTexto = dia;
    slotSelecionadoHora = hora;
    window.abrirEscolhaTipoModal(dia, hora);
};

window.abrirEscolhaTipoModal = function(dia, hora) {
    slotSelecionadoHora = hora;
    slotSelecionadoDiaTexto = dia;
    window.horarioSelecionadoSlot = hora;

    const modal = document.getElementById('modalEscolhaTipo');
    if (modal) {
        const nomeDiaEscolha = (dia === 'Sábado' || dia === 'Domingo') ? dia : `${dia}-feira`;
        const info = document.getElementById('infoEscolhaSlot');
        if (info) info.textContent = `Agendar às ${hora} de ${nomeDiaEscolha}`;
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

window.abrirAgendamentoModal = function(dia, hora) {
    slotSelecionadoHora = hora;
    slotSelecionadoDiaTexto = dia;

    const modal = document.getElementById('modalAgendamento');
    const infoHorario = document.getElementById('infoHorarioAlvo');
    if (infoHorario) infoHorario.textContent = `${dia} — Definir Período`;

    if (document.getElementById('formAgendamento')) {
        document.getElementById('formAgendamento').reset();
    }

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

    window.selecionarTipoAgendamento('aula');
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
};

// ── Modal: Agendamento Recorrente ──────────────────────────────────────────────────────────────

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
    const padrao = document.getElementById('recorrenciaPadrao').value;
    const intervalo = parseInt(document.getElementById('recorrenciaIntervalo').value) || 1;
    const infoText = document.getElementById('textoInfoMensalAnual');
    
    const diasSelecionados = [];
    document.querySelectorAll('#containerDiasSemanaRecorrencia .btn-dia-pill.active').forEach(btn => {
        diasSelecionados.push(btn.getAttribute('data-dia'));
    });

    let msg = "";
    if (padrao === 'diaria') {
        msg = `Repetir a cada ${intervalo} dia(s) útil/úteis (Segunda a Sábado) sem interrupções.`;
    } else if (padrao === 'semanal') {
        const diasStr = diasSelecionados.length > 0 ? diasSelecionados.join(', ') : "[Nenhum selecionado]";
        msg = `Repetir a cada ${intervalo} semana(s) na(s) seguinte(s) data(s): ${diasStr}.`;
    } else if (padrao === 'mensal') {
        const diasStr = diasSelecionados.length > 0 ? ` na(s) ${diasSelecionados.join(', ')}` : " no mesmo dia";
        msg = `Repetir a cada ${intervalo} mês(es)${diasStr} (com base no dia da criação do compromisso).`;
    } else if (padrao === 'anual') {
        msg = `Repetir a cada ${intervalo} ano(s) no mesmo dia e mês em que foi criado.`;
    }

    if (infoText) {
        infoText.innerHTML = `<i class="fa-solid fa-circle-info" style="margin-right: 6px;"></i>${msg}`;
    }

    window.atualizarResumoRecorrenciaCadastro();
};

window.atualizarResumoRecorrenciaCadastro = function() {
    const container = document.getElementById('resumoRecorrenciaCadastro');
    if (!container) return;

    const alunoSelect = document.getElementById('recorrenciaAluno');
    const alunoNome = alunoSelect && alunoSelect.value ? (alunoSelect.options[alunoSelect.selectedIndex]?.text || 'Aluno') : 'Aluno não selecionado';

    const dataInicioISO = document.getElementById('recorrenciaDataInicio')?.value || '';
    const dataInicioPtBr = window.formatarDataPtBr(dataInicioISO);
    const inicioFmt = dataInicioPtBr ? window.formatarDataPtBrLegivel(dataInicioPtBr) : 'sem data';

    const ehBloqueioDiaInteiro = document.getElementById('recorrenciaTipo')?.value === 'bloqueio'
        && document.getElementById('recorrenciaBloqueioDiaInteiro')?.checked;
    const hIni = ehBloqueioDiaInteiro
        ? window.BLOQUEIO_DIA_INTEIRO_INICIO
        : (document.getElementById('recorrenciaHoraInicio')?.value || '--:--');
    const dur = ehBloqueioDiaInteiro
        ? window.BLOQUEIO_DIA_INTEIRO_DURACAO
        : (parseInt(document.getElementById('recorrenciaDuracao')?.value || '0', 10) || 0);
    const hFim = ehBloqueioDiaInteiro
        ? window.BLOQUEIO_DIA_INTEIRO_FIM
        : (hIni !== '--:--' ? window.somarMinutos(hIni, dur) : '--:--');

    const padrao = document.getElementById('recorrenciaPadrao')?.value || 'semanal';
    const intervalo = parseInt(document.getElementById('recorrenciaIntervalo')?.value || '1', 10) || 1;
    const dias = [];
    document.querySelectorAll('#containerDiasSemanaRecorrencia .btn-dia-pill.active').forEach(btn => dias.push(btn.getAttribute('data-dia')));
    const diasTxt = dias.length ? dias.join(', ') : 'dias automáticos';

    const escopo = document.getElementById('recorrenciaEscopoCriacao')?.value || 'fromDate';
    const escopoTxt = escopo === 'monthOfDate' ? 'Este mês todo' : 'Daqui pra frente';

    container.innerHTML = `
        <strong style="display:block; margin-bottom:4px; color:#FFD700;">Resumo da criação</strong>
        <span style="display:block; font-size:0.78rem; color:#DDD;">${alunoNome} • ${inicioFmt} • ${hIni} - ${hFim}</span>
        <span style="display:block; font-size:0.78rem; color:#BBB; margin-top:2px;">${padrao} a cada ${intervalo} (${diasTxt}) • ${escopoTxt}</span>
    `;
};

window.mudarPadraoRecorrencia = function() {
    const padrao = document.getElementById('recorrenciaPadrao').value;
    const containerDias = document.getElementById('containerDiasSemanaRecorrencia');
    const labelUnidade = document.getElementById('labelUnidadeRecorrencia');
    const infoContainer = document.getElementById('infoRecorrenciaMensalAnual');

    if (infoContainer) infoContainer.style.display = 'block';
    document.querySelectorAll('#containerDiasSemanaRecorrencia .btn-dia-pill').forEach(btn => {
        btn.classList.remove('active');
    });

    if (padrao === 'diaria') {
        containerDias.style.display = 'none';
        labelUnidade.textContent = 'dia(s)';
    } else if (padrao === 'semanal') {
        containerDias.style.display = 'block';
        labelUnidade.textContent = 'semana(s)';
        const diaHoje = window.getDiaTextoSelecionado();
        document.querySelectorAll('#containerDiasSemanaRecorrencia .btn-dia-pill').forEach(btn => {
            if (btn.getAttribute('data-dia') === diaHoje) btn.classList.add('active');
        });
    } else if (padrao === 'mensal') {
        containerDias.style.display = 'block';
        labelUnidade.textContent = 'mês(es)';
    } else if (padrao === 'anual') {
        containerDias.style.display = 'none';
        labelUnidade.textContent = 'ano(s)';
    }

    window.atualizarTextoPreviewRecorrencia();
};

window.abrirModalRecorrencia = function(dia, hora) {
    const modal = document.getElementById('modalRecorrencia');
    if (document.getElementById('formRecorrencia')) {
        document.getElementById('formRecorrencia').reset();
    }

    const selectInicio = document.getElementById('recorrenciaHoraInicio');
    const selectDuracao = document.getElementById('recorrenciaDuracao');
    
    const optionsHtml = HORARIOS.map(h => `<option value="${h}">${h}</option>`).join('');
    selectInicio.innerHTML = optionsHtml;
    const hAlvo = hora || window.horarioSelecionadoSlot || "08:00";
    selectInicio.value = hAlvo;
    selectDuracao.value = "60";
    window.sincronizarSteppersDuracao();
    const checkDiaInteiro = document.getElementById('recorrenciaBloqueioDiaInteiro');
    if (checkDiaInteiro) checkDiaInteiro.checked = false;
    window.atualizarEstadoBloqueioDiaInteiroRecorrencia();

    const inputPadrao = document.getElementById('recorrenciaPadrao');
    const inputIntervalo = document.getElementById('recorrenciaIntervalo');
    if (inputPadrao) inputPadrao.value = 'semanal';
    if (inputIntervalo) inputIntervalo.value = '1';

    const dataInicioInput = document.getElementById('recorrenciaDataInicio');
    if (dataInicioInput) {
        const basePtBr = window.getDataSelecionadaPtBr();
        dataInicioInput.value = window.converterPtBrParaISO(basePtBr);
    }

    const escopoCriacaoInput = document.getElementById('recorrenciaEscopoCriacao');
    if (escopoCriacaoInput) escopoCriacaoInput.value = 'fromDate';
    document.querySelectorAll('#recorrenciaEscopoCriacaoGrid .btn-escopo-recorrencia').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.escopoCriacao === 'fromDate');
    });

    const selectAluno = document.getElementById('recorrenciaAluno');
    if (selectAluno) {
        selectAluno.innerHTML = '<option value="">Selecione um aluno...</option>' + 
            alunos.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
    }

    window.mudarPadraoRecorrencia();
    const dAlvo = dia || slotSelecionadoDiaTexto;
    if (dAlvo) {
        document.querySelectorAll('#containerDiasSemanaRecorrencia .btn-dia-pill').forEach(btn => {
            if (btn.getAttribute('data-dia') === dAlvo) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        window.atualizarTextoPreviewRecorrencia();
    }

    window.selecionarTipoRecorrente('aula');
    window.atualizarResumoEscopoCriacaoRecorrencia();
    window.atualizarResumoRecorrenciaCadastro();
    
    if (modal) modal.style.display = 'flex';
};

window.selecionarTipoRecorrente = function(tipo) {
    document.getElementById('recorrenciaTipo').value = tipo;
    const tabAula = document.getElementById('tabRecorrenteAula');
    const tabDeslocamento = document.getElementById('tabRecorrenteDeslocamento');
    const tabBloqueio = document.getElementById('tabRecorrenteBloqueio');
    const camposAula = document.getElementById('camposRecorrenteAula');
    const camposBloqueio = document.getElementById('camposRecorrenteBloqueio');
    const camposBloqueioDiaInteiro = document.getElementById('camposRecorrenteBloqueioDiaInteiro');
    const checkDiaInteiro = document.getElementById('recorrenciaBloqueioDiaInteiro');

    tabAula.classList.remove('active');
    tabDeslocamento.classList.remove('active');
    tabBloqueio.classList.remove('active');

    if (tipo === 'aula') {
        tabAula.classList.add('active');
        camposAula.style.display = 'block';
        camposBloqueio.style.display = 'none';
        if (camposBloqueioDiaInteiro) camposBloqueioDiaInteiro.style.display = 'none';
        if (checkDiaInteiro) checkDiaInteiro.checked = false;
        window.atualizarEstadoBloqueioDiaInteiroRecorrencia();
        window.aplicarLimitesDuracaoPorContexto('recorrencia');
        document.getElementById('recorrenciaAluno').required = true;
        document.getElementById('recorrenciaDescricao').required = false;
    } else if (tipo === 'deslocamento') {
        tabDeslocamento.classList.add('active');
        camposAula.style.display = 'none';
        camposBloqueio.style.display = 'none'; 
        if (camposBloqueioDiaInteiro) camposBloqueioDiaInteiro.style.display = 'none';
        if (checkDiaInteiro) checkDiaInteiro.checked = false;
        window.atualizarEstadoBloqueioDiaInteiroRecorrencia();
        window.aplicarLimitesDuracaoPorContexto('recorrencia');
        document.getElementById('recorrenciaAluno').required = false;
        document.getElementById('recorrenciaDescricao').required = false;
    } else if (tipo === 'bloqueio') {
        tabBloqueio.classList.add('active');
        camposAula.style.display = 'none';
        camposBloqueio.style.display = 'block'; 
        if (camposBloqueioDiaInteiro) camposBloqueioDiaInteiro.style.display = 'block';
        window.atualizarEstadoBloqueioDiaInteiroRecorrencia();
        window.aplicarLimitesDuracaoPorContexto('recorrencia');
        document.getElementById('recorrenciaAluno').required = false;
        document.getElementById('recorrenciaDescricao').required = true;
    }
};

// ── Escopo de Criação da Recorrência ──────────────────────────────────────────────────────────

window.obterResumoEscopoCriacaoRecorrencia = function(escopo) {
    if (escopo === 'monthOfDate') return 'Vai criar a série para o mês da data escolhida.';
    return 'Vai criar a série da data escolhida em diante.';
};

window.atualizarResumoEscopoCriacaoRecorrencia = function() {
    const inputEscopo = document.getElementById('recorrenciaEscopoCriacao');
    const resumo = document.getElementById('recorrenciaEscopoCriacaoResumo');
    if (!inputEscopo || !resumo) return;
    resumo.textContent = window.obterResumoEscopoCriacaoRecorrencia(inputEscopo.value || 'fromDate');
};

window.configurarEscopoCriacaoRecorrencia = function() {
    const grid = document.getElementById('recorrenciaEscopoCriacaoGrid');
    const inputEscopo = document.getElementById('recorrenciaEscopoCriacao');
    if (!grid || !inputEscopo) return;
    grid.querySelectorAll('.btn-escopo-recorrencia').forEach(btn => {
        const novoBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(novoBtn, btn);
        novoBtn.addEventListener('click', () => {
            grid.querySelectorAll('.btn-escopo-recorrencia').forEach(b => b.classList.remove('active'));
            novoBtn.classList.add('active');
            inputEscopo.value = novoBtn.dataset.escopoCriacao || 'fromDate';
            window.atualizarResumoEscopoCriacaoRecorrencia();
            window.atualizarResumoRecorrenciaCadastro();
        });
    });
    window.atualizarResumoEscopoCriacaoRecorrencia();
};

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
            document.getElementById('modalRecorrencia').style.display = 'none';
        });
    }

    const btnEscolhaUnico = document.getElementById('btnEscolhaUnico');
    if (btnEscolhaUnico) {
        btnEscolhaUnico.addEventListener('click', () => {
            window.fecharEscolhaTipoModal();
            window.abrirAgendamentoModal(slotSelecionadoDiaTexto, slotSelecionadoHora);
        });
    }

    const btnEscolhaRecorrente = document.getElementById('btnEscolhaRecorrente');
    if (btnEscolhaRecorrente) {
        btnEscolhaRecorrente.addEventListener('click', () => {
            window.fecharEscolhaTipoModal();
            window.abrirModalRecorrencia(slotSelecionadoDiaTexto, slotSelecionadoHora);
        });
    }

    const btnEscolhaReposicao = document.getElementById('btnEscolhaReposicao');
    if (btnEscolhaReposicao) {
        btnEscolhaReposicao.addEventListener('click', () => {
            window.fecharEscolhaTipoModal();
            window.abrirReagendarAulaModalSlot(slotSelecionadoDiaTexto, slotSelecionadoHora);
        });
    }

    const formAgendamento = document.getElementById('formAgendamento');
    if (formAgendamento) {
        formAgendamento.addEventListener('submit', (e) => {
            e.preventDefault();

            const tipo = document.getElementById('agendaTipo').value;
            const diaInteiro = tipo === 'bloqueio' && document.getElementById('agendaBloqueioDiaInteiro')?.checked;
            const hInicio = diaInteiro ? window.BLOQUEIO_DIA_INTEIRO_INICIO : document.getElementById('agendaHoraInicio').value;
            const duracaoMinutos = diaInteiro
                ? window.BLOQUEIO_DIA_INTEIRO_DURACAO
                : parseInt(document.getElementById('agendaDuracao').value, 10);
            const hFim = diaInteiro ? window.BLOQUEIO_DIA_INTEIRO_FIM : window.somarMinutos(hInicio, duracaoMinutos);

            if (tipo === 'bloqueio' && !diaInteiro && duracaoMinutos > window.BLOQUEIO_MAX_MINUTOS) {
                alert('Bloqueios por hora podem ter no máximo 8h. Para mais tempo, use dia inteiro.');
                return;
            }
            if ((tipo === 'aula' || tipo === 'deslocamento') && duracaoMinutos > window.DURACAO_MAX_AULA_DESLOCAMENTO) {
                alert('Aulas e deslocamentos podem ter no máximo 2h.');
                return;
            }

            let novoCompromisso = {
                id: Date.now().toString(),
                dia: slotSelecionadoDiaTexto,
                data: window.dataSelecionada.toLocaleDateString('pt-BR'),
                horarioInicio: hInicio,
                horarioFim: hFim,
                tipo: tipo,
                frequencia: 'uma_vez'
            };

            if (tipo === 'aula') {
                const alunoId = document.getElementById('agendaAluno').value;
                if (!alunoId) return;
                novoCompromisso.alunoId = alunoId;
            } else if (tipo === 'deslocamento') {
                novoCompromisso.descricao = "Trânsito / Deslocamento"; 
            } else if (tipo === 'bloqueio') {
                novoCompromisso.descricao = document.getElementById('agendaDescricao').value.trim();
                if (diaInteiro) novoCompromisso.fullDay = true;
            }

            aulas.push(novoCompromisso);
            if (typeof salvarDados === 'function') salvarDados();

            document.getElementById('modalAgendamento').style.display = 'none';
            window.inicializarHome();
            if (typeof mostrarToast === 'function') mostrarToast('✅ Horário agendado com sucesso!');
        });
    }

    const formRecorrencia = document.getElementById('formRecorrencia');
    if (formRecorrencia) {
        formRecorrencia.addEventListener('submit', (e) => {
            e.preventDefault();

            const tipo = document.getElementById('recorrenciaTipo').value;
            const diaInteiro = tipo === 'bloqueio' && document.getElementById('recorrenciaBloqueioDiaInteiro')?.checked;
            const hInicio = diaInteiro ? window.BLOQUEIO_DIA_INTEIRO_INICIO : document.getElementById('recorrenciaHoraInicio').value;
            const duracaoMinutos = diaInteiro
                ? window.BLOQUEIO_DIA_INTEIRO_DURACAO
                : parseInt(document.getElementById('recorrenciaDuracao').value, 10);
            const hFim = diaInteiro ? window.BLOQUEIO_DIA_INTEIRO_FIM : window.somarMinutos(hInicio, duracaoMinutos);

            if (tipo === 'bloqueio' && !diaInteiro && duracaoMinutos > window.BLOQUEIO_MAX_MINUTOS) {
                alert('Bloqueios por hora podem ter no máximo 8h. Para mais tempo, use dia inteiro.');
                return;
            }
            if ((tipo === 'aula' || tipo === 'deslocamento') && duracaoMinutos > window.DURACAO_MAX_AULA_DESLOCAMENTO) {
                alert('Aulas e deslocamentos podem ter no máximo 2h.');
                return;
            }
            
            const padrao = document.getElementById('recorrenciaPadrao').value;
            const intervalo = parseInt(document.getElementById('recorrenciaIntervalo').value) || 1;
            const dataInicioISO = document.getElementById('recorrenciaDataInicio').value;
            const dataInicioPtBr = window.formatarDataPtBr(dataInicioISO);
            const recorrenciaEscopo = document.getElementById('recorrenciaEscopoCriacao')?.value || 'fromDate';

            if (!dataInicioPtBr) {
                alert('Selecione a data de início da recorrência.');
                return;
            }

            const diasSelecionados = [];
            document.querySelectorAll('#containerDiasSemanaRecorrencia .btn-dia-pill.active').forEach(btn => {
                diasSelecionados.push(btn.getAttribute('data-dia'));
            });

            if ((padrao === 'semanal' || padrao === 'mensal') && diasSelecionados.length === 0) {
                alert("Por favor, selecione ao menos um dia da semana para o padrão semanal/mensal!");
                return;
            }

            let novoCompromisso = {
                id: Date.now().toString(),
                dia: diasSelecionados.length > 0 ? diasSelecionados[0] : "Segunda",
                diasSemana: diasSelecionados,
                horarioInicio: hInicio,
                horarioFim: hFim,
                tipo: tipo,
                frequencia: 'semanal', 
                tipoRecorrencia: padrao,
                intervaloRecorrencia: intervalo,
                excecoes: [],
                excecoesDetalhadas: [],
                recorrenciaEscopo,
                recorrenciaDataInicio: dataInicioPtBr,
                dataCriacao: new Date(`${dataInicioISO}T12:00:00`).toISOString(),
                data: dataInicioPtBr
            };

            if (tipo === 'aula') {
                const alunoId = document.getElementById('recorrenciaAluno').value;
                if (!alunoId) return;
                novoCompromisso.alunoId = alunoId;
            } else if (tipo === 'deslocamento') {
                novoCompromisso.descricao = "Trânsito / Deslocamento"; 
            } else if (tipo === 'bloqueio') {
                novoCompromisso.descricao = document.getElementById('recorrenciaDescricao').value.trim();
                if (diaInteiro) novoCompromisso.fullDay = true;
            }

            const datasConflito = window.getDatasConflitoRecorrencia(novoCompromisso, 24);
            const conflitos = window.getConflitosRecorrenciaEmDatas(novoCompromisso, datasConflito);
            if (conflitos.length > 0) {
                const resumo = window.gerarResumoConflitosDatas(conflitos);
                alert(`Não foi possível salvar. Existem conflitos de horário em: ${resumo}.`);
                return;
            }

            aulas.push(novoCompromisso);
            if (typeof salvarDados === 'function') salvarDados();

            document.getElementById('modalRecorrencia').style.display = 'none';
            window.inicializarHome();
            if (typeof mostrarToast === 'function') mostrarToast('♾️ Recorrência Outlook configurada!');
        });
    }

    const inputDataRecorrencia = document.getElementById('recorrenciaDataInicio');
    if (inputDataRecorrencia) {
        inputDataRecorrencia.addEventListener('focus', () => window.abrirDatePickerNativo(inputDataRecorrencia));
        inputDataRecorrencia.addEventListener('click', () => window.abrirDatePickerNativo(inputDataRecorrencia));
        inputDataRecorrencia.addEventListener('change', () => {
            window.atualizarResumoRecorrenciaCadastro();
        });
    }

    ['recorrenciaHoraInicio', 'recorrenciaDuracao', 'recorrenciaPadrao', 'recorrenciaIntervalo', 'recorrenciaAluno'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', () => window.atualizarResumoRecorrenciaCadastro());
        if (el) el.addEventListener('input', () => window.atualizarResumoRecorrenciaCadastro());
    });

    const checkAgendaDiaInteiro = document.getElementById('agendaBloqueioDiaInteiro');
    if (checkAgendaDiaInteiro) checkAgendaDiaInteiro.addEventListener('change', () => window.atualizarEstadoBloqueioDiaInteiroAgenda());
    const checkRecorrenciaDiaInteiro = document.getElementById('recorrenciaBloqueioDiaInteiro');
    if (checkRecorrenciaDiaInteiro) checkRecorrenciaDiaInteiro.addEventListener('change', () => window.atualizarEstadoBloqueioDiaInteiroRecorrencia());

    window.configurarEscopoCriacaoRecorrencia();

    if (document.getElementById('btnFecharModal')) {
        document.getElementById('btnFecharModal').addEventListener('click', () => {
            document.getElementById('modalAgendamento').style.display = 'none';
            window.reposicaoIdEmReagendamento = null; 
        });
    }
});
