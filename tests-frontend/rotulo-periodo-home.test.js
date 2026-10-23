// [TAG-TESTS-ROTULO-PERIODO] rotulo-periodo-home.test.js
// Plano da identidade visual (ajuste de 2026-10-23): abaixo de 380px a forma
// completa do rótulo de período não cabe na linha da Home (104px necessários
// contra 102px em 375) e o texto passa à forma curta. A escolha vive em
// view-calendario.js:atualizarRotuloPeriodoSemana e depende de matchMedia, que
// aqui é substituído por um dublê controlável — o jsdom não avalia media query.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');

function carregar(dom, arquivo) {
    vm.runInContext(fs.readFileSync(path.join(RAIZ, arquivo), 'utf8'), dom.getInternalVMContext(), { filename: arquivo });
}

// Semana de segunda 19/10 a domingo 25/10/2026 — 21/10/2026 é quarta-feira.
const QUARTA_DA_SEMANA = new Date(2026, 9, 21);

function ambiente(t, opcoes) {
    const estado = { estreito: opcoes.estreito, ouvintes: [] };
    const dom = new JSDOM(
        '<!doctype html><html><body><span id="periodoSemanaHomeLabel"></span></body></html>',
        { url: 'http://localhost', runScripts: 'outside-only' },
    );
    t.after(() => dom.window.close());
    const { window } = dom;
    window.matchMedia = (consulta) => ({
        media: consulta,
        get matches() { return estado.estreito; },
        addEventListener: (tipo, ouvinte) => {
            if (tipo === 'change') estado.ouvintes.push(ouvinte);
        },
        removeEventListener: () => {},
    });
    carregar(dom, 'assets/js/utils-datetime.js');
    carregar(dom, 'assets/js/view-calendario.js');
    // O script publica uma data no load; a semana do teste entra depois.
    window.semanaReferencia = QUARTA_DA_SEMANA;
    return { window, estado };
}

test('faixa estreita usa a forma curta e guarda o período completo em title/aria-label', (t) => {
    const { window } = ambiente(t, { estreito: true });

    window.atualizarRotuloPeriodoSemana();

    const rotulo = window.document.getElementById('periodoSemanaHomeLabel');
    assert.equal(rotulo.textContent, '19–25/10');
    assert.equal(rotulo.title, '19/10 a 25/10');
    assert.equal(rotulo.getAttribute('aria-label'), '19/10 a 25/10');
});

test('fora da faixa estreita o rótulo usa a forma completa', (t) => {
    const { window } = ambiente(t, { estreito: false });

    window.atualizarRotuloPeriodoSemana();

    const rotulo = window.document.getElementById('periodoSemanaHomeLabel');
    assert.equal(rotulo.textContent, '19/10 a 25/10');
    assert.equal(rotulo.title, '19/10 a 25/10');
    assert.equal(rotulo.getAttribute('aria-label'), '19/10 a 25/10');
});

test('a troca de faixa atualiza o rótulo pela mesma escuta, sem re-render da grade', (t) => {
    const { window, estado } = ambiente(t, { estreito: false });
    const rotulo = window.document.getElementById('periodoSemanaHomeLabel');
    window.atualizarRotuloPeriodoSemana();
    assert.equal(rotulo.textContent, '19/10 a 25/10');
    assert.equal(estado.ouvintes.length, 1, 'a faixa precisa ser ouvida uma única vez');

    estado.estreito = true;
    estado.ouvintes[0]();

    assert.equal(rotulo.textContent, '19–25/10', 'estreitar a tela troca a forma sem novo render');
});
