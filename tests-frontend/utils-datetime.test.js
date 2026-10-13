// [TAG-TESTS-UTILS-DATETIME] utils-datetime.test.js
// T01 (plano 2026-10-13): formatarDataPtBrLegivel passa a normalizar também
// entrada ISO (D9=Sim) — o fallback cru "2026-09-26" deixa de ser exibido.

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');

function criarAmbiente(t) {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
        url: 'http://localhost/index.html',
        runScripts: 'outside-only',
    });
    t.after(() => dom.window.close());
    vm.runInContext(
        fs.readFileSync(path.join(RAIZ, 'assets/js/utils-datetime.js'), 'utf8'),
        dom.getInternalVMContext(),
        { filename: 'assets/js/utils-datetime.js' },
    );
    return dom.window;
}

test('formatarDataPtBrLegivel formata data pt-BR no padrão abreviado', (t) => {
    const window = criarAmbiente(t);

    assert.equal(window.formatarDataPtBrLegivel('17/10/2026'), 'sáb., 17/10');
    assert.equal(window.formatarDataPtBrLegivel('31/08/2026'), 'seg., 31/08');
});

test('formatarDataPtBrLegivel normaliza entrada ISO (T01/D9)', (t) => {
    const window = criarAmbiente(t);

    assert.equal(window.formatarDataPtBrLegivel('2026-09-26'), 'sáb., 26/09');
    assert.equal(window.formatarDataPtBrLegivel('2026-10-17'), 'sáb., 17/10');
});

test('formatarDataPtBrLegivel devolve a entrada quando não é data reconhecível', (t) => {
    const window = criarAmbiente(t);

    assert.equal(window.formatarDataPtBrLegivel('esta data'), 'esta data');
    assert.equal(window.formatarDataPtBrLegivel(''), '');
    assert.equal(window.formatarDataPtBrLegivel(null), '');
});
