# Spec — Sincronização com Google Calendar

> **Status**: Em produção · **Versão**: 13 · **Atualizado**: 2026-10-14
> **Consolidação documental**: contrato e limites preservados; relatos de execução e medições não são requisitos vigentes.
> **Pendência funcional conhecida**: coordenação dos gatilhos do boot (9.14).
> **Limite de evidência**: cobertura parcial de I/O real (9.8); o gatilho automático de renovação não foi observado isoladamente. Esta edição não é nova validação de produção.
>
> **Relação com outras specs**: `docs/specs/reposicoes-e-competencia.md` define a
> semântica de exceção de série, que esta spec precisa refletir no Google.
> `docs/specs/financas-ciclo-cobranca.md` não é afetada — o Google não participa de
> nenhum cálculo financeiro.

---

## 1. Objetivo e fronteira

Sincronizar os agendamentos criados no app com o Google Calendar, publicando séries como
evento pai recorrente, e ler eventos externos como bloqueios sem alterar a fonte de
verdade de cada item. Esta spec define propriedade, escrita/leitura, exceções, falhas
e limites aceitos; não é uma lista de correções a executar.

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
negócio a se manter em sync. `COUNT` encerra o conjunto de recorrência, não representa
um pacote comercial de aulas, conforme a decisão preservada em 9.11.

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
  implementada em `contarOcorrenciasAteData` (`backend/shared/recurrence-helpers.js`) de
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
em `backend/shared/recurrence-helpers.js` e do serializador em
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
`backend/shared/recurrence-helpers.js:12` e `window.getNomesDiasSemana` em
`assets/js/utils-datetime.js:26-28`. O mapa é: `Domingo, Segunda, Terça, Quarta, Quinta,
Sexta, Sábado`, que correspondem aos códigos RFC `SU, MO, TU, WE, TH, FR, SA`.

Pontos em que o engine local já coincide com a RFC e não precisam de trabalho:

- A semana é deslocada para segunda-feira em `resolverCompromissoRecorrenteNaData`
  (`backend/shared/recurrence-helpers.js:65-74`), equivalente ao `WKST=MO` default da RFC.
- No caso mensal por dia do mês, o motor exige `dataRef.getDate() === dataCriacao.getDate()`
  (`backend/shared/recurrence-helpers.js:77-85`), o que reproduce o comportamento de
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
- **Boot**: `assets/js/app-shell/bootstrap.js` dispara `renovarCanalGoogleCalendar()` logo após a navegação inicial, com guarda `gcalWatchCheckDisparado` e `setTimeout(..., 0)`. A navegação inicial é `router.navigateTo(router.getTelaInicial())` — desde a Etapa 7 a tela vem da URL (`#tela-home` por padrão), não de um literal fixo.
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

A verificação do canal no boot está ancorada em `assets/js/app-shell/bootstrap.js`, logo após a
 navegação inicial, protegida por `gcalWatchCheckDisparado` e disparada com
 `setTimeout(..., 0)` para não bloquear o primeiro render. A navegação inicial é
 `router.navigateTo(router.getTelaInicial())`: desde a Etapa 7 a tela vem da URL
 (`#tela-home` por padrão), então o trecho não depende de um literal fixo. Ela roda uma vez por
 carga de página. Nenhum dos três `carregarDados` existentes dispara a renovação; o gatilho do
 boot é independente do ciclo de sincronização normal.

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

## 9. Contratos complementares e limites conhecidos

A numeração existente foi preservada para as referências entre specs. Esta seção não
define prioridade de execução nem usa medições históricas como evidência atual.

### 9.1 Identificador da série recorrente

`googleCalendarEventId` identifica o evento pai publicado com `RRULE`. Não manter mapa
local de um id do Google por data nem horizonte de publicação para expandir a série.

### 9.2 Leitura e propriedade dos eventos

Classificar a propriedade antes de tratar cancelamento. Leitura de evento criado pelo
app não apaga ou altera o agendamento local. Cancelamento de evento externo pode remover
seu `BloqueioExterno`, nunca um dado do app.

### 9.3 Exceções da série

As exceções do modelo se refletem em `EXDATE` e/ou cancelamento de instância do evento
pai, conforme 2.4 e 9.12. Não publicar um evento independente por ocorrência cancelada.

### 9.4 Persistência confirmada e falha do Google

Falha externa do Google não desfaz gravação confirmada no Mongo. A API responde HTTP 200
com `partialSuccess: true` e `gcalSyncFailed: true`, mantendo o agendamento no corpo.
Persistência e sincronização são estados distintos; não tratar esse aviso como rejeição
da gravação nem bloquear o gate de reposição por ele.

### 9.5 Horário que atravessa meia-noite

Quando o horário final é anterior ao inicial, `end.dateTime` usa o dia seguinte. O horário
default pode continuar no formato de hora, mas a data final do evento precisa refletir
a virada do dia.

### 9.6 Comparação de objetos

O diff normaliza a ordem das chaves dos objetos, sem reordenar arrays. Não disparar
gravação apenas por diferença de ordem das propriedades.

### 9.7 Cancelamentos no full e incremental

Full sync com `showDeleted=false` não recebe cancelados; o caminho de cancelamento pertence
à leitura incremental. Essa assimetria é informativa, não pendência de implementação.

### 9.8 Limite de evidência de I/O real

Testes de montagem/classificação não comprovam `persistSyncResults` de ponta a ponta nem
`listCalendarEvents` em incremental/full com Google real. A cobertura desse I/O permanece
parcial. Não apresentar uma contagem antiga de suíte como medição atual ou validação da
integração remota; esta consolidação não executou I/O real.

### 9.9 Fronteira da ponte frontend

`google-calendar.js` é ponte para persistência/backend, não um importador direto da API do
Google. O nome `salvarEventoComGCal` não comprova que a chamada publique um evento específico;
partir da cadeia de execução definida em 3.1–3.2.

### 9.10 Unicidade da conexão

`ownerEmail` mantém o índice único de `GoogleCalendarConnection`; não duplicar uma declaração
de índice comum sobre o mesmo campo.

### 9.11 Semântica de COUNT e EXDATE

`COUNT` encerra a recorrência após N eventos, não representa pacote comercial de aulas.
`EXDATE` é aplicado depois da expansão: a ocorrência cancelada continua consumindo a vaga
do `COUNT`. O motor compartilhado continua afetando a contagem financeira; não alterar
essa regra como se fosse apenas uma preferência de publicação no Google.

### 9.12 Exceção de evento com horário

`EXDATE` precisa corresponder ao `DTSTART`, incluindo horário e `TZID` quando aplicáveis.
Uma data sem essa informação não é substituto seguro para evento cronometrado. Preservar
a conversão de exceções, não escolher outra fonte/semântica de dados nesta consolidação.

### 9.13 Custo de leitura aceito

`singleEvents=true` traz instâncias expandidas e aumenta o payload. A classificação por
propriedade continua aplicável; o volume é observação de custo/escala, não um bug funcional
nem autorização para otimização preventiva.

### 9.14 Coordenação dos gatilhos do boot — PENDENTE

Boot, auth-change e retorno à aba têm gatilhos de leitura/renovação. Sua consolidação
permanece no item 2.2 do roadmap, sem refazer a leitura segura de B2. A cadeia de renovação
teve validação histórica por ação manual; o disparo automático no boot não foi observado
isoladamente e não ganha nova certificação por esta edição.

### 9.15 Corte de série sem ocorrência restante

Quando o aparo não deixa ocorrência real, remover a série original do app e do Google;
não converter o registro vazio em avulsa. A avaliação usa ocorrências reais, não só uma
comparação entre datas. Preservar a captura do fim original antes do corte e sua herança
na nova série quando aplicável, inclusive término por contagem convertido em `untilDate`;
série originalmente infinita não ganha fim por inferência.

Um caminho de backend que gere o mesmo problema fora do fluxo do app exige investigação
própria. O risco dessa via não é declarado encerrado nesta consolidação.

### 9.16 Representação de dia da semana

A normalização aceita os formatos definidos pelo mapeamento existente, incluindo formas
sem acento, abreviadas e numéricas; descartar valor inválido deve ser observável por log.
Não mudar a expansão de recorrência para corrigir apenas representação textual.

### 9.17 Exclusão da série toda

A ação considera a cadeia completa até a raiz e preserva reposições. Confirmação, período
anunciado e remoção usam os mesmos membros. `sem data de término` só descreve uma série
recorrente removível realmente sem fim; avulsa e reposição não definem esse limite.

O resolver de descendentes para continuar em outra série mantém seu escopo próprio;
não confundir continuação com exclusão full-chain.

### 9.18 Aparo daqui para frente

Considerar a família descendente da série selecionada e as avulsas do mesmo ramo; não
subir ao ancestral nem tocar membro encerrado antes do corte. Série que atravessa o corte
é aparada até o dia anterior; avulsa do ramo a partir do corte é removida, salvo reposição.
Reposições e histórico anterior permanecem preservados.

### 9.19 Ações destrutivas e confirmação

As opções de exclusão têm despacho próprio por escopo, sem simular clique em botão
removido. A confirmação final nativa permanece como limite de UX; substituir esse fluxo
exige decisão específica, não é consequência da organização da documentação.

### 9.20 Envio para reposição

Há uma entrada de negócio para o envio. Aula avulsa sai do array; ocorrência de série
ganha exceção apenas na data alvo. A guarda de aluno inativo precede mutação. No caminho
de série, a reposição remota é criada antes da marcação/persistência da exceção; sucesso
só é anunciado após confirmação, sem confundir criação da reposição com gravação da agenda.

O registro de exceção local não garante desfazer uma reposição remota criada. O limite de
rollback desse caminho continua explícito e não foi corrigido por migração documental.

### 9.21 Confirmação de exclusão e falha parcial

Exclusão destrutiva exige aguardar e verificar o resultado da gravação; não anunciar
sucesso local antes do servidor nem recarregar como se a operação tivesse confirmado.
Falha parcial/desconhecida usa a política de recuperação de Finanças §6.1.3 e Reposições
§11.2: conservar pendência e intenção, sem replay geral ou compensação remota cega.

### 9.22 Evidência histórica não é contrato atual

Consultas de banco, resultados de suíte e sequência de rodadas anteriores não comprovam
a ausência de dado legado ou a conclusão de cada risco na base atual. Esta spec não
autoriza limpeza de banco nem registra uma nova operação de produção.

### 9.23 Limites que não foram encerrados

Agrupamento de cadeia na interface, espera perceptível após exclusão e identificação
redundante de ações no DOM são recortes de UX/implementação a reavaliar quando houver
frente autorizada. Não duplicar uma fila de prioridades aqui nem deduzir seu estado apenas
pelo relato de uma correção passada.

### 9.25 Rótulo de exclusão da série toda

Descrever aulas passadas e futuras sem prometer número finito para futuro infinito:
`As N aulas do passado mais todas as aulas futuras`, `Todas as aulas, a partir de hoje`,
`As N aulas desta série, todas no passado` ou `Nenhuma aula restante nesta série`, conforme
o caso. `total` continua contando registros removíveis e protegendo a condição de cadeia
sem membro restante; não substituir esse valor pela redação exibida.

### 9.26 Propagação do resultado da ponte

A ponte propaga o resultado real de persistência; o chamador o verifica antes de avançar.
A descrição de um save como sequencial não equivale a garantia de sucesso. Não reintroduzir
diagnóstico de corrida já descartado sem evidência nova da base examinada.

### 9.27 Operações compostas e recuperação explícita

Etapas de criação, edição, split, reagendamento e envio conferem o resultado da persistência
antes de seguir. No split, uma segunda gravação depende da confirmação da primeira.
No reagendamento, a gravação inicial precede o PATCH; uma confirmação adicional pela ponte
pode ocorrer depois dele. Falha posterior não implica que o PATCH nunca aconteceu.

Resultado parcial/desconhecido conserva pendência para recuperação explícita; não fazer
replay geral ou anunciar compensação remota automática como contrato vigente. Reações
antigas de rollback por ponto não substituem essa política confirmada pelo dono.

O contrato existente de limpeza de reposição órfã usa `DELETE /api/reposicoes/:id`, filtrado
por `ownerEmail`, idempotente: id ausente pode responder 200 com `{ ok: true, deleted: false }`.
Quando usado no caminho previsto, o DELETE é best-effort e pode falhar; nunca prometer que
a órfã foi apagada sem confirmação nem estender essa limpeza a qualquer falha composta.

## 10. Custo aceito da decisão

A escolha por `RRULE` não é gratuita. O guia de eventos recorrentes da Google explica que,
para alterar uma única instância, a aplicação precisa buscar a instância e atualizá-la; para
alterar a série a partir de um ponto, o padrão é aparar a série original com `UNTIL` antes da
instância alvo e criar uma nova série. A referência é
`https://developers.google.com/workspace/calendar/api/guides/recurringevents`.

Hoje isso é aceitável porque o app tem o fluxo de "editar série a partir daqui" no escopo
`fromDate` ("editar esta e as futuras"), além do cancelamento de ocorrência com `EXDATE`.
O padrão recomendado pela Google continua sendo aparar a série original com `UNTIL` antes da
instância alvo e criar uma nova série; o caso degenerado de split na primeira ocorrência
segue o contrato 9.15. O custo de lidar com instância concreta e aparo é aceito; não
reintroduzir horizonte de publicação para evitá-lo.

---

## 11. Evolução e limites de validação

Prioridade e frente de execução pertencem ao roadmap oficial, especialmente o item 2.2.
Cobertura de I/O (9.8), investigação eventual de outra via de split (9.15) e observação de
payload (9.13) conservam seus limites; não são declarações de correção ou autorização para
mudar produto. Validação remota, decisão de intervenção e execução devem ser registradas
na frente correspondente, sem reintroduzir aqui uma saga ou contador de testes.
