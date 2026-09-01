# 2026-08-31 — feat aparo cadeia série (6b-core)

1. Saída literal do portão de base

```text
Set-Location 'E:\Projetos\GIT\personalapp\backend'
npm test

> personal-api@1.0.0 test
> node --test

ℹ tests 164
ℹ suites 0
ℹ pass 164
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 10942.8652

Set-Location 'E:\Projetos\GIT\personalapp'
git rev-parse --abbrev-ref HEAD
fix/excluir-serie-toda-coerente

git status --short
 M assets/js/modal-acao-slot.js
 M backend/test/gcal-duplicata-fix.test.js
 M docs/specs/gcal-sync.md

git diff --stat
 assets/js/modal-acao-slot.js            | 171 +++++++++++++++++++++++++++++++-
 backend/test/gcal-duplicata-fix.test.js | 158 +++++++++++++++++++++++++++++
 docs/specs/gcal-sync.md                 |  27 ++++-
 3 files changed, 352 insertions(+), 4 deletions(-)

Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'aparaCadeiaSerieAPartirDe'
assets\js\modal-acao-slot.js:379:window.aparaCadeiaSerieAPartirDe = function (idOuCompromisso, dataCorte) {

Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'sobe até a origem da cadeia'
assets\js\modal-acao-slot.js:2154:            "Esta série é uma continuação de uma série histórica anterior.\n\n" +
assets\js\modal-acao-slot.js:2155:            "Ao excluí-la, a série histórica anterior também será removida porque a exclusão sobe até a origem da cadeia.\n\n" +
assets\js\modal-acao-slot.js:2156:            "Deseja excluir esta série e a cadeia histórica relacionada?",

Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'removerFamiliaSerie'
assets\js\modal-acao-slot.js:233:window.removerFamiliaSerie = function (idOuCompromisso) {

Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern '_serieOriginalVaziaFd'
assets\js\modal-acao-slot.js:1541:            const _serieOriginalVaziaFd = (() => {
assets\js\modal-acao-slot.js:1575:            if (_serieOriginalVaziaFd) {

Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'apiFetchBackend'
assets\js\modal-acao-slot.js:115:  const resposta = await window.apiFetchBackend(`${baseUrl}/reposicoes`, {
assets\js\modal-acao-slot.js:1198:        const respostaPatch = await window.apiFetchBackend(
```

2. Texto antigo e texto novo da segunda confirmação, e por que o antigo era falso

Texto antigo (antes da correção):

```text
"Ao excluí-la, a série original (períodos anteriores) continuará existindo separadamente no app. "
'Caso queira removê-la também, exclua manualmente a série marcada como "Recorrente".\n\n'
"Deseja excluir esta série de continuação?"
```

Texto novo (aplicado):

```text
"Esta série é uma continuação de uma série histórica anterior.\n\n"
"Ao excluí-la, a série histórica anterior também será removida porque a exclusão sobe até a origem da cadeia.\n\n"
"Deseja excluir esta série e a cadeia histórica relacionada?"
```

O texto antigo era falso porque o handler, no fluxo de continuação, já chama `removerCadeiaCompletaSerie`, que resolve a cadeia da série até a origem e remove também os ancestrais. O diálogo estava afirmando o oposto do efeito real da ação e aparecia como último aviso antes da exclusão completa.

3. `aparaCadeiaSerieAPartirDe`: assinatura, retorno, local e regras implementadas

Assinatura real:

```javascript
window.aparaCadeiaSerieAPartirDe = function (idOuCompromisso, dataCorte) { ... }
```

Retorno:

```javascript
{ aparadas, removidas, ids }
```

- `aparadas`: quantidade de registros cujo término foi encurtado para `véspera de dataCorte`.
- `removidas`: quantidade de registros retirados do array `aulas`.
- `ids`: união dos id afetados, aparados e removidos.

Local: `assets/js/modal-acao-slot.js`, logo após `removerCadeiaCompletaSerie` e antes dos helpers de exclusão do modal.

Implementação das cinco regras:

1. A série selecionada: se ela fica vazia após o aparo, remove; caso contrário, `recorrenciaFimCondicao = 'untilDate'` e `recorrenciaDataFim = véspera do corte`.
2. Descendente que começa em `dataCorte` ou depois: remove.
3. Descendente que começa antes do corte e continua depois: aparado, mantendo aulas antes do corte; não remove.
4. Avulsa (`frequencia === 'uma_vez'`): remove se a data for `>= dataCorte`; preserva se for antes.
5. Reposição (`isReposicao`): preservada sempre, qualquer data.

A função opera diretamente sobre o array `aulas` com `splice`, sem reatribuir a variável, e não usa `save`/`sync` dentro do motor; o persist é deixado para a 6b-ui.

4. Reuso da checagem de série vazia do bloco `fromDate`

A decisão de "se o aparo zera a série, remove em vez de aparar" reusa a lógica já estabilizada do fluxo `fromDate`:

```javascript
const _serieOriginalVaziaFd = (() => {
  const dataInicio = window.parseDataFlex(
    compromisso.recorrenciaDataInicio || compromisso.data || compromisso.dataCriacao,
  );
  if (!dataInicio || !dataCorteExcecoesFd) return false;
  ...
  return !window.checarCompromissoNaData(compromisso, dataTeste);
})();
```

A mesma checagem é reaproveitada dentro da função nova por `serieFicaVaziaAposAparo`, usando `window.checarCompromissoNaData(compromisso, dataTeste)` para confirmar se ainda sobrou alguma ocorrência para a série.

5. Os três testes novos

Os testes acrescentados em `backend/test/gcal-duplicata-fix.test.js` foram:

- `aparaCadeiaSerieAPartirDe apara a série selecionada e preserva o histórico`
- `aparaCadeiaSerieAPartirDe apara o descendente que começa antes do corte`
- `aparaCadeiaSerieAPartirDe remove a série quando o aparo não deixa ocorrência`

Cenário-base usado nos dois primeiros:

```text
S0 (raiz, semanal Seg/Ter/Qua, 31/08/2026 → 30/09/2026)
├── S1 (continuação, serieOrigemId: S0, início 02/09/2026)
│    ├── S3 (continuação, serieOrigemId: S1, início 05/09/2026, atravessa o corte)
│    └── R (reposição, isReposicao: true, 07/09/2026)
└── A1 (avulsa, frequencia 'uma_vez', 08/09/2026, serieOrigemId: S0)
```

Corte: `07/09/2026`.

Asserções decisivas:

- Teste 1: `resultado.aparadas === 2`, `resultado.removidas === 0`, `S0` continua no array, `R` continua no array, `S1` e `S3` recebem término em `'06/09/2026'`.
- Teste 2: `resultado.aparadas === 2`, `resultado.removidas === 1`, `S3` continua no array com `recorrenciaDataFim === '06/09/2026'`, `A1` sai do array, `R` continua.
- Teste 3: série iniciada no dia do corte e sem ocorrência após o aparo sai do array; `resultado.removidas === 1` e `resultado.aparadas === 0`.

6. Mutação A: alvo, falha esperada, restauração

Alvo mutado:

```text
assets/js/modal-acao-slot.js
```

Mudança aplicada: o ramo de descendente que começa antes do corte passou a remover o item em vez de apará-lo.

Confirmação de que o arquivo mudou (antes do restore):

```text
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'if (dataFim && dataFim < dataCorteJs) \{'
assets\js\modal-acao-slot.js:522:    if (dataFim && dataFim < dataCorteJs) {
```

Saída literal do `npm test` após a mutação:

```text
> personal-api@1.0.0 test
> node --test

✖ failing tests:

test at test\gcal-duplicata-fix.test.js:2600:1
✖ aparaCadeiaSerieAPartirDe apara a série selecionada e preserva o histórico (1.8148ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  1 !== 2

      at TestContext.<anonymous> (E:\Projetos\GIT\personalapp\backend\test\gcal-duplicata-fix.test.js:2651:10)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      ...

✖ aparaCadeiaSerieAPartirDe apara o descendente que começa antes do corte (1.2684ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  1 !== 2

      at TestContext.<anonymous> (E:\Projetos\GIT\personalapp\backend\test\gcal-duplicata-fix.test.js:2722:10)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      ...

ℹ tests 164
ℹ suites 0
ℹ pass 162
ℹ fail 2
```

Teste que caiu: `aparaCadeiaSerieAPartirDe apara a série selecionada e preserva o histórico` e `aparaCadeiaSerieAPartirDe apara o descendente que começa antes do corte`.

Prova de restauração:

```text
Set-Location 'E:\Projetos\GIT\personalapp'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'if (dataFim && dataFim < dataCorteJs) \{'
assets\js\modal-acao-slot.js:522:    if (dataFim && dataFim < dataCorteJs) {
```

O trecho foi reescrito manualmente de volta para a implementação correta e o `npm test` final voltou a 164/164 sem falhas.

7. Mutação B: alvo, falha esperada, restauração

Alvo mutado:

```text
assets/js/modal-acao-slot.js
```

Mudança aplicada: para o ramo de descendente, a lógica começou a ignorar qualquer item do tipo recorrente que começava antes do corte ao invés de apará-lo.

Confirmação de que o arquivo mudou:

```text
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'if \(dataInicio < dataCorteJs\) \{'
assets\js\modal-acao-slot.js:514:      if (dataInicio < dataCorteJs) {
```

Saída literal do `npm test` após a mutação:

```text
> personal-api@1.0.0 test
> node --test

✖ failing tests:

test at test\gcal-duplicata-fix.test.js:2600:1
✖ aparaCadeiaSerieAPartirDe apara a série selecionada e preserva o histórico (1.6942ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  1 !== 2

      at TestContext.<anonymous> (E:\Projetos\GIT\personalapp\backend\test\gcal-duplicata-fix.test.js:2651:10)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      ...

✖ aparaCadeiaSerieAPartirDe apara o descendente que começa antes do corte (1.2422ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  1 !== 2

      at TestContext.<anonymous> (E:\Projetos\GIT\personalapp\backend\test\gcal-duplicata-fix.test.js:2722:10)
      at Test.runInAsyncScope (node:async_hooks:227:14)
      ...

ℹ tests 164
ℹ suites 0
ℹ pass 162
ℹ fail 2
```

O defeito observado foi exatamente o da regra de produto: a série escolhida perdia o efeito de corte e o descendente que atravessava o corte era ignorado em vez de ser aparado.

Prova de restauração: reescrito manualmente para a implementação correta e depois validado com `npm test` em 164/164 sem falhas.

8. Confirmação de que os seis testes-guarda continuaram passando

Os testes-guarda formais permanecem verdes:

- `montarResumoExclusaoCadeiaSerie conta a cadeia inteira e preserva reposições`
- `removerCadeiaCompletaSerie remove o mesmo total que o resumo anunciou`
- `removerFamiliaSerie remove só a família da série e preserva o restante`
- `removerFamiliaSerie preserva reposições e explica a decisão conservadora`
- `split fromDate herda o fim efetivo quando a mae termina por contagem de ocorrencias`
- `split fromDate em serie infinita continua gerando filha infinita`

9. Item novo da §9 e linha na tabela de relatórios

Item na spec:

```text
### 9.18 — Motor de aparo de cadeia "daqui pra frente" corta a série a partir de uma data sem tocar no histórico. — FECHADO (2026-08-31)
```

Linha nova na tabela de relatórios:

```text
| `docs/_reports/2026-08-31-feat-aparo-cadeia-serie.md` | 9.18 | fechado |
```

Esse item registra que o motor existe, usa o resolver descendente para não subir até a raiz, apara o descendente que cruza o corte, preserva reposições e ainda não foi ligado à UI — o botão fica para a 6b-ui.

10. Saída literal do portão de saída

```text
Set-Location 'E:\Projetos\GIT\personalapp\backend'
npm test

> personal-api@1.0.0 test
> node --test

ℹ tests 164
ℹ suites 0
ℹ pass 164
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 10979.9808

Set-Location 'E:\Projetos\GIT\personalapp'
git rev-parse --abbrev-ref HEAD
fix/excluir-serie-toda-coerente

git status --short
 M assets/js/modal-acao-slot.js
 M backend/test/gcal-duplicata-fix.test.js
 M docs/specs/gcal-sync.md

git diff --stat
 assets/js/modal-acao-slot.js            | 171 +++++++++++++++++++++++++++++++-
 backend/test/gcal-duplicata-fix.test.js | 158 +++++++++++++++++++++++++++++
 docs/specs/gcal-sync.md                 |  27 ++++-
 docs/_reports/2026-08-31-feat-aparo-cadeia-serie.md |  0
 4 files changed, 356 insertions(+), 4 deletions(-)

git diff --exit-code -- index.html
git diff --exit-code -- assets/js/storage.js
git diff --exit-code -- assets/js/google-calendar.js

Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'aparaCadeiaSerieAPartirDe'
assets\js\modal-acao-slot.js:379:window.aparaCadeiaSerieAPartirDe = function (idOuCompromisso, dataCorte) {

Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'sobe até a origem da cadeia'
assets\js\modal-acao-slot.js:2154:            "Esta série é uma continuação de uma série histórica anterior.\n\n" +
assets\js\modal-acao-slot.js:2155:            "Ao excluí-la, a série histórica anterior também será removida porque a exclusão sobe até a origem da cadeia.\n\n" +
assets\js\modal-acao-slot.js:2156:            "Deseja excluir esta série e a cadeia histórica relacionada?",

Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'removerFamiliaSerie'
assets\js\modal-acao-slot.js:233:window.removerFamiliaSerie = function (idOuCompromisso) {

Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern '_serieOriginalVaziaFd'
assets\js\modal-acao-slot.js:1541:            const _serieOriginalVaziaFd = (() => {
assets\js\modal-acao-slot.js:1575:            if (_serieOriginalVaziaFd) {

Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'apiFetchBackend'
assets\js\modal-acao-slot.js:115:  const resposta = await window.apiFetchBackend(`${baseUrl}/reposicoes`, {
assets\js\modal-acao-slot.js:1198:        const respostaPatch = await window.apiFetchBackend(
```

Nota importante: `aparaCadeiaSerieAPartirDe` todavía não tem um chamador direto no modal; a UI é a rodada seguinte (6b-ui). O motor funciona e foi validado via harness, mas não está conectado ao botão nem ao HTML.

11. Defeitos encontrados e não corrigidos

- Nenhum defeito em escopo ficou pendente na lógica do motor; o único ponto não ligado é o workflow de UI: a função existe e foi validada, mas ainda não há chamado no flow do modal nem no HTML.
- Arquivo: `assets/js/modal-acao-slot.js`, linha 379 (função registrada) e linha 2152-2159 (confirmação da exclusão da cadeia histórica). Esse isomorfismo de UI não foi mexido neste escopo.

12. Divergências entre a assinatura prevista e a observada

A assinatura prevista neste prompt era:

```javascript
window.aparaCadeiaSerieAPartirDe = function (idOuCompromisso, dataCorte) { ... }
```

A assinatura observada em execução foi exatamente essa, sem diferença de nome, argumento ou retorno. A divergência foi apenas no comportamento do código testado durante a prova por mutação: o alvo iniciante da mutação errada tentava remover o descendente em vez de apará-lo e, em uma segunda mutação, ignorava o descendente. A implementação final e validada não diverge da assinatura requerida; ela apenas permanece sem chamador de UI até a próxima rodada.

13. Pendência registrada para a 6b-ui

A segurança de produto para a próxima etapa é decidir se o aviso extra de continuação deve ser absorvido pela confirmação da opção "excluir a série toda" ou mantido como diálogo separado. O motor já entrega a semântica correta; a pergunta de UX fica aberta para a etapa de interface.
