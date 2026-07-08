// ========================================================
// [HOME] - Dashboard e Controle da Agenda Diária da Home Page
// ========================================================

// Controladores internos de data da Home
let dataSelecionada = new Date();
const DIAS_DA_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

// 1. FUNÇÃO DE INICIALIZAÇÃO GLOBAL (Chamada pelo app.js ao abrir a aba)
window.inicializarHome = function() {
    // Carrega os dados mais recentes do LocalStorage
    if (typeof carregarDados === 'function') carregarDados();
    
    // Atualiza o topo com a data legível
    window.atualizarDataAtual();
    
    // Preenche as estatísticas de Alunos e Aulas
    window.atualizarDashboardStats();
    
    // Constrói visualmente a lista de horários
    window.renderizarAgendaDia();
};

// 2. EXPOR AS FUNÇÕES PARA O ESCOPO GLOBAL (Para que possam se auto-atualizar)

window.atualizarDataAtual = function() {
    const elementoData = document.getElementById('dataAtual');
    if (!elementoData) return;

    const dia = String(dataSelecionada.getDate()).padStart(2, '0');
    const mes = String(dataSelecionada.getMonth() + 1).padStart(2, '0');
    const nomeDia = DIAS_DA_SEMANA[dataSelecionada.getDay()];

    elementoData.textContent = `${nomeDia}, ${dia}/${mes}`;
};

window.atualizarDashboardStats = function() {
    const elAlunos = document.getElementById('totalAlunos');
    const elAulas = document.getElementById('totalAulasSemana');

    // Alunos totais ativos
    if (elAlunos && typeof alunos !== 'undefined') {
        elAlunos.textContent = alunos.length;
    }

    // Filtra o total de aulas cadastradas na semana corrente
    if (elAulas && typeof aulas !== 'undefined') {
        // Pega as aulas válidas associadas aos dias úteis (Segunda a Sexta)
        const aulasSemana = aulas.filter(a => typeof DIAS !== 'undefined' && DIAS.includes(a.dia));
        elAulas.textContent = aulasSemana.length;
    }
};

window.renderizarAgendaDia = function() {
    const grid = document.getElementById('agendaGridHome');
    if (!grid) return;

    // Identifica qual o dia textual correspondente à data selecionada (ex: "Segunda")
    const diaSemanaIndex = dataSelecionada.getDay();
    let diaTexto = 'Segunda'; // Padrão de segurança
    
    if (typeof DIAS !== 'undefined' && diaSemanaIndex >= 1 && diaSemanaIndex <= 5) {
        diaTexto = DIAS[diaSemanaIndex - 1];
    } else if (diaSemanaIndex === 0) {
        diaTexto = 'Domingo';
    } else if (diaSemanaIndex === 6) {
        diaTexto = 'Sábado';
    }

    let html = '';

    // Varre a constante HORARIOS configurada no seu dados.js
    if (typeof HORARIOS !== 'undefined') {
        HORARIOS.forEach(h => {
            // Busca se existe aula agendada para este dia e horário específico
            const aula = typeof getAulaNoIntervalo === 'function' ? getAulaNoIntervalo(diaTexto, h) : null;
            
            if (aula) {
                const aluno = typeof getAluno === 'function' ? getAluno(aula.alunoId) : null;
                const nome = aluno ? aluno.nome : '❓ Aluno Removido';
                const objetivo = aluno ? aluno.objetivo : 'Outro';
                
                html += `
                    <div class="agenda-dia-linha">
                        <div class="agenda-dia-horario">${h}</div>
                        <div class="agenda-dia-aula objetivo-${objetivo.replace(/\s/g,'')}" onclick="if(typeof cancelarAula === 'function') cancelarAula('${aula.id}')">
                            <span class="agenda-dia-aula-nome"><i class="fa-solid fa-user-clock"></i> ${nome}</span>
                            <span class="agenda-dia-aula-detalhes">${objetivo}</span>
                            <span class="agenda-dia-aula-periodo">${aula.horarioInicio} - ${aula.horarioFim}</span>
                        </div>
                    </div>
                `;
            } else {
                // Caso não tenha aula, exibe bloco vago que abre o Modal de agendamento ao clicar
                html += `
                    <div class="agenda-dia-linha">
                        <div class="agenda-dia-horario">${h}</div>
                        <div class="agenda-dia-vago" onclick="if(typeof abrirModal === 'function') abrirModal('${diaTexto}', '${h}')">
                            <span class="agenda-dia-vago-texto"><i class="fa-regular fa-circle-dot" style="color: #4CAF50;"></i> Horário Livre — Toque para Agendar</span>
                        </div>
                    </div>
                `;
            }
        });
    }

    grid.innerHTML = html;
};

// 3. OUVINTES DOS BOTÕES DE NAVEGAÇÃO DE DIAS (Configurados apenas uma vez)
document.addEventListener('DOMContentLoaded', () => {
    const btnAnterior = document.getElementById('btnAnterior');
    const btnProximo = document.getElementById('btnProximo');
    const btnHoje = document.getElementById('btnHoje');

    if (btnAnterior) {
        btnAnterior.addEventListener('click', () => {
            dataSelecionada.setDate(dataSelecionada.getDate() - 1);
            window.atualizarDataAtual();
            window.renderizarAgendaDia();
        });
    }

    if (btnProximo) {
        btnProximo.addEventListener('click', () => {
            dataSelecionada.setDate(dataSelecionada.getDate() + 1);
            window.atualizarDataAtual();
            window.renderizarAgendaDia();
        });
    }

    if (btnHoje) {
        btnHoje.addEventListener('click', () => {
            dataSelecionada = new Date();
            window.atualizarDataAtual();
            window.renderizarAgendaDia();
        });
    }
});