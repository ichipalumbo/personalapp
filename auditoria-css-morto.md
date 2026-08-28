# Auditoria de CSS morto — 2026-08-28

> Arquivo **gerado** por `scripts/auditar-css-morto.js`. Nao editar a mao.
> Lista de **candidatos**, nao ordem de remocao. Ver limitacoes no fim.

## Resumo

| Metrica | Valor |
| --- | --- |
| CSS auditado | `assets\css\style.css` |
| Linhas / bytes | 3118 / 66976 |
| Regras (blocos de seletor) | 446 |
| Arquivos no corpus (.html/.js) | 35 |
| Classes distintas | 237 |
| — com uso literal | 204 |
| — suspeitas de construcao dinamica | 9 |
| — **sem nenhum consumidor** | **23** |
| IDs distintos / sem consumidor | 11 / **1** |
| @keyframes definidos / orfaos | 8 / **0** |
| Variaveis CSS definidas / orfas | 19 / **0** |
| Regras tocadas por candidatos | 47 |
| Pontos de classe dinamica no JS | 14 |

## Tamanho por secao (marcadores `[TAG-...]`)

| Secao | Linhas | Faixa |
| --- | --- | --- |
| `TAG-STYLE-HEADER-NAV` | 1042 | 100-1141 |
| `TAG-STYLE-AGENDA-DIARIA` | 752 | 1142-1893 |
| `TAG-STYLE-BLOQUEIO-EXTERNO` | 425 | 1894-2318 |
| `TAG-STYLE-FILTRO-ALUNO-CALENDARIO` | 393 | 2684-3076 |
| `TAG-STYLE-CALENDARIO-TABS-STICKY` | 169 | 2319-2487 |
| `TAG-STYLE-OVERLAY-SINC` | 96 | 2554-2649 |
| `TAG-STYLE-MODAL-TOAST` | 66 | 2488-2553 |
| `TAG-STYLE-OBJETIVOS` | 60 | 1-60 |
| `TAG-STYLE-RESPONSIVO-DESKTOP` | 42 | 3077-3118 |
| `TAG-STYLE-BASE` | 39 | 61-99 |
| `TAG-CSS-INDICADOR-SYNC-BG` | 34 | 2650-2683 |

## 1. Classes sem nenhum consumidor — candidatas diretas

| Classe | Linha(s) no CSS | Seletor de exemplo |
| --- | --- | --- |
| `.text-bounce` | 175 | `.text-bounce` |
| `.sync-auto-pill` | 579 | `.sync-auto-pill` |
| `.btn-success` | 705 | `.btn-success` |
| `.status-toggle--compact` | 1091, 1094, 1098, 1104, 1110 | `.status-toggle.status-toggle--compact` |
| `.home-weekly-filter` | 1180 | `.home-weekly-filter` |
| `.ultima-sincronizacao-label` | 1226, 3041 | `.ultima-sincronizacao-label` |
| `.agenda-header-wrapper` | 1265 | `.agenda-header-wrapper` |
| `.agenda-header-info` | 1273, 1281 | `.agenda-header-info h2` |
| `.agenda-header-navegacao` | 1471, 1479, 1485, 1543, 1549, 1556, 1560, 1566, 1570, 1578 | `.agenda-header-navegacao` |
| `.agenda-data-principal` | 1479, 1503, 1560, 2986 | `.agenda-header-navegacao .agenda-data-principal` |
| `.agenda-dia-semana-mobile` | 1538, 1578 | `.agenda-dia-semana-mobile` |
| `.home-loading-block` | 2255, 2917 | `.home-loading-block` |
| `.linha-hora-atual` | 2278, 2287 | `.linha-hora-atual` |
| `.agenda-dia-horario` | 2287 | `.linha-hora-atual .agenda-dia-horario` |
| `.pulse-indicador-agora` | 2293 | `.pulse-indicador-agora` |
| `.badge-bloqueio` | 2330 | `.badge-bloqueio` |
| `.form-group` | 2502, 2505, 2511 | `.modal .form-group` |
| `.modal-horarios-duplos` | 2521 | `.modal-horarios-duplos` |
| `.overlay-sinc-actions` | 2603 | `.overlay-sinc-actions` |
| `.overlay-sinc-retry` | 2609, 2622, 2626 | `.overlay-sinc-retry` |
| `.overlay-sinc-later` | 2629, 2642, 2646 | `.overlay-sinc-later` |
| `.home-loading-line` | 2908 | `.home-loading-line` |
| `.home-loading-pill` | 2912 | `.home-loading-pill` |

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
| `.agenda-card-density-compact` | 1995, 2000, 2004, 2011 | prefixo `agenda-card-density-` usado em concatenacao |
| `.agenda-card-density-tight` | 2018, 2023, 2027, 2034, 2042, 2047, 2055, 2062, 2070, 2076, 2082, 2088, 2095, 2102, 2110, 2117, 2123, 2127, 2134, 2141, 2148 | prefixo `agenda-card-density-` usado em concatenacao |

## 3. IDs sem consumidor

| ID | Linha(s) | Seletor de exemplo |
| --- | --- | --- |
| `#btnSyncGoogleCalendar` | 3036 | `.home-weekly-nav-row .sync-actions-row #btnSyncBanco, .home-weekly-nav-row .sync-actions-row #btnSyncGoogleCal` |

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
