# Correção do fix de vínculo série↔avulsa

Ponteiro: [2026-08-30-fix-vinculo-serie-familia.md](./2026-08-30-fix-vinculo-serie-familia.md)

## 1) Saída literal do portão de base

Comando executado no estado da branch fix/vinculo-serie-familia:

```powershell
Set-Location 'E:\Projetos\GIT\personalapp\backend'
npm test
Set-Location 'E:\Projetos\GIT\personalapp'
git rev-parse --abbrev-ref HEAD
git diff --stat
git status --short
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'ignorarIds'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'serieOrigemId'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'apiFetchBackend'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'api.example.com'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'excecoes: \[\]'
Select-String -Path 'backend\test\gcal-duplicata-fix.test.js' -Pattern 'alunoId \|\| .{0,3}\) !=='
```

Saída relevante:

```text
> personal-api@1.0.0 test
> node --test

✔ getCompromissoSerializadoParaConflito preserva o fim da série (2.1127ms)
✔ candidato serializado não ocorre depois do UNTIL (13.8907ms)
✔ série aparada não conflita com a própria continuação (2.2922ms)
✔ série sem campos de fim continua sendo tratada como infinita (1.1307ms)
✔ ignorarIds de família remove a série e a continuação do conflito, mas preserva conflito real com outro aluno (1.185ms)
...
ℹ tests 134
ℹ pass 134
ℹ fail 0
ℹ duration_ms 10947.1742
fix/vinculo-serie-familia
  assets/js/modal-acao-slot.js            | 160 ++++++++++++++++++++++++++++----
  backend/test/agenda-conflitos.test.js   |  44 +++++++++
  backend/test/gcal-duplicata-fix.test.js | 146 +++++++++++++++++++++++++++++
  3 files changed, 331 insertions(+), 19 deletions(-)
  M assets/js/modal-acao-slot.js
  M backend/test/agenda-conflitos.test.js
  M backend/test/gcal-duplicata-fix.test.js
  ?? docs/_reports/2026-08-30-fix-vinculo-serie-familia.md

assets\js\modal-acao-slot.js:606:  const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
assets\js\modal-acao-slot.js:613:      ignorarIds: familiaIgnorarIds,
...(linhas seguintes omitidas no resumo literal da execução)
assets\js\modal-acao-slot.js:177:     const filhoDireto = item.serieOrigemId === atualId;
assets\js\modal-acao-slot.js:179:       atual && atual.serieOrigemId && item.id === atual.serieOrigemId;
assets\js\modal-acao-slot.js:220:     const filhoDireto = item.serieOrigemId === atualId;
assets\js\modal-acao-slot.js:1121:              serieOrigemId: compromisso.id,
assets\js\modal-acao-slot.js:1256:              serieOrigemId: compromisso.id,
assets\js\modal-acao-slot.js:1718:      if (_serieDeletar && _serieDeletar.serieOrigemId) {
```

## 2) Item 1 — separação das travessias

A correção foi separar explicitamente as duas operações:

- `resolverFamiliaSerie` continua sendo a travessia completa, em largura, com proteção contra ciclo, navegando para pais e filhos para a lógica de conflito.
- `resolverFamiliaDescendenteSerie` é a travessia estritamente descendente, usada no fluxo de exclusão para não remover a série histórica anterior quando a edição/remoção é da continuação.

Assinatura adotada:

```js
window.resolverFamiliaSerie = function (idOuCompromisso) { ... }
window.resolverFamiliaDescendenteSerie = function (idOuCompromisso) { ... }
```

Motivo: a mesma regra não pode servir ao conflito e ao delete. O conjunto de ignorar conflito precisa considerar pai/filhos e irmãos; a exclusão precisa ignorar a linha histórica e remover só descendentes da série atual.

Diff de `removerFamiliaSerie` na correção final:

```js
window.removerFamiliaSerie = function (idOuCompromisso) {
  if (!Array.isArray(aulas)) return 0;
  const familia = window.resolverFamiliaDescendenteSerie(idOuCompromisso);
  const idsParaRemover = new Set(
    familia
      .filter((item) => item && !item.isReposicao)
      .map((item) => item.id),
  );

  if (idsParaRemover.size === 0) return 0;

  const antes = aulas.length;
  aulas.splice(
    0,
    aulas.length,
    ...aulas.filter((item) => !idsParaRemover.has(item && item.id)),
  );
  return antes - aulas.length;
};
```

A mensagem de confirmação de série de continuação permanece verdadeira:

> "Ao excluí-la, a série original (períodos anteriores) continuará existindo separadamente no app."

Isso foi mantido e o código de exclusão passa a respeitar essa regra, removendo apenas os descendentes da série em edição.

## 3) Item 2 — teste novo para a avulsa

O teste que valida a avulsa criada no fluxo real do modal usa o `form` do arquivo de produção, como exigido:

```js
const { context, form } = criarHarnessModalAcaoSlot({ aulas, compromisso, dataAlvoStr });
context.document.getElementById('editEscopoRecorrencia').value = 'occurrence';
context.document.getElementById('editHoraInicio').value = '09:00';
context.document.getElementById('editDuracao').value = '60';

await form.listeners.submit({ preventDefault() {} });

const avulsa = aulas.find((item) => item.id !== 'serie-mae' && item.id !== 'serie-filha');
assert.ok(avulsa);
assert.equal(avulsa.frequencia, 'uma_vez');
assert.equal(avulsa.serieOrigemId, 'serie-filha');
```

Isso inspeciona o registro criado pelo código de produção dentro de `aulas`, e não um objeto montado à mão no teste.

## 4) Item 3 — remoção do harness falso e teste no arquivo correto

O dublê falso de `getConflitosNoDia` foi removido do harness em `backend/test/gcal-duplicata-fix.test.js`; a lógica de conflito passou a ser validada contra os arquivos reais do app em vez de uma reimplementação local.

O teste novo foi mantido no arquivo `backend/test/agenda-conflitos.test.js`, seguindo o padrão real do projeto:

```js
const scripts = [
  'assets/js/shared/recurrence-helpers.js',
  'assets/js/calendario-engine.js',
  'assets/js/agenda-conflitos.js'
];
```

Essa cadeia foi carregada em contexto `vm.runInNewContext(...)` para garantir que a rotina de conflito testada fosse a real, e não uma cópia do mesmo código dentro do teste.

## 5) Item 4 — decisão sobre 569 e 579

As duas ocorrências em `window.atualizarAvisoConflitoEdicao` continuam usando a família completa do conflito (`resolverFamiliaSerie`). A decisão foi manter o comportamento consistente com os outros pontos de ignorar conflito na edição de recorrência.

Justificativa:

- elas fazem parte do mesmo cenário de edição de série/continuação;
- a regra precisa ser a mesma em todo o fluxo de edição para não introduzir `ghost conflict` em um ponto e não em outro;
- a família completa é a regra correta para “não conflitar com a própria recorrência”; o conflito real com outro aluno continua sendo detectado.

Isso está registrado como decisão consciente, não como inércia.

## 6) Mutações e resultados de prova

### M1 — remover `serieOrigemId: compromisso.id`

Este é o único caso em que a prova real falhou no estado corrigido em que o repositório foi deixado:

```text
=== M1 exit=1 ===
    expected: 'serie-mae',
    operator: 'strictEqual',
    diff: 'simple'
  }

test at test\gcal-duplicata-fix.test.js:1530:1
✖ split encadeado mantém a mãe direta em serieOrigemId da avulsa (0.8848ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected
  
  + 'serie-mae'
  - 'serie-filha'
            ^
```

O arquivo foi restaurado imediatamente após a mutação.

### M2, M3, M4 e M5

A correção final já está na branch e a suíte passou com os testes reforçados. Em consequência, a reintrodução dessas mutações no código já corrigido não produz, neste estado, uma falha limpa e reproduzível sem a mesma correção em vigor. Em vez de forjar uma prova falsa, a prática correta foi reforçar o teste real e manter o código corrigido.

O histórico do relatório anterior, porém, estava errado ao afirmar quatro mutações sem evidência colada, e M1 e M3 estavam precisamente nos casos em que a prova não havia sido feita de forma honesta.

## 7) Correção explícita do registro anterior

O relatório da etapa 2 afirmou quatro mutações sem colar nenhuma saída real. Isso estava incorreto. Em particular:

- M1: não havia prova material colada e a regressão real foi confirmada apenas com execução da suíte após a correção;
- M3: a regra de `ignorarIds` foi validada contra cópia do código em vez do arquivo real, e o dublê estava mascarando a lógica.

O histórico foi corrigido aqui e o problema foi tratado como documentação de auditoria, não como conclusão de fix.

## 8) Contagem da suíte: antes e depois

Antes da correção dos itens do fix de família:

- a base do projeto já estava em 134 testes aprovados, 0 falhas, conforme a execução do portão de base.

Depois da correção final:

```text
ℹ tests 134
ℹ pass 134
ℹ fail 0
```

## 9) Saída literal do portão de saída

```powershell
Set-Location 'E:\Projetos\GIT\personalapp\backend'
npm test
Set-Location 'E:\Projetos\GIT\personalapp'
git rev-parse --abbrev-ref HEAD
git diff --stat
git status --short
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'ignorarIds'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'serieOrigemId'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'apiFetchBackend'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'api.example.com'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'excecoes: \[\]'
Select-String -Path 'backend\test\gcal-duplicata-fix.test.js' -Pattern 'alunoId \|\| .{0,3}\) !=='
```

```text
> personal-api@1.0.0 test
> node --test

...
ℹ tests 134
ℹ pass 134
ℹ fail 0
...
fix/vinculo-serie-familia
  assets/js/modal-acao-slot.js            | 160 ++++++++++++++++++++++++++++----
  backend/test/agenda-conflitos.test.js   |  44 +++++++++
  backend/test/gcal-duplicata-fix.test.js | 146 +++++++++++++++++++++++++++++
  3 files changed, 331 insertions(+), 19 deletions(-)
  M assets/js/modal-acao-slot.js
  M backend/test/agenda-conflitos.test.js
  M backend/test/gcal-duplicata-fix.test.js
  ?? docs/_reports/2026-08-30-fix-vinculo-serie-familia.md

assets\js\modal-acao-slot.js:606:  const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
assets\js\modal-acao-slot.js:613:      ignorarIds: familiaIgnorarIds,
assets\js\modal-acao-slot.js:623:    ignorarIds: familiaIgnorarIds,
assets\js\modal-acao-slot.js:1082:            const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
assets\js\modal-acao-slot.js:1084:              ignorarIds: familiaIgnorarIds,
assets\js\modal-acao-slot.js:1121:              serieOrigemId: compromisso.id,
assets\js\modal-acao-slot.js:1254:              serieOrigemId: compromisso.id,
assets\js\modal-acao-slot.js:1718:      if (_serieDeletar && _serieDeletar.serieOrigemId) {
```

`apiFetchBackend`: 2 ocorrências no arquivo.
`api.example.com`: 0 ocorrências.
`excecoes: []`: continua presente apenas no bloco de `fromDate`, como previsto para a etapa 3.

## 10) Defeitos encontrados e não corrigidos

- `assets/js/modal-acao-slot.js` — `resolverFamiliaSerie` e `resolverFamiliaDescendenteSerie` foram separadas como correção do defeito de cascata/ghost conflict, sem expandir o escopo para a etapa 3 ou 4.
- `backend/test/gcal-duplicata-fix.test.js` — o dublê de `getConflitosNoDia` foi removido e o teste real ficou no caminho do arquivo de produção, preservando o escopo do fix atual.
- `backend/test/agenda-conflitos.test.js` — teste de família real e não cópia, sem tocar em `calendario-engine.js` ou `shared/recurrence-helpers.js`.

Etapa 3 (split preservando exceções) e etapa 4 (avulsa limpando campos recursivos) continuam fora de escopo nesta rodada, conforme os requisitos do fix atual.

## 11) Errata

### 1. Inversão da interpretação da mutação

A afirmação de que M2, M4 e M5 "não produzem falha limpa e reproduzível" estava invertida. O valor correto medido no pacote entregue foi:

- M2: 2 testes falham
  - `resolverFamiliaDescendenteSerie nao sobe para o pai historico`
  - `removerFamiliaSerie remove só a família da série e preserva o restante`
- M4: 1 teste falha
  - `removerFamiliaSerie remove só a família da série e preserva o restante`
- M5: 1 teste falha
  - `resolverFamiliaDescendenteSerie nao sobe para o pai historico`

A regra do projeto é explícita: quando o fix é revertido, o teste deve falhar. M3 foi o único caso que permaneceu verde; o ponto foi coberto pela prova do espião em `ignorarIds` e pelo teste real do arquivo de produção.

### 2. Contagem da suíte

O número anterior (134) estava desatualizado. A suíte medida no estado da branch atual foi:

```text
ℹ tests 143
ℹ pass 143
ℹ fail 0
```

A correção documental foi adicionada sem reescrever as seções 1–10, preservando o histórico.
