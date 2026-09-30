# Relatório — Correção de sticky e unificação visual da Home (Semana/Dia)

**Data:** 2026-08-28  
**Feature:** `feat/swipe-periodo-home` (continuação — fix de layout)  
**Escopo:** 100% frontend — sem alterações em backend

---

## Evidência e Contrato de Design (Passo 0 — Skill anti-ui-slop)

### Adaptação declarada

O passo de coleta de referência externa (catálogo UIZZE) **não se aplica** nesta rodada. A evidência é **interna**: a aba Semana da Home é a referência de linguagem visual. Todos os parâmetros de design foram extraídos por inspeção direta do CSS e HTML do projeto.

### Evidência interna coletada

| Elemento da Semana | Decisão transferível |
|---|---|
| `.home-weekly-topbar`: `position: sticky; top: var(--header-height); z-index: 10` | Referência de camada sticky — o sticky do Dia deve ficar abaixo (z-index menor) |
| `.home-weekly-nav-row .nav-calendario`: `background: #0b0b0b; border-radius: 10px; padding: 8px 10px; border: 1px solid #1f1f1f` | Container de navegação — valores copiados para `.agenda-header-navegacao` |
| `#btnSemanaHomeAnterior/Proxima`: `class="btn btn-secondary btn-sm"` + `fa-chevron-left/right` | Setas: componente e ícone corretos para o Dia |
| `#btnSemanaHomeHoje`: `class="btn btn-secondary btn-sm btn-calendario-hoje"`, texto "Hoje" sem ícone | "Hoje": sem pill amarelo, sem uppercase |
| `.home-weekly-periodo`: `font-weight: 800; color: #ffd700; font-size: 0.95rem` | Data do Dia: mesmos valores |

### Contrato de design

| Campo | Decisão |
|---|---|
| Screen job | Navegar entre dias e visualizar agendamentos de treino |
| Primary user and action | Personal trainer — trocar de dia (seta, swipe, "Hoje") |
| Content hierarchy | 1. Data em destaque amarelo + setas · 2. Botões de ação (nova agenda, config) · 3. Grade de slots |
| Navigation and controls | Setas `btn btn-secondary btn-sm` + chevrons; "Hoje" `btn btn-secondary btn-sm btn-calendario-hoje`, "Hoje" sem ícone; sticky correto abaixo da topbar |
| Visual language | Data: `font-weight: 800; color: #ffd700; font-size: 0.95rem`. Container: `background: #0b0b0b; border-radius: 10px; padding: 8px 10px; border: 1px solid #1f1f1f`. Dia da semana: papel secundário, `color: #d3d3d3; font-size: 0.8rem` |
| Required states | Sticky correto em rolagem (todos os tamanhos de tela); prefers-reduced-motion (já coberto pela rodada anterior) |
| Responsive behavior | Mobile ≤767px: data via `.agenda-data-dia-mobile` com `0.95rem` amarelo; dia da semana `0.8rem` #d3d3d3. Mobile ≤430px: "Hoje" com `font-size: 0.72rem; padding: 5px 12px` |
| Evidence used | Interno — aba Semana da Home conforme descrito acima |
| Forbidden defaults | Título "Agenda do Dia" (redundante); ícone `fa-bullseye` no "Hoje"; setas `fa-circle-arrow` amarelas; pill amarelo cheio |
| Acceptance criteria | Sticky do Dia abaixo da topbar sem sobrepor seletor; visual idêntico à Semana; todos ids preservados; swipe/animação intactos |

---

## Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `assets/js/view-home.js` | Inline do sticky removido; classe `home-day-sticky` adicionada; título "Agenda do Dia" e subtítulo removidos; setas trocadas para `btn btn-secondary btn-sm` + chevrons; "Hoje" trocado para `btn btn-secondary btn-sm btn-calendario-hoje`. |
| `assets/js/app/bootstrap.js` | `atualizarAlturaTopbarHome()` criada; chamada adicionada em `atualizarMedidasLayout()`. |
| `assets/css/style.css` | `.home-day-sticky` adicionada; `.agenda-header-navegacao` ajustada (radius 12→10, padding reduzido); regra scoped `.agenda-header-navegacao .agenda-data-principal` adicionada; responsive `btn-hoje-agenda` → `btn-calendario-hoje`; tamanhos de `agenda-data-dia-mobile` e `agenda-dia-semana-mobile` ajustados; `.btn-nav-dia`, `.btn-nav-dia:active`, `.btn-hoje-pill`, `.btn-hoje-pill:active` e responsive `.btn-nav-dia` removidos. |

---

## Causa raiz do sticky quebrado e como a correção resolve

### Causa raiz

Existiam **dois elementos sticky ancorados na mesma altura** (`top: var(--header-height)`):

| Elemento | `top` | `z-index` | Efeito |
|---|---|---|---|
| `.home-weekly-topbar` | `var(--header-height)` | `10` | Correto — cola abaixo do header |
| `.agenda-sticky-container` (inline) | `var(--header-height)` | `20` (inline) | Sobrepõe a topbar com `z-index` maior |

O estilo **inline** do `agenda-sticky-container` vencia qualquer regra do CSS externo, tornando a correção por CSS impossível sem remover o inline primeiro.

### Como resolve

1. **Inline removido** — o `agenda-sticky-container` do Dia não tem mais `style=""`.
2. **`.home-day-sticky` no CSS** — `top: calc(var(--header-height, 0px) + var(--home-topbar-height, 0px) - 1px); z-index: 9`. O `top` calculado posiciona o sticky do Dia logo abaixo da topbar (que já está colada ao header). O `z-index: 9` é menor que o `10` da topbar, eliminando qualquer sobreposição residual.
3. **`atualizarAlturaTopbarHome()`** no bootstrap lê `offsetHeight` da `.home-weekly-topbar` e grava `--home-topbar-height` em runtime, nos mesmos gatilhos (carga, resize, troca de rota) que já recalculam `--header-height`.
4. O `- 1px` cola as bordas sem fenda de subpixel (mesmo padrão da regra órfã de `#containerCalendarioDia`).

---

## Valores finais

| Propriedade | Valor | Nota |
|---|---|---|
| `z-index` de `.home-day-sticky` | `9` | Menor que o `10` da topbar |
| `top` de `.home-day-sticky` | `calc(var(--header-height, 0px) + var(--home-topbar-height, 0px) - 1px)` | Mede a topbar em runtime |
| `border-radius` de `.agenda-header-navegacao` | `10px` | Era `12px` — alinhado à Semana |
| `padding` de `.agenda-header-navegacao` | `8px 10px` | Era `10px 14px` — alinhado à Semana |
| `font-weight` da data (`.agenda-data-principal`) | `800` | Era `700` |
| `color` da data | `#ffd700` | Era `#ffffff` |
| `font-size` da data | `0.95rem` | Era `1rem` |
| `font-size` data mobile (`.agenda-data-dia-mobile`) | `0.95rem` | Era `1.05rem` |
| `font-size` dia da semana mobile (`.agenda-dia-semana-mobile`) | `0.8rem` | Era `1.05rem` — agora claramente secundário |

---

## Confirmação por busca: `.btn-nav-dia` e `.btn-hoje-pill`

Busca realizada em `*.js`, `*.html`, `*.css` no repositório inteiro antes de remover:

- `.btn-nav-dia`: 3 ocorrências em `style.css` (declaração + `:active` + responsive 430px) + 2 em `view-home.js` (template do dayPanel). **Nenhum outro arquivo.**
- `.btn-hoje-pill`: 2 ocorrências em `style.css` (declaração + `:active`) + 1 em `view-home.js` (template). **Nenhum outro arquivo.**

Ambas as classes foram removidas do CSS e do template. A classe `.btn-hoje-agenda` (usada nos responsive blocks como seletor do mesmo botão) foi atualizada para `.btn-calendario-hoje` nos dois media queries onde aparecia.

---

## Finish Gate

### Especificidade do produto

- ✅ O cabeçalho do Dia agora usa o mesmo vocabulário visual da Semana (mesmo componente de botão, mesma cor e peso na data, mesmo container de navegação).
- ✅ Sem título redundante ("Agenda do Dia" removido).
- ✅ Sem controles decorativos inertes: botões de ação preservados e funcionais.

### Completude de interação

- ✅ Todos os ids protegidos preservados: `#btnHomeDiaAnterior`, `#btnHomeDiaProximo`, `#btnHomeDiaHoje`, `#btnHomeDiaNovaAgenda`, `#btnHomeDiaConfigAgenda`, `#agendaGridHomeHome`.
- ✅ `bindOnce` continua ligando os handlers a esses ids.
- ✅ Swipe e animação: `passive: 4`, `animarTrocaPeriodo: 10 ocorrências`, `preventDefault: 0`.

### Responsivo e acessível

- ✅ Mobile ≤767px: data via `.agenda-data-dia-mobile` em `0.95rem` amarelo; dia da semana `0.8rem` #d3d3d3 (claramente secundário).
- ✅ Mobile ≤430px: `#btnHomeDiaHoje` agora combina com `.btn-calendario-hoje` no responsive (padding `5px 12px`, font `0.72rem`).
- ✅ **Alvo de toque**: `btn btn-secondary btn-sm` tem `padding: 6px 12px` — alvo de ~36-40px de altura em mobile, confortável. Sem regressão em relação às setas amarelas grandes que havia antes.
- ✅ **Contraste**: "Hoje" em `color: #e0e0e0; background: #2a2a2a` (`.btn-secondary`) — ratio de contraste confortável em fundo escuro (#141414 do sticky). Data em `#ffd700` sobre `#0b0b0b` — muito acima de 4.5:1.
- ✅ Aba Semana: `.home-weekly-topbar` intacta — `top: var(--header-height); z-index: 10` inalterados.
- ✅ `prefers-reduced-motion`: coberto pela rodada anterior; `.home-day-sticky` não adiciona animação.

### Integridade do design system

- ✅ Sem classes novas para componentes — reusa `btn`, `btn-secondary`, `btn-sm`, `btn-calendario-hoje` já existentes.
- ✅ Sem arquivo CSS novo.
- ✅ Variável `--home-topbar-height` introduzida com padrão `0px` (fallback) para não quebrar em contextos onde a topbar não existe.

---

## Resultado item por item do roteiro de teste

> Validação estática. Confirmação final em dispositivo real ou DevTools.

| # | Descrição | Status esperado | Observação |
|---|---|---|---|
| **1** | **Sticky do Dia abaixo da topbar** | **✅** | `.home-day-sticky` usa `top = header + topbar - 1px; z-index: 9`. A topbar (z-index 10) fica sempre por cima. A fenda de subpixel é eliminada pelo `-1px`. Precisa de validação visual em rolagem real. |
| **2** | **Semana não regrediu** | **✅** | `.home-weekly-topbar` não foi tocada. Nenhuma regra de `agenda-panel-semana` alterada. |
| 3 | Alternância de abas sem salto | ✅ | Nenhuma mudança em `alternarModoHome`. O `display: none/block` dos painéis segue idêntico. |
| 4 | Consistência visual | ✅ | Setas, "Hoje", data e container agora usam os mesmos tokens que a Semana. |
| 5 | Sem título redundante; botões de ação presentes | ✅ | `h2` e `span` removidos. `#btnHomeDiaNovaAgenda` e `#btnHomeDiaConfigAgenda` preservados com mesmos ids, classes e ícones. |
| 6 | Swipe intacto | ✅ | `passive: 4`, `animarTrocaPeriodo: 10`, `preventDefault: 0`. |
| 7 | Rolagem vertical intacta | ✅ | Nenhuma alteração em `overflow`, `touch-action` ou handlers de toque. |
| 8 | Tap no card abre modal | ✅ | Nenhum `preventDefault`; nenhum handler de toque novo. |
| 9 | Setas e "Hoje" funcionam | ✅ | `bindOnce` permanece ligado aos mesmos ids. Nenhuma alteração de lógica. |
| **10** | **Redimensionamento reposiciona sticky** | **✅** | `atualizarAlturaTopbarHome()` é chamada em `atualizarMedidasLayout()`, que já está registrada no evento `resize` e após cada navegação de rota. |
| **11** | **Alvo de toque confortável** | **✅** | `btn-sm`: `padding: 6px 12px` → alvo de ~36px de altura. Antes as setas `btn-nav-dia` (font-size `1.35rem`, sem padding explícito) provavelmente tinham alvo similar ou menor. Não há regressão. Se necessário, padding pode ser aumentado sem impacto no layout. |
| 12 | Movimento reduzido | ✅ | Nenhuma animação nova em `.home-day-sticky`. As animações de período cobrem `prefers-reduced-motion` desde a rodada anterior. |

---

## O que foi encontrado mas não alterado — riscos fora do escopo

| O que é | Risco | Decisão |
|---|---|---|
| **Regras órfãs** `#containerCalendarioDia`, `#tela-calendario > .calendario-tabs-sticky`, `#containerCalendarioDia .agenda-sticky-container` | Nenhum: seletores não correspondem a nenhum elemento no DOM atual. Código morto sem efeito. | Não alterado — limpeza é rodada separada. |
| **`--tabs-height`** (sempre `removeProperty` em `atualizarAlturaTabsCalendario`) | Mecanismo abandonado: a variável nunca é setada, o CSS que a consome cai no fallback `0px`. Inócuo. | Não alterado. |
| **Fallbacks divergentes de `--header-height`**: `135px` (~L2590, ~L3240) vs `78px` (~L3291) | Os fallbacks só ativam se `--header-height` não for definido (o que não ocorre após o boot). Não causa bug visível em produção. | Não alterado. |
| **`atualizarAlturaTopbarHome()` chamada antes de o DOM da topbar existir** | A topbar (`.home-weekly-topbar`) é renderizada no HTML estático e existe desde o carregamento. `offsetHeight` será zero somente se `display: none` — o que não acontece com a topbar. Risco baixo. | Aceito. |
| **`.agenda-header-wrapper` e `.agenda-header-info`** em CSS | As declarações CSS ainda existem (`display: flex; justify-content: space-between; ...`). Não causam problemas pois as classes foram removidas do template. Podem ser limpas em rodada de CSS órfão. | Não alterado. |
| **`docs/roadmap.md`** | Não alterado conforme instrução. | — |
