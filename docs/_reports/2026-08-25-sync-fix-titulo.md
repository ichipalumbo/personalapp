# Relatório do Sync-Fix — Título do evento — 2026-08-25

## 1. Portão de base

```text
cd E:\Projetos\GIT\personalapp
git branch --show-current
feat/gcal-sync
git status --short
 M backend/src/controllers/agendamentoController.js
 M backend/test/gcal-sync.test.js
git log --oneline -3
2dfa439 fix: remove redundant reposicao reload from POST helper
5d15517 fix: preserve recurrence fields in GCal payload
3759a17 docs: close GCal and reposição doc fixes
Select-String -Path .\backend\src\controllers\agendamentoController.js -Pattern "enriquecerAgendamentoComAluno" -SimpleMatch | Measure-Object | Select-Object -ExpandProperty Count
4
Select-String -Path .\assets\js\cascade-sync-aluno.js -Pattern "gcal.updateEvent" -SimpleMatch | Measure-Object | Select-Object -ExpandProperty Count
1
cd backend
npm test

> personal-api@1.0.0 test
> node --test

✔ calcularAulasContadasDoCiclo: agendamento com reposicaoId não entra na parcela (A) (0.6831ms)
✔ calcularAulasContadasDoCiclo: reposição cobrável pendente conta na parcela (B) (0.2726ms)
✔ calcularAulasContadasDoCiclo: reposição não cobrável só conta quando cicloCobrancaResolvido.inicio bate (0.1023ms)
✔ montarExtratoDoCiclo: ciclo simples fecha com valorTotalCiclo (10.633ms)
✔ montarExtratoDoCiclo: ciclo com ajuste manual negativo fecha com valorTotalCiclo (0.2879ms)
✔ montarExtratoDoCiclo: reposição cobrável de origem fecha com valorTotalCiclo (0.1917ms)
✔ montarExtratoDoCiclo: cobrável expirada com dataOriginal e validoAte no mesmo ciclo gera uma única linha (0.1593ms)
✔ montarExtratoDoCiclo: reposição já cobrada gera linha zero sem inflar o total (0.3649ms)
✔ montarExtratoDoCiclo: reposição não cobrável fora do ciclo traz nota de ciclo anterior (0.2097ms)
✔ calcularCicloVigente ajusta dia 31 em mês curto (1.207ms)
✔ calcularCicloVigente cruza o fim de ano corretamente (0.1415ms)
✔ calcularCicloVigente usa fechamentoMesCheio em vez de diaVencimento (0.1663ms)
✔ calcularTotalAulasCobradas respeita piso zero para ajuste negativo (0.0868ms)
✔ calcularValorTotalCiclo ignora contagem quando metodoCobranca == valor_fixo (0.1359ms)
✔ filtrarHistoricoExcluindoCicloAtual remove o ciclo vigente e preserva ciclos anteriores (0.3816ms)
✔ encerrarCicloSobrepostoSeNecessario fecha o ciclo anterior antes do início do novo ciclo (0.2597ms)
✔ getHorarioPadraoFim usa +60 minutos em horário normal (0.5834ms)
✔ getHorarioPadraoFim formata +60 minutos mesmo quando o relógio vira meia-noite (0.0707ms)
✔ adicionarDiasISO soma dia em virada de mês e de ano usando UTC explícito (0.5945ms)
✔ montarEventoGoogle mantém start em D e end em D+1 quando horarioFim default cruza a meia-noite (0.6715ms)
✔ montarEventoGoogle mantém start e end no mesmo dia em aula normal (0.1451ms)
✔ montarEventoGoogle cruza para o dia seguinte quando horarioFim explícito é menor que o início (0.1038ms)
✔ montarEventoGoogle não transforma duração zero em evento de 24 horas (0.0842ms)
✔ montarTituloEvento combina objetivo e nome (0.0625ms)
✔ montarTituloEvento usa apenas objetivo quando não há nome (0.0817ms)
✔ montarTituloEvento usa fallback por tipo quando objetivo e nome não existem (0.1026ms)
✔ montarTituloEvento trata tipo reposicao com nome do aluno (0.0633ms)
✔ resolverDataISO converte ISO e PT-BR e rejeita entrada inválida (0.1767ms)
✔ isAppOwnedEvent reconhece evento do app, externo e sem extendedProperties (0.0822ms)
✔ classificarEventoDeLeitura ignora evento sem id (0.057ms)
✔ classificarEventoDeLeitura ignora evento do app mesmo quando está cancelado (0.0555ms)
✔ classificarEventoDeLeitura remove evento externo cancelado (0.048ms)
✔ classificarEventoDeLeitura faz upsert de evento externo ativo sem extendedProperties (0.0331ms)
✔ atualizarAgendamento enriquece o payload do Google com alunoNome e objetivo antes do update (0.7693ms)
✔ montarRecurrence gera RRULE semanal com BYDAY, INTERVAL e UNTIL em UTC (0.2909ms)
✔ montarRecurrence monta COUNT e monthOfDate sem combinar UNTIL (0.1036ms)
✔ montarRecurrence devolve null para agendamento avulso ou com dia inválido (0.0566ms)
✔ montarRecurrence devolve null quando a data de início é inválida (0.0896ms)
✔ count de recorrencia inclui excecoes sem reduzir a contagem (9.4683ms)
✔ montarPayloadGCal preserva campos de recorrência e mantém a whitelist fechada (0.2799ms)
✔ montarRecurrence gera EXDATE com hora e TZID para evento cronometrado e data para dia inteiro (0.1589ms)
✔ montarEventoGoogle inclui recurrence em serie e omite quando avulso (0.1282ms)
✔ POST cria reposicao com status pendente e validoAte derivado (1.4917ms)
✔ POST rejeita payload com validoAte ou cicloCobrancaResolvido (0.1197ms)
✔ PATCH move reposicao para agendada e grava agendamentoReposicaoId (0.2688ms)
✔ PATCH com agendamentoReposicaoId inexistente responde 400 (0.1357ms)
✔ calcularAulasContadasDoCiclo não conta agendamento com reposicaoId (0.1494ms)
✔ calcularPrazoReposicao aplica piso para 2026-07-27 com fechamentoMesCheio (0.2479ms)
✔ PATCH com agendamentoReposicaoId inexistente retorna 400 (0.6146ms)
✔ POST com id de reposicao pendente ja existente retorna 409 e mantem contagem 1 (0.2656ms)
✔ apos reagendar com cobravel false, cicloCobrancaResolvido guarda a janela do ciclo do agendamento e dataOriginal permanece original (0.6622ms)
✔ envio de instancia de serie cria reposicao pendente e nao cria agendamento (0.9585ms)
✔ se a persistencia do agendamento falhar, o patch nao e enviado (0.1593ms)
✔ reposição pendente com validoAte no ciclo mostra prazo na nota (1.6577ms)
✔ reposição pendente com validoAte nulo mantém nota antiga (0.1506ms)
✔ invariante de fechamento: valorTotal do extrato não muda entre prazo preenchido e nulo (11.3757ms)
✔ reposição expirada com validoAte dentro do ciclo usa ramo expirado (0.1845ms)
✔ PRAZO_MINIMO_REPOSICAO_DIAS deve ser 7 (0.5717ms)
✔ Aluno sem ciclo configurado retorna prazo nulo (1.1231ms)
✔ dataOriginal inválida retorna prazo nulo (0.1172ms)
✔ dataOriginal nula retorna prazo nulo (0.0986ms)
✔ Fechamento mensal: data no começo do mês usa fim do mesmo ciclo (0.172ms)
✔ Fechamento mensal: data a 2 dias do fim do mês aplica piso para o próximo ciclo (0.116ms)
✔ Fechamento mensal: exatamente 7 dias do fim do ciclo não aplica piso (0.1021ms)
✔ Fechamento mensal: data a 1 dia do fim do ciclo aplica piso (0.1153ms)
✔ Dia de vencimento: data no meio do ciclo usa fim do ciclo atual (0.1478ms)
✔ Dia de vencimento: data a 2 dias do fim do ciclo aplica piso (0.1612ms)
✔ Dia de vencimento: exatamente 7 dias do fim do ciclo não aplica piso (0.1016ms)
✔ Virada de ano: piso em dezembro aponta para janeiro do ano seguinte (0.1185ms)
✔ Virada de ano: sem piso em data inicial do mês preservar ciclo do mês atual (0.0748ms)
✔ Determinismo: mesma dataOriginal e aluno produzem o mesmo prazo em duas chamadas (0.0914ms)
✔ Determinismo: resultado não depende da data do sistema, apenas da dataOriginal (0.0914ms)
✔ Aceita dataOriginal em formato Date object com a mesma regra (0.0789ms)
✔ Aluno com objetivo Consultoria Online e ciclo definido calcula prazo do mês (0.0738ms)
ℹ tests 74
ℹ suites 0
ℹ pass 74
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 829.2157
```

## 2. Saída literal de `git diff --stat`

```text
 backend/src/controllers/agendamentoController.js |  9 +--
 backend/test/gcal-sync.test.js                   | 78 ++++++++++++++++++++++++
 2 files changed, 83 insertions(+), 4 deletions(-)
```

## 3. O que mudou e por quê

- Ajustei `atualizarAgendamento` em `backend/src/controllers/agendamentoController.js` para enriquecer o objeto que vai para o Google com `enriquecerAgendamentoComAluno(ownerEmail, atualizadoParaGCalBase)` antes de chamar `montarPayloadGCal`.
- Mantive a resposta HTTP do PUT intacta: o retorno do endpoint continua usando `atualizadoParaGCalBase`, que é o documento salvo no Mongo, sem persistir `alunoNome` e `objetivo` nele.
- Adicionei um teste em `backend/test/gcal-sync.test.js` que prova que o payload do Google chega com `alunoNome` e `objetivo` e que `montarTituloEvento` produz `Hipertrofia - João` em vez de `Aula`.

## 4. Tabela de mutação

| Etapa | Ação | Resultado |
| --- | --- | --- |
| 1 | Removi a linha crítica da correção e executei o teste | falhou com `'' !== 'João'`, provando que o enriquecimento era necessário |
| 2 | Restaurei o arquivo com `git checkout -- backend/src/controllers/agendamentoController.js` | o teste ficou vermelho, confirmando a regressão |
| 3 | Reapliquei a correção | o teste voltou a verde |

## 5. Decisão sobre persistir os campos

Não implementei a persistência de `alunoNome` e `objetivo` no `Agendamento`.

A causa raiz é real: esses campos não são armazenados no documento do Mongo e, por isso, o Google recebe uma cópia enriquecida no momento do envio. Persistir isso na modelagem resolveria a classe completa do problema, mas mudaria a estrutura do documento e teria impacto em mais de um fluxo. Na prática, isso afetaria, no mínimo, a modelagem em `backend/src/models/Agendamento.js`, o caminho de criação e atualização do controller e qualquer código que dependa de `alunoNome`/`objetivo` em serialização ou UI. O risco principal é amplo: dados duplicados e potencialmente divergentes entre Mongo e Google, efeitos colaterais em cascade/finance e uma mudança de modelo maior do que a correção do bug de título.

Essa decisão fica como decisão de produto/modelo e não foi implementada nesta rodada.

## 6. Verificação do `patchAgendamento`

Também verifiquei `patchAgendamento`, e ele não publica no Google: ele apenas atualiza `googleCalendarEventId` no MongoDB e não passa por `montarPayloadGCal` nem por `enriquecerAgendamentoComAluno`. Como a instrução do item 1 foi não corrigir esse caminho nesta rodada, ele permaneceu sem alteração.

## 7. Saída do `npm test`

```text
> personal-api@1.0.0 test
> node --test

✔ calcularAulasContadasDoCiclo: agendamento com reposicaoId não entra na parcela (A) (0.6831ms)
✔ calcularAulasContadasDoCiclo: reposição cobrável pendente conta na parcela (B) (0.2726ms)
✔ calcularAulasContadasDoCiclo: reposição não cobrável só conta quando cicloCobrancaResolvido.inicio bate (0.1023ms)
✔ montarExtratoDoCiclo: ciclo simples fecha com valorTotalCiclo (10.633ms)
✔ montarExtratoDoCiclo: ciclo com ajuste manual negativo fecha com valorTotalCiclo (0.2879ms)
✔ montarExtratoDoCiclo: reposição cobrável de origem fecha com valorTotalCiclo (0.1917ms)
✔ montarExtratoDoCiclo: cobrável expirada com dataOriginal e validoAte no mesmo ciclo gera uma única linha (0.1593ms)
✔ montarExtratoDoCiclo: reposição já cobrada gera linha zero sem inflar o total (0.3649ms)
✔ montarExtratoDoCiclo: reposição não cobrável fora do ciclo traz nota de ciclo anterior (0.2097ms)
✔ calcularCicloVigente ajusta dia 31 em mês curto (1.207ms)
✔ calcularCicloVigente cruza o fim de ano corretamente (0.1415ms)
✔ calcularCicloVigente usa fechamentoMesCheio em vez de diaVencimento (0.1663ms)
✔ calcularTotalAulasCobradas respeita piso zero para ajuste negativo (0.0868ms)
✔ calcularValorTotalCiclo ignora contagem quando metodoCobranca == valor_fixo (0.1359ms)
✔ filtrarHistoricoExcluindoCicloAtual remove o ciclo vigente e preserva ciclos anteriores (0.3816ms)
✔ encerrarCicloSobrepostoSeNecessario fecha o ciclo anterior antes do início do novo ciclo (0.2597ms)
✔ getHorarioPadraoFim usa +60 minutos em horário normal (0.5834ms)
✔ getHorarioPadraoFim formata +60 minutos mesmo quando o relógio vira meia-noite (0.0707ms)
✔ adicionarDiasISO soma dia em virada de mês e de ano usando UTC explícito (0.5945ms)
✔ montarEventoGoogle mantém start em D e end em D+1 quando horarioFim default cruza a meia-noite (0.6715ms)
✔ montarEventoGoogle mantém start e end no mesmo dia em aula normal (0.1451ms)
✔ montarEventoGoogle cruza para o dia seguinte quando horarioFim explícito é menor que o início (0.1038ms)
✔ montarEventoGoogle não transforma duração zero em evento de 24 horas (0.0842ms)
✔ montarTituloEvento combina objetivo e nome (0.0625ms)
✔ montarTituloEvento usa apenas objetivo quando não há nome (0.0817ms)
✔ montarTituloEvento usa fallback por tipo quando objetivo e nome não existem (0.1026ms)
✔ montarTituloEvento trata tipo reposicao com nome do aluno (0.0633ms)
✔ resolverDataISO converte ISO e PT-BR e rejeita entrada inválida (0.1767ms)
✔ isAppOwnedEvent reconhece evento do app, externo e sem extendedProperties (0.0822ms)
✔ classificarEventoDeLeitura ignora evento sem id (0.057ms)
✔ classificarEventoDeLeitura ignora evento do app mesmo quando está cancelado (0.0555ms)
✔ classificarEventoDeLeitura remove evento externo cancelado (0.048ms)
✔ classificarEventoDeLeitura faz upsert de evento externo ativo sem extendedProperties (0.0331ms)
✔ atualizarAgendamento enriquece o payload do Google com alunoNome e objetivo antes do update (0.7693ms)
✔ montarRecurrence gera RRULE semanal com BYDAY, INTERVAL e UNTIL em UTC (0.2909ms)
✔ montarRecurrence monta COUNT e monthOfDate sem combinar UNTIL (0.1036ms)
✔ montarRecurrence devolve null para agendamento avulso ou com dia inválido (0.0566ms)
✔ montarRecurrence devolve null quando a data de início é inválida (0.0896ms)
✔ count de recorrencia inclui excecoes sem reduzir a contagem (9.4683ms)
✔ montarPayloadGCal preserva campos de recorrência e mantém a whitelist fechada (0.2799ms)
✔ montarRecurrence gera EXDATE com hora e TZID para evento cronometrado e data para dia inteiro (0.1589ms)
✔ montarEventoGoogle inclui recurrence em serie e omite quando avulso (0.1282ms)
✔ POST cria reposicao com status pendente e validoAte derivado (1.4917ms)
✔ POST rejeita payload com validoAte ou cicloCobrancaResolvido (0.1197ms)
✔ PATCH move reposicao para agendada e grava agendamentoReposicaoId (0.2688ms)
✔ PATCH com agendamentoReposicaoId inexistente responde 400 (0.1357ms)
✔ calcularAulasContadasDoCiclo não conta agendamento com reposicaoId (0.1494ms)
✔ calcularPrazoReposicao aplica piso para 2026-07-27 com fechamentoMesCheio (0.2479ms)
✔ PATCH com agendamentoReposicaoId inexistente retorna 400 (0.6146ms)
✔ POST com id de reposicao pendente ja existente retorna 409 e mantem contagem 1 (0.2656ms)
✔ apos reagendar com cobravel false, cicloCobrancaResolvido guarda a janela do ciclo do agendamento e dataOriginal permanece original (0.6622ms)
✔ envio de instancia de serie cria reposicao pendente e nao cria agendamento (0.9585ms)
✔ se a persistencia do agendamento falhar, o patch nao e enviado (0.1593ms)
✔ reposição pendente com validoAte no ciclo mostra prazo na nota (1.6577ms)
✔ reposição pendente com validoAte nulo mantém nota antiga (0.1506ms)
✔ invariante de fechamento: valorTotal do extrato não muda entre prazo preenchido e nulo (11.3757ms)
✔ reposição expirada com validoAte dentro do ciclo usa ramo expirado (0.1845ms)
✔ PRAZO_MINIMO_REPOSICAO_DIAS deve ser 7 (0.5717ms)
✔ Aluno sem ciclo configurado retorna prazo nulo (1.1231ms)
✔ dataOriginal inválida retorna prazo nulo (0.1172ms)
✔ dataOriginal nula retorna prazo nulo (0.0986ms)
✔ Fechamento mensal: data no começo do mês usa fim do mesmo ciclo (0.172ms)
✔ Fechamento mensal: data a 2 dias do fim do mês aplica piso para o próximo ciclo (0.116ms)
✔ Fechamento mensal: exatamente 7 dias do fim do ciclo não aplica piso (0.1021ms)
✔ Fechamento mensal: data a 1 dia do fim do ciclo aplica piso (0.1153ms)
✔ Dia de vencimento: data no meio do ciclo usa fim do ciclo atual (0.1478ms)
✔ Dia de vencimento: data a 2 dias do fim do ciclo aplica piso (0.1612ms)
✔ Dia de vencimento: exatamente 7 dias do fim do ciclo não aplica piso (0.1016ms)
✔ Virada de ano: piso em dezembro aponta para janeiro do ano seguinte (0.1185ms)
✔ Virada de ano: sem piso em data inicial do mês preservar ciclo do mês atual (0.0748ms)
✔ Determinismo: mesma dataOriginal e aluno produzem o mesmo prazo em duas chamadas (0.0914ms)
✔ Determinismo: resultado não depende da data do sistema, apenas da dataOriginal (0.0884ms)
✔ Aceita dataOriginal em formato Date object com a mesma regra (0.0789ms)
✔ Aluno com objetivo Consultoria Online e ciclo definido calcula prazo do mês (0.0738ms)
ℹ tests 74
ℹ suites 0
ℹ pass 74
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 829.2157
```

## 8. O que encontrei e não alterei

- O caminho de `patchAgendamento` não publica no Google e ficou fora do escopo desta correção.
- A decisão de persistir `alunoNome` e `objetivo` no modelo permanece fora do escopo, como pedido do dono do produto.
- O restante do sistema de sincronização está em conformidade com o comportamento atual e não foi alterado.
