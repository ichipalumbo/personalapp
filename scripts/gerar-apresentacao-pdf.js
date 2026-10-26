// Gera o PDF comercial da apresentacao do Personal Josy a partir do Markdown.
//
// Fonte: docs/apresentacao-personal-josy.md
// Destino: docs/apresentacao-personal-josy.pdf

const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { execFileSync } = require('child_process');

const DIR_DOCS = path.resolve(__dirname, '..', 'docs');
const ARQUIVO_MD = path.join(DIR_DOCS, 'apresentacao-personal-josy.md');
const ARQUIVO_PDF = path.join(DIR_DOCS, 'apresentacao-personal-josy.pdf');
const DIR_KIT = path.join(DIR_DOCS, 'reference', 'identidade', 'kit-visual-completo-v2');

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

function escapar(texto) {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function slug(texto) {
  return texto
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s/g, '-');
}

function inline(texto) {
  const codigos = [];
  let html = escapar(texto).replace(/`([^`]+)`/g, (_, conteudo) => {
    codigos.push(`<code>${conteudo}</code>`);
    return `\u0000${codigos.length - 1}\u0000`;
  });
  html = html
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return html.replace(/\u0000(\d+)\u0000/g, (_, i) => codigos[Number(i)]);
}

function celulas(linha) {
  return linha.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

function blocos(linhas) {
  const saida = [];
  let i = 0;
  while (i < linhas.length) {
    const linha = linhas[i];
    if (!linha.trim()) { i++; continue; }

    // Fenced code blocks
    if (linha.startsWith('```')) {
      const codeLines = [];
      i++;
      while (i < linhas.length && !linhas[i].startsWith('```')) {
        codeLines.push(linhas[i++]);
      }
      i++;
      saida.push(`<pre class="diagrama"><code>${escapar(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    // Dividers
    if (/^---$/.test(linha.trim())) {
      saida.push('<hr class="divisor">');
      i++;
      continue;
    }

    // Headings
    const titulo = linha.match(/^(#{1,3})\s+(.*)$/);
    if (titulo) {
      const nivel = titulo[1].length;
      const texto = titulo[2];
      const classe = nivel === 2 ? ' class="secao-titulo"' : (nivel === 3 ? ' class="subsecao-titulo"' : '');
      saida.push(`<h${nivel}${classe} id="${slug(texto)}">${inline(texto)}</h${nivel}>`);
      i++;
      continue;
    }

    // Tables
    if (linha.startsWith('|')) {
      const tabela = [];
      while (i < linhas.length && linhas[i].startsWith('|')) tabela.push(linhas[i++]);
      const [cabecalho, , ...corpo] = tabela;
      saida.push(
        '<div class="tabela-container"><table><thead><tr>' + celulas(cabecalho).map((c) => `<th>${inline(c)}</th>`).join('') +
        '</tr></thead><tbody>' +
        corpo.map((l) => '<tr>' + celulas(l).map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') +
        '</tbody></table></div>'
      );
      continue;
    }

    // Quotes
    if (linha.startsWith('>')) {
      const citacao = [];
      while (i < linhas.length && linhas[i].startsWith('>')) citacao.push(linhas[i++].replace(/^>\s?/, ''));
      saida.push(`<blockquote class="destaque">${blocos(citacao)}</blockquote>`);
      continue;
    }

    // Unordered Lists
    if (/^- /.test(linha)) {
      const itens = [];
      while (i < linhas.length && /^- /.test(linhas[i])) itens.push(linhas[i++].slice(2));
      saida.push('<ul class="lista-beneficios">' + itens.map((t) => `<li>${inline(t)}</li>`).join('') + '</ul>');
      continue;
    }

    // Paragraphs
    const paragrafo = [];
    while (i < linhas.length && linhas[i].trim() && !/^(#{1,3}\s|\||>|- |```|---)/.test(linhas[i])) paragrafo.push(linhas[i++]);
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

  const logoCapa = pathToFileURL(kit('05_horizontal_com_descritor', 'escuro', 'transparente')).href;
  const simboloHeader = pathToFileURL(kit('03_simbolo', 'claro', 'transparente')).href;

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>${escapar(tituloDoc)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=block" rel="stylesheet">
<style>
  @page {
    size: A4;
    margin: 18mm 16mm 18mm 16mm;
    @bottom-center {
      content: "Personal Josy • Agenda e gestão para personal trainers";
      font-size: 8pt;
      color: #888888;
      font-family: Poppins, sans-serif;
    }
  }
  @page :first { margin: 0; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
  body {
    font-family: Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #202020;
    font-size: 9.8pt;
    line-height: 1.6;
    margin: 0;
    background: #FFFFFF;
  }

  /* Capa Comercial Marcante */
  .capa {
    page-break-after: always;
    break-after: page;
    min-height: 297mm;
    height: 297mm;
    background: radial-gradient(circle at 80% 20%, #2a2a2a 0%, #202020 100%);
    color: #FFFFFF;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 24mm 22mm 20mm;
    position: relative;
    overflow: hidden;
  }
  .capa::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 8mm;
    background: #FFDE17;
  }
  .capa-topo {
    margin-top: 10mm;
  }
  .capa-logo {
    width: 155mm;
    max-width: 100%;
    margin-bottom: 8mm;
    filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
  }
  .badge-tag {
    display: inline-block;
    background: #FFDE17;
    color: #202020;
    font-size: 8.5pt;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    padding: 3px 12px;
    border-radius: 4px;
    margin-bottom: 6mm;
  }
  .capa-centro h1 {
    font-size: 26pt;
    font-weight: 700;
    line-height: 1.25;
    margin: 0 0 4mm;
    color: #FFFFFF;
  }
  .capa-centro h1 span {
    color: #FFDE17;
  }
  .capa-centro .chamada {
    font-size: 13.5pt;
    font-weight: 400;
    color: #E0E0E0;
    max-width: 145mm;
    line-height: 1.5;
    margin-bottom: 8mm;
  }
  .capa-cards-preview {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4mm;
    margin-top: 4mm;
  }
  .capa-card-mini {
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    padding: 4mm;
  }
  .capa-card-mini strong {
    display: block;
    color: #FFDE17;
    font-size: 9.5pt;
    margin-bottom: 1.5mm;
  }
  .capa-card-mini span {
    font-size: 8pt;
    color: #CCCCCC;
    line-height: 1.35;
    display: block;
  }
  .capa-rodape {
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    padding-top: 4mm;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 8.5pt;
    color: #A0A0A0;
  }
  .capa-rodape strong {
    color: #FFFFFF;
  }

  /* Conteudo Interno */
  .conteudo {
    padding: 0 4mm;
  }

  /* Cabecalho de Pagina Interna */
  .topo-pagina {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 3mm;
    margin-bottom: 6mm;
    border-bottom: 1.5pt solid #F0F0F0;
  }
  .topo-marca {
    display: flex;
    align-items: center;
    gap: 3mm;
    font-weight: 700;
    font-size: 9pt;
    color: #202020;
  }
  .topo-marca img {
    height: 6mm;
  }
  .topo-tag {
    font-size: 7.8pt;
    color: #777777;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  h2.secao-titulo {
    font-size: 16pt;
    font-weight: 700;
    color: #202020;
    margin: 8mm 0 3.5mm;
    padding-bottom: 1.5mm;
    border-bottom: 2.5pt solid #FFDE17;
    break-after: avoid;
    display: flex;
    align-items: center;
    gap: 2mm;
  }
  h2.secao-titulo:first-of-type {
    margin-top: 2mm;
  }
  h3.subsecao-titulo {
    font-size: 11pt;
    font-weight: 600;
    color: #202020;
    margin: 5mm 0 2mm;
    break-after: avoid;
  }
  p {
    margin: 0 0 3mm;
    color: #333333;
    line-height: 1.6;
  }
  strong {
    color: #111111;
  }

  /* Listas com Icones Customizados */
  ul.lista-beneficios {
    list-style: none;
    padding-left: 0;
    margin: 0 0 4.5mm;
  }
  ul.lista-beneficios li {
    position: relative;
    padding-left: 5mm;
    margin-bottom: 2mm;
    line-height: 1.5;
  }
  ul.lista-beneficios li::before {
    content: "✓";
    position: absolute;
    left: 0;
    top: 0;
    color: #202020;
    background: #FFDE17;
    width: 3.5mm;
    height: 3.5mm;
    border-radius: 50%;
    font-size: 6.5pt;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    text-align: center;
  }

  /* Cards de Destaque / Quotes */
  blockquote.destaque {
    margin: 4.5mm 0 5.5mm;
    padding: 3.5mm 5mm;
    background: #FFFCE6;
    border-left: 4pt solid #FFDE17;
    border-radius: 0 6px 6px 0;
    break-inside: avoid;
  }
  blockquote.destaque p {
    font-style: italic;
    color: #444444;
    margin: 0;
    font-size: 9.5pt;
  }

  /* Tabela Comercial */
  .tabela-container {
    margin: 4mm 0 6mm;
    break-inside: avoid;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.8pt;
    background: #FFFFFF;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  }
  thead tr {
    background: #202020;
    color: #FFFFFF;
  }
  th {
    padding: 2.8mm 3mm;
    font-weight: 600;
    text-align: left;
    font-size: 8.8pt;
    letter-spacing: 0.3px;
  }
  td {
    padding: 2.5mm 3mm;
    border-bottom: 1px solid #EBEBEB;
    vertical-align: top;
    color: #333333;
    line-height: 1.45;
  }
  tbody tr:nth-child(even) td {
    background: #FAFAFA;
  }

  /* Diagramas e Blocos de Codigo */
  pre.diagrama {
    background: #202020;
    color: #FFDE17;
    padding: 3.5mm 4mm;
    border-radius: 6px;
    font-family: Consolas, "Courier New", monospace;
    font-size: 7.2pt;
    line-height: 1.35;
    margin: 3mm 0 5mm;
    break-inside: avoid;
    overflow-x: hidden;
  }
  code {
    font-family: Consolas, monospace;
    font-size: 8.5pt;
    background: #F4F4F4;
    padding: 1px 3px;
    border-radius: 3px;
  }

  hr.divisor {
    border: 0;
    height: 1px;
    background: #E5E5E5;
    margin: 6mm 0;
  }

  /* Caixa CTA Final */
  .cta-banner {
    background: #202020;
    color: #FFFFFF;
    border-radius: 8px;
    padding: 6mm 7mm;
    margin: 6mm 0 3mm;
    text-align: center;
    break-inside: avoid;
    position: relative;
    border-bottom: 4pt solid #FFDE17;
  }
  .cta-banner h3 {
    color: #FFDE17;
    font-size: 13pt;
    font-weight: 700;
    margin: 0 0 2mm;
  }
  .cta-banner p {
    color: #E0E0E0;
    font-size: 9.5pt;
    margin: 0 0 4mm;
  }
  .btn-cta {
    display: inline-block;
    background: #FFDE17;
    color: #202020;
    font-weight: 700;
    font-size: 9.5pt;
    padding: 2.8mm 8mm;
    border-radius: 5px;
    text-decoration: none;
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  }
</style>
</head>
<body>

<!-- Capa -->
<section class="capa">
  <div class="capa-topo">
    <div class="badge-tag">Plataforma Exclusiva</div>
    <br>
    <img src="${logoCapa}" alt="Personal Josy" class="capa-logo">
  </div>

  <div class="capa-centro">
    <h1>A Gestão dos Seus Alunos e Agenda em <span>Outro Nível</span>.</h1>
    <div class="chamada">
      Diga adeus ao descontrole de horários, perdas de reposições e planilhas complicadas. Tenha toda a sua consultoria física centralizada em uma ferramenta ágil, profissional e integrada ao Google Calendar.
    </div>

    <div class="capa-cards-preview">
      <div class="capa-card-mini">
        <strong>Agenda Multivisão</strong>
        <span>Controle diário, semanal e mensal integrado ao Google Calendar em tempo real.</span>
      </div>
      <div class="capa-card-mini">
        <strong>Reposições Claras</strong>
        <span>Gestão de créditos e competências sem conflitos com seus alunos.</span>
      </div>
      <div class="capa-card-mini">
        <strong>PWA Offline-First</strong>
        <span>Funcione 100% mesmo sem sinal na academia, salvando no aparelho.</span>
      </div>
    </div>
  </div>

  <div class="capa-rodape">
    <div><strong>Personal Josy</strong> • Versão Comercial 2026</div>
    <div>Acesso Seguro com Google OAuth</div>
  </div>
</section>

<!-- Conteudo Interno -->
<main class="conteudo">
  <div class="topo-pagina">
    <div class="topo-marca">
      <img src="${simboloHeader}" alt="Personal Josy">
      <span>Personal Josy</span>
    </div>
    <div class="topo-tag">Apresentação Comercial &amp; Guia do Produto</div>
  </div>

  ${corpo}

  <div class="cta-banner">
    <h3>Pronto para organizar sua carreira e impressionar seus alunos?</h3>
    <p>Acesse agora mesmo com sua Conta Google. Sem formulários longos, sem cartão de crédito e sem complicação.</p>
    <a href="index.html" class="btn-cta">Experimentar o Personal Josy Agora</a>
  </div>
</main>

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
  if (!fs.existsSync(ARQUIVO_MD)) {
    console.error(`Arquivo não encontrado: ${ARQUIVO_MD}`);
    process.exit(1);
  }

  const html = montarHtml(fs.readFileSync(ARQUIVO_MD, 'utf8'));
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apresentacao-personal-josy-'));
  const tmpHtml = path.join(tmpDir, 'apresentacao.html');
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

  console.log(`PDF gerado com sucesso em: ${path.relative(process.cwd(), ARQUIVO_PDF)}`);
}

main();