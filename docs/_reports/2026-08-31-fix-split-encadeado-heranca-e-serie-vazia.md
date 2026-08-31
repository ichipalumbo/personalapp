# Correção — split encadeado: herança de término e remoção de série sem ocorrência

## Escopo executado

Esta etapa corrige os dois defeitos no bloco `fromDate` de `assets/js/modal-acao-slot.js`:

1. a nova série filha nascia infinita mesmo quando a mãe já havia sido aparada por um split anterior;
2. a série original sobrevivia mesmo quando o corte deixava zero ocorrências válidas restantes.

A correção foi limitada ao caminho real de produção, preservando a regra de que a recursão deve ser tratada pelo motor já existente e não reimplementada em um módulo paralelo.

---

## 1) Portão de base

### Branch e status no início da etapa

```text
fix/split-heranca-serie-vazia
 M assets/js/modal-acao-slot.js
 M backend/test/gcal-duplicata-fix.test.js
 M docs/roadmap.md
 M docs/specs/gcal-sync.md
?? docs/_reports/2026-08-31-fix-split-encadeado-heranca-e-serie-vazia.md
```

> Observação: o portão de base desta sessão foi medido com o working tree já sujo. O valor correto da base da etapa 5 era 152 testes, 152 passando, antes da primeira alteração; o número de 157 observado neste ambiente não era a linha de base correta porque o working tree já trazia alterações em andamento. A afirmação de que 157 "diverge" de 152 estava errada: 152 era a linha de base antes dos 5 testes acrescentados pela própria etapa 5, e 152 + 5 = 157.

### Execução final da suíte

```text
> personal-api@1.0.0 test
> node --test

✔ getCompromissoSerializadoParaConflito preserva o fim da série (2.229ms)
✔ candidato serializado não ocorre depois do UNTIL (18.0129ms)
✔ série aparada não conflita com a própria continuação (2.2806ms)
✔ série sem campos de fim continua sendo tratada como infinita (0.9977ms)
✔ ignorarIds de família remove a série e a continuação do conflito, mas preserva conflito real com outro aluno (1.6178ms)
...
ℹ tests 157
ℹ suites 0
ℹ pass 157
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 10996.817
```

**Resultado final da etapa**: 157 testes, 157 passando, 0 falhando.

---

## 2) O que mudou em cada arquivo e por quê

### `assets/js/modal-acao-slot.js`

- Capturou os valores originais de `recorrenciaDataFim`, `recorrenciaFimCondicao` e `recorrenciaQuantidadeOcorrencias` antes do aparo da mãe.
- Manteve `compromisso.recorrenciaFimCondicao = "untilDate"` e `compromisso.recorrenciaDataFim = _ptBrAnteriorFd` apenas no trecho de truncamento da série original, sem reutilizar esse estado mutado ao montar a nova série.
- Troca da verificação antiga de "janela invertida" por checagem real de ocorrência restante usando `window.checarCompromissoNaData` e os helpers compartilhados de recorrência.
- A nova série herda o fim original apenas quando a mãe era finita via `untilDate` e ainda restou pelo menos uma ocorrência válida.
- Em caso de mãe infinita, a série nova continua infinita; em caso de término de outra condição (`COUNT`, etc.), o código fica conservador e não inventa uma regra não especada.

### `backend/test/gcal-duplicata-fix.test.js`

- Adicionados cenários comportamentais para:
  - filha herda fim da mãe quando a mãe já foi aparada;
  - série infinita continua infinita;
  - split em segunda-feira remove a série original vazia;
  - split com uma ocorrência válida restantes preserva a série original;
  - controles de mutação e casos de borda do defeito 6.

### `docs/roadmap.md`

- Atualizado o item 2.1 para refletir a validação real de 31/08/2026 da renovação do canal e registrar a ressalva de que o gatilho automático no boot não foi observado isoladamente.

### `docs/specs/gcal-sync.md`

- Ajustado o cabeçalho para refletir a validação concluída em 31/08/2026.
- Recontado o número de defeitos em aberto como 2, mantendo 9.14 e 9.8 no status atual.
- Incorporado o defeito 6 como complemento do item 9.15.
- Atualizada a tabela 9.17 com os relatórios ausentes de 30/08/2026, o diagnóstico 31/08 e este relatório final.

---

## 3) Decisão sobre `recorrenciaFimCondicao !== "untilDate"`

A decisão foi explícita e conservadora: a série nova herda o fim da mãe somente quando a mãe tinha fim real em `untilDate` e não estava vazia. Quando a regra de término era outra (por exemplo, contagem de ocorrências), a correção não reimplementou essa regra nem fez suposição indevida.

Motivo: em linha com a spec e com as instruções do repositório, o cálculo de regra de negócio deve permanecer no motor compartilhado de recorrência, e a correção deste ponto não deve inventar comportamento fora do escopo documentado. Portanto, `COUNT` e outras condições de término diferentes de `untilDate` foram deixadas fora do escopo desta etapa e registradas como decisão de produto conservadora, sem alterar a regra atual.

---

## 4) Prova por mutação

Cada mutação foi aplicada individualmente e o código foi restaurado imediatamente após a falha observada. A saída literal de cada falha foi registrada abaixo.

### M1 — remover incondicionalmente o término da série nova

```text
failing tests:

test at test\gcal-duplicata-fix.test.js:1640:1
✖ split fromDate herda o fim da mãe quando a mãe já foi aparada por um split anterior (1.4474ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected
  
  + undefined
  - 'untilDate'
  
      at TestContext.<anonymous> (E:\Projetos\GIT\personalapp\backend\test\gcal-duplicata-fix.test.js:1668:10)
      at async Test.run (node:internal/test_runner/test:1332:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:911:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: undefined,
    expected: 'untilDate',
    operator: 'strictEqual',
    diff: 'simple'
  }
```

### M2 — ler o término da mãe depois do aparo, em vez de antes

```text
failing tests:

test at test\gcal-duplicata-fix.test.js:1640:1
✖ split fromDate herda o fim da mãe quando a mãe já foi aparada por um split anterior (1.5401ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected
  
  + '06/09/2026'
  - '08/09/2026'
  
      at TestContext.<anonymous> (E:\Projetos\GIT\personalapp\backend\test\gcal-duplicata-fix.test.js:1669:10)
      at async Test.run (node:internal/test_runner/test:1332:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:911:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: '06/09/2026',
    expected: '08/09/2026',
    operator: 'strictEqual',
    diff: 'simple'
  }

test at test\gcal-duplicata-fix.test.js:1674:1
✖ split fromDate em serie infinita continua gerando filha infinita (1.2224ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
```

### M3 — herdar o término sempre, inclusive de mãe infinita

```text
failing tests:

test at test\gcal-duplicata-fix.test.js:1705:1
✖ split fromDate remove a serie original quando o corte em segunda-feira nao deixa ocorrencia restante (1.5155ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  false !== true
  
      at TestContext.<anonymous> (E:\Projetos\GIT\personalapp\backend\test\gcal-duplicata-fix.test.js:1735:10)
      at async Test.run (node:internal/test_runner/test:1332:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:911:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: false,
    expected: true,
    operator: 'strictEqual',
    diff: 'simple'
  }
```

### M4 — voltar à comparação de datas invertidas no teste de série vazia

```text
failing tests:

test at test\gcal-duplicata-fix.test.js:1431:1
✖ split fromDate no meio da serie preserva a serie original e cria a nova (1.6167ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  1 !== 2
  
      at TestContext.<anonymous> (E:\Projetos\GIT\personalapp\backend\test\gcal-duplicata-fix.test.js:1456:10)
      at async Test.run (node:internal/test_runner/test:1332:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:911:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 1,
    expected: 2,
    operator: 'strictEqual',
    diff: 'simple'
  }

test at test\gcal-duplicata-fix.test.js:1640:1
✖ split fromDate herda o fim da mãe quando a mãe já foi aparada por um split anterior (1.2267ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected
  
  + undefined
  - 'untilDate'
```

### M5 — inverter a condição de remoção

```text
failing tests:

test at test\gcal-duplicata-fix.test.js:1401:1
✖ split fromDate na primeira ocorrencia remove a serie vazia e cria a serie nova sem DELETE (21.0392ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  2 !== 1
  
      at TestContext.<anonymous> (E:\Projetos\GIT\personalapp\backend\test\gcal-duplicata-fix.test.js:1425:10)
      at async Test.run (node:internal/test_runner/test:1332:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:911:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 2,
    expected: 1,
    operator: 'strictEqual',
    diff: 'simple'
  }

test at test\gcal-duplicata-fix.test.js:1431:1
✖ split fromDate no meio da serie preserva a serie original e cria a nova (10.8755ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  1 !== 2
```

### M6 — remover a exclusão do array `aulas`

```text
failing tests:

test at test\gcal-duplicata-fix.test.js:1401:1
✖ split fromDate na primeira ocorrencia remove a serie vazia e cria a serie nova sem DELETE (20.453ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  2 !== 1
  
      at TestContext.<anonymous> (E:\Projetos\GIT\personalapp\backend\test\gcal-duplicata-fix.test.js:1425:10)
      at async Test.run (node:internal/test_runner/test:1332:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:911:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 2,
    expected: 1,
    operator: 'strictEqual',
    diff: 'simple'
  }

test at test\gcal-duplicata-fix.test.js:1608:1
✖ split fromDate em serie original vazia preserva excecoes na nova serie (1.0211ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  2 !== 1
  
      at TestContext.<anonymous> (E:\Projetos\GIT\personalapp\backend\test\gcal-duplicata-fix.test.js:1608:1)
      at async Test.run (node:internal/test_runner/test:1332:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:911:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: 2,
    expected: 1,
    operator: 'strictEqual',
    diff: 'simple'
  }
```

---

## 5) Consultas prontas para rodar no MongoDB

> As consultas abaixo foram preparadas com `ownerEmail` explicitamente filtrado, em linha com a regra de isolamento do app. Ajuste o valor do e-mail antes de executar.

### 1) Séries irmãs infinitas sobrepostas

```js
const ownerEmail = "SEU_EMAIL@EXEMPLO.COM";

db.agendamentos.aggregate([
  {
    $match: {
      ownerEmail,
      serieOrigemId: { $exists: true, $ne: null },
      recorrenciaDataFim: { $exists: false },
      $or: [
        { tipoRecorrencia: "semanal" },
        { recorrencia: "semanal" },
        { recorrenciaTipo: "semanal" }
      ]
    }
  },
  {
    $group: {
      _id: "$serieOrigemId",
      filhos: { $push: { id: "$id", data: "$data", recorrenciaDataInicio: "$recorrenciaDataInicio", ownerEmail: "$ownerEmail" } },
      qtdFilhas: { $sum: 1 }
    }
  },
  { $match: { qtdFilhas: { $gte: 2 } } },
  { $project: { _id: 0, serieOrigemId: "$_id", qtdFilhas: 1, filhos: 1 } }
]);
```

### 2) Casos do defeito 6 (início = fim em `untilDate`)

```js
const ownerEmail = "SEU_EMAIL@EXEMPLO.COM";

db.agendamentos.find({
  ownerEmail,
  recorrenciaFimCondicao: "untilDate",
  recorrenciaDataInicio: { $exists: true, $ne: null },
  recorrenciaDataFim: { $exists: true, $ne: null },
  $expr: { $eq: ["$recorrenciaDataInicio", "$recorrenciaDataFim"] }
}, {
  id: 1,
  data: 1,
  recorrenciaDataInicio: 1,
  recorrenciaDataFim: 1,
  recorrenciaFimCondicao: 1,
  ownerEmail: 1
});
```

---

## 6) Divergência de documentação encontrada

A correção do arquivo de instruções ficou fora do escopo desta etapa, mas a divergência foi registrada:

- `.github/copilot-instructions.md` §2 afirma que `docs/specs/gcal-sync.md` está em v6, enquanto o cabeçalho da própria spec diz v8 no momento desta etapa.
- Na mesma frase, o arquivo aponta `docs/specs/financas-ciclo-cobranca.md` como v7, mas `docs/README.md` a lista como v6; as referências parecem trocadas.

Foi reportado sem alterar essa instrução, porque a etapa pedida estava focada no split e na documentação da spec associada, não numa revisão geral do arquivo permanente de instruções do repositório.

---

## 7) O que foi encontrado mas não alterado

- Não foi feito redesenho dos botões de exclusão (`Excluir esta aula`, `Excluir daqui pra frente`, `Excluir a série toda`).
- Não foi implementado agrupamento da família como um único compromisso na interface.
- Não foi executada limpeza retroativa dos registros já gravados em produção.
- Não foi implementada reinterpretação de outras condições de término além de `untilDate` dentro deste patch.
- Não foi alterada `.github/copilot-instructions.md` porque a correção do arquivo de instrução ficou fora do escopo definido para esta etapa.

---

## 8) Resumo executivo

A correção do split encadeado foi aplicada no ponto real de falha: a série nova agora herda o fim original somente quando a origem era finita e ainda tinha ocorrência válida; a série original só é removida quando o corte realmente não deixa nenhuma ocorrência restante. A suíte final ficou em 157/157 e cada uma das seis mutações obrigatórias reverteu a correção, como o teste comportamental exigia.
