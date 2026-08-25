# Relatório do Sync-Fix — Aviso de falha parcial do Google — 2026-08-25

## 1. Portão de base

```text
cd E:\Projetos\GIT\personalapp
git branch --show-current
feat/gcal-sync
git status --short
 M assets/js/storage.js
git log --oneline -3
15149e5 fix: remove dead GCal update path from cascade sync
dd08846 fix: enrich GCal update payload from enrolled student
2dfa439 fix: remove redundant reposicao reload from POST helper
Select-String -Path .\assets\js\storage.js -Pattern "gcalSyncFailed" -SimpleMatch | Measure-Object | Select-Object -ExpandProperty Count
1
cd backend
npm test

> personal-api@1.0.0 test
> node --test

✔ calcularAulasContadasDoCiclo: agendamento com reposicaoId não entra na parcela (A) (0.5884ms)
✔ calcularAulasContadasDoCiclo: reposição cobrável pendente conta na parcela (B) (0.191ms)
✔ calcularAulasContadasDoCiclo: reposição não cobrável só conta quando cicloCobrancaResolvido.inicio bate (0.093ms)
✔ montarExtratoDoCiclo: ciclo simples fecha com valorTotalCiclo (11.03ms)
✔ montarExtratoDoCiclo: ciclo com ajuste manual negativo fecha com valorTotalCiclo (0.2924ms)
✔ montarExtratoDoCiclo: reposição cobrável de origem fecha com valorTotalCiclo (0.1916ms)
✔ montarExtratoDoCiclo: cobrável expirada com dataOriginal e validoAte no mesmo ciclo gera uma única linha (0.123ms)
✔ montarExtratoDoCiclo: reposição já cobrada gera linha zero sem inflar o total (0.2924ms)
✔ montarExtratoDoCiclo: reposição não cobrável fora do ciclo traz nota de ciclo anterior (0.1884ms)
✔ calcularCicloVigente ajusta dia 31 em mês curto (1.062ms)
✔ calcularCicloVigente cruza o fim de ano corretamente (0.1212ms)
✔ calcularCicloVigente usa fechamentoMesCheio em vez de diaVencimento (0.1164ms)
✔ calcularTotalAulasCobradas respeita piso zero para ajuste negativo (0.0767ms)
✔ calcularValorTotalCiclo ignora contagem quando metodoCobranca == valor_fixo (0.1172ms)
✔ filtrarHistoricoExcluindoCicloAtual remove o ciclo vigente e preserva ciclos anteriores (0.2771ms)
✔ encerrarCicloSobrepostoSeNecessario fecha o ciclo anterior antes do início do novo ciclo (0.1762ms)
✔ getHorarioPadraoFim usa +60 minutos em horário normal (0.6042ms)
✔ getHorarioPadraoFim formata +60 minutos mesmo quando o relógio vira meia-noite (0.0764ms)
✔ adicionarDiasISO soma dia em virada de mês e de ano usando UTC explícito (0.6052ms)
✔ montarEventoGoogle mantém start em D e end em D+1 quando horarioFim default cruza a meia-noite (0.6896ms)
✔ montarEventoGoogle mantém start e end no mesmo dia em aula normal (0.1505ms)
✔ montarEventoGoogle cruza para o dia seguinte quando horarioFim explícito é menor que o início (0.1082ms)
✔ montarEventoGoogle não transforma duração zero em evento de 24 horas (0.0943ms)
✔ montarTituloEvento combina objetivo e nome (0.0624ms)
✔ montarTituloEvento usa apenas objetivo quando não há nome (0.0795ms)
✔ montarTituloEvento usa fallback por tipo quando objetivo e nome não existem (0.103ms)
✔ montarTituloEvento trata tipo reposicao com nome do aluno (0.0657ms)
✔ resolverDataISO converte ISO e PT-BR e rejeita entrada inválida (0.1825ms)
✔ isAppOwnedEvent reconhece evento do app, externo e sem extendedProperties (0.0871ms)
✔ classificarEventoDeLeitura ignora evento sem id (0.0583ms)
✔ classificarEventoDeLeitura ignora evento do app mesmo quando está cancelado (0.055ms)
✔ classificarEventoDeLeitura remove evento externo cancelado (0.049ms)
✔ classificarEventoDeLeitura faz upsert de evento externo ativo sem extendedProperties (0.0399ms)
✔ atualizarAgendamento enriquece o payload do Google com alunoNome e objetivo antes do update (0.8049ms)
✔ montarRecurrence gera RRULE semanal com BYDAY, INTERVAL e UNTIL em UTC (0.2886ms)
✔ montarRecurrence monta COUNT e monthOfDate sem combinar UNTIL (0.1123ms)
✔ montarRecurrence devolve null para agendamento avulso ou com dia inválido (0.0599ms)
✔ montarRecurrence devolve null quando a data de início é inválida (0.092ms)
✔ count de recorrencia inclui excecoes sem reduzir a contagem (9.4387ms)
✔ montarPayloadGCal preserva campos de recorrência e mantém a whitelist fechada (0.2917ms)
✔ montarRecurrence gera EXDATE com hora e TZID para evento cronometrado e data para dia inteiro (0.159ms)
✔ montarEventoGoogle inclui recurrence em serie e omite quando avulso (0.1278ms)
✔ POST cria reposicao com status pendente e validoAte derivado (1.5068ms)
✔ POST rejeita payload com validoAte ou cicloCobrancaResolvido (0.1319ms)
✔ PATCH move reposicao para agendada e grava agendamentoReposicaoId (0.3242ms)
✔ PATCH com agendamentoReposicaoId inexistente responde 400 (0.1498ms)
✔ calcularAulasContadasDoCiclo não conta agendamento com reposicaoId (0.1606ms)
✔ calcularPrazoReposicao aplica piso para 2026-07-27 com fechamentoMesCheio (0.2519ms)
✔ PATCH com agendamentoReposicaoId inexistente retorna 400 (0.6573ms)
✔ POST com id de reposicao pendente ja existente retorna 409 e mantem contagem 1 (0.3337ms)
✔ apos reagendar com cobravel false, cicloCobrancaResolvido guarda a janela do ciclo do agendamento e dataOriginal permanece original (0.867ms)
✔ envio de instancia de serie cria reposicao pendente e nao cria agendamento (1.1245ms)
✔ se a persistencia do agendamento falhar, o patch nao e enviado (0.159ms)
✔ reposição pendente com validoAte no ciclo mostra prazo na nota (1.3501ms)
✔ reposição pendente com validoAte nulo mantém nota antiga (0.1275ms)
✔ invariante de fechamento: valorTotal do extrato não muda entre prazo preenchido e nulo (10.0829ms)
✔ reposição expirada com validoAte dentro do ciclo usa ramo expirado (0.1322ms)
✔ PRAZO_MINIMO_REPOSICAO_DIAS deve ser 7 (0.5687ms)
✔ Aluno sem ciclo configurado retorna prazo nulo (1.0508ms)
✔ dataOriginal inválida retorna prazo nulo (0.1319ms)
✔ dataOriginal nula retorna prazo nulo (0.08ms)
✔ Fechamento mensal: data no começo do mês usa fim do mesmo ciclo (0.1388ms)
✔ Fechamento mensal: data a 2 dias do fim do mês aplica piso para o próximo ciclo (0.1226ms)
✔ Fechamento mensal: exatamente 7 dias do fim do ciclo não aplica piso (0.1136ms)
✔ Fechamento mensal: data a 1 dia do fim do ciclo aplica piso (0.112ms)
✔ Dia de vencimento: data no meio do ciclo usa fim do ciclo atual (0.1399ms)
✔ Dia de vencimento: data a 2 dias do fim do ciclo aplica piso (0.1574ms)
✔ Dia de vencimento: exatamente 7 dias do fim do ciclo não aplica piso (0.1002ms)
✔ Virada de ano: piso em dezembro aponta para janeiro do ano seguinte (0.1003ms)
✔ Virada de ano: sem piso em data inicial do mês preservar ciclo do mês atual (0.074ms)
✔ Determinismo: mesma dataOriginal e aluno produzem o mesmo prazo em duas chamadas (0.1171ms)
✔ Determinismo: resultado não depende da data do sistema, apenas da dataOriginal (0.1077ms)
✔ Aceita dataOriginal em formato Date object com a mesma regra (0.0923ms)
✔ Aluno com objetivo Consultoria Online e ciclo definido calcula prazo do mês (0.0763ms)
ℹ tests 74
ℹ suites 0
ℹ pass 74
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 833.9041
```

## 2. Saída literal de `git diff --stat`

```text
assets/js/storage.js | 25 ++++++++++++++++++++++++-
 1 file changed, 24 insertions(+), 1 deletion(-)
```

## 3. O que mudou e por quê

- Em `assets/js/storage.js`, o fluxo de `salvarDados` agora inspeciona o corpo das respostas remotas após o `Promise.all`.
- Quando qualquer resposta traz `gcalSyncFailed === true`, o app exibe um único toast de aviso com mensagem: `Salvo, mas a Google Agenda não foi atualizada`.
- A mudança é do tipo `warning`, não `error`, e preserva a lógica de sucesso pleno: quando `gcalSyncFailed` não existe, continua com o toast verde atual.
- O status HTTP continua em `200` no backend, como exigido pela regra de negócio; não houve retry, fila ou re-sync.

Isso faz a falha parcial ficar visível sem transformar o salvamento em erro total para o usuário ou para o fluxo de escrita local.

## 4. Tabela de mutação

| Recurso | Mutação | Resultado |
| --- | --- | --- |
| `assets/js/storage.js` | Detecta `gcalSyncFailed` no corpo da resposta e dispara um único toast de aviso `warning` | Feito |
| Backend / status de resposta | Não alterado | Mantido em `200` |
| `apiFetchBackend` e contrato de resposta | Não alterado | Mantido |
| `montarRespostaFalhaGcal` | Não alterado | Mantido |

Não houve mutação de código de retry nem de rollback, porque o requisito era apenas tornar a falha visível sem mudar o contrato de sucesso do MongoDB.

## 5. Saída do `npm test`

```text
> personal-api@1.0.0 test
> node --test

✔ calcularAulasContadasDoCiclo: agendamento com reposicaoId não entra na parcela (A) (0.5884ms)
✔ calcularAulasContadasDoCiclo: reposição cobrável pendente conta na parcela (B) (0.191ms)
✔ calcularAulasContadasDoCiclo: reposição não cobrável só conta quando cicloCobrancaResolvido.inicio bate (0.093ms)
✔ montarExtratoDoCiclo: ciclo simples fecha com valorTotalCiclo (11.03ms)
✔ montarExtratoDoCiclo: ciclo com ajuste manual negativo fecha com valorTotalCiclo (0.2924ms)
✔ montarExtratoDoCiclo: reposição cobrável de origem fecha com valorTotalCiclo (0.1916ms)
✔ montarExtratoDoCiclo: cobrável expirada com dataOriginal e validoAte no mesmo ciclo gera uma única linha (0.123ms)
✔ montarExtratoDoCiclo: reposição já cobrada gera linha zero sem inflar o total (0.2924ms)
✔ montarExtratoDoCiclo: reposição não cobrável fora do ciclo traz nota de ciclo anterior (0.1884ms)
✔ calcularCicloVigente ajusta dia 31 em mês curto (1.062ms)
✔ calcularCicloVigente cruza o fim de ano corretamente (0.1212ms)
✔ calcularCicloVigente usa fechamentoMesCheio em vez de diaVencimento (0.1164ms)
✔ calcularTotalAulasCobradas respeita piso zero para ajuste negativo (0.0767ms)
✔ calcularValorTotalCiclo ignora contagem quando metodoCobranca == valor_fixo (0.1172ms)
✔ filtrarHistoricoExcluindoCicloAtual remove o ciclo vigente e preserva ciclos anteriores (0.2771ms)
✔ encerrarCicloSobrepostoSeNecessario fecha o ciclo anterior antes do início do novo ciclo (0.1762ms)
✔ getHorarioPadraoFim usa +60 minutos em horário normal (0.6042ms)
✔ getHorarioPadraoFim formata +60 minutos mesmo quando o relógio vira meia-noite (0.0764ms)
✔ adicionarDiasISO soma dia em virada de mês e de ano usando UTC explícito (0.6052ms)
✔ montarEventoGoogle mantém start em D e end em D+1 quando horarioFim default cruza a meia-noite (0.6896ms)
✔ montarEventoGoogle mantém start e end no mesmo dia em aula normal (0.1505ms)
✔ montarEventoGoogle cruza para o dia seguinte quando horarioFim explícito é menor que o início (0.1082ms)
✔ montarEventoGoogle não transforma duração zero em evento de 24 horas (0.0943ms)
✔ montarTituloEvento combina objetivo e nome (0.0624ms)
✔ montarTituloEvento usa apenas objetivo quando não há nome (0.0795ms)
✔ montarTituloEvento usa fallback por tipo quando objetivo e nome não existem (0.103ms)
✔ montarTituloEvento trata tipo reposicao com nome do aluno (0.0657ms)
✔ resolverDataISO converte ISO e PT-BR e rejeita entrada inválida (0.1825ms)
✔ isAppOwnedEvent reconhece evento do app, externo e sem extendedProperties (0.0871ms)
✔ classificarEventoDeLeitura ignora evento sem id (0.0583ms)
✔ classificarEventoDeLeitura ignora evento do app mesmo quando está cancelado (0.055ms)
✔ classificarEventoDeLeitura remove evento externo cancelado (0.049ms)
✔ classificarEventoDeLeitura faz upsert de evento externo ativo sem extendedProperties (0.0399ms)
✔ atualizarAgendamento enriquece o payload do Google com alunoNome e objetivo antes do update (0.8049ms)
✔ montarRecurrence gera RRULE semanal com BYDAY, INTERVAL e UNTIL em UTC (0.2886ms)
✔ montarRecurrence monta COUNT e monthOfDate sem combinar UNTIL (0.1123ms)
✔ montarRecurrence devolve null para agendamento avulso ou com dia inválido (0.0599ms)
✔ montarRecurrence devolve null quando a data de início é inválida (0.092ms)
✔ count de recorrencia inclui excecoes sem reduzir a contagem (9.4387ms)
✔ montarPayloadGCal preserva campos de recorrência e mantém a whitelist fechada (0.2917ms)
✔ montarRecurrence gera EXDATE com hora e TZID para evento cronometrado e data para dia inteiro (0.159ms)
✔ montarEventoGoogle inclui recurrence em serie e omite quando avulso (0.1278ms)
✔ POST cria reposicao com status pendente e validoAte derivado (1.5068ms)
✔ POST rejeita payload com validoAte ou cicloCobrancaResolvido (0.1319ms)
✔ PATCH move reposicao para agendada e grava agendamentoReposicaoId (0.3242ms)
✔ PATCH com agendamentoReposicaoId inexistente responde 400 (0.1498ms)
✔ calcularAulasContadasDoCiclo não conta agendamento com reposicaoId (0.1606ms)
✔ calcularPrazoReposicao aplica piso para 2026-07-27 com fechamentoMesCheio (0.2519ms)
✔ PATCH com agendamentoReposicaoId inexistente retorna 400 (0.6573ms)
✔ POST com id de reposicao pendente ja existente retorna 409 e mantem contagem 1 (0.3337ms)
✔ apos reagendar com cobravel false, cicloCobrancaResolvido guarda a janela do ciclo do agendamento e dataOriginal permanece original (0.867ms)
✔ envio de instancia de serie cria reposicao pendente e nao cria agendamento (1.1245ms)
✔ se a persistencia do agendamento falhar, o patch nao e enviado (0.159ms)
✔ reposição pendente com validoAte no ciclo mostra prazo na nota (1.3501ms)
✔ reposição pendente com validoAte nulo mantém nota antiga (0.1275ms)
✔ invariante de fechamento: valorTotal do extrato não muda entre prazo preenchido e nulo (10.0829ms)
✔ reposição expirada com validoAte dentro do ciclo usa ramo expirado (0.1322ms)
✔ PRAZO_MINIMO_REPOSICAO_DIAS deve ser 7 (0.5687ms)
✔ Aluno sem ciclo configurado retorna prazo nulo (1.0508ms)
✔ dataOriginal inválida retorna prazo nulo (0.1319ms)
✔ dataOriginal nula retorna prazo nulo (0.08ms)
✔ Fechamento mensal: data no começo do mês usa fim do mesmo ciclo (0.1388ms)
✔ Fechamento mensal: data a 2 dias do fim do mês aplica piso para o próximo ciclo (0.1226ms)
✔ Fechamento mensal: exatamente 7 dias do fim do ciclo não aplica piso (0.1136ms)
✔ Fechamento mensal: data a 1 dia do fim do ciclo aplica piso (0.112ms)
✔ Dia de vencimento: data no meio do ciclo usa fim do ciclo atual (0.1399ms)
✔ Dia de vencimento: data a 2 dias do fim do ciclo aplica piso (0.1574ms)
✔ Dia de vencimento: exatamente 7 dias do fim do ciclo não aplica piso (0.1002ms)
✔ Virada de ano: piso em dezembro aponta para janeiro do ano seguinte (0.1003ms)
✔ Virada de ano: sem piso em data inicial do mês preservar ciclo do mês atual (0.074ms)
✔ Determinismo: mesma dataOriginal e aluno produzem o mesmo prazo em duas chamadas (0.1171ms)
✔ Determinismo: resultado não depende da data do sistema, apenas da dataOriginal (0.1077ms)
✔ Aceita dataOriginal em formato Date object com a mesma regra (0.0923ms)
✔ Aluno com objetivo Consultoria Online e ciclo definido calcula prazo do mês (0.0763ms)
ℹ tests 74
ℹ suites 0
ℹ pass 74
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 833.9041
```

## 6. O que encontrei e não alterei

- Mantive `montarRespostaFalhaGcal` intocado, porque a regra do negócio especifica que o backend deve continuar respondendo `200` quando o Mongo gravou e a Google falhou.
- Também não alterei a camada de fetch nem o contrato `apiFetchBackend`; a mudança foi apenas no cliente para ler o corpo da resposta e exibir um aviso de forma agregada.
- Não introduzi retry ou fila, porque esse item era exclusivamente a visibilidade da falha e não a recuperação da sincronização.
