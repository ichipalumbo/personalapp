// [TAG-JS-HOME] - Lógica da Home, Slots de 30m e Edição de Compromissos
window.dataSelecionada = window.dataSelecionada || new Date();
const DIAS_DA_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

let slotSelecionadoHora = "";
let slotSelecionadoDiaTexto = "";
window.dataAlvoAcaoStr = null;
window.horarioSelecionadoSlot = null;
window.reagendamentoDirectCardId = null;
window.__sincronizacaoInicialConcluida = window.__sincronizacaoInicialConcluida || false;
window.__homeCarregando = window.__homeCarregando || false;

window.getAluno = function(id) {
    if (typeof alunos !== 'undefined') {
        return alunos.find(a => a.id === id);
    }
    return null;
};

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
window.getDiaTextoSelecionado = function() {
    const diaIndex = window.dataSelecionada.getDay();
    const diasMapeados = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return diasMapeados[diaIndex];
};
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
window.somarMinutos = function(horaStr, minutos) {
    const [h, m] = horaStr.split(':').map(Number);
    let totalMinutos = h * 60 + m + parseInt(minutos);
    const novaHora = Math.floor(totalMinutos / 60) % 24;
    const novosMinutos = totalMinutos % 60;
    return `${novaHora.toString().padStart(2, '0')}:${novosMinutos.toString().padStart(2, '0')}`;
};
window.BLOQUEIO_MAX_MINUTOS = 480;
window.DURACAO_MAX_AULA_DESLOCAMENTO = 120;
window.BLOQUEIO_DIA_INTEIRO_INICIO = '00:00';
window.BLOQUEIO_DIA_INTEIRO_FIM = '23:59';
window.BLOQUEIO_DIA_INTEIRO_DURACAO = 1439;
window.ehBloqueioDiaInteiroCompromisso = function(compromisso) {
    if (!compromisso || compromisso.tipo !== 'bloqueio') return false;
    if (compromisso.fullDay === true) return true;
    return compromisso.horarioInicio === window.BLOQUEIO_DIA_INTEIRO_INICIO
        && compromisso.horarioFim === window.BLOQUEIO_DIA_INTEIRO_FIM;
};
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
window.formatarDuracaoMinutosLabel = function(valor) {
    const minutos = parseInt(valor, 10);
    if (Number.isNaN(minutos) || minutos <= 0) return '--';
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    if (horas === 0) return `${resto} min`;
    return `${horas}h ${resto.toString().padStart(2, '0')}min`;
};
window.getValoresDuracaoDisponiveis = function(select) {
    const valoresBase = Array.from(select.options)
        .map(opt => parseInt(opt.value, 10))
        .filter(v => !Number.isNaN(v));
    const maxDuracao = parseInt(select.dataset.maxDuracao || '', 10);
    if (Number.isNaN(maxDuracao) || maxDuracao <= 0) return valoresBase;
    return valoresBase.filter(v => v <= maxDuracao);
};
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
        const compromisso = aulas.find(a => a.id === idCompromissoSelecionado);
        const tipo = compromisso?.tipo || 'aula';
        const max = tipo === 'bloqueio' ? window.BLOQUEIO_MAX_MINUTOS : window.DURACAO_MAX_AULA_DESLOCAMENTO;
        window.aplicarMaxDuracaoSelect('editDuracao', max);
        window.sincronizarSteppersDuracao();
    }
};
window.atualizarLabelStepperDuracao = function(stepper) {
    if (!stepper) return;
    const selectId = stepper.getAttribute('data-target-select');
    const select = selectId ? document.getElementById(selectId) : null;
    const label = stepper.querySelector('.duracao-stepper-value');
    if (!select || !label) return;
    label.textContent = window.formatarDuracaoMinutosLabel(select.value);
};
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
window.inicializarSteppersDuracao = function() {
    document.querySelectorAll('.duracao-stepper').forEach(window.configurarStepperDuracao);
};
window.sincronizarSteppersDuracao = function() {
    document.querySelectorAll('.duracao-stepper').forEach(window.atualizarLabelStepperDuracao);
};
window.getDataSelecionadaPtBr = function() {
    if (!window.dataSelecionada) return '';
    return window.dataSelecionada.toLocaleDateString('pt-BR');
};
window.formatarDataPtBr = function(dataISO) {
    if (!dataISO || typeof dataISO !== 'string') return '';
    const partes = dataISO.split('-');
    if (partes.length !== 3) return '';
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
};
window.converterPtBrParaISO = function(dataPtBr) {
    if (!dataPtBr || typeof dataPtBr !== 'string') return '';
    const partes = dataPtBr.split('/');
    if (partes.length !== 3) return '';
    const [dia, mes, ano] = partes;
    return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
};
window.formatarDataPtBrLegivel = function(dataPtBr) {
    if (!dataPtBr) return '';
    const iso = window.converterPtBrParaISO(dataPtBr);
    if (!iso) return dataPtBr;
    const data = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(data.getTime())) return dataPtBr;
    return data.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
};
window.abrirDatePickerNativo = function(input) {
    if (!input) return;
    try {
        if (typeof input.showPicker === 'function') {
            input.showPicker();
            return;
        }
    } catch (_) {}
    input.focus();
    input.click();
};
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
window.getLabelEscopoRecorrencia = function(escopo) {
    if (escopo === 'occurrence') return 'Somente esta aula';
    if (escopo === 'monthOfDate') return 'Este mês todo';
    if (escopo === 'entireSeries') return 'Todas as aulas da série';
    return 'Daqui pra frente';
};
window.getResumoEscopoRecorrencia = function(escopo) {
    if (escopo === 'occurrence') return 'Vai aplicar somente nesta aula específica.';
    if (escopo === 'monthOfDate') return 'Vai aplicar nas aulas deste mês.';
    if (escopo === 'entireSeries') return 'Vai aplicar na série inteira.';
    return 'Vai aplicar nesta aula e nas próximas da série.';
};
window.atualizarResumoEscopoRecorrencia = function() {
    const inputEscopo = document.getElementById('editEscopoRecorrencia');
    const resumo = document.getElementById('editEscopoResumo');
    if (!inputEscopo || !resumo) return;
    resumo.textContent = window.getResumoEscopoRecorrencia(inputEscopo.value || 'fromDate');
};
window.configurarEscopoRecorrenciaEdicao = function() {
    const grid = document.getElementById('editEscopoRecorrenciaGrid');
    const inputEscopo = document.getElementById('editEscopoRecorrencia');
    if (!grid || !inputEscopo) return;

    grid.querySelectorAll('.btn-escopo-recorrencia').forEach(btn => {
        const novoBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(novoBtn, btn);
        novoBtn.addEventListener('click', () => {
            const escopo = novoBtn.dataset.escopo || 'fromDate';
            inputEscopo.value = escopo;
            grid.querySelectorAll('.btn-escopo-recorrencia').forEach(b => {
                b.classList.toggle('active', b.dataset.escopo === escopo);
            });
            window.atualizarResumoEscopoRecorrencia();
            window.atualizarAvisoConflitoEdicao();
        });
    });

    inputEscopo.value = 'fromDate';
    window.atualizarResumoEscopoRecorrencia();
};
window.getCompromissoSerializadoParaConflito = function(compromisso, dataAlvoPtBr) {
    return {
        id: compromisso.id,
        tipo: compromisso.tipo || 'aula',
        frequencia: compromisso.frequencia || 'uma_vez',
        data: compromisso.data || dataAlvoPtBr,
        dia: compromisso.dia || '',
        diasSemana: Array.isArray(compromisso.diasSemana) ? compromisso.diasSemana.slice() : [],
        horarioInicio: compromisso.horarioInicio,
        horarioFim: compromisso.horarioFim,
        tipoRecorrencia: compromisso.tipoRecorrencia || 'semanal',
        intervaloRecorrencia: Number(compromisso.intervaloRecorrencia || 1),
        dataCriacao: compromisso.dataCriacao || new Date().toISOString(),
        recorrenciaEscopo: compromisso.recorrenciaEscopo || 'fromDate',
        recorrenciaDataInicio: compromisso.recorrenciaDataInicio || compromisso.data || dataAlvoPtBr,
        excecoes: Array.isArray(compromisso.excecoes) ? compromisso.excecoes.slice() : [],
        excecoesDetalhadas: Array.isArray(compromisso.excecoesDetalhadas) ? compromisso.excecoesDetalhadas.slice() : []
    };
};
window.getConflitosNoDia = function(candidato, dataAlvo, opcoes = {}) {
    if (!Array.isArray(aulas)) return [];
    const ignorarIds = Array.isArray(opcoes.ignorarIds) ? opcoes.ignorarIds : [];
    const dataStr = dataAlvo.toLocaleDateString('pt-BR');

    return aulas
        .filter(existente => existente && !ignorarIds.includes(existente.id))
        .filter(existente => {
            const ocorreExistente = window.checarCompromissoNaData(existente, dataAlvo);
            const ocorreCandidato = window.checarCompromissoNaData(candidato, dataAlvo);
            if (!ocorreExistente || !ocorreCandidato) return false;

            const inicioA = existente.horarioInicio;
            const fimA = existente.horarioFim;
            const inicioB = candidato.horarioInicio;
            const fimB = candidato.horarioFim;
            return inicioA < fimB && inicioB < fimA;
        })
        .map(existente => {
            const aluno = window.getAluno(existente.alunoId);
            const nome = aluno ? aluno.nome : (existente.tipo === 'aula' ? 'Aula' : (existente.descricao || 'Compromisso'));
            return {
                id: existente.id,
                data: dataStr,
                faixa: `${existente.horarioInicio} - ${existente.horarioFim}`,
                nome
            };
        });
};
window.getConflitosRecorrenciaEmDatas = function(candidato, datasPtBr, opcoes = {}) {
    const unicas = Array.from(new Set((datasPtBr || []).filter(Boolean)));
    const conflitos = [];
    unicas.forEach(dataPtBr => {
        const iso = window.converterPtBrParaISO(dataPtBr);
        if (!iso) return;
        const data = new Date(`${iso}T12:00:00`);
        if (Number.isNaN(data.getTime())) return;
        const conflDia = window.getConflitosNoDia(candidato, data, opcoes);
        conflDia.forEach(c => conflitos.push(c));
    });
    return conflitos;
};
window.getDatasConflitoRecorrencia = function(compromisso, limite = 20) {
    const inicioPtBr = compromisso.recorrenciaDataInicio || compromisso.data || window.getDataSelecionadaPtBr();
    const inicioIso = window.converterPtBrParaISO(inicioPtBr);
    if (!inicioIso) return [];

    const inicio = new Date(`${inicioIso}T12:00:00`);
    if (Number.isNaN(inicio.getTime())) return [];

    const datas = [];
    const cursor = new Date(inicio);
    const maxDias = compromisso.recorrenciaEscopo === 'monthOfDate' ? 40 : 120;
    const mesAlvo = inicio.getMonth();
    const anoAlvo = inicio.getFullYear();

    for (let i = 0; i <= maxDias && datas.length < limite; i++) {
        const d = new Date(cursor);
        d.setDate(inicio.getDate() + i);
        if (compromisso.recorrenciaEscopo === 'monthOfDate' && (d.getMonth() !== mesAlvo || d.getFullYear() !== anoAlvo)) {
            break;
        }
        if (window.checarCompromissoNaData(compromisso, d)) {
            datas.push(d.toLocaleDateString('pt-BR'));
        }
    }
    return datas;
};
window.gerarResumoConflitosDatas = function(conflitos, limite = 6) {
    if (!Array.isArray(conflitos) || conflitos.length === 0) return '';
    const vistos = new Set();
    const datas = [];
    conflitos.forEach(c => {
        if (c && c.data && !vistos.has(c.data)) {
            vistos.add(c.data);
            datas.push(c.data);
        }
    });
    if (datas.length === 0) return '';
    const preview = datas.slice(0, limite).map(window.formatarDataPtBrLegivel).join(', ');
    const resto = datas.length - limite;
    return resto > 0 ? `${preview} e mais ${resto}` : preview;
};
window.abrirNovoAgendamento = function(opcoes = {}) {
    const dia = opcoes.dia || window.getDiaTextoSelecionado();
    const hora = opcoes.hora || window.horarioSelecionadoSlot || '08:00';
    window.horarioSelecionadoSlot = hora;
    slotSelecionadoDiaTexto = dia;
    slotSelecionadoHora = hora;
    window.abrirEscolhaTipoModal(dia, hora);
};
window.diferencaMinutos = function(inicio, fim) {
    const [hI, mI] = inicio.split(':').map(Number);
    const [hF, mF] = fim.split(':').map(Number);
    return (hF * 60 + mF) - (hI * 60 + mI);
};
window.abrirEscolhaTipoModal = function(dia, hora) {
    slotSelecionadoHora = hora;
    slotSelecionadoDiaTexto = dia;
    window.horarioSelecionadoSlot = hora; // Memoriza para pré-seleção em qualquer modal subsequente

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
window.abrirReagendarAulaModalSlot = function(dia, hora) {
    window.reagendamentoDirectCardId = null; // Indica que a origem foi o clique num slot livre

    const modal = document.getElementById('modalReagendarAula');
    if (!modal) return;
    document.getElementById('containerSeletorReagendarAluno').style.display = 'block';
    document.getElementById('containerLockReagendarAluno').style.display = 'none';
    const selectAluno = document.getElementById('reagendarAluno');
    if (selectAluno) {
        const alunosComFila = [];
        const idsUnicos = new Set();
        
        aulasParaRepor.forEach(rep => {
            if (!idsUnicos.has(rep.alunoId)) {
                idsUnicos.add(rep.alunoId);
                const alunoObj = window.getAluno(rep.alunoId);
                if (alunoObj) {
                    alunosComFila.push(alunoObj);
                }
            }
        });

        if (alunosComFila.length === 0) {
            selectAluno.innerHTML = '<option value="">Não existem alunos com reposição pendente!</option>';
        } else {
            selectAluno.innerHTML = '<option value="">Selecione o aluno...</option>' + 
                alunosComFila.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
        }
    }
    document.getElementById('reagendarDia').value = dia;

    const selectInicio = document.getElementById('reagendarHoraInicio');
    const optionsHtml = HORARIOS.map(h => `<option value="${h}">${h}</option>`).join('');
    selectInicio.innerHTML = optionsHtml;
    selectInicio.value = hora;

    const nomeDiaReagendamento = (dia === 'Sábado' || dia === 'Domingo') ? dia : `${dia}-feira`;
    document.getElementById('infoReagendamentoSlot').textContent = `Agendar reposição às ${hora} de ${nomeDiaReagendamento}`;

    modal.style.display = 'flex';
};
window.iniciarReagendamentoReposicao = function(id) {
    const rep = aulasParaRepor.find(r => r.id === id);
    if (!rep) return;
    window.reagendamentoDirectCardId = id;

    const modal = document.getElementById('modalReagendarAula');
    if (!modal) return;
    document.getElementById('containerSeletorReagendarAluno').style.display = 'none';
    document.getElementById('containerLockReagendarAluno').style.display = 'block';

    const aluno = window.getAluno(rep.alunoId);
    document.getElementById('reagendarAlunoLockedNome').textContent = aluno ? aluno.nome : 'Aluno';
    document.getElementById('reagendarAlunoIdLocked').value = rep.alunoId;
    const diaTexto = window.getDiaTextoSelecionado();
    document.getElementById('reagendarDia').value = diaTexto;

    const selectInicio = document.getElementById('reagendarHoraInicio');
    const optionsHtml = HORARIOS.map(h => `<option value="${h}">${h}</option>`).join('');
    selectInicio.innerHTML = optionsHtml;
    selectInicio.value = window.horarioSelecionadoSlot || "08:00"; 

    document.getElementById('infoReagendamentoSlot').textContent = `Agendamento direto • Fila de espera`;

    modal.style.display = 'flex';
};

window.fecharReagendarAulaModal = function() {
    const modal = document.getElementById('modalReagendarAula');
    if (modal) {
        modal.style.display = 'none';
    }
    window.reagendamentoDirectCardId = null;
};

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
    const formReagendarAula = document.getElementById('formReagendarAula');
    if (formReagendarAula) {
        formReagendarAula.addEventListener('submit', (e) => {
            e.preventDefault();
            
            let alunoId = "";
            let repId = "";

            if (window.reagendamentoDirectCardId) {
                const repObj = aulasParaRepor.find(r => r.id === window.reagendamentoDirectCardId);
                if (!repObj) return;
                alunoId = repObj.alunoId;
                repId = repObj.id;
            } else {
                alunoId = document.getElementById('reagendarAluno').value;
                if (!alunoId) {
                    alert("Selecione um aluno para agendar a reposição.");
                    return;
                }
                const repObj = aulasParaRepor.find(r => r.alunoId === alunoId);
                if (repObj) {
                    repId = repObj.id;
                }
            }

            const dia = document.getElementById('reagendarDia').value;
            const hInicio = document.getElementById('reagendarHoraInicio').value;
            const duracao = document.getElementById('reagendarDuracao').value;
            const hFim = window.somarMinutos(hInicio, duracao);
            let novoCompromisso = {
                id: Date.now().toString(),
                dia: dia,
                data: window.dataSelecionada.toLocaleDateString('pt-BR'),
                horarioInicio: hInicio,
                horarioFim: hFim,
                tipo: 'aula',
                alunoId: alunoId,
                frequencia: 'uma_vez',
                isReposicao: true,
                reagendada: true
            };

            aulas.push(novoCompromisso);
            if (repId) {
                aulasParaRepor = aulasParaRepor.filter(r => r.id !== repId);
            }

            if (typeof salvarDados === 'function') salvarDados();

            window.fecharReagendarAulaModal();
            window.inicializarHome();
            if (typeof mostrarToast === 'function') mostrarToast('✅ Reposição marcada com sucesso!');
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
                frequencia: 'uma_vez' // Estritamente único!
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
                diasSemana: diasSelecionados, // Salva múltiplos dias selecionados
                horarioInicio: hInicio,
                horarioFim: hFim,
                tipo: tipo,
                frequencia: 'semanal', 
                tipoRecorrencia: padrao,
                intervaloRecorrencia: intervalo,
                excecoes: [], // Armazenará as datas das instâncias canceladas/reagendadas
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
    window.inicializarSteppersDuracao();
    window.sincronizarSteppersDuracao();

    window.configurarEscopoCriacaoRecorrencia();
    window.configurarEscopoRecorrenciaEdicao();

    if (document.getElementById('btnFecharModal')) {
        document.getElementById('btnFecharModal').addEventListener('click', () => {
            document.getElementById('modalAgendamento').style.display = 'none';
            window.reposicaoIdEmReagendamento = null; 
        });
    }
});
let idCompromissoSelecionado = "";

window.abrirModalAcaoSlot = function(id) {
    idCompromissoSelecionado = id;
    const modal = document.getElementById('modalAcaoSlot');
    const compromisso = aulas.find(a => a.id === id);
    if (!compromisso) return;

    const freq = compromisso.frequencia || 'uma_vez';
    document.getElementById('editCompromissoFrequencia').value = freq;

    const badge = document.getElementById('badgeTipoCompromisso');
    const containerDiaSemana = document.getElementById('editDiaSemanaContainer');

    const acoesUnico = document.getElementById('acoesCompromissoUnico');
    const acoesRecorrente = document.getElementById('acoesCompromissoRecorrente');
    const btnMandarReposicao = document.getElementById('btnMandarParaReposicao');
    const btnReagendarInstancia = document.getElementById('btnReagendarInstancia');
    const recorrenteTopRow = document.querySelector('#acoesCompromissoRecorrente > div');

    const dataAlvoStr = window.dataAlvoAcaoStr || window.dataSelecionada.toLocaleDateString('pt-BR');
    const containerEscopo = document.getElementById('editEscopoRecorrenciaContainer');
    const inputEscopo = document.getElementById('editEscopoRecorrencia');
    const impactoEscopo = document.getElementById('editEscopoImpacto');
    const tipo = compromisso.tipo || 'aula';
    if (tipo !== 'aula') {
        if (btnMandarReposicao) btnMandarReposicao.style.display = 'none';
        if (btnReagendarInstancia) btnReagendarInstancia.style.display = 'none';
        
        if (acoesUnico) acoesUnico.style.gridTemplateColumns = '1fr';
        if (recorrenteTopRow) recorrenteTopRow.style.gridTemplateColumns = '1fr';
    } else {
        if (btnMandarReposicao) btnMandarReposicao.style.display = 'inline-flex';
        if (btnReagendarInstancia) btnReagendarInstancia.style.display = 'inline-flex';
        
        if (acoesUnico) acoesUnico.style.gridTemplateColumns = '1fr 1fr';
        if (recorrenteTopRow) recorrenteTopRow.style.gridTemplateColumns = '1fr 1fr';
    }
    if (freq === 'semanal') {
        const padraoNome = compromisso.tipoRecorrencia ? compromisso.tipoRecorrencia.toUpperCase() : "SEMANAL";
        badge.innerHTML = `<i class="fa-solid fa-infinity"></i> ${padraoNome}`;
        badge.className = "modal-badge badge-aula"; 
        
        containerDiaSemana.style.display = 'block';
        document.getElementById('editDiaSemana').value = compromisso.dia || "Segunda";
        document.getElementById('editInfoDia').textContent = `Série Recorrente • Gerenciando dia: ${dataAlvoStr}`;
        if (containerEscopo) containerEscopo.style.display = 'block';
        if (inputEscopo) inputEscopo.value = 'fromDate';
        document.querySelectorAll('#editEscopoRecorrenciaGrid .btn-escopo-recorrencia').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.escopo === 'fromDate');
        });
        if (impactoEscopo) {
            impactoEscopo.textContent = `Escopo atual: ${window.getLabelEscopoRecorrencia('fromDate')}`;
        }
        window.atualizarResumoEscopoRecorrencia();
        window.atualizarAvisoConflitoEdicao();
        if (acoesUnico) acoesUnico.style.display = 'none';
        if (acoesRecorrente) acoesRecorrente.style.display = 'flex';
    } else {
        badge.innerHTML = `<i class="fa-solid fa-calendar-day"></i> ÚNICO`;
        badge.className = "modal-badge badge-desloc"; 
        
        containerDiaSemana.style.display = 'none';
        document.getElementById('editInfoDia').textContent = `Agendado para: ${compromisso.data || compromisso.dia}`;
        if (containerEscopo) containerEscopo.style.display = 'none';
        if (impactoEscopo) impactoEscopo.textContent = '';
        if (acoesUnico) acoesUnico.style.gridTemplateColumns = '1fr 1fr';
        if (acoesUnico) acoesUnico.style.display = 'grid';
        if (acoesRecorrente) acoesRecorrente.style.display = 'none';
    }
    
    const selectInicio = document.getElementById('editHoraInicio');
    const selectDuracao = document.getElementById('editDuracao');
    
    const optionsHtml = HORARIOS.map(h => `<option value="${h}">${h}</option>`).join('');
    selectInicio.innerHTML = optionsHtml;
    selectInicio.value = compromisso.horarioInicio;

    const minutes = window.diferencaMinutos(compromisso.horarioInicio, compromisso.horarioFim);
    selectDuracao.value = minutes.toString();
    window.aplicarLimitesDuracaoPorContexto('edicao');
    window.sincronizarSteppersDuracao();

    const camposAula = document.getElementById('editCamposTipoAula');
    const camposBloqueio = document.getElementById('editCamposTipoBloqueio');
    const camposBloqueioDiaInteiro = document.getElementById('editCamposTipoBloqueioDiaInteiro');
    const checkDiaInteiro = document.getElementById('editBloqueioDiaInteiro');
    const ehDiaInteiro = window.ehBloqueioDiaInteiroCompromisso(compromisso);

    if (tipo === 'aula') {
        camposAula.style.display = 'block';
        camposBloqueio.style.display = 'none';
        if (camposBloqueioDiaInteiro) camposBloqueioDiaInteiro.style.display = 'none';
        if (checkDiaInteiro) checkDiaInteiro.checked = false;
        window.atualizarEstadoBloqueioDiaInteiroEdicao();

        const selectAluno = document.getElementById('editAluno');
        if (selectAluno) {
            selectAluno.innerHTML = alunos.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
            selectAluno.value = compromisso.alunoId;
        }
    } else if (tipo === 'deslocamento') {
        camposAula.style.display = 'none';
        camposBloqueio.style.display = 'none';
        if (camposBloqueioDiaInteiro) camposBloqueioDiaInteiro.style.display = 'none';
        if (checkDiaInteiro) checkDiaInteiro.checked = false;
        window.atualizarEstadoBloqueioDiaInteiroEdicao();
    } else if (tipo === 'bloqueio') {
        camposAula.style.display = 'none';
        camposBloqueio.style.display = 'block';
        if (camposBloqueioDiaInteiro) camposBloqueioDiaInteiro.style.display = 'block';
        if (checkDiaInteiro) checkDiaInteiro.checked = ehDiaInteiro;
        window.atualizarEstadoBloqueioDiaInteiroEdicao();
        document.getElementById('editDescricao').value = compromisso.descricao || '';
    }

    if (modal) modal.style.display = 'flex';
};

window.fecharModalAcaoSlot = function() {
    document.getElementById('modalAcaoSlot').style.display = 'none';
};
window.atualizarAvisoConflitoEdicao = function() {
    const impacto = document.getElementById('editEscopoImpacto');
    const compromisso = aulas.find(a => a.id === idCompromissoSelecionado);
    if (!impacto || !compromisso) return;

    const freq = compromisso.frequencia || 'uma_vez';
    const escopo = document.getElementById('editEscopoRecorrencia')?.value || 'fromDate';
    impacto.textContent = `Escopo atual: ${window.getLabelEscopoRecorrencia(escopo)}`;

    if (freq !== 'semanal') return;

    const dataAlvoStr = window.dataAlvoAcaoStr || window.getDataSelecionadaPtBr();
    const ehDiaInteiroEdicao = document.getElementById('editBloqueioDiaInteiro')?.checked
        && (compromisso.tipo || 'aula') === 'bloqueio';
    const horarioInicio = ehDiaInteiroEdicao
        ? window.BLOQUEIO_DIA_INTEIRO_INICIO
        : (document.getElementById('editHoraInicio')?.value || compromisso.horarioInicio);
    const horarioFim = ehDiaInteiroEdicao
        ? window.BLOQUEIO_DIA_INTEIRO_FIM
        : window.somarMinutos(
            horarioInicio,
            document.getElementById('editDuracao')?.value || window.diferencaMinutos(compromisso.horarioInicio, compromisso.horarioFim)
        );
    const candidato = window.getCompromissoSerializadoParaConflito({
        ...compromisso,
        horarioInicio,
        horarioFim,
        fullDay: ehDiaInteiroEdicao
    }, dataAlvoStr);

    if (escopo === 'occurrence') {
        const iso = window.converterPtBrParaISO(dataAlvoStr);
        if (!iso) return;
        const data = new Date(`${iso}T12:00:00`);
        const conflitos = window.getConflitosNoDia(candidato, data, { ignorarIds: [compromisso.id] });
        if (conflitos.length > 0) {
            impacto.textContent = `Conflito detectado em ${window.formatarDataPtBrLegivel(dataAlvoStr)}.`;
        }
        return;
    }

    const datas = window.getDatasConflitoRecorrencia(candidato, 16);
    const conflitos = window.getConflitosRecorrenciaEmDatas(candidato, datas, { ignorarIds: [compromisso.id] });
    if (conflitos.length > 0) {
        impacto.textContent = `Conflitos previstos em: ${window.gerarResumoConflitosDatas(conflitos, 4)}.`;
    }
};
document.addEventListener('DOMContentLoaded', () => {
    const formEditar = document.getElementById('formEditarCompromisso');
    if (formEditar) {
        formEditar.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const compromisso = aulas.find(a => a.id === idCompromissoSelecionado);
            if (!compromisso) return;

            const tipo = compromisso.tipo || 'aula';
            const diaInteiro = tipo === 'bloqueio' && document.getElementById('editBloqueioDiaInteiro')?.checked;
            const hInicio = diaInteiro ? window.BLOQUEIO_DIA_INTEIRO_INICIO : document.getElementById('editHoraInicio').value;
            const duracaoMinutos = diaInteiro
                ? window.BLOQUEIO_DIA_INTEIRO_DURACAO
                : parseInt(document.getElementById('editDuracao').value, 10);
            const hFim = diaInteiro ? window.BLOQUEIO_DIA_INTEIRO_FIM : window.somarMinutos(hInicio, duracaoMinutos);
            const freq = document.getElementById('editCompromissoFrequencia').value;
            const escopoRecorrencia = document.getElementById('editEscopoRecorrencia')?.value || 'fromDate';
            const dataAlvoStr = window.dataAlvoAcaoStr || window.getDataSelecionadaPtBr();

            if (!diaInteiro && hInicio >= hFim) {
                alert("O horário de término deve ser posterior ao início!");
                return;
            }
            if (tipo === 'bloqueio' && !diaInteiro && duracaoMinutos > window.BLOQUEIO_MAX_MINUTOS) {
                alert('Bloqueios por hora podem ter no máximo 8h. Para mais tempo, use dia inteiro.');
                return;
            }
            if ((tipo === 'aula' || tipo === 'deslocamento') && duracaoMinutos > window.DURACAO_MAX_AULA_DESLOCAMENTO) {
                alert('Aulas e deslocamentos podem ter no máximo 2h.');
                return;
            }

            const candidato = window.getCompromissoSerializadoParaConflito({
                ...compromisso,
                horarioInicio: hInicio,
                horarioFim: hFim,
                fullDay: diaInteiro
            }, dataAlvoStr);

            if (freq === 'semanal') {
                if (escopoRecorrencia === 'occurrence') {
                    const iso = window.converterPtBrParaISO(dataAlvoStr);
                    if (!iso) {
                        alert('Não foi possível identificar a data da aula.');
                        return;
                    }
                    const data = new Date(`${iso}T12:00:00`);
                    const conflitos = window.getConflitosNoDia(candidato, data, { ignorarIds: [compromisso.id] });
                    if (conflitos.length > 0) {
                        alert(`Conflito detectado com ${conflitos[0].nome} (${conflitos[0].faixa}).`);
                        return;
                    }

                    if (!Array.isArray(compromisso.excecoes)) compromisso.excecoes = [];
                    if (!Array.isArray(compromisso.excecoesDetalhadas)) compromisso.excecoesDetalhadas = [];
                    if (!compromisso.excecoes.includes(dataAlvoStr)) compromisso.excecoes.push(dataAlvoStr);

                    const novoId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                    const novoCompromisso = {
                        ...compromisso,
                        id: novoId,
                        frequencia: 'uma_vez',
                        data: dataAlvoStr,
                        dia: compromisso.dia,
                        horarioInicio: hInicio,
                        horarioFim: hFim,
                        fullDay: diaInteiro,
                        excecoes: [],
                        excecoesDetalhadas: []
                    };
                    aulas.push(novoCompromisso);
                } else {
                    const datas = window.getDatasConflitoRecorrencia(candidato, 20);
                    const conflitos = window.getConflitosRecorrenciaEmDatas(candidato, datas, { ignorarIds: [compromisso.id] });
                    if (conflitos.length > 0) {
                        const resumo = window.gerarResumoConflitosDatas(conflitos, 5);
                        alert(`Não foi possível salvar. Existem conflitos em: ${resumo}.`);
                        return;
                    }

                    compromisso.horarioInicio = hInicio;
                    compromisso.horarioFim = hFim;
                    compromisso.fullDay = diaInteiro;
                    compromisso.recorrenciaEscopo = escopoRecorrencia;
                    compromisso.recorrenciaDataInicio = dataAlvoStr;
                    if (escopoRecorrencia === 'monthOfDate') {
                        compromisso.dataCriacao = new Date(`${window.converterPtBrParaISO(dataAlvoStr)}T12:00:00`).toISOString();
                    }
                }
            } else {
                const iso = window.converterPtBrParaISO(dataAlvoStr);
                if (iso) {
                    const data = new Date(`${iso}T12:00:00`);
                    const conflitos = window.getConflitosNoDia(candidato, data, { ignorarIds: [compromisso.id] });
                    if (conflitos.length > 0) {
                        alert(`Conflito detectado com ${conflitos[0].nome} (${conflitos[0].faixa}).`);
                        return;
                    }
                }
                compromisso.horarioInicio = hInicio;
                compromisso.horarioFim = hFim;
                compromisso.fullDay = diaInteiro;
            }

            if (freq === 'semanal') {
                compromisso.dia = document.getElementById('editDiaSemana').value;
                delete compromisso.data;
            }

            if (tipo === 'bloqueio') {
                compromisso.descricao = document.getElementById('editDescricao').value.trim();
                if (!diaInteiro) delete compromisso.fullDay;
            }

            if (typeof salvarDados === 'function') salvarDados();

            window.fecharModalAcaoSlot();
            window.inicializarHome();
            if (typeof mostrarToast === 'function') mostrarToast('✅ Alterações salvas com sucesso!');
        });
    }

    const inputEditHora = document.getElementById('editHoraInicio');
    const inputEditDuracao = document.getElementById('editDuracao');
    if (inputEditHora) inputEditHora.addEventListener('change', () => window.atualizarAvisoConflitoEdicao());
    if (inputEditDuracao) inputEditDuracao.addEventListener('change', () => window.atualizarAvisoConflitoEdicao());
    const checkEditDiaInteiro = document.getElementById('editBloqueioDiaInteiro');
    if (checkEditDiaInteiro) checkEditDiaInteiro.addEventListener('change', () => window.atualizarEstadoBloqueioDiaInteiroEdicao());
    // [TAG-JS-ACOES-SLOTS] - Lógica Refinada de Cancelamentos/Reagendamentos
    const btnDeletar = document.getElementById('btnDeletarDefinitivo');
    if (btnDeletar) {
        btnDeletar.addEventListener('click', () => {
            aulas = aulas.filter(a => a.id !== idCompromissoSelecionado);
            if (typeof salvarDados === 'function') salvarDados();
            
            window.fecharModalAcaoSlot();
            window.inicializarHome();
            if (typeof mostrarToast === 'function') mostrarToast('🗑️ Compromisso único cancelado!');
        });
    }
    const btnMandarReposicao = document.getElementById('btnMandarParaReposicao');
    if (btnMandarReposicao) {
        btnMandarReposicao.addEventListener('click', () => {
            const compromisso = aulas.find(a => a.id === idCompromissoSelecionado);
            if (!compromisso) return;

            aulasParaRepor.push({
                id: Date.now().toString(),
                alunoId: compromisso.alunoId,
                dataCancelamento: compromisso.data || new Date().toLocaleDateString('pt-BR')
            });
            
            aulas = aulas.filter(a => a.id !== idCompromissoSelecionado);
            if (typeof salvarDados === 'function') salvarDados();

            window.fecharModalAcaoSlot();
            window.inicializarHome();
            if (typeof mostrarToast === 'function') mostrarToast('🔄 Aula única enviada para reposição!');
        });
    }
    const btnDeletarInstancia = document.getElementById('btnDeletarInstancia');
    if (btnDeletarInstancia) {
        btnDeletarInstancia.addEventListener('click', () => {
            const compromisso = aulas.find(a => a.id === idCompromissoSelecionado);
            if (!compromisso) return;

            const dataAlvoStr = window.dataAlvoAcaoStr || window.dataSelecionada.toLocaleDateString('pt-BR');
            if (!compromisso.excecoes) compromisso.excecoes = [];
            if (!compromisso.excecoes.includes(dataAlvoStr)) {
                compromisso.excecoes.push(dataAlvoStr);
            }

            if (typeof salvarDados === 'function') salvarDados();
            
            window.fecharModalAcaoSlot();
            window.inicializarHome();
            if (typeof mostrarToast === 'function') mostrarToast(`📅 Aula de ${dataAlvoStr} cancelada!`);
        });
    }
    const btnReagendarInstancia = document.getElementById('btnReagendarInstancia');
    if (btnReagendarInstancia) {
        btnReagendarInstancia.addEventListener('click', () => {
            const compromisso = aulas.find(a => a.id === idCompromissoSelecionado);
            if (!compromisso) return;

            const dataAlvoStr = window.dataAlvoAcaoStr || window.dataSelecionada.toLocaleDateString('pt-BR');
            if (!compromisso.excecoes) compromisso.excecoes = [];
            if (!compromisso.excecoes.includes(dataAlvoStr)) {
                compromisso.excecoes.push(dataAlvoStr);
            }

            aulasParaRepor.push({
                id: Date.now().toString(),
                alunoId: compromisso.alunoId,
                dataCancelamento: dataAlvoStr
            });

            if (typeof salvarDados === 'function') salvarDados();
            
            window.fecharModalAcaoSlot();
            window.inicializarHome();
            if (typeof mostrarToast === 'function') mostrarToast(`🔄 Aula de ${dataAlvoStr} enviada para reposição!`);
        });
    }
    const btnDeletarSerie = document.getElementById('btnDeletarSerie');
    if (btnDeletarSerie) {
        btnDeletarSerie.addEventListener('click', () => {
            aulas = aulas.filter(a => a.id !== idCompromissoSelecionado);
            if (typeof salvarDados === 'function') salvarDados();
            
            window.fecharModalAcaoSlot();
            window.inicializarHome();
            if (typeof mostrarToast === 'function') mostrarToast('🗑️ Série recorrente excluída do calendário!');
        });
    }
});

window.togglePainelReposicoes = function() {
    const painel = document.getElementById('painelReposicoesPendentes');
    if (painel.style.display === 'none') {
        painel.style.display = 'block';
        window.renderizarListaReposicoes();
    } else {
        painel.style.display = 'none';
    }
};
window.renderizarListaReposicoes = function() {
    const container = document.getElementById('listaReposicoesPendentes');
    if (!container) return;
    if (!aulasParaRepor || aulasParaRepor.length === 0) {
        container.innerHTML = `<p style="font-size: 0.8rem; color: #666; text-align: center; padding: 10px;">Sem reposições pendentes.</p>`;
        return;
    }
    container.innerHTML = aulasParaRepor.map(rep => {
        const aluno = window.getAluno(rep.alunoId);
        return `
            <div class="aluno-card" style="border-left-color: #FF5252; display: flex; flex-direction: column; gap: 10px; padding: 12px 14px; background: #222;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <strong style="display: block; color: #FFF; font-size: 0.9rem;">${aluno ? aluno.nome : 'Aluno'}</strong>
                        <span style="font-size: 0.72rem; color: #FF5252; font-weight: 600;">Cancelada em ${rep.dataCancelamento}</span>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <button class="btn btn-primary btn-sm" onclick="iniciarReagendamentoReposicao('${rep.id}')" style="background: #FFD700; color: #0D0D0D; font-size: 0.7rem; border: none; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="fa-solid fa-calendar-check"></i> Reagendar
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="resolverReposicao('${rep.id}')" style="background: #111; color: #AAA; border: 1px solid #333; font-size: 0.7rem; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="fa-solid fa-trash"></i> Descartar
                    </button>
                </div>
            </div>
        `;
    }).join('');
};

window.resolverReposicao = function(id) {
    aulasParaRepor = aulasParaRepor.filter(r => r.id !== id);
    if (typeof salvarDados === 'function') salvarDados();
    window.inicializarHome();
};

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
