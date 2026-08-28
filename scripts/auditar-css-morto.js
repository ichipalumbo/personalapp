#!/usr/bin/env node
/**
 * auditar-css-morto.js — triagem de CSS potencialmente morto.
 *
 * NAO altera nenhum arquivo do projeto. So le, classifica e escreve um relatorio.
 * A saida e uma LISTA DE CANDIDATOS para revisao humana, nunca uma ordem de remocao.
 *
 * Uso (a partir da raiz do repositorio):
 *   node scripts/auditar-css-morto.js
 *   node scripts/auditar-css-morto.js --css assets/css/style.css --saida auditoria-css-morto.md
 *   node scripts/auditar-css-morto.js --json
 *
 * Node puro, sem dependencias.
 */
'use strict';

const fs = require('fs');
const path = require('path');

// ── Configuracao ────────────────────────────────────────────────────────────────

const RAIZ = process.cwd();

const PASTAS_IGNORADAS = new Set([
  'node_modules', '.git', '.vercel', 'dist', 'build', 'coverage', 'vendor'
]);

// Onde uma classe/id pode ser realmente consumida.
const EXTENSOES_CONSUMIDORAS = new Set(['.html', '.js']);

// Fora do corpus de proposito:
//  - docs/.github/.agents citam nomes de classe em prosa e mascarariam codigo morto;
//  - backend/ e test/ nao renderizam HTML do app;
//  - scripts/ e a propria ferramenta (o regex dela casaria consigo mesma).
const PASTAS_FORA_DO_CORPUS = new Set(['docs', '.agents', '.github', 'test', 'backend', 'scripts']);

// Nunca marcar como morta: biblioteca externa ou classe aplicada por API do browser.
const ALLOWLIST_PREFIXOS = ['fa-', 'fas', 'far', 'fab', 'sr-only', 'swiper-'];

// ── Argumentos ──────────────────────────────────────────────────────────────────

function lerArgs(argv) {
  const opcoes = {
    css: path.join('assets', 'css', 'style.css'),
    saida: 'auditoria-css-morto.md',
    json: false
  };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--css') opcoes.css = argv[++i];
    else if (arg === '--saida') opcoes.saida = argv[++i];
    else if (arg === '--json') opcoes.json = true;
    else if (arg === '--ajuda' || arg === '-h') {
      console.log('Uso: node scripts/auditar-css-morto.js [--css <arquivo>] [--saida <arquivo>] [--json]');
      process.exit(0);
    }
  }
  return opcoes;
}

// ── Utilitarios ─────────────────────────────────────────────────────────────────

/** Remove comentarios preservando a contagem de linhas. */
function removerComentarios(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (trecho) => trecho.replace(/[^\n]/g, ' '));
}

function construirMapaDeLinhas(texto) {
  const quebras = [];
  for (let i = 0; i < texto.length; i++) if (texto[i] === '\n') quebras.push(i);
  return (indice) => {
    let baixo = 0, alto = quebras.length;
    while (baixo < alto) {
      const meio = (baixo + alto) >> 1;
      if (quebras[meio] < indice) baixo = meio + 1; else alto = meio;
    }
    return baixo + 1;
  };
}

function escaparRegex(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Ocorrencias do token como nome inteiro (hifen conta como parte do nome). */
function contarOcorrencias(corpo, token) {
  const re = new RegExp('(?<![\\w-])' + escaparRegex(token) + '(?![\\w-])', 'g');
  const achados = corpo.match(re);
  return achados ? achados.length : 0;
}

function naAllowlist(nome) {
  return ALLOWLIST_PREFIXOS.some((p) => nome === p || nome.startsWith(p));
}

// ── Leitura do CSS ──────────────────────────────────────────────────────────────

function extrairBlocos(css) {
  const blocos = [];
  const pilha = [];
  let buffer = '';
  let inicioBuffer = 0;

  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (ch === '{') {
      const prelude = buffer.trim();
      const dentroDeKeyframes = pilha.some((p) => /^@(?:-[\w]+-)?keyframes/i.test(p));
      blocos.push({ prelude, indice: inicioBuffer, dentroDeKeyframes });
      pilha.push(prelude);
      buffer = '';
      inicioBuffer = i + 1;
    } else if (ch === '}') {
      pilha.pop();
      buffer = '';
      inicioBuffer = i + 1;
    } else {
      if (buffer.trim() === '' && !/\s/.test(ch)) inicioBuffer = i;
      buffer += ch;
    }
  }
  return blocos;
}

function analisarCss(cssBruto) {
  const css = removerComentarios(cssBruto);
  const paraLinha = construirMapaDeLinhas(css);
  const blocos = extrairBlocos(css);

  const classes = new Map();
  const ids = new Map();
  const keyframesDefinidos = new Map();
  const variaveisDefinidas = new Map();
  let totalRegras = 0;

  const reClasse = /\.(-?[_a-zA-Z][\w-]*)/g;
  const reId = /#(-?[_a-zA-Z][\w-]*)/g;

  for (const bloco of blocos) {
    const { prelude, indice, dentroDeKeyframes } = bloco;
    if (!prelude) continue;

    if (prelude.startsWith('@')) {
      const m = prelude.match(/^@(?:-[\w]+-)?keyframes\s+([\w-]+)/i);
      if (m) keyframesDefinidos.set(m[1], paraLinha(indice));
      continue;
    }
    if (dentroDeKeyframes) continue;

    totalRegras++;
    const linha = paraLinha(indice);
    const resumoSeletor = prelude.replace(/\s+/g, ' ').slice(0, 110);

    let m;
    reClasse.lastIndex = 0;
    while ((m = reClasse.exec(prelude)) !== null) {
      const nome = m[1];
      if (!classes.has(nome)) classes.set(nome, { linhas: new Set(), seletores: new Set() });
      classes.get(nome).linhas.add(linha);
      classes.get(nome).seletores.add(resumoSeletor);
    }
    reId.lastIndex = 0;
    while ((m = reId.exec(prelude)) !== null) {
      const nome = m[1];
      if (!ids.has(nome)) ids.set(nome, { linhas: new Set(), seletores: new Set() });
      ids.get(nome).linhas.add(linha);
      ids.get(nome).seletores.add(resumoSeletor);
    }
  }

  const reVarDef = /(--[\w-]+)\s*:/g;
  let mv;
  while ((mv = reVarDef.exec(css)) !== null) {
    if (!variaveisDefinidas.has(mv[1])) variaveisDefinidas.set(mv[1], paraLinha(mv.index));
  }

  return { css, classes, ids, keyframesDefinidos, variaveisDefinidas, totalRegras };
}

/** Tamanho por secao, usando os marcadores [TAG-...] como fronteira. */
function medirSecoes(cssBruto) {
  const linhas = cssBruto.split('\n');
  const marcadores = [];
  linhas.forEach((linha, i) => {
    const m = linha.match(/\[(TAG-[A-Z0-9-]+)\]/);
    if (m) marcadores.push({ tag: m[1], linha: i + 1 });
  });

  const secoes = [];
  if (marcadores.length && marcadores[0].linha > 1) {
    secoes.push({ tag: '(topo do arquivo, sem marcador)', inicio: 1, fim: marcadores[0].linha - 1 });
  }
  marcadores.forEach((marcador, i) => {
    const fim = i + 1 < marcadores.length ? marcadores[i + 1].linha - 1 : linhas.length;
    secoes.push({ tag: marcador.tag, inicio: marcador.linha, fim });
  });

  return secoes
    .map((s) => Object.assign({}, s, { linhas: s.fim - s.inicio + 1 }))
    .sort((a, b) => b.linhas - a.linhas);
}

// ── Corpus ──────────────────────────────────────────────────────────────────────

function coletarArquivos(dir, acumulado, relativoBase) {
  let entradas;
  try {
    entradas = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return acumulado;
  }
  for (const entrada of entradas) {
    const completo = path.join(dir, entrada.name);
    const relativo = path.relative(relativoBase, completo);
    const primeiroNivel = relativo.split(path.sep)[0];

    if (entrada.isDirectory()) {
      if (PASTAS_IGNORADAS.has(entrada.name)) continue;
      if (PASTAS_FORA_DO_CORPUS.has(primeiroNivel)) continue;
      coletarArquivos(completo, acumulado, relativoBase);
    } else if (EXTENSOES_CONSUMIDORAS.has(path.extname(entrada.name))) {
      if (PASTAS_FORA_DO_CORPUS.has(primeiroNivel)) continue;
      acumulado.push({ caminho: relativo, conteudo: fs.readFileSync(completo, 'utf8') });
    }
  }
  return acumulado;
}

// ── Construcao dinamica de classe ───────────────────────────────────────────────

function detectarConstrucaoDinamica(arquivos) {
  const padroes = [
    { rotulo: 'classList com expressao', re: /classList\.(?:add|remove|toggle)\(\s*[^'"`)]/ },
    { rotulo: 'className por concatenacao', re: /className\s*=\s*[^;\n]*[`+]/ },
    { rotulo: 'class="" com interpolacao', re: /class\s*=\s*["'`][^"'`]*\$\{/ },
    { rotulo: 'setAttribute class dinamico', re: /setAttribute\(\s*['"`]class['"`]\s*,\s*[^'"`)]/ }
  ];
  const achados = [];
  for (const arquivo of arquivos) {
    arquivo.conteudo.split('\n').forEach((linha, i) => {
      for (const padrao of padroes) {
        if (padrao.re.test(linha)) {
          achados.push({
            arquivo: arquivo.caminho, linha: i + 1, rotulo: padrao.rotulo,
            trecho: linha.trim().slice(0, 130)
          });
          break;
        }
      }
    });
  }
  return achados;
}

/**
 * Pista de construcao dinamica.
 *
 * So conta se o pedaco aparecer numa FRONTEIRA de concatenacao:
 *   `objetivo-${tipo}`  /  'objetivo-' + tipo   → prefixo seguido de ${ ou aspas
 *   `${tipo}-borda`                             → sufixo precedido de } ou aspas
 *
 * Sem essa exigencia qualquer classe hifenizada acha "pista" (basta existir
 * "agenda-" em algum lugar) e a triagem perde utilidade.
 */
function temPistaDeConstrucao(nome, corpoUnico) {
  const partes = nome.split('-').filter(Boolean);
  if (partes.length < 2) return null;

  for (let i = partes.length - 1; i >= 1; i--) {
    const prefixo = partes.slice(0, i).join('-') + '-';
    if (new RegExp(escaparRegex(prefixo) + '(?:["\'`]|\\$\\{)').test(corpoUnico)) {
      return 'prefixo `' + prefixo + '` usado em concatenacao';
    }
  }
  for (let i = 1; i < partes.length; i++) {
    const sufixo = '-' + partes.slice(i).join('-');
    if (new RegExp('(?:\\}|["\'`])' + escaparRegex(sufixo)).test(corpoUnico)) {
      return 'sufixo `' + sufixo + '` usado em concatenacao';
    }
  }
  return null;
}

// ── Execucao ────────────────────────────────────────────────────────────────────

function main() {
  const opcoes = lerArgs(process.argv);
  const caminhoCss = path.resolve(RAIZ, opcoes.css);

  if (!fs.existsSync(caminhoCss)) {
    console.error('CSS nao encontrado: ' + opcoes.css);
    process.exit(1);
  }

  const cssBruto = fs.readFileSync(caminhoCss, 'utf8');
  const analise = analisarCss(cssBruto);
  const secoes = medirSecoes(cssBruto);

  const arquivos = coletarArquivos(RAIZ, [], RAIZ)
    .filter((a) => path.resolve(RAIZ, a.caminho) !== caminhoCss);
  const corpoUnico = arquivos.map((a) => a.conteudo).join('\n');

  const classificar = (mapa, tipo) => {
    const usados = [], suspeitos = [], naoEncontrados = [];
    for (const [nome, info] of mapa) {
      if (tipo === 'classe' && naAllowlist(nome)) continue;

      let total = 0;
      const onde = [];
      for (const arquivo of arquivos) {
        const n = contarOcorrencias(arquivo.conteudo, nome);
        if (n > 0) { total += n; onde.push(arquivo.caminho + ' (' + n + ')'); }
      }
      const registro = {
        nome,
        linhas: Array.from(info.linhas).sort((a, b) => a - b),
        seletores: Array.from(info.seletores),
        ocorrencias: total,
        consumidores: onde
      };
      if (total > 0) usados.push(registro);
      else {
        const pista = temPistaDeConstrucao(nome, corpoUnico);
        if (pista) suspeitos.push(Object.assign({}, registro, { pista }));
        else naoEncontrados.push(registro);
      }
    }
    const porLinha = (a, b) => a.linhas[0] - b.linhas[0];
    return {
      usados: usados.sort(porLinha),
      suspeitos: suspeitos.sort(porLinha),
      naoEncontrados: naoEncontrados.sort(porLinha)
    };
  };

  const resultadoClasses = classificar(analise.classes, 'classe');
  const resultadoIds = classificar(analise.ids, 'id');

  const corpoTotal = analise.css + '\n' + corpoUnico;

  const keyframesOrfaos = [];
  for (const [nome, linha] of analise.keyframesDefinidos) {
    if (contarOcorrencias(corpoTotal, nome) <= 1) keyframesOrfaos.push({ nome, linha });
  }

  const variaveisOrfas = [];
  for (const [nome, linha] of analise.variaveisDefinidas) {
    const usosVar = (corpoTotal.match(new RegExp('var\\(\\s*' + escaparRegex(nome), 'g')) || []).length;
    const usosJs = (corpoUnico.match(new RegExp(escaparRegex(nome), 'g')) || []).length;
    if (usosVar === 0 && usosJs === 0) variaveisOrfas.push({ nome, linha });
  }

  const dinamicos = detectarConstrucaoDinamica(arquivos);

  // Linhas de CSS cobertas apenas por classes sem consumidor (estimativa de ganho).
  const linhasCandidatas = new Set();
  resultadoClasses.naoEncontrados.forEach((c) => c.linhas.forEach((l) => linhasCandidatas.add(l)));
  resultadoIds.naoEncontrados.forEach((c) => c.linhas.forEach((l) => linhasCandidatas.add(l)));

  const resumo = {
    css: opcoes.css,
    linhasCss: cssBruto.split('\n').length,
    bytesCss: Buffer.byteLength(cssBruto, 'utf8'),
    totalRegras: analise.totalRegras,
    arquivosNoCorpus: arquivos.length,
    classesDistintas: analise.classes.size,
    classesUsadas: resultadoClasses.usados.length,
    classesSuspeitas: resultadoClasses.suspeitos.length,
    classesNaoEncontradas: resultadoClasses.naoEncontrados.length,
    idsDistintos: analise.ids.size,
    idsNaoEncontrados: resultadoIds.naoEncontrados.length,
    keyframesDefinidos: analise.keyframesDefinidos.size,
    keyframesOrfaos: keyframesOrfaos.length,
    variaveisDefinidas: analise.variaveisDefinidas.size,
    variaveisOrfas: variaveisOrfas.length,
    pontosDinamicos: dinamicos.length,
    regrasCandidatas: linhasCandidatas.size
  };

  if (opcoes.json) {
    console.log(JSON.stringify({
      resumo, secoes, classes: resultadoClasses, ids: resultadoIds,
      keyframesOrfaos, variaveisOrfas, dinamicos
    }, null, 2));
    return;
  }

  const L = [];
  L.push('# Auditoria de CSS morto — ' + new Date().toISOString().slice(0, 10));
  L.push('');
  L.push('> Arquivo **gerado** por `scripts/auditar-css-morto.js`. Nao editar a mao.');
  L.push('> Lista de **candidatos**, nao ordem de remocao. Ver limitacoes no fim.');
  L.push('');
  L.push('## Resumo');
  L.push('');
  L.push('| Metrica | Valor |');
  L.push('| --- | --- |');
  L.push('| CSS auditado | `' + resumo.css + '` |');
  L.push('| Linhas / bytes | ' + resumo.linhasCss + ' / ' + resumo.bytesCss + ' |');
  L.push('| Regras (blocos de seletor) | ' + resumo.totalRegras + ' |');
  L.push('| Arquivos no corpus (.html/.js) | ' + resumo.arquivosNoCorpus + ' |');
  L.push('| Classes distintas | ' + resumo.classesDistintas + ' |');
  L.push('| — com uso literal | ' + resumo.classesUsadas + ' |');
  L.push('| — suspeitas de construcao dinamica | ' + resumo.classesSuspeitas + ' |');
  L.push('| — **sem nenhum consumidor** | **' + resumo.classesNaoEncontradas + '** |');
  L.push('| IDs distintos / sem consumidor | ' + resumo.idsDistintos + ' / **' + resumo.idsNaoEncontrados + '** |');
  L.push('| @keyframes definidos / orfaos | ' + resumo.keyframesDefinidos + ' / **' + resumo.keyframesOrfaos + '** |');
  L.push('| Variaveis CSS definidas / orfas | ' + resumo.variaveisDefinidas + ' / **' + resumo.variaveisOrfas + '** |');
  L.push('| Regras tocadas por candidatos | ' + resumo.regrasCandidatas + ' |');
  L.push('| Pontos de classe dinamica no JS | ' + resumo.pontosDinamicos + ' |');
  L.push('');

  L.push('## Tamanho por secao (marcadores `[TAG-...]`)');
  L.push('');
  L.push('| Secao | Linhas | Faixa |');
  L.push('| --- | --- | --- |');
  secoes.slice(0, 30).forEach((s) => {
    L.push('| `' + s.tag + '` | ' + s.linhas + ' | ' + s.inicio + '-' + s.fim + ' |');
  });
  L.push('');

  L.push('## 1. Classes sem nenhum consumidor — candidatas diretas');
  L.push('');
  if (!resultadoClasses.naoEncontrados.length) L.push('_Nenhuma._');
  else {
    L.push('| Classe | Linha(s) no CSS | Seletor de exemplo |');
    L.push('| --- | --- | --- |');
    resultadoClasses.naoEncontrados.forEach((c) => {
      L.push('| `.' + c.nome + '` | ' + c.linhas.join(', ') + ' | `' + c.seletores[0] + '` |');
    });
  }
  L.push('');

  L.push('## 2. Classes suspeitas de construcao dinamica — conferir a mao');
  L.push('');
  L.push('Nao aparecem literalmente, mas o nome tem pista de ser montado em runtime.');
  L.push('**Nao remover sem inspecionar os pontos da secao 6.**');
  L.push('');
  if (!resultadoClasses.suspeitos.length) L.push('_Nenhuma._');
  else {
    L.push('| Classe | Linha(s) | Pista |');
    L.push('| --- | --- | --- |');
    resultadoClasses.suspeitos.forEach((c) => {
      L.push('| `.' + c.nome + '` | ' + c.linhas.join(', ') + ' | ' + c.pista + ' |');
    });
  }
  L.push('');

  L.push('## 3. IDs sem consumidor');
  L.push('');
  if (!resultadoIds.naoEncontrados.length) L.push('_Nenhum._');
  else {
    L.push('| ID | Linha(s) | Seletor de exemplo |');
    L.push('| --- | --- | --- |');
    resultadoIds.naoEncontrados.forEach((c) => {
      L.push('| `#' + c.nome + '` | ' + c.linhas.join(', ') + ' | `' + c.seletores[0] + '` |');
    });
  }
  L.push('');

  L.push('## 4. @keyframes orfaos');
  L.push('');
  if (!keyframesOrfaos.length) L.push('_Nenhum._');
  else keyframesOrfaos.forEach((k) => L.push('- `' + k.nome + '` (linha ' + k.linha + ')'));
  L.push('');

  L.push('## 5. Variaveis CSS orfas');
  L.push('');
  if (!variaveisOrfas.length) L.push('_Nenhuma._');
  else variaveisOrfas.forEach((v) => L.push('- `' + v.nome + '` (linha ' + v.linha + ')'));
  L.push('');

  L.push('## 6. Pontos de construcao dinamica de classe no JS');
  L.push('');
  L.push('Cada linha aqui e um lugar onde a busca literal **nao** prova ausencia de uso.');
  L.push('');
  if (!dinamicos.length) L.push('_Nenhum._');
  else {
    L.push('| Arquivo | Linha | Padrao | Trecho |');
    L.push('| --- | --- | --- | --- |');
    dinamicos.forEach((d) => {
      L.push('| `' + d.arquivo + '` | ' + d.linha + ' | ' + d.rotulo + ' | `' + d.trecho.replace(/\|/g, '\\|') + '` |');
    });
  }
  L.push('');

  L.push('## Limitacoes');
  L.push('');
  L.push('- Busca **textual**. Classe montada em runtime pode aparecer como nao usada —');
  L.push('  por isso as secoes 2 e 6 existem.');
  L.push('- `docs/`, `.github/`, `.agents/`, `backend/`, `test/` e `scripts/` ficam fora do');
  L.push('  corpus: citam nomes em prosa ou nao renderizam UI, e mascarariam codigo morto.');
  L.push('- `assets/vendor/` (FontAwesome) ignorado; classes `fa-*` em allowlist.');
  L.push('- Seletor dentro de string com `{` ou `}` pode confundir o parser (caso raro).');
  L.push('- Regra de tela removida aparece como morta — confirme que a tela nao vai voltar.');
  L.push('- **Nada e removido automaticamente.**');
  L.push('');

  fs.writeFileSync(path.resolve(RAIZ, opcoes.saida), L.join('\n'), 'utf8');

  console.log('');
  console.log('=== Auditoria de CSS morto ===');
  console.log('CSS: ' + resumo.css + '  (' + resumo.linhasCss + ' linhas, ' + resumo.totalRegras + ' regras)');
  console.log('Corpus: ' + resumo.arquivosNoCorpus + ' arquivos .html/.js');
  console.log('');
  console.log('Classes: ' + resumo.classesDistintas + ' distintas | usadas: ' + resumo.classesUsadas
    + ' | suspeitas: ' + resumo.classesSuspeitas + ' | SEM CONSUMIDOR: ' + resumo.classesNaoEncontradas);
  console.log('IDs sem consumidor: ' + resumo.idsNaoEncontrados + '/' + resumo.idsDistintos);
  console.log('@keyframes orfaos: ' + resumo.keyframesOrfaos + '/' + resumo.keyframesDefinidos);
  console.log('Variaveis CSS orfas: ' + resumo.variaveisOrfas + '/' + resumo.variaveisDefinidas);
  console.log('Regras tocadas por candidatos: ' + resumo.regrasCandidatas);
  console.log('Pontos de classe dinamica no JS: ' + resumo.pontosDinamicos);
  console.log('');
  console.log('Relatorio: ' + opcoes.saida);
  console.log('');
}

main();
