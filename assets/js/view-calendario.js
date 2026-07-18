// [TAG-VIEW-CALENDARIO] view-calendario.js
// Responsabilidade: Orquestração da aba Calendário — alternância Dia/Mês, dashboard KPI e visão semanal da Home
// Depende de: state.js, storage.js, utils-kpi.js, alunos-helpers.js (window.getAluno), agenda-card-template.js (window.criarCardAgendamento), calendario-engine.js, modal-acao-slot.js (abrirModalAcaoSlot — em runtime) - Controle Mensal & Semanal na SPA
window.modoCalendarioAtivo = 'dia';
window.semanaReferencia = new Date();
window.filtroAlunoSemanalId = null; // Estado do filtro de aluno na semana exibida na Home
window.filtroAlunoMensalId = null; // Estado do filtro de aluno na aba mensal

window.inicializarPaginaCalendario = async function(opcoes = {}) {
    const deveSincronizar = opcoes.sincronizar === true || !window.__sincronizacaoInicialConcluida;
    if (deveSincronizar && typeof carregarDados === 'function') {
        await carregarDados({ forcarRender: false });
        window.__sincronizacaoInicialConcluida = true;
    }
    
    // Populate filter dropdowns
    window.preencherFiltrosAlunos();

    window.alternarModoCalendario(window.modoCalendarioAtivo);
};

/**
 * Popula os dropdowns de filtro de alunos em ambas as abas
 */
window.preencherFiltrosAlunos = function() {
    const alunosLista = window.alunos || [];
    
    const preencherSelect = (id) => {
        const select = document.getElementById(id);
        if (!select) return;
        select.innerHTML = '<option value="">👥 Todos os Alunos</option>';
        alunosLista.forEach(aluno => {
            const option = document.createElement('option');
            option.value = aluno.id;
            option.textContent = aluno.nome;
            select.appendChild(option);
        });
    };
    
    preencherSelect('filtroAlunoSemanaHome');
    preencherSelect('filtroAlunoMensal');
};

/**
 * Atualiza o filtro da semana exibida na Home e re-renderiza
 */
window.atualizarFiltroSemanaHome = function() {
    const select = document.getElementById('filtroAlunoSemanaHome');
    if (select) {
        window.filtroAlunoSemanalId = select.value || null;
        window.renderizarHomeSemana();
    }
};

window.atualizarFiltroCalendarioSemanal = window.atualizarFiltroSemanaHome;

/**
 * Atualiza o filtro da aba mensal e re-renderiza
 */
window.atualizarFiltroCalendarioMensal = function() {
    const select = document.getElementById('filtroAlunoMensal');
    if (select) {
        window.filtroAlunoMensalId = select.value || null;
        window.renderizarCalendarioMensal();
    }
};

window.alternarModoCalendario = function(modo) {
    window.modoCalendarioAtivo = modo;
    
    const tabMensal = document.getElementById('tabCalendarioMensal');
    const tabDia = document.getElementById('tabCalendarioDia');
    
    const containerMensal = document.getElementById('containerCalendarioMensal');
    const containerDia = document.getElementById('containerCalendarioDia');

    if (!tabMensal || !tabDia || !containerMensal || !containerDia) return;

    if (modo === 'dia') {
        tabDia.classList.add('active');
        tabMensal.classList.remove('active');
        containerDia.style.display = 'block';
        containerMensal.style.display = 'none';
        window.renderizarCalendarioDia();
    } else {
        tabMensal.classList.add('active');
        tabDia.classList.remove('active');
        containerMensal.style.display = 'block';
        containerDia.style.display = 'none';
        window.renderizarCalendarioMensal();
    }
};

window.renderizarModoCalendarioAtivo = function() {
    if (window.modoCalendarioAtivo === 'mensal') {
        window.renderizarCalendarioMensal();
        return;
    }

    window.renderizarCalendarioDia();
};

window.renderizarCalendarioDia = function() {
    if (typeof window.atualizarDataAtual === 'function') {
        window.atualizarDataAtual();
    }

    if (typeof window.renderizarAgendaDia === 'function') {
        window.renderizarAgendaDia();
    }
};
window.renderizarCalendarioMensal = function() {
    const gridSPA = document.getElementById('calendarioMonthlyGrid');
    if (!gridSPA) return;
    gridSPA.id = 'calendarioGrid';

    window.renderizarKPIDashboard();

    if (typeof renderizarCalendario === 'function') {
        renderizarCalendario();
    }
    gridSPA.id = 'calendarioMonthlyGrid';
};

/**
 * Renderiza o painel de KPIs para o aluno selecionado no filtro da aba mensal
 */
window.renderizarKPIDashboard = function() {
    const kpiContainer = document.getElementById('kpiDashboardContainer');
    if (!kpiContainer) return;
    
    // Get current month/year
    const hoje = new Date();
    const mes = window.mesAtual !== undefined ? window.mesAtual : hoje.getMonth();
    const ano = window.anoAtual !== undefined ? window.anoAtual : hoje.getFullYear();
    
    let kpis, nomeAluno;
    
    // Calculate KPIs based on filter
    if (window.filtroAlunoMensalId) {
        // Single student KPIs
        kpis = window.calcularKPIsAluno(window.filtroAlunoMensalId, mes, ano, window.aulas);
        const aluno = window.alunos?.find(a => a.id === window.filtroAlunoMensalId);
        nomeAluno = aluno ? aluno.nome : 'Aluno';
    } else {
        // Consolidated KPIs for all students
        kpis = window.calcularKPIsTodosAlunos(mes, ano, window.aulas, window.alunos);
        nomeAluno = 'Todos os Alunos';
    }
    
    // Format currency
    const formatMoeda = (value) => `R$ ${value.toFixed(2).replace('.', ',')}`;
    const formatQtd = (value) => `${value}`;
    
    const html = `
        <div class="kpi-dashboard">
            <div class="kpi-card">
                <span class="kpi-card-value">${formatMoeda(kpis.projecaoMensal)}</span>
                <span class="kpi-card-label">📊 Projeção Mensal</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-card-value">${formatMoeda(kpis.realizadoAteHoje)}</span>
                <span class="kpi-card-label">✅ Realizado até Hoje</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-card-value">${formatQtd(kpis.aulasARealizarQtd)}</span>
                <span class="kpi-card-label">⏳ Aulas a Realizar</span>
            </div>
            <div class="kpi-card">
                <span class="kpi-card-value">${formatQtd(kpis.reposicoes)}</span>
                <span class="kpi-card-label">🔄 Aulas a Repor</span>
            </div>
        </div>
    `;
    
    kpiContainer.innerHTML = html;
    kpiContainer.style.display = 'grid';
};
window.irParaDiaDestaSemana = function(dataStr) {
    const parts = dataStr.split('/');
    if (parts.length === 3) {
        const dia = parseInt(parts[0], 10);
        const mes = parseInt(parts[1], 10) - 1; // Ajusta mês (0-11 no JS)
        const ano = parseInt(parts[2], 10);
        window.dataSelecionada = new Date(ano, mes, dia);
    }
    window.modoCalendarioAtivo = 'dia';

    const navLinkCalendario = document.querySelector('.header-nav .nav-link[data-target="tela-calendario"]');
    if (navLinkCalendario) {
        navLinkCalendario.click();
    } else if (typeof window.alternarModoCalendario === 'function') {
        window.alternarModoCalendario('dia');
    }

    if (typeof mostrarToast === 'function') {
        mostrarToast(`📅 Agenda do dia ${dataStr} aberta!`);
    }
};
window.renderizarHomeSemana = function() {
    const gridSemanal = document.getElementById('calendarioSemanalHomeGrid');
    const labelPeriodo = document.getElementById('periodoSemanaHomeLabel');
    if (!gridSemanal) return;
    const dataRef = new Date(window.semanaReferencia);
    const diaSemana = dataRef.getDay();
    const dSeg = dataRef.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
    const segundaFeira = new Date(dataRef.setDate(dSeg));
    const sabado = new Date(segundaFeira);
    sabado.setDate(segundaFeira.getDate() + 5);
    if (labelPeriodo) {
        const dSegStr = String(segundaFeira.getDate()).padStart(2, '0');
        const mSegStr = String(segundaFeira.getMonth() + 1).padStart(2, '0');
        const dSabStr = String(sabado.getDate()).padStart(2, '0');
        const mSabStr = String(sabado.getMonth() + 1).padStart(2, '0');
        const anoRef = segundaFeira.getFullYear();
        labelPeriodo.innerHTML = `<i class="fa-regular fa-calendar-days" style="color: #FFD700; margin-right: 6px;"></i><span style="color: #FFD700;"> ${dSegStr}/${mSegStr} a ${dSabStr}/${mSabStr}</span> de ${anoRef}`;
    }
    
    let html = '';
    const diasUteisMap = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const agora = new Date();
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const minutosAgora = (agora.getHours() * 60) + agora.getMinutes();
    const converterHorarioParaMinutos = (horario) => {
        if (!horario || typeof horario !== 'string') return 0;
        const [horas, minutos] = horario.split(':').map(Number);
        return (horas * 60) + minutos;
    };
    const formatarHoraCheia = (hora) => `${String(hora).padStart(2, '0')}:00`;
    const horaInicioPadrao = formatarHoraCheia(agendaConfig?.horaInicio || 8);

    for (let d = 0; d < 6; d++) {
        const diaAtual = new Date(segundaFeira);
        diaAtual.setDate(segundaFeira.getDate() + d);

        const diaTexto = diasUteisMap[d];
        const diaNum = String(diaAtual.getDate()).padStart(2, '0');
        const mesNum = String(diaAtual.getMonth() + 1).padStart(2, '0');
        const dataAlvoFormatada = diaAtual.toLocaleDateString('pt-BR');
        const dataIso = `${diaAtual.getFullYear()}-${String(diaAtual.getMonth() + 1).padStart(2, '0')}-${diaNum}`;
        const ehHoje = diaAtual.toDateString() === new Date().toDateString();
        const diaAtualPuro = new Date(diaAtual.getFullYear(), diaAtual.getMonth(), diaAtual.getDate());
        const diaJaPassou = diaAtualPuro < hoje;
        const diaEhHoje = diaAtualPuro.getTime() === hoje.getTime();
        const tituloDia = `${diaTexto === 'Sábado' ? diaTexto : `${diaTexto}-feira`}, ${diaNum}/${mesNum}`;
        
        // [FILTERED] Apply student filter and get only aula/reposição types
        let compromissosDoDia = aulas
            .filter(a => window.checarCompromissoNaData(a, diaAtual))
            .sort((a, b) => a.horarioInicio.localeCompare(b.horarioInicio));
        
        // Filter by student if selected
        if (window.filtroAlunoSemanalId) {
            compromissosDoDia = compromissosDoDia.filter(a => a.alunoId === window.filtroAlunoSemanalId);
        }

        let cardsHtml = '';

        if (compromissosDoDia.length > 0) {
            compromissosDoDia.forEach(comp => {
                const compromissoConcluido = diaJaPassou || (diaEhHoje && converterHorarioParaMinutos(comp.horarioFim) < minutosAgora);
                cardsHtml += window.criarCardAgendamento(comp, {
                    dataReferencia: new Date(diaAtual),
                    compromissoConcluido: compromissoConcluido,
                    onclick: `abrirCalendarioAcaoSlot('${comp.id}', '${dataAlvoFormatada}')`
                });
            });
        } else {
            cardsHtml = `
                <button type="button" class="semana-dia-empty-slot" onclick="window.abrirNovoAgendamentoSemana('${dataIso}', '${horaInicioPadrao}')">
                    <span class="semana-dia-empty-slot-icon"><i class="fa-regular fa-calendar-plus"></i></span>
                    <span class="semana-dia-empty-slot-text">Sem agendamentos para este dia</span>
                </button>
            `;
        }
        html += `
            <section class="semana-dia-box ${ehHoje ? 'is-today' : ''}" id="${ehHoje ? 'semana-dia-hoje-elemento' : ''}">
                <button type="button" class="semana-dia-header" onclick="window.irParaDiaDestaSemana('${dataAlvoFormatada}')">
                    <span class="semana-dia-header-main">
                        <span class="semana-dia-title">${tituloDia}</span>
                        ${ehHoje ? '<span class="semana-dia-today-badge">HOJE</span>' : ''}
                    </span>
                    <span class="semana-dia-open-icon"><i class="fa-solid fa-chevron-right"></i></span>
                </button>
                <div class="semana-dia-content">
                    ${cardsHtml}
                </div>
            </section>
        `;
    }

    gridSemanal.innerHTML = html;
    setTimeout(() => {
        const hojeEl = document.getElementById('semana-dia-hoje-elemento');
        if (hojeEl) {
            hojeEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 120);
};
window.renderizarCalendarioSemanal = window.renderizarHomeSemana;
window.obterProximaHoraCheiaSemana = function() {
    const agora = new Date();
    const horaAlvo = new Date(agora);

    if (horaAlvo.getMinutes() > 0 || horaAlvo.getSeconds() > 0 || horaAlvo.getMilliseconds() > 0) {
        horaAlvo.setHours(Math.min(horaAlvo.getHours() + 1, 23), 0, 0, 0);
    } else {
        horaAlvo.setMinutes(0, 0, 0);
    }

    return `${String(horaAlvo.getHours()).padStart(2, '0')}:00`;
};
window.abrirNovoAgendamentoSemana = function(dataIso, horaPadrao) {
    const partes = typeof dataIso === 'string' ? dataIso.split('-').map(Number) : [];
    if (partes.length !== 3) {
        return;
    }

    const dataSelecionada = new Date(partes[0], partes[1] - 1, partes[2], 12, 0, 0, 0);
    window.abrirNovoAgendamento({
        dataSelecionada,
        hora: horaPadrao || `${String(agendaConfig?.horaInicio || 8).padStart(2, '0')}:00`
    });
};
window.abrirCalendarioAcaoSlot = function(id, dataStr) {
    window.dataAlvoAcaoStr = dataStr;

    if (typeof idCompromissoSelecionado !== 'undefined') {
        idCompromissoSelecionado = id;
    }
    
    if (typeof abrirModalAcaoSlot === 'function') {
        abrirModalAcaoSlot(id);
    }
    const originalFecharModalAcaoSlot = window.fecharModalAcaoSlot;
    window.fecharModalAcaoSlot = function() {
        window.dataAlvoAcaoStr = null; // Limpa o estado
        if (originalFecharModalAcaoSlot) originalFecharModalAcaoSlot();
        if (typeof window.renderizarHomeSemana === 'function') window.renderizarHomeSemana();
        if (typeof window.renderizarModoCalendarioAtivo === 'function') window.renderizarModoCalendarioAtivo();
    };
};
document.addEventListener('DOMContentLoaded', () => {
    const btnMesAnterior = document.getElementById('btnMesAnterior');
    const btnMesProximo = document.getElementById('btnMesProximo');
    const btnMesHoje = document.getElementById('btnMesHoje');

    if (btnMesAnterior) {
        btnMesAnterior.addEventListener('click', () => {
            if (typeof navegarMes === 'function') {
                navegarMes(-1);
                window.renderizarCalendarioMensal();
            }
        });
    }

    if (btnMesProximo) {
        btnMesProximo.addEventListener('click', () => {
            if (typeof navegarMes === 'function') {
                navegarMes(1);
                window.renderizarCalendarioMensal();
            }
        });
    }

    if (btnMesHoje) {
        btnMesHoje.addEventListener('click', () => {
            const hoje = new Date();
            window.mesAtual = hoje.getMonth();
            window.anoAtual = hoje.getFullYear();
            window.renderizarCalendarioMensal();
        });
    }

    const btnSemanaAnterior = document.getElementById('btnSemanaHomeAnterior');
    const btnSemanaProxima = document.getElementById('btnSemanaHomeProxima');
    const btnSemanaHoje = document.getElementById('btnSemanaHomeHoje');

    if (btnSemanaAnterior) {
        btnSemanaAnterior.addEventListener('click', () => {
            window.semanaReferencia.setDate(window.semanaReferencia.getDate() - 7);
            window.renderizarHomeSemana();
        });
    }

    if (btnSemanaProxima) {
        btnSemanaProxima.addEventListener('click', () => {
            window.semanaReferencia.setDate(window.semanaReferencia.getDate() + 7);
            window.renderizarHomeSemana();
        });
    }

    if (btnSemanaHoje) {
        btnSemanaHoje.addEventListener('click', () => {
            window.semanaReferencia = new Date();
            window.renderizarHomeSemana();
        });
    }

    const btnNovaAgendaSemanal = document.getElementById('btnNovaAgendaSemanal');
    if (btnNovaAgendaSemanal) {
        btnNovaAgendaSemanal.addEventListener('click', () => {
            const hoje = new Date();
            const dataSelecionada = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 12, 0, 0, 0);

            window.abrirNovoAgendamento({
                dataSelecionada,
                hora: window.obterProximaHoraCheiaSemana()
            });
        });
    }
});
