// [TAG-TESTS-ALUNOS-BUSCA-WHATSAPP] view-alunos-busca-whatsapp.test.js
// T06 (plano 2026-10-27): busca por nome (item 1.7) e atalho de WhatsApp
// (item 1.4) na tela de Alunos. Cobre os helpers puros de alunos-helpers.js e o
// render real de view-alunos.js em jsdom: filtro, estado vazio da busca, termo
// preservado em re-render otimista e presença/ausência do link wa.me no card.

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const helpers = require('../backend/shared/reposicao-flow-helpers');

const RAIZ = path.resolve(__dirname, '..');
const CAMINHO_HELPERS = path.join(RAIZ, 'assets', 'js', 'alunos-helpers.js');
const CAMINHO_VIEW_ALUNOS = path.join(RAIZ, 'assets', 'js', 'view-alunos.js');
const CAMINHO_INDEX = path.join(RAIZ, 'index.html');

function criarJanelaHelpers() {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
        runScripts: 'outside-only',
        url: 'http://localhost',
    });
    vm.runInContext(fs.readFileSync(CAMINHO_HELPERS, 'utf8'), dom.getInternalVMContext(), {
        filename: CAMINHO_HELPERS,
    });
    return dom;
}

function aluno(overrides = {}) {
    return {
        id: 'aluno-1',
        nome: 'Ana Paula',
        local: 'Studio',
        telefone: '(11) 98765-4321',
        observacoes: '',
        objetivo: 'Personal Trainer',
        frequenciaSemanal: 2,
        status: 'ativo',
        preco: 100,
        diaVencimento: 10,
        metodoCobranca: 'por_aula',
        ...overrides,
    };
}

function criarTela(alunos) {
    const dom = new JSDOM(`<!doctype html><html><body>
        <div class="alunos-busca"><input type="search" id="buscaAlunos" /></div>
        <div id="listaAlunos"></div>
        <form id="formNovoAluno"><input id="alunoIdEdicao"><input id="alunoNome"><input id="alunoLocal"><input id="alunoPreco"><input id="alunoTelefone"><textarea id="alunoObservacoes"></textarea><input id="alunoFrequenciaSemanal"><input id="alunoFechamentoMesCheio" type="checkbox"><input id="alunoDiaVencimento"><select id="alunoMetodoCobranca"><option value="por_aula">Por aula</option></select><input id="alunoValorFixoCiclo"><input id="alunoObjetivoSwitch" type="checkbox"><input id="alunoStatusSwitch" type="checkbox"></form>
        <div id="modalFormAluno"></div><input id="btnExcluirAlunoModal">
    </body></html>`, { runScripts: 'outside-only', url: 'http://localhost' });
    const { window } = dom;
    require('./setup/contexto-dados')(dom);
    window.alunos = alunos;
    window.aulas = [];
    window.aulasParaRepor = [];
    window.reposicaoFlowHelpers = helpers;
    window.formatarMoedaFinanceira = (valor) => `R$ ${Number(valor || 0).toFixed(2)}`;
    window.apiFetchBackend = async () => ({ ok: true, json: async () => [] });
    window.APP_API_CONFIG = { apiBaseUrl: 'http://api.test' };
    window.garantirDadosFinancas = async () => ({});
    window.mostrarToast = () => {};
    window.atualizarDashboardStats = () => {};
    window.preencherFiltrosAlunos = () => {};
    window.salvarDados = async () => ({ ok: true });
    window.normalizarNumeroFinanceiro = (valor) => Number(valor) || 0;
    window.montarCorObjetivoTangerina = () => ({ nome: 'Tangerina', hex: '#f90' });
    window.log = { info() {}, debug() {}, warn() {}, error() {} };
    vm.runInContext(fs.readFileSync(CAMINHO_HELPERS, 'utf8'), dom.getInternalVMContext(), {
        filename: CAMINHO_HELPERS,
    });
    vm.runInContext(fs.readFileSync(CAMINHO_VIEW_ALUNOS, 'utf8'), dom.getInternalVMContext(), {
        filename: CAMINHO_VIEW_ALUNOS,
    });
    window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
    return { dom, window };
}

function nomesRenderizados(window) {
    return Array.from(window.document.querySelectorAll('.aluno-card .aluno-card-nome'))
        .map((el) => el.textContent.trim());
}

function digitarBusca(window, termo) {
    const campo = window.document.getElementById('buscaAlunos');
    campo.value = termo;
    campo.dispatchEvent(new window.Event('input', { bubbles: true }));
}

// ── Helpers puros ───────────────────────────────────────────────────────────

test('T06 — normalizarTelefoneWhatsApp aceita 10/11 dígitos e prefixa o DDI 55', (t) => {
    const dom = criarJanelaHelpers();
    t.after(() => dom.window.close());
    const { normalizarTelefoneWhatsApp } = dom.window;

    assert.equal(normalizarTelefoneWhatsApp('(11) 98765-4321'), '5511987654321');
    assert.equal(normalizarTelefoneWhatsApp('11 98765-4321'), '5511987654321');
    assert.equal(normalizarTelefoneWhatsApp('1132654321'), '551132654321');
    assert.equal(normalizarTelefoneWhatsApp(' 11 3265-4321 '), '551132654321');
});

test('T06 — normalizarTelefoneWhatsApp mantém números que já vêm com o DDI 55', (t) => {
    const dom = criarJanelaHelpers();
    t.after(() => dom.window.close());
    const { normalizarTelefoneWhatsApp } = dom.window;

    assert.equal(normalizarTelefoneWhatsApp('5511987654321'), '5511987654321');
    assert.equal(normalizarTelefoneWhatsApp('+55 11 98765-4321'), '5511987654321');
    assert.equal(normalizarTelefoneWhatsApp('551132654321'), '551132654321');
});

test('T06 — normalizarTelefoneWhatsApp rejeita vazio, curto, longo e DDI estrangeiro', (t) => {
    const dom = criarJanelaHelpers();
    t.after(() => dom.window.close());
    const { normalizarTelefoneWhatsApp } = dom.window;

    assert.equal(normalizarTelefoneWhatsApp(''), null);
    assert.equal(normalizarTelefoneWhatsApp(null), null);
    assert.equal(normalizarTelefoneWhatsApp(undefined), null);
    assert.equal(normalizarTelefoneWhatsApp('sem telefone'), null);
    assert.equal(normalizarTelefoneWhatsApp('119876543'), null, '9 dígitos não é telefone válido');
    assert.equal(normalizarTelefoneWhatsApp('119876543210'), null, '12 dígitos sem 55 não é válido');
    assert.equal(normalizarTelefoneWhatsApp('4411987654321'), null, 'DDI estrangeiro não é válido');
    assert.equal(normalizarTelefoneWhatsApp('55119876543210'), null, '55 + 12 dígitos não é válido');
});

test('T06 — montarLinkWhatsApp devolve a URL wa.me ou null', (t) => {
    const dom = criarJanelaHelpers();
    t.after(() => dom.window.close());
    const { montarLinkWhatsApp } = dom.window;

    assert.equal(montarLinkWhatsApp('(11) 98765-4321'), 'https://wa.me/5511987654321');
    assert.equal(montarLinkWhatsApp(''), null);
    assert.equal(montarLinkWhatsApp('123'), null);
});

test('T06 — normalizarTextoBuscaAluno ignora caixa, acentos e espaços extras', (t) => {
    const dom = criarJanelaHelpers();
    t.after(() => dom.window.close());
    const { normalizarTextoBuscaAluno } = dom.window;

    assert.equal(normalizarTextoBuscaAluno('Ana Paula'), 'ana paula');
    assert.equal(normalizarTextoBuscaAluno('JOSÉ  Antônio'), 'jose antonio');
    assert.equal(normalizarTextoBuscaAluno('  Conceição  '), 'conceicao');
    assert.equal(normalizarTextoBuscaAluno('João'), normalizarTextoBuscaAluno('  JOAO '));
    assert.equal(normalizarTextoBuscaAluno(null), '');
    assert.equal(normalizarTextoBuscaAluno(undefined), '');
});

// ── Render: busca ───────────────────────────────────────────────────────────

test('T06 — a busca filtra a lista por nome sem perder o termo digitado', (t) => {
    const { dom, window } = criarTela([
        aluno({ id: 'a1', nome: 'Ana Paula' }),
        aluno({ id: 'a2', nome: 'Bruno Lima' }),
        aluno({ id: 'a3', nome: 'Ana Clara' }),
    ]);
    t.after(() => dom.window.close());

    window.renderizarListaAlunos();
    assert.deepEqual(nomesRenderizados(window), ['Ana Paula', 'Bruno Lima', 'Ana Clara']);

    digitarBusca(window, 'ana');

    assert.deepEqual(nomesRenderizados(window), ['Ana Paula', 'Ana Clara']);
    assert.equal(window.document.getElementById('buscaAlunos').value, 'ana', 'termo continua no campo');
});

test('T06 — a busca ignora acentos e caixa do nome cadastrado', (t) => {
    const { dom, window } = criarTela([aluno({ id: 'a1', nome: 'Conceição Araújo', telefone: '' })]);
    t.after(() => dom.window.close());

    window.renderizarListaAlunos();
    digitarBusca(window, 'CONCEICAO');

    assert.deepEqual(nomesRenderizados(window), ['Conceição Araújo']);
});

test('T06 — busca sem resultado mostra estado vazio claro e não o vazio de cadastro', (t) => {
    const { dom, window } = criarTela([aluno({ id: 'a1', nome: 'Ana Paula' })]);
    t.after(() => dom.window.close());

    window.renderizarListaAlunos();
    digitarBusca(window, 'Zeca');

    const lista = window.document.getElementById('listaAlunos');
    assert.equal(nomesRenderizados(window).length, 0, 'nenhum card renderizado');
    assert.match(lista.textContent, /Nenhum aluno encontrado para “Zeca”\./);
    assert.doesNotMatch(lista.textContent, /Nenhum aluno cadastrado/, 'não confunde busca vazia com cadastro vazio');
});

test('T06 — limpar a busca devolve a lista completa', (t) => {
    const { dom, window } = criarTela([
        aluno({ id: 'a1', nome: 'Ana Paula' }),
        aluno({ id: 'a2', nome: 'Bruno Lima' }),
    ]);
    t.after(() => dom.window.close());

    window.renderizarListaAlunos();
    digitarBusca(window, 'bruno');
    assert.deepEqual(nomesRenderizados(window), ['Bruno Lima']);

    digitarBusca(window, '');
    assert.deepEqual(nomesRenderizados(window), ['Ana Paula', 'Bruno Lima']);
});

test('T06 — o termo da busca sobrevive a um re-render otimista da lista', (t) => {
    const alunos = [aluno({ id: 'a1', nome: 'Ana Paula' }), aluno({ id: 'a2', nome: 'Bruno Lima' })];
    const { dom, window } = criarTela(alunos);
    t.after(() => dom.window.close());

    window.renderizarListaAlunos();
    digitarBusca(window, 'ana');
    assert.deepEqual(nomesRenderizados(window), ['Ana Paula']);

    // Mutação otimista de aluno: novo cadastro entra na lista e força re-render.
    // window.alunos é o mesmo array que o script lê como `alunos`.
    window.alunos.push(aluno({ id: 'a3', nome: 'Ana Beatriz' }));
    window.invalidarChaveRenderAlunos();
    window.renderizarListaAlunos();

    assert.equal(window.document.getElementById('buscaAlunos').value, 'ana', 'campo mantém o termo');
    assert.deepEqual(nomesRenderizados(window), ['Ana Paula', 'Ana Beatriz'], 'filtro continua aplicado');
});

// ── Render: atalho WhatsApp ─────────────────────────────────────────────────

test('T06 — aluno com telefone válido exibe o atalho wa.me com destino seguro', (t) => {
    const { dom, window } = criarTela([aluno({ id: 'a1', nome: 'Ana Paula', telefone: '(11) 98765-4321' })]);
    t.after(() => dom.window.close());

    window.renderizarListaAlunos();
    const link = window.document.querySelector('.aluno-card-whatsapp');

    assert.ok(link, 'atalho presente no card');
    assert.equal(link.getAttribute('href'), 'https://wa.me/5511987654321');
    assert.equal(link.getAttribute('target'), '_blank');
    assert.equal(link.getAttribute('rel'), 'noopener noreferrer');
    assert.equal(link.getAttribute('aria-label'), 'Abrir WhatsApp de Ana Paula');
    assert.ok(link.querySelector('.fa-whatsapp'), 'ícone de WhatsApp aplicado');
});

test('T06 — aluno sem telefone ou com número inválido não exibe atalho', (t) => {
    const { dom, window } = criarTela([
        aluno({ id: 'a1', nome: 'Sem Telefone', telefone: '' }),
        aluno({ id: 'a2', nome: 'Numero Curto', telefone: '11987654' }),
        aluno({ id: 'a3', nome: 'Com Telefone', telefone: '11 3265-4321' }),
    ]);
    t.after(() => dom.window.close());

    window.renderizarListaAlunos();

    const cards = Array.from(window.document.querySelectorAll('.aluno-card'));
    assert.equal(cards[0].querySelector('.aluno-card-whatsapp'), null, 'sem telefone não gera atalho');
    assert.equal(cards[1].querySelector('.aluno-card-whatsapp'), null, 'telefone inválido não gera atalho');
    assert.equal(
        cards[2].querySelector('.aluno-card-whatsapp').getAttribute('href'),
        'https://wa.me/551132654321',
        'telefone fixo válido gera atalho',
    );
});

test('T06 — o atalho do WhatsApp fica no bloco de ações que isola o clique do card', (t) => {
    const { dom, window } = criarTela([aluno({ id: 'a1', nome: 'Ana Paula', telefone: '(11) 98765-4321' })]);
    t.after(() => dom.window.close());

    window.renderizarListaAlunos();
    // jsdom em 'outside-only' não compila atributos onclick, então o contrato é
    // verificado no markup: o clique não pode chegar ao onClick do card.
    const link = window.document.querySelector('.aluno-card-whatsapp');
    assert.match(link.getAttribute('onclick') || '', /stopPropagation/, 'o próprio link barra a propagação');
    assert.match(
        link.parentElement.getAttribute('onclick') || '',
        /stopPropagation/,
        'o atalho mora no bloco de ações, que já isola o clique do card',
    );
    assert.equal(link.parentElement.querySelector('.aluno-card-editar') !== null, true, 'mesmo bloco do botão de editar');
});

// ── Contrato do index.html ──────────────────────────────────────────────────

test('T06 — o index.html entrega o campo de busca ligado à lista de alunos', (t) => {
    const dom = new JSDOM(fs.readFileSync(CAMINHO_INDEX, 'utf8'));
    t.after(() => dom.window.close());
    const { document } = dom.window;

    const campo = document.getElementById('buscaAlunos');
    const telaAlunos = document.getElementById('tela-alunos');
    const lista = document.getElementById('listaAlunos');

    assert.ok(campo, 'campo #buscaAlunos existe');
    assert.equal(campo.getAttribute('type'), 'search');
    assert.ok(campo.getAttribute('aria-label'), 'campo tem rótulo acessível');
    assert.ok(telaAlunos.contains(campo), 'campo mora na tela de Alunos');
    assert.ok(campo.compareDocumentPosition(lista) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING, 'campo vem antes da lista');
});

test('T06 — o campo de busca fica no cabeçalho fixo, logo abaixo do título da tela', (t) => {
    const dom = new JSDOM(fs.readFileSync(CAMINHO_INDEX, 'utf8'));
    t.after(() => dom.window.close());
    const { document } = dom.window;

    const campo = document.getElementById('buscaAlunos');
    const topo = document.querySelector('#tela-alunos .topo-tela');
    const titulo = topo.querySelector('.topo-tela-titulo');
    const conteudo = campo.closest('.topo-tela-conteudo');
    const lista = document.getElementById('listaAlunos');

    assert.ok(topo.contains(campo), 'campo dentro do .topo-tela (que é position: sticky)');
    assert.ok(conteudo, 'campo dentro do bloco de conteúdo do topo, alinhado ao título');
    assert.ok(
        titulo.compareDocumentPosition(campo) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING,
        'campo vem depois do título "Seus Alunos"',
    );
    assert.equal(topo.contains(lista), false, 'a lista não pode ficar presa ao topo (topos-telas)');
    assert.equal(lista.closest('.topo-tela'), null);
    assert.ok(
        campo.compareDocumentPosition(lista) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING,
        'campo continua antes da lista',
    );
});
