// [TAG-TESTS-MODAL-ALUNO-ACOES-FIXAS] modal-aluno-acoes-fixas.test.js
// Ajuste pedido pelo dono (2026-11-03): a barra de ações do modal de cadastro/
// edição de aluno (Excluir / Cancelar / Salvar Aluno) fica fixa no rodapé do
// modal e acompanha a rolagem do formulário. jsdom não calcula layout, então o
// contrato é verificado no CSS real e na posição da barra dentro do form.

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');
const ler = (arquivo) => fs.readFileSync(path.join(RAIZ, arquivo), 'utf8');

// Corpo da regra CSS do seletor informado, sem casar seletores que só o contêm
// como prefixo (ex.: ".modal-alunos-acoes-x").
function corpoDaRegra(css, seletor) {
    const escapado = seletor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regra = new RegExp(`(?:^|\\n)[ \\t]*${escapado}\\s*\\{([^}]*)\\}`, 'm').exec(css);
    return regra ? regra[1] : null;
}

// Bloco @media que contém o marcador informado, delimitado por contagem de chaves.
function blocoMediaCom(css, marcador) {
    const posMarcador = css.indexOf(marcador);
    if (posMarcador === -1) return null;
    const posMedia = css.lastIndexOf('@media', posMarcador);
    if (posMedia === -1) return null;
    const abre = css.indexOf('{', posMedia);
    let profundidade = 0;
    for (let i = abre; i < css.length; i += 1) {
        if (css[i] === '{') profundidade += 1;
        if (css[i] === '}') {
            profundidade -= 1;
            if (profundidade === 0) return css.slice(abre + 1, i);
        }
    }
    return null;
}

test('ajuste — a barra de ações do modal de aluno é sticky no rodapé', (t) => {
    const css = ler('assets/css/style.css');
    const corpo = corpoDaRegra(css, '.modal-alunos-acoes');

    assert.ok(corpo, 'regra .modal-alunos-acoes precisa existir');
    assert.match(corpo, /position:\s*sticky/, 'a barra precisa ser sticky');
    assert.match(corpo, /bottom:\s*0/, 'a barra precisa colar no rodapé do modal');
    assert.match(corpo, /background:\s*var\(--cor-neutro-06\)/, 'fundo opaco para cobrir o conteúdo que rola por baixo');
    assert.match(corpo, /border-top:/, 'separador visual entre formulário e barra');
});

test('ajuste — o rodapé ocupa a borda do modal, sem faixa do fundo sobrando', (t) => {
    const css = ler('assets/css/style.css');
    const acoes = corpoDaRegra(css, '.modal-alunos-acoes');
    const modal = corpoDaRegra(css, '.modal-alunos-corpo');

    assert.ok(acoes, 'regra .modal-alunos-acoes precisa existir');
    assert.ok(modal, 'regra .modal-alunos-corpo precisa existir');
    // Sem padding inferior no modal, o fundo da barra alcança a borda; o respiro
    // que existia ali passou para dentro da própria barra.
    assert.match(
        modal,
        /padding:\s*24px 24px 0;/,
        'modal sem padding inferior, para a barra encostar na borda',
    );
    const respiro = /padding-bottom:\s*(\d+)px/.exec(acoes);
    assert.ok(respiro, 'barra precisa declarar o próprio respiro inferior');
    assert.ok(Number(respiro[1]) >= 16, 'respiro inferior da barra precisa cobrir o antigo padding do modal');
});

test('ajuste — o formulário do aluno desvia o foco da barra fixa ao rolar', (t) => {
    const css = ler('assets/css/style.css');
    const corpo = corpoDaRegra(css, '.form-aluno');

    assert.ok(corpo, 'regra .form-aluno precisa existir');
    assert.match(corpo, /overflow-y:\s*auto/, 'o form continua sendo o container que rola');
    assert.match(corpo, /scroll-padding-bottom:/, 'campo focado não pode parar atrás da barra fixa');
});

test('ajuste — a barra fica no fim do form, com as três ações do modal', (t) => {
    const dom = new JSDOM(ler('index.html'), { url: 'http://localhost' });
    t.after(() => dom.window.close());
    const { document } = dom.window;

    const form = document.getElementById('formNovoAluno');
    const barra = form.querySelector('.modal-alunos-acoes');

    assert.ok(barra, 'barra de ações dentro do form (o submit depende dele)');
    assert.equal(barra.parentElement, form, 'barra é filha direta do form que rola');
    assert.equal(barra.nextElementSibling, null, 'nada depois da barra, senão ela não cola no rodapé');
    assert.equal(barra.querySelector('#btnExcluirAlunoModal') !== null, true, 'ação de excluir na barra');
    assert.equal(barra.querySelector('#btnSalvarAluno').getAttribute('type'), 'submit', 'salvar continua sendo o submit do form');
    assert.ok(
        Array.from(barra.querySelectorAll('button')).some((botao) => botao.textContent.trim() === 'Cancelar'),
        'ação de cancelar na barra',
    );
});

test('ajuste — no bottom-sheet mobile o form preenche a altura, sem faixa sob a barra', (t) => {
    const css = ler('assets/css/style.css');
    const mobile = blocoMediaCom(css, '.modal-alunos-acoes {\n    padding-bottom: max(8px, env(safe-area-inset-bottom));');

    assert.ok(mobile, 'breakpoint mobile do modal de aluno precisa existir');
    // O bottom-sheet tem altura fixa e é coluna flex; quem limita a altura do form
    // é o flex, não um max-height — senão sobra faixa do fundo sob a barra.
    const form = corpoDaRegra(mobile, '.form-aluno');
    assert.ok(form, 'regra mobile de .form-aluno precisa existir');
    assert.match(form, /max-height:\s*none/, 'form mobile não pode limitar a própria altura');
    assert.doesNotMatch(form, /max-height:\s*calc\(/, 'max-height em calc() deixa faixa do fundo sob a barra');
});
