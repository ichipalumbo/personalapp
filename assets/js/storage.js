// [TAG-STORAGE] storage.js
// Responsabilidade: Persistência de dados — sync com API REST (Vercel/MongoDB) e fallback localStorage
// Depende de: state.js (alunos, aulas, agendaConfig), utils-kpi.js (mostrarToast)
// Expõe: carregarDados, salvarDados, obterAlunos, obterAulas, obterLimitesGrade,
//         atualizarAlunos, atualizarAulas, atualizarLimitesGrade, window.faturamentoMeta
const API_BASE_URL = "https://personal-app-api.vercel.app/api";
const API_TIMEOUT_MS = 8000;
const SLEEP_MODE_THRESHOLD_MS = 3000;

// [TAG-STORAGE-VERCEL-PING] Warm-up para cold start do Vercel — fire-and-forget, sem await
fetch('https://personal-app-api.vercel.app/').catch(() => {});

// Flag para timeout estendido na primeira requisição (cold start do Vercel + conexão MongoDB)
let _primeiraRequisicao = true;
let _cacheInicializado = false;
let _cachePossuiDados = false;
let _syncBancoEmAndamento = false;

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

function _parseJSONSeguro(valor, fallback) {
    try {
        return valor ? JSON.parse(valor) : fallback;
    } catch (error) {
        return fallback;
    }
}

function _mostrarOverlaySleepMode() {
    const mensagem = 'Servidor em Sleep Mode. Acordando o banco de dados... (pode levar 15s)';
    if (typeof mostrarOverlaySleepMode === 'function') {
        mostrarOverlaySleepMode(mensagem);
        return;
    }
    if (typeof mostrarOverlaySinc === 'function') {
        mostrarOverlaySinc(mensagem);
    }
}

function _mostrarOverlayErroComRetry(onRetry) {
    const mensagem = 'Falha ao conectar. Banco de dados inativo.';
    if (typeof mostrarOverlayErroConexao === 'function') {
        mostrarOverlayErroConexao(mensagem, onRetry, function () {
            if (typeof mostrarToast === 'function') {
                mostrarToast('Tudo bem. Você pode sincronizar depois pelo botão "Sincronizar Dados".', 'warning');
            }
        });
        return;
    }
    if (typeof mostrarToast === 'function') {
        mostrarToast(mensagem, 'error');
    }
}

function _ocultarOverlayConexao() {
    if (typeof ocultarOverlayConexao === 'function') {
        ocultarOverlayConexao();
        return;
    }
    if (typeof ocultarOverlaySinc === 'function') {
        ocultarOverlaySinc();
    }
}

function _setEstadoBotaoSyncBanco(estado) {
    const btn = document.getElementById('btnSyncBanco');
    const label = document.getElementById('btnSyncBancoText');
    if (!btn || !label) return;

    if (estado === 'sincronizando') {
        btn.disabled = true;
        btn.style.opacity = '0.6';
        btn.style.cursor = 'not-allowed';
        label.textContent = 'Sincronizando...';
        return;
    }

    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
    label.textContent = 'Sincronizar Dados';
}

function _cacheTemDados(alunosLista, aulasLista) {
    return (Array.isArray(alunosLista) && alunosLista.length > 0)
        || (Array.isArray(aulasLista) && aulasLista.length > 0);
}

function temDadosLocaisNoCache() {
    const alunosCache = _parseJSONSeguro(localStorage.getItem('personal_alunos'), []);
    const aulasCache = _parseJSONSeguro(localStorage.getItem('personal_aulas'), []);
    return _cacheTemDados(alunosCache, aulasCache);
}

async function executarOperacaoRemotaComFeedback(executor, opcoes = {}) {
    const deveExibirFalha = opcoes.exibirFalha !== false;
    const onRetry = typeof opcoes.onRetry === 'function' ? opcoes.onRetry : null;

    let overlayFoiExibido = false;
    const sleepTimer = setTimeout(() => {
        overlayFoiExibido = true;
        _mostrarOverlaySleepMode();
    }, SLEEP_MODE_THRESHOLD_MS);

    try {
        const resultado = await executor();
        clearTimeout(sleepTimer);
        if (overlayFoiExibido) {
            _ocultarOverlayConexao();
        }
        return resultado;
    } catch (error) {
        clearTimeout(sleepTimer);
        if (deveExibirFalha) {
            _mostrarOverlayErroComRetry(onRetry);
        }
        throw error;
    }
}

async function apiFetchBackend(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
    const headers = new Headers(options.headers || {});
    const idToken = window.googleIdentity && typeof window.googleIdentity.getIdToken === 'function'
        ? window.googleIdentity.getIdToken()
        : null;

    if (!idToken) {
        const error = new Error('AUTH_REQUIRED');
        error.code = 'AUTH_REQUIRED';
        error.status = 401;
        throw error;
    }

    headers.set('Authorization', 'Bearer ' + idToken);

    return fetchComTimeout(url, { ...options, headers }, timeoutMs);
}

async function _carregarConfiguracaoGradeHorarios(timeoutMs) {
    const rotas = [
        `${API_BASE_URL}/configuracao/grade_horarios`,
        `${API_BASE_URL}/configuracao`
    ];

    for (const rota of rotas) {
        const res = await apiFetchBackend(rota, {}, timeoutMs);

        if (res.status === 401) {
            throw new Error('AUTH_REQUIRED');
        }

        if (res.status === 404) {
            continue;
        }

        if (!res.ok) {
            throw new Error('API Configuração retornou ' + res.status);
        }

        const dados = await res.json().catch(() => null);
        if (dados && typeof dados === 'object') {
            return dados;
        }
    }

    return null;
}

function usuarioAutenticadoNoApp() {
    if (!window.googleIdentity || typeof window.googleIdentity.isSignedIn !== 'function') {
        return false;
    }

    return window.googleIdentity.isSignedIn();
}

function notificarLoginObrigatorio(mensagem) {
    if (typeof mostrarToast === 'function') {
        mostrarToast(mensagem || 'Faça login com Google para sincronizar com a nuvem.', 'warning');
    }
}

function deveSilenciarAuthToast(opcoes) {
    return !!(opcoes && opcoes.silenciarAuthToast === true);
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

function normalizarObjetivoAlunoMigracao(valorObjetivo) {
    const objetivo = String(valorObjetivo || '').trim();
    return objetivo === 'Consultoria Online' ? 'Consultoria Online' : 'Personal Trainer';
}

function montarCorObjetivoTangerinaMigracao() {
    return { nome: 'Tangerina', hex: '#FF887C' };
}

function _respostaVirtual(status) {
    return {
        status,
        ok: status >= 200 && status < 300
    };
}

function _normalizarAlunoParaComparacao(aluno) {
    const copia = { ...(aluno || {}) };
    delete copia.ownerEmail;
    delete copia._id;
    delete copia.__v;
    return copia;
}

function _alunosSaoIguais(alunoA, alunoB) {
    try {
        return JSON.stringify(_normalizarAlunoParaComparacao(alunoA))
            === JSON.stringify(_normalizarAlunoParaComparacao(alunoB));
    } catch (_) {
        return false;
    }
}

function _normalizarAgendamentoParaComparacao(agendamento) {
    const copia = { ...(agendamento || {}) };
    delete copia.ownerEmail;
    delete copia._id;
    delete copia.__v;
    return copia;
}

function _agendamentosSaoIguais(agendamentoA, agendamentoB) {
    try {
        return JSON.stringify(_normalizarAgendamentoParaComparacao(agendamentoA))
            === JSON.stringify(_normalizarAgendamentoParaComparacao(agendamentoB));
    } catch (_) {
        return false;
    }
}

async function _sincronizarAlunosViaCRUD(alunosLocais, timeoutMs) {
    const respostaLista = await apiFetchBackend(`${API_BASE_URL}/alunos`, {}, timeoutMs);
    if (!respostaLista.ok) {
        return respostaLista;
    }

    const alunosRemotos = await respostaLista.json().catch(() => []);
    const listaRemota = Array.isArray(alunosRemotos) ? alunosRemotos : [];
    const listaLocal = Array.isArray(alunosLocais) ? alunosLocais : [];

    const remotoPorId = new Map(listaRemota.map((aluno) => [aluno.id, aluno]));
    const localPorId = new Map(listaLocal.map((aluno) => [aluno.id, aluno]));

    for (const aluno of listaLocal) {
        if (!aluno || !aluno.id) continue;

        const remoto = remotoPorId.get(aluno.id);
        if (!remoto) {
            const resCriar = await apiFetchBackend(`${API_BASE_URL}/alunos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(aluno)
            }, timeoutMs);

            if (!resCriar.ok) {
                return resCriar;
            }
            continue;
        }

        if (!_alunosSaoIguais(aluno, remoto)) {
            const resAtualizar = await apiFetchBackend(`${API_BASE_URL}/alunos/${encodeURIComponent(aluno.id)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(aluno)
            }, timeoutMs);

            if (!resAtualizar.ok) {
                return resAtualizar;
            }
        }
    }

    for (const alunoRemoto of listaRemota) {
        if (!alunoRemoto || !alunoRemoto.id) continue;
        if (localPorId.has(alunoRemoto.id)) continue;

        const resExcluir = await apiFetchBackend(`${API_BASE_URL}/alunos/${encodeURIComponent(alunoRemoto.id)}`, {
            method: 'DELETE'
        }, timeoutMs);

        if (!resExcluir.ok && resExcluir.status !== 404) {
            return resExcluir;
        }
    }

    return _respostaVirtual(200);
}

async function _salvarConfiguracaoViaCRUD(gradeData, timeoutMs) {
    return apiFetchBackend(`${API_BASE_URL}/configuracao/grade_horarios`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chave: 'grade_horarios',
            horaInicio: (gradeData && gradeData.inicio) || '06:00',
            horaFim: (gradeData && gradeData.fim) || '22:00'
        })
    }, timeoutMs);
}

async function _sincronizarAgendamentosViaCRUD(agendamentosLocais, timeoutMs) {
    const respostaLista = await apiFetchBackend(`${API_BASE_URL}/agendamentos`, {}, timeoutMs);
    if (!respostaLista.ok) {
        return respostaLista;
    }

    const agendamentosRemotos = await respostaLista.json().catch(() => []);
    const listaRemota = Array.isArray(agendamentosRemotos) ? agendamentosRemotos : [];
    const listaLocal = Array.isArray(agendamentosLocais) ? agendamentosLocais : [];

    const remotoPorId = new Map(listaRemota.map((agendamento) => [agendamento.id, agendamento]));
    const localPorId = new Map(listaLocal.map((agendamento) => [agendamento.id, agendamento]));

    for (const agendamento of listaLocal) {
        if (!agendamento || !agendamento.id) continue;

        const remoto = remotoPorId.get(agendamento.id);
        if (!remoto) {
            const resCriar = await apiFetchBackend(`${API_BASE_URL}/agendamentos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(agendamento)
            }, timeoutMs);

            if (!resCriar.ok) {
                return resCriar;
            }
            continue;
        }

        if (!_agendamentosSaoIguais(agendamento, remoto)) {
            const resAtualizar = await apiFetchBackend(`${API_BASE_URL}/agendamentos/${encodeURIComponent(agendamento.id)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(agendamento)
            }, timeoutMs);

            if (!resAtualizar.ok) {
                return resAtualizar;
            }
        }
    }

    for (const agendamentoRemoto of listaRemota) {
        if (!agendamentoRemoto || !agendamentoRemoto.id) continue;
        if (localPorId.has(agendamentoRemoto.id)) continue;

        const resExcluir = await apiFetchBackend(`${API_BASE_URL}/agendamentos/${encodeURIComponent(agendamentoRemoto.id)}`, {
            method: 'DELETE'
        }, timeoutMs);

        if (!resExcluir.ok && resExcluir.status !== 404) {
            return resExcluir;
        }
    }

    return _respostaVirtual(200);
}

async function carregarDados(opcoes = {}) {
    const deveForcarRender = opcoes.forcarRender !== false;
    const forcarRemoto = opcoes.forcarRemoto === true;

    if (!_cacheInicializado) {
        const resultadoLocal = carregarDadosDoLocalStorage();
        _cacheInicializado = true;
        _cachePossuiDados = resultadoLocal.temDados;

        if (_cachePossuiDados && !forcarRemoto) {
            console.log('⚡ Cache local carregado instantaneamente. Sem chamada inicial à API.');
            if (deveForcarRender) {
                forçarRenderizacaoInterface();
            }
            return { origem: 'local-cache' };
        }
    } else if (_cachePossuiDados && !forcarRemoto) {
        if (deveForcarRender) {
            forçarRenderizacaoInterface();
        }
        return { origem: 'local-cache' };
    }

    if (!usuarioAutenticadoNoApp()) {
        const resultadoLocal = carregarDadosDoLocalStorage();
        _cachePossuiDados = resultadoLocal.temDados;

        if (deveForcarRender) {
            forçarRenderizacaoInterface();
        }

        if ((forcarRemoto || !resultadoLocal.temDados) && !deveSilenciarAuthToast(opcoes)) {
            notificarLoginObrigatorio('Faça login com Google para carregar seus dados da nuvem.');
        }

        return { origem: 'local-sem-login' };
    }

    try {
        const timeoutAtual = _primeiraRequisicao ? 40000 : API_TIMEOUT_MS;
        console.log('🔄 Iniciando sincronização com o banco de dados online...');
        const onRetry = () => carregarDados({ ...opcoes, forcarRemoto: true });

        const [resAlunos, resAgendamentos, dadosConfig, resBloqueiosExt] = await executarOperacaoRemotaComFeedback(async () => {
            return Promise.all([
                apiFetchBackend(`${API_BASE_URL}/alunos`, {}, timeoutAtual).catch(() => { throw new Error('API Alunos fora do ar ou lenta (timeout)'); }),
                apiFetchBackend(`${API_BASE_URL}/agendamentos`, {}, timeoutAtual).catch(() => { throw new Error('API Agendamentos fora do ar ou lenta (timeout)'); }),
                _carregarConfiguracaoGradeHorarios(timeoutAtual)
                    .catch((err) => { throw new Error(err.message || 'API Configuração fora do ar ou lenta (timeout)'); }),
                // [TAG-STORAGE-BLOQUEIOS-EXT] Sempre resolve para array — qualquer falha (404, 500, rede) devolve []
                // para não quebrar carregarDados() enquanto a rota do backend ainda não está deployed.
                apiFetchBackend(`${API_BASE_URL}/bloqueios-externos`, {}, timeoutAtual)
                    .then(res => res.ok ? res.json() : [])
                    .catch(err => { console.warn('⚠️ /bloqueios-externos indisponível:', err.message); return []; })
            ]);
        }, { onRetry });

        if (resAlunos.status === 401 || resAgendamentos.status === 401) {
            throw new Error('AUTH_REQUIRED');
        }

        if (!resAlunos.ok || !resAgendamentos.ok) {
            throw new Error("Uma ou mais requisições falharam no servidor.");
        }

        const dadosAlunos = await resAlunos.json();
        const dadosAgendamentos = await resAgendamentos.json();
        const listaAlunosAPIOriginal = Array.isArray(dadosAlunos) ? dadosAlunos : [];
        const listaAlunosAPI = listaAlunosAPIOriginal.map((aluno) => {
            const objetivoNormalizado = normalizarObjetivoAlunoMigracao(aluno && aluno.objetivo);
            return {
                ...aluno,
                objetivo: objetivoNormalizado,
                corObjetivo: montarCorObjetivoTangerinaMigracao()
            };
        });
        const houveMigracaoPersistenteAlunos = listaAlunosAPI.some((alunoNormalizado, idx) => {
            const alunoOriginal = listaAlunosAPIOriginal[idx] || {};
            const corOriginal = alunoOriginal.corObjetivo || {};
            return (alunoOriginal.objetivo || '') !== alunoNormalizado.objetivo
                || corOriginal.nome !== alunoNormalizado.corObjetivo.nome
                || corOriginal.hex !== alunoNormalizado.corObjetivo.hex;
        });
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

        if (houveMigracaoPersistenteAlunos) {
            console.log('🔁 Migração de objetivos de alunos aplicada. Persistindo no banco remoto...');
            await salvarDados(true);
        }

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
        salvarNoLocalStorage();
        window.faturamentoMeta = parseFloat(localStorage.getItem('faturamentoMeta')) || 0;

        _primeiraRequisicao = false;
        _cachePossuiDados = _cacheTemDados(obterAlunos(), obterAulas());
        console.log("✅ Dados sincronizados do MongoDB com sucesso!", {
            alunos: obterAlunos().length,
            aulas: obterAulas().length,
            grade: obterLimitesGrade()
        });

        if (deveForcarRender) {
            forçarRenderizacaoInterface();
        }

    } catch (error) {
        if (error && error.message === 'AUTH_REQUIRED') {
            if (!deveSilenciarAuthToast(opcoes)) {
                notificarLoginObrigatorio('Sua sessão Google expirou. Entre novamente para sincronizar.');
            }

            const resultadoLocal = carregarDadosDoLocalStorage();
            _cachePossuiDados = resultadoLocal.temDados;

            if (deveForcarRender) {
                forçarRenderizacaoInterface();
            }

            return { origem: 'local-auth-expirado' };
        }
        console.error("❌ Falha na conexão com a API. Usando localStorage temporariamente.", error);
        const resultadoLocal = carregarDadosDoLocalStorage();
        _cachePossuiDados = resultadoLocal.temDados;
        
        if (typeof mostrarToast === 'function') {
            mostrarToast("Trabalhando offline. Dados salvos no navegador.", "warning");
        }
        if (deveForcarRender) {
            forçarRenderizacaoInterface();
        }
        return { origem: 'local-fallback' };
    }

    return { origem: 'remoto' };
}
async function salvarDados(silencioso = false) {
    salvarNoLocalStorage();

    if (!usuarioAutenticadoNoApp()) {
        if (!silencioso) {
            notificarLoginObrigatorio('Faça login com Google para salvar na nuvem.');
        }
        return;
    }

    try {
        console.log('💾 Sincronizando alterações com o MongoDB Atlas...');

        const alunosData = obterAlunos();
        // [TAG-STORAGE-FILTER-EXTERNO] Eventos externos do Google Calendar vivem em `bloqueios_externos`;
        // não entram no CRUD de `agendamentos`.
        const aulasData = obterAulas().filter(a => a.source !== 'google_external');
        const gradeData = obterLimitesGrade();
        const onRetry = () => salvarDados(silencioso);
        const timeoutAtual = _primeiraRequisicao ? 40000 : API_TIMEOUT_MS;

        const [resAlunos, resAgendamentos, resConfig] = await executarOperacaoRemotaComFeedback(async () => {
            return Promise.all([
                _sincronizarAlunosViaCRUD(alunosData, timeoutAtual),
                _sincronizarAgendamentosViaCRUD(aulasData, timeoutAtual),
                _salvarConfiguracaoViaCRUD(gradeData, timeoutAtual)
            ]);
        }, { onRetry, exibirFalha: true });

        if (resAlunos.status === 401 || resAgendamentos.status === 401 || resConfig.status === 401) {
            throw new Error('AUTH_REQUIRED');
        }

        if (!resAlunos.ok || !resAgendamentos.ok || !resConfig.ok) {
            throw new Error('Falha ao salvar dados no banco remoto.');
        }

        salvarNoLocalStorage();
        _cachePossuiDados = _cacheTemDados(obterAlunos(), obterAulas());
        console.log('☁️ Alterações sincronizadas com o banco remoto!');
        
        if (!silencioso && typeof mostrarToast === 'function') {
            mostrarToast('Alterações salvas na nuvem!', 'success');
        }

    } catch (error) {
        if (error && error.message === 'AUTH_REQUIRED') {
            if (!silencioso) {
                notificarLoginObrigatorio('Sua sessão Google expirou. Entre novamente para salvar na nuvem.');
            }
            return;
        }
        console.error('❌ Erro ao salvar dados na API:', error);
        if (!silencioso && typeof mostrarToast === 'function') {
            mostrarToast('Erro de conexão. Salvo temporariamente no aparelho.', 'error');
        }
    }
}

function carregarDadosDoLocalStorage() {
    const backupAlunos = _parseJSONSeguro(localStorage.getItem('personal_alunos'), []);
    const backupAulas = _parseJSONSeguro(localStorage.getItem('personal_aulas'), []);
    const backupGrade = _parseJSONSeguro(localStorage.getItem('personal_limitesGrade'), { inicio: '06:00', fim: '22:00' });

    atualizarAlunos(Array.isArray(backupAlunos) ? backupAlunos : []);
    atualizarAulas(Array.isArray(backupAulas) ? backupAulas : []);
    atualizarLimitesGrade(backupGrade || { inicio: '06:00', fim: '22:00' });
    const gradeLocal = obterLimitesGrade();
    if (typeof agendaConfig !== 'undefined') {
        agendaConfig.horaInicio = parseInt(gradeLocal.inicio.split(':')[0]);
        agendaConfig.horaFim = parseInt(gradeLocal.fim.split(':')[0]);
    }
    window.faturamentoMeta = parseFloat(localStorage.getItem('faturamentoMeta')) || 0;

    return {
        temDados: _cacheTemDados(backupAlunos, backupAulas)
    };
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

window.apiFetchBackend = apiFetchBackend;
window.executarOperacaoRemotaComFeedback = executarOperacaoRemotaComFeedback;
window.carregarDadosDoLocalStorage = carregarDadosDoLocalStorage;
window.temDadosLocaisNoCache = temDadosLocaisNoCache;

window.sincronizarBancoDados = async function (opcoes = {}) {
    if (_syncBancoEmAndamento) {
        return;
    }

    if (!usuarioAutenticadoNoApp()) {
        notificarLoginObrigatorio('Faça login com Google antes de sincronizar o banco.');
        return;
    }

    _syncBancoEmAndamento = true;
    _setEstadoBotaoSyncBanco('sincronizando');

    try {
        await carregarDados({ forcarRender: true, forcarRemoto: true });

        if (typeof mostrarToast === 'function') {
            mostrarToast('Dados sincronizados com sucesso no MongoDB!', 'success');
        }
    } catch (error) {
        console.error('[storage] Erro na sincronização manual do banco:', error);
    } finally {
        _syncBancoEmAndamento = false;
        _setEstadoBotaoSyncBanco('pronto');
    }
};
