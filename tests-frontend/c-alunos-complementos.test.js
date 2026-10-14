const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const helpers = require('../backend/shared/reposicao-flow-helpers');

const ARQUIVO = path.resolve(__dirname, '../assets/js/view-alunos.js');
const DIALOGO = path.resolve(__dirname, '../assets/js/features/modals/dialog-controller.js');
const ALUNO = {
    id: 'aluno-1', nome: 'Ana', objetivo: 'Personal Trainer', status: 'ativo',
    frequenciaSemanal: 2, preco: 100, diaVencimento: 10, metodoCobranca: 'por_aula'
};
const reposicao = (id = 'reposicao-antiga') => ({
    id, alunoId: ALUNO.id, status: 'realizada', cobravel: true, dataOriginal: '2026-09-01'
});
const resposta = (dados, status = 200) => ({ ok: status === 200, status, json: async () => dados });

function adiada() {
    let resolver;
    const promise = new Promise((resolve) => { resolver = resolve; });
    return { promise, resolver };
}

function ambiente(t) {
    const dom = new JSDOM(`<!doctype html><html><body>
        <button id="origem">Reposições</button><div id="listaAlunos"></div>
        <div id="modalHistoricoReposicoes" style="display:none">
            <p id="resumoHistoricoReposicoes"></p><div id="conteudoHistoricoReposicoes"></div>
        </div>
    </body></html>`, { url: 'http://localhost', runScripts: 'outside-only' });
    t.after(() => dom.window.close());
    require('./setup/contexto-dados')(dom);
    const { window } = dom;
    let dono = 'teste@example.com';
    window.googleIdentity.getOwnerEmail = () => dono;
    window.alunos = [{ ...ALUNO }];
    window.aulas = [];
    window.aulasParaRepor = [];
    window.reposicaoFlowHelpers = helpers;
    window.APP_API_CONFIG = { apiBaseUrl: 'http://api.test' };
    const chamadas = [];
    const toasts = [];
    const fontes = {
        financas: async () => ({ [ALUNO.id]: { alunoId: ALUNO.id, configuracaoPendente: true } }),
        reposicoes: async () => resposta([reposicao()]),
        'alunos/consistencia-agenda': async () => resposta([
            { alunoId: ALUNO.id, aulasFaltamAgendar: 2, aulasSemanaisContrato: 2 }
        ]),
        [`reposicoes?alunoId=${ALUNO.id}`]: async () => resposta([reposicao('reposicao-relida')])
    };
    let resumoAtual = {};
    window.garantirDadosFinancas = async (opcoes) => {
        chamadas.push({ rota: 'financas', opcoes });
        resumoAtual = await fontes.financas();
        return resumoAtual;
    };
    window.obterResumoFinanceiroPorAluno = () => resumoAtual;
    window.apiFetchBackend = async (url, opcoes) => {
        const rota = url.replace('http://api.test/', '');
        chamadas.push({ rota, opcoes });
        if (!fontes[rota]) throw new Error(`Rota inesperada: ${rota}`);
        return fontes[rota]();
    };
    window.mostrarToast = (...args) => toasts.push(args);
    window.log = { info() {}, warn() {}, error() {}, debug() {} };
    const contextoVM = dom.getInternalVMContext();
    vm.runInContext(fs.readFileSync(DIALOGO, 'utf8'), contextoVM, { filename: DIALOGO });
    vm.runInContext(fs.readFileSync(ARQUIVO, 'utf8'), contextoVM, { filename: ARQUIVO });
    const estado = () => JSON.parse(JSON.stringify(vm.runInContext(`({
        financeiro: _resumoFinanceiroPorAluno, financeiroErro: _resumoFinanceiroErro,
        consistencia: _consistenciaAgendaPorAluno, consistenciaErro: _consistenciaAgendaErro,
        reposicoes: _reposicoesHistorico, reposicoesErro: _reposicoesHistoricoErro
    })`, contextoVM)));
    const trocar = (email) => { dono = email; window.contextoDados.capturar(); };
    const origem = window.document.getElementById('origem');
    const retorno = () => { window._retornoHistoricoReposicoes = { alunoId: ALUNO.id, origem }; };
    return { window, fontes, chamadas, toasts, estado, trocar, origem, retorno };
}

// Mutação candidata: absorver falha financeira/consistência ou transformar payload não-array em [].
// Outra: manter cache anterior no catch ou voltar a concluir só por _reposicoesHistoricoErro.
test('C — qualquer fonte falha invalida só seu complemento e retorna false agregado', { timeout: 5000 }, async (t) => {
    const casos = [
        { fonte: 'financas', erro: 'financeiroErro', dados: 'financeiro', falhar: async () => { throw new Error('Financeiro indisponível'); } },
        { fonte: 'financas', erro: 'financeiroErro', dados: 'financeiro', falhar: async () => [] },
        { fonte: 'reposicoes', erro: 'reposicoesErro', dados: 'reposicoes', falhar: async () => resposta({}, 500) },
        { fonte: 'reposicoes', erro: 'reposicoesErro', dados: 'reposicoes', falhar: async () => resposta({ itens: [] }) },
        { fonte: 'alunos/consistencia-agenda', erro: 'consistenciaErro', dados: 'consistencia', falhar: async () => resposta({}, 500) },
        { fonte: 'alunos/consistencia-agenda', erro: 'consistenciaErro', dados: 'consistencia', falhar: async () => resposta(null) },
        { fonte: 'alunos/consistencia-agenda', erro: 'consistenciaErro', dados: 'consistencia', falhar: async () => { throw new Error('Sem rede'); } }
    ];
    for (const caso of casos) {
        const a = ambiente(t);
        assert.equal(await a.window.carregarDadosComplementaresAlunos(), true);
        const anterior = a.estado();
        a.chamadas.length = 0;
        a.fontes[caso.fonte] = caso.falhar;
        assert.equal(await a.window.atualizarAlunosAposRecuperacao(), false, caso.fonte);
        const atual = a.estado();
        assert.equal(atual[caso.erro], true);
        assert.equal(Object.keys(atual[caso.dados]).length, 0);
        for (const campo of ['financeiro', 'consistencia', 'reposicoes']) {
            if (campo !== caso.dados) assert.deepEqual(atual[campo], anterior[campo]);
        }
        assert.deepEqual(a.chamadas.map((item) => item.rota), ['financas', 'reposicoes', 'alunos/consistencia-agenda']);
        const lista = a.window.document.getElementById('listaAlunos').textContent;
        assert.match(lista, /Não foi possível atualizar/);
        if (caso.erro === 'financeiroErro') assert.doesNotMatch(lista, /Configurar cobrança/);
        if (caso.erro === 'consistenciaErro') assert.doesNotMatch(lista, /Faltam agendar/);
    }
});

// Mutação candidata: remover forcarRemoto ou chamar garantirDadosFinancas mesmo após confirmação.
// O mapa já atualizado vazio precisa ser reutilizado sem GET, não tratado como cache ausente.
test('C — leitura força financeiro remoto e reutiliza atualização confirmada inclusive vazia', { timeout: 5000 }, async (t) => {
    const a = ambiente(t);
    assert.equal(await a.window.atualizarAlunosAposRecuperacao(), true);
    assert.equal(a.chamadas[0].opcoes.forcarRemoto, true);
    for (const mapa of [{ [ALUNO.id]: { alunoId: ALUNO.id, configuracaoPendente: false } }, {}]) {
        a.chamadas.length = 0;
        a.window.obterResumoFinanceiroPorAluno = () => mapa;
        a.fontes.reposicoes = async () => resposta([]);
        a.fontes['alunos/consistencia-agenda'] = async () => resposta([]);
        assert.equal(await a.window.atualizarAlunosAposRecuperacao({ financasAtualizadas: true }), true);
        assert.deepEqual(a.estado().financeiro, mapa);
        assert.deepEqual(a.estado().reposicoes, []);
        assert.deepEqual(a.estado().consistencia, {});
        assert.deepEqual(a.chamadas.map((item) => item.rota), ['reposicoes', 'alunos/consistencia-agenda']);
    }
});

// Mutação candidata: remover guardas de geração/contexto ou aplicar catch após interação nova.
test('C — contexto A→B→A e edição nova descartam callback sem aplicar nem continuar consultas', { timeout: 5000 }, async (t) => {
    for (const evento of ['conta', 'edicao']) {
        const a = ambiente(t);
        assert.equal(await a.window.carregarDadosComplementaresAlunos(), true);
        const conta = a.window.contextoDados.capturar();
        const corpo = adiada();
        const iniciou = adiada();
        a.fontes.reposicoes = async () => ({ ok: true, json: () => { iniciou.resolver(); return corpo.promise; } });
        a.chamadas.length = 0;
        const leitura = a.window.atualizarAlunosAposRecuperacao({ contextoDados: conta });
        await iniciou.promise;
        if (evento === 'conta') {
            a.trocar('outra@example.com');
            a.trocar('teste@example.com');
        } else a.window.contextoDados.definirFormulario('nova-edicao', true);
        const antes = a.estado();
        const htmlAntes = a.window.document.getElementById('listaAlunos').innerHTML;
        corpo.resolver([reposicao('callback-obsoleto')]);
        assert.equal(await leitura, false);
        assert.deepEqual(a.estado(), antes);
        assert.equal(a.window.document.getElementById('listaAlunos').innerHTML, htmlAntes);
        assert.deepEqual(a.chamadas.map((item) => item.rota), ['financas', 'reposicoes']);
        assert.equal(await a.window.atualizarAlunosAposRecuperacao({ contextoDados: conta }), false);
        assert.equal(a.chamadas.length, 2);
    }
});

// Mutação candidata: usar estado modal.erro em vez do retorno; ignorar identidade/fechamento
// do modal antes de aplicar o corpo (inclusive reabertura do mesmo aluno).
test('C — histórico fechado ou substituído descarta leitura e não anuncia sucesso', { timeout: 5000 }, async (t) => {
    for (const fechar of ['publico', 'controlador', 'substituir']) {
        const a = ambiente(t);
        assert.equal(await a.window.carregarDadosComplementaresAlunos(), true);
        const corpo = adiada();
        const iniciou = adiada();
        a.fontes[`reposicoes?alunoId=${ALUNO.id}`] = async () => ({
            ok: true, json: () => { iniciou.resolver(); return corpo.promise; }
        });
        a.retorno();
        const leitura = a.window.finalizarRetornoHistoricoReposicoes({ status: 'sucesso' });
        await iniciou.promise;
        if (fechar === 'publico') a.window.fecharHistoricoReposicoes();
        else if (fechar === 'controlador') a.window.DialogController.close(a.window.document.getElementById('modalHistoricoReposicoes'));
        else {
            a.fontes[`reposicoes?alunoId=${ALUNO.id}`] = async () => resposta([reposicao('historico-substituto')]);
            assert.equal(await a.window.abrirHistoricoReposicoes(ALUNO.id, a.origem), true);
        }
        const antes = a.estado();
        corpo.resolver([reposicao('callback-descartado')]);
        assert.equal(await leitura, false);
        assert.deepEqual(a.estado(), antes);
        assert.equal(a.toasts.length, 0);
        assert.doesNotMatch(a.window.document.getElementById('conteudoHistoricoReposicoes').textContent, /callback-descartado/);
    }
});

// Mutação candidata: tirar operacao do GET, bloquear a própria raiz ou confundir falha
// da leitura com falha de escrita; só a raiz cuja escrita falhou conserva pendência.
test('C — retorno empresta raiz ativa e distingue falha de leitura de escrita confirmada', { timeout: 5000 }, async (t) => {
    for (const caso of ['sucesso', 'http', 'payload', 'rede', 'raiz-falha']) {
        const a = ambiente(t);
        assert.equal(await a.window.carregarDadosComplementaresAlunos(), true);
        const op = a.window.contextoDados.iniciarOperacao({ tipo: 'reagendamento', alvos: { alunoIds: [ALUNO.id] } });
        assert.ok(op);
        // Fixture da escrita já confirmada; nenhuma requisição de escrita é enviada pelo teste.
        a.window.contextoDados.registrarEtapa(op, { method: 'PATCH', confirmada: true });
        if (caso === 'http') a.fontes[`reposicoes?alunoId=${ALUNO.id}`] = async () => resposta({}, 500);
        if (caso === 'payload') a.fontes[`reposicoes?alunoId=${ALUNO.id}`] = async () => resposta({ itens: [] });
        if (caso === 'rede') a.fontes[`reposicoes?alunoId=${ALUNO.id}`] = async () => { throw new Error('Sem rede'); };
        if (caso === 'raiz-falha') a.window.contextoDados.marcarFalhaOperacao(op, new Error('Etapa anterior falhou'));
        a.chamadas.length = 0;
        a.retorno();
        const sucesso = caso === 'sucesso';
        assert.equal(await a.window.finalizarRetornoHistoricoReposicoes({ status: 'sucesso', operacao: op }), sucesso);
        assert.equal(a.chamadas.length, 1);
        assert.equal(a.chamadas[0].opcoes.operacao, op);
        assert.equal(a.chamadas[0].opcoes.contextoDados, op.contexto);
        assert.equal(a.toasts.length, sucesso ? 1 : 0);
        if (sucesso) {
            assert.deepEqual(a.estado().reposicoes.map((item) => item.id), ['reposicao-relida']);
            assert.equal(a.window.document.getElementById('modalHistoricoReposicoes').getAttribute('aria-busy'), 'false');
        } else if (caso !== 'raiz-falha') {
            assert.equal(a.estado().reposicoesErro, true);
            assert.equal(a.estado().reposicoes.length, 0);
            assert.match(a.window.document.getElementById('conteudoHistoricoReposicoes').textContent, /Não foi possível carregar/);
        }
        await a.window.contextoDados.finalizarOperacao(op);
        assert.equal(Boolean(a.window.contextoDados.obterPendencia()), caso === 'raiz-falha');
    }
});

// Mutação candidata: abrir/consumir retorno de operação finalizada ou contexto obsoleto,
// ou dar toast de sucesso para cancelamento/erro mesmo com histórico vazio aplicado.
test('C — retorno sem alvo ou obsoleto é false; cancelamento e erro podem reler sem toast', { timeout: 5000 }, async (t) => {
    const a = ambiente(t);
    assert.equal(await a.window.finalizarRetornoHistoricoReposicoes({ status: 'sucesso' }), false);
    const anterior = a.window.contextoDados.capturar();
    a.trocar('outra@example.com');
    a.trocar('teste@example.com');
    assert.equal(await a.window.abrirHistoricoReposicoes(ALUNO.id, a.origem, { contextoDados: anterior }), false);
    const op = a.window.contextoDados.iniciarOperacao({ tipo: 'reagendamento' });
    assert.ok(op);
    await a.window.contextoDados.finalizarOperacao(op);
    a.retorno();
    const retorno = a.window._retornoHistoricoReposicoes;
    assert.equal(await a.window.finalizarRetornoHistoricoReposicoes({ status: 'sucesso', operacao: op }), false);
    assert.equal(a.window._retornoHistoricoReposicoes, retorno);
    assert.equal(a.chamadas.length, 0);
    a.fontes[`reposicoes?alunoId=${ALUNO.id}`] = async () => resposta([]);
    for (const status of ['cancelado', 'erro']) {
        a.retorno();
        assert.equal(await a.window.finalizarRetornoHistoricoReposicoes({ status }), true);
        assert.equal(a.window.document.getElementById('modalHistoricoReposicoes').getAttribute('aria-busy'), 'false');
    }
    assert.equal(a.toasts.length, 0);
});

function verificarCarregamentoHistorico(a) {
    const doc = a.window.document;
    assert.equal(doc.getElementById('resumoHistoricoReposicoes').textContent, 'Ana · Atualizando…');
    assert.equal(doc.getElementById('modalHistoricoReposicoes').getAttribute('aria-busy'), 'true');
    assert.equal(doc.querySelectorAll('#conteudoHistoricoReposicoes .skeleton').length, 3);
    assert.equal(doc.querySelector('#conteudoHistoricoReposicoes [role="status"] .sr-only').textContent, 'Carregando histórico de reposições');
    assert.equal(doc.querySelector('#conteudoHistoricoReposicoes .historico-reposicoes-vazio'), null);
    assert.equal(doc.querySelector('#conteudoHistoricoReposicoes .historico-reposicoes-erro'), null);
}

// M31: retirar Atualizando…; M33: preparar a descrição só depois do foco.
test('T07 — abertura prepara o carregamento antes do foco e aplica contagens após o GET', { timeout: 5000 }, async (t) => {
    const a = ambiente(t);
    const doc = a.window.document;
    const modal = doc.getElementById('modalHistoricoReposicoes');
    const resumosAoFocar = [];
    modal.addEventListener('focus', () => resumosAoFocar.push({
        texto: doc.getElementById('resumoHistoricoReposicoes').textContent,
        busy: modal.getAttribute('aria-busy')
    }));
    const corpo = adiada();
    const iniciou = adiada();
    const rota = `reposicoes?alunoId=${ALUNO.id}`;
    a.fontes[rota] = async () => ({ ok: true, json: () => { iniciou.resolver(); return corpo.promise; } });

    const leitura = a.window.abrirHistoricoReposicoes(ALUNO.id, a.origem);
    await iniciou.promise;
    verificarCarregamentoHistorico(a);
    assert.deepEqual(resumosAoFocar, [{ texto: 'Ana · Atualizando…', busy: 'true' }]);
    corpo.resolver([reposicao('realizada'), { ...reposicao('pendente'), status: 'pendente' }]);
    assert.equal(await leitura, true);

    assert.equal(doc.getElementById('resumoHistoricoReposicoes').textContent, 'Ana · 1 pendente · 1 realizada');
    assert.equal(modal.getAttribute('aria-busy'), 'false');
    assert.equal(doc.querySelectorAll('#conteudoHistoricoReposicoes .skeleton').length, 0);
    assert.deepEqual(Array.from(doc.querySelectorAll('.historico-reposicao-grupo h4'), (el) => el.textContent), ['Pendentes (1)', 'Realizadas (1)']);
    assert.deepEqual(a.chamadas.map((item) => item.rota), [rota]);
});

// M31 também precisa falhar na reabertura de uma leitura vazia já confirmada.
test('T07 — vazio só aparece após confirmação e não é anunciado na reabertura', { timeout: 5000 }, async (t) => {
    const a = ambiente(t);
    const doc = a.window.document;
    const modal = doc.getElementById('modalHistoricoReposicoes');
    const resumosAoFocar = [];
    modal.addEventListener('focus', () => resumosAoFocar.push(doc.getElementById('resumoHistoricoReposicoes').textContent));
    const rota = `reposicoes?alunoId=${ALUNO.id}`;

    for (const dados of [[], [reposicao('apos-vazio')]]) {
        const corpo = adiada();
        const iniciou = adiada();
        a.fontes[rota] = async () => ({ ok: true, json: () => { iniciou.resolver(); return corpo.promise; } });
        const leitura = a.window.abrirHistoricoReposicoes(ALUNO.id, a.origem);
        await iniciou.promise;
        verificarCarregamentoHistorico(a);
        assert.equal(resumosAoFocar[resumosAoFocar.length - 1], 'Ana · Atualizando…');
        corpo.resolver(dados);
        assert.equal(await leitura, true);
        assert.equal(modal.getAttribute('aria-busy'), 'false');
        assert.equal(doc.querySelectorAll('#conteudoHistoricoReposicoes .skeleton').length, 0);
        if (dados.length === 0) {
            assert.equal(doc.getElementById('resumoHistoricoReposicoes').textContent, 'Ana · nenhuma reposição');
            assert.match(doc.getElementById('conteudoHistoricoReposicoes').textContent, /Nenhuma reposição registrada para este aluno\./);
        } else {
            assert.equal(doc.getElementById('resumoHistoricoReposicoes').textContent, 'Ana · 1 realizada');
            assert.equal(doc.querySelector('.historico-reposicoes-vazio'), null);
        }
        a.window.fecharHistoricoReposicoes();
    }
    assert.deepEqual(a.chamadas.map((item) => item.rota), [rota, rota]);
});

test('T07 — cancelar reagendamento reabre em carregamento e mantém a pendência após a leitura', { timeout: 5000 }, async (t) => {
    const a = ambiente(t);
    const pendente = { ...reposicao('pendente-preservada'), status: 'pendente' };
    const dados = [pendente, reposicao('realizada-preservada')];
    const rota = `reposicoes?alunoId=${ALUNO.id}`;
    a.window.aulasParaRepor = [pendente];
    a.fontes[rota] = async () => resposta(dados);
    assert.equal(await a.window.abrirHistoricoReposicoes(ALUNO.id, a.origem), true);
    const reagendamentos = [];
    a.window.iniciarReagendamentoReposicao = (id) => reagendamentos.push(id);
    a.window.iniciarReagendamentoReposicaoDoHistorico(pendente.id);
    assert.deepEqual(reagendamentos, [pendente.id]);
    assert.equal(a.window.document.getElementById('modalHistoricoReposicoes').style.display, 'none');

    const corpo = adiada();
    const iniciou = adiada();
    a.fontes[rota] = async () => ({ ok: true, json: () => { iniciou.resolver(); return corpo.promise; } });
    const retorno = a.window.finalizarRetornoHistoricoReposicoes({ status: 'cancelado' });
    await iniciou.promise;
    verificarCarregamentoHistorico(a);
    corpo.resolver(dados);
    assert.equal(await retorno, true);
    assert.equal(a.window.document.getElementById('resumoHistoricoReposicoes').textContent, 'Ana · 1 pendente · 1 realizada');
    assert.deepEqual(a.window.aulasParaRepor, [pendente]);
    assert.equal(a.toasts.length, 0);
    assert.deepEqual(a.chamadas.map((item) => item.rota), [rota, rota]);
});

// M32: erro junto de vazio; M34: erro sem dados volta a afirmar nenhuma reposição.
test('T07 — falha HTTP, payload inválido e rede não são vazio; retry faz somente nova leitura', { timeout: 5000 }, async (t) => {
    for (const caso of ['http', 'payload', 'rede']) {
        const a = ambiente(t);
        const doc = a.window.document;
        const rota = `reposicoes?alunoId=${ALUNO.id}`;
        const liberar = adiada();
        const iniciou = adiada();
        a.fontes[rota] = async () => {
            iniciou.resolver();
            await liberar.promise;
            if (caso === 'rede') throw new Error('Sem rede');
            return resposta({ itens: [] }, caso === 'http' ? 500 : 200);
        };
        const leitura = a.window.abrirHistoricoReposicoes(ALUNO.id, a.origem);
        await iniciou.promise;
        verificarCarregamentoHistorico(a);
        liberar.resolver();
        assert.equal(await leitura, false, caso);
        assert.equal(doc.getElementById('modalHistoricoReposicoes').getAttribute('aria-busy'), 'false');
        assert.equal(doc.getElementById('resumoHistoricoReposicoes').textContent, 'Ana · Não foi possível carregar o histórico.');
        assert.equal(doc.querySelector('.historico-reposicoes-vazio'), null, caso);
        assert.equal(doc.querySelectorAll('#conteudoHistoricoReposicoes .skeleton').length, 0);
        assert.match(doc.querySelector('.historico-reposicoes-erro[role="alert"]').textContent, /Não foi possível carregar o histórico\..*Tentar novamente/);

        const corpoRetry = adiada();
        const iniciouRetry = adiada();
        a.fontes[rota] = async () => ({ ok: true, json: () => { iniciouRetry.resolver(); return corpoRetry.promise; } });
        const abrirReal = a.window.abrirHistoricoReposicoes;
        let retry;
        a.window.abrirHistoricoReposicoes = (...args) => { retry = abrirReal(...args); return retry; };
        a.window.recarregarHistoricoReposicoes();
        await iniciouRetry.promise;
        verificarCarregamentoHistorico(a);
        corpoRetry.resolver([]);
        assert.equal(await retry, true);
        assert.equal(doc.getElementById('resumoHistoricoReposicoes').textContent, 'Ana · nenhuma reposição');
        assert.equal(doc.querySelector('.historico-reposicoes-erro'), null);
        assert.ok(doc.querySelector('.historico-reposicoes-vazio'));
        assert.deepEqual(a.chamadas.map((item) => item.rota), [rota, rota]);
        assert.ok(a.chamadas.every((item) => !item.opcoes.method || item.opcoes.method === 'GET'));
        assert.equal(a.toasts.length, 0);
    }
});