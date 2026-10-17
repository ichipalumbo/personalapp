const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');
const ler = (relativo) => fs.readFileSync(path.join(RAIZ, relativo), 'utf8');
const manifesto = JSON.parse(ler('manifest.json'));

function imagemPng(relativo) {
    const caminho = path.join(RAIZ, relativo);
    assert.ok(fs.existsSync(caminho), `imagem não encontrada: ${relativo}`);
    const dados = fs.readFileSync(caminho);
    assert.equal(dados.toString('hex', 0, 8), '89504e470d0a1a0a', `${relativo} não é PNG`);
    return { largura: dados.readUInt32BE(16), altura: dados.readUInt32BE(20) };
}

function htmlHead() {
    const { document } = new JSDOM(ler('index.html')).window;
    return document;
}

test('o nome do produto aparece no título, no título Apple e no manifest', () => {
    const document = htmlHead();
    assert.equal(document.title, 'Personal Josy');
    assert.equal(
        document.querySelector('meta[name="apple-mobile-web-app-title"]')?.content,
        'Personal Josy'
    );
    assert.equal(manifesto.name, 'Personal Josy');
    assert.equal(manifesto.short_name, 'Personal Josy');
    assert.equal(document.querySelector('meta[name="theme-color"]')?.content, '#202020');
    assert.equal(manifesto.theme_color, '#202020');
    assert.equal(manifesto.background_color, '#0D0D0D');
});

test('o HTML aponta para favicon, manifest e ícone Apple da etapa 2', () => {
    const document = htmlHead();
    const favicon = document.querySelector('link[rel="icon"]');
    const toqueApple = document.querySelector('link[rel="apple-touch-icon"]');
    const manifestLink = document.querySelector('link[rel="manifest"]');

    assert.equal(favicon?.getAttribute('href'), 'assets/images/favicon-32x32.png');
    assert.equal(favicon?.getAttribute('sizes'), '32x32');
    assert.equal(toqueApple?.getAttribute('href'), 'assets/images/apple-touch-icon.png');
    assert.equal(toqueApple?.getAttribute('sizes'), '180x180');
    assert.equal(manifestLink?.getAttribute('href'), 'manifest.json');
    assert.deepEqual(imagemPng(favicon.getAttribute('href')), { largura: 32, altura: 32 });
    assert.deepEqual(imagemPng(toqueApple.getAttribute('href')), { largura: 180, altura: 180 });
});

test('o manifest declara ícones PWA any e maskable nas dimensões requeridas', () => {
    const esperados = [
        { src: 'assets/images/icon-192x192.png', sizes: '192x192', purpose: 'any', pixels: 192 },
        { src: 'assets/images/icon-512x512.png', sizes: '512x512', purpose: 'any', pixels: 512 },
        { src: 'assets/images/icon-192x192-maskable.png', sizes: '192x192', purpose: 'maskable', pixels: 192 },
        { src: 'assets/images/icon-512x512-maskable.png', sizes: '512x512', purpose: 'maskable', pixels: 512 }
    ];

    assert.equal(manifesto.icons.length, esperados.length);
    for (const esperado of esperados) {
        const icone = manifesto.icons.find((item) => item.src === esperado.src);
        assert.ok(icone, `ícone ausente no manifest: ${esperado.src}`);
        assert.equal(icone.sizes, esperado.sizes);
        assert.equal(icone.type, 'image/png');
        assert.equal(icone.purpose, esperado.purpose);
        assert.deepEqual(imagemPng(icone.src), { largura: esperado.pixels, altura: esperado.pixels });
    }
});

test('o service worker pré-cacheia o logo e os ícones sem renomear o cache', async () => {
    const eventos = new Map();
    const espera = [];
    let nomeCache;
    let arquivosCacheados;
    let chamouSkipWaiting = false;
    const self = {
        location: { origin: 'https://personal-josy.test' },
        addEventListener: (nome, callback) => eventos.set(nome, callback),
        skipWaiting: () => { chamouSkipWaiting = true; }
    };
    const caches = {
        open: async (nome) => {
            nomeCache = nome;
            return { addAll: async (arquivos) => { arquivosCacheados = [...arquivos]; } };
        }
    };

    vm.runInNewContext(ler('sw.js'), { self, caches, Promise, URL, Response, fetch });
    eventos.get('install')({ waitUntil: (promise) => espera.push(promise) });
    await Promise.all(espera);

    const appShell = [
        '/index.html',
        '/assets/css/style.css',
        '/assets/js/app.js',
        '/assets/images/personal_josy_horizontal_escuro_transparente.svg',
        '/assets/images/favicon-32x32.png',
        '/assets/images/apple-touch-icon.png',
        '/assets/images/icon-192x192.png',
        '/assets/images/icon-512x512.png',
        '/assets/images/icon-192x192-maskable.png',
        '/assets/images/icon-512x512-maskable.png'
    ];
    assert.equal(nomeCache, 'Prô Josy - Agenda Personal Trainer');
    assert.deepEqual(arquivosCacheados, appShell);
    assert.equal(chamouSkipWaiting, true);
});
