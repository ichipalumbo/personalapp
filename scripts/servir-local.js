// [TAG-SERVIDOR-LOCAL] Servidor estático do frontend para desenvolvimento.
// Substitui a extensão Live Server (desinstalada em 2026-10-01): é o servidor que
// entrega o app e o mock de UI (`mocks/ui-runtime/`) localmente.
//
// Zero dependências (apenas `http`/`fs`) e zero build step. Não criar `package.json`
// na raiz: a Vercel usa a raiz como Root Directory e um package.json aqui mudaria a
// detecção de build do frontend.
//
// Uso:
//   node scripts/servir-local.js
//   node scripts/servir-local.js --host localhost --port 5500
//
// Padrão: 127.0.0.2:5500 — host em que o mock de UI ativa automaticamente.
//   Mock:   http://127.0.0.2:5500/index.html?mockScenario=default
//   App real (backend local em :5000): suba com --host localhost e abra
//   http://localhost:5500 (origem autorizada no OAuth do Google).
// Em host diferente de 127.0.0.2, o mock só ativa com `?mockScenario=<nome>`.

const http = require('http');
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');

const MIMES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

function lerArgumento(nome, padrao) {
  const indice = process.argv.indexOf('--' + nome);
  if (indice !== -1 && process.argv[indice + 1]) {
    return process.argv[indice + 1];
  }
  return padrao;
}

const HOST = lerArgumento('host', '127.0.0.2');
const PORTA = Number(lerArgumento('port', '5500'));

// Um caminho só é servido se, depois de resolvido, continuar dentro de RAIZ.
// Compara por caminho relativo (o startsWith de string aceitaria `..\raizX`).
//
// Também nega dotfiles e `node_modules`: o frontend precisa de `backend/shared/`
// (as tags <script> apontam para lá), mas não de `backend/.env`, `.git`, etc.
function resolverSeguro(rota) {
  const decodificado = decodeURIComponent(rota);
  const relativo = decodificado === '/' ? 'index.html' : decodificado.replace(/^\/+/, '');

  const proibido = relativo
    .split(/[\\/]+/)
    .some((segmento) => segmento.startsWith('.') || segmento === 'node_modules');
  if (proibido) {
    return null;
  }

  const absoluto = path.resolve(RAIZ, relativo);
  const paraFora = path.relative(RAIZ, absoluto);
  const fora = paraFora.startsWith('..') || path.isAbsolute(paraFora);
  return fora ? null : absoluto;
}

http
  .createServer((req, res) => {
    const rota = new URL(req.url, 'http://' + HOST).pathname;
    const arquivo = resolverSeguro(rota);

    if (!arquivo) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('forbidden');
    }

    fs.readFile(arquivo, (err, bytes) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('não encontrado: ' + rota);
      }
      res.writeHead(200, {
        'Content-Type': MIMES[path.extname(arquivo).toLowerCase()] || 'application/octet-stream',
        // no-store para validar CSS/JS alterados sem cache do browser.
        'Cache-Control': 'no-store'
      });
      res.end(bytes);
    });
  })
  .listen(PORTA, HOST, () => {
    console.log('Servindo ' + RAIZ + ' em http://' + HOST + ':' + PORTA);
    console.log('  Mock de UI: http://' + HOST + ':' + PORTA + '/index.html?mockScenario=default');
    if (HOST === '127.0.0.2') {
      console.log('  (host dedicado do mock: ativa sem o parâmetro ?mockScenario)');
    }
    console.log('  Ctrl+C para encerrar.');
  });
