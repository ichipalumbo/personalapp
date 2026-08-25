# Spec — Sincronização com Google Calendar

> **Status**: documentação atualizada após as rodadas A e A.2 (2026-08-25). A v1 era
> engenharia reversa do código em `main` e descrevia o estado **pré-correção**. Esta v2
> registra o comportamento atual do código já corrigido.
>
> **Versão**: 2 · **Atualizado**: 2026-08-25
>
> **Relação com outras specs**: `docs/specs/reposicoes-e-competencia.md` (v3) define a
> semântica de exceção de série, que esta spec precisa refletir no Google.
> `docs/specs/financas-ciclo-cobranca.md` (v6) não é afetada — o Google não participa de
> nenhum cálculo financeiro.

---

## 1. Problema

A integração com o Google Calendar existe e funciona para aula única, mas **uma série
recorrente aparece no Google apenas uma vez**, na data inicial. As ocorrências seguintes
não existem no calendário.

O sintoma foi reportado como regressão: antes funcionava. O código atual mostra a causa
estrutural (9.1), mas o histórico da regressão não é recuperável a partir do estado
commitado — só `git log` responde.

Não havia spec desta feature antes desta. A ausência levou a diagnósticos errados em
conversa: a integração foi acusada duas vezes de bug que não existia, por leitura de
sintoma sem leitura de código.

---

## 2. Modelo pretendido (fonte: dono do projeto)

### 2.1 Duas fontes de verdade, uma fronteira

| Origem do item   | Dono         | Direção do sync                                |
| ---------------- | ------------ | ---------------------------------------------- |
| Criado no app    | **o app**    | app → Google (escrita)                         |
| Criado no Google | **o Google** | Google → app (leitura, vira `BloqueioExterno`) |

Regras que decorrem disso:

- **O app nunca edita item do Google.** Ele apenas lê, para saber que o horário está
  ocupado.
- **Edição feita pela usuária dentro do Google, em evento criado pelo app, não volta para
  o app.** O app é a fonte de verdade daquele item; a edição externa é descartada (e será
  sobrescrita no próximo sync de saída).
- Nenhuma operação de leitura pode apagar ou alterar dado que o app criou.

### 2.2 Recorrência: ocorrências individuais, não RRULE

Decisão do projeto: **uma série recorrente é publicada no Google como um evento
independente por ocorrência**, não como evento recorrente com `RRULE`.

Motivo declarado: facilita a gestão granular — editar ou remover uma ocorrência isolada
sem mexer nas outras.

Consequências assumidas:

- O app é quem expande a recorrência. O Google recebe eventos avulsos e não sabe que
  formam uma série.
- É preciso um **horizonte** de publicação (2.3), porque série sem data de fim não pode
  ser expandida até o infinito.
- Custo: N chamadas à API por série, em vez de uma.

> **Nota técnica (documentação do Google, consultada em 2026-08-25)**: o Google
> desaconselha modificar instâncias individualmente quando a intenção é alterar a série
> inteira, porque <cite index="3-4,3-5">isso cria muitas exceções que poluem o calendário, deixam o acesso mais lento e disparam um número alto de notificações de alteração</cite>.
> **Esse alerta não se aplica ao modelo escolhido aqui**: como o app publica eventos
> avulsos, não existe evento-pai nem instância, logo não existe exceção a ser criada.
> O alerta valeria se a decisão fosse `RRULE` + edição por instância — que é justamente o
> desenho recusado.

### 2.3 Horizonte

Como a expansão é do app, o horizonte também é. Regra pretendida:

- Publicar ocorrências de **hoje até +N meses**, empurrando a janela em cada sync.
- Série com `recorrenciaDataFim` ou `recorrenciaQuantidadeOcorrencias` para no que vier
  primeiro entre o limite dela e o horizonte.
- Série sem condição de fim é publicada até o horizonte, e só.

O valor de `N` é decisão aberta. Referência de mercado: manter a janela próxima do que a
aplicação de fato precisa, porque <cite index="5-3,5-4">recorrência sem data de fim pode gerar anos de instâncias</cite>.
A janela de leitura hoje é −1/+2 meses (4.2); espelhar isso na escrita mantém as duas
pontas coerentes.

### 2.4 Reposição

Instância enviada para reposição deve **desaparecer** do dia original no Google, igual a
qualquer aula cancelada pelo app. Quando a reposição é reagendada, a nova data aparece.

---

## 3. Arquitetura atual

### 3.1 O sync é backend-owned

`assets/js/google-calendar.js` **não fala com a API do Google**. O cabeçalho do arquivo
declara isso: é ponte frontend → backend. Em particular:

- `window.salvarEventoComGCal(_agendamento, opcoes)` **ignora os dois argumentos** (note o
  underscore em `_agendamento` e o fato de `opcoes.operacao` nunca ser lido). O que ela faz
  é garantir a conexão e chamar `salvarDados`.
- `sincronizarBloqueiosExternos` retorna `{ skipped: true, reason: 'backend-owned-sync' }`.

> **Armadilha de nome.** `salvarEventoComGCal` sugere "salvar este evento no Google". Ela
> não faz isso. Esse nome já produziu um diagnóstico errado e um item de prompt inútil
> (9.9). Qualquer raciocínio sobre GCal deve partir do backend.

### 3.2 Quem sincroniza de fato

`backend/src/controllers/agendamentoController.js`, dentro do CRUD:

| Rota                       | Chamada ao Google                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `POST /agendamentos`       | `updateEventInGoogle` se já existe `googleCalendarEventId`, senão `pushEventToGoogle` |
| `PUT /agendamentos/:id`    | mesma lógica condicional                                                              |
| `DELETE /agendamentos/:id` | `deleteEventFromGoogle`, se houver id                                                 |

O `googleCalendarEventId` devolvido pelo Google é persistido de volta no documento.

**Não existe chamada explícita ao Google em nenhum fluxo de UI.** Qualquer alteração de
agendamento chega ao Google como efeito colateral do CRUD. É por isso que o caminho de
série do modal de reposição não precisa chamar nada.

### 3.3 Diff no frontend

`salvarDados` (`assets/js/storage.js`) compara lista local × lista remota e opera item a
item: `POST` para o que falta, `PUT` para o que mudou, `DELETE` para o que sumiu. A
comparação é `_agendamentosSaoIguais`, que serializa os dois objetos com `JSON.stringify`
depois de remover `ownerEmail`, `_id` e `__v`.

Cadeia completa de uma alteração:

```
UI → salvarDados → diff → PUT /agendamentos/:id → updateEventInGoogle → Google
```

---

## 4. Escrita (app → Google)

### 4.1 Montagem do evento

`montarEventoGoogle` (`gcalSyncService.js`):

| Campo do evento                         | Origem                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------- |
| `summary`                               | `montarTituloEvento` — `objetivo - alunoNome`, com fallbacks por `tipo` |
| `location`                              | `agendamento.local` (herdado do aluno se ausente)                       |
| `colorId`                               | `'6'`, fixo                                                             |
| `start` / `end`                         | `data` + `horarioInicio` / `horarioFim`, com `timeZone`                 |
| `extendedProperties.private.app_origin` | marca de propriedade do app                                             |
| `extendedProperties.private.app_id`     | `agendamento.id`                                                        |

**Timezone**: `dateTime` é enviado como horário local (`2026-08-25T08:00:00`) acompanhado
de `timeZone` (`GCAL_TIMEZONE`, default `America/Sao_Paulo`). Não há conversão para UTC.
Este é o desenho correto e resolve o bug histórico de horário deslocado.

**Dia inteiro**: se `fullDay === true`, ou se o horário é `00:00`→`23:59`/`24:00`, o evento
usa `start.date`/`end.date` com o fim no dia seguinte.

**`horarioFim` ausente**: default de `+60min` a partir do início.

**Virada de dia e duração zero**: `montarEventoGoogle` compara `fimEmMinutos` e
`inicioEmMinutos`; quando `fimEmMinutos < inicioEmMinutos`, a data de fim avança um dia
usando `adicionarDiasISO(dataISO, 1)`. Quando `fimEmMinutos === inicioEmMinutos`, a
Duração de 0 minutos não vira evento de 24h: o evento fica no mesmo dia. O helper de
adição usa UTC explícito (`T12:00:00Z` + `setUTCDate`) para evitar drift no servidor.

**`app_origin`** é o mecanismo que permite ao sync de entrada reconhecer o que é do app.
Não remover.

### 4.2 O que não é montado

**Não existe `RRULE` em nenhum arquivo do repositório** — nem no backend, nem no
frontend. Confirmado por varredura em todos os `.js` e `.html`.

`montarEventoGoogle` produz **um** `start`/`end`, derivado do campo `data`. Campos de
recorrência do documento (`frequencia`, `diasSemana`, `intervaloRecorrencia`,
`recorrenciaDataInicio`, `recorrenciaDataFim`, `recorrenciaQuantidadeOcorrencias`,
`excecoes`) são ignorados na montagem.

---

## 5. Leitura (Google → app)

### 5.1 Gatilhos

- **Webhook**: `gcalWebhookController` → `syncConnectionByWebhookHeaders(channelId, resourceId)`.
- **Manual/automático**: `iniciarSyncGoogleCalendar` no bootstrap, quando há conexão.

### 5.2 Listagem

`listCalendarEvents` tem dois modos:

| Modo        | Quando               | Parâmetros                                                                                                    |
| ----------- | -------------------- | ------------------------------------------------------------------------------------------------------------- |
| Incremental | há `syncToken` salvo | `syncToken`, `singleEvents=true`, `maxResults=250`                                                            |
| Full        | sem `syncToken`      | janela `−1 mês` a `+2 meses`, `singleEvents=true`, `orderBy=startTime`, `showDeleted=false`, `maxResults=250` |

`syncToken` expirado (HTTP 410) zera o token e refaz o full — tratamento correto e já
implementado.

> `singleEvents=true` faz o Google devolver **instâncias individuais** dentro da janela:
> <cite index="3-3">se o parâmetro singleEvents é true, todas as instâncias individuais aparecem no resultado, mas os eventos recorrentes subjacentes não</cite>.
> Como o app publica eventos avulsos, hoje isso é indiferente na saída; é relevante para
> eventos recorrentes criados **pela usuária** dentro do Google.

> **Nota importante sobre eventos cancelados**: o ramo incremental **não envia
> `showDeleted`**, então o Google usa o default `false`. Em resposta de evento
> apagado, o retorno pode vir com `id` e sem `extendedProperties`. Nesse caso, a
> detecção de "evento do app" não é confiável no payload de volta; a identificação
> precisa ser por lookup do id no mapa que o app mantém (Rodada C).

### 5.3 Persistência

`persistSyncResults` classifica cada evento de leitura em quatro retornos via
`classificarEventoDeLeitura(event)`:

- `ignorar` se `!event || !event.id`;
- `ignorar` se `isAppOwnedEvent(event)`;
- `remover` se o evento é externo e `status === 'cancelled'`;
- `upsert` se o evento é externo e está ativo.

Na prática, o fluxo de leitura não chama `deleteAgendamento`: ele só apaga
`BloqueioExterno` para eventos externos cancelados e ignora item do app. No laço de
cancelados, o mesmo critério é usado antes de qualquer remoção.

No modo full, há uma reconciliação final: `BloqueioExterno` local que não apareceu na
listagem remota é apagado.

### 5.4 `BloqueioExterno`

Collection separada, com índice único `(ownerEmail, googleCalendarEventId)` e
`source: 'google_external'`. O comentário no model explica a escolha: manter fora de
`agendamentos` para que sync destrutivo de agendamentos nunca apague evento externo.

Guarda `titulo`, `data`, `horarioInicio`, `horarioFim`, `fullDay`, `semanaISO`.

---

## 6. Falha de sincronização

`montarRespostaFalhaGcal` responde **HTTP 200** com `partialSuccess: true`,
`gcalSyncFailed: true` e o agendamento no corpo. Ou seja: o dado **foi gravado no
Mongo** e a API confirma sucesso de persistência, mas sinaliza a falha externa do
Google para aviso do usuário e auditoria.

Consequência a jusante: `salvarDados` não transforma isso em `{ ok: false,
motivo: 'falha_remota' }`; o gate de reposição não é mais bloqueado por
indisponibilidade do Google. Ver 9.4.

---

## 7. Decisões e casos de borda

| #   | Pergunta                              | Decisão                                                     |
| --- | ------------------------------------- | ----------------------------------------------------------- |
| 1   | Quem chama a API do Google?           | **Só o backend**, dentro do CRUD de agendamento             |
| 2   | Série vai como `RRULE`?               | **Não.** Um evento independente por ocorrência (2.2)        |
| 3   | Quem expande a recorrência?           | O app                                                       |
| 4   | Série infinita?                       | Publicada até o horizonte (2.3)                             |
| 5   | Edição da usuária no Google volta?    | **Não**, em item criado pelo app                            |
| 6   | Evento criado no Google entra no app? | Sim, como `BloqueioExterno`                                 |
| 7   | O app edita evento externo?           | **Nunca**                                                   |
| 8   | Como o app reconhece o que é dele?    | `extendedProperties.private.app_origin`                     |
| 9   | Timezone                              | `dateTime` local + `timeZone`; sem conversão para UTC       |
| 10  | Instância enviada para reposição      | Desaparece do dia original no Google (2.4)                  |
| 11  | Falha do Google reverte a gravação?   | **Não.** Grava no Mongo e responde 200 com `gcalSyncFailed: true` + `partialSuccess` |

---

## 8. Fora de escopo

- **Convidados / attendees.** Nenhum evento leva participante.
- **Múltiplos calendários.** Sempre `connection.calendarId` ou `primary`.
- **Lembretes / notificações** configurados pelo app.
- **Edição bidirecional.** Explicitamente recusada (2.1).
- **Importar evento externo como aula.** Evento do Google vira bloqueio, nunca aula.
- **Cor por tipo de compromisso.** `colorId` é fixo.

---

## 9. Bugs e divergências (backlog desta feature)

Ordenados por gravidade.

### 9.1 Série recorrente publica apenas uma ocorrência — CRÍTICO

**Sintoma**: aula semanal aparece uma vez no Google, na data inicial.

**Causa**: uma série é **um** documento `Agendamento`, e o schema tem
`googleCalendarEventId` como **string única**. Um documento não tem onde guardar N ids de
evento. `montarEventoGoogle` produz um evento só porque é o único que o modelo de dados
consegue rastrear.

**Correção**: exige mudança de schema — mapa `data → googleCalendarEventId` (subdocumento
ou collection de vínculo), mais a expansão no momento do sync com horizonte (2.3).

**Restrição de desenho para a Rodada C**: quando um evento cancelado volta sem
`extendedProperties`, a identificação do que é do app não pode depender do payload do
Google. A distinção precisa ser feita por lookup do `id` no mapa que o app mantém.
`extendedProperties` continua útil na escrita e em evento ativo, mas não é confiável em
evento cancelado.

**É o item que destrava todos os outros.** Sem o mapa de ids, 9.3 e 2.4 não têm como ser
implementados.

### 9.2 Sync de entrada ignora evento do app — RESOLVIDO (Rodada A)

`persistSyncResults` testava `status === 'cancelled'` **antes** de `isAppOwnedEvent` e
chamava `deleteAgendamento(ownerEmail, event.id)`. Evento do app cancelado dentro do Google
**apagava o agendamento no app**.

Violava diretamente 2.1: leitura nunca deveria alterar dado do app.

**Estado atual**: `classificarEventoDeLeitura(event)` decide primeiro:

- `ignorar` quando o evento não tem `id`;
- `ignorar` quando o evento é do app, independentemente do status;
- `remover` quando o evento é externo e `status === 'cancelled'`;
- `upsert` quando o evento é externo e está ativo.

`deleteAgendamento` saiu do caminho de leitura; `deleteBloqueio` continua sendo usado para
`BloqueioExterno` externo cancelado.

### 9.3 `excecoes` não propagam para o Google — ALTO

Adicionar data em `excecoes` altera o documento, o que dispara `PUT` e
`updateEventInGoogle` — mas `montarEventoGoogle` ignora `excecoes`. O evento no Google
continua existindo.

Efeito prático: **aula cancelada ou enviada para reposição continua no Google**. É a
violação de 2.4. Depende de 9.1.

### 9.4 Falha do Google mascarada como falha de persistência — RESOLVIDO (Rodada A)

A indisponibilidade do Google não deve ser tratada como falha de gravação no Mongo: o
backend responde **HTTP 200** com `partialSuccess: true` e `gcalSyncFailed: true`,
mantendo o agendamento no corpo.

Com isso, `salvarDados` continua enxergando sucesso de persistência e o gate de
reposição não é bloqueado por um problema externo de sincronização. O log do servidor
continua sendo emitido para registrar a falha.

### 9.5 `horarioFim` default cruzando meia-noite — RESOLVIDO (Rodada A)

O rollback de data não fica em `getHorarioPadraoFim`; ele acontece em
`montarEventoGoogle`: quando `fimEmMinutos < inicioEmMinutos`, a `end.dateTime` usa
`adicionarDiasISO(dataISO, 1)`. O default `+60min` continua retornando `23:30 -> 00:30`
como formato de hora válida, mas o evento real atravessa para o dia seguinte.

### 9.6 Diff sensível à ordem das chaves — RESOLVIDO (Rodada A)

`_agendamentosSaoIguais` passou a serializar objetos após ordenação recursiva das chaves,
sem mexer na ordem dos arrays. Isso elimina o diff espúrio quando a ordem interna dos
objetos local e remoto diverge.

### 9.7 Teste de cancelamento inalcançável no modo full — INFORMATIVO

O full sync pede `showDeleted=false`, então o laço de ativos nunca vê
`status === 'cancelled'`. Só o incremental traz cancelados. O ramo é código morto em
metade dos caminhos — e no outro metade é o caso do app-owned event que foi corrigido.

### 9.8 Sem cobertura de teste — PARCIALMENTE RESOLVIDO (Rodada A.2)

Existe `backend/test/gcal-sync.test.js`, com testes puramente unitários para as funções de
montagem e classificação. A suíte total do projeto está em **65 testes**.

Continua sem cobertura o que depende de I/O: `persistSyncResults` de ponta a ponta e
`listCalendarEvents` em modo incremental/full com Google real.

### 9.9 Documentação desatualizada — RESOLVIDO (Rodada A.2)

- `README.md` foi ajustado para descrever o arquivo `google-calendar.js` como ponte
  frontend → backend e não como importador direto da API do Google.
- `.github/copilot-instructions.md` passou a exigir que testes novos sejam provados por
  regressão/mutação.
- O nome `salvarEventoComGCal` continua enganoso, mas a documentação agora sinaliza que
  ele ignora os argumentos recebidos.

### 9.10 Índice duplicado em `GoogleCalendarConnection` — RESOLVIDO (Rodada A.2)

`ownerEmail` era declarado com `index: true` e também com um índice único. O campo agora
mantém apenas o índice único, que é a garantia relevante.

---

## 10. Ordem sugerida de correção

A sequência sugerida foi executada em parte; o que resta é o desenho de série recorrente e
as exceções propagadas para o Google.

1. **9.2**, **9.4**, **9.5**, **9.6** e **9.8** — resolvidos nas rodadas A e A.2.
2. **9.1** — mudança de schema + mapa `data → eventId` + horizonte. É o projeto grande.
3. **9.3** — sai quase de graça depois de 9.1.
4. **9.9** e **9.10** — documentação e index já registrados como resolvidos.

O que continua fora de escopo nesta spec é o desenho final da recorrência, o mapa de ids,
exceções e horizonte; a decisão de valor do horizonte precisa ser tomada antes do início da
Rodada C.
