// [TAG-JS-PAGINA-CALENDARIO] - Controle Mensal & Semanal na SPA
window.modoCalendarioAtivo = 'semanal';
window.semanaReferencia = new Date();
window.filtroAlunoSemanalId = null; // Estado do filtro de aluno na aba semanal
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
    
    preencherSelect('filtroAlunoSemanal');
    preencherSelect('filtroAlunoMensal');
};

/**
 * Atualiza o filtro da aba semanal e re-renderiza
 */
window.atualizarFiltroCalendarioSemanal = function() {
    const select = document.getElementById('filtroAlunoSemanal');
    if (select) {
        window.filtroAlunoSemanalId = select.value || null;
        window.renderizarCalendarioSemanal();
    }
};

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
    const tabSemanal = document.getElementById('tabCalendarioSemanal');
    
    const containerMensal = document.getElementById('containerCalendarioMensal');
    const containerSemanal = document.getElementById('containerCalendarioSemanal');

    if (!tabMensal || !tabSemanal) return;

    if (modo === 'semanal') {
        tabSemanal.classList.add('active');
        tabMensal.classList.remove('active');
        containerSemanal.style.display = 'block';
        containerMensal.style.display = 'none';
        window.renderizarCalendarioSemanal();
    } else {
        tabMensal.classList.add('active');
        tabSemanal.classList.remove('active');
        containerMensal.style.display = 'block';
        containerSemanal.style.display = 'none';
        window.renderizarCalendarioMensal();
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
    const navLinkHome = document.querySelector('.header-nav .nav-link[data-target="tela-home"]');
    if (navLinkHome) {
        navLinkHome.click();
    }

    if (typeof mostrarToast === 'function') {
        mostrarToast(`📅 Agenda do dia ${dataStr} aberta!`);
    }
};
window.renderizarCalendarioSemanal = function() {
    const gridSemanal = document.getElementById('calendarioSemanalGrid');
    const labelPeriodo = document.getElementById('periodoSemanaLabel');
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
    for (let d = 0; d < 6; d++) {
        const diaAtual = new Date(segundaFeira);
        diaAtual.setDate(segundaFeira.getDate() + d);

        const diaTexto = diasUteisMap[d];
        const diaNum = String(diaAtual.getDate()).padStart(2, '0');
        const mesNum = String(diaAtual.getMonth() + 1).padStart(2, '0');
        const dataAlvoFormatada = diaAtual.toLocaleDateString('pt-BR');
        const ehHoje = diaAtual.toDateString() === new Date().toDateString();
        
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
                const tipo = comp.tipo || 'aula';
                const periodo = `${comp.horarioInicio} - ${comp.horarioFim}`;
                let tagVisualHtml = '';

                if (tipo === 'aula') {
                    const aluno = typeof window.getAluno === 'function' ? window.getAluno(comp.alunoId) : null;
                    const nome = aluno ? aluno.nome : '❓ Aluno Removido';
                    const objetivo = aluno ? aluno.objective || aluno.objetivo : 'Outro';
                    const local = aluno ? (aluno.local || 'Não definido') : 'Não definido';

                    if (comp.reagendada || comp.isReposicao) {
                        tagVisualHtml = `<span class="badge-tag-tipo" style="background: rgba(100, 181, 246, 0.15); color: #64B5F6; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;"><i class="fa-solid fa-arrows-rotate"></i> Reposição</span>`;
                    } else if (comp.frequencia === 'semanal') {
                        tagVisualHtml = `<span class="badge-tag-tipo" style="background: rgba(255, 215, 0, 0.15); color: #FFD700; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;"><i class="fa-solid fa-infinity"></i> Recorrente</span>`;
                    } else {
                        tagVisualHtml = `<span class="badge-tag-tipo" style="background: rgba(129, 199, 132, 0.15); color: #81C784; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;"><i class="fa-solid fa-thumbtack"></i> Único</span>`;
                    }

                    cardsHtml += `
                        <div class="agenda-dia-aula objetivo-${objetivo.replace(/\s/g,'')}" onclick="abrirCalendarioAcaoSlot('${comp.id}', '${dataAlvoFormatada}')" style="margin-bottom: 8px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px; margin-bottom: 3px;">
                                <span class="agenda-dia-aula-nome"><i class="fa-solid fa-graduation-cap"></i> ${nome}</span>
                                ${tagVisualHtml}
                            </div>
                            <span class="agenda-dia-aula-local"><i class="fa-solid fa-location-dot"></i> ${local}</span>
                            <span class="agenda-dia-aula-detalhes">${objetivo} (${periodo})</span>
                        </div>
                    `;
                } else if (tipo === 'deslocamento') {
                    tagVisualHtml = `<span class="badge-tag-tipo" style="background: rgba(255, 152, 0, 0.15); color: #FF9800; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;"><i class="fa-solid fa-car-side"></i> Trânsito</span>`;
                    
                    cardsHtml += `
                        <div class="agenda-dia-aula slot-deslocamento" onclick="abrirCalendarioAcaoSlot('${comp.id}', '${dataAlvoFormatada}')" style="margin-bottom: 8px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px; margin-bottom: 3px;">
                                <span class="agenda-dia-aula-nome" style="color: #FF9800;"><i class="fa-solid fa-car-side"></i> Deslocamento</span>
                                ${tagVisualHtml}
                            </div>
                            <span class="agenda-dia-aula-local" style="color: #DDD;">${comp.descricao || 'Trânsito'} (${periodo})</span>
                        </div>
                    `;
                } else if (tipo === 'bloqueio') {
                    tagVisualHtml = `<span class="badge-tag-tipo" style="background: rgba(239, 83, 80, 0.15); color: #EF5350; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 700; display: inline-flex; align-items: center; gap: 3px;"><i class="fa-solid fa-lock"></i> Bloqueio</span>`;

                    cardsHtml += `
                        <div class="agenda-dia-aula slot-bloqueado" onclick="abrirCalendarioAcaoSlot('${comp.id}', '${dataAlvoFormatada}')" style="margin-bottom: 8px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px; margin-bottom: 3px;">
                                <span class="agenda-dia-aula-nome" style="color: #EF5350;"><i class="fa-solid fa-lock"></i> Bloqueado</span>
                                ${tagVisualHtml}
                            </div>
                            <span class="agenda-dia-aula-local" style="color: #DDD;">${comp.descricao || 'Compromisso'} (${periodo})</span>
                        </div>
                    `;
                }
            });
        } else {
            cardsHtml = `
                <div style="padding: 10px; background: #0F0F0F; border-radius: 8px; border: 1px dashed #222; text-align: center;">
                    <span style="font-size: 0.75rem; color: #555;"><i class="fa-regular fa-calendar" style="margin-right: 5px;"></i> Sem agendamentos para este dia</span>
                </div>
            `;
        }
        html += `
            <div class="semana-dia-box ${ehHoje ? 'dia-semana-hoje-card' : ''}" id="${ehHoje ? 'semana-dia-hoje-elemento' : ''}" style="background: #1A1A1A; border: 1px solid #282828; border-radius: 12px; padding: 14px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                <div class="semana-dia-header" onclick="window.irParaDiaDestaSemana('${dataAlvoFormatada}')">
                    <span style="font-weight: 700; color: #FFD700; font-size: 0.95rem; display: flex; align-items: center; gap: 6px;">
                        🎯 ${diaTexto === 'Sábado' ? diaTexto : `${diaTexto}-feira`} ${ehHoje ? '<span style="background: #FFD700; color: #0D0D0D; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 900;">HOJE</span>' : ''}
                    </span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="btn-semana-ir-dia"><i class="fa-regular fa-folder-open"></i> Abrir dia</span>
                        <span style="font-size: 0.8rem; background: ${ehHoje ? '#FFD700' : '#2D2D2D'}; color: ${ehHoje ? '#0D0D0D' : '#FFF'}; padding: 2px 8px; border-radius: 20px; font-weight: 600;">${diaNum}/${mesNum}</span>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column;">
                    ${cardsHtml}
                </div>
            </div>
        `;
    }

    gridSemanal.innerHTML = html;
    setTimeout(() => {
        const hojeEl = document.getElementById('semana-dia-hoje-elemento');
        if (hojeEl) {
            hojeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 120);
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
        window.renderizarCalendarioSemanal();
        if (typeof window.renderizarCalendarioMensal === 'function') window.renderizarCalendarioMensal();
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

    const btnSemanaAnterior = document.getElementById('btnSemanaAnterior');
    const btnSemanaProxima = document.getElementById('btnSemanaProxima');
    const btnSemanaHoje = document.getElementById('btnSemanaHoje');

    if (btnSemanaAnterior) {
        btnSemanaAnterior.addEventListener('click', () => {
            window.semanaReferencia.setDate(window.semanaReferencia.getDate() - 7);
            window.renderizarCalendarioSemanal();
        });
    }

    if (btnSemanaProxima) {
        btnSemanaProxima.addEventListener('click', () => {
            window.semanaReferencia.setDate(window.semanaReferencia.getDate() + 7);
            window.renderizarCalendarioSemanal();
        });
    }

    if (btnSemanaHoje) {
        btnSemanaHoje.addEventListener('click', () => {
            window.semanaReferencia = new Date();
            window.renderizarCalendarioSemanal();
        });
    }
});
