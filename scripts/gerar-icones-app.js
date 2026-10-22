// Gera os ícones de instalação do app a partir do vetor do kit.
//
// Fonte de verdade: guia de identidade visual v3, seção 8.3 — símbolo oficial,
// sem nome ou descritor, base quadrada opaca em Grafite #202020 preenchendo todo
// o arquivo, sem cantos arredondados. O SVG do avatar escuro do kit já é essa
// peça: símbolo centrado sobre #202020, com margem que mantém o desenho dentro
// da zona segura circular de 80% exigida dos ícones maskable.
//
// Material gerado: não editar os PNG à mão; rodar este script de novo.
// Zero dependências: rasteriza com o Microsoft Edge (ou Chrome) em modo headless.
//
// Uso:
//   node scripts/gerar-icones-app.js
//   node scripts/gerar-icones-app.js --navegador "C:\caminho\msedge.exe"

const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { execFileSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..');
const DIR_KIT = path.join(RAIZ, 'docs', 'reference', 'identidade', 'kit-visual-completo-v2');
const ORIGEM = path.join(DIR_KIT, '07_avatar', 'escuro', 'personal_josy_avatar_escuro_com_fundo.svg');
const DIR_SAIDA = path.join(RAIZ, 'assets', 'images');

const FUNDO = '#202020';

const NAVEGADORES = [
  path.join(process.env['ProgramFiles(x86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  path.join(process.env.ProgramFiles || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  path.join(process.env.ProgramFiles || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

// Destinos da seção 8.3: favicon do navegador, ícones PWA e ícone de toque móvel.
const DESTINOS = [
  { arquivo: 'icon-192x192.png', tamanho: 192 },
  { arquivo: 'icon-512x512.png', tamanho: 512 },
  { arquivo: 'apple-touch-icon-180x180.png', tamanho: 180 },
  { arquivo: 'favicon-32x32.png', tamanho: 32 },
];

function encontrarNavegador() {
  const arg = process.argv.indexOf('--navegador');
  if (arg > -1) {
    const caminho = process.argv[arg + 1];
    if (!caminho || !fs.existsSync(caminho)) {
      throw new Error(`Navegador não encontrado: ${caminho}`);
    }
    return caminho;
  }
  const achado = NAVEGADORES.find((caminho) => caminho && fs.existsSync(caminho));
  if (!achado) {
    throw new Error(
      'Edge/Chrome não encontrado. Informe o caminho com --navegador "<caminho>" — esta geração depende de um navegador instalado.',
    );
  }
  return achado;
}

function html(tamanho, svg) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html, body { margin: 0; padding: 0; width: ${tamanho}px; height: ${tamanho}px; background: ${FUNDO}; }
    svg { display: block; width: ${tamanho}px; height: ${tamanho}px; }
  </style></head><body>${svg}</body></html>`;
}

function main() {
  if (!fs.existsSync(ORIGEM)) {
    throw new Error(`Vetor de origem não encontrado: ${ORIGEM}`);
  }
  const navegador = encontrarNavegador();
  const svg = fs.readFileSync(ORIGEM, 'utf8');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'icones-app-'));
  try {
    for (const { arquivo, tamanho } of DESTINOS) {
      const tmpHtml = path.join(tmpDir, `${tamanho}.html`);
      fs.writeFileSync(tmpHtml, html(tamanho, svg), 'utf8');
      const saida = path.join(DIR_SAIDA, arquivo);
      execFileSync(navegador, [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--force-device-scale-factor=1',
        `--window-size=${tamanho},${tamanho}`,
        '--virtual-time-budget=3000',
        `--user-data-dir=${path.join(tmpDir, 'perfil')}`,
        `--screenshot=${saida}`,
        pathToFileURL(tmpHtml).href,
      ], { stdio: 'pipe', timeout: 60000 });
      console.log(`Gerado: ${path.relative(process.cwd(), saida)} (${tamanho}×${tamanho})`);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main();
