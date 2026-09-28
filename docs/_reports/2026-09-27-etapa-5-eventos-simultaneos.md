# Agenda diária — Etapa 5 (eventos simultâneos)

> **Data de abertura**: 2026-09-27
> **Branch de trabalho**: `feat/etapa-5-eventos-simultaneos` (criada de `origin/main` com `--no-track`)
> **Fonte**: achado **4.12** de `docs/_diags_llm/2026-09-23-diag-auditoria-ui-ux-mobile.md`
> **Status**: implementado e validado — aguardando commit/push do dono

## Escopo

O achado 4.12: a agenda diária dividia eventos simultâneos em colunas laterais
(esquerda/meia/direita). A estrutura funcionava, mas com 2–4 eventos sobrepostos
as colunas ficavam de 37–78px em 320px e o nome do aluno virava "…".

**Critério de conclusão do achado**: dois a quatro eventos simultâneos permanecem
distinguíveis e acionáveis em 320px, preservando nome, horário e status no
primeiro nível.

## Premissa validada em código (antes de prototipar)

- **Criação** (`scheduling-serializer.js`) e **edição** (`modal-acao-slot.js`)
  bloqueiam conflito.
- Duas portas de entrada **não** verificam conflito:
  1. **Sync do Google Calendar** — `gcalSyncService.js → upsertBloqueio`
     grava o evento externo (`source: 'google_external'`) sem qualquer check.
  2. **Cascata de reschedule de aluno** (`cascade-sync-aluno.js`) — sem check.
- O backend não tem nenhuma proteção de conflito.

Conclusão: o sobreposição real na grade vem de **aula × evento GCal externo**
(o mock reproduz isso com `gcal_ext5`) e/× cascade. A **mudança de regra de
negócio** (bloquear ou alertar na ingestão) foi **deliberadamente aditada pelo
dono** para depois desta etapa.

## Decisão do dono (pergunta 3 da seção 6 — fechada antes da implementação)

Após protótipos medidos (abaixo), o dono escolheu:

> **C — Cascata + horário comprimido** — cada evento de uma banda simultânea
> ocupa quase a largura total da grade, empilhado com degrau fixo por coluna,
> e mostra a hora de **início** comprimida no topo do card.

## Diagnóstico medido (estado atual, 320×568 DPR 2.81, mock `agendaSimultaneos`)

Colunas do motor `calcularColisoes` (funcionais, retângulos sem colidir), mas:

| Banda | Largura do card | Nomes visíveis |
| --- | --- | --- |
| 2 colunas | 78px | 2–3 chars ("Au…", "Br…") |
| 3 colunas | 51px | **0** |
| 4 colunas | 37px | **0** |

E o problema maior: a aluna "Aurora Helena de Camargo Monzani" aparece em
**três** faixas do dia, todas com o mesmo nome cortado e o mesmo local — sem
horário visível no modo dia, **não havia como distinguir os três cards**.

Defeito raiz secundário encontrado: a heurística de densidade
(`analisarDensidadeVisualCardDia`) recebia `larguraCardEstimadaPx =
Math.max(120, …)`, ou seja, calculava densidade para um card de ≥120px que o
render desenhava com 37px — heurística dessincronizada do render.

## Protótipos medidos (in-browser, sem alterar arquivos)

**A — cartão mínimo nas colunas** (ícone/local/meta/chip sumem quando a coluna
<120px; nome ocupa a coluna):

| Viewport | 2 col | 3 col | 4 col |
| --- | --- | --- | --- |
| 320px | 7 chars | 3–4 | **2** ✗ |
| 433px | 8–9 | 8 | 5 |

Barato, mas não passa em 4 colunas/320px e não resolve a identificação de
nomes repetidos.

**C — cascata** (cards em largura total, degrau 12px/coluna, z-index por
coluna) **+ horário comprimido** (só "08:00" — o período completo consumia
~90px e esmagaria o nome a 0 chars, medido):

| Viewport | Cards | Nomes visíveis | Identificação (3 "Aurora") | Overflow |
| --- | --- | --- | --- | --- |
| 320px | 126–162px | 4–9 | ✓ pela hora (08:00/10:00/12:00) | 0 |
| 390px | 196–232px | 11–19 | ✓ | 0 |
| 433px | 229–265px | 11–22 ("Bruna Rocha" completo) | ✓ | 0 |

Linha do nome de todos os 9 cards: **0% coberta** (alvos táteis ok).

## Implementação (o que entrou)

Arquivos (278+/21−, medida com `git diff --stat` no fim):

- **`assets/js/view-home.js`** (área sensível §7 — `view-home.js` é o render
  da grade diária; o motor `calcularColisoes` foi **preservado intacto**, só
  o desenhamento mudou):
  - **Bloqueios de dia inteiro saem do grafo de sobreposição**: antes,
    `calcularColisoes` os recebia junto, e o start clamped (00:00 → abertura da
    grade) coincidia com o de qualquer aula de manhã — o dia inteiro vira
    “banda” e infla o `maxCols` de todos os eventos do dia. Agora são
    filtrados (mesma lógica de clamp do motor) e entram com `maxCols=1` →
    largura total, mesma posição vertical de sempre.
  - Componentes conectados do grafo de sobreposição (apenas eventos de
    grade) definem a **banda**; a decisão de cascata é **por banda**, não por
    evento: qualquer par de inícios iguais na banda derruba a cascata inteira
    (senão teríamos cartões em cascata e em colunas na mesma faixa — o card da
    frente esconderia o título do de trás).
  - Pré-processa cada evento em `ev.posicionamento`:
    - `maxCols > 1` + inícios **estritamente crescentes** na banda →
      **cascata** (`left = col × 12px`, `width = calc(100% − col×12 − 2px)`,
      `z-index = 10 + col`);
    - banda com **inícios iguais** → fallback em colunas — geometria
      **idêntica** à pré-Etapa 5 (o inset era `gapRight = 4px`, não 6px);
    - sem banda (inclui dia inteiro) → 100% menos 4px (como antes).
  - `ev.larguraCardPx` agora usa a **largura real** da
    `.time-grid-content-col` (medida no render anterior; primeir pintura: fórmula
    exata derivada `grid.clientWidth − 24 − 55 − 12 − 1`; grade oculta:
    180 conservador) em vez de `Math.max(120, …)` — correção da heurística
    dessincronizada.
  - Passa `visualCascataHoraComprimida: boolean` ao template.
- **`assets/js/agenda-card-template.js`**:
  - Classe `cascata-hora` no card quando a flag está ativa.
  - Período exibido no topo: início comprimido (`08:00`) em cascata;
    período completo em todo o resto (bloco "dia inteiro" mantém o texto
    "Dia inteiro", nunca "00:00").
- **`assets/css/style.css`** (bloco final do grid do dia, vencendo por
  especificidade):
  - `.cascata-hora .agenda-semana-card-time` visível no dia, `flex: 0 0 auto`
    (nunca encolhe/desce — mesmo padrão do Refinamento 5), `font-size: 0.75rem`
    (12px — piso do achado 4.4).
  - `.cascata-hora .agenda-dia-aula-nome`: `max-width: 100%` (nome não reserva
    mais os 28px do chip absoluto).
  - `.cascata-hora .agenda-card-inline-status`: **`position: static`** — o chip
    sai do canto superior absoluto (onde um card acima da cascata podia
    cobri-lo) para a linha do título, in-flow.
- **`mocks/ui-runtime/scenarios.js`**: cenário `agendaSimultaneos` — aluna de
  33 chars em 3 faixas sobrepostas + bloqueio interno + evento GCal externo +
  deslocamento, em janelas de 2, 3 e 4 colunas com inícios escalonados de
  15–30 min, **e um par com inícios iguais (14:00/14:00, aula + bloqueio)
  para validar o fallback em colunas**.

## Validação medida (post-implementação, mock `agendaSimultaneos`)

Cascata (9 cards, inícios escalonados):

| Viewport | Nomes visíveis | Horas | Overflow |
| --- | --- | --- | --- |
| **320×568 (aceite)** | 4–11 | todas visíveis (08:00…12:45) | 0px |
| 390×844 | 11–21 | ✓ | 0px |
| 433×762 (referência) | 11–22 (Bruna Rocha completo) | ✓ | 0px |

Fallback de colunas (par de inícios iguais 14:00/14:00, **medido**):

| Viewport | Largura do card | Layout | Nomes visíveis | Período | Overflow |
| --- | --- | --- | --- | --- | --- |
| **320×568 (aceite)** | 78px | colunas lado a lado (left 112/194, z 1, sem `cascata-hora`) | 3–4 | completo (“14:00 - 15:00”) | 0px |
| 433×762 (referência) | 130px | idem | 11–12 | completo | 0px |

- Font-size do horário comprimido: **12px** dentro da escala do achado 4.4
  (16/14/12; nada legível abaixo de 12px).
- Chips de status: 6/6 cards de aula com chip **visível** (posição in-flow
  na linha do título).
- Linhas de nome dos 9 cards da cascata: sem cobertura por card irmão; alvos
  mínimos 96px de altura.
- Suíte frontend `node --test`: **77/77 antes e 77/77 depois** da rodada
  (zero regressão — nada de `view-*.js` é coberto por teste; validação de
  tela manual, conforme instruções §10).

## Casos de borda tratados

- **Inícios iguais na banda** → fallback em colunas (a cascata escondia o
  título do card de trás) — **validado in-browser** com o par 14:00/14:00 do
  mock (acima); a decisão é **por banda**, então o arranjo não fica misto.
- **Bloqueio dia inteiro** (`00:00–23:59`) → fica **fora** do grafo de
  sobreposição (não infla o `maxCols` do dia), renderiza a largura total, e o
  template mantém “Dia inteiro” (nunca “00:00”).
- **Resize** → a geometria é em px/% sobre a content-col (sem medida em
  runtime do card), então o reflow não quebra o layout.

## Encontrado, mas NÃO alterado (fora de escopo)

- **Regra de negócio: bloquear/alertar sobreposição na ingestão** (GCal
  `upsertBloqueio` e cascade sem check). Aditada pelo dono para depois da
  Etapa 5. Enquanto não existe, o app pode exibir sobreposição — que é
  exatamente o que a cascata agora renderiza de forma legível.
- **`REGRAS_VISUAIS_CARD_DIA.larguraMinimaCardPx: 120`** continua no código,
  mas a heurística agora recebe a largura real; a constante só ancora o
  `Math.max` interno da capacidade de título.
- **`_static-server.tmp.js`** (servidor estático temporário, rastreado) —
  decisão do dono sobre git (continua fora deste commit).

## Commit sugerido

`feat(agenda): eventos simultaneos em cascata com hora de inicio (etapa 5, 4.12)`

Branch: `feat/etapa-5-eventos-simultaneos` — push `-u origin
feat/etapa-5-eventos-simultaneos` e PR por conta do dono.
