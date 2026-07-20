// [TAG-STORAGE] storage.js
// Responsabilidade: Persistência de dados — sync com API REST (Vercel/MongoDB) e fallback localStorage
// Depende de: state.js (alunos, aulas, agendaConfig), utils-kpi.js (mostrarToast)
// Expõe: carregarDados, salvarDados, obterAlunos, obterAulas, obterLimitesGrade,
//         atualizarAlunos, atualizarAulas, atualizarLimitesGrade, window.faturamentoMeta
const API_BASE_URL = "https://personal-app-api.vercel.app/api";
const API_TIMEOUT_MS = 8000;

// [TAG-STORAGE-VERCEL-PING] Warm-up para cold start do Vercel — fire-and-forget, sem await
fetch('https://personal-app-api.vercel.app/').catch(() => {});

// Flag para timeout estendido na primeira requisição (cold start do Vercel + conexão MongoDB)
let _primeiraRequisicao = true;

async function fetchComTimeout(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
        if (error && error.name === 'AbortError') {
            throw new Error(`Tempo limite de ${timeoutMs}ms excedido para ${url}`);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

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

/**
 * [TAG-STORAGE-MAPEADOR-EXTERNO] Mapeador padronizado para bloqueios externos.
 * Garante consistência entre bloqueios que vêm do banco e do calendário.
 * @param {Object} bloqueioRaw - Objeto vindo do backend ou do Google Calendar
 * @returns {Object} Bloqueio mapeado em formato padrão
 */
function mapearBloqueioExterno(bloqueioRaw) {
    if (!bloqueioRaw || typeof bloqueioRaw !== 'object') {
        return null;
    }

    // Garante que googleCalendarEventId está presente
    const googleCalendarEventId = bloqueioRaw.googleCalendarEventId || bloqueioRaw.id;
    if (!googleCalendarEventId) {
        console.warn('[storage] Bloqueio externo sem googleCalendarEventId, ignorando:', bloqueioRaw);
        return null;
    }

    return {
        id:                    'gcal_ext_' + googleCalendarEventId,
        tipo:                  'bloqueio',
        source:                'google_external',
        readonly:              true,
        descricao:             bloqueioRaw.titulo || bloqueioRaw.descricao || 'Evento externo',
        googleCalendarEventId: googleCalendarEventId,
        data:                  bloqueioRaw.data || '',
        horarioInicio:         bloqueioRaw.horarioInicio || '00:00',
        horarioFim:            bloqueioRaw.horarioFim || '23:59',
        fullDay:               bloqueioRaw.fullDay === true
    };
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
async function carregarDados(opcoes = {}) {
    const deveForcarRender = opcoes.forcarRender !== false;

    try {
        const timeoutAtual = _primeiraRequisicao ? 40000 : API_TIMEOUT_MS;
        console.log("🔄 Iniciando sincronização com o banco de dados online...");
        const [resAlunos, resAgendamentos, resConfig, resBloqueiosExt] = await Promise.all([
            fetchComTimeout(`${API_BASE_URL}/alunos`, {}, timeoutAtual).catch(() => { throw new Error("API Alunos fora do ar ou lenta (timeout)"); }),
            fetchComTimeout(`${API_BASE_URL}/agendamentos`, {}, timeoutAtual).catch(() => { throw new Error("API Agendamentos fora do ar ou lenta (timeout)"); }),
            fetchComTimeout(`${API_BASE_URL}/configuracao`, {}, timeoutAtual).catch(() => { throw new Error("API Configuração fora do ar ou lenta (timeout)"); }),
            // [TAG-STORAGE-BLOQUEIOS-EXT] Sempre resolve para array — qualquer falha (404, 500, rede) devolve []
            // para não quebrar carregarDados() enquanto a rota do backend ainda não está deployed.
            fetchComTimeout(`${API_BASE_URL}/bloqueios-externos`, {}, timeoutAtual)
                .then(res => res.ok ? res.json() : [])
                .catch(err => { console.warn('⚠️ /bloqueios-externos indisponível:', err.message); return []; })
        ]);

        if (!resAlunos.ok || !resAgendamentos.ok || !resConfig.ok) {
            throw new Error("Uma ou mais requisições falharam no servidor.");
        }

        const dadosAlunos = await resAlunos.json();
        const dadosAgendamentos = await resAgendamentos.json();
        const dadosConfig = await resConfig.json();
        const listaAlunosAPI = Array.isArray(dadosAlunos) ? dadosAlunos : [];
        const listaAulasAPI = Array.isArray(dadosAgendamentos) ? dadosAgendamentos : [];
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
                await salvarDados(true);
                
                if (typeof mostrarToast === 'function') {
                    mostrarToast("Seus dados locais foram migrados com sucesso para a nuvem!", "success");
                }
                if (deveForcarRender) {
                    forçarRenderizacaoInterface();
                }
                return;
            }
        }
        // [TAG-STORAGE-MERGE-EXTERNO] Mescla bloqueios externos persistidos no MongoDB com os agendamentos do app.
        // Esses eventos chegam com source: 'google_external' e são filtrados fora de salvarDados().
        // resBloqueiosExt é sempre um array (garante a chain .then/.catch acima).
        let aulasParaCarregar = listaAulasAPI;
        if (Array.isArray(resBloqueiosExt) && resBloqueiosExt.length > 0) {
            const bloqueiosMapeados = resBloqueiosExt
                .map(mapearBloqueioExterno)
                .filter(b => b !== null); // Remove bloqueios mal formados
            
            if (bloqueiosMapeados.length > 0) {
                aulasParaCarregar = listaAulasAPI.concat(bloqueiosMapeados);
                console.log("📅 " + bloqueiosMapeados.length + " bloqueio(s) externo(s) carregado(s) do MongoDB.");
            }
        }
        atualizarAlunos(listaAlunosAPI);
        atualizarAulas(aulasParaCarregar);
        console.log('🔍 Aulas carregadas no frontend (após merge com bloqueios externos):', obterAulas());

        if (dadosConfig) {
            atualizarLimitesGrade({
                inicio: dadosConfig.horaInicio || "06:00",
                fim: dadosConfig.horaFim || "22:00"
            });
        } else {
            atualizarLimitesGrade({ inicio: "06:00", fim: "22:00" });
        }
        const gradeCarregada = obterLimitesGrade();
        if (typeof agendaConfig !== 'undefined') {
            agendaConfig.horaInicio = parseInt(gradeCarregada.inicio.split(':')[0]);
            agendaConfig.horaFim = parseInt(gradeCarregada.fim.split(':')[0]);
        }
        window.faturamentoMeta = parseFloat(localStorage.getItem('faturamentoMeta')) || 0;

        _primeiraRequisicao = false;
        console.log("✅ Dados sincronizados do MongoDB com sucesso!", {
            alunos: obterAlunos().length,
            aulas: obterAulas().length,
            grade: obterLimitesGrade()
        });

        if (deveForcarRender) {
            forçarRenderizacaoInterface();
        }

    } catch (error) {
        console.error("❌ Falha na conexão com a API. Usando localStorage temporariamente.", error);
        carregarDadosDoLocalStorage();
        
        if (typeof mostrarToast === 'function') {
            mostrarToast("Trabalhando offline. Dados salvos no navegador.", "warning");
        }
        if (deveForcarRender) {
            forçarRenderizacaoInterface();
        }
    }
}
async function salvarDados(silencioso = false) {
    salvarNoLocalStorage();

    try {
        console.log("💾 Sincronizando alterações com o MongoDB Atlas...");

        const alunosData = obterAlunos();
        // [TAG-STORAGE-FILTER-EXTERNO] Eventos externos do Google Calendar vivem em `bloqueios_externos`;
        // nunca devem ser enviados para a coleção `agendamentos`.
        const aulasData = obterAulas().filter(a => a.source !== 'google_external');
        const gradeData = obterLimitesGrade();
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

function carregarDadosDoLocalStorage() {
    const backupAlunos = localStorage.getItem('personal_alunos');
    const backupAulas = localStorage.getItem('personal_aulas');
    const backupGrade = localStorage.getItem('personal_limitesGrade');
    
    atualizarAlunos(backupAlunos ? JSON.parse(backupAlunos) : []);
    atualizarAulas(backupAulas ? JSON.parse(backupAulas) : []);
    atualizarLimitesGrade(backupGrade ? JSON.parse(backupGrade) : { inicio: "06:00", fim: "22:00" });
    const gradeLocal = obterLimitesGrade();
    if (typeof agendaConfig !== 'undefined') {
        agendaConfig.horaInicio = parseInt(gradeLocal.inicio.split(':')[0]);
        agendaConfig.horaFim = parseInt(gradeLocal.fim.split(':')[0]);
    }
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
