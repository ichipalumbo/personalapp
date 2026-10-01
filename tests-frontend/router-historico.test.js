// Etapa 7 (Cartão D — achado 4.17.6): a tela ativa passou a ser refletida na
// URL pelo fragmento (#tela-financas), para que recarregar a página e os
// botões Voltar/Avançar do navegador funcionem. Antes, a tela ativa vivia só
// em memória e o reload sempre voltava para a Home.
//
// Este teste trava: a tela inicial lida da URL, o boot que substitui em vez de
// empilhar, o clique que empilha, e a mudança de URL por fora (Voltar) que
// navega SEM reescrever a URL — se reescrevesse, o Voltar do navegador ficaria
// preso num pingue-pongue.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const CAMINHO_ROUTER = path.resolve(__dirname, '..', 'assets', 'js', 'app', 'router.js');

const HTML = `<!doctype html><html><body>
    <main>
        <section id="tela-home" class="view-section"></section>
        <section id="tela-financas" class="view-section" style="display:none"></section>
        <section id="tela-alunos" class="view-section" style="display:none"></section>
    </main>
    <nav class="nav-inferior">
        <a class="nav-link-inferior" data-target="tela-home" href="#tela-home">Início</a>
        <a class="nav-link-inferior" data-target="tela-financas" href="#tela-financas">Finanças</a>
        <a class="nav-link-inferior" data-target="tela-alunos" href="#tela-alunos">Alunos</a>
    </nav>
</body></html>`;

function criarAmbiente(url) {
    const dom = new JSDOM(HTML, { url, runScripts: 'outside-only' });
    const { window } = dom;

    window.scrollTo = () => {};

    // Registra as escritas na URL. O original é preservado para que a hash
    // continue sendo atualizada de verdade no ambiente (senão os asserts sobre
    // location.hash não estariam medindo o app real).
    const escritas = [];
    const originalPush = window.history.pushState;
    const originalReplace = window.history.replaceState;
    window.history.pushState = function (...args) {
        escritas.push({ metodo: 'pushState', url: args[2] });
        return originalPush.apply(window.history, args);
    };
    window.history.replaceState = function (...args) {
        escritas.push({ metodo: 'replaceState', url: args[2] });
        return originalReplace.apply(window.history, args);
    };

    window.inicializarHome = async function () {};
    window.inicializarFinancas = async function () {};
    window.inicializarAlunos = async function () {};
    window.trocarFABNovoHome = function () {};

    vm.runInContext(fs.readFileSync(CAMINHO_ROUTER, 'utf8'), dom.getInternalVMContext(), { filename: CAMINHO_ROUTER });
    const router = window.__appRouter.createRouter();
    router.bindNavigation();

    // Simula a mudança de URL por fora da navegação (Voltar/Avançar do
    // navegador ou edição da barra de endereços) de forma determinística, sem
    // depender de o jsdom emitir 'hashchange' sozinho. Usa o método original,
    // não o instrumentado: a mudança é do navegador, não do app, e não pode ser
    // contada como escrita do app.
    const mudarUrlPorFora = (hash) => {
        originalReplace.call(window.history, null, '', hash);
        window.dispatchEvent(new window.Event('hashchange'));
    };

    const aguardar = () => new Promise((resolver) => setImmediate(resolver));

    const visivel = (id) => window.document.getElementById(id).style.display;

    return { dom, window, router, escritas, mudarUrlPorFora, aguardar, visivel };
}

test('a tela inicial vem da URL quando a hash aponta para uma tela conhecida', (t) => {
    const { dom, router } = criarAmbiente('http://localhost/#tela-financas');
    t.after(() => dom.window.close());

    assert.equal(router.getTelaInicial(), 'tela-financas');
});

test('a tela inicial cai na padrão quando não há hash, a hash é desconhecida ou é malformada', (t) => {
    for (const url of ['http://localhost/', 'http://localhost/#lixo', 'http://localhost/#%E0%A4%A']) {
        const { dom, router } = criarAmbiente(url);
        t.after(() => dom.window.close());

        assert.equal(router.getTelaInicial(), 'tela-home', `URL sem tela conhecida: ${url}`);
    }
});

test('o boot substitui a entrada do histórico e abre a tela que veio na URL', async (t) => {
    const { dom, router, escritas, visivel } = criarAmbiente('http://localhost/#tela-financas');
    t.after(() => dom.window.close());

    await router.navigateTo(router.getTelaInicial());

    assert.equal(router.getCurrentViewId(), 'tela-financas');
    assert.equal(visivel('tela-financas'), 'block');
    assert.equal(visivel('tela-home'), 'none');
    // A hash já era a da tela: nada a escrever.
    assert.deepEqual(escritas, []);

    const outro = criarAmbiente('http://localhost/');
    t.after(() => outro.dom.window.close());
    await outro.router.navigateTo(outro.router.getTelaInicial());

    assert.deepEqual(
        outro.escritas,
        [{ metodo: 'replaceState', url: '#tela-home' }],
        'o boot não pode empilhar entrada: Voltar deve sair do app, não voltar a uma tela não visitada'
    );
});

test('clicar na navegação empilha a tela na URL', async (t) => {
    const { dom, window, router, escritas, aguardar } = criarAmbiente('http://localhost/');
    t.after(() => dom.window.close());

    await router.navigateTo(router.getTelaInicial());
    escritas.length = 0;

    window.document.querySelector('[data-target="tela-financas"]').click();
    await aguardar();
    await aguardar();

    const empilhados = escritas.filter((e) => e.metodo === 'pushState');
    assert.deepEqual(empilhados, [{ metodo: 'pushState', url: '#tela-financas' }]);
    assert.equal(window.location.hash, '#tela-financas');
    assert.equal(router.getCurrentViewId(), 'tela-financas');
});

test('mudança de URL por fora navega sem reescrever a URL', async (t) => {
    const { dom, router, escritas, mudarUrlPorFora, aguardar, visivel } = criarAmbiente('http://localhost/#tela-financas');
    t.after(() => dom.window.close());

    await router.navigateTo(router.getTelaInicial());
    escritas.length = 0;

    mudarUrlPorFora('#tela-home');
    await aguardar();

    assert.equal(router.getCurrentViewId(), 'tela-home');
    assert.equal(visivel('tela-home'), 'block');
    assert.deepEqual(escritas, [], 'navegar pelo Voltar não pode escrever na URL');
});

test('hash inválida durante a sessão realinha a URL sem trocar de tela', async (t) => {
    const { dom, router, escritas, mudarUrlPorFora, aguardar, visivel } = criarAmbiente('http://localhost/');
    t.after(() => dom.window.close());

    await router.navigateTo('tela-financas');
    escritas.length = 0;

    mudarUrlPorFora('#lixo');
    await aguardar();

    assert.equal(router.getCurrentViewId(), 'tela-financas');
    assert.equal(visivel('tela-financas'), 'block');
    assert.deepEqual(escritas, [{ metodo: 'replaceState', url: '#tela-financas' }]);
});

test('navegar para um id que não é tela é ignorado', async (t) => {
    const { dom, router, escritas, visivel } = criarAmbiente('http://localhost/');
    t.after(() => dom.window.close());

    await router.navigateTo('tela-home');
    escritas.length = 0;

    await router.navigateTo('tela-inexistente');

    assert.equal(router.getCurrentViewId(), 'tela-home');
    assert.equal(visivel('tela-home'), 'block');
    assert.deepEqual(escritas, []);
});
