// [TAG-TESTS-ROTULO-DIA] rotulo-dia-home.test.js
// Formato adaptativo do cabeçalho da visão Dia (fix/rotulo-data-modo-dia):
// Em desktop (>767px) exibe forma completa ("Segunda-feira (26/10)").
// Em mobile (420px a 767px, incluindo viewport de referência 433x762) exibe forma média ("Segunda, 26/10").
// Em telas estreitas (<=419px, incluindo stress test 390x844 e 320x568) exibe forma curta ("Seg, 26/10").
// O rótulo completo permanece sempre em title e aria-label para acessibilidade.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');

function carregar(dom, arquivo) {
    const absoluto = path.join(RAIZ, arquivo);
    vm.runInContext(fs.readFileSync(absoluto, 'utf8'), dom.getInternalVMContext(), { filename: absoluto });
}

// 26/10/2026 é segunda-feira
const SEGUNDA_FEIRA = new Date(2026, 9, 26, 12, 0, 0);

function ambiente(t, { estreito = false, compacto = false } = {}) {
    const estado = { estreito, compacto, ouvintes: [] };
    const dom = new JSDOM(
        '<!doctype html><html><body><span id="dataAtualHome" class="home-weekly-periodo"></span><span id="diaSemanaAtualHome"></span></body></html>',
        { url: 'http://localhost', runScripts: 'outside-only' }
    );
    t.after(() => dom.window.close());
    const { window } = dom;

    window.matchMedia = (consulta) => {
        const matches = consulta.includes('419px') ? estado.estreito : (consulta.includes('767px') ? estado.compacto : false);
        return {
            media: consulta,
            matches,
            addEventListener: (tipo, ouvinte) => {
                if (tipo === 'change') estado.ouvintes.push({ consulta, ouvinte });
            },
            removeEventListener: () => {},
        };
    };

    carregar(dom, 'assets/js/state.js');
    require('./setup/contexto-dados')(dom);
    carregar(dom, 'assets/js/utils-datetime.js');
    carregar(dom, 'backend/shared/recurrence-helpers.js');
    carregar(dom, 'assets/js/alunos-helpers.js');
    carregar(dom, 'assets/js/calendario-engine.js');
    carregar(dom, 'assets/js/widget-bloqueio.js');
    carregar(dom, 'assets/js/agenda-card-template.js');
    carregar(dom, 'assets/js/view-home.js');

    window.dataSelecionada = SEGUNDA_FEIRA;
    return { window, estado };
}

test('formatarRotuloDia devolve as formas completa, média e curta', (t) => {
    const { window } = ambiente(t);
    assert.equal(typeof window.formatarRotuloDia, 'function', 'formatarRotuloDia deve estar definida em utils-datetime.js');
    const rotulo = window.formatarRotuloDia(SEGUNDA_FEIRA);
    assert.equal(rotulo.completo, 'Segunda-feira (26/10)');
    assert.equal(rotulo.medio, 'Segunda, 26/10');
    assert.equal(rotulo.curto, 'Seg, 26/10');
});

test('em desktop (>767px) exibe forma completa e guarda título acessível', (t) => {
    const { window } = ambiente(t, { estreito: false, compacto: false });
    window.atualizarDataAtual('dataAtualHome', 'diaSemanaAtualHome');

    const el = window.document.getElementById('dataAtualHome');
    assert.ok(el.textContent.includes('Segunda-feira (26/10)'), `esperado Segunda-feira (26/10), obtido: ${el.textContent}`);
    assert.equal(el.title, 'Segunda-feira (26/10)');
    assert.equal(el.getAttribute('aria-label'), 'Segunda-feira (26/10)');
});

test('em mobile compacto (420px a 767px, como viewport de referência 433x762) exibe forma média', (t) => {
    const { window } = ambiente(t, { estreito: false, compacto: true });
    window.atualizarDataAtual('dataAtualHome', 'diaSemanaAtualHome');

    const el = window.document.getElementById('dataAtualHome');
    assert.ok(el.textContent.includes('Segunda, 26/10'), `esperado Segunda, 26/10, obtido: ${el.textContent}`);
    assert.equal(el.title, 'Segunda-feira (26/10)');
    assert.equal(el.getAttribute('aria-label'), 'Segunda-feira (26/10)');
});

test('em tela estreita (<=419px, incluindo stress test 390x844 e 320x568) exibe forma curta', (t) => {
    const { window } = ambiente(t, { estreito: true, compacto: true });
    window.atualizarDataAtual('dataAtualHome', 'diaSemanaAtualHome');

    const el = window.document.getElementById('dataAtualHome');
    assert.ok(el.textContent.includes('Seg, 26/10'), `esperado Seg, 26/10, obtido: ${el.textContent}`);
    assert.equal(el.title, 'Segunda-feira (26/10)');
    assert.equal(el.getAttribute('aria-label'), 'Segunda-feira (26/10)');
});

test('troca de faixa via matchMedia atualiza o rótulo automaticamente', (t) => {
    const { window, estado } = ambiente(t, { estreito: false, compacto: false });
    window.atualizarDataAtual('dataAtualHome', 'diaSemanaAtualHome');
    const el = window.document.getElementById('dataAtualHome');
    assert.ok(el.textContent.includes('Segunda-feira (26/10)'));

    // Redimensiona para mobile compacto (433px)
    estado.compacto = true;
    estado.ouvintes.filter((o) => o.consulta.includes('767px')).forEach((o) => o.ouvinte());
    assert.ok(el.textContent.includes('Segunda, 26/10'));

    // Redimensiona para tela estreita (390px / 320px)
    estado.estreito = true;
    estado.ouvintes.filter((o) => o.consulta.includes('419px')).forEach((o) => o.ouvinte());
    assert.ok(el.textContent.includes('Seg, 26/10'));
});
