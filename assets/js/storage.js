// =================================================================
// [JS-STORAGE] - Integração do Front-end com a API no Render & MongoDB
// =================================================================

// URL base da sua API hospedada no Render
const API_BASE_URL = "https://personalapp-api.onrender.com/api";

/**
 * Função para carregar todos os dados da API (MongoDB)
 * Faz chamadas paralelas para Alunos, Agendamentos e Configuração.
 */
async function carregarDados() {
    try {
        console.log("🔄 Iniciando sincronização com o banco de dados online...");
        
        // Faz requisições simultâneas para otimizar o tempo de carregamento
        const [resAlunos, resAgendamentos, resConfig] = await Promise.all([
            fetch(`${API_BASE_URL}/alunos`).catch(err => { throw new Error("API Alunos fora do ar"); }),
            fetch(`${API_BASE_URL}/agendamentos`).catch(err => { throw new Error("API Agendamentos fora do ar"); }),
            fetch(`${API_BASE_URL}/configuracao`).catch(err => { throw new Error("API Configuração fora do ar"); })
        ]);

        // Verifica se todas as respostas retornaram status de sucesso (200-299)
        if (!resAlunos.ok || !resAgendamentos.ok || !resConfig.ok) {
            throw new Error("Uma ou mais requisições falharam no servidor.");
        }

        const dadosAlunos = await resAlunos.json();
        const dadosAgendamentos = await resAgendamentos.json();
        const dadosConfig = await resConfig.json();

        // 1. Atribui os alunos carregados do banco (garante que seja um array)
        window.alunos = Array.isArray(dadosAlunos) ? dadosAlunos : [];

        // 2. Atribui as aulas (agendamentos) vindos do banco
        window.aulas = Array.isArray(dadosAgendamentos) ? dadosAgendamentos : [];

        // 3. Mapeia as configurações da API (horaInicio/horaFim) para o limitesGrade do front-end
        if (dadosConfig) {
            window.limitesGrade = {
                inicio: dadosConfig.horaInicio || "06:00",
                fim: dadosConfig.horaFim || "22:00"
            };
        } else {
            window.limitesGrade = { inicio: "06:00", fim: "22:00" };
        }

        // 4. Carrega a meta de faturamento (mantemos localmente ou usamos fallback)
        window.faturamentoMeta = parseFloat(localStorage.getItem('faturamentoMeta')) || 0;

        console.log("✅ Dados sincronizados do MongoDB com sucesso!", {
            alunos: window.alunos.length,
            aulas: window.aulas.length,
            grade: window.limitesGrade
        });

        // Força a atualização visual da tela se a função global de renderização existir
        if (typeof renderizarTudo === 'function') {
            renderizarTudo();
        } else if (typeof atualizarInterface === 'function') {
            atualizarInterface();
        } else if (typeof renderizarAgenda === 'function') {
            renderizarAgenda();
        }

    } catch (error) {
        console.error("❌ Falha na conexão com a API. Usando localStorage temporariamente.", error);
        
        // Fallback de segurança: Se a internet cair ou o Render demorar para acordar, carrega o backup do localStorage
        carregarDadosDoLocalStorage();
        
        if (typeof mostrarToast === 'function') {
            mostrarToast("Trabalhando offline. Dados salvos no navegador.", "warning");
        }
    }
}

/**
 * Função para persistir os dados na Nuvem via API do Render
 * Envia de forma estruturada para cada uma das suas rotas de sincronização.
 */
async function salvarDados() {
    // 1. Salva sempre no localStorage primeiro como redundância instantânea de segurança
    salvarNoLocalStorage();

    try {
        console.log("💾 Sincronizando alterações com o MongoDB Atlas...");

        // Prepara os dados para envio nos formatos esperados pelo seu server.js
        const payloadAlunos = { alunos: window.alunos || [] };
        const payloadAgendamentos = { agendamentos: window.aulas || [] };
        const payloadConfig = {
            horaInicio: window.limitesGrade?.inicio || "06:00",
            horaFim: window.limitesGrade?.fim || "22:00"
        };

        // Realiza as requisições POST para persistência em lote no banco de dados
        const [resAlunos, resAgendamentos, resConfig] = await Promise.all([
            fetch(`${API_BASE_URL}/alunos/sincronizar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payloadAlunos)
            }),
            fetch(`${API_BASE_URL}/agendamentos/sincronizar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payloadAgendamentos)
            }),
            fetch(`${API_BASE_URL}/configuracao`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payloadConfig)
            })
        ]);

        if (!resAlunos.ok || !resAgendamentos.ok || !resConfig.ok) {
            throw new Error("Falha ao salvar dados no banco remoto.");
        }

        console.log("☁️ Alterações sincronizadas com o banco remoto!");
        
        if (typeof mostrarToast === 'function') {
            mostrarToast("Alterações salvas na nuvem!", "success");
        }

    } catch (error) {
        console.error("❌ Erro ao salvar dados na API:", error);
        if (typeof mostrarToast === 'function') {
            mostrarToast("Erro de conexão. Salvo temporariamente no aparelho.", "error");
        }
    }
}

/**
 * Função de backup local - Carrega dados se a API falhar
 */
function carregarDadosDoLocalStorage() {
    const backupAlunos = localStorage.getItem('personal_alunos');
    const backupAulas = localStorage.getItem('personal_aulas');
    const backupGrade = localStorage.getItem('personal_limitesGrade');
    
    window.alunos = backupAlunos ? JSON.parse(backupAlunos) : [];
    window.aulas = backupAulas ? JSON.parse(backupAulas) : [];
    window.limitesGrade = backupGrade ? JSON.parse(backupGrade) : { inicio: "06:00", fim: "22:00" };
    window.faturamentoMeta = parseFloat(localStorage.getItem('faturamentoMeta')) || 0;
}

/**
 * Função de backup local - Salva redundância no localStorage
 */
function salvarNoLocalStorage() {
    localStorage.setItem('personal_alunos', JSON.stringify(window.alunos || []));
    localStorage.setItem('personal_aulas', JSON.stringify(window.aulas || []));
    localStorage.setItem('personal_limitesGrade', JSON.stringify(window.limitesGrade || { inicio: "06:00", fim: "22:00" }));
    localStorage.setItem('faturamentoMeta', (window.faturamentoMeta || 0).toString());
}