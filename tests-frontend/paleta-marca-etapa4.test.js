// Paleta da marca aplicada (plano da identidade visual, etapa 4): o Amarelo Josy
// substitui o amarelo anterior e o Grafite passa a ser a base escura. Categorias,
// estados e as cores de identidade do Google/Calendar não mudam de valor, e as
// cores de acento que estavam fora da paleta convergiram para o token semântico
// de mesmo significado. O contrato é o valor final, não o nome do passo.
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const RAIZ = path.resolve(__dirname, '..');
const CAMINHO_CSS = path.join(RAIZ, 'assets', 'css', 'style.css');
const CAMINHO_HTML = path.join(RAIZ, 'index.html');

const css = fs.readFileSync(CAMINHO_CSS, 'utf8');
const html = fs.readFileSync(CAMINHO_HTML, 'utf8');

const tokens = new Map();
for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) tokens.set(m[1], m[2].trim().toLowerCase());

const valorDe = (nome) => {
  assert.ok(tokens.has(nome), 'token ausente: ' + nome);
  return tokens.get(nome);
};
const algumNeutroCom = (valor, sufixo) => {
  for (const [nome, v] of tokens) {
    if (!nome.startsWith('--cor-neutro-')) continue;
    if (sufixo ? nome.endsWith(sufixo) : !/-a\d+$/.test(nome)) {
      if (v === valor) return nome;
    }
  }
  return null;
};

test('Amarelo Josy #FFDE17 substitui o amarelo anterior, inclusive nas variações com alfa', () => {
  assert.equal(valorDe('--cor-primaria'), '#ffde17');
  const alfas = [...tokens.entries()].filter(([nome]) => /^--cor-primaria-a\d+$/.test(nome));
  assert.ok(alfas.length > 10, 'as variações com transparência devem existir');
  for (const [nome, valor] of alfas) {
    assert.match(valor, /^rgba\(255, 222, 23, [\d.]+\)$/, nome + ' deve derivar do Amarelo Josy');
  }
  assert.ok(!/255,\s*215,\s*0/.test(css), 'o amarelo anterior não pode sobrar nas variações com alfa');
  assert.ok(!/#ffd700/i.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), 'o amarelo anterior não pode sobrar nas declarações');
});

test('Grafite #202020 é a base escura da interface', () => {
  const base = algumNeutroCom('#202020');
  assert.ok(base, 'deve existir um passo da família neutro com o Grafite');
  const corpo = css.match(/\nbody\s*\{([^}]*)\}/);
  assert.ok(corpo, 'a regra body deve existir');
  const fundo = corpo[1].match(/background:\s*var\((--cor-neutro-\d{2})\)/);
  assert.ok(fundo, 'o fundo do body deve vir de um passo da família neutro');
  assert.equal(valorDe(fundo[1]), '#202020', 'o fundo do body deve resolver para o Grafite');
  const translucido = [...tokens.entries()].filter(([nome, v]) => /-a\d+$/.test(nome) && /^rgba\(32, 32, 32,/.test(v));
  assert.ok(translucido.length >= 1, 'o cabeçalho translúcido deve derivar do Grafite');
});

// Guarda (passa antes e depois): categorias e estados do guia não mudam de valor.
test('cores de categoria e estado mantêm o valor da paleta do produto', () => {
  const paleta = {
    '--cor-estado-ok': '#81c784',
    '--cor-estado-informativo': '#64b5f6',
    '--cor-estado-aviso': '#ffb74d',
    '--cor-estado-erro': '#ff8a80',
    '--cor-estado-neutro': '#cfcfcf',
  };
  for (const [nome, valor] of Object.entries(paleta)) {
    assert.equal(valorDe(nome), valor, nome + ' deve manter o valor da paleta');
  }
  for (const cor of ['#ffb878', '#5484ed', '#81c784', '#64b5f6', '#ffb74d', '#ff8a80', '#cfcfcf']) {
    assert.ok([...tokens.values()].includes(cor), cor + ' deve continuar existindo como token');
  }
});

// Guarda (passa antes e depois): cor de marca de terceiro não é recolocada.
test('cores de identidade do Google e do Calendar não são recolocadas', () => {
  for (const cor of ['#4285f4', '#8ab4f8', '#5a9eff', '#34a853', '#51b749', '#dc2127', '#ff9800', '#fbd75b']) {
    assert.ok([...tokens.values()].includes(cor), cor + ' pertence a terceiro e deve preservar o valor');
  }
});

test('acentos fora da paleta convergiram para o token semântico de mesmo significado', () => {
  const removidos = ['#e6b85c', '#f7f1cc', '#4caf50', '#84d89b', '#c4d9e8', '#f44336', '#ef5350', '#ff5252', '#ff7070', '#ff5c54', '#ff8b84', '#ff8f8f', '#c7a9a9'];
  const semComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '').toLowerCase();
  for (const cor of removidos) {
    assert.ok(!semComentarios.includes(cor), cor + ' deveria ter convergido para um token semântico');
    assert.ok(!html.toLowerCase().includes(cor), cor + ' não pode sobrar no index.html');
  }
  assert.ok(semComentarios.includes('var(--cor-estado-erro)'), 'o vermelho de erro deve vir do token semântico');
  assert.ok(!semComentarios.includes('var(--estado-aviso'), 'o fallback órfão de --estado-aviso não deve voltar');
});
