// =================================================================
// [JS-STORAGE] - Integração do Front-end com a API no Render & MongoDB
// =================================================================

// URL base da sua API hospedada no Render
const API_BASE_URL = "https://personalapp-api.onrender.com/api";

// --- HELPERS DE ESCOPO GLOBAL ---
// Estas funções garantem paridade de referência entre variáveis léxicas locais (let/var) e o objeto window

function obterAlunos() {
    try {
        if (typeof alunos !== 'undefined') return alunos;
    } catch(e) {}
    return window.alunos || [];
}

function obterAulas() {
    try {
        if (typeof aulas !== 'undefined') return aulas;
    } catch(e) {}
    return window.aulas || [];
}

function obterLimitesGrade() {
    try {
        if (typeof limitesGrade !== 'undefined') return limitesGrade;
    } catch(e) {}
    return window.limitesGrade || { inicio: "06:00", fim: "22:00" };
}

function atualizarAlunos(novosAlunos) {
    const lista = Array.isArray(novosAlunos) ? novosAlunos : [];
    try {
        if (typeof alunos !== 'undefined' && Array.isArray(alunos)) {
            alunos.length = 0; // Esvazia o array mantendo a referência viva
            alunos.push(...lista); // Insere os novos dados
            window.alunos = alunos;
            return;
        }
    } catch(e) {}
    window.alunos = lista;
}

function atualizarAulas(novasAulas) {
    const lista = Array.isArray(novasAulas) ? novasAulas : [];
    try {
        if (typeof aulas !== 'undefined' && Array.isArray(aulas)) {
            aulas.length = 0; // Esvazia o array mantendo a referência viva
            aulas.push(...lista); // Insere os novos dados
            window.aulas = aulas;
            return;
        }
    } catch(e) {}
    window.aulas = lista;
}

function atualizarLimitesGrade(novaGrade) {
    const grade = novaGrade || { inicio: "06:00", fim: "22:00" };
    try {
        if (typeof limitesGrade !== 'undefined' && typeof limitesGrade === 'object') {
            for (let key in limitesGrade) {
                delete limitesGrade[key];
            }
            Object.assign(limitesGrade, grade);
            window.limitesGrade = limitesGrade;
            return;
        }
    } catch(e) {}
    window.limitesGrade = grade;
}

// --- FUNÇÃO DE CARREGAMENTO (GET) ---
async function carregarDados() {
    try {
        console.log("🔄 Iniciando sincronização com o banco de dados online...");
        
        // Faz requisições simultâneas para otimizar o tempo de carregamento
        const [resAlunos, resAgendamentos, resConfig] = await Promise.all([
            fetch(`${API_BASE_URL}/alunos`).catch(err => { throw new Error("API Alunos fora do ar"); }),
            fetch(`${API_BASE_URL}/agendamentos`).catch(err => { throw new Error("API Agendamentos fora do ar"); }),
            fetch(`${API_BASE_URL}/configuracao`).catch(err => { throw new Error("API Configuração fora do ar"); })
        ]);

        if (!resAlunos.ok || !resAgendamentos.ok || !resConfig.ok) {
            throw new Error("Uma ou mais requisições falharam no servidor.");
        }

        const dadosAlunos = await resAlunos.json();
        const dadosAgendamentos = await resAgendamentos.json();
        const dadosConfig = await resConfig.json();

        // Mapeia os dados vindo da API
        const listaAlunosAPI = Array.isArray(dadosAlunos) ? dadosAlunos : [];
        const listaAulasAPI = Array.isArray(dadosAgendamentos) ? dadosAgendamentos : [];

        // --- SISTEMA DE MIGRAÇÃO ONLINE ---
        // Se o MongoDB remoto estiver zerado, mas o usuário possui dados locais prévios no navegador,
        // nós migramos automaticamente do localStorage para o MongoDB na primeira execução!
        if (listaAlunosAPI.length === 0 && listaAulasAPI.length === 0) {
            const backupUnificado = localStorage.getItem('personalTrainerData');
            const backupAlunos = localStorage.getItem('personal_alunos');
            const backupAulas = localStorage.getItem('personal_aulas');
            
            let alunosLocais = [];
            let aulasLocais = [];

            if (backupUnificado) {
                try {
                    const parsed = JSON.parse(backupUnificado);
                    alunosLocais = parsed.alunos || [];
                    aulasLocais = parsed.aulas || [];
                } catch(e) {}
            } else if (backupAlunos || backupAulas) {
                try {
                    alunosLocais = backupAlunos ? JSON.parse(backupAlunos) : [];
                    aulasLocais = backupAulas ? JSON.parse(backupAulas) : [];
                } catch(e) {}
            }

            if (alunosLocais.length > 0 || aulasLocais.length > 0) {
                console.log("📤 Banco online vazio! Migrando dados locais antigos para o MongoDB Atlas...", {
                    alunos: alunosLocais.length,
                    aulas: aulasLocais.length
                });

                atualizarAlunos(alunosLocais);
                atualizarAulas(aulasLocais);
                
                // Envia os dados para a API silenciosamente para persistir no MongoDB
                await salvarDados(true);
                
                if (typeof mostrarToast === 'function') {
                    mostrarToast("Seus dados locais foram migrados com sucesso para a nuvem!", "success");
                }
                
                // Atualiza a interface
                forçarRenderizacaoInterface();
                return;
            }
        }

        // Caso comum: Atualiza o estado global com os dados vindos do banco de dados MongoDB
        atualizarAlunos(listaAlunosAPI);
        atualizarAulas(listaAulasAPI);

        if (dadosConfig) {
            atualizarLimitesGrade({
                inicio: dadosConfig.horaInicio || "06:00",
                fim: dadosConfig.horaFim || "22:00"
            });
        } else {
            atualizarLimitesGrade({ inicio: "06:00", fim: "22:00" });
        }

        // Carrega faturamentoMeta (local ou do localStorage)
        window.faturamentoMeta = parseFloat(localStorage.getItem('faturamentoMeta')) || 0;

        console.log("✅ Dados sincronizados do MongoDB com sucesso!", {
            alunos: obterAlunos().length,
            aulas: obterAulas().length,
            grade: obterLimitesGrade()
        });

        forçarRenderizacaoInterface();

    } catch (error) {
        console.error("❌ Falha na conexão com a API. Usando localStorage temporariamente.", error);
        carregarDadosDoLocalStorage();
        
        if (typeof mostrarToast === 'function') {
            mostrarToast("Trabalhando offline. Dados salvos no navegador.", "warning");
        }
        forçarRenderizacaoInterface();
    }
}

// --- FUNÇÃO DE PERSISTÊNCIA (POST) ---
async function salvarDados(silencioso = false) {
    // 1. Salva sempre no localStorage primeiro como segurança de redundância
    salvarNoLocalStorage();

    try {
        console.log("💾 Sincronizando alterações com o MongoDB Atlas...");

        const alunosData = obterAlunos();
        const aulasData = obterAulas();
        const gradeData = obterLimitesGrade();

        // Envia de forma limpa para as rotas do seu backend
        const [resAlunos, resAgendamentos, resConfig] = await Promise.all([
            fetch(`${API_BASE_URL}/alunos/sincronizar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ alunos: alunosData })
            }),
            fetch(`${API_BASE_URL}/agendamentos/sincronizar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ agendamentos: aulasData })
            }),
            fetch(`${API_BASE_URL}/configuracao`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    horaInicio: gradeData.inicio || "06:00",
                    horaFim: gradeData.fim || "22:00"
                })
            })
        ]);

        if (!resAlunos.ok || !resAgendamentos.ok || !resConfig.ok) {
            throw new Error("Falha ao salvar dados no banco remoto.");
        }

        console.log("☁️ Alterações sincronizadas com o banco remoto!");
        
        if (!silencioso && typeof mostrarToast === 'function') {
            mostrarToast("Alterações salvas na nuvem!", "success");
        }

    } catch (error) {
        console.error("❌ Erro ao salvar dados na API:", error);
        if (!silencioso && typeof mostrarToast === 'function') {
            mostrarToast("Erro de conexão. Salvo temporariamente no aparelho.", "error");
        }
    }
}

// --- SECUNDÁRIAS / AUXILIARES ---

function carregarDadosDoLocalStorage() {
    const backupAlunos = localStorage.getItem('personal_alunos');
    const backupAulas = localStorage.getItem('personal_aulas');
    const backupGrade = localStorage.getItem('personal_limitesGrade');
    
    atualizarAlunos(backupAlunos ? JSON.parse(backupAlunos) : []);
    atualizarAulas(backupAulas ? JSON.parse(backupAulas) : []);
    atualizarLimitesGrade(backupGrade ? JSON.parse(backupGrade) : { inicio: "06:00", fim: "22:00" });
    window.faturamentoMeta = parseFloat(localStorage.getItem('faturamentoMeta')) || 0;
}

function salvarNoLocalStorage() {
    localStorage.setItem('personal_alunos', JSON.stringify(obterAlunos()));
    localStorage.setItem('personal_aulas', JSON.stringify(obterAulas()));
    localStorage.setItem('personal_limitesGrade', JSON.stringify(obterLimitesGrade()));
    localStorage.setItem('faturamentoMeta', (window.faturamentoMeta || 0).toString());
}

function forçarRenderizacaoInterface() {
    if (typeof renderizarTudo === 'function') {
        renderizarTudo();
    } else if (typeof atualizarInterface === 'function') {
        atualizarInterface();
    } else if (typeof renderizarAgenda === 'function') {
        renderizarAgenda();
    }
}