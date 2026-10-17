// Guarda da etapa 3 da identidade visual: toda cor da interface sai dos tokens do :root
// de style.css. Cobre texto-fonte (CSS, index.html e JS); a aparência continua no mock.
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const RAIZ = path.resolve(__dirname, '..');
const CSS = fs.readFileSync(path.join(RAIZ, 'assets/css/style.css'), 'utf8');
const LITERAL_COR = /#[0-9a-fA-F]{3}\b|#[0-9a-fA-F]{4}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{8}\b|rgba?\(\s*\d|hsla?\(\s*\d/;

// Cores que são DADO, não estilo: o atributo do navegador/PWA, o fallback da cor do
// aluno e a cor do Google Calendar gravada no cadastro.
const PERMITIDAS = [
    { arquivo: 'index.html', trecho: '<meta name="theme-color" content="#202020" />' },
    { arquivo: 'assets/js/agenda-card-template.js', trecho: "const AULA_COR_FALLBACK = '#6B7280';" },
    { arquivo: 'assets/js/storage.js', trecho: "return { nome: 'Tangerina', hex: '#FF887C' };" },
    { arquivo: 'assets/js/view-alunos.js', trecho: "return { nome: 'Tangerina', hex: '#FF887C' };" }
];

function semComentariosCss(texto) {
    return texto.replace(/\/\*[\s\S]*?\*\//g, (bloco) => bloco.replace(/[^\n]/g, ' '));
}

function blocoRaiz(css) {
    const inicio = css.indexOf(':root {');
    assert.ok(inicio >= 0, 'style.css precisa de um bloco :root');
    return { inicio, fim: css.indexOf('\n}', inicio) };
}

function linhasComCor(texto, ignorar = () => false) {
    return texto.split('\n')
        .map((linha, indice) => ({ linha: linha.trim(), numero: indice + 1 }))
        .filter(({ linha, numero }) => LITERAL_COR.test(linha) && !ignorar(linha, numero));
}

function tokensDoRaiz() {
    const css = semComentariosCss(CSS);
    const { inicio, fim } = blocoRaiz(css);
    const tokens = {};
    for (const [, nome, valor] of css.slice(inicio, fim).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
        tokens[nome] = valor.trim();
    }
    return tokens;
}

function arquivosJs() {
    const pasta = path.join(RAIZ, 'assets/js');
    const lista = [];
    const visitar = (dir) => {
        for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
            const caminho = path.join(dir, item.name);
            if (item.isDirectory()) visitar(caminho);
            else if (item.name.endsWith('.js')) lista.push(caminho);
        }
    };
    visitar(pasta);
    return lista;
}

function semComentariosCodigo(texto) {
    return texto
        .replace(/\/\*[\s\S]*?\*\//g, (bloco) => bloco.replace(/[^\n]/g, ' '))
        .replace(/<!--[\s\S]*?-->/g, (bloco) => bloco.replace(/[^\n]/g, ' '))
        .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1')
        .replace(/&#\d+;/g, '');
}

// M-cor-1: voltar um literal (#fff, rgba(0, 0, 0, …)) para qualquer regra fora do :root.
test('style.css só declara cor literal dentro do :root', () => {
    const css = semComentariosCss(CSS);
    const { inicio, fim } = blocoRaiz(css);
    const inicioLinha = css.slice(0, inicio).split('\n').length;
    const fimLinha = css.slice(0, fim).split('\n').length;
    const fora = linhasComCor(css, (_, numero) => numero >= inicioLinha && numero <= fimLinha);
    assert.deepEqual(fora.map(({ numero, linha }) => `${numero}: ${linha}`), []);
});

// M-cor-2: reintroduzir style="color: #…" no index.html ou num template JS.
test('index.html e JS não carregam cor literal fora da lista de dados permitidos', () => {
    const arquivos = [path.join(RAIZ, 'index.html'), ...arquivosJs()];
    const achados = [];
    for (const caminho of arquivos) {
        const relativo = path.relative(RAIZ, caminho).replace(/\\/g, '/');
        const permitidas = PERMITIDAS.filter((item) => item.arquivo === relativo).map((item) => item.trecho);
        const texto = semComentariosCodigo(fs.readFileSync(caminho, 'utf8'));
        for (const { linha, numero } of linhasComCor(texto, (conteudo) => permitidas.includes(conteudo))) {
            achados.push(`${relativo}:${numero}: ${linha}`);
        }
    }
    assert.deepEqual(achados, []);
});

// M-cor-3: usar um token que não existe (typo vira cor herdada/transparente sem erro).
test('todo var(--cor-*) e var(--objetivo-*) usado existe no :root', () => {
    const tokens = tokensDoRaiz();
    const fontes = [
        semComentariosCss(CSS),
        semComentariosCodigo(fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8')),
        ...arquivosJs().map((arquivo) => semComentariosCodigo(fs.readFileSync(arquivo, 'utf8')))
    ];
    const usados = new Set(fontes.flatMap((fonte) => [...fonte.matchAll(/var\(\s*(--(?:cor|objetivo)-[\w-]+)/g)].map((m) => m[1])));
    assert.deepEqual([...usados].filter((nome) => !(nome in tokens)).sort(), []);
});

// M-cor-4: alterar o hex de um token sem atualizar o par -rgb usado nas transparências.
test('cada token -rgb tem os mesmos canais do token hex correspondente', () => {
    const tokens = tokensDoRaiz();
    const pares = Object.keys(tokens).filter((nome) => nome.endsWith('-rgb') && tokens[nome.slice(0, -4)]);
    assert.ok(pares.length >= 10, 'os pares hex/-rgb precisam ser encontrados');
    for (const nomeRgb of pares) {
        const hex = tokens[nomeRgb.slice(0, -4)].replace('#', '');
        assert.match(hex, /^[0-9a-fA-F]{6}$/, `${nomeRgb.slice(0, -4)} deve ser hex de 6 dígitos`);
        const canais = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ');
        assert.equal(tokens[nomeRgb].replace(/\s+/g, ' '), canais, nomeRgb);
    }
});
