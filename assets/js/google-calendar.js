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
    const CLIENT_ID   = '799456461369-r4g75ok414jf9gb104um8j0k0ucimu1g.apps.googleusercontent.com';
    const SCOPES      = 'https://www.googleapis.com/auth/calendar';
    const GCAL_BASE   = 'https://www.googleapis.com/calendar/v3';
    const APP_SOURCE  = 'personaltrainer'; // extendedProperties.private.appSource

    // ── Estado privado ───────────────────────────────────────────────────────────
    let _tokenClient       = null;
    let _accessToken       = null;
    let _tokenExpiry       = 0;
    let _pendingResolvers  = []; // Promises aguardando token
    let _pendingSyncCallback = null; // Callback a executar após auth bem-sucedida (botão sync)
    // ── Constantes para cache do token ────────────────────────────────────────
    const TOKEN_CACHE_KEY = 'gcal_access_token';
    const EXPIRY_CACHE_KEY = 'gcal_token_expiry';

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

    // Chamado quando a biblioteca GIS (accounts.google.com/gsi/client) termina de carregar
    global._onGISLoad = function () {
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
            console.info('[gcal] GIS inicializado. Use o botão "Sync Calendário" para autenticar.');
        }
    };

    // ── Obtenção de token ────────────────────────────────────────────────────────

    function _getAccessToken() {
        return new Promise((resolve, reject) => {
            // Token ainda válido
            if (_accessToken && Date.now() < _tokenExpiry) {
                resolve(_accessToken);
                return;
            }
            // Token ausente/expirado — não solicita automaticamente para evitar popups inesperados.
            // Use window.iniciarSyncGoogleCalendar() para autenticar explicitamente.
            reject(new Error('[gcal] Token ausente ou expirado. Use o botão "Sync Calendário" para autenticar.'));
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

        /** Solicita login explícito (abre popup do Google) */
        requestSignIn(afterAuthCallback) {
            if (!_tokenClient) {
                console.warn('[gcal] requestSignIn: GIS ainda não inicializado. Aguarde o carregamento da página.');
                return;
            }
            if (typeof afterAuthCallback === 'function') {
                _pendingSyncCallback = afterAuthCallback;
            }
            _tokenClient.requestAccessToken({ prompt: 'select_account' });
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
            const body    = _agendamentoParaGCalEvent(agendamento);
            const criado  = await _calendarFetch('/calendars/primary/events', {
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

    global.sincronizarBloqueiosExternos = function (timeMin, timeMax) {
        if (!global.gcal.isSignedIn()) {
            console.info('[gcal] sincronizarBloqueiosExternos: não autenticado, ignorando.');
            return;
        }

        // Cancela sincronização anterior se ainda pendente (debounce 300ms)
        clearTimeout(_sincDebounceTimer);
        if (_sincAbortController) _sincAbortController.abort();

        _sincDebounceTimer = setTimeout(async function () {
            _sincAbortController = new AbortController();
            const signal = _sincAbortController.signal;

            try {
                // 1. Busca todos os eventos no range do GCal
                const todosEventos = await global.gcal.fetchWeekEvents(timeMin, timeMax);
                if (signal.aborted) return;

                // 2. Filtra apenas os externos (não criados pelo app)
                const externos = todosEventos.filter(e => !global.gcal.isAppManaged(e));

                // 3. Mapeia para o formato do backend
                const payload   = externos.map(_gcalEventParaBloqueio);

                // 4. Persiste no backend (coleção bloqueios_externos) com upsert por googleCalendarEventId
                const res = await fetch(API_BASE_URL + '/bloqueios-externos/sincronizar', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({ eventos: payload, timeMin, timeMax }),
                    signal
                });

                if (!res.ok) {
                    throw new Error('[gcal] Backend retornou ' + res.status + ' ao sincronizar bloqueios externos.');
                }
                if (signal.aborted) return;

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

                // Força re-renderização imediata do calendário para mostrar os novos bloqueios externos
                if (typeof window.renderizarModoCalendarioAtivo === 'function') {
                    window.renderizarModoCalendarioAtivo();
                    console.info('[gcal] ✅ Calendário re-renderizado. Bloqueios externos visíveis.');
                } else if (typeof renderizarCalendario === 'function') {
                    renderizarCalendario();
                    console.info('[gcal] ✅ Calendário re-renderizado (modo fallback).');
                } else {
                    console.warn('[gcal] Nenhuma função de re-renderização disponível.');
                }

            } catch (err) {
                if (err && err.name === 'AbortError') return; // cancelado pelo debounce
                console.warn('[gcal] Falha ao sincronizar bloqueios externos:', err);
                // Não mostra toast: operação de fundo, o usuário não precisa ser interrompido
            }
        }, 300);
    };

    // [TAG-BIDIRECIONAL-SYNC] Sincroniza agendamentos que foram editados no Google Calendar
    // Busca eventos gerenciados pelo app (appSource = 'personaltrainer') e sincroniza mudanças de volta
    let _sincAgenAbortController = null;
    let _sincAgenDebounceTimer = null;

    async function _sincronizarAgendamentosDoGCal(timeMin, timeMax) {
        if (!global.gcal.isSignedIn()) {
            console.info('[gcal-bidi] Não autenticado, sincronização bidirecional ignorada.');
            return;
        }

        // Cancela sincronização anterior se ainda pendente (debounce 300ms)
        clearTimeout(_sincAgenDebounceTimer);
        if (_sincAgenAbortController) _sincAgenAbortController.abort();

        _sincAgenDebounceTimer = setTimeout(async function () {
            _sincAgenAbortController = new AbortController();
            const signal = _sincAgenAbortController.signal;

            try {
                // 1. Busca todos os eventos no range
                const todosEventos = await global.gcal.fetchWeekEvents(timeMin, timeMax);
                if (signal.aborted) return;

                // 2. Filtra apenas os gerenciados pelo app (appSource = 'personaltrainer')
                const agendamentosDoApp = todosEventos.filter(function (e) {
                    return global.gcal.isAppManaged(e);
                });

                if (agendamentosDoApp.length === 0) {
                    console.log('[gcal-bidi] Nenhum agendamento do app para sincronizar de volta.');
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

                console.log('[gcal-bidi] Sincronizando ' + agendamentosParaSincronizar.length + ' agendamento(s) do GCal.');

                // 4. Envia para o backend para atualizar no MongoDB
                const res = await fetch(API_BASE_URL + '/agendamentos/sincronizar-do-gcal', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ agendamentos: agendamentosParaSincronizar }),
                    signal
                });

                if (!res.ok) {
                    throw new Error('[gcal-bidi] Backend retornou ' + res.status);
                }

                const resultado = await res.json();
                if (signal.aborted) return;

                console.log('[gcal-bidi] ✅ Sincronização bidirecional concluída:', {
                    atualizados: resultado.atualizados,
                    erros: resultado.erros,
                    detalhes: resultado.detalhes
                });

            } catch (err) {
                if (err && err.name === 'AbortError') return; // cancelado pelo debounce
                console.warn('[gcal-bidi] Falha ao sincronizar agendamentos do GCal:', err);
                // Não bloqueia o fluxo principal se esta sincronização falhar
            }
        }, 300);
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
                fetch(API_BASE_URL + '/agendamentos/' + encodeURIComponent(agendamento.id), {
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
                txtEl.textContent = 'Sincronizando...';
            } else {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
                txtEl.textContent = 'Sync Calendário';
            }
        } catch (e) {
            console.warn('[gcal] Erro ao alterar estado do botão:', e);
        }
    }

    // Carrega timestamp salvo ao inicializar a página
    global.inicializarUltimaSincronizacao = function() {
        _atualizarExibicaoUltimaSincronizacao();
    };

    // ── Botão de sincronização manual ─────────────────────────────────────────────
    // Único ponto de entrada para autenticação + sync.
    // Nunca dispara popup automaticamente — só quando o usuário clica explicitamente.

    global.iniciarSyncGoogleCalendar = function () {
        function _doSync() {
            if (typeof window.sincronizarBloqueiosExternos !== 'function') {
                console.warn('[gcal] sincronizarBloqueiosExternos não está disponível.');
                return;
            }

            // Desabilita o botão e mostra estado de sincronização
            _desabilitarBotaoSync('sincronizando');

            // Mostra feedback ao usuário que o sync está em progresso
            if (typeof mostrarOverlaySinc === 'function') {
                mostrarOverlaySinc('Sincronizando Google Calendar...');
            }

            // Calcula range: 1 mês no passado até 1 mês no futuro
            const hoje = new Date();
            const umMesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 1, hoje.getDate());
            const umMesFutura = new Date(hoje.getFullYear(), hoje.getMonth() + 1, hoje.getDate());
            
            const pad = function (n) { return String(n).padStart(2, '0'); };
            const toISO = function (d) {
                return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
            };
            
            const timeMin = toISO(umMesAtras);
            const timeMax = toISO(umMesFutura);

            // Executa a sincronização
            try {
                // 1. Sincroniza bloqueios externos (eventos de outros calendários)
                window.sincronizarBloqueiosExternos(timeMin, timeMax);
                
                // 2. Sincroniza bidirecional (agendamentos do app que foram editados no GCal)
                if (typeof _sincronizarAgendamentosDoGCal === 'function') {
                    _sincronizarAgendamentosDoGCal(timeMin, timeMax);
                }

                // Aguarda um pouco para que o debounce de 300ms + operações async completem
                setTimeout(function() {
                    // Salva o timestamp da sincronização bem-sucedida
                    _salvarUltimaSincronizacao(timeMin, timeMax);

                    if (typeof ocultarOverlaySinc === 'function') {
                        ocultarOverlaySinc('success');
                    }
                    if (typeof mostrarToast === 'function') {
                        mostrarToast('Sincronização concluída!', 'success');
                    }

                    // Re-habilita o botão
                    _desabilitarBotaoSync('pronto');
                }, 800);
            } catch (err) {
                console.error('[gcal] Erro ao sincronizar:', err);
                if (typeof ocultarOverlaySinc === 'function') {
                    ocultarOverlaySinc('error');
                }
                // Re-habilita o botão mesmo em caso de erro
                _desabilitarBotaoSync('pronto');
            }
        }

        if (global.gcal.isSignedIn()) {
            // Já autenticado: sincroniza imediatamente sem popup
            _doSync();
        } else {
            // Não autenticado: abre popup de conta do Google, depois sincroniza
            global.gcal.requestSignIn(_doSync);
        }
    };

    // ── Auto-inicialização: carrega timestamp ao recarregar a página (F5) ─────────
    // Executa assim que o arquivo é carregado, independente de navegação
    
    // Aguarda um pouco para garantir que o DOM está pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof global.inicializarUltimaSincronizacao === 'function') {
                global.inicializarUltimaSincronizacao();
                console.info('[gcal] Timestamp de sincronização carregado do cache no DOMContentLoaded');
            }
        }, { once: true });
    } else {
        // DOM já está pronto (se este arquivo foi carregado após o DOMContentLoaded)
        if (typeof global.inicializarUltimaSincronizacao === 'function') {
            global.inicializarUltimaSincronizacao();
            console.info('[gcal] Timestamp de sincronização carregado do cache imediatamente');
        }
    }

})(window);
