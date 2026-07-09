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
    
    // Força a exibição do modo salvo/ativo (que por padrão será o semanal)
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

// 4. RENDERIZADOR DO CALENDÁRIO SEMANAL (Focado em Mobile-First, Empilhado Verticalmente)
// CORREÇÃO: Resolve a recorrência indesejada filtrando compromissos pela data específica ou recorrência semanal
window.renderizarCalendarioSemanal = function() {
    const gridSemanal = document.getElementById('calendarioSemanalGrid');
    const labelPeriodo = document.getElementById('periodoSemanaLabel');
    if (!gridSemanal) return;

    // Acha a Segunda-feira da semana de referência
    const dataRef = new Date(window.semanaReferencia);
    const diaSemana = dataRef.getDay();
    const diferencaSegunda = dataRef.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1);
    const segundaFeira = new Date(dataRef.setDate(diferencaSegunda));

    // Acha a Sexta-feira da semana de referência
    const sextaFeira = new Date(segundaFeira);
    sextaFeira.setDate(segundaFeira.getDate() + 4);

    // Atualiza a Label de Período (ex: "Semana: 06/07 a 10/07 de 2026")
    if (labelPeriodo) {
        const dSeg = String(segundaFeira.getDate()).padStart(2, '0');
        const mSeg = String(segundaFeira.getMonth() + 1).padStart(2, '0');
        const dSex = String(sextaFeira.getDate()).padStart(2, '0');
        const mSex = String(sextaFeira.getMonth() + 1).padStart(2, '0');
        const anoRef = segundaFeira.getFullYear();
        labelPeriodo.innerHTML = `<i class="fa-regular fa-calendar-days" style="color: #FFD700; margin-right: 6px;"></i>Semana: <span style="color: #FFD700;">${dSeg}/${mSeg} a ${dSex}/${mSex}</span> de ${anoRef}`;
    }

    let html = '';

    // Mapeamento textual dos dias úteis
    const diasUteisMap = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];

    // Varre os 5 dias úteis (Segunda a Sexta) para desenhar os blocos
    for (let d = 0; d < 5; d++) {
        const diaAtual = new Date(segundaFeira);
        diaAtual.setDate(segundaFeira.getDate() + d);

        const diaTexto = diasUteisMap[d];
        const diaNum = String(diaAtual.getDate()).padStart(2, '0');
        const mesNum = String(diaAtual.getMonth() + 1).padStart(2, '0');
        const dataStr = diaAtual.toLocaleDateString('pt-BR'); // ex: "06/07/2026"

        // CORREÇÃO: Filtra os compromissos deste dia específico (se únicos) ou recorrentes semanais
        const compromissosDoDia = aulas
            .filter(a => {
                if (a.frequencia === 'semanal') {
                    return a.dia === diaTexto;
                }
                if (!a.data) {
                    return a.dia === diaTexto;
                }
                return a.data === dataStr;
            })
            .sort((a, b) => a.horarioInicio.localeCompare(b.horarioInicio));

        let cardsHtml = '';

        if (compromissosDoDia.length > 0) {
            compromissosDoDia.forEach(comp => {
                const tipo = comp.tipo || 'aula';
                const periodo = `${comp.horarioInicio} - ${comp.horarioFim}`;

                // REUSO IDÊNTICO DO DESIGN DA HOME
                if (tipo === 'aula') {
                    const aluno = typeof getAluno === 'function' ? getAluno(comp.alunoId) : null;
                    const nome = aluno ? aluno.nome : '❓ Aluno Removido';
                    const objetivo = aluno ? aluno.objective || aluno.objetivo : 'Outro';
                    const local = aluno ? (aluno.local || 'Não definido') : 'Não definido';

                    cardsHtml += `
                        <div class="agenda-dia-aula objetivo-${objetivo.replace(/\s/g,'')}" onclick="abrirCalendarioAcaoSlot('${comp.id}', '${diaTexto}')" style="margin-bottom: 8px;">
                            <span class="agenda-dia-aula-nome"><i class="fa-solid fa-graduation-cap"></i> ${nome}</span>
                            <span class="agenda-dia-aula-local"><i class="fa-solid fa-location-dot"></i> ${local}</span>
                            <span class="agenda-dia-aula-detalhes">${objetivo} (${periodo})</span>
                        </div>
                    `;
                } else if (tipo === 'deslocamento') {
                    cardsHtml += `
                        <div class="agenda-dia-aula slot-deslocamento" onclick="abrirCalendarioAcaoSlot('${comp.id}', '${diaTexto}')" style="margin-bottom: 8px;">
                            <span class="agenda-dia-aula-nome" style="color: #FF9800;"><i class="fa-solid fa-car-side"></i> Deslocamento</span>
                            <span class="agenda-dia-aula-local" style="color: #DDD;">${comp.descricao || 'Trânsito'} (${periodo})</span>
                        </div>
                    `;
                } else if (tipo === 'bloqueio') {
                    cardsHtml += `
                        <div class="agenda-dia-aula slot-bloqueado" onclick="abrirCalendarioAcaoSlot('${comp.id}', '${diaTexto}')" style="margin-bottom: 8px;">
                            <span class="agenda-dia-aula-nome" style="color: #EF5350;"><i class="fa-solid fa-lock"></i> Bloqueado</span>
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

        // Adiciona o dia com seu cabeçalho e sua lista de cards idêntica à Home
        html += `
            <div style="background: #1A1A1A; border: 1px solid #282828; border-radius: 12px; padding: 14px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #2A2A2A; padding-bottom: 8px; margin-bottom: 12px;">
                    <span style="font-weight: 700; color: #FFD700; font-size: 0.95rem;">🎯 ${diaTexto}-feira</span>
                    <span style="font-size: 0.8rem; background: #2D2D2D; color: #FFF; padding: 2px 8px; border-radius: 20px; font-weight: 600;">${diaNum}/${mesNum}</span>
                </div>
                <div style="display: flex; flex-direction: column;">
                    ${cardsHtml}
                </div>
            </div>
        `;
    }

    gridSemanal.innerHTML = html;
};

// 5. ATIVAÇÃO DE AÇÕES DO CARD CLICADO (Compartilhado com o modal de exclusão/reagendamento da Home)
window.abrirCalendarioAcaoSlot = function(id, diaTexto) {
    if (typeof idCompromissoSelecionado !== 'undefined') {
        idCompromissoSelecionado = id;
    }
    
    if (typeof abrirModalAcaoSlot === 'function') {
        abrirModalAcaoSlot(id);
    }
    
    // Sobrescreve a escuta de finalização para atualizar as duas visões de calendário imediatamente
    const originalFecharModalAcaoSlot = window.fecharModalAcaoSlot;
    window.fecharModalAcaoSlot = function() {
        if (originalFecharModalAcaoSlot) originalFecharModalAcaoSlot();
        window.renderizarCalendarioSemanal();
        window.renderizarCalendarioMensal();
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
            window.renderizarCalendarioMensal();
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