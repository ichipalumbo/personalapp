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

const barreira = () => new Promise((resolver) => setImmediate(resolver));
function respostaAdiada() {
    let resolver;
    const promise = new Promise((resolve) => { resolver = resolve; });
    return { promise, resolver };
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

test('A1 — falha após lista vazia confirmada remove skeleton e preserva o vazio', async (t) => {
    const { dom, window, instalarFetch } = await carregarAmbiente();
    t.after(() => dom.window.close());
    instalarFetch(criarResposta(200, []));
    await window.inicializarFinancas({});
    assert.match(window.document.getElementById('financasConteudo').textContent, /Nenhum aluno para exibir/);

    instalarFetch(criarResposta(500, {}));
    clicarAtualizar(window);
    await barreira();
    assert.equal(window.document.querySelectorAll('#financasConteudo .skeleton').length, 0);
    assert.match(window.document.getElementById('financasConteudo').textContent, /Nenhum aluno para exibir/);
    assert.match(window.document.getElementById('financasSyncState').textContent, /Não foi possível atualizar agora/);
    assert.equal(window.document.getElementById('financasAtualizar').disabled, false);
});

test('A2 — formulário invalida a resposta, mas o término libera o voo e permite novo clique', async (t) => {
    const { dom, window, chamadas, instalarFetch } = await carregarAmbiente();
    t.after(() => dom.window.close());
    instalarFetch(criarResposta(200, [criarCard(400)]));
    await window.inicializarFinancas({});
    const adiada = respostaAdiada();
    t.after(() => adiada.resolver(criarResposta(200, [])));
    instalarFetch(() => adiada.promise);
    clicarAtualizar(window);
    window.contextoDados.definirFormulario('grade-horaria', true);
    adiada.resolver(criarResposta(200, [criarCard(999)]));
    await barreira();

    assert.equal(window.__financasState.carregando, false, 'fim do voo não depende de aplicar a resposta');
    assert.equal(window.__financasState.cards[0].cicloAtual.valorTotalCiclo, 400, 'resposta obsoleta não aplicada');
    assert.equal(window.document.getElementById('financasConteudo').getAttribute('aria-busy'), 'false');
    assert.equal(window.document.querySelectorAll('#financasConteudo .skeleton').length, 0);
    assert.equal(window.document.getElementById('financasSyncState').textContent, '');
    assert.equal(window.document.getElementById('financasAtualizar').disabled, true, 'formulário ainda bloqueia a consulta');

    window.contextoDados.definirFormulario('grade-horaria', false);
    assert.equal(window.document.getElementById('financasAtualizar').disabled, false);
    instalarFetch(criarResposta(200, [criarCard(500)]));
    clicarAtualizar(window);
    await barreira();
    assert.equal(chamadas.length, 3, 'somente o clique novo inicia a releitura');
    assert.equal(window.__financasState.cards[0].cicloAtual.valorTotalCiclo, 500);
});

test('A2 — término de voo substituído não limpa o indicador nem aplica dados sobre o voo mais novo', async (t) => {
    const { dom, window, instalarFetch } = await carregarAmbiente();
    t.after(() => dom.window.close());
    instalarFetch(criarResposta(200, [criarCard(400)]));
    await window.inicializarFinancas({});
    const antiga = respostaAdiada();
    const nova = respostaAdiada();
    t.after(() => { antiga.resolver(criarResposta(200, [])); nova.resolver(criarResposta(200, [])); });
    instalarFetch(() => antiga.promise);
    clicarAtualizar(window);
    window.contextoDados.definirFormulario('grade-horaria', true);
    window.contextoDados.definirFormulario('grade-horaria', false);
    instalarFetch(() => nova.promise);
    const leituraNova = window.atualizarFinancasAposSync();
    antiga.resolver(criarResposta(200, [criarCard(999)]));
    await barreira();
    assert.equal(window.__financasState.carregando, true);
    assert.equal(window.document.getElementById('financasAtualizar').disabled, true);
    assert.equal(window.document.getElementById('financasConteudo').getAttribute('aria-busy'), 'true');
    assert.equal(window.__financasState.cards[0].cicloAtual.valorTotalCiclo, 400);
    window.contextoDados.definirFormulario('nova-interacao', true);
    nova.resolver(criarResposta(200, [criarCard(500)]));
    assert.equal(await leituraNova, false);
    assert.equal(window.__financasState.carregando, false, 'também limpa o voo mais novo quando invalidado');
    assert.equal(window.__financasState.cards[0].cicloAtual.valorTotalCiclo, 400);
    window.contextoDados.definirFormulario('nova-interacao', false);
    instalarFetch(criarResposta(200, [criarCard(500)]));
    clicarAtualizar(window);
    await barreira();
    assert.equal(window.__financasState.cards[0].cicloAtual.valorTotalCiclo, 500);
    assert.equal(window.document.getElementById('financasAtualizar').disabled, false);
});

test('A2 — resposta de conta antiga não limpa nem substitui a leitura da conta nova', async (t) => {
    const { dom, window, instalarFetch } = await carregarAmbiente();
    t.after(() => dom.window.close());
    instalarFetch(criarResposta(200, [criarCard(400)]));
    await window.inicializarFinancas({});
    const antiga = respostaAdiada();
    const nova = respostaAdiada();
    t.after(() => { antiga.resolver(criarResposta(200, [])); nova.resolver(criarResposta(200, [])); });
    instalarFetch(() => antiga.promise);
    clicarAtualizar(window);
    window.googleIdentity.getOwnerEmail = () => 'conta-nova@example.com';
    window.contextoDados.capturar();
    instalarFetch(() => nova.promise);
    const leituraNova = window.inicializarFinancas({ forcarRemoto: true });
    antiga.resolver(criarResposta(200, [criarCard(999)]));
    await barreira();
    assert.equal(window.__financasState.cards.length, 0);
    assert.equal(window.__financasState.carregando, true);
    assert.equal(window.document.getElementById('financasAtualizar').disabled, true);
    window.contextoDados.definirFormulario('formulario-conta-nova', true);
    nova.resolver(criarResposta(200, [criarCard(500)]));
    assert.equal(await leituraNova, false);
    assert.equal(window.__financasState.carregando, false);
    assert.equal(window.__financasState.cards.length, 0);
    window.contextoDados.definirFormulario('formulario-conta-nova', false);
    instalarFetch(criarResposta(200, [criarCard(500)]));
    clicarAtualizar(window);
    await barreira();
    assert.equal(window.__financasState.cards[0].cicloAtual.valorTotalCiclo, 500);
});

test('A3 — botão Atualizar tem alvo mínimo de 44 px sem alterar os botões globais', async (t) => {
    const { dom, window, instalarFetch } = await carregarAmbiente();
    t.after(() => dom.window.close());
    instalarFetch(criarResposta(200, []));
    await window.inicializarFinancas({});
    assert.equal(window.document.getElementById('financasAtualizar').style.minHeight, '44px');
});

test('A4 — atualização devolve foco ao disparador após sucesso ou falha sem rolar a tela', async (t) => {
    const { dom, window, instalarFetch } = await carregarAmbiente();
    t.after(() => dom.window.close());
    instalarFetch(criarResposta(200, [criarCard(400)]));
    await window.inicializarFinancas({});
    for (const status of [200, 500]) {
        const adiada = respostaAdiada();
        t.after(() => adiada.resolver(criarResposta(200, [])));
        instalarFetch(() => adiada.promise);
        const botao = window.document.getElementById('financasAtualizar');
        botao.focus();
        clicarAtualizar(window);
        // Chromium desfoca o botão disabled; blur() no disabled é inócuo no jsdom.
        window.document.body.tabIndex = -1;
        window.document.body.focus();
        assert.equal(window.document.activeElement, window.document.body);
        let opcoesFoco;
        const focar = botao.focus.bind(botao);
        botao.focus = (opcoes) => { opcoesFoco = opcoes; focar(opcoes); };
        adiada.resolver(criarResposta(status, status === 200 ? [criarCard(500)] : {}));
        await barreira();
        botao.focus = focar;
        assert.equal(window.document.activeElement, botao);
        assert.equal(opcoesFoco.preventScroll, true);
    }
});

test('A4 — não rouba foco quando o usuário muda de alvo durante a atualização', async (t) => {
    const { dom, window, instalarFetch } = await carregarAmbiente();
    t.after(() => dom.window.close());
    instalarFetch(criarResposta(200, [criarCard(400)]));
    await window.inicializarFinancas({});
    const disparador = window.document.getElementById('financasAtualizar');
    disparador.focus();
    clicarAtualizar(window);
    window.document.body.tabIndex = -1;
    window.document.body.focus();
    await barreira();
    assert.equal(window.document.activeElement, disparador, 'controle positivo: restaura quando não há nova intenção');
    const adiada = respostaAdiada();
    t.after(() => adiada.resolver(criarResposta(200, [])));
    instalarFetch(() => adiada.promise);
    const outroBotao = window.document.createElement('button');
    window.document.body.appendChild(outroBotao);
    const botao = window.document.getElementById('financasAtualizar');
    botao.focus();
    clicarAtualizar(window);
    outroBotao.focus();
    outroBotao.blur(); // Mesmo de volta ao BODY, uma intenção nova não é apagada.
    adiada.resolver(criarResposta(200, [criarCard(500)]));
    await barreira();
    assert.equal(window.document.activeElement, window.document.body);
});

test('R1 — pendência bloqueia o botão, orienta recuperação e só libera após resolução explícita', async (t) => {
    const { dom, window, chamadas, instalarFetch } = await carregarAmbiente();
    t.after(() => dom.window.close());
    instalarFetch(criarResposta(200, [criarCard(400)]));
    await window.inicializarFinancas({});
    const op = window.contextoDados.iniciarOperacao({ tipo: 'ajuste-financeiro' });
    window.contextoDados.marcarFalhaOperacao(op, new Error('Resposta não confirmada'));
    await window.contextoDados.finalizarOperacao(op);
    const pendencia = window.contextoDados.obterPendencia();
    const botao = window.document.getElementById('financasAtualizar');
    assert.equal(botao.disabled, true);
    assert.equal(window.document.getElementById('financasAtualizarOrientacao').hidden, false);
    assert.match(window.document.getElementById('financasAtualizarOrientacao').textContent, /área de recuperação/);
    assert.equal(botao.getAttribute('aria-describedby'), 'financasAtualizarOrientacao');
    let recuperacoes = 0;
    window.abrirRecuperacaoDados = () => { recuperacoes++; };
    clicarAtualizar(window); // clique sintético precisa respeitar a mesma proteção.
    await barreira();
    assert.equal(chamadas.length, 1);
    assert.equal(recuperacoes, 1);
    assert.equal(window.contextoDados.obterPendencia().tentativaId, pendencia.tentativaId);

    // Simula o término explícito da recuperação, não uma ação do botão Atualizar.
    window.contextoDados.abandonarPendencia(pendencia.tentativaId, window.contextoDados.capturar());
    window.contextoDados.definirFormulario('recuperacao', false);
    assert.equal(botao.disabled, false);
    assert.equal(window.document.getElementById('financasAtualizarOrientacao').hidden, true);
    assert.equal(botao.hasAttribute('aria-describedby'), false, 'sem pendência, não anuncia orientação de recuperação');
    clicarAtualizar(window);
    await barreira();
    assert.equal(chamadas.length, 2);
    assert.ok(chamadas.every((chamada) => chamada.metodo === 'GET'));
});
