const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const ARQUIVO = path.resolve(__dirname, '../assets/js/view-financas.js');
const drenar = () => new Promise((resolver) => setImmediate(resolver));
const resposta = (dados, status = 200) => ({ ok: status === 200, status, json: async () => dados });
function adiada() {
    let resolver;
    const promise = new Promise((resolve) => { resolver = resolve; });
    return { promise, resolver };
}
function ciclo(alunoId, id = `atual-${alunoId}`, valor = 400) {
    return {
        _id: id, alunoId, cicloInicio: '2026-09-01', cicloFim: '2026-09-30',
        aulasContadas: 4, aulasManuaisExtras: 0, valorTotalCiclo: valor,
        metodoCobranca: 'por_aula', status: 'em_aberto', dataPagamento: null, extrato: []
    };
}
function cards() {
    return ['aluno-1', 'aluno-2', 'aluno-3'].map((id) => ({
        alunoId: id, aluno: { id, nome: id }, configuracaoPendente: false,
        historicoDisponivel: true, cicloAtual: ciclo(id)
    }));
}
async function ambiente(t) {
    const dom = new JSDOM('<!doctype html><div class="container"><main id="tela-alunos"></main></div>', {
        url: 'http://localhost', runScripts: 'outside-only'
    });
    t.after(() => dom.window.close());
    require('./setup/contexto-dados')(dom);
    const { window } = dom;
    let dono = 'teste@example.com';
    window.googleIdentity.getOwnerEmail = () => dono;
    const chamadas = [];
    const rotas = { financas: () => resposta(cards()) };
    window.APP_API_CONFIG = { apiBaseUrl: 'http://api.test' };
    window.obterCacheFinancas = () => window.contextoDados.lerFinancas();
    window.salvarCacheFinancas = (dados, contexto) => window.contextoDados.salvarFinancas(dados, contexto);
    window.mostrarToast = () => {};
    window.apiFetchBackend = async (url, opcoes) => {
        const rota = url.replace('http://api.test/', '');
        chamadas.push({ rota, opcoes });
        if (!rotas[rota]) throw new Error(`Rota inesperada: ${rota}`);
        return rotas[rota]();
    };
    vm.runInContext(fs.readFileSync(ARQUIVO, 'utf8'), dom.getInternalVMContext(), { filename: ARQUIVO });
    assert.equal(await window.inicializarFinancas({ forcarRemoto: true }), true);
    chamadas.length = 0;
    const state = window.__financasState;
    const trocar = (email) => { dono = email; window.contextoDados.capturar(); };
    const abrir = (id) => {
        const details = window.document.querySelector(`[data-financas-historico-details="${id}"]`);
        assert.ok(details);
        details.open = true;
        details.dispatchEvent(new window.Event('toggle'));
    };
    return { window, state, chamadas, rotas, trocar, abrir };
}
function historicoPronto(dados) {
    return { status: 'pronto', dados, erro: null, requestId: 7 };
}

// Mutação candidata: invalidar só historicoAberto ou remover a invalidação de dados/requestId.
test('C — recuperação invalida históricos afetados fechados e recarrega somente abertos', { timeout: 5000 }, async (t) => {
    const a = await ambiente(t);
    a.state.historicoPorAluno['aluno-1'] = historicoPronto([ciclo('aluno-1', 'historico-fechado', 100)]);
    a.state.historicoPorAluno['aluno-2'] = historicoPronto([ciclo('aluno-2', 'historico-aberto', 200)]);
    const naoAfetado = historicoPronto([ciclo('aluno-3', 'historico-preservado', 300)]);
    a.state.historicoPorAluno['aluno-3'] = naoAfetado;
    a.state.historicoAberto['aluno-2'] = true;
    a.rotas['financas/aluno-1/historico'] = () => resposta([ciclo('aluno-1', 'historico-fechado', 450)]);
    a.rotas['financas/aluno-2/historico'] = () => resposta([ciclo('aluno-2', 'historico-aberto', 550)]);

    assert.equal(await a.window.atualizarFinancasAposRecuperacao({ alunoIds: ['aluno-1', 'aluno-2'] }), true);
    await drenar();
    assert.equal(a.state.historicoPorAluno['aluno-1'].status, 'idle');
    assert.equal(a.state.historicoPorAluno['aluno-1'].dados.length, 0);
    assert.equal(a.state.historicoPorAluno['aluno-1'].requestId, 8);
    assert.equal(a.state.historicoPorAluno['aluno-2'].dados[0].valorTotalCiclo, 550);
    assert.equal(a.state.historicoPorAluno['aluno-3'], naoAfetado);
    assert.deepEqual(a.chamadas.map((item) => item.rota), ['financas', 'financas/aluno-2/historico']);

    a.abrir('aluno-1');
    await drenar();
    assert.equal(a.state.historicoPorAluno['aluno-1'].dados[0].valorTotalCiclo, 450);
    assert.equal(a.chamadas.filter((item) => item.rota === 'financas/aluno-1/historico').length, 1);
});

// Mutação candidata: não incrementar requestId ao abandonar ou invalidar só depois do GET vigente.
test('C — recuperação com GET vigente falho invalida histórico e descarta callback anterior', { timeout: 5000 }, async (t) => {
    const a = await ambiente(t);
    const corpo = adiada();
    const iniciou = adiada();
    a.rotas['financas/aluno-1/historico'] = () => ({
        ok: true, status: 200, json: () => { iniciou.resolver(); return corpo.promise; }
    });
    a.abrir('aluno-1');
    await iniciou.promise;
    a.window.document.querySelector('[data-financas-historico-details="aluno-1"]').open = false;
    delete a.state.historicoAberto['aluno-1'];
    a.rotas.financas = () => resposta({}, 500);
    assert.equal(await a.window.atualizarFinancasAposRecuperacao({ alunoIds: ['aluno-1'] }), false);
    corpo.resolver([ciclo('aluno-1', 'callback-antigo', 999)]);
    await drenar();
    assert.equal(a.state.historicoPorAluno['aluno-1'].status, 'idle');
    assert.equal(a.state.historicoPorAluno['aluno-1'].dados.length, 0);
    assert.equal(a.chamadas.filter((item) => item.rota.endsWith('/historico')).length, 1);
});

// Mutação candidata: voltar a apagar todas as travas do aluno após leitura de histórico.
test('C — histórico libera apenas travas de ciclos retornados, nunca vigente ou ausente', { timeout: 5000 }, async (t) => {
    const a = await ambiente(t);
    a.state.ciclosAguardandoLeitura = {
        'atual-aluno-1': { alunoId: 'aluno-1', historico: false },
        'historico-relido': { alunoId: 'aluno-1', historico: true },
        'historico-ausente': { alunoId: 'aluno-1', historico: true },
        'historico-outra-conta-aluno': { alunoId: 'aluno-2', historico: true }
    };
    a.rotas['financas/aluno-1/historico'] = () => resposta([ciclo('aluno-1', 'historico-relido')]);
    a.abrir('aluno-1');
    await drenar();
    assert.equal(a.state.historicoPorAluno['aluno-1'].status, 'pronto');
    assert.equal(a.state.ciclosAguardandoLeitura['historico-relido'], undefined);
    assert.ok(a.state.ciclosAguardandoLeitura['atual-aluno-1']);
    assert.ok(a.state.ciclosAguardandoLeitura['historico-ausente']);
    assert.ok(a.state.ciclosAguardandoLeitura['historico-outra-conta-aluno']);
    a.window.document.querySelector('[data-financas-ajuste][data-ciclo-id="atual-aluno-1"]').click();
    assert.equal(a.window.document.getElementById('modalFinancasAjuste').style.display, 'none');
});

// Mutação candidata: absorver carregarFinancas false e retornar o mapa anterior com forcarRemoto.
test('C — garantia remota falha explicitamente sem entregar cache antigo como leitura confirmada', { timeout: 5000 }, async (t) => {
    const a = await ambiente(t);
    const anteriores = a.state.cards;
    const cacheAnterior = a.window.localStorage.getItem('personal_financas_cache');
    a.rotas.financas = () => resposta({}, 500);
    await assert.rejects(a.window.garantirDadosFinancas({ forcarRemoto: true }), /Não foi possível atualizar o financeiro/);
    assert.equal(a.state.cards, anteriores);
    assert.equal(a.window.localStorage.getItem('personal_financas_cache'), cacheAnterior);
    assert.equal((await a.window.garantirDadosFinancas())['aluno-1'], anteriores[0]);
    assert.equal(a.chamadas.length, 1, 'Leitura normal continua podendo consumir cache autorizado');
});

test('C — garantia remota aceita lista vazia válida sem repovoar mapa com cache anterior', { timeout: 5000 }, async (t) => {
    const a = await ambiente(t);
    a.rotas.financas = () => resposta([]);
    const mapa = await a.window.garantirDadosFinancas({ forcarRemoto: true });
    assert.equal(Object.keys(mapa).length, 0);
    assert.equal(a.state.cards.length, 0);
    assert.equal(a.window.contextoDados.lerFinancas().dados.length, 0);
});

// Mutação candidata: ignorar opcoes.contextoDados ou validar somente o email, sem geração.
test('C — recuperação rejeita contexto A anterior após A→B→A sem invalidar histórico atual', { timeout: 5000 }, async (t) => {
    const a = await ambiente(t);
    const anterior = a.window.contextoDados.capturar();
    a.trocar('outra@example.com');
    a.trocar('teste@example.com');
    a.state.cards = cards();
    const atual = historicoPronto([ciclo('aluno-1', 'historico-nova-sessao')]);
    a.state.historicoPorAluno['aluno-1'] = atual;
    assert.equal(await a.window.atualizarFinancasAposRecuperacao({ alunoIds: ['aluno-1'] }, { contextoDados: anterior }), false);
    await assert.rejects(a.window.garantirDadosFinancas({ forcarRemoto: true, contextoDados: anterior }), /CONTEXTO_OBSOLETO/);
    assert.equal(a.state.historicoPorAluno['aluno-1'], atual);
    assert.equal(atual.status, 'pronto');
    assert.equal(atual.requestId, 7);
    assert.equal(a.chamadas.length, 0);
});