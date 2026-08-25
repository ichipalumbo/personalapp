# Relatório do Excecao-Fix — 2026-08-25

## 1. Portão de base

```text
cd E:\Projetos\GIT\personalapp
git branch --show-current
feat/gcal-sync
git status --short
Select-String -Path assets\js\modal-acao-slot.js -Pattern "_mutouExcecoes" -SimpleMatch | Measure-Object | Select-Object -ExpandProperty Count
3
Select-String -Path assets\js\modal-acao-slot.js -Pattern "enviarParaReposicao" -SimpleMatch | Measure-Object | Select-Object -ExpandProperty Count
3
cd backend
npm test

> personal-api@1.0.0 test
> node --test

✔ calcularAulasContadasDoCiclo: agendamento com reposicaoId não entra na parcela (A) (0.8812ms)
✔ calcularAulasContadasDoCiclo: reposição cobrável pendente conta na parcela (B) (0.2943ms)
✔ calcularAulasContadasDoCiclo: reposição não cobrável só conta quando cicloCobrancaResolvido.inicio bate (0.1464ms)
✔ montarExtratoDoCiclo: ciclo simples fecha com valorTotalCiclo (15.27ms)
✔ montarExtratoDoCiclo: ciclo com ajuste manual negativo fecha com valorTotalCiclo (0.4278ms)
✔ montarExtratoDoCiclo: reposição cobrável de origem fecha com valorTotalCiclo (0.2354ms)
✔ montarExtratoDoCiclo: cobrável expirada com dataOriginal e validoAte no mesmo ciclo gera uma única linha (0.1845ms)
✔ montarExtratoDoCiclo: reposição já cobrada gera linha zero sem inflar o total (0.4329ms)
✔ montarExtratoDoCiclo: reposição não cobrável fora do ciclo traz nota de ciclo anterior (0.2346ms)
✔ calcularCicloVigente ajusta dia 31 em mês curto (1.4624ms)
✔ calcularCicloVigente cruza o fim de ano corretamente (0.1649ms)
✔ calcularCicloVigente usa fechamentoMesCheio em vez de diaVencimento (0.1325ms)
✔ calcularTotalAulasCobradas respeita piso zero para ajuste negativo (0.0961ms)
✔ calcularValorTotalCiclo ignora contagem quando metodoCobranca == valor_fixo (0.1232ms)
✔ filtrarHistoricoExcluindoCicloAtual remove o ciclo vigente e preserva ciclos anteriores (0.3755ms)
✔ encerrarCicloSobrepostoSeNecessario fecha o ciclo anterior antes do início do novo ciclo (0.2211ms)
✔ getHorarioPadraoFim usa +60 minutos em horário normal (0.5828ms)
✔ getHorarioPadraoFim formata +60 minutos mesmo quando o relógio vira meia-noite (0.0712ms)
✔ adicionarDiasISO soma dia em virada de mês e de ano usando UTC explícito (0.5929ms)
✔ montarEventoGoogle mantém start em D e end em D+1 quando horarioFim default cruza a meia-noite (0.6671ms)
✔ montarEventoGoogle mantém start e end no mesmo dia em aula normal (0.1508ms)
✔ montarEventoGoogle cruza para o dia seguinte quando horarioFim explícito é menor que o início (0.1074ms)
✔ montarEventoGoogle não transforma duração zero em evento de 24 horas (0.0867ms)
✔ montarTituloEvento combina objetivo e nome (0.0673ms)
✔ montarTituloEvento usa apenas objetivo quando não há nome (0.068ms)
✔ montarTituloEvento usa fallback por tipo quando objetivo e nome não existem (0.1073ms)
✔ montarTituloEvento trata tipo reposicao com nome do aluno (0.07ms)
✔ resolverDataISO converte ISO e PT-BR e rejeita entrada inválida (0.1797ms)
✔ isAppOwnedEvent reconhece evento do app, externo e sem extendedProperties (0.0859ms)
✔ classificarEventoDeLeitura ignora evento sem id (0.062ms)
✔ classificarEventoDeLeitura ignora evento do app mesmo quando está cancelado (0.0589ms)
✔ classificarEventoDeLeitura remove evento externo cancelado (0.0459ms)
✔ classificarEventoDeLeitura faz upsert de evento externo ativo sem extendedProperties (0.0396ms)
✔ montarRecurrence gera RRULE semanal com BYDAY, INTERVAL e UNTIL em UTC (0.3079ms)
✔ montarRecurrence monta COUNT e monthOfDate sem combinar UNTIL (0.1196ms)
✔ montarRecurrence devolve null para agendamento avulso ou com dia inválido (0.0588ms)
✔ montarRecurrence devolve null quando a data de início é inválida (0.0853ms)
✔ count de recorrencia inclui excecoes sem reduzir a contagem (9.5111ms)
✔ montarPayloadGCal preserva campos de recorrência e mantém a whitelist fechada (0.352ms)
✔ montarRecurrence gera EXDATE com hora e TZID para evento cronometrado e data para dia inteiro (0.1743ms)
✔ montarEventoGoogle inclui recurrence em serie e omite quando avulso (0.1326ms)
✔ POST cria reposicao com status pendente e validoAte derivado (1.8877ms)
✔ POST rejeita payload com validoAte ou cicloCobrancaResolvido (0.1179ms)
✔ PATCH move reposicao para agendada e grava agendamentoReposicaoId (0.2648ms)
✔ PATCH com agendamentoReposicaoId inexistente responde 400 (0.1124ms)
✔ calcularAulasContadasDoCiclo não conta agendamento com reposicaoId (0.1449ms)
✔ calcularPrazoReposicao aplica piso para 2026-07-27 com fechamentoMesCheio (0.2674ms)
✔ PATCH com agendamentoReposicaoId inexistente retorna 400 (1.0468ms)
✔ POST com id de reposicao pendente ja existente retorna 409 e mantem contagem 1 (0.3895ms)
✔ apos reagendar com cobravel false, cicloCobrancaResolvido guarda a janela do ciclo do agendamento e dataOriginal permanece original (0.8896ms)
✔ envio de instancia de serie cria reposicao pendente e nao cria agendamento (1.1196ms)
✔ se a persistencia do agendamento falhar, o patch nao e enviado (0.1419ms)
✔ reposição pendente com validoAte no ciclo mostra prazo na nota (2.6436ms)
✔ reposição pendente com validoAte nulo mantém nota antiga (0.1447ms)
✔ invariante de fechamento: valorTotal do extrato não muda entre prazo preenchido e nulo (10.413ms)
✔ reposição expirada com validoAte dentro do ciclo usa ramo expirado (0.153ms)
✔ PRAZO_MINIMO_REPOSICAO_DIAS deve ser 7 (0.7186ms)
✔ Aluno sem ciclo configurado retorna prazo nulo (1.3554ms)
✔ dataOriginal inválida retorna prazo nulo (0.1542ms)
✔ dataOriginal nula retorna prazo nulo (0.0948ms)
✔ Fechamento mensal: data no começo do mês usa fim do mesmo ciclo (0.169ms)
✔ Fechamento mensal: data a 2 dias do fim do mês aplica piso para o próximo ciclo (0.1407ms)
✔ Fechamento mensal: exatamente 7 dias do fim do ciclo não aplica piso (0.1398ms)
✔ Fechamento mensal: data a 1 dia do fim do ciclo aplica piso (0.1831ms)
✔ Dia de vencimento: data no meio do ciclo usa fim do ciclo atual (0.2057ms)
✔ Dia de vencimento: data a 2 dias do fim do ciclo aplica piso (0.2165ms)
✔ Dia de vencimento: exatamente 7 dias do fim do ciclo não aplica piso (0.1282ms)
✔ Virada de ano: piso em dezembro aponta para janeiro do ano seguinte (0.1359ms)
✔ Virada de ano: sem piso em data inicial do mês preservar ciclo do mês atual (0.0938ms)
✔ Determinismo: mesma dataOriginal e aluno produzem o mesmo prazo em duas chamadas (0.1377ms)
✔ Determinismo: resultado não depende da data do sistema, apenas da dataOriginal (0.1121ms)
✔ Aceita dataOriginal em formato Date object com a mesma regra (0.0988ms)
✔ Aluno com objetivo Consultoria Online e ciclo definido calcula prazo do mês (0.0861ms)
ℹ tests 73
ℹ suites 0
ℹ pass 73
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 842.9986
```

## 2. Saída literal de `git diff --stat`

```text
 assets/js/modal-acao-slot.js | 3 ---
 1 file changed, 3 deletions(-)
```

## 3. Abordagem escolhida no item 1

Escolhi remover o `carregarDados` de dentro de `enviarParaReposicao`.

Motivo: depois de verificar os dois chamadores, ambos já recarregam depois da persistência e não dependem do reload dentro da função de POST:

- `btnMandarParaReposicao` chama `enviarParaReposicao(...)`, faz `salvarEventoComGCal` ou `salvarDados()`, e depois executa `window.carregarDados(...)` e `window.inicializarHome()`.
- `btnReagendarInstancia` faz `await enviarParaReposicao(...)`, muta o objeto que está no array e depois faz `salvarDados(true)` e também recarrega no mesmo handler.

O efeito colateral no estado global da função POST era exatamente o que invalidava a referência viva antes da mutação. Sem esse reload, a referência permanece válida e a mutação em `compromisso.excecoes` pode ser serializada no array correto.

## 4. Verificação dos dois chamadores de `enviarParaReposicao`

### `btnMandarParaReposicao`

Local: `assets/js/modal-acao-slot.js` em torno de 964-1005.

O handler faz:

1. `const compromisso = obterCompromissoSelecionado();`
2. `const reposicao = await enviarParaReposicao(compromisso, dataAlvoISO, cobravel);`
3. busca o índice pelo id no array `aulas` e remove o objeto;
4. fecha modal;
5. salva via `salvarEventoComGCal` ou `salvarDados()`;
6. dispara `window.carregarDados(...)` e `window.inicializarHome()`.

Em outras palavras, ele não depende do reload interno de `enviarParaReposicao`; ele já recarrega por conta própria depois da persistência, e não mexe em `excecoes` no mesmo fluxo.

### `btnReagendarInstancia`

Local: `assets/js/modal-acao-slot.js` em torno de 1042-1100.

O handler faz:

1. `const compromisso = obterCompromissoSelecionado();`
2. `const reposicao = await enviarParaReposicao(compromisso, dataAlvoStr, cobravel);`
3. `compromisso.excecoes.push(dataAlvoStr)`;
4. `await salvarDados(true)`;
5. depois do save, `window.carregarDados(...)` e `window.inicializarHome()`.

Esse fluxo era o que quebrava a referência local: a função POST recarregava o estado antes da mutação, então o `compromisso` no handler deixava de apontar para o objeto presente no array.

## 5. Coerência do rollback do B2-Fix

O rollback do B2-Fix continua coerente após a mudança.

Ele continua funcionando como snapshot + restauração do array de `compromisso.excecoes` no `catch`, e o texto do comentário permanece correto:

- a reposição remota continua criada no servidor;
- a reversão local reconstitui a agenda local;
- o que foi corrigido aqui foi o problema de referência válida antes da mutação, não o comportamento do rollback em si.

Com o `carregarDados` removido do POST, o `compromisso` que entra em `btnReagendarInstancia` permanece vivo no array quando o `push` acontece, então o rollback restaura exatamente o que foi mutado.

## 6. Cobertura / teste

Não fiz teste automatizado.

Motivo: o comportamento está em um listener de DOM, usa `window`, `document` e o array global `aulas`; o repositório não possui um harness de browser para esse módulo e a extração para um módulo novo seria refatoração fora de escopo. O que seria necessário para cobrir de forma confiável seria:

- isolar a lógica em um módulo de domínio puro;
- injetar `window`/`aulas`/`salvarDados`/`carregarDados` em ambiente controlado;
- validar a presença/ausência da chamada em `window.carregarDados`.

Isso extrapola a correção de três linhas e viola a restrição de não reestruturar o handler.

## 7. Saída do `npm test`

```text
> personal-api@1.0.0 test
> node --test

✔ calcularAulasContadasDoCiclo: agendamento com reposicaoId não entra na parcela (A) (0.6471ms)
✔ calcularAulasContadasDoCiclo: reposição cobrável pendente conta na parcela (B) (0.2242ms)
✔ calcularAulasContadasDoCiclo: reposição não cobrável só conta quando cicloCobrancaResolvido.inicio bate (0.0993ms)
✔ montarExtratoDoCiclo: ciclo simples fecha com valorTotalCiclo (12.4472ms)
✔ montarExtratoDoCiclo: ciclo com ajuste manual negativo fecha com valorTotalCiclo (0.2967ms)
✔ montarExtratoDoCiclo: reposição cobrável de origem fecha com valorTotalCiclo (0.1993ms)
✔ montarExtratoDoCiclo: cobrável expirada com dataOriginal e validoAte no mesmo ciclo gera uma única linha (0.1341ms)
✔ montarExtratoDoCiclo: reposição já cobrada gera linha zero sem inflar o total (0.3138ms)
✔ montarExtratoDoCiclo: reposição não cobrável fora do ciclo traz nota de ciclo anterior (0.1573ms)
✔ calcularCicloVigente ajusta dia 31 em mês curto (1.1561ms)
✔ calcularCicloVigente cruza o fim de ano corretamente (0.1386ms)
✔ calcularCicloVigente usa fechamentoMesCheio em vez de diaVencimento (0.1269ms)
✔ calcularTotalAulasCobradas respeita piso zero para ajuste negativo (0.097ms)
✔ calcularValorTotalCiclo ignora contagem quando metodoCobranca == valor_fixo (0.113ms)
✔ filtrarHistoricoExcluindoCicloAtual remove o ciclo vigente e preserva ciclos anteriores (0.3145ms)
✔ encerrarCicloSobrepostoSeNecessario fecha o ciclo anterior antes do início do novo ciclo (0.1859ms)
✔ getHorarioPadraoFim usa +60 minutos em horário normal (0.6042ms)
✔ getHorarioPadraoFim formata +60 minutos mesmo quando o relógio vira meia-noite (0.076ms)
✔ adicionarDiasISO soma dia em virada de mês e de ano usando UTC explícito (0.5986ms)
✔ montarEventoGoogle mantém start em D e end em D+1 quando horarioFim default cruza a meia-noite (0.6901ms)
✔ montarEventoGoogle mantém start e end no mesmo dia em aula normal (0.1519ms)
✔ montarEventoGoogle cruza para o dia seguinte quando horarioFim explícito é menor que o início (0.1066ms)
✔ montarEventoGoogle não transforma duração zero em evento de 24 horas (0.0977ms)
✔ montarTituloEvento combina objetivo e nome (0.0676ms)
✔ montarTituloEvento usa apenas objetivo quando não há nome (0.0746ms)
✔ montarTituloEvento usa fallback por tipo quando objetivo e nome não existem (0.1177ms)
✔ montarTituloEvento trata tipo reposicao com nome do aluno (0.0714ms)
✔ resolverDataISO converte ISO e PT-BR e rejeita entrada inválida (0.1806ms)
✔ isAppOwnedEvent reconhece evento do app, externo e sem extendedProperties (0.0841ms)
✔ classificarEventoDeLeitura ignora evento sem id (0.0586ms)
✔ classificarEventoDeLeitura ignora evento do app mesmo quando está cancelado (0.0586ms)
✔ classificarEventoDeLeitura remove evento externo cancelado (0.0424ms)
✔ classificarEventoDeLeitura faz upsert de evento externo ativo sem extendedProperties (0.0335ms)
✔ montarRecurrence gera RRULE semanal com BYDAY, INTERVAL e UNTIL em UTC (0.3308ms)
✔ montarRecurrence monta COUNT e monthOfDate sem combinar UNTIL (0.131ms)
✔ montarRecurrence devolve null para agendamento avulso ou com dia inválido (0.0629ms)
✔ montarRecurrence devolve null quando a data de início é inválida (0.0922ms)
✔ count de recorrencia inclui excecoes sem reduzir a contagem (9.5505ms)
✔ montarPayloadGCal preserva campos de recorrência e mantém a whitelist fechada (0.4097ms)
✔ montarRecurrence gera EXDATE com hora e TZID para evento cronometrado e data para dia inteiro (0.1938ms)
✔ montarEventoGoogle inclui recurrence em serie e omite quando avulso (0.1395ms)
✔ POST cria reposicao com status pendente e validoAte derivado (1.8858ms)
✔ POST rejeita payload com validoAte ou cicloCobrancaResolvido (0.1648ms)
✔ PATCH move reposicao para agendada e grava agendamentoReposicaoId (0.4039ms)
✔ PATCH com agendamentoReposicaoId inexistente responde 400 (0.1682ms)
✔ calcularAulasContadasDoCiclo não conta agendamento com reposicaoId (0.2157ms)
✔ calcularPrazoReposicao aplica piso para 2026-07-27 com fechamentoMesCheio (0.3675ms)
✔ PATCH com agendamentoReposicaoId inexistente retorna 400 (1.0149ms)
✔ POST com id de reposicao pendente ja existente retorna 409 e mantem contagem 1 (0.3603ms)
✔ apos reagendar com cobravel false, cicloCobrancaResolvido guarda a janela do ciclo do agendamento e dataOriginal permanece original (0.9647ms)
✔ envio de instancia de serie cria reposicao pendente e nao cria agendamento (1.1618ms)
✔ se a persistencia do agendamento falhar, o patch nao e enviado (0.157ms)
✔ reposição pendente com validoAte no ciclo mostra prazo na nota (2.0408ms)
✔ reposição pendente com validoAte nulo mantém nota antiga (0.308ms)
✔ invariante de fechamento: valorTotal do extrato não muda entre prazo preenchido e nulo (11.0456ms)
✔ reposição expirada com validoAte dentro do ciclo usa ramo expirado (0.1447ms)
✔ PRAZO_MINIMO_REPOSICAO_DIAS deve ser 7 (0.5443ms)
✔ Aluno sem ciclo configurado retorna prazo nulo (1.1868ms)
✔ dataOriginal inválida retorna prazo nulo (0.1186ms)
✔ dataOriginal nula retorna prazo nulo (0.0752ms)
✔ Fechamento mensal: data no começo do mês usa fim do mesmo ciclo (0.1345ms)
✔ Fechamento mensal: data a 2 dias do fim do mês aplica piso para o próximo ciclo (0.109ms)
✔ Fechamento mensal: exatamente 7 dias do fim do ciclo não aplica piso (0.1041ms)
✔ Fechamento mensal: data a 1 dia do fim do ciclo aplica piso (0.1085ms)
✔ Dia de vencimento: data no meio do ciclo usa fim do ciclo atual (0.1407ms)
✔ Dia de vencimento: data a 2 dias do fim do ciclo aplica piso (0.1859ms)
✔ Dia de vencimento: exatamente 7 dias do fim do ciclo não aplica piso (0.103ms)
✔ Virada de ano: piso em dezembro aponta para janeiro do ano seguinte (0.0968ms)
✔ Virada de ano: sem piso em data inicial do mês preservar ciclo do mês atual (0.0726ms)
✔ Determinismo: mesma dataOriginal e aluno produzem o mesmo prazo em duas chamadas (0.0869ms)
✔ Determinismo: resultado não depende da data do sistema, apenas da dataOriginal (0.096ms)
✔ Aceita dataOriginal em formato Date object com a mesma regra (0.0689ms)
✔ Aluno com objetivo Consultoria Online e ciclo definido calcula prazo do mês (0.0743ms)
ℹ tests 73
ℹ suites 0
ℹ pass 73
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 881.0984
```

## 8. O que encontrei e não alterei por estar fora de escopo

- `montarRespostaFalhaGcal` continua respondendo `200` com `partialSuccess: true` quando o Google falha; isso é um defeito real, mas não faz parte desta correção.
- O delete da reposição remota no rollback continua fora de escopo; não foi implementado.
- O caminho de `btnMandarParaReposicao` continua com o objeto obsoleto sendo passado para `salvarEventoComGCal`, que é cosmético e foi explicitamente deixado intacto nesta rodada.
- `_agendamentosSaoIguais` não detectando a mudança quando o array local foi substituído continua sendo consequência do problema de referência, não a causa; não foi alterado.

