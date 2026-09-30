# 2026-08-31 — fix excluir série toda coerente (6a + 6a.2)

1. Portão de base

```text
Get-Location
E:\Projetos\GIT\personalapp

git rev-parse --abbrev-ref HEAD
fix/excluir-serie-toda-coerente

git status --short
[... saida podada ...]

Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'montarResumoExclusaoCadeiaSerie'
assets\js\modal-acao-slot.js:253:window.montarResumoExclusaoCadeiaSerie = function (idOuCompromisso) {

Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'removerCadeiaCompletaSerie'
assets\js\modal-acao-slot.js:359:window.removerCadeiaCompletaSerie = function (idOuCompromisso) {

Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'removerFamiliaSerie'
assets\js\modal-acao-slot.js:204:window.removerFamiliaSerie = function (idOuCompromisso) {

Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'temInfinito'
assets\js\modal-acao-slot.js:326: const temInfinito = familia.some(

Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern '_serieOriginalVaziaFd'
assets\js\modal-acao-slot.js:128:  const _serieOriginalVaziaFd =
```

2. O que a 6a entregou

A 6a foi entregue no arquivo `assets/js/modal-acao-slot.js` com duas funções novas ligadas ao fluxo de exclusão da série:

- `window.montarResumoExclusaoCadeiaSerie` (~253-357): calcula total, `desde`, `ate`, total de reposições preservadas e mensagem da confirmação usando a família completa da série raiz;
- `window.removerCadeiaCompletaSerie` (~359-385): remove a cadeia completa, sem mexer na semântica de descendentes usada em outros fluxos;
- o handler `btnDeletarSerie` (~1961-2029) foi religado para usar o resumo e a remoção do resolver completo da cadeia.

A confirmação final entrou no fluxo com o texto de duas etapas:

- `Excluir X aulas desta série? ... Período: desde ... até ... Reposições continuam preservadas no app.`
- `✅ Série excluída — todas as ocorrências.`

A intenção da 6a era assegurar que a confirmação e a exclusão usassem o mesmo resolver para evitar número inflado e desvio de semântica.

3. Evidência da 6a

Identificação: verificação independente do dono.

```text
--- SEM MUTACAO ---
  TESTE1 PASS -> total= 4 | S0 nos ids? true | desde= 31/08/2026
  TESTE2 PASS -> removidas= 4 vs resumo.total= 4 | sobrou: R

--- MUTACAO A — remoção volta a ser descendente ---
  TESTE1 PASS -> total= 4 | S0 nos ids? true | desde= 31/08/2026
  TESTE2 FAIL -> removidas= 2 vs resumo.total= 4 | sobrou: S0,A1,R

--- MUTACAO B — resumo passa a ser descendente ---
  TESTE1 FAIL -> total= 2 | S0 nos ids? false | desde= 02/09/2026
  TESTE2 FAIL -> removidas= 4 vs resumo.total= 2 | sobrou: R
```

Observação: a rodada 6a não entregou evidência própria em arquivo de relatório; esse bloco foi levado como verificação independente do dono e permanece separado do teste de mutação desta rodada.

4. O defeito do período

O defeito estava em `temInfinito` dentro de `montarResumoExclusaoCadeiaSerie`: a condição aceitava qualquer item da família sem `recorrenciaDataFim`, inclusive avulsas e reposições. Como essas entidades são de um dia só e nunca têm `recorrenciaDataFim`, a cadeia finita era confundida com infinita quase sempre.

A correção foi aplicar a mesma filtragem ao infinito e ao `datasFim`:

- `!item.isReposicao`
- `item.frequencia !== 'uma_vez'`
- `!item.recorrenciaDataFim`

E a cadeia continua reportando `ate: null` somente quando existe uma série recorrente que será removida e que, de fato, não tem término. Avulsa e reposição não entram na conta.

5. A asserção acrescentada

No teste existente `montarResumoExclusaoCadeiaSerie conta a cadeia inteira e preserva reposições`, a asserção adicionada foi:

```text
assert.equal(resumo.ate, '13/09/2026');
```

6. Mutação A desta rodada

Alvo:

```text
assets/js/modal-acao-slot.js
const temInfinito = familia.some((item) => item && !item.recorrenciaDataFim);
```

Confirmação de que o arquivo mudou:

```text
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'const temInfinito = familia.some\(\(item\) => item && !item\.recorrenciaDataFim\);'
assets\js\modal-acao-slot.js:326: const temInfinito = familia.some((item) => item && !item.recorrenciaDataFim);
```

Saída literal do `npm test` após a mutação:

```text
> personal-api@1.0.0 test
> node --test

[... saida podada ...]
...
[... saida podada ...]
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected
  
  + null
  - '13/09/2026'
  
[... saida podada ...]
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: null,
    expected: '13/09/2026',
    operator: 'strictEqual',
    diff: 'simple'
  }


ℹ tests 161
ℹ suites 0
ℹ pass 160
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 11036.5942
```

Nome do teste que caiu:

```text
test at test\gcal-duplicata-fix.test.js:2472:1
[... saida podada ...]
```

Prova da restauração:

```text
Set-Location 'E:\Projetos\GIT\personalapp'; git restore -- assets/js/modal-acao-slot.js; git diff --exit-code -- assets/js/
```

Resultado: comando sem saída e código de saída 0. A restauração foi feita com `git restore -- assets/js/modal-acao-slot.js` e, em seguida, a correção foi reaplicada no arquivo real.

7. Guardas restantes

Os cinco testes-guarda continuaram passando após a recriação da correção final:

- `montarResumoExclusaoCadeiaSerie conta a cadeia inteira e preserva reposições`
- `removerCadeiaCompletaSerie remove o mesmo total que o resumo anunciou`
- `removerFamiliaSerie remove só a família da série e preserva o restante`
- `removerFamiliaSerie preserva reposições e explica a decisão conservadora`
- `split fromDate herda o fim efetivo quando a mae termina por contagem de ocorrencias`

A suíte final confirmou:

```text
ℹ tests 161
ℹ pass 161
ℹ fail 0
```

8. Item novo da §9 e linha nova na tabela 9.17

Item inserido em `docs/specs/gcal-sync.md`:

```text
### 9.17 — Excluir a série toda usa a mesma resolução da confirmação e preserva reposições. — FECHADO (2026-08-31)
```

Linha recém-adicionada na tabela 9.17:

```text
| `docs/_reports/2026-08-31-fix-excluir-serie-toda-coerente.md` | 9.17 | fechado |
```

9. Portão de saída

```text
Set-Location 'E:\Projetos\GIT\personalapp\backend'
npm test

> personal-api@1.0.0 test
> node --test

ℹ tests 161
ℹ suites 0
ℹ pass 161
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 11038.255

Set-Location 'E:\Projetos\GIT\personalapp'
git rev-parse --abbrev-ref HEAD
fix/excluir-serie-toda-coerente

git status --short
[... saida podada ...]

Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'temInfinito'
assets\js\modal-acao-slot.js:326: const temInfinito = familia.some(

Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'montarResumoExclusaoCadeiaSerie'
assets\js\modal-acao-slot.js:253:window.montarResumoExclusaoCadeiaSerie = function (idOuCompromisso) {

Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'removerCadeiaCompletaSerie'
assets\js\modal-acao-slot.js:359:window.removerCadeiaCompletaSerie = function (idOuCompromisso) {

Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'removerFamiliaSerie'
assets\js\modal-acao-slot.js:204:window.removerFamiliaSerie = function (idOuCompromisso) {

Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern '_serieOriginalVaziaFd'
assets\js\modal-acao-slot.js:128:  const _serieOriginalVaziaFd =

Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'apiFetchBackend'
assets\js\modal-acao-slot.js:368:  if (typeof apiFetchBackend === "function") {
```

10. Defeitos encontrados e não corrigidos

- Nenhum defeito novo foi identificado no escopo desta rodada. O único ponto fora do escopo foi a futura etapa 6b (`excluir daqui pra frente`), que permanece separada da semântica de "excluir a série toda".

Arquivo e linha do ponto fora do escopo:

```text
assets/js/modal-acao-slot.js:1961-2029
```

11. Divergências entre a assinatura prevista e a observada

A assinatura prevista neste prompt era:

```text
... esperado que a falha caísse em resumo.ate === '13/09/2026' ...
```

A assinatura observada na execução real foi a seguinte:

```text
[... saida podada ...]

test at test\gcal-duplicata-fix.test.js:2472:1
[... saida podada ...]
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected
  
  + null
  - '13/09/2026'
```

A divergência foi só de forma de apresentação: o problema real confirmado foi o mesmo, mas a saída executada no ambiente confirmou `actual: null` e `expected: '13/09/2026'` exatamente como saiu do `node --test`.
