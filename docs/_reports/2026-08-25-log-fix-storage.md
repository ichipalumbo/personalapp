# Item 2 — migração de `storage.js` e corte de ruído (commit 2)

## Saída do portão

```text
cd E:\Projetos\GIT\personalapp
git branch --show-current
feat/log-plus
git status --short
M  assets/js/storage.js
git log --oneline -6
20510fb feat: add logger module
94dcfa5 feat: add initial spec for Google Calendar synchronization
a7fcb25 Merge pull request #27 from ichipalumbo/new/reposicao-feature
ea26f67 merge: incorpora main, mantém new/reposicao-feature como vencedor nos conflitos
502a9af docs: c4.1b — spec de reposicoes v3, roadmap 0.9, regra de implementacao unica
41b48c3 Merge pull request #25 from ichipalumbo/wip-c4-1a-fix
node --check .\assets\js\logger.js
node --check .\assets\js\storage.js
cd backend
npm test

> personal-api@1.0.0 test
> node --test

✔ calcularAulasContadasDoCiclo: agendamento com reposicaoId não entra na parcela (A) (0.8015ms)
✔ calcularAulasContadasDoCiclo: reposição cobrável pendente conta na parcela (B) (0.2057ms)
✔ calcularAulasContadasDoCiclo: reposição não cobrável só conta quando cicloCobrancaResolvido.inicio bate (0.1038ms)
✔ montarExtratoDoCiclo: ciclo simples fecha com valorTotalCiclo (10.8324ms)
✔ montarExtratoDoCiclo: ciclo com ajuste manual negativo fecha com valorTotalCiclo (0.4932ms)
✔ montarExtratoDoCiclo: reposição cobrável de origem fecha com valorTotalCiclo (0.1843ms)
✔ montarExtratoDoCiclo: cobrável expirada com dataOriginal e validoAte no mesmo ciclo gera uma única linha (0.1284ms)
✔ montarExtratoDoCiclo: reposição já cobrada gera linha zero sem inflar o total (0.2971ms)
✔ montarExtratoDoCiclo: reposição não cobrável fora do ciclo traz nota de ciclo anterior (0.2084ms)
✔ calcularCicloVigente ajusta dia 31 em mês curto (2.1158ms)
✔ calcularCicloVigente cruza o fim de ano corretamente (0.1514ms)
✔ calcularCicloVigente usa fechamentoMesCheio em vez de diaVencimento (0.1204ms)
✔ calcularTotalAulasCobradas respeita piso zero para ajuste negativo (0.1157ms)
✔ calcularValorTotalCiclo ignora contagem quando metodoCobranca == valor_fixo (0.1118ms)
✔ filtrarHistoricoExcluindoCicloAtual remove o ciclo vigente e preserva ciclos anteriores (0.3646ms)
✔ encerrarCicloSobrepostoSeNecessario fecha o ciclo anterior antes do início do novo ciclo (0.1892ms)
✔ POST cria reposicao com status pendente e validoAte derivado (2.1358ms)
✔ POST rejeita payload com validoAte ou cicloCobrancaResolvido (0.1295ms)
✔ PATCH move reposicao para agendada e grava agendamentoReposicaoId (0.3208ms)
✔ PATCH com agendamentoReposicaoId inexistente responde 400 (0.122ms)
✔ calcularAulasContadasDoCiclo não conta agendamento com reposicaoId (0.2098ms)
✔ calcularPrazoReposicao aplica piso para 2026-07-27 com fechamentoMesCheio (0.3605ms)
✔ PATCH com agendamentoReposicaoId inexistente retorna 400 (0.6405ms)
✔ POST com id de reposicao pendente ja existente retorna 409 e mantem contagem 1 (0.3900ms)
✔ apos reagendar com cobravel false, cicloCobrancaResolvido guarda a janela do ciclo do agendamento e dataOriginal permanece original (0.9223ms)
✔ envio de instancia de serie cria reposicao pendente e nao cria agendamento (1.1892ms)
✔ se a persistencia do agendamento falhar, o patch nao e enviado (0.1462ms)
✔ reposição pendente com validoAte no ciclo mostra prazo na nota (2.3486ms)
✔ reposição pendente com validoAte nulo mantém nota antiga (0.1549ms)
✔ invariante de fechamento: valorTotal do extrato não muda entre prazo preenchido e nulo (11.4393ms)
✔ reposição expirada com validoAte dentro do ciclo usa ramo expirado (0.1267ms)
✔ PRAZO_MINIMO_REPOSICAO_DIAS deve ser 7 (0.5946ms)
✔ Aluno sem ciclo configurado retorna prazo nulo (1.3086ms)
✔ dataOriginal inválida retorna prazo nulo (0.1772ms)
✔ dataOriginal nula retorna prazo nulo (0.1090ms)
✔ Fechamento mensal: data no começo do mês usa fim do mesmo ciclo (0.1838ms)
✔ Fechamento mensal: data a 2 dias do fim do mês aplica piso para o próximo ciclo (0.1289ms)
✔ Fechamento mensal: exatamente 7 dias do fim do ciclo não aplica piso (0.0958ms)
✔ Fechamento mensal: data a 1 dia do fim do ciclo aplica piso (0.1069ms)
✔ Dia de vencimento: data no meio do ciclo usa fim do ciclo atual (0.1410ms)
✔ Dia de vencimento: data a 2 dias do fim do ciclo aplica piso (0.1585ms)
✔ Dia de vencimento: exatamente 7 dias do fim do ciclo não aplica piso (0.1047ms)
✔ Virada de ano: piso em dezembro aponta para janeiro do ano seguinte (0.0923ms)
✔ Virada de ano: sem piso em data inicial do mês preservar ciclo do mês atual (0.0704ms)
✔ Determinismo: mesma dataOriginal e aluno produzem o mesmo prazo em duas chamadas (0.0847ms)
✔ Determinismo: resultado não depende da data do sistema, apenas da dataOriginal (0.0876ms)
✔ Aceita dataOriginal em formato Date object com a mesma regra (0.0774ms)
✔ Aluno com objetivo Consultoria Online e ciclo definido calcula prazo do mês (0.0647ms)
ℹ tests 48
ℹ suites 0
ℹ pass 48
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 341.1218
```

## O que mudou

- Migrei as 23 chamadas de `console` de `assets/js/storage.js` para `window.log`, respeitando os níveis pedidos.
- Mantive falhas em `error`, sessão expirada e `gcalSyncFailed` em `warn`, marcos de sincronização em `info` e payloads/contagens internas em `debug`.
- Reescrevi o resumo de aulas carregadas para `info` com contagem de `total`, `series`, `avulsas` e `externos`.
- O array completo de aulas foi movido para um `log.grupo(...)` colapsado em `debug`, mantendo a carga legível em `info`.
- Não alterei condições, retornos ou a lógica de `carregarDados`, `salvarDados` e nem `_sincronizarAgendamentosViaCRUD`.

## Git diff --stat

```text
assets/js/storage.js | 52 +++++++++++++++++++++++++++++++++++++---------------
 1 file changed, 37 insertions(+), 15 deletions(-)
```

## Saída de `node --check`

```text
node --check .\assets\js\logger.js
# exit code 0
node --check .\assets\js\storage.js
# exit code 0
```

## `npm test`

```text
cd backend
npm test
# 48 pass, 0 fail
```
