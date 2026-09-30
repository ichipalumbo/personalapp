# Saga — Renovação do canal de webhook do Google Calendar

> Consolida 5 rodadas: `2026-08-25-gcal-watch-purge`, `2026-08-25-gcal-watch-renovacao`,
> `2026-08-25-gcal-watch-boot`, `2026-08-26-doc-sync-gcal-watch`,
> `2026-08-26-gcal-watch-log-falha`.
> Os relatórios originais foram removidos na poda de 2026-09-03.
> Estado normativo atual: `docs/specs/gcal-sync.md` §9.14.

## Causa-raiz

O canal de notificação do Google Calendar expira. Sem renovação ativa, o app simplesmente
para de receber notificação de mudança na agenda remota — sem erro, sem sintoma visível.
Somaram-se a isso: purge de full sync apagando registro legítimo fora da janela consultada,
disparo múltiplo da verificação no boot, e falha de renovação que voltava `HTTP 200` e não
gerava nenhum aviso.

## Linha do tempo

| # | Rodada | Problema | Correção |
|---|---|---|---|
| 1 | `gcal-watch-purge` | O purge do full sync apagava bloqueio fora da janela consultada | `persistSyncResults` passou a validar a janela com `isBloqueioDentroDaJanela(...)` antes de deletar. Se `timeMin`/`timeMax` estiverem ausentes ou inválidos, faz `return` defensivo e **não apaga nada** |
| 2 | `gcal-watch-renovacao` | Canal expirava sem renovação | `shouldRenewWebhookChannel` renova se a expiração for nula, inválida, vencida ou estiver a menos de 24h. `renewWebhookChannelForOwner` é idempotente, com single-flight por `ownerEmail` via `Map`. Falha no `channels.stop` do canal antigo emite `warn` e segue. Após renovar, dispara `syncConnection` imediato |
| 3 | `gcal-watch-boot` | A verificação podia disparar 3× por reload, via os 3 pontos de `carregarDados` | Chamada centralizada em `dispararVerificacaoCanalGCal()`, com guarda `gcalWatchCheckDisparado`, ancorada em `bootstrap.js` depois da navegação inicial. Sem sessão Google, retorna em silêncio. Botão manual `btnRenewGoogleCalendarWatch` adicionado como escape hatch |
| 4 | `doc-sync-gcal-watch` | Spec e roadmap não descreviam o comportamento real | Documentação de janela de 24h, single-flight, purge defensivo e gatilho de boot |
| 5 | `gcal-watch-log-falha` | `renewed: false` com `reason` diferente de `channel_valid` passava sem aviso | `_verificarCanalGoogleCalendar` ganhou ramo final que emite `window.log.warn`, incluindo `error` quando presente |

**Arquivos**: `backend/src/services/gcalSyncService.js`,
`backend/src/controllers/gcalAuthController.js`, `assets/js/app/bootstrap.js`,
`assets/js/google-calendar.js`, `assets/js/settings-modal.js`, `index.html`.

## Contrato da rota

`POST /api/gcal/webhook/renew` responde com `renewed`, `synced`, `activeItems`,
`cancelledItems`, `reason` e `message`.

O frontend distingue três níveis de log a partir dessa resposta:

| Condição | Nível |
|---|---|
| `renewed === true` | `info` |
| `renewed === false` e `reason === 'channel_valid'` | `debug` |
| `renewed === false` e `reason !== 'channel_valid'` | `warn` |

## Decisões deliberadas

- **Estender a rota existente em vez de criar uma paralela** — reusa `requireAuth` e o escopo
  por `ownerEmail`, evitando drift entre rotas de autenticação.
- **Ancorar no `bootstrap.js`, não dentro de `carregarDados`** — é o que impede o disparo
  triplo. A guarda `gcalWatchCheckDisparado` tem prova por mutação: removê-la faz teste falhar.
- **Single-flight por `Map`** — duas abas do mesmo dono não registram dois canais no Google.
- **`channels.stop` é defensivo** — falhar ao encerrar o canal antigo não pode impedir o
  registro do novo.
- **Sync imediato após renovar** — resgata o que passou enquanto o canal estava morto.
- **Purge nunca apaga sem janela válida** — a escolha é preservar dado a mais, não a menos.

## Limites herdados

- **O disparo triplo de `carregarDados` continua existindo.** O que foi resolvido é a
  verificação do canal, que hoje roda uma vez. As três chamadas de carga seguem lá — é o item
  9.14 da spec e o 2.2 do roadmap.
- **A janela do full sync é fixa.** Alargar exige mudança de código (item 2.3 do roadmap).
- **Nada disso tem teste de frontend.** O boot e o botão manual são validados só à mão.
- **Estado remoto não volta com `git revert`.** Canal registrado no Google é externo ao
  repositório.
