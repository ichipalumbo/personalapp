// [TAG-GCAL] google-calendar.js
// Responsabilidade: Integração com Google Calendar (GIS token model, frontend-only)
// Depende de: storage.js (API_BASE_URL, salvarDados, salvarNoLocalStorage, atualizarAulas),
//             utils-kpi.js (mostrarOverlaySinc, ocultarOverlaySinc)
// Expõe:
//   window.gcal.{isSignedIn, requestSignIn, fetchWeekEvents, isAppManaged,
//                createEvent, updateEvent, deleteEvent}
//   window.sincronizarBloqueiosExternos(isoStart, isoEnd)
//   window.salvarEventoComGCal(agendamento, opcoes)
//   window._onGISLoad  ← chamado pelo onload do script da GIS CDN

(function (global) {
    'use strict';

    // ── Constantes ───────────────────────────────────────────────────────────────
    const CLIENT_ID   = (global.__appGoogleConfig && global.__appGoogleConfig.clientId)
        || '799456461369-r4g75ok414jf9gb104um8j0k0ucimu1g.apps.googleusercontent.com';
    const SCOPES      = 'https://www.googleapis.com/auth/calendar';
    const GCAL_BASE   = 'https://www.googleapis.com/calendar/v3';
    const APP_SOURCE  = 'personaltrainer'; // extendedProperties.private.appSource

    /**
     * Mapeamento completo dos colorIds da API Google Calendar Events v3.
     * Hex values: fonte oficial GET /calendar/v3/colors (campo "event").
     * Confirmados empiricamente com testes reais no app GCal (julho/2025):
     *   '3' = Uva ✅  |  '4' = Flamingo ✅  |  '6' = Tangerina ✅
     * A API Events NÃO aceita RGB livre — apenas estes 11 IDs predefinidos.
     * Referência: https://developers.google.com/workspace/calendar/api/v3/reference/colors
     *
     * | ID  | Nome (EN)  | Background (oficial) | Foreground | Nome PT-BR  |
     * |-----|------------|----------------------|------------|-------------|
     * | '1' | Lavender   | #a4bdfc              | #1d1d1d    | Lavanda     |
     * | '2' | Sage       | #7ae7bf              | #1d1d1d    | Sálvia      |
     * | '3' | Grape      | #dbadff              | #1d1d1d    | Uva         | ← ✅
     * | '4' | Flamingo   | #ff887c              | #1d1d1d    | Flamingo    | ← ✅
     * | '5' | Banana     | #fbd75b              | #1d1d1d    | Banana      |
     * | '6' | Tangerine  | #ffb878              | #1d1d1d    | Tangerina   | ← ✅
     * | '7' | Peacock    | #46d6db              | #1d1d1d    | Pavão       |
     * | '8' | Graphite   | #e1e1e1              | #1d1d1d    | Grafite     |
     * | '9' | Blueberry  | #5484ed              | #1d1d1d    | Mirtilo     |
     * |'10' | Basil      | #51b749              | #1d1d1d    | Manjericão  |
     * |'11' | Tomato     | #dc2127              | #1d1d1d    | Tomate      |
     *
     * Cores usadas neste app:
     *   tipo 'aula' normal  → TANGERINE '6' (#ffb878) — CSS: --objetivo-tangerina
     *   tipo 'aula' reposta → BANANA    '5' (#fbd75b) — CSS: badge/ícone reposição
     */
    const GCAL_COLOR_IDS = {
        LAVENDER:  '1',
        SAGE:      '2',
        GRAPE:     '3',
        FLAMINGO:  '4',
        BANANA:    '5',
        TANGERINE: '6',
        PEACOCK:   '7',
        GRAPHITE:  '8',
        BLUEBERRY: '9',
        BASIL:     '10',
        TOMATO:    '11'
    };

    // ── Estado privado ───────────────────────────────────────────────────────────
    let _tokenClient       = null;
    let _accessToken       = null;
    let _tokenExpiry       = 0;
    let _pendingResolvers  = []; // Promises aguardando token
    let _pendingSyncCallback = null; // Callback a executar após auth bem-sucedida (botão sync)
    // ── Constantes para cache do token ────────────────────────────────────────
    const TOKEN_CACHE_KEY = 'gcal_access_token';
    const EXPIRY_CACHE_KEY = 'gcal_token_expiry';

    function _backendFetchApp(url, options) {
        if (typeof window.apiFetchBackend === 'function') {
            return window.apiFetchBackend(url, options);
        }
        return fetch(url, options);
    }

    function _executarComFeedbackConexao(executor, onRetry, options) {
        if (typeof window.executarOperacaoRemotaComFeedback === 'function') {
            const opts = options && typeof options === 'object' ? options : {};
            const exibirFalha = opts.exibirFalha === true;
            return window.executarOperacaoRemotaComFeedback(executor, {
                onRetry,
                exibirFalha,
                contexto: opts.contexto || 'syncCalendario'
            });
        }
        return executor();
    }

    // ── Funções para gerenciar cache do token ────────────────────────────────

    function _loadTokenFromCache() {
        try {
            const cachedToken = sessionStorage.getItem(TOKEN_CACHE_KEY);
            const cachedExpiry = sessionStorage.getItem(EXPIRY_CACHE_KEY);
            if (cachedToken && cachedExpiry && Date.now() < parseInt(cachedExpiry, 10)) {
                _accessToken = cachedToken;
                _tokenExpiry = parseInt(cachedExpiry, 10);
                console.info('[gcal] Token carregado do cache de sessão. Expira em:', new Date(_tokenExpiry).toLocaleTimeString('pt-BR'));
                return true;
            }
        } catch (e) {
            console.warn('[gcal] Erro ao carregar token do cache:', e);
        }
        return false;
    }

    function _saveTokenToCache(token, expiry) {
        try {
            sessionStorage.setItem(TOKEN_CACHE_KEY, token);
            sessionStorage.setItem(EXPIRY_CACHE_KEY, String(expiry));
            console.info('[gcal] Token armazenado em cache de sessão. Expira em:', new Date(expiry).toLocaleTimeString('pt-BR'));
        } catch (e) {
            console.warn('[gcal] Erro ao armazenar token no cache:', e);
        }
    }

    function _clearTokenCache() {
        try {
            sessionStorage.removeItem(TOKEN_CACHE_KEY);
            sessionStorage.removeItem(EXPIRY_CACHE_KEY);
            console.info('[gcal] Token removido do cache de sessão.');
        } catch (e) {
            console.warn('[gcal] Erro ao limpar cache do token:', e);
        }
    }
    // ── GIS: inicialização ───────────────────────────────────────────────────────

    function _onTokenResponse(response) {
        if (response.error) {
            console.warn('[gcal] Resposta de erro ao obter token:', response.error);
            _pendingResolvers = [];
            _pendingSyncCallback = null;
            return;
        }
        _accessToken  = response.access_token;
        _tokenExpiry  = Date.now() + ((response.expires_in - 60) * 1000); // buffer de 1 min
        _saveTokenToCache(_accessToken, _tokenExpiry);
        console.info('[gcal] Token obtido. Expira em:', new Date(_tokenExpiry).toLocaleTimeString('pt-BR'));
        _pendingResolvers.forEach(r => r.resolve(_accessToken));
        _pendingResolvers = [];
        // Executa callback do botão de sync após autenticação bem-sucedida
        if (_pendingSyncCallback) {
            const cb = _pendingSyncCallback;
            _pendingSyncCallback = null;
            try { cb(); } catch (e) { console.warn('[gcal] Erro no callback pós-autenticação:', e); }
        }
    }

    function _onTokenError(err) {
        console.warn('[gcal] Erro no token client:', err);
        _pendingResolvers.forEach(r => r.reject(new Error('[gcal] Falha ao obter token: ' + (err.message || err.type))));
        _pendingResolvers = [];
    }

    function _initializeGISCalendar() {
        if (!global.google || !global.google.accounts) {
            console.warn('[gcal] GIS carregado mas google.accounts não encontrado.');
            return;
        }
        _tokenClient = global.google.accounts.oauth2.initTokenClient({
            client_id:      CLIENT_ID,
            scope:          SCOPES,
            callback:       _onTokenResponse,
            error_callback: _onTokenError
        });
        // Tenta carregar token do cache de sessão
        if (_loadTokenFromCache()) {
            console.info('[gcal] GIS inicializado com token em cache. Nenhuma autenticação necessária.');
        } else {
            console.info('[gcal] GIS inicializado. A sincronização será acionada automaticamente após login Google.');
        }
    }

    if (typeof global.__registerGISReadyHandler === 'function') {
        global.__registerGISReadyHandler(_initializeGISCalendar);
    } else {
        const _previousOnGISLoad = global._onGISLoad;
        global._onGISLoad = function () {
            if (typeof _previousOnGISLoad === 'function') {
                _previousOnGISLoad();
            }
            _initializeGISCalendar();
        };
    }

    // ── Obtenção de token ────────────────────────────────────────────────────────

    function _getAccessToken() {
        return new Promise((resolve, reject) => {
            // Token ainda válido
            if (_accessToken && Date.now() < _tokenExpiry) {
                resolve(_accessToken);
                return;
            }
            // Token ausente/expirado — a autenticação pode ser disparada por iniciarSyncGoogleCalendar().
            reject(new Error('[gcal] Token ausente ou expirado. Faça login Google para iniciar a sincronização automática.'));
        });
    }

    // ── Fetch autenticado ────────────────────────────────────────────────────────

    async function _calendarFetch(path, options) {
        const token = await _getAccessToken();
        const url = path.startsWith('http') ? path : `${GCAL_BASE}${path}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json',
                ...(options && options.headers ? options.headers : {})
            }
        });
        if (response.status === 204) return null; // DELETE retorna 204 No Content
        if (!response.ok) {
            if (response.status === 401) {
                _accessToken = null; // invalida para próxima chamada solicitar novo token
                _tokenExpiry  = 0;
                _clearTokenCache(); // limpa cache de sessão também
            }
            const corpo = await response.text().catch(() => '');
            throw new Error('[gcal] HTTP ' + response.status + ' em ' + url + ': ' + corpo);
        }
        return response.json();
    }

    // ── Conversão: agendamento → evento do GCal ──────────────────────────────────

    function _resolverDataISO(agendamento) {
        const d = agendamento.data || '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) {
            const [dia, mes, ano] = d.split('/');
            return `${ano}-${mes}-${dia}`;
        }
        return new Date().toISOString().slice(0, 10);
    }

    function _agendamentoParaGCalEvent(agendamento) {
        const dataISO = _resolverDataISO(agendamento);
        
        // [TAG-GCAL-FRESH-ALUNO-DATA] SEMPRE busca dados FRESCOS do aluno de window.alunos
        // Nunca confiar em dados embarcados no agendamento que podem estar obsoletos
        let nomeAluno = '';
        let objetivo = '';
        let localizacao = '';
        
        if (agendamento.alunoId && typeof window.alunos !== 'undefined' && Array.isArray(window.alunos)) {
            const aluno = window.alunos.find(function (a) { return a.id === agendamento.alunoId; });
            if (aluno) {
                // SEMPRE usa dados frescos do aluno, nunca os embarcados no agendamento
                nomeAluno = aluno.nome || '';
                objetivo = aluno.objetivo || aluno.objective || '';
                localizacao = aluno.local || '';
                
                console.log('[gcal-fresh] Dados frescos do aluno ' + agendamento.alunoId + ':', {
                    nome: nomeAluno,
                    objetivo: objetivo,
                    local: localizacao
                });
            }
        }
        
        // Fallback se aluno não encontrado: usa dados embarcados (para compatibilidade)
        if (!nomeAluno) nomeAluno = agendamento.alunoNome || '';
        if (!localizacao) localizacao = agendamento.local || '';

        // [TAG-GCAL-TITULO-DINAMICO] Monta título com formato [Objetivo] - [Nome do Aluno]
        // Se houver objetivo do aluno, usa ele como prefixo; senão usa o tipo da aula
        let titulo = 'Compromisso';

        // Debug: Log dos valores sendo usados
        console.log('[gcal] Valores para o título:', {
            objetivo: objetivo,
            nomeAluno: nomeAluno,
            alunoId: agendamento.alunoId,
            tipo: agendamento.tipo,
            descricao: agendamento.descricao,
            localizacao: localizacao
        });

        // Prioridade 1: Se tem objetivo do aluno, usa "[Objetivo] - [Nome do Aluno]"
        if (objetivo && nomeAluno) {
            titulo = objetivo + ' - ' + nomeAluno;
        } else if (objetivo) {
            titulo = objetivo;
        } else {
            // Prioridade 2: Fallback para tipo de compromisso se não houver objetivo
            const tipo = (agendamento.tipo || '').trim().toLowerCase();
            
            if (tipo === 'aula') {
                titulo = nomeAluno 
                    ? ('Aula - ' + nomeAluno)
                    : 'Aula';
            } else if (tipo === 'deslocamento') {
                titulo = nomeAluno 
                    ? ('Deslocamento - ' + nomeAluno)
                    : 'Deslocamento';
            } else if (tipo === 'bloqueio') {
                titulo = agendamento.descricao && agendamento.descricao.trim()
                    ? agendamento.descricao.trim()
                    : 'Bloqueio';
            } else if (tipo === 'reposicao') {
                titulo = nomeAluno
                    ? ('Reposição - ' + nomeAluno)
                    : 'Reposição';
            } else if (agendamento.descricao && agendamento.descricao.trim()) {
                // Fallback: usar descrição se disponível
                titulo = agendamento.descricao.trim();
            }
        }

        console.log('[gcal] Título final construído:', titulo);

        const evento = {
            summary: titulo,
            extendedProperties: {
                private: {
                    appSource: APP_SOURCE,
                    appId:     agendamento.id || ''
                }
            }
        };
        
        // [TAG-GCAL-LOCALIZACAO-EVENTO] Adiciona localização se disponível
        if (localizacao) {
            evento.location = localizacao;
        }

        // [TAG-GCAL-COR-TIPO] colorId de evento — ver tabela GCAL_COLOR_IDS acima.
        const tipoNorm = (agendamento.tipo || '').trim().toLowerCase();
        if (tipoNorm === 'aula') {
            evento.colorId = (agendamento.reagendada || agendamento.isReposicao)
                ? GCAL_COLOR_IDS.BANANA     // '5' #fbd75b — reposição
                : GCAL_COLOR_IDS.TANGERINE; // '6' #ffb878 — aula normal
        }

        if (agendamento.fullDay) {
            evento.start = { date: dataISO };
            evento.end   = { date: dataISO };
        } else {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            evento.start = { dateTime: dataISO + 'T' + (agendamento.horarioInicio || '00:00') + ':00', timeZone: tz };
            evento.end   = { dateTime: dataISO + 'T' + (agendamento.horarioFim    || '01:00') + ':00', timeZone: tz };
        }

        return evento;
    }

    // ── Conversão: evento do GCal → bloqueio externo interno ────────────────────

    function _gcalEventParaBloqueio(event) {
        const fullDay = !!(event.start && event.start.date);
        let data          = '';
        let horarioInicio = '00:00';
        let horarioFim    = '23:59';

        if (fullDay) {
            data = event.start.date;
        } else {
            const inicio = new Date(event.start.dateTime);
            const fim    = new Date(event.end.dateTime);
            data          = inicio.toISOString().slice(0, 10);
            horarioInicio = _pad(inicio.getHours()) + ':' + _pad(inicio.getMinutes());
            horarioFim    = _pad(fim.getHours())    + ':' + _pad(fim.getMinutes());
        }

        return {
            googleCalendarEventId: event.id,
            titulo:        event.summary || 'Evento externo',
            data,
            horarioInicio,
            horarioFim,
            fullDay,
            source: 'google_external'
        };
    }

    function _pad(n) { return String(n).padStart(2, '0'); }

    function _normalizarBloqueioParaComparacao(bloqueio) {
        const copia = { ...(bloqueio || {}) };
        delete copia.ownerEmail;
        delete copia._id;
        delete copia.__v;
        delete copia.semanaISO;
        return copia;
    }

    function _bloqueiosExternosSaoIguais(bloqueioA, bloqueioB) {
        try {
            return JSON.stringify(_normalizarBloqueioParaComparacao(bloqueioA))
                === JSON.stringify(_normalizarBloqueioParaComparacao(bloqueioB));
        } catch (_) {
            return false;
        }
    }

    async function _sincronizarBloqueiosExternosViaCRUD(payload, timeMin, timeMax, signal) {
        const query = new URLSearchParams({
            timeMin,
            timeMax
        });

        const respostaLista = await _backendFetchApp(
            API_BASE_URL + '/bloqueios-externos?' + query.toString(),
            { signal }
        );

        if (!respostaLista.ok) {
            throw new Error('[gcal] Backend retornou ' + respostaLista.status + ' ao listar bloqueios externos.');
        }

        const bloqueiosRemotos = await respostaLista.json().catch(() => []);
        const listaRemota = Array.isArray(bloqueiosRemotos) ? bloqueiosRemotos : [];
        const listaLocal = Array.isArray(payload) ? payload : [];

        const remotoPorId = new Map(
            listaRemota
                .filter((bloqueio) => bloqueio && bloqueio.googleCalendarEventId)
                .map((bloqueio) => [bloqueio.googleCalendarEventId, bloqueio])
        );
        const localPorId = new Map(
            listaLocal
                .filter((bloqueio) => bloqueio && bloqueio.googleCalendarEventId)
                .map((bloqueio) => [bloqueio.googleCalendarEventId, bloqueio])
        );

        let criados = 0;
        let atualizados = 0;
        let excluidos = 0;

        for (const bloqueioLocal of listaLocal) {
            if (!bloqueioLocal || !bloqueioLocal.googleCalendarEventId) continue;

            const remoto = remotoPorId.get(bloqueioLocal.googleCalendarEventId);
            if (!remoto) {
                const resCriarOuAtualizar = await _backendFetchApp(
                    API_BASE_URL + '/bloqueios-externos/' + encodeURIComponent(bloqueioLocal.googleCalendarEventId),
                    {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...bloqueioLocal,
                            googleCalendarEventId: bloqueioLocal.googleCalendarEventId
                        }),
                        signal
                    }
                );

                if (!resCriarOuAtualizar.ok) {
                    const detalhe = await resCriarOuAtualizar.text().catch(() => '');
                    throw new Error('[gcal] Backend retornou ' + resCriarOuAtualizar.status + ' ao criar/atualizar bloqueio externo. ' + detalhe);
                }

                criados += 1;
                continue;
            }

            if (!_bloqueiosExternosSaoIguais(bloqueioLocal, remoto)) {
                const resAtualizar = await _backendFetchApp(
                    API_BASE_URL + '/bloqueios-externos/' + encodeURIComponent(bloqueioLocal.googleCalendarEventId),
                    {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...bloqueioLocal,
                            googleCalendarEventId: bloqueioLocal.googleCalendarEventId
                        }),
                        signal
                    }
                );

                if (!resAtualizar.ok) {
                    const detalhe = await resAtualizar.text().catch(() => '');
                    throw new Error('[gcal] Backend retornou ' + resAtualizar.status + ' ao atualizar bloqueio externo. ' + detalhe);
                }

                atualizados += 1;
            }
        }

        for (const bloqueioRemoto of listaRemota) {
            if (!bloqueioRemoto || !bloqueioRemoto.googleCalendarEventId) continue;
            if (localPorId.has(bloqueioRemoto.googleCalendarEventId)) continue;

            const resExcluir = await _backendFetchApp(
                API_BASE_URL + '/bloqueios-externos/' + encodeURIComponent(bloqueioRemoto.googleCalendarEventId),
                {
                    method: 'DELETE',
                    signal
                }
            );

            if (!resExcluir.ok && resExcluir.status !== 404) {
                throw new Error('[gcal] Backend retornou ' + resExcluir.status + ' ao excluir bloqueio externo.');
            }

            excluidos += 1;
        }

        return { criados, atualizados, excluidos };
    }

    // ── ISO Week identifier ──────────────────────────────────────────────────────
    // Converte uma data (segunda-feira) para "YYYY-Www" segundo ISO 8601

    function _getSemanaISO(isoDateStr) {
        const d = new Date(isoDateStr + 'T00:00:00');
        // Avança para a quinta-feira da semana (padrão ISO para determinar o ano da semana)
        const quinta = new Date(d);
        quinta.setDate(d.getDate() + (4 - (d.getDay() || 7)));
        const ano       = quinta.getFullYear();
        const inicioAno = new Date(ano, 0, 1);
        const semana    = Math.ceil(((quinta - inicioAno) / 86400000 + 1) / 7);
        return ano + '-W' + String(semana).padStart(2, '0');
    }

    // ── API pública: window.gcal ─────────────────────────────────────────────────

    global.gcal = {

        /** Retorna true se há um access token válido em memória */
        isSignedIn() {
            return !!_accessToken && Date.now() < _tokenExpiry;
        },

        /** Solicita autorização de calendário, reaproveitando a sessão Google já ativa */
        requestSignIn(afterAuthCallback, options) {
            if (!_tokenClient) {
                console.warn('[gcal] requestSignIn: GIS ainda não inicializado. Aguarde o carregamento da página.');
                return;
            }
            if (typeof afterAuthCallback === 'function') {
                _pendingSyncCallback = afterAuthCallback;
            }

            const opts = options && typeof options === 'object' ? options : {};
            const auto = opts.auto === true;
            const perfil = window.googleIdentity && typeof window.googleIdentity.getProfile === 'function'
                ? window.googleIdentity.getProfile()
                : null;
            const loginHint = perfil && perfil.email ? String(perfil.email) : null;

            if (auto) {
                // 1) Tenta silencioso (sem popup) quando já existe consentimento prévio
                // 2) Se falhar, solicita consentimento com dica de conta para evitar reescolha
                _tokenClient.callback = function (response) {
                    if (response && response.error === 'consent_required') {
                        _tokenClient.callback = _onTokenResponse;
                        _tokenClient.requestAccessToken({
                            prompt: 'consent',
                            ...(loginHint ? { hint: loginHint } : {})
                        });
                        return;
                    }

                    _tokenClient.callback = _onTokenResponse;
                    _onTokenResponse(response);
                };

                _tokenClient.requestAccessToken({
                    prompt: '',
                    ...(loginHint ? { hint: loginHint } : {})
                });
                return;
            }

            _tokenClient.requestAccessToken({
                prompt: 'consent',
                ...(loginHint ? { hint: loginHint } : {})
            });
        },

        /**
         * Busca eventos do calendário primário em um intervalo de datas.
         * @param {string} timeMin - data de início (YYYY-MM-DD)
         * @param {string} timeMax - data de fim    (YYYY-MM-DD)
         * @returns {Array} Lista de eventos do GCal
         */
        async fetchWeekEvents(timeMin, timeMax) {
            const params = new URLSearchParams({
                singleEvents: 'true',
                orderBy:      'startTime',
                timeMin:      timeMin + 'T00:00:00Z',
                timeMax:      timeMax + 'T23:59:59Z',
                maxResults:   '250'
            });
            const data = await _calendarFetch('/calendars/primary/events?' + params.toString());
            return (data && data.items) ? data.items : [];
        },

        /**
         * Retorna true se o evento foi criado pelo próprio app (não é externo).
         * Usa extendedProperties.private.appSource para identificação.
         */
        isAppManaged(event) {
            return event &&
                   event.extendedProperties &&
                   event.extendedProperties.private &&
                   event.extendedProperties.private.appSource === APP_SOURCE;
        },

        /**
         * Cria um evento no calendário primário a partir de um agendamento do app.
         * @returns {string} ID do evento criado no GCal
         */
        async createEvent(agendamento) {
            const body   = _agendamentoParaGCalEvent(agendamento);
            const criado = await _calendarFetch('/calendars/primary/events', {
                method: 'POST',
                body:   JSON.stringify(body)
            });
            return criado.id;
        },

        /**
         * Atualiza um evento existente no GCal.
         * @param {string} gcalId     - ID do evento no GCal
         * @param {Object} agendamento
         * @returns {string} ID confirmado
         */
        async updateEvent(gcalId, agendamento) {
            const body       = _agendamentoParaGCalEvent(agendamento);
            const atualizado = await _calendarFetch(
                '/calendars/primary/events/' + encodeURIComponent(gcalId),
                { method: 'PUT', body: JSON.stringify(body) }
            );
            return atualizado.id;
        },

        /**
         * Remove um evento do GCal pelo ID.
         * @param {string} gcalId
         */
        async deleteEvent(gcalId) {
            await _calendarFetch(
                '/calendars/primary/events/' + encodeURIComponent(gcalId),
                { method: 'DELETE' }
            );
        }
    };

    // ── Sincronização de bloqueios externos ──────────────────────────────────────
    // Busca eventos externos no GCal, persiste no backend e injeta em window.aulas.

    let _sincAbortController = null;
    let _sincDebounceTimer   = null;
    let _sincPendingResolve  = null;

    global.sincronizarBloqueiosExternos = function (timeMin, timeMax) {
        if (!global.gcal.isSignedIn()) {
            console.info('[gcal] sincronizarBloqueiosExternos: não autenticado, ignorando.');
            return Promise.resolve({ skipped: true });
        }

        // Cancela sincronização anterior se ainda pendente (debounce 300ms)
        clearTimeout(_sincDebounceTimer);
        if (_sincAbortController) _sincAbortController.abort();
        if (typeof _sincPendingResolve === 'function') {
            _sincPendingResolve({ canceled: true });
            _sincPendingResolve = null;
        }

        return new Promise(function (resolve, reject) {
            _sincPendingResolve = resolve;

            _sincDebounceTimer = setTimeout(async function () {
                _sincAbortController = new AbortController();
                const signal = _sincAbortController.signal;

                try {
                // 1. Busca todos os eventos no range do GCal
                const todosEventos = await global.gcal.fetchWeekEvents(timeMin, timeMax);
                if (signal.aborted) {
                    resolve({ aborted: true });
                    return;
                }

                // 2. Filtra apenas os externos (não criados pelo app)
                const externos = todosEventos.filter(e => !global.gcal.isAppManaged(e));

                // 3. Mapeia para o formato do backend
                const payload   = externos.map(_gcalEventParaBloqueio);

                // 4. Persiste no backend usando CRUD puro (POST/PUT/DELETE) com diff por googleCalendarEventId
                const resultadoSync = await _executarComFeedbackConexao(async function () {
                    return _sincronizarBloqueiosExternosViaCRUD(payload, timeMin, timeMax, signal);
                }, function () {
                    return global.sincronizarBloqueiosExternos(timeMin, timeMax);
                }, { exibirFalha: false, contexto: 'syncCalendario' });
                if (signal.aborted) {
                    resolve({ aborted: true });
                    return;
                }
                console.info('[gcal] Bloqueios externos persistidos via CRUD.', resultadoSync);

                // 5. Mescla no window.aulas para que a detecção de conflitos funcione
                // [TAG-GCAL-MAPEADOR-EXTERNO] Usa mapeamento idêntico a storage.js para consistência
                const bloqueiosParaMerge = payload.map(function (b) {
                    return {
                        id:                   'gcal_ext_' + b.googleCalendarEventId,
                        tipo:                 'bloqueio',
                        source:               'google_external',
                        readonly:             true,
                        descricao:            b.titulo || 'Evento externo',
                        googleCalendarEventId: b.googleCalendarEventId,
                        data:                 b.data || '',
                        horarioInicio:        b.horarioInicio || '00:00',
                        horarioFim:           b.horarioFim || '23:59',
                        fullDay:              b.fullDay === true
                    };
                });

                const aulasApp = (window.aulas || []).filter(function (a) {
                    return a.source !== 'google_external';
                });

                if (typeof atualizarAulas === 'function') {
                    atualizarAulas(aulasApp.concat(bloqueiosParaMerge));
                } else {
                    window.aulas = aulasApp.concat(bloqueiosParaMerge);
                }

                console.info('[gcal] ' + bloqueiosParaMerge.length +
                             ' bloqueio(s) externo(s) mesclado(s) para o período ' + timeMin + ' a ' + timeMax + '.');

                // Atualiza as duas superfícies de UI que mostram agenda:
                // semana da Home e calendário (dia/mensal).
                if (typeof window.renderizarHomeSemana === 'function') {
                    window.renderizarHomeSemana();
                }
                if (typeof window.renderizarModoCalendarioAtivo === 'function') {
                    window.renderizarModoCalendarioAtivo();
                    console.info('[gcal] ✅ Home semanal e calendário re-renderizados.');
                } else if (typeof renderizarCalendario === 'function') {
                    renderizarCalendario();
                    console.info('[gcal] ✅ Calendário re-renderizado (modo fallback).');
                }

                resolve({
                    ok: true,
                    persistencia: resultadoSync,
                    mesclados: bloqueiosParaMerge.length
                });

            } catch (err) {
                if (err && err.name === 'AbortError') {
                    resolve({ aborted: true });
                    return;
                }
                console.warn('[gcal] Falha ao sincronizar bloqueios externos:', err);
                reject(err);
            } finally {
                _sincPendingResolve = null;
            }
        }, 300);
        });
    };

    // [TAG-BIDIRECIONAL-SYNC] Sincroniza agendamentos que foram editados no Google Calendar
    // Busca eventos gerenciados pelo app (appSource = 'personaltrainer') e sincroniza mudanças de volta
    let _sincAgenAbortController = null;
    let _sincAgenDebounceTimer = null;
    let _sincAgenPendingResolve = null;

    function _sincronizarAgendamentosDoGCal(timeMin, timeMax) {
        if (!global.gcal.isSignedIn()) {
            console.info('[gcal-bidi] Não autenticado, sincronização bidirecional ignorada.');
            return Promise.resolve({ skipped: true });
        }

        // Cancela sincronização anterior se ainda pendente (debounce 300ms)
        clearTimeout(_sincAgenDebounceTimer);
        if (_sincAgenAbortController) _sincAgenAbortController.abort();
        if (typeof _sincAgenPendingResolve === 'function') {
            _sincAgenPendingResolve({ canceled: true });
            _sincAgenPendingResolve = null;
        }

        return new Promise(function (resolve, reject) {
            _sincAgenPendingResolve = resolve;

            _sincAgenDebounceTimer = setTimeout(async function () {
                _sincAgenAbortController = new AbortController();
                const signal = _sincAgenAbortController.signal;

                try {
                // 1. Busca todos os eventos no range
                const todosEventos = await global.gcal.fetchWeekEvents(timeMin, timeMax);
                if (signal.aborted) {
                    resolve({ aborted: true });
                    return;
                }

                // 2. Filtra apenas os gerenciados pelo app (appSource = 'personaltrainer')
                const agendamentosDoApp = todosEventos.filter(function (e) {
                    return global.gcal.isAppManaged(e);
                });

                if (agendamentosDoApp.length === 0) {
                    console.log('[gcal-bidi] Nenhum agendamento do app para sincronizar de volta.');
                    resolve({ ok: true, atualizados: 0, erros: 0 });
                    return;
                }

                // 3. Mapeia para formato que o backend espera (apenas os campos editáveis)
                const agendamentosParaSincronizar = agendamentosDoApp.map(function (event) {
                    const fullDay = !!(event.start && event.start.date);
                    let data = '';
                    let horarioInicio = '';
                    let horarioFim = '';

                    if (fullDay) {
                        data = event.start.date;
                        horarioInicio = '00:00';
                        horarioFim = '23:59';
                    } else {
                        const inicio = new Date(event.start.dateTime);
                        const fim = new Date(event.end.dateTime);
                        data = inicio.toISOString().slice(0, 10);
                        horarioInicio = _pad(inicio.getHours()) + ':' + _pad(inicio.getMinutes());
                        horarioFim = _pad(fim.getHours()) + ':' + _pad(fim.getMinutes());
                    }

                    const appId = event.extendedProperties && event.extendedProperties.private
                        ? event.extendedProperties.private.appId
                        : null;

                    return {
                        id: appId, // Usa appId para encontrar o agendamento no MongoDB
                        summary: event.summary || '',
                        data: data,
                        horarioInicio: horarioInicio,
                        horarioFim: horarioFim,
                        location: event.location || ''
                    };
                });

                console.log('[gcal-bidi] Sincronizando ' + agendamentosParaSincronizar.length + ' agendamento(s) do GCal via CRUD.');

                // 4. Atualiza um a um via PUT /agendamentos/:id
                const resultado = await _executarComFeedbackConexao(async function () {
                    const sucessos = [];
                    const erros = [];

                    for (const agendamentoGCal of agendamentosParaSincronizar) {
                        if (signal.aborted) break;

                        if (!agendamentoGCal || !agendamentoGCal.id) {
                            erros.push({ agendamentoId: null, erro: 'ID obrigatório.' });
                            continue;
                        }

                        const agendamentoAtual = (window.aulas || []).find(function (a) {
                            return a && a.id === agendamentoGCal.id;
                        }) || {};

                        const payloadAtualizado = {
                            ...agendamentoAtual,
                            id: agendamentoGCal.id,
                            descricao: agendamentoGCal.summary || agendamentoAtual.descricao || '',
                            data: agendamentoGCal.data || agendamentoAtual.data || '',
                            horarioInicio: agendamentoGCal.horarioInicio || agendamentoAtual.horarioInicio || '',
                            horarioFim: agendamentoGCal.horarioFim || agendamentoAtual.horarioFim || '',
                            local: agendamentoGCal.location || agendamentoAtual.local || ''
                        };

                        const res = await _backendFetchApp(API_BASE_URL + '/agendamentos/' + encodeURIComponent(agendamentoGCal.id), {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payloadAtualizado),
                            signal
                        });

                        if (res.ok) {
                            sucessos.push({
                                id: agendamentoGCal.id,
                                sucesso: true,
                                camposAtualizados: ['descricao', 'data', 'horarioInicio', 'horarioFim', 'local']
                            });
                        } else {
                            erros.push({
                                agendamentoId: agendamentoGCal.id,
                                erro: 'Backend retornou ' + res.status
                            });
                        }
                    }

                    return {
                        atualizados: sucessos.length,
                        erros: erros.length,
                        detalhes: {
                            sucessos,
                            erros
                        }
                    };
                }, function () {
                    return _sincronizarAgendamentosDoGCal(timeMin, timeMax);
                }, { exibirFalha: false, contexto: 'syncCalendario' });

                if (signal.aborted) {
                    resolve({ aborted: true });
                    return;
                }

                console.log('[gcal-bidi] ✅ Sincronização bidirecional concluída via CRUD:', resultado);
                resolve({ ok: true, ...resultado });

            } catch (err) {
                if (err && err.name === 'AbortError') {
                    resolve({ aborted: true });
                    return;
                }
                console.warn('[gcal-bidi] Falha ao sincronizar agendamentos do GCal:', err);
                reject(err);
            } finally {
                _sincAgenPendingResolve = null;
            }
        }, 300);
        });
    }

    // Expõe para teste/debug
    global._sincronizarAgendamentosDoGCal = _sincronizarAgendamentosDoGCal;

    // ── Salvamento orquestrado: MongoDB primeiro, depois GCal ────────────────────
    // Garante que nenhum dado seja perdido se o Vercel/GCal estiver indisponível.

    /**
     * Salva um agendamento com sincronização dupla (MongoDB + GCal), com overlay bloqueante.
     *
     * @param {Object} agendamento   - O objeto já mutado em window.aulas pelo chamador
     * @param {Object} [opcoes]
     * @param {string} [opcoes.operacao]        - 'criar' | 'atualizar' | 'excluir' (inferido automaticamente)
     * @param {Object} [opcoes.snapshotAnterior] - Snapshot do agendamento ANTES da edição (para revert em 'atualizar')
     */
    global.salvarEventoComGCal = async function (agendamento, opcoes) {
        opcoes = opcoes || {};

        // Se não autenticado, usa o fluxo normal sem GCal
        if (!global.gcal.isSignedIn()) {
            console.info('[gcal] salvarEventoComGCal: não autenticado — usando salvarDados diretamente.');
            if (typeof salvarDados === 'function') await salvarDados();
            return;
        }

        const operacao        = opcoes.operacao || (agendamento.googleCalendarEventId ? 'atualizar' : 'criar');
        const snapshotAnterior = opcoes.snapshotAnterior || null;

        // Bloqueia UI
        if (typeof mostrarOverlaySinc === 'function') mostrarOverlaySinc('Salvando...');

        // ── PASSO 1: MongoDB (fonte da verdade) ──────────────────────────────────
        try {
            if (typeof salvarDados !== 'function') throw new Error('salvarDados não disponível.');
            await salvarDados(true /* silencioso — overlay já está ativo */);
        } catch (mongoErr) {
            console.error('[gcal] Falha no MongoDB — GCal não será chamado:', mongoErr);

            // Reverte a mutação em memória para não deixar estado inconsistente
            const aulasRef = window.aulas || [];
            if (operacao === 'criar') {
                const idx = aulasRef.findIndex(function (a) { return a.id === agendamento.id; });
                if (idx !== -1) aulasRef.splice(idx, 1);
            } else if (operacao === 'atualizar' && snapshotAnterior) {
                const idx = aulasRef.findIndex(function (a) { return a.id === agendamento.id; });
                if (idx !== -1) aulasRef[idx] = snapshotAnterior;
            } else if (operacao === 'excluir' && snapshotAnterior) {
                // Restaura o evento removido caso o MongoDB tenha falhado
                aulasRef.push(snapshotAnterior);
            }
            if (typeof salvarNoLocalStorage === 'function') salvarNoLocalStorage();

            if (typeof ocultarOverlaySinc === 'function') ocultarOverlaySinc('error');
            return; // Abort — GCal nunca é chamado, estado limpo
        }

        // ── PASSO 2: Google Calendar ─────────────────────────────────────────────
        let gcalEventId = agendamento.googleCalendarEventId || null;

        try {
            if (operacao === 'excluir' && gcalEventId) {
                await global.gcal.deleteEvent(gcalEventId);
                gcalEventId = null;
            } else if (operacao === 'atualizar' && gcalEventId) {
                await global.gcal.updateEvent(gcalEventId, agendamento);
            } else if (operacao !== 'excluir') {
                gcalEventId = await global.gcal.createEvent(agendamento);
            }

            // ── PASSO 3: Persiste o googleCalendarEventId (best-effort) ─────────
            if (gcalEventId && agendamento.id && operacao !== 'excluir') {
                agendamento.googleCalendarEventId = gcalEventId;

                // Atualiza in-memory
                const aulasRef = window.aulas || [];
                const idx = aulasRef.findIndex(function (a) { return a.id === agendamento.id; });
                if (idx !== -1) aulasRef[idx].googleCalendarEventId = gcalEventId;

                // Persiste no backend de forma assíncrona (sem bloquear o overlay)
                _backendFetchApp(API_BASE_URL + '/agendamentos/' + encodeURIComponent(agendamento.id), {
                    method:  'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ googleCalendarEventId: gcalEventId })
                }).catch(function (e) {
                    console.warn('[gcal] Falha ao persistir googleCalendarEventId via PATCH:', e);
                });
            }

            if (typeof ocultarOverlaySinc === 'function') ocultarOverlaySinc('success');

        } catch (gcalErr) {
            // GCal falhou APÓS MongoDB — dado está seguro, evento permanece visível na UI
            console.warn('[gcal] GCal write failed after MongoDB success', {
                agendamentoId: agendamento.id,
                operacao:      operacao,
                erro:          gcalErr.message
            });
            console.warn('[gcal] googleCalendarEventId not stored — event will not appear in Google Calendar until next edit');
            if (typeof ocultarOverlaySinc === 'function') ocultarOverlaySinc('partial');
        }
    };

    // ── Gerenciamento de feedback visual do botão de sync ─────────────────────────
    // Mostra "Sincronizando..." durante a operação e persiste timestamp no localStorage

    const LAST_SYNC_KEY = 'gcal_lastSyncTime';

    function _formatarDataBR(dataISO) {
        try {
            const [ano, mes, dia] = dataISO.split('-');
            return `${dia}/${mes}`;
        } catch (e) {
            return dataISO;
        }
    }

    function _formatarUltimaSincronizacao(timestamp, timeMin, timeMax) {
        const date = new Date(timestamp);
        const dia = String(date.getDate()).padStart(2, '0');
        const mes = String(date.getMonth() + 1).padStart(2, '0');
        const horas = String(date.getHours()).padStart(2, '0');
        const minutos = String(date.getMinutes()).padStart(2, '0');
        let texto = `Última sincronização: ${dia}/${mes} às ${horas}:${minutos}`;
        
        if (timeMin && timeMax) {
            const dataInicio = _formatarDataBR(timeMin);
            const dataFim = _formatarDataBR(timeMax);
            texto += ` (Período: ${dataInicio} a ${dataFim})`;
        }
        return texto;
    }

    function _salvarUltimaSincronizacao(timeMin, timeMax) {
        try {
            const agora = new Date().getTime();
            localStorage.setItem(LAST_SYNC_KEY, agora.toString());
            if (timeMin && timeMax) {
                localStorage.setItem('gcal_sync_range', JSON.stringify({ timeMin, timeMax }));
            }
            _atualizarExibicaoUltimaSincronizacao();
        } catch (e) {
            console.warn('[gcal] Erro ao salvar timestamp de sincronização:', e);
        }
    }

    function _atualizarExibicaoUltimaSincronizacao() {
        try {
            const timestamp = localStorage.getItem(LAST_SYNC_KEY);
            const syncRange = JSON.parse(localStorage.getItem('gcal_sync_range') || 'null');
            const labelEl = document.getElementById('ultimaSincronizacao');
            if (!labelEl) return;

            if (timestamp) {
                const formatted = _formatarUltimaSincronizacao(
                    parseInt(timestamp, 10),
                    syncRange && syncRange.timeMin ? syncRange.timeMin : null,
                    syncRange && syncRange.timeMax ? syncRange.timeMax : null
                );
                labelEl.textContent = formatted;
                labelEl.style.display = 'block';
            } else {
                labelEl.style.display = 'none';
            }
        } catch (e) {
            console.warn('[gcal] Erro ao atualizar exibição de sincronização:', e);
        }
    }

    function _desabilitarBotaoSync(estado) {
        try {
            const btn = document.getElementById('btnSyncGoogleCalendar');
            const txtEl = document.getElementById('btnSyncText');
            if (!btn || !txtEl) return;

            if (estado === 'sincronizando') {
                btn.disabled = true;
                btn.style.opacity = '0.6';
                btn.style.cursor = 'not-allowed';
                txtEl.textContent = 'Atualizando...';
            } else {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
                txtEl.textContent = 'Atualizar Calendário';
            }
        } catch (e) {
            console.warn('[gcal] Erro ao alterar estado do botão:', e);
        }
    }

    // Carrega timestamp salvo ao inicializar a página
    global.inicializarUltimaSincronizacao = function() {
        _atualizarExibicaoUltimaSincronizacao();
    };

    // Cooldown para syncs automáticos (bootstrap, troca de aba): 5 minutos.
    // Syncs manuais (botão do usuário) ignoram o cooldown (manual=true).
    const GCAL_SYNC_COOLDOWN_MS = 5 * 60 * 1000;
    const GCAL_SYNC_LS_KEY = 'gcal_ultima_execucao_ts';
    let _autoSyncJaExecutada = false;
    let _syncInFlightPromise = null;
    let _syncPendente = false;
    // Lê o timestamp persistido para que o cooldown sobreviva a reloads de página.
    let _syncUltimaExecucao = (function () {
        try { return parseInt(localStorage.getItem(GCAL_SYNC_LS_KEY) || '0', 10) || 0; } catch (e) { return 0; }
    }());
    let _gatilhosGlobaisRegistrados = false;

    function _calcularRangePadraoSync() {
        const hoje = new Date();
        const umMesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 1, hoje.getDate());
        const umMesFuturo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, hoje.getDate());
        const pad = function (n) { return String(n).padStart(2, '0'); };
        const toISO = function (d) {
            return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
        };
        return { timeMin: toISO(umMesAtras), timeMax: toISO(umMesFuturo) };
    }

    function _normalizarRangeSync(range) {
        if (!range || typeof range !== 'object') {
            return _calcularRangePadraoSync();
        }
        const timeMin = range.timeMin || range.isoStart;
        const timeMax = range.timeMax || range.isoEnd;
        if (timeMin && timeMax) {
            return { timeMin, timeMax };
        }
        return _calcularRangePadraoSync();
    }

    function _renderizarPosSyncGlobal() {
        if (typeof window.renderizarHomeSemana === 'function') {
            window.renderizarHomeSemana();
        }
        if (typeof window.atualizarDashboardStats === 'function') {
            window.atualizarDashboardStats();
        }
        if (typeof window.renderizarModoCalendarioAtivo === 'function') {
            window.renderizarModoCalendarioAtivo();
        }
    }

    function _tentarSincronizacaoSilenciosaToken() {
        return new Promise(function (resolve, reject) {
            if (global.gcal && typeof global.gcal.isSignedIn === 'function' && global.gcal.isSignedIn()) {
                resolve(true);
                return;
            }

            if (!_tokenClient) {
                reject(new Error('[gcal] Token client indisponível para renovação silenciosa.'));
                return;
            }

            const perfil = window.googleIdentity && typeof window.googleIdentity.getProfile === 'function'
                ? window.googleIdentity.getProfile()
                : null;
            const loginHint = perfil && perfil.email ? String(perfil.email) : null;
            const callbackOriginal = _tokenClient.callback;

            _tokenClient.callback = function (response) {
                _tokenClient.callback = callbackOriginal || _onTokenResponse;
                if (response && response.error) {
                    reject(new Error('[gcal] Renovação silenciosa recusada: ' + response.error));
                    return;
                }

                _onTokenResponse(response);
                resolve(true);
            };

            _tokenClient.requestAccessToken({
                prompt: '',
                ...(loginHint ? { hint: loginHint } : {})
            });
        });
    }

    async function _executarSyncCentral(opcoes) {
        const opts = opcoes && typeof opcoes === 'object' ? opcoes : {};
        const silencioso = opts.silencioso === true;
        const manual = opts.manual === true;
        const force = opts.force === true;
        const allowInteractive = opts.allowInteractive === true;
        const reason = opts.reason || 'manual';

        if (_syncInFlightPromise) {
            if (force) {
                _syncPendente = true;
            }
            return _syncInFlightPromise;
        }

        if (!manual && !force) {
            const agora = Date.now();
            if (_syncUltimaExecucao > 0 && (agora - _syncUltimaExecucao) < GCAL_SYNC_COOLDOWN_MS) {
                return Promise.resolve({ skipped: true, reason: 'cooldown' });
            }
        }

        _syncInFlightPromise = (async function () {
            try {
                if (!window.googleIdentity || typeof window.googleIdentity.isSignedIn !== 'function' || !window.googleIdentity.isSignedIn()) {
                    if (!silencioso && typeof mostrarToast === 'function') {
                        mostrarToast('Faça login com Google para sincronizar o calendário.', 'warning');
                    }
                    return { skipped: true, reason: 'google-not-signed-in' };
                }

                if (!global.gcal || typeof global.gcal.isSignedIn !== 'function') {
                    return { skipped: true, reason: 'gcal-unavailable' };
                }

                if (!global.gcal.isSignedIn()) {
                    try {
                        await _tentarSincronizacaoSilenciosaToken();
                    } catch (tokenErr) {
                        if (allowInteractive) {
                            global.gcal.requestSignIn(function () {
                                _executarSyncCentral({
                                    reason: 'post-auth-' + reason,
                                    silencioso: true,
                                    manual: false,
                                    force: true,
                                    allowInteractive: false,
                                    range: opts.range
                                });
                            }, { auto: true });

                            return { queuedAfterAuth: true, reason };
                        }

                        if (!silencioso && typeof mostrarToast === 'function') {
                            mostrarToast('Calendário não autorizado nesta sessão. Entre novamente para reconectar.', 'warning');
                        }
                        return { skipped: true, reason: 'calendar-token-missing' };
                    }
                }

                if (typeof window.sincronizarBloqueiosExternos !== 'function') {
                    console.warn('[gcal] sincronizarBloqueiosExternos não está disponível.');
                    return { skipped: true, reason: 'sync-function-missing' };
                }

                _desabilitarBotaoSync('sincronizando');

                if (!silencioso && typeof mostrarOverlaySinc === 'function') {
                    mostrarOverlaySinc('Sincronizando Google Calendar...');
                }

                const range = _normalizarRangeSync(opts.range);
                const tarefasSync = [
                    window.sincronizarBloqueiosExternos(range.timeMin, range.timeMax)
                ];

                if (typeof _sincronizarAgendamentosDoGCal === 'function') {
                    tarefasSync.push(_sincronizarAgendamentosDoGCal(range.timeMin, range.timeMax));
                }

                const resultados = await Promise.allSettled(tarefasSync);
                const falhas = resultados.filter(function (item) {
                    return item.status === 'rejected';
                });

                _syncUltimaExecucao = Date.now();
                try { localStorage.setItem(GCAL_SYNC_LS_KEY, String(_syncUltimaExecucao)); } catch (e) { /* storage indisponível */ }
                _salvarUltimaSincronizacao(range.timeMin, range.timeMax);
                _renderizarPosSyncGlobal();

                if (falhas.length === 0) {
                    if (!silencioso && typeof ocultarOverlaySinc === 'function') {
                        ocultarOverlaySinc('success');
                    }
                    if (!silencioso && typeof mostrarToast === 'function') {
                        mostrarToast('Calendário atualizado com sucesso!', 'success');
                    }
                    return { ok: true, reason, range };
                }

                console.warn('[gcal] Sincronização concluída com pendências.', falhas);
                if (!silencioso && typeof ocultarOverlaySinc === 'function') {
                    ocultarOverlaySinc('partial');
                }
                if (!silencioso && typeof mostrarToast === 'function') {
                    mostrarToast('Sincronização concluída com pendências. Verifique sua conexão.', 'warning');
                }
                return { ok: false, reason, falhas };
            } catch (err) {
                console.error('[gcal] Erro ao sincronizar:', err);
                if (!silencioso && typeof ocultarOverlaySinc === 'function') {
                    ocultarOverlaySinc('error');
                }
                if (!silencioso && typeof mostrarToast === 'function') {
                    mostrarToast('Falha ao sincronizar calendário.', 'error');
                }
                return { ok: false, reason, error: err.message };
            } finally {
                _desabilitarBotaoSync('pronto');
                _syncInFlightPromise = null;
                if (_syncPendente) {
                    _syncPendente = false;
                    global.setTimeout(function () {
                        _executarSyncCentral({
                            reason: 'pending-retry',
                            silencioso: true,
                            force: true,
                            manual: false,
                            allowInteractive: false
                        });
                    }, 120);
                }
            }
        })();

        return _syncInFlightPromise;
    }

    function _vincularBotaoSyncCalendario() {
        const btn = document.getElementById('btnSyncGoogleCalendar');
        if (!btn || btn.dataset.syncBound === 'true') {
            return;
        }

        btn.dataset.syncBound = 'true';
        btn.addEventListener('click', function () {
            _executarSyncCentral({
                reason: 'manual-button',
                silencioso: false,
                manual: true,
                force: true,
                allowInteractive: false
            });
        });
    }

    function _registrarGatilhosGlobaisSync() {
        if (_gatilhosGlobaisRegistrados) {
            return;
        }

        _gatilhosGlobaisRegistrados = true;
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState !== 'visible') {
                return;
            }

            _executarSyncCentral({
                reason: 'tab-focus-resume',
                silencioso: true,
                manual: false,
                force: false,
                allowInteractive: false
            });
        });
    }

    function _sincronizarCalendarioAutomaticamenteSeNecessario() {
        if (_autoSyncJaExecutada) {
            return;
        }

        if (!window.googleIdentity || typeof window.googleIdentity.isSignedIn !== 'function' || !window.googleIdentity.isSignedIn()) {
            return;
        }

        _autoSyncJaExecutada = true;
        global.setTimeout(function () {
            _executarSyncCentral({
                reason: 'auto-bootstrap',
                silencioso: true,
                manual: false,
                force: false,
                allowInteractive: true
            });
        }, 0);
    }

    // ── API pública de orquestração de sync ─────────────────────────────────────

    global.solicitarSyncCalendario = function (opcoes) {
        return _executarSyncCentral(opcoes || {});
    };

    global.iniciarSyncGoogleCalendar = function (opcoes) {
        const opts = opcoes && typeof opcoes === 'object' ? opcoes : {};
        return _executarSyncCentral({
            reason: opts.reason || (opts.auto ? 'auto-flow' : 'manual-flow'),
            silencioso: opts.silencioso === true,
            manual: opts.auto !== true,
            force: opts.force === true,
            allowInteractive: opts.auto === true || opts.allowInteractive === true,
            range: opts.range
        });
    };

    global.iniciarSyncGoogleCalendarAutomatica = function () {
        _sincronizarCalendarioAutomaticamenteSeNecessario();
    };

    // ── Auto-inicialização: carrega timestamp ao recarregar a página (F5) ─────────
    // Executa assim que o arquivo é carregado, independente de navegação
    
    // Aguarda um pouco para garantir que o DOM está pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            _vincularBotaoSyncCalendario();
            _registrarGatilhosGlobaisSync();
            if (typeof global.inicializarUltimaSincronizacao === 'function') {
                global.inicializarUltimaSincronizacao();
                console.info('[gcal] Timestamp de sincronização carregado do cache no DOMContentLoaded');
            }
        }, { once: true });
    } else {
        // DOM já está pronto (se este arquivo foi carregado após o DOMContentLoaded)
        _vincularBotaoSyncCalendario();
        _registrarGatilhosGlobaisSync();
        if (typeof global.inicializarUltimaSincronizacao === 'function') {
            global.inicializarUltimaSincronizacao();
            console.info('[gcal] Timestamp de sincronização carregado do cache imediatamente');
        }
    }

})(window);
