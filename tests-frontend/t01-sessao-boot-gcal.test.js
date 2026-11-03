const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');

function carregar(dom, arquivo) {
    vm.runInContext(
        fs.readFileSync(path.join(RAIZ, arquivo), 'utf8'),
        dom.getInternalVMContext(),
        { filename: arquivo }
    );
}

function criarJwtSintetico(payload) {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${header}.${body}.assinatura-sintetica`;
}

function drenarEventos() {
    return new Promise((resolve) => setTimeout(resolve, 15));
}

function configurarMockGIS(window) {
    window.__appGoogleConfig = { clientId: 'test-client-id.apps.googleusercontent.com' };
    window.google = {
        accounts: {
            id: {
                initialize() {},
                prompt() {},
                disableAutoSelect() {}
            },
            oauth2: {
                initCodeClient: () => ({ requestCode() {} })
            }
        }
    };
}

test('T01-01 — Risco 1.3: gis_profile_cache da conta A com JWT válido da conta B em gis_session_cache deriva perfil de B e nunca mistura identidades', async (t) => {
    const dom = new JSDOM(`<!doctype html><html><body>
        <div id="googleSignedOutState"></div>
        <div id="googleSignedInState" hidden></div>
        <div id="headerSessionAvatar"></div>
    </body></html>`, { url: 'http://localhost', runScripts: 'outside-only' });
    t.after(() => dom.window.close());

    const { window } = dom;
    window.console = { info() {}, warn() {}, error() {} };
    window.APP_API_CONFIG = { apiBaseUrl: 'http://api.test/api', apiRootUrl: 'http://api.test' };
    configurarMockGIS(window);

    const expSec = Math.floor(Date.now() / 1000) + 3600;
    const tokenBia = criarJwtSintetico({
        email: 'bia@example.com',
        name: 'Bia Certa',
        picture: 'https://example.com/bia.png',
        sub: 'sub-bia-123',
        exp: expSec
    });

    // Simula divergência: perfil antigo da conta A, mas sessão válida da conta B
    window.localStorage.setItem('gis_profile_cache', JSON.stringify({
        email: 'ana@example.com',
        name: 'Ana Residual',
        picture: 'https://example.com/ana.png',
        sub: 'sub-ana-999'
    }));
    window.localStorage.setItem('gis_session_cache', JSON.stringify({
        idToken: tokenBia,
        expiraEm: expSec * 1000
    }));

    carregar(dom, 'assets/js/state.js');
    carregar(dom, 'assets/js/app-shell/contexto-dados.js');
    carregar(dom, 'assets/js/auth/google-identity.js');

    await window.googleIdentity.initialize();

    assert.equal(window.googleIdentity.isSignedIn(), true);
    assert.equal(window.googleIdentity.getOwnerEmail(), 'bia@example.com');
    assert.equal(window.googleIdentity.getIdToken(), tokenBia);

    const perfil = JSON.parse(JSON.stringify(window.googleIdentity.getProfile()));
    assert.deepEqual(perfil, {
        name: 'Bia Certa',
        email: 'bia@example.com',
        picture: 'https://example.com/bia.png',
        sub: 'sub-bia-123'
    });

    const perfilPersistido = JSON.parse(window.localStorage.getItem('gis_profile_cache'));
    assert.equal(perfilPersistido.email, 'bia@example.com');
    assert.equal(perfilPersistido.name, 'Bia Certa');

    const avatarImg = window.document.querySelector('#headerSessionAvatar img');
    assert.ok(avatarImg);
    assert.equal(avatarImg.getAttribute('src'), 'https://example.com/bia.png');
});

test('T01-02 — Risco 1.3: gis_session_cache ausente ou expirado limpa gis_profile_cache residual e não mantém perfil órfão', async (t) => {
    for (const modo of ['ausente', 'expirado']) {
        const dom = new JSDOM(`<!doctype html><html><body>
            <div id="googleSignedOutState"></div>
            <div id="googleSignedInState" hidden></div>
            <div id="headerSessionAvatar"></div>
        </body></html>`, { url: 'http://localhost', runScripts: 'outside-only' });
        t.after(() => dom.window.close());

        const { window } = dom;
        window.console = { info() {}, warn() {}, error() {} };
        window.APP_API_CONFIG = { apiBaseUrl: 'http://api.test/api', apiRootUrl: 'http://api.test' };
        configurarMockGIS(window);

        window.localStorage.setItem('gis_profile_cache', JSON.stringify({
            email: 'ana@example.com',
            name: 'Ana Residual'
        }));

        if (modo === 'expirado') {
            const expPassado = Math.floor(Date.now() / 1000) - 600;
            const tokenExpirado = criarJwtSintetico({
                email: 'ana@example.com',
                name: 'Ana Residual',
                exp: expPassado
            });
            window.localStorage.setItem('gis_session_cache', JSON.stringify({
                idToken: tokenExpirado,
                expiraEm: expPassado * 1000,
                email: 'ana@example.com'
            }));
        }

        carregar(dom, 'assets/js/state.js');
        carregar(dom, 'assets/js/app-shell/contexto-dados.js');
        carregar(dom, 'assets/js/auth/google-identity.js');

        await window.googleIdentity.initialize();

        assert.equal(window.googleIdentity.isSignedIn(), false, `modo=${modo}`);
        assert.equal(window.googleIdentity.getOwnerEmail(), null, `modo=${modo}`);
        assert.equal(window.googleIdentity.getProfile(), null, `modo=${modo}`);
        assert.equal(window.localStorage.getItem('gis_profile_cache'), null, `modo=${modo} deve limpar gis_profile_cache`);
        assert.equal(window.localStorage.getItem('gis_session_cache'), null, `modo=${modo} deve limpar gis_session_cache`);
    }
});

function criarAmbienteBootGCal(t, opcoes = {}) {
    const dom = new JSDOM(`<!doctype html><html><body><div class="container">
        <nav class="nav-inferior">
            <a class="nav-link-inferior" data-target="tela-home"></a>
            <a class="nav-link-inferior" data-target="tela-alunos"></a>
            <a class="nav-link-inferior" data-target="tela-financas"></a>
        </nav>
        <main class="view-section" id="tela-home"><div id="homeDayPanel"></div><div id="calendarioSemanalHomeGrid"></div></main>
        <main class="view-section" id="tela-alunos"><div id="listaAlunos"></div></main>
        <main class="view-section" id="tela-financas"></main>
        <span id="headerCacheState" hidden>Sincronizando dados...</span>
        <button id="btnSyncBanco"><span id="btnSyncBancoText">Sincronizar Dados</span></button>
    </div></body></html>`, { url: 'http://localhost/index.html#tela-home', runScripts: 'outside-only' });

    const w = dom.window;
    let email = opcoes.emailInicial !== undefined ? opcoes.emailInicial : 'josy@example.com';
    let token = email ? 'token-valido' : null;
    const listeners = new Set();
    const frames = [];
    const chamadasSyncAuto = [];
    const chamadasRenovarCanal = [];

    Object.defineProperty(w.navigator, 'onLine', { get: () => true });
    w.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
    w.Headers = Headers;
    w.AbortController = AbortController;
    w.APP_API_CONFIG = { apiBaseUrl: 'http://api.test/api', apiRootUrl: 'http://api.test' };
    w.log = new Proxy({}, { get: () => () => {} });
    w.mostrarToast = () => {};
    w.scrollTo = () => {};

    w.googleIdentity = {
        getOwnerEmail: () => email,
        getIdToken: () => token,
        isSignedIn: () => Boolean(email && token),
        addAuthChangeListener: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
        initialize: () => {
            if (typeof opcoes.aoInicializarIdentidade === 'function') {
                opcoes.aoInicializarIdentidade({
                    definirSessao: (novoEmail) => {
                        email = novoEmail;
                        token = novoEmail ? `token-${novoEmail}` : null;
                    }
                });
            }
        },
        whenReady: () => Promise.resolve()
    };

    w.gcal = {
        isSignedIn: () => Boolean(email && token)
    };
    w.iniciarSyncGoogleCalendarAutomatica = async () => {
        chamadasSyncAuto.push(email);
        return { connected: true };
    };
    w.renovarCanalGoogleCalendar = async () => {
        chamadasRenovarCanal.push(email);
        return { renewed: false, reason: 'channel_valid' };
    };

    w.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => []
    });

    [
        'assets/js/state.js',
        'assets/js/app-shell/contexto-dados.js',
        'assets/js/storage.js',
        'assets/js/view-home.js',
        'assets/js/view-financas.js',
        'assets/js/view-alunos.js'
    ].forEach((arquivo) => carregar(dom, arquivo));

    w.renderizarHomeSemana = () => {};
    w.renderizarHomeDia = () => {};
    w.atualizarDashboardStats = () => {};
    w.trocarFABNovoHome = () => {};
    w.inicializarMultiSelectPills = () => {};
    w.semanaReferencia = new w.Date('2026-10-05T12:00:00');
    w.contextoDados.iniciar();

    [
        'assets/js/app-shell/coordenador-sync-boot.js',
        'assets/js/app-shell/router.js',
        'assets/js/app-shell/bootstrap.js'
    ].forEach((arquivo) => carregar(dom, arquivo));

    t.after(async () => {
        if (w.syncBootDados && typeof w.syncBootDados.parar === 'function') {
            w.syncBootDados.parar();
        }
        await drenarEventos();
        dom.window.close();
    });

    return {
        w,
        chamadasSyncAuto,
        chamadasRenovarCanal,
        iniciar: () => w.__appBootstrap.initialize(),
        pintar: async () => {
            const fns = frames.splice(0);
            fns.forEach((fn) => fn());
            await drenarEventos();
        },
        emitirAuthChange: async (novoEmail) => {
            email = novoEmail;
            token = novoEmail ? `token-${novoEmail}` : null;
            await Promise.all([...listeners].map((fn) => fn({ ownerEmail: email })));
            await drenarEventos();
        }
    };
}

test('T01-03 — Item 2.2: boot autenticado (mesmo restaurando no initialize e reemitindo auth-change para mesma conta) dispara status e webhook/renew apenas 1 vez', async (t) => {
    // Simula comportamento real: antes de googleIdentity.initialize(), getOwnerEmail() é null;
    // googleIdentity.initialize() restaura do cache ('josy@example.com') e depois o GIS emite auth-change para a mesma conta.
    const a = criarAmbienteBootGCal(t, {
        emailInicial: null,
        aoInicializarIdentidade: ({ definirSessao }) => {
            definirSessao('josy@example.com');
        }
    });

    await a.iniciar();
    await a.pintar();

    // GIS emite evento tardio para a mesma conta já ativa no boot
    await a.emitirAuthChange('josy@example.com');

    assert.deepEqual(a.chamadasSyncAuto, ['josy@example.com']);
    assert.deepEqual(a.chamadasRenovarCanal, ['josy@example.com']);
});

test('T01-04 — Item 2.2: sessão restaurada após whenReady dispara status e webhook/renew 1 vez, e troca de conta A -> B reexecuta para B', async (t) => {
    const a = criarAmbienteBootGCal(t, { emailInicial: null });

    await a.iniciar();
    await a.pintar();

    assert.deepEqual(a.chamadasSyncAuto, []);
    assert.deepEqual(a.chamadasRenovarCanal, []);

    // Restauração tardia da conta A após whenReady
    await a.emitirAuthChange('ana@example.com');
    assert.deepEqual(a.chamadasSyncAuto, ['ana@example.com']);
    assert.deepEqual(a.chamadasRenovarCanal, ['ana@example.com']);

    // Troca para a conta B
    await a.emitirAuthChange('bia@example.com');
    assert.deepEqual(a.chamadasSyncAuto, ['ana@example.com', 'bia@example.com']);
    assert.deepEqual(a.chamadasRenovarCanal, ['ana@example.com', 'bia@example.com']);
});
