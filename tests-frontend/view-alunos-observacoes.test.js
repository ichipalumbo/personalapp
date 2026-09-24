const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const helpers = require('../backend/shared/reposicao-flow-helpers');

const CAMINHO_VIEW_ALUNOS = path.resolve(__dirname, '..', 'assets', 'js', 'view-alunos.js');
const CAMINHO_DIALOG_CONTROLLER = path.resolve(__dirname, '..', 'assets', 'js', 'features', 'modals', 'dialog-controller.js');

function criarTela(alunos, opcoes = {}) {
    const dom = new JSDOM(`<!doctype html><html><body>
        <div id="listaAlunos"></div>
        <select id="filtroAlunosStatus"><option value="todos">Todos</option></select>
        <select id="filtroAlunosObjetivo"><option value="todos">Todos</option></select>
        <form id="formNovoAluno"><input id="alunoIdEdicao"><input id="alunoNome"><input id="alunoLocal"><input id="alunoPreco"><input id="alunoTelefone"><textarea id="alunoObservacoes"></textarea><input id="alunoFrequenciaSemanal"><input id="alunoFechamentoMesCheio" type="checkbox"><input id="alunoDiaVencimento"><select id="alunoMetodoCobranca"><option value="por_aula">Por aula</option></select><input id="alunoValorFixoCiclo"><input id="alunoObjetivoSwitch" type="checkbox"><input id="alunoStatusSwitch" type="checkbox"></form>
        <div id="modalFormAluno"></div><input id="btnExcluirAlunoModal">
        <div id="modalHistoricoReposicoes" style="display:none"><button id="btnFecharHistoricoReposicoes">Fechar</button><p id="resumoHistoricoReposicoes"></p><div id="conteudoHistoricoReposicoes"></div><button id="btnRodapeHistoricoReposicoes">Fechar</button></div>
        <div id="modalEdicaoCobrancaReposicao" style="display:none"><p id="descricaoEdicaoCobrancaReposicao"></p><select id="seletorCobrancaReposicao"><option value="true">Sim</option><option value="false">Não</option></select><button id="btnCancelarEdicaoCobrancaReposicao">Cancelar</button><button id="btnSalvarEdicaoCobrancaReposicao">Salvar</button></div>
    </body></html>`, { runScripts: 'outside-only', url: 'http://localhost' });
    const { window } = dom;
    window.alunos = alunos;
    window.aulas = [];
    window.aulasParaRepor = [];
    window.reposicaoFlowHelpers = helpers;
    window.formatarMoedaFinanceira = (valor) => `R$ ${Number(valor || 0).toFixed(2)}`;
    window.apiFetchBackend = async () => ({ ok: true, json: async () => [] });
    window.APP_API_CONFIG = { apiBaseUrl: 'http://api.test' };
    window.garantirDadosFinancas = async () => ({});
    window.mostrarToast = () => {};
    window.atualizarDashboardStats = () => {};
    window.preencherFiltrosAlunos = () => {};
    window.salvarDados = async () => ({ ok: true });
    window.normalizarNumeroFinanceiro = (valor) => Number(valor) || 0;
    window.montarCorObjetivoTangerina = () => ({ nome: 'Tangerina', hex: '#f90' });
    window.log = { info() {}, debug() {}, warn() {}, error() {} };
    if (opcoes.comDialogController) {
        vm.runInContext(fs.readFileSync(CAMINHO_DIALOG_CONTROLLER, 'utf8'), dom.getInternalVMContext(), { filename: CAMINHO_DIALOG_CONTROLLER });
    }
    vm.runInContext(fs.readFileSync(CAMINHO_VIEW_ALUNOS, 'utf8'), dom.getInternalVMContext(), { filename: CAMINHO_VIEW_ALUNOS });
    window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
    return { dom, window };
}

test('observacao do aluno aparece no card como texto escapado', (t) => {
    const { dom, window } = criarTela([{
        id: 'aluno-1', nome: 'Ana', local: 'Studio', telefone: '', observacoes: '<script>alert(1)</script>',
        objetivo: 'Personal Trainer', frequenciaSemanal: 2, status: 'ativo', preco: 100,
        diaVencimento: 10, metodoCobranca: 'por_aula'
    }]);
    t.after(() => dom.window.close());

    window.renderizarListaAlunos();
    const card = window.document.querySelector('.aluno-card');
    assert.ok(card.querySelector('.aluno-card-observacoes'));
    assert.equal(card.querySelector('.aluno-card-observacoes').textContent.trim(), '<script>alert(1)</script>');
    assert.equal(card.querySelector('.aluno-card-observacoes script'), null);
});

test('prepararEdicaoAluno carrega observacao no textarea', (t) => {
    const { dom, window } = criarTela([{
        id: 'aluno-2', nome: 'Bia', observacoes: 'Levar faixa elástica', objetivo: 'Personal Trainer',
        frequenciaSemanal: 2, status: 'ativo', preco: 100, diaVencimento: 10, metodoCobranca: 'por_aula'
    }]);
    t.after(() => dom.window.close());

    window.prepararEdicaoAluno('aluno-2');
    assert.equal(window.document.getElementById('alunoObservacoes').value, 'Levar faixa elástica');
});

test('salvar edicao persiste observacao no aluno', (t) => {
    const aluno = {
        id: 'aluno-3', nome: 'Caio', local: 'Studio', observacoes: 'Antes', objetivo: 'Personal Trainer',
        frequenciaSemanal: 2, status: 'ativo', preco: 100, diaVencimento: 10, metodoCobranca: 'por_aula'
    };
    const { dom, window } = criarTela([aluno]);
    t.after(() => dom.window.close());

    window.prepararEdicaoAluno('aluno-3');
    window.document.getElementById('alunoObservacoes').value = 'Atualizada\ncom cuidado';
    window.document.getElementById('formNovoAluno').dispatchEvent(new window.Event('submit', { cancelable: true }));

    assert.equal(aluno.observacoes, 'Atualizada\ncom cuidado');
});

test('modal de aluno abre como dialog com foco inicial do campo principal', (t) => {
    const { dom, window } = criarTela([{ id: 'aluno-4', nome: 'Diana', local: 'Studio', objetivo: 'Personal Trainer', frequenciaSemanal: 2, status: 'ativo', preco: 90, diaVencimento: 12, metodoCobranca: 'por_aula' }]);
    t.after(() => dom.window.close());

    const modal = window.document.getElementById('modalFormAluno');
    const nomeInput = window.document.getElementById('alunoNome');

    window.togglePainelCadastro(true);

    assert.equal(modal.getAttribute('role'), 'dialog');
    assert.equal(modal.getAttribute('aria-modal'), 'true');
    assert.equal(modal.getAttribute('aria-labelledby'), 'tituloFormAluno');
    assert.equal(window.document.activeElement, nomeInput);
});

const ALUNO_BASE = { id: 'aluno-5', nome: 'Elisa', local: 'Studio', objetivo: 'Personal Trainer', frequenciaSemanal: 2, status: 'ativo', preco: 90, diaVencimento: 12, metodoCobranca: 'por_aula' };

test('modal de aluno entra no DialogController e Escape devolve o foco ao disparador', (t) => {
    const { dom, window } = criarTela([{ ...ALUNO_BASE }], { comDialogController: true });
    t.after(() => dom.window.close());

    const modal = window.document.getElementById('modalFormAluno');
    const trigger = window.document.createElement('button');
    window.document.body.appendChild(trigger);
    trigger.focus();

    window.prepararEdicaoAluno('aluno-5');
    assert.equal(window.DialogController.getStack().map((el) => el.id).join(','), 'modalFormAluno');
    assert.equal(window.document.body.style.overflow, 'hidden');

    window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    assert.equal(modal.style.display, 'none');
    assert.equal(window.DialogController.getStack().length, 0);
    assert.equal(window.document.body.style.overflow, '');
    assert.equal(window.document.activeElement, trigger);
});

test('cancelar cadastro de aluno alterado pede confirmação e respeita a resposta', (t) => {
    const { dom, window } = criarTela([{ ...ALUNO_BASE }], { comDialogController: true });
    t.after(() => dom.window.close());

    let resposta = false;
    const confirmacoes = [];
    window.confirm = (mensagem) => {
        confirmacoes.push(mensagem);
        return resposta;
    };
    const modal = window.document.getElementById('modalFormAluno');

    window.prepararEdicaoAluno('aluno-5');
    window.cancelarCadastroAluno();
    assert.equal(confirmacoes.length, 0, 'sem alteração não pergunta');
    assert.equal(modal.style.display, 'none');

    window.prepararEdicaoAluno('aluno-5');
    window.document.getElementById('alunoNome').value = 'Elisa Souza';
    window.cancelarCadastroAluno();
    assert.equal(confirmacoes.length, 1);
    assert.equal(modal.style.display, 'flex', 'recusar mantém o formulário aberto');

    resposta = true;
    window.cancelarCadastroAluno();
    assert.equal(modal.style.display, 'none');
});

test('histórico e edição de cobrança empilham no DialogController e Escape fecha só o topo', async (t) => {
    const { dom, window } = criarTela([{ ...ALUNO_BASE }], { comDialogController: true });
    t.after(() => dom.window.close());

    const doc = window.document;
    const pilha = () => window.DialogController.getStack().map((el) => el.id).join(',');
    const esc = () => doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const historico = doc.getElementById('modalHistoricoReposicoes');
    const edicao = doc.getElementById('modalEdicaoCobrancaReposicao');
    const trigger = doc.createElement('button');
    doc.body.appendChild(trigger);
    trigger.focus();

    await window.abrirHistoricoReposicoes('aluno-5', trigger);
    assert.equal(pilha(), 'modalHistoricoReposicoes');

    const btnEditar = doc.createElement('button');
    historico.appendChild(btnEditar);
    btnEditar.focus();
    window.abrirEdicaoCobrancaReposicao('rep-1', true);
    assert.equal(pilha(), 'modalHistoricoReposicoes,modalEdicaoCobrancaReposicao');
    assert.equal(historico.getAttribute('aria-hidden'), 'true');

    esc();
    assert.equal(pilha(), 'modalHistoricoReposicoes');
    assert.equal(edicao.style.display, 'none');
    assert.equal(historico.style.display, 'flex');
    assert.equal(doc.activeElement, btnEditar);

    esc();
    assert.equal(pilha(), '');
    assert.equal(doc.activeElement, trigger);
    assert.equal(doc.body.style.overflow, '');
});
