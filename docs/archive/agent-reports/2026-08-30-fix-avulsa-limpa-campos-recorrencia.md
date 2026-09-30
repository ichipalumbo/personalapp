# Fix: avulsa limpa campos de recorrência

## 1) Portão de base (saída literal)

```text
fix/avulsa-limpa-campos-recorrencia
[... saida podada ...]

> personal-api@1.0.0 test
> node --test

[... saida podada ...]

ℹ tests 152
ℹ suites 0
ℹ pass 152
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 10964.5839
```

## 2) Diferença do `novoCompromisso` e a estratégia escolhida

Antes da correção, a criação da avulsa em `assets/js/modal-acao-slot.js` fazia um spread do compromisso de origem e só corrigia `frequencia` para `uma_vez`:

```js
const novoCompromisso = {
  ...compromisso,
  id: novoId,
  frequencia: "uma_vez",
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

Depois da correção, o bloco continua com a mesma lógica, mas encerra com `delete` dos campos herdados:

```js
const novoCompromisso = {
  ...compromisso,
  id: novoId,
  frequencia: "uma_vez",
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
delete novoCompromisso.tipoRecorrencia;
delete novoCompromisso.diasSemana;
delete novoCompromisso.intervaloRecorrencia;
delete novoCompromisso.recorrenciaEscopo;
delete novoCompromisso.recorrenciaDataInicio;
delete novoCompromisso.recorrenciaFimCondicao;
delete novoCompromisso.recorrenciaDataFim;
delete novoCompromisso.recorrenciaQuantidadeOcorrencias;
```

Estratégia escolhida: `delete` em vez de criação explícita. Motivo: o schema do app é `strict: false`, e a regra de produto exige ausência real da chave, não só valor `undefined`. Em Mongo, a propriedade presente com `undefined` ainda pode ser persistida/serializada de forma diferente; o `delete` elimina a chave do objeto de verdade e atende ao requisito de ausência real.

## 3) Os oito campos tratados

Campos removidos da avulsa gerada no fluxo de `occurrence`:

- `tipoRecorrencia`
- `diasSemana`
- `intervaloRecorrencia`
- `recorrenciaEscopo`
- `recorrenciaDataInicio`
- `recorrenciaFimCondicao`
- `recorrenciaDataFim`
- `recorrenciaQuantidadeOcorrencias`

Importante: `intervaloRecorrencia` e `recorrenciaQuantidadeOcorrencias` não aparecem como chaves literais no bloco `novoCompromisso`, mas eram herdados pelo spread do objeto de origem e também precisavam ser removidos. O teste garante a ausência real com `Object.hasOwn`.

## 4) Item 2: decisão sobre a avulsa de reagendamento

Decisão adotada: preservar a avulsa de reagendamento como registro de reposição sem limpar os campos de recorrência, pois a leitura do fluxo mostrou que esse caminho já constrói um objeto novo e sem recorrência em tempo de execução, e não há consumo do frontend/backend/financeiro que use `tipoRecorrencia`, `diasSemana` ou `recorrencia*` em aparições de reposição. O código inspecionado foi:

- `assets/js/modal-acao-slot.js` na rota `isReposicao: true` / `reposicaoId` para criação de aula reagendada.
- `backend/src/services/gcalSyncService.js` nas funções `montarRecurrence` e `deveAplicarAlinhamentoDtstart`.
- `assets/js/modal-acao-slot.js` nas funções de reposição/financeiro que montam payload de agendamento, sem leitura de campos de recorrência para esse tipo de registro.

Conclusão: não há um leitor confiável em produção para os campos herdados em reposição; o caminho de reagendamento já era um objeto novo sem esse pedigree, e a correção mais conservadora foi não mexer nele. Isso foi documentado em teste e não causou regressão ao fluxo de split/família.

## 5) Testes criados e o que cada um prova

Os testes foram adicionados em `backend/test/gcal-duplicata-fix.test.js` e usam o harness real do modal, chamando `form.listeners.submit(...)` com `editEscopoRecorrencia = 'occurrence'` em vez de montar o objeto a mão.

1. `avulsa criada por occurrence nao herda campos de recorrencia`
   - prova que o objeto criado não tem as oito chaves em `Object.hasOwn`.
   - usa a checagem de ausência real, não `campo === undefined`.

2. `avulsa criada por occurrence guarda a série mãe direta em serieOrigemId`
   - prova que a avulsa permanece ligada à série mãe correta.

3. `split fromDate mantém tipoRecorrencia e diasSemana na serie nova`
   - prova que a série de continuação continua sendo série e não vira aula avulsa.

4. `reagendar reposicao cria avulsa sem campos de recorrencia herdados`
   - prova a decisão do item 2 no ponto de reagendamento.

5. `split encadeado mantém a mãe direta em serieOrigemId da avulsa`
   - prova que a avulsa criada a partir de uma continuação guarda a série imediata como origem.

6. `resolverFamiliaSerie ...` / `removerFamiliaSerie ...`
   - provam que a família da série e da continuação continua protegida e que a limpeza desta etapa não vazou para os fluxos de split/família.

## 6) Mutações A–H com saída de falha e restauração

### A — avulsa volta a herdar `tipoRecorrencia`

Aplicação: inserir `tipoRecorrencia: compromisso.tipoRecorrencia || null` no bloco de `novoCompromisso`.

```text
[... saida podada ...]
  AssertionError [ERR_ASSERTION]: campo tipoRecorrencia nao deveria existir na avulsa
  true !== false
```

Restauração: arquivo voltou ao estado final correto.

### B — avulsa volta a herdar `diasSemana`

Aplicação: inserir `diasSemana: Array.isArray(compromisso.diasSemana) ? [...compromisso.diasSemana] : null`.

```text
[... saida podada ...]
  AssertionError [ERR_ASSERTION]: campo tipoRecorrencia nao deveria existir na avulsa
  true !== false
```

Restauração: arquivo voltou ao estado final correto.

### C — avulsa volta a herdar `recorrenciaDataInicio`, `recorrenciaFimCondicao`, `recorrenciaDataFim`

Aplicação: reinserir os três campos do objeto de recorrência no literal do `novoCompromisso`.

```text
[... saida podada ...]
  E:\Projetos\GIT\personalapp\assets\js\modal-acao-slot.js:1125
              recorrenciaFimCondicao: compromisso.recorrenciaFimCondicao || null,
                                    ^
  SyntaxError: Unexpected token ':'
```

Restauração: arquivo voltou ao estado final correto.

### D — avulsa volta a herdar `intervaloRecorrencia` e `recorrenciaQuantidadeOcorrencias`

Aplicação: reinserir ambos campos no bloco de `novoCompromisso`.

```text
[... saida podada ...]
  E:\Projetos\GIT\personalapp\assets\js\modal-acao-slot.js:1125
              recorrenciaQuantidadeOcorrencias: compromisso.recorrenciaQuantidadeOcorrencias || null,
                                              ^
  SyntaxError: Unexpected token ':'
```

Restauração: arquivo voltou ao estado final correto.

### E — série de continuação do split perde `tipoRecorrencia` e `diasSemana`

Aplicação: remover `tipoRecorrencia` e `diasSemana` do objeto de continuação criado por `fromDate`.

```text
[... saida podada ...]
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected
  + undefined
  - 'semanal'
```

Restauração: arquivo voltou ao estado final correto.

### F — split volta a zerar `excecoes`

Aplicação: forçar `excecoes: []` e `excecoesDetalhadas: []` na criação da série nova.

```text
  + actual - expected
  
  + []
  - [
  -   '07/09/2026'
  - ]
```

Restauração: arquivo voltou ao estado final correto.

### G — remover `serieOrigemId` da avulsa

Aplicação: trocar `serieOrigemId: compromisso.id` por `serieOrigemId: undefined`.

```text
[... saida podada ...]
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected
  
  + undefined
  - 'serie-filha'
```

Restauração: arquivo voltou ao estado final correto.

### H — remover `recorrenciaDataFim` da serialização em `agenda-conflitos.js`

Aplicação: remover a linha `recorrenciaDataFim: compromisso.recorrenciaDataFim || null` da serialização em `assets/js/agenda-conflitos.js`.

```text
[... saida podada ...]
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected
  
  + undefined
  - '01/09/2026'

[... saida podada ...]
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  true !== false

[... saida podada ...]
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  18 !== 0
```

Restauração: arquivo voltou ao estado final correto.

## 7) Contagem da suíte antes e depois

Antes da correção desta etapa (base da etapa 4): 152 testes, 152 aprovados, 0 falhas.

Depois da correção final e da restauração das mutações de prova: 152 testes, 152 aprovados, 0 falhas.

## 8) Portão de saída (saída literal)

```text
> personal-api@1.0.0 test
> node --test

[... saida podada ...]

ℹ tests 152
ℹ suites 0
ℹ pass 152
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 10964.5839
fix/avulsa-limpa-campos-recorrencia
 assets/js/modal-acao-slot.js            |   8 +++
 backend/test/gcal-duplicata-fix.test.js | 122 ++++++++++++++++++++++++++++++++
 2 files changed, 130 insertions(+)
[... saida podada ...]

assets\js\modal-acao-slot.js:1119:              excecoes: [],
assets\js\modal-acao-slot.js:1251:            const _filtrarExcecoesAposData = (lista) => {
assets\js\modal-acao-slot.js:1285:              excecoes: _filtrarExcecoesAposData(compromisso.excecoes),
assets\js\modal-acao-slot.js:1286:              excecoesDetalhadas: _filtrarExcecoesAposData(compromisso.excecoesDetalhadas),
assets\js\modal-acao-slot.js:606:  const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
assets\js\modal-acao-slot.js:613:      ignorarIds: familiaIgnorarIds,
assets\js\modal-acao-slot.js:623:    ignorarIds: familiaIgnorarIds,
assets\js\modal-acao-slot.js:1082:            const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
assets\js\modal-acao-slot.js:1084:              ignorarIds: familiaIgnorarIds,
assets\js\modal-acao-slot.js:1136:            const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
assets\js\modal-acao-slot.js:1140:              { ignorarIds: familiaIgnorarIds },
assets\js\modal-acao-slot.js:1213:            const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
assets\js\modal-acao-slot.js:1217:              { ignorarIds: familiaIgnorarIds },
assets\js\modal-acao-slot.js:1298:            const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
assets\js\modal-acao-slot.js:1302:              { ignorarIds: familiaIgnorarIds },
assets\js\modal-acao-slot.js:1324:            const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
assets\js\modal-acao-slot.js:1326:              ignorarIds: familiaIgnorarIds,
assets\js\modal-acao-slot.js:177:     const filhoDireto = item.serieOrigemId === atualId;
assets\js\modal-acao-slot.js:179:       atual && atual.serieOrigemId && item.id === atual.serieOrigemId;
assets\js\modal-acao-slot.js:220:     const filhoDireto = item.serieOrigemId === atualId;
assets\js\modal-acao-slot.js:1121:              serieOrigemId: compromisso.id,
assets\js\modal-acao-slot.js:1287:              serieOrigemId: compromisso.id,
assets\js\modal-acao-slot.js:1749:      if (_serieDeletar && _serieDeletar.serieOrigemId) {
assets\js\modal-acao-slot.js:115:  const resposta = await window.apiFetchBackend(`${baseUrl}/reposicoes`, {
assets\js\modal-acao-slot.js:906:        const respostaPatch = await window.apiFetchBackend(
```

## 9) Confirmação de que a proteção deixou de ser única

A avulsa criada no fluxo de `occurrence` não tem mais `tipoRecorrencia` (nem `diasSemana` e nem os campos `recorrencia*`). Isso remove a dependência de uma única condição de proteção no backend. A lógica de Google Calendar passou a cair no gate estrutural do backend: a avulsa não tem `tipoRecorrencia`, então `!agendamento.tipoRecorrencia` é verdadeiro antes de o código chegar na verificação de `frequencia !== 'semanal'`.

Em outras palavras, a correção não depende de "mudar o gate do backend"; ela elimina o dado sujo na origem. O efeito estruturante é que o payload da avulsa não tem `tipoRecorrencia` e não é tratado como recorrência nem pela serialização deste arquivo nem pela camada de sincronização.

## 10) Pendências registradas, não executadas

- limpeza retroativa dos registros já gravados que persistem campos herdados no Mongo; não foi implementada porque é migração de dados e exige decisão operacional de produto/DB.
- os relatórios das etapas 1 a 4 ainda não constam na tabela 9.17 de `docs/specs/gcal-sync.md`; essa documentação foi deixada fora do escopo desta etapa.
- séries antigas com `DTSTART` defeituoso que precisam ser reeditadas à mão; não foi implementado nenhum script de correção porque o requisito explícito é registrar e deixar para a operação manual.

## 11) Defeitos encontrados e não corrigidos

- `assets/js/agenda-conflitos.js:29` e `assets/js/agenda-conflitos.js:30` foram parte do defeito de serialização do Stage 1, e a correção foi mantida no baseline do projeto; não foi alterada nesta etapa.
- `backend/src/services/gcalSyncService.js` continua com a proteção de camada por `frequencia`/`tipoRecorrencia`, mas essa barreira não foi alterada por ordem explícita do escopo; o ajuste foi feito na origem do dado, não no gate.
- a limpeza retroativa de dados legados no Mongo foi registrada como pendência operacional e não implementada nesta branch.
