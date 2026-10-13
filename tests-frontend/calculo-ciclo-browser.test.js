// [TAG-TESTS-CALCULO-CICLO-BROWSER] calculo-ciclo-browser.test.js
// T05 (D5=B): garante que calculo-ciclo.js carrega como tag <script> (o UMD não
// pode depender de `require` no browser) e expõe window.calculoCiclo com o
// mesmo cálculo usado no envio — e que a ordem das tags importa.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');

function criarDom() {
    return new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost', runScripts: 'outside-only' });
}

function carregarEm(dom, arquivo) {
    vm.runInContext(fs.readFileSync(path.join(RAIZ, arquivo), 'utf8'), dom.getInternalVMContext(), { filename: arquivo });
}

test('calculo-ciclo carrega no browser com recurrence-helpers antes e expõe o cálculo (T05/D5=B)', (t) => {
    const dom = criarDom();
    t.after(() => dom.window.close());
    carregarEm(dom, 'backend/shared/recurrence-helpers.js');
    carregarEm(dom, 'backend/shared/calculo-ciclo.js');

    const { window } = dom;
    assert.equal(typeof window.calculoCiclo, 'object');
    assert.equal(typeof window.calculoCiclo.calcularPrazoReposicao, 'function');

    // Mesmo cálculo exibido no modal de escolha: aluno com vencimento dia 10,
    // aula em 17/10/2026 → prazo até o fim do ciclo de competência (10/11).
    // Campos assertados individualmente: o objeto nasce no realm do jsdom.
    const resultado = window.calculoCiclo.calcularPrazoReposicao(
        { objetivo: 'Personal Trainer', fechamentoMesCheio: false, diaVencimento: 10 },
        '17/10/2026',
    );
    assert.equal(resultado.validoAte, '2026-11-10');
    assert.equal(resultado.pisoAplicado, false);
});

test('sem recurrence-helpers antes, calculo-ciclo falha na carga (ordem importa)', (t) => {
    const dom = criarDom();
    t.after(() => dom.window.close());
    assert.throws(
        () => carregarEm(dom, 'backend/shared/calculo-ciclo.js'),
        /recurrence-helpers/,
    );
});
