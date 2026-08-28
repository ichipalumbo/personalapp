# Auditoria de CSS morto — 2026-08-28

> Arquivo **gerado** por `scripts/auditar-css-morto.js`. Nao editar a mao.
> Lista de **candidatos**, nao ordem de remocao. Ver limitacoes no fim.

## Resumo

| Metrica | Valor |
| --- | --- |
| CSS auditado | `assets\css\style.css` |
| Linhas / bytes | 2761 / 59552 |
| Regras (blocos de seletor) | 399 |
| Arquivos no corpus (.html/.js) | 35 |
| Classes distintas | 213 |
| — com uso literal | 203 |
| — suspeitas de construcao dinamica | 9 |
| — **sem nenhum consumidor** | **0** |
| IDs distintos / sem consumidor | 10 / **0** |
| @keyframes definidos / orfaos | 4 / **0** |
| Variaveis CSS definidas / orfas | 19 / **0** |
| Regras tocadas por candidatos | 0 |
| Pontos de classe dinamica no JS | 14 |

## Tamanho por secao (marcadores `[TAG-...]`)

| Secao | Linhas | Faixa |
| --- | --- | --- |
| `TAG-STYLE-HEADER-NAV` | 987 | 100-1086 |
| `TAG-STYLE-AGENDA-DIARIA` | 618 | 1087-1704 |
| `TAG-STYLE-BLOQUEIO-EXTERNO` | 368 | 1705-2072 |
| `TAG-STYLE-FILTRO-ALUNO-CALENDARIO` | 359 | 2361-2719 |
| `TAG-STYLE-CALENDARIO-TABS-STICKY` | 164 | 2073-2236 |
| `TAG-STYLE-OBJETIVOS` | 60 | 1-60 |
| `TAG-STYLE-OVERLAY-SINC` | 49 | 2278-2326 |
| `TAG-STYLE-RESPONSIVO-DESKTOP` | 42 | 2720-2761 |
| `TAG-STYLE-MODAL-TOAST` | 41 | 2237-2277 |
| `TAG-STYLE-BASE` | 39 | 61-99 |
| `TAG-CSS-INDICADOR-SYNC-BG` | 34 | 2327-2360 |

## 1. Classes sem nenhum consumidor — candidatas diretas

_Nenhuma._

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
| `.agenda-card-density-compact` | 1806, 1811, 1815, 1822 | prefixo `agenda-card-density-` usado em concatenacao |
| `.agenda-card-density-tight` | 1829, 1834, 1838, 1845, 1853, 1858, 1866, 1873, 1881, 1887, 1893, 1899, 1906, 1913, 1921, 1928, 1934, 1938, 1945, 1952, 1959 | prefixo `agenda-card-density-` usado em concatenacao |

## 3. IDs sem consumidor

_Nenhum._

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
