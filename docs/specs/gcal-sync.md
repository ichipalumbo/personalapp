# Spec — Sincronização com Google Calendar

> **Status**: em produção com validação concluída; sincronização, webhook, `RRULE` e
> `EXDATE` validados ao longo das rodadas A–H; validação em produção concluída em 31/08/2026.
> 
> **Versão**: 11 · **Atualizado**: 2026-09-01
> **Defeitos em aberto**: 2 (ver seção 9): 9.14 (gatilho triplo de sincronização no boot) e 9.8
> (cobertura parcial de I/O real no Google). Os defeitos 5 e 6 foram corrigidos, cobertos por
> testes e verificados em produção pelo dono em 2026-09-01; as duas consultas do §5.1 do
> diagnóstico retornaram vazias nas duas contas, sem dano gravado.
>
> **Relação com outras specs**: `docs/specs/reposicoes-e-competencia.md` (v6) define a
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

### 2.6 Regras da RFC 5545 que o app precisa manter

- `COUNT` e `UNTIL` são **mutuamente exclusivos** na mesma `RRULE`.
- Quando o `DTSTART` tem `TZID`, o `UNTIL` precisa ser expresso em **UTC**, com sufixo `Z`.
  Esse é o caso do nosso `start.dateTime` com `timeZone`, e a regra vale para o `UNTIL` que
  vier de `recorrenciaDataFim` ou de qualquer limite convertido no app. Se a data local for
  `dd/mm/yyyy`, ela precisa ser convertida para UTC antes de entrar no `RRULE`.
- A RFC exige a **forma básica** do `UNTIL`: `20260827T235959Z`, sem hífens e sem dois
  pontos. `toISOString()` produz a **forma estendida** (`2026-08-27T23:59:59.000Z`), e o
  Google rejeita esse formato. Esse foi o bug corrigido no C-Fix; a formatação ficou
  centralizada em `formatarDataUtcRfc5545` (`backend/src/services/gcalSyncService.js`).
- O `UNTIL` é **inclusivo** do último dia para casar com o motor local, que trata
  `recorrenciaDataFim` como inclusiva.
- `COUNT` limita o conjunto gerado pela `RRULE`, e o `EXDATE` remove **depois** da expansão.
  Logo, a ocorrência cancelada continua consumindo uma vaga do `COUNT`. A regra foi
  implementada em `contarOcorrenciasAteData` (`assets/js/shared/recurrence-helpers.js`) de
  propósito; quem “corrigir” para descontar exceções reintroduz divergência entre app e Google.

> **Observação de confirmação**: as armadilhas acima foram confirmadas na RFC 5545 e no
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

### 3.4 Pendência server-side e teto de re-tentativa

O mecanismo de pendência do Google é **server-side**: os campos
`gcalSyncPendingAt` e `gcalSyncPendingTentativas` são persistidos no Mongo e nunca entram
no estado local do frontend. A assimetria é deliberada: `listaLocal` remove os campos
antes do diff, mas `listaRemota` não remove — é ela que dispara o `PUT` quando o item
local diverge do remoto.

Quando a chamada ao Google falha, o backend grava:

- `gcalSyncPendingAt`: timestamp do momento da falha;
- `gcalSyncPendingTentativas`: `min(tentativasAtuais + 1, 5)`.

O teto é 5 tentativas. O limite vale apenas para a **chamada ao Google**: a gravação do
agendamento no Mongo ocorre antes e continua incondicional. Se o item estiver em estado
terminal, a rota ainda salva a edição do usuário, zera o contador para `0` e responde com
`gcalSyncPausado: true`, mas não chama o Google naquele request. O próximo ciclo pode
reabrir a janela de sincronização sem perder a alteração.

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
| `recorrenciaFimCondicao` | `untilDate` | `UNTIL=` em UTC, forma básica RFC 5545 |
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
- **Boot**: `assets/js/app/bootstrap.js` dispara `renovarCanalGoogleCalendar()` após `router.navigateTo('tela-home')`, com guarda `gcalWatchCheckDisparado` e `setTimeout(..., 0)`.
- **Manual**: botão `btnRenewGoogleCalendarWatch` no modal de configurações chama o mesmo endpoint de renovação e também dispara o catch-up simultâneo.
- **Manual/automático**: `iniciarSyncGoogleCalendar` no bootstrap, quando há conexão.

### 5.1.1 Renovação ativa do canal de webhook

O canal `events.watch` do Google Calendar expira em cerca de 7 dias. Sem renovação ativa,
 o webhook para de chegar silenciosamente: não há 4xx nem erro de processamento, apenas
 ausência de notificação. Esse foi o defeito de produção que originou a rodada GCal-Watch:
 eventos apagados no Google continuavam aparecendo no app.

`shouldRenewWebhookChannel` decide pela renovação quando `channelExpiration` é nulo,
 inválido, vencido ou está dentro da margem de 24 horas do vencimento. Quando a conexão
 existe e a janela de segurança foi atingida, `renewWebhookChannelForOwner` procede em
 fluxo single-flight por `ownerEmail` usando `Map` de promessas no módulo. O lock vale por
 processo; em ambiente serverless com múltiplas instâncias paralelas, duas instâncias ainda
 podem registrar dois canais diferentes no mesmo intervalo.

A renovação encerra o canal antigo com `channels.stop` antes de registrar um novo, quando
 há `channelId` e `channelResourceId`. Falha no `stop` gera `warning` e o fluxo segue. Depois
 da renovação, o serviço dispara `syncConnection` imediatamente para recuperar o atraso
 acumulado enquanto o canal estava morto. Esse é o comportamento obrigatório do sistema
 hoje; não é uma tentativa opcional de prevenção.

O endpoint de diagnóstico e manutenção é `POST /api/gcal/webhook/renew`, autenticado por
 `requireAuth`. A decisão de ampliar o endpoint existente em vez de criar um vizinho foi
 feita para manter o mesmo contrato de verificação do canal e o mesmo diagnóstico de
 recuperação, sem duplicar lógica de autenticação ou de reconciliação de sincronização.

A rota responde sempre `HTTP 200`, mesmo em falha. O corpo inclui `renewed`, `synced`,
 `activeItems`, `cancelledItems` e `reason`. Os valores observados de `reason` são
 `channel_valid`, `renewed_and_synced`, `renewed_sync_failed` e `renewal_failed`.

### 5.1.2 Purge do full sync com janela

`listCalendarEvents` devolve `timeMin`/`timeMax` no modo full e `null` no modo incremental.
 O purge por varredura só roda quando não há `syncToken` (ou seja, no full sync) e quando
 existe janela válida. Sem janela válida, o serviço faz `return` defensivo, registra
 `warning` e não apaga nada — é a escolha do lado seguro.

Esse comportamento corrige o defeito anterior em que o full sync apagava bloqueios locais
 fora da janela consultada, inclusive registros legítimos fora do alcance da query.
 `BloqueioExterno.data` é comparado com a janela; o schema grava a data em `YYYY-MM-DD` via
 `normalizarDataParaISO`, e os limites de `timeMin`/`timeMax` chegam em ISO datetime e passam
 pela mesma normalização antes da comparação. `isBloqueioDentroDaJanela` foi o ponto de
 proteção que tornou esse purge seguro.

**Limite conhecido**: a janela do full sync é de `−1 mês a +2 meses`. Um evento externo fora
 dessa faixa não é repovoado por um full sync. Consequência prática: apagar a collection
 `BloqueioExterno` faz perder permanentemente bloqueios fora dessa janela, porque o full
 sync não os traz de volta e o incremental só entrega mudanças.

**Limite conhecido**: bloqueio com `data` nula ou inválida nunca entra no purge. É o lado
 seguro, mas pode acumular registros órfãos.

### 5.1.3 Gatilho no boot e escape hatch

A verificação do canal no boot está ancorada em `assets/js/app/bootstrap.js`, logo após
 `router.navigateTo('tela-home')`, protegida por `gcalWatchCheckDisparado` e disparada com
 `setTimeout(..., 0)` para não bloquear o primeiro render. Ela roda uma vez por carga de
 página. Nenhum dos três `carregarDados` existentes dispara a renovação; o gatilho do boot é
 independente do ciclo de sincronização normal.

Se não há sessão Google, a função sai sem forçar login. O botão manual
 `btnRenewGoogleCalendarWatch` no modal de configurações chama o mesmo endpoint do boot para
 diagnóstico e verificação de estado, sem depender do código de login ou da janela de
 sincronização automática.

### 5.1.4 Estado de validação

 A validação de produção foi executada manualmente pelo botão em 31/08/2026. A renovação
 do canal antigo, o registro do novo canal e a sincronização de recuperação funcionaram: a
 expiração avançou para a semana seguinte, coerente com o teto de ~7 dias do Google.

Essa validação descartou a hipótese de descasamento entre id de série-mãe e id de instância
 no `deleteBloqueio`. O lugar onde o problema ocorria era a sincronização de webhook e a
 reconciliação de `BloqueioExterno`, não o mapa de ids do evento do app.

 Ressalva registrada: o disparo automático no boot não foi observado isoladamente — a
 validação foi por clique manual do mesmo fluxo e do mesmo endpoint. O caminho inteiro foi
 executado em produção, mas a observação do boot automático permanece fora do escopo da
 validação documentada nessa rodada.

### 5.1.5 Débito técnico a registrar

A sincronização é disparada em três pontos independentes no boot: no próprio bootstrap,
 no listener de auth-change e no `visibilitychange`/auto-refresh. O gatilho de renovação do
 canal foi deliberadamente mantido fora desse ciclo. A consolidação dos três continua
 pendente, e o fato de o sync funcionar em teste manual não resolve esse sintoma: o problema
 é chamada redundante, não erro visível.

### 5.2 Listagem

`listCalendarEvents` tem dois modos:

| Modo        | Quando               | Parâmetros                                                                                                    |
| ----------- | -------------------- | ------------------------------------------------------------------------------------------------------------- |
| Incremental | há `syncToken` salvo | `syncToken`, `singleEvents=true`, `maxResults=250`                                                            |
| Full        | sem `syncToken`      | janela `−1 mês` a `+2 meses`, `singleEvents=true`, `orderBy=startTime`, `showDeleted=false`, `maxResults=250` |

`syncToken` expirado (HTTP 410) zera o token e refaz o full — tratamento correto e já
implementado.

> `singleEvents=true` faz o Google devolver **instâncias individuais** dentro da janela:
> se o parâmetro `singleEvents` é `true`, todas as instâncias individuais aparecem no resultado, mas os eventos recorrentes subjacentes não.
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

Quando a chamada ao Google foi pulada porque o item está em estado terminal, a rota
responde **HTTP 200** com `gcalSyncPausado: true` e sem reutilizar `gcalSyncFailed`.
Esses são estados distintos: a falha transitória é `gcalSyncFailed`, a pausa por teto é
`gcalSyncPausado`.

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
| 11  | Falha do Google reverte a gravação?   | **Não.** Grava no Mongo e responde `HTTP 200`; `gcalSyncFailed` sinaliza falha transitória e `gcalSyncPausado` sinaliza pausa por teto |

---

## 8. Fora de escopo

- **Convidados / attendees.** Nenhum evento leva participante.
- **Múltiplos calendários.** Sempre `connection.calendarId` ou `primary`.
- **Lembretes / notificações** configurados pelo app.
- **Edição bidirecional.** Explicitamente recusada (2.1).
- **Importar evento externo como aula.** Evento do Google vira bloqueio, nunca aula.
- **Cor por tipo de compromisso.** `colorId` é fixo.
- **UI de aviso do estado terminal.** A flag `gcalSyncPausado` é contrato de API; o texto do toast e a apresentação visual ficam fora do escopo desta spec.
- **Tentativa automática do Google no frontend.** O teto é server-side e o frontend só dispara `PUT` quando o diff local/remoto exige a gravação no Mongo.
- **`PUT` recorrente em item terminal sem edição.** Enquanto o item permanece no teto e não recebe edição, cada ciclo de sync emite um `PUT` que grava no Mongo e não chama o Google. Não é perda de dados; é escrita desperdiçada, consequência deliberada da persistência incondicional. Sem decisão de produto, permanece assim.
- **Recuperação apenas eventual.** A edição de item em estado terminal não chega ao Google na requisição que a originou, e sim no ciclo seguinte. Não há sinal ao usuário durante o intervalo.
- **Precedência divergente da data base.** `gcalSyncService` resolve `recorrenciaDataInicio || data || dataCriacao`; `recurrence-helpers` resolve `dataCriacao || recorrenciaDataInicio || data`. Somado ao fallback de `resolverDataISO` para `new Date()`, séries com campos divergentes podem alinhar `DTSTART` de formas diferentes no backend e no motor local. Unificação não foi feita.
- **Detecção de edição por igualdade estrita.** `agendamentoRecebeuEdicao` usa `isDeepStrictEqual` após normalização. Uma origem futura que envie campos numéricos com tipos inconsistentes pode reabrir a janela de tentativas por diferença de tipo, não de valor. Coerção ampliada não foi implementada.
- **Séries antigas com `DTSTART` defeituoso.** Séries criadas antes da correção de `DTSTART`/`BYDAY` precisam de reedição manual. Não há migração automática, e após a correção não há como identificá-las.

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

### 9.11 `COUNT` e `EXDATE` no motor local — FECHADO POR DECISÃO DE PRODUTO

**Decisão**: o `COUNT` serve apenas para encerrar a recorrência após N eventos, seguindo o
comportamento padrão do Google Calendar. Ele não representa pacote comercial de aulas, nem
muda o dia a dia da operação com o app.

**Evidência**: a checagem executada na Rodada E confirmou que o motor local e o Google
concordam em comportamento real.

```text
MOTOR LOCAL do app:  3 aulas -> 07/09, 14/09, 28/09
PAYLOAD ao Google:   ["RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=4", "EXDATE;...20260921T090000"]
DIVERGEM? NAO
```

A correção já implementada em `contarOcorrenciasAteData` segue a RFC: o `EXDATE` é aplicado
após a expansão e a ocorrência cancelada continua consumindo a vaga do `COUNT`; a filtragem
prematura em `checarCompromissoNaData` continua protegendo o calendário local sem afetar a
regra de negócio do Google.

**Risco financeiro**: `recurrence-helpers.js` continua sendo consumido em
`backend/src/services/financasService.js:6` e em `normalizarAulasContadas`
(`backend/src/services/financasService.js:193-225`), então a regra de contagem ainda afeta
`aulasContadas` e, por extensão, o valor do ciclo. O fechamento aqui é de produto, não uma
mudança na regra de cálculo do app.

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

### 9.14 Gatilho de sincronização triplo no boot — PENDENTE

A sincronização de leitura do Google Calendar é disparada em três pontos do boot:

- `assets/js/app/bootstrap.js` (gatilho de renovação + sincronização);
- listener de auth-change (`googleIdentity.addAuthChangeListener`);
- `visibilitychange` com auto-refresh silencioso.

A validação em produção de 31/08/2026 confirmou que a cadeia de renovação do canal funciona,
encerrando o canal antigo, registrando o novo e sincronizando a recuperação. O ponto ainda
pendente é a observação isolada do gatilho automático no boot: a verificação executada foi por
clique manual no botão de renovação, não por disparo direto do boot.

**Status atual**: a renovação do canal está validada; o gatilho triplo do boot continua pendente
como item funcional e segue registrado em 9.14, sem reabrir a decisão de produto da sincronização
em si.

### 9.15 — Série truncada antes do próprio início vira evento avulso. — RESOLVIDO (Rodada F/H + 2026-08-31)

**Decisão de produto**: quando a série truncada fica sem ocorrência restante, o registro sai do
app em ambos os lados e o evento sai do Google. Não há nada a preservar, porque a série nova
assume tudo a partir da data editada.

**Complemento do defeito 6 (Rodada H / 2026-08-31)**: quando a janela final da série truncada
fica finita e não produz nenhuma ocorrência válida, a remoção não pode depender de uma
comparação de datas invertidas. A regra correta é verificar se sobrou alguma ocorrência real, e
isso deve ser decidido por `checarCompromissoNaData` e pelos helpers de
`assets/js/shared/recurrence-helpers.js`. A herança de término no split também cobre o caso em
que a mãe fica vazia: a filha herda quando o fim original é posterior ou igual à data do corte.
Na rodada de 2026-08-31, a herança de término passou a cobrir a mãe finita por contagem de
ocorrências, calculando o fim efetivo a partir da data de início original e usando como saída
canônica da filha `untilDate` + data.

**Correção no frontend**: `assets/js/modal-acao-slot.js`, bloco de split `fromDate`, foi
ajustado para: (a) capturar o fim original da mãe antes do aparo; (b) herdar `recorrenciaDataFim`
para a série nova apenas quando a mãe era finita e a condição de término era `untilDate`; (c)
remover a série original quando o corte não sobrou ocorrências válidas; e (d) preservar a série
nova infinita quando a mãe era infinita.

**Cobertura de teste**: a Rodada H provou a correção com mutação no arquivo real de produção,
executando o listener registrado pelo `vm`. `backend/test/gcal-duplicata-fix.test.js` cobre os
cenários de split na primeira ocorrência, no meio da série, na segunda-feira sem ocorrência e no
caso de herança de fim para série previamente aparada.

**Sub-item em aberto**: o diagnóstico original do backend continua como alerta de risco em outra
via de implementação, mas a correção entregue e coberta hoje é a do fluxo do app. Se um
caminho do backend for identificado gerando o mesmo payload fora do split, esse caso deve ser
registrado como sub-item separado, sem reabrir a decisão de produto já tomada.

### 9.16 — Dia da semana sem acento derruba a recorrência em silêncio. — RESOLVIDO (Rodada E)

`mapearDiaSemanaParaCodigoRFC` e `normalizarDiaSemanaParaComparacao` em
`backend/src/services/gcalSyncService.js` agora normalizam com `normalize('NFD')` e aceitam
abreviações de três letras, ramos numéricos e `console.warn` ao descartar valor inválido. O
código foi protegido por teste comportamental em `backend/test/gcal-sync.test.js` (`montarRecurrence aceita diasSemana sem acento, abreviado, numérico e dispara warning para inválido`).

### 9.17 — Excluir a série toda usa a mesma resolução da confirmação e preserva reposições. — FECHADO (2026-08-31)

**Decisão de produto**: "excluir a série toda" passou a remover a cadeia completa subindo até a
série raiz, mas preservando as reposições. A confirmação e a remoção usam o mesmo resolver de
família, então o número anunciado e o número removido deixam de divergir.

**Cálculo do período**: a confirmação passou a informar o período da cadeia por meio do mesmo
conjunto de membros que define a remoção. `sem data de término` só aparece quando uma série
recorrente que será removida de fato não tem fim; avulsa e reposição não contam no cálculo.

**Semântica preservada**: `removerFamiliaSerie` continua com a regra de descendentes para o fluxo
"continuar em outra série" e para a futura etapa 6b. O caso da remoção da série toda continua
usando o resolver full-chain, sem misturar a semântica de continuação.

**Cobertura**: a correção foi validada com mutação no arquivo real de produção e com a asserção
adicional em `backend/test/gcal-duplicata-fix.test.js` para `resumo.ate === '13/09/2026'`.

### 9.18 — Motor de aparo de cadeia "daqui pra frente" corta a série sem subir ao ancestral nem mexer no histórico. — FECHADO (2026-08-31)

**Decisão de produto**: existe um motor testável em `assets/js/modal-acao-slot.js`,
`aparaCadeiaSerieAPartirDe`, que corta a recorrência a partir de uma data sem mexer no histórico
anterior. O escopo considerado é a família descendente da série selecionada mais as avulsas
irmãs penduradas no mesmo `serieOrigemId`; o motor nunca sobe até o ancestral, e um descendente
que terminou completamente antes do corte é ignorado porque já entrou no histórico e não deve ser
tocado.

**Resolver usado**: em vez de subir até a raiz, ele usa `resolverFamiliaDescendenteSerie` para
restringir a ação aos descendentes em foco e complementa a varredura com o bloco `mesmoRamo`
para capturar a avulsa irmã sem sugar o pai. Isso evita o defeito 5 reaparecer por outra porta,
porque o algoritmo não toma o ancestral nem o ramo já concluído como alvo de aparo ou remoção.

**Semântica do corte**: descendente que começa antes do corte é aparado em vez de removido,
porque a pessoa pode ter aulas válidas antes da linha de corte, e a exclusão deve preservar esse
histórico e só reduzir o fim da série para o dia anterior à data escolhida. Avulsa irmã a partir
do corte é removida, exceto quando é reposição. Reposição continua sempre preservada, e o motor
retorna `reposicoesPreservadas` para a UI avisar sem recalcular o escopo. A interface ainda não foi
ligada; o motor existe e a 6b-ui decide o botão e o diálogo final.

**Cobertura**: a lógica foi registrada em `backend/test/gcal-duplicata-fix.test.js` com
`aparaCadeiaSerieAPartirDe apara a série selecionada e preserva o histórico`,
`aparaCadeiaSerieAPartirDe apara o descendente que começa antes do corte`,
`aparaCadeiaSerieAPartirDe remove a série quando o aparo não deixa ocorrência`,
`aparaCadeiaSerieAPartirDe não toca em descendente que termina antes do corte`,
`aparaCadeiaSerieAPartirDe não remove o ancestral avulso` e
`aparaCadeiaSerieAPartirDe preserva reposição irmã e a contabiliza`.

### 9.19 — Exclusão de aula/serie passou a usar lixeira única com modal de escolha e despacho por função nomeada. — FECHADO (2026-09-01)

A exclusão passou a ter uma única lixeira, com modal de escolha em quatro opções de ação de exclusão e duas camadas de despacho: excluir esta aula, excluir daqui pra frente, excluir a série toda e a senteça de "daqui pra frente" extraída para `executarExclusaoSerieAPartirDe`. Esse desenho evita a ambiguidade do fluxo anterior, em que a aula deletada deixa de ser cobrada e a ação destrutiva competia com "enviar para reposição". Cada opção despacha por função nomeada em `window` (`executarExclusaoInstancia`, `executarExclusaoAulaAvulsa`, `executarExclusaoSerieAPartirDe`, `executarExclusaoSerie`) em vez de simular clique em botão do DOM removido.

O modal também reusa o padrão `.modal-escolha-*` já existente no app, com ícones escalonados por alcance da exclusão (leve, média e total) e cabeçalho contextual com aluno, data e horário. A confirmação final continua sendo `window.confirm()` nativo, como débito conhecido e explicitado no fluxo. A validação visual do modal ficou manual, porque `index.html` e `assets/css/style.css` não têm suíte automatizada e a checagem do comportamento final no browser precisa ser feita pelo dono.

**Correção de 2026-08-31 (rodada 6b-ui.3)**: a rodada anterior que entregou o despacho por função nomeada (commit `1cb0679`) apagou o corpo das três funções — 316 linhas removidas, 138 adicionadas no arquivo — e as substituiu por stubs que chamavam funções inexistentes (`removerInstanciaAula`, `removerCadeiaInstancia`) ou a função errada para o caso (`removerFamiliaSerie` em vez de `removerCadeiaCompletaSerie` na exclusão de série toda). O efeito prático: as três ações não excluíam, não persistiam e não fechavam o modal de ação do slot, e a guarda de aluno inativo desapareceu de `executarExclusaoSerie`. A rodada 6b-ui.3 restaurou os três corpos originais a partir do commit anterior à quebra, manteve a camada visual intacta, e acrescentou o fechamento de `window.fecharModalAcaoSlot()` no ramo "daqui pra frente" (que também não fechava o modal). A exclusão de série toda volta a remover a mesma cadeia que o resumo anuncia, coerente com a correção do item 9.17.

**Ajuste de 2026-09-01 (rodada 6d)**: a etapa 6d renomeou o handler avulso de `executarExclusaoDefinitiva` para `executarExclusaoAulaAvulsa` e extraiu a ação "daqui pra frente" para `executarExclusaoSerieAPartirDe`, sem alterar a lógica de negócio nem o desenho visual. O mapeamento de leitura de relatórios antigos é `executarExclusaoDefinitiva` → `executarExclusaoAulaAvulsa`.

### 9.20 — Envio para reposição em série usa despachante único com dois caminhos internos. — FECHADO (2026-09-01)

A ação de "Enviar para reposição" passou a ter um despachante único em `window`,
`window.executarEnvioParaReposicao`. Ele reutiliza a área de seleção/validação do modal
existente e conecta os dois botões do DOM (`btnMandarParaReposicao` e o resquício
`btnReagendarInstancia`) ao mesmo ponto de entrada, sem unificar o layout visual no mesmo
round de correção.

**Semântica preservada**:

- `compromisso.frequencia === "uma_vez"` usa `splice` para remover a aula do array;
- caso contrário, usa `excecoes.push(dataAlvo)` para marcar somente a data alvo como exceção e
  preservar a série remanescente;
- a guarda de aluno inativo continua obrigatória antes de qualquer mutação;
- após persistência bem-sucedida, o fluxo fecha `window.fecharModalAcaoSlot()`.

**Débito conhecido**: o DOM ainda expõe dois ids equivalentes com rótulo idêntico
(`btnMandarParaReposicao` e `btnReagendarInstancia`), e o id do recorrente não descreve a ação
real. A limpeza do DOM e do nome do botão continuaram fora do escopo da etapa de correção.

**Feita**: a etapa 6d corrigiu o cancelamento do modal de cobrança ao fazer `window.fecharModalEscolhaCobrancaReposicao()` resolver a Promise em escopo compartilhado, de forma idempotente, sem chamar o callback. O `await` em `window.executarEnvioParaReposicao()` volta ao fluxo normal quando o usuário cancelou, e `executarExclusaoDefinitiva` foi renomeado para `executarExclusaoAulaAvulsa` para manter o nome coerente com o escopo real da ação.

**Ordem pessimista por decisão de produto**: o caminho de série em `window.executarEnvioParaReposicao` é deliberadamente pessimista. A ordem registrada é: criar a reposição no servidor, marcar a exceção local, fechar a UI, persistir e só então confirmar sucesso após o HTTP 200. Isso foi decidido porque a reposição carrega `cobravel` e o motor financeiro das aulas está no backend; confirmar na UI antes do 200 criaria estado financeiro que o servidor pode recusar. Essa ordem não deve ser "otimizada" sem decisão explícita do dono.

**Correção de redação (2026-09-01, etapa 6i-b)**: a versão anterior deste item afirmava que "o rollback existe e reverte a criação remota e a marcação local em caso de falha". A parte de reversão remota estava **incorreta** para o ramo `ehSerie`: o `catch` desse ramo apenas restaura `compromisso.excecoes` a partir do snapshot em memória e exibe o toast de erro — não dispara nenhuma chamada de rede que desfaça a reposição criada. A reversão remota existe apenas no ramo `!ehSerie`, e passou a existir só na etapa 6i-b (ver item `9.27`). Corrigir o ramo `ehSerie` não foi pedido pelo dono e permanece fora de escopo.

**Cobertura**: a regressão foi validada em `backend/test/gcal-duplicata-fix.test.js` com os
quatro efeitos esperados: `envio para reposição em série preserva a série e marca exceção`,
`envio para reposição em avulsa remove a aula`, `os dois botões despacham para a mesma função`
 e `envio para reposição bloqueado para aluno inativo`, além dos dois testes de 6d para `executarExclusaoSerieAPartirDe apara a série e preserva o histórico` e `cancelar a escolha de cobrança não deixa a operação pendurada`.

### 9.21 — Exclusão destrutiva aguarda confirmação de gravação e reverte em falha. — FECHADO (2026-09-01)

**Sintoma antigo**: os fluxos de exclusão mutavam o array local, disparavam `salvarDados()` sem
`await` e logo em seguida executavam `inicializarHome({ sincronizar: true })`. Isso gerava corrida
entre o `PUT` do save e o `GET` de sincronização: se o GET chegasse antes do PUT, a aula reaparecia
na tela ao trocar de semana, e só sumia depois de um novo `Sincronizar Dados` quando o servidor já
estava correto. Esse interleaving é justamente o motivo do efeito "a aula reaparece e depois some"
relatado pelo dono.

**Falha silenciosa**: a persistência devolve `{ ok, motivo }` e algumas falhas reais (`nao_autenticado`,
`sessao_expirada`, `falha_remota`) eram ignoradas porque nenhum handler lia o retorno. Em vez de
mostrar o erro, a UI aceitava o estado local como se a exclusão tivesse concluído, enquanto o
servidor mantinha a aula viva. A correção 6e tratou isso explicitamente e agora a tela só confirma
após a persistência real, com rollback do snapshot local em caso de falha.

**Decisão de produto**: as quatro ações de exclusão passaram a seguir a mesma ordem já registrada
para a reposição e para a determinação do efeito financeiro: snapshot do estado antes da mutação,
mutação local, `await salvarDados()`, validação com `deveEnviarPatchReposicao(resultado)`, rollback
com `aulas.splice(0, aulas.length, ..._snapshotAulas)` quando o save falha e sem recarregar a tela
nessa condição. A ordem é deliberadamente pessimista: a professora vê o estado confirmado só depois
que o servidor responde. Isso contraria o padrão optimistic-UI do contexto de novas conversas, mas
é necessário porque a exclusão é destrutiva e irreversível pelo usuário; confirmar antes do servidor
criar divergência que não há como perceber nem desfazer.

**Erro do usuário**: em caso de falha, o array local volta ao estado anterior, `mostrarToast(...)` ou
`alert(...)` informa a falha e não há recarga. Essa decisão preserva a honestidade do estado da
interface, e evita o cenário de “a aula tinha sumido na tela e reviveu no servidor”.

**Débito de UX**: a espera é perceptível e o comportamento é mais lento do que uma otimização
optimistic-UI. Reduzir a recarga sem `sincronizar: true` depois da gravação confirmada permanece
como débito de UX para uma rodada futura, com decisão do dono.

**Cobertura**: a correção foi validada em `backend/test/gcal-duplicata-fix.test.js` com os testes
`exclusão de série só recarrega depois de a gravação confirmar`,
`falha de gravação desfaz a exclusão local e não recarrega`,
`excluir daqui pra frente aguarda a gravação` e `falha de gravação restaura a série aparada`.

### 9.22 — Fechamento da etapa 6 — FECHADO (2026-09-01)

A etapa 6 fechou em seis rodadas — 6a, 6b-core, 6b-ui, 6c, 6d e 6e — mais as rodadas de
restauração `6a.2`, `6b-core.2`, `6b-ui.2` e `6b-ui.3`. As quatro ações de exclusão têm
função nomeada e são as três opções do modal mais a avulsa.

A limpeza retroativa foi executada e não encontrou nada: as duas consultas do §5.1 do
diagnóstico voltaram vazias na conta de teste e na de produção em 2026-09-01. Esse é um
fato verificado e registrado com a data, para evitar reabrir a suspeita em rodadas futuras.
O ambiente de teste do §7 do diagnóstico foi limpo pelo dono, que guardou as collections
originais. A suíte ficou em 187 testes.

### 9.23 — Débitos remanescentes da etapa 6 — REGISTRO

1. **Agrupar a cadeia na interface** — direção registrada no §6.4 do diagnóstico, escopo grande, sem previsão.
2. **Espera perceptível na exclusão** — consequência aceita da 6e; reduzir a recarga é decisão do dono.
3. **Dois ids duplicados no DOM** para "Enviar para reposição", e o id `btnReagendarInstancia` que não descreve a ação.
4. **Ramo Google Calendar nas exclusões** — confirmando a persistência: `salvarEventoComGCal` persiste via `salvarDados`. A corrida não existia, e a falha silenciosa era real e foi corrigida — ver item `9.26`.
5. **Relatório da 6d sem as quatro mutações** — as mutações exigidas pelo prompt da 6d não foram executadas. O código foi verificado por auditoria externa e está correto; o registro é que ficou incompleto.
6. **Seis pontos de chamada de `salvarEventoComGCal` fora do escopo da 6h** — FECHADO na etapa 6i, ver item `9.27`. Os seis eram: criação em `modal-agendamento.js` (handler de `formAgendamento`); e, em `modal-acao-slot.js`, o `novoCompromisso` do handler de `formReagendarAula`, o par `compromisso`/`_snapshotEdicao` do handler de `formEditarCompromisso`, as duas gravações de split desse mesmo handler (`_novaOcorrenciaSerie` e `_novaSerieSplit`) e a gravação de `compromisso` no ramo `!ehSerie` de `window.executarEnvioParaReposicao`. A redação original deste débito não citava `executarEnvioParaReposicao` explicitamente, embora ela estivesse dentro da contagem de seis; o diagnóstico da 6i-a apontou a imprecisão e ela está corrigida aqui.

### 9.27 — Persistência silenciosa em criação, edição, split e envio para reposição — FECHADO (2026-09-01)

Os seis pontos de chamada de `salvarEventoComGCal` que a 6h deixou fora (criação e edição, não exclusão) passaram a checar o retorno da persistência antes de seguir. Decisões de UX do dono, implementadas ponto a ponto:

| Ponto | Onde | Reação a falha de gravação |
| --- | --- | --- |
| 1 | `modal-agendamento.js`, handler de `submit` de `formAgendamento` | Reverte (remove a aula criada), avisa por toast e reabre o formulário com os dados preenchidos. |
| 2 | `modal-acao-slot.js`, handler de `submit` de `formEditarCompromisso`, escopos sem split | Reverte para o snapshot, avisa por toast e reabre o modal de edição com os dados submetidos. |
| 3 | `modal-acao-slot.js`, handler de `submit` de `formReagendarAula` | Desfaz o `PATCH` que marcou a reposição como `agendada` (volta para `pendente` com `agendamentoReposicaoId: null`), remove o compromisso criado e avisa por toast. A tela de reagendamento nunca chega a fechar nesse caminho, então continua aberta com o dia/horário escolhidos. |
| 4 | Mesmo handler do ponto 2, ramo `escopoRecorrencia === "occurrence"` | Reverte as duas gravações, avisa e reabre o modal no mesmo escopo. |
| 5 | Mesmo handler do ponto 2, ramo `escopoRecorrencia === "fromDate"` | Idem ponto 4, no escopo `fromDate`. |
| 6 | `modal-acao-slot.js`, `window.executarEnvioParaReposicao`, ramo `!ehSerie` | Devolve a aula avulsa à agenda e avisa por toast. Sem reabrir tela. |

**Ordem de execução dos splits corrigida junto.** Nos pontos 4 e 5 as duas gravações rodavam em sequência sem `return` entre elas: se a primeira falhasse, a segunda disparava mesmo assim. Agora a segunda só roda se a primeira tiver sido confirmada.

**Gravação de compensação.** Quando a segunda gravação do split falha, a primeira já persistiu no servidor e desfazê-la só na memória não basta. O estado local é restaurado a partir do snapshot do array `aulas` e uma terceira chamada a `salvarEventoComGCal(compromissoRestaurado, { operacao: "atualizar" })` empurra esse estado restaurado para o servidor. Esse mecanismo não existia antes desta etapa — a 6h só precisava de reversão local — e foi construído aqui.

**Reposição órfã do ponto 6 — RESOLVIDO na etapa 6i-b (2026-09-01).** A versão original deste item registrava como limite conhecido o fato de que, em falha de gravação no ponto 6, a aula voltava para a agenda mas a reposição já criada permanecia pendente no servidor, apontando para uma aula que nunca saiu do lugar. Não havia como desfazê-la: a API de reposições não expunha `DELETE` e o `enum` de `status` não tinha estado de cancelamento.

A etapa 6i-b fechou esse buraco. Por decisão do dono, a reposição órfã é **apagada**, não marcada como cancelada — assim o `enum` de `status` em `backend/src/models/Reposicao.js` continua intocado, e uma reposição que a Josy nunca chegou a ver (a falha acontece no mesmo fluxo, sem tela intermediária) não tem histórico a preservar. O que foi feito:

- `DELETE /api/reposicoes/:id` novo, em `backend/src/routes/reposicaoRoutes.js`, atendido por `excluirReposicao` em `backend/src/controllers/reposicaoController.js`. Segue o mesmo contrato de `excluirAgendamento`: escopado por `ownerEmail` e **idempotente** — id inexistente responde `200` com `{ ok: true, deleted: false }`, não `404`;
- no `catch` de `window.executarEnvioParaReposicao`, ramo `!ehSerie`, a restauração do array `aulas` passou a ser seguida de um `DELETE` para a reposição criada. A variável `reposicao` foi movida para fora do `try` para que o `catch` a alcance.

**O `DELETE` é best-effort e pode falhar.** Ele fica dentro de um `try/catch` próprio que apenas registra log de erro, sem relançar. O motivo é deliberado: quando esse caminho roda, a Josy já teve a aula devolvida à tela, e travar essa recuperação por causa de uma segunda chamada de rede que pode falhar por conta própria seria pior. Consequência a assumir: **não há garantia de que a reposição órfã sempre será apagada** — se a rede cair entre as duas chamadas, ela sobrevive e precisa de tratamento manual. O toast de erro exibido não promete o contrário.

### 9.26 — Falha silenciosa de persistência no caminho com Google Calendar conectado — FECHADO (2026-09-01)

A falha silenciosa de persistência no caminho com Google Calendar conectado foi corrigida. `_persistirDadosComBackend` passou a propagar o retorno real de `salvarDados`, e os três handlers de exclusão passaram a checá-lo antes de seguir, revertendo a exclusão local em caso de falha.

A suspeita de **corrida** entre salvar e recarregar nesse caminho foi descartada, não corrigida: `_persistirDadosComBackend` já era sequencial e a recarga interna não dispara busca no servidor.

### 9.25 — Rótulo "Excluir a série toda" — FECHADO (2026-09-01)

O rótulo foi ajustado para descrever o efeito real da exclusão na cadeia, sem dizer que a série tem menos aulas do que realmente apaga. A frase agora conta o passado, que é finito e numérico, e não promete um total para o futuro, que pode ser infinito e não precisa de número. Essa escolha evita a contradição que causou o defeito: o texto passou a dizer que o apaga a série toda é **"As N aulas do passado mais todas as aulas futuras"** quando há futuro, **"Todas as aulas, a partir de hoje"** quando o futuro continua e **"As N aulas desta série, todas no passado"** quando a série já encerrou; em caso de série sem aulas restantes, o texto diz **"Nenhuma aula restante nesta série."**.

A regra de negócio do `total` continua intacta: ele continua contando registros removíveis da cadeia, porque esse valor é a guarda que impele o casco invisível que a etapa 5 corrigiu. Em outras palavras, o rótulo descreve o efeito em aulas, mas `total` continua sendo a contagem de registros que a remoção efetivamente afetará e, por isso, continua protegendo a condição de `if (_resumoExclusao.total === 0)`.

## 10. Custo aceito da decisão

A escolha por `RRULE` não é gratuita. O guia de eventos recorrentes da Google explica que,
para alterar uma única instância, a aplicação precisa buscar a instância e atualizá-la; para
alterar a série a partir de um ponto, o padrão é aparar a série original com `UNTIL` antes da
instância alvo e criar uma nova série. A referência é
`https://developers.google.com/workspace/calendar/api/guides/recurringevents`.

Hoje isso é aceitável porque o app tem o fluxo de "editar série a partir daqui" no escopo
`fromDate` ("editar esta e as futuras"), além do cancelamento de ocorrência com `EXDATE`.
O padrão recomendado pela Google continua sendo aparar a série original com `UNTIL` antes da
instância alvo e criar uma nova série; o caso degenerado de split na primeira ocorrência foi
tratado no item 9.15, e a decisão de produto está registrada lá. A chamada de reabertura da
decisão foi atendida nas rodadas E, F e H.

---

## 11. Ordem sugerida de correção

Os itens da Rodada C já foram resolvidos e saem do backlog desta spec. O que permanece hoje
é apenas o que ainda exige trabalho real ou observação de custos/escala:

   1. **9.14** — gatilho triplo de sincronização no boot. É o único item funcional realmente
      pendente, e corresponde ao item **2.2** do `docs/roadmap.md`.
   2. **9.8** — cobertura parcial de I/O real. Continuamos com validação parcial e não com
      garantia de regra de negócio, porque depende de ambiente/Google e da execução real do
      fluxo externo.
   3. **9.15, sub-item de backend** — só entra aqui se a rodada G deixar esse sub-item em aberto
      após a verificação do frontend. A correção entregue hoje é a do caminho do app, com teste
      de mutação e cobertura do split.
   4. **9.13** — observação de payload/volume de leitura; fica como alerta de escala, não como
      pendência funcional.

   Os itens **9.1–9.7, 9.9–9.12 e 9.16** saíram do backlog porque a §9 já os marcou como
   resolvidos (ou, no caso do 9.8, como parcialmente resolvido) e a tabela 9.17 registra o
   histórico correspondente. A ordem de correção não reabre itens que já encerraram na §9.
