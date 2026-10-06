const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');
const EMAIL = 'ana@example.com';
const CODE = 'codigo-oauth-sintetico-nao-persistir';
const copiar = (valor) => JSON.parse(JSON.stringify(valor));
const testar = (nome, executar) => test(nome, { timeout: 5000 }, executar);
const drenar = () => new Promise((resolve) => setImmediate(resolve));

function adiada() {
    let resolver;
    let rejeitar;
    const promise = new Promise((resolve, reject) => { resolver = resolve; rejeitar = reject; });
    return { promise, resolver, rejeitar };
}

function resposta(dados, status = 200) {
    return new Response(JSON.stringify(dados), { status, headers: { 'Content-Type': 'application/json' } });
}

function token(email) {
    return `cabecalho.${Buffer.from(JSON.stringify({ email, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.assinatura-sintetica`;
}

function carregar(dom, arquivo) {
    vm.runInContext(fs.readFileSync(path.join(RAIZ, arquivo), 'utf8'), dom.getInternalVMContext(), { filename: arquivo });
}

async function ambiente(t) {
    const dom = new JSDOM(`<!doctype html><html><body>
        <button id="btnConnectGoogleCalendar">Conectar</button>
        <button id="custom-google-login">Login</button>
        <div id="googleSignedOutState"></div><div id="googleSignedInState" hidden></div>
        <span id="headerSessionAvatar"></span>
    </body></html>`, { url: 'http://localhost', runScripts: 'outside-only' });
    t.after(() => dom.window.close());
    const { window } = dom;
    const a = { dom, window, chamadas: [], chamadasApi: [], pedidosGIS: [], inicioGIS: adiada(), promptsLogin: 0 };
    window.console = { info() {}, warn() {}, error() {} };
    window.Headers = Headers;
    window.AbortController = AbortController;
    window.APP_API_CONFIG = { apiBaseUrl: 'http://api.test/api', apiRootUrl: 'http://api.test' };
    window.localStorage.setItem('gis_profile_cache', JSON.stringify({ email: EMAIL, name: 'Ana' }));
    window.localStorage.setItem('gis_session_cache', JSON.stringify({ idToken: token(EMAIL), email: EMAIL, expiraEm: Date.now() + 3600000 }));
    window.google = { accounts: {
        id: {
            initialize: (opts) => { a.identidadeGIS = opts; },
            prompt: () => { a.promptsLogin++; },
            disableAutoSelect() {}
        },
        oauth2: {
            initCodeClient: (opts) => {
                a.oauthGIS = opts;
                return { requestCode: (pedido) => { a.pedidosGIS.push(pedido); a.inicioGIS.resolver(); } };
            }
        }
    } };
    a.responder = (chamada) => chamada.method === 'GET'
        ? resposta({ connected: false }) : resposta({ connection: { googleEmail: EMAIL } });
    // Nenhum acesso a rede real: inclusive o ping do storage é interceptado.
    window.fetch = async (url, opts = {}) => {
        const endereco = new URL(String(url));
        assert.equal(endereco.origin, 'http://api.test');
        if (endereco.pathname === '/') return resposta({ ok: true });
        const chamada = { rota: endereco.pathname.slice('/api/'.length), method: opts.method || 'GET', opts };
        a.chamadas.push(chamada);
        assert.equal(opts.headers.get('Authorization'), `Bearer ${window.googleIdentity.getIdToken()}`);
        assert.ok(['gcal/connection', 'auth/connection', 'gcal/exchange', 'auth/exchange', 'auth', 'gcal'].includes(chamada.rota));
        return a.responder(chamada);
    };
    [
        'assets/js/state.js', 'assets/js/app/contexto-dados.js',
        'assets/js/storage.js', 'assets/js/auth/google-identity.js'
    ].forEach((arquivo) => carregar(dom, arquivo));
    await window.googleIdentity.initialize();
    a.contexto = window.contextoDados;
    a.contexto.iniciar();
    const apiReal = window.apiFetchBackend;
    window.apiFetchBackend = (url, opts, prazo) => {
        a.chamadasApi.push({ url, opts });
        return apiReal(url, opts, prazo);
    };
    a.autorizar = () => a.oauthGIS.callback({ code: CODE });
    a.trocar = (email) => a.identidadeGIS.callback({ credential: token(email) });
    a.postagens = () => a.chamadas.filter((c) => c.method === 'POST');
    a.disco = () => Object.fromEntries(Object.keys(window.localStorage).sort().map((chave) => [chave, window.localStorage.getItem(chave)]));
    a.metadados = () => window.localStorage.getItem('personal_cache_pendencias') || '';
    a.conectar = (opcoes = {}) => window.googleIdentity.ensureCalendarConnection({ interactive: true, ...opcoes });
    // Interação DOM chama a API pública de conexão, sem carregar a ponte de outro worker.
    a.botao = window.document.getElementById('btnConnectGoogleCalendar');
    a.botao.addEventListener('click', () => {
        a.clique = window.googleIdentity.connectCalendar();
        a.clique.catch(() => {});
    });
    return a;
}

// Mutação O01: criar raiz antes da consulta ou no caminho noninteractive/cache.
testar('O01 — consulta, cache e conexão já existente não criam operação nem solicitam code', async (t) => {
    const a = await ambiente(t);
    const interacao = a.contexto.capturarInteracao();
    assert.equal((await a.conectar({ interactive: false })).needsConsent, true);
    assert.equal(a.contexto.obterPendencia(), null);
    assert.equal(a.contexto.semOperacoes(), true);
    assert.equal(a.contexto.capturarInteracao(), interacao);
    a.responder = () => resposta({ connected: true, connection: { googleEmail: EMAIL } });
    a.botao.click();
    assert.equal((await a.clique).connected, true);
    const requisicoes = a.chamadas.length;
    a.botao.click();
    assert.equal((await a.clique).fromCache, true);
    assert.equal(a.chamadas.length, requisicoes);
    assert.equal(a.contexto.capturarInteracao(), interacao);
    assert.equal(a.contexto.obterPendencia(), null);
    assert.equal(a.pedidosGIS.length, 0);
    assert.equal(a.postagens().length, 0);
    assert.equal(a.promptsLogin, 0, 'Conexão não altera o login restaurado');
});

// Mutação O02: não iniciar/finalizar raiz própria; omitir operacao do POST.
testar('O02 — clique independente abre raiz só após GET e a mantém até terminar o corpo do exchange', async (t) => {
    const a = await ambiente(t);
    const inicioCorpo = adiada();
    const corpo = adiada();
    a.responder = (c) => {
        if (c.method === 'GET') {
            assert.equal(a.contexto.semOperacoes(), true);
            assert.equal(a.contexto.obterPendencia(), null);
            return resposta({ connected: false });
        }
        return { ok: true, status: 200, json: () => { inicioCorpo.resolver(); return corpo.promise; } };
    };
    a.botao.click();
    await a.inicioGIS.promise;
    const id = a.contexto.obterPendencia().tentativaId;
    assert.equal(a.contexto.semOperacoes(), false);
    assert.equal(a.contexto.obterPendencia().tipo, 'conexao-calendario');
    assert.equal(a.postagens().length, 0);
    a.autorizar();
    await inicioCorpo.promise;
    const raiz = a.chamadasApi.find((c) => c.opts.method === 'POST').opts.operacao;
    assert.equal(raiz.id, id);
    assert.equal(raiz.finalizada, false);
    assert.equal(a.contexto.semOperacoes(), false);
    assert.equal(a.window.googleIdentity.getCachedCalendarConnectionStatus().connected, false);
    assert.deepEqual(JSON.parse(a.postagens()[0].opts.body), { code: CODE, ownerEmail: EMAIL });
    corpo.resolver({ connection: { googleEmail: EMAIL } });
    assert.equal((await a.clique).connectedNow, true);
    assert.equal(raiz.finalizada, true);
    assert.equal(a.contexto.semOperacoes(), true);
    assert.equal(a.contexto.obterPendencia(), null);
    assert.equal(a.window.googleIdentity.getCachedCalendarConnectionStatus().connected, true);
    assert.doesNotMatch(a.metadados(), new RegExp(CODE));
});

// Mutação O03: omitir raiz nos GETs, não acompanhar toda a conexão ou finalizar
// raiz emprestada na auth. Antecipar finalizarOperacao prova espera por GIS/corpo.
testar('O03 — raiz emprestada acompanha GET, consentimento e corpo sem finalizar cedo ou abrir outra raiz', async (t) => {
    const a = await ambiente(t);
    const raiz = a.contexto.iniciarOperacao({ tipo: 'agenda' });
    const inicioStatus = adiada();
    const status = adiada();
    const inicioCorpo = adiada();
    const corpo = adiada();
    a.responder = (c) => c.method === 'GET'
        ? { ok: true, status: 200, json: () => { inicioStatus.resolver(); return status.promise; } }
        : { ok: true, status: 200, json: () => { inicioCorpo.resolver(); return corpo.promise; } };
    const conexao = a.conectar({ operacao: raiz });
    await inicioStatus.promise;
    const finalizacao = a.contexto.finalizarOperacao(raiz);
    await drenar();
    assert.equal(raiz.finalizada, false, 'Headers GET não encerram a conexão');
    status.resolver({ connected: false });
    await a.inicioGIS.promise;
    await drenar();
    assert.equal(raiz.finalizada, false, 'Esperar resposta do consentimento');
    assert.equal(a.contexto.obterPendencia().tentativaId, raiz.id);
    a.autorizar();
    await inicioCorpo.promise;
    await drenar();
    assert.equal(raiz.finalizada, false, 'Headers POST não encerram a conexão');
    assert.ok(a.chamadasApi.every((c) => c.opts.operacao === raiz && c.opts.contextoDados === raiz.contexto));
    assert.equal(a.contexto.obterPendencia().tentativaId, raiz.id);
    corpo.resolver({ connection: { googleEmail: EMAIL } });
    assert.equal((await conexao).connectedNow, true);
    await finalizacao;
    assert.equal(raiz.finalizada, true);
    assert.equal(a.contexto.obterPendencia(), null);
    // Sem finalização iniciada pelo chamador, auth precisa deixar a raiz viva.
    const outra = a.contexto.iniciarOperacao({ tipo: 'agenda' });
    assert.equal((await a.conectar({ operacao: outra })).fromCache, true);
    assert.equal(outra.finalizada, false);
    assert.equal(a.contexto.obterPendencia().tentativaId, outra.id);
    await a.contexto.finalizarOperacao(outra);
});

// Mutação O04: remover guardas de pendência, tentativaId, op.falha ou contexto
// após consentimento; a autorização recebida não permite substituir outra intenção.
testar('O04 — pendência anterior, raiz interrompida e intenção substituída bloqueiam exchange', async (t) => {
    const a = await ambiente(t);
    const raiz = a.contexto.iniciarOperacao({ tipo: 'agenda' });
    a.contexto.marcarFalhaOperacao(raiz, new Error('Gravação anterior desconhecida'));
    await assert.rejects(a.conectar({ operacao: raiz }), /OPERACAO_INTERROMPIDA/);
    await a.contexto.finalizarOperacao(raiz);
    const disco = a.disco();
    a.botao.click();
    await assert.rejects(a.clique, /PENDENCIA_LOCAL/);
    assert.deepEqual(a.disco(), disco);
    assert.equal(a.chamadas.length, 0);
    assert.equal(a.pedidosGIS.length, 0);
    const b = await ambiente(t);
    const conexao = b.conectar();
    const rejeicao = assert.rejects(conexao, /PENDENCIA_LOCAL/);
    await b.inicioGIS.promise;
    const id = b.contexto.iniciarPendencia({ alunos: [], aulas: [], reposicoes: [], grade: {}, meta: 1 });
    b.autorizar();
    await rejeicao;
    assert.equal(b.postagens().length, 0);
    assert.equal(b.contexto.obterPendencia().tentativaId, id);
    assert.equal(b.contexto.semOperacoes(), true);
});

// Mutação O05: fallback em 500/timeout/JSON; retirar statusEsperados [404];
// voltar a persistir mensagem de erro contendo code ou detalhes do exchange.
testar('O05 — fallback só em 404 esperado; timeout/500/JSON não repetem code nem persistem segredo', async (t) => {
    const a = await ambiente(t);
    const raiz = a.contexto.iniciarOperacao({ tipo: 'agenda' });
    a.responder = (c) => {
        if (c.rota === 'gcal/connection' || c.rota === 'gcal/exchange') return resposta({}, 404);
        assert.equal(raiz.falha, false, '404 de rota não envenena a raiz');
        return c.method === 'GET' ? resposta({ connected: false }) : resposta({ connection: { googleEmail: EMAIL } });
    };
    const conexao = a.conectar({ operacao: raiz });
    await a.inicioGIS.promise;
    a.autorizar();
    assert.equal((await conexao).connectedNow, true);
    assert.deepEqual(a.chamadas.map((c) => c.rota), ['gcal/connection', 'auth/connection', 'gcal/exchange', 'auth/exchange']);
    assert.ok(a.chamadasApi.every((c) => c.opts.operacao === raiz));
    assert.ok(a.chamadasApi.every((c) => copiar(c.opts.statusEsperados).includes(404)));
    assert.equal(raiz.falha, false);
    await a.contexto.finalizarOperacao(raiz);
    for (const modo of ['500', 'timeout', 'JSON']) {
        const b = await ambiente(t);
        b.responder = (c) => {
            if (c.method === 'GET') return resposta({ connected: false });
            if (modo === '500') return resposta({ error: `${CODE} ${token(EMAIL)}` }, 500);
            if (modo === 'timeout') throw Object.assign(new Error(`Resposta perdida: ${CODE} ${token(EMAIL)}`), { code: 'TIMEOUT' });
            return { ok: true, status: 200, json: async () => { throw new Error(`JSON inválido: ${CODE}`); } };
        };
        const tentativa = b.conectar();
        const rejeicao = assert.rejects(tentativa, (erro) => {
            assert.equal(erro.message.includes(CODE), false, 'Chamador não pode persistir code pelo erro');
            assert.equal(erro.message.includes(token(EMAIL)), false);
            return true;
        });
        await b.inicioGIS.promise;
        b.autorizar();
        await rejeicao;
        assert.equal(b.postagens().length, 1, modo);
        assert.equal(b.contexto.semOperacoes(), true);
        assert.ok(b.contexto.obterPendencia(), modo);
        assert.equal(b.window.googleIdentity.getCachedCalendarConnectionStatus().connected, false);
        assert.doesNotMatch(b.metadados(), new RegExp(CODE));
        assert.equal(b.metadados().includes(token(EMAIL)), false);
        await assert.rejects(b.conectar(), /PENDENCIA_LOCAL/);
        assert.equal(b.postagens().length, 1, 'Sem replay por nova chamada');
    }
    for (const modo of ['500', 'timeout']) {
        const b = await ambiente(t);
        b.responder = () => {
            if (modo === 'timeout') throw new Error('Consulta sem resposta');
            return resposta({}, 500);
        };
        await assert.rejects(b.conectar());
        assert.equal(b.chamadas.length, 1, 'Erro de GET não autoriza fallback nem consentimento');
        assert.equal(b.pedidosGIS.length, 0);
        assert.equal(b.contexto.obterPendencia(), null);
    }
});

// Mutação O06: conferir apenas email (sem geração) ou eliminar guarda após GIS.
testar('O06 — resposta GIS de A após A→B→A não envia code e preserva a pendência da tentativa antiga', async (t) => {
    const a = await ambiente(t);
    const contextoAntigo = a.contexto.capturar();
    const conexao = a.conectar();
    const rejeicao = assert.rejects(conexao, /CONTEXTO_OBSOLETO/);
    await a.inicioGIS.promise;
    const pendencia = copiar(a.contexto.obterPendencia());
    a.trocar('bia@example.com');
    assert.equal(a.contexto.obterPendencia(), null);
    assert.equal(a.contexto.salvarPrincipal({ alunos: [], aulas: [], reposicoes: [], grade: {}, meta: 0 }), true);
    const cacheB = a.window.localStorage.getItem('personal_cache_dono');
    a.trocar(EMAIL);
    assert.equal(a.contexto.atual(contextoAntigo), false);
    a.autorizar();
    await rejeicao;
    assert.equal(a.postagens().length, 0);
    assert.equal(a.contexto.obterPendencia().tentativaId, pendencia.tentativaId);
    assert.equal(a.window.localStorage.getItem('personal_cache_dono'), cacheB);
    assert.equal(a.contexto.semOperacoes(), true);
    assert.equal(a.window.googleIdentity.getCachedCalendarConnectionStatus().connected, false);
    assert.doesNotMatch(a.metadados(), new RegExp(CODE));
    const b = await ambiente(t);
    const inicioCorpo = adiada();
    const corpo = adiada();
    b.responder = (c) => c.method === 'GET' ? resposta({ connected: false })
        : { ok: true, status: 200, json: () => { inicioCorpo.resolver(); return corpo.promise; } };
    const exchange = b.conectar();
    const descartado = assert.rejects(exchange, /CONTEXTO_OBSOLETO/);
    await b.inicioGIS.promise;
    b.autorizar();
    await inicioCorpo.promise;
    b.trocar('bia@example.com');
    const cacheConexao = b.window.localStorage.getItem('gcal_connection_cache');
    corpo.resolver({ connection: { googleEmail: EMAIL } });
    await descartado;
    assert.equal(b.postagens().length, 1);
    assert.equal(b.contexto.obterPendencia(), null);
    assert.equal(b.window.localStorage.getItem('gcal_connection_cache'), cacheConexao, 'Corpo de A não atualiza conexão em B');
    assert.equal(b.window.googleIdentity.getCachedCalendarConnectionStatus().connected, false);
});