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

## Fora de escopo (não fazer)
- Badges de tipo (recorrente/único/reposição).
- Lógica de detecção de conflito (`agenda-conflitos.js`).

## Validação obrigatória (Playwright)
- 320×568 e 390×844, mock `agendaLotada`: screenshots/medição de overflow em cards de 30min com
  textos longos.
- `node --test` em `tests-frontend/` antes/depois.

## Critério de aceite (checklist binário)
- [ ] Inventário documentado (achados e decisão de ajustar ou não)
- [ ] Se ajustado: zero overflow/corte ilegível nos casos encontrados
- [ ] Suíte frontend passa (registrar contagem antes/depois)
- [ ] Nenhuma regra de negócio alterada

## Commit sugerido
`fix(agenda): ajustar densidade de cards em casos de overflow encontrados` (se houver ajuste) ou
sem commit de código (se o inventário confirmar que já está adequado).

---

## Registro de execução

| Cartão | Status | Commit do dono | Contagem antes → depois |
| --- | --- | --- | --- |
| 0 (este relatório) | ✅ criado 2026-09-27 | — | — |
| A (card Aluno) | ✅ concluído 2026-09-27 | `84c739f` | frontend 77/77 → 77/77 |
| B (card Finanças) | ✅ concluído 2026-09-27 | (aguardando commit do dono) | frontend 77/77 → 77/77 |
| C (card agenda) | ⏳ pendente | — | — |

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
