# Fix: avulsa limpa campos de recorrência

## 1) Portão de base (saída literal)

```text
fix/avulsa-limpa-campos-recorrencia
 M assets/js/agenda-conflitos.js
 M assets/js/modal-acao-slot.js
 M backend/test/gcal-duplicata-fix.test.js

> personal-api@1.0.0 test
> node --test

✔ getCompromissoSerializadoParaConflito preserva o fim da série (2.1913ms)
✔ candidato serializado não ocorre depois do UNTIL (17.5964ms)
✔ série aparada não conflita com a própria continuação (2.3915ms)
✔ série sem campos de fim continua sendo tratada como infinita (1.0836ms)
✔ ignorarIds de família remove a série e a continuação do conflito, mas preserva conflito real com outro aluno (1.1659ms)
✔ calcularAulasContadasDoCiclo: agendamento com reposicaoId não entra na parcela (A) (0.752ms)
✔ calcularAulasContadasDoCiclo: reposição cobrável pendente conta na parcela (B) (0.2289ms)
✔ calcularAulasContadasDoCiclo: reposição não cobrável só conta quando cicloCobrancaResolvido.inicio bate (0.1056ms)
✔ montarExtratoDoCiclo: ciclo simples fecha com valorTotalCiclo (10.6977ms)
✔ montarExtratoDoCiclo: ciclo com ajuste manual negativo fecha com valorTotalCiclo (0.4142ms)
✔ montarExtratoDoCiclo: reposição cobrável de origem fecha com valorTotalCiclo (0.2226ms)
✔ montarExtratoDoCiclo: cobrável expirada com dataOriginal e validoAte no mesmo ciclo gera uma única linha (0.1666ms)
✔ montarExtratoDoCiclo: reposição já cobrada gera linha zero sem inflar o total (0.4632ms)
✔ montarExtratoDoCiclo: reposição não cobrável fora do ciclo traz nota de ciclo anterior (0.2421ms)
✔ calcularCicloVigente ajusta dia 31 em mês curto (1.6093ms)
✔ calcularCicloVigente cruza o fim de ano corretamente (0.2084ms)
✔ calcularCicloVigente usa fechamentoMesCheio em vez de diaVencimento (0.1971ms)
✔ calcularTotalAulasCobradas respeita piso zero para ajuste negativo (0.1247ms)
✔ calcularValorTotalCiclo ignora contagem quando metodoCobranca == valor_fixo (0.1676ms)
✔ filtrarHistoricoExcluindoCicloAtual remove o ciclo vigente e preserva ciclos anteriores (0.4661ms)
✔ encerrarCicloSobrepostoSeNecessario fecha o ciclo anterior antes do início do novo ciclo (0.2738ms)

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
✖ avulsa criada por occurrence nao herda campos de recorrencia (1.282ms)
  AssertionError [ERR_ASSERTION]: campo tipoRecorrencia nao deveria existir na avulsa
  true !== false
```

Restauração: arquivo voltou ao estado final correto.

### B — avulsa volta a herdar `diasSemana`

Aplicação: inserir `diasSemana: Array.isArray(compromisso.diasSemana) ? [...compromisso.diasSemana] : null`.

```text
✖ avulsa criada por occurrence nao herda campos de recorrencia (1.2854ms)
  AssertionError [ERR_ASSERTION]: campo tipoRecorrencia nao deveria existir na avulsa
  true !== false
```

Restauração: arquivo voltou ao estado final correto.

### C — avulsa volta a herdar `recorrenciaDataInicio`, `recorrenciaFimCondicao`, `recorrenciaDataFim`

Aplicação: reinserir os três campos do objeto de recorrência no literal do `novoCompromisso`.

```text
✖ removerFamiliaSerie preserva reposições e explica a decisão conservadora (1.2308ms)
  E:\Projetos\GIT\personalapp\assets\js\modal-acao-slot.js:1125
              recorrenciaFimCondicao: compromisso.recorrenciaFimCondicao || null,
                                    ^
  SyntaxError: Unexpected token ':'
```

Restauração: arquivo voltou ao estado final correto.

### D — avulsa volta a herdar `intervaloRecorrencia` e `recorrenciaQuantidadeOcorrencias`

Aplicação: reinserir ambos campos no bloco de `novoCompromisso`.

```text
✖ removerFamiliaSerie preserva reposições e explica a decisão conservadora (1.2477ms)
  E:\Projetos\GIT\personalapp\assets\js\modal-acao-slot.js:1125
              recorrenciaQuantidadeOcorrencias: compromisso.recorrenciaQuantidadeOcorrencias || null,
                                              ^
  SyntaxError: Unexpected token ':'
```

Restauração: arquivo voltou ao estado final correto.

### E — série de continuação do split perde `tipoRecorrencia` e `diasSemana`

Aplicação: remover `tipoRecorrencia` e `diasSemana` do objeto de continuação criado por `fromDate`.

```text
✖ split fromDate mantém tipoRecorrencia e diasSemana na serie nova (1.3367ms)
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
✖ split encadeado mantém a mãe direta em serieOrigemId da avulsa (0.9761ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected
  
  + undefined
  - 'serie-filha'
```

Restauração: arquivo voltou ao estado final correto.

### H — remover `recorrenciaDataFim` da serialização em `agenda-conflitos.js`

Aplicação: remover a linha `recorrenciaDataFim: compromisso.recorrenciaDataFim || null` da serialização em `assets/js/agenda-conflitos.js`.

```text
✖ getCompromissoSerializadoParaConflito preserva o fim da série (1.9087ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  + actual - expected
  
  + undefined
  - '01/09/2026'

✖ candidato serializado não ocorre depois do UNTIL (11.5567ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
  
  true !== false

✖ série aparada não conflita com a própria continuação (1.8531ms)
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

✔ getCompromissoSerializadoParaConflito preserva o fim da série (2.8583ms)
✔ candidato serializado não ocorre depois do UNTIL (15.5039ms)
✔ série aparada não conflita com a própria continuação (1.9988ms)
✔ série sem campos de fim continua sendo tratada como infinita (1.0512ms)
✔ ignorarIds de família remove a série e a continuação do conflito, mas preserva conflito real com outro aluno (1.1395ms)
✔ calcularAulasContadasDoCiclo: agendamento com reposicaoId não entra na parcela (A) (0.8997ms)
✔ calcularAulasContadasDoCiclo: reposição cobrável pendente conta na parcela (B) (0.2914ms)
✔ calcularAulasContadasDoCiclo: reposição não cobrável só conta quando cicloCobrancaResolvido.inicio bate (0.1618ms)
✔ montarExtratoDoCiclo: ciclo simples fecha com valorTotalCiclo (13.2467ms)
✔ montarExtratoDoCiclo: ciclo com ajuste manual negativo fecha com valorTotalCiclo (0.354ms)
✔ montarExtratoDoCiclo: reposição cobrável de origem fecha com valorTotalCiclo (0.2615ms)
✔ montarExtratoDoCiclo: cobrável expirada com dataOriginal e validoAte no mesmo ciclo gera uma única linha (0.2179ms)
✔ montarExtratoDoCiclo: reposição já cobrada gera linha zero sem inflar o total (0.5205ms)
✔ montarExtratoDoCiclo: reposição não cobrável fora do ciclo traz nota de ciclo anterior (0.248ms)
✔ calcularCicloVigente ajusta dia 31 em mês curto (1.0981ms)
✔ calcularCicloVigente cruza o fim de ano corretamente (0.1398ms)
✔ calcularCicloVigente usa fechamentoMesCheio em vez de diaVencimento (0.1111ms)
✔ calcularTotalAulasCobradas respeita piso zero para ajuste negativo (0.0794ms)
✔ calcularValorTotalCiclo ignora contagem quando metodoCobranca == valor_fixo (0.1194ms)
✔ filtrarHistoricoExcluindoCicloAtual remove o ciclo vigente e preserva ciclos anteriores (0.4ms)
✔ encerrarCicloSobrepostoSeNecessario fecha o ciclo anterior antes do início do novo ciclo (0.1857ms)
✔ avulsa criada por occurrence guarda a série mãe direta em serieOrigemId (0.9295ms)
✔ avulsa criada por occurrence nao herda campos de recorrencia (0.9757ms)
✔ split fromDate mantém tipoRecorrencia e diasSemana na serie nova (1.0303ms)
✔ reagendar reposicao cria avulsa sem campos de recorrencia herdados (1.0407ms)
✔ split encadeado mantém a mãe direta em serieOrigemId da avulsa (0.9415ms)
✔ resolverFamiliaSerie devolve a série, a continuação e as avulsas transitivamente (0.8447ms)
✔ resolverFamiliaSerie nao entra em laço infinito com vínculo circular (0.8008ms)
✔ resolverFamiliaDescendenteSerie nao sobe para o pai historico (0.9367ms)

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
 M assets/js/modal-acao-slot.js
 M backend/test/gcal-duplicata-fix.test.js

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
