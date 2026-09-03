# Fix: serialização de conflito perde o fim da série

## 1) Portão de base (saída literal)

```text
Get-Location
git rev-parse --abbrev-ref HEAD
git status --short
Select-String -Path 'assets\js\agenda-conflitos.js' -Pattern 'recorrenciaDataFim'
Select-String -Path 'assets\js\agenda-conflitos.js' -Pattern 'recorrenciaFimCondicao'
Select-String -Path 'assets\js\agenda-conflitos.js' -Pattern 'recorrenciaDataInicio'
Select-String -Path 'assets\js\calendario-engine.js' -Pattern 'recorrenciaDataFim'
Select-String -Path 'assets\js\calendario-engine.js' -Pattern 'recorrenciaQuantidadeOcorrencias'
Get-ChildItem 'backend\test' -Filter '*.test.js' | Select-Object -ExpandProperty Name

fix/conflito-serializacao-until
Path
----
E:\Projetos\GIT\personalapp

IgnoreCase : True
LineNumber : 28
Line       :         recorrenciaDataInicio: compromisso.recorrenciaDataInicio || compromisso.data || dataAlvoPtBr,
Filename   : agenda-conflitos.js
Path       : E:\Projetos\GIT\personalapp\assets\js\agenda-conflitos.js
Pattern    : recorrenciaDataInicio
Context    :
Matches    : {0}

IgnoreCase : True
LineNumber : 100
Line       :     const inicioPtBr = compromisso.recorrenciaDataInicio || compromisso.data || 
             window.getDataSelecionadaPtBr();
Filename   : agenda-conflitos.js
Path       : E:\Projetos\GIT\personalapp\assets\js\agenda-conflitos.js
Pattern    : recorrenciaDataInicio
Context    :
Matches    : {0}

financas-competencia.test.js
financas-pure.test.js
gcal-duplicata-fix.test.js
gcal-sync.test.js
reposicao-api.test.js
reposicao-c4-regressao.test.js
reposicao-extrato-prazo.test.js
reposicao-prazo.test.js

Set-Location 'E:\Projetos\GIT\personalapp\backend'
npm test

> personal-api@1.0.0 test
> node --test

[... saida podada ...]
...
[... saida podada ...]
ℹ tests 122
ℹ suites 0
ℹ pass 122
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 24461.923
```

## 2) Diff da serialização

Antes:

```js
        dataCriacao: compromisso.dataCriacao || new Date().toISOString(),
        recorrenciaEscopo: compromisso.recorrenciaEscopo || 'fromDate',
        recorrenciaDataInicio: compromisso.recorrenciaDataInicio || compromisso.data || dataAlvoPtBr,
        excecoes: Array.isArray(compromisso.excecoes) ? compromisso.excecoes.slice() : [],
        excecoesDetalhadas: Array.isArray(compromisso.excecoesDetalhadas) ? compromisso.excecoesDetalhadas.slice() : []
```

Depois:

```js
        dataCriacao: compromisso.dataCriacao || new Date().toISOString(),
        recorrenciaEscopo: compromisso.recorrenciaEscopo || 'fromDate',
        recorrenciaDataInicio: compromisso.recorrenciaDataInicio || compromisso.data || dataAlvoPtBr,
        recorrenciaFimCondicao: compromisso.recorrenciaFimCondicao || null,
        recorrenciaDataFim: compromisso.recorrenciaDataFim || null,
        recorrenciaQuantidadeOcorrencias: compromisso.recorrenciaQuantidadeOcorrencias || null,
        excecoes: Array.isArray(compromisso.excecoes) ? compromisso.excecoes.slice() : [],
        excecoesDetalhadas: Array.isArray(compromisso.excecoesDetalhadas) ? compromisso.excecoesDetalhadas.slice() : []
```

## 3) Verificação dos campos de fim

A leitura real do fim da série não está em `calendario-engine.js` em si; o arquivo delega para `recurrenceHelpers.checarCompromissoNaData`:

- `assets/js/calendario-engine.js:13-17` — `window.checarCompromissoNaData = function (...) { return recurrenceHelpers.checarCompromissoNaData(...) }`.
- `assets/js/shared/recurrence-helpers.js:149-179` — `checarCompromissoNaData` lê:
  - `recorrenciaDataInicio` para o início da recorrência;
  - `recorrenciaFimCondicao === 'untilDate' && recorrenciaDataFim` para o limite por data;
  - `recorrenciaFimCondicao === 'occurrences' && recorrenciaQuantidadeOcorrencias` para o limite por quantidade;
  - `contarOcorrenciasAteData(...)` usa `recorrenciaQuantidadeOcorrencias` para decidir se a instância excede o total.

Portanto, `recorrenciaQuantidadeOcorrencias` também entrou na serialização, porque o motor lê esse campo e um cenário com `occurrences` sem ele pode piorar o bug em vez de corrigir.

## 4) Testes criados

Arquivo: `backend/test/agenda-conflitos.test.js`

1. `getCompromissoSerializadoParaConflito preserva o fim da série`
   - prova que a serialização preserva `recorrenciaFimCondicao` e `recorrenciaDataFim` no objeto usado no conflito.
2. `candidato serializado não ocorre depois do UNTIL`
   - prova que o candidato continua ocorrendo em 31/08 e 01/09, mas não ocorre em 07/09 e 14/09.
3. `série aparada não conflita com a própria continuação`
   - prova que a série original serializada não gera conflito com a continuação da própria série quando `ignorarIds` ignora a origem.
4. `série sem campos de fim continua sendo tratada como infinita`
   - prova que a correção não transforma `null` em "série terminada hoje".

## 5) Mutações e restauração

### Mutação 1 — remover `recorrenciaDataFim`

```text
Set-Location 'E:\Projetos\GIT\personalapp\backend'; node --test test\agenda-conflitos.test.js

[... saida podada ...]
ℹ tests 4
ℹ pass 1
ℹ fail 3
```

Arquivo restaurado após a mutação; a implementação final voltou para a versão correta com `recorrenciaDataFim`.

### Mutação 2 — remover `recorrenciaFimCondicao`

```text
Set-Location 'E:\Projetos\GIT\personalapp\backend'; node --test test\agenda-conflitos.test.js

[... saida podada ...]
ℹ tests 4
ℹ pass 1
ℹ fail 3
```

Arquivo restaurado após a mutação; a implementação final voltou para a versão correta com `recorrenciaFimCondicao`.

## 6) Contagem da suíte: antes e depois

- Antes da correção: 122 testes, 122 aprovados, 0 falhas.
- Depois da correção: 126 testes, 126 aprovados, 0 falhas.

## 7) Portão de saída (saída literal)

```text
Set-Location 'E:\Projetos\GIT\personalapp\backend'
npm test
Set-Location 'E:\Projetos\GIT\personalapp'
git rev-parse --abbrev-ref HEAD
git diff --stat
git status --short
Select-String -Path 'assets\js\agenda-conflitos.js' -Pattern 'recorrenciaDataFim'
Select-String -Path 'assets\js\agenda-conflitos.js' -Pattern 'recorrenciaFimCondicao'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'ignorarIds'

[... saida podada ...]
...
ℹ tests 126
ℹ suites 0
ℹ pass 126
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 10879.696
---BRANCH---
fix/conflito-serializacao-until
---DIFF---
 assets/js/agenda-conflitos.js | 3 +++
 1 file changed, 3 insertions(+)
---STATUS---
[... saida podada ...]
---DATAFIM---

assets\js\agenda-conflitos.js:30:        recorrenciaDataFim: compromisso.recorrenciaDataFim || null,

---FIMCONDICAO---

assets\js\agenda-conflitos.js:29:        recorrenciaFimCondicao: compromisso.recorrenciaFimCondicao || null,

---IGNORARIDS---

assets\js\modal-acao-slot.js:507:      ignorarIds: [compromisso.id],
assets\js\modal-acao-slot.js:517:    ignorarIds: [compromisso.id],
assets\js\modal-acao-slot.js:977:              ignorarIds: [compromisso.id],
assets\js\modal-acao-slot.js:1023:              { ignorarIds: [compromisso.id] },
assets\js\modal-acao-slot.js:1099:              { ignorarIds: [compromisso.id] },
assets\js\modal-acao-slot.js:1160:              { ignorarIds: [compromisso.id] },
assets\js\modal-acao-slot.js:1183:              ignorarIds: [compromisso.id],
```

## 8) Branch usada

`fix/conflito-serializacao-until`

## 9) Defeitos encontrados e não corrigidos

- `assets/js/modal-acao-slot.js:977, 1023, 1099, 1160, 1183` — `ignorarIds` relacionado ao vínculo série↔avulsa e ao split de família, fora de escopo desta etapa (`fix/vinculo-serie-familia`, etapa 2). Não foi alterado.
- `assets/js/modal-acao-slot.js` e `assets/js/agenda-conflitos.js` não foram modificados além da serialização desta etapa; os demais defeitos conhecidos da etapa 3 (`split zera excecoes`) e 4 (`avulsa herda campos de recorrência e serieOrigemId da avó`) continuam fora do escopo e não foram corrigidos neste patch.
