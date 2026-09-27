// Servidor estatico temporario — 127.0.0.2:5500, raiz do repo, headers no-store.
// Descartavel: apagar ao fim da rodada.
const http = require("http");
const fs = require("fs");
const path = require("path");
const ROOT = __dirname;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
};
http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/" || urlPath === "") urlPath = "/index.html";
  const filePath = path.join(ROOT, path.normalize(urlPath));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end("forbidden"); return; }
  fs.stat(filePath, (err, st) => {
    let target = filePath;
    if (!err && st.isDirectory()) target = path.join(filePath, "index.html");
    fs.readFile(target, (err2, data) => {
      if (err2) { res.writeHead(404, { "Cache-Control": "no-store" }); res.end("404 " + urlPath); return; }
      const ext = path.extname(target).toLowerCase();
      res.writeHead(200, {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      });
      res.end(data);
    });
  });
}).listen(5500, "127.0.0.2", () => console.log("servidor temporario em http://127.0.0.2:5500"));
