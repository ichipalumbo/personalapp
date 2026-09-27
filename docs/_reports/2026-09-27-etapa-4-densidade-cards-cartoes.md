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

## ⚠️ Decisões pendentes (bloqueiam o início deste cartão)
1. **Rótulo do `<details>`**: "Ver extrato do ciclo" foi escrito para uma lista só de
   lançamentos financeiros. Com período + método adicionados, o rótulo pode ficar impreciso
   (ex.: "Ver ciclo e extrato", "Ver detalhes do ciclo", ou manter o atual). Não decidir
   unilateralmente — perguntar ao dono antes de implementar.
2. **Formato de exibição de período + método dentro do extrato**: não foi decidido se entram
   como uma linha de resumo no topo do `<details>` (ex.: texto simples), como um mini-grid
   igual ao que existe hoje no card principal, ou de outra forma. Perguntar ao dono com opções
   concretas antes de implementar — impacta o CSS a escrever.

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
| A (card Aluno) | ⏳ pendente | — | — |
| B (card Finanças) | ⏳ pendente | — | — |
| C (card agenda) | ⏳ pendente | — | — |
