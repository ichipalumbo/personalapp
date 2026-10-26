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

// Rótulo do período da Home: abaixo de 380px a forma longa não cabe na linha,
// então o app usa a forma curta, que precisa ser derivada do mesmo par de datas.
test('formatarPeriodoSemana devolve a forma longa e a curta do rótulo da Home', (t) => {
    const window = criarAmbiente(t);

    const semanaNormal = window.formatarPeriodoSemana(new Date(2026, 9, 19), new Date(2026, 9, 25));
    assert.equal(semanaNormal.completo, '19/10 a 25/10');
    assert.equal(semanaNormal.curto, '19–25/10');

    const viradaDeMes = window.formatarPeriodoSemana(new Date(2026, 11, 28), new Date(2027, 0, 3));
    assert.equal(viradaDeMes.completo, '28/12 a 03/01');
    assert.equal(viradaDeMes.curto, '28–03/01');
});

test('formatarRotuloDia formata datas em completo, médio e curto com suporte a string e Date', (t) => {
    const window = criarAmbiente(t);

    const seg = window.formatarRotuloDia(new Date(2026, 9, 26));
    assert.equal(seg.completo, 'Segunda-feira (26/10)');
    assert.equal(seg.medio, 'Segunda, 26/10');
    assert.equal(seg.curto, 'Seg, 26/10');

    const dom = window.formatarRotuloDia('2026-10-25');
    assert.equal(dom.completo, 'Domingo (25/10)');
    assert.equal(dom.medio, 'Domingo, 25/10');
    assert.equal(dom.curto, 'Dom, 25/10');

    const qua = window.formatarRotuloDia('28/10/2026');
    assert.equal(qua.completo, 'Quarta-feira (28/10)');
    assert.equal(qua.medio, 'Quarta, 28/10');
    assert.equal(qua.curto, 'Qua, 28/10');

    const invalido = window.formatarRotuloDia('data-invalida');
    assert.equal(invalido.completo, '');
    assert.equal(invalido.medio, '');
    assert.equal(invalido.curto, '');
});
