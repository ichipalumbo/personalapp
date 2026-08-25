# Relatório do Sync-Fix — Cascade — 2026-08-25

## 1. Portão de base

```text
cd E:\Projetos\GIT\personalapp
git branch --show-current
feat/gcal-sync
git status --short
git log --oneline -3
dd08846 fix: enrich GCal update payload from enrolled student
2dfa439 fix: remove redundant reposicao reload from POST helper
5d15517 fix: preserve recurrence fields in GCal payload
Select-String -Path .\assets\js\cascade-sync-aluno.js -Pattern "gcal.updateEvent" -SimpleMatch | Measure-Object | Select-Object -ExpandProperty Count
0
Select-String -Path .\assets\js\cascade-sync-aluno.js -Pattern "_atualizarAgendamentosNoGCal" -SimpleMatch | Measure-Object | Select-Object -ExpandProperty Count
0
cd backend
npm test

> personal-api@1.0.0 test
> node --test

✔ calcularAulasContadasDoCiclo: agendamento com reposicaoId não entra na parcela (A) (0.7656ms)
✔ calcularAulasContadasDoCiclo: reposição cobrável pendente conta na parcela (B) (0.3133ms)
✔ calcularAulasContadasDoCiclo: reposição não cobrável só conta quando cicloCobrancaResolvido.inicio bate (0.162ms)
✔ montarExtratoDoCiclo: ciclo simples fecha com valorTotalCiclo (13.723ms)
✔ montarExtratoDoCiclo: ciclo com ajuste manual negativo fecha com valorTotalCiclo (0.5168ms)
✔ montarExtratoDoCiclo: reposição cobrável de origem fecha com valorTotalCiclo (0.2752ms)
✔ montarExtratoDoCiclo: cobrável expirada com dataOriginal e validoAte no mesmo ciclo gera uma única linha (0.1823ms)
✔ montarExtratoDoCiclo: reposição já cobrada gera linha zero sem inflar o total (0.4874ms)
✔ montarExtratoDoCiclo: reposição não cobrável fora do ciclo traz nota de ciclo anterior (0.2108ms)
✔ calcularCicloVigente ajusta dia 31 em mês curto (1.4074ms)
✔ calcularCicloVigente cruza o fim de ano corretamente (0.196ms)
✔ calcularCicloVigente usa fechamentoMesCheio em vez de diaVencimento (0.1616ms)
✔ calcularTotalAulasCobradas respeita piso zero para ajuste negativo (0.1324ms)
✔ calcularValorTotalCiclo ignora contagem quando metodoCobranca == valor_fixo (0.154ms)
✔ filtrarHistoricoExcluindoCicloAtual remove o ciclo vigente e preserva ciclos anteriores (0.453ms)
✔ encerrarCicloSobrepostoSeNecessario fecha o ciclo anterior antes do início do novo ciclo (0.2902ms)
✔ getHorarioPadraoFim usa +60 minutos em horário normal (0.6017ms)
✔ getHorarioPadraoFim formata +60 minutos mesmo quando o relógio vira meia-noite (0.0738ms)
✔ adicionarDiasISO soma dia em virada de mês e de ano usando UTC explícito (0.617ms)
✔ montarEventoGoogle mantém start em D e end em D+1 quando horarioFim default cruza a meia-noite (0.7147ms)
✔ montarEventoGoogle mantém start e end no mesmo dia em aula normal (0.1598ms)
✔ montarEventoGoogle cruza para o dia seguinte quando horarioFim explícito é menor que o início (0.1123ms)
✔ montarEventoGoogle não transforma duração zero em evento de 24 horas (0.0908ms)
✔ montarTituloEvento combina objetivo e nome (0.0631ms)
✔ montarTituloEvento usa apenas objetivo quando não há nome (0.0794ms)
✔ montarTituloEvento usa fallback por tipo quando objetivo e nome não existem (0.1006ms)
✔ montarTituloEvento trata tipo reposicao com nome do aluno (0.0672ms)
✔ resolverDataISO converte ISO e PT-BR e rejeita entrada inválida (0.2913ms)
✔ isAppOwnedEvent reconhece evento do app, externo e sem extendedProperties (0.0833ms)
✔ classificarEventoDeLeitura ignora evento sem id (0.0592ms)
✔ classificarEventoDeLeitura ignora evento do app mesmo quando está cancelado (0.0626ms)
✔ classificarEventoDeLeitura remove evento externo cancelado (0.0421ms)
✔ classificarEventoDeLeitura faz upsert de evento externo ativo sem extendedProperties (0.0489ms)
✔ atualizarAgendamento enriquece o payload do Google com alunoNome e objetivo antes do update (0.7524ms)
✔ montarRecurrence gera RRULE semanal com BYDAY, INTERVAL e UNTIL em UTC (0.2826ms)
✔ montarRecurrence monta COUNT e monthOfDate sem combinar UNTIL (0.1087ms)
✔ montarRecurrence devolve null para agendamento avulso ou com dia inválido (0.0694ms)
✔ montarRecurrence devolve null quando a data de início é inválida (0.0928ms)
✔ count de recorrencia inclui excecoes sem reduzir a contagem (9.6419ms)
✔ montarPayloadGCal preserva campos de recorrência e mantém a whitelist fechada (0.3615ms)
✔ montarRecurrence gera EXDATE com hora e TZID para evento cronometrado e data para dia inteiro (0.168ms)
✔ montarEventoGoogle inclui recurrence em serie e omite quando avulso (0.1269ms)
✔ POST cria reposicao com status pendente e validoAte derivado (1.9335ms)
✔ POST rejeita payload com validoAte ou cicloCobrancaResolvido (0.1244ms)
✔ PATCH move reposicao para agendada e grava agendamentoReposicaoId (0.2879ms)
✔ PATCH com agendamentoReposicaoId inexistente responde 400 (0.1212ms)
✔ calcularAulasContadasDoCiclo não conta agendamento com reposicaoId (0.1468ms)
✔ calcularPrazoReposicao aplica piso para 2026-07-27 com fechamentoMesCheio (0.2516ms)
✔ PATCH com agendamentoReposicaoId inexistente retorna 400 (0.6573ms)
✔ POST com id de reposicao pendente ja existente retorna 409 e mantem contagem 1 (0.2794ms)
✔ apos reagendar com cobravel false, cicloCobrancaResolvido guarda a janela do ciclo do agendamento e dataOriginal permanece original (0.6412ms)
✔ envio de instancia de serie cria reposicao pendente e nao cria agendamento (1.1056ms)
✔ se a persistencia do agendamento falhar, o patch nao e enviado (0.1464ms)
✔ reposição pendente com validoAte no ciclo mostra prazo na nota (1.4067ms)
✔ reposição pendente com validoAte nulo mantém nota antiga (0.1571ms)
✔ invariante de fechamento: valorTotal do extrato não muda entre prazo preenchido e nulo (12.3878ms)
✔ reposição expirada com validoAte dentro do ciclo usa ramo expirado (0.1486ms)
✔ PRAZO_MINIMO_REPOSICAO_DIAS deve ser 7 (0.6878ms)
✔ Aluno sem ciclo configurado retorna prazo nulo (1.0092ms)
✔ dataOriginal inválida retorna prazo nulo (0.1405ms)
✔ dataOriginal nula retorna prazo nulo (0.0843ms)
✔ Fechamento mensal: data no começo do mês usa fim do mesmo ciclo (0.1586ms)
✔ Fechamento mensal: data a 2 dias do fim do mês aplica piso para o próximo ciclo (0.1616ms)
✔ Fechamento mensal: exatamente 7 dias do fim do ciclo não aplica piso (0.122ms)
✔ Fechamento mensal: data a 1 dia do fim do ciclo aplica piso (0.1284ms)
✔ Dia de vencimento: data no meio do ciclo usa fim do ciclo atual (0.1445ms)
✔ Dia de vencimento: data a 2 dias do fim do ciclo aplica piso (0.1496ms)
✔ Dia de vencimento: exatamente 7 dias do fim do ciclo não aplica piso (0.1464ms)
✔ Virada de ano: piso em dezembro aponta para janeiro do ano seguinte (0.1239ms)
✔ Virada de ano: sem piso em data inicial do mês preservar ciclo do mês atual (0.1003ms)
✔ Determinismo: mesma dataOriginal e aluno produzem o mesmo prazo em duas chamadas (0.1245ms)
✔ Determinismo: resultado não depende da data do sistema, apenas da dataOriginal (0.1155ms)
✔ Aceita dataOriginal em formato Date object com a mesma regra (0.1003ms)
✔ Aluno com objetivo Consultoria Online e ciclo definido calcula prazo do mês (0.0793ms)
ℹ tests 74
ℹ suites 0
ℹ pass 74
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 862.7254
```

## 2. Saída literal de `git diff --stat`

```text
 assets/js/cascade-sync-aluno.js | 51 +++--------------------------------------
 1 file changed, 3 insertions(+), 48 deletions(-)
```

## 3. O que mudou e por quê

- Removi `_atualizarAgendamentosNoGCal` de `assets/js/cascade-sync-aluno.js`.
- Removi o bloco que o chamava logo após `_persistirAgendamentosNoBackend` em `sincronizarAgendamentosDoAluno`.
- Ajustei os comentários do cabeçalho e da documentação da função para refletir que a cascata atual persiste em MongoDB e não tenta atualizar o Google Calendar diretamente no frontend.

Isso elimina a chamada morta a `window.gcal.updateEvent`, que não existe no objeto exposto em `assets/js/google-calendar.js`, e evita o erro no console sem alterar a etapa de persistência em backend.

## 4. Verificação de referências

Confirmei com `Select-String` que as referências sumiram:

- `gcal.updateEvent` ficou com contagem `0`.
- `_atualizarAgendamentosNoGCal` ficou com contagem `0`.

A lógica que permanece em `_persistirAgendamentosNoBackend` foi mantida intacta, como pedido; o fix foi apenas remover o código morto.

## 5. Tabela de mutação

Não havia teste automatizado para este item, então não apliquei a regra de mutação de revert em código de teste. O que confirmei foi a ausência de referência pela busca direta no arquivo, e a validação final do backend descartou regressão estrutural.

## 6. Saída do `npm test`

```text
> personal-api@1.0.0 test
> node --test

✔ calcularAulasContadasDoCiclo: agendamento com reposicaoId não entra na parcela (A) (0.7656ms)
✔ calcularAulasContadasDoCiclo: reposição cobrável pendente conta na parcela (B) (0.3133ms)
✔ calcularAulasContadasDoCiclo: reposição não cobrável só conta quando cicloCobrancaResolvido.inicio bate (0.162ms)
✔ montarExtratoDoCiclo: ciclo simples fecha com valorTotalCiclo (13.723ms)
✔ montarExtratoDoCiclo: ciclo com ajuste manual negativo fecha com valorTotalCiclo (0.5168ms)
✔ montarExtratoDoCiclo: reposição cobrável de origem fecha com valorTotalCiclo (0.2752ms)
✔ montarExtratoDoCiclo: cobrável expirada com dataOriginal e validoAte no mesmo ciclo gera uma única linha (0.1823ms)
✔ montarExtratoDoCiclo: reposição já cobrada gera linha zero sem inflar o total (0.4874ms)
✔ montarExtratoDoCiclo: reposição não cobrável fora do ciclo traz nota de ciclo anterior (0.2108ms)
✔ calcularCicloVigente ajusta dia 31 em mês curto (1.4074ms)
✔ calcularCicloVigente cruza o fim de ano corretamente (0.196ms)
✔ calcularCicloVigente usa fechamentoMesCheio em vez de diaVencimento (0.1616ms)
✔ calcularTotalAulasCobradas respeita piso zero para ajuste negativo (0.1324ms)
✔ calcularValorTotalCiclo ignora contagem quando metodoCobranca == valor_fixo (0.154ms)
✔ filtrarHistoricoExcluindoCicloAtual remove o ciclo vigente e preserva ciclos anteriores (0.453ms)
✔ encerrarCicloSobrepostoSeNecessario fecha o ciclo anterior antes do início do novo ciclo (0.2902ms)
✔ getHorarioPadraoFim usa +60 minutos em horário normal (0.6017ms)
✔ getHorarioPadraoFim formata +60 minutos mesmo quando o relógio vira meia-noite (0.0738ms)
✔ adicionarDiasISO soma dia em virada de mês e de ano usando UTC explícito (0.617ms)
✔ montarEventoGoogle mantém start em D e end em D+1 quando horarioFim default cruza a meia-noite (0.7147ms)
✔ montarEventoGoogle mantém start e end no mesmo dia em aula normal (0.1598ms)
✔ montarEventoGoogle cruza para o dia seguinte quando horarioFim explícito é menor que o início (0.1123ms)
✔ montarEventoGoogle não transforma duração zero em evento de 24 horas (0.0908ms)
✔ montarTituloEvento combina objetivo e nome (0.0631ms)
✔ montarTituloEvento usa apenas objetivo quando não há nome (0.0794ms)
✔ montarTituloEvento usa fallback por tipo quando objetivo e nome não existem (0.1006ms)
✔ montarTituloEvento trata tipo reposicao com nome do aluno (0.0672ms)
✔ resolverDataISO converte ISO e PT-BR e rejeita entrada inválida (0.2913ms)
✔ isAppOwnedEvent reconhece evento do app, externo e sem extendedProperties (0.0833ms)
✔ classificarEventoDeLeitura ignora evento sem id (0.0592ms)
✔ classificarEventoDeLeitura ignora evento do app mesmo quando está cancelado (0.0626ms)
✔ classificarEventoDeLeitura remove evento externo cancelado (0.0421ms)
✔ classificarEventoDeLeitura faz upsert de evento externo ativo sem extendedProperties (0.0489ms)
✔ atualizarAgendamento enriquece o payload do Google com alunoNome e objetivo antes do update (0.7524ms)
✔ montarRecurrence gera RRULE semanal com BYDAY, INTERVAL e UNTIL em UTC (0.2826ms)
✔ montarRecurrence monta COUNT e monthOfDate sem combinar UNTIL (0.1087ms)
✔ montarRecurrence devolve null para agendamento avulso ou com dia inválido (0.0694ms)
✔ montarRecurrence devolve null quando a data de início é inválida (0.0928ms)
✔ count de recorrencia inclui excecoes sem reduzir a contagem (9.6419ms)
✔ montarPayloadGCal preserva campos de recorrência e mantém a whitelist fechada (0.3615ms)
✔ montarRecurrence gera EXDATE com hora e TZID para evento cronometrado e data para dia inteiro (0.168ms)
✔ montarEventoGoogle inclui recurrence em serie e omite quando avulso (0.1269ms)
✔ POST cria reposicao com status pendente e validoAte derivado (1.9335ms)
✔ POST rejeita payload com validoAte ou cicloCobrancaResolvido (0.1244ms)
✔ PATCH move reposicao para agendada e grava agendamentoReposicaoId (0.2879ms)
✔ PATCH com agendamentoReposicaoId inexistente responde 400 (0.1212ms)
✔ calcularAulasContadasDoCiclo não conta agendamento com reposicaoId (0.1468ms)
✔ calcularPrazoReposicao aplica piso para 2026-07-27 com fechamentoMesCheio (0.2516ms)
✔ PATCH com agendamentoReposicaoId inexistente retorna 400 (0.6573ms)
✔ POST com id de reposicao pendente ja existente retorna 409 e mantem contagem 1 (0.2794ms)
✔ apos reagendar com cobravel false, cicloCobrancaResolvido guarda a janela do ciclo do agendamento e dataOriginal permanece original (0.6412ms)
✔ envio de instancia de serie cria reposicao pendente e nao cria agendamento (1.1056ms)
✔ se a persistencia do agendamento falhar, o patch nao e enviado (0.1464ms)
✔ reposição pendente com validoAte no ciclo mostra prazo na nota (1.4067ms)
✔ reposição pendente com validoAte nulo mantém nota antiga (0.1571ms)
✔ invariante de fechamento: valorTotal do extrato não muda entre prazo preenchido e nulo (12.3878ms)
✔ reposição expirada com validoAte dentro do ciclo usa ramo expirado (0.1486ms)
✔ PRAZO_MINIMO_REPOSICAO_DIAS deve ser 7 (0.6878ms)
✔ Aluno sem ciclo configurado retorna prazo nulo (1.0092ms)
✔ dataOriginal inválida retorna prazo nulo (0.1405ms)
✔ dataOriginal nula retorna prazo nulo (0.0843ms)
✔ Fechamento mensal: data no começo do mês usa fim do mesmo ciclo (0.1586ms)
✔ Fechamento mensal: data a 2 dias do fim do mês aplica piso para o próximo ciclo (0.1616ms)
✔ Fechamento mensal: exatamente 7 dias do fim do ciclo não aplica piso (0.122ms)
✔ Fechamento mensal: data a 1 dia do fim do ciclo aplica piso (0.1284ms)
✔ Dia de vencimento: data no meio do ciclo usa fim do ciclo atual (0.1445ms)
✔ Dia de vencimento: data a 2 dias do fim do ciclo aplica piso (0.1496ms)
✔ Dia de vencimento: exatamente 7 dias do fim do ciclo não aplica piso (0.1464ms)
✔ Virada de ano: piso em dezembro aponta para janeiro do ano seguinte (0.1239ms)
✔ Virada de ano: sem piso em data inicial do mês preservar ciclo do mês atual (0.1003ms)
✔ Determinismo: mesma dataOriginal e aluno produzem o mesmo prazo em duas chamadas (0.1245ms)
✔ Determinismo: resultado não depende da data do sistema, apenas da dataOriginal (0.1155ms)
✔ Aceita dataOriginal em formato Date object com a mesma regra (0.1003ms)
✔ Aluno com objetivo Consultoria Online e ciclo definido calcula prazo do mês (0.0793ms)
ℹ tests 74
ℹ suites 0
ℹ pass 74
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 862.7254
```

## 7. O que encontrei e não alterei

- `_persistirAgendamentosNoBackend` foi mantido, porque a etapa de persistência em MongoDB já era a rota correta e não faz parte deste dead-code removal.
- O código antigo de GCal no frontend foi removido, mas o backend de sincronização continua sendo o caminho real do sistema.
- Não foi alterado qualquer comportamento de criação, edição ou remoção de agendamento fora do trecho apagado.
