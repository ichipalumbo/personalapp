// [TAG-TESTS-ORDEM-INDEX-HTML] index-html-ordem.test.js
// Guard da ordem das tags <script> em index.html. O frontend nao tem bundler:
// a ordem das tags E a resolucao de dependencias.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
    RAIZ_PROJETO,
    lerScriptsDoIndexHtml,
    lerScriptsLocaisDoIndexHtml,
    carregarScripts
} = require('./setup/carregar-frontend');

// Pares em que o dependente le o global do outro durante a avaliacao do script,
// nao em runtime. Ambos falham com throw explicito se a ordem inverter.
const DEPENDENCIAS_DE_CARGA = [
    { antes: 'assets/js/config/api-config.js', depois: 'assets/js/storage.js' },
    { antes: 'assets/js/shared/recurrence-helpers.js', depois: 'assets/js/calendario-engine.js' }
];

test('index.html declara pelo menos os scripts locais conhecidos', () => {
    const locais = lerScriptsLocaisDoIndexHtml();
    assert.ok(locais.length > 20, `esperava mais de 20 scripts locais, achei ${locais.length}`);
});

test('todo script local declarado existe no disco', () => {
    const ausentes = lerScriptsLocaisDoIndexHtml()
        .filter((src) => !fs.existsSync(path.join(RAIZ_PROJETO, src)));
    assert.deepEqual(ausentes, []);
});

test('nenhum script e declarado duas vezes', () => {
    const todos = lerScriptsDoIndexHtml();
    const duplicados = todos.filter((src, i) => todos.indexOf(src) !== i);
    assert.deepEqual(duplicados, []);
});

test('dependencias de tempo de carga aparecem antes de seus dependentes', () => {
    const locais = lerScriptsLocaisDoIndexHtml();

    for (const { antes, depois } of DEPENDENCIAS_DE_CARGA) {
        const posAntes = locais.indexOf(antes);
        const posDepois = locais.indexOf(depois);

        assert.notEqual(posAntes, -1, `${antes} nao esta declarado em index.html`);
        assert.notEqual(posDepois, -1, `${depois} nao esta declarado em index.html`);
        assert.ok(posAntes < posDepois, `${antes} precisa vir antes de ${depois} em index.html`);
    }
});

test('a ordem declarada em index.html realmente carrega calendario-engine', () => {
    const locais = lerScriptsLocaisDoIndexHtml();
    const naOrdemDoHtml = locais.filter((src) => (
        src === 'assets/js/shared/recurrence-helpers.js' || src === 'assets/js/calendario-engine.js'
    ));

    const ambiente = carregarScripts(naOrdemDoHtml);
    assert.equal(typeof ambiente.window.checarCompromissoNaData, 'function');

    assert.throws(() => carregarScripts(naOrdemDoHtml.slice().reverse()), /recurrenceHelpers/);
});
