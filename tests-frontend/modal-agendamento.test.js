// [TAG-TESTS-MODAL-AGENDAMENTO] modal-agendamento.test.js
// T06 (plano 2026-10-12): fluxo principal de criação de aula avulsa com DOM real
// (jsdom) — abertura via abrirAgendamentoModal, submit com operação e serializer
// reais e salvarDados stubado; e o caminho de erro/validação (sem aluno) sem
// escrita. Recorrência completa, GCal e escolha inicial de tipo/FAB ficam fora
// do escopo decidido no T01 (plano §10 e §13).

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');
const CONTA = 't06@example.com';

// Prefixo da ordem do index.html necessário para modal-agendamento.js.
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

// Markup real do modal, extraído do index.html uma única vez — o teste não
// reconstrói o formulário à mão.
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

// O jsdom dispara DOMContentLoaded nativo de forma assíncrona. Esperar por ele
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
    const dom = new JSDOM(`<!doctype html><html><body>${HTML_MODAL}</body></html>`, {
        url: 'http://localhost/index.html',
        runScripts: 'outside-only',
    });
    t.after(() => dom.window.close());
    const { window } = dom;

    window.googleIdentity = {
        isSignedIn: () => true,
        getIdToken: () => 'token-t06',
        getOwnerEmail: () => CONTA,
        addAuthChangeListener: () => {},
    };
    window.APP_API_CONFIG = { apiBaseUrl: 'http://api.test/api', apiRootUrl: 'http://api.test' };
    window.fetch = async () => { throw new Error('T06 não permite rede real'); };

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
            mesmoContexto: Boolean(op && opcoes.contextoDados === op.contexto),
        });
        window.contextoDados.registrarEtapa(op, { url: 'http://api.test/api/agendamentos', method: 'POST', confirmada: true });
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

test('T06 — criação de aula avulsa: abertura, submit, payload e fechamento', async (t) => {
    const { window, capturado, dom } = await criarAmbiente(t, { alunos: [ALUNO_ANA] });

    window.abrirAgendamentoModal('Segunda', '09:00', 'aula');
    const modal = window.document.getElementById('modalAgendamento');
    assert.equal(modal.style.display, 'flex', 'DialogController real abre o modal');
    assert.equal(window.document.getElementById('agendaTipo').value, 'aula');

    window.document.getElementById('agendaAluno').value = 'aluno-1';
    window.document.getElementById('agendaHoraInicio').value = '09:00';
    window.document.getElementById('agendaDuracao').value = '60';

    window.document.getElementById('formAgendamento').dispatchEvent(
        new window.Event('submit', { bubbles: true, cancelable: true }),
    );
    await barreira();

    assert.equal(capturado.gravacoes.length, 1, 'exatamente uma gravação');
    const gravacao = capturado.gravacoes[0];
    assert.equal(gravacao.tipoOperacao, 'criar-agendamento');
    assert.equal(gravacao.mesmoContexto, true, 'a operação recebe o próprio contexto');

    const payload = gravacao.payload;
    assert.equal(payload.tipo, 'aula');
    assert.equal(payload.alunoId, 'aluno-1');
    assert.equal(payload.data, '31/08/2026');
    assert.equal(payload.dia, 'Segunda');
    assert.equal(payload.horarioInicio, '09:00');
    assert.equal(payload.horarioFim, '10:00');
    assert.equal(payload.frequencia, 'uma_vez');

    const aulasGravadas = JSON.parse(vm.runInContext('JSON.stringify(aulas)', dom.getInternalVMContext()));
    assert.equal(aulasGravadas.length, 1, 'a aula criada permanece no estado');
    assert.equal(aulasGravadas[0].id, payload.id);

    assert.equal(modal.style.display, 'none', 'modal fecha após gravar');
    assert.equal(window.DialogController.getStack().length, 0, 'pilha de diálogos vazia após fechar');
    assert.deepEqual(capturado.toasts.map(([mensagem]) => mensagem), ['Horário agendado com sucesso!']);
    assert.equal(capturado.alerts.length, 0);
    assert.equal(window.contextoDados.obterPendencia(), null, 'operação finalizada sem pendência');
});

test('T06 — submissão sem aluno é barrada pela validação e não grava', async (t) => {
    const { window, capturado, dom } = await criarAmbiente(t, { alunos: [ALUNO_ANA] });

    window.abrirAgendamentoModal('Segunda', '09:00', 'aula');
    // Aluno não selecionado: o select permanece no placeholder.
    assert.equal(window.document.getElementById('agendaAluno').value, '');

    window.document.getElementById('formAgendamento').dispatchEvent(
        new window.Event('submit', { bubbles: true, cancelable: true }),
    );
    await barreira();

    assert.deepEqual(capturado.alerts, ['Selecione um aluno para agendar a aula.']);
    assert.equal(capturado.gravacoes.length, 0, 'nada é gravado');
    const aulasGravadas = JSON.parse(vm.runInContext('JSON.stringify(aulas)', dom.getInternalVMContext()));
    assert.equal(aulasGravadas.length, 0);
    assert.equal(
        window.document.getElementById('modalAgendamento').style.display,
        'flex',
        'modal continua aberto no erro',
    );
});
