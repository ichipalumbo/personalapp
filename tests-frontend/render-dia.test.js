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

function cardPorId(grid, id) {
    return Array.from(grid.querySelectorAll('.agenda-dia-aula')).find(
        (el) => el.getAttribute('onclick') === `abrirModalAcaoSlot('${id}')`,
    );
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

test('T03 — dupla com sobreposição parcial vira duas colunas Outlook', (t) => {
    const { dom, window } = criarAmbiente(t);
    injetarEstado(dom, {
        alunos: [{ id: 'aluno-1', nome: 'Ana', objetivo: 'Personal Trainer' }],
        aulas: [
            aulaUnica({ id: 'dup-a', horarioInicio: '09:00', horarioFim: '10:00' }),
            aulaUnica({ id: 'dup-b', horarioInicio: '09:30', horarioFim: '10:30' }),
        ],
    });

    window.renderizarAgendaDia('agendaGridHomeHome');
    const grid = window.document.getElementById('agendaGridHomeHome');

    assert.equal(grid.querySelectorAll('.formato-outlook').length, 2, 'a dupla usa o formato Outlook');
    assert.equal(grid.querySelectorAll('.agenda-banda-grupo').length, 0, 'banda de 2 não vira contêiner de linhas');
    assert.equal(grid.querySelectorAll('.formato-linha').length, 0);

    const cardA = cardPorId(grid, 'dup-a');
    const cardB = cardPorId(grid, 'dup-b');
    assert.ok(cardA && cardB, 'os dois cards precisam existir');
    assert.match(cardA.getAttribute('style'), /left:\s*0%/, 'primeira coluna à esquerda');
    assert.match(cardA.getAttribute('style'), /top:\s*288px/);
    assert.match(cardA.getAttribute('style'), /width:\s*calc\(50% - 4px\)/);
    assert.match(cardB.getAttribute('style'), /left:\s*50%/, 'segunda coluna à direita');
    assert.match(cardB.getAttribute('style'), /top:\s*336px/);
    assert.match(cardB.getAttribute('style'), /width:\s*calc\(50% - 4px\)/);
});

test('T03 — par com início igual fica em colunas, não vira linha', (t) => {
    const { dom, window } = criarAmbiente(t);
    injetarEstado(dom, {
        alunos: [{ id: 'aluno-1', nome: 'Ana', objetivo: 'Personal Trainer' }],
        aulas: [
            aulaUnica({ id: 'eq-a', horarioInicio: '09:00', horarioFim: '10:00' }),
            aulaUnica({ id: 'eq-b', horarioInicio: '09:00', horarioFim: '09:30' }),
        ],
    });

    window.renderizarAgendaDia('agendaGridHomeHome');
    const grid = window.document.getElementById('agendaGridHomeHome');

    assert.equal(grid.querySelectorAll('.formato-outlook').length, 2);
    assert.equal(grid.querySelectorAll('.formato-linha').length, 0, 'início igual continua em colunas');
    assert.equal(grid.querySelectorAll('.agenda-banda-grupo').length, 0);

    const cardA = cardPorId(grid, 'eq-a');
    const cardB = cardPorId(grid, 'eq-b');
    assert.ok(cardA && cardB);
    assert.match(cardA.getAttribute('style'), /left:\s*0%/);
    assert.match(cardB.getAttribute('style'), /left:\s*50%/);
    assert.match(cardB.getAttribute('style'), /height:\s*48px/, 'a aula de 30min ocupa meia hora da timeline');
});

test('T03 — tripla encadeada vira um contêiner único, em linhas na ordem início/fim', (t) => {
    const { dom, window } = criarAmbiente(t);
    injetarEstado(dom, {
        alunos: [{ id: 'aluno-1', nome: 'Ana', objetivo: 'Personal Trainer' }],
        aulas: [
            aulaUnica({ id: 'tri-a', horarioInicio: '09:00', horarioFim: '11:00' }),
            aulaUnica({ id: 'tri-b', horarioInicio: '09:00', horarioFim: '10:00' }),
            aulaUnica({ id: 'tri-c', horarioInicio: '10:30', horarioFim: '11:30' }),
        ],
    });

    window.renderizarAgendaDia('agendaGridHomeHome');
    const grid = window.document.getElementById('agendaGridHomeHome');

    const grupos = grid.querySelectorAll('.agenda-banda-grupo');
    assert.equal(grupos.length, 1, 'uma banda de 3 gera exatamente um contêiner');
    assert.equal(grid.querySelectorAll('.formato-outlook').length, 0, 'banda de 3+ não usa Outlook');

    assert.match(grupos[0].getAttribute('style'), /top:\s*288px/, 'contêiner começa no menor início (09:00)');
    assert.match(grupos[0].getAttribute('style'), /height:\s*240px/, 'contêiner cobre o span até o maior fim (11:30)');

    const linhas = Array.from(grid.querySelectorAll('.agenda-banda-grupo .formato-linha'));
    assert.equal(linhas.length, 3, 'as três aulas da banda viram linhas');
    assert.deepEqual(
        linhas.map((el) => el.getAttribute('onclick')),
        ["abrirModalAcaoSlot('tri-b')", "abrirModalAcaoSlot('tri-a')", "abrirModalAcaoSlot('tri-c')"],
        'ordem por início; empate desempata por fim (tri-b termina antes de tri-a)',
    );
    assert.match(linhas[2].textContent, /10:30/, 'a linha mostra a hora comprimida de início');
});

test('T03 — bloqueio de dia inteiro fica fora do grafo: largura total, sem formato de banda', (t) => {
    const { dom, window } = criarAmbiente(t);
    injetarEstado(dom, {
        alunos: [{ id: 'aluno-1', nome: 'Ana', objetivo: 'Personal Trainer' }],
        aulas: [
            aulaUnica({ id: 'aula-nb', horarioInicio: '09:00', horarioFim: '10:00' }),
            {
                id: 'bloco-1',
                tipo: 'bloqueio',
                descricao: 'Feriado',
                frequencia: 'uma_vez',
                data: '31/08/2026',
                excecoes: [],
                horarioInicio: '00:00',
                horarioFim: '23:59',
            },
        ],
    });

    window.renderizarAgendaDia('agendaGridHomeHome');
    const grid = window.document.getElementById('agendaGridHomeHome');

    assert.equal(grid.querySelectorAll('.agenda-dia-aula').length, 2, 'aula + bloqueio');
    assert.equal(grid.querySelectorAll('.agenda-banda-grupo').length, 0);

    const bloco = cardPorId(grid, 'bloco-1');
    assert.ok(bloco, 'o card do bloqueio precisa existir');
    assert.equal(bloco.tagName, 'BUTTON');
    assert.equal(bloco.classList.contains('formato-outlook'), false, 'dia inteiro não entra em colunas da banda');
    assert.equal(bloco.classList.contains('formato-linha'), false);
    assert.equal(bloco.closest('.agenda-banda-grupo'), null, 'dia inteiro fica fora do contêiner');
    assert.match(bloco.getAttribute('style'), /top:\s*0px/, 'clamp começa no topo da grade');
    assert.match(bloco.getAttribute('style'), /height:\s*1536px/, 'cobre o dia útil inteiro (06:00–22:00 = 16h × 96px/h)');
    assert.match(bloco.getAttribute('style'), /left:\s*0/);
    assert.match(bloco.getAttribute('style'), /width:\s*calc\(100% - 4px\)/);
    assert.match(bloco.textContent, /Dia bloqueado/);

    const aula = cardPorId(grid, 'aula-nb');
    assert.ok(aula);
    assert.equal(aula.classList.contains('formato-outlook'), false, 'aula não ganha banda por causa do dia inteiro');
    assert.match(aula.getAttribute('style'), /top:\s*288px/);
});

test('T04 — dia sem eventos renderiza a grade vazia, sem cards', (t) => {
    const { dom, window } = criarAmbiente(t);
    injetarEstado(dom, { alunos: [], aulas: [] });

    window.renderizarAgendaDia('agendaGridHomeHome');
    const grid = window.document.getElementById('agendaGridHomeHome');

    assert.ok(grid.querySelector('.time-grid-wrapper'), 'a grade precisa ser montada mesmo sem eventos');
    assert.equal(grid.querySelectorAll('.time-grid-bg-slot').length, 32, 'slots de 30min cobrem a grade inteira (06:00–22:00)');
    assert.equal(grid.querySelectorAll('.agenda-dia-aula').length, 0, 'nenhum card sem eventos');
    assert.equal(grid.querySelectorAll('.agenda-banda-grupo').length, 0);
});

test('T04 — sete aulas de 30min no mesmo span: um contêiner com sete linhas', (t) => {
    const { dom, window } = criarAmbiente(t);
    const aulas = Array.from({ length: 7 }, (_, i) =>
        aulaUnica({ id: `n-${i + 1}`, horarioInicio: '09:00', horarioFim: '09:30' }),
    );
    injetarEstado(dom, {
        alunos: [{ id: 'aluno-1', nome: 'Ana', objetivo: 'Personal Trainer' }],
        aulas,
    });

    window.renderizarAgendaDia('agendaGridHomeHome');
    const grid = window.document.getElementById('agendaGridHomeHome');

    const grupos = grid.querySelectorAll('.agenda-banda-grupo');
    assert.equal(grupos.length, 1, 'a banda de 7 gera um único contêiner');
    assert.equal(grid.querySelectorAll('.formato-outlook').length, 0);
    // O clipping visual das sete linhas dentro de 48px não é observável em
    // jsdom — a checagem de pixels permanece manual (residuais do plano).
    assert.match(grupos[0].getAttribute('style'), /top:\s*288px/);
    assert.match(grupos[0].getAttribute('style'), /height:\s*48px/, 'contêiner cobre o span de meia hora');

    const linhas = Array.from(grid.querySelectorAll('.agenda-banda-grupo .formato-linha'));
    assert.equal(linhas.length, 7, 'sete aulas viram sete linhas');
    const esperados = Array.from({ length: 7 }, (_, i) => `abrirModalAcaoSlot('n-${i + 1}')`).sort();
    assert.deepEqual(
        linhas.map((el) => el.getAttribute('onclick')).sort(),
        esperados,
        'cada aula aparece exatamente uma vez (sem perda nem duplicata)',
    );
});

test('T04 — evento externo do GCal em banda vira linha <div> sem onclick', (t) => {
    const { dom, window } = criarAmbiente(t);
    injetarEstado(dom, {
        alunos: [{ id: 'aluno-1', nome: 'Ana', objetivo: 'Personal Trainer' }],
        aulas: [
            aulaUnica({ id: 'ext-a', horarioInicio: '09:00', horarioFim: '10:00' }),
            aulaUnica({ id: 'ext-b', horarioInicio: '09:30', horarioFim: '10:30' }),
            {
                id: 'ext-g',
                tipo: 'bloqueio',
                source: 'google_external',
                descricao: 'Consulta',
                frequencia: 'uma_vez',
                data: '31/08/2026',
                excecoes: [],
                horarioInicio: '09:00',
                horarioFim: '11:00',
            },
        ],
    });

    window.renderizarAgendaDia('agendaGridHomeHome');
    const grid = window.document.getElementById('agendaGridHomeHome');

    assert.equal(grid.querySelectorAll('.agenda-banda-grupo').length, 1);
    assert.equal(grid.querySelectorAll('.formato-linha').length, 3, 'a banda de 3 vira três linhas');

    const externo = grid.querySelector('.card-bloqueio-externo');
    assert.ok(externo, 'o evento externo precisa ser renderizado');
    assert.equal(externo.tagName, 'DIV', 'evento externo do GCal é somente-leitura, não acionável');
    assert.equal(externo.getAttribute('onclick'), null, 'sem onclick');
    assert.ok(externo.classList.contains('formato-linha'), 'na banda, o externo usa o formato de linha');
    assert.equal(externo.getAttribute('title'), 'Consulta');

    for (const id of ['ext-a', 'ext-b']) {
        const card = cardPorId(grid, id);
        assert.ok(card, `${id} precisa existir`);
        assert.equal(card.tagName, 'BUTTON', 'aula continua acionável');
    }
});

test('T04 — deslocamento e bloqueio interno seguem <button> acionáveis', (t) => {
    const { dom, window } = criarAmbiente(t);
    injetarEstado(dom, {
        alunos: [],
        aulas: [
            {
                id: 'tipo-d',
                tipo: 'deslocamento',
                descricao: 'Academia → Cliente',
                frequencia: 'uma_vez',
                data: '31/08/2026',
                excecoes: [],
                horarioInicio: '08:00',
                horarioFim: '08:30',
            },
            {
                id: 'tipo-l',
                tipo: 'bloqueio',
                descricao: 'Almoço',
                frequencia: 'uma_vez',
                data: '31/08/2026',
                excecoes: [],
                horarioInicio: '12:00',
                horarioFim: '13:00',
            },
        ],
    });

    window.renderizarAgendaDia('agendaGridHomeHome');
    const grid = window.document.getElementById('agendaGridHomeHome');

    assert.equal(grid.querySelectorAll('.agenda-dia-aula').length, 2, 'deslocamento + bloqueio');

    const deslocamento = cardPorId(grid, 'tipo-d');
    assert.ok(deslocamento);
    assert.equal(deslocamento.tagName, 'BUTTON');
    assert.equal(deslocamento.getAttribute('onclick'), "abrirModalAcaoSlot('tipo-d')");
    assert.ok(deslocamento.classList.contains('slot-deslocamento'));

    const bloqueio = cardPorId(grid, 'tipo-l');
    assert.ok(bloqueio);
    assert.equal(bloqueio.tagName, 'BUTTON');
    assert.equal(bloqueio.getAttribute('onclick'), "abrirModalAcaoSlot('tipo-l')");
    assert.ok(bloqueio.classList.contains('slot-bloqueado'));
});
