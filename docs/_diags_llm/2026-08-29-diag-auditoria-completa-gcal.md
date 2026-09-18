# Diagnóstico — auditoria completa da sincronização com o Google Calendar

**Data:** 2026-08-29
**Tipo:** diagnóstico (nenhum arquivo do repositório foi alterado)
**Base auditada:** working tree após a rodada B (`fix/duplicata-edicao-serie-gcal`),
suíte em 111/111
**Método:** execução real das funções de `backend/src/services/gcalSyncService.js` e
`backend/src/controllers/agendamentoController.js` em sandbox, com `fetch` e Mongoose
dublados, cruzada com a leitura dos relatórios anteriores em `docs/_reports/`

> **Observação de método.** As dependências (`mongoose`, `googleapis`,
> `google-auth-library`, `express`) foram dubladas. Os **payloads** enviados ao Google e as
> **decisões de fluxo** são reais, produzidos pelo código do repositório. O que **não** foi
> exercitado: comportamento do Google Calendar de verdade, rede, e o frontend em navegador.
> Todos os defeitos abaixo têm saída de execução colada.

---

## 1. Resumo

Os quatro fluxos principais pedidos — criar aula única, criar recorrência, editar série
inteira, editar apenas uma ocorrência — **funcionam corretamente** no código atual.

Foram encontrados **três defeitos reais** e **dois pontos de atenção**. O defeito 1 é da mesma
família da duplicata que as rodadas A–C vêm atacando: perda de sincronia silenciosa, sem erro
e sem aviso à usuária.

| # | Defeito | Gravidade | Ativo hoje? |
| --- | --- | --- | --- |
| 1 | Exceção no primeiro dia da série é descartada | **Crítico** | **Sim** |
| 2 | Série truncada antes do próprio início vira evento avulso no Google | Alto | Sim, em "editar esta e futuras" na 1ª ocorrência |
| 3 | Dia da semana sem acento derruba a recorrência em silêncio | Médio | Latente (dado legado / encoding) |
| 4 | `COUNT` + `EXDATE`: aluna recebe menos aulas que o contratado | A confirmar | Sim, se `COUNT` for usado |
| 5 | `excecoesDetalhadas` com horário próprio pode não remover nada | Latente | Não (lista sempre vazia hoje) |

---

## 2. O que está correto (verificado por execução)

### 2.1 Criar aula única

```
POST /calendars/primary/events
   start: 2026-09-03T09:00:00 | id: app6effc5499...
```

Sem `recurrence`, id determinístico, `extendedProperties.private.app_id` presente. Correto.

### 2.2 Criar recorrência

Série semanal Ter/Qui até 31/10, com `data` caindo numa segunda-feira (07/09):

```
POST /calendars/primary/events
   recurrence: ["RRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20261031T235959Z"]
   start: 2026-09-08T09:00:00
```

O `DTSTART` foi alinhado da segunda (07/09) para a terça (08/09), que é o primeiro dia do
`BYDAY`. É exatamente a correção da rodada de `DTSTART`/`BYDAY`, e está funcionando.

### 2.3 Editar série inteira

```
PUT /calendars/primary/events/appSERIE
   recurrence: ["RRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20261031T235959Z"]
   start: 2026-09-08T15:00:00
```

Um único `PUT`, no mesmo evento. Confirmado também que **o id determinístico não muda com a
edição**:

```
serie      : appc8261997ef42860fd75bf0e32871003c79ca625b54a465279e32e95060c76fb1
serie edit : appc8261997ef42860fd75bf0e32871003c79ca625b54a465279e32e95060c76fb1
MESMO id serie apos edicao? true
```

Isso importa porque o id deriva de `ownerEmail:agendamento.id` — não de campos que a edição
altera. Se derivasse de `data` ou `horarioInicio`, cada edição criaria um evento novo, o que
seria uma fábrica de duplicatas.

### 2.4 Editar apenas esta ocorrência

```
PUT /calendars/primary/events/appSERIE
   recurrence: ["RRULE:...;BYDAY=TU,TH;UNTIL=...", "EXDATE;TZID=America/Sao_Paulo:20260915T090000"]
POST /calendars/primary/events
   start: 2026-09-15T11:00:00 | id: app76022efb1...
```

`EXDATE` no pai + `POST` da ocorrência destacada, com id próprio. Correto.

### 2.5 Outras verificações que passaram

- **`montarPayloadGCal`** deixa `excecoes` e `excecoesDetalhadas` atravessarem a whitelist —
  se não deixasse, nenhum `EXDATE` seria gerado.
- **`gcalSyncPausado`** fica só na resposta HTTP: não é persistido no Mongo nem lido por
  `storage.js`. Verificado que `storage.js` tem **zero** ocorrências do campo. Portanto não
  entra na comparação local/remoto e **não gera divergência em loop**.
- **Mensal com e sem `diasSemana`**: com dias gera `BYDAY`, sem dias gera `BYMONTHDAY` a
  partir da data de início. Ambos corretos.
- **Virada de dia**: `horarioFim` menor que `horarioInicio` empurra o `end` para o dia
  seguinte, como esperado.
- **`fullDay`** usa `EXDATE;VALUE=DATE:` em vez de `TZID`, correto para evento de dia inteiro.
- **Exceção fora da janela** (antes do início, depois do fim) é descartada — correto, exceto
  no caso do defeito 1.

---

## 3. Defeito 1 (crítico) — exceção no primeiro dia da série é descartada

### Sintoma

```
### EXCECAO NO PRIMEIRO DIA DA SERIE
 data=2026-09-08, excecao=2026-09-08 -> []
 data=2026-09-08, excecao=2026-09-15 -> ["EXDATE;TZID=America/Sao_Paulo:20260915T090000"]
 recorrenciaDataInicio=2026-09-08, excecao=2026-09-08 -> []

### EXCECAO NO ULTIMO DIA (untilDate)
 fim=2026-09-29, excecao=2026-09-29 -> ["EXDATE;TZID=America/Sao_Paulo:20260929T090000"]

### RESUMO
 4 excecoes enviadas, EXDATEs gerados: 3
 -> [20260915T090000, 20260922T090000, 20260929T090000]
```

A exceção no primeiro dia **desaparece**. O último dia é preservado — é um off-by-one apenas
na borda inicial.

### Causa

Em `montarExdatesDeAgendamento` (`gcalSyncService.js`, ~linha 536):

```js
const dataSomente = new Date(Date.UTC(dataISO.getUTCFullYear(), dataISO.getUTCMonth(), dataISO.getUTCDate()));
if (startDate && dataSomente < startDate) {
  continue;
}
```

`startDate` vem de `parseDataISOParaDate`, que devolve **meio-dia UTC**:

```js
const parsed = new Date(value + 'T12:00:00Z');
```

Já `dataSomente` é normalizada para **meia-noite UTC**. No mesmo dia,
`00:00Z < 12:00Z` é verdadeiro, e o `continue` descarta a exceção.

O limite superior não sofre do problema porque a comparação é `dataSomente > endDate`, e
`00:00 > 12:00` é falso — a exceção sobrevive.

### Efeito prático

A usuária cancela ou remaneja **a primeira aula da série**:

1. o app registra a exceção e remove a aula da tela;
2. o `EXDATE` **não é enviado**, então a aula **continua no Google**;
3. se ela remanejou, o app cria a ocorrência destacada e faz o `POST` — o Google passa a ter
   **duas** entradas: a original que devia ter sido excluída e a nova.

É a duplicata que as rodadas A–C perseguem, por um caminho diferente: não é falha de rede nem
teto de tentativas, é o `EXDATE` nunca ter sido gerado. Não há erro, não há
`gcalSyncFailed`, não há aviso.

### Correção sugerida

Comparar as duas datas na mesma hora do dia — normalizar `startDate` e `endDate` para
meia-noite UTC antes do filtro, ou construir `dataSomente` também ao meio-dia. Mais um teste
de borda cobrindo exceção no primeiro dia, no último dia, e um dia antes do início.

---

## 4. Defeito 2 — série truncada antes do próprio início vira evento avulso

### Sintoma

Cenário: "editar esta e futuras" aplicado à **primeira** ocorrência. A série antiga é truncada
para terminar **antes** do seu próprio `DTSTART` alinhado.

```
### T2) corte na PRIMEIRA ocorrencia (fim 2026-09-07, DTSTART alinhado 08/09)
  DTSTART: 2026-09-08T09:00:00
  REC    : *** SEM RECURRENCE -> vira EVENTO UNICO ***
```

E no fluxo completo pelo controller:

```
### SERIE TRUNCADA ANTES DO PROPRIO INICIO (zero aulas no app)
   PUT | recurrence: AUSENTE | start: 2026-09-08T09:00:00
  HTTP 200 | gcalSyncFailed: false
  >>> O Google fica com UM evento avulso em 2026-09-08, fora da janela da serie.
```

Log emitido pela guarda:

```
[GCalSync] Ignorando recorrência porque DTSTART alinhado ultrapassa o UNTIL.
{ agendamentoId: 's1', dataBase: '2026-09-08', dataInicioAlinhada: '2026-09-08',
  until: '20260907T235959Z', motivo: 'DTSTART alinhado após UNTIL' }
```

### Causa

A guarda `dtstartAlinhadoUltrapassaUntil` faz `montarRecurrence` retornar `null`, o que evita
uma `RRULE` inválida — isso está correto. Mas `montarEventoGoogle` só omite a chave
`recurrence`; o **evento continua sendo enviado** com `start`/`end`.

Resultado: o app entende "série sem nenhuma aula"; o Google recebe **um evento avulso** na data
do `DTSTART`, fora da janela que a série deveria cobrir.

### Efeito prático

Aula fantasma no Google Calendar da usuária, em data que o app não mostra. Responde `HTTP 200`
sem `gcalSyncFailed`, portanto sem aviso.

### Correção sugerida

Quando a recorrência é anulada por `UNTIL` anterior ao `DTSTART`, o fallback correto é
**apagar o evento no Google** (`deleteEventFromGoogle`), não enviar um evento sem `recurrence`.
Alternativa mais conservadora: responder com flag própria e deixar a decisão para a rodada de
UI. Precisa de decisão de produto.

### Nota

O caso `T3` — corte no **mesmo** dia do `DTSTART` — funciona corretamente:

```
### T3) corte no MESMO dia do DTSTART (fim 2026-09-08)
  REC    : ["RRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20260908T235959Z"]
```

O problema é só quando o `UNTIL` fica estritamente antes.

---

## 5. Defeito 3 — dia da semana sem acento derruba a recorrência em silêncio

### Sintoma

```
### A) ["Terça","Quinta"] (canonico)
  DTSTART: 2026-09-08T09:00:00
  REC    : ["RRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20261031T235959Z"]

### B) ["Terca","Quinta"] (sem acento)
  DTSTART: 2026-09-10T09:00:00
  REC    : ["RRULE:FREQ=WEEKLY;BYDAY=TH;UNTIL=20261031T235959Z"]     <- terça sumiu

### C) ["Terca"] (unico dia, sem acento)
  REC    : *** SEM RECURRENCE -> vira EVENTO UNICO ***

### E) ["ter","qui"] abreviado
  REC    : *** SEM RECURRENCE -> vira EVENTO UNICO ***

### F) [2,4] numerico
  REC    : ["RRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20261031T235959Z"]  <- funciona
```

### Causa

`mapearDiaSemanaParaCodigoRFC` compara contra
`recurrenceHelpers.DEFAULT_DIAS_SEMANA`, que é:

```js
['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
```

A comparação é `toLowerCase()` mas **não remove acento**. `'Terca'` não casa com `'Terça'`.
Em `obterListaDiasSemanaParaRrule`, o valor não reconhecido é simplesmente **ignorado, sem
nenhum log**. Se a lista fica vazia, `montarRecurrence` retorna `null` e a série vira aula
avulsa.

Índice numérico funciona por causa do segundo ramo da função (`typeof nomeDia === 'number'`).

### Status

**Latente, não ativo.** O frontend grava a forma acentuada, vinda do mesmo
`DEFAULT_DIAS_SEMANA`. Mas qualquer um destes cenários ativa o defeito:

- dado legado gravado com outra convenção;
- importação/migração de agendamentos;
- problema de encoding em algum ponto da cadeia (arquivo salvo como Latin-1, resposta HTTP sem
  charset, etc.);
- refactor que troque a fonte dos nomes.

E a falha é **silenciosa**: série vira aula única, sem erro.

### Correção sugerida

Normalizar acento na comparação (`normalize('NFD').replace(/[\u0300-\u036f]/g, '')`), aceitar
abreviações, e — no mínimo — emitir `console.warn` quando um valor de `diasSemana` for
descartado. Hoje o descarte é completamente mudo.

---

## 6. Ponto de atenção 4 — `COUNT` + `EXDATE` reduz o número de aulas

### Comportamento observado

```
### G) COUNT=10 com 3 excecoes
[
 "RRULE:FREQ=WEEKLY;BYDAY=TU,TH;COUNT=10",
 "EXDATE;TZID=America/Sao_Paulo:20260915T090000",
 "EXDATE;TZID=America/Sao_Paulo:20260917T090000",
 "EXDATE;TZID=America/Sao_Paulo:20260922T090000"
]
```

### Por que importa

Pelo RFC 5545, o `COUNT` limita as ocorrências geradas pela `RRULE` **antes** da aplicação do
`EXDATE`. Com `COUNT=10` e 3 exceções, a aluna recebe **7 aulas**, não 10.

Se a expectativa comercial é "pacote de 10 aulas", cada cancelamento **encurta** o pacote em
vez de empurrar o fim para frente. Como o módulo financeiro conta aulas por ciclo, isso pode
divergir entre o que o app cobra e o que o Google mostra.

### Ação

**Não é bug até haver decisão de produto.** Precisa confirmar qual é o comportamento desejado:
`COUNT` fixo (aulas somem) ou `COUNT` ajustado (`COUNT = contratado + exceções`). Vale cruzar
com `docs/specs/financas-ciclo-cobranca.md` antes de decidir.

---

## 7. Ponto de atenção 5 — `excecoesDetalhadas` com horário próprio

### Comportamento observado

```
### T4) excecao detalhada horario 11:00, serie 09:00
  REC : ["RRULE:...", "EXDATE;TZID=America/Sao_Paulo:20260915T110000"]
```

### Por que importa

`montarExdatesDeAgendamento` prefere `excecoesDetalhadas` quando a lista existe e não está
vazia, e usa o `horarioInicio` **de cada item** para montar o `EXDATE`. O Google só remove uma
instância se o `EXDATE` casar **exatamente** com o horário da instância na série.

Se o item detalhado tiver horário diferente do horário da série, o `EXDATE` aponta para um
instante que não existe na recorrência, e **nada é removido** — sem erro.

### Status

**Latente, não ativo.** Verificado em `modal-acao-slot.js`: `excecoesDetalhadas` é sempre
inicializada como `[]` e nunca populada com horário próprio. Como a lista fica vazia, o código
cai no ramo de `excecoes` (strings simples), que usa o horário da série — correto.

É uma armadilha esperando ser ligada: no dia em que alguém popular `excecoesDetalhadas`, o
comportamento muda em silêncio.

### Correção sugerida

Ou ignorar o horário do item e sempre usar o da série, ou validar que os dois coincidem e
logar quando divergirem.

---

## 8. Verificações que não revelaram problema

| Cenário testado | Resultado |
| --- | --- |
| `data` em formato BR (`07/09/2026`) | Convertido corretamente |
| `data` vazia | Cai no fallback `new Date()` — dívida já conhecida, registrada |
| `data` inválida (`2026-13-45`) | Passa adiante sem validar — o Google rejeitaria; vale um guard, mas não é regressão nova |
| `diasSemana` vazio em série semanal | Vira evento único (comportamento defensável) |
| Exceções fora da janela (antes do início / depois do fim) | Descartadas corretamente |
| Todas as ocorrências excluídas por `EXDATE` | `RRULE` mantida com todos os `EXDATE`; o Google fica com série vazia — aceitável |
| `recorrenciaDataInicio` divergente de `data` | `DTSTART` usa `recorrenciaDataInicio`, conforme a precedência documentada |
| Mensal `monthOfDate` | `UNTIL` no último dia do mês, correto |
| `gcalSyncPausado` vazando para o estado local | **Não vaza** — zero ocorrências em `storage.js` |

---

## 9. Relação com as rodadas A–C

Nenhum dos defeitos acima invalida o que foi corrigido nas rodadas A, B e C:

- o teto de pendência saiu do frontend e a gravação no Mongo é incondicional — **continua
  válido**;
- `atualizarAgendamento` busca o documento completo — **continua válido**;
- `gcalSyncPausado` está isolado na resposta — **continua válido**;
- a suíte segue em 111/111 (medido nesta auditoria).

O defeito 1 é **independente** e anterior: ele explica duplicatas residuais que sobreviveriam
mesmo com as rodadas A–C todas aplicadas, porque o `EXDATE` nunca chega a existir.

---

## 10. Encaminhamento sugerido

1. **Fechar a rodada C** primeiro (variável global, mock placebo, seção da spec, guarda do
   `log.grupo`). Já está em execução.
2. **Rodada D — defeito 1.** Correção pequena e bem delimitada: comparação de datas na mesma
   hora, mais testes de borda. É a de maior retorno por linha alterada.
3. **Rodada E — defeito 2.** Exige decisão de produto sobre o fallback (apagar o evento vs.
   sinalizar). Discutir antes de escrever o prompt.
4. **Rodada F — defeito 3.** Normalizar acento e, principalmente, **parar de descartar valor
   de `diasSemana` em silêncio**.
5. **Decidir o item 4** (`COUNT` + `EXDATE`) cruzando com a spec do financeiro.
6. **Registrar o item 5** na seção "Fora de Escopo" da spec — a rodada C já vai criar essa
   seção.

Itens já mapeados e fora desta auditoria: reeditar à mão as séries antigas com `DTSTART`
defeituoso; rodada de UI usando `gcalSyncPausado`; `PUT` recorrente em item terminal sem
edição; unificação da precedência da data base.

---

## 11. Nota de honestidade

Esta auditoria roda o código real do repositório, mas com dependências dubladas. Os payloads
e as decisões de fluxo são reais; o comportamento do Google Calendar não foi exercitado.
Os defeitos 1, 2 e 3 são determinísticos e reproduzíveis em qualquer ambiente — dependem só
de aritmética de data e de comparação de string, não de rede.

Os pontos 4 e 5 dependem de como o Google interpreta `COUNT`/`EXDATE` e de dados que hoje não
existem; foram registrados como atenção, não como defeito confirmado.

Nenhum arquivo do repositório foi alterado por esta auditoria.
