// [TAG-TESTS-TIPOGRAFIA] tipografia-poppins.test.js
// Plano da identidade visual, etapa 5 (2026-10-23): a Poppins é a família da
// identidade e precisa ser servida pelo próprio app, sem serviço de fontes de
// terceiros, com licença ao lado dos arquivos e disponível offline no PWA
// (spec de identidade, 2.8).
//
// O que este teste protege:
//   1. as quatro faces declaradas apontam para arquivos que existem e são woff2;
//   2. nenhum peso usado no CSS fica sem face — peso sem face cai em negrito
//      sintético, que o guia proíbe (seção 10);
//   3. nenhuma referência a fonte de terceiros no CSS ou no HTML;
//   4. a Poppins é a primeira família do body;
//   5. o pré-cache do sw.js cobre exatamente os arquivos que existem, e o
//      namespace do cache é o aprovado para a identidade atual.

const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const RAIZ = path.resolve(__dirname, '..');
const CAMINHO_CSS = path.join(RAIZ, 'assets', 'css', 'style.css');
const CAMINHO_HTML = path.join(RAIZ, 'index.html');
const CAMINHO_SW = path.join(RAIZ, 'sw.js');
const DIRETORIO_FONTES = path.join(RAIZ, 'assets', 'vendor', 'poppins');

const ler = (caminho) => fs.readFileSync(caminho, 'utf8');
const semComentarios = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

// Faces da Poppins declaradas no CSS: peso -> caminho relativo do arquivo.
function lerFaces(css) {
  const faces = new Map();
  for (const bloco of semComentarios(css).split('@font-face').slice(1)) {
    const corpo = bloco.slice(0, bloco.indexOf('}'));
    const familia = /font-family:\s*"([^"]+)"/.exec(corpo);
    if (!familia || familia[1] !== 'Poppins') continue;
    const peso = /font-weight:\s*(\d+)/.exec(corpo);
    const url = /url\("([^"]+)"\)/.exec(corpo);
    const exibicao = /font-display:\s*([a-z-]+)/.exec(corpo);
    faces.set(peso && peso[1], {
      url: url && url[1],
      display: exibicao && exibicao[1],
    });
  }
  return faces;
}

test('as faces da Poppins apontam para woff2 existentes no diretório da família', () => {
  const faces = lerFaces(ler(CAMINHO_CSS));
  assert.deepEqual([...faces.keys()].sort(), ['400', '600', '700', '800']);

  for (const [peso, face] of faces) {
    assert.equal(face.display, 'swap', 'peso ' + peso + ' precisa de font-display: swap');
    assert.ok(face.url, 'peso ' + peso + ' sem url');
    const absoluto = path.resolve(path.dirname(CAMINHO_CSS), face.url);
    assert.ok(fs.existsSync(absoluto), 'arquivo da face ' + peso + ' não existe: ' + face.url);

    const bytes = fs.readFileSync(absoluto);
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'wOF2', 'peso ' + peso + ' não é woff2');
    assert.ok(bytes.length > 4000, 'arquivo do peso ' + peso + ' parece truncado');
  }
});

test('a licença da família acompanha os arquivos', () => {
  const licenca = path.join(DIRETORIO_FONTES, 'OFL.txt');
  assert.ok(fs.existsSync(licenca), 'falta a licença OFL junto dos arquivos');
  const texto = ler(licenca);
  assert.match(texto, /SIL OPEN FONT LICENSE/i);
  assert.match(texto, /Poppins/);
});

test('todo peso usado no CSS tem face declarada (sem negrito sintético)', () => {
  const css = semComentarios(ler(CAMINHO_CSS));
  const faces = lerFaces(ler(CAMINHO_CSS));
  const pesos = new Set();
  for (const m of css.matchAll(/font-weight:\s*(\d{3})\b/g)) pesos.add(m[1]);
  // 400 é o padrão do user agent e não precisa de declaração explícita para ser
  // atendido; aqui ele existe de qualquer forma.
  const semFace = [...pesos].filter((peso) => !faces.has(peso)).sort();
  assert.deepEqual(semFace, [], 'pesos sem face da Poppins: ' + semFace.join(', '));
});

test('a Poppins é a primeira família da interface e não há fonte de terceiros', () => {
  const css = semComentarios(ler(CAMINHO_CSS));
  const corpo = /body\s*\{([\s\S]*?)\}/.exec(css);
  assert.ok(corpo, 'regra do body não encontrada');
  const familia = /font-family:\s*([^;]+);/.exec(corpo[1]);
  assert.ok(familia, 'body sem font-family');
  assert.match(familia[1].trim(), /^"Poppins",/, 'a Poppins precisa ser a primeira da pilha');
  assert.match(familia[1], /"Segoe UI"/, 'a pilha anterior precisa continuar como reserva');

  const html = ler(CAMINHO_HTML);
  for (const [origem, texto] of [['style.css', css], ['index.html', html]]) {
    assert.doesNotMatch(texto, /fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit\.net/i,
      origem + ' não pode pedir fonte a terceiros (spec, 2.8)');
    assert.doesNotMatch(texto, /@import\s+url\(/i, origem + ' não pode importar folha de fonte externa');
  }
});

test('o pré-cache do sw.js cobre os arquivos da família no cache josy-personal', () => {
  const sw = ler(CAMINHO_SW);
  assert.match(sw, /const CACHE_NAME = 'josy-personal';/,
    'o namespace do cache deve ser o aprovado pelo dono');

  const lista = /const APP_SHELL_FILES = \[([\s\S]*?)\];/.exec(sw);
  assert.ok(lista, 'APP_SHELL_FILES não encontrada');
  const precacheados = [...lista[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);

  const faces = lerFaces(ler(CAMINHO_CSS));
  for (const [peso, face] of faces) {
    const caminhoServidor = '/' + path.relative(RAIZ, path.resolve(path.dirname(CAMINHO_CSS), face.url)).split(path.sep).join('/');
    assert.ok(precacheados.includes(caminhoServidor),
      'peso ' + peso + ' fora do pré-cache: ' + caminhoServidor);
  }

  // Todo arquivo do pré-cache precisa existir no repositório; um caminho errado
  // faz cache.addAll falhar por inteiro e o app fica sem cache offline.
  for (const caminho of precacheados) {
    const absoluto = path.join(RAIZ, caminho.replace(/^\//, '').split('/').join(path.sep));
    assert.ok(fs.existsSync(absoluto), 'pré-cache aponta para arquivo inexistente: ' + caminho);
  }
});

test('worker instala em josy-personal e preserva esse cache ao remover o legado', async () => {
  const eventos = new Map();
  const abertos = [];
  const removidos = [];
  const arquivos = [];
  let ativacoes = 0;
  vm.runInNewContext(ler(CAMINHO_SW), {
    self: {
      addEventListener: (nome, executar) => eventos.set(nome, executar),
      skipWaiting: () => {},
      clients: { claim: () => { ativacoes++; } },
    },
    caches: {
      open: async (nome) => {
        abertos.push(nome);
        return { addAll: async (lista) => arquivos.push(...lista) };
      },
      keys: async () => ['Prô Josy - Agenda Personal Trainer', 'josy-personal'],
      delete: async (nome) => { removidos.push(nome); return true; },
    },
  });
  let tarefa;
  eventos.get('install')({ waitUntil: (promise) => { tarefa = promise; } });
  await tarefa;
  assert.deepEqual(abertos, ['josy-personal']);
  assert.ok(arquivos.includes('/index.html'));
  assert.ok(arquivos.includes('/assets/vendor/poppins/poppins-400.woff2'));
  eventos.get('activate')({ waitUntil: (promise) => { tarefa = promise; } });
  await tarefa;
  assert.deepEqual(removidos, ['Prô Josy - Agenda Personal Trainer']);
  assert.equal(ativacoes, 1);
});
