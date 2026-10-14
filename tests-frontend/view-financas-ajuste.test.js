// [TAG-TESTS-VIEW-FINANCAS-AJUSTE] view-financas-ajuste.test.js
// Cobre o T04 (D4=B): o modal "Ajuste manual" exibe a linha de substituição e a
// prévia do novo total calculada pelo backend (GET /financas/:cicloId/simulacao-ajuste),
// disparada na abertura e a cada alteração do campo (com debounce), com estado de
// falha sem bloquear o Salvar.

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

function criarCard() {
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
            aulasManuaisExtras: 1,
            metodoCobranca: 'por_aula',
            valorTotalCiclo: 220,
            status: 'em_aberto',
            dataPagamento: null
        }
    };
}

async function carregarTela(opcoes = {}) {
    const dom = new JSDOM('<!doctype html><html><body><div class="container"><main id="tela-alunos"></main></div></body></html>', {
        runScripts: 'outside-only',
        url: 'http://localhost'
    });
    const { window } = dom;
    require('./setup/contexto-dados')(dom);
    const card = criarCard();
    const chamadas = [];

    window.APP_API_CONFIG = { apiBaseUrl: 'http://api.test' };
    window.obterCacheFinancas = () => null;
    window.salvarCacheFinancas = () => {};
    window.formatarMoeda = (valor) => `R$ ${Number(valor).toFixed(2)}`;
    window.mostrarToast = () => {};
    window.apiFetchBackend = async (url) => {
        if (url.includes('/simulacao-ajuste')) {
            chamadas.push(url);
            if (opcoes.falhaSimulacao) return criarResposta(500, { error: 'Falha simulada' });
            if (opcoes.simulacaoFixa) return criarResposta(200, opcoes.simulacaoFixa);
            const match = /aulasManuaisExtras=(-?\d*)/.exec(url);
            const extras = Number(match && match[1] ? match[1] : 0);
            const total = Math.max(0, 4 + extras);
            return criarResposta(200, {
                metodoCobranca: 'por_aula',
                precoAula: 44,
                valorFixoCiclo: null,
                aulasContadas: 4,
                aulasManuaisExtras: extras,
                totalAulasCobradas: total,
                valorTotalCiclo: total * 44
            });
        }
        if (url.endsWith('/financas')) return criarResposta(200, [card]);
        if (url.endsWith('/aluno-1/historico')) return criarResposta(200, []);
        throw new Error(`URL inesperada: ${url}`);
    };

    vm.runInContext(fs.readFileSync(CAMINHO_VIEW_FINANCAS, 'utf8'), dom.getInternalVMContext(), { filename: CAMINHO_VIEW_FINANCAS });
    await window.inicializarFinancas({ forcarRemoto: true });

    return { dom, window, chamadas };
}

function abrirAjuste(window) {
    window.document.querySelector('[data-financas-ajuste="aluno-1"][data-ciclo-id="ciclo-atual"]').click();
}

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('abrir o ajuste dispara a prévia do backend e exibe o novo total (T04/D4=B)', async (t) => {
    const { dom, window, chamadas } = await carregarTela();
    t.after(() => dom.window.close());

    abrirAjuste(window);
    await esperar(60);

    assert.equal(window.document.getElementById('modalFinancasAjuste').style.display, 'flex');
    assert.equal(window.document.getElementById('financasAjusteSubstituicao').textContent, 'O valor informado substitui o ajuste atual do ciclo.');
    assert.equal(chamadas.length, 1, 'a abertura deve disparar exatamente uma prévia');
    assert.match(chamadas[0], /\/financas\/ciclo-atual\/simulacao-ajuste\?aulasManuaisExtras=1$/);
    assert.equal(window.document.getElementById('financasAjustePrevia').textContent, 'Novo total: 5 aula(s) × R$ 44.00 → R$ 220.00');
});

test('prévia em valor_fixo informa que o total permanece (T04/D4=B)', async (t) => {
    const { dom, window } = await carregarTela({
        simulacaoFixa: {
            metodoCobranca: 'valor_fixo',
            precoAula: null,
            valorFixoCiclo: 220,
            aulasContadas: 0,
            aulasManuaisExtras: 1,
            totalAulasCobradas: 1,
            valorTotalCiclo: 220
        }
    });
    t.after(() => dom.window.close());

    abrirAjuste(window);
    await esperar(60);

    assert.equal(window.document.getElementById('financasAjustePrevia').textContent, 'Cobrança fixa: total permanece R$ 220.00.');
});

test('falha da prévia mostra mensagem e mantém o Salvar utilizável (T04/D4=B)', async (t) => {
    const { dom, window } = await carregarTela({ falhaSimulacao: true });
    t.after(() => dom.window.close());

    abrirAjuste(window);
    await esperar(60);

    assert.equal(window.document.getElementById('financasAjustePrevia').textContent, 'Não foi possível calcular a prévia agora.');
    assert.equal(window.document.getElementById('btnSalvarAjuste').disabled, false, 'a prévia é informativa; o Salvar continua habilitado');
});

test('alterar o campo refaz a prévia com o novo valor após o debounce (T04/D4=B)', async (t) => {
    const { dom, window, chamadas } = await carregarTela();
    t.after(() => dom.window.close());

    abrirAjuste(window);
    await esperar(60);
    assert.equal(chamadas.length, 1);

    const campo = window.document.getElementById('financasAulasExtras');
    campo.value = '3';
    campo.dispatchEvent(new window.Event('input', { bubbles: true }));
    await esperar(500);

    assert.equal(chamadas.length, 2, 'o debounce deve disparar uma única nova prévia');
    assert.match(chamadas[1], /aulasManuaisExtras=3$/);
    assert.equal(window.document.getElementById('financasAjustePrevia').textContent, 'Novo total: 7 aula(s) × R$ 44.00 → R$ 308.00');
});
