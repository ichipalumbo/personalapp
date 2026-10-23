// Hierarquia visual de Finanças pelo padrão de Alunos. Os templates e o CSS
// reais são carregados; nenhuma consulta ou escrita é necessária neste recorte.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');
const ler = (arquivo) => fs.readFileSync(path.join(RAIZ, arquivo), 'utf8');

function ambiente(t) {
    const dom = new JSDOM(ler('index.html'), { url: 'http://localhost', runScripts: 'outside-only' });
    t.after(() => dom.window.close());
    const { window } = dom;
    require('./setup/contexto-dados')(dom);
    window.alunos = [{ id: 'a1', nome: 'Maria Silva', objetivo: 'Personal Trainer',
        frequenciaSemanal: 3, status: 'ativo', preco: 50, diaVencimento: 10 }];
    window.aulas = [];
    window.aulasParaRepor = [];
    window.reposicaoFlowHelpers = require('../backend/shared/reposicao-flow-helpers');
    window.formatarMoeda = (valor) => `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;
    const estilo = window.document.createElement('style');
    estilo.textContent = ler('assets/css/style.css');
    window.document.head.appendChild(estilo);
    for (const arquivo of ['assets/js/view-alunos.js', 'assets/js/view-financas.js']) {
        vm.runInContext(ler(arquivo), dom.getInternalVMContext(), { filename: arquivo });
    }
    window.__financasState.cards = ['atrasado', 'em_aberto', 'pago', 'pendente'].map((status, indice) => ({
        alunoId: `a${indice + 1}`,
        aluno: { id: `a${indice + 1}`, nome: indice ? 'Outro aluno' : 'Maria Silva' },
        configuracaoPendente: status === 'pendente',
        historicoDisponivel: false,
        cicloAtual: { _id: `c${indice + 1}`, cicloInicio: '2026-09-01', cicloFim: '2026-09-30',
            aulasContadas: 4, aulasManuaisExtras: 1, valorTotalCiclo: 220,
            metodoCobranca: 'por_aula', status, dataPagamento: status === 'pago' ? '2026-10-01' : null },
    }));
    window.renderizarListaAlunos();
    window.renderizarFinancas();
    return { window, doc: window.document };
}

test('título financeiro usa ícone da mesma família de Alunos sem emoji no texto', (t) => {
    const { doc } = ambiente(t);
    const financeiro = doc.querySelector('.financas-cabecalho-titulo');
    const alunos = doc.querySelector('.alunos-cabecalho h2');
    assert.equal(financeiro.textContent.trim(), 'Finanças');
    assert.ok(financeiro.querySelector('i.fa-solid.fa-wallet'));
    assert.equal(financeiro.querySelector('i').getAttribute('aria-hidden'), 'true');
    assert.ok(alunos.querySelector('i.fa-solid'));
    assert.ok(financeiro.classList.contains('topo-tela-titulo'));
    assert.ok(alunos.classList.contains('topo-tela-titulo'));
});

test('nomes reais dos cards de Alunos e Finanças compartilham tamanho e peso', (t) => {
    const { window, doc } = ambiente(t);
    const nomes = [doc.querySelector('#listaAlunos strong'), doc.querySelector('#financasConteudo strong')];
    nomes.forEach((nome) => {
        assert.equal(nome.textContent, 'Maria Silva');
        assert.equal(nome.className, 'aluno-card-nome');
        assert.equal(nome.hasAttribute('style'), false, 'não recuperar variação local de fonte');
        const c = window.getComputedStyle(nome);
        assert.equal(c.fontSize, '16.8px');
        assert.equal(c.fontWeight, '700');
        assert.equal(c.wordBreak, 'break-word');
    });
});

test('rótulos financeiros são leves e status limpos preservam dados e cores semânticas', (t) => {
    const { window, doc } = ambiente(t);
    const card = doc.querySelector('[data-financas-card-id="a1"]');
    const periodo = card.querySelector('.financas-card-periodo');
    assert.equal(periodo.textContent, '01/09/2026 → 30/09/2026');
    assert.equal(window.getComputedStyle(periodo).fontWeight, '600');
    assert.equal(window.getComputedStyle(periodo).marginTop, '3px');
    const rotulos = [...card.querySelectorAll('.financas-card-rotulo')];
    assert.deepEqual(rotulos.map((el) => el.textContent), ['Aulas', 'Valor', 'Ciclo', 'Cobrança']);
    for (const rotulo of rotulos) {
        const c = window.getComputedStyle(rotulo);
        assert.equal(c.fontSize, '12px');
        assert.equal(c.fontWeight, '700');
        assert.notEqual(c.textTransform, 'uppercase');
        assert.equal(rotulo.hasAttribute('style'), false);
    }
    const textos = ['Atrasado', 'Em aberto', 'Pago', 'Pendente'];
    const cores = ['--cor-estado-erro', '--cor-estado-neutro', '--cor-estado-ok', '--cor-estado-erro'];
    [...doc.querySelectorAll('.financas-card-status')].forEach((status, indice) => {
        assert.equal(status.textContent, textos[indice], 'sem fragmentos de emoji ou símbolos quebrados');
        assert.match(status.getAttribute('style'), new RegExp(cores[indice]));
        const c = window.getComputedStyle(status);
        assert.equal(c.fontWeight, '700');
        assert.equal(c.fontSize, '12px');
        assert.notEqual(c.textTransform, 'uppercase');
    });
    assert.match(card.textContent, /5 aula\(s\) cobrada\(s\)/);
    assert.match(card.textContent, /4 registradas • \+1 de ajuste/);
    assert.match(card.textContent, /R\$ 220,00/);
    assert.equal(doc.querySelector('[data-financas-pagar="a3"]').disabled, true);
    assert.equal(doc.querySelector('[data-financas-ajuste="a3"]').disabled, true);
});

test('detalhes financeiros seguem recuos de Alunos sem reduzir alvos de toque nem ações', (t) => {
    const { window, doc } = ambiente(t);
    const card = doc.querySelector('[data-financas-card-id="a1"]');
    const detalhes = [...card.querySelectorAll('details.financas-card-detalhes')];
    assert.equal(detalhes.length, 2);
    assert.deepEqual(detalhes.map((el) => el.querySelector('summary').textContent),
        ['Ver detalhes do ciclo', 'Ver ciclos anteriores']);
    for (const detalhe of detalhes) {
        const c = window.getComputedStyle(detalhe);
        assert.equal(c.paddingTop, '8px');
        assert.equal(c.marginTop, '2px');
        const summary = window.getComputedStyle(detalhe.querySelector('summary'));
        assert.equal(summary.minHeight, '44px');
        assert.equal(summary.fontWeight, '700');
        assert.equal(summary.fontSize, '14px');
        assert.equal(window.getComputedStyle(detalhe.querySelector('.financas-card-detalhes-conteudo')).marginTop, '8px');
    }
    const pagar = card.querySelector('[data-financas-pagar]');
    assert.equal(pagar.textContent, 'Marcar como pago');
    assert.equal(pagar.getAttribute('data-ciclo-id'), 'c1');
    assert.equal(window.getComputedStyle(pagar).minHeight, '48px');
    assert.equal(card.querySelector('[data-financas-ajuste]').textContent, 'Editar ajuste');
});