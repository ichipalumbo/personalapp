const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const CAMINHO_VIEW_FINANCAS = path.resolve(__dirname, '..', 'assets', 'js', 'view-financas.js');
const CAMINHO_DIALOG_CONTROLLER = path.resolve(__dirname, '..', 'assets', 'js', 'features', 'modals', 'dialog-controller.js');

function criarResposta(status, corpo) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => corpo
    };
}

function criarCardComHistorico(historico) {
    return [{
        alunoId: 'aluno-1',
        aluno: { id: 'aluno-1', nome: 'Ana' },
        configuracaoPendente: false,
        historicoDisponivel: true,
        cicloAtual: {
            _id: 'ciclo-atual',
            cicloInicio: '2026-09-01',
            cicloFim: '2026-09-30',
            aulasContadas: 4,
            aulasManuaisExtras: 0,
            valorTotalCiclo: 400,
            metodoCobranca: 'por_aula',
            status: 'em_aberto',
            dataPagamento: null
        },
        historico
    }];
}

async function carregarTela(historico, opcoes = {}) {
    const dom = new JSDOM('<!doctype html><html><body><div class="container"><main id="tela-alunos"></main></div></body></html>', {
        runScripts: 'outside-only',
        url: 'http://localhost'
    });
    const { window } = dom;
    const cards = criarCardComHistorico(historico);

    window.APP_API_CONFIG = { apiBaseUrl: 'http://api.test' };
    window.obterCacheFinancas = () => null;
    window.salvarCacheFinancas = () => {};
    window.formatarMoeda = (valor) => `R$ ${Number(valor).toFixed(2)}`;
    window.mostrarToast = () => {};
    window.apiFetchBackend = async (url, init) => {
        if (opcoes.respostaPatch && init && init.method === 'PATCH') return opcoes.respostaPatch();
        if (url.endsWith('/financas')) return criarResposta(200, cards);
        if (url.endsWith('/financas/aluno-1/historico')) return criarResposta(200, historico);
        throw new Error(`URL inesperada: ${url}`);
    };

    if (opcoes.comDialogController) {
        vm.runInContext(fs.readFileSync(CAMINHO_DIALOG_CONTROLLER, 'utf8'), dom.getInternalVMContext(), { filename: CAMINHO_DIALOG_CONTROLLER });
    }
    const codigo = fs.readFileSync(CAMINHO_VIEW_FINANCAS, 'utf8');
    vm.runInContext(codigo, dom.getInternalVMContext(), { filename: CAMINHO_VIEW_FINANCAS });
    await window.inicializarFinancas({ forcarRemoto: true });

    const details = window.document.querySelector('[data-financas-historico-details="aluno-1"]');
    details.open = true;
    details.dispatchEvent(new window.Event('toggle', { bubbles: true }));
    await new Promise((resolve) => setImmediate(resolve));

    return { dom, window };
}

test('histórico não pago exibe ações e abre pagamento para o ciclo selecionado', async (t) => {
    const { dom, window } = await carregarTela([{
        _id: 'ciclo-historico-aberto',
        alunoId: 'aluno-1',
        cicloInicio: '2026-08-01',
        cicloFim: '2026-08-31',
        aulasContadas: 3,
        aulasManuaisExtras: 0,
        valorTotalCiclo: 300,
        metodoCobranca: 'por_aula',
        status: 'atrasado',
        dataPagamento: null,
        extrato: []
    }]);
    t.after(() => dom.window.close());

    const pagar = window.document.querySelector('[data-financas-pagar="aluno-1"][data-ciclo-id="ciclo-historico-aberto"]');
    const ajuste = window.document.querySelector('[data-financas-ajuste="aluno-1"][data-ciclo-id="ciclo-historico-aberto"]');

    assert.ok(pagar);
    assert.ok(ajuste);

    pagar.click();

    assert.equal(window.document.getElementById('modalFinancasPagamento').style.display, 'flex');
    assert.match(window.document.getElementById('financasPagamentoResumo').textContent, /Ana.*01\/08\/2026.*31\/08\/2026/);
});

test('histórico pago não exibe ações mutáveis', async (t) => {
    const { dom, window } = await carregarTela([{
        _id: 'ciclo-historico-pago',
        alunoId: 'aluno-1',
        cicloInicio: '2026-07-01',
        cicloFim: '2026-07-31',
        aulasContadas: 3,
        aulasManuaisExtras: 0,
        valorTotalCiclo: 300,
        metodoCobranca: 'por_aula',
        status: 'pago',
        dataPagamento: '2026-08-02',
        extrato: []
    }]);
    t.after(() => dom.window.close());

    assert.equal(window.document.querySelector('[data-ciclo-id="ciclo-historico-pago"]'), null);
});

const CICLO_HISTORICO_ABERTO = {
    _id: 'ciclo-historico-aberto',
    alunoId: 'aluno-1',
    cicloInicio: '2026-08-01',
    cicloFim: '2026-08-31',
    aulasContadas: 3,
    aulasManuaisExtras: 0,
    valorTotalCiclo: 300,
    metodoCobranca: 'por_aula',
    status: 'atrasado',
    dataPagamento: null,
    extrato: []
};

test('modal de pagamento é dialog no DialogController e Escape devolve o foco ao botão', async (t) => {
    const { dom, window } = await carregarTela([{ ...CICLO_HISTORICO_ABERTO }], { comDialogController: true });
    t.after(() => dom.window.close());

    const doc = window.document;
    const pagar = doc.querySelector('[data-financas-pagar="aluno-1"][data-ciclo-id="ciclo-historico-aberto"]');
    pagar.focus();
    pagar.click();

    const modal = doc.getElementById('modalFinancasPagamento');
    assert.equal(modal.getAttribute('role'), 'dialog');
    assert.equal(modal.getAttribute('aria-modal'), 'true');
    assert.match(doc.getElementById(modal.getAttribute('aria-labelledby')).textContent, /Marcar como pago/);
    assert.equal(window.DialogController.getStack().map((el) => el.id).join(','), 'modalFinancasPagamento');
    assert.equal(doc.activeElement, doc.getElementById('financasDataPagamento'));

    doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    assert.equal(modal.style.display, 'none');
    assert.equal(window.DialogController.getStack().length, 0);
    assert.equal(doc.activeElement, pagar);
});

test('falha HTTP ao salvar pagamento mantém o modal aberto na pilha', async (t) => {
    const { dom, window } = await carregarTela([{ ...CICLO_HISTORICO_ABERTO }], {
        comDialogController: true,
        respostaPatch: () => criarResposta(500, {})
    });
    t.after(() => dom.window.close());

    const doc = window.document;
    doc.querySelector('[data-financas-pagar="aluno-1"][data-ciclo-id="ciclo-historico-aberto"]').click();
    doc.getElementById('formFinancasPagamento').dispatchEvent(new window.Event('submit', { cancelable: true }));
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(doc.getElementById('modalFinancasPagamento').style.display, 'flex');
    assert.equal(window.DialogController.getStack().map((el) => el.id).join(','), 'modalFinancasPagamento');
});
