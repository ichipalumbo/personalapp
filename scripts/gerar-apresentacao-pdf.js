// Gera o PDF de apresentacao comercial (Slides 16:9) do Personal Josy
// a partir do HTML em docs/apresentacao-personal-josy.html.
//
// Fonte: docs/apresentacao-personal-josy.html
// Destino: docs/apresentacao-personal-josy.pdf

const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { execFileSync } = require('child_process');

const DIR_DOCS = path.resolve(__dirname, '..', 'docs');
const ARQUIVO_HTML = path.join(DIR_DOCS, 'apresentacao-personal-josy.html');
const ARQUIVO_PDF = path.join(DIR_DOCS, 'apresentacao-personal-josy.pdf');

const NAVEGADORES = [
  path.join(process.env['ProgramFiles(x86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  path.join(process.env.ProgramFiles || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  path.join(process.env.ProgramFiles || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

function encontrarNavegador() {
  const indice = process.argv.indexOf('--navegador');
  if (indice !== -1) return process.argv[indice + 1];
  const achado = NAVEGADORES.find((p) => p && fs.existsSync(p));
  if (!achado) throw new Error('Edge/Chrome não encontrado. Informe o caminho com --navegador.');
  return achado;
}

function main() {
  if (!fs.existsSync(ARQUIVO_HTML)) {
    console.error(`Arquivo HTML não encontrado: ${ARQUIVO_HTML}`);
    process.exit(1);
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apresentacao-slides-'));
  const htmlUrl = pathToFileURL(ARQUIVO_HTML).href;

  try {
    console.log(`Renderizando slides 16:9 a partir de: ${ARQUIVO_HTML}`);
    execFileSync(encontrarNavegador(), [
      '--headless=new',
      '--disable-gpu',
      '--no-pdf-header-footer',
      '--allow-file-access-from-files',
      `--user-data-dir=${path.join(tmpDir, 'perfil')}`,
      '--virtual-time-budget=15000',
      `--print-to-pdf=${ARQUIVO_PDF}`,
      htmlUrl,
    ], { stdio: 'pipe', timeout: 120000 });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  const stats = fs.statSync(ARQUIVO_PDF);
  console.log(`PDF gerado com sucesso em: ${path.relative(process.cwd(), ARQUIVO_PDF)} (${stats.size} bytes)`);
}

main();
