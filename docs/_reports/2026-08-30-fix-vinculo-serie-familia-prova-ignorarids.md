# Prova do `ignorarIds` da família e correção do relatório

Ponteiro: [2026-08-30-fix-vinculo-serie-familia.md](./2026-08-30-fix-vinculo-serie-familia.md) e [2026-08-30-fix-vinculo-serie-familia-correcao.md](./2026-08-30-fix-vinculo-serie-familia-correcao.md).

## 1) Saída literal do portão de base

```powershell
Get-Location
git rev-parse --abbrev-ref HEAD
git status --short
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'ignorarIds'
Select-String -Path 'backend\test\gcal-duplicata-fix.test.js' -Pattern 'getConflitosNoDia'
Set-Location 'E:\Projetos\GIT\personalapp\backend'
npm test
```

```text
fix/vinculo-serie-familia
 M assets/js/modal-acao-slot.js
 M backend/test/agenda-conflitos.test.js
 M backend/test/gcal-duplicata-fix.test.js
?? docs/_reports/2026-08-30-fix-vinculo-serie-familia-correcao.md
?? docs/_reports/2026-08-30-fix-vinculo-serie-familia.md

assets\js\modal-acao-slot.js:606:  const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
assets\js\modal-acao-slot.js:613:      ignorarIds: familiaIgnorarIds,
assets\js\modal-acao-slot.js:623:    ignorarIds: familiaIgnorarIds,
assets\js\modal-acao-slot.js:1082:            const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
assets\js\modal-acao-slot.js:1084:              ignorarIds: familiaIgnorarIds,
assets\js\modal-acao-slot.js:1128:            const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
assets\js\modal-acao-slot.js:1132:              { ignorarIds: familiaIgnorarIds },
assets\js\modal-acao-slot.js:1205:            const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
assets\js\modal-acao-slot.js:1209:              { ignorarIds: familiaIgnorarIds },
assets\js\modal-acao-slot.js:1267:            const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
assets\js\modal-acao-slot.js:1271:              { ignorarIds: familiaIgnorarIds },
assets\js\modal-acao-slot.js:1293:            const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
assets\js\modal-acao-slot.js:1295:              ignorarIds: familiaIgnorarIds,

backend\test\gcal-duplicata-fix.test.js:321:    getConflitosNoDia: (candidato, dataAlvo, opcoes = {}) => {
backend\test\gcal-duplicata-fix.test.js:324:      fn: 'getConflitosNoDia',
backend\test\gcal-duplicata-fix.test.js:375:  context.window.getConflitosNoDia = (candidato, dataAlvo, opcoes = {}) => {
backend\test\gcal-duplicata-fix.test.js:1596:  context.window.getConflitosNoDia = (candidato, dataAlvo, opcoes = {}) => {
backend\test\gcal-duplicata-fix.test.js:1646:  context.window.getConflitosNoDia = (candidato, dataAlvo, opcoes = {}) => {
backend\test\gcal-duplicata-fix.test.js:1737:  context.window.getConflitosNoDia = (candidato, dataAlvo, opcoes = {}) => {

> personal-api@1.0.0 test
> node --test

ℹ tests 143
ℹ suites 0
ℹ pass 143
ℹ fail 0
```

## 2) Item 1 — dublê espião em vez de reimplementação

O dublê foi transformado em espião para manter o retorno `[]` e registrar o `ignorarIds` recebido, sem acoplar a lógica de detecção ao teste:

```diff
- getConflitosNoDia: () => [],
+ getConflitosNoDia: (candidato, dataAlvo, opcoes = {}) => {
+   chamadasConflito.push({
+     fn: 'getConflitosNoDia',
+     ignorarIds: Array.isArray(opcoes.ignorarIds) ? [...opcoes.ignorarIds] : null,
+   });
+   return [];
+ },
```

```diff
- getConflitosRecorrenciaEmDatas: () => [],
+ getConflitosRecorrenciaEmDatas: (candidato, datas, opcoes = {}) => {
+   chamadasConflito.push({
+     fn: 'getConflitosRecorrenciaEmDatas',
+     ignorarIds: Array.isArray(opcoes.ignorarIds) ? [...opcoes.ignorarIds] : null,
+   });
+   return [];
+ },
```

O retorno continua `[]`, portanto o comportamento da suíte não muda. O testemunho novo é que a chamada recebeu o conjunto correto da família e não só a ocorrência em edição.

### Testes novos e qual caminho cada um cobre

- `modal atualiza aviso de conflito em occurrence com família em ignorarIds` — cobre a linha ~613 (`atualizarAvisoConflitoEdicao`, escopo `occurrence`)
- `modal atualiza aviso de conflito em recorrente com família em ignorarIds` — cobre a linha ~623 (`atualizarAvisoConflitoEdicao`, escopo recorrente)
- `submit occurrence propaga família em ignorarIds` — cobre a linha ~1084 (`submit`, escopo `occurrence`)
- `submit entireSeries propaga família em ignorarIds` — cobre a linha ~1132 (`submit`, escopo `entireSeries`)
- `submit fromDate propaga família em ignorarIds` — cobre a linha ~1209 (`submit`, escopo `fromDate`)
- `submit monthOfDate propaga família em ignorarIds` — cobre a linha ~1271 (`submit`, escopo `monthOfDate`)
- `submit de frequência uma_vez propaga família em ignorarIds` — cobre a linha ~1295 (`submit`, frequência `uma_vez`)

Cenário base: `serie-mae`, `serie-filha` e avulsa `avulsa-1` com `serieOrigemId` na mesma família. O `ignorarIds` capturado precisa conter os três IDs, não apenas o ID do compromisso em edição.

## 3) Mutações A–G no arquivo de produção

Observação: o dublê espião não decide conflito; ele apenas observa. Quando a mutação no arquivo real é aplicada, o teste deixa de passar com falha observável em cada ponto medido.

### A — linha ~613 => `[compromisso.id]`

```text
✖ modal atualiza aviso de conflito em occurrence com família em ignorarIds
ℹ tests 37
ℹ pass 36
ℹ fail 1
```

### B — linha ~623 => `[compromisso.id]`

```text
✖ modal atualiza aviso de conflito em recorrente com família em ignorarIds
ℹ tests 37
ℹ pass 36
ℹ fail 1
```

### C — linha ~1084 => `[compromisso.id]`

```text
✖ submit occurrence propaga família em ignorarIds
ℹ tests 37
ℹ pass 36
ℹ fail 1
```

### D — linha ~1132 => `[compromisso.id]`

```text
✖ submit entireSeries propaga família em ignorarIds
ℹ tests 37
ℹ pass 36
ℹ fail 1
```

### E — linha ~1209 => `[compromisso.id]`

```text
✖ submit fromDate propaga família em ignorarIds
ℹ tests 37
ℹ pass 36
ℹ fail 1
```

### F — linha ~1271 => `[compromisso.id]`

```text
✖ submit monthOfDate propaga família em ignorarIds
ℹ tests 37
ℹ pass 36
ℹ fail 1
```

### G — linha ~1295 => `[compromisso.id]`

```text
✖ submit de frequência uma_vez propaga família em ignorarIds
ℹ tests 37
ℹ pass 36
ℹ fail 1
```

Todos os sete foram cobertos e o conjunto de `ignorarIds` recebido foi validado contra a família real da série.

## 4) Mutações de guarda H e I

### H — remover `serieOrigemId: compromisso.id` da avulsa

```text
✖ split encadeado mantém a mãe direta em serieOrigemId da avulsa
ℹ tests 37
ℹ pass 35
ℹ fail 2
```

### I — `removerFamiliaSerie` volta para `splice` de 1 registro

```text
✖ removerFamiliaSerie remove só a família da série e preserva o restante
ℹ tests 37
ℹ pass 35
ℹ fail 2
```

## 5) Restauração e validação final

A cada mutação foi restaurado o estado original do arquivo. O resultado final da suíte ficou verde:

```powershell
Set-Location 'E:\Projetos\GIT\personalapp\backend'
npm test
```

```text
> personal-api@1.0.0 test
> node --test

ℹ tests 143
ℹ suites 0
ℹ pass 143
ℹ fail 0
```

## 6) Item 2 — errata do relatório anterior

A seção anterior continha dois erros de medição e uma inversão lógica na interpretação da mutação.

### Erro 1 — a reintrodução da mutação falha quando a correção está ativa

O texto que afirmava que M2, M4 e M5 "não produzem falha limpa e reproduzível" estava invertido. O correto é:

- M2: 2 testes falham
  - `resolverFamiliaDescendenteSerie nao sobe para o pai historico`
  - `removerFamiliaSerie remove só a família da série e preserva o restante`
- M4: 1 teste falha
  - `removerFamiliaSerie remove só a família da série e preserva o restante`
- M5: 1 teste falha
  - `resolverFamiliaDescendenteSerie nao sobe para o pai historico`

A regra do projeto é explícita: quando o fix é revertido, o teste deve falhar. M3 foi o único caso que permaneceu verde, e foi justamente o que o espião passou a cobrir com a prova de `ignorarIds`.

### Erro 2 — contagem da suíte

O relatório anterior citava 134 testes. A suíte medida no pacote entregue e no estado atual da branch é 143 testes, 143 aprovados, 0 falhas.

## 7) Contagem da suíte: antes e depois

- Antes da correção do fix de família: 134 testes aprovados (registro histórico do pacote anterior)
- Depois da correção e do reforço de prova: 143 testes aprovados, 0 falhas

## 8) Saída literal do portão de saída

```powershell
Set-Location 'E:\Projetos\GIT\personalapp\backend'
npm test
Set-Location 'E:\Projetos\GIT\personalapp'
git rev-parse --abbrev-ref HEAD
git diff --stat
git status --short
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'ignorarIds'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'apiFetchBackend'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'excecoes: \[\]'
Select-String -Path 'backend\test\gcal-duplicata-fix.test.js' -Pattern 'chamadasConflito'
```

```text
fix/vinculo-serie-familia
 assets/js/modal-acao-slot.js            | 160 ++++++++++--
 backend/test/agenda-conflitos.test.js   |  44 ++++
 backend/test/gcal-duplicata-fix.test.js | 425 +++++++++++++++++++++++++++++++-
 3 files changed, 608 insertions(+), 21 deletions(-)
 M assets/js/modal-acao-slot.js
 M backend/test/agenda-conflitos.test.js
 M backend/test/gcal-duplicata-fix.test.js
?? docs/_reports/2026-08-30-fix-vinculo-serie-familia-correcao.md
?? docs/_reports/2026-08-30-fix-vinculo-serie-familia.md

assets\js\modal-acao-slot.js:606:  const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
assets\js\modal-acao-slot.js:613:      ignorarIds: familiaIgnorarIds,
assets\js\modal-acao-slot.js:623:    ignorarIds: familiaIgnorarIds,
assets\js\modal-acao-slot.js:1082:            const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
assets\js\modal-acao-slot.js:1084:              ignorarIds: familiaIgnorarIds,
assets\js\modal-acao-slot.js:1128:            const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
assets\js\modal-acao-slot.js:1132:              { ignorarIds: familiaIgnorarIds },
assets\js\modal-acao-slot.js:1205:            const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
assets\js\modal-acao-slot.js:1209:              { ignorarIds: familiaIgnorarIds },
assets\js\modal-acao-slot.js:1267:            const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
assets\js\modal-acao-slot.js:1271:              { ignorarIds: familiaIgnorarIds },
assets\js\modal-acao-slot.js:1293:            const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
assets\js\modal-acao-slot.js:1295:              ignorarIds: familiaIgnorarIds,

assets\js\modal-acao-slot.js:115:  const resposta = await window.apiFetchBackend(`${baseUrl}/reposicoes`, {
assets\js\modal-acao-slot.js:906:        const respostaPatch = await window.apiFetchBackend(
assets\js\modal-acao-slot.js:1119:              excecoes: [],
assets\js\modal-acao-slot.js:1254:              excecoes: [],

backend\test\gcal-duplicata-fix.test.js:313:      context.chamadasConflito = Array.isArray(context.chamadasConflito) ? context.chamadasConflito : [];
backend\test\gcal-duplicata-fix.test.js:314:      context.chamadasConflito.push({
backend\test\gcal-duplicata-fix.test.js:323:      context.chamadasConflito = Array.isArray(context.chamadasConflito) ? context.chamadasConflito : [];
backend\test\gcal-duplicata-fix.test.js:324:      context.chamadasConflito.push({
backend\test\gcal-duplicata-fix.test.js:1596:  context.window.getConflitosNoDia = (candidato, dataAlvo, opcoes = {}) => {
backend\test\gcal-duplicata-fix.test.js:1598:      fn: 'getConflitosNoDia',
backend\test\gcal-duplicata-fix.test.js:1625:  context.window.getConflitosRecorrenciaEmDatas = (candidato, datas, opcoes = {}) => {
backend\test\gcal-duplicata-fix.test.js:1669:  context.window.getConflitosRecorrenciaEmDatas = (candidato, datas, opcoes = {}) => {
backend\test\gcal-duplicata-fix.test.js:1692:  context.window.getConflitosRecorrenciaEmDatas = (candidato, datas, opcoes = {}) => {
backend\test\gcal-duplicata-fix.test.js:1715:  context.window.getConflitosRecorrenciaEmDatas = (candidato, datas, opcoes = {}) => {

> personal-api@1.0.0 test
> node --test

ℹ tests 143
ℹ suites 0
ℹ pass 143
ℹ fail 0
```

## 9) Pendência registrada, não executada

Os relatórios das etapas 1 e 2 ainda não constam na tabela 9.17 de `docs/specs/gcal-sync.md`, e a spec continua na versão 7 com "Defeitos em aberto: 2". Isso é uma pendência de documentação e não foi alterada nesta rodada.

## 10) Defeitos encontrados e não corrigidos

- `assets/js/modal-acao-slot.js:1119` e `assets/js/modal-acao-slot.js:1254` — o bloco `fromDate` ainda usa `excecoes: []` / `excecoesDetalhadas: []`. Isso é sinal do split/etapa 3, fora de escopo desta rodada.
- `docs/specs/gcal-sync.md` — tabela 9.17 sem os relatórios de etapa 1/2; pendência de documentação separada.
- `backend/test/gcal-duplicata-fix.test.js:313-324` — o dublê espiao é apenas observacional e não substitui a lógica de conflito; foi mantido como prova do `ignorarIds` e não como correção do motor.

