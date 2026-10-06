const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');
const CONTA_A = 'ana-prazo@example.com';
const CONTA_B = 'bia-prazo@example.com';
const BATCH = ['alunos', 'agendamentos', 'configuracao/grade_horarios', 'bloqueios-externos', 'reposicoes'];
const PRAZO_CORPO_MS = 20;
const copiar = (valor) => JSON.parse(JSON.stringify(valor));
const testar = (nome, executar) => test(nome, { timeout: 5000 }, executar);
const barreiraEventos = () => new Promise((resolver) => setImmediate(resolver));

function gate() {
    let resolver;
    const promise = new Promise((resolve) => { resolver = resolve; });
    return { promise, resolver };
}

function resposta(dados, status = 200) {
    return {
        ok: status >= 200 && status < 300, status,
        json: async () => copiar(dados), text: async () => JSON.stringify(dados),
        clone: () => resposta(dados, status)
    };
}

function snapshot(nome = 'Ana — cache confirmado') {
    return {
        alunos: [{ id: 'aluno-prazo', nome, status: 'ativo', objetivo: 'Personal Trainer' }],
        aulas: [{ id: 'aula-prazo', alunoId: 'aluno-prazo', tipo: 'aula', data: '2026-10-06', horarioInicio: '08:00', horarioFim: '09:00' }],
        reposicoes: [], grade: { inicio: '07:00', fim: '20:00' }, meta: 123
    };
}

function remoto(nome = 'Ana — servidor novo') {
    const dados = snapshot(nome);
    return {
        alunos: dados.alunos, agendamentos: dados.aulas,
        'configuracao/grade_horarios': { chave: 'grade_horarios', horaInicio: '06:00', horaFim: '21:00' },
        'bloqueios-externos': [], reposicoes: []
    };
}

async function ambiente(t) {
    const dom = new JSDOM(`<!doctype html><html><body>
        <button id="btnSyncBanco"><span id="btnSyncBancoText">Sincronizar Dados</span></button>
        <span id="headerCacheState" hidden></span>
    </body></html>`, { url: 'http://localhost', runScripts: 'outside-only' });
    const { window } = dom;
    const corpos = [];
    t.after(() => {
        corpos.forEach((corpo) => corpo.liberar([]));
        dom.window.close();
    });
    let email = CONTA_A;
    const listeners = new Set();
    const a = { window, chamadas: [], avisos: [], servidor: remoto(), timers: [], retomadas: new Map() };
    const setTimeoutReal = window.setTimeout.bind(window);
    const clearTimeoutReal = window.clearTimeout.bind(window);
    let proximoTimerRetomada = -1;
    // Só a retomada manual de 0ms tem gate. Timers de fetch e de corpo,
    // inclusive os de 0ms de um deadline vencido, executam no relógio real.
    window.setTimeout = (fn, prazo, ...argumentos) => {
        if (prazo === 0 && fn.name === '_processarLeituraManual') {
            const id = proximoTimerRetomada--;
            a.retomadas.set(id, () => fn(...argumentos));
            return id;
        }
        a.timers.push(prazo);
        return setTimeoutReal(fn, prazo, ...argumentos);
    };
    window.clearTimeout = (id) => {
        if (id < 0) a.retomadas.delete(id);
        else clearTimeoutReal(id);
    };
    window.googleIdentity = {
        getOwnerEmail: () => email,
        getIdToken: () => `token-sintetico-${email}`,
        addAuthChangeListener: (fn) => { listeners.add(fn); return () => listeners.delete(fn); }
    };
    window.Headers = Headers;
    window.AbortController = AbortController;
    window.APP_API_CONFIG = { apiBaseUrl: 'http://api.test/api', apiRootUrl: 'http://api.test' };
    window.log = new Proxy({}, { get: () => () => {} });
    window.mostrarToast = (texto, tipo) => a.avisos.push({ texto, tipo });
    window.mostrarOverlayErroConexao = () => {};
    window.__appShell = { router: { getCurrentViewId: () => null } };
    a.responder = (chamada) => {
        if (chamada.method !== 'GET') return resposta({ ok: true });
        assert.ok(Object.hasOwn(a.servidor, chamada.rota), `Rota sem fixture: ${chamada.rota}`);
        return resposta(a.servidor[chamada.rota]);
    };
    // Toda rede é sintética, inclusive o warm-up; nunca delega ao fetch nativo.
    window.fetch = async (url, opcoes = {}) => {
        const endereco = new URL(String(url));
        assert.equal(endereco.origin, 'http://api.test');
        if (endereco.pathname === '/') return resposta({ ok: true });
        const chamada = { rota: endereco.pathname.slice('/api/'.length), method: opcoes.method || 'GET', conta: email };
        assert.equal(opcoes.headers.get('Authorization'), `Bearer token-sintetico-${email}`);
        a.chamadas.push(chamada);
        return a.responder(chamada);
    };
    // Fonte de produção intacta: apiFetchBackend, _limitarCorpoResposta,
    // CRUD, batch e contextoDados não são substituídos nem transformados.
    ['assets/js/state.js', 'assets/js/app/contexto-dados.js', 'assets/js/storage.js'].forEach((arquivo) => {
        vm.runInContext(fs.readFileSync(path.join(RAIZ, arquivo), 'utf8'), dom.getInternalVMContext(), { filename: arquivo });
    });
    a.contexto = window.contextoDados;
    a.contexto.iniciar();
    assert.equal(a.contexto.salvarPrincipal(snapshot()), true);
    assert.equal((await window.carregarDados({ forcarRender: false })).estado, 'local');
    assert.equal(a.chamadas.length, 0);
    a.corpo = () => {
        const inicio = gate();
        const dados = gate();
        const corpo = { inicio, liberar: dados.resolver, leituras: [] };
        const criarResposta = () => ({
            ok: true, status: 200,
            json: () => { corpo.leituras.push('json'); inicio.resolver(); return dados.promise; },
            text: () => { corpo.leituras.push('text'); inicio.resolver(); return dados.promise; },
            clone: criarResposta
        });
        corpo.resposta = criarResposta();
        corpos.push(corpo);
        return corpo;
    };
    a.memoria = () => copiar({ alunos: window.obterAlunos(), aulas: window.obterAulas(), reposicoes: window.obterReposicoes(), grade: window.obterLimitesGrade(), meta: window.faturamentoMeta });
    a.disco = () => Object.fromEntries(Object.keys(window.localStorage).sort().map((chave) => [chave, window.localStorage.getItem(chave)]));
    a.sucessos = () => a.avisos.filter((aviso) => aviso.tipo === 'success');
    a.trocar = (novoEmail) => { email = novoEmail; listeners.forEach((fn) => fn()); };
    a.liberarRetomadas = () => {
        const callbacks = Array.from(a.retomadas.values());
        a.retomadas.clear();
        callbacks.forEach((fn) => fn());
    };
    return a;
}

function conferirBatch(chamadas, conta = CONTA_A) {
    assert.equal(chamadas.length, 5);
    assert.deepEqual(chamadas.map((chamada) => chamada.rota).sort(), [...BATCH].sort());
    assert.ok(chamadas.every((chamada) => chamada.method === 'GET' && chamada.conta === conta));
}

const rejeitaPorPrazo = (promise) => assert.rejects(promise, (erro) => {
    assert.equal(erro.code, 'TIMEOUT');
    assert.match(erro.message, /corpo da resposta/);
    return true;
});

// P01 — Mutação indicada: devolver resposta crua em apiFetchBackend ou remover
// o Promise.race/timer de json em _limitarCorpoResposta.
testar('P01 — GET recebe headers, mas JSON pendurado expira pelo prazo de apiFetchBackend', async (t) => {
    const a = await ambiente(t);
    const corpo = a.corpo();
    a.responder = () => corpo.resposta;
    const memoria = a.memoria();
    const disco = a.disco();
    const res = await a.window.apiFetchBackend('http://api.test/api/alunos', {}, PRAZO_CORPO_MS);
    assert.equal(res.ok, true, 'Headers já chegaram; não é timeout do fetch');
    const terminou = rejeitaPorPrazo(res.json());
    await corpo.inicio.promise;
    await terminou;
    assert.deepEqual(a.chamadas, [{ rota: 'alunos', method: 'GET', conta: CONTA_A }]);
    corpo.liberar(snapshot('JSON tardio').alunos);
    await barreiraEventos();
    assert.deepEqual(a.memoria(), memoria);
    assert.deepEqual(a.disco(), disco);
});

// P02 — Mutações indicadas: renovar prazo ao ler/clonar, deixar clone cru,
// não limitar text ou não propagar o prazo aos clones de clones.
testar('P02 — json, text e clones compartilham deadline total sem reiniciar os 20ms', async (t) => {
    const a = await ambiente(t);
    const corpo = a.corpo();
    a.responder = () => corpo.resposta;
    const res = await a.window.apiFetchBackend('http://api.test/api/alunos', {}, PRAZO_CORPO_MS);
    const cloneAntesDoPrazo = res.clone();
    // O primeiro timeout real é a barreira de deadline: sem sleep nem polling.
    await rejeitaPorPrazo(res.json());
    const indice = a.timers.length;
    await Promise.all([
        rejeitaPorPrazo(cloneAntesDoPrazo.json()),
        rejeitaPorPrazo(res.text()),
        rejeitaPorPrazo(res.clone().text()),
        rejeitaPorPrazo(res.clone().clone().json())
    ]);
    const prazosDepoisDoDeadline = a.timers.slice(indice);
    assert.equal(prazosDepoisDoDeadline.length, 4, 'Cada leitura mantém proteção própria');
    assert.ok(prazosDepoisDoDeadline.every((prazo) => prazo <= 1),
        `Deadline vencido não pode ganhar mais 20ms: ${prazosDepoisDoDeadline}`);
    assert.deepEqual(corpo.leituras, ['json', 'json', 'text', 'text', 'json']);
    assert.equal(a.chamadas.length, 1, 'Clonar/ler não refaz a requisição');
});

// P03 — Mutações indicadas: não acompanhar tarefa do corpo; finalizar antes
// de settle; confirmar só após JSON; marcar escrita como desconhecida no timeout do corpo.
testar('P03 — PATCH confirmado espera corpo pendurado, finaliza no timeout sem desconhecer a escrita', async (t) => {
    const a = await ambiente(t);
    const corpo = a.corpo();
    const cacheAntes = a.window.localStorage.getItem('personal_alunos');
    a.window.atualizarAlunos(snapshot('Ana — PATCH confirmado').alunos);
    const op = a.contexto.iniciarOperacao({ tipo: 'reposicao-prazo' });
    assert.ok(op);
    a.responder = () => corpo.resposta;
    const res = await a.window.apiFetchBackend('http://api.test/api/reposicoes/x', { method: 'PATCH', operacao: op }, PRAZO_CORPO_MS);
    assert.equal(op.etapas[0].confirmada, true);
    assert.equal(a.contexto.obterPendencia().etapas[0].confirmada, true);
    const terminouCorpo = rejeitaPorPrazo(res.json());
    const finalizacao = a.contexto.finalizarOperacao(op);
    await corpo.inicio.promise;
    assert.equal(op.finalizada, false);
    assert.equal(a.contexto.semOperacoes(), false);
    assert.equal(a.contexto.obterPendencia().tentativaId, op.id);
    assert.equal(a.window.localStorage.getItem('personal_alunos'), cacheAntes);
    await terminouCorpo;
    await finalizacao;
    assert.equal(op.finalizada, true);
    assert.equal(op.tarefas.size, 0);
    assert.equal(op.falha, false, 'HTTP 200 confirmou a escrita, mesmo sem payload legível');
    assert.equal(op.etapas[0].status, 200);
    assert.equal(op.etapas[0].confirmada, true);
    assert.equal(a.contexto.semOperacoes(), true);
    assert.equal(a.contexto.obterPendencia(), null);
    assert.equal(a.contexto.lerPrincipal().alunos[0].nome, 'Ana — PATCH confirmado');
    assert.deepEqual(a.chamadas, [{ rota: 'reposicoes/x', method: 'PATCH', conta: CONTA_A }]);
});

// P04 — Mutações indicadas: absorver timeout/erro de GET lista como [] em
// qualquer CRUD, ou ignorar o timeoutMs recebido pelo helper.
testar('P04 — GET lista CRUD pendurado falha, nunca vira lista vazia para enviar POST', async (t) => {
    const a = await ambiente(t);
    const alunos = a.corpo();
    const aulas = a.corpo();
    const contexto = a.contexto.capturar();
    const locais = snapshot('Intenção que não pode ser reenviada sem ler o servidor');
    const disco = a.disco();
    a.responder = (chamada) => {
        if (chamada.method !== 'GET') return resposta({ ok: true });
        return chamada.rota === 'alunos' ? alunos.resposta : aulas.resposta;
    };
    // Helpers CRUD reais recebem o prazo curto; salvarDados escolheria 40s no cold start.
    const resultados = Promise.all([
        rejeitaPorPrazo(a.window._sincronizarAlunosViaCRUD(locais.alunos, PRAZO_CORPO_MS, contexto)),
        rejeitaPorPrazo(a.window._sincronizarAgendamentosViaCRUD(locais.aulas, PRAZO_CORPO_MS, contexto, null))
    ]);
    await Promise.all([alunos.inicio.promise, aulas.inicio.promise]);
    await resultados;
    assert.deepEqual(a.chamadas.map((chamada) => [chamada.rota, chamada.method]).sort(),
        [['agendamentos', 'GET'], ['alunos', 'GET']]);
    assert.deepEqual(a.disco(), disco);
    assert.equal(a.contexto.obterPendencia(), null);
});

// P05 — Mutações indicadas: retirar allSettled do finally do batch, liberar
// voo cedo, pular guarda de voo no manual, reaproveitar batch velho ou omitir retomada.
testar('P05 — batch com HTTP 500 espera demais tarefas e manual só abre batch novo após liberar voo', async (t) => {
    const a = await ambiente(t);
    const responderNormal = a.responder;
    const retidos = new Map(BATCH.filter((rota) => rota !== 'alunos').map((rota) => [rota, a.corpo()]));
    const memoria = a.memoria();
    const disco = a.disco();
    a.responder = (chamada) => chamada.rota === 'alunos' ? resposta({}, 500) : retidos.get(chamada.rota).resposta;
    let batchTerminou = false;
    const leitura = a.window.obterLeituraDados({ timeoutMs: 1000 }).then((resultado) => { batchTerminou = true; return resultado; });
    await Promise.all(Array.from(retidos.values(), (corpo) => corpo.inicio.promise));
    await barreiraEventos();
    assert.equal(batchTerminou, false, 'HTTP 500 não libera outras leituras ainda em voo');
    const pedido = a.window.sincronizarBancoDados({ timeoutMs: 1000 });
    assert.equal(a.window.sincronizarBancoDados(), pedido);
    await barreiraEventos();
    conferirBatch(a.chamadas);
    assert.match(a.window.document.getElementById('btnSyncBancoText').textContent, /Aguardando/);
    const ultimo = 'reposicoes';
    for (const [rota, corpo] of retidos) {
        if (rota !== ultimo) corpo.liberar(a.servidor[rota]);
    }
    await barreiraEventos();
    assert.equal(batchTerminou, false, 'É necessário settle de todas as tarefas, não apenas de algumas');
    conferirBatch(a.chamadas);
    assert.deepEqual(a.memoria(), memoria);
    assert.deepEqual(a.disco(), disco);
    assert.equal(a.sucessos().length, 0);
    a.servidor = remoto('Ana — batch NOVO após liberação');
    a.responder = responderNormal;
    retidos.get(ultimo).liberar([]);
    assert.equal((await leitura).estado, 'falha');
    conferirBatch(a.chamadas);
    assert.ok(a.retomadas.size > 0, 'Fim do voo precisa emitir retomada do pedido manual');
    a.liberarRetomadas();
    assert.equal((await pedido).estado, 'aplicado');
    conferirBatch(a.chamadas.slice(5));
    assert.equal(a.chamadas.length, 10);
    assert.equal(a.window.obterAlunos()[0].nome, 'Ana — batch NOVO após liberação');
    assert.equal(a.contexto.lerPrincipal().alunos[0].nome, 'Ana — batch NOVO após liberação');
    assert.equal(a.sucessos().length, 1);
});

// P06 — Mutações indicadas: considerar todos os voos sem filtrar contexto
// atual, ou remover guarda de conta/geração antes de preparar/aplicar resposta antiga.
testar('P06 — corpo antigo de A não bloqueia batch manual de B nem sobrescreve seus dados', async (t) => {
    const a = await ambiente(t);
    const corpoA = a.corpo();
    const responderNormal = a.responder;
    a.responder = (chamada) => chamada.conta === CONTA_A && chamada.rota === 'alunos' ? corpoA.resposta : responderNormal(chamada);
    let aTerminou = false;
    const leituraA = a.window.obterLeituraDados({ timeoutMs: 1000 }).then((resultado) => { aTerminou = true; return resultado; });
    await corpoA.inicio.promise;
    conferirBatch(a.chamadas);
    a.trocar(CONTA_B);
    a.servidor = remoto('Bia — servidor privado');
    assert.equal(a.contexto.salvarPrincipal(snapshot('Bia — cache privado')), true);
    const pedidoB = a.window.sincronizarBancoDados({ timeoutMs: 1000 });
    await barreiraEventos();
    assert.equal(a.chamadas.length, 10, 'B envia imediatamente, sem aguardar corpo/deadline de A');
    conferirBatch(a.chamadas.slice(5), CONTA_B);
    assert.equal((await pedidoB).estado, 'aplicado');
    assert.equal(aTerminou, false, 'Voo de A continua pendurado enquanto B já terminou');
    assert.equal(a.window.obterAlunos()[0].nome, 'Bia — servidor privado');
    assert.equal(a.contexto.lerPrincipal().alunos[0].nome, 'Bia — servidor privado');
    const memoriaB = a.memoria();
    const discoB = a.disco();
    corpoA.liberar(snapshot('SEGREDO TARDIO DE A').alunos);
    assert.equal((await leituraA).estado, 'descartado');
    await barreiraEventos();
    assert.deepEqual(a.memoria(), memoriaB);
    assert.deepEqual(a.disco(), discoB);
    assert.equal(a.chamadas.length, 10, 'Fim de A não provoca outro batch de B');
    assert.equal(a.sucessos().length, 1);
});