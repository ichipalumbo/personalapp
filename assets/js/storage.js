// [TAG-STORAGE] storage.js
// Responsabilidade: Persistencia de dados — sync com API REST (Vercel/MongoDB) e fallback localStorage
// Depende de: config/api-config.js, state.js (alunos, aulas, agendaConfig), utils-kpi.js (mostrarToast)
// Expõe: carregarDados, salvarDados, obterAlunos, obterAulas, obterReposicoes,
//         obterLimitesGrade, atualizarAlunos, atualizarAulas, atualizarReposicoes,
//         atualizarLimitesGrade, window.faturamentoMeta
const APP_API_CONFIG = window.APP_API_CONFIG;
const CONTEXTO_DADOS = window.contextoDados;

if (!CONTEXTO_DADOS) {
    throw new Error('assets/js/app/contexto-dados.js precisa ser carregado antes de assets/js/storage.js.');
}

if (!APP_API_CONFIG || typeof APP_API_CONFIG.apiBaseUrl !== 'string' || typeof APP_API_CONFIG.apiRootUrl !== 'string') {
    throw new Error('assets/js/config/api-config.js precisa ser carregado antes de assets/js/storage.js.');
}

const API_BASE_URL = APP_API_CONFIG.apiBaseUrl;
const API_TIMEOUT_MS = 8000;
const SLEEP_MODE_THRESHOLD_MS = 3000;
const FINANCAS_CACHE_KEY = 'personal_financas_cache';
const REPOSICOES_CACHE_KEY = 'personal_reposicoes';
const GCAL_SYNC_PENDING_FIELDS = ['gcalSyncPendingAt', 'gcalSyncPendingTentativas'];

// [TAG-STORAGE-VERCEL-PING] Warm-up para cold start da Vercel; em ambiente local e inofensivo. Fire-and-forget, sem await.
fetch(APP_API_CONFIG.apiRootUrl).catch(() => {});

// Flag para timeout estendido na primeira requisição (cold start do Vercel + conexão MongoDB)
let _primeiraRequisicao = true;

// Aviso imediato de leitura: sem conteúdo = carregando; com dados = sincronizando.
// Cada voo remove somente seu aviso. HTML já sinaliza carga antes de identificar a conta.
const _syncsSobreCacheEmAndamento = new Set();
let _apresentacaoInicialPendente = document.getElementById('headerCacheState')?.dataset.cargaInicial === 'true';
function _marcarSyncSobreCache(contexto = CONTEXTO_DADOS.capturar(), opcoes = {}) {
    const voo = { contexto, interacao: CONTEXTO_DADOS.capturarInteracao(), tela: opcoes.tela,
        temDados: opcoes.temDados === undefined ? _cachePossuiDados : opcoes.temDados };
    if (CONTEXTO_DADOS.atual(contexto)) _syncsSobreCacheEmAndamento.add(voo);
    _atualizarRotuloCacheHeader();
    return voo;
}
function _atualizarRotuloCacheHeader() {
    const el = document.getElementById('headerCacheState');
    if (!el) return;
    const router = window.__appShell && window.__appShell.router;
    const ativos = Array.from(_syncsSobreCacheEmAndamento).filter((voo) => CONTEXTO_DADOS.atual(voo.contexto)
        && voo.interacao === CONTEXTO_DADOS.capturarInteracao() && CONTEXTO_DADOS.podeLer()
        && !CONTEXTO_DADOS.obterPendencia(voo.contexto)
        && (!voo.tela || !router || router.getCurrentViewId() === voo.tela));
    const cargaInicial = _apresentacaoInicialPendente && CONTEXTO_DADOS.podeLer()
        && !CONTEXTO_DADOS.obterPendencia();
    const financeiroEmTela = router && router.getCurrentViewId() === 'tela-financas'
        && typeof window.temConteudoFinancasExibido === 'function';
    const carregando = ativos.length
        ? (financeiroEmTela ? !window.temConteudoFinancasExibido() : ativos.some((voo) => !voo.temDados))
        : cargaInicial;
    el.textContent = carregando ? 'Carregando dados...' : 'Sincronizando dados...';
    el.hidden = !ativos.length && !cargaInicial;
}
function _limparSyncSobreCache(voo) {
    if (voo) _syncsSobreCacheEmAndamento.delete(voo);
    else _syncsSobreCacheEmAndamento.clear(); // Invalidação global da sessão.
    _atualizarRotuloCacheHeader();
}
function _finalizarApresentacaoInicial() {
    _apresentacaoInicialPendente = false;
    _atualizarRotuloCacheHeader();
}
CONTEXTO_DADOS.aoMudarInteracao(() => {
    if (!CONTEXTO_DADOS.podeLer() || CONTEXTO_DADOS.obterPendencia()) _apresentacaoInicialPendente = false;
    _atualizarRotuloCacheHeader();
});
let _cacheInicializado = false;
let _cachePossuiDados = false;
let _pedidoManualEmVoo = null;
// Escopo de voo da leitura remota do batch completo: existe entre o primeiro fetch
// e o fim do obterLeituraDados. O pedido manual aguarda (rótulo "Aguardando para
// atualizar...") em vez de abrir uma segunda leitura que descartaria a primeira.
const _leiturasRemotasEmVoo = new Set();
let _renderDebounceTimer = null;
let _sequenciaLeitura = 0;
const _leiturasPreparadas = new WeakMap();
const _observadoresLeitura = new Set();
let _ultimaAplicacaoLeitura = null;
let _ultimaFalhaCarregamento = null;
function _avisarLeiturasDados() {
    _observadoresLeitura.forEach((fn) => {
        try { fn(); } catch (erro) { window.log.error('[storage]', 'Falha no observador de leitura.', erro); }
    });
}
function _reservarLeituraDados(contexto) {
    const voo = { contexto };
    _leiturasRemotasEmVoo.add(voo);
    _avisarLeiturasDados();
    return voo;
}
function _liberarLeituraDados(voo) {
    _leiturasRemotasEmVoo.delete(voo);
    _avisarLeiturasDados();
    if (_pedidoLeituraManual) setTimeout(_processarLeituraManual, 0);
}

// Fronteira de coordenação; registrar/carregar este contrato não dispara rede.
window.leiturasDados = Object.freeze({
    emAndamento: (contexto) => Array.from(_leiturasRemotasEmVoo).some((voo) => CONTEXTO_DADOS.atual(voo.contexto) && voo.contexto.geracao === contexto.geracao),
    temPedidoManual: (contexto) => Boolean(_pedidoLeituraManual && CONTEXTO_DADOS.atual(_pedidoLeituraManual.contexto) && _pedidoLeituraManual.contexto.geracao === contexto.geracao),
    reservar: _reservarLeituraDados,
    liberar: _liberarLeituraDados,
    ultimaAplicacao: () => _ultimaAplicacaoLeitura,
    ultimaFalha: () => _ultimaFalhaCarregamento,
    aoMudar: (fn) => { _observadoresLeitura.add(fn); return () => _observadoresLeitura.delete(fn); },
    iniciarFeedback: _marcarSyncSobreCache,
    finalizarFeedback: _limparSyncSobreCache,
    finalizarApresentacaoInicial: _finalizarApresentacaoInicial,
    atualizarFeedback: _atualizarRotuloCacheHeader
});

CONTEXTO_DADOS.aoInvalidar(({ anterior }) => {
    if (anterior) _apresentacaoInicialPendente = false;
    _ultimaAplicacaoLeitura = null;
    _ultimaFalhaCarregamento = null;
    _sequenciaLeitura += 1;
    clearTimeout(_renderDebounceTimer);
    _cacheInicializado = false;
    _cachePossuiDados = false;
    _pedidoManualEmVoo = null;
    _setEstadoBotaoSyncBanco('pronto');
    _limparSyncSobreCache();
    atualizarAlunos([]);
    atualizarAulas([]);
    atualizarReposicoes([]);
    atualizarLimitesGrade({ inicio: '06:00', fim: '22:00' });
    window.faturamentoMeta = 0;
    if (typeof agendaConfig !== 'undefined') {
        agendaConfig.horaInicio = 6;
        agendaConfig.horaFim = 22;
    }
    window.__sincronizacaoInicialConcluida = false;
    window.__homeCarregando = false;
    window.filtroAlunoSemanalId = '';
    window.dataAlvoAcaoStr = null;
    window.horarioSelecionadoSlot = null;
    window.reagendamentoDirectCardId = null;
    if (typeof window.invalidarChaveRenderAgenda === 'function') window.invalidarChaveRenderAgenda();
    ['listaAlunos', 'agendaGridHomeHome', 'agendaGridHome', 'calendarioSemanalHomeGrid', 'containerCalendarioDia', 'totalAulasHoje', 'totalAlunosAtivos'].forEach((id) => {
        const elemento = document.getElementById(id);
        if (elemento) elemento.replaceChildren();
    });
    if (typeof window.preencherFiltrosAlunos === 'function') window.preencherFiltrosAlunos();
});

async function fetchComTimeout(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
    const controller = new AbortController();
    let excedeuTempo = false;
    const cancelar = () => controller.abort();
    const signalExterno = options.signal;
    if (signalExterno) {
        if (signalExterno.aborted) cancelar();
        else signalExterno.addEventListener('abort', cancelar, { once: true });
    }
    const timeoutId = setTimeout(() => { excedeuTempo = true; controller.abort(); }, timeoutMs);

    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } catch (error) {
        if (error && error.name === 'AbortError') {
            if (!excedeuTempo) throw error;
            const erroTempo = new Error(`Tempo limite de ${timeoutMs}ms excedido para ${url}`);
            erroTempo.code = 'TIMEOUT';
            throw erroTempo;
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
        if (signalExterno) signalExterno.removeEventListener('abort', cancelar);
    }
}

function _parseJSONSeguro(valor, fallback) {
    try {
        return valor ? JSON.parse(valor) : fallback;
    } catch (error) {
        return fallback;
    }
}

window.parseJSONSeguro = _parseJSONSeguro;

function obterCacheFinancas() {
    return CONTEXTO_DADOS.lerFinancas();
}

function salvarCacheFinancas(dados, contexto = CONTEXTO_DADOS.capturar()) {
    if (!dados) {
    if (!CONTEXTO_DADOS.atual(contexto)) return false;
        localStorage.removeItem(FINANCAS_CACHE_KEY);
        return;
    }

    return CONTEXTO_DADOS.salvarFinancas(dados, contexto);
}

function limparCacheFinancas() {
    if (CONTEXTO_DADOS.lerFinancas()) localStorage.removeItem(FINANCAS_CACHE_KEY);
}

window.obterCacheFinancas = obterCacheFinancas;
window.salvarCacheFinancas = salvarCacheFinancas;
window.limparCacheFinancas = limparCacheFinancas;

function _mostrarOverlaySleepMode() {
    const mensagem = 'Sincronizando... isso pode levar alguns segundos.';
    if (typeof mostrarOverlaySleepMode === 'function') {
        mostrarOverlaySleepMode(mensagem);
        return;
    }
    if (typeof mostrarOverlaySinc === 'function') {
        mostrarOverlaySinc(mensagem);
    }
}

function _mostrarOverlayErroComRetry(mensagem, onRetry) {
    const texto = mensagem || 'Falha na API. Tente "Sincronizar Dados" novamente em alguns segundos.';
    if (typeof mostrarOverlayErroConexao === 'function') {
        mostrarOverlayErroConexao(texto, { onRetry });
        return;
    }
    if (typeof mostrarToast === 'function') {
        mostrarToast(texto, 'error');
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
    return Boolean(CONTEXTO_DADOS.lerPrincipal());
}

async function executarOperacaoRemotaComFeedback(executor, opcoes = {}) {
    const contextoConta = CONTEXTO_DADOS.capturar();
    const deveExibirFalha = opcoes.exibirFalha !== false;
    const contexto = opcoes.contexto || 'carregando';
    const silenciosoUI = opcoes.silenciosoUI === true;

    if (silenciosoUI) {
        return executor();
    }

    const mensagens = {
        carregando: {
            lenta: 'Carregando...',
            erro: 'Não foi possível carregar seus dados agora.'
        },
        syncDados: {
            lenta: 'Salvando...',
            erro: 'Não foi possível salvar agora.'
        },
        syncCalendario: {
            lenta: 'Atualizando sua Google Agenda...',
            erro: 'Não foi possível atualizar a Google Agenda agora.'
        },
        // Etapa 6 (2026-09-30): a tela de finanças entrou no mecanismo de feedback unificado.
        // O wrapper não exibe erro aqui: a tela trata a falha sozinha
        // (fallback de cache + toast de aviso), por isso o chamador usa exibirFalha: false.
        carregandoFinancas: {
            lenta: 'Carregando finanças...',
            erro: 'Não foi possível carregar as finanças agora.'
        }
    };

    const mensagensContexto = mensagens[contexto] || mensagens.carregando;

    const usarIndicadorSilencioso = contexto === 'syncCalendario';
    let overlayFoiExibido = false;
    const sleepTimer = setTimeout(() => {
        if (!CONTEXTO_DADOS.atual(contextoConta)) return;
        overlayFoiExibido = true;
        if (usarIndicadorSilencioso) {
            if (typeof mostrarIndicadorSyncBackground === 'function') {
                mostrarIndicadorSyncBackground(mensagensContexto.lenta);
            }
            return;
        }
        if (typeof mostrarOverlaySinc === 'function') {
            mostrarOverlaySinc(mensagensContexto.lenta);
            return;
        }
        _mostrarOverlaySleepMode();
    }, SLEEP_MODE_THRESHOLD_MS);

    try {
        const resultado = await executor();
        clearTimeout(sleepTimer);
        if (overlayFoiExibido && CONTEXTO_DADOS.atual(contextoConta)) {
            if (usarIndicadorSilencioso) {
                if (typeof ocultarIndicadorSyncBackground === 'function') {
                    ocultarIndicadorSyncBackground();
                }
            } else {
                _ocultarOverlayConexao();
            }
        }
        return resultado;
    } catch (error) {
        clearTimeout(sleepTimer);
        if (overlayFoiExibido && usarIndicadorSilencioso && CONTEXTO_DADOS.atual(contextoConta)) {
            if (typeof ocultarIndicadorSyncBackground === 'function') {
                ocultarIndicadorSyncBackground();
            }
        }
        if (deveExibirFalha && CONTEXTO_DADOS.atual(contextoConta)) {
            _mostrarOverlayErroComRetry(mensagensContexto.erro, opcoes.onRetry);
        }
        if (CONTEXTO_DADOS.atual(contextoConta)) _setEstadoBotaoSyncBanco('pronto');
        throw error;
    }
}

async function apiFetchBackend(url, options = {}, timeoutMs = API_TIMEOUT_MS) {
    const operacao = options.operacao;
    if (operacao && !CONTEXTO_DADOS.operacaoAtual(operacao)) throw new Error('CONTEXTO_OBSOLETO');
    const contexto = options.contextoDados || (operacao && operacao.contexto) || CONTEXTO_DADOS.capturar();
    if (!CONTEXTO_DADOS.atual(contexto)) {
        const error = new Error('AUTH_REQUIRED');
        error.code = 'AUTH_REQUIRED';
        throw error;
    }
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

    const { contextoDados: _contexto, operacao: _operacao, statusEsperados = [], ...opcoesFetch } = options;
    const etapa = operacao && options.method && options.method !== 'GET' ? { url, method: options.method, confirmada: false } : null;
    if (etapa) CONTEXTO_DADOS.registrarEtapa(operacao, etapa);
    const prazo = Date.now() + timeoutMs;
    const tarefa = fetchComTimeout(url, { ...opcoesFetch, headers }, timeoutMs);
    let resposta;
    try {
        resposta = await (operacao ? CONTEXTO_DADOS.acompanharTarefa(operacao, tarefa) : tarefa);
    } catch (erro) {
        if (etapa) CONTEXTO_DADOS.marcarFalhaOperacao(operacao, erro);
        throw erro;
    }
    if (etapa) {
        etapa.confirmada = resposta.ok || statusEsperados.includes(resposta.status);
        etapa.status = resposta.status;
        if (!etapa.confirmada) CONTEXTO_DADOS.marcarFalhaOperacao(operacao, new Error(`HTTP ${resposta.status}`));
        else CONTEXTO_DADOS.atualizarOperacao(operacao);
    }
    if (!CONTEXTO_DADOS.atual(contexto)) throw new Error('CONTEXTO_OBSOLETO');
    return _limitarCorpoResposta(resposta, prazo, contexto, operacao);
}

function _limitarCorpoResposta(resposta, prazo, contexto, operacao) {
    for (const metodo of ['json', 'text']) {
        if (typeof resposta[metodo] !== 'function') continue;
        const ler = resposta[metodo].bind(resposta);
        resposta[metodo] = function () {
            let timer;
            const tarefa = Promise.race([
                Promise.resolve().then(ler),
                new Promise((_, reject) => {
                    timer = setTimeout(() => {
                        const erro = new Error('Tempo limite do corpo da resposta excedido.');
                        erro.code = 'TIMEOUT';
                        reject(erro);
                    }, Math.max(0, prazo - Date.now()));
                })
            ]).then((dados) => {
                if (!CONTEXTO_DADOS.atual(contexto) || (operacao && !CONTEXTO_DADOS.operacaoAtual(operacao))) throw new Error('CONTEXTO_OBSOLETO');
                return dados;
            }).finally(() => clearTimeout(timer));
            return operacao ? CONTEXTO_DADOS.acompanharTarefa(operacao, tarefa) : tarefa;
        };
    }
    if (typeof resposta.clone === 'function') {
        const clonar = resposta.clone.bind(resposta);
        resposta.clone = () => _limitarCorpoResposta(clonar(), prazo, contexto, operacao);
    }
    return resposta;
}

async function _lerRespostaDados(url, contexto, timeoutMs, signal) {
    // O prazo da tarefa inclui headers e corpo; fetchComTimeout sozinho termina nos headers.
    const controller = new AbortController();
    let timer;
    let cancelar;
    const interrupcao = new Promise((_, reject) => {
        cancelar = () => {
            controller.abort();
            const erro = new Error('Leitura cancelada');
            erro.name = 'AbortError';
            reject(erro);
        };
        if (signal) {
            if (signal.aborted) cancelar();
            else signal.addEventListener('abort', cancelar, { once: true });
        }
        timer = setTimeout(() => {
            controller.abort();
            const erro = new Error(`Tempo limite de ${timeoutMs}ms excedido para ${url}`);
            erro.code = 'TIMEOUT';
            reject(erro);
        }, timeoutMs);
    });
    try {
        const dados = (async () => {
            if (signal && signal.aborted) {
                const erro = new Error('Leitura cancelada');
                erro.name = 'AbortError';
                throw erro;
            }
            const resposta = await apiFetchBackend(url, { contextoDados: contexto, signal: controller.signal }, timeoutMs);
            if (resposta.status === 401) throw new Error('AUTH_REQUIRED');
            if (!resposta.ok) {
                const erro = new Error(`Leitura retornou HTTP ${resposta.status}`);
                erro.status = resposta.status;
                throw erro;
            }
            return resposta.json();
        })();
        return await Promise.race([interrupcao, dados]);
    } finally {
        clearTimeout(timer);
        if (signal) signal.removeEventListener('abort', cancelar);
    }
}

function _validarListaRemota(dados, nome, validarItem = () => true) {
    if (!Array.isArray(dados) || dados.some((item) => !item || typeof item !== 'object' || Array.isArray(item) || !validarItem(item))) {
        throw new Error(`Formato inválido: ${nome}`);
    }
    return dados;
}

async function _carregarConfiguracaoGradeHorarios(timeoutMs, contexto, signal) {
    const rotas = [
        `${API_BASE_URL}/configuracao/grade_horarios`,
        `${API_BASE_URL}/configuracao`
    ];

    for (const rota of rotas) {
        try {
            const dados = await _lerRespostaDados(rota, contexto, timeoutMs, signal);
            if (!dados || typeof dados !== 'object' || Array.isArray(dados)
                || typeof dados.horaInicio !== 'string' || typeof dados.horaFim !== 'string'
                || !/^([01]\d|2[0-3]):[0-5]\d$/.test(dados.horaInicio)
                || !/^([01]\d|2[0-3]):[0-5]\d$/.test(dados.horaFim)) {
                throw new Error('Formato inválido: configuração da grade');
            }
            return dados;
        } catch (erro) {
            if (erro.status !== 404) throw erro;
        }
    }

    throw new Error('Configuração da grade indisponível');
}

function usuarioAutenticadoNoApp() {
    return CONTEXTO_DADOS.atual(CONTEXTO_DADOS.capturar());
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
    CONTEXTO_DADOS.capturar();
    try {
        if (typeof alunos !== 'undefined') return alunos;
    } catch(e) {}
    return window.alunos || [];
}

function obterAulas() {
    CONTEXTO_DADOS.capturar();
    try {
        if (typeof aulas !== 'undefined') return aulas;
    } catch(e) {}
    return window.aulas || [];
}

function obterReposicoes() {
    CONTEXTO_DADOS.capturar();
    try {
        if (typeof aulasParaRepor !== 'undefined') return aulasParaRepor;
    } catch(e) {}
    return window.aulasParaRepor || [];
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
        window.log.warn('[storage]', 'Bloqueio externo sem googleCalendarEventId, ignorando', bloqueioRaw);
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

function mapearReposicaoParaUI(reposicaoRaw) {
    if (!reposicaoRaw || typeof reposicaoRaw !== 'object') {
        return null;
    }

    const id = reposicaoRaw.id || null;
    const dataOriginal = reposicaoRaw.dataOriginal || null;
    if (!id || !dataOriginal) {
        return null;
    }

    const dataCancelamento = typeof window.formatarDataPtBr === 'function'
        ? window.formatarDataPtBr(dataOriginal)
        : String(dataOriginal).split('-').reverse().join('/');

    return {
        id: id,
        alunoId: reposicaoRaw.alunoId,
        dataCancelamento: dataCancelamento,
        dataOriginal: String(dataOriginal),
        horarioOriginal: reposicaoRaw.horarioOriginal || null,
        alunoNome: reposicaoRaw.alunoNome || null,
        cobravel: reposicaoRaw.cobravel,
        status: reposicaoRaw.status || null,
        validoAte: reposicaoRaw.validoAte || null,
        agendamentoReposicaoId: reposicaoRaw.agendamentoReposicaoId || null
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

function atualizarReposicoes(novasReposicoes) {
    const lista = Array.isArray(novasReposicoes) ? novasReposicoes : [];
    try {
        if (typeof aulasParaRepor !== 'undefined' && Array.isArray(aulasParaRepor)) {
            aulasParaRepor.length = 0;
            aulasParaRepor.push(...lista);
            window.aulasParaRepor = aulasParaRepor;
            return;
        }
    } catch(e) {}
    window.aulasParaRepor = lista;
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

function normalizarValorAlunoComFallbackMigracao(valor, normalizadorGlobal, fallbackLocal, selfRef) {
    if (typeof normalizadorGlobal === 'function' && normalizadorGlobal !== selfRef) {
        return normalizadorGlobal(valor);
    }
    return fallbackLocal(valor);
}

function normalizarObjetivoAlunoMigracao(valorObjetivo) {
    return normalizarValorAlunoComFallbackMigracao(
        valorObjetivo,
        window.normalizarObjetivoAluno,
        (valor) => {
            const objetivo = String(valor || '').trim();
            return objetivo === 'Consultoria Online' ? 'Consultoria Online' : 'Personal Trainer';
        },
        normalizarObjetivoAlunoMigracao
    );
}

function montarCorObjetivoTangerinaMigracao() {
    return { nome: 'Tangerina', hex: '#FF887C' };
}

function _respostaVirtual(status, extras = {}) {
    return {
        status,
        ok: status >= 200 && status < 300,
        ...extras
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

function _ordenarChavesRecursivamente(valor) {
    if (Array.isArray(valor)) {
        return valor.map((item) => _ordenarChavesRecursivamente(item));
    }

    if (valor && typeof valor === 'object') {
        const chavesOrdenadas = Object.keys(valor).sort();
        const objetoOrdenado = {};

        for (const chave of chavesOrdenadas) {
            objetoOrdenado[chave] = _ordenarChavesRecursivamente(valor[chave]);
        }

        return objetoOrdenado;
    }

    return valor;
}

function _normalizarAgendamentoParaComparacao(agendamento) {
    const copia = { ...(agendamento || {}) };
    delete copia.ownerEmail;
    delete copia._id;
    delete copia.__v;
    return _ordenarChavesRecursivamente(copia);
}

function _removerCamposPendenciaGcalDoAgendamento(agendamento) {
    if (!agendamento || typeof agendamento !== 'object') {
        return agendamento;
    }

    for (const campo of GCAL_SYNC_PENDING_FIELDS) {
        delete agendamento[campo];
    }

    return agendamento;
}

function _removerCamposPendenciaGcalDaLista(agendamentos) {
    if (!Array.isArray(agendamentos)) {
        return [];
    }

    return agendamentos.map((agendamento) => _removerCamposPendenciaGcalDoAgendamento(agendamento));
}

function _agendamentosSaoIguais(agendamentoA, agendamentoB) {
    try {
        return JSON.stringify(_normalizarAgendamentoParaComparacao(agendamentoA))
            === JSON.stringify(_normalizarAgendamentoParaComparacao(agendamentoB));
    } catch (_) {
        return false;
    }
}

async function _lerPayloadCrudJson(resposta) {
    if (!resposta || typeof resposta.clone !== 'function') {
        return null;
    }

    try {
        return await resposta.clone().json();
    } catch (error) {
        return { _erroParseJson: error };
    }
}

function _extrairAgendamentoDoPayloadCrud(payload) {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    if (payload.agendamento && typeof payload.agendamento === 'object') {
        return payload.agendamento;
    }

    if (payload.id) {
        return payload;
    }

    return null;
}

function _mesclarGoogleCalendarEventIdNoAgendamentoLocal(agendamentoLocal, payload) {
    if (!agendamentoLocal || typeof agendamentoLocal !== 'object') {
        return;
    }

    const agendamentoResposta = _extrairAgendamentoDoPayloadCrud(payload);
    const googleCalendarEventId = agendamentoResposta && agendamentoResposta.googleCalendarEventId
        ? String(agendamentoResposta.googleCalendarEventId)
        : null;

    if (googleCalendarEventId) {
        agendamentoLocal.googleCalendarEventId = googleCalendarEventId;
    }
}

async function _sincronizarAlunosViaCRUD(alunosLocais, timeoutMs, contexto, operacao) {
    const requisitar = (url, opcoes = {}) => apiFetchBackend(url, { ...opcoes, contextoDados: contexto, operacao }, timeoutMs);
    const respostaLista = await requisitar(`${API_BASE_URL}/alunos`);
    if (!respostaLista.ok) {
        return respostaLista;
    }

    const alunosRemotos = await respostaLista.json();
    const listaRemota = _validarListaRemota(alunosRemotos, 'alunos');
    const listaLocal = Array.isArray(alunosLocais) ? alunosLocais : [];

    const remotoPorId = new Map(listaRemota.map((aluno) => [aluno.id, aluno]));
    const localPorId = new Map(listaLocal.map((aluno) => [aluno.id, aluno]));

    for (const aluno of listaLocal) {
        if (!aluno || !aluno.id) continue;

        const remoto = remotoPorId.get(aluno.id);
        if (!remoto) {
            const resCriar = await requisitar(`${API_BASE_URL}/alunos`, {
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
            const resAtualizar = await requisitar(`${API_BASE_URL}/alunos/${encodeURIComponent(aluno.id)}`, {
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

        const resExcluir = await requisitar(`${API_BASE_URL}/alunos/${encodeURIComponent(alunoRemoto.id)}`, {
            method: 'DELETE', statusEsperados: [404]
        }, timeoutMs);

        if (!resExcluir.ok && resExcluir.status !== 404) {
            return resExcluir;
        }
    }

    return _respostaVirtual(200);
}

async function _salvarConfiguracaoViaCRUD(gradeData, timeoutMs, contexto, operacao) {
    return apiFetchBackend(`${API_BASE_URL}/configuracao/grade_horarios`, {
        method: 'PUT',
        contextoDados: contexto,
        operacao,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chave: 'grade_horarios',
            horaInicio: (gradeData && gradeData.inicio) || '06:00',
            horaFim: (gradeData && gradeData.fim) || '22:00'
        })
    }, timeoutMs);
}

async function _sincronizarAgendamentosViaCRUD(agendamentosLocais, timeoutMs, contexto, tentativaId, operacao) {
    const requisitar = (url, opcoes = {}) => apiFetchBackend(url, { ...opcoes, contextoDados: contexto, operacao }, timeoutMs);
    const respostaLista = await requisitar(`${API_BASE_URL}/agendamentos`);
    if (!respostaLista.ok) {
        return respostaLista;
    }

    const agendamentosRemotos = await respostaLista.json();
    const listaRemota = _validarListaRemota(agendamentosRemotos, 'agendamentos');
    const listaLocal = _removerCamposPendenciaGcalDaLista(Array.isArray(agendamentosLocais) ? agendamentosLocais : []);

    const remotoPorId = new Map(listaRemota.map((agendamento) => [agendamento.id, agendamento]));
    const localPorId = new Map(listaLocal.map((agendamento) => [agendamento.id, agendamento]));
    let gcalSyncFailed = false;

    for (const agendamento of listaLocal) {
        if (!agendamento || !agendamento.id) continue;

        const remoto = remotoPorId.get(agendamento.id);
        if (!remoto) {
            const resCriar = await requisitar(`${API_BASE_URL}/agendamentos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(agendamento)
            }, timeoutMs);

            if (!resCriar.ok) {
                return resCriar;
            }

            const payloadCriar = await _lerPayloadCrudJson(resCriar);
            if (payloadCriar && payloadCriar._erroParseJson) {
                window.log.debug('[sync]', 'Falha de parse ao confirmar gcalSyncFailed em POST', {
                    id: agendamento.id,
                    status: resCriar.status,
                    message: payloadCriar._erroParseJson && payloadCriar._erroParseJson.message
                        ? payloadCriar._erroParseJson.message
                        : String(payloadCriar._erroParseJson)
                });
            } else if (payloadCriar) {
                _mesclarGoogleCalendarEventIdNoAgendamentoLocal(agendamento, payloadCriar);
                CONTEXTO_DADOS.atualizarVinculoPendente(tentativaId, contexto, agendamento.id, agendamento.googleCalendarEventId);
                if (payloadCriar.gcalSyncFailed === true) {
                    gcalSyncFailed = true;
                    window.log.warn('[sync]', 'Falha no Google Calendar ao criar agendamento', { id: agendamento.id, operacao: 'POST' });
                }
            }
            continue;
        }

        if (!_agendamentosSaoIguais(agendamento, remoto)) {
            const resAtualizar = await requisitar(`${API_BASE_URL}/agendamentos/${encodeURIComponent(agendamento.id)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(agendamento)
            }, timeoutMs);

            if (!resAtualizar.ok) {
                return resAtualizar;
            }

            const payloadAtualizar = await _lerPayloadCrudJson(resAtualizar);
            if (payloadAtualizar && payloadAtualizar._erroParseJson) {
                window.log.debug('[sync]', 'Falha de parse ao confirmar gcalSyncFailed em PUT', {
                    id: agendamento.id,
                    status: resAtualizar.status,
                    message: payloadAtualizar._erroParseJson && payloadAtualizar._erroParseJson.message
                        ? payloadAtualizar._erroParseJson.message
                        : String(payloadAtualizar._erroParseJson)
                });
            } else if (payloadAtualizar) {
                _mesclarGoogleCalendarEventIdNoAgendamentoLocal(agendamento, payloadAtualizar);
                CONTEXTO_DADOS.atualizarVinculoPendente(tentativaId, contexto, agendamento.id, agendamento.googleCalendarEventId);
                if (payloadAtualizar.gcalSyncFailed === true) {
                    gcalSyncFailed = true;
                    window.log.warn('[sync]', 'Falha no Google Calendar ao atualizar agendamento', { id: agendamento.id, operacao: 'PUT' });
                }
            }
        }
    }

    for (const agendamentoRemoto of listaRemota) {
        if (!agendamentoRemoto || !agendamentoRemoto.id) continue;
        if (localPorId.has(agendamentoRemoto.id)) continue;

        const resExcluir = await requisitar(`${API_BASE_URL}/agendamentos/${encodeURIComponent(agendamentoRemoto.id)}`, {
            method: 'DELETE', statusEsperados: [404]
        }, timeoutMs);

        if (!resExcluir.ok && resExcluir.status !== 404) {
            return resExcluir;
        }

        if (typeof resExcluir.clone === 'function' && resExcluir.ok) {
            try {
                const payload = await resExcluir.clone().json();
                if (payload && payload.gcalSyncFailed === true) {
                    gcalSyncFailed = true;
                    window.log.warn('[sync]', 'Falha no Google Calendar ao excluir agendamento', { id: agendamentoRemoto.id, operacao: 'DELETE' });
                }
            } catch (error) {
                window.log.debug('[sync]', 'Falha de parse ao confirmar gcalSyncFailed em DELETE', {
                    id: agendamentoRemoto.id,
                    status: resExcluir.status,
                    message: error && error.message ? error.message : String(error)
                });
            }
        }
    }

    return _respostaVirtual(200, { gcalSyncFailed });
}

// Obtenção independente: nenhuma projeção ou cache é alterado antes da aplicação.
async function obterLeituraDados(opcoes = {}) {
    const contexto = opcoes.contextoDados || (opcoes.operacao && opcoes.operacao.contexto) || CONTEXTO_DADOS.capturar();
    const sequencia = ++_sequenciaLeitura;
    const signal = opcoes.signal;
    const interacao = CONTEXTO_DADOS.capturarInteracao();
    const operacao = opcoes.operacao;
    if (!CONTEXTO_DADOS.atual(contexto)) return { ok: false, estado: 'adiado', motivo: 'sem-sessao' };
    if (!CONTEXTO_DADOS.podeLer(operacao) && !(opcoes.verificacao === true && CONTEXTO_DADOS.semOperacoes())) return { ok: false, estado: 'adiado', motivo: 'interacao-em-andamento' };
    const timeout = opcoes.timeoutMs || (_primeiraRequisicao ? 40000 : API_TIMEOUT_MS);
    const voo = _reservarLeituraDados(contexto);
    const tarefas = [
        _lerRespostaDados(`${API_BASE_URL}/alunos`, contexto, timeout, signal),
        _lerRespostaDados(`${API_BASE_URL}/agendamentos`, contexto, timeout, signal),
        _carregarConfiguracaoGradeHorarios(timeout, contexto, signal),
        _lerRespostaDados(`${API_BASE_URL}/bloqueios-externos`, contexto, timeout, signal),
        _lerRespostaDados(`${API_BASE_URL}/reposicoes`, contexto, timeout, signal)
    ];
    try {
        const [alunosRemotos, aulasRemotas, config, bloqueiosRemotos, reposicoesRemotas] = await Promise.all(tarefas);
        if (!CONTEXTO_DADOS.atual(contexto) || sequencia !== _sequenciaLeitura) {
            return { ok: false, estado: 'descartado', motivo: 'contexto-obsoleto' };
        }
        if (signal && signal.aborted) return { ok: false, estado: 'descartado', motivo: 'cancelado' };
        const temId = (item) => typeof item.id === 'string' && item.id.trim().length > 0;
        const listaAlunos = _validarListaRemota(alunosRemotos, 'alunos', (aluno) => temId(aluno) && typeof aluno.nome === 'string' && aluno.nome.trim().length > 0);
        const listaAulas = _validarListaRemota(aulasRemotas, 'agendamentos', temId);
        const listaBloqueios = _validarListaRemota(bloqueiosRemotos, 'bloqueios', (item) => {
            const id = item.googleCalendarEventId || item.id;
            return typeof id === 'string' && id.trim().length > 0;
        });
        const listaReposicoes = _validarListaRemota(reposicoesRemotas, 'reposições', (r) => temId(r) && ['pendente', 'agendada', 'realizada', 'expirada'].includes(r.status));
        // Só a cópia preparada recebe normalização; objetos das respostas não são mutados.
        const alunosPreparados = listaAlunos.map((aluno) => ({
            ...aluno,
            objetivo: normalizarObjetivoAlunoMigracao(aluno.objetivo),
            corObjetivo: montarCorObjetivoTangerinaMigracao()
        }));
        const bloqueios = listaBloqueios.map(mapearBloqueioExterno);
        if (bloqueios.some((item) => !item)) throw new Error('Formato inválido: bloqueio externo');
        const pendentes = listaReposicoes.filter((r) => r.status === 'pendente').map(mapearReposicaoParaUI);
        if (pendentes.some((item) => !item)) throw new Error('Formato inválido: reposição pendente');
        const snapshot = {
            alunos: alunosPreparados,
            aulas: _removerCamposPendenciaGcalDaLista(listaAulas.map((aula) => ({ ...aula })).concat(bloqueios)),
            reposicoes: pendentes,
            grade: { inicio: config.horaInicio, fim: config.horaFim },
            meta: _cacheInicializado ? (window.faturamentoMeta || 0) : ((CONTEXTO_DADOS.lerPrincipal(contexto) || {}).meta || 0)
        };
        const snapshotPreparado = JSON.parse(JSON.stringify(snapshot));
        const resultado = Object.freeze({ ok: true, estado: 'preparado', dados: JSON.parse(JSON.stringify(snapshotPreparado)) });
        _leiturasPreparadas.set(resultado, { contexto, sequencia, signal, interacao, operacao, snapshot: snapshotPreparado });
        return resultado;
    } catch (erro) {
        if (!CONTEXTO_DADOS.atual(contexto) || sequencia !== _sequenciaLeitura) {
            return { ok: false, estado: 'descartado', motivo: 'contexto-obsoleto' };
        }
        if ((signal && signal.aborted) || erro.name === 'AbortError') {
            return { ok: false, estado: 'descartado', motivo: 'cancelado' };
        }
        return { ok: false, estado: 'falha', motivo: erro.message === 'AUTH_REQUIRED' ? 'sessao-expirada' : 'falha-leitura', erro: erro.message };
    } finally {
        await Promise.allSettled(tarefas);
        _liberarLeituraDados(voo);
        // O pedido manual bloqueado por este voo precisa ser reavaliado quando ele
        // terminar; sem isso o clique ficaria em "Aguardando para atualizar..." sem
        // nenhum evento capaz de acordá-lo.
    }
}

function aplicarLeituraDados(leitura, recuperacao) {
    const preparada = _leiturasPreparadas.get(leitura);
    if (!preparada) return { ok: false, estado: 'descartado', motivo: 'leitura-invalida' };
    const { contexto, sequencia, signal, interacao, operacao, snapshot } = preparada;
    if (!CONTEXTO_DADOS.atual(contexto) || sequencia !== _sequenciaLeitura) {
        return { ok: false, estado: 'descartado', motivo: 'contexto-obsoleto' };
    }
    if (signal && signal.aborted) return { ok: false, estado: 'descartado', motivo: 'cancelado' };
    if (!CONTEXTO_DADOS.podeAplicarInteracao(interacao, operacao)) return { ok: false, estado: 'descartado', motivo: 'interacao-alterada' };
    const pendencia = CONTEXTO_DADOS.obterPendencia(contexto);
    const recuperacaoValida = recuperacao && pendencia && pendencia.tentativaId === recuperacao.tentativaId;
    if (pendencia && !recuperacaoValida && (!operacao || pendencia.tentativaId !== operacao.id || operacao.falha)) {
        return { ok: false, estado: 'adiado', motivo: 'pendencia-local' };
    }
    if (recuperacaoValida && !CONTEXTO_DADOS.salvarPrincipal(snapshot, contexto)) {
        return { ok: false, estado: 'falha', motivo: 'cache-indisponivel' };
    }
    _leiturasPreparadas.delete(leitura);
    if (recuperacaoValida) CONTEXTO_DADOS.invalidarLeiturasAnteriores();
    atualizarAlunos(snapshot.alunos);
    atualizarAulas(snapshot.aulas);
    atualizarReposicoes(snapshot.reposicoes);
    atualizarLimitesGrade(snapshot.grade);
    if (typeof agendaConfig !== 'undefined') {
        agendaConfig.horaInicio = parseInt(snapshot.grade.inicio.split(':')[0], 10);
        agendaConfig.horaFim = parseInt(snapshot.grade.fim.split(':')[0], 10);
    }
    window.faturamentoMeta = snapshot.meta;
    const cachePersistido = recuperacaoValida || CONTEXTO_DADOS.salvarPrincipal(snapshot, contexto);
    if (recuperacaoValida && !CONTEXTO_DADOS.abandonarPendencia(pendencia.tentativaId, contexto)) return { ok: false, estado: 'falha', motivo: 'pendencia-nao-removida' };
    _cacheInicializado = true;
    _cachePossuiDados = true; // Inclusive snapshot remoto válido vazio.
    _primeiraRequisicao = false;
    const resultado = { ok: true, estado: 'aplicado', origem: 'remoto', cachePersistido };
    _ultimaFalhaCarregamento = null;
    _ultimaAplicacaoLeitura = Object.freeze({ contexto, interacao, operacao: Boolean(operacao), recuperacao: Boolean(recuperacaoValida), resultado: Object.freeze({ ...resultado }) });
    _avisarLeiturasDados();
    return resultado;
}

window.obterLeituraDados = obterLeituraDados;
window.aplicarLeituraDados = aplicarLeituraDados;

async function carregarDados(opcoes = {}) {
    const contexto = CONTEXTO_DADOS.capturar();
    const interacaoCarregamento = CONTEXTO_DADOS.capturarInteracao();
    const deveForcarRender = opcoes.forcarRender !== false;
    const forcarRemoto = opcoes.forcarRemoto === true;
    const silenciosoUI = opcoes.silenciosoUI === true;

    hidratarCacheDados();
    if (CONTEXTO_DADOS.obterPendencia(contexto) && !opcoes.operacao) {
        return { ok: false, estado: 'adiado', motivo: 'pendencia-local', origem: 'local-pendente' };
    }

    if (_cachePossuiDados && !forcarRemoto && !opcoes.operacao) {
        if (typeof window.preencherFiltrosAlunos === 'function') {
            window.preencherFiltrosAlunos();
        }
        if (deveForcarRender) {
            forçarRenderizacaoInterface();
        }
        return { ok: true, estado: 'local', origem: 'local-cache' };
    }

    if (!usuarioAutenticadoNoApp()) {
        const resultadoLocal = carregarDadosDoLocalStorage();
        _cachePossuiDados = resultadoLocal.temDados;

        if (typeof window.preencherFiltrosAlunos === 'function') {
            window.preencherFiltrosAlunos();
        }

        if (deveForcarRender) {
            forçarRenderizacaoInterface();
        }

        if ((forcarRemoto || !resultadoLocal.temDados) && !deveSilenciarAuthToast(opcoes)) {
            notificarLoginObrigatorio('Faça login com Google para carregar seus dados da nuvem.');
        }

        return { ok: false, estado: 'adiado', motivo: 'sem-sessao', origem: 'local-sem-login' };
    }

    // A obtenção termina antes do consumidor aplicar: conservar reserva até o
    // recibo de aplicação para um observador não iniciar B2 nesse intervalo.
    const reservaCarregamento = _reservarLeituraDados(contexto);
    const feedbackLeitura = _marcarSyncSobreCache(contexto);
    try {
        // 5.8 (Parte B): se a chamada está sobre cache local, acende o rótulo
        // do header (o estado só existe nos syncs remotos pós-cache).
        window.log.info('[storage]', 'Iniciando sincronização com o banco de dados online...');
        const onRetry = () => carregarDados({ ...opcoes, forcarRemoto: true });

        const leitura = await executarOperacaoRemotaComFeedback(
            () => obterLeituraDados(opcoes),
            { contexto: 'carregando', onRetry, silenciosoUI }
        );
        const resultado = leitura.ok ? aplicarLeituraDados(leitura) : leitura;
        if (resultado.estado === 'descartado') return { ...resultado, origem: 'contexto-obsoleto' };
        if (resultado.estado === 'adiado') return { ...resultado, origem: 'local-pendente' };
        if (!resultado.ok) {
            if (resultado.motivo === 'sessao-expirada') throw new Error('AUTH_REQUIRED');
            throw new Error(resultado.erro || 'Falha ao carregar dados');
        }
        if (typeof window.preencherFiltrosAlunos === 'function') window.preencherFiltrosAlunos();
        if (deveForcarRender) forçarRenderizacaoInterface();
        return resultado;

    } catch (error) {
        if (!CONTEXTO_DADOS.atual(contexto)) return { ok: false, estado: 'descartado', motivo: 'contexto-obsoleto', origem: 'contexto-obsoleto' };
        if (error && error.message === 'AUTH_REQUIRED') {
            if (!deveSilenciarAuthToast(opcoes)) {
                notificarLoginObrigatorio('Sua sessão Google expirou. Entre novamente para sincronizar.');
            }

            const resultado = { ok: false, estado: 'falha', motivo: 'sessao-expirada', origem: 'local-auth-expirado' };
            _ultimaFalhaCarregamento = Object.freeze({ contexto, interacao: interacaoCarregamento, resultado });
            return resultado;
        }
        // 5.8 (Parte B): falha na chamada — apaga o rótulo agora; o toast de
        // "Sem conexão..." que vem a seguir assume a comunicação de falha.
        _limparSyncSobreCache(feedbackLeitura);
        window.log.error('[storage]', 'Falha na leitura. Estado anterior preservado.', error);
        
        if (!silenciosoUI && typeof mostrarToast === 'function') {
            mostrarToast('Não foi possível atualizar os dados agora.', 'warning');
        }
        if (deveForcarRender) {
            forçarRenderizacaoInterface();
        }
        const resultado = { ok: false, estado: 'falha', motivo: 'falha-leitura', origem: 'local-fallback' };
        _ultimaFalhaCarregamento = Object.freeze({ contexto, interacao: interacaoCarregamento, resultado });
        return resultado;
    } finally {
        // 5.8 (Parte B): fim do sync (sucesso ou qualquer outro erro não tratado
        // acima) — o rótulo do header é apagado aqui.
        _limparSyncSobreCache(feedbackLeitura);
        _liberarLeituraDados(reservaCarregamento);
    }

}
async function salvarDados(silencioso = false, opcoes = {}) {
    const propria = !opcoes.operacao;
    const operacao = opcoes.operacao || CONTEXTO_DADOS.iniciarOperacao({ tipo: 'dados', contexto: opcoes.contextoDados });
    const contexto = operacao ? operacao.contexto : CONTEXTO_DADOS.capturar();

    if (!usuarioAutenticadoNoApp()) {
        if (!silencioso) {
            notificarLoginObrigatorio('Faça login com Google para salvar na nuvem.');
        }
        return { ok: false, motivo: 'nao_autenticado' };
    }
    if (!operacao) {
        if (typeof window.abrirRecuperacaoDados === 'function') window.abrirRecuperacaoDados();
        return { ok: false, motivo: 'falha_remota' };
    }

    const snapshot = capturarSnapshotLocal();
    const tentativaId = operacao.id;
    if (!CONTEXTO_DADOS.atualizarOperacao(operacao)) {
        CONTEXTO_DADOS.marcarFalhaOperacao(operacao, new Error('Pendência não preservada'));
        if (propria) await CONTEXTO_DADOS.finalizarOperacao(operacao);
        return { ok: false, motivo: 'falha_remota' };
    }
    salvarNoLocalStorage(contexto);

    try {
        window.log.info('[storage]', 'Sincronizando alterações com o MongoDB Atlas...');

        const alunosData = snapshot.alunos;
        // [TAG-STORAGE-FILTER-EXTERNO] Eventos externos do Google Calendar vivem em `bloqueios_externos`;
        // não entram no CRUD de `agendamentos`.
        const aulasData = snapshot.aulas.filter(a => a.source !== 'google_external');
        const gradeData = snapshot.grade;
        const timeoutAtual = _primeiraRequisicao ? 40000 : API_TIMEOUT_MS;

        const [resAlunos, resAgendamentos, resConfig] = await executarOperacaoRemotaComFeedback(async () => {
            const resultados = await Promise.allSettled([
                _sincronizarAlunosViaCRUD(alunosData, timeoutAtual, contexto, operacao),
                _sincronizarAgendamentosViaCRUD(aulasData, timeoutAtual, contexto, tentativaId, operacao),
                _salvarConfiguracaoViaCRUD(gradeData, timeoutAtual, contexto, operacao)
            ]);
            const falhou = resultados.find((r) => r.status === 'rejected');
            if (falhou) throw falhou.reason;
            return resultados.map((r) => r.value);
        }, { contexto: 'syncDados', exibirFalha: false, silenciosoUI: silencioso });

        if (!CONTEXTO_DADOS.atual(contexto)) return { ok: false, motivo: 'sessao_expirada' };

        if (resAlunos.status === 401 || resAgendamentos.status === 401 || resConfig.status === 401) {
            throw new Error('AUTH_REQUIRED');
        }

        if (!resAlunos.ok || !resAgendamentos.ok || !resConfig.ok) {
            throw new Error('Falha ao salvar dados no banco remoto.');
        }

        let teveFalhaGcal = false;
        for (const resposta of [resAlunos, resAgendamentos, resConfig]) {
            if (!resposta || !resposta.ok) continue;
            if (resposta.gcalSyncFailed === true) {
                teveFalhaGcal = true;
                continue;
            }
            if (typeof resposta.clone !== 'function') continue;

            try {
                const payload = await resposta.clone().json();
                if (payload && payload.gcalSyncFailed === true) {
                    teveFalhaGcal = true;
                }
            } catch (error) {
                window.log.debug('[sync]', 'Resposta sem payload para validar gcalSyncFailed', {
                    status: resposta && resposta.status,
                    message: error && error.message ? error.message : String(error)
                });
            }
        }

        if (!CONTEXTO_DADOS.atual(contexto)) return { ok: false, motivo: 'sessao_expirada' };
        // ID Google confirmado pelo CRUD pertence ao snapshot enviado, não a outro contexto.
        snapshot.aulas = snapshot.aulas.map((aula) => aulasData.find((a) => a.id === aula.id) || aula);
        const aulasAtuais = obterAulas();
        aulasData.forEach((enviada) => {
            const local = aulasAtuais.find((aula) => aula.id === enviada.id);
            if (local && enviada.googleCalendarEventId) local.googleCalendarEventId = enviada.googleCalendarEventId;
        });
        // Só o scope raiz confirma a tentativa completa; um salvar interno não libera a proteção.
        _cachePossuiDados = _cacheTemDados(obterAlunos(), obterAulas());
        window.log.info('[storage]', 'Alterações sincronizadas com o banco remoto!');

        if (teveFalhaGcal) {
            window.log.warn('[storage]', 'Banco remoto gravou, mas a Google Agenda não foi atualizada.');
            if (!silencioso && typeof mostrarToast === 'function') {
                mostrarToast('Salvo, mas a Google Agenda não foi atualizada', 'warning');
            }
            return { ok: true, motivo: 'sucesso_com_falha_gcal' };
        }

        if (!silencioso && typeof mostrarToast === 'function') {
            mostrarToast('Alterações salvas na nuvem!', 'success');
        }
        return { ok: true, motivo: 'sucesso' };

    } catch (error) {
        CONTEXTO_DADOS.marcarFalhaOperacao(operacao, error);
        if (!CONTEXTO_DADOS.atual(contexto)) return { ok: false, motivo: 'sessao_expirada' };
        if (error && error.message === 'AUTH_REQUIRED') {
            if (!silencioso) {
                notificarLoginObrigatorio('Sua sessão Google expirou. Entre novamente para salvar na nuvem.');
            }
            return { ok: false, motivo: 'sessao_expirada' };
        }
        window.log.error('[storage]', 'Erro ao salvar dados na API:', error);
        if (!silencioso && typeof mostrarToast === 'function') {
            mostrarToast('Erro de conexão. Salvo temporariamente no aparelho.', 'error');
        }
        return { ok: false, motivo: 'falha_remota' };
    } finally {
        if (propria) await CONTEXTO_DADOS.finalizarOperacao(operacao);
    }
}

// D1: hidratação local antes de qualquer view. Não inicia leitura remota nem B2,
// e não reaplica disco sobre memória já hidratada/editada neste contexto.
function hidratarCacheDados() {
    CONTEXTO_DADOS.capturar(); // Invalidação de conta/sessão também reinicia as flags.
    if (!_cacheInicializado) {
        _cachePossuiDados = carregarDadosDoLocalStorage().temDados;
        _cacheInicializado = true;
    }
    return { temDados: _cachePossuiDados };
}

function carregarDadosDoLocalStorage() {
    const snapshot = CONTEXTO_DADOS.lerPrincipal();
    const backupAlunos = snapshot ? snapshot.alunos : [];
    const backupAulas = _removerCamposPendenciaGcalDaLista(snapshot ? snapshot.aulas : []);
    const backupReposicoes = snapshot ? snapshot.reposicoes : [];
    const backupGrade = snapshot ? snapshot.grade : { inicio: '06:00', fim: '22:00' };

    atualizarAlunos(Array.isArray(backupAlunos) ? backupAlunos : []);
    atualizarAulas(Array.isArray(backupAulas) ? backupAulas : []);
    atualizarReposicoes(Array.isArray(backupReposicoes) ? backupReposicoes : []);
    atualizarLimitesGrade(backupGrade || { inicio: '06:00', fim: '22:00' });
    const gradeLocal = obterLimitesGrade();
    if (typeof agendaConfig !== 'undefined') {
        agendaConfig.horaInicio = parseInt(gradeLocal.inicio.split(':')[0]);
        agendaConfig.horaFim = parseInt(gradeLocal.fim.split(':')[0]);
    }
    window.faturamentoMeta = snapshot ? snapshot.meta : 0;

    return {
        temDados: Boolean(snapshot)
    };
}

function capturarSnapshotLocal() {
    return JSON.parse(JSON.stringify({ alunos: obterAlunos(), aulas: obterAulas(), reposicoes: obterReposicoes(), grade: obterLimitesGrade(), meta: window.faturamentoMeta || 0 }));
}

function salvarNoLocalStorage(contexto = CONTEXTO_DADOS.capturar()) {
    return CONTEXTO_DADOS.salvarPrincipal(capturarSnapshotLocal(), contexto);
}

function forçarRenderizacaoInterface() {
    const contexto = CONTEXTO_DADOS.capturar();
    // Skip if the home view is already managing its own loading state.
    if (window.__homeCarregando === true) return;
    // Debounce: collapse multiple synchronous calls within the same tick into a single render.
    clearTimeout(_renderDebounceTimer);
    _renderDebounceTimer = setTimeout(function () {
        if (!CONTEXTO_DADOS.atual(contexto)) return;
        if (typeof renderizarTudo === 'function') {
            renderizarTudo();
        } else if (typeof atualizarInterface === 'function') {
            atualizarInterface();
        } else if (typeof renderizarAgenda === 'function') {
            renderizarAgenda();
        }
    }, 0);
}

async function atualizarViewAtualAposSync(contexto, opcoes = {}) {
    if (!CONTEXTO_DADOS.atual(contexto) || !CONTEXTO_DADOS.podeLer()) return false;
    const router = window.__appShell && window.__appShell.router;
    const tela = router && router.getCurrentViewId ? router.getCurrentViewId() : null;
    if (tela === 'tela-alunos' && opcoes.recuperacao && window.atualizarAlunosAposRecuperacao) return await window.atualizarAlunosAposRecuperacao({ contextoDados: contexto });
    if (tela === 'tela-alunos' && window.atualizarAlunosAposSync) return await window.atualizarAlunosAposSync({ contextoDados: contexto, reutilizarConcluidaBoot: opcoes.boot === true });
    else if (tela === 'tela-alunos' && window.atualizarAlunosAposRecuperacao) return await window.atualizarAlunosAposRecuperacao({ contextoDados: contexto });
    else if (tela === 'tela-alunos' && window.renderizarListaAlunos) window.renderizarListaAlunos();
    else if (tela === 'tela-financas') {
        if (opcoes.recuperacao && window.atualizarFinancasAposRecuperacao) return await window.atualizarFinancasAposRecuperacao({}, { contextoDados: contexto });
        if (window.atualizarFinancasAposSync) return await window.atualizarFinancasAposSync({ contextoDados: contexto, reutilizarConcluidaBoot: opcoes.boot === true });
    }
    else if (tela === 'tela-home') {
        if (window.__homeCarregando) return false;
        if (window.atualizarDashboardStats) window.atualizarDashboardStats();
        if (window.modoHomeAtivo === 'dia' && window.renderizarHomeDia) window.renderizarHomeDia();
        else if (window.renderizarHomeSemana) window.renderizarHomeSemana();
    }
    return true;
}

window.apiFetchBackend = apiFetchBackend;
window.executarOperacaoRemotaComFeedback = executarOperacaoRemotaComFeedback;
window.hidratarCacheDados = hidratarCacheDados;
window.atualizarViewAtualAposSync = atualizarViewAtualAposSync;
window.carregarDadosDoLocalStorage = carregarDadosDoLocalStorage;
window.temDadosLocaisNoCache = temDadosLocaisNoCache;

let _pedidoLeituraManual = null;
function _processarLeituraManual() {
    const pedido = _pedidoLeituraManual;
    if (!pedido) return;
    if (!CONTEXTO_DADOS.atual(pedido.contexto)) {
        _pedidoLeituraManual = null;
        pedido.resolver({ ok: false, estado: 'descartado', motivo: 'contexto-obsoleto' });
        _avisarLeiturasDados();
        return;
    }
    if (pedido.executando) return;
    if (!CONTEXTO_DADOS.semOperacoes()) return;
    if (CONTEXTO_DADOS.obterPendencia(pedido.contexto)) {
        _pedidoLeituraManual = null;
        _setEstadoBotaoSyncBanco('pronto');
        if (window.abrirRecuperacaoDados) window.abrirRecuperacaoDados();
        pedido.resolver({ ok: false, estado: 'adiado', motivo: 'pendencia-local' });
        _avisarLeiturasDados();
        return;
    }
    if (!CONTEXTO_DADOS.podeLer() || _pedidoManualEmVoo || Array.from(_leiturasRemotasEmVoo).some((voo) => CONTEXTO_DADOS.atual(voo.contexto))) return;
    pedido.executando = true;
    _pedidoManualEmVoo = pedido;
    _setEstadoBotaoSyncBanco('sincronizando');
    (async () => {
        let resultado;
        try {
            resultado = await carregarDados({ ...pedido.opcoes, forcarRender: false, forcarRemoto: true, silenciosoUI: true });
            if (!CONTEXTO_DADOS.atual(pedido.contexto)) return;
            if (resultado.estado === 'aplicado') {
                const complementos = await atualizarViewAtualAposSync(pedido.contexto, { recuperacao: true });
                if (complementos === false || (complementos && complementos.ok === false)) resultado = { ...resultado, complementoPendente: true };
                if (CONTEXTO_DADOS.atual(pedido.contexto) && typeof mostrarToast === 'function') {
                    mostrarToast(resultado.complementoPendente ? 'Dados principais atualizados, mas a leitura complementar falhou. Atualize apenas os dados.' : 'Dados atualizados.', resultado.complementoPendente ? 'warning' : 'success');
                }
            } else if (resultado.motivo === 'pendencia-local' && window.abrirRecuperacaoDados) {
                window.abrirRecuperacaoDados();
            } else if (resultado.estado === 'descartado' || resultado.estado === 'adiado') {
                // Interação nova ou leitura concorrente: adiar sem aplicar snapshot antigo e
                // tentar de novo quando a interação liberar. Conta trocada e sessão ausente
                // resolvem como estão (sem erro de rede e sem laço de retry).
                const motivoAdiavel = resultado.motivo === 'interacao-alterada'
                    || resultado.motivo === 'interacao-em-andamento'
                    || resultado.motivo === 'contexto-obsoleto';
                if (CONTEXTO_DADOS.atual(pedido.contexto) && motivoAdiavel) pedido.executando = false;
            } else if (typeof mostrarOverlayErroConexao === 'function') {
                mostrarOverlayErroConexao('Não foi possível atualizar os dados.', { onRetry: () => window.sincronizarBancoDados(pedido.opcoes) });
            }
        } catch (erro) {
            resultado = { ok: false, estado: 'falha', motivo: 'falha-leitura' };
        } finally {
            if (_pedidoManualEmVoo === pedido) _pedidoManualEmVoo = null;
            if (pedido.executando || !CONTEXTO_DADOS.atual(pedido.contexto)) {
                if (_pedidoLeituraManual === pedido) _pedidoLeituraManual = null;
                pedido.resolver(resultado || { ok: false, estado: 'descartado', motivo: 'contexto-obsoleto' });
            }
            if (CONTEXTO_DADOS.atual(pedido.contexto)) {
                if (!pedido.executando && _pedidoLeituraManual === pedido) {
                    const label = document.getElementById('btnSyncBancoText');
                    if (label) label.textContent = 'Aguardando para atualizar...';
                } else _setEstadoBotaoSyncBanco('pronto');
            }
            _avisarLeiturasDados();
            if (!pedido.executando && _pedidoLeituraManual === pedido && CONTEXTO_DADOS.podeLer()) Promise.resolve().then(_processarLeituraManual);
        }
    })();
}
CONTEXTO_DADOS.aoMudarInteracao(() => Promise.resolve().then(_processarLeituraManual));
CONTEXTO_DADOS.aoInvalidar(() => Promise.resolve().then(_processarLeituraManual));

window.sincronizarBancoDados = function (opcoes = {}) {
    const contexto = CONTEXTO_DADOS.capturar();
    if (!usuarioAutenticadoNoApp()) {
        notificarLoginObrigatorio('Faça login com Google antes de sincronizar o banco.');
        return Promise.resolve({ ok: false, estado: 'adiado', motivo: 'sem-sessao' });
    }
    if (_pedidoLeituraManual && !CONTEXTO_DADOS.atual(_pedidoLeituraManual.contexto)) {
        const antigo = _pedidoLeituraManual;
        _pedidoLeituraManual = null;
        antigo.resolver({ ok: false, estado: 'descartado', motivo: 'contexto-obsoleto' });
    }
    if (_pedidoLeituraManual) return _pedidoLeituraManual.promise;
    let resolver;
    const promise = new Promise((resolve) => { resolver = resolve; });
    _pedidoLeituraManual = { contexto, opcoes, promise, resolver, executando: false };
    _avisarLeiturasDados();
    const label = document.getElementById('btnSyncBancoText');
    if (label) label.textContent = 'Aguardando para atualizar...';
    _processarLeituraManual();
    return promise;
};
