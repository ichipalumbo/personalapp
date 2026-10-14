// [TAG-TESTS-VIEW-FINANCAS-PAGAMENTO] view-financas-pagamento.test.js
// Cobre o T03 (D3=A): o modal "Marcar como pago" exibe o valor do ciclo
// selecionado (vigente ou histórico não pago, vindo dos dados da API — nunca o
// do outro ciclo nem preço do aluno) e o aviso de congelamento.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const CAMINHO_VIEW_FINANCAS = path.resolve(__dirname, '..', 'assets', 'js', 'view-financas.js');

function criarResposta(status, corpo) {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => corpo
    };
}

function criarCard(opcoes = {}) {
    return {
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
            dataPagamento: null,
            ...(opcoes.cicloAtual || {})
        },
        historico: opcoes.historico || []
    };
}

async function carregarTela(card) {
    const dom = new JSDOM('<!doctype html><html><body><div class="container"><main id="tela-alunos"></main></div></body></html>', {
        runScripts: 'outside-only',
        url: 'http://localhost'
    });
    const { window } = dom;
    require('./setup/contexto-dados')(dom);

    window.APP_API_CONFIG = { apiBaseUrl: 'http://api.test' };
    window.obterCacheFinancas = () => null;
    window.salvarCacheFinancas = () => {};
    window.formatarMoeda = (valor) => `R$ ${Number(valor).toFixed(2)}`;
    window.mostrarToast = () => {};
    window.apiFetchBackend = async (url) => {
        if (url.endsWith('/financas')) return criarResposta(200, [card]);
        if (url.endsWith(`/financas/${card.alunoId}/historico`)) return criarResposta(200, card.historico || []);
        throw new Error(`URL inesperada: ${url}`);
    };

    vm.runInContext(fs.readFileSync(CAMINHO_VIEW_FINANCAS, 'utf8'), dom.getInternalVMContext(), { filename: CAMINHO_VIEW_FINANCAS });
    await window.inicializarFinancas({ forcarRemoto: true });

    return { dom, window };
}

test('modal de pagamento exibe o valor do ciclo selecionado e o aviso de congelamento (T03/D3=A)', async (t) => {
    const { dom, window } = await carregarTela(criarCard());
    t.after(() => dom.window.close());

    window.document.querySelector('[data-financas-pagar="aluno-1"][data-ciclo-id="ciclo-atual"]').click();

    assert.equal(window.document.getElementById('modalFinancasPagamento').style.display, 'flex');
    assert.equal(window.document.getElementById('financasPagamentoValor').textContent, 'R$ 400.00', 'o valor exibido deve ser o do ciclo selecionado');
    assert.match(window.document.getElementById('financasPagamentoCongelamento').textContent, /congela após o pagamento/, 'o aviso de congelamento deve estar presente antes de salvar');
});

test('modal de pagamento do histórico exibe o valor do próprio ciclo, nunca o do ciclo atual (T03/D3=A)', async (t) => {
    const { dom, window } = await carregarTela(criarCard({
        historico: [{
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
        }]
    }));
    t.after(() => dom.window.close());

    const details = window.document.querySelector('[data-financas-historico-details="aluno-1"]');
    details.open = true;
    details.dispatchEvent(new window.Event('toggle', { bubbles: true }));
    await new Promise((resolve) => setImmediate(resolve));

    window.document.querySelector('[data-financas-pagar="aluno-1"][data-ciclo-id="ciclo-historico-aberto"]').click();

    const valor = window.document.getElementById('financasPagamentoValor').textContent;
    assert.equal(valor, 'R$ 300.00', 'o valor deve ser o do ciclo histórico selecionado');
    assert.notEqual(valor, 'R$ 400.00', 'o valor nunca pode ser o do ciclo atual');
});

test('modal de pagamento com valor_fixo exibe o valor do ciclo selecionado (T03/D3=A)', async (t) => {
    const { dom, window } = await carregarTela(criarCard({
        cicloAtual: { metodoCobranca: 'valor_fixo', valorTotalCiclo: 250 }
    }));
    t.after(() => dom.window.close());

    window.document.querySelector('[data-financas-pagar="aluno-1"][data-ciclo-id="ciclo-atual"]').click();

    assert.equal(window.document.getElementById('financasPagamentoValor').textContent, 'R$ 250.00');
});
