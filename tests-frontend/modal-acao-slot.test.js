// [TAG-TESTS-MODAL-ACAO-SLOT] modal-acao-slot.test.js
// T07 (plano 2026-10-12): edição de aula avulsa com DOM real (jsdom) — abrir,
// editar horário, salvar com operação real do contextoDados e salvarDados
// stubado; aviso de conflito na edição (decisão 1 = B) sem gravação; e fechar
// pelo botão Voltar sem escrita. Split de série e reposição ficam FORA
// (já cobertos pela suíte de backend — decisão do T01).

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');
const CONTA = 't07@example.com';

// Prefixo da ordem do index.html necessário para modal-acao-slot.js.
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
    'assets/js/modal-acao-slot.js',
];

// Markup real dos modais, extraído do index.html uma única vez.
const HTML_MODAIS = (() => {
    const fonte = new JSDOM(fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8'));
    const html = ['modalAgendamento', 'modalAcaoSlot']
        .map((id) => {
            const elemento = fonte.window.document.getElementById(id);
            return elemento ? elemento.outerHTML : '';
        })
        .join('');
    fonte.window.close();
    return html;
})();

const ALUNO_ANA = { id: 'aluno-1', nome: 'Ana', objetivo: 'Personal Trainer', status: 'ativo' };

function aulaAvulsa(overrides = {}) {
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

function carregar(dom, arquivo) {
    vm.runInContext(fs.readFileSync(path.join(RAIZ, arquivo), 'utf8'), dom.getInternalVMContext(), { filename: arquivo });
}

function barreira() {
    return new Promise((resolver) => setImmediate(resolver));
}

// O jsdom dispara DOMContentLoaded nativo de forma assíncrona; esperar por ele
// (em vez de disparar um evento manual) garante que cada listener real seja
// anexado exatamente uma vez — um dispatch manual somado ao evento nativo
// duplicaria o submit e a escrita.
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
    const dom = new JSDOM(`<!doctype html><html><body>${HTML_MODAIS}</body></html>`, {
        url: 'http://localhost/index.html',
        runScripts: 'outside-only',
    });
    t.after(() => dom.window.close());
    const { window } = dom;

    window.googleIdentity = {
        isSignedIn: () => true,
        getIdToken: () => 'token-t07',
        getOwnerEmail: () => CONTA,
        addAuthChangeListener: () => {},
    };
    window.APP_API_CONFIG = { apiBaseUrl: 'http://api.test/api', apiRootUrl: 'http://api.test' };
    window.fetch = async () => { throw new Error('T07 não permite rede real'); };

    for (const arquivo of SCRIPTS) carregar(dom, arquivo);

    window.dataSelecionada = new window.Date(2026, 7, 31, 12, 0, 0); // 31/08/2026, segunda-feira

    const capturado = { toasts: [], alerts: [], confirmacoes: [], gravacoes: [] };

    window.log = { info() {}, debug() {}, warn() {}, error() {} };
    window.mostrarToast = (...args) => capturado.toasts.push(args);
    window.alert = (mensagem) => capturado.alerts.push(mensagem);
    window.confirm = (mensagem) => { capturado.confirmacoes.push(mensagem); return true; };
    window.gcal = { isSignedIn: () => false };
    window.inicializarHome = async () => ({ ok: true, estado: 'aplicado' });
    window.salvarDados = async (_silencioso, opcoes) => {
        const op = opcoes && opcoes.operacao;
        capturado.gravacoes.push({
            payload: op && op.intencao ? op.intencao.agendamento : null,
            tipoOperacao: op ? op.tipo : null,
            acaoIntencao: op && op.intencao ? op.intencao.acao : null,
            mesmoContexto: Boolean(op && opcoes.contextoDados === op.contexto),
        });
        window.contextoDados.registrarEtapa(op, { url: 'http://api.test/api/agendamentos', method: 'PUT', confirmada: true });
        return { ok: true, motivo: 'sucesso' };
    };

    window.contextoDados.iniciar();
    await aguardarDOMContentLoaded(window);

    // O estado entra por último e mutando os arrays em vigor: o handler de
    // invalidação do storage.js (disparado dentro de iniciar()) esvazia os
    // lexicais e os expõe como window.alunos/window.aulas — atualizarAlunos/
    // atualizarAulas mantêm uma única referência viva, e os helpers leem
    // window.alunos primeiro. Trocar o lexical por um array novo deixaria o
    // window apontando para o array vazio antigo.
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

test('T07 — edição de aula avulsa: novo horário é gravado e o modal fecha', async (t) => {
    const { window, capturado, dom } = await criarAmbiente(t, { alunos: [ALUNO_ANA], aulas: [aulaAvulsa()] });

    window.abrirModalAcaoSlot('aula-1');
    const modal = window.document.getElementById('modalAcaoSlot');
    assert.equal(modal.style.display, 'flex', 'DialogController real abre o modal');
    assert.equal(window.document.getElementById('editHoraInicio').value, '09:00', 'formulário pré-preenchido');
    assert.equal(window.document.getElementById('editDuracao').value, '60');
    assert.equal(window.document.getElementById('editAluno').value, 'aluno-1');

    window.document.getElementById('editHoraInicio').value = '11:00';

    window.document.getElementById('formEditarCompromisso').dispatchEvent(
        new window.Event('submit', { bubbles: true, cancelable: true }),
    );
    await barreira();

    assert.equal(capturado.gravacoes.length, 1, 'exatamente uma gravação');
    const gravacao = capturado.gravacoes[0];
    assert.equal(gravacao.tipoOperacao, 'editar-agendamento');
    assert.equal(gravacao.acaoIntencao, 'editar');
    assert.equal(gravacao.mesmoContexto, true, 'a operação recebe o próprio contexto');
    assert.equal(gravacao.payload.horarioInicio, '11:00', 'intenção carrega o novo horário');

    const aulasGravadas = JSON.parse(vm.runInContext('JSON.stringify(aulas)', dom.getInternalVMContext()));
    assert.equal(aulasGravadas.length, 1);
    assert.equal(aulasGravadas[0].id, 'aula-1');
    assert.equal(aulasGravadas[0].alunoId, 'aluno-1', 'campos não editados são preservados');
    assert.equal(aulasGravadas[0].data, '31/08/2026');
    assert.equal(aulasGravadas[0].horarioInicio, '11:00', 'novo horário aplicado no estado');
    assert.equal(aulasGravadas[0].horarioFim, '12:00');

    assert.equal(modal.style.display, 'none', 'modal fecha após gravar');
    assert.deepEqual(capturado.toasts.map(([mensagem]) => mensagem), ['Alterações salvas com sucesso!']);
    assert.equal(capturado.alerts.length, 0);
    assert.equal(window.contextoDados.obterPendencia(), null, 'operação finalizada sem pendência');
});

test('T07 — conflito na edição avulsa: alerta e nenhuma gravação', async (t) => {
    const { window, capturado, dom } = await criarAmbiente(t, {
        alunos: [ALUNO_ANA],
        aulas: [
            aulaAvulsa(),
            aulaAvulsa({ id: 'outra-1', horarioInicio: '11:00', horarioFim: '12:00' }),
        ],
    });

    window.abrirModalAcaoSlot('aula-1');
    const modal = window.document.getElementById('modalAcaoSlot');
    window.document.getElementById('editHoraInicio').value = '11:00';

    window.document.getElementById('formEditarCompromisso').dispatchEvent(
        new window.Event('submit', { bubbles: true, cancelable: true }),
    );
    await barreira();

    assert.deepEqual(capturado.alerts, ['Conflito detectado com Ana (11:00 - 12:00).']);
    assert.equal(capturado.gravacoes.length, 0, 'conflito impede a gravação');
    const aulasGravadas = JSON.parse(vm.runInContext('JSON.stringify(aulas)', dom.getInternalVMContext()));
    assert.equal(aulasGravadas[0].horarioInicio, '09:00', 'estado intacto até a resolução do conflito');
    assert.equal(modal.style.display, 'flex', 'modal continua aberto para correção');
});

test('T07 — fechar pelo botão Voltar não grava nada', async (t) => {
    const { window, capturado, dom } = await criarAmbiente(t, { alunos: [ALUNO_ANA], aulas: [aulaAvulsa()] });

    window.abrirModalAcaoSlot('aula-1');
    const modal = window.document.getElementById('modalAcaoSlot');
    assert.equal(modal.style.display, 'flex');

    window.document.getElementById('editHoraInicio').value = '11:00';

    const botaoVoltar = Array.from(modal.querySelectorAll('button')).find(
        (botao) => botao.getAttribute('onclick') === 'fecharModalAcaoSlot()',
    );
    assert.ok(botaoVoltar, 'botão Voltar precisa existir no markup real');
    // jsdom com runScripts: 'outside-only' não compila atributos onclick (só com
    // 'dangerously'); chamar a mesma função do atributo é o clique determinístico.
    window.fecharModalAcaoSlot();

    assert.equal(modal.style.display, 'none', 'Voltar fecha o modal');
    assert.equal(capturado.gravacoes.length, 0, 'fechar não grava');
    assert.equal(capturado.alerts.length, 0);
    const aulasGravadas = JSON.parse(vm.runInContext('JSON.stringify(aulas)', dom.getInternalVMContext()));
    assert.equal(aulasGravadas[0].horarioInicio, '09:00', 'estado intacto');
    assert.equal(aulasGravadas[0].horarioFim, '10:00');
    assert.equal(window.contextoDados.obterPendencia(), null);
});
