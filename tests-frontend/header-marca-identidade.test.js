// Identidade no cabeçalho (plano da identidade visual, etapa 1): a composição
// horizontal do kit substitui o ícone de haltere e o texto, aplicada como
// arquivo e com nome acessível "Personal Josy". O arquivo copiado precisa
// continuar idêntico ao mestre, porque os arquivos do kit são mestres
// (spec de identidade, seções 2.4 e 2.9) — copiar, sem redesenhar.
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');
const CAMINHO_HTML = path.join(RAIZ, 'index.html');
const LOGO_APP = path.join(
  RAIZ,
  'assets',
  'images',
  'personal_josy_horizontal_escuro_transparente.svg',
);
const LOGO_MESTRE = path.join(
  RAIZ,
  'docs',
  'reference',
  'identidade',
  'kit-visual-completo-v2',
  '01_horizontal',
  'escuro',
  'personal_josy_horizontal_escuro_transparente.svg',
);

test('cabeçalho aplica o logo do kit como arquivo, com nome acessível Personal Josy', () => {
  const dom = new JSDOM(fs.readFileSync(CAMINHO_HTML, 'utf8'));
  const marca = dom.window.document.querySelector('.header .marca-titulo');

  assert.ok(marca, 'o cabeçalho deve manter o h1 .marca-titulo');
  const logo = marca.querySelector('img.marca-logo');
  assert.ok(logo, 'a marca deve ser aplicada como arquivo, não como texto');
  assert.equal(logo.getAttribute('src'), 'assets/images/personal_josy_horizontal_escuro_transparente.svg');
  assert.equal(logo.getAttribute('alt'), 'Personal Josy');
  assert.equal(marca.textContent.trim(), '', 'o nome não deve voltar a ser texto no cabeçalho');
  assert.equal(marca.querySelector('.fa-dumbbell'), null, 'o ícone de haltere não deve voltar');
  dom.window.close();
});

test('logo copiado para o app é idêntico ao mestre do kit', () => {
  assert.ok(fs.existsSync(LOGO_APP), 'o logo deve existir em assets/images');
  assert.deepEqual(fs.readFileSync(LOGO_APP), fs.readFileSync(LOGO_MESTRE));
});
