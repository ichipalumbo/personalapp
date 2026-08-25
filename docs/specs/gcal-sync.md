# Spec — Sincronização com Google Calendar

> **Status**: desenho da Rodada C finalizado e decisão de recorrência registrada no
> Google Calendar (2026-08-25). Esta v4 mantém a reversão histórica da v2 e documenta
> o desenho final RRULE/EXDATE entregue pela implementação.
>
> **Versão**: 4 · **Atualizado**: 2026-08-25
> **Defeitos em aberto**: 3 (ver seção 9)
>
> **Relação com outras specs**: `docs/specs/reposicoes-e-competencia.md` (v4) define a
> semântica de exceção de série, que esta spec precisa refletir no Google.
> `docs/specs/financas-ciclo-cobranca.md` (v7) não é afetada — o Google não participa de
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

### 2.2 Recorrência: série no Google como evento recorrente com `RRULE`

Decisão revisada na v3 do projeto: **uma série recorrente é publicada no Google como um
único evento pai com `recurrence` e `RRULE`**; a expansão em instâncias é de
responsabilidade do Google.

> **Histórico da decisão (v2 → v3)**
> Na v2, o projeto decidiu publicar cada ocorrência como evento independente. Esse desenho
> exigia:
> - horizonte de publicação;
> - mapa `data → eventId` para localizar a instância correta;
> - gatilho de reabastecimento quando o horizonte mudava;
> - reprocessamento de toda a série para manter a janela alinhada.
>
> A revisão em v3 concluiu que esse custo não existe com `RRULE`: o Google mantém a série e
> expande as instâncias automaticamente a partir da regra, sem que o app precise decidir uma
> janela de publicação; o modelo deixa de depender de uma tabela de instâncias locais.
>
> O motivo da reversão é direto: a alternativa anterior aumentava irrelevante o acoplamento
> entre calendário local e Google. Com `RRULE`, o app precisa apenas publicar a regra e o
> Google resolve a expansão. A pergunta do horizonte deixa de existir: não há janela a
> escolher.
>
> O custo que se aceita em troca é documentado no item 4 desta rodada: a edição de uma
> instância exige lidar com a instância concreta, e o gerenciamento de `COUNT`/`UNTIL`
> deixa de ser um detalhe do app para virar um ponto do design de implementação.

### 2.3 Sem horizonte de publicação

A partir da v3, **não existe mais horizonte de publicação** como um problema de produto ou
arquitetura. O app não publica um intervalo em duas dimensões (`hoje até +N meses`) e nem
mantém um mapa `data → eventId` para abastecer a série.

No desenho `RRULE`:

- a série é um único evento no Google;
- a expansão em instâncias fica no Google;
- as regras de corte da série ficam dentro do próprio `RRULE` (`UNTIL` e/ou `COUNT`);
- a leitura continua usando `singleEvents=true` para trazer instâncias, mas a escrita não
  depende de uma janela local de expansão.

A mudança de desenho é intencional: a janela de publicação não é mais uma decisão de
negócio a se manter em sync. A decisão que permanece em aberto é outra — o que o app fará
quando a própria série chegar ao limite de `COUNT` (item 9.11).

### 2.4 Reposição

Instância enviada para reposição deve **desaparecer** do dia original no Google, igual a
qualquer aula cancelada pelo app. Quando a reposição é reagendada, a nova data aparece.
Com `RRULE`, isso se traduz em `EXDATE` e/ou cancelamento de instância do evento recorrente,
sem depender de expansão manual pelo app.

### 2.5 Referência técnica da API do Google

A decisão acima é coerente com a API do Google e com a RFC 5545.

- `recurrence` do recurso `Event`: array de strings `RRULE`, `RDATE`, `EXDATE` conforme a
  especificação de calendário iCalendar. Referência: [Google Calendar Events](https://developers.google.com/workspace/calendar/api/v3/reference/events)
- Modelo evento pai + instâncias, e exceção de instância: [Guia de eventos recorrentes](https://developers.google.com/workspace/calendar/api/guides/recurringevents)
- Gramática do `RRULE`, `UNTIL`, `COUNT`, `BYDAY`, `BYMONTHDAY`, `WKST`: [RFC 5545 § 3.3.10](https://datatracker.ietf.org/doc/html/rfc5545#section-3.3.10)
- Comportamento de `events.list` com e sem `singleEvents`: [Google Calendar Events.list](https://developers.google.com/workspace/calendar/api/v3/reference/events/list)

Duas armadilhas importantes da RFC que a Rodada C precisa respeitar:

- `COUNT` e `UNTIL` são **mutuamente exclusivos** na mesma `RRULE`. A especificação da RFC
  5545 diz que `UNTIL` ou `COUNT` são opcionais, mas “`UNTIL` ou `COUNT` ... MUST NOT occur in
  the same recur” (não podem aparecer juntos na mesma regra).
- Quando o `DTSTART` tem `TZID`, o `UNTIL` precisa ser expresso em **UTC**, com sufixo `Z`.
  Esse é o caso do nosso `start.dateTime` com `timeZone`, e a regra vale para o `UNTIL` que
  vier de `recorrenciaDataFim` ou de qualquer limite convertido no app. Se a data local for
  `dd/mm/yyyy`, ela precisa ser convertida para UTC antes de entrar no `RRULE`.

> **Observação de confirmação**: as duas armadilhas acima foram confirmadas na RFC 5545 e no
> guia de eventos recorrentes. A linguagem do Google foi usada como referência para o modelo
> de pai + instâncias e para `singleEvents=true`, não como substituto da RFC.

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

### 4.2 O que é montado hoje

O backend já monta `recurrence` no payload do evento pai recorrente, com o `RRULE` e o
`EXDATE` necessários para representar a série e as exceções do app. A Rodada C converteu o
modelo legado em uma regra recorrente única, em vez de publicar eventos independentes por
instância.

No desenho final, a montagem do evento inclui `recurrence` com as partes do `RRULE` que
representam o padrão da série e o limite dela. O modelo legado ainda expõe campos como
`frequencia`, `diasSemana`, `intervaloRecorrencia`, `recorrenciaDataInicio`,
`recorrenciaDataFim`, `recorrenciaQuantidadeOcorrencias` e `excecoes`, mas esses campos
agora são a entrada para o mapeamento do item 3, não um conjunto de eventos avulsos.

## 4.3 Mapeamento do modelo local para `RRULE`

A tabela abaixo é o mapa de implementação da Rodada C e foi montada a partir do motor local
em `assets/js/shared/recurrence-helpers.js` e do serializador em
`assets/js/features/modals/scheduling-serializer.js`.

| Nosso campo | Valor | `RRULE` |
| --- | --- | --- |
| `tipoRecorrencia` | `diaria` | `FREQ=DAILY` |
| `tipoRecorrencia` | `semanal` | `FREQ=WEEKLY` + `BYDAY` |
| `tipoRecorrencia` | `mensal` com `diasSemana` | `FREQ=MONTHLY` + `BYDAY` |
| `tipoRecorrencia` | `mensal` sem `diasSemana` | `FREQ=MONTHLY;BYMONTHDAY=` |
| `tipoRecorrencia` | `anual` | `FREQ=YEARLY` |
| `intervaloRecorrencia` | `N` | `INTERVAL=N` |
| `recorrenciaFimCondicao` | `untilDate` | `UNTIL=` em UTC |
| `recorrenciaFimCondicao` | `occurrences` | `COUNT=` |
| `recorrenciaEscopo` | `monthOfDate` | `UNTIL=` no último dia do mês |
| `excecoes[]` | datas em `pt-BR` | `EXDATE` |

A lista de nomes de dia em pt-BR vem da fonte já usada no engine: `DEFAULT_DIAS_SEMANA` em
`assets/js/shared/recurrence-helpers.js:12` e `window.getNomesDiasSemana` em
`assets/js/utils-datetime.js:26-28`. O mapa é: `Domingo, Segunda, Terça, Quarta, Quinta,
Sexta, Sábado`, que correspondem aos códigos RFC `SU, MO, TU, WE, TH, FR, SA`.

Pontos em que o engine local já coincide com a RFC e não precisam de trabalho:

- A semana é deslocada para segunda-feira em `resolverCompromissoRecorrenteNaData`
  (`assets/js/shared/recurrence-helpers.js:65-74`), equivalente ao `WKST=MO` default da RFC.
- No caso mensal por dia do mês, o motor exige `dataRef.getDate() === dataCriacao.getDate()`
  (`assets/js/shared/recurrence-helpers.js:77-85`), o que reproduce o comportamento de
  `BYMONTHDAY`: meses sem esse dia são simplesmente ignorados.

> **Fonte da serialização**: o payload canônico nasce em `aplicarRecorrenciaLegada`
> (`assets/js/features/modals/scheduling-serializer.js:214-249`). Esse bloco salva a regra em
> `tipoRecorrencia`, `intervaloRecorrencia`, `diasSemana`, `recorrenciaEscopo`,
> `recorrenciaDataInicio`, `recorrenciaDataFim`, `recorrenciaQuantidadeOcorrencias` e
> `excecoes` antes de qualquer chamada ao Google.

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

| #   | Pergunta                              | Decisão                                                                 |
| --- | ------------------------------------- | ----------------------------------------------------------------------- |
| 1   | Quem chama a API do Google?           | **Só o backend**, dentro do CRUD de agendamento                         |
| 2   | Série vai como `RRULE`?               | **Sim.** Evento pai recorrente com `RRULE` (2.2)                        |
| 3   | Quem expande a recorrência?           | O Google                                                                |
| 4   | Série infinita?                       | Encerrada por `UNTIL`/`COUNT` na própria regra (2.3)                    |
| 5   | Edição da usuária no Google volta?    | **Não**, em item criado pelo app                                        |
| 6   | Evento criado no Google entra no app? | Sim, como `BloqueioExterno`                                             |
| 7   | O app edita evento externo?           | **Nunca**                                                               |
| 8   | Como o app reconhece o que é dele?    | `extendedProperties.private.app_origin`                                 |
| 9   | Timezone                              | `dateTime` local + `timeZone`; `UNTIL` em UTC quando necessário          |
| 10  | Instância enviada para reposição      | Desaparece do dia original no Google via `EXDATE`/instância (2.4)       |
| 11  | Falha do Google reverte a gravação?   | **Não.** Grava no Mongo e responde 502 com `partialSuccess`             |

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

### 9.1 Série recorrente publica apenas uma ocorrência — RESOLVIDO (Rodada C)

> **Redesenho concluído na v4**: a correção deixa de ser “publicar N eventos
> independentes” e passa a ser “publicar a série como um evento pai com `RRULE`”.

**Sintoma**: aula semanal aparece uma vez no Google, na data inicial.

**Causa**: o app ainda usa uma representação do tipo “evento único com um único
`googleCalendarEventId`”. O modelo atual expõe um único id por agendamento em
`backend/src/models/Agendamento.js:19`, e a lógica de escrita do calendário também assume um
evento único (`backend/src/services/gcalSyncService.js:643-647`).

**Correção redesenhada**: não é mais um mapa `data → googleCalendarEventId`; a correção passa
ser o padrão RRULE e o uso do id do evento pai. O campo `googleCalendarEventId` continua
sendo o identificador do evento pai no Google e continua suficiente para a série;
não há mais necessidade do horizonte de publicação.

**É o item que destrava todos os outros.** Depois do redesenho, 9.3 e 2.4 passam a ser
questões de `EXDATE`/instância e de edição parcial da série, não de expansão manual de um
horizonte.

### 9.2 Sync de entrada ignora evento do app — RESOLVIDO (Rodada A)

`persistSyncResults` testava `status === 'cancelled'` **antes** de `isAppOwnedEvent` e
chamava `deleteAgendamento(ownerEmail, event.id)`. Evento do app cancelado dentro do Google
**apagava o agendamento no app**.

Violava diretamente 2.1: leitura nunca deveria alterar dado do app.

**Estado atual**: `classificarEventoDeLeitura(event)` decide primeiro:

Hoje o dano é limitado por acidente — um id por série, e o match é por
`googleCalendarEventId`. Depois do redesenho v3, o risco continua, mas o caso mais sensível
é o `EXDATE`/instância do evento pai, não a explosão de ids por data.

`deleteAgendamento` saiu do caminho de leitura; `deleteBloqueio` continua sendo usado para
`BloqueioExterno` externo cancelado.

### 9.3 `excecoes` não propagam para o Google — RESOLVIDO (Rodada C)

> **Redesenho concluído na v4**: a correção deixou de ser “criar um evento separado por
> data” e passa a ser “transformar a exceção do modelo em `EXDATE` no evento pai recorrente”.

Adicionar data em `excecoes` altera o documento, o que dispara `PUT` e
`updateEventInGoogle` — mas o fluxo atual não traduz `excecoes` para o Google. O modelo
legacy salva `excecoes` e `excecoesDetalhadas` em `aplicarRecorrenciaLegada`
(`assets/js/features/modals/scheduling-serializer.js:238-249`), mas não há uma tradução
para `EXDATE` específica de evento recorrente.

Efeito prático: **aula cancelada ou enviada para reposição continua no Google**. O risco real
na v3 não é mais a expansão do horizonte, e sim a escolha de fonte de verdade entre
`excecoes` (datas pt-BR) e `excecoesDetalhadas` (amplitude detalhada), especialmente para
agendamentos em hora e `TZID`.

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

**Status**: observação informativa, não é pendência de trabalho nem ação de engenharia.

### 9.8 Sem cobertura de teste — PARCIALMENTE RESOLVIDO (Rodada A.2)

Existe `backend/test/gcal-sync.test.js`, com testes puramente unitários para as funções de
montagem e classificação. A suíte total do projeto está em **72 testes**.

Continua sem cobertura o que depende de I/O: `persistSyncResults` de ponta a ponta e
`listCalendarEvents` em modo incremental/full com Google real. Esse é um nível de esforço
maior (I/O real) e não uma pendência de correção de regra do calendário.

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

### 9.11 `occurrences` não é aplicado no engine local — RESOLVIDO (Rodada C)

**Problema**: o serializador grava `recorrenciaQuantidadeOcorrencias` e a condição
`recorrenciaFimCondicao: 'occurrences'`, mas o motor local só trata `untilDate` em
`checarCompromissoNaData` (`assets/js/shared/recurrence-helpers.js:131-137`). O fluxo de
serialização que preenche o payload está em `aplicarRecorrenciaLegada`
(`assets/js/features/modals/scheduling-serializer.js:241-249`).

**Consequência**: o app local e o Google podem divergir. Se a série for publicada com
`COUNT`, o Google a encerra segundo a regra, mas o app local continua contando instâncias
como se a série fosse infinita. Isso é uma divergência de regra, não um detalhe visual.

**Risco financeiro**: `recurrence-helpers.js` é consumido em
`backend/src/services/financasService.js:6` e em `normalizarAulasContadas`
(`backend/src/services/financasService.js:193-225`), então a regra de contagem impacta
`aulasContadas` e, por extensão, o valor do ciclo. Não é mudança cosmética.

### 9.12 `EXDATE` de evento com hora precisa do horário — RESOLVIDO (Rodada C)

**Problema**: nossas `excecoes` são strings de data em `pt-BR` e o engine trata exclusão por
`dataStr = dataAlvo.toLocaleDateString('pt-BR')` em `checarCompromissoNaData`
(`assets/js/shared/recurrence-helpers.js:109-115`). Isso funciona para recorrência sem hora,
mas não é confiável quando o evento tem horário: `EXDATE` precisa casar com o valor do
`DTSTART`, inclusive hora e `TZID`.

**Risco**: uma exclusão por data pode remover a instância errada ou falhar quando o evento
cronometrado for publicado como recorrência. O payload já carrega `excecoesDetalhadas` em
`aplicarRecorrenciaLegada` (`assets/js/features/modals/scheduling-serializer.js:238-239`),
mas a Rodada C precisa decidir qual fonte de verdade será usada.

### 9.13 Volume de leitura aumenta — OBSERVAÇÃO, NÃO AÇÃO

`listCalendarEvents` usa `singleEvents=true` (
`backend/src/services/gcalSyncService.js:449-473`), então o Google devolve instâncias
expandidas dentro da janela. Essas instâncias herdam `extendedProperties` do evento pai, e a
classificação de propriedade continua funcionando em `isAppOwnedEvent`
(`backend/src/services/gcalSyncService.js:13-18`).

Esse é um custo de payload, não um bug — e passa a ser um ponto de observação se a série
virar longa. O risco não é a lógica de ignorar o evento do app, e sim o volume de dados
lidos em cada sync. Como o próprio guia da API classifica isso como custo de leitura e não
como defeito funcional, fica registrado como observação, não como pendência de trabalho.

## 10. Custo aceito da decisão

A escolha por `RRULE` não é gratuita. O guia de eventos recorrentes da Google explica que,
para alterar uma única instância, a aplicação precisa buscar a instância e atualizá-la; para
alterar a série a partir de um ponto, o padrão é aparar a série original com `UNTIL` antes da
instância alvo e criar uma nova série. A referência é
`https://developers.google.com/workspace/calendar/api/guides/recurringevents`.

Hoje isso é aceitável porque o app não tem um fluxo de "editar série a partir daqui". O fluxo
existente é cancelar ocorrência e criar reposição, que é o caso simples com `EXDATE`.
Se um dia surgir edição parcial de série, esse é o ponto em que a decisão deve ser reaberta.

---

## 11. Ordem sugerida de correção

Os itens da Rodada C já foram resolvidos e saem do backlog desta spec. O que permanece hoje
é apenas o que ainda exige trabalho real ou observação de custos/escala:

1. **9.2** — pequeno, cirúrgico, e evita perda de dado. Independe de tudo.
2. **9.4** — pequeno, e destrava o gate de persistência da reposição.
3. **9.5** e **9.6** — pequenos, oportunistas.
4. **9.8** — cobertura real de I/O; depende de ambiente/Google e não é correção de regra
   de negócio.
5. **9.9** — documentação e nomeação, junto de qualquer correção de leitura/escrita em
   andamento.
6. **9.13** — observação de payload/volume de leitura; fica como alerta de escala, não como
   pendência funcional.

Os itens **9.1**, **9.3**, **9.11** e **9.12** saíram do backlog porque a Rodada C
concluiu o redesenho para `RRULE`, a propagação de `EXDATE`, o uso de `COUNT` e o ajuste de
`UNTIL`/`EXDATE` na forma correta. O que sobrou é manutenção e observação, não uma segunda
revisão de desenho.
