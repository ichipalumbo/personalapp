// ========================================================
// [CALENDÁRIO MENSAL] - Roteador e Renderização da SPA
// ========================================================

// Esta função é disparada pelo app.js sempre que você clica na aba "Calendário"
window.inicializarPaginaCalendario = function() {
    // Garante que os dados mais recentes do LocalStorage estão carregados
    if (typeof carregarDados === 'function') carregarDados();
    
    // Alinha os IDs para que o motor original funcione na SPA
    window.renderizarCalendarioMensal();
};

window.renderizarCalendarioMensal = function() {
    // CORREÇÃO CRÍTICA: Faz o mapeamento dinâmico para o motor original (calendario.js)
    // encontrar o contêiner correto da SPA
    const gridSPA = document.getElementById('calendarioMensalGrid');
    
    if (gridSPA) {
        // Criamos temporariamente uma propriedade no elemento para o motor original funcionar
        gridSPA.id = 'calendarioGrid'; 
    }

    // Procura e executa a função matemática que monta os dias (está no seu assets/js/calendario.js)
    if (typeof renderizarCalendario === 'function') {
        renderizarCalendario();
    } else if (typeof renderizarMes === 'function') {
        renderizarMes();
    }

    // Retorna o ID original da SPA para não quebrar o layout CSS
    if (gridSPA) {
        gridSPA.id = 'calendarioMensalGrid';
    }
};

// Configuração dos botões de navegação de Mês Anterior / Próximo Mês
document.addEventListener('DOMContentLoaded', () => {
    // Mapeamento dos botões do topo do calendário
    const btnMesAnterior = document.getElementById('btnMesAnterior');
    const btnMesProximo = document.getElementById('btnMesProximo');

    if (btnMesAnterior) {
        btnMesAnterior.addEventListener('click', () => {
            if (typeof navegarMes === 'function') {
                navegarMes(-1); // Chama a função nativa do seu calendario.js
                window.renderizarCalendarioMensal(); // Força a atualização visual
            } else if (typeof mesAtual !== 'undefined') {
                mesAtual--;
                if (mesAtual < 0) { mesAtual = 11; anoAtual--; }
                window.renderizarCalendarioMensal();
            }
        });
    }

    if (btnMesProximo) {
        btnMesProximo.addEventListener('click', () => {
            if (typeof navegarMes === 'function') {
                navegarMes(1); // Chama a função nativa do seu calendario.js
                window.renderizarCalendarioMensal(); // Força a atualização visual
            } else if (typeof mesAtual !== 'undefined') {
                mesAtual++;
                if (mesAtual > 11) { mesAtual = 0; anoAtual++; }
                window.renderizarCalendarioMensal();
            }
        });
    }
});