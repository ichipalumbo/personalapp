# Cartões incrementais — Etapa 4 (densidade de cards)

> **Data de abertura**: 2026-09-27
> **Branch de trabalho**: `feat/etapa-4-densidade-cards` (criada de `origin/main`, sem upstream track)
> **Fonte**: seção "Etapa 4 — Densidade de cards" de `docs/_diags_llm/2026-09-23-diag-auditoria-ui-ux-mobile.md`

## Escopo desta etapa

O achado **4.10** (filtros apertados) já foi resolvido fora da sequência formal, por decisão
direta do dono, em duas rodadas isoladas:
- Filtro de status da Finanças removido no Cartão A da Etapa 2 (`386b00c`, 2026-09-26).
- Filtros de status/objetivo de Alunos removidos por completo em 2026-09-27 (ver
  `docs/_reports/2026-09-27-remocao-filtros-tela-alunos.md`).

O que resta nesta etapa é só o achado **4.11 — cards com informação excessiva**.

## Decisões do dono (fechadas na abertura da rodada, 2026-09-27)

| Card | Decisão |
| --- | --- |
| Aluno | Primeiro nível sempre visível: nome + objetivo + status + indicadores de alerta (as 3 caixinhas). Local, cobrança (método/valor), vencimento e observações saem do sempre-visível e vão para uma área expansível ("Ver detalhes"). |
| Finanças | Primeiro nível: **Aulas + Valor** apenas (2 dos 4 itens do grid atual). Ciclo (período) e Cobrança (método) saem do grid e migram para dentro do extrato existente — exige redesenhar o cabeçalho do `<details>` "Ver extrato do ciclo" para incluir essas 2 informações, hoje ausentes do extrato. |
| Agenda | Entra no escopo — revisar o sistema de densidade já existente (`agenda-card-optional`, `visualDensity` compact/tight, `agenda-card-mobile-overflow`) e decidir se cobre bem 320–430px ou precisa de ajuste. |

Ordem dos cartões: **0 (este relatório) → A → B → C**. A, B e C são independentes entre si
(arquivos diferentes, sem dependência de ordem) e podem ser executados em qualquer sequência.

---

# Cartão A: Card de Aluno — reduzir primeiro nível

## Objetivo (1 frase)
Manter no card de Aluno, sempre visível, apenas nome + objetivo + status + caixinhas de alerta;
mover local, cobrança, vencimento e observações para uma área expansível.

## Referência da decisão
Decisão donal 2026-09-27 (ver tabela acima). Achado 4.11.

## ⚠️ Decisão pendente (bloqueia o início deste cartão)
O rótulo exato do `<summary>` **não foi decidido** — candidatos: "Ver detalhes", "Ver mais",
"Local e cobrança". Não inferir e não implementar com um rótulo provisório: perguntar ao dono
antes de escrever o código deste cartão.

## Arquivos a tocar
- `assets/js/view-alunos.js` (template do card em `renderizarListaAlunos`)
- `assets/css/style.css` — apenas se o estilo de `<details>`/`<summary>` já usado em Finaças
  não for suficiente

## Passos
1. Envolver local, método+valor de cobrança, vencimento/fechamento e observações em um único
   `<details>` com `<summary>` cujo rótulo vem da decisão pendente acima.
2. Manter sempre visíveis: nome, badge de objetivo, "Contrato: Nx/sem", toggle de status, e as
   3 caixinhas de indicador (`montarCaixinhaFinanceiraAluno`, `montarCaixinhaConsistenciaAluno`,
   `montarCaixinhaReposicaoAluno`).
3. Reaproveitar o estilo visual dos `<details>` já usados em Finanças
   (`cursor:pointer;color:#ffd700;font-weight:700;font-size:0.875rem`) por consistência.

## Fora de escopo (não fazer)
- As 3 caixinhas de indicador (conteúdo/lógica).
- Formulário de cadastro/edição de aluno.
- Toggle de status ativo/inativo.

## Validação obrigatória (Playwright)
- 433×762 (primário) + 320×568/390×844 (stress), mock `?mockScenario=alunosEmAtraso` e
  `?mockScenario=default`: card fechado mostra só nome/objetivo/contrato/status/caixinhas;
  `<details>` abre e mostra local/cobrança/vencimento/observações; zero overflow horizontal.
- `node --test` em `tests-frontend/` antes/depois.

## Critério de aceite (checklist binário)
- [ ] Card fechado mostra só o essencial decidido
- [ ] `<details>` abre e contém local/cobrança/vencimento/observações
- [ ] Caixinhas de indicador inalteradas
- [ ] Zero overflow horizontal nos 3 viewports
- [ ] Suíte frontend passa (registrar contagem antes/depois)
- [ ] Nenhuma regra de negócio alterada

## Commit sugerido
`feat(alunos): reduzir primeiro nivel do card com detalhes expansiveis`

---

# Cartão B: Card de Finanças — grid reduzido + redesenho do extrato

## Objetivo (1 frase)
Reduzir o grid sempre-visível do card de Finanças para Aulas + Valor, movendo Ciclo (período) e
Cobrança (método) para o cabeçalho do extrato já existente.

## Referência da decisão
Decisão donal 2026-09-27. Achado 4.11.

## Decisões fechadas (via vscode_askQuestions, 2026-09-27)
1. **Rótulo do `<details>`**: muda de "Ver extrato do ciclo" para **"Ver detalhes do ciclo"**
   (aplica-se ao ciclo atual e a cada ciclo do histórico).
2. **Formato de período + método dentro do extrato**: **mini-grid 2 colunas** (mesmo estilo
   visual das caixinhas já usadas no grid atual do card — 2 caixinhas: Ciclo e Cobrança),
   posicionado antes da lista de lançamentos.

## Arquivos a tocar
- `assets/js/view-financas.js` (`renderizarCard`, `renderizarDetalhesExtrato`,
  `renderizarConteudoExtrato`, `renderizarListaHistorico`)

## Passos
1. Reduzir o grid sempre-visível de `renderizarCard` para 2 itens: Aulas e Valor.
2. Adicionar ao cabeçalho do extrato (dentro do `<details>` "Ver extrato do ciclo", antes da
   lista de lançamentos) o período do ciclo e o método de cobrança — hoje presentes só no card
   principal, ausentes do extrato. Formato exato: conforme decisão pendente 2 acima.
3. Aplicar a mudança tanto no extrato do ciclo atual quanto no de cada ciclo do histórico
   (`renderizarListaHistorico` reusa `renderizarDetalhesExtrato`).
4. Ajustar o rótulo do `<summary>` conforme decisão pendente 1 acima.

## Fora de escopo (não fazer)
- `backend/src/services/financasService.js` e qualquer cálculo de ciclo.
- Regras de negócio de cobrança, snapshot ou piso zero.

## Validação obrigatória (Playwright)
- 433×762 + 320×568/390×844, mock `?mockScenario=default`: grid mostra só Aulas+Valor fechado;
  abrir "Ver extrato" mostra período + método + lançamentos + total.
- `node --test` em `tests-frontend/` e em `backend/` (checar `view-financas-historico.test.js`
  e testes de finanças que tocam o HTML renderizado) antes/depois.

## Critério de aceite (checklist binário)
- [ ] Grid fechado mostra só Aulas + Valor
- [ ] Extrato (ciclo atual e histórico) mostra período + método + lançamentos + total
- [ ] Suíte frontend e backend relevantes passam (registrar contagem antes/depois)
- [ ] Nenhuma regra de negócio alterada

## Commit sugerido
`feat(financas): reduzir grid do card e mover ciclo/cobranca para o extrato`

### Registro do Cartão B (2026-09-27)

- **Decisões fechadas** (via `vscode_askQuestions`): rótulo do `<details>` = **"Ver detalhes do
  ciclo"** (era "Ver extrato do ciclo"); formato de período+método = **mini-grid 2 colunas**,
  mesmo estilo visual das caixinhas do grid principal.
- **Arquivos alterados**: `assets/js/view-financas.js` — `renderizarCard` reduzido para 2
  itens sempre visíveis (Aulas, Valor; a variável `metodo`, órfã após a remoção do item
  Cobrança do grid, também foi removida); nova função `renderizarCicloECobrancaExtrato` gera o
  mini-grid Ciclo+Cobrança, chamada no início de `renderizarConteudoExtrato` (cobre os 3 casos:
  extrato indisponível, não registrado, sem lançamentos e com lançamentos); `renderizarDetalhesExtrato`
  trocou o rótulo padrão para "Ver detalhes do ciclo"; as 2 chamadas que passavam
  `rotulo: 'Ver extrato do ciclo'` explicitamente (ciclo atual e cada ciclo do histórico) foram
  simplificadas para usar o padrão novo.
- **Validação runtime** (mock `default`, 433×762 via clique real + 320×568 via CDP com DPR 2.81
  + touch): grid fechado mostra só Aulas+Valor nos 3 cards com ciclo calculado; card
  "Configurar cobrança" (Carlos Mendes) permanece sem grid, inalterado; "Ver detalhes do ciclo"
  expande e mostra mini-grid Ciclo ("01/09→30/09" + "Venceu") + Cobrança ("Por aula" +
  "Pagamento manual") antes dos lançamentos e do total; mesmo comportamento confirmado dentro do
  histórico ("Ver ciclos anteriores" → "Ver detalhes do ciclo" do ciclo de agosto, mostrando
  "Pago"/"Pagamento confirmado"); zero overflow horizontal em 320px.
- Suíte `tests-frontend/`: 77/77 antes → 77/77 depois. `view-financas.js` não é consumido pelo
  backend (confirmado via busca — nenhum teste em `backend/test/` o referencia), então a suíte
  de backend não precisou ser executada para este cartão.

**Adendo (mesma sessão, 2026-09-27)**: durante a revisão desta tela, o dono identificou que o
badge de status no canto superior direito do card (ex.: "ATRASADO", "EM ABERTO") quebrava em
duas linhas quando o nome do status era mais longo — o `<span>` não tinha `white-space:nowrap`.
Não é um achado dos documentos originais da auditoria; resolvido junto no Cartão B por já
estar na mesma tela. `assets/js/view-financas.js`: adicionado `white-space:nowrap;flex-shrink:0`
ao `<span>` do badge em `renderizarCard`. Validação runtime (mock `default`, 433×762 e 320×568
via CDP): os 4 status ("Atrasado", "Em aberto", "Pago", "Pendente") ficam em uma linha (altura
16px) nos dois viewports; zero overflow horizontal. Suíte 77/77 antes/depois.

**Segundo adendo ao Cartão B (mesma sessão, 2026-09-27)**: o dono apontou que, com o novo
grid de 2 colunas, a linha de valor do primeiro card tinha o rótulo "Total" no canto
esquerdo e o status do plano aparecia em posição idêntica à do badge do cabeçalho,
duplicando a mesma informação. Duas mudanças, ambas em `assets/js/view-financas.js`:
1. `renderizarCard`: o bloco do valor total agora é renderizado no canto **direito** do
   header (classe `flex:column;gap:2px;margin-left:auto;text-align:right`), empilhando
   na vertical: valor (`R$ 350,00`), método de cobrança ("Mês"/"Semana") e o ✓ de pago
   quando o plano está pago.
2. `renderizarCicloAtivo`: removida a linha "Periodo: ..." (o período já aparece na linha
   do extrato). O retorno agora é apenas a linha principal do `<details>`:
   "Periodos: 01/09/2026 - 30/09/2026 · 8 aulas".

Com isso o card fica: linha 1 = nome do aluno + status (badge, canto direito); linha 2 =
"Aulas: 8" (esq.) + "Periodo: ..." (esq.) com o bloco valor/método/✓ (dir.).

Validação runtime (mock `default`, 433×762 DPR 2.81 + 320×568): layout conforme acima nos
dois viewports, sem status duplicado em dois pontos do card. Zero overflow horizontal.
Suíte 77/77 antes/depois.

**Adendo visual à tela de Finanças (mesma sessão, 2026-09-27)**: o dono pediu para o
`<section class="agenda-panel">` do cabeçalho da aba (título "💰 Finanças") ficar com o
visual da topbar da Home — borda superior reta, sem sombra, e (ajuste pedido na sequência)
as duas bordas inferiores arredondadas. Nova classe utilitária `.topbar-sem-cantos` em
`assets/css/style.css` (aplicada via classe adicional no mesmo `<section>`, sem afetar os
outros usos de `.agenda-panel`: vazio da tela e painel de dia da Home):
`border-bottom:1px solid #1f1f1f; border-radius:0;
border-bottom-left-radius:18px; border-bottom-right-radius:18px (raio idêntico ao da
topbar da Home); box-shadow:none; padding:12px` — e, na sequência, igualado à topbar da
Home em comportamento: `position:sticky; top:var(--header-height) (altura do header fixo
medida em runtime pelo bootstrap); z-index:10; background:rgba(12,12,12,0.92);
backdrop-filter:blur(18px)`.

Ajuste de conteúdo do cabeçalho (decisão do dono, mesma sessão): o rótulo de cache
`financasCacheLabel` (canto superior direito) deixava de exibir "Sem cache local" em
repouso — agora só aparece quando existe cache real ("Cache atualizado em ...") ou
quando o `financasSyncState` carrega "Carregando..."/"Salvando..."/erro. `view-financas.js`:
fallthrough de `renderizarCabecalho()` e de `atualizarCabecalhoCache()` trocado de
`'Sem cache local'` para `''`. Com o cabeçalho sticky, um texto fixo de estado neutro ficaria
colado o tempo todo — tratado como ruído visual. Validação runtime (mock `default`, 433×762
DPR 2.81): em repouso as duas linhas do canto direito ficam vazias (só título + subtítulo
visíveis); zero overflow horizontal também em 320×568.

`renderizarCabecalho()` em `assets/js/view-financas.js`: título 1.25rem → 1.125rem para
reduzir a altura. No fechamento do round, o dono pediu
para o subtítulo voltar ao tamanho original por coerência visual da auditoria e ser
reescrito em tom de produto: texto novo `"Ciclo, valor e status de cobrança por aluno."`
(no lugar de "Ciclo vigente por aluno, com leitura cacheada e escrita confirmada pelo
backend."), retomando `font-size:0.875rem; margin:4px 0 0` — o original. Validação
runtime (mock `default`, 433×762 DPR 2.81 e 320×568): computed style confirmado
(`border-radius: 0px 0px 18px 18px; position:sticky; top:68px`); teste de scroll — com
`scrollBy(0,300)` a seção colou exatamente em `top:68px` (o `--header-height`), como a
topbar da Home; subtítulo renderizando 14px, título 18px; zero overflow horizontal em
ambos os viewports.

---

# Cartão C: Card de agenda — revisão do modo compacto existente

## Objetivo (1 frase)
Confirmar se o sistema de densidade visual já existente (`visualDensity`,
`agenda-card-optional`, `agenda-card-mobile-overflow`) cobre bem 320–430px ou se falta ajuste.

## Referência da decisão
Decisão donal 2026-09-27 (entra no escopo). Achado 4.11.

## ⚠️ Decisão pendente (condicional)
Nenhuma decisão de produto bloqueia o **inventário** (passo 1). Mas se o inventário do passo 1
encontrar overflow ou corte ilegível, a abordagem de correção (o que priorizar: nome, local ou
horário; qual campo ocultar primeiro) não deve ser escolhida unilateralmente — voltar ao dono
com o achado concreto e opções antes de implementar qualquer ajuste de CSS/JS.

## Arquivos a tocar
- `assets/js/agenda-card-template.js`
- `assets/css/style.css` (blocos de densidade já existentes, linhas ~1910-2100)

## Passos
1. Inventário em runtime (320×568, 390×844, mock `?mockScenario=agendaLotada`) de cards de
   30min com nome/local longos nos 3 tipos (aula, deslocamento, bloqueio) em modo
   `tight`/`compact`/mobile-overflow.
2. Ajustar CSS/JS **somente se** o inventário encontrar um caso concreto de overflow ou
   informação cortada de forma ilegível — e somente após validar a abordagem com o dono
   (decisão pendente acima). Não alterar preventivamente.

### Inventário (passo 1) — resultado, 2026-09-27

**Método**: mock `?mockScenario=agendaLotada`, modo Dia (grade `#agendaGridHomeHome`),
viewport 320×568 e 390×844 (DPR 2.81). Como o mock `agendaLotada` só expõe 1 compromisso
`uma_vez` por dia (os 6 `semanal` caem no filtro de recorrência sem `tipoRecorrencia`),
injeci cards de teste via o template real `window.criarCardAgendamento` com nome de 33
char ("Aurora Helena de Camargo Monzani"), local objetivo e local longos, nos 3 tipos
(aula/deslocamento/bloqueio), cada um no modo `tight`+`mobile-overflow`+`inlineStatus`
e em `normal`, largura real da grade (≈256px @320, ≈326px @390).

**Achado 1 — sem estouro horizontal.** Nenhum card ultrapassa a largura do container;
zona de overflow horizontal do documento `scrollWidth === clientWidth` nos dois viewports.

**Achado 2 — corte vertical legível por ellipsis (ok).** Nome, local e detalhes usam regra
gênérica (sem prefixo de id, linhas ~1741-1795): `white-space:nowrap; overflow:hidden;
text-overflow:ellipsis`. Texto longo vira `…` sem quebrar o card. Não é defeito.

**Achado 3 — corte vertical de BLOCO em card de 30min (caso concreto).** Cards de 30min
são fixados a 48px na grade (`hourHeight 96` → meia hora = 48px) e têm `overflow:hidden`.
Com nome/local longos, o conteúdo vertical some:

| card (modo tight+overflow) | altura card | scrollHeight real | linha inferior visível? |
| --- | --- | --- | --- |
| aula30 (nome 33ch) | 48px | 141px | ❌ local+detalhes cortados |
| deslocamento30 | 48px | 94px | ❌ descrição cortada |
| bloqueio30 | 48px | 147px | ❌ cortado |
| bloqueio30 (normal) | 48px | 120px | ❌ cortado |

Isto é o "corte ilegível" do achado 4.11: nesses 30min o que o usuário vê é só nome+
horário; local/objetivo/descrição saem do campo visual.

**Achado 4 — causa raiz: o CSS de densidade está inerte por seletor de id errado.**
- O JS (`view-home.js` `analisarDensidadeVisualCardDia` + `criarCardAgendamento`) **funciona**:
  aplica as classes `agenda-card-density-tight`, `agenda-card-mobile-overflow`,
  `agenda-card-inline-status-mode` corretamente.
- Mas **todo** o CSS que consome essas classes está prefixado com `#agendaGridHome`
  (linhas ~1847-2131 do `style.css`). O id da grade de Dia é na verdade
  **`agendaGridHomeHome`** (criado na linha 121 de `view-home.js`). `document.
  getElementById('agendaGridHome')` → `null`.
- Consequência medida: card `tight` tem o **mesmo** `padding` (9px 12px 10px 10px) e o
  **mesmo** gap que um card `normal`; a hora (`agenda-semana-card-time`) que deveria ser
  `display:none` no modo dia segue `display:flex`; `meta` não é ocultado. O sistema de
densidade existe e é calculado, mas **nada dele entra em cena**.
- Origem provável: o id era `agendaGridHome` e virou `agendaGridHomeHome` na unificação da
  animação de troca de período (report `2026-08-28`), sem atualizar o CSS. As regras de
  Semana (grade `calendarioSemanalHomeGrid`) nunca usaram `.agenda-card-dayview` (0 cards da
  semana têm essa classe), então o impacto de reativar o CSS é restrito ao modo Dia da Home.

**Decisão pendente (bloqueia o passo 2)** — **RESOLVIDA em 2026-09-27 via
`vscode_askQuestions`: opção (A) Corrigir seletor**: o inventário encontrou caso concreto,
e a abordagem de correção é de impacto visual — opções dadas ao dono:
- **(A)** Corrigir o seletor: `#agendaGridHome` → `#agendaGridHomeHome` (reativa o sistema
  de densidade já escrito e testado em JS). Menor diff; devolve o comportamento original de
  30min (linha inferior esconde, badge inline, padding menor). ← **escolhida**
- **(B)** Deixar como está e tratar o corte vertical de 30min como aceitável (o conteúdo
  completo continua disponível abrindo o card no modal de ação do slot).
- **(C)** Outra abordagem (ex.: permitir 2 linhas em 30min com o card crescer, ou reduzir
  tipografia agressivamente no modo Dia).

### Registro do Cartão C (2026-09-27)

- **Decisão fechada** (via `vscode_askQuestions`): **(A) Corrigir seletor**.
- **Arquivos alterados**:
  - `assets/css/style.css` — 52 seletores no bloco de densidade do
    modo Dia (linhas ~1847-2127) corrigidos de `#agendaGridHome` para `#agendaGridHomeHome`
    (o id real da grade, criado na linha 121 de `view-home.js`). `git diff --stat`: 52
    inserções / 52 deleções, todos contendo `.agenda-card-dayview` — sem impacto na grade
    semanal (`calendarioSemanalHomeGrid`), que não usa essa classe.
  - `mocks/ui-runtime/scenarios.js` — novo cenário demonstrativo
    `densidadeAgenda` (aberto com `?mockScenario=densidadeAgenda`), pedido do dono para
    "desenhar" o resumo dentro do app: um card tight de 30min (nome de 33 chars + local
    longo), um normal de 60min de contraste, um deslocamento tight de 30min e um
    bloqueio Google de 90min (que pousa em compact) — todos na data atual para a Home
    renderizar sem navegação. Legenda comentada no próprio cenário.
- **Validação runtime** (mock `agendaLotada`, modo Dia, quinta-feira 24/09, probe
  `window.criarCardAgendamento` com nome de 33 chars + `visualContext: 'calendar-day'`):
  - 433×762 DPR 2.81: card `normal` mantem `padding 9px 12px 10px 10px`, gap 5px;
    `compact` com `padding 7px 9px`, gap 4px; `tight` com `padding 6px 8px`, gap 3px —
    sistema de densidade **ativo** (antes do fix os 3 tinham o mesmo padding/gap);
    hora (`agenda-semana-card-time`) `display:none` em todos os 3 (antes: `flex` em
    todos); no card de 30min `tight` o bloco inferior (`.agenda-semana-card-bottom`)
    fica cortado (`corteVertical30: false`) por design — o card mostra só a linha do
    nome+local no modo Dia.
  - Stress 320×568 e 390×844 (mesma injeção): `tight` mantém `padding 6px 8px`, `hora
    none`, e o nome longo estoura só com ellipsis (`nomeEstoura: true` → `text-overflow:
    ellipsis` da regra genérica) — sem quebrar o card. Zero overflow horizontal do
    documento nos 3 viewports (`scrollWidth === clientWidth`).
  - Screenshot em 433×762 com os 2 probes lado a lado (tight vs normal) anexada na
    conversa do dono.
- **Suíte `tests-frontend/`**: 77/77 antes → 77/77 depois (a mudança é CSS de seletores;
  nenhum teste frontend consome a regra de seletor, então o número igual é esperável —
  registrado conforme a política de "reportar os números medidos").
- **O que foi encontrado e NÃO alterado** (reportado ao dono):
  1. `assets/js/view-home.js:312` — `renderizarAgendaDia(gridId)` ainda tem fallback do
     id morto `gridId || "agendaGridHome"`; o único caller (linha 172) passa
     `'agendaGridHomeHome'`, então o fallback nunca dispara. Deixou-se como está (fora
     de escopo do cartão; tocar é risco de mudança de comportamento).
  2. O mock `agendaLotada` só renderiza o compromisso `uma_vez` (bg7) em modo Dia; os 6
     `semanal` do mock falham em `checarCompromissoNaData` por falta de
     `tipoRecorrencia`/`diasSemana` — a injeção via `criarCardAgendamento` cobre o gap
     de teste e não foi tratada como defeito (é limitação do mock, não do app).
  3. As classes base `.agenda-semana-card` (linhas ~1670, `padding: 9px 12px 10px 10px`)
     servem a Semana **e** a Dia; o bloco corrigido é o de id prefixado, então a Semana
     segue com o padding base de 9px 12px — comportamento original, não alterado.
  4. **Descoberto no fechamento (situado em 2026-09-27, tarde)**:
     `_static-server.tmp.js` (servidor estático local usado para validação) havia sido
     incluído **por engano no commit `03be767` (já está em `origin/feat/etapa-4-densidade-cards`)**.
     Na tarde de 27/09 precisei recriá-lo para servir o cenário `densidadeAgenda`, então a
     working tree o mostra como `M` (recriado, versão ligeiramente diferente da commitada).
     **Pendente com o dono**: decidir se a próxima leva de commits dele remove o arquivo
     do git (e/ou adiciona `.gitignore`) — o dono é que comite/pusha, não o agente.


## Fora de escopo (não fazer)
- Badges de tipo (recorrente/único/reposição).
- Lógica de detecção de conflito (`agenda-conflitos.js`).

## Validação obrigatória (Playwright)
- 320×568 e 390×844, mock `agendaLotada`: screenshots/medição de overflow em cards de 30min com
  textos longos.
- `node --test` em `tests-frontend/` antes/depois.

## Critério de aceite (checklist binário)
- [x] Inventário documentado (achados e decisão de ajustar ou não)
- [x] Se ajustado: zero overflow/corte ilegível nos casos encontrados
- [x] Suíte frontend passa (registrar contagem antes/depois)
- [x] Nenhuma regra de negócio alterada

## Commit sugerido
`fix(agenda): ajustar densidade de cards em casos de overflow encontrados` (se houver ajuste) ou
sem commit de código (se o inventário confirmar que já está adequado).

---

# Cartão D: Card de agenda — reorganização da distribuição (ícones + linha objetivo)

## Objetivo (1 frase)
Reduzir a disputa de espaço nos cards de agenda (Dia **e** Semana) transformando os badges
de texto em ícones e compactando a linha de objetivo ("Personal Trainer"), que mede hoje
o mesmo valor em ~todos os cards e empurra os badges do nome e do horário.

## Referência da decisão
Decisão donal 2026-09-27 (opção **B** — "Reorganizar card (ícones + remover 'Personal
Trainer')", levantada após o dono avaliar o Cartão C e achar a distribuição "meio ruim
quando fica muito longo" nas duas visões). Fornece contexto externo de referência
(Google Calendar/Notion Calendar/Apple Calendar: grade = essencial, detalhe a 1 toque).
Branch: dono optou por **continuar em `feat/etapa-4-densidade-cards`** (sobrepondo ao C).

## ⚠️ Decisões pendentes (bloqueiam o passo 1) — **fechadas em 2026-09-27** via
`vscode_askQuestions`
1. **Formato do badge**: **manter os ícones atuais e só cortar o texto** — o texto antigo
   vai para `aria-label`/`title` do span (`role="img"`).
2. **Linha de objetivo**: **mostrar só `Consultoria Online`** — desaparece quando o
   objetivo é `Personal Trainer` (o caso ~universal).
3. **Escopo de tipos**: **todos** — aula, deslocamento e bloqueio (interno + Google).

**Decisões originais (já respondidas acima)**:
1. **Ícones dos badges** — candidatos por tipo (o dono escolhe o conjunto):
   - Recorrente: `∞` (já usado no badge atual) ou `🔄`/seta circular.
   - Único: `📌`/alfinete (já usado no badge atual) ou ponto/sólido.
   - Reposição: `↻` (arrow-rotate, já no badge atual).
   - Trânsito (deslocamento): `🚗` (auto-side, já usado).  
   - Bloqueio interno: `🔒`/chave. Bloqueio Google: `G` (brands/google, já usado).
   Alternativa: manter **o ícone que cada badge já tem** e só cortar o texto (diff mínimo —
   o template já renderiza `<i>` + texto em cada badge; é só tirar o texto e adicionar
   `aria-label`/`title` no ícone).
2. **Linha de objetivo** — `"Personal Trainer"` / `"Consultoria Online"` (normalizadas em
   `alunos-helpers.js:13`, só existem esses 2 valores na prática): remover do card por
   completo? Reduzir a um ícone/abreviação? Ou manter só quando `Consultoria Online`
   (o único caso com conteúdo discriminativo)?
3. **Escopo por tipo** — a mudança vale só para o card de **aula** ou também para
   **deslocamento** e **bloqueio** (que têm seus próprios badges "Trânsito"/"Bloqueado"/
   "Google Agenda")?

**Arquivos a tocar**
- `assets/js/agenda-card-template.js` (templates dos 3 tipos + `BADGE_STYLES`)
- `assets/css/style.css` (estilo de badge só-ícone, se a decisão 1 exigir)

**Passos**
1. Fechar as 3 decisões pendentes acima com o dono.
2. Implementar no template (aula, depois os demais tipos conforme decisão 3): badge vira
   bloco só-ícone com `title`/`aria-label` descrevendo; linha de objetivo conforme decisão 2.
3. Preservar os atributos que os modais/leitura usam (classes `agenda-card-optional`,
   `agenda-card-status-badge`, `badge-tag-tipo*`) para o CSS de densidade do Cartão C
   continuar valendo — nenhum seletor morto novo.

**Fora de escopo (não fazer)**
- Regras de negócio (recorrência, conflito, reposição, financeiro).
- Card de Aluno / card de Finanças (já tratados nos Cartões A e B).
- A lista-vs-grade do modo Dia (sugestão A, registrada como evolução futura).

**Validação obrigatória (Playwright)**
- 433×762 (primário) + 320×568/390×844, mocks `densidadeAgenda`, `agendaLotada` e
  `default`: badge só-ícone legível (target de toque ≥ o que já existe, tooltip com o
  texto antigo), linha objetivo conforme decisão, modo tight do Cartão C continua
  aplicável, zero overflow horizontal.
- `node --test` em `tests-frontend/` antes/depois (registrar contagem).

**Critério de aceite (checklist binário)**
- [x] Decisões pendentes fechadas com o dono
- [x] Badge em modo só-ícone com o texto preservado em `title`/`aria-label`
- [x] Linha objetivo trata conforme decisão 2
- [x] CSS de densidade do Cartão C continua valendo (classes intactas)
- [x] Zero overflow horizontal nos 3 viewports
- [x] Suíte frontend passa (registrar contagem antes/depois)
- [x] Nenhuma regra de negócio alterada

**Commit sugerido**
`feat(agenda): reorganizar distribuicao do card com badges em icone`

---

## Registro de execução

| Cartão | Status | Commit do dono | Contagem antes → depois |
| --- | --- | --- | --- |
| 0 (este relatório) | ✅ criado 2026-09-27 | — | — |
| A (card Aluno) | ✅ concluído 2026-09-27 | `84c739f` | frontend 77/77 → 77/77 |
| B (card Finanças) | ✅ concluído 2026-09-27 | `03be767` | frontend 77/77 → 77/77 |
| C (card agenda) | ✅ concluído 2026-09-27 | (aguardando commit do dono) | frontend 77/77 → 77/77 |
| D (reorganização card) | ✅ concluído 2026-09-27 | (aguardando commit do dono) | frontend 77/77 → 77/77 |

### Registro do Cartão D (2026-09-27)

- **Decisões fechadas** (via `vscode_askQuestions`): ver seção de decisões do cartão.
- **Arquivos alterados**: `assets/js/agenda-card-template.js`
  — em todos os 5 pontos de badge (recorrente/único/reposição da aula, deslocamento,
  bloqueio interno, bloqueio Google, badge de aluno inativo): texto cortado,
  `role="img"` + `aria-label`/`title` com o texto original, `aria-hidden` no `<i>`;
  o ícone de cada badge foi mantido (∞, 📌, ↻, 🚗, 🔒, G). O badge de bloqueia mantém
  a distinção do rótulo em `aria-label`/`title` ("Bloqueio" vs. "Bloqueio dia inteiro"),
  que continua visível no card pelo texto local. A linha `agenda-dia-aula-detalhes`
  (objetivo) do card de aula só é renderizada quando `objetivo === 'Consultoria Online'`
  (decisão D-2). Nenhuma classe tocada — `agenda-card-optional`, `agenda-card-status-badge`
  e `badge-tag-tipo*` seguem exatamente como antes.
- **Validação runtime** (mock `densidadeAgenda`, 433×762 DPR 2.81 via CDP, abas Dia e Semana):
  - Dia: os 4 cards renderizam com badge `textContent` vazio + `aria-label` correto
    ("Único", "Único", "Trânsito", "Google Agenda"); nenhum card de aula mostra a
    linha "Personal Trainer" (Aurora e Bruna têm `objetivo` Recuperação/Força);
    densidades do Cartão C intactas (tight 48px, normal 96px, compact 144px).
  - Semana: cards de 27/09 viram "img" no snapshot de acessibilidade com os mesmos
    labels; "Personal Trainer" absente (medido via `!card.textContent.includes`).
  - Stress 320×568 e 390×844 (mesma aba Dia): 4 cards nos dois, todos os badges em
    modo só-ícone, zero overflow horizontal nos 3 viewports.
- **Suíte `tests-frontend/`**: 77/77 antes → 77/77 depois. Nenhum teste consome
  `agenda-card-template.js` (confirmado em busca na suíte), então o número igual é o
  esperado — registrado conforme a política de reportar os números medidos.
- **O que foi encontrado e NÃO alterado** (reportado ao dono):
  1. A normalização `objetivo → 'Personal Trainer' / 'Consultoria Online'` acontece em
     3 pontos (`alunos-helpers.js`, `view-alunos.js`, `storage.js` na migração) — não é
     do cartão; a mudança só afetou a renderização do card de agenda.
  2. O card de bloqueio Google (externo) continua sem `onclick` por design (somente
     leitura) — não alterado.

### Refinamento do Cartão D (2026-09-27, pedido do dono após revisão)

**Pedido (verbatim)**: "Na tela de dia, os ícones ficaram desalinhados em tamanhos
diferentes de card. Além disso, achei que ficou feio os ícones todos da mesma cor, tem
como fazer algo visual que fique interessante? E nesse mock que você criou tem como
criar um card simulando uma aula recorrente, para vermos o formato também?"

**Diagnóstico medido (433×762)**: o desalinhamento era estrutural — o badge ficava na
linha do título em card tight (modo inline) e na meta inferior nos demais chips;
posições do ícone relativas ao topo do card: 7 / 29 / 30 / 34 px. E a cor "toda igual"
no mock era consequência: só existiam aulas `uma_vez` (📌 verde) + deslocamento
(🚗 verde); não havia `semanal` para mostrar o ∞ dourado.

**Decisão D-4 (via `vscode_askQuestions`, 2026-09-27)**: o badge de ícone aparece
**só em AULA** (Único 📌, Recorrente ∞, Reposição ↻) — deslocamento e bloqueio
(interno/Google) ficam sem chip, porque o ícone do tipo já abre o título do card
(carro/cadeado/G) + a cor/borda esquerda já identifica; o chip deles era duplicação
literal.

**Mudanças implementadas**
- **Âncora do chip por visão (estado final após D-5)**: no **Dia** o chip fica na
  linha do título; na **Semana** no **canto inferior direito** (meta do rodapé,
  `margin-left:auto`) — decisão do dono ("fixo no canto inferior direito").
  `agenda-card-template.js` removeu o mecanismo `distribuirBadgeStatusPorModo`/
  `visualInlineStatusBadge` e a classe `agenda-card-inline-status-mode`; o wrapper
  `.agenda-card-inline-status` passa a ser renderizado nos dois lugares (título e
  meta) e a CSS decide a visibilidade por contexto. Deslocamento/bloqueio/Google
  não rendem chip.
- **Visual do chip (estado final após D-6)**: caixa fixa 20×20 px, `border-radius:
  6px`, **só fundo translúcido por tipo, sem borda** — decisão do dono ("clean,
  como era antes, só o fundo"). Fonte de cor continua `BADGE_STYLES` (reduzido a
  `recorrente`/`unico` + reposição por classe `--reposicao`, que mantém a
  tracejada pré-existente, fora do escopo do pedido).
- **nowrap no `title-group` do modo Dia**: com o nome largo (Aurora, 33 chars), o
  `flex-wrap: wrap` herdado empurrava o chip para a 2ª linha do topo e a linha do
  topo estourava para 45 px num card de 48 px; com `nowrap` (só Dia — Semana mantém
  wrap) o nome cede espaço com ellipsis e o chip fica na linha do título. Bônus: em
  tight agora cabe a linha de baixo (local) que antes era recortada.
- **CSS morto removido**: regras do "modo" inline-status-mode (exibição condicional,
  title-group width:100%, nome flex 1 1 auto) e a regra de overflow mobile que
  escondia `.agenda-card-optional` no título (o chip é essencial e voltou a ficar
  visível em card tight de nome largo).
- **Mock `densidadeAgenda`**: novo item `dg4` — aula **semanal** da Bruna, 14:00–15:00,
  `recorrenciaDataInicio: '2026-09-20'` (domingo anterior), `diasSemana: ['Domingo']`,
  `recorrenciaEscopo: 'fromDate'`, `intervaloRecorrencia: 1` (mesmo padrão do `ag1` do
  cenário `default`). Densidade normal (96 px); ∞ dourado ao lado do 📌 verde da aula
  única 09:00 da mesma aluna. `totalSemana: 3 → 4` e legenda atualizada.

**Validação (números medidos)**
- 433×762 dia: 5 cards; chips 20×20 com borda por tipo; `chipTopRelCard` 7–10 px em
  todos (mesma linha estrutural; a variação 7↔10 é o padding do card, não o chip);
  tight 48 px voltou a exibir o local (Aurora: nome truncado com `…`, chip no topo).
- Semana (faixa 21/09–27/09): só domingo 27/09 traz cards (5), 3 chips
  (Único/Único/Recorrente), zero overflow. A recorrência do item novo foi validada
  pela função compartilhada `checarCompromissoNaData` (o mesmo caminho do
  `renderer`), chamada no browser com o comp do mock: `false` antes do início
  (09-13), `true` no domingo de início (09-20) e em todo domingo — 09-27, 10-04,
  10-11 —, `false` em dia que não é domingo (09-26, 10-05). (A navegação de semana
  da UI não respondeu em modo leitura do mock; verificado pela função, não por clique.)
- Stress 320×568 e 390×844: 5 cards, chips alinhados, `scrollWidth === clientWidth`
  (320/320, 390/390).
- `tests-frontend`: 77/77 antes → 77/77 depois.
- Zero erro de lint nos 3 arquivos.

**O que foi encontrado e NÃO alterado**
1. `view-home.js:446-483,671` — `usarBadgeInlineNoTitulo`, `REGRAS_VISUAIS_CARD_DIA.
   limiteTituloInlineStatus` e o parâmetro `visualInlineStatusBadge` (a linha 671)
   agora são **código morto inofensivo** (o template ignora a flag; o campo do objeto
   `analisarDensidadeVisualCardDia` continua alimentado). Não removi: é a única lógica
   de densidade que ficou órfã e a remoção mexeria na função de análise do Cartão C.
   Candidato natural ao próximo item de cleanup.
2. `_static-server.tmp.js` continua tracked (ver registro do Cartão C, item 4).
3. A classe `.badge-tag-tipo--reposicao` (dourada **tracejada**) é design
   pré-existente e compartilhada — mantida intacta; o mock atual não tem card de
   reposição, então não há como vê-la no cenário.

### Refinamento 2 do Cartão D (2026-09-27, após review dos screenshots)

**Pedidos (verbatim)**: "Na tela da Semana eu achei feio como ficou, não gostei que o
emoji fique do lado do nome, prefiro ele fixo no canto inferior direito, com margem da
direita para a esquerda, pode ser?" e "não gosto dessa borda forte que tem envolta dos
emojis, quero algo mais clean, como era antes, só o 'fundo' sem a borda".

**Decisões D-5 e D-6**: (D-5) na **Semana** o chip fica no canto inferior direito;
(D-6) chip sem borda, **só o fundo translúcido** (o visual do Cartão D original), com
opacidade levemente aumentada (0.15 → 0.18) para o fundo continuar perceptível sem a
borda. No Refinamento 2 o chip do Dia seguiu na linha do título colado ao nome — essa
posição foi revisada em seguida (D-7, ver Refinamento 3).

**Mudanças**
- `style.css`: wrapper `.agenda-card-inline-status` volta a `display:none` por
  padrão; regra `#agendaGridHomeHome .agenda-card-dayview .agenda-card-inline-status`
  o exibe na linha do título no Dia (com `margin-left: 8px`); regra
  `.agenda-semana-card-meta .agenda-card-inline-status` o exibe no rodapé (canto
  inferior direito via `margin-left:auto`) na Semana.
- `agenda-card-template.js`: o chip de aula é renderizado nos dois lugares (título
  SEMPRE + meta quando não há `visualContext` = Semana), sempre envolvido no mesmo
  wrapper (garante a caixa 20×20 unificada); `BADGE_STYLES` ficou sem `border` e
  com `background: rgba(..., 0.18)`.

**Validação (números medidos, 433×762 DPR 2.81)**
- Semana: 3 chips na meta do domingo 27/09 (Único/Único/Recorrente), **20×20**
  (caixa unificada via wrapper), `borderTopWidth: 0px none`, fundo translúcido por
  tipo; distância à borda direita do card ≈ 13 px, à esquerda ≈ 335–341 px — canto
  inferior direito confirmado. Zero overflow.
- Dia: 3 chips na linha do título (7–10 px do topo), 20×20, sem borda, mesmo
  fundo. Zero overflow.
- `tests-frontend`: 77/77 antes → 77/77 depois. Zero erro de lint.

### Refinamento 3 do Cartão D (2026-09-27, após review do screenshot do Ref. 2)

**Pedido (verbatim)**: "na visão por dia, da pra gente deixar os chips no canto
superior direito? com margem da direita para a esquerda. Mesmo 'padrão' da visão por
semana, mas como não tem a hora, podemos deixar no canto superior direito. Quero que
pelo menos essas informações sigam esse padrão de estar sempre do lado direito dos
cards, sabe?"

**Decisão D-7 (padrão lateral unificado)**: o chip de status fica **sempre lateral à
direita** do card — **canto superior direito no Dia** (linha do título; o
`title-group` opera a largura total via `flex: 1 1 auto`), **canto inferior direito na
Semana** (meta do rodapé). Mudança mínima: removi só o `margin-left: 8px` que o
mantinha colado ao nome no Dia; o `margin-left: auto` do wrapper (já presente) faz o
empurrão para a direita. `style.css` foi o único arquivo alterado — template, densidade
e caixa 20×20 intactos.

**Validação (números medidos, 433×762 DPR 2.81)**
- Dia: 3 chips no canto superior direito (7–10 px do topo; 9–13 px da borda direita
  = o padding do card; 230–234 px da esquerda). Zero overflow.
- Semana (regressão): 3 chips no canto inferior direito, 20×20, 13 px da borda
  direita — idêntico ao Ref. 2. Zero overflow.
- `tests-frontend`: 77/77 antes → 77/77 depois. Zero erro de lint.

### Refinamento 4 do Cartão D (2026-09-27 — âncora absoluta + ellipsis do nome)

**Pergunta do dono que motivou**: "Por que quando colocamos o card do lado direito
superior na visão de dia, ele fica desalinhado dependendo do tamanho do nome?"
Diagnóstico medido: não era bug de ancoragem — o chip flutuava dentro do padding do
card, e o padding muda com a densidade (tight/compact `6px 8px` vs. normal
`9px 12px`, fix do Cartão C); como nome/duração longos são gatilhos de densidade, o
nome "dirigia" indiretamente o offset do chip (delta 2–4 px visível).

**Decisão D-8 (opção B)**: chip em **âncora absoluta** (`position:absolute;
top/right: 8px`) — distância FIXA da borda em qualquer densidade; nome mantém
ellipsis (`…` já existe na classe `agenda-dia-aula-nome`), com `:has(>
.agenda-card-inline-status)` reduzindo o `max-width` do nome em 28px (20px do chip +
8px de respiro) para o truncamento terminar antes dele. Dono: nomes muito longos são
raros; o nome completo permanece acessível clicando no card. Risco declarado:
`:has()` requer Chromium 105+ — alvo do PWA; sem suporte o nome segue
comportamento do Ref. 3 (degradação, não quebra).

**Mudança**: só `style.css` (2 regras: wrapper absoluto + `:has()` no nome).
Template JS e densidade intactos.

**Validação (números medidos, 433×762 DPR 2.81)**
- Dia: 3 chips, **`top/right` 9/9 px em TODOS** (tight, normal, normal — era
  7/9 e 10/13 no Ref. 3); zero overflow.
- Aurora (tight, nome longo): nome com ellipsis ativo termina em x=343, chip
  começa em x=351 — **zero sobreposição** (8 px de respiro).
- Bruna (normal, nome curto): sem ellipsis, chip idêntico (9/9).
- Semana inalterada (in-flow, Ref. 2).
- `tests-frontend`: 77/77 antes → 77/77 depois. Zero erro de lint.

### Refinamento 5 do Cartão D (2026-09-27 — corte do nome com padrão fixo)

**Pedido (verbatim)**: "Nao sei se deu muito certo a questão do '...' pode
avaliar? Acho que podemos criar esse padrão no nome tanto para os cards da semana
quando for dias. Podemos deixar para ele 'cortar' o nome com um padrão fixo ou coisa
do tipo. Um considerando o tamanho do horário na aba semana e outro considerando só o
chip na aba dia. Se averiguar na aba dia o '...' nao aparece antes do chip e na aba
semana o horário acaba 'descendo' para uma linha nova. Ambos comportamento na Aurora"

**Diagnóstico medido** (antes da mudança):
1. **O "…" não renderizava no Dia** (nem no nome): a classe do nome era `display:
   flex` (ícone + texto como filhos) — `text-overflow: ellipsis` **só pinta
   reticências quando o texto é conteúdo direto do elemento** (single-line); em
   flexbox o CSS corta na borda mas nunca desenha o "…". Medido: `cortePx: 49`
   sem reticências.
2. **O horário descia na Semana**: o "top" do card tem `flex-wrap: wrap`; em
   container com wrap o flex item **não encolhe**, quebra para a linha
   seguinte em vez disso — por isso minha regra de shrink no nome (Ref. 4)
   nunca executou e o horário caía para a 2ª linha.

**Decisão D-9 (padrão fixo de corte do nome, as duas abas)**:
- **Template**: nome vira **elemento único** (bloco, não flex) em todos os 4
  ramos do card (aula, deslocamento, bloqueio externo, bloqueio interno):
  `<span class="agenda-dia-aula-nome"><i>…</i><span
  class="agenda-dia-aula-nome-texto">NOME</span></span>` — o "…" passa a
  renderizar de verdade (ícone fica fora do texto, via `margin-right: 6px` no
  `i`).
- **Dia**: nome cede exatamente **28px** (chip 20px + respiro 8px) em **todos**
  os cards do Dia, com **ou sem** chip (`max-width: calc(100% - 28px)`) — corte
  determinístico; a regra `:has()` do Ref. 4 foi **removida** (dispensada e o
  risco de Chromium 105+ cai do registro).
- **Semana**: nome tem **`flex: 1 1 56px; min-width: 80px`** → largura =
  largura do top − horário (`flex: 0 0 auto`, nunca encolhe, nunca quebra
  linha) − gap. O horário **nunca** desce mais: `nowrap` no
  `#calendarioSemanalHomeGrid .agenda-semana-card-top` (escopo só do grid da
  semana da home; o Dia já era nowrap). `max-width: 100%` como guarda.
- Nome completo continua acessível via card/modal (D-8).

**Mudanças**:
- `assets/js/agenda-card-template.js` — 4 ramos reestruturados (bloco + span
  interno).
- `assets/css/style.css` — `display: block` no nome + `margin-right` no `i`;
  `flex: 0 0 auto` no horário; `flex: 1 1 56px; min-width: 80px` no nome (semana);
  `max-width: calc(100% - 28px)` no nome (dia); `:has()` removida; novo
  `#calendarioSemanalHomeGrid .agenda-semana-card-top { flex-wrap: nowrap; }`.

**Validação (números medidos, 433×762 DPR 2.81, mock `densidadeAgenda`)**
- **Dia**: chips `top/right` 9/9 nos 3 cards (tight + normal); Aurora (tight,
  33 chars) nome corta em 49px com "…" visível no screenshot, fim do nome x=343
  / chip x=351 → zero sobreposição. Zero overflow.
- **Semana**: 5 cards, horário **na MESMA linha** do nome em todos (era
  `horaMesmaLinha: false` para Aurora, agora `true`); Aurora nome 253px com
  corte de 10px (determinístico: 253+8+89 ≤ 350); gap nome↔hora 8px. Zero
  overflow.
- **Stress 320×568 e 390×844** (CDP, DPR 2.81): semana e Dia sem overflow;
  horário na mesma linha em todos; Aurora corta progressivamente (109/39px
  semana; 152/82px dia) sem sobrepor o chip.
- `tests-frontend`: 77/77 antes → 77/77 depois. Zero erro de lint.

**Riscos declarados**:
- `nowrap` no top da semana em card muito apertado pode "vazar" o horário para
  fora da borda do card (o nome cede até 80px e para — depois disso não há
  mais que ceder). Na prática o mínimo prático é o nome de 80px ≈ ~10
  caracteres, bem abaixo do real; nenhum card do mock chega perto.
- O `span` interno não tem `aria-hidden` — o texto é o único que importa para
  leitores de tela; o `title` segue no `i`/badge.

### Ajuste complementar — FAB não cobre o último dia da Semana (2026-09-27, pedido do dono)

**Pedido (verbatim)**: "No final da aba semana o FAB fica em cima do ultimo dia da
semana, no caso 'Domingo' tem como colocarmos um espaço no final que faça com que o
FAB não fique em cima do texto? ... no nosso mock ele está cobrindo parte das
informações do card da Bruna"

**Causa (medida)**: o FAB é `position: fixed` (banda y 627–685 do viewport, coluna
x 350–408) e a página inteira é que rola (todos os containers `overflow: visible`).
No scroll máximo, a linha do Domingo terminava em y 666 — **39px dentro da faixa do
FAB** — e o chip 📌 da última Bruna (x 372) ficava sob ele.

**Mudança**: `assets/css/style.css` — `padding-bottom: 48px` em
`.agenda-panel-semana` (só a aba Semana). O Dia não ganhou espaço: a grade termina
às 22h sem conteúdo útil no fim, então o padding só aumentaria o scroll.

**Validação (números medidos, 433×762 DPR 2.81, no scroll máximo)**
- Domingo termina em y 614; topo do FAB em 627 → **sobreposição 0**, respiro 13px.
- Chip 📌 da última Bruna: **fora da coluna do FAB** (`chipSobFab: false`).
- Zero overflow horizontal; Dia inalterado. `tests-frontend`: 77/77 antes → 77/77.

**Risco declarado**: 13px de respiro é o mínimo que a altura do FAB (58px) +
safe area da bottombar deixam com 48px de padding. A correção cobre o conteúdo
atual e qualquer semana com pouco conteúdo após o último compromisso; se a semana
crescer mais 2–3 cards, o respiro encolhe de novo (não há como prever o conteúdo
futuro sem um valor maior, que custaria scroll a toa).

### Registro do Cartão A (2026-09-27)

- **Decisão pendente fechada**: rótulo do `<summary>` = **"Ver detalhes"** (via
  `vscode_askQuestions`).
- **Arquivos alterados**: `assets/js/view-alunos.js` (template do card em
  `renderizarListaAlunos` — local, cobrança, vencimento e observações movidos para dentro de um
  `<details class="aluno-card-detalhes">`); `assets/css/style.css` (`margin-top: 8px` adicionado
  a `.aluno-card-observacoes`, que antes herdava o espaçamento do container pai removido).
- **Bug encontrado e corrigido durante a validação runtime**: o clique no `<summary>` propagava
  para o `onclick="prepararEdicaoAluno(...)"` do card pai, abrindo o modal de edição ao mesmo
  tempo que expandia o `<details>`. Corrigido com `onclick="event.stopPropagation();"` no
  `<details>`, mesmo padrão já usado no toggle de status do card.
- **Validação runtime** (mock `alunosEmAtraso`, 433×762 via clique real + 320×568 via CDP com
  DPR 2.81 + touch): card fechado mostra só nome/objetivo/contrato/status/caixinhas; clique em
  "Ver detalhes" expande sem abrir o modal de edição; `scrollWidth === clientWidth === 320`
  (zero overflow); caixinhas de indicador inalteradas.
- Suíte `tests-frontend/`: 77/77 antes → 77/77 depois.

**Adendo (mesma sessão, 2026-09-27)**: durante a revisão desta tela, o dono identificou uma
redundância adicional não coberta pelos achados originais da auditoria — a caixinha
"Ciclo atual: R$ X · status" (`montarCaixinhaFinanceiraAluno`) duplicava informação já presente
no card do aluno na tela de Finanças (valor, status, período), que o Cartão B desta mesma etapa
mantém como foco central. Decisão do dono: resolver junto no Cartão A.
- `assets/js/view-alunos.js`: `montarCaixinhaFinanceiraAluno` manteve só o alerta
  "⚠️ Configurar cobrança" (quando o vencimento não está definido); o bloco de resumo de
  valor/status/período do ciclo foi removido. Função `formatarDataCurtaAluno` removida por
  ficar sem uso após a mudança (só existia para formatar o período dessa caixinha).
- Validação runtime (mock `default`, 320×568 via CDP): a caixinha de alerta "Configurar
  cobrança" continua aparecendo (caso "Carlos Mendes"); os demais alunos ficam só com a
  caixinha de Reposições (e a de consistência de agenda, quando aplicável); zero overflow
  (`scrollWidth === clientWidth === 320`).
- Suíte `tests-frontend/`: 77/77 antes → 77/77 depois (medido de novo após o adendo).
