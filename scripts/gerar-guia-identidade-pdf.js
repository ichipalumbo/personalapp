// Gera o PDF ilustrado do guia de identidade visual a partir do Markdown.
//
// Fonte de verdade: docs/reference/identidade/guia-identidade-visual-v3.md.
// O PDF é material gerado: não editar à mão; rodar este script de novo quando o .md mudar.
//
// Zero dependências: converte o subconjunto de Markdown usado no guia (títulos,
// parágrafos, listas, tabelas, citações, negrito, código e links) e imprime o HTML
// com o Microsoft Edge (ou Chrome) em modo headless. A fonte Poppins é carregada do
// Google Fonts durante a impressão; sem rede, cai no fallback do sistema.
//
// Uso:
//   node scripts/gerar-guia-identidade-pdf.js
//   node scripts/gerar-guia-identidade-pdf.js --navegador "C:\caminho\msedge.exe"

const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { execFileSync } = require('child_process');

const DIR_IDENTIDADE = path.resolve(__dirname, '..', 'docs', 'reference', 'identidade');
const ARQUIVO_MD = path.join(DIR_IDENTIDADE, 'guia-identidade-visual-v3.md');
const ARQUIVO_PDF = path.join(DIR_IDENTIDADE, 'guia-identidade-visual-v3.pdf');
const DIR_KIT = path.join(DIR_IDENTIDADE, 'kit-visual-completo-v2');

const NAVEGADORES = [
  path.join(process.env['ProgramFiles(x86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  path.join(process.env.ProgramFiles || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  path.join(process.env.ProgramFiles || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

function kit(composicao, aplicacao, fundo) {
  const nome = composicao.replace(/^\d+_/, '');
  return path.join(DIR_KIT, composicao, aplicacao, `personal_josy_${nome}_${aplicacao}_${fundo}.svg`);
}

const COMPOSICOES = [
  ['01_horizontal', 'Horizontal'],
  ['02_escrita', 'Somente escrita'],
  ['03_simbolo', 'Somente símbolo'],
  ['04_empilhada', 'Empilhada'],
  ['05_horizontal_com_descritor', 'Horizontal com descritor'],
  ['06_empilhada_com_descritor', 'Empilhada com descritor'],
  ['07_avatar', 'Avatar'],
];

// Ilustrações inseridas logo após o título indicado (pelo número da seção).
const FIGURAS = {
  '4.1': [
    { src: kit('03_simbolo', 'claro', 'com_fundo'), legenda: 'Símbolo — aplicação clara' },
    { src: kit('03_simbolo', 'escuro', 'com_fundo'), legenda: 'Símbolo — aplicação escura' },
  ],
  '5': Object.assign(COMPOSICOES.flatMap(([c, titulo]) => [
    { src: kit(c, 'claro', 'com_fundo'), legenda: `${titulo} — clara` },
    { src: kit(c, 'escuro', 'com_fundo'), legenda: `${titulo} — escura` },
  ]), { compacta: true }),
  '7.2': [
    { src: kit('01_horizontal', 'claro', 'com_fundo'), legenda: 'Contorno de Josy na aplicação clara', largo: true },
    { src: kit('01_horizontal', 'escuro', 'com_fundo'), legenda: 'Aplicação escura, sem contorno', largo: true },
  ],
  '8.2': [
    { src: kit('07_avatar', 'claro', 'com_fundo'), legenda: 'Avatar — aplicação clara' },
    { src: kit('07_avatar', 'escuro', 'com_fundo'), legenda: 'Avatar — aplicação escura' },
  ],
};

function escapar(texto) {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function slug(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function inline(texto) {
  const codigos = [];
  let html = escapar(texto).replace(/`([^`]+)`/g, (_, conteudo) => {
    codigos.push(
      /^#[0-9A-Fa-f]{6}$/.test(conteudo)
        ? `<span class="cor"><span class="amostra" style="background:${conteudo}"></span><code>${conteudo}</code></span>`
        : `<code>${conteudo}</code>`
    );
    return `\u0000${codigos.length - 1}\u0000`;
  });
  html = html
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((#[^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span class="ref">$1</span>')
    .replace(/(^|[\s(])(#[0-9A-F]{6})\b/g, '$1<span class="cor"><span class="amostra" style="background:$2"></span>$2</span>');
  return html.replace(/\u0000(\d+)\u0000/g, (_, i) => codigos[Number(i)]);
}

function celulas(linha) {
  return linha.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

function figuras(numero) {
  const lista = FIGURAS[numero];
  if (!lista) return '';
  const itens = lista
    .map((f) => {
      if (!fs.existsSync(f.src)) throw new Error(`Ilustração não encontrada: ${f.src}`);
      return `<figure class="${f.largo ? 'largo' : ''}"><img src="${pathToFileURL(f.src)}" alt=""><figcaption>${escapar(f.legenda)}</figcaption></figure>`;
    })
    .join('');
  return `<div class="figuras${lista.compacta ? ' compacta' : ''}">${itens}</div>`;
}

function blocos(linhas) {
  const saida = [];
  let i = 0;
  while (i < linhas.length) {
    const linha = linhas[i];
    if (!linha.trim()) { i++; continue; }

    const titulo = linha.match(/^(#{1,3})\s+(.*)$/);
    if (titulo) {
      const nivel = titulo[1].length;
      const texto = titulo[2];
      const numero = (texto.match(/^(\d+(?:\.\d+)*)\.?\s/) || [])[1];
      saida.push(`<h${nivel} id="${slug(texto)}">${inline(texto)}</h${nivel}>`);
      if (numero) saida.push(figuras(numero));
      i++;
      continue;
    }

    if (linha.startsWith('|')) {
      const tabela = [];
      while (i < linhas.length && linhas[i].startsWith('|')) tabela.push(linhas[i++]);
      const [cabecalho, , ...corpo] = tabela;
      saida.push(
        '<table><thead><tr>' + celulas(cabecalho).map((c) => `<th>${inline(c)}</th>`).join('') +
        '</tr></thead><tbody>' +
        corpo.map((l) => '<tr>' + celulas(l).map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') +
        '</tbody></table>'
      );
      continue;
    }

    if (linha.startsWith('>')) {
      const citacao = [];
      while (i < linhas.length && linhas[i].startsWith('>')) citacao.push(linhas[i++].replace(/^>\s?/, ''));
      saida.push(`<blockquote>${blocos(citacao)}</blockquote>`);
      continue;
    }

    if (/^- /.test(linha)) {
      const itens = [];
      while (i < linhas.length && /^- /.test(linhas[i])) itens.push(linhas[i++].slice(2));
      saida.push('<ul>' + itens.map((t) => `<li>${inline(t)}</li>`).join('') + '</ul>');
      continue;
    }

    const paragrafo = [];
    while (i < linhas.length && linhas[i].trim() && !/^(#{1,3}\s|\||>|- )/.test(linhas[i])) paragrafo.push(linhas[i++]);
    saida.push(`<p>${inline(paragrafo.join(' '))}</p>`);
  }
  return saida.join('\n');
}

function montarHtml(markdown) {
  const linhas = markdown.replace(/\r\n/g, '\n').split('\n');
  const tituloDoc = linhas[0].replace(/^#\s+/, '');
  let i = 1;
  while (i < linhas.length && !linhas[i].startsWith('>')) i++;
  const meta = [];
  while (i < linhas.length && linhas[i].startsWith('>')) meta.push(linhas[i++].replace(/^>\s?/, ''));
  const corpo = blocos(linhas.slice(i));
  const [marca, subtitulo] = tituloDoc.split(' — ');
  const logoCapa = pathToFileURL(kit('01_horizontal', 'escuro', 'transparente'));

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>${escapar(tituloDoc)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=block" rel="stylesheet">
<style>
  @page { size: A4; margin: 18mm 16mm 18mm 16mm; }
  @page capa { margin: 0; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
  body { font-family: Poppins, 'Segoe UI', Arial, sans-serif; color: #202020; font-size: 10pt; line-height: 1.55; margin: 0; }
  .capa { page: capa; height: 297mm; background: #202020; color: #FFFFFF; display: flex; flex-direction: column; justify-content: center; padding: 0 22mm; break-after: page; }
  .capa img { width: 120mm; margin-bottom: 18mm; }
  .capa h1 { font-size: 26pt; font-weight: 600; margin: 0 0 2mm; }
  .capa .sub { color: #FFDE17; font-size: 13pt; font-weight: 500; margin-bottom: 14mm; }
  .capa .meta p { color: #E0E0E0; font-size: 9pt; margin: 0 0 2mm; }
  .capa .meta strong { color: #FFFFFF; }
  h2 { font-size: 17pt; font-weight: 600; margin: 0 0 4mm; padding-bottom: 2mm; border-bottom: 2.5pt solid #FFDE17; break-before: page; break-after: avoid; }
  h3 { font-size: 12pt; font-weight: 600; margin: 6mm 0 2mm; break-after: avoid; }
  p, ul { margin: 0 0 3mm; }
  li { margin-bottom: 1mm; }
  table { width: 100%; border-collapse: collapse; margin: 2mm 0 5mm; font-size: 8.8pt; break-inside: auto; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  th { background: #202020; color: #FFFFFF; font-weight: 600; text-align: left; padding: 2mm 2.5mm; }
  td { padding: 1.8mm 2.5mm; border-bottom: 0.6pt solid #E0E0E0; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #F7F7F7; }
  code { font-family: Consolas, 'Courier New', monospace; font-size: 0.92em; background: #F2F2F2; padding: 0 1mm; border-radius: 1mm; }
  .amostra { display: inline-block; width: 3.2mm; height: 3.2mm; border-radius: 0.8mm; border: 0.5pt solid #A0A0A0; vertical-align: -0.5mm; margin-right: 1.2mm; }
  table .amostra { width: 4mm; height: 4mm; }
  blockquote { margin: 3mm 0 5mm; padding: 3mm 5mm; background: #FFF9D6; border-left: 3pt solid #FFDE17; break-inside: avoid; }
  blockquote p:last-child { margin-bottom: 0; }
  a { color: #202020; }
  .ref { text-decoration: underline; text-decoration-color: #FFDE17; text-decoration-thickness: 1.2pt; }
  .figuras { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin: 2mm 0 6mm; }
  figure { margin: 0; break-inside: avoid; border: 0.6pt solid #E0E0E0; border-radius: 2mm; padding: 3mm; display: flex; flex-direction: column; align-items: center; justify-content: space-between; }
  figure img { max-width: 100%; max-height: 26mm; object-fit: contain; }
  figure.largo { grid-column: 1 / -1; }
  figure.largo img { max-height: 26mm; }
  .figuras.compacta { grid-template-columns: repeat(4, 1fr); gap: 2.5mm; }
  .figuras.compacta figure { padding: 2mm; }
  .figuras.compacta img { max-height: 20mm; }
  .figuras.compacta figcaption { font-size: 6.5pt; margin-top: 1.2mm; }
  .cor { white-space: nowrap; }
  figcaption { font-size: 7.8pt; color: #555; margin-top: 2mm; text-align: center; }
</style></head>
<body>
<section class="capa">
  <img src="${logoCapa}" alt="Personal Josy">
  <h1>${escapar(subtitulo || tituloDoc)}</h1>
  <div class="sub">${escapar(marca)}</div>
  <div class="meta">${meta.filter((m) => m.trim()).map((m) => `<p>${inline(m)}</p>`).join('')}</div>
</section>
${corpo}
</body></html>`;
}

function encontrarNavegador() {
  const indice = process.argv.indexOf('--navegador');
  if (indice !== -1) return process.argv[indice + 1];
  const achado = NAVEGADORES.find((p) => p && fs.existsSync(p));
  if (!achado) throw new Error('Edge/Chrome não encontrado. Informe o caminho com --navegador.');
  return achado;
}

function main() {
  const html = montarHtml(fs.readFileSync(ARQUIVO_MD, 'utf8'));
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'guia-identidade-'));
  const tmpHtml = path.join(tmpDir, 'guia.html');
  fs.writeFileSync(tmpHtml, html, 'utf8');
  try {
    execFileSync(encontrarNavegador(), [
      '--headless=new',
      '--disable-gpu',
      '--no-pdf-header-footer',
      '--allow-file-access-from-files',
      `--user-data-dir=${path.join(tmpDir, 'perfil')}`,
      '--virtual-time-budget=15000',
      `--print-to-pdf=${ARQUIVO_PDF}`,
      pathToFileURL(tmpHtml).href,
    ], { stdio: 'pipe', timeout: 120000 });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  console.log(`PDF gerado: ${path.relative(process.cwd(), ARQUIVO_PDF)}`);
}

main();
