# Correção — duplicata ao editar aula de série recorrente no Google Calendar

## Escopo executado

Esta rodada implementa a correção da duplicata com quatro peças coordenadas:

1. idempotência no insert do Google;
2. marca remota de pendência quando a perna Google falha;
3. limpeza da marca quando a operação converge;
4. merge do `googleCalendarEventId` no estado local e trava de reentrância no submit de edição.

Nenhum endpoint novo foi adicionado. Não foi criado job em background.

---

## Portão 2.0 — round-trip do campo novo

Portão aprovado antes da correção.

### 1) `limparPayloadAgendamento` remove só `_id`, `__v` e `ownerEmail`

Evidência em `backend/src/utils/controllerHelpers.js`: `limparPayload(payload, campos = ['_id', '__v', 'ownerEmail'])`.

Consequência: um campo novo sobrevive ao corpo do `PUT`.

### 2) `Agendamento` usa `{ strict: false }`

Evidência em `backend/src/models/Agendamento.js`: o schema termina com `{ strict: false }`.

Consequência: o Mongo persiste campos não declarados no schema.

### 3) `normalizarAgendamentoParaResposta` devolve o campo

Evidência em `backend/src/controllers/agendamentoController.js`: `normalizarAgendamentoParaResposta` só chama `toObject()` e devolve o objeto sem whitelist de saída.

Consequência: o campo aparece no `GET`/na resposta do CRUD.

### 4) `PUT` sem o campo não faz `$unset`

Evidência em `backend/src/controllers/agendamentoController.js`: `atualizarAgendamento` usa `findOneAndUpdate(..., { $set: agendamentoNormalizado })`; chaves ausentes não viram `$unset`.

Consequência: o campo novo não entra em loop infinito por ser apagado em cada `PUT`.

### Cobertura automática do portão

O teste `portao 2.0: campo novo atravessa PUT e GET, strict false persiste e ausencia no corpo nao faz unset` em `backend/test/gcal-duplicata-fix.test.js` cobre os quatro pontos.

---

## Mecanismo do bug

O bug corrigido era este:

1. a série pai recebia `EXDATE`/`UNTIL` e o Mongo gravava com sucesso;
2. a operação no Google falhava depois da gravação local;
3. o backend respondia `HTTP 200` com `gcalSyncFailed: true`;
4. o loop seguia e criava a nova ocorrência;
5. no sync seguinte, local e remoto eram tratados como equivalentes;
6. o `PUT` da série não era reemitido e a duplicata ficava permanente.

---

## O que mudou

### 1) Idempotência no insert do Google

Arquivo: `backend/src/services/gcalSyncService.js`

- `pushEventToGoogle` agora deriva um id determinístico e estável a partir de `ownerEmail + agendamento.id`;
- o id usa hash SHA-256 em formato compatível com o id do Google;
- em conflito `409`, o código busca o evento já existente e trata como sucesso idempotente;
- `googleCalendarEventId` preexistente continua sendo a fonte de verdade do caminho de update.

### 2) Marca de pendência no documento

Arquivo: `backend/src/controllers/agendamentoController.js`

- falha na perna Google de `criar`/`atualizar` grava `gcalSyncPendingAt`;
- sucesso na operação limpa `gcalSyncPendingAt` no mesmo ponto em que persiste `googleCalendarEventId`;
- a marca volta naturalmente no `GET` da lista porque o documento é retornado sem whitelist de saída.

### 3) Merge do `googleCalendarEventId` no estado local

Arquivo: `assets/js/storage.js`

- o CRUD de agendamentos passa a ler o payload do `POST`/`PUT`;
- quando o backend devolve `googleCalendarEventId`, o objeto local em memória recebe o valor imediatamente;
- isso evita depender do banco para descobrir o id no sync seguinte.

### 4) Trava de duplo clique no submit de edição

Arquivo: `assets/js/modal-acao-slot.js`

- o submit de `formEditarCompromisso` agora usa flag de reentrância;
- o botão submit é desabilitado enquanto a operação está em andamento;
- a liberação fica em `finally`, inclusive para `alert`, conflito e erro.

---

## Por que a idempotência é pré-requisito da pendência

Sem idempotência, um retry de `POST` depois de resposta perdida poderia criar um segundo evento no Google. Nesse cenário, a própria pendência seria uma nova fonte de duplicata.

Com id determinístico + tratamento de `409`, o retry reaproveita o mesmo evento e a pendência pode ser reemitida com segurança.

---

## Convergência e teto de tentativas

O desenho converge assim:

- enquanto o Google falhar, o documento remoto fica com `gcalSyncPendingAt`;
- o local não recebe essa marca;
- `assets/js/storage.js` detecta a diferença e reemite o `PUT`;
- quando a chamada passa, o backend limpa a marca;
- no sync seguinte, local e remoto voltam a ser iguais e o loop para.

Não foi implementado teto de tentativas nesta rodada.

Justificativa:

- hoje o retry já tem backoff natural pela atividade da usuária;
- um teto sem nova sinalização de produto criaria risco de parar silenciosamente;
- em falha permanente (ex.: credencial revogada), o comportamento atual ainda expõe aviso de falha ao salvar/sincronizar.

Se no futuro houver teto, ele precisa vir junto com uma superfície explícita de UX dizendo que a ressincronização foi pausada.

---

## Testes automatizados

### Suíte baseline

- `node --test test/gcal-sync.test.js`: **46/46 passando**
- `npm test`: **96/96 passando**

### Suíte final

- `node --test test/gcal-sync.test.js`: **46/46 passando**
- `node --test test/gcal-duplicata-fix.test.js`: **8/8 passando**
- `npm test`: **105/105 passando**

Observação importante: os 46 testes já existentes em `backend/test/gcal-sync.test.js` mantiveram o mesmo resultado.

### Cobertura adicionada

Arquivo novo: `backend/test/gcal-duplicata-fix.test.js`

1. `pushEventToGoogle usa id deterministico e trata 409 como sucesso idempotente`
2. `atualizarAgendamento com googleCalendarEventId existente usa updateEventInGoogle`
3. `atualizarAgendamento grava marca de pendencia quando a chamada ao Google falha`
4. `atualizarAgendamento limpa marca de pendencia quando o Google responde com sucesso`
5. `portao 2.0: campo novo atravessa PUT e GET, strict false persiste e ausencia no corpo nao faz unset`
6. `storage mescla googleCalendarEventId local apos POST do agendamento`
7. `convergencia: apos limpar a pendencia, sync seguinte nao reemite PUT adicional`
8. `cenario completo da duplicata: falha no PUT da serie marca pendencia e o sync seguinte reemite a serie`

---

## Prova por mutação

Cada mutação abaixo foi aplicada temporariamente, o teste correspondente falhou e o código foi restaurado em seguida.

1. **Remover id determinístico + tratamento de `409` em `pushEventToGoogle`**
   - falha observada: `pushEventToGoogle usa id deterministico e trata 409 como sucesso idempotente`
   - sintoma: a segunda criação voltou a propagar `409 Conflict`

2. **Forçar `atualizarAgendamento` a ignorar `googleCalendarEventId` existente**
   - falha observada: `atualizarAgendamento com googleCalendarEventId existente usa updateEventInGoogle`
   - sintoma: a asserção `update === 1` caiu para `0`

3. **Remover a gravação de `gcalSyncPendingAt` no caminho de falha**
   - falha observada: `atualizarAgendamento grava marca de pendencia quando a chamada ao Google falha`
   - sintoma: `gcalSyncPendingAt` deixou de existir na resposta/marcação

4. **Remover a limpeza de `gcalSyncPendingAt` no caminho de sucesso**
   - falha observada: `atualizarAgendamento limpa marca de pendencia quando o Google responde com sucesso`
   - sintoma: o `$unset` esperado desapareceu

5. **Remover o merge local de `googleCalendarEventId` em `assets/js/storage.js`**
   - falhas observadas:
     - `storage mescla googleCalendarEventId local apos POST do agendamento`
     - `cenario completo da duplicata: falha no PUT da serie marca pendencia e o sync seguinte reemite a serie`
   - sintoma: o id local ficou `null` e o cenário completo passou a emitir escrita extra

6. **Excluir `gcalSyncPendingAt` da comparação local × remoto**
   - falhas observadas:
     - `convergencia: apos limpar a pendencia, sync seguinte nao reemite PUT adicional`
     - `cenario completo da duplicata: falha no PUT da serie marca pendencia e o sync seguinte reemite a serie`
   - sintoma: o retry natural da série deixou de acontecer

7. **Fazer `limparPayload` descartar o campo de teste do portão**
   - falha observada: `portao 2.0: campo novo atravessa PUT e GET, strict false persiste e ausencia no corpo nao faz unset`
   - sintoma: o campo novo deixou de atravessar o `PUT`

---

## Roteiro de teste manual após deploy

1. Editar uma ocorrência de série e confirmar **um único** evento no Google, na data nova, sem sobra na data antiga.
2. Repetir com a rede degradada para forçar a falha do Google e confirmar que o sync seguinte corrige sozinho em vez de deixar duplicata.
3. Dar duplo clique no botão de salvar e confirmar que só uma operação é disparada.
4. Repetir os fluxos `fromDate` e exclusão de ocorrência.

O passo 3 do plano geral (reeditar manualmente as séries antigas com `DTSTART` defeituoso) só deve acontecer **depois** desta correção estar em produção e verificada.

---

## O que foi encontrado e não foi alterado

- `assets/js/google-calendar.js` continua ignorando `_agendamento`, `operacao` e `snapshotAnterior`; isso já não era a correção principal desta rodada.
- `montarPayloadGCal` permaneceu com whitelist fechada.
- `assets/js/shared/recurrence-helpers.js` e toda a correção da Fase 1 ficaram intactos.
- `resolverDataISO` não foi alterado.
- Não foi adicionada nenhuma política de teto para retries.
- O caminho de exclusão física continua sem mecanismo equivalente de “pendência no próprio documento”, porque o documento deixa de existir após o `DELETE`; isso foi apenas registrado, não redesenhado nesta rodada.
