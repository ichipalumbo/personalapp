# Agenda diária — Etapa 5 (eventos simultâneos)

> **Data de abertura**: 2026-09-27
> **Branch de trabalho**: `feat/etapa-5-eventos-simultaneos`
> **Fonte**: achado **4.12** de `docs/diagnostics/2026-09-23-diag-auditoria-ui-ux-mobile.md`
> **Status**: implementado e validado — aguardando commit/push do dono
> **Evolutivo**: esta versão substitui a decisão original "C — cascata"
> (primeira implementação, validada e depois rejeitada pelo dono para 4+
> eventos). A rotação de formatos está registrada em "Decisões do dono".

## Escopo

O achado 4.12: a agenda diária dividia eventos simultâneos em colunas laterais
(esquerda/meia/direita). A estrutura funcionava, mas com 2–4 eventos sobrepostos
as colunas ficavam de 37–78px em 320px e o nome do aluno virava "…".

**Critério de conclusão do achado**: dois a quatro eventos simultâneos
permanecem distinguíveis e acionáveis em 320px, preservando nome, horário e
status no primeiro nível.

## Premissa validada em código (antes de prototipar)

- **Criação** (`scheduling-serializer.js`) e **edição** (`modal-acao-slot.js`)
  bloqueiam conflito.
- Duas portas de entrada **não** verificam conflito:
  1. **Sync do Google Calendar** — `gcalSyncService.js → upsertBloqueio`
     grava o evento externo (`source: 'google_external'`) sem qualquer check.
  2. **Cascata de reschedule de aluno** (`cascade-sync-aluno.js`) — sem check.
- O backend não tem nenhuma proteção de conflito.

Conclusão: a sobreposição real na grade vem de **aula × evento GCal externo**
(o mock reproduz isso com `gcal_ext5`) e/ou cascade. A **mudança de regra de
negócio** (bloquear ou alertar na ingestão) foi **deliberadamente aditada pelo
dono** para depois desta etapa.

## Diagnóstico medido (estado original, 320×568 DPR 2.81, mock `agendaSimultaneos`)

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

## Decisões do dono (ordem em que foram decididas nesta branch)

1. **Rodada 1 — "C — Cascata + hora comprimida"**: implementada, validada
   (77/77 antes/depois, 3 viewports) e entregue. **Rejeitada pelo dono** para
   4+ cards: "Não gostei desse formato de quando tem mais de 3 cards" — e o
   dono pediu referência de como apps de calendário tratam o caso.
2. **Pesquisa de referência**: Google Calendar (colunas proporcionais,
   reclamações de "fios finos" com 3+ no mobile), Apple Calendar (colunas +
   evento longo cobrindo os outros), **Outlook — o dono usa: com o
   sobreposto ele cria colunas que vão estreitando e reduz só o TÍTULO com
   "…", sem hora no card; o card "flutua" só com título (print do dono em
   `Mídia.jpg`, raiz do repositório)**, Fantastical/Timepage (timeline
   vertical, linhas de largura total), FullCalendar (mesmo algoritmo de
   colunas da engine).
3. **Rodada 2 — formato FINAL (híbrido)**, decidido após protótipo in-browser
   (duas variantes medidas em 320/390/433, zero alteração em arquivo na fase
   de protótipo):
   - **banda com 2**: formato OUTLOOK — colunas proporcionais do engine, card
     com **só o título** (sem hora, sem chip, sem ícone, sem local);
   - **banda com 3+**: **linhas empilhadas** num contêiner que cobre o span da
     banda — cada linha = hora de início + título + chip, sem altura
     proporcional à duração.
   - Racional do dono: "Dificilmente vamos ter 4 recorrências de uma vez" — o
     caso comum (2) fica igual ao Outlook; 3+ (raro) fica legível em 320.
   - Par com **início igual** (mock 14:00) confirmado para **ficar** no mock;
     nele cai no ramo de 2 colunas.
4. **Fundo do Dia** (mesma rodada): (a) **retirar o cinza** do fundo
   ("tomar cuidado para não ter contraste o suficiente para deixar a timeline
   de horas bem desenhada"); (b) **esticar o grid nas laterais** — "o fundo
   das horas poderia ocupar mais a tela… aproveitar para fazer o grid todo
   ocupar um pouco mais das laterais".

## Implementação (o que entrou)

O motor `calcularColisoes` (`view-home.js`) segue **intacto** — o mesmo
algoritmo de colunas/lane que já produzia `col` e `maxCols` para o fallback
de início igual agora é a fonte do posicionamento de **toda** banda
sobreposta.

### `assets/js/view-home.js` (área sensível §7 — render da grade diária)

- **Bloqueios de dia inteiro fora do grafo de sobreposição** (preservado da
  rodada 1): o start clamped (00:00 → abertura da grade) coincidiria com o de
  qualquer aula da manhã e viraria "banda" do dia todo inflando o `maxCols`
  de todos. Entram com `maxCols=1` → largura total, mesma posição vertical.
- **Bandas = componentes conectados** do grafo (só eventos de grade). Cada
  grupo é processado **uma vez** — o mapa `componentes` mapeia CADA id para a
  MESMA Set de grupo, então a iteração retorna o grupo uma vez por membro; a
  deduplicação por `Set` de "grupos já vistos" é obrigatória (sem ela, cada
  banda de N membros gera N contêineres — bug pego em validação: 7 bandas/29
  cards no lugar de 2/11).
- Pré-processamento `ev.posicionamento`:
  - **banda com 3+** → `pos.linha: true`; o card sai do absoluto e vai para o
    contêiner `.agenda-banda-grupo` (top/height inline cobrindo do menor
    início ao maior fim da banda). Ordem das linhas = início, com **tie-break
    de fim** (determinístico em inícios iguais). `larguraCardPx` p/
    heurística = content-col inteira.
  - **banda com 2** → colunas proporcionais do engine (`left = col × width%`,
    `width = calc(width% − 4px)`) com `pos.formatoOutlook: true`. Geometria
    **idêntica** à pré-Etapa 5 (inset 4px verificado via `git show HEAD`).
  - **sem banda / dia inteiro** → `left: 0`, `calc(100% − 4px)`, sem classe.
- `ev.larguraCardPx` com a **largura real** da `.time-grid-content-col`
  (medição do render anterior; primeira pintura: fórmula derivada exata;
  grade oculta: 180px conservador) — a correção da heurística dessincronizada
  da rodada 1 se manteve.
- Geração do HTML: cards fora de banda seguem absolutos como sempre; cards de
  banda 3+ são acumulados numa `Map` por id e montados dentro de um
  `.agenda-banda-grupo` por banda (após o loop de cards).
- `opcoes` para o template: `layoutBanda: 'outlook' | 'linha' |
  undefined` + `horaBandaMinutos` (só linha). `visualCascataHoraComprimida`
  **removido** (nada mais o consome).

### `assets/js/agenda-card-template.js`

- `cascata-hora` / `visualCascataHoraComprimida` **removidos**.
- Novo `layoutBanda` (só em `calendar-day`):
  - `'outlook'` → classe **`.formato-outlook`** (o `periodo` continua sendo
    calculado normalmente — o que esconde a hora é CSS; semana/modal
    intactos);
  - `'linha'` → classe **`.formato-linha`** + `periodoExibir` = hora de
    **início comprimida** de `opcoes.horaBandaMinutos` (ex.: "10:00");
    bloqueio dia inteiro mantém o período cheio ("Dia inteiro", nunca
    "00:00").
- Os 4 ramos de `tipo` (aula / deslocamento / bloqueio interno / GCal
  externo) seguem emitindo os mesmos elementos; o CSS dos dois formatos é o
  que reorganiza a linha do top. GCal externo / deslocamento / bloqueio
  interno **não têm chip** (regra pré-existente do Cartão D) — a linha mostra
  o que cada tipo já tinha.

### `assets/css/style.css`

- Bloco `.cascata-hora` **removido** (3 regras substituídas).
- **`.formato-outlook`**: `display:none` no rodapé, no ícone do título, no
  chip e na hora; `max-width:100%` no nome (deixa a reserva de 28px do chip
  absoluto). Especificidade maior que o bloco base do dia → vale em qualquer
  densidade.
- **`.agenda-banda-grupo`**: contêiner absoluto (top/height inline), `flex
  column`, `gap:2px`, `overflow:hidden`, `z-index:5` — a banda fica
  limitada ao próprio span; linha que não caiba é cortada, sem esticar a
  timeline.
- **`.formato-linha`** (dentro do contêiner): o card vira `position:static` e
  o `top` vira uma linha: **[hora] [título …] [chip]** — hora à ESQUERDA
  (`order:-1`, dourado `#ffd700`, `width:40px`, ícone relógio oculto — a
  coluna "12" do print Outlook), título `flex:1 1 auto; max-width:100%`
  (sem a reserva de 28px) com ellipsis, chip `position:static;
  margin-left:auto` (sai da âncora absoluta do canto, onde um card acima
  poderia cobrir). `min-height:0` + `overflow:hidden` no card e no
  contêiner = a linha nunca estoura a banda.
- **Fundo do Dia nivelado + esticado** (escopo em `#homeDayPanel` —
  `.agenda-panel` é **compartilhada com Finanças**; `.agenda-dia-container`
  é exclusiva do dia): painel e container `background:#0d0d0d` (= body),
  sem borda/sombra, e **laterais esticadas**: painel 20→6px e container
  12→2px por lado (recuo total por lado de ~33px para ~8px; vertical 20px
  mantido). Efeito medido: `.time-grid-content-col` **268→320px em 433** e
  **164→217px em 320** (sem overflow horizontal). Linha de hora cheia
  `#222` → **`#3a3a3a`** (lê sobre o fundo nivelado); meia-hora tracejada
  `#141414` → `#1f1f1f` (discreta).

### `mocks/ui-runtime/scenarios.js` — **sem alteração nesta rodada**

Cenário `agendaSimultaneos` (Domingo 2026-09-27) continua com: banda de 2
(08:00/08:30), banda de 3 (10:00/10:15/10:30), banda de 4 (12:00/12:15 GCal
externo/12:30/12:45 deslocamento) e o **par 14:00/14:00** (aula + bloqueio
"Ajuste de agenda — recepção", inícios iguais).

## Validação medida (post-implementação da rodada 2, mock `agendaSimultaneos`)

Nomes visíveis (chars de 32 — "Aurora Helena de Camargo Monzani"):

| Faixa | 320×568 (stress) | 390×844 | 433×762 (referência) |
| --- | --- | --- | --- |
| **2** (colunas Outlook) | 10 | 15 | **17** |
| **3** (linhas) | 15 | 24 | **28** |
| **4** (linhas) | 15–17 | 23–26 | **28–31** (Aurora 28/32) |
| overflow (linha maior que contêiner) | 0 | 0 | 0 |
| scroll horizontal | não | não | não |

Para comparar: o estado ORIGINAL (pré-Etapa 5) dava **0–3 chars** em 3–4
colunas em 320; a cascata da rodada 1 dava 4–11. O híbrido final dá **15–17
em 3–4 e 10 em 2** em 320, e quase o nome completo na referência.

Outras validações medidas/executadas:

- **Par 14:00** (início igual): 2 colunas lado a lado (130px em 433 antes do
  esticar; 155px depois — recalc. 50% − 4px da content-col), hora/chip
  ocultos, `onclick` preservado.
- **Acionabilidade dentro do contêiner de banda**: executar o handler
  `abrirModalAcaoSlot` de um card `formato-linha` e de um
  `formato-outlook` abre o `modalAcaoSlot` (executado no browser, sem
  depender de coordenadas de clique).
- **Dia inteiro** (não presente no mock): mesmo ramo da rodada 1 (já
  validado in-browser na época) — `maxCols=1` fora do grafo, largura total;
  o texto "Dia inteiro" vem de `resolverPeriodo`, independente do
  `periodoExibir` da linha.
- **Grid esticado** (medido): painel `padding: 20px 6px`, container
  `padding: 14px 2px`; content-col **320px (433) / 217px (320)**.
- **Suíte frontend `node --test`**: **77/77 antes e 77/77 depois** da rodada
  2 (zero regressão; o render do dia não tem cobertura — validação de tela
  manual, conforme §10).

## Casos de borda / decisões registradas

- **Inícios iguais**: em banda de 2 → 2 colunas; em banda de 3+ → linhas
  ordenadas por `start` com **tie-break de `end`** (ordem estável).
- **Linhas não cabem no span da banda** (ex.: 7 eventos de 30 min):
  `overflow:hidden` corta — a timeline não estica. Trade-off assumido do
  list mode: altura do card não representa mais a duração no sobreposto
  (a duração volta no card/modal ao tocar).
- **`REGRAS_VISUAIS_CARD_DIA.larguraMinimaCardPx: 120`** continua no código,
  mas a heurística recebe a largura real (constância da rodada 1).
- **`_static-server.tmp.js`** (servidor estático temporário, rastreado) —
  decisão do dono sobre git; não alterado nesta rodada.

## Encontrado, mas NÃO alterado (fora de escopo)

- **Regra de negócio: bloquear/alertar sobreposição na ingestão** (GCal
  `upsertBloqueio` e cascade sem check) — aditada pelo dono para depois da
  Etapa 5.
- **`Mídia.jpg`** (print do Outlook do dono) na raiz do repositório como
  **untracked** — decidir se entra no versionamento (sugestão: remover, ou
  mover para `docs/reports/assets/` se for manter de referência).
- **Modo SEMANA** (`.agenda-panel-semana`) e **Finanças** (`.agenda-panel`
  compartilhada): o esticar das laterais e o nivelar do fundo são **escopo
  só do Dia** (`#homeDayPanel`). Se fizer sentido alinhar a semana, é outra
  rodada.

## Commit sugerido

`feat(agenda): eventos simultaneos em colunas/linhas estilo outlook + fundo
do dia nivelado e esticado (etapa 5, 4.12)`

Branch: `feat/etapa-5-eventos-simultaneos` — push `-u origin
feat/etapa-5-eventos-simultaneos` e PR por conta do dono. **A branch já
contém os commits da rodada 1 (cascata)** feitos pelo dono antes desta
sessão; este commit cobre só as alterações da rodada 2 por cima.
