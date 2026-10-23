// Topos compartilham o visual da Home. CSSOM/DOM protegem o contrato declarado;
// fixação durante a rolagem e aparência renderizada continuam validadas no mock.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
const CSS = fs.readFileSync(path.join(RAIZ, 'assets/css/style.css'), 'utf8');
const FINANCAS = path.join(RAIZ, 'assets/js/view-financas.js');

function coletarRegras(lista) {
    return Array.from(lista).flatMap((regra) => regra.selectorText
        ? [{ seletor: regra.selectorText.replace(/\/\*[\s\S]*?\*\//g, '').trim(), estilo: regra.style }]
        : regra.cssRules ? coletarRegras(regra.cssRules) : []);
}

function ambiente(t) {
    const dom = new JSDOM(HTML, { url: 'http://localhost', runScripts: 'outside-only' });
    t.after(() => dom.window.close());
    require('./setup/contexto-dados')(dom);
    const estilo = dom.window.document.createElement('style');
    estilo.textContent = CSS;
    dom.window.document.head.appendChild(estilo);
    vm.runInContext(fs.readFileSync(FINANCAS, 'utf8'), dom.getInternalVMContext(), { filename: FINANCAS });
    dom.window.renderizarFinancas();
    return { window: dom.window, doc: dom.window.document, regras: coletarRegras(estilo.sheet.cssRules) };
}

test('Home, Finanças e Alunos usam o mesmo topo e recuo sem incluir suas listas', (t) => {
    const { doc, window } = ambiente(t);
    const seletores = ['.home-weekly-topbar', '.financas-cabecalho', '.alunos-cabecalho'];
    const telas = ['tela-home', 'tela-financas', 'tela-alunos'];
    const listas = ['agendaPanelSemana', 'financasConteudo', 'listaAlunos'];
    const topos = seletores.map((seletor) => doc.querySelector(seletor));

    topos.forEach((topo, indice) => {
        assert.ok(topo, 'topo ausente: ' + telas[indice]);
        assert.equal(topo.parentElement.id, telas[indice]);
        assert.ok(topo.classList.contains('topo-tela'), telas[indice] + ' precisa do estilo compartilhado');
        assert.ok(topo.querySelector(':scope > .topo-tela-conteudo'), telas[indice] + ' precisa do recuo comum');
        assert.equal(topo.hasAttribute('style'), false, 'o topo não deve sobrescrever a aparência inline');
        assert.equal(topo.contains(doc.getElementById(listas[indice])), false, 'lista não pode ficar presa ao topo');
    });

    window.renderizarFinancas();
    seletores.forEach((seletor, indice) => assert.equal(doc.querySelector(seletor), topos[indice],
        'o render dos cards financeiros não recria os topos'));
});

test('aparência e sticky dos topos têm uma única fonte CSS, igual à referência da Home', (t) => {
    const { regras } = ambiente(t);
    const bases = regras.filter((regra) => regra.seletor === '.topo-tela');
    assert.equal(bases.length, 1);
    const esperado = {
        position: 'sticky', top: 'var(--header-height)', 'z-index': '10',
        display: 'flex', 'flex-direction': 'column', gap: '10px', margin: '0', padding: '12px',
        background: 'var(--cor-neutro-10-a92)', 'backdrop-filter': 'blur(18px)',
        'border-radius': '0 0 18px 18px',
        'border-bottom': '1px solid var(--cor-neutro-09)',
        'box-shadow': '0 12px 30px var(--cor-preto-a38)',
    };
    for (const [propriedade, valor] of Object.entries(esperado)) {
        // O CSSOM serializa comprimentos zero como 0px, inclusive nos shorthands.
        const normalizar = (texto) => texto.trim().replace(/\b0px\b/g, '0');
        assert.equal(normalizar(bases[0].estilo.getPropertyValue(propriedade)), normalizar(valor), propriedade);
    }
    const interiores = regras.filter((regra) => regra.seletor === '.topo-tela-conteudo');
    assert.equal(interiores.length, 1);
    assert.equal(interiores[0].estilo.getPropertyValue('padding'), '10px 8px 8px');
    assert.deepEqual(regras.filter((regra) => /\.(?:home-weekly-topbar|home-sticky-header|topbar-sem-cantos|financas-cabecalho|alunos-cabecalho)(?![\w-])/.test(regra.seletor)), [],
        'classes locais não podem manter estilos divergentes de superfície ou recuo');
});

test('Alunos tem título e subtexto no topo, preservando lista, cadastro e FAB fora dele', (t) => {
    const { doc } = ambiente(t);
    const topo = doc.querySelector('#tela-alunos .topo-tela');
    assert.ok(topo);
    const titulo = topo.querySelector('h2.topo-tela-titulo');
    assert.ok(titulo);
    assert.equal(titulo.textContent.trim(), 'Seus Alunos');
    assert.equal(titulo.querySelector('i').getAttribute('aria-hidden'), 'true');
    assert.equal(topo.querySelector('.topo-tela-descricao').textContent,
        'Cadastre alunos, edite seus dados e acompanhe as reposições.');
    const lista = doc.getElementById('listaAlunos');
    assert.ok(lista.parentElement.matches('.alunos-panel'));
    assert.equal(lista.parentElement.previousElementSibling, topo);
    assert.equal(lista.parentElement.querySelector('h2, h3'), null, 'não duplicar o título no painel da lista');
    const fab = doc.getElementById('btnFlutuanteAdicionar');
    assert.equal(fab.getAttribute('onclick'), 'abrirCadastroParaNovo()');
    assert.equal(fab.className, 'fab-adicionar');
    assert.equal(topo.contains(fab), false);
    assert.equal(topo.contains(doc.getElementById('modalFormAluno')), false);
});

test('topo financeiro conserva ação, cache e mensagens dentro do conteúdo compartilhado', (t) => {
    const { doc, window } = ambiente(t);
    const topo = doc.querySelector('.financas-cabecalho');
    const conteudo = topo.querySelector(':scope > .topo-tela-conteudo');
    assert.ok(conteudo);
    assert.ok(topo.classList.contains('topo-tela'));
    assert.equal(topo.classList.contains('agenda-panel'), false, 'não herdar margens e decoração dos painéis');
    assert.equal(topo.classList.contains('topbar-sem-cantos'), false);
    assert.ok(conteudo.querySelector('h2.topo-tela-titulo'));
    assert.ok(conteudo.querySelector('.topo-tela-descricao.financas-cabecalho-descricao'));
    for (const id of ['financasAtualizar', 'financasProgresso', 'financasCacheLabel', 'financasSyncState', 'financasAtualizarOrientacao']) {
        assert.ok(conteudo.contains(doc.getElementById(id)), id + ' deve ficar no conteúdo do topo');
    }
    assert.equal(doc.getElementById('financasAtualizar').getAttribute('aria-label'), 'Atualizar finanças');
    assert.equal(doc.getElementById('financasAtualizar').className, 'btn-icone');
    window.__financasState.erro = 'Não foi possível atualizar agora.';
    window.renderizarFinancas();
    const erro = doc.getElementById('financasSyncState');
    assert.equal(erro.hidden, false);
    assert.equal(erro.textContent, 'Não foi possível atualizar agora.');
    assert.equal(conteudo.contains(erro), true);
    assert.equal(topo.nextElementSibling.id, 'financasConteudo');
});

test('título e subtítulo financeiros ficam juntos à esquerda, sem depender da altura de Atualizar', (t) => {
    const { doc, window } = ambiente(t);
    const linha = doc.querySelector('.financas-cabecalho-linha');
    const textos = linha.querySelector(':scope > .financas-cabecalho-textos');
    const acoes = linha.querySelector(':scope > .financas-cabecalho-acoes');
    assert.ok(textos, 'título e subtítulo precisam de uma coluna própria');
    assert.ok(acoes);
    const titulo = textos.querySelector('h2');
    const subtitulo = textos.querySelector('.topo-tela-descricao');
    assert.ok(titulo);
    assert.equal(titulo.nextElementSibling, subtitulo);
    assert.equal(window.getComputedStyle(subtitulo).marginTop, '4px');
    assert.equal(window.getComputedStyle(linha).alignItems, 'flex-start');
    assert.equal(window.getComputedStyle(textos).minWidth, '0px');
    assert.equal(window.getComputedStyle(acoes).flexShrink, '0');
    const botao = doc.getElementById('financasAtualizar');
    assert.equal(acoes.contains(botao), true);
    assert.equal(window.getComputedStyle(botao).minHeight, '44px');
    assert.equal(window.getComputedStyle(botao).minWidth, '44px');

    window.__financasState.carregando = true;
    window.__financasState.atualizacaoManual = true;
    window.renderizarFinancas();
    const progresso = doc.getElementById('financasProgresso');
    assert.equal(progresso.hidden, false);
    assert.equal(progresso.textContent, 'Carregando...');
    assert.equal(progresso.parentElement, acoes);
    assert.equal(progresso.nextElementSibling, botao);
    assert.equal(titulo.parentElement, textos);
    assert.equal(subtitulo.parentElement, textos);
    assert.equal(botao.disabled, true);
});

test('listas de Alunos e Finanças não têm moldura e compartilham respiro de 12 px do topo', (t) => {
    const { doc, window, regras } = ambiente(t);
    const alunos = doc.getElementById('listaAlunos').parentElement;
    const financas = doc.getElementById('financasConteudo');
    const regra = regras.filter((item) => item.seletor === '.lista-tela');
    assert.equal(regra.length, 1, 'o espaçamento entre topo e lista precisa de uma fonte única');
    assert.equal(regra[0].estilo.getPropertyValue('padding-top'), '12px');
    assert.deepEqual(regras.filter((item) => /\.alunos-panel(?![\w-])/.test(item.seletor)), [],
        'a lista de Alunos não deve recuperar uma moldura particular');

    for (const lista of [alunos, financas]) {
        assert.ok(lista.classList.contains('lista-tela'), 'as duas listas precisam do mesmo respiro');
        assert.ok(lista.previousElementSibling.matches('.topo-tela'));
        const estilo = window.getComputedStyle(lista);
        assert.equal(estilo.paddingTop, '12px');
        assert.equal(estilo.paddingLeft, '0px', 'os cards ocupam a largura útil, sem recuo de painel');
        assert.equal(estilo.paddingRight, '0px');
        assert.equal(estilo.backgroundColor, 'rgba(0, 0, 0, 0)', 'fundo próprio fica somente nos cards');
        assert.equal(lista.hasAttribute('style'), false);
    }
});