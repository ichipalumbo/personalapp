// 5.8 (Parte B, caminho B1 — 2026-09-30): rótulo global "Sincronizando dados..."
// no header, visível SÓ enquanto um sync remoto roda sobre dados locais já em
// tela (troca de login, botão "Sincronizar Dados", auto-refresh ao voltar para
// o app). No boot com cache o rótulo NÃO aparece — o boot não dispara sync
// remoto (decisão B1 — sem sync em background no boot).
//
// Este teste usa REAL o state.js + storage.js (vm, como no padrão da Etapa 6)
// e aciona a entrada pública `window.sincronizarBancoDados` (o botão manual —
// um dos três casos de B1). O fetch é stubado com latência controlada para
// observar o rótulo no meio do voo.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const CAMINHO_STATE = path.resolve(__dirname, '..', 'assets', 'js', 'state.js');
const CAMINHO_STORAGE = path.resolve(__dirname, '..', 'assets', 'js', 'storage.js');

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function criarAmbiente({ comCache }) {
  const dom = new JSDOM(
    `<!doctype html><html><body>
      <header class="header">
        <div class="header-topline">
          <div class="brand-container">
            <h1 class="marca-titulo">Prô Josy</h1>
            <span id="headerCacheState" class="header-cache-state" hidden>Sincronizando dados...</span>
          </div>
        </div>
      </header>
    </body></html>`,
    { runScripts: 'outside-only', url: 'http://localhost' },
  );
  const { window } = dom;
  require('./setup/contexto-dados')(dom);

  // Obrigatório no topo do storage.js (validação de config + ping fire-and-forget).
  window.APP_API_CONFIG = { apiBaseUrl: 'http://api.test', apiRootUrl: 'http://api.test' };

  const semLog = () => {};
  window.log = new Proxy({}, { get: () => semLog });

  window.googleIdentity = {
    isSignedIn: () => true,
    getIdToken: () => 'token-de-teste',
    getOwnerEmail: () => 'teste@example.com',
  };

  // Respostas por rota; latência controlada para segurar o sync no ar.
  let latenciaMs = 0;
  let modoFalha = false;
  const corpoAlunos = [{ id: 'aluno-1', nome: 'Ana', objetivo: 'Personal Trainer', corObjetivo: { nome: 'Tangerina', hex: '#FF887C' } }];
  window.fetch = async (url) => {
    const caminho = String(url).replace(/^https?:\/\/[^/]+/, '');
    if (latenciaMs > 0) await esperar(latenciaMs);
    if (modoFalha) throw new Error('falha de rede simulada');
    if (caminho.endsWith('/configuracao/grade_horarios')) {
      return { ok: false, status: 404, json: async () => ({}) };
    }
    if (caminho.endsWith('/configuracao')) {
      return { ok: true, status: 200, json: async () => ({ horaInicio: '08:00', horaFim: '18:00' }) };
    }
    const corpo =
      caminho.endsWith('/alunos') ? corpoAlunos
      : caminho.endsWith('/agendamentos') ? [{ id: 'aula-1', alunoId: 'aluno-1', tipo: 'aula' }]
      : caminho.endsWith('/reposicoes') ? []
      : caminho.endsWith('/bloqueios-externos') ? []
      : {};
    return { ok: true, status: 200, json: async () => corpo };
  };
  window.__controleFetch = {
    setLatencia: (ms) => { latenciaMs = ms; },
    setFalha: (valor) => { modoFalha = valor; },
  };

  // Estado do app "aberto com cache local" (o que o boot deixou em localStorage).
  if (comCache) {
    window.localStorage.setItem('personal_cache_dono', 'teste@example.com');
    window.localStorage.setItem('personal_alunos', JSON.stringify(corpoAlunos));
    window.localStorage.setItem('personal_aulas', JSON.stringify([{ id: 'aula-1', alunoId: 'aluno-1', tipo: 'aula' }]));
    window.localStorage.setItem('personal_reposicoes', '[]');
    window.localStorage.setItem('personal_limitesGrade', JSON.stringify({ inicio: '08:00', fim: '18:00' }));
    window.localStorage.setItem('faturamentoMeta', '0');
  }

  vm.runInContext(fs.readFileSync(CAMINHO_STATE, 'utf8'), dom.getInternalVMContext());
  vm.runInContext(fs.readFileSync(CAMINHO_STORAGE, 'utf8'), dom.getInternalVMContext());

  return { dom, window, rotulo: () => window.document.getElementById('headerCacheState') };
}

test('Parte B: sync remoto sobre cache acende o rótulo no header e apaga ao concluir (sucesso ou falha)', async (t) => {
  const { dom, window, rotulo } = criarAmbiente({ comCache: true });
  t.after(() => dom.window.close());

  const el = rotulo();
  assert.ok(el, 'rótulo existe no header');
  assert.equal(el.hidden, true, 'início: rótulo oculto');
  assert.equal(el.textContent, 'Sincronizando dados...');

  // Sucesso: rótulo visível DURANTE o sync, oculto ao final.
  window.__controleFetch.setLatencia(250);
  const pSucesso = window.sincronizarBancoDados();
  await esperar(40); // sync ainda no ar (250ms de latência por rota)
  assert.equal(el.hidden, false, 'rótulo visível durante o sync sobre cache');
  await pSucesso;
  assert.equal(el.hidden, true, 'rótulo apagado após sync com sucesso');

  // Falha: rótulo visível durante o sync e apagado na falha (sem esperar o toast,
  // que é responsabilidade da tela do sync — aqui só o rótulo é medido).
  window.__controleFetch.setFalha(true);
  const pFalha = window.sincronizarBancoDados();
  await esperar(40);
  assert.equal(el.hidden, false, 'rótulo visível durante o sync que vai falhar');
  await pFalha;
  assert.equal(el.hidden, true, 'rótulo apagado após a falha do sync');
});

test('Parte B: sync remoto SEM cache não acende o rótulo (B1 — rótulo só existe sobre dados locais)', async (t) => {
  const { dom, window, rotulo } = criarAmbiente({ comCache: false });
  t.after(() => dom.window.close());

  const el = rotulo();
  assert.equal(el.hidden, true);

  window.__controleFetch.setLatencia(250);
  const p = window.sincronizarBancoDados();
  await esperar(40);
  assert.equal(el.hidden, true, 'sem cache local, nada é "sobre cache" — rótulo nunca acende');
  await p;
  assert.equal(el.hidden, true);
});
