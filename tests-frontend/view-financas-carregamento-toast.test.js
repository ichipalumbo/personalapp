// Etapa 6 (2026-09-30) — A tela de finanças entrou no mecanismo de feedback
// unificado (item pedido pelo dono: a tela de finanças mostrava skeleton +
// "Carregando..." minúsculo, sem participar do toast de progresso das demais
// telas). O fetch de carregarFinancas passou a rodar dentro de
// executarOperacaoRemotaComFeedback (contexto "carregandoFinancas",
// exibirFalha: false, silenciosoUI respeitando o refresh em background).
//
// Este teste usa REAL o wrapper de storage.js e REAL o toast de utils-kpi.js
// (não são stubs) — o que permite validar o limiar de 3s de verdade.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const DIR_ASSETS = path.resolve(__dirname, '..', 'assets', 'js');
function lerArquivo(nome) {
  return fs.readFileSync(path.join(DIR_ASSETS, nome), 'utf8');
}

function criarResposta(status, corpo) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => corpo,
  };
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function criarCard() {
  return {
    alunoId: 'aluno-1',
    aluno: { id: 'aluno-1', nome: 'Ana' },
    configuracaoPendente: false,
    historicoDisponivel: false,
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
    },
  };
}

async function carregarAmbiente() {
  const dom = new JSDOM(
    '<!doctype html><html><body><div class="container"><main id="tela-alunos"></main><div class="toast" id="toast"></div></div></body></html>',
    { runScripts: 'outside-only', url: 'http://localhost' },
  );
  const { window } = dom;

  // Necessário no topo do storage.js (validação de config + warm-up).
  window.APP_API_CONFIG = { apiBaseUrl: 'http://api.test', apiRootUrl: 'http://api.test' };
  // O storage.js dispara um ping fire-and-forget ao ser carregado; jsdom não tem fetch.
  window.fetch = async () => criarResposta(200, {});

  // Cache de finanças simulando o comportamento real (objeto com atualizadoEm).
  let cacheLocal = null;
  window.obterCacheFinancas = () => cacheLocal;
  window.salvarCacheFinancas = (dados) => {
    cacheLocal = { atualizadoEm: new Date().toISOString(), dados };
  };
  window.formatarMoeda = (valor) => `R$ ${Number(valor).toFixed(2)}`;

  // Ordem de carregamento real da página: utils-kpi (toast) antes de storage (wrapper).
  vm.runInContext(lerArquivo('utils-kpi.js'), dom.getInternalVMContext());
  vm.runInContext(lerArquivo('storage.js'), dom.getInternalVMContext());
  vm.runInContext(lerArquivo('view-financas.js'), dom.getInternalVMContext());

  return { dom, window };
}

test('carregamento lento das finanças mostra o toast unificado e esconde ao concluir', async (t) => {
  const { dom, window } = await carregarAmbiente();
  t.after(() => dom.window.close());

  window.apiFetchBackend = async () => {
    await esperar(3200); // acima do limiar de 3s do wrapper
    return criarResposta(200, [criarCard()]);
  };

  const promisseCarregamento = window.inicializarFinancas({});

  // Antes da resposta: o toast precisa estar visível em estado progress.
  await esperar(3150);
  const toast = window.document.getElementById('toast');
  assert.ok(toast.classList.contains('progress'), 'o toast precisa estar em estado progress');
  assert.ok(toast.classList.contains('show'), 'o toast precisa estar visível');
  assert.ok(toast.classList.contains('toast'));
  assert.equal(toast.querySelector('.toast-msg').textContent, 'Carregando finanças...');
  assert.equal(toast.getAttribute('role'), 'status');
  assert.equal(toast.getAttribute('aria-live'), 'polite');
  assert.ok(window.document.getElementById('toast').querySelector('.toast-spinner'), 'progresso usa o spinner do toast unificado');

  await promisseCarregamento;
  assert.ok(!toast.classList.contains('show'), 'o toast precisa esconder quando a resposta chega');
  assert.ok(window.document.querySelector('[data-financas-card-id="aluno-1"]'), 'o card do aluno precisa ser renderizado');

  // A mensagem de última atualização não se perde com a unificação:
  // o rótulo de cache no cabeçalho é alimentado depois do load.
  const rotuloCache = window.document.getElementById('financasCacheLabel');
  assert.match(rotuloCache.textContent, /Cache atualizado em/);
});

test('carregamento rápido (< 3s) das finanças não mostra nenhum toast', async (t) => {
  const { dom, window } = await carregarAmbiente();
  t.after(() => dom.window.close());

  window.apiFetchBackend = async () => {
    await esperar(400);
    return criarResposta(200, [criarCard()]);
  };

  await window.inicializarFinancas({});
  await esperar(40);

  const toast = window.document.getElementById('toast');
  assert.ok(!toast.classList.contains('show'), 'carregamento rápido não deve acionar o toast');
  assert.equal(toast.textContent, '');
});

test('refresh silencioso em background não mostra toast mesmo acima do limiar', async (t) => {
  const { dom, window } = await carregarAmbiente();
  t.after(() => dom.window.close());

  // Primeiro load (interação do usuário, rápido): popula o estado da tela.
  window.apiFetchBackend = async () => criarResposta(200, [criarCard()]);
  await window.inicializarFinancas({});

  // Segundo load: o caminho "silencioso" (ex.: recalque da tela / refresh após
  // pagamento) não pode acionar o feedback, mesmo quando a demora passa de 3s.
  window.apiFetchBackend = async () => {
    await esperar(3200);
    return criarResposta(200, [criarCard()]);
  };

  const promisseRefresh = window.garantirDadosFinancas({ forcarRemoto: true });
  await esperar(3150);

  const toast = window.document.getElementById('toast');
  assert.ok(!toast.classList.contains('show'), 'o refresh silencioso não deve exibir toast');
  assert.equal(toast.textContent, '');

  await promisseRefresh;
  assert.ok(!toast.classList.contains('show'));
});

test('falha no load mantém o tratamento local da tela (sem toast de erro duplicado)', async (t) => {
  const { dom, window } = await carregarAmbiente();
  t.after(() => dom.window.close());

  window.apiFetchBackend = async () => criarResposta(500, { erro: 'boom' });

  await window.inicializarFinancas({});
  await esperar(40); // o "show" do toast é aplicado ~10ms após a criação

  const toast = window.document.getElementById('toast');
  const msg = toast.querySelector('.toast-msg');
  // A falha continua tratada pela própria tela (exibirFalha: false no wrapper):
  // o aviso é o da tela, não o erro genérico do contexto do wrapper nem um
  // segundo toast de erro no estado alerta.
  assert.equal(msg.textContent, 'Não foi possível atualizar agora.');
  assert.ok(toast.classList.contains('warning'));
  assert.ok(!toast.classList.contains('error'));
  assert.ok(!toast.querySelector('.toast-retry'), 'não há retry aqui: a tela mostra o estado vazio');
  assert.match(window.document.getElementById('financasConteudo').textContent, /Não foi possível atualizar agora\./);
});
