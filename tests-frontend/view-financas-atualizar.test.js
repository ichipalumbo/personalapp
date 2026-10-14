// T06 (D6=A, plano 2026-10-13; roadmap 1.11) — botão "Atualizar" no cabeçalho de
// Finanças: dispara carregarFinancas({ forcarRemoto: true }) — nova leitura remota
// na mesma sessão (sem reload), sem escrita, com falha exposta mesmo com cache
// em tela e bloqueio de cliques repetidos durante o voo.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const DIR_ASSETS = path.resolve(__dirname, '..', 'assets', 'js');
function lerArquivo(nome) {
    return fs.readFileSync(path.join(DIR_ASSETS, nome), 'utf8');
}

function criarResposta(status, corpo) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => corpo,
    };
}

function esperar(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function criarCard(valor) {
    return {
        alunoId: 'aluno-1',
        aluno: { id: 'aluno-1', nome: 'Ana' },
        configuracaoPendente: false,
        historicoDisponivel: false,
        cicloAtual: {
            _id: 'ciclo-atual',
            cicloInicio: '2026-09-01',
            cicloFim: '2026-09-30',
            aulasContadas: 4,
            aulasManuaisExtras: 0,
            valorTotalCiclo: valor,
            metodoCobranca: 'por_aula',
            status: 'em_aberto',
            dataPagamento: null,
        },
    };
}

async function carregarAmbiente() {
    const dom = new JSDOM(
        '<!doctype html><html><body><div class="container"><main id="tela-alunos"></main><div class="toast" id="toast"></div></div></body></html>',
        { runScripts: 'outside-only', url: 'http://localhost' },
    );
    const { window } = dom;
    require('./setup/contexto-dados')(dom);

    window.APP_API_CONFIG = { apiBaseUrl: 'http://api.test', apiRootUrl: 'http://api.test' };
    // O storage.js dispara um ping fire-and-forget ao ser carregado; jsdom não tem fetch.
    window.fetch = async () => criarResposta(200, {});

    let cacheLocal = null;
    window.obterCacheFinancas = () => cacheLocal;
    window.salvarCacheFinancas = (dados) => {
        cacheLocal = { atualizadoEm: new Date().toISOString(), dados };
    };
    window.formatarMoeda = (valor) => `R$ ${Number(valor).toFixed(2)}`;

    vm.runInContext(lerArquivo('utils-ui.js'), dom.getInternalVMContext());
    vm.runInContext(lerArquivo('storage.js'), dom.getInternalVMContext());
    vm.runInContext(lerArquivo('view-financas.js'), dom.getInternalVMContext());

    // Registra toda chamada de rede da tela (método + URL) para provar
    // leitura-única e ausência de escrita.
    const chamadas = [];
    function instalarFetch(resposta) {
        window.apiFetchBackend = async (url, init) => {
            chamadas.push({ url: String(url), metodo: (init && init.method) || 'GET' });
            return typeof resposta === 'function' ? resposta(chamadas.length) : resposta;
        };
    }

    return { dom, window, chamadas, instalarFetch };
}

function clicarAtualizar(window) {
    const botao = window.document.getElementById('financasAtualizar');
    assert.ok(botao, 'o botão "Atualizar" precisa existir no cabeçalho');
    assert.equal(botao.textContent.trim(), 'Atualizar');
    botao.dispatchEvent(new window.Event('click', { bubbles: true }));
    return botao;
}

test('T06 — "Atualizar" força leitura remota e expõe falha mesmo com cache; sucesso restaura sem reload', async (t) => {
    const { dom, window, chamadas, instalarFetch } = await carregarAmbiente();
    t.after(() => dom.window.close());

    // 1º load ok → tela populada e cache gravado (dados visíveis).
    instalarFetch(criarResposta(200, [criarCard(400)]));
    await window.inicializarFinancas({});
    await esperar(40);
    assert.equal(chamadas.length, 1, 'carga inicial faz uma leitura');
    assert.ok(window.document.querySelector('[data-financas-card-id="aluno-1"]'));

    // Clique com falha: cache existe, mas o modo forçado expõe o erro no cabeçalho.
    instalarFetch(criarResposta(500, { erro: 'boom' }));
    clicarAtualizar(window);
    await esperar(60);
    assert.equal(chamadas.length, 2, 'o clique força nova leitura remota mesmo com cache válido');
    assert.match(
        window.document.getElementById('financasSyncState').textContent,
        /Não foi possível atualizar agora\./,
        'com forcarRemoto a falha é exposta (não fica restrita ao cache silencioso)',
    );
    assert.ok(
        window.document.querySelector('[data-financas-card-id="aluno-1"]'),
        'a falha preserva o conteúdo que estava em tela (sem skeleton preso)',
    );

    // Clique com sucesso: conteúdo atualiza na mesma sessão, sem reload.
    instalarFetch(criarResposta(200, [criarCard(500)]));
    clicarAtualizar(window);
    await esperar(60);
    assert.equal(chamadas.length, 3);
    assert.match(window.document.getElementById('financasConteudo').textContent, /R\$ 500\.00/, 'conteúdo veio da nova leitura');
    assert.equal(window.document.getElementById('financasSyncState').textContent, '');
    assert.match(window.document.getElementById('financasCacheLabel').textContent, /Cache atualizado em/);

    // Nenhuma escrita: todas as chamadas foram GET /financas.
    chamadas.forEach((chamada) => {
        assert.equal(chamada.metodo, 'GET', 'o botão nunca dispara escrita');
        assert.match(chamada.url, /\/financas$/);
    });
});

test('T06 — clique repetido durante o voo não gera leitura extra e o botão fica bloqueado', async (t) => {
    const { dom, window, chamadas, instalarFetch } = await carregarAmbiente();
    t.after(() => dom.window.close());

    instalarFetch(criarResposta(200, [criarCard(400)]));
    await window.inicializarFinancas({});
    await esperar(40);
    assert.equal(chamadas.length, 1);

    // Leitura em voo controlada por este teste.
    let liberar;
    instalarFetch(() => new Promise((resolver) => { liberar = () => resolver(criarResposta(200, [criarCard(400)])); }));

    const botao = clicarAtualizar(window);
    await esperar(20);
    assert.equal(botao.disabled, true, 'o botão bloqueia durante a leitura');

    // Clique repetido com a UI reabilitada à força (simula estado atrasado): o
    // guard do handler — não só o `disabled` — precisa barrar a leitura concorrente.
    botao.disabled = false;
    botao.dispatchEvent(new window.Event('click', { bubbles: true }));
    await esperar(20);
    assert.equal(chamadas.length, 2, 'nenhuma leitura concorrente extra');

    liberar();
    await esperar(80);
    assert.equal(botao.disabled, false, 'ao terminar, o botão volta a aceitar clique');
    assert.equal(chamadas.length, 2);
});

test('T06 — estado de erro sem cache: "Atualizar" restaura a tela na mesma sessão', async (t) => {
    const { dom, window, chamadas, instalarFetch } = await carregarAmbiente();
    t.after(() => dom.window.close());

    // Carga inicial falha sem cache → vazio com mensagem de erro (F6 reproduzido).
    instalarFetch(criarResposta(500, { erro: 'boom' }));
    await window.inicializarFinancas({});
    await esperar(60);
    assert.match(window.document.getElementById('financasConteudo').textContent, /Não foi possível atualizar agora\./);

    // Sem reload: a resposta volta a funcionar e o botão restaura a tela.
    instalarFetch(criarResposta(200, [criarCard(400)]));
    clicarAtualizar(window);
    await esperar(60);
    assert.ok(window.document.querySelector('[data-financas-card-id="aluno-1"]'), 'tela restaurada sem recarregar a página');
    assert.equal(window.document.getElementById('financasSyncState').textContent, '');
    assert.equal(chamadas.length, 2);
});
