// [TAG-TESTS-VIEW-CALENDARIO-FECHAMENTO] view-calendario-fechamento.test.js
// Cobre o T02 (D2=A): fechar o modal de ação aberto pela Semana não re-renderiza
// a agenda e o gancho de fechamento é instalado uma única vez (sem empilhar um
// wrapper por abertura). Cobre também o T02 estendido: render com supressão
// pós-ação (`__homeSemAncoraHoje`) não ancora a semana em "hoje" — o render
// normal continua ancorando.

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

function ambiente(t) {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost', runScripts: 'outside-only' });
    t.after(() => dom.window.close());
    const { window } = dom;
    const estado = { fechamentos: 0, rendersSemana: 0, rendersDia: 0, aberturas: [] };
    window.fecharModalAcaoSlot = () => { estado.fechamentos += 1; };
    window.abrirModalAcaoSlot = (id) => { estado.aberturas.push(id); };
    window.idCompromissoSelecionado = '';
    carregar(dom, 'assets/js/view-calendario.js');
    window.renderizarHomeSemana = () => { estado.rendersSemana += 1; };
    window.renderizarHomeDia = () => { estado.rendersDia += 1; };
    return { dom, window, estado };
}

test('fechar o modal não re-renderiza a agenda e limpa o estado da ocorrência (D2=A)', (t) => {
    const { window, estado } = ambiente(t);

    window.abrirCalendarioAcaoSlot('ag2', '17/10/2026');
    assert.equal(window.dataAlvoAcaoStr, '17/10/2026');
    assert.equal(window.idCompromissoSelecionado, 'ag2');
    assert.deepEqual(estado.aberturas, ['ag2']);

    window.fecharModalAcaoSlot();

    assert.equal(estado.rendersSemana, 0, 'fechar não pode re-renderizar a semana');
    assert.equal(estado.rendersDia, 0, 'fechar não pode re-renderizar o dia');
    assert.equal(estado.fechamentos, 1);
    assert.equal(window.dataAlvoAcaoStr, null);
});

test('o gancho de fechamento é instalado uma única vez, sem reassinar a cada abertura', (t) => {
    const { window, estado } = ambiente(t);

    window.abrirCalendarioAcaoSlot('ag2', '17/10/2026');
    const ganchoAposPrimeiraAbertura = window.fecharModalAcaoSlot;

    window.abrirCalendarioAcaoSlot('ag2', '17/10/2026');
    window.abrirCalendarioAcaoSlot('ag3', '18/10/2026');
    assert.equal(
        window.fecharModalAcaoSlot,
        ganchoAposPrimeiraAbertura,
        'reabrir o modal não pode reinstalar o gancho de fechamento'
    );

    window.fecharModalAcaoSlot();
    assert.equal(estado.fechamentos, 1, 'um fechamento deve chegar ao fechar original exatamente uma vez');
    window.fecharModalAcaoSlot();
    assert.equal(estado.fechamentos, 2);
});

// Carrega o render REAL da semana (sem stub) para medir a âncora "hoje".
function ambienteRender(t) {
    const dom = new JSDOM('<!doctype html><html><body><div id="calendarioSemanalHomeGrid"></div><span id="periodoSemanaHomeLabel"></span></body></html>', { url: 'http://localhost', runScripts: 'outside-only' });
    t.after(() => dom.window.close());
    const { window } = dom;
    const estado = { scrolls: [] };
    window.contextoDados = { atual: () => true, capturar: () => ({}) };
    window.agendaConfig = { horaInicio: 8, horaFim: 21 };
    window.aulas = [];
    window.Element.prototype.scrollIntoView = function () { estado.scrolls.push(this.id || '(sem-id)'); };
    carregar(dom, 'assets/js/view-calendario.js');
    return { dom, window, estado };
}

test('render da semana ancora "hoje" por padrão e respeita a supressão pós-ação (T02 estendido)', async (t) => {
    const { window, estado } = ambienteRender(t);
    const grid = window.document.getElementById('calendarioSemanalHomeGrid');
    const esperarAncora = () => new Promise((resolve) => setTimeout(resolve, 250));

    window.renderizarHomeSemana();
    await esperarAncora();
    assert.equal(grid.querySelectorAll('section.semana-dia-box').length, 7, 'o render precisa montar a semana');
    assert.deepEqual(estado.scrolls, ['semana-dia-hoje-elemento'], 'render normal ancora em "hoje"');

    estado.scrolls.length = 0;
    window.__homeSemAncoraHoje = true;
    window.renderizarHomeSemana();
    await esperarAncora();
    window.__homeSemAncoraHoje = false;
    assert.equal(grid.querySelectorAll('section.semana-dia-box').length, 7, 'o render suprimido continua montando a semana');
    assert.deepEqual(estado.scrolls, [], 'render pós-ação não pode ancorar em "hoje"');
});

// Carrega o inicializarHome real para provar que a supressão também é derivada
// da operação (cobre os renders internos da ponte do GCal e da grade).
function ambienteHome(t) {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost', runScripts: 'outside-only' });
    t.after(() => dom.window.close());
    const { window } = dom;
    const estado = { flagsRender: [] };
    window.contextoDados = { capturar: () => ({}), capturarInteracao: () => ({}), atual: () => true, podeAplicarInteracao: () => true, aoInvalidar: () => {} };
    carregar(dom, 'assets/js/view-home.js');
    window.agendaConfig = { horaInicio: 8, horaFim: 21 };
    window.aulasParaRepor = [];
    window.__sincronizacaoInicialConcluida = true;
    window.modoHomeAtivo = 'semana';
    window.atualizarDashboardStats = () => {};
    window.inicializarMultiSelectPills = () => {};
    window.trocarFABNovoHome = () => {};
    window.renderizarHomeSemana = () => { estado.flagsRender.push({ modo: 'semana', semAncora: window.__homeSemAncoraHoje === true }); };
    window.renderizarHomeDia = () => { estado.flagsRender.push({ modo: 'dia', semAncora: window.__homeSemAncoraHoje === true }); };
    return { dom, window, estado };
}

test('inicializarHome suprime a âncora quando há operação, mesmo sem o parâmetro (T02 estendido — ponte do GCal)', async (t) => {
    const { window, estado } = ambienteHome(t);

    await window.inicializarHome({ operacao: { contexto: {} } });
    assert.deepEqual(
        estado.flagsRender,
        [{ modo: 'semana', semAncora: true }, { modo: 'semana', semAncora: true }],
        'todos os renders da operação devem rodar com a âncora suprimida'
    );
    assert.equal(window.__homeSemAncoraHoje, false, 'a supressão deve ser desligada ao fim do fluxo');
});

test('inicializarHome sem operação mantém a âncora; com semAncoraHoje explícito, suprime', async (t) => {
    const { window, estado } = ambienteHome(t);

    await window.inicializarHome();
    assert.deepEqual(
        estado.flagsRender,
        [{ modo: 'semana', semAncora: false }, { modo: 'semana', semAncora: false }],
        'render comum mantém a âncora'
    );

    estado.flagsRender.length = 0;
    await window.inicializarHome({ semAncoraHoje: true });
    assert.deepEqual(
        estado.flagsRender,
        [{ modo: 'semana', semAncora: true }, { modo: 'semana', semAncora: true }],
        'parâmetro explícito suprime mesmo sem operação'
    );
});
