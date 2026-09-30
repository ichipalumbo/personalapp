# Diagnóstico — duplicata ao editar aula de série recorrente no Google Calendar

## Resumo executivo

A hipótese mais forte continua sendo a combinação de dois fatores confirmados no código:

1. `assets/js/google-calendar.js` recebe um `_agendamento` e `opcoes`, mas ignora ambos e dispara um bulk sync genérico com `salvarDados()`;
2. `assets/js/storage.js` compara agendamentos incluindo `excecoes`, então a edição de uma instância ou split de série gera um `PUT` da série pai mesmo quando a mudança é só uma exceção.

No fluxo `occurrence`, a primeira chamada a `salvarEventoComGCal` já executa o diff completo do estado local: ela emite o `PUT` da série pai e, na mesma passada, o `POST` da nova ocorrência. A segunda chamada encadeada em `.then()` é sequencial e, no caso normal, vira no-op porque local e remoto já ficaram equivalentes após o primeiro bulk sync.

Quando a chamada do `PUT` para o Google falha depois do Mongo já ter sido atualizado, o backend responde `HTTP 200` com `gcalSyncFailed: true`, o UI trata isso como sucesso local e o loop segue até criar a nova ocorrência. O Google fica com a ocorrência antiga e a nova, e a duplicata vira permanente porque o sync seguinte considera local e remoto equivalentes e não reemite o `PUT`.

A correção provável exige refactor do mecanismo de retry/ressincronização, mas este relatório não propõe implementação — apenas diagnostica e documenta a evidência estática.

## Evidência de simulação fora do repositório

Foi executado um mini-harness fora do repositório para registrar a sequência esperada do fluxo `occurrence` e confirmar o ponto de acoplamento entre o bulk sync da UI e o CRUD local.

Sequência modelada:

```json
[
  { "kind": "gcal", "action": "bulk", "id": "serie-1", "op": "atualizar", "hasSnapshot": true },
  { "kind": "crud", "action": "PUT", "id": "serie-1" },
  { "kind": "crud", "action": "POST", "id": "serie-1-occ-1" },
  { "kind": "gcal", "action": "bulk", "id": "serie-1-occ-1", "op": "criar", "hasSnapshot": false, "effect": "no-op" }
]
```

Conclusão da simulação, confirmada pela leitura do código:

- a UI faz duas chamadas para `salvarEventoComGCal`, mas a segunda fica encadeada em `.then()` e portanto é sequencial;
- como `salvarEventoComGCal` ignora o agendamento recebido e sempre roda um bulk sync do estado inteiro, a primeira chamada já emite o `PUT` da série e o `POST` da nova ocorrência;
- a rotina local de CRUD processa `listaLocal` na ordem do array, então a série pai é enviada antes da nova ocorrência quando ambas coexistem em memória.

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

Resposta: sim. A ordem é determinística e, no caso mais típico de `occurrence`, o `PUT` da série pai vem antes do `POST` da nova ocorrência.

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

Como `listaLocal` é iterado em ordem de array, a série pai é processada antes do item novo quando o array estiver em `[série, novaOcorrencia]`. A ordem do loop é determinística. No fluxo real, `aulas.push(novoCompromisso)` coloca a nova ocorrência no fim do array, preservando a série pai antes dela.

O ponto crítico não é corrida, e sim o fato de a UI chamar um wrapper que ignora o contexto:

```js
const _gcalSeriePromise = salvarEventoComGCal(compromisso, { operacao: "atualizar", snapshotAnterior: _snapshotEdicao });
_gcalSeriePromise.then(() => salvarEventoComGCal(_novaOcorrenciaSerie, { operacao: "criar" }));
```

Essas duas chamadas não são paralelas: a segunda só roda depois da resolução da primeira, porque está dentro de `.then()`. Além disso, a segunda chamada tende a ser no-op: como o primeiro `salvarEventoComGCal` já disparou `salvarDados()` sobre o estado completo, ele próprio faz o `PUT` da série pai e o `POST` da nova ocorrência. Quando a segunda chamada acontece, local e remoto normalmente já estão equivalentes.

Portanto, não há corrida de ordenação a corrigir aqui. O problema real é outro: se o `PUT` da série falha na perna do Google depois de o Mongo já ter gravado a exceção, o fluxo segue e cria a nova ocorrência; no sync seguinte, a igualdade local × remoto impede a reemissão do `PUT`.

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
| `occurrence` (somente esta aula) | série pai recebe `excecoes` e nova ocorrência é criada com `googleCalendarEventId: null` | `PUT` da série pai + `POST` da nova ocorrência | A primeira chamada a `salvarEventoComGCal` já dispara o bulk sync completo; como a nova ocorrência é inserida no fim de `aulas`, o loop envia primeiro o `PUT` da série e depois o `POST` da nova ocorrência. A segunda chamada encadeada em `.then()` é sequencial e tende a no-op |
| `entireSeries` (toda a série) | apenas a série pai é atualizada | `PUT` da série pai | risco baixo: um único evento de edição, sem criar nova ocorrência |
| `fromDate` (split de série) | série original recebe `recorrenciaFimCondicao` e `recorrenciaDataFim`; nova série recebe `recorrenciaDataInicio` na data clicada | `PUT` da série original + `POST` da nova série | risco alto: o primeiro bulk sync já processa as duas mutações na ordem do array; se a perna Google falhar ao atualizar a série original, o app ainda assim confirma localmente e segue |
| exclusão de ocorrência | série pai recebe `excecoes` e o registro da instância é apagado localmente | `PUT` da série pai ou `POST`/`DELETE` na instância, dependendo do fluxo | risco médio: depende de `EXDATE` e de um update remoto bem-sucedido |
| edição via `modal-agendamento.js` | criação de evento novo na primeira vez | `window.salvarEventoComGCal(resultado.payload, { operacao: 'criar' })` | risco menor do que `occurrence`, mas ainda não é transacional; todo o save é bulk e generic |

## 3. Confirmação ou refutação de B.1 a B.3

### B.1 — `salvarEventoComGCal` ignora args
Confirmação: verdadeira.

Evidência: [assets/js/google-calendar.js](../../assets/js/google-calendar.js) define a função, mas só usa `_isAppSignedIn()`, `_ensureCalendarConnection()` e `_persistirDadosComBackend(silencioso)`. Nenhum argumento de operação ou snapshot é consultado.

### B.2 — duas operações independentes podem desalinhar `EXDATE` e `POST`
Refutação parcial: a conclusão de risco é verdadeira, mas a explicação por paralelismo/ordem não.

O código local de [assets/js/storage.js](../../assets/js/storage.js) itera `listaLocal` em ordem de array e faz `PUT`/`POST` em sequência. No fluxo `occurrence`, a primeira operação normalmente é o `PUT` da série pai, seguido do `POST` da nova ocorrência.

A UI de [assets/js/modal-acao-slot.js](../../assets/js/modal-acao-slot.js) faz duas chamadas para `salvarEventoComGCal`, mas elas não ficam em paralelo: a segunda está dentro de `.then()`. Como o wrapper ignora `_agendamento` e sincroniza o estado inteiro, a primeira chamada já cobre as duas operações. A segunda costuma reencontrar local e remoto equivalentes e não emite nada.

Logo, o desalinamento entre `EXDATE` e criação da nova ocorrência não vem de reorder entre duas requisições concorrentes; vem do caso em que o Mongo confirma a alteração, a perna Google falha, o backend devolve `200` com `gcalSyncFailed: true` e o fluxo continua mesmo assim.

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

Hipótese final: em `occurrence` e `fromDate`, a edição do agendamento recorrente faz duas mutações lógicas no mesmo estado local:

1. a série pai ganha `EXDATE` ou é encerrada com `UNTIL`/split;
2. a nova ocorrência ou nova série é criada como objeto novo com `googleCalendarEventId: null`;
3. a primeira chamada a `salvarEventoComGCal` dispara um bulk sync, e o wrapper ignora `operacao` e `snapshotAnterior`;
4. `_normalizarAgendamentoParaComparacao` inclui `excecoes`, então o `PUT` da série pai é enviado e, na mesma passada, o `POST` da nova ocorrência também é elegível;
5. se a perna do Google falhar depois do Mongo gravar a série, a resposta vem como `200` com `gcalSyncFailed: true`;
6. `resAtualizar.ok === true`, então o loop segue e a nova ocorrência é criada;
7. o app aceita o resultado como sucesso local com falha de GCal e não marca a série para retry; no sync seguinte, a série local e a remota passam a comparar iguais, mas o Google conserva a ocorrência antiga e a nova ao mesmo tempo.

Grau de confiança: médio-alto para os fluxos `occurrence` e `fromDate`; menor para o caso de edição genérica via `modal-agendamento.js`, porém o mecanismo central continua consistente com a observação do bug.

O que ainda falta para confirmar em produção:

- capturar um log real de rede mostrando `PUT` da série pai para o Google com falha e `POST` da nova ocorrência convertido em evento novo;
- verificar o payload da resposta `gcalSyncFailed` junto ao Mongo já atualizado;
- confirmar a sequência em sessão real com dados do usuário, mas isso não pode ser executado sem produzir alterações de código no app ou chamar a API do Google.

## 6. Opções de correção (sem recomendar implementação)

### Opção A — serializar o sync da edição de série e remover o bulk genérico

Status: descartada como correção deste bug específico.

Descrição: serializar explicitamente `PUT` da série pai e `POST` da instância/nova série.

Justificativa do descarte: a leitura do código não confirma a corrida que esta opção tentaria corrigir. A segunda chamada fica encadeada em `.then()`, logo não é paralela, e a primeira já faz o bulk sync completo do estado local. A ordem do CRUD também é determinística porque `_sincronizarAgendamentosViaCRUD` percorre `listaLocal` na ordem do array. Portanto, serializar melhor o fluxo pode ser refactor válido por clareza, mas não ataca o mecanismo real da duplicata permanente.

- custo: médio;
- risco: médio;
- benefício: melhora legibilidade/explicitude do fluxo, mas não corrige sozinho a permanência da duplicata.

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

### Opção D — falha do Google marca o registro como pendente de ressincronização

Descrição: quando o Mongo grava mas a perna Google falha, o documento fica marcado como pendente. No sync seguinte, o diff detecta a divergência entre local e remoto e reemite a operação em vez de considerar o item convergido.

Dependência: **D depende de B**. Sem idempotência no insert, um retry de `POST` após perda de resposta poderia criar um segundo evento no Google; o mecanismo de retry passaria a ser a nova fonte de duplicata.

- custo: médio-alto;
- risco: médio;
- benefício: ataca diretamente a intermitência e explica por que a correção pode convergir sem job em background, desde que o insert seja idempotente.

## 7. Conclusão

O diagnóstico prévio foi confirmado em quase todos os pontos:

- `salvarEventoComGCal` ignora argumentos e realiza bulk sync genérico;
- `excecoes` entra na comparação de igualdade e dispara `PUT` da série pai;
- o `PUT` da série pode falhar no Google enquanto o Mongo já confirmou a alteração;
- o app não reprocessa porque a resposta do backend vem como `200` com `gcalSyncFailed: true` e o estado local/remote passa a concordar.

Os dois pontos corrigidos nesta revisão são:

- não há evidência de duas solicitações paralelas ao backend nem de corrida de ordenação no Google; a segunda chamada fica encadeada em `.then()` e a primeira já executa o bulk sync completo;
- por isso, a Opção A não resolve o mecanismo real do bug e deve ser descartada como correção principal.

O mecanismo que continua explicando a duplicata intermitente e permanente é o já descrito nas seções 3 e 6: o Mongo confirma, a perna Google falha, o fluxo segue com `HTTP 200`, a nova ocorrência é criada e o sistema deixa de marcar a série para retry.

## Nota de revisão

Revisão aplicada para corrigir dois erros do diagnóstico anterior:

1. remoção da hipótese de corrida/paralelismo entre as duas chamadas de `salvarEventoComGCal`, porque a segunda é sequencial e normalmente vira no-op;
2. descarte explícito da Opção A como correção principal, porque serializar a ordem não resolve o caso real em que o `PUT` da série falha na perna do Google após o Mongo já ter gravado a exceção.
