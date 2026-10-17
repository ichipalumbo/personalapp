// [TAG-TESTS-MARCA-CABECALHO] marca-cabecalho.test.js
// Item 5.10, etapa 1: logo do kit v2 no cabeçalho e área de toque de 44×44.
// Recorte estático (markup, SVG e CSS): o jsdom não calcula layout, então a
// medição real dos alvos continua sendo feita no mock.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const { RAIZ_PROJETO, CAMINHO_INDEX_HTML } = require('./setup/carregar-frontend');

const SRC_LOGO = 'assets/images/personal_josy_horizontal_escuro_transparente.svg';
const CAMINHO_LOGO_APP = path.join(RAIZ_PROJETO, SRC_LOGO);
// Mestre do kit: se o kit for atualizado, a cópia do app precisa acompanhar.
const CAMINHO_LOGO_MESTRE = path.join(
    RAIZ_PROJETO, 'docs', 'reference', 'identidade', 'kit-visual-completo-v2',
    '01_horizontal', 'escuro', 'personal_josy_horizontal_escuro_transparente.svg'
);
const CAMINHO_CSS = path.join(RAIZ_PROJETO, 'assets', 'css', 'style.css');

const ALVOS_DE_TOQUE = [
    '#btnUserAreaTrigger',
    '#custom-google-login',
    '#tabHomeSemana',
    '#tabHomeDia',
    '#btnSemanaHomeAnterior',
    '#btnSemanaHomeProxima',
    '#btnSemanaHomeHoje',
    '#btnHomeDiaAnterior',
    '#btnHomeDiaProximo',
    '#btnHomeDiaHoje',
    '#btnCloseSettings',
    '#btnFecharHistoricoReposicoes',
    '#appSettingsModal button',
    '.semana-dia-header',
    '.btn-dia-pill'
];

function lerHeader() {
    const html = fs.readFileSync(CAMINHO_INDEX_HTML, 'utf8');
    const { document } = new JSDOM(html).window;
    return document.querySelector('header.header');
}

function desenhoDoSvg(texto) {
    const { document } = new JSDOM(texto, { contentType: 'image/svg+xml' }).window;
    const raiz = document.documentElement;
    const atributos = [...raiz.attributes]
        .filter((atributo) => !['role', 'aria-labelledby'].includes(atributo.name))
        .map((atributo) => `${atributo.name}=${atributo.value}`);
    const elementos = [...raiz.children]
        .filter((elemento) => !['title', 'desc', 'metadata'].includes(elemento.localName))
        .map((elemento) => elemento.outerHTML);
    return { atributos, elementos };
}

function lerRegrasCss() {
    const css = fs.readFileSync(CAMINHO_CSS, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const regras = [];
    const padrao = /([^{}]+)\{([^{}]*)\}/g;
    let achado;
    while ((achado = padrao.exec(css)) !== null) {
        regras.push({
            seletores: achado[1].split(',').map((seletor) => seletor.trim()),
            corpo: achado[2]
        });
    }
    return regras;
}

function listarJsDoApp(pasta) {
    return fs.readdirSync(pasta, { withFileTypes: true }).flatMap((entrada) => {
        const caminho = path.join(pasta, entrada.name);
        if (entrada.isDirectory()) return listarJsDoApp(caminho);
        return entrada.name.endsWith('.js') ? [caminho] : [];
    });
}

test('o título do cabeçalho é o logo do kit, com texto alternativo da marca', () => {
    const header = lerHeader();
    assert.ok(header, 'index.html deveria ter header.header');
    const titulo = header.querySelector('h1.marca-titulo');
    assert.ok(titulo, 'o cabeçalho deveria ter h1.marca-titulo');

    assert.equal(titulo.children.length, 1, 'o h1 deveria conter só o logo');
    assert.equal(titulo.textContent.trim(), '', 'o h1 não deveria ter texto solto além do logo');

    const logo = titulo.children[0];
    assert.equal(logo.localName, 'img');
    assert.ok(logo.classList.contains('marca-logo'));
    assert.equal(logo.getAttribute('alt'), 'Personal Josy');
    assert.equal(logo.getAttribute('src'), SRC_LOGO);
    // Dimensões declaradas reservam o espaço antes do SVG carregar.
    assert.equal(logo.getAttribute('width'), '186');
    assert.equal(logo.getAttribute('height'), '32');
    assert.ok(fs.existsSync(CAMINHO_LOGO_APP), `arquivo do logo ausente: ${SRC_LOGO}`);
});

test('o cabeçalho não traz mais o nome antigo nem o ícone provisório', () => {
    const header = lerHeader();
    assert.ok(!header.textContent.includes('Prô Josy'), 'nome antigo ainda aparece no cabeçalho');
    assert.equal(header.querySelector('.fa-dumbbell'), null, 'ícone provisório ainda está no cabeçalho');
    assert.equal(header.querySelector('.marca-ativa, .marca-mente'), null, 'spans da marca antiga ainda estão no cabeçalho');
});

test('a cópia do logo no app não carrega os metadados internos do kit', () => {
    const texto = fs.readFileSync(CAMINHO_LOGO_APP, 'utf8');
    const { document } = new JSDOM(texto, { contentType: 'image/svg+xml' }).window;
    const raiz = document.documentElement;

    assert.equal(raiz.localName, 'svg');
    assert.equal(raiz.querySelector('title, desc, metadata'), null, 'cópia ainda tem title/desc/metadata');
    assert.equal(raiz.getAttribute('role'), null);
    assert.equal(raiz.getAttribute('aria-labelledby'), null);
    assert.ok(!texto.includes('Final B'), 'cópia ainda cita a edição interna do kit');
});

test('a cópia do logo no app tem o mesmo desenho do mestre do kit', () => {
    const copia = desenhoDoSvg(fs.readFileSync(CAMINHO_LOGO_APP, 'utf8'));
    const mestre = desenhoDoSvg(fs.readFileSync(CAMINHO_LOGO_MESTRE, 'utf8'));

    assert.ok(mestre.elementos.length > 0, 'mestre do kit sem elementos de desenho');
    assert.deepEqual(copia.atributos, mestre.atributos);
    assert.deepEqual(copia.elementos, mestre.elementos);
});

test('os alvos de toque aprovados ganham área mínima de 44×44', () => {
    const regras = lerRegrasCss();

    const area = regras.find((regra) =>
        /content:\s*""/.test(regra.corpo)
        && /width:\s*max\(100%,\s*44px\)/.test(regra.corpo)
        && /height:\s*max\(100%,\s*44px\)/.test(regra.corpo));
    assert.ok(area, 'regra ::after com max(100%, 44px) não encontrada no style.css');
    for (const alvo of ALVOS_DE_TOQUE) {
        assert.ok(area.seletores.includes(`${alvo}::after`), `${alvo}::after fora da regra da área de toque`);
    }

    const posicionamento = regras.find((regra) =>
        /position:\s*relative/.test(regra.corpo)
        && ALVOS_DE_TOQUE.every((alvo) => regra.seletores.includes(alvo)));
    assert.ok(posicionamento, 'os alvos de toque precisam de position: relative para ancorar o ::after');
});

test('a área dos dias da recorrência não invade o dia vizinho', () => {
    const limite = lerRegrasCss().find((regra) =>
        regra.seletores.includes('.btn-dia-pill::after')
        && /width:\s*min\(max\(100%,\s*44px\),\s*calc\(100%\s*\+\s*6px\)\)/.test(regra.corpo));
    assert.ok(limite, '.btn-dia-pill::after deveria limitar a largura a calc(100% + 6px)');
});

test('cada alvo de toque do CSS aponta para um elemento que existe no app', () => {
    const fontes = [CAMINHO_INDEX_HTML, ...listarJsDoApp(path.join(RAIZ_PROJETO, 'assets', 'js'))]
        .map((caminho) => fs.readFileSync(caminho, 'utf8'))
        .join('\n');

    for (const alvo of ALVOS_DE_TOQUE) {
        const [base] = alvo.split(' ');
        const nome = base.slice(1);
        const padrao = base.startsWith('#')
            ? new RegExp(`id="${nome}"`)
            : new RegExp(`class="(?:[^"]*\\s)?${nome}(?:\\s[^"]*)?"`);
        assert.ok(padrao.test(fontes), `${base} não existe em index.html nem em assets/js`);
    }
});
