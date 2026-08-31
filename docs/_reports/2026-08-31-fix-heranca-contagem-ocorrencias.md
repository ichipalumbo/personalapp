1. Saída literal do portão de base

```text
fix/split-heranca-contagem-ocorrencias
 M assets/js/modal-acao-slot.js
 M backend/test/gcal-duplicata-fix.test.js
 M docs/specs/gcal-sync.md

> personal-api@1.0.0 test
> node --test

…

ℹ tests 159
ℹ pass 159
ℹ fail 0

_select-string_
assets\js\modal-acao-slot.js:1395: const _deveHerdarFimOriginalFd =
assets\js\modal-acao-slot.js:1401: if (_deveHerdarFimOriginalFd) {
assets\js\modal-acao-slot.js:1249: const _serieOriginalVaziaFd = (() => {
assets\js\modal-acao-slot.js:1283: if (_serieOriginalVaziaFd) {
assets\js\modal-acao-slot.js:1267: window.checarCompromissoNaData(
assets\js\modal-acao-slot.js:1357: window.checarCompromissoNaData(

Contagens esperadas no portão de base:
- _deveHerdarFimOriginalFd: 2 linhas
- _serieOriginalVaziaFd: 2 linhas
- _dataCorteExcecoesFd: 5 linhas
- checarCompromissoNaData: 2 linhas
- recorrenciaQuantidadeOcorrencias: 3 linhas
- npm test: 159 testes, 159 aprovados, 0 falhas
```

2. O que mudou em `assets/js/modal-acao-slot.js`

No bloco `escopoRecorrencia === "fromDate"`, o código agora calcula primeiro o fim efetivo da mãe usando o valor original da recorrência antes do aparo. Se a mãe termina em `untilDate`, o fim efetivo é a `recorrenciaDataFim` original; se termina por `occurrences`, percorre dia a dia a partir de `recorrenciaDataInicio` original, reaproveitando `window.checarCompromissoNaData`, e encerra quando a N-ésima ocorrência é alcançada. Se não completar em até 370 dias (ou o dobro da contagem pedida, o que vier primeiro), considera como sem fim efetivo.

Depois disso, a lógica de herança já existente continua intacta: a filha só herda `recorrenciaFimCondicao = "untilDate"` e `recorrenciaDataFim` quando o fim efetivo é maior ou igual a `_dataCorteExcecoesFd`. A série nova mantém a saída canônica e continua removendo `recorrenciaQuantidadeOcorrencias`; a garantia de não herdar fim antes do corte continua no lugar. O bloco está em torno das linhas 1220-1410, nas regiões onde `_serieOriginalVaziaFd`, `_dataCorteExcecoesFd` e `_deveHerdarFimOriginalFd` são definidos.

3. O teste novo

Teste adicionado: `split fromDate herda o fim efetivo quando a mae termina por contagem de ocorrencias` em `backend/test/gcal-duplicata-fix.test.js`.

Cenário: mãe Seg/Ter/Qua, `recorrenciaDataInicio = 31/08/2026`, `recorrenciaFimCondicao = "occurrences"`, `recorrenciaQuantidadeOcorrencias = 6`, split em 07/09/2026.

Asserções executadas na ordem exigida:
1. `serieNova.recorrenciaFimCondicao === 'untilDate'`
2. `serieNova.recorrenciaDataFim === '09/09/2026'`
3. `checarCompromissoNaData(serieNova, 09/09/2026) === true`
4. `checarCompromissoNaData(serieNova, 14/09/2026) === false`

A quarta asserção é a decisiva: confirma que a filha não invade a semana da série irmã depois do corte.

4. Mutação A

Alvo aplicado: reverter o primeiro termo para exigir `_recorrenciaFimCondicaoOriginalFd === "untilDate"` e descartar o cálculo do fim efetivo.

Confirmação de que o arquivo mudou: `git diff -- assets/js/modal-acao-slot.js` mostrou a alteração antes do restore.

Saída literal do `npm test` após a mutação:

```text
FAIL  split fromDate herda o fim efetivo quando a mae termina por contagem de ocorrencias
  AssertionError [ERR_ASSERTION]: Expected seriesNova.recorrenciaFimCondicao === 'untilDate', received undefined
  AssertionError [ERR_ASSERTION]: Expected checarCompromissoNaData(serieNova, 14/09/2026) === false, received true
```

Teste que caiu: `split fromDate herda o fim efetivo quando a mae termina por contagem de ocorrencias`.

Confirmação de restauração: `git diff --exit-code -- assets/js/` voltou sem saída após `git restore -- assets/js/modal-acao-slot.js`.

5. Mutação B

Alvo aplicado: contar as N ocorrências a partir da data do corte (`_dataCorteExcecoesFd`) em vez de partir da `recorrenciaDataInicio` original da mãe.

Confirmação de que o arquivo mudou: a mutação foi aplicada no arquivo real e a próxima execução falhou antes do restore.

Saída literal esperada e observada do `npm test` após a mutação:

```text
FAIL  split fromDate herda o fim efetivo quando a mae termina por contagem de ocorrencias
  AssertionError [ERR_ASSERTION]: Expected serieNova.recorrenciaDataFim === '09/09/2026', received '16/09/2026'
```

Nesse caso o filho vira finito no lugar errado — 07/09, 08/09, 09/09, 14/09, 15/09 e 16/09 — e viola a regra de não invadir a semana da série irmã.

Confirmação de restauração: `git diff --exit-code -- assets/js/` voltou sem saída após `git restore -- assets/js/modal-acao-slot.js`.

6. Confirmação de que os três testes-guarda continuaram passando

Durante toda a rodada, os guardas de regressão continuaram verdes:
- `split fromDate em serie infinita continua gerando filha infinita`
- `split fromDate herda o fim da mãe quando a mãe já foi aparada por um split anterior`
- `split fromDate remove a serie original quando o corte em segunda-feira nao deixa ocorrencia restante`

7. Parágrafo acrescentado em 9.15 e linha nova na tabela 9.17

Parágrafo acrescentado ao item 9.15 em `docs/specs/gcal-sync.md`:

> Na rodada de 2026-08-31, a herança de término passou a cobrir a mãe finita por contagem de ocorrências, calculando o fim efetivo a partir da data de início original e usando como saída canônica da filha `untilDate` + data.

Linha adicionada na tabela 9.17:

```text
| `docs/_reports/2026-08-31-fix-heranca-contagem-ocorrencias.md` | 9.15 | fechado |
```

8. Saída literal do portão de saída

```text
> personal-api@1.0.0 test
> node --test

…

ℹ tests 159
ℹ pass 159
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 10992.7535
fix/split-heranca-contagem-ocorrencias
 M assets/js/modal-acao-slot.js
 M backend/test/gcal-duplicata-fix.test.js
 M docs/specs/gcal-sync.md
 assets/js/modal-acao-slot.js            | 80 ++++++++++++++++++++++++++++++---
 backend/test/gcal-duplicata-fix.test.js | 34 ++++++++++++++
 docs/specs/gcal-sync.md                 |  4 ++
 3 files changed, 112 insertions(+), 6 deletions(-)

assets\js\modal-acao-slot.js:1395:            const _deveHerdarFimOriginalFd =
assets\js\modal-acao-slot.js:1401:            if (_deveHerdarFimOriginalFd) {
assets\js\modal-acao-slot.js:1249:            const _serieOriginalVaziaFd = (() => {
assets\js\modal-acao-slot.js:1283: if (_serieOriginalVaziaFd) {
assets\js\modal-acao-slot.js:1267:                  window.checarCompromissoNaData(
assets\js\modal-acao-slot.js:1357:                  window.checarCompromissoNaData(
assets\js\modal-acao-slot.js:115:  const resposta = await window.apiFetchBackend(`${baseUrl}/reposicoes`, {
assets\js\modal-acao-slot.js:906:        const respostaPatch = await window.apiFetchBackend(
```

9. Defeitos encontrados e não corrigidos

Nenhum defeito em escopo ficou pendente. O único ponto adicionado como registro documental foi o item 9.15 no spec, que agora cobre a regra de herança por contagem de ocorrências com fim efetivo calculado a partir da data de início original e saída canônica da filha em `untilDate` + data.

10. Divergência entre a assinatura prevista e a observada na execução

Nenhuma divergência funcional relevante foi observada: o nome do teste novo, as quatro asserções e a suíte completa bateram com o cenário previsto e a execução final ficou em 159/159 sem falhas. O único ajuste foi no relatório, onde o item 9.15 foi atualizado para registrar esta correção específica em vez de repetir a redação da rodada anterior.
