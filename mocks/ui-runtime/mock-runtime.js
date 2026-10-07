(function () {
  function getScenarioName() {
    const search = new URLSearchParams(window.location.search);
    const nome = search.get('mockScenario');
    return nome && window.__UI_MOCK_SCENARIOS && window.__UI_MOCK_SCENARIOS[nome]
      ? nome
      : 'default';
  }

  function getCurrentScenario() {
    const scenarioName = getScenarioName();
    return window.__UI_MOCK_SCENARIOS[scenarioName] || window.__UI_MOCK_SCENARIOS.default;
  }

  function jsonResponse(payload, init = {}) {
    return new Response(JSON.stringify(payload), {
      status: init.status || 200,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers || {})
      }
    });
  }

  function installMockRuntime() {
    if (window.__UI_MOCK_RUNTIME_INSTALLED) {
      return;
    }

    const isDedicatedMockHost = window.location.hostname === '127.0.0.2';
    const hasMockScenario = new URLSearchParams(window.location.search).has('mockScenario');
    if (!isDedicatedMockHost && !hasMockScenario) {
      return;
    }

    const scenario = getCurrentScenario();
    const sandbox = window.__UI_MOCK_SANDBOX;
    if (!sandbox) throw new Error('Mock interrompido: sandbox.js precisa carregar antes dos consumidores.');
    const copiar = (valor) => JSON.parse(JSON.stringify(valor));

    // Flags de validação por query string:
    //   ?mockLatencia=<ms>   atraso artificial em toda resposta /api/* (skeleton/progresso)
    //   ?mockFalha=<rotas>   ex.: reposicoes,financas → resposta 500 simulada (retry/erro)
    const params = new URLSearchParams(window.location.search);
    let latenciaMs = Math.max(0, Number(params.get('mockLatencia')) || Number(scenario.latenciaMs) || 0);
    let falhas = String(params.get('mockFalha') || '')
      .split(',')
      .map(function (item) { return item.trim(); })
      .filter(Boolean);
    let semRede = params.get('mockOffline') === '1';
    let statusFalha = Math.max(400, Math.min(599, Number(params.get('mockStatus')) || 500));
    let jsonInvalido = params.get('mockJsonInvalido') === '1';
    let reterRespostas = params.get('mockReter') === '1';
    const respostasRetidas = new Map();
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => !semRede });

    function chaveDaRota(pathname) {
      if (pathname === '/api/configuracao' || pathname === '/api/configuracao/grade_horarios') return 'configuracao';
      if (pathname.indexOf('/api/alunos/consistencia-agenda') === 0) return 'consistencia-agenda';
      if (pathname === '/api/alunos' || pathname === '/api/alunos/') return 'alunos';
      if (pathname === '/api/agendamentos' || pathname === '/api/agendamentos/') return 'agendamentos';
      if (pathname === '/api/reposicoes' || pathname === '/api/reposicoes/') return 'reposicoes';
      if (pathname === '/api/bloqueios-externos' || pathname === '/api/bloqueios-externos/') return 'bloqueios-externos';
      if (pathname === '/api/financas' || pathname === '/api/financas/') return 'financas';
      return null;
    }

    // ── Modo de escrita em memória (opt-in, SÓ no cenário `default`) ─────────
    // `?mockEscrita=1` libera POST/PUT/PATCH/DELETE sobre um store em memória
    // semeado pelas fixtures do cenário. Nada sai para a rede (o fetch já é
    // interceptado lá embaixo), então não há risco de tocar produção. O store é
    // descartado ao recarregar a página. Nos demais cenários a escrita continua
    // bloqueada (409), para preservar as fixtures de demonstração/auditoria.
    const escritaLiberada = params.get('mockEscrita') === '1' && scenario.name === 'default';

    let store = escritaLiberada
      ? JSON.parse(JSON.stringify({
          configuracao: scenario.configuracao,
          alunos: scenario.alunos || [],
          agendamentos: scenario.agendamentos || [],
          reposicoes: scenario.reposicoes || [],
          bloqueiosExternos: scenario.bloqueiosExternos || [],
          financas: scenario.financas || [],
          consistenciaAgenda: scenario.consistenciaAgenda || []
        }))
      : null;
    const stores = new Map([['A', store]]);
    const baseB = copiar(scenario);
    baseB.alunos = (baseB.alunos || []).map((aluno) => ({ ...aluno, nome: 'CONTA B — ' + aluno.nome }));
    baseB.financas = (baseB.financas || []).map((card) => ({ ...card, aluno: { ...card.aluno, nome: 'CONTA B — ' + card.aluno.nome } }));
    const contas = {
      A: { ownerEmail: scenario.ownerEmail, profile: scenario.profile, dados: scenario },
      B: { ownerEmail: 'outra@local.test', profile: { name: 'Conta B Mock', email: 'outra@local.test', picture: '' }, dados: baseB }
    };
    const sessaoPersistida = sandbox.lerSessao();
    let contaAtual = sessaoPersistida ? sessaoPersistida.conta : (scenario.contaInicial === 'B' ? 'B' : 'A');
    let autenticado = sessaoPersistida ? sessaoPersistida.autenticado === true : scenario.signedIn !== false;
    const authListeners = new Set();
    if (escritaLiberada && !stores.has(contaAtual)) stores.set(contaAtual, copiar(contas[contaAtual].dados));
    store = stores.get(contaAtual) || null;

    let seqMock = 0;
    const novoIdMock = (prefixo) => 'mock-' + prefixo + '-' + (++seqMock);

    function dados(nome) {
      if (store && store[nome] !== undefined) return store[nome];
      return contas[contaAtual].dados[nome];
    }

    function corpoJson(init) {
      try {
        return JSON.parse(init && init.body ? init.body : '{}');
      } catch (_) {
        return {};
      }
    }

    function adicionarSeteDias(iso) {
      const base = new Date(String(iso || '') + 'T12:00:00');
      if (Number.isNaN(base.getTime())) return null;
      base.setDate(base.getDate() + 7);
      return base.toISOString().slice(0, 10);
    }

    // Mesma ideia do backend (snapshot do ciclo): por_aula = (aulas + extras) × preço.
    function recalcularCiclo(ciclo, storeAlvo) {
      const aluno = storeAlvo.alunos.find((a) => a.id === ciclo.alunoId) || {};
      const preco = Number(aluno.preco) || 0;
      if (ciclo.metodoCobranca === 'por_aula') {
        ciclo.valorTotalCiclo = ((Number(ciclo.aulasContadas) || 0) + (Number(ciclo.aulasManuaisExtras) || 0)) * preco;
      } else {
        ciclo.valorTotalCiclo = Number(aluno.valorFixoCiclo) || Number(ciclo.valorTotalCiclo) || 0;
      }
      return ciclo;
    }

    function tratarEscrita(responder, url, method, init, seg, store) {
      const recurso = seg[1];
      const id = seg[2];
      const acao = seg[3];
      const payload = corpoJson(init);

      if (recurso === 'alunos') {
        if (method === 'POST') {
          const novo = Object.assign({}, payload, { id: payload.id || novoIdMock('aluno') });
          store.alunos.push(novo);
          return responder(novo, { status: 201 });
        }
        if (method === 'PUT' && id) {
          const atualizado = Object.assign({}, payload, { id });
          const i = store.alunos.findIndex((a) => a.id === id);
          if (i >= 0) store.alunos[i] = atualizado; else store.alunos.push(atualizado);
          return responder(atualizado);
        }
        if (method === 'DELETE' && id) {
          store.alunos = store.alunos.filter((a) => a.id !== id);
          return responder({ ok: true, mock: true, id });
        }
      }

      if (recurso === 'agendamentos') {
        if (method === 'POST') {
          const novo = Object.assign({}, payload, { id: payload.id || novoIdMock('agendamento') });
          store.agendamentos.push(novo);
          return responder(novo, { status: 201 });
        }
        if (method === 'PUT' && id) {
          const atualizado = Object.assign({}, payload, { id });
          const i = store.agendamentos.findIndex((a) => a.id === id);
          if (i >= 0) store.agendamentos[i] = atualizado; else store.agendamentos.push(atualizado);
          return responder(atualizado);
        }
        if (method === 'DELETE' && id) {
          store.agendamentos = store.agendamentos.filter((a) => a.id !== id);
          return responder({ ok: true, mock: true, id });
        }
      }

      if (recurso === 'reposicoes') {
        if (method === 'POST' && acao === 'reabrir' && id) {
          const reposicao = store.reposicoes.find((r) => r.id === id);
          if (reposicao) {
            reposicao.status = 'pendente';
            reposicao.agendamentoReposicaoId = null;
          }
          return responder({ ok: true, mock: true, reposicao: reposicao || null });
        }
        if (method === 'POST') {
          const novo = Object.assign({}, payload, {
            id: payload.id || novoIdMock('reposicao'),
            status: payload.status || 'pendente',
            validoAte: payload.validoAte || adicionarSeteDias(payload.dataOriginal)
          });
          store.reposicoes.push(novo);
          return responder(novo, { status: 201 });
        }
        if (method === 'PATCH' && id) {
          const reposicao = store.reposicoes.find((r) => r.id === id);
          if (!reposicao) return responder({ error: 'Reposição não encontrada.' }, { status: 404 });
          Object.assign(reposicao, payload);
          return responder(reposicao);
        }
        if (method === 'DELETE' && id) {
          store.reposicoes = store.reposicoes.filter((r) => r.id !== id);
          return responder({ ok: true, mock: true, id });
        }
      }

      if (recurso === 'configuracao' && method === 'PUT') {
        store.configuracao = Object.assign({}, store.configuracao, {
          horaInicio: payload.horaInicio || store.configuracao.horaInicio,
          horaFim: payload.horaFim || store.configuracao.horaFim
        });
        return responder(store.configuracao);
      }

      if (recurso === 'financas' && method === 'PATCH' && id) {
        const item = store.financas.find((f) => f.cicloAtual && f.cicloAtual._id === id);
        if (!item) return responder({ error: 'Ciclo não encontrado.' }, { status: 404 });
        const ciclo = item.cicloAtual;
        if (acao === 'pagamento') {
          ciclo.status = 'pago';
          ciclo.dataPagamento = payload.dataPagamento || ciclo.dataPagamento;
          if (payload.formaPagamento) ciclo.formaPagamento = payload.formaPagamento;
        } else if (acao === 'ajuste') {
          ciclo.aulasManuaisExtras = Number(payload.aulasManuaisExtras) || 0;
          if (payload.observacaoAjuste) ciclo.observacaoAjuste = payload.observacaoAjuste;
          recalcularCiclo(ciclo, store);
        }
        return responder({ ok: true, mock: true, ciclo });
      }

      // Auth/GCAL e qualquer rota de escrita não simulada seguem bloqueados:
      // envolvem credencial e estado externo (decisão: fora do escopo do mock).
      return responder({
        ok: false,
        mock: true,
        reason: 'Modo mock: rota de escrita não simulada (' + method + ' ' + url.pathname + ').'
      }, { status: 409 });
    }

    const cache = scenario.cacheSintetico;
    if (cache) {
      const s = cache.snapshot;
      const valores = {
        personal_cache_dono: cache.ownerEmail,
        personal_alunos: JSON.stringify(s.alunos), personal_aulas: JSON.stringify(s.aulas),
        personal_reposicoes: JSON.stringify(s.reposicoes), personal_limitesGrade: JSON.stringify(s.grade),
        faturamentoMeta: String(s.meta || 0),
        personal_financas_cache: JSON.stringify({ ownerEmail: cache.ownerEmail, atualizadoEm: cache.atualizadoEm, dados: cache.financas })
      };
      if (cache.pendencia) valores.personal_cache_pendencias = JSON.stringify(cache.pendencia);
      sandbox.semear(valores);
    } else sandbox.semear({});

    function buildSession() {
      return {
        ownerEmail: autenticado ? contas[contaAtual].ownerEmail : null,
        profile: autenticado ? contas[contaAtual].profile : null,
        signedIn: autenticado,
        connected: false,
        sessionTimestamp: new Date().toISOString()
      };
    }

    // O mock substitui `window.googleIdentity` inteiro (e o google-identity.js real
    // roda ANTES dele, em index.html). Sem isto, o `_updateUi()` da implementação
    // real nunca executa e o header fica travado no estado "desconectado"
    // (#googleSignedOutState visível, #btnUserAreaTrigger oculto) mesmo com sessão
    // ativa — o que impedia abrir a área do usuário/configurações no mock.
    // Reaplicamos aqui o MESMO toggle de `_updateUi()` (assets/js/auth/google-identity.js).
    function aplicarEstadoHeaderSessao() {
      const signedOutState = document.getElementById('googleSignedOutState');
      const signedInState = document.getElementById('googleSignedInState');
      const sessionAvatar = document.getElementById('headerSessionAvatar');

      if (signedOutState) signedOutState.hidden = autenticado;
      if (signedInState) signedInState.hidden = !autenticado;

      if (sessionAvatar) {
        const perfil = contas[contaAtual].profile;
        const email = autenticado && perfil ? String(perfil.email || '') : '';
        sessionAvatar.textContent = email ? email.charAt(0).toUpperCase() : 'G';
      }
    }

    window.googleIdentity = {
      initialize() {
        return Promise.resolve();
      },
      whenReady() {
        return Promise.resolve();
      },
      isSignedIn() {
        return autenticado;
      },
      getIdToken() {
        return autenticado ? 'mock-ui-runtime-token' : null;
      },
      getOwnerEmail() {
        return autenticado ? contas[contaAtual].ownerEmail : null;
      },
      getProfile() {
        return autenticado ? contas[contaAtual].profile : null;
      },
      addAuthChangeListener(listener) {
        aplicarEstadoHeaderSessao();
        if (typeof listener === 'function') {
          authListeners.add(listener);
          listener(buildSession());
        }
        return function unsubscribe() { authListeners.delete(listener); };
      },
      signOut() {
        definirSessao({ autenticado: false });
        return Promise.resolve();
      },
      checkCalendarConnectionStatus() {
        return Promise.resolve({ connected: false });
      },
      getCachedCalendarConnectionStatus() {
        return { connected: false };
      },
      ensureCalendarConnection() {
        return Promise.resolve({ connected: false, skipped: true });
      },
      deleteCalendarConnection() {
        return Promise.resolve();
      },
      updateGoogleCalendarStatusUI() {
        return undefined;
      }
    };

    function definirSessao(opcoes = {}) {
      if (opcoes.conta !== undefined && !['A', 'B'].includes(opcoes.conta)) throw new Error('Conta mock deve ser A ou B.');
      if (opcoes.conta) contaAtual = opcoes.conta;
      if (typeof opcoes.autenticado === 'boolean') autenticado = opcoes.autenticado;
      if (escritaLiberada && !stores.has(contaAtual)) stores.set(contaAtual, copiar(contas[contaAtual].dados));
      store = stores.get(contaAtual) || null;
      let persistida = true;
      try { sandbox.salvarSessao({ conta: contaAtual, autenticado }); }
      catch (_) { persistida = false; } // Sessão de teste em memória segue coerente.
      const sessao = buildSession();
      sessao.persistida = persistida;
      window.__UI_MOCK_RUNTIME.session = sessao;
      aplicarEstadoHeaderSessao();
      authListeners.forEach((fn) => fn(sessao));
      return sessao;
    }
    function configurarRede(opcoes = {}) {
      if (opcoes.latenciaMs !== undefined) latenciaMs = Math.max(0, Math.min(60000, Number(opcoes.latenciaMs) || 0));
      if (Array.isArray(opcoes.falhas)) falhas = opcoes.falhas.map(String);
      if (opcoes.status !== undefined) statusFalha = Math.max(400, Math.min(599, Number(opcoes.status) || 500));
      if (typeof opcoes.jsonInvalido === 'boolean') jsonInvalido = opcoes.jsonInvalido;
      if (typeof opcoes.reter === 'boolean') reterRespostas = opcoes.reter;
      if (typeof opcoes.offline === 'boolean') {
        const mudou = semRede !== opcoes.offline;
        semRede = opcoes.offline;
        if (mudou) window.dispatchEvent(new Event(semRede ? 'offline' : 'online'));
      }
    }
    window.__UI_MOCK_RUNTIME = {
      scenarioName: getScenarioName(),
      scenario,
      session: buildSession(),
      install() {
        return this;
      },
      getScenarioName,
      definirSessao,
      configurarRede,
      liberarRespostas() {
        const liberar = Array.from(respostasRetidas.values());
        liberar.forEach((fn) => fn());
        return liberar.length;
      },
      obterChamadas: sandbox.chamadas,
      resetarCache() { sandbox.resetar(); window.location.reload(); },
      setScenario(name) {
        if (!window.__UI_MOCK_SCENARIOS || !window.__UI_MOCK_SCENARIOS[name]) {
          throw new Error('Cenário inexistente: ' + name);
        }

        const params = new URLSearchParams(window.location.search);
        params.set('mockScenario', name);
        window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}${window.location.hash}`);
        window.location.reload();
      }
    };

    sandbox.definirHandler(function fetchMock(url, init, input, chamada, escopo) {
      escopo = escopo || { conta: contaAtual, autenticado, store };
      const method = init.method;
      if (init.signal && init.signal.aborted) {
        chamada.estado = 'cancelada';
        return Promise.reject(new DOMException('Requisição mock cancelada antes de mutar', 'AbortError'));
      }
      if (input && typeof input.clone === 'function' && init.body === undefined && method !== 'GET') {
        const corpo = input.clone().text();
        // Abort também encerra um corpo de Request que ainda não terminou de chegar.
        return new Promise((resolve, reject) => {
          const cancelar = () => { chamada.estado = 'cancelada'; reject(new DOMException('Corpo mock cancelado', 'AbortError')); };
          if (init.signal) init.signal.addEventListener('abort', cancelar, { once: true });
          corpo.then((body) => {
            if (init.signal) init.signal.removeEventListener('abort', cancelar);
            if (!init.signal || !init.signal.aborted) resolve(fetchMock(url, { ...init, body }, null, chamada, escopo));
          }, (erro) => {
            if (init.signal) init.signal.removeEventListener('abort', cancelar);
            chamada.estado = 'falha-corpo'; reject(erro);
          });
        });
      }

      // Resposta mockada única — aplica a latência artificial (se configurada) antes de resolver.
      const responder = (payload, opcoes = {}) => {
        const resposta = jsonInvalido && method === 'GET' && (!opcoes.status || opcoes.status === 200)
          ? new Response('{json-invalido', { status: 200, headers: { 'Content-Type': 'application/json' } })
          : jsonResponse(payload, opcoes);
        return new Promise((resolve, reject) => {
          let timer;
          const limpar = () => { clearTimeout(timer); respostasRetidas.delete(chamada.id); if (init.signal) init.signal.removeEventListener('abort', cancelar); };
          const cancelar = () => { limpar(); chamada.estado = 'cancelada'; reject(new DOMException('Resposta mock cancelada', 'AbortError')); };
          const finalizar = () => {
            limpar();
            if (semRede) { chamada.estado = 'falha-rede'; reject(new TypeError('Rede mock indisponível')); return; }
            chamada.estado = 'respondida'; chamada.status = resposta.status; resolve(resposta);
          };
          if (init.signal && init.signal.aborted) { cancelar(); return; }
          if (init.signal) init.signal.addEventListener('abort', cancelar, { once: true });
          if (reterRespostas) respostasRetidas.set(chamada.id, finalizar);
          else if (latenciaMs > 0) timer = setTimeout(finalizar, latenciaMs);
          else finalizar();
        });
      };

      const seg = url.pathname.split('/').filter(Boolean);

      // Credencial/estado externo nunca simulados nem delegados, mesmo com opt-in.
      if (['auth', 'gcal'].includes(seg[1])) return responder({ mock: true, reason: 'Auth/GCal bloqueados.' }, { status: 409 });
      if (!escopo.autenticado) return responder({ mock: true, error: 'Sessão mock ausente.' }, { status: 401 });

      if (method !== 'GET') {
        if (escritaLiberada) {
          return tratarEscrita(responder, url, method, init, seg, escopo.store);
        }
        return responder({
          ok: false,
          mock: true,
          reason: 'Modo mock de UI ativo. Escrita bloqueada para evitar tocar produção. Use ?mockEscrita=1 no cenário default para simular criações.'
        }, { status: 409 });
      }

      // Falha simulada por rota (`?mockFalha=reposicoes,financas`).
      const chave = chaveDaRota(url.pathname);
      if (chave && falhas.includes(chave)) {
        return responder({
          ok: false,
          mock: true,
          error: 'Falha simulada pelo mock (mockFalha=' + chave + ').'
        }, { status: statusFalha });
      }

      // Rotas de dados esperadas pelo app (leem do store quando ?mockEscrita=1)
      if (url.pathname === '/api/configuracao' || url.pathname === '/api/configuracao/grade_horarios') {
        return responder(dados('configuracao'));
      }

      if (url.pathname === '/api/alunos' || url.pathname === '/api/alunos/') {
        return responder(dados('alunos') || []);
      }

      if (url.pathname === '/api/agendamentos' || url.pathname === '/api/agendamentos/') {
        return responder(dados('agendamentos') || []);
      }

      if (url.pathname === '/api/reposicoes' || url.pathname === '/api/reposicoes/') {
        return responder(dados('reposicoes') || []);
      }

      // GET /api/reposicoes/:id (usado ao reabrir/reagendar uma reposição)
      if (seg[1] === 'reposicoes' && seg[2] && seg[2] !== 'reabrir') {
        const reposicao = (dados('reposicoes') || []).find((r) => r.id === decodeURIComponent(seg[2]));
        if (reposicao) return responder(reposicao);
        return responder({ error: 'Reposição não encontrada.' }, { status: 404 });
      }

      if (url.pathname === '/api/bloqueios-externos' || url.pathname === '/api/bloqueios-externos/') {
        return responder(dados('bloqueiosExternos') || []);
      }

      if (url.pathname === '/api/financas' || url.pathname === '/api/financas/') {
        return responder(dados('financas') || []);
      }

      if (url.pathname === '/api/alunos/consistencia-agenda') {
        return responder(dados('consistenciaAgenda') || []);
      }

      if (url.pathname.startsWith('/api/financas/') && url.pathname.endsWith('/historico')) {
        const alunoId = url.pathname.split('/')[2];
        const historico = [
          {
            _id: 'hist_' + String(alunoId || 'mock'),
            alunoId,
            cicloInicio: '2026-08-01',
            cicloFim: '2026-08-31',
            status: 'pago',
            metodoCobranca: 'por_aula',
            aulasContadas: 3,
            aulasManuaisExtras: 0,
            valorTotalCiclo: 180,
            extrato: []
          }
        ];
        return responder(historico);
      }

      if (url.pathname.includes('/api/financas/') && url.pathname.includes('/pagamento')) {
        return responder({ ok: true, mock: true, mensagem: 'Pagamento simulado em modo UI mock.' });
      }

      if (url.pathname.includes('/api/financas/') && url.pathname.includes('/ajuste')) {
        return responder({ ok: true, mock: true, mensagem: 'Ajuste simulado em modo UI mock.' });
      }

      return responder({ ok: true, mock: true, message: 'Endpoint mockado' });
    });

    window.__UI_MOCK_RUNTIME_INSTALLED = true;

    // Header coerente com a sessão (ver `aplicarEstadoHeaderSessao`).
    aplicarEstadoHeaderSessao();

    console.info('[mock-runtime] Modo UI mock ativo.', {
      scenario: scenario.name,
      ownerEmail: autenticado ? scenario.ownerEmail : null,
      autenticado: autenticado,
      latenciaMs: latenciaMs,
      falhas: falhas,
      escritaLiberada: escritaLiberada
    });
  }

  if (!window.__UI_MOCK_SCENARIOS) {
    console.warn('[mock-runtime] scenarios.js não foi carregado antes de mock-runtime.js.');
  }

  if (window.__UI_MOCK_SCENARIOS) {
    installMockRuntime();
  }
})();
