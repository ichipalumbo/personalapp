# Relatorio — teto de pendencia do Google Calendar

**Data:** 2026-08-29  
**Branch:** `fix/duplicata-edicao-serie-gcal`  
**Ambiente:** Windows 11 / PowerShell, em `E:\Projetos\GIT\personalapp`

## 1. Portao de base

O primeiro portao encontrou a working tree limpa porque o dono havia commitado as
alteracoes das rodadas anteriores para facilitar a continuacao. O dono autorizou
explicitamente seguir com essa nova base commitada. Nenhuma operacao Git que altera estado
foi executada nesta rodada.

### `git status --short` — saida literal

```text
```

O comando nao produziu saida.

### `npm test` — saida literal

```text
> personal-api@1.0.0 test
> node --test

✔ calcularAulasContadasDoCiclo: agendamento com reposicaoId não entra na parcela (A) (0.9357ms)
✔ calcularAulasContadasDoCiclo: reposição cobrável pendente conta na parcela (B) (0.3404ms)
✔ calcularAulasContadasDoCiclo: reposição não cobrável só conta quando cicloCobrancaResolvido.inicio bate (0.1842ms)
✔ montarExtratoDoCiclo: ciclo simples fecha com valorTotalCiclo (14.8472ms)
✔ montarExtratoDoCiclo: ciclo com ajuste manual negativo fecha com valorTotalCiclo (0.4605ms)
✔ montarExtratoDoCiclo: reposição cobrável de origem fecha com valorTotalCiclo (0.259ms)
✔ montarExtratoDoCiclo: cobrável expirada com dataOriginal e validoAte no mesmo ciclo gera uma única linha (0.204ms)
✔ montarExtratoDoCiclo: reposição já cobrada gera linha zero sem inflar o total (0.4816ms)
✔ montarExtratoDoCiclo: reposição não cobrável fora do ciclo traz nota de ciclo anterior (0.2497ms)
✔ calcularCicloVigente ajusta dia 31 em mês curto (1.7022ms)
✔ calcularCicloVigente cruza o fim de ano corretamente (0.2417ms)
✔ calcularCicloVigente usa fechamentoMesCheio em vez de diaVencimento (0.1899ms)
✔ calcularTotalAulasCobradas respeita piso zero para ajuste negativo (0.1348ms)
✔ calcularValorTotalCiclo ignora contagem quando metodoCobranca == valor_fixo (0.167ms)
✔ filtrarHistoricoExcluindoCicloAtual remove o ciclo vigente e preserva ciclos anteriores (0.4869ms)
✔ encerrarCicloSobrepostoSeNecessario fecha o ciclo anterior antes do início do novo ciclo (0.2542ms)
[GcalSync] Evento do Google Calendar existente foi encontrado cancelado; tratamos como falha para reprocessamento. {
  ownerEmail: 'joao@example.com',
  googleCalendarEventId: 'appbcde4fac243d865502d21edc2708c43ecc1aa33f20fef26d210e2ed55532d9e1',
  status: 'cancelled'
}
[AgendamentoController] Falha ao sincronizar com Google Calendar durante atualizar: timeout no Google
[AgendamentoController] Stack GCal: Error: timeout no Google
    at gcalSyncService.updateEventInGoogle (E:\Projetos\GIT\personalapp\backend\test\gcal-duplicata-fix.test.js:320:21)
    at atualizarAgendamento (E:\Projetos\GIT\personalapp\backend\src\controllers\agendamentoController.js:401:31)
    at async TestContext.<anonymous> (E:\Projetos\GIT\personalapp\backend\test\gcal-duplicata-fix.test.js:344:5)
    at async Test.run (node:internal/test_runner/test:1332:7)
    at async Test.processPendingSubtests (node:internal/test_runner/test:911:7)
✔ pushEventToGoogle usa id deterministico e trata 409 como sucesso idempotente (2.6001ms)
✔ atualizarAgendamento com googleCalendarEventId existente usa updateEventInGoogle (3.0073ms)
✔ pushEventToGoogle rejeita evento cancelado do Google como falha, nao como sucesso (0.993ms)
✔ atualizarAgendamento grava marca de pendencia quando a chamada ao Google falha (1.1226ms)
[AgendamentoController] Falha ao persistir marca de pendencia do Google Calendar. Respondendo 200 mesmo assim. {
  contexto: 'atualizar',
  agendamentoId: 'ag-falha-persistencia-1',
  ownerEmail: 'joao@example.com',
  error: 'mongo falhou'
}
[AgendamentoController] Falha ao sincronizar com Google Calendar durante atualizar: Operation `googlecalendarconnections.findOne()` buffering timed out after 10000ms
[AgendamentoController] Stack GCal: MongooseError: Operation `googlecalendarconnections.findOne()` buffering timed out after 10000ms
    at Timeout.<anonymous> (E:\Projetos\GIT\personalapp\backend\node_modules\mongoose\lib\drivers\node-mongodb-native\collection.js:187:23)
    at listOnTimeout (node:internal/timers:605:17)
    at process.processTimers (node:internal/timers:541:7)
✔ atualizarAgendamento preserva 200 mesmo quando a persistencia da marca falha (10011.9934ms)
✖ atualizarAgendamento limpa marca de pendencia quando o Google responde com sucesso (1.4302ms)
✔ portao 2.0: campo novo atravessa PUT e GET, strict false persiste e ausencia no corpo nao faz unset (0.5068ms)
✔ storage remove gcalSyncPendingAt da carga remota para evitar deadlock no estado local (10.7318ms)
✔ storage mescla googleCalendarEventId local apos POST do agendamento (1.1938ms)
✔ storage para de reemitir PUT quando a pendencia atinge o teto de tentativas (1.1061ms)
✔ convergencia: apos limpar a pendencia, sync seguinte nao reemite PUT adicional (1.129ms)
✔ cenario completo da duplicata: falha no PUT da serie marca pendencia e o sync seguinte reemite a serie (1.131ms)
[GCalSync] Ignorando recorrência porque DTSTART alinhado ultrapassa o UNTIL. {
  agendamentoId: 'ag-monthofdate-cruza-mes',
  dataBase: '2026-08-31',
  dataInicioAlinhada: '2026-09-06',
  until: '20260831T235959Z',
  motivo: 'DTSTART alinhado após UNTIL do mês'
}
[GCalSync] Ignorando recorrência porque DTSTART alinhado ultrapassa o UNTIL. {
  agendamentoId: 'ag-untildate-ultrapassa',
  dataBase: '2026-08-31',
  dataInicioAlinhada: '2026-09-06',
  until: '20260902T235959Z',
  motivo: 'DTSTART alinhado após UNTIL'
}
[GcalWebhookDiag] Preparando listagem de eventos para sincronizacao. { ownerEmail: 'joao@example.com', syncMode: 'full', syncToken: null }
[GcalWebhookDiag] Persistindo resultados de sincronizacao. { ownerEmail: 'joao@example.com', activeEvents: 2, cancelledItems: 1 }
[GcalWebhookDiag] Upsert de evento externo no bloqueio. { ownerEmail: 'joao@example.com', eventId: 'evt-1', summary: null }
[GcalWebhookDiag] Upsert de evento externo no bloqueio. { ownerEmail: 'joao@example.com', eventId: 'evt-2', summary: null }
[GcalWebhookDiag] Evento cancelado recebido; removendo localmente. { ownerEmail: 'joao@example.com', eventId: 'evt-3' }
[GcalWebhookDiag] Preparando listagem de eventos para sincronizacao. { ownerEmail: 'joao@example.com', syncMode: 'full', syncToken: null }
[GcalWebhookDiag] Persistindo resultados de sincronizacao. { ownerEmail: 'joao@example.com', activeEvents: 1, cancelledItems: 0 }
[GcalWebhookDiag] Upsert de evento externo no bloqueio. { ownerEmail: 'joao@example.com', eventId: 'evt-10', summary: null }
[GcalWebhookDiag] Falha ao encerrar canal antigo antes da renovacao; seguindo mesmo assim. {
  ownerEmail: 'joao@example.com',
  channelId: 'old-channel-id',
  channelResourceId: 'old-channel-resource-id',
  error: 'stop failed'
}
[GcalWebhookDiag] Preparando listagem de eventos para sincronizacao. { ownerEmail: 'joao@example.com', syncMode: 'full', syncToken: null }
[GcalWebhookDiag] Persistindo resultados de sincronizacao. { ownerEmail: 'joao@example.com', activeEvents: 1, cancelledItems: 0 }
[GcalWebhookDiag] Upsert de evento externo no bloqueio. { ownerEmail: 'joao@example.com', eventId: 'evt-20', summary: null }
[GcalWebhookDiag] Preparando listagem de eventos para sincronizacao. { ownerEmail: 'joao@example.com', syncMode: 'full', syncToken: null }
[GcalWebhookDiag] Persistindo resultados de sincronizacao. { ownerEmail: 'joao@example.com', activeEvents: 1, cancelledItems: 0 }
[GcalWebhookDiag] Upsert de evento externo no bloqueio. { ownerEmail: 'joao@example.com', eventId: 'evt-30', summary: null }
[GcalWebhookDiag] Preparando listagem de eventos para sincronizacao. { ownerEmail: 'joao@example.com', syncMode: 'full', syncToken: null }
[GcalWebhookDiag] Preparando listagem de eventos para sincronizacao. {
  ownerEmail: 'joao@example.com',
  syncMode: 'incremental',
  syncToken: 'sync-token-123'
}
[GcalWebhookDiag] Persistindo resultados de sincronizacao. { ownerEmail: 'joao@example.com', activeEvents: 0, cancelledItems: 0 }
[GcalWebhookDiag] Preservando bloqueio local fora da janela de full sync. {
  ownerEmail: 'joao@example.com',
  eventId: 'evt-fora-janela',
  data: '2026-05-01',
  timeMin: '2026-07-01',
  timeMax: '2026-09-30'
}
[GcalWebhookDiag] Persistindo resultados de sincronizacao. { ownerEmail: 'joao@example.com', activeEvents: 0, cancelledItems: 0 }
[GcalWebhookDiag] Preservando bloqueio local fora da janela de full sync. {
  ownerEmail: 'joao@example.com',
  eventId: 'evt-fora-janela',
  data: '2026-05-01',
  timeMin: '2026-07-01',
  timeMax: '2026-09-30'
}
[GcalWebhookDiag] Persistindo resultados de sincronizacao. { ownerEmail: 'joao@example.com', activeEvents: 0, cancelledItems: 0 }
[GcalWebhookDiag] Persistindo resultados de sincronizacao. { ownerEmail: 'joao@example.com', activeEvents: 0, cancelledItems: 0 }
[GcalWebhookDiag] Full sync sem janela válida; nenhum purge executado por segurança. {
  ownerEmail: 'joao@example.com',
  payload: { timeMin: undefined, timeMax: undefined }
}
[GcalWebhookDiag] Persistindo resultados de sincronizacao. { ownerEmail: 'joao@example.com', activeEvents: 0, cancelledItems: 0 }
[GcalWebhookDiag] Full sync sem janela válida; nenhum purge executado por segurança. {
  ownerEmail: 'joao@example.com',
  payload: { timeMin: 'invalido', timeMax: '2026-09-30T23:59:59.999Z' }
}
✔ getHorarioPadraoFim usa +60 minutos em horário normal (0.7191ms)
✔ getHorarioPadraoFim formata +60 minutos mesmo quando o relógio vira meia-noite (0.0758ms)
✔ adicionarDiasISO soma dia em virada de mês e de ano usando UTC explícito (0.5599ms)
✔ montarEventoGoogle mantém start em D e end em D+1 quando horarioFim default cruza a meia-noite (0.7388ms)
✔ montarEventoGoogle mantém start e end no mesmo dia em aula normal (0.1517ms)
✔ montarEventoGoogle cruza para o dia seguinte quando horarioFim explícito é menor que o início (0.1246ms)
✔ montarEventoGoogle não transforma duração zero em evento de 24 horas (0.1137ms)
✔ montarTituloEvento combina objetivo e nome (0.0624ms)
✔ montarTituloEvento usa apenas objetivo quando não há nome (0.0784ms)
✔ montarTituloEvento usa fallback por tipo quando objetivo e nome não existem (0.1067ms)
✔ montarTituloEvento trata tipo reposicao com nome do aluno (0.0792ms)
✔ resolverDataISO converte ISO e PT-BR e rejeita entrada inválida (0.1749ms)
✔ isAppOwnedEvent reconhece evento do app, externo e sem extendedProperties (0.0738ms)
✔ classificarEventoDeLeitura ignora evento sem id (0.0488ms)
✔ classificarEventoDeLeitura ignora evento do app mesmo quando está cancelado (0.0397ms)
✔ classificarEventoDeLeitura remove evento externo cancelado (0.0409ms)
✔ classificarEventoDeLeitura faz upsert de evento externo ativo sem extendedProperties (0.0373ms)
✔ atualizarAgendamento enriquece o payload do Google com alunoNome e objetivo antes do update (0.7981ms)
✔ montarRecurrence gera RRULE semanal com BYDAY, INTERVAL e UNTIL em UTC (0.3947ms)
✔ montarRecurrence monta COUNT e monthOfDate sem combinar UNTIL (0.1077ms)
✔ montarEventoGoogle alinha DTSTART para a primeira ocorrencia semanal fora do BYDAY (0.1575ms)
✔ montarEventoGoogle não realinha DTSTART quando a data base já atende ao BYDAY (0.0909ms)
✔ montarEventoGoogle alinha DTSTART para BYDAY em recorrencia mensal (0.0881ms)
✔ montarEventoGoogle não alinha DTSTART quando a recorrência não gera BYDAY (0.1697ms)
✔ montarEventoGoogle preserva duração após alinhamento do DTSTART (0.1528ms)
✔ montarRecurrence devolve null para monthOfDate quando DTSTART alinhado cruza o mês (0.4586ms)
✔ montarRecurrence devolve null para untilDate quando DTSTART alinhado ultrapassa o UNTIL (0.1711ms)
✔ recorrenciaDataInicio tem precedência sobre data como origem do DTSTART alinhado (0.126ms)
✔ montarEventoGoogle preserva COUNT ao alinhar DTSTART com BYDAY (0.081ms)
✔ montarRecurrence mantém EXDATE existente e não cria nova para a data base (0.1299ms)
✔ montarRecurrence devolve null para agendamento avulso ou com dia inválido (0.0616ms)
✔ montarRecurrence devolve null quando a data de início é inválida (0.1075ms)
✔ count de recorrencia inclui excecoes sem reduzir a contagem (9.5582ms)
✔ montarPayloadGCal preserva campos de recorrência e mantém a whitelist fechada (0.3086ms)
✔ montarRecurrence gera EXDATE com hora e TZID para evento cronometrado e data para dia inteiro (0.1642ms)
✔ montarEventoGoogle inclui recurrence em serie e omite quando avulso (0.1207ms)
✔ expiração distante → não renova, não sincroniza (0.9691ms)
✔ expiração dentro da margem de 24h → renova e sincroniza (1.7276ms)
✔ expiração nula → renova e sincroniza (0.6561ms)
✔ falha ao encerrar canal antigo → segue e renova mesmo assim (0.6294ms)
✔ duas chamadas concorrentes → um único registro de canal (0.4917ms)
✔ listCalendarEvents inclui janela consultada no full sync e null no incremental (0.2524ms)
✔ full sync não apaga bloqueio local fora da janela consultada (0.2298ms)
✔ full sync apaga bloqueio local dentro da janela que não veio do remoto (0.2244ms)
✔ sync incremental não dispara purge por varredura (0.1032ms)
✔ janela ausente ou inválida não dispara delete em full sync (0.1738ms)
✔ POST cria reposicao com status pendente e validoAte derivado (1.7618ms)
✔ POST rejeita payload com validoAte ou cicloCobrancaResolvido (0.188ms)
✔ PATCH move reposicao para agendada e grava agendamentoReposicaoId (0.3529ms)
✔ PATCH com agendamentoReposicaoId inexistente responde 400 (0.2262ms)
✔ calcularAulasContadasDoCiclo não conta agendamento com reposicaoId (0.2135ms)
✔ calcularPrazoReposicao aplica piso para 2026-07-27 com fechamentoMesCheio (0.357ms)
✔ PATCH com agendamentoReposicaoId inexistente retorna 400 (0.9195ms)
✔ POST com id de reposicao pendente ja existente retorna 409 e mantem contagem 1 (0.3982ms)
✔ apos reagendar com cobravel false, cicloCobrancaResolvido guarda a janela do ciclo do agendamento e dataOriginal permanece original (1.0178ms)
✔ envio de instancia de serie cria reposicao pendente e nao cria agendamento (1.4077ms)
✔ se a persistencia do agendamento falhar, o patch nao e enviado (0.2573ms)
✔ reposição pendente com validoAte no ciclo mostra prazo na nota (1.7701ms)
✔ reposição pendente com validoAte nulo mantém nota antiga (0.1877ms)
✔ invariante de fechamento: valorTotal do extrato não muda entre prazo preenchido e nulo (12.5616ms)
✔ reposição expirada com validoAte dentro do ciclo usa ramo expirado (0.1316ms)
✔ PRAZO_MINIMO_REPOSICAO_DIAS deve ser 7 (0.5493ms)
✔ Aluno sem ciclo configurado retorna prazo nulo (0.9925ms)
✔ dataOriginal inválida retorna prazo nulo (0.1259ms)
✔ dataOriginal nula retorna prazo nulo (0.0791ms)
✔ Fechamento mensal: data no começo do mês usa fim do mesmo ciclo (0.1361ms)
✔ Fechamento mensal: data a 2 dias do fim do mês aplica piso para o próximo ciclo (0.1357ms)
✔ Fechamento mensal: exatamente 7 dias do fim do ciclo não aplica piso (0.0965ms)
✔ Fechamento mensal: data a 1 dia do fim do ciclo aplica piso (0.0999ms)
✔ Dia de vencimento: data no meio do ciclo usa fim do ciclo atual (0.1448ms)
✔ Dia de vencimento: data a 2 dias do fim do ciclo aplica piso (0.1786ms)
✔ Dia de vencimento: exatamente 7 dias do fim do ciclo não aplica piso (0.1006ms)
✔ Virada de ano: piso em dezembro aponta para janeiro do ano seguinte (0.106ms)
✔ Virada de ano: sem piso em data inicial do mês preservar ciclo do mês atual (0.0791ms)
✔ Determinismo: mesma dataOriginal e aluno produzem o mesmo prazo em duas chamadas (0.1261ms)
✔ Determinismo: resultado não depende da data do sistema, apenas da dataOriginal (0.1271ms)
✔ Aceita dataOriginal em formato Date object com a mesma regra (0.0945ms)
✔ Aluno com objetivo Consultoria Online e ciclo definido calcula prazo do mês (0.0661ms)
✔ obterReposicao expira reposição pendente com validoAte no passado (0.2567ms)
✔ obterReposicao preserva status pendente quando validoAte ainda não venceu (0.1353ms)
ℹ tests 108
ℹ suites 0
ℹ pass 107
ℹ fail 1
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 10875.2635

✖ failing tests:

test at test\gcal-duplicata-fix.test.js:416:1
✖ atualizarAgendamento limpa marca de pendencia quando o Google responde com sucesso (1.4302ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected
  
    {
      gcalSyncPendingAt: 1,
  +   gcalSyncPendingTentativas: 1
    }
  
      at TestContext.<anonymous> (E:\Projetos\GIT\personalapp\backend\test\gcal-duplicata-fix.test.js:468:12)
      at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
      at async Test.run (node:internal/test_runner/test:1332:7)
      at async Test.processPendingSubtests (node:internal/test_runner/test:911:7) {
    generatedMessage: true,
    code: 'ERR_ASSERTION',
    actual: { gcalSyncPendingAt: 1, gcalSyncPendingTentativas: 1 },
    expected: { gcalSyncPendingAt: 1 },
    operator: 'deepStrictEqual',
    diff: 'simple'
  }
```

**Totais de base:** 108 testes, 107 aprovados, 1 falha. A unica falha foi a
prevista: `atualizarAgendamento limpa marca de pendencia quando o Google responde com
sucesso`.

## 2. Arquivos alterados

- `assets/js/storage.js`
  - removeu a verificacao de estado terminal do caminho que decide emitir `PUT`;
  - removeu `_agendamentoEmEstadoTerminal` e a constante de teto do frontend, que ficaram
    sem uso;
  - manteve a assimetria existente: os campos de pendencia sao removidos apenas da lista
    local; a lista remota continua intacta.
- `backend/src/controllers/agendamentoController.js`
  - passou a identificar no backend se o documento persistido entrou na requisicao com
    cinco tentativas;
  - o `findOneAndUpdate` do Mongo continua ocorrendo antes de qualquer corte relacionado ao
    Google;
  - uma edicao real em documento terminal grava o novo dado e zera
    `gcalSyncPendingTentativas`;
  - o `PUT` que recebeu um documento terminal nao chama o Google nessa mesma requisicao.
- `backend/test/gcal-duplicata-fix.test.js`
  - reescreveu o teste que codificava o bloqueio incorreto do `PUT`;
  - adicionou teste do controller real para persistencia, corte da chamada ao Google e
    reabertura da janela;
  - corrigiu a assercao de sucesso para exigir o `$unset` dos dois campos de pendencia.
- `docs/_reports/2026-08-29-fix-teto-pendencia-gcal.md`
  - este relatorio.

## 3. Mecanismo do defeito e perda silenciosa

O frontend removia os campos de pendencia da copia local, mas preservava esses campos no
objeto remoto. Essa assimetria e proposital: ela faz a comparacao detectar que ainda existe
trabalho pendente e emitir um `PUT`.

O defeito estava imediatamente antes dessa comparacao. Quando o remoto tinha
`gcalSyncPendingTentativas >= 5`, `_agendamentoEmEstadoTerminal` provocava `continue`.
Assim, uma alteracao real, como `09:00` para `15:00`, nunca chegava ao `PUT`.

A tela e o `localStorage` aceitavam a mudanca, mas o Mongo mantinha o valor anterior. Na
proxima carga remota, o valor antigo sobrescrevia o estado local. Como o contador so poderia
ser limpo depois de uma sincronizacao bem-sucedida e essa sincronizacao dependia do `PUT`,
o bloqueio era permanente.

## 4. Desenho novo: fronteira Mongo / Google

O fluxo passa a ter duas pernas independentes:

1. **Mongo:** sempre que local e remoto divergem, o frontend emite `PUT`. O controller grava
   por `findOneAndUpdate({ ownerEmail, id }, ...)` sem considerar o teto como condicao de
   persistencia.
2. **Google:** depois da gravacao, o controller olha o estado que existia antes do `PUT`. Se
   ele ja estava no teto, responde 200 com o documento gravado e nao chama
   `updateEventInGoogle`/`pushEventToGoogle` nessa requisicao.

Nao foi necessario endpoint novo, processo em background nem mecanismo incompativel com a
Vercel serverless. Todas as queries envolvidas continuam filtradas por `ownerEmail`.

## 5. Decisao sobre reabrir a janela

**Decisao: uma edicao real reabre a janela.**

Quando o documento persistido esta terminal e algum campo recebido difere do valor
persistido, o controller grava a edicao com `gcalSyncPendingTentativas: 0`. A chamada ao
Google ainda e pulada nesse mesmo `PUT`, preservando o teto para a tentativa que chegou em
estado terminal. No proximo ciclo de sync, o contador ja esta abaixo do teto e a tentativa
ao Google volta a ser permitida.

Essa separacao trata a edicao como nova intencao da usuaria e permite recuperacao depois de
reconectar a conta, sem misturar a garantia de persistencia no Mongo com a disponibilidade
do Google.

## 6. Prova por mutacao

### Item 1 — frontend deve emitir o `PUT`

O teste foi alterado primeiro, mantendo a implementacao defeituosa. Resultado observado:

```text
✖ storage emite PUT para alteracao local mesmo quando a pendencia atinge o teto de tentativas
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

0 !== 1
```

Isso prova que restaurar o `continue` terminal no frontend faz o teste falhar.

### Item 1 — backend nao deve chamar o Google e deve reabrir a janela

Ainda contra a implementacao antiga:

```text
✖ atualizarAgendamento terminal grava no Mongo, reabre tentativas e nao chama o Google no mesmo PUT
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

2 !== 1
```

A implementacao antiga fez uma segunda escrita depois de chamar o Google; o teste exige uma
unica escrita Mongo, com horario novo e contador zero, e zero chamadas ao Google. Depois da
correcao, o teste passou.

### Item 2 — `$unset` dos dois campos

O portao de base ja executou a mutacao inversa: a assercao antiga exigia somente
`gcalSyncPendingAt`, enquanto o sujeito real retornou:

```text
actual: { gcalSyncPendingAt: 1, gcalSyncPendingTentativas: 1 }
expected: { gcalSyncPendingAt: 1 }
```

Portanto, restaurar a assercao antiga faz exatamente o teste do item 2 falhar. Com a assercao
corrigida, ele passa e protege o `$unset` dos dois campos.

## 7. Portao de saida

### `npm test` — saida literal

```text
> personal-api@1.0.0 test
> node --test

✔ calcularAulasContadasDoCiclo: agendamento com reposicaoId não entra na parcela (A) (0.6953ms)
✔ calcularAulasContadasDoCiclo: reposição cobrável pendente conta na parcela (B) (0.2745ms)
✔ calcularAulasContadasDoCiclo: reposição não cobrável só conta quando cicloCobrancaResolvido.inicio bate (0.1076ms)
✔ montarExtratoDoCiclo: ciclo simples fecha com valorTotalCiclo (11.6246ms)
✔ montarExtratoDoCiclo: ciclo com ajuste manual negativo fecha com valorTotalCiclo (0.4143ms)
✔ montarExtratoDoCiclo: reposição cobrável de origem fecha com valorTotalCiclo (0.2007ms)
✔ montarExtratoDoCiclo: cobrável expirada com dataOriginal e validoAte no mesmo ciclo gera uma única linha (0.1854ms)
✔ montarExtratoDoCiclo: reposição já cobrada gera linha zero sem inflar o total (0.3537ms)
✔ montarExtratoDoCiclo: reposição não cobrável fora do ciclo traz nota de ciclo anterior (0.185ms)
✔ calcularCicloVigente ajusta dia 31 em mês curto (1.5246ms)
✔ calcularCicloVigente cruza o fim de ano corretamente (0.1758ms)
✔ calcularCicloVigente usa fechamentoMesCheio em vez de diaVencimento (0.1294ms)
✔ calcularTotalAulasCobradas respeita piso zero para ajuste negativo (0.1032ms)
✔ calcularValorTotalCiclo ignora contagem quando metodoCobranca == valor_fixo (0.1203ms)
✔ filtrarHistoricoExcluindoCicloAtual remove o ciclo vigente e preserva ciclos anteriores (0.3439ms)
✔ encerrarCicloSobrepostoSeNecessario fecha o ciclo anterior antes do início do novo ciclo (0.1845ms)
[GcalSync] Evento do Google Calendar existente foi encontrado cancelado; tratamos como falha para reprocessamento. {
  ownerEmail: 'joao@example.com',
  googleCalendarEventId: 'appbcde4fac243d865502d21edc2708c43ecc1aa33f20fef26d210e2ed55532d9e1',
  status: 'cancelled'
}
[AgendamentoController] Falha ao sincronizar com Google Calendar durante atualizar: timeout no Google
[AgendamentoController] Stack GCal: Error: timeout no Google
    at gcalSyncService.updateEventInGoogle (E:\Projetos\GIT\personalapp\backend\test\gcal-duplicata-fix.test.js:320:21)
    at atualizarAgendamento (E:\Projetos\GIT\personalapp\backend\src\controllers\agendamentoController.js:437:31)
    at async TestContext.<anonymous> (E:\Projetos\GIT\personalapp\backend\test\gcal-duplicata-fix.test.js:344:5)
    at async Test.run (node:internal/test_runner/test:1332:7)
    at async Test.processPendingSubtests (node:internal/test_runner/test:911:7)
✔ pushEventToGoogle usa id deterministico e trata 409 como sucesso idempotente (2.5761ms)
✔ atualizarAgendamento com googleCalendarEventId existente usa updateEventInGoogle (2.959ms)
✔ pushEventToGoogle rejeita evento cancelado do Google como falha, nao como sucesso (0.9383ms)
✔ atualizarAgendamento grava marca de pendencia quando a chamada ao Google falha (1.0774ms)
[AgendamentoController] Falha ao persistir marca de pendencia do Google Calendar. Respondendo 200 mesmo assim. {
  contexto: 'atualizar',
  agendamentoId: 'ag-falha-persistencia-1',
  ownerEmail: 'joao@example.com',
  error: 'mongo falhou'
}
[AgendamentoController] Falha ao sincronizar com Google Calendar durante atualizar: Operation `googlecalendarconnections.findOne()` buffering timed out after 10000ms
[AgendamentoController] Stack GCal: MongooseError: Operation `googlecalendarconnections.findOne()` buffering timed out after 10000ms
    at Timeout.<anonymous> (E:\Projetos\GIT\personalapp\backend\node_modules\mongoose\lib\drivers\node-mongodb-native\collection.js:187:23)
    at listOnTimeout (node:internal/timers:605:17)
    at process.processTimers (node:internal/timers:541:7)
✔ atualizarAgendamento preserva 200 mesmo quando a persistencia da marca falha (10005.7443ms)
✔ atualizarAgendamento limpa marca de pendencia quando o Google responde com sucesso (0.7717ms)
✔ portao 2.0: campo novo atravessa PUT e GET, strict false persiste e ausencia no corpo nao faz unset (0.501ms)
✔ storage remove gcalSyncPendingAt da carga remota para evitar deadlock no estado local (11.8397ms)
✔ storage mescla googleCalendarEventId local apos POST do agendamento (1.0888ms)
✔ storage emite PUT para alteracao local mesmo quando a pendencia atinge o teto de tentativas (1.0155ms)
✔ atualizarAgendamento terminal grava no Mongo, reabre tentativas e nao chama o Google no mesmo PUT (0.426ms)
✔ convergencia: apos limpar a pendencia, sync seguinte nao reemite PUT adicional (1.0179ms)
✔ cenario completo da duplicata: falha no PUT da serie marca pendencia e o sync seguinte reemite a serie (1.2748ms)
[GCalSync] Ignorando recorrência porque DTSTART alinhado ultrapassa o UNTIL. {
  agendamentoId: 'ag-monthofdate-cruza-mes',
  dataBase: '2026-08-31',
  dataInicioAlinhada: '2026-09-06',
  until: '20260831T235959Z',
  motivo: 'DTSTART alinhado após UNTIL do mês'
}
[GCalSync] Ignorando recorrência porque DTSTART alinhado ultrapassa o UNTIL. {
  agendamentoId: 'ag-untildate-ultrapassa',
  dataBase: '2026-08-31',
  dataInicioAlinhada: '2026-09-06',
  until: '20260902T235959Z',
  motivo: 'DTSTART alinhado após UNTIL'
}
[GcalWebhookDiag] Preparando listagem de eventos para sincronizacao. { ownerEmail: 'joao@example.com', syncMode: 'full', syncToken: null }
[GcalWebhookDiag] Persistindo resultados de sincronizacao. { ownerEmail: 'joao@example.com', activeEvents: 2, cancelledItems: 1 }
[GcalWebhookDiag] Upsert de evento externo no bloqueio. { ownerEmail: 'joao@example.com', eventId: 'evt-1', summary: null }
[GcalWebhookDiag] Upsert de evento externo no bloqueio. { ownerEmail: 'joao@example.com', eventId: 'evt-2', summary: null }
[GcalWebhookDiag] Evento cancelado recebido; removendo localmente. { ownerEmail: 'joao@example.com', eventId: 'evt-3' }
[GcalWebhookDiag] Preparando listagem de eventos para sincronizacao. { ownerEmail: 'joao@example.com', syncMode: 'full', syncToken: null }
[GcalWebhookDiag] Persistindo resultados de sincronizacao. { ownerEmail: 'joao@example.com', activeEvents: 1, cancelledItems: 0 }
[GcalWebhookDiag] Upsert de evento externo no bloqueio. { ownerEmail: 'joao@example.com', eventId: 'evt-10', summary: null }
[GcalWebhookDiag] Falha ao encerrar canal antigo antes da renovacao; seguindo mesmo assim. {
  ownerEmail: 'joao@example.com',
  channelId: 'old-channel-id',
  channelResourceId: 'old-channel-resource-id',
  error: 'stop failed'
}
[GcalWebhookDiag] Preparando listagem de eventos para sincronizacao. { ownerEmail: 'joao@example.com', syncMode: 'full', syncToken: null }
[GcalWebhookDiag] Persistindo resultados de sincronizacao. { ownerEmail: 'joao@example.com', activeEvents: 1, cancelledItems: 0 }
[GcalWebhookDiag] Upsert de evento externo no bloqueio. { ownerEmail: 'joao@example.com', eventId: 'evt-20', summary: null }
[GcalWebhookDiag] Preparando listagem de eventos para sincronizacao. { ownerEmail: 'joao@example.com', syncMode: 'full', syncToken: null }
[GcalWebhookDiag] Persistindo resultados de sincronizacao. { ownerEmail: 'joao@example.com', activeEvents: 1, cancelledItems: 0 }
[GcalWebhookDiag] Upsert de evento externo no bloqueio. { ownerEmail: 'joao@example.com', eventId: 'evt-30', summary: null }
[GcalWebhookDiag] Preparando listagem de eventos para sincronizacao. { ownerEmail: 'joao@example.com', syncMode: 'full', syncToken: null }
[GcalWebhookDiag] Preparando listagem de eventos para sincronizacao. {
  ownerEmail: 'joao@example.com',
  syncMode: 'incremental',
  syncToken: 'sync-token-123'
}
[GcalWebhookDiag] Persistindo resultados de sincronizacao. { ownerEmail: 'joao@example.com', activeEvents: 0, cancelledItems: 0 }
[GcalWebhookDiag] Preservando bloqueio local fora da janela de full sync. {
  ownerEmail: 'joao@example.com',
  eventId: 'evt-fora-janela',
  data: '2026-05-01',
  timeMin: '2026-07-01',
  timeMax: '2026-09-30'
}
[GcalWebhookDiag] Persistindo resultados de sincronizacao. { ownerEmail: 'joao@example.com', activeEvents: 0, cancelledItems: 0 }
[GcalWebhookDiag] Preservando bloqueio local fora da janela de full sync. {
  ownerEmail: 'joao@example.com',
  eventId: 'evt-fora-janela',
  data: '2026-05-01',
  timeMin: '2026-07-01',
  timeMax: '2026-09-30'
}
[GcalWebhookDiag] Persistindo resultados de sincronizacao. { ownerEmail: 'joao@example.com', activeEvents: 0, cancelledItems: 0 }
[GcalWebhookDiag] Persistindo resultados de sincronizacao. { ownerEmail: 'joao@example.com', activeEvents: 0, cancelledItems: 0 }
[GcalWebhookDiag] Full sync sem janela válida; nenhum purge executado por segurança. {
  ownerEmail: 'joao@example.com',
  payload: { timeMin: undefined, timeMax: undefined }
}
[GcalWebhookDiag] Persistindo resultados de sincronizacao. { ownerEmail: 'joao@example.com', activeEvents: 0, cancelledItems: 0 }
[GcalWebhookDiag] Full sync sem janela válida; nenhum purge executado por segurança. {
  ownerEmail: 'joao@example.com',
  payload: { timeMin: 'invalido', timeMax: '2026-09-30T23:59:59.999Z' }
}
✔ getHorarioPadraoFim usa +60 minutos em horário normal (0.6984ms)
✔ getHorarioPadraoFim formata +60 minutos mesmo quando o relógio vira meia-noite (0.0787ms)
✔ adicionarDiasISO soma dia em virada de mês e de ano usando UTC explícito (0.5579ms)
✔ montarEventoGoogle mantém start em D e end em D+1 quando horarioFim default cruza a meia-noite (0.7466ms)
✔ montarEventoGoogle mantém start e end no mesmo dia em aula normal (0.1436ms)
✔ montarEventoGoogle cruza para o dia seguinte quando horarioFim explícito é menor que o início (0.1175ms)
✔ montarEventoGoogle não transforma duração zero em evento de 24 horas (0.1ms)
✔ montarTituloEvento combina objetivo e nome (0.0619ms)
✔ montarTituloEvento usa apenas objetivo quando não há nome (0.0743ms)
✔ montarTituloEvento usa fallback por tipo quando objetivo e nome não existem (0.0992ms)
✔ montarTituloEvento trata tipo reposicao com nome do aluno (0.0713ms)
✔ resolverDataISO converte ISO e PT-BR e rejeita entrada inválida (0.1772ms)
✔ isAppOwnedEvent reconhece evento do app, externo e sem extendedProperties (0.07ms)
✔ classificarEventoDeLeitura ignora evento sem id (0.0473ms)
✔ classificarEventoDeLeitura ignora evento do app mesmo quando está cancelado (0.0413ms)
✔ classificarEventoDeLeitura remove evento externo cancelado (0.0373ms)
✔ classificarEventoDeLeitura faz upsert de evento externo ativo sem extendedProperties (0.0337ms)
✔ atualizarAgendamento enriquece o payload do Google com alunoNome e objetivo antes do update (0.809ms)
✔ montarRecurrence gera RRULE semanal com BYDAY, INTERVAL e UNTIL em UTC (0.3959ms)
✔ montarRecurrence monta COUNT e monthOfDate sem combinar UNTIL (0.1073ms)
✔ montarEventoGoogle alinha DTSTART para a primeira ocorrencia semanal fora do BYDAY (0.158ms)
✔ montarEventoGoogle não realinha DTSTART quando a data base já atende ao BYDAY (0.0946ms)
✔ montarEventoGoogle alinha DTSTART para BYDAY em recorrencia mensal (0.1032ms)
✔ montarEventoGoogle não alinha DTSTART quando a recorrência não gera BYDAY (0.1639ms)
✔ montarEventoGoogle preserva duração após alinhamento do DTSTART (0.1385ms)
✔ montarRecurrence devolve null para monthOfDate quando DTSTART alinhado cruza o mês (0.4555ms)
✔ montarRecurrence devolve null para untilDate quando DTSTART alinhado ultrapassa o UNTIL (0.1646ms)
✔ recorrenciaDataInicio tem precedência sobre data como origem do DTSTART alinhado (0.1269ms)
✔ montarEventoGoogle preserva COUNT ao alinhar DTSTART com BYDAY (0.078ms)
✔ montarRecurrence mantém EXDATE existente e não cria nova para a data base (0.1288ms)
✔ montarRecurrence devolve null para agendamento avulso ou com dia inválido (0.0638ms)
✔ montarRecurrence devolve null quando a data de início é inválida (0.0992ms)
✔ count de recorrencia inclui excecoes sem reduzir a contagem (9.6033ms)
✔ montarPayloadGCal preserva campos de recorrência e mantém a whitelist fechada (0.2854ms)
✔ montarRecurrence gera EXDATE com hora e TZID para evento cronometrado e data para dia inteiro (0.1534ms)
✔ montarEventoGoogle inclui recurrence em serie e omite quando avulso (0.1228ms)
✔ expiração distante → não renova, não sincroniza (0.9511ms)
✔ expiração dentro da margem de 24h → renova e sincroniza (1.7906ms)
✔ expiração nula → renova e sincroniza (0.6745ms)
✔ falha ao encerrar canal antigo → segue e renova mesmo assim (0.6159ms)
✔ duas chamadas concorrentes → um único registro de canal (0.4814ms)
✔ listCalendarEvents inclui janela consultada no full sync e null no incremental (0.2458ms)
✔ full sync não apaga bloqueio local fora da janela consultada (0.2269ms)
✔ full sync apaga bloqueio local dentro da janela que não veio do remoto (0.2247ms)
✔ sync incremental não dispara purge por varredura (0.1016ms)
✔ janela ausente ou inválida não dispara delete em full sync (0.1697ms)
✔ POST cria reposicao com status pendente e validoAte derivado (1.49ms)
✔ POST rejeita payload com validoAte ou cicloCobrancaResolvido (0.1449ms)
✔ PATCH move reposicao para agendada e grava agendamentoReposicaoId (0.3482ms)
✔ PATCH com agendamentoReposicaoId inexistente responde 400 (0.1538ms)
✔ calcularAulasContadasDoCiclo não conta agendamento com reposicaoId (0.1619ms)
✔ calcularPrazoReposicao aplica piso para 2026-07-27 com fechamentoMesCheio (0.2611ms)
✔ PATCH com agendamentoReposicaoId inexistente retorna 400 (0.6608ms)
✔ POST com id de reposicao pendente ja existente retorna 409 e mantem contagem 1 (0.2802ms)
✔ apos reagendar com cobravel false, cicloCobrancaResolvido guarda a janela do ciclo do agendamento e dataOriginal permanece original (0.8715ms)
✔ envio de instancia de serie cria reposicao pendente e nao cria agendamento (1.0041ms)
✔ se a persistencia do agendamento falhar, o patch nao e enviado (0.1723ms)
✔ reposição pendente com validoAte no ciclo mostra prazo na nota (1.2549ms)
✔ reposição pendente com validoAte nulo mantém nota antiga (0.1616ms)
✔ invariante de fechamento: valorTotal do extrato não muda entre prazo preenchido e nulo (13.0798ms)
✔ reposição expirada com validoAte dentro do ciclo usa ramo expirado (0.2126ms)
✔ PRAZO_MINIMO_REPOSICAO_DIAS deve ser 7 (0.5402ms)
✔ Aluno sem ciclo configurado retorna prazo nulo (1.0534ms)
✔ dataOriginal inválida retorna prazo nulo (0.1338ms)
✔ dataOriginal nula retorna prazo nulo (0.0744ms)
✔ Fechamento mensal: data no começo do mês usa fim do mesmo ciclo (0.1267ms)
✔ Fechamento mensal: data a 2 dias do fim do mês aplica piso para o próximo ciclo (0.1245ms)
✔ Fechamento mensal: exatamente 7 dias do fim do ciclo não aplica piso (0.0942ms)
✔ Fechamento mensal: data a 1 dia do fim do ciclo aplica piso (0.0982ms)
✔ Dia de vencimento: data no meio do ciclo usa fim do ciclo atual (0.1418ms)
✔ Dia de vencimento: data a 2 dias do fim do ciclo aplica piso (0.137ms)
✔ Dia de vencimento: exatamente 7 dias do fim do ciclo não aplica piso (0.132ms)
✔ Virada de ano: piso em dezembro aponta para janeiro do ano seguinte (0.0911ms)
✔ Virada de ano: sem piso em data inicial do mês preservar ciclo do mês atual (0.0664ms)
✔ Determinismo: mesma dataOriginal e aluno produzem o mesmo prazo em duas chamadas (0.0919ms)
✔ Determinismo: resultado não depende da data do sistema, apenas da dataOriginal (0.1025ms)
✔ Aceita dataOriginal em formato Date object com a mesma regra (0.0799ms)
✔ Aluno com objetivo Consultoria Online e ciclo definido calcula prazo do mês (0.0657ms)
✔ obterReposicao expira reposição pendente com validoAte no passado (0.2499ms)
✔ obterReposicao preserva status pendente quando validoAte ainda não venceu (0.1298ms)
ℹ tests 109
ℹ suites 0
ℹ pass 109
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 10869.6872
```

**Totais finais:** 109 testes, 109 aprovados, zero falhas.  
**Antes/depois:** 108/107/1 → 109/109/0.

A verificacao isolada de `backend/test/gcal-sync.test.js` permaneceu em **46/46**.

### `git diff --stat` — saida literal

```text
 assets/js/storage.js                             | 15 ----
 backend/src/controllers/agendamentoController.js | 40 ++++++++++-
 backend/test/gcal-duplicata-fix.test.js          | 88 ++++++++++++++++++++++--
 3 files changed, 121 insertions(+), 22 deletions(-)
```

### `git status --short` — saida literal

```text
 M assets/js/storage.js
 M backend/src/controllers/agendamentoController.js
 M backend/test/gcal-duplicata-fix.test.js
```

O status acima foi capturado antes da criacao deste relatorio, que foi deliberadamente o
ultimo item da rodada.

## 8. Divergencias entre a spec e o codigo atual

A spec nao contradiz o principio solicitado: as secoes 6 e 9.4 dizem que uma falha externa
nao reverte a gravacao no Mongo. Porem, ela ainda nao cobre:

- `gcalSyncPendingAt` e `gcalSyncPendingTentativas`;
- o incremento server-side e o teto de cinco tentativas;
- a limpeza dos dois campos apos sucesso;
- a remocao dos campos apenas do estado local e a preservacao no remoto para provocar o
  diff;
- a fronteira nova: Mongo sempre grava, enquanto o teto corta apenas a perna Google;
- a reabertura do contador em uma edicao real;
- o fato de o primeiro `PUT` de uma edicao terminal persistir/zerar, mas nao tentar o Google;
- como comunicar estado terminal para a usuaria.

Ha tambem uma divergencia interna preexistente na propria spec:

- a secao 6 e a secao 9.4 descrevem corretamente HTTP 200 com
  `partialSuccess/gcalSyncFailed`;
- a linha 11 da tabela da secao 7 ainda diz HTTP 502.

A spec nao foi editada nesta rodada, conforme restricao. Esses pontos ficam para a rodada B.

## 9. Proposta de descoberta do estado terminal

Sem implementar UI nesta rodada, a proposta e o backend explicitar na resposta que a
sincronizacao foi adiada por teto, permitindo reaproveitar o mecanismo de toast que hoje
mostra `Salvo, mas a Google Agenda não foi atualizada`.

Textos distintos sugeridos:

- ao atingir o teto: **“Salvo no app. A sincronização com a Google Agenda foi pausada para
  este agendamento.”**
- ao editar e reabrir a janela: **“Salvo no app. A sincronização com a Google Agenda será
  tentada novamente.”**

Isso evita apresentar a persistencia Mongo como falha e diferencia indisponibilidade
transitoria de pausa por repeticao. A inclusao de flag de resposta e a alteracao do toast
dependem de aprovacao e pertencem a uma rodada de UI/contrato separada.

## 10. Roteiro de teste manual apos deploy

1. Editar uma ocorrencia de serie com a rede degradada, para forcar a falha do Google.
2. Recarregar a pagina.
3. Fazer qualquer alteracao e salvar; confirmar que o `EXDATE` chegou ao Google e que nao ha
   duplicata.
4. Forcar cinco falhas consecutivas no mesmo agendamento; depois editar o horario e salvar.
   Recarregar a pagina e confirmar que a alteracao persistiu.

O passo 2 e obrigatorio para reproduzir o defeito da rodada anterior.

## 11. Branch usada

`fix/duplicata-edicao-serie-gcal`

Nenhum commit, push, checkout, reset, restore, stash, merge ou rebase foi executado.

## 12. Encontrado e nao alterado

- `docs/specs/gcal-sync.md` continua sem o mecanismo de pendencia/teto e possui a divergencia
  HTTP 200 × 502 descrita acima; nao alterado porque pertence a rodada B.
- `obterAgendamentoPersistido`, a cascata de `montarRespostaFalhaGcal` e as guardas de
  `window.log.grupo` nao foram simplificados; sao escopo expresso da rodada B.
- Um item que permanece terminal e sem edicao real continuara provocando `PUT` por causa da
  assimetria local/remoto. O backend grava no Mongo, mas nao chama o Google. Esse custo de
  escrita e consequencia deliberada da garantia de nunca bloquear persistencia; nao foi
  criado outro mecanismo sem decisao de produto.
- A deteccao de edicao usa igualdade estrita depois da normalizacao ja existente. Uma futura
  origem que envie campos numericos com tipos inconsistentes pode reabrir a janela por
  diferenca de tipo; os payloads atuais usam tipos consistentes e ampliar coercao nao fazia
  parte desta rodada.
- `backend/src/services/gcalSyncService.js` nao foi alterado: o teto pertence ao controller e
  nao exigiu mudar montagem, ids deterministicos, recorrencia ou acesso ao Google.
- Nao foram alterados o motor isomorfico de recorrencia, as funcoes de alinhamento de
  `DTSTART`, `montarPayloadGCal`, `buildDeterministicGoogleEventId`,
  `_normalizarAgendamentoParaComparacao`, `resolverDataISO`, webhooks, autenticacao,
  financeiro, CSS, roadmap, contexto geral ou instrucoes do Copilot.
- `listaRemota` nao foi limpa. Apenas `listaLocal` continua perdendo os campos de pendencia,
  preservando o mecanismo de reenvio.
- Nenhuma dependencia foi adicionada e nenhuma escrita manual foi feita no Mongo de
  producao.
