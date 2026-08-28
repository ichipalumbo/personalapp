# Auditoria de CSS morto — 2026-08-28

> Arquivo **gerado** por `scripts/auditar-css-morto.js`. Nao editar a mao.
> Lista de **candidatos**, nao ordem de remocao. Ver limitacoes no fim.

## Resumo

| Metrica | Valor |
| --- | --- |
| CSS auditado | `assets\css\style.css` |
| Linhas / bytes | 2991 / 64366 |
| Regras (blocos de seletor) | 429 |
| Arquivos no corpus (.html/.js) | 35 |
| Classes distintas | 231 |
| — com uso literal | 203 |
| — suspeitas de construcao dinamica | 9 |
| — **sem nenhum consumidor** | **18** |
| IDs distintos / sem consumidor | 11 / **1** |
| @keyframes definidos / orfaos | 8 / **0** |
| Variaveis CSS definidas / orfas | 19 / **0** |
| Regras tocadas por candidatos | 31 |
| Pontos de classe dinamica no JS | 14 |

## Tamanho por secao (marcadores `[TAG-...]`)

| Secao | Linhas | Faixa |
| --- | --- | --- |
| `TAG-STYLE-HEADER-NAV` | 1042 | 100-1141 |
| `TAG-STYLE-AGENDA-DIARIA` | 629 | 1142-1770 |
| `TAG-STYLE-BLOQUEIO-EXTERNO` | 425 | 1771-2195 |
| `TAG-STYLE-FILTRO-ALUNO-CALENDARIO` | 389 | 2561-2949 |
| `TAG-STYLE-CALENDARIO-TABS-STICKY` | 169 | 2196-2364 |
| `TAG-STYLE-OVERLAY-SINC` | 96 | 2431-2526 |
| `TAG-STYLE-MODAL-TOAST` | 66 | 2365-2430 |
| `TAG-STYLE-OBJETIVOS` | 60 | 1-60 |
| `TAG-STYLE-RESPONSIVO-DESKTOP` | 42 | 2950-2991 |
| `TAG-STYLE-BASE` | 39 | 61-99 |
| `TAG-CSS-INDICADOR-SYNC-BG` | 34 | 2527-2560 |

## 1. Classes sem nenhum consumidor — candidatas diretas

| Classe | Linha(s) no CSS | Seletor de exemplo |
| --- | --- | --- |
| `.text-bounce` | 175 | `.text-bounce` |
| `.sync-auto-pill` | 579 | `.sync-auto-pill` |
| `.btn-success` | 705 | `.btn-success` |
| `.status-toggle--compact` | 1091, 1094, 1098, 1104, 1110 | `.status-toggle.status-toggle--compact` |
| `.home-weekly-filter` | 1180 | `.home-weekly-filter` |
| `.ultima-sincronizacao-label` | 1226, 2914 | `.ultima-sincronizacao-label` |
| `.home-loading-block` | 2132, 2794 | `.home-loading-block` |
| `.linha-hora-atual` | 2155, 2164 | `.linha-hora-atual` |
| `.agenda-dia-horario` | 2164 | `.linha-hora-atual .agenda-dia-horario` |
| `.pulse-indicador-agora` | 2170 | `.pulse-indicador-agora` |
| `.badge-bloqueio` | 2207 | `.badge-bloqueio` |
| `.form-group` | 2379, 2382, 2388 | `.modal .form-group` |
| `.modal-horarios-duplos` | 2398 | `.modal-horarios-duplos` |
| `.overlay-sinc-actions` | 2480 | `.overlay-sinc-actions` |
| `.overlay-sinc-retry` | 2486, 2499, 2503 | `.overlay-sinc-retry` |
| `.overlay-sinc-later` | 2506, 2519, 2523 | `.overlay-sinc-later` |
| `.home-loading-line` | 2785 | `.home-loading-line` |
| `.home-loading-pill` | 2789 | `.home-loading-pill` |

## 2. Classes suspeitas de construcao dinamica — conferir a mao

Nao aparecem literalmente, mas o nome tem pista de ser montado em runtime.
**Nao remover sem inspecionar os pontos da secao 6.**

| Classe | Linha(s) | Pista |
| --- | --- | --- |
| `.objetivo-Hipertrofia` | 24 | prefixo `objetivo-` usado em concatenacao |
| `.objetivo-Emagrecimento` | 28 | prefixo `objetivo-` usado em concatenacao |
| `.objetivo-Condicionamento` | 32 | prefixo `objetivo-` usado em concatenacao |
| `.objetivo-Funcional` | 36 | prefixo `objetivo-` usado em concatenacao |
| `.objetivo-PersonalTrainer` | 40 | prefixo `objetivo-` usado em concatenacao |
| `.objetivo-ConsultoriaOnline` | 45, 51 | prefixo `objetivo-` usado em concatenacao |
| `.objetivo-Outro` | 56 | prefixo `objetivo-` usado em concatenacao |
| `.agenda-card-density-compact` | 1872, 1877, 1881, 1888 | prefixo `agenda-card-density-` usado em concatenacao |
| `.agenda-card-density-tight` | 1895, 1900, 1904, 1911, 1919, 1924, 1932, 1939, 1947, 1953, 1959, 1965, 1972, 1979, 1987, 1994, 2000, 2004, 2011, 2018, 2025 | prefixo `agenda-card-density-` usado em concatenacao |

## 3. IDs sem consumidor

| ID | Linha(s) | Seletor de exemplo |
| --- | --- | --- |
| `#btnSyncGoogleCalendar` | 2909 | `.home-weekly-nav-row .sync-actions-row #btnSyncBanco, .home-weekly-nav-row .sync-actions-row #btnSyncGoogleCal` |

## 4. @keyframes orfaos

_Nenhum._

## 5. Variaveis CSS orfas

_Nenhuma._

## 6. Pontos de construcao dinamica de classe no JS

Cada linha aqui e um lugar onde a busca literal **nao** prova ausencia de uso.

| Arquivo | Linha | Padrao | Trecho |
| --- | --- | --- | --- |
| `assets\js\agenda-card-template.js` | 222 | class="" com interpolacao | `<div class="${classes.join(' ')}"${montarAtributo('style', styleCardAula)}${montarAtributo('onclick', opcoes.onclick)}>` |
| `assets\js\agenda-card-template.js` | 229 | class="" com interpolacao | `<span class="agenda-semana-card-time agenda-card-optional${classeTempoConcluido}"><i class="${iconePeriodo}"></i> ${periodoSeguro}` |
| `assets\js\agenda-card-template.js` | 252 | class="" com interpolacao | `<div class="${classes.join(' ')}"${montarAtributo('style', opcoes.style)}${montarAtributo('onclick', opcoes.onclick)}>` |
| `assets\js\agenda-card-template.js` | 259 | class="" com interpolacao | `<span class="agenda-semana-card-time agenda-card-optional${classeTempoConcluido}"><i class="${iconePeriodo}"></i> ${periodoSeguro}` |
| `assets\js\agenda-card-template.js` | 285 | class="" com interpolacao | `<div class="${classes.join(' ')}"${montarAtributo('style', opcoes.style)} title="${tituloExterno}">` |
| `assets\js\agenda-card-template.js` | 292 | class="" com interpolacao | `<span class="agenda-semana-card-time agenda-card-optional${classeTempoConcluido}"><i class="${iconePeriodo}"></i> ${periodoSeguro}` |
| `assets\js\agenda-card-template.js` | 313 | class="" com interpolacao | `<div class="${classes.join(' ')}"${montarAtributo('style', opcoes.style)}${montarAtributo('onclick', opcoes.onclick)}>` |
| `assets\js\agenda-card-template.js` | 320 | class="" com interpolacao | `<span class="agenda-semana-card-time agenda-card-optional${classeTempoConcluido}"><i class="${iconePeriodo}"></i> ${periodoSeguro}` |
| `assets\js\modal-agendamento.js` | 148 | class="" com interpolacao | `titulo.innerHTML = `<i class="fa-solid ${meta.icone}" style="color: #ffd700; margin-right: 8px"></i>${meta.titulo}`;` |
| `assets\js\view-alunos.js` | 440 | class="" com interpolacao | `<span class="objetivo-${objetivoClass}" style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.` |
| `assets\js\view-calendario.js` | 184 | class="" com interpolacao | `<section class="semana-dia-box ${ehHoje ? 'is-today' : ''}" id="${ehHoje ? 'semana-dia-hoje-elemento' : ''}">` |
| `assets\js\view-financas.js` | 159 | class="" com interpolacao | `return `<button type="button" class="tab-btn ${ativo}" data-financas-filtro="${status}">${labels[status]}</button>`;` |
| `assets\js\widget-swipe-periodo.js` | 92 | classList com expressao | `elemento.classList.add(classe);` |
| `assets\js\widget-swipe-periodo.js` | 94 | classList com expressao | `elemento.classList.remove(classe);` |

## Limitacoes

- Busca **textual**. Classe montada em runtime pode aparecer como nao usada —
  por isso as secoes 2 e 6 existem.
- `docs/`, `.github/`, `.agents/`, `backend/`, `test/` e `scripts/` ficam fora do
  corpus: citam nomes em prosa ou nao renderizam UI, e mascarariam codigo morto.
- `assets/vendor/` (FontAwesome) ignorado; classes `fa-*` em allowlist.
- Seletor dentro de string com `{` ou `}` pode confundir o parser (caso raro).
- Regra de tela removida aparece como morta — confirme que a tela nao vai voltar.
- **Nada e removido automaticamente.**
