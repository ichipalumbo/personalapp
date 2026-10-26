// [TAG-TESTS-RENDER-OTIMISTA] render-otimista-t01.test.js
// T01 do plano 2026-10-26-plan-ui-otimista: o render acontece no commit local
// (item entra no array e a interface é acionada antes da resposta remota) e a
// reversão re-renderiza o estado restaurado com toast de erro. O harness segue
// o padrão de modal-agendamento.test.js (T06): DOM real do modal, scripts reais
// e salvarDados sob controle do teste.

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');
const CONTA = 't01-otimista@example.com';

const SCRIPTS = [
    'assets/js/state.js',
    'assets/js/app-shell/contexto-dados.js',
    'assets/js/storage.js',
    'assets/js/utils-ui.js',
    'assets/js/utils-datetime.js',
    'assets/js/utils-formatters.js',
    'backend/shared/recurrence-helpers.js',
    'backend/shared/reposicao-flow-helpers.js',
    'assets/js/alunos-helpers.js',
    'assets/js/calendario-engine.js',
    'assets/js/agenda-conflitos.js',
    'assets/js/widget-stepper-duracao.js',
    'assets/js/widget-bloqueio.js',
    'assets/js/features/modals/scheduling-flow-state.js',
    'assets/js/features/modals/scheduling-serializer.js',
    'assets/js/features/modals/dialog-controller.js',
    'assets/js/modal-agendamento.js',
];

const HTML_MODAL = (() => {
    const fonte = new JSDOM(fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8'));
    const modal = fonte.window.document.getElementById('modalAgendamento');
    const html = modal ? modal.outerHTML : '';
    fonte.window.close();
    return html;
})();

const ALUNO_ANA = { id: 'aluno-1', nome: 'Ana', objetivo: 'Personal Trainer', status: 'ativo' };

function carregar(dom, arquivo) {
    vm.runInContext(fs.readFileSync(path.join(RAIZ, arquivo), 'utf8'), dom.getInternalVMContext(), { filename: arquivo });
}

function barreira() {
    return new Promise((resolver) => setImmediate(resolver));
}

function aguardarDOMContentLoaded(window) {
    return new Promise((resolver) => {
        if (window.document.readyState !== 'loading') {
            resolver();
            return;
        }
        window.document.addEventListener('DOMContentLoaded', () => resolver(), { once: true });
    });
}

async function criarAmbiente(t, { alunos = [], aulas = [] } = {}) {
    const dom = new JSDOM(`<!doctype html><html><body>${HTML_MODAL}</body></html>`, {
        url: 'http://localhost/index.html',
        runScripts: 'outside-only',
    });
    t.after(() => dom.window.close());
    const { window } = dom;

    window.googleIdentity = {
        isSignedIn: () => true,
        getIdToken: () => 'token-t01',
        getOwnerEmail: () => CONTA,
        addAuthChangeListener: () => {},
    };
    window.APP_API_CONFIG = { apiBaseUrl: 'http://api.test/api', apiRootUrl: 'http://api.test' };
    window.fetch = async () => { throw new Error('T01 otimista não permite rede real'); };

    for (const arquivo of SCRIPTS) carregar(dom, arquivo);

    window.dataSelecionada = new window.Date(2026, 7, 31, 12, 0, 0);

    const capturado = { toasts: [], alerts: [], confirmacoes: [], gravacoes: [] };

    window.log = { info() {}, debug() {}, warn() {}, error() {} };
    window.mostrarToast = (...args) => capturado.toasts.push(args);
    window.alert = (mensagem) => capturado.alerts.push(mensagem);
    window.confirm = (mensagem) => { capturado.confirmacoes.push(mensagem); return true; };
    window.gcal = { isSignedIn: () => false };
    window.inicializarHome = async () => ({ ok: true, estado: 'aplicado' });
    window.salvarDados = async (_silencioso, opcoes) => {
        const op = opcoes && opcoes.operacao;
        capturado.gravacoes.push({ tipoOperacao: op ? op.tipo : null });
        window.contextoDados.registrarEtapa(op, { url: 'http://api.test/api/agendamentos', method: 'POST', confirmada: true });
        return { ok: true, motivo: 'sucesso' };
    };

    window.contextoDados.iniciar();
    await aguardarDOMContentLoaded(window);

    vm.runInContext(`
        const _alunosInjetados = ${JSON.stringify(alunos)};
        const _aulasInjetadas = ${JSON.stringify(aulas)};
        window.alunos.length = 0;
        window.alunos.push(..._alunosInjetados);
        window.aulas.length = 0;
        window.aulas.push(..._aulasInjetadas);
    `, dom.getInternalVMContext());

    return { dom, window, capturado };
}

function contarRenders(window) {
    const chamadas = { semana: 0, dia: 0, stats: 0 };
    window.renderizarHomeSemana = () => { chamadas.semana += 1; };
    window.renderizarHomeDia = () => { chamadas.dia += 1; };
    window.atualizarDashboardStats = () => { chamadas.stats += 1; };
    return chamadas;
}

function preencherESubmeter(window) {
    window.abrirAgendamentoModal('Segunda', '09:00', 'aula');
    window.document.getElementById('agendaAluno').value = 'aluno-1';
    window.document.getElementById('agendaHoraInicio').value = '09:00';
    window.document.getElementById('agendaDuracao').value = '60';
    window.document.getElementById('formAgendamento').dispatchEvent(
        new window.Event('submit', { bubbles: true, cancelable: true }),
    );
}

test('T01 — render otimista acontece no commit local, com o salvar pendente', async (t) => {
    const { window, capturado, dom } = await criarAmbiente(t, { alunos: [ALUNO_ANA] });
    const renders = contarRenders(window);

    let liberarSalvar = null;
    window.salvarDados = (_silencioso, opcoes) => new Promise((resolver) => {
        liberarSalvar = () => {
            const op = opcoes && opcoes.operacao;
            window.contextoDados.registrarEtapa(op, { url: 'http://api.test/api/agendamentos', method: 'POST', confirmada: true });
            resolver({ ok: true, motivo: 'sucesso' });
        };
    });

    preencherESubmeter(window);

    // Tempo real para o debounce (setTimeout 0) disparar enquanto a gravação segue pendente.
    await new Promise((resolver) => setTimeout(resolver, 25));

    assert.ok(typeof liberarSalvar === 'function', 'salvarDados foi chamado e segue pendente');
    assert.ok(renders.semana >= 1, 'a interface foi acionada antes da confirmação remota');
    assert.ok(renders.stats >= 1, 'as estatísticas do painel foram acionadas junto');
    assert.equal(window.__homeSemAncoraHoje, false, 'o render otimista não deixa âncora pendurada');
    const aulasPendentes = JSON.parse(vm.runInContext('JSON.stringify(aulas)', dom.getInternalVMContext()));
    assert.equal(aulasPendentes.length, 1, 'a aula está no estado local antes da confirmação');

    liberarSalvar();
    await barreira();

    assert.deepEqual(capturado.toasts.map(([mensagem]) => mensagem), ['Horário agendado com sucesso!']);
    const aulasFinais = JSON.parse(vm.runInContext('JSON.stringify(aulas)', dom.getInternalVMContext()));
    assert.equal(aulasFinais.length, 1, 'a aula permanece após a confirmação');
});

test('T01 — falha de persistência reverte o item e re-renderiza com toast de erro', async (t) => {
    const { window, capturado, dom } = await criarAmbiente(t, { alunos: [ALUNO_ANA] });
    const renders = contarRenders(window);
    const rendersVendoAula = () => {
        const total = vm.runInContext('aulas.length', dom.getInternalVMContext());
        return total > 0;
    };
    let semanaComItem = 0;
    let semanaSemItem = 0;
    window.renderizarHomeSemana = () => {
        renders.semana += 1;
        if (rendersVendoAula()) semanaComItem += 1;
        else semanaSemItem += 1;
    };

    // Falha com latência real: o render otimista dispara primeiro, a reversão
    // precisa do próprio gatilho para tirar o item da tela.
    window.salvarDados = async (_silencioso, opcoes) => {
        const op = opcoes && opcoes.operacao;
        capturado.gravacoes.push({ tipoOperacao: op ? op.tipo : null });
        await new Promise((resolver) => setTimeout(resolver, 25));
        return { ok: false, motivo: 'falha_remota' };
    };

    preencherESubmeter(window);
    await new Promise((resolver) => setTimeout(resolver, 100));

    assert.equal(capturado.gravacoes.length, 1, 'a gravação foi tentada');
    assert.ok(semanaComItem >= 1, 'o item chegou a ser renderizado (otimismo)');
    assert.ok(semanaSemItem >= 1, 'a reversão re-renderizou o estado restaurado');
    const aulasFinais = JSON.parse(vm.runInContext('JSON.stringify(aulas)', dom.getInternalVMContext()));
    assert.equal(aulasFinais.length, 0, 'o item não sobrevive à falha no estado local');
    assert.equal(window.__homeSemAncoraHoje, false, 'âncora de hoje não fica pendurada após a reversão');
    assert.ok(capturado.toasts.some(([, tipo]) => tipo === 'error'), 'toast de erro comunica a reversão');
    assert.equal(capturado.alerts.length, 0);
});
