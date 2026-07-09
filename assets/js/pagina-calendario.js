// ========================================================
// [TAG-JS-PAGINA-CALENDARIO] - Controle Mensal & Semanal na SPA
// ========================================================

// A aba Calendário agora abre a Visão Semanal por padrão!
window.modoCalendarioAtivo = 'semanal';

// Data de referência para navigation na visão semanal (inicia na data de hoje)
window.semanaReferencia = new Date();

// 1. INICIALIZADOR DA ABA CALENDÁRIO (Chamado ao mudar de aba)
window.inicializarPaginaCalendario = function() {
    if (typeof carregarDados === 'function') carregarDados();
    window.alternarModoCalendario(window.modoCalendarioAtivo);
};

// 2. ALTERNADOR DE ABAS (SEMANAL VS MENSAL)
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

// 3. RENDERIZADOR DO CALENDÁRIO MENSAL (Sincronizado com o calendario.js original)
window.renderizarCalendarioMensal = function() {
    const gridSPA = document.getElementById('calendarioMonthlyGrid');
    if (!gridSPA) return;

    // Alinha temporariamente o ID do contêiner para o motor original renderizar
    gridSPA.id = 'calendarioGrid';

    if (typeof renderizarCalendario === 'function') {
        renderizarCalendario();
    }

    // Devolve o ID específico do contêiner SPA
    gridSPA.id = 'calendarioMonthlyGrid';
};

// NOVO: Função para transportar o utilizador da Semana para o Dia específico na Home
window.irParaDiaDestaSemana = function(dataStr) {
    const parts = dataStr.split('/');
    if (parts.length === 3) {
        const dia = parseInt(parts[0], 10);
        const mes = parseInt(parts[1], 10) - 1; // Ajusta mês (0-11 no JS)
        const ano = parseInt(parts[2], 10);
        window.dataSelecionada = new Date(ano, mes, dia);
    }

    // Aciona a simulação SPA de clique na aba "Home" para mudar de ecrã instantaneamente
    const navLinkHome = document.querySelector('.header-nav .nav-link[data-target="tela-home"]');
    if (navLinkHome) {
        navLinkHome.click();
    }

    if (typeof mostrarToast === 'function') {
        mostrarToast(`📅 Agenda do dia ${dataStr} aberta!`);
    }
};

// 4. RENDERIZADOR DO CALENDÁRIO SEMANAL (Focado em Mobile-First, Empilhado Verticalmente)
window.renderizarCalendarioSemanal = function() {
    const gridSemanal = document.getElementById('calendarioSemanalGrid');
    const labelPeriodo = document.getElementById('periodoSemanaLabel');
    if (!gridSemanal) return;

    // Acha a Segunda-feira da semana de referência
    const dataRef = new Date(window.semanaReferencia);
    const diaSemana = dataRef.getDay();
    const dSeg = dataRef.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
    const segundaFeira = new Date(dataRef.setDate(dSeg));

    // Acha o Sábado da semana de referência (segunda + 5 dias)
    const sabado = new Date(segundaFeira);
    sabado.setDate(segundaFeira.getDate() + 5);

    // Atualiza a Label de Período (ex: "Semana: 06/07 a 11/07 de 2026")
    if (labelPeriodo) {
        const dSegStr = String(segundaFeira.getDate()).padStart(2, '0');
        const mSegStr = String(segundaFeira.getMonth() + 1).padStart(2, '0');
        const dSabStr = String(sabado.getDate()).padStart(2, '0');
        const mSabStr = String(sabado.getMonth() + 1).padStart(2, '0');
        const anoRef = segundaFeira.getFullYear();
        labelPeriodo.innerHTML = `<i class="fa-regular fa-calendar-days" style="color: #FFD700; margin-right: 6px;"></i><span style="color: #FFD700;"> ${dSegStr}/${mSegStr} a ${dSabStr}/${mSabStr}</span> de ${anoRef}`;
    }

    let html = '';

    // Mapeamento textual dos dias úteis + Sábado
    const diasUteisMap = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    // Varre os 6 dias úteis de trabalho (Segunda a Sábado) para desenhar os blocos
    for (let d = 0; d < 6; d++) {
        const diaAtual = new Date(segundaFeira);
        diaAtual.setDate(segundaFeira.getDate() + d);

        const diaTexto = diasUteisMap[d];
        const diaNum = String(diaAtual.getDate()).padStart(2, '0');
        const mesNum = String(diaAtual.getMonth() + 1).padStart(2, '0');
        const dataAlvoFormatada = diaAtual.toLocaleDateString('pt-BR');

        // Identifica se a célula sendo renderizada é HOJE
        const ehHoje = diaAtual.toDateString() === new Date().toDateString();

        // Filtra os compromissos deste dia usando a função unificada
        const compromissosDoDia = aulas
            .filter(a => window.checarCompromissoNaData(a, diaAtual))
            .sort((a, b) => a.horarioInicio.localeCompare(b.horarioInicio));

        let cardsHtml = '';

        if (compromissosDoDia.length > 0) {
            compromissosDoDia.forEach(comp => {
                const tipo = comp.tipo || 'aula';
                const periodo = `${comp.horarioInicio} - ${comp.horarioFim}`;

                // Sistema idêntico de Tags Visuais Premium nos cards para consistência total da SPA
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

        // MODIFICADO: Adicionado cabeçalho do bloco de dia clicável (.semana-dia-header) para transporte de ecrã dinâmico
        html += `
            <div class="semana-dia-box ${ehHoje ? 'dia-semana-hoje-card' : ''}" id="${ehHoje ? 'semana-dia-hoje-elemento' : ''}" style="background: #1A1A1A; border: 1px solid #282828; border-radius: 12px; padding: 14px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                <div class="semana-dia-header" onclick="window.irParaDiaDestaSemana('${dataAlvoFormatada}')">
                    <span style="font-weight: 700; color: #FFD700; font-size: 0.95rem; display: flex; align-items: center; gap: 6px;">
                        🎯 ${diaTexto}-feira ${ehHoje ? '<span style="background: #FFD700; color: #0D0D0D; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; font-weight: 900;">HOJE</span>' : ''}
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

    // Auto-Rolagem Inteligente (Auto-Scroll) para focar no dia de hoje automaticamente
    setTimeout(() => {
        const hojeEl = document.getElementById('semana-dia-hoje-elemento');
        if (hojeEl) {
            hojeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 120);
};

// 5. ATIVAÇÃO DE AÇÕES DO CARD CLICADO (Compartilhado com o modal de exclusão/reagendamento da Home)
window.abrirCalendarioAcaoSlot = function(id, dataStr) {
    // Define a data alvo do calendário de forma segura na série para não perder contexto
    window.dataAlvoAcaoStr = dataStr;

    if (typeof idCompromissoSelecionado !== 'undefined') {
        idCompromissoSelecionado = id;
    }
    
    if (typeof abrirModalAcaoSlot === 'function') {
        abrirModalAcaoSlot(id);
    }
    
    // Sobrescreve a escuta de finalização para limpar a herança de data e recarregar os dados
    const originalFecharModalAcaoSlot = window.fecharModalAcaoSlot;
    window.fecharModalAcaoSlot = function() {
        window.dataAlvoAcaoStr = null; // Limpa o estado
        if (originalFecharModalAcaoSlot) originalFecharModalAcaoSlot();
        window.renderizarCalendarioSemanal();
        if (typeof window.renderizarCalendarioMensal === 'function') window.renderizarCalendarioMensal();
    };
};

// 6. OUVINTES DE EVENTOS DE NAVEGAÇÃO DA PÁGINA DO CALENDÁRIO (Mensal e Semanal)
document.addEventListener('DOMContentLoaded', () => {
    // A) Controles do Mês
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
            if (typeof mesAtual !== 'undefined') mesAtual = hoje.getMonth();
            if (typeof anoAtual !== 'undefined') anoAtual = hoje.getFullYear();
            window.renderizarCalendarioMesal();
        });
    }

    // B) Controles da Semana
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