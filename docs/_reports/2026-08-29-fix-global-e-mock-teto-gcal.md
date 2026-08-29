# Rodada C — correção da fuga global e do mock placebo do teto GCal

## 1) Portão de base (saída literal)

```text
Get-Location
E:\Projetos\GIT\personalapp

git rev-parse --abbrev-ref HEAD
fix/duplicata-edicao-serie-gcal

git status --short
 M backend/src/controllers/agendamentoController.js
 M backend/test/gcal-duplicata-fix.test.js
 M backend/test/gcal-sync.test.js
 M docs/specs/gcal-sync.md
?? docs/_reports/2026-08-29-fix-select-teto-e-spec-gcal.md

Select-String -Path 'backend\src\controllers\agendamentoController.js' -Pattern 'agendamentoAtual'
      let agendamentoAtual = await (consulta && typeof consulta.lean === 'function'
      const tentativasAtuais = Number(agendamentoAtual && agendamentoAtual[GCAL_SYNC_PENDING_ATTEMPTS_FIELD]) || 0;

Select-String -Path 'backend\src\controllers\agendamentoController.js' -Pattern 'use strict'

Select-String -Path 'docs\specs\gcal-sync.md' -Pattern 'Fora de Escopo'
# nenhuma saída

Select-String -Path 'assets\js\storage.js' -Pattern 'log\.grupo'
        if (window.log && typeof window.log.grupo === 'function') {
            window.log.grupo('[storage] Detalhe de aulas carregadas no frontend', () => {

Test-Path 'docs\_reports\2026-08-29-fix-global-e-mock-teto-gcal.md'
False

Set-Location 'E:\Projetos\GIT\personalapp\backend'
npm test
> personal-api@1.0.0 test
> node --test

✔ calcularAulasContadasDoCiclo: agendamento com reposicaoId não entra na parcela (A) (0.9692ms)
✔ ...
✔ ...
ℹ tests 112
ℹ suites 0
ℹ pass 112
ℹ fail 0
```

## 2) Arquivos alterados e o que mudou em cada um

- `backend/src/controllers/agendamentoController.js`
  - corrige a fuga global declarando `agendamentoAtual` com `let` dentro de `montarRespostaFalhaGcal`;
  - mantém a lógica de `atualizarAgendamento` buscando o documento completo para preservar o teto e a detecção de edição real;
  - preserva a resposta `gcalSyncPausado: true` para item terminal sem mexer no contrato `gcalSyncFailed`.

- `backend/test/gcal-duplicata-fix.test.js`
  - adiciona o teste de regressão para garantir que `globalThis.agendamentoAtual` continue `undefined` após uma falha do Google;
  - reescreve o mock do caso terminal para seguir o contrato real do Mongoose (`findOne()` sem `select` devolve documento completo; `select()` devolve apenas os campos solicitados);
  - confirma que o fluxo de estado terminal continua reabrindo o teto e não chama o Google na mesma requisição.

- `docs/specs/gcal-sync.md`
  - já continha a seção “Fora de escopo”; nesta rodada, o que ficou fora do escopo foi revisado e registrado no relatório, sem alterar a regra implementada.

## 3) Item 1 — declaração corrigida e risco de vazamento global

A correção foi a declaração local:

```js
let agendamentoAtual = await (...);
```

Isso remove o vazamento silencioso para `globalThis` quando o arquivo está em um processo sem `'use strict'`. O padrão não apareceu em outro ponto relevante do backend tocado nesta rodada; a busca focada em `agendamentoAtual` e em atribuições sem declaração no mesmo arquivo não encontrou outra ocorrência no mesmo escopo de código alterado.

Proposta (não implementada): vale discutir a adoção de `'use strict'` no topo dos módulos do backend ou um lint que ponha a regra de variáveis não declaradas no CI. A vantagem é ganhar proteção contra regressões de escopo em rotas do mesmo tipo, mas isso exige uma auditoria separada para evitar quebrar código legado não coberto por testes.

## 4) Item 2 — por que o mock anterior era placebo

O mock anterior para o teste do teto devolvia um objeto com `.lean()`, mas sem `select()`. Nesse desenho, `obterAgendamentoPersistido` nunca entra no ramo de projeção; o código recebe o documento completo e a mutação nunca prova que o `select` foi honrado.

O mock corrigido foi escrito no molde do contrato real do Mongoose:

- `Agendamento.findOne()` sem `select` retorna o documento completo via `.lean()`;
- `select(campos)` retorna apenas os campos solicitados;
- a regressão é observada porque a lógica de estado terminal precisa do documento completo para ler `gcalSyncPendingTentativas` e detectar edição real.

### Saídas de execução

#### Com o código correto (passa)

```text
[AgendamentoController] Falha ao sincronizar com Google Calendar durante atualizar: falha de teste do Google
...
✔ montarRespostaFalhaGcal não vaza agendamentoAtual no escopo global (1.3564ms)
✔ atualizarAgendamento preserva o documento completo quando o item está em estado terminal e o mock honora o contrato do Mongoose (0.389ms)
ℹ tests 16
ℹ suites 0
ℹ pass 16
ℹ fail 0
```

#### Com a mutação (falha)

```text
[AgendamentoController] Falha ao sincronizar com Google Calendar durante atualizar: Operation `googlecalendarconnections.findOne()` buffering timed out after 10000ms
res.body.gcalSyncPausado: undefined
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
+ actual - expected

+ undefined
- true
```

## 5) Item 3 — o que entrou em “Fora de escopo”

A seção já existente em `docs/specs/gcal-sync.md` foi mantida e reforçada como o guardrail do desenho atual. O que ficou fora do escopo foi:

- `PUT` recorrente em item terminal sem edição;
- ausência de UI para `gcalSyncPausado`;
- recuperação apenas eventual da edição em item terminal;
- precedência divergente da data base entre `gcalSyncService` e `recurrence-helpers`;
- detecção de edição por igualdade estrita após normalização;
- séries antigas com `DTSTART` defeituoso ainda não reeditadas.

## 6) Item 4 — decisão sobre a guarda de `window.log.grupo`

Decisão: manter a guarda e registrar a evidência, sem mexer em `storage.js`.

Evidência:

- `index.html` carrega `assets/js/logger.js` antes dos scripts de aplicação;
- `logger.js` faz `window.log = api;` sem condição;
- o guard em `storage.js` só verifica se o helper está presente, e o runtime real tem esse helper carregado antes do `storage.js`.

Em outras palavras, não há ponto real do app onde `window.log` é inexistente na carga normal do frontend; a guarda não é necessária para vencer a ordem de scripts e não houve necessidade de remover ou alterar a condição em `storage.js`.

## 7) Prova por mutação, item por item

### 7.1 Remover `let` do item 1

```text
### MUTACAO: remoção de let faz a função vazar para globalThis
typeof sandbox.globalThis.agendamentoAtual: object
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
+ actual - expected

+ 'object'
- 'undefined'
```

### 7.2 Reverter a projeção em `atualizarAgendamento`

```text
### MUTACAO: remover a projeção em atualizarAgendamento quebra o teto
[AgendamentoController] Falha ao sincronizar com Google Calendar durante atualizar: Operation `googlecalendarconnections.findOne()` buffering timed out after 10000ms
res.body.gcalSyncPausado: undefined
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
+ actual - expected

+ undefined
- true
```

### 7.3 Remover a flag `gcalSyncPausado`

```text
### MUTACAO: remover a flag gcalSyncPausado faz o teste falhar
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
+ actual - expected

+ undefined
- true
```

## 8) Portão de saída (saída literal)

```text
Set-Location 'E:\Projetos\GIT\personalapp\backend'
npm test 2>&1 | Select-Object -Last 40

✔ PATCH move reposicao para agendada e grava agendamentoReposicaoId (0.4441ms)
✔ PATCH com agendamentoReposicaoId inexistente responde 400 (0.1939ms)
✔ calcularAulasContadasDoCiclo não conta agendamento com reposicaoId (0.231ms)
✔ calcularPrazoReposicao aplica piso para 2026-07-27 com fechamentoMesCheio (0.3709ms)
✔ PATCH com agendamentoReposicaoId inexistente retorna 400 (1.2962ms)
✔ POST com id de reposicao pendente ja existente retorna 409 e mantem contagem 1 (0.6623ms)
✔ apos reagendar com cobravel false, cicloCobrancaResolvido guarda a janela do ciclo do agendamento e dataOriginal permanece original (1.3561ms)
✔ envio de instancia de serie cria reposicao pendente e nao cria agendamento (1.4637ms)
✔ se a persistencia do agendamento falhar, o patch nao e enviado (0.2166ms)
✔ reposição pendente com validoAte no ciclo mostra prazo na nota (1.7905ms)
✔ reposição pendente com validoAte nulo mantém nota antiga (0.3053ms)
✔ invariante de fechamento: valorTotal do extrato não muda entre prazo preenchido e nulo (13.2354ms)
✔ reposição expirada com validoAte dentro do ciclo usa ramo expirado (0.2001ms)
✔ PRAZO_MINIMO_REPOSICAO_DIAS deve ser 7 (0.8988ms)
✔ Aluno sem ciclo configurado retorna prazo nulo (1.4005ms)
✔ dataOriginal inválida retorna prazo nulo (0.1532ms)
✔ dataOriginal nula retorna prazo nulo (0.0837ms)
✔ Fechamento mensal: data no começo do mês usa fim do mesmo ciclo (0.1475ms)
✔ Fechamento mensal: data a 2 dias do fim do mês aplica piso para o próximo ciclo (0.1365ms)
✔ Fechamento mensal: exatamente 7 dias do fim do ciclo não aplica piso (0.0945ms)
✔ Fechamento mensal: data a 1 dia do fim do ciclo aplica piso (0.1112ms)
✔ Dia de vencimento: data no meio do ciclo usa fim do ciclo atual (0.1486ms)
✔ Dia de vencimento: data a 2 dias do fim do ciclo aplica piso (0.1624ms)
✔ Dia de vencimento: exatamente 7 dias do fim do ciclo não aplica piso (0.1147ms)
✔ Virada de ano: piso em dezembro aponta para janeiro do ano seguinte (0.1458ms)
✔ Virada de ano: sem piso em data inicial do mês preservar ciclo do mês atual (0.0897ms)
✔ Determinismo: mesma dataOriginal e aluno produzem o mesmo prazo em duas chamadas (0.1114ms)
✔ Determinismo: resultado não depende da data do sistema, apenas da dataOriginal (0.1022ms)
✔ Aceita dataOriginal em formato Date object com a mesma regra (0.0832ms)
✔ Aluno com objetivo Consultoria Online e ciclo definido calcula prazo do mês (0.0753ms)
✔ obterReposicao expira reposição pendente com validoAte no passado (0.2857ms)
✔ obterReposicao preserva status pendente quando validoAte ainda não venceu (0.1430ms)
ℹ tests 112
ℹ suites 0
ℹ pass 112
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 10992.7003

Set-Location 'E:\Projetos\GIT\personalapp'
git diff --stat
backend/src/controllers/agendamentoController.js |  43 +++--
backend/test/gcal-duplicata-fix.test.js          | 230 ++++++++++++++++++++++-
backend/test/gcal-sync.test.js                   |  10 +-
docs/specs/gcal-sync.md                          |  28 ++-

git status --short
 M backend/src/controllers/agendamentoController.js
 M backend/test/gcal-duplicata-fix.test.js
 M backend/test/gcal-sync.test.js
 M docs/specs/gcal-sync.md
?? docs/_reports/2026-08-29-fix-select-teto-e-spec-gcal.md
```

## 9) Branch usada

`fix/duplicata-edicao-serie-gcal`

## 10) O que foi encontrado e não alterado

- `storage.js` não foi alterado porque a ordem real de carga em `index.html` já traz `logger.js` antes dos scripts do app e `window.log` é atribuído globalmente no início do boot. A guarda não tem ponto real de falha no fluxo normal.
- não houve UI nem CSS nesta rodada, porque o pedido era rígido sobre backend, testes e contrato de resposta;
- não mexemos em `recurrence-helpers.js`, `resolverDataISO`, `financasService.js`, webhook, autenticação nem Google auth controllers; o escopo era o teto de pendência, o vazamento global e a regressão em mock/teste.
- o estado de “Fora de escopo” foi registrado na spec e mantido fora da mudança de código neste ciclo, de acordo com o desenho já aprovado.

### Adendo de correção do erro de checagem da seção "Fora de escopo"

A afirmação de que a seção "Fora de escopo" não existia na spec era falsa. A busca correta foi feita com `## 8. Fora de escopo` (minúsculo), e a seção já existia antes da rodada B. O erro veio de eu procurar por `Fora de Escopo` com o `E` maiúsculo, o que não corresponde ao cabeçalho real da spec. Isso gerou confusão na rodada B e no relato da rodada C sobre o que já estava documentado.
