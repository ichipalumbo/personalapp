// Bug (achado do dono, 2026-09-30): ao trocar de Home para Finanças, o FAB
// "Novo agendamento" da Home (#fabNovoHome) persistia sobre a Finanças até o
// fetch da tela terminar. Causa: o router só chamava trocarFABNovoHome() DEPOIS
// do await do initializer da tela destino (assets/js/app/router.js).
// Este teste trava a ordem: o FAB é tratado/removido assim que a Home sai de
// tela, independentemente do carregamento do destino.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const CAMINHO_ROUTER = path.resolve(__dirname, '..', 'assets', 'js', 'app', 'router.js');

function criarAmbiente() {
    const dom = new JSDOM(`<!doctype html><html><body>
        <main>
            <section id="tela-home" class="view-section"></section>
            <section id="tela-financas" class="view-section" style="display:none"></section>
        </main>
        <nav class="nav-inferior">
            <a class="nav-link-inferior" data-target="tela-home" href="#">Início</a>
            <a class="nav-link-inferior" data-target="tela-financas" href="#">Finanças</a>
        </nav>
        <!-- FAB criado pela Home; vive no body, fora da view-section -->
        <button id="fabNovoHome" class="btn-weekly-add fab-novo-home">+</button>
    </body></html>`, { url: 'http://localhost', runScripts: 'outside-only' });
    const { window } = dom;

    const eventos = [];
    let liberarCarregamentoFinancas = null;

    window.scrollTo = () => {};
    // Espelho fiel do comportamento real em view-home.js: enquanto a Home não
    // estiver em tela, o FAB sai do DOM; em tela, é criado/recuperado.
    window.trocarFABNovoHome = function () {
        eventos.push('trocarFABNovoHome');
        const fab = window.document.getElementById('fabNovoHome');
        const homeVisivel = window.document.getElementById('tela-home').style.display !== 'none';
        if (!homeVisivel && fab) fab.remove();
    };
    window.inicializarHome = async function () {
        eventos.push('inicializarHome');
    };
    window.inicializarFinancas = async function () {
        eventos.push('inicializarFinancas:inicio');
        // Porta controlada = o fetch /financas em rede lenta: a remoção do
        // FAB NÃO pode depender desta promessa resolver.
        await new Promise((resolver) => { liberarCarregamentoFinancas = resolver; });
        eventos.push('inicializarFinancas:fim');
    };

    vm.runInContext(fs.readFileSync(CAMINHO_ROUTER, 'utf8'), dom.getInternalVMContext(), { filename: CAMINHO_ROUTER });
    const router = window.__appRouter.createRouter();
    router.bindNavigation();

    const microtarefas = () => new Promise((resolver) => setImmediate(resolver));
    // Retorna função (não a variável): a atribuição do resolver só existe
    // dentro do closure do initializer.
    const liberarCarregamentoTeste = () => {
        if (typeof liberarCarregamentoFinancas === 'function') liberarCarregamentoFinancas();
    };

    return { dom, window, eventos, liberarCarregamentoFinancas: liberarCarregamentoTeste, microtarefas };
}

test('router remove o FAB da Home assim que ela sai de tela, sem esperar o carregamento da tela destino', async (t) => {
    const { dom, window, eventos, liberarCarregamentoFinancas, microtarefas } = criarAmbiente();
    t.after(() => dom.window.close());

    window.document.querySelector('[data-target="tela-financas"]').click();
    await microtarefas();

    // O carregamento da Finanças está em andamento (porta ainda fechada);
    // neste instante o FAB já deve ter sido tratado e removido do body.
    assert.ok(eventos.includes('trocarFABNovoHome'), 'router chamou trocarFABNovoHome antes do init do destino terminar');
    assert.ok(!eventos.includes('inicializarFinancas:fim'), 'pré-condição: carregamento da Finanças ainda não terminou');
    assert.equal(window.document.getElementById('fabNovoHome'), null, 'FAB já removido do body durante o carregamento');

    liberarCarregamentoFinancas();
    await microtarefas();
    assert.ok(eventos.includes('inicializarFinancas:fim'), 'inicialização da Finanças concluiu normalmente após a liberação');
});
