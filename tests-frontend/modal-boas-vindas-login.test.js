const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');

function token(email) {
    return `cabecalho.${Buffer.from(JSON.stringify({ email, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.assinatura-sintetica`;
}

function carregarAmbiente(opcoes = {}) {
    const {
        isSignedIn = false,
        dismissed = false
    } = opcoes;

    const html = `<!doctype html>
<html>
<head></head>
<body>
    <header>
        <span class="header-readonly-pill" id="headerReadonlyPill" role="button" tabindex="0">Modo leitura</span>
        <button id="custom-google-login" type="button">Login</button>
        <div id="googleSignedOutState" class="header-session-state"></div>
        <div id="googleSignedInState" class="header-session-state" hidden></div>
        <div id="headerSessionAvatar"></div>
        <div id="rodapePublicoApresentacao"></div>
    </header>

    <main id="tela-home"></main>

    <!-- Modal Boas-Vindas / Login -->
    <div
      class="modal-overlay"
      id="modalBoasVindasLogin"
      role="dialog"
      aria-labelledby="tituloModalBoasVindasLogin"
      style="display: none"
    >
      <div class="modal modal-boas-vindas-login">
        <button id="btnCloseModalBoasVindas" class="btn-modal-close btn-modal-boas-vindas-close" type="button" aria-label="Fechar">
          <i class="fa-solid fa-times" aria-hidden="true"></i>
        </button>
        <div class="modal-boas-vindas-corpo">
          <div class="modal-boas-vindas-icone">
            <i class="fa-solid fa-dumbbell" aria-hidden="true"></i>
          </div>
          <h2 id="tituloModalBoasVindasLogin" class="modal-title modal-boas-vindas-titulo">Bem-vindo ao Personal Josy</h2>
          <p class="modal-boas-vindas-descricao">
            Conecte sua conta Google para sincronizar suas aulas diretamente na sua agenda.
          </p>
          <div class="modal-boas-vindas-acoes">
            <button
              id="btnGoogleLoginModal"
              type="button"
              class="btn-google-custom btn-google-modal"
              aria-label="Entrar com Google"
            >
              <span>Entrar com Google</span>
            </button>
            <button
              id="btnDispensarModalLogin"
              type="button"
              class="btn-modo-leitura-modal"
            >
              Continuar no modo leitura
            </button>
          </div>
        </div>
      </div>
    </div>
</body>
</html>`;

    const dom = new JSDOM(html, { url: 'http://localhost', runScripts: 'outside-only' });
    const { window } = dom;

    require('./setup/contexto-dados')(dom);

    if (dismissed) {
        window.sessionStorage.setItem('personal_welcome_login_dismissed', 'true');
    }

    let interactiveSignInChamado = 0;
    let gisCallback = null;

    window.APP_API_CONFIG = { apiBaseUrl: 'http://api.test/api', apiRootUrl: 'http://api.test' };
    window.__appGoogleConfig = {
        clientId: 'test-client-id.apps.googleusercontent.com'
    };

    window.google = {
        accounts: {
            id: {
                initialize: (cfg) => {
                    if (cfg && cfg.callback) {
                        gisCallback = cfg.callback;
                    }
                },
                prompt: () => {
                    interactiveSignInChamado++;
                },
                disableAutoSelect: () => {}
            },
            oauth2: {
                initCodeClient: () => ({ requestCode: () => {} })
            }
        }
    };

    // DialogController mock
    const stack = [];
    window.DialogController = {
        open: (elemento, config = {}) => {
            elemento.style.display = 'flex';
            stack.push(elemento);
            elemento._onRequestClose = config.onRequestClose;
        },
        close: (elemento) => {
            const idx = stack.indexOf(elemento);
            if (idx !== -1) stack.splice(idx, 1);
            elemento.style.display = 'none';
        },
        getStack: () => stack
    };

    if (isSignedIn) {
        const email = 'josy@example.com';
        window.localStorage.setItem('gis_profile_cache', JSON.stringify({ email, name: 'Josy' }));
        window.localStorage.setItem('gis_session_cache', JSON.stringify({
            idToken: token(email),
            email,
            expiraEm: Date.now() + 3600000
        }));
    }

    // Carregar google-identity.js
    const caminhoScript = path.resolve(RAIZ, 'assets/js/auth/google-identity.js');
    vm.runInContext(fs.readFileSync(caminhoScript, 'utf8'), dom.getInternalVMContext(), { filename: caminhoScript });

    return {
        dom,
        window,
        getGisCallback: () => gisCallback,
        getInteractiveSignInChamado: () => interactiveSignInChamado
    };
}

test('modal boas-vindas: abre automaticamente na inicialização quando não logado e não dispensado', async (t) => {
    const { dom, window } = carregarAmbiente({ isSignedIn: false, dismissed: false });
    t.after(() => dom.window.close());

    await window.googleIdentity.initialize();

    const modal = window.document.getElementById('modalBoasVindasLogin');
    assert.equal(modal.style.display, 'flex');
});

test('modal boas-vindas: não abre automaticamente se já foi dispensado na sessão', async (t) => {
    const { dom, window } = carregarAmbiente({ isSignedIn: false, dismissed: true });
    t.after(() => dom.window.close());

    await window.googleIdentity.initialize();

    const modal = window.document.getElementById('modalBoasVindasLogin');
    assert.equal(modal.style.display, 'none');
});

test('modal boas-vindas: não abre automaticamente se usuário já estiver logado', async (t) => {
    const { dom, window } = carregarAmbiente({ isSignedIn: true, dismissed: false });
    t.after(() => dom.window.close());

    await window.googleIdentity.initialize();

    const modal = window.document.getElementById('modalBoasVindasLogin');
    assert.equal(modal.style.display, 'none');
});

test('modal boas-vindas: botão Continuar no modo leitura fecha o modal e persiste no sessionStorage', async (t) => {
    const { dom, window } = carregarAmbiente({ isSignedIn: false, dismissed: false });
    t.after(() => dom.window.close());

    await window.googleIdentity.initialize();

    const modal = window.document.getElementById('modalBoasVindasLogin');
    assert.equal(modal.style.display, 'flex');

    const btnDispensar = window.document.getElementById('btnDispensarModalLogin');
    btnDispensar.click();

    assert.equal(modal.style.display, 'none');
    assert.equal(window.sessionStorage.getItem('personal_welcome_login_dismissed'), 'true');
});

test('modal boas-vindas: botão fechar (X) fecha o modal e persiste no sessionStorage', async (t) => {
    const { dom, window } = carregarAmbiente({ isSignedIn: false, dismissed: false });
    t.after(() => dom.window.close());

    await window.googleIdentity.initialize();

    const modal = window.document.getElementById('modalBoasVindasLogin');
    assert.equal(modal.style.display, 'flex');

    const btnClose = window.document.getElementById('btnCloseModalBoasVindas');
    btnClose.click();

    assert.equal(modal.style.display, 'none');
    assert.equal(window.sessionStorage.getItem('personal_welcome_login_dismissed'), 'true');
});

test('modal boas-vindas: clicar na pílula do header reabre o modal de login', async (t) => {
    const { dom, window } = carregarAmbiente({ isSignedIn: false, dismissed: true });
    t.after(() => dom.window.close());

    await window.googleIdentity.initialize();

    const modal = window.document.getElementById('modalBoasVindasLogin');
    assert.equal(modal.style.display, 'none');

    const pill = window.document.getElementById('headerReadonlyPill');
    pill.click();

    assert.equal(modal.style.display, 'flex');
});

test('modal boas-vindas: botão Entrar com Google fecha modal e inicia login interativo', async (t) => {
    const { dom, window, getInteractiveSignInChamado } = carregarAmbiente({ isSignedIn: false, dismissed: false });
    t.after(() => dom.window.close());

    await window.googleIdentity.initialize();

    const modal = window.document.getElementById('modalBoasVindasLogin');
    assert.equal(modal.style.display, 'flex');

    const antes = getInteractiveSignInChamado();
    const btnGoogle = window.document.getElementById('btnGoogleLoginModal');
    btnGoogle.click();

    assert.equal(modal.style.display, 'none');
    assert.equal(getInteractiveSignInChamado(), antes + 1);
});

test('modal boas-vindas: signOut limpa a dispensa do sessionStorage', async (t) => {
    const { dom, window } = carregarAmbiente({ isSignedIn: true, dismissed: true });
    t.after(() => dom.window.close());

    await window.googleIdentity.initialize();
    window.sessionStorage.setItem('personal_welcome_login_dismissed', 'true');

    window.googleIdentity.signOut();

    assert.equal(window.sessionStorage.getItem('personal_welcome_login_dismissed'), null);
});

test('modal boas-vindas: login bem-sucedido fecha o modal automaticamente', async (t) => {
    const { dom, window, getGisCallback } = carregarAmbiente({ isSignedIn: false, dismissed: false });
    t.after(() => dom.window.close());

    await window.googleIdentity.initialize();

    const modal = window.document.getElementById('modalBoasVindasLogin');
    assert.equal(modal.style.display, 'flex');

    const cb = getGisCallback();
    assert.ok(typeof cb === 'function', 'GIS callback deve ter sido registrado');

    cb({ credential: token('logado@example.com') });

    assert.equal(window.googleIdentity.isSignedIn(), true);
    assert.equal(modal.style.display, 'none');
});

test('mock runtime (desconectado): Continuar no modo leitura fecha o modal e persiste no sessionStorage', async (t) => {
    const html = `<!doctype html>
<html>
<body>
    <header>
        <span class="header-readonly-pill" id="headerReadonlyPill" role="button" tabindex="0">Modo leitura</span>
        <button id="custom-google-login" type="button">Login</button>
        <div id="googleSignedOutState" class="header-session-state"></div>
        <div id="googleSignedInState" class="header-session-state" hidden></div>
        <div id="headerSessionAvatar"></div>
    </header>

    <div
      class="modal-overlay"
      id="modalBoasVindasLogin"
      role="dialog"
      aria-labelledby="tituloModalBoasVindasLogin"
      style="display: none"
    >
      <div class="modal modal-boas-vindas-login">
        <button id="btnCloseModalBoasVindas" class="btn-modal-close" type="button">X</button>
        <button id="btnGoogleLoginModal" type="button">Login Google</button>
        <button id="btnDispensarModalLogin" type="button">Continuar no modo leitura</button>
      </div>
    </div>
</body>
</html>`;

    const dom = new JSDOM(html, {
        url: 'http://127.0.0.2:5500/index.html?mockScenario=desconectado',
        runScripts: 'outside-only'
    });
    t.after(() => dom.window.close());
    const { window } = dom;

    window.Response = Response;
    window.Request = Request;
    window.Headers = Headers;
    window.AbortController = AbortController;
    window.fetch = async () => new Response('{}');
    window.console = { info() {}, warn() {}, error() {} };

    const carregar = (arquivo) => {
        vm.runInContext(fs.readFileSync(path.join(RAIZ, arquivo), 'utf8'), dom.getInternalVMContext(), { filename: arquivo });
    };

    carregar('mocks/ui-runtime/sandbox.js');
    carregar('mocks/ui-runtime/scenarios.js');
    carregar('mocks/ui-runtime/mock-runtime.js');

    await window.googleIdentity.initialize();

    const modal = window.document.getElementById('modalBoasVindasLogin');
    assert.equal(modal.style.display, 'flex', 'modal deve abrir no cenário desconectado');

    const btnDispensar = window.document.getElementById('btnDispensarModalLogin');
    btnDispensar.click();

    assert.equal(modal.style.display, 'none', 'modal deve fechar ao clicar em modo leitura');
    assert.equal(window.sessionStorage.getItem('personal_welcome_login_dismissed'), 'true');

    // Reabertura pela pílula
    const pill = window.document.getElementById('headerReadonlyPill');
    pill.click();
    assert.equal(modal.style.display, 'flex', 'modal deve reabrir ao clicar na pílula');

    // Login com Google pelo modal
    const btnGoogle = window.document.getElementById('btnGoogleLoginModal');
    btnGoogle.click();
    assert.equal(modal.style.display, 'none', 'modal deve fechar ao logar');
    assert.equal(window.googleIdentity.isSignedIn(), true, 'usuário deve estar logado no mock');
});
