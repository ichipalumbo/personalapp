# Fix do escopo do aparo de cadeia — 2026-08-31

1. Saída literal do portão de base, medido antes de qualquer edição.

```text
E:\Projetos\GIT\personalapp
fix/excluir-serie-toda-coerente
 M assets/js/modal-acao-slot.js
 M backend/test/gcal-duplicata-fix.test.js
 M docs/specs/gcal-sync.md
?? docs/_reports/2026-08-31-feat-aparo-cadeia-serie.md

> personal-api@1.0.0 test
> node --test

✔ getCompromissoSerializadoParaConflito preserva o fim da série (2.1541ms)
✔ candidato serializado não ocorre depois do UNTIL (14.2844ms)
✔ série aparada não conflita com a própria continuação (2.2405ms)
✔ série sem campos de fim continua sendo tratada como infinita (1.1069ms)
✔ ignorarIds de família remove a série e a continuação do conflito, mas preserva conflito real com outro aluno (0.9301ms)
✔ calcularAulasContadasDoCiclo: agendamento com reposicaoId (0.3739ms)
...
✔ obterReposicao preserva status pendente quando validoAte ainda não venceu (0.1431ms)
ℹ tests 164
ℹ suites 0
ℹ pass 164
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 10944.6261
Path
----
E:\Projetos\GIT\personalapp

IgnoreCase : True
LineNumber : 379
Line       : window.aparaCadeiaSerieAPartirDe = function (idOuCompromisso, dataCorte) {
Filename   : modal-acao-slot.js
Path       : E:\Projetos\GIT\personalapp\assets\js\modal-acao-slot.js
Pattern    : aparaCadeiaSerieAPartirDe
Context    : 
Matches    : {0}

IgnoreCase : True
LineNumber : 475
Line       :  const raizRelacionada = baseCompromisso.serieOrigemId || null;
Filename   : modal-acao-slot.js
Path       : E:\Projetos\GIT\personalapp\assets\js\modal-acao-slot.js
Pattern    : raizRelacionada
Context    : 
Matches    : {0}

IgnoreCase : True
LineNumber : 481
Line       :      (raizRelacionada && item.serieOrigemId === raizRelacionada && item.frequencia === "uma_vez") ||
Filename   : modal-acao-slot.js
Path       : E:\Projetos\GIT\personalapp\assets\js\modal-acao-slot.js
Pattern    : raizRelacionada
Context    : 
Matches    : {0}

IgnoreCase : True
LineNumber : 482
Line       :      (raizRelacionada && item.id === raizRelacionada && item.frequencia === "uma_vez");
Filename   : modal-acao-slot.js
Path       : E:\Projetos\GIT\personalapp\assets\js\modal-acao-slot.js
Pattern    : raizRelacionada
Context    : 
Matches    : {0}

IgnoreCase : True
LineNumber : 478
Line       :    const mesmoRamo =
Filename   : modal-acao-slot.js
Path       : E:\Projetos\GIT\personalapp\assets\js\modal-acao-slot.js
Pattern    : mesmoRamo
Context    : 
Matches    : {0}

IgnoreCase : True
LineNumber : 483
Line       :    if (mesmoRamo) idsAlvo.add(item.id);
Filename   : modal-acao-slot.js
Path       : E:\Projetos\GIT\personalapp\assets\js\modal-acao-slot.js
Pattern    : mesmoRamo
Context    : 
Matches    : {0}

IgnoreCase : True
LineNumber : 257
Line       :      reposicoesPreservadas: 0,
Filename   : modal-acao-slot.js
Path       : E:\Projetos\GIT\personalapp\assets\js\modal-acao-slot.js
Pattern    : reposicoesPreservadas
Context    : 
Matches    : {0}

IgnoreCase : True
LineNumber : 269
Line       :  const reposicoesPreservadas = familia.filter((item) => item && item.isReposicao).length;
Filename   : modal-acao-slot.js
Path       : E:\Projetos\GIT\personalapp\assets\js\modal-acao-slot.js
Pattern    : reposicoesPreservadas
Context    : 
Matches    : {0}

IgnoreCase : True
LineNumber : 351
Line       :    reposicoesPreservadas,
Filename   : modal-acao-slot.js
Path       : E:\Projetos\GIT\personalapp\assets\js\modal-acao-slot.js
Pattern    : reposicoesPreservadas
Context    : 
Matches    : {0}

IgnoreCase : True
LineNumber : 2147
Line       :           reposicoesPreservadas: _resumoExclusao.reposicoesPreservadas,
Filename   : modal-acao-slot.js
Path       : E:\Projetos\GIT\personalapp\assets\js\modal-acao-slot.js
Pattern    : reposicoesPreservadas
Context    : 
Matches    : {0}

IgnoreCase : True
LineNumber : 2167
Line       :         reposicoesPreservadas: _resumoExclusao.reposicoesPreservadas,
Filename   : modal-acao-slot.js
Path       : E:\Projetos\GIT\personalapp\assets\js\modal-acao-slot.js
Pattern    : reposicoesPreservadas
Context    : 
Matches    : {0}

IgnoreCase : True
LineNumber : 233
Line       : window.removerFamiliaSerie = function (idOuCompromisso) {
Filename   : modal-acao-slot.js
Path       : E:\Projetos\GIT\personalapp\assets\js\modal-acao-slot.js
Pattern    : removerFamiliaSerie
Context    : 
Matches    : {0}

IgnoreCase : True
LineNumber : 1541
Line       :             const _serieOriginalVaziaFd = (() => {
Filename   : modal-acao-slot.js
Path       : E:\Projetos\GIT\personalapp\assets\js\modal-acao-slot.js
Pattern    : _serieOriginalVaziaFd
Context    : 
Matches    : {0}
```

2. Defeito 1: descendente inteiro antes do corte era removido.

Cenário: `S0 (31/08 → 30/09)`, `S1 (02/09 → 30/09)` e `S3 (01/09 → 04/09)`, corte em `07/09/2026`.
Antes, o bloco de `dataFim && dataFim < dataCorteJs` fazia `removerItem(item)` e o histórico era apagado. Depois, o item é ignorado e a função continua sem tocar em `S3`. A correção foi aplicada em `assets/js/modal-acao-slot.js` no bloco interno da iteração de descendentes recorrentes, na linha do `if (dataFim && dataFim < dataCorteJs)`.

3. Defeito 2: o escopo acabava subindo ao ancestral avulso.

Cenário: `P (avulsa, 10/09)` pai de `C (série, 02/09 → 30/09)`, corte em `07/09/2026`.
Antes, a última cláusula de `mesmoRamo` fazia `item.id === raizRelacionada`, pulando para o próprio ancestral avulso e removendo `P`. Depois, a cláusula foi removida e o escopo ficou restrito à família descendente e às avulsas irmãs da raiz relacionada, sem tocar em ancestral.

4. Decisão de produto: avulsa irmã sai, reposição fica.

A decisão do dono foi explicitada no escopo desta rodada: a avulsa irmã a partir do corte deve sair junto, exceto quando é reposição; reposição é sempre preservada. `resolverFamiliaDescendenteSerie` sozinho não alcança a irmã avulsa, e por isso o bloco `mesmoRamo` continua importante; a diferença é que a cláusula do ancestral foi removida e a do ramo da irmã permaneceu. Isso ficou implementado sem tocar no UI; a 6b-ui continua responsável por botão e diálogo.

5. `reposicoesPreservadas`: o que conta e por que o motor devolve o número.

A contagem considera reposições que estavam no escopo considerado — família descendente + avulsas irmãs do mesmo `serieOrigemId` — e cuja data é `>= corte`. Reposição anterior ao corte não entra porque não estava em risco. O motor devolve `reposicoesPreservadas` em vez de a UI recalcular, seguindo o mesmo princípio das correções anteriores: a mensagem/aviso e a ação executada saem do mesmo lugar.

6. Os três testes novos.

- `aparaCadeiaSerieAPartirDe não toca em descendente que termina antes do corte`
- `aparaCadeiaSerieAPartirDe não remove o ancestral avulso`
- `aparaCadeiaSerieAPartirDe preserva reposição irmã e a contabiliza`

Todos foram adicionados em `backend/test/gcal-duplicata-fix.test.js`, montando o array real pelo harness `criarHarnessModalAcaoSlot` e validando sobre o array que a produção modificou. O bloco de testes 1–3 existentes foi mantido e agora também checa `resultado.reposicoesPreservadas` sem alterar a semântica original.

7. Mutação A: alvo e prova.

Alvo: remover a guarda de `dataFim < dataCorteJs` para que o descendente do passado seja removido novamente.

```text
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'dataFim && dataFim < dataCorteJs.*removerItem'
# antes da mutação: sem saída
```

Mutação aplicada:

```js
if (dataFim && dataFim < dataCorteJs) { removerItem(item); return; }
```

```text
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'dataFim && dataFim < dataCorteJs.*removerItem'
assets\js\modal-acao-slot.js:534:     if (dataFim && dataFim < dataCorteJs) { removerItem(item); return; }
```

Saída literal do `npm test`:

```text
> personal-api@1.0.0 test
> node --test
...
ℹ tests 167
ℹ suites 0
ℹ pass 166
ℹ fail 1
...
✖ failing tests:

test at test\gcal-duplicata-fix.test.js:2761:1
✖ aparaCadeiaSerieAPartirDe não toca em descendente que termina antes do corte (1.5184ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  1 !== 0

      at TestContext.<anonymous> (E:\Projetos\GIT\personalapp\backend\test\gcal-duplicata-fix.test.js:2803:10)
```

Restauração manual:

```text
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'dataFim && dataFim < dataCorteJs.*removerItem'
# sem saída
```

`npm test` restaurado em 167/167 ao final da restauração.

8. Mutação B: alvo e prova.

Alvo: reintroduzir a cláusula `item.id === raizRelacionada` dentro de `mesmoRamo`.

```text
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'item.id === raizRelacionada && item.frequencia === "uma_vez"'
# antes da mutação: sem saída
```

Mutação aplicada:

```js
(raizRelacionada && item.id === raizRelacionada && item.frequencia === "uma_vez")
```

```text
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'item.id === raizRelacionada && item.frequencia === "uma_vez"'
assets\js\modal-acao-slot.js:485:     (raizRelacionada && item.id === raizRelacionada && item.frequencia === 
"uma_vez");
```

Saída literal do `npm test`:

```text
> personal-api@1.0.0 test
> node --test
...
ℹ tests 167
ℹ suites 0
ℹ pass 166
ℹ fail 1
...
✖ failing tests:

test at test\gcal-duplicata-fix.test.js:2810:1
✖ aparaCadeiaSerieAPartirDe não remove o ancestral avulso (1.5693ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  1 !== 0

      at TestContext.<anonymous> (E:\Projetos\GIT\personalapp\backend\test\gcal-duplicata-fix.test.js:2853:10)
```

Restauração manual:

```text
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'item.id === raizRelacionada && item.frequencia === "uma_vez"'
# sem saída
```

`npm test` restaurado em 167/167 ao final da restauração.

9. Mutação C: alvo e prova.

Alvo: desabilitar a guarda de reposição para que a reposição irmã deixe de ser preservada.

```text
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'false && item.isReposicao'
# antes da mutação: sem saída
```

Mutação aplicada:

```js
if (false && item.isReposicao) {
```

```text
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'false && item.isReposicao'
assets\js\modal-acao-slot.js:498:     if (false && item.isReposicao) {
```

Saída literal do `npm test`:

```text
> personal-api@1.0.0 test
> node --test
...
ℹ tests 167
ℹ suites 0
ℹ pass 164
ℹ fail 3
...
✖ failing tests:

test at test\gcal-duplicata-fix.test.js:2600:1
✖ aparaCadeiaSerieAPartirDe apara a série selecionada e preserva o histórico (1.7941ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  1 !== 0

      at TestContext.<anonymous> (E:\Projetos\GIT\personalapp\backend\test\gcal-duplicata-fix.test.js:2652:10)

...

 test at test\gcal-duplicata-fix.test.js:2859:1
✖ aparaCadeiaSerieAPartirDe preserva reposição irmã e a contabiliza (1.2227ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  2 !== 1

      at TestContext.<anonymous> (E:\Projetos\GIT\personalapp\backend\test\gcal-duplicata-fix.test.js:2913:10)
```

Essa mutação é a mais perigosa porque ainda deixa os testes 1 a 5 do motor passando em isolamento e só derruba a proteção da reposição, o que a torna uma perda silenciosa de dado na área de trabalho do aluno.

Restauração manual:

```text
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'false && item.isReposicao'
# sem saída
```

10. Confirmação dos sete testes-guarda.

A suíte final passou com 167 testes e 167 aprovados, e os guardas em `aparaCadeiaSerieAPartirDe` continuam válidos:

- `aparaCadeiaSerieAPartirDe apara a série selecionada e preserva o histórico`
- `aparaCadeiaSerieAPartirDe apara o descendente que começa antes do corte`
- `aparaCadeiaSerieAPartirDe remove a série quando o aparo não deixa ocorrência`
- `montarResumoExclusaoCadeiaSerie conta a cadeia inteira e preserva reposições`
- `removerCadeiaCompletaSerie remove o mesmo total que o resumo anunciou`
- `removerFamiliaSerie remove só a família da série e preserva o restante`
- `split fromDate herda o fim efetivo quando a mae termina por contagem de ocorrencias`

11. Ajuste no item 9.18 e linha nova na tabela de relatórios.

Ajuste realizado em `docs/specs/gcal-sync.md` para registrar que o aparo considera a família descendente e as avulsas irmãs, nunca o ancestral; que descendente totalmente anterior ao corte não é tocado; que avulsa irmã após o corte sai, salvo reposição; que reposição é sempre preservada e reportada por `reposicoesPreservadas`; e que a interface continua não ligada.

Linha adicionada na tabela de relatórios da §9:

```text
| `docs/_reports/2026-08-31-fix-escopo-aparo-cadeia.md` | 9.18 | fechado |
```

12. Saída literal do portão de saída.

```text
> personal-api@1.0.0 test
> node --test
...
ℹ tests 167
ℹ suites 0
ℹ pass 167
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 10972.7507
fix/excluir-serie-toda-coerente
 M assets/js/modal-acao-slot.js
 M backend/test/gcal-duplicata-fix.test.js
 M docs/specs/gcal-sync.md
?? docs/_reports/2026-08-31-fix-escopo-aparo-cadeia.md
?? docs/_reports/2026-08-31-feat-aparo-cadeia-serie.md

 assets/js/modal-acao-slot.js            | 183 +++++++++++++++++-
 backend/test/gcal-duplicata-fix.test.js | 320 ++++++++++++++++++++++++++++++++
 docs/specs/gcal-sync.md                 |  33 +++-
 3 files changed, 532 insertions(+), 4 deletions(-)

Select-String ... aparaCadeiaSerieAPartirDe
assets\js\modal-acao-slot.js:379:window.aparaCadeiaSerieAPartirDe = function (idOuCompromisso, dataCorte) {
Select-String ... reposicoesPreservadas
assets\js\modal-acao-slot.js:257:      reposicoesPreservadas: 0,
assets\js\modal-acao-slot.js:269:  const reposicoesPreservadas = familia.filter((item) => item && item.isReposicao).length;
assets\js\modal-acao-slot.js:351:    reposicoesPreservadas,
assets\js\modal-acao-slot.js:381:    return { aparadas: 0, removidas: 0, reposicoesPreservadas: 0, ids: [] };
assets\js\modal-acao-slot.js:390:    return { aparadas: 0, removidas: 0, reposicoesPreservadas: 0, ids: [] };
assets\js\modal-acao-slot.js:395:    return { aparadas: 0, removidas: 0, reposicoesPreservadas: 0, ids: [] };
assets\js\modal-acao-slot.js:445: const idsReposicoesPreservadas = new Set();
assets\js\modal-acao-slot.js:500:         idsReposicoesPreservadas.add(item.id);
assets\js\modal-acao-slot.js:552:   reposicoesPreservadas: idsReposicoesPreservadas.size,
assets\js\modal-acao-slot.js:2159:          reposicoesPreservadas: _resumoExclusao.reposicoesPreservadas,
assets\js\modal-acao-slot.js:2179:        reposicoesPreservadas: _resumoExclusao.reposicoesPreservadas,
Select-String ... raizRelacionada
assets\js\modal-acao-slot.js:476: const raizRelacionada = baseCompromisso.serieOrigemId || null;
assets\js\modal-acao-slot.js:482:     (raizRelacionada &&
assets\js\modal-acao-slot.js:483:       item.serieOrigemId === raizRelacionada &&
assets\js\modal-acao-slot.js:484:       (item.frequencia === "uma_vez" || item.isReposicao));
Select-String ... removerFamiliaSerie
assets\js\modal-acao-slot.js:233:window.removerFamiliaSerie = function (idOuCompromisso) {
Select-String ... _serieOriginalVaziaFd
assets\js\modal-acao-slot.js:1553:            const _serieOriginalVaziaFd = (() => {
assets\js\modal-acao-slot.js:1587:            if (_serieOriginalVaziaFd) {
Select-String ... apiFetchBackend
assets\js\modal-acao-slot.js:115:  const resposta = await window.apiFetchBackend(`${baseUrl}/reposicoes`, {
assets\js\modal-acao-slot.js:1210:        const respostaPatch = await window.apiFetchBackend(
```

Observação: a função continua sem chamador direto no arquivo; o motor fica testável e a 6b-ui continua como camada de integração.

13. Defeitos encontrados e não corrigidos.

Nenhum defeito novo foi encontrado no escopo desta correção. A checagem se limitou ao motor `aparaCadeiaSerieAPartirDe` em `assets/js/modal-acao-slot.js` e ao contrato de retorno/escopo, sem tocar na 6b-ui nem em rotas de backend; a lógica da interface e da integração com botão/modal continuam fora do escopo desta rodada.

14. Divergências entre a assinatura prevista neste prompt e a observada.

A assinatura prevista era `aparadas, removidas, ids`; a observada final foi `aparadas, removidas, reposicoesPreservadas, ids`.

O bloco de saída literal após a correção foi:

```text
> personal-api@1.0.0 test
> node --test
...
ℹ tests 167
ℹ suites 0
ℹ pass 167
ℹ fail 0
```

15. Pendências registradas para a 6b-ui.

- decidir se o aviso extra de continuação é absorvido pela confirmação da opção "excluir a série toda" ou mantido como diálogo separado;
- usar `reposicoesPreservadas` no texto do diálogo para avisar que há reposição no período e que ela será mantida;
- lixeira no canto inferior esquerdo do modal de edição, substituindo os botões vermelhos atuais;
- modal de escolha com três opções para série; avulsa pula direto para a confirmação, sem passar pelo modal de escolha.
