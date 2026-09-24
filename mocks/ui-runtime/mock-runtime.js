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
    const originalFetch = window.fetch.bind(window);
    const originalLocalStorageSet = Storage.prototype.setItem;
    const originalLocalStorageRemove = Storage.prototype.removeItem;
    const originalLocalStorageClear = Storage.prototype.clear;

    [
      'personalTrainerData',
      'personal_alunos',
      'personal_aulas',
      'personal_reposicoes',
      'personal_financas_cache',
      'personal_limitesGrade',
      'faturamentoMeta'
    ].forEach(function (key) {
      originalLocalStorageRemove.call(localStorage, key);
    });

    function buildSession() {
      return {
        ownerEmail: scenario.ownerEmail,
        profile: scenario.profile,
        signedIn: true,
        connected: false,
        sessionTimestamp: new Date().toISOString()
      };
    }

    window.googleIdentity = {
      initialize() {
        return Promise.resolve();
      },
      whenReady() {
        return Promise.resolve();
      },
      isSignedIn() {
        return true;
      },
      getIdToken() {
        return 'mock-ui-runtime-token';
      },
      getOwnerEmail() {
        return scenario.ownerEmail;
      },
      getProfile() {
        return scenario.profile;
      },
      addAuthChangeListener(listener) {
        if (typeof listener === 'function') {
          listener(buildSession());
        }
        return function unsubscribe() {};
      },
      signOut() {
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

    window.__UI_MOCK_RUNTIME = {
      scenarioName: getScenarioName(),
      scenario,
      session: buildSession(),
      install() {
        return this;
      },
      getScenarioName,
      setScenario(name) {
        if (!window.__UI_MOCK_SCENARIOS || !window.__UI_MOCK_SCENARIOS[name]) {
          throw new Error('Cenário inexistente: ' + name);
        }

        const params = new URLSearchParams(window.location.search);
        params.set('mockScenario', name);
        window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
        window.location.reload();
      }
    };

    Storage.prototype.setItem = function (key, value) {
      const name = String(key || '');
      const isAppKey = /personal_|_cache|_dados|localStorage/i.test(name);
      if (isAppKey && !name.includes('mock')) {
        return undefined;
      }
      return originalLocalStorageSet.call(this, key, value);
    };

    Storage.prototype.removeItem = function (key) {
      const name = String(key || '');
      const isAppKey = /personal_|_cache|_dados|localStorage/i.test(name);
      if (isAppKey && !name.includes('mock')) {
        return undefined;
      }
      return originalLocalStorageRemove.call(this, key);
    };

    Storage.prototype.clear = function () {
      return undefined;
    };

    if (navigator.serviceWorker && typeof navigator.serviceWorker.getRegistrations === 'function') {
      navigator.serviceWorker.getRegistrations = function () {
        return Promise.resolve([]);
      };
    }

    window.fetch = function fetchMock(input, init = {}) {
      const raw = typeof input === 'string' ? input : input && input.url ? input.url : String(input || '');
      const url = new URL(raw, window.location.origin);
      const method = (init.method || 'GET').toUpperCase();

      if (!url.pathname.startsWith('/api/')) {
        return originalFetch(input, init);
      }

      if (method !== 'GET') {
        return Promise.resolve(jsonResponse({
          ok: false,
          mock: true,
          reason: 'Modo mock de UI ativo. Escrita bloqueada para evitar tocar produção.'
        }, { status: 409 }));
      }

      // Rotas de dados esperadas pelo app
      if (url.pathname === '/api/configuracao' || url.pathname === '/api/configuracao/grade_horarios') {
        return Promise.resolve(jsonResponse(scenario.configuracao));
      }

      if (url.pathname === '/api/alunos' || url.pathname === '/api/alunos/') {
        return Promise.resolve(jsonResponse(scenario.alunos));
      }

      if (url.pathname === '/api/agendamentos' || url.pathname === '/api/agendamentos/') {
        return Promise.resolve(jsonResponse(scenario.agendamentos));
      }

      if (url.pathname === '/api/reposicoes' || url.pathname === '/api/reposicoes/') {
        return Promise.resolve(jsonResponse(scenario.reposicoes));
      }

      if (url.pathname === '/api/bloqueios-externos' || url.pathname === '/api/bloqueios-externos/') {
        return Promise.resolve(jsonResponse(scenario.bloqueiosExternos || []));
      }

      if (url.pathname === '/api/financas' || url.pathname === '/api/financas/') {
        return Promise.resolve(jsonResponse(scenario.financas));
      }

      if (url.pathname === '/api/alunos/consistencia-agenda') {
        return Promise.resolve(jsonResponse(scenario.consistenciaAgenda || []));
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
        return Promise.resolve(jsonResponse(historico));
      }

      if (url.pathname.includes('/api/financas/') && url.pathname.includes('/pagamento')) {
        return Promise.resolve(jsonResponse({ ok: true, mock: true, mensagem: 'Pagamento simulado em modo UI mock.' }));
      }

      if (url.pathname.includes('/api/financas/') && url.pathname.includes('/ajuste')) {
        return Promise.resolve(jsonResponse({ ok: true, mock: true, mensagem: 'Ajuste simulado em modo UI mock.' }));
      }

      return Promise.resolve(jsonResponse({ ok: true, mock: true, message: 'Endpoint mockado' }));
    };

    window.__UI_MOCK_RUNTIME_INSTALLED = true;

    if (window.__appShell && window.__appShell.router && typeof window.__appShell.router.navigateTo === 'function') {
      setTimeout(function () {
        window.__appShell.router.navigateTo('tela-home');
      }, 150);
    }

    console.info('[mock-runtime] Modo UI mock ativo.', { scenario: scenario.name, ownerEmail: scenario.ownerEmail });
  }

  if (!window.__UI_MOCK_SCENARIOS) {
    console.warn('[mock-runtime] scenarios.js não foi carregado antes de mock-runtime.js.');
  }

  if (window.__UI_MOCK_SCENARIOS) {
    installMockRuntime();
  }
})();
