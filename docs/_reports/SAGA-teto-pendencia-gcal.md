# Saga — Teto de pendência de sincronização com o Google

> Consolida 3 rodadas: `2026-08-29-fix-teto-pendencia-gcal`,
> `2026-08-29-fix-select-teto-e-spec-gcal`, `2026-08-29-fix-global-e-mock-teto-gcal`.
> Os relatórios originais foram removidos na poda de 2026-09-03.
> Estado normativo atual: `docs/specs/gcal-sync.md` §9.4.

## Causa-raiz — um deadlock permanente

O bloqueio por estado terminal estava no **frontend**, e travava a persistência **local**, que
é independente do Google.

O encadeamento:

1. Quando o Google falha, o frontend limpa os campos de pendência da cópia **local**, mas os
   preserva na cópia **remota**. Essa assimetria é proposital: é ela que faz a comparação
   detectar trabalho pendente e emitir um `PUT`.
2. Chegando no `PUT`, `_agendamentoEmEstadoTerminal` via `gcalSyncPendingTentativas >= 5` e
   dava `continue`.
3. Uma alteração real — `09:00` para `15:00` — **nunca chegava ao `PUT`**.
4. A tela e o `localStorage` aceitavam a mudança; o Mongo mantinha o valor antigo.
5. Na próxima carga remota, o valor antigo sobrescrevia o estado local.
6. O contador só zerava depois de um sync bem-sucedido, e o sync dependia do `PUT` chegar.
   **Deadlock permanente, com perda silenciosa da edição.**

## Linha do tempo

**Rodada A — mover o teto para o backend.** Removidos `_agendamentoEmEstadoTerminal` e a
verificação que provocava `continue` em `assets/js/storage.js`, **preservando a assimetria
local/remoto**. O teto passou para `backend/src/controllers/agendamentoController.js`: grava no
Mongo sempre, e pula a chamada ao Google se o documento já estava com 5 tentativas.

*Problema*: a prova foi declarada sem mutações coladas, e o mock do teste era placebo — nunca
exercitava o ramo de projeção.

**Rodada B — projeção e contrato de resposta.** `atualizarAgendamento` passou a buscar o
**documento completo**, sem projeção, porque precisa ler `gcalSyncPendingTentativas` e comparar
o payload contra o persistido. `criarAgendamento` mantém a projeção de `googleCalendarEventId`,
que é tudo de que precisa. A resposta ganhou `gcalSyncPausado: true`. A spec foi corrigida:
dizia `502`, o código responde `200`.

**Rodada C — vazamento global.** `agendamentoAtual` estava sem declaração no bloco de
`montarRespostaFalhaGcal`. Em arquivo sem `'use strict'`, vazava para `globalThis`. Declarada
com `let`. Mock reescrito para honrar o contrato real do Mongoose. Teste de regressão: após
falha do Google, `globalThis.agendamentoAtual` deve continuar `undefined`. Suíte final: 112.

## Como funciona hoje

**Duas pernas independentes.**

- **Mongo — sempre.** O controller grava com `findOneAndUpdate`, sem considerar o teto como
  condição de persistência.
- **Google — com teto.** Depois de gravar, verifica se o documento já estava com 5 tentativas.
  Se sim, **pula** a chamada ao Google nessa requisição.

**Reabertura por edição real.** Documento terminal + payload que diverge do persistido → grava
com `gcalSyncPendingTentativas: 0`. No ciclo seguinte, o Google volta a ser tentado.

**Contrato de resposta**, ambos com HTTP 200:

| Flag | Significado |
|---|---|
| `gcalSyncFailed` + `partialSuccess` | Falha transitória do Google; o Mongo gravou |
| `gcalSyncPausado` | Estado terminal; o Google foi deliberadamente pulado e o contador foi reaberto |

## Decisões deliberadas

- **O teto afeta só o Google, nunca o Mongo.** Garantia de persistência local é incompatível
  com bloqueio por estado de serviço externo.
- **Reabertura por edição real, não espontânea.** Separa "o Google está fora do ar" de "a
  usuária quer fazer algo novo".
- **`gcalSyncPausado` é distinto de `gcalSyncFailed`.** "Não foi tentado" e "não respondeu" são
  estados diferentes e o frontend precisa poder distingui-los.
- **A assimetria entre `listaLocal` e `listaRemota` foi preservada de propósito.** Só a local
  perde os campos de pendência. É o gatilho do reenvio — não "corrija" isso.

## Limites herdados

- **`PUT` recorrente em item terminal sem edição real.** Como a assimetria é proposital, um
  item terminal continua gerando `PUT` a cada ciclo. O backend grava no Mongo e não chama o
  Google. É custo de escrita aceito em troca de nunca bloquear a persistência.
- **Não há UI para `gcalSyncPausado`.** O contrato existe; o consumo no frontend é pendência.
  A usuária não sabe que a sincronização daquele item está parada.
- **Detecção de edição por igualdade estrita** após a normalização existente. Payload futuro
  com tipos inconsistentes reabre a janela por diferença de tipo.
- **Backend sem `'use strict'` e sem lint de variável não declarada.** A proposta foi levantada
  na rodada C e **não implementada** — exigiria auditoria do código legado sem cobertura.
