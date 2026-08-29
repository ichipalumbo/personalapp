# Diagnóstico — duplicata ao editar aula de série recorrente no Google Calendar

## Resumo executivo

A hipótese mais forte continua sendo a combinação de dois fatores confirmados no código:

1. `assets/js/google-calendar.js` recebe um `_agendamento` e `opcoes`, mas ignora ambos e dispara um bulk sync genérico com `salvarDados()`;
2. `assets/js/storage.js` compara agendamentos incluindo `excecoes`, então a edição de uma instância ou split de série gera um `PUT` da série pai mesmo quando a mudança é só uma exceção.

Quando a chamada para o Google falha depois do Mongo já ter sido atualizado, o backend responde `HTTP 200` com `gcalSyncFailed: true`, o UI trata isso como sucesso local e não reprocessa a correção. O Google fica com a ocorrência antiga e a nova, e a duplicata vira permanente.

A correção provável exige refactor de arquitetura do sync, mas este relatório não propõe implementação — apenas diagnostica e documenta a evidência estática.

## Evidência de simulação fora do repositório

Foi executado um mini-harness em `/tmp` sem alterar arquivos do repositório. O objetivo foi registrar a sequência esperada para o fluxo `occurrence` e confirmar o ponto de acoplamento entre o bulk sync da UI e o CRUD local.

Sequência observada:

```json
[
  { "kind": "gcal", "action": "bulk", "id": "serie-1", "op": "atualizar", "hasSnapshot": true },
  { "kind": "gcal", "action": "bulk", "id": "serie-1-occ-1", "op": "criar", "hasSnapshot": false },
  { "kind": "crud", "action": "PUT", "id": "serie-1" },
  { "kind": "crud", "action": "POST", "id": "serie-1-occ-1" }
]
```

Conclusão da simulação:

- a UI dispara duas sincronizações independentes no mesmo fluxo: `atualizar` na série e `criar` na nova ocorrência;
- a rotina local de CRUD, quando processa `listaLocal`, coloca `PUT` da série antes do `POST` da nova ocorrência;
- mas a assinatura do `salvarEventoComGCal` não preserva essa ordem no Google, porque o wrapper ignora o contexto e só chama `salvarDados()`.

## 1. Respostas às 7 perguntas

### 1) `excecoes` entra em `_normalizarAgendamentoParaComparacao`?

Resposta: sim. A decisão é decisiva e está em [assets/js/storage.js](../../assets/js/storage.js):

- `_normalizarAgendamentoParaComparacao` apenas remove `ownerEmail`, `_id` e `__v`;
- `excecoes` permanece na cópia;
- `_agendamentosSaoIguais` compara `JSON.stringify(_normalizarAgendamentoParaComparacao(...))`.

Consequência: quando a série ganha uma exceção, o local e o remoto deixam de ser iguais e o `PUT` da série pai é disparado. Isso torna a duplicata dependente de falha da chamada ao Google, o que explica a intermitência.

### 2) `salvarEventoComGCal` ignora `_agendamento`, `operacao` e `snapshotAnterior`? Quantos pontos de chamada passam esses parâmetros inutilmente?

Resposta: confirmado. A função está em [assets/js/google-calendar.js](../../assets/js/google-calendar.js):

```js
global.salvarEventoComGCal = async function (_agendamento, opcoes) {
    var opts = opcoes && typeof opcoes === 'object' ? opcoes : {};
    var silencioso = opts.silencioso === true;

    if (_isAppSignedIn()) {
        await _ensureCalendarConnection({ interactive: true, force: false });
    }

    return _persistirDadosComBackend(silencioso);
};
```

O código não lê `_agendamento`, `opts.operacao`, nem `opts.snapshotAnterior`.

Contagem confirmada com busca no código:

- [assets/js/modal-acao-slot.js](../../assets/js/modal-acao-slot.js): `operacao` em 8 pontos de chamada; `snapshotAnterior` em 5 pontos de chamada.
- [assets/js/modal-agendamento.js](../../assets/js/modal-agendamento.js): `operacao` em 1 ponto de chamada; `snapshotAnterior` em 0.

Todos os parâmetros são descartados.

### 3) Na ordem de iteração de `_sincronizarAgendamentosViaCRUD`, o PUT da série pai vem antes ou depois do POST da nova ocorrência? A ordem é determinística?

Resposta: sim, dentro do próprio loop local a ordem é determinística e, no caso mais típico de `occurrence`, o `PUT` da série pai vem antes do `POST` da nova ocorrência.

Evidência em [assets/js/storage.js](../../assets/js/storage.js):

```js
for (const agendamento of listaLocal) {
    const remoto = remotoPorId.get(agendamento.id);
    if (!remoto) {
        const resCriar = await apiFetchBackend(...POST...);
        ...
        continue;
    }

    if (!_agendamentosSaoIguais(agendamento, remoto)) {
        const resAtualizar = await apiFetchBackend(...PUT...);
        ...
    }
}
```

Como `listaLocal` é iterado em ordem de array, a série pai é processada antes do item novo quando o array estiver em `[série, novaOcorrencia]`. A ordem do loop é determinística.

O ponto crítico é que a UI dispara `salvarEventoComGCal` em duas cadeias independentes no fluxo de edição:

```js
const _gcalSeriePromise = salvarEventoComGCal(compromisso, { operacao: "atualizar", snapshotAnterior: _snapshotEdicao });
_gcalSeriePromise.then(() => salvarEventoComGCal(_novaOcorrenciaSerie, { operacao: "criar" }));
```

Essas duas chamadas não compartilham um lock nem `await` entre si. A ordem do Google não é garantida pela própria UI; a garantia só existe dentro de um único loop local, não entre as duas sincronizações independentes.

### 4) `pushEventToGoogle` é idempotente?

Resposta: não. A evidência está em [backend/src/services/gcalSyncService.js](../../backend/src/services/gcalSyncService.js):

```js
async function pushEventToGoogle(ownerEmail, agendamento) {
  const { connection, oauth2Client } = await getClientForOwner(ownerEmail);
  const evento = montarEventoGoogle(agendamento);
  const calendarioId = connection.calendarId || 'primary';

  const criado = await calendarFetch(oauth2Client, `/calendars/${encodeURIComponent(calendarioId)}/events`, {
    method: 'POST',
    body: evento
  });
```

Não há `eventId` idempotente, não há deduplicação, não há `409 conflict` handling com chave client-side. Reexecutar `POST` pode criar outro evento. O Google suporta `eventId` na criação, mas este código não usa essa capacidade.

### 5) O `googleCalendarEventId` devolvido pelo backend é mesclado de volta ao estado local?

Resposta: só do lado do Mongo, não do lado do front-end em memória. O backend persiste `googleCalendarEventId` em [backend/src/controllers/agendamentoController.js](../../backend/src/controllers/agendamentoController.js), nos blocos de `criarAgendamento` e `atualizarAgendamento`:

```js
if (resultadoGCal && resultadoGCal.googleCalendarEventId) {
  agendamento.googleCalendarEventId = resultadoGCal.googleCalendarEventId;
  await Agendamento.findOneAndUpdate(
    { ownerEmail, id: agendamento.id },
    { $set: { googleCalendarEventId: resultadoGCal.googleCalendarEventId } },
    { new: true }
  );
}
```

No front-end, porém, `salvarEventoComGCal` ignora `_agendamento` e reaproveita `salvarDados()`. Não há merge de volta do ID novo para o objeto local em memória. A busca por `googleCalendarEventId` em [assets/js](../../assets/js) mostra uso quase exclusivamente em bloqueios externos e não em `modal-acao-slot.js` após o bulk sync.

### 6) Existe caminho em que o `EXDATE` é gravado no Mongo mas não chega ao Google, e o sistema não reprocessa?

Resposta: sim. O mecanismo está em [backend/src/controllers/agendamentoController.js](../../backend/src/controllers/agendamentoController.js):

```js
function montarRespostaFalhaGcal(res, err, contexto, dados) {
  const statusCode = 200;
  return res.status(statusCode).json({
    error: `Erro ao sincronizar agendamento com Google Calendar durante ${contexto}`,
    message: err.message,
    partialSuccess: true,
    gcalSyncFailed: true,
    agendamento: dados || null
  });
}
```

E quando o front-end lê a resposta, em [assets/js/storage.js](../../assets/js/storage.js):

```js
if (resAgendamentos.gcalSyncFailed === true) {
    teveFalhaGcal = true;
}
...
if (teveFalhaGcal) {
    return { ok: true, motivo: 'sucesso_com_falha_gcal' };
}
```

Ou seja:

- Mongo grava a edição/exceção;
- Google falha;
- o backend responde `200` e sinaliza `gcalSyncFailed: true`;
- o app continua e não reprocessa a mudança;
- local e remoto podem ficar "iguais" em comparação posterior;
- o Google fica com a ocorrência antiga e a nova sem autocorreção.

Este é o mecanismo que trava a duplicata.

### 7) Há proteção contra duplo clique ou salvamento concorrente no botão de salvar?

Resposta: não foi encontrada evidência de lock real no fluxo de edição. Em [assets/js/modal-acao-slot.js](../../assets/js/modal-acao-slot.js), o form usa `addEventListener("submit", ...)` e não guarda um `isSubmitting`/`busy`/`disabled` no clique de envio.

Há desabilitação de campos para aluno inativo e alguns `confirm()`, mas não há trava de duplo clique. O botão pode ser disparado repetidamente sem bloqueio.

## 2. Mapa dos 5 fluxos e sequência de operações

| Fluxo | Objetos locais que mudam | Requisições HTTP saindo | Ordem e ponto de duplicação |
| --- | --- | --- | --- |
| `occurrence` (somente esta aula) | série pai recebe `excecoes` e nova ocorrência é criada com `googleCalendarEventId: null` | `PUT` da série pai + `POST` da nova ocorrência | Em [assets/js/modal-acao-slot.js](../../assets/js/modal-acao-slot.js), o código dispara duas chamadas independentes via `salvarEventoComGCal`; o `PUT` da série aparece antes do `POST` dentro do loop local, mas a ordem no Google não é garantida entre as duas chamadas |
| `entireSeries` (toda a série) | apenas a série pai é atualizada | `PUT` da série pai | risco baixo: um único evento de edição, sem criar nova ocorrência |
| `fromDate` (split de série) | série original recebe `recorrenciaFimCondicao` e `recorrenciaDataFim`; nova série recebe `recorrenciaDataInicio` na data clicada | `PUT` da série original + `POST` da nova série | risco alto: em [assets/js/modal-acao-slot.js](../../assets/js/modal-acao-slot.js), há duas transações do Google disparadas em cadeia independentes |
| exclusão de ocorrência | série pai recebe `excecoes` e o registro da instância é apagado localmente | `PUT` da série pai ou `POST`/`DELETE` na instância, dependendo do fluxo | risco médio: depende de `EXDATE` e de um update remoto bem-sucedido |
| edição via `modal-agendamento.js` | criação de evento novo na primeira vez | `window.salvarEventoComGCal(resultado.payload, { operacao: 'criar' })` | risco menor do que `occurrence`, mas ainda não é transacional; todo o save é bulk e generic |

## 3. Confirmação ou refutação de B.1 a B.3

### B.1 — `salvarEventoComGCal` ignora args
Confirmação: verdadeira.

Evidência: [assets/js/google-calendar.js](../../assets/js/google-calendar.js) define a função, mas só usa `_isAppSignedIn()`, `_ensureCalendarConnection()` e `_persistirDadosComBackend(silencioso)`. Nenhum argumento de operação ou snapshot é consultado.

### B.2 — duas operações independentes podem desalinhar `EXDATE` e `POST`
Confirmação: verdadeira, com nuance.

O código local de [assets/js/storage.js](../../assets/js/storage.js) itera `listaLocal` em ordem de array e faz `PUT`/`POST` em sequência. No fluxo `occurrence`, a primeira operação normalmente é o `PUT` da série pai.

Mas a UI de [assets/js/modal-acao-slot.js](../../assets/js/modal-acao-slot.js) dispara duas syncs independentes via `then()`, sem `await` nem guard de serialização. Isso produz duas solicitações em paralelo ao backend e torna a ordem de chegada ao Google não confiável.

### B.3 — falha do Google vira sucesso local e trava a duplicata
Confirmação: verdadeira.

Evidência: [backend/src/controllers/agendamentoController.js](../../backend/src/controllers/agendamentoController.js) responde `HTTP 200` com `gcalSyncFailed: true`, e [assets/js/storage.js](../../assets/js/storage.js) trata isso como sucesso local e não reprocessa. A app fica certo no Mongo, o Google fica errado e a duplicata persiste para sempre.

## 4. B.4 em destaque

A resposta de B.4 é a mais importante da investigação: `excecoes` entra no `_normalizarAgendamentoParaComparacao`.

O código em [assets/js/storage.js](../../assets/js/storage.js) é explícito:

```js
function _normalizarAgendamentoParaComparacao(agendamento) {
    const copia = { ...(agendamento || {}) };
    delete copia.ownerEmail;
    delete copia._id;
    delete copia.__v;
    return _ordenarChavesRecursivamente(copia);
}
```

Ele não remove `excecoes`, `recorrenciaDataFim`, `recorrenciaEscopo` ou qualquer outro campo que muda quando se cancela uma ocorrência. Isso significa que a mudança no status da série pai produz diferença séria e dispara `PUT`.

Consequência direta:

- se `excecoes` entra na comparação, a série pai dispara `PUT` depois que o local grava o `EXDATE`;
- se o Google falhar nessa `PUT`, o Mongo já tem a exceção e o app não reenviará o `PUT` em um próximo sync porque o local e o remoto agora são equivalentes;
- a duplicata fica “travada” pelo mecanismo de igualdade e pela resposta 200 mascarando erro do Google.

## 5. Hipótese final do mecanismo da duplicata

Hipótese final: em `occurrence` e `fromDate`, a edição do agendamento recorrente faz duas mutações lógicas que são sincronizadas de forma desacoplada:

1. a série pai ganha `EXDATE` ou é encerrada com `UNTIL`/split;
2. a nova ocorrência ou nova série é criada como objeto novo com `googleCalendarEventId: null`;
3. duas chamadas independentes de `salvarEventoComGCal` são disparadas, mas o wrapper ignora `operacao` e `snapshotAnterior`;
4. `_normalizarAgendamentoParaComparacao` inclui `excecoes`, então o `PUT` da série pai é enviado;
5. se a chamada ao Google falhar, o Mongo já está consistente e a resposta do backend vem como `200` com `gcalSyncFailed: true`;
6. o app aceita como sucesso e não reprocessa; a série local e a remota passam a comparar iguais, mas o Google conserva a ocorrência antiga e a nova ao mesmo tempo.

Grau de confiança: médio-alto para os fluxos `occurrence` e `fromDate`; menor para o caso de edição genérica via `modal-agendamento.js`, porém o mecanismo central continua consistente com a observação do bug.

O que ainda falta para confirmar em produção:

- capturar um log real de rede mostrando `PUT` da série pai para o Google com falha e `POST` da nova ocorrência convertido em evento novo;
- verificar o payload da resposta `gcalSyncFailed` junto ao Mongo já atualizado;
- confirmar a sequência em sessão real com dados do usuário, mas isso não pode ser executado sem produzir alterações de código no app ou chamar a API do Google.

## 6. Opções de correção (sem recomendar implementação)

### Opção A — serializar o sync da edição de série e remover o bulk genérico

Descrição: `salvarEventoComGCal` precisa deixar o contexto explícito, em vez de ignorar `_agendamento`, `operacao` e `snapshotAnterior`. A sincronização de uma série recorrente deve ser uma fila explícita, por operação, com `PUT` da série pai e `POST` da instância nova em ordem controlada.

- custo: médio;
- risco: médio;
- benefício: elimina a ambiguidade do contexto e reduz chance de reorder do Google.

### Opção B — tornar o Google sync idempotente por evento

Descrição: usar `eventId` especificado pelo cliente no `POST`, detectar conflitos e reusar o mesmo evento quando a operação for.retry; também persistir o `googleCalendarEventId` do evento resultante antes de confirmar o sucesso local.

- custo: alto;
- risco: alto;
- benefício: reduz a chance de duplicata em reprocesso e retry, mas exige refactor de sincronização e estado local.

### Opção C — transformar o sync em fila/reconciliation server-side

Descrição: deixar a decisão de `PUT`/`POST` no backend ou em uma fila de sincronização, em vez de acionar bulk save genérico do front-end e confiar em igualdade local/remote para decidir a operação.

- custo: alto;
- risco: alto;
- benefício: a correção mais robusta do ponto de vista transacional, com melhor controle de retry e observabilidade.

## 7. Conclusão

O diagnóstico prévio foi confirmado em quase todos os pontos:

- `salvarEventoComGCal` ignora argumentos e realiza bulk sync genérico;
- `excecoes` entra na comparação de igualdade e dispara `PUT` da série pai;
- o `PUT` da série pode falhar no Google enquanto o Mongo já confirmou a alteração;
- o app não reprocessa porque a resposta do backend vem como `200` com `gcalSyncFailed: true` e o estado local/remote passa a concordar.

O único ponto que precisa ser tratado com cuidado é a ordem exata do `PUT` vs `POST` dentro de um loop local: a sequência do CRUD é determinística, mas a UI lança duas syncs independentes sem garantir a ordem remota. Isso é suficiente para explicar a duplicata intermitente e a sua persistência permanente.
