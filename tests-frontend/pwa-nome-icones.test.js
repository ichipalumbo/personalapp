// Etapa 2 da identidade visual: nome exibido e instalação do PWA.
//
// Fonte de verdade: spec de identidade, seções 2.10 e 8.3 do guia — nome
// "Personal Josy" no título, no manifest e no título de app da Apple; ícones
// gerados do avatar claro do kit, base branca nos maskable/Apple, sem cantos
// arredondados, e elementos essenciais dentro da zona segura circular de 80%
// (raio de 40% da largura) quando declarados como maskable.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const test = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const RAIZ = path.resolve(__dirname, '..');
const CAMINHO_MANIFEST = path.join(RAIZ, 'manifest.json');
const CAMINHO_HTML = path.join(RAIZ, 'index.html');
const FUNDO = [255, 255, 255];
const RAIO_SEGURO = 0.4;

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

// Decodifica o subconjunto de PNG que o gerador produz: 8 bits, RGB ou RGBA,
// sem entrelace. Formato diferente falha explicitamente, para não passar em
// branco.
function lerPng(caminho) {
  const buf = fs.readFileSync(caminho);
  assert.ok(
    buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    `assinatura PNG inválida: ${caminho}`,
  );

  let deslocamento = 8;
  let ihdr = null;
  const idat = [];
  while (deslocamento < buf.length) {
    const tamanho = buf.readUInt32BE(deslocamento);
    const tipo = buf.toString('ascii', deslocamento + 4, deslocamento + 8);
    const dados = buf.subarray(deslocamento + 8, deslocamento + 8 + tamanho);
    if (tipo === 'IHDR') {
      ihdr = {
        largura: dados.readUInt32BE(0),
        altura: dados.readUInt32BE(4),
        bits: dados[8],
        cor: dados[9],
        interlace: dados[12],
      };
    } else if (tipo === 'IDAT') {
      idat.push(dados);
    } else if (tipo === 'IEND') {
      break;
    }
    deslocamento += 12 + tamanho;
  }

  assert.ok(ihdr, `IHDR ausente: ${caminho}`);
  const canais = ihdr.cor === 2 ? 3 : ihdr.cor === 6 ? 4 : 0;
  assert.ok(
    canais > 0 && ihdr.bits === 8 && ihdr.interlace === 0,
    `PNG fora do subconjunto esperado (8 bits, RGB/RGBA, sem entrelace): ${caminho}`,
  );

  const bruto = zlib.inflateSync(Buffer.concat(idat));
  const bytesPorLinha = ihdr.largura * canais;
  const pixels = Buffer.alloc(ihdr.altura * bytesPorLinha);
  let pos = 0;
  for (let y = 0; y < ihdr.altura; y++) {
    const filtro = bruto[pos++];
    const linha = bruto.subarray(pos, pos + bytesPorLinha);
    pos += bytesPorLinha;
    const anterior = y > 0 ? pixels.subarray((y - 1) * bytesPorLinha, y * bytesPorLinha) : null;
    const destino = pixels.subarray(y * bytesPorLinha, (y + 1) * bytesPorLinha);
    for (let x = 0; x < bytesPorLinha; x++) {
      const a = x >= canais ? destino[x - canais] : 0;
      const b = anterior ? anterior[x] : 0;
      const c = anterior && x >= canais ? anterior[x - canais] : 0;
      let valor = linha[x];
      if (filtro === 1) valor += a;
      else if (filtro === 2) valor += b;
      else if (filtro === 3) valor += (a + b) >> 1;
      else if (filtro === 4) valor += paeth(a, b, c);
      else assert.equal(filtro, 0, `filtro PNG desconhecido (${filtro}) em ${caminho}`);
      destino[x] = valor & 0xff;
    }
  }

  return {
    largura: ihdr.largura,
    altura: ihdr.altura,
    canais,
    pixels,
    pixel(x, y) {
      const base = (y * ihdr.largura + x) * canais;
      return [pixels[base], pixels[base + 1], pixels[base + 2]];
    },
    alfa(x, y) {
      return canais === 4 ? pixels[(y * ihdr.largura + x) * canais + 3] : 255;
    },
  };
}

function ehFundo([r, g, b]) {
  return r === FUNDO[0] && g === FUNDO[1] && b === FUNDO[2];
}

test('manifest exibe "Personal Josy" e mantém a entrada do app', () => {
  const manifest = JSON.parse(fs.readFileSync(CAMINHO_MANIFEST, 'utf8'));
  assert.equal(manifest.name, 'Personal Josy');
  assert.equal(manifest.short_name, 'Personal Josy');
  assert.equal(manifest.start_url, '/index.html');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.theme_color, '#202020');
  assert.equal(manifest.background_color, '#202020');
});

test('ícones declarados existem, são PNG e têm a dimensão declarada', () => {
  const manifest = JSON.parse(fs.readFileSync(CAMINHO_MANIFEST, 'utf8'));
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0, 'manifest sem ícones');

  for (const icone of manifest.icons) {
    assert.equal(icone.type, 'image/png', `tipo inesperado em ${icone.src}`);
    const caminho = path.join(RAIZ, icone.src);
    assert.ok(fs.existsSync(caminho), `ícone ausente: ${icone.src}`);
    const { largura, altura } = lerPng(caminho);
    assert.equal(`${largura}x${altura}`, icone.sizes, `dimensão real diverge do declarado em ${icone.src}`);
  }

  const finalidades = new Set(
    manifest.icons.flatMap((icone) => String(icone.purpose || 'any').split(/\s+/)),
  );
  assert.ok(finalidades.has('any'), 'manifest precisa de ícone "any"');
  assert.ok(finalidades.has('maskable'), 'manifest precisa de ícone "maskable"');
});

test('ícones maskable mantêm o símbolo na zona segura e a base até as bordas', () => {
  const manifest = JSON.parse(fs.readFileSync(CAMINHO_MANIFEST, 'utf8'));
  const maskable = manifest.icons.filter((icone) =>
    String(icone.purpose || '').split(/\s+/).includes('maskable'),
  );
  assert.ok(maskable.length > 0, 'nenhum ícone maskable declarado');

  for (const icone of maskable) {
    const imagem = lerPng(path.join(RAIZ, icone.src));
    const centro = imagem.largura / 2;
    const limite = RAIO_SEGURO * imagem.largura;
    let maiorRaio = 0;
    for (let y = 0; y < imagem.altura; y++) {
      for (let x = 0; x < imagem.largura; x++) {
        assert.equal(imagem.alfa(x, y), 255, `${icone.src}: maskable deve ser opaco`);
        if (ehFundo(imagem.pixel(x, y))) continue;
        const raio = Math.hypot(x + 0.5 - centro, y + 0.5 - centro);
        if (raio > maiorRaio) maiorRaio = raio;
      }
    }
    assert.ok(
      maiorRaio <= limite,
      `${icone.src}: desenho chega a ${maiorRaio.toFixed(1)}px do centro, acima do raio seguro de ${limite}px`,
    );
    for (const [x, y] of [[0, 0], [imagem.largura - 1, 0], [0, imagem.altura - 1], [imagem.largura - 1, imagem.altura - 1]]) {
      assert.ok(ehFundo(imagem.pixel(x, y)), `${icone.src}: canto (${x},${y}) deveria ser branco`);
    }
    assert.ok(maiorRaio > imagem.largura * 0.2, 'ícone não pode estar vazio');
  }
});

test('ícones comuns e favicon têm transparência, com J e presilhas escuros opacos; Apple tem base branca', () => {
  const manifest = JSON.parse(fs.readFileSync(CAMINHO_MANIFEST, 'utf8'));
  const comuns = manifest.icons.filter((icone) => icone.purpose === 'any');
  const mascarados = manifest.icons.filter((icone) => icone.purpose === 'maskable');
  assert.equal(comuns.length, 2);
  for (const icone of comuns) {
    assert.ok(!mascarados.some((outro) => outro.src === icone.src), 'finalidades precisam de arquivos próprios');
  }
  for (const arquivo of [...comuns.map((icone) => icone.src), 'assets/images/favicon-32x32.png']) {
    const imagem = lerPng(path.join(RAIZ, arquivo));
    assert.equal(imagem.alfa(0, 0), 0, arquivo + ': fundo deve ser transparente');
    for (const [proporcaoX, proporcaoY, cor] of [
      [0.36, 0.25, [32, 32, 32]],
      [0.58, 0.5, [32, 32, 32]],
      [0.3, 0.5, [255, 222, 23]],
    ]) {
      const x = Math.floor(imagem.largura * proporcaoX);
      const y = Math.floor(imagem.altura * proporcaoY);
      assert.deepEqual(imagem.pixel(x, y), cor, arquivo + ': cores do mestre claro preservadas');
      assert.equal(imagem.alfa(x, y), 255, arquivo + ': desenho e J continuam opacos');
    }
  }
  const apple = lerPng(path.join(RAIZ, 'assets/images/apple-touch-icon-180x180.png'));
  assert.deepEqual(apple.pixel(0, 0), FUNDO);
  for (let y = 0; y < apple.altura; y++) {
    for (let x = 0; x < apple.largura; x++) assert.equal(apple.alfa(x, y), 255);
  }
});

test('index.html exibe "Personal Josy" no título, no app da Apple e nos ícones', () => {
  const dom = new JSDOM(fs.readFileSync(CAMINHO_HTML, 'utf8'));
  const { document } = dom.window;
  const meta = (nome) => document.querySelector(`meta[name="${nome}"]`);

  assert.equal(document.title, 'Personal Josy');
  assert.equal(meta('apple-mobile-web-app-title').content, 'Personal Josy');
  assert.equal(meta('theme-color').content, '#202020');

  const favicon = document.querySelector('link[rel="icon"]');
  assert.equal(favicon.getAttribute('href'), 'assets/images/favicon-32x32.png');
  assert.ok(fs.existsSync(path.join(RAIZ, favicon.getAttribute('href'))), 'favicon declarado não existe');

  const apple = document.querySelector('link[rel="apple-touch-icon"]');
  assert.equal(apple.getAttribute('href'), 'assets/images/apple-touch-icon-180x180.png');
  const { largura, altura } = lerPng(path.join(RAIZ, apple.getAttribute('href')));
  assert.equal(`${largura}x${altura}`, '180x180');

  dom.window.close();
});
