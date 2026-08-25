# Spec — Sincronização com Google Calendar

> **Status**: engenharia reversa do código em `main` (2026-08-25). Esta v1 descreve o
> comportamento **atual**, não o desejado. A seção 9 lista as divergências entre o
> comportamento atual e o modelo pretendido (seção 2), e é o backlog desta feature.
>
> **Versão**: 1 · **Atualizado**: 2026-08-25
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

### 5.3 Persistência

`persistSyncResults`, para cada evento ativo:

1. Se `status === 'cancelled'` → `deleteBloqueio` **e `deleteAgendamento`**.
2. Se `isAppOwnedEvent(event)` → `continue` (ignora).
3. Senão → `upsertBloqueio`.

Depois, para cada evento na lista de cancelados, repete o passo 1.

No modo full, há uma reconciliação final: `BloqueioExterno` local que não apareceu na
listagem remota é apagado.

**A ordem dos passos 1 e 2 é o bug 9.2.**

### 5.4 `BloqueioExterno`

Collection separada, com índice único `(ownerEmail, googleCalendarEventId)` e
`source: 'google_external'`. O comentário no model explica a escolha: manter fora de
`agendamentos` para que sync destrutivo de agendamentos nunca apague evento externo.

Guarda `titulo`, `data`, `horarioInicio`, `horarioFim`, `fullDay`, `semanaISO`.

---

## 6. Falha de sincronização

`montarRespostaFalhaGcal` responde **HTTP 502** com `partialSuccess: true` e o
agendamento no corpo. Ou seja: o dado **foi gravado no Mongo**, mas a resposta é de erro.

Consequência a jusante: `salvarDados` vê `!resposta.ok` e trata como falha de
persistência. Ver 9.4.

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
| 11  | Falha do Google reverte a gravação?   | **Não.** Grava no Mongo e responde 502 com `partialSuccess` |

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

**É o item que destrava todos os outros.** Sem o mapa de ids, 9.3 e 2.4 não têm como ser
implementados.

### 9.2 Sync de entrada apaga agendamento do app — CRÍTICO (latente)

`persistSyncResults` testa `status === 'cancelled'` **antes** de `isAppOwnedEvent`, e
chama `deleteAgendamento(ownerEmail, event.id)`. Evento do app cancelado dentro do Google
**apaga o agendamento no app**.

Viola diretamente 2.1: leitura nunca deveria alterar dado do app.

Hoje o dano é limitado por acidente — um id por série, e o match é por
`googleCalendarEventId`. Depois de 9.1, com N ids por série, cancelar **uma** ocorrência no
Google pode derrubar o documento da série inteira.

**Correção**: mover o teste de propriedade para antes do teste de cancelamento, e nunca
chamar `deleteAgendamento` a partir do fluxo de leitura. Isso vale para os dois laços.

### 9.3 `excecoes` não propagam para o Google — ALTO

Adicionar data em `excecoes` altera o documento, o que dispara `PUT` e
`updateEventInGoogle` — mas `montarEventoGoogle` ignora `excecoes`. O evento no Google
continua existindo.

Efeito prático: **aula cancelada ou enviada para reposição continua no Google**. É a
violação de 2.4. Depende de 9.1.

### 9.4 Falha do Google mascarada como falha de persistência — MÉDIO

O 502 com `partialSuccess: true` (seção 6) faz `salvarDados` retornar
`{ ok: false, motivo: 'falha_remota' }` mesmo com o dado **gravado**.

Interage com o contrato criado no C4.1a-fix: o fluxo de reposição usa `{ ok }` como
autorização para o `PATCH`. Então uma indisponibilidade do Google pode abortar o PATCH de
uma reposição que já foi persistida, deixando o estado pela metade.

**Correção**: distinguir "falha de persistência" de "falha de sync externo". O 502 com
`partialSuccess: true` deveria ser tratado como sucesso de gravação com aviso.

### 9.5 `horarioFim` default cruzando meia-noite — BAIXO

O default de `+60min` usa `% 24`. Aula às `23:30` gera fim `00:30` **no mesmo dia** —
evento com fim antes do início. Não há rollover de data.

### 9.6 Diff sensível à ordem das chaves — BAIXO

`_agendamentosSaoIguais` compara `JSON.stringify` sem ordenar chaves. Se a ordem no objeto
local diferir da que vem do Mongo, todo agendamento é considerado alterado e leva `PUT` a
cada save — e cada `PUT` é uma chamada ao Google. Também dispara logo após uma criação, se
o objeto local ainda não tem o `googleCalendarEventId` que o remoto já tem.

Não corrompe dado; consome quota e latência.

### 9.7 Teste de cancelamento inalcançável no modo full — INFORMATIVO

O full sync pede `showDeleted=false`, então o laço de ativos nunca vê
`status === 'cancelled'`. Só o incremental traz cancelados. O ramo é código morto em
metade dos caminhos — e no outro metade é o bug 9.2.

### 9.8 Sem cobertura de teste — MÉDIO

Nenhum dos 48 testes toca GCal. `montarEventoGoogle`, `montarTituloEvento`,
`resolverDataISO`, `mapEventToBloqueio` e `getHorarioPadraoFim` são funções puras e
testáveis sem rede — inclusive 9.5, que é um teste de três linhas.

### 9.9 Documentação desatualizada — INFORMATIVO

- `README.md:256` descreve `google-calendar.js` como "importa eventos externos e
  sincroniza agendamentos locais". O arquivo hoje é uma ponte que não chama o Google.
- `README.md:339` e `.github/copilot-instructions.md` seção 5 afirmam que **não há testes
  no projeto**. Há 48, com `node --test`. É a afirmação mais perigosa das duas, porque
  instrui agentes a não rodar a suíte.
- `salvarEventoComGCal` tem nome que descreve o que ela não faz (3.1).

---

## 10. Ordem sugerida de correção

1. **9.2** — pequeno, cirúrgico, e evita perda de dado. Independe de tudo.
2. **9.4** — pequeno, e destrava o gate de persistência da reposição.
3. **9.5** e **9.6** — pequenos, oportunistas.
4. **9.8** — testes das funções puras, antes de mexer em 9.1.
5. **9.1** — mudança de schema + expansão + horizonte. É o projeto grande.
6. **9.3** — sai quase de graça depois de 9.1.
7. **9.9** — junto de qualquer uma das anteriores.

Os itens 1 a 4 não tocam o modelo de dados e podem ir em uma rodada só. O item 5 merece
prompt próprio, com decisão de horizonte tomada antes.
