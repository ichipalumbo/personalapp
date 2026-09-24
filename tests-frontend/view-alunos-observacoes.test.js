const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const helpers = require('../backend/shared/reposicao-flow-helpers');

const CAMINHO_VIEW_ALUNOS = path.resolve(__dirname, '..', 'assets', 'js', 'view-alunos.js');

function criarTela(alunos) {
    const dom = new JSDOM(`<!doctype html><html><body>
        <div id="listaAlunos"></div>
        <select id="filtroAlunosStatus"><option value="todos">Todos</option></select>
        <select id="filtroAlunosObjetivo"><option value="todos">Todos</option></select>
        <form id="formNovoAluno"><input id="alunoIdEdicao"><input id="alunoNome"><input id="alunoLocal"><input id="alunoPreco"><input id="alunoTelefone"><textarea id="alunoObservacoes"></textarea><input id="alunoFrequenciaSemanal"><input id="alunoFechamentoMesCheio" type="checkbox"><input id="alunoDiaVencimento"><select id="alunoMetodoCobranca"><option value="por_aula">Por aula</option></select><input id="alunoValorFixoCiclo"><input id="alunoObjetivoSwitch" type="checkbox"><input id="alunoStatusSwitch" type="checkbox"></form>
        <div id="modalFormAluno"></div><input id="btnExcluirAlunoModal">
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
