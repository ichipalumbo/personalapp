// Fronteira antecipada e exclusivamente mock. Fora do modo mock não altera nenhuma API.
(function (global) {
  const params = new URLSearchParams(global.location.search);
  if (global.location.hostname !== '127.0.0.2' && !params.has('mockScenario')) return;
  if (global.__UI_MOCK_SANDBOX) return;

  const nome = params.get('mockScenario') || 'default';
  const persistente = /^b2[A-Z]/.test(nome) || params.get('mockPersistencia') === '1';
  const chaveEnvelope = 'ui_mock_runtime_v1:' + encodeURIComponent(nome);
  const fetchNativo = global.fetch.bind(global);
  let handler = null;
  const chamadas = [];
  function fetchIsolado(input, init = {}) {
    const raw = typeof input === 'string' ? input : input && input.url ? input.url : String(input);
    const url = new URL(raw, global.location.href);
    const config = global.APP_API_CONFIG;
    const api = /^\/api(?:\/|$)/.test(url.pathname)
      || (config && url.origin === new URL(config.apiRootUrl).origin)
      || url.origin === 'https://personal-app-api.vercel.app' || url.origin === 'http://localhost:5000';
    const google = /(^|\.)googleapis\.com$|(^|\.)accounts\.google\.com$/.test(url.hostname);
    if (!api && !google) return fetchNativo(input, init);
    const method = String(init.method || (input && input.method) || 'GET').toUpperCase();
    const signal = init.signal || (input && input.signal);
    const chamada = { id: chamadas.length + 1, rota: url.pathname, method, estado: 'pendente', status: null };
    chamadas.push(chamada); // Sem headers, token, corpo ou query no diagnóstico.
    if (signal && signal.aborted) {
      chamada.estado = 'cancelada';
      return Promise.reject(new global.DOMException('Requisição mock cancelada', 'AbortError'));
    }
    if (!handler || google || !/^\/api(?:\/|$)/.test(url.pathname)) {
      chamada.estado = 'bloqueada'; chamada.status = 409;
      return Promise.resolve(new global.Response(JSON.stringify({ mock: true, reason: 'Rede externa bloqueada pelo sandbox.' }), { status: 409 }));
    }
    return Promise.resolve(handler(url, { ...init, method, signal }, input, chamada));
  }
  // Instalar barreira de rede antes de acessar persistência: erro nunca libera API.
  global.fetch = fetchIsolado;
  let nativo;
  try { nativo = global.localStorage; } catch (_) { /* A facade ainda funciona sem disco. */ }
  const permitidas = new Set(['personal_cache_dono', 'personal_alunos', 'personal_aulas',
    'personal_reposicoes', 'personal_limitesGrade', 'faturamentoMeta', 'personal_financas_cache', 'personal_cache_pendencias']);
  let envelope = { versao: 1, dados: {}, semeado: false, sessao: null };
  if (persistente) {
    try {
      const salvo = JSON.parse(nativo.getItem(chaveEnvelope) || 'null');
      if (salvo && salvo.versao === 1 && salvo.dados && typeof salvo.dados === 'object' && !Array.isArray(salvo.dados)) {
        const sessao = salvo.sessao && ['A', 'B'].includes(salvo.sessao.conta)
          ? { conta: salvo.sessao.conta, autenticado: salvo.sessao.autenticado === true } : null;
        envelope = { versao: 1, semeado: salvo.semeado === true, sessao, dados: {} };
        Object.keys(salvo.dados).filter((chave) => permitidas.has(chave)).forEach((chave) => {
          if (typeof salvo.dados[chave] === 'string') envelope.dados[chave] = salvo.dados[chave];
        });
      }
    } catch (_) { /* Envelope inválido não autoriza leitura de outras chaves. */ }
  }
  const memoria = new Map(Object.entries(envelope.dados));
  function persistir() {
    if (!persistente) return;
    envelope.dados = Object.fromEntries(Array.from(memoria).filter(([chave]) => permitidas.has(chave)));
    // Erro de persistência continua observável pelo chamador; não recorrer ao cache real.
    if (!nativo) throw new Error('Persistência sintética mock indisponível.');
    nativo.setItem(chaveEnvelope, JSON.stringify(envelope));
  }
  const facade = {
    get length() { return memoria.size; },
    key: (indice) => Array.from(memoria.keys())[indice] || null,
    getItem: (chave) => memoria.has(String(chave)) ? memoria.get(String(chave)) : null,
    setItem(chave, valor) { memoria.set(String(chave), String(valor)); persistir(); },
    removeItem(chave) { memoria.delete(String(chave)); persistir(); },
    clear() { memoria.clear(); persistir(); }
  };
  Object.defineProperty(global, 'localStorage', { configurable: true, value: facade });
  if (global.localStorage !== facade) throw new Error('Mock interrompido: storage não isolado.');

  global.__UI_MOCK_SANDBOX = Object.freeze({
    persistente,
    chaveEnvelope,
    chamadas: () => chamadas.map((item) => ({ ...item })),
    definirHandler: (fn) => { handler = fn; },
    semear(valores) {
      if (envelope.semeado) return false;
      Object.entries(valores).forEach(([chave, valor]) => {
        if (!permitidas.has(chave)) throw new Error('Chave não permitida no seed mock: ' + chave);
        memoria.set(chave, String(valor));
      });
      envelope.semeado = true; persistir(); return true;
    },
    lerSessao: () => envelope.sessao,
    salvarSessao(sessao) { envelope.sessao = { conta: sessao.conta === 'B' ? 'B' : 'A', autenticado: sessao.autenticado === true }; persistir(); },
    resetar() { memoria.clear(); envelope.semeado = false; envelope.sessao = null; persistir(); }
  });
})(window);