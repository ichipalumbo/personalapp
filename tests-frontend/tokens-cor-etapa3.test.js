// Cores da interface (plano da identidade visual, etapa 3): nenhum valor de cor
// pode viver fora da tabela de tokens do :root. O valor fica em um só lugar e o
// resto do app consome por var(--cor-*). Isso é o que permite a etapa 4 trocar a
// paleta mexendo apenas na tabela.
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');
const CAMINHO_CSS = path.join(RAIZ, 'assets', 'css', 'style.css');
const CAMINHO_HTML = path.join(RAIZ, 'index.html');
const DIRETORIO_JS = path.join(RAIZ, 'assets', 'js');

const LITERAL_DE_COR = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g;

const removerComentariosCss = (texto) => texto.replace(/\/\*[\s\S]*?\*\//g, '');

// Devolve o CSS com todos os blocos :root removidos, casando chaves de verdade
// em vez de assumir que o bloco termina na primeira }.
const removerBlocosRoot = (css) => {
  let saida = '';
  let i = 0;
  while (i < css.length) {
    const abreChave = css.indexOf('{', i);
    if (abreChave === -1) {
      saida += css.slice(i);
      break;
    }
    const seletor = css.slice(i, abreChave);
    let profundidade = 0;
    let fecha = abreChave;
    for (; fecha < css.length; fecha++) {
      if (css[fecha] === '{') profundidade++;
      else if (css[fecha] === '}') {
        profundidade--;
        if (profundidade === 0) break;
      }
    }
    if (!seletor.includes(':root')) {
      saida += css.slice(i, fecha + 1);
    }
    i = fecha + 1;
  }
  return saida;
};

const lerTokensDefinidos = (css) => {
  const definidos = new Map();
  for (const m of css.matchAll(/(--cor-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    definidos.set(m[1], m[2].trim());
  }
  return definidos;
};

const listarArquivosJs = (diretorio) => {
  const saida = [];
  for (const entrada of fs.readdirSync(diretorio, { withFileTypes: true })) {
    const caminho = path.join(diretorio, entrada.name);
    if (entrada.isDirectory()) saida.push(...listarArquivosJs(caminho));
    else if (entrada.name.endsWith('.js')) saida.push(caminho);
  }
  return saida;
};

const luminancia = (hex) => {
  const completo = hex.length === 4 ? '#' + hex.slice(1).split('').map((c) => c + c).join('') : hex;
  return (
    0.2126 * parseInt(completo.slice(1, 3), 16) +
    0.7152 * parseInt(completo.slice(3, 5), 16) +
    0.0722 * parseInt(completo.slice(5, 7), 16)
  );
};

test('nenhum valor de cor vive fora da tabela :root do style.css', () => {
  const css = removerComentariosCss(fs.readFileSync(CAMINHO_CSS, 'utf8'));
  const semRoot = removerBlocosRoot(css);
  const restantes = semRoot.match(LITERAL_DE_COR) || [];
  assert.deepEqual(
    restantes,
    [],
    'toda cor fora do :root deve ser var(--cor-*); encontrado: ' + restantes.slice(0, 5).join(', '),
  );
});

test('todo var(--cor-*) usado no app está definido no :root', () => {
  const css = fs.readFileSync(CAMINHO_CSS, 'utf8');
  const definidos = lerTokensDefinidos(css);
  const fontes = [CAMINHO_CSS, CAMINHO_HTML, ...listarArquivosJs(DIRETORIO_JS)];
  const faltando = [];
  for (const fonte of fontes) {
    const texto = fs.readFileSync(fonte, 'utf8');
    for (const m of texto.matchAll(/var\((--cor-[a-z0-9-]+)(?:,\s*[^)]*)?\)/g)) {
      if (!definidos.has(m[1])) faltando.push(m[1] + ' em ' + path.relative(RAIZ, fonte));
    }
  }
  assert.deepEqual([...new Set(faltando)], []);
});

test('atributos style do index.html não carregam literal de cor', () => {
  const dom = new JSDOM(fs.readFileSync(CAMINHO_HTML, 'utf8'));
  const comLiteral = [];
  for (const elemento of dom.window.document.querySelectorAll('[style]')) {
    const estilo = elemento.getAttribute('style');
    const achados = estilo.match(LITERAL_DE_COR);
    if (achados) comLiteral.push(elemento.tagName + '.' + elemento.className + ': ' + achados.join(', '));
  }
  dom.window.close();
  assert.deepEqual(comLiteral.slice(0, 5), []);
});

test('família neutro segue a ordem de luminância sem lacunas', () => {
  const css = fs.readFileSync(CAMINHO_CSS, 'utf8');
  const porNumero = new Map();
  for (const m of css.matchAll(/--cor-neutro-(\d{2})(?:-a\d+)?:\s*([^;]+);/g)) {
    const numero = Number(m[1]);
    if (!porNumero.has(numero)) porNumero.set(numero, m[2].trim());
  }
  const numeros = [...porNumero.keys()].sort((a, b) => a - b);
  assert.ok(numeros.length > 10, 'a família neutro deve estar declarada');
  numeros.forEach((numero, indice) => {
    assert.equal(numero, indice + 1, 'a numeração da família neutro deve ser contínua a partir de 01');
  });
  const tons = numeros.map((numero) => luminancia(porNumero.get(numero).replace(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+).*$/, (todo, r, g, b) => '#' + [r, g, b].map((n) => Number(n).toString(16).padStart(2, '0')).join(''))));
  tons.forEach((tom, indice) => {
    if (indice === 0) return;
    assert.ok(tom > tons[indice - 1], 'o passo ' + numeros[indice] + ' deve ser mais claro que o anterior');
  });
});
