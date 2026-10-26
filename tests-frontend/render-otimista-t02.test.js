// [TAG-TESTS-RENDER-OTIMISTA-T02] render-otimista-t02.test.js
// T02 do plano 2026-10-26-plan-ui-otimista: o caminho de aluno reflete a
// mutação local na lista/filtros imediatamente (antes da resposta remota),
// tanto na criação/edição quanto na exclusão. O salvar fica pendente durante
// a asserção para provar que o render não espera o servidor. Harness mínimo
// no padrão de view-alunos-observacoes.test.js, com o markup real do
// index.html (tela-alunos) para o formulário completo.

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');
const ARQUIVO_VIEW = path.resolve(RAIZ, 'assets/js/view-alunos.js');
const ARQUIVO_DIALOGO = path.resolve(RAIZ, 'assets/js/features/modals/dialog-controller.js');

const HTML_TELA_ALUNOS = (() => {
    const fonte = new JSDOM(fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8'));
    const tela = fonte.window.document.getElementById('tela-alunos');
    const html = tela ? tela.outerHTML : '';
    fonte.window.close();
    return html;
})();

function carregar(arquivo, contexto) {
    vm.runInContext(fs.readFileSync(arquivo, 'utf8'), contexto, { filename: arquivo });
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

async function criarAmbiente(t, { alunos = [] } = {}) {
    const dom = new JSDOM(`<!doctype html><html><body>${HTML_TELA_ALUNOS}</body></html>`, {
        url: 'http://localhost/index.html',
        runScripts: 'outside-only',
    });
    t.after(() => dom.window.close());
    const { window } = dom;

    require('./setup/contexto-dados')(dom, 't02-otimista@example.com');
    window.alunos = alunos.map((a) => ({ ...a }));
    window.aulas = [];
    window.aulasParaRepor = [];
    window.APP_API_CONFIG = { apiBaseUrl: 'http://api.test' };
    window.fetch = async () => { throw new Error('T02 otimista não permite rede real'); };
    window.log = { info() {}, debug() {}, warn() {}, error() {} };
    window.mostrarToast = () => {};
    window.confirm = () => true;

    const observado = { rendersLista: [], stats: 0 };
    carregar(ARQUIVO_DIALOGO, dom.getInternalVMContext());
    carregar(ARQUIVO_VIEW, dom.getInternalVMContext());

    const listaOriginal = window.renderizarListaAlunos;
    window.renderizarListaAlunos = function () {
        const resultado = listaOriginal.apply(this, arguments);
        observado.rendersLista.push(
            window.document.getElementById('listaAlunos').textContent,
        );
        return resultado;
    };
    window.atualizarDashboardStats = function () { observado.stats += 1; };

    await aguardarDOMContentLoaded(window);
    return { dom, window, observado };
}

const ALUNO_ANA = {
    id: 'aluno-1', nome: 'Ana', objetivo: 'Personal Trainer', status: 'ativo',
    frequenciaSemanal: 2, preco: 100, diaVencimento: 10, metodoCobranca: 'por_aula',
};

test('T02 — criação de aluno aparece na lista enquanto o salvar ainda está pendente', async (t) => {
    const { window, observado } = await criarAmbiente(t, { alunos: [ALUNO_ANA] });

    let liberarSalvar = null;
    window.salvarDados = () => new Promise((resolver) => {
        liberarSalvar = () => resolver({ ok: true, motivo: 'sucesso' });
    });

    window.togglePainelCadastro(true);
    window.document.getElementById('alunoNome').value = 'Bruno';
    window.document.getElementById('alunoPreco').value = '120';
    window.document.getElementById('alunoDiaVencimento').value = '10';

    window.document.getElementById('formNovoAluno').dispatchEvent(
        new window.Event('submit', { bubbles: true, cancelable: true }),
    );

    assert.ok(liberarSalvar, 'o salvar foi acionado');
    assert.equal(window.alunos.length, 2, 'o aluno está no estado local');
    assert.ok(
        observado.rendersLista.some((conteudo) => conteudo.includes('Bruno')),
        'a lista foi renderizada com o aluno novo antes da confirmação remota',
    );

    liberarSalvar();
    await barreira();
});

test('T02 — exclusão de aluno sai da lista enquanto o salvar ainda está pendente', async (t) => {
    const { window, observado } = await criarAmbiente(t, { alunos: [ALUNO_ANA] });

    let liberarSalvar = null;
    window.salvarDados = () => new Promise((resolver) => {
        liberarSalvar = () => resolver({ ok: true, motivo: 'sucesso' });
    });

    const promessa = window.deletarAlunoSPA('aluno-1');

    assert.ok(liberarSalvar, 'o salvar foi acionado');
    assert.equal(window.alunos.length, 0, 'o aluno saiu do estado local');
    assert.ok(
        observado.rendersLista.some((conteudo) => !conteudo.includes('Ana')),
        'a lista foi renderizada sem o aluno antes da confirmação remota',
    );

    liberarSalvar();
    const excluiu = await promessa;
    await barreira();
    assert.equal(excluiu, true);
});
