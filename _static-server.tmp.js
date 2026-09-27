// Servidor estático temporário (tiro único de sessão).
// Sobe em 127.0.0.2:5500 para o mock de runtime (host dedicado) servir o frontend
// sem backend local. Cache desabilitado para validar CSS/JS alterados.
// REMOVER ao fim da sessão.

const http = require('http');
const fs = require('fs');
const path = require('path');

const RAIZ = __dirname;
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

http
  .createServer((req, res) => {
    const rota = decodeURIComponent(new URL(req.url, 'http://127.0.0.2').pathname);
    const rel = rota === '/' ? 'index.html' : rota.replace(/^\/+/, '');
    const arquivo = path.join(RAIZ, rel);
    if (!arquivo.startsWith(RAIZ)) {
      res.writeHead(403);
      return res.end('forbidden');
    }
    fs.readFile(arquivo, (err, bytes) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('não encontrado: ' + rel);
      }
      res.writeHead(200, {
        'Content-Type': MIMES[path.extname(arquivo).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store'
      });
      res.end(bytes);
    });
  })
  .listen(5500, '127.0.0.2', () => console.log('listening on http://127.0.0.2:5500'));
