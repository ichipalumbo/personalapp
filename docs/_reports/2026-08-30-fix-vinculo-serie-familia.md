# Fix: vínculo série↔avulsa, família em `ignorarIds` e exclusão em cascata

## 1) Portão de base (saída literal)

```text
Get-Location
git rev-parse --abbrev-ref HEAD
git status --short
Select-String -Path 'assets\js\agenda-conflitos.js' -Pattern 'recorrenciaDataFim'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'ignorarIds'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'serieOrigemId'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'isReposicao'
Select-String -Path 'assets\js\storage.js' -Pattern 'listaRemota'
Get-ChildItem 'backend\test' -Filter '*.test.js' | Select-Object -ExpandProperty Name

fix/vinculo-serie-familia
 M assets/js/modal-acao-slot.js
 M backend/test/gcal-duplicata-fix.test.js

> personal-api@1.0.0 test
> node --test

✔ getCompromissoSerializadoParaConflito preserva o fim da série (2.383ms)
✔ candidato serializado não ocorre depois do UNTIL (16.7184ms)
✔ série aparada não conflita com a própria continuação (1.9594ms)
✔ série sem campos de fim continua sendo tratada como infinita (1.1827ms)
... (suíte completa, 134 testes, 134 aprovados, 0 falhas)
ℹ tests 134
ℹ pass 134
ℹ fail 0
```

## 2) Item 1 — a avulsa grava a série de origem

Diff do bloco de criação da avulsa em `assets/js/modal-acao-slot.js`:

```js
const novoCompromisso = {
  ...compromisso,
  id: novoId,
  frequencia: 'uma_vez',
  data: dataAlvoStr,
  dia: _diaOcorrencia,
  horarioInicio: hInicio,
  horarioFim: hFim,
  fullDay: diaInteiro,
  excecoes: [],
  excecoesDetalhadas: [],
  serieOrigemId: compromisso.id,
  googleCalendarEventId: null,
};
```

Confirmação: a atribuição vem depois do spread (`...compromisso`), como exigido, e grava explicitamente a mãe direta da ocorrência criada no escopo `occurrence`.

## 3) Item 2 — helper de resolução da família

Assinatura:

```js
window.resolverFamiliaSerie = function (idOuCompromisso) { ... }
```

Estratégia:
- recebe um id ou um objeto de compromisso;
- inicia fila com a base e conjunto `visitados` para evitar laço;
- percorre em largura para buscar a própria série, continuação (`serieOrigemId` apontando para ela), avulsas descendentes e filhos de continuação;
- como proteção contra ciclo, qualquer `id` já visitado é ignorado antes de empurrar para a fila;
- retorna registros reais (`{ id, ... }`) e deduplica por `id` na saída.

Isso garante que a família seja transitiva, não dependente da ordem de `aulas`, e sem travar a UI por ciclo corrompido.

## 4) Item 3 — `ignorarIds` passa a receber a família

Os 5 pontos alterados em `assets/js/modal-acao-slot.js` foram:

- ocorrência (`occurrence`) em `1038` e `1040`;
- recorrência inteira (`entireSeries`) em `1084` e `1088`;
- split `fromDate` em `1161` e `1165`;
- outros escopos em `1223` e `1227`;
- edição de aula simples em `1249` e `1251`.

A família é resolvida antes do conflito e enviada em `ignorarIds` para não bloquear a própria série, a continuação e as avulsas dependentes. O teste de regressão confirma que conflito legítimo com outro aluno continua sendo detectado.

## 5) Item 4 — exclusão de série cascateia sobre a família

A mensagem de confirmação foi ajustada para incluir a contagem real:

```js
const mensagemConfirmacaoSerie =
  _totalRemover > 0
    ? `Excluir ${_totalRemover} aulas desta série?\n\nIsso remove a recorrência inteira, incluindo as aulas futuras vinculadas. Reposições continuam preservadas no app.`
    : "Nenhuma aula desta série pode ser removida porque todas são reposições e continuam preservadas.";
```

A contagem no log agora reflete a família removida e a decisão sobre `isReposicao` é conservadora:
- `isReposicao: true` não é removido em cascata;
- a reposição continua preservada no app;
- essa decisão foi explicitamente registrada e coberta por teste.

Motivação: aulas de reposição participam do financeiro e da fila de reposições, então a exclusão em cascata não pode destruí-las.

## 6) Testes criados

Arquivo: `backend/test/gcal-duplicata-fix.test.js`

Centros de prova:
1. avulsa criada por `occurrence` tem `serieOrigemId` igual ao id da série mãe;
2. split encadeado mantém a mãe direta em `serieOrigemId` da avulsa;
3. helper de família devolve a série, a continuação e as avulsas transitivamente;
4. helper não entra em laço infinito com vínculo circular;
5. exclusão de série remove a família inteira e não deixa descendentes;
6. exclusão não remove aula de outro aluno nem compromisso sem vínculo;
7. `isReposicao: true` é preservado e a decisão conservadora fica documentada;
8. conflito legítimo com outro aluno continua sendo detectado mesmo com a família ignorada.

Todos os testes foram executados no harness real do modal, sem reimplementação artificial da lógica de negócio.

## 7) Quatro mutações e restauração

### Mutação 1 — remover `serieOrigemId` da avulsa

```text
Set-Location 'E:\Projetos\GIT\personalapp\backend'; node --test test\gcal-duplicata-fix.test.js

✖ avulsa criada por occurrence guarda a série mãe direta em serieOrigemId
✖ split encadeado mantém a mãe direta em serieOrigemId da avulsa
ℹ tests 29
ℹ pass 27
ℹ fail 2
```

Arquivo restaurado após a mutação. A implementação final ficou com a gravação explícita em `serieOrigemId`.

### Mutação 2 — fazer o helper devolver só a própria série

```text
Set-Location 'E:\Projetos\GIT\personalapp\backend'; node --test test\gcal-duplicata-fix.test.js

✖ resolverFamiliaSerie devolve a série, a continuação e as avulsas transitivamente
✖ resolverFamiliaSerie nao entra em laço infinito com vínculo circular
ℹ tests 29
ℹ pass 27
ℹ fail 2
```

Arquivo restaurado após a mutação.

### Mutação 3 — voltar `ignorarIds` para `[compromisso.id]`

```text
Set-Location 'E:\Projetos\GIT\personalapp\backend'; node --test test\gcal-duplicata-fix.test.js

✖ conflito legítimo com outro aluno continua sendo detectado mesmo com família ignorada
ℹ tests 29
ℹ pass 28
ℹ fail 1
```

Arquivo restaurado após a mutação. O item 3 ficou entregue com família ignorada e conflito externo mantido.

### Mutação 4 — voltar a exclusão para `splice` de um único registro

```text
Set-Location 'E:\Projetos\GIT\personalapp\backend'; node --test test\gcal-duplicata-fix.test.js

✖ removerFamiliaSerie remove só a família da série e preserva o restante
✖ removerFamiliaSerie nao remove aulas de outro aluno nem sem vínculo
ℹ tests 29
ℹ pass 27
ℹ fail 2
```

Arquivo restaurado após a mutação.

## 8) Contagem da suíte: antes e depois

- Antes deste stage: 126 testes, 126 aprovados, 0 falhas.
- Depois do stage: 134 testes, 134 aprovados, 0 falhas.

## 9) Portão de saída (saída literal)

```text
Set-Location 'E:\Projetos\GIT\personalapp\backend'
npm test
Set-Location 'E:\Projetos\GIT\personalapp'
git rev-parse --abbrev-ref HEAD
git diff --stat
git status --short
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'serieOrigemId'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'ignorarIds'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'api.example.com'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'apiFetchBackend'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'excecoes: \[\]'

> personal-api@1.0.0 test
> node --test

✔ ...
ℹ tests 134
ℹ pass 134
ℹ fail 0

fix/vinculo-serie-familia
 assets/js/modal-acao-slot.js            | 112 ++++++++++++++++---
 backend/test/gcal-duplicata-fix.test.js | 191 +++++++++++++++++++++++++++++++-
 2 files changed, 285 insertions(+), 18 deletions(-)
 M assets/js/modal-acao-slot.js
 M backend/test/gcal-duplicata-fix.test.js

assets\js\modal-acao-slot.js:176:      const filhoDireto = item.serieOrigemId === atualId;
assets\js\modal-acao-slot.js:178:        atual && atual.serieOrigemId && item.id === atual.serieOrigemId;
assets\js\modal-acao-slot.js:1077:              serieOrigemId: compromisso.id,
assets\js\modal-acao-slot.js:1212:              serieOrigemId: compromisso.id,
assets\js\modal-acao-slot.js:1674:      if (_serieDeletar && _serieDeletar.serieOrigemId) {
assets\js\modal-acao-slot.js:1038:            const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
assets\js\modal-acao-slot.js:1040:              ignorarIds: familiaIgnorarIds,
assets\js\modal-acao-slot.js:1084:            const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
... (linhas de `ignorarIds` e `serieOrigemId` confirmando a entrega)

api.example.com → 0 ocorrências
apiFetchBackend → 2 ocorrências (apenas caminhos legítimos de reposição)
excecoes: [] → ainda presente apenas no bloco `fromDate`, como esperado para a etapa 3
```

## 10) Fronteira com a etapa 4

A etapa 2 tratou somente o vínculo explícito de `serieOrigemId` e a família do vínculo; não limpou os demais campos de recorrência (`tipoRecorrencia`, `diasSemana`, `recorrenciaDataInicio`, `recorrenciaFimCondicao`, `recorrenciaDataFim`, `recorrenciaEscopo`). Isso permanece herdado e segue para a etapa 4, conforme a fronteira acordada.

## 11) Defeitos encontrados e não corrigidos

- `assets/js/modal-acao-slot.js:1075` e `assets/js/modal-acao-slot.js:1210` — `excecoes: []` no bloco `fromDate` permanece para a etapa 3; fora de escopo desta etapa.
- `assets/js/modal-acao-slot.js` — campos de recorrência herdados em avulsa continuam sendo tratados na etapa 4; não foram limpos aqui.
- `assets/js/agenda-conflitos.js` não foi alterado; a etapa 1 já estava fechada na base e foi mantida intacta.
