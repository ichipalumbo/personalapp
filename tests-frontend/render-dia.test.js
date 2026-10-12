// [TAG-TESTS-RENDER-DIA] render-dia.test.js
// Cobre o render da visão Dia (`renderizarAgendaDia`) em jsdom com os módulos
// reais do frontend carregados na ordem do index.html (plano
// docs/plans/2026-10-12-plan-cobertura-render-conflitos-modais.md, cartões T02–T04).
// O render é síncrono sobre estado injetado; nenhuma rede é tocada.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');
const ANO = 2026;
const MES = 7; // agosto (0-based)
const DIA = 31; // 31/08/2026 — segunda-feira, data fixa no passado

function carregar(dom, arquivo) {
    const absoluto = path.join(RAIZ, arquivo);
    vm.runInContext(fs.readFileSync(absoluto, 'utf8'), dom.getInternalVMContext(), { filename: absoluto });
}

function criarAmbiente(t) {
    const dom = new JSDOM(`<!doctype html><html><body>
        <main id="tela-home">
            <div id="agendaGridHomeHome"></div>
        </main>
    </body></html>`, { url: 'http://localhost/index.html#tela-home', runScripts: 'outside-only' });
    t.after(() => dom.window.close());

    const { window } = dom;
    window.dataSelecionada = new window.Date(ANO, MES, DIA, 12, 0, 0);
    window.log = new Proxy({}, { get: () => () => {} });
    window.mostrarToast = () => {};

    // Ordem de carga do index.html (recorte consumido pelo render do Dia).
    carregar(dom, 'assets/js/state.js');
    require('./setup/contexto-dados')(dom);
    [
        'assets/js/utils-datetime.js',
        'backend/shared/recurrence-helpers.js',
        'assets/js/alunos-helpers.js',
        'assets/js/calendario-engine.js',
        'assets/js/widget-bloqueio.js',
        'assets/js/agenda-card-template.js',
        'assets/js/view-home.js',
    ].forEach((arquivo) => carregar(dom, arquivo));

    return { dom, window };
}

// `aulas`/`alunos`/`agendaConfig` vivem em lexicais do state.js; a escrita é
// feita por script no próprio contexto (mesmo mecanismo da recuperação de dados).
function injetarEstado(dom, { aulas, alunos = [], agendaConfig = { horaInicio: 6, horaFim: 22 } }) {
    vm.runInContext(
        [
            `aulas = ${JSON.stringify(aulas)};`,
            `alunos = ${JSON.stringify(alunos)};`,
            `agendaConfig = ${JSON.stringify(agendaConfig)};`,
        ].join('\n'),
        dom.getInternalVMContext(),
    );
}

function aulaUnica(overrides = {}) {
    return {
        id: 'aula-1',
        tipo: 'aula',
        alunoId: 'aluno-1',
        frequencia: 'uma_vez',
        data: '31/08/2026',
        excecoes: [],
        horarioInicio: '09:00',
        horarioFim: '10:00',
        ...overrides,
    };
}

test('T02 — renderizarAgendaDia desenha a grade e posiciona o card da aula única', (t) => {
    const { dom, window } = criarAmbiente(t);
    injetarEstado(dom, {
        alunos: [{ id: 'aluno-1', nome: 'Ana', objetivo: 'Personal Trainer' }],
        aulas: [aulaUnica()],
    });

    window.renderizarAgendaDia('agendaGridHomeHome');

    const grid = window.document.getElementById('agendaGridHomeHome');
    const wrapper = grid.querySelector('.time-grid-wrapper');
    assert.ok(wrapper, 'a grade da visão Dia precisa ser montada');
    assert.match(wrapper.getAttribute('style'), /height:\s*1536px/, 'altura da grade = (22-6)h × 96px/h');
    assert.ok(wrapper.querySelector('.time-grid-content-col'), 'a coluna de conteúdo precisa existir');

    const cards = grid.querySelectorAll('.agenda-dia-aula');
    assert.equal(cards.length, 1, 'exatamente o card da aula única');

    const card = cards[0];
    assert.equal(card.tagName, 'BUTTON', 'o card acionável de aula é um <button>');
    assert.equal(card.getAttribute('type'), 'button');
    assert.equal(card.getAttribute('onclick'), "abrirModalAcaoSlot('aula-1')", 'o clique abre o modal de ação do slot');
    assert.equal(card.classList.contains('formato-outlook'), false, 'aula sem banda não usa formato Outlook');
    assert.equal(card.classList.contains('formato-linha'), false, 'aula sem banda não vira linha de banda');

    const estilo = card.getAttribute('style');
    assert.match(estilo, /position:\s*absolute/, 'posicionamento absoluto na timeline');
    assert.match(estilo, /top:\s*288px/, 'top = 3h após o início da grade (09:00 em grade 06:00–22:00)');
    assert.match(estilo, /height:\s*96px/, 'height = 1h × 96px/h');
    assert.match(estilo, /left:\s*0/, 'sem banda: alinhado à esquerda');
    assert.match(estilo, /width:\s*calc\(100% - 4px\)/, 'sem banda: largura total com o inset original de 4px');
});
