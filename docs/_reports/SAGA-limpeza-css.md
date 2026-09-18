# Saga — Limpeza de CSS morto

> Consolida 2 rodadas: `2026-08-26-chore-limpeza-css-orfao`,
> `2026-08-28-chore-limpeza-css-morto`.
> Os relatórios originais foram removidos na poda de 2026-09-03.

## Causa-raiz

Telas e features removidas ao longo do desenvolvimento — calendário mensal, overlay de
sincronização, indicador de "agora", skeleton de loading — deixaram os seletores para trás. Sem
processo de limpeza, o CSS morto acumula e induz a erro em varredura de código.

## Linha do tempo

**Rodada 1 — CSS órfão da visão mensal.** 12 seletores removidos: `.calendario-mensal`,
`.calendario-grid` e derivados, `.dia-stats-badges`, `.badge-stat-mensal`, `.kpi-dashboard`,
`.kpi-card-label`, `.kpi-card-value`. 152 linhas. Balanceamento de chaves conferido antes e
depois.

**Rodada 2 — seis tranches.** Limpeza incremental, com auditoria rodada entre cada tranche,
para permitir validação visual e retrocesso rápido:

| Tranche | Removido |
|---|---|
| T1 — tela Calendário | `.calendario-header-*`, `.calendario-filtro-container`, `.calendario-nav-arrows`, `.calendario-tabs-sticky`, `.agenda-sticky-container`, `.filtro-aluno-container`, `.filtro-aluno-select`, `#tela-calendario`, `#containerCalendarioDia`, variáveis `--z-cal-*` |
| T2 — cabeçalho antigo do Dia | `.agenda-header-wrapper`, `.agenda-header-info`, `.agenda-header-navegacao`, `.agenda-data-principal`, `.agenda-dia-semana-mobile` |
| T3 — skeleton | `.home-loading-block`, `.home-loading-line`, `.home-loading-pill`, `@keyframes loading-pulse`, `@keyframes homeShimmer` |
| T4 — overlay de sync | `.overlay-sinc-actions`, `.overlay-sinc-retry`, `.overlay-sinc-later`, `.ultima-sincronizacao-label`, `.sync-auto-pill`, `#btnSyncGoogleCalendar` |
| T5 — indicador de hora | `.linha-hora-atual`, `.agenda-dia-horario`, `.pulse-indicador-agora`, `@keyframes pulseAgora` |
| T6 — avulsos | `.text-bounce`, `.btn-success`, `.badge-bloqueio`, `.status-toggle--compact`, `.home-weekly-filter`, `.modal-horarios-duplos`, `.modal .form-group` |

Resultado: de 468 para 399 regras. Auditoria final com zero órfãos em todas as categorias.
`index.html`, `assets/js/**`, `backend/**` e o próprio script de auditoria ficaram intocados.

## Não remova estas — são dinâmicas

O `scripts/auditar-css-morto.js` as marca como suspeitas, e elas foram **preservadas por
decisão explícita**:

- `.objetivo-Hipertrofia`, `.objetivo-Emagrecimento`, `.objetivo-Condicionamento`,
  `.objetivo-Funcional`, `.objetivo-PersonalTrainer`, `.objetivo-ConsultoriaOnline`,
  `.objetivo-Outro` — montadas por concatenação, com consumo confirmado em
  `agenda-card-template.js` e `view-alunos.js`.
- `.agenda-card-density-compact`, `.agenda-card-density-tight`.

## Limites da ferramenta de auditoria

`scripts/auditar-css-morto.js` procura ocorrência do seletor em `index.html` e em
`assets/js/**`, e reconhece construção dinâmica por template literal simples. Ele **não**
detecta:

- classe montada em várias etapas ou computada antes de ir para `classList.add`;
- seletor citado em pasta fora do escopo de busca;
- relação de ancestralidade em seletor composto — ele extrai as classes separadamente e não
  sabe que a combinação importa;
- CSS comentado.

Consequência prática: **zero órfãos na auditoria não é prova de que nada quebrou.** A validação
visual continua sendo manual, feita pelo dono entre as tranches.

## Limites herdados

- **Marcadores `[TAG-...]` desalinhados.** As fronteiras mudaram depois de seis tranches.
  `TAG-STYLE-HEADER-NAV` é a maior seção e já não reflete o conteúdo;
  `TAG-STYLE-FILTRO-ALUNO-CALENDARIO` guardava bloco de tela removida. Realinhar é refactoring,
  ficou para rodada dedicada.
- **Responsividade não foi validada em todos os breakpoints.** Vários seletores removidos
  estavam dentro de `@media`.
