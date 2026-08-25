# Item 3 — instrumentação dos gatilhos (commit 3)

## Saída do portão

```text
cd E:\Projetos\GIT\personalapp
git branch --show-current
feat/log-plus
git status --short
 M assets/js/cascade-sync-aluno.js
 M assets/js/modal-acao-slot.js
 M assets/js/modal-agendamento.js
 M assets/js/view-alunos.js
git log --oneline -6
fdc6d13 feat: migrate storage logging
20510fb feat: add logger module
94dcfa5 feat: add initial spec for Google Calendar synchronization
a7fcb25 Merge pull request #27 from ichipalumbo/new/reposicao-feature
ea26f67 merge: incorpora main, mantém new/reposicao-feature como vencedor nos conflitos
502a9af docs: c4.1b — spec de reposicoes v3, roadmap 0.9, regra de implementacao unica
Select-String -Path assets\js\*.js -Pattern "console." -SimpleMatch | Measure-Object | Select-Object -ExpandProperty Count
21
cd backend
npm test

> personal-api@1.0.0 test
> node --test

✔ calcularAulasContadasDoCiclo: agendamento com reposicaoId não entra na parcela (A) (0.5712ms)
✔ calcularAulasContadasDoCiclo: reposição cobrável pendente conta na parcela (B) (0.1784ms)
✔ calcularAulasContadasDoCiclo: reposição não cobrável só conta quando cicloCobrancaResolvido.inicio bate (0.0955ms)
✔ montarExtratoDoCiclo: ciclo simples fecha com valorTotalCiclo (13ms)
✔ montarExtratoDoCiclo: ciclo com ajuste manual negativo fecha com valorTotalCiclo (0.3521ms)
✔ montarExtratoDoCiclo: reposição cobrável de origem fecha com valorTotalCiclo (0.2561ms)
✔ montarExtratoDoCiclo: cobrável expirada com dataOriginal e validoAte no mesmo ciclo gera uma única linha (0.129ms)
✔ montarExtratoDoCiclo: reposição já cobrada gera linha zero sem inflar o total (0.2858ms)
✔ montarExtratoDoCiclo: reposição não cobrável fora do ciclo traz nota de ciclo anterior (0.159ms)
✔ calcularCicloVigente ajusta dia 31 em mês curto (1.0273ms)
✔ calcularCicloVigente cruza o fim de ano corretamente (0.1158ms)
✔ calcularCicloVigente usa fechamentoMesCheio em vez de diaVencimento (0.0997ms)
✔ calcularTotalAulasCobradas respeita piso zero para ajuste negativo (0.0721ms)
✔ calcularValorTotalCiclo ignora contagem quando metodoCobranca == valor_fixo (0.0972ms)
✔ filtrarHistoricoExcluindoCicloAtual remove o ciclo vigente e preserva ciclos anteriores (0.2939ms)
✔ encerrarCicloSobrepostoSeNecessario fecha o ciclo anterior antes do início do novo ciclo (0.1653ms)
✔ POST cria reposicao com status pendente e validoAte derivado (1.3487ms)
✔ POST rejeita payload com validoAte ou cicloCobrancaResolvido (0.1495ms)
✔ PATCH move reposicao para agendada e grava agendamentoReposicaoId (0.3352ms)
✔ PATCH com agendamentoReposicaoId inexistente responde 400 (0.1651ms)
✔ calcularAulasContadasDoCiclo não conta agendamento com reposicaoId (0.174ms)
✔ calcularPrazoReposicao aplica piso para 2026-07-27 com fechamentoMesCheio (0.2446ms)
✔ PATCH com agendamentoReposicaoId inexistente retorna 400 (0.6206ms)
✔ POST com id de reposicao pendente ja existente retorna 409 e mantem contagem 1 (0.2499ms)
✔ apos reagendar com cobravel false, cicloCobrancaResolvido guarda a janela do ciclo do agendamento e dataOriginal permanece original (0.6129ms)
✔ envio de instancia de serie cria reposicao pendente e nao cria agendamento (0.8954ms)
✔ se a persistencia do agendamento falhar, o patch nao e enviado (0.1397ms)
✔ reposição pendente com validoAte no ciclo mostra prazo na nota (1.4155ms)
✔ reposição pendente com validoAte nulo mantém nota antiga (0.1146ms)
✔ invariante de fechamento: valorTotal do extrato não muda entre prazo preenchido e nulo (9.7365ms)
✔ reposição expirada com validoAte dentro do ciclo usa ramo expirado (0.1311ms)
✔ PRAZO_MINIMO_REPOSICAO_DIAS deve ser 7 (0.5674ms)
✔ Aluno sem ciclo configurado retorna prazo nulo (1.0425ms)
✔ dataOriginal inválida retorna prazo nulo (0.1243ms)
✔ dataOriginal nula retorna prazo nulo (0.0794ms)
✔ Fechamento mensal: data no começo do mês usa fim do mesmo ciclo (0.1635ms)
✔ Fechamento mensal: data a 2 dias do fim do mês aplica piso para o próximo ciclo (0.137ms)
✔ Fechamento mensal: exatamente 7 dias do fim do ciclo não aplica piso (0.0976ms)
✔ Fechamento mensal: data a 1 dia do fim do ciclo aplica piso (0.1035ms)
✔ Dia de vencimento: data no meio do ciclo usa fim do ciclo atual (0.1406ms)
✔ Dia de vencimento: data a 2 dias do fim do ciclo aplica piso (0.145ms)
✔ Dia de vencimento: exatamente 7 dias do fim do ciclo não aplica piso (0.1178ms)
✔ Virada de ano: piso em dezembro aponta para janeiro do ano seguinte (0.0922ms)
✔ Virada de ano: sem piso em data inicial do mês preservar ciclo do mês atual (0.0754ms)
✔ Determinismo: mesma dataOriginal e aluno produzem o mesmo prazo em duas chamadas (0.086ms)
✔ Determinismo: resultado não depende da data do sistema, apenas da dataOriginal (0.0896ms)
✔ Aceita dataOriginal em formato Date object com a mesma regra (0.0778ms)
✔ Aluno com objetivo Consultoria Online e ciclo definido calcula prazo do mês (0.066ms)
ℹ tests 48
ℹ suites 0
ℹ pass 48
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 292.7963
```

## Git diff --stat

```text
assets/js/cascade-sync-aluno.js | 44 ++++++++++++++++++++++++++--------------
assets/js/modal-acao-slot.js    | 45 ++++++++++++++++++++++++++++++++++++++++-
assets/js/modal-agendamento.js  | 22 ++++++++++++++++++++
assets/js/view-alunos.js        | 16 ++++++++++++++-
4 files changed, 110 insertions(+), 17 deletions(-)
```

## O que mudou

- Adicionei logs de sucesso em `assets/js/modal-agendamento.js` para criação de aula avulsa, série recorrente e bloqueio.
- Adicionei logs em `assets/js/modal-acao-slot.js` para edição de série com escopo, criação de reposição, rollback com motivo, exceção adicionada ao agendamento, instância cancelada e série excluída.
- Adicionei logs de criação/edição de aluno em `assets/js/view-alunos.js` e mantive o trigger de cascade sincronizado apenas após a confirmação de sucesso.
- Ajustei `assets/js/cascade-sync-aluno.js` para emitir o resumo do cascade em `info` e preservar a lógica de sincronização e enriquecimento sem mexer no fluxo de negócio.
- Mantive o escopo estritamente em console/logging: nenhuma condição, retorno ou regra de negócio foi alterada em `modal-acao-slot.js`, `storage.js` e `cascade-sync-aluno.js`.

## Lista completa de gatilhos instrumentados

| Arquivo | Evento | Nível |
| --- | --- | --- |
| `assets/js/modal-agendamento.js` | `Aula avulsa criada` | `info` |
| `assets/js/modal-agendamento.js` | `Série criada` | `info` |
| `assets/js/modal-agendamento.js` | `Bloqueio criado` | `info` |
| `assets/js/modal-acao-slot.js` | `Edição de série aplicada` | `info` |
| `assets/js/modal-acao-slot.js` | `Reposição criada` | `info` |
| `assets/js/modal-acao-slot.js` | `Rollback disparado` | `warn` |
| `assets/js/modal-acao-slot.js` | `Exceção adicionada ao agendamento` | `info` |
| `assets/js/modal-acao-slot.js` | `Instância cancelada` | `info` |
| `assets/js/modal-acao-slot.js` | `Série excluída` | `info` |
| `assets/js/view-alunos.js` | `Aluno editado` | `info` |
| `assets/js/view-alunos.js` | `Aluno criado` | `info` |
| `assets/js/cascade-sync-aluno.js` | `Cascade concluído` | `info` |

## Saída de `node --check`

```text
node --check .\assets\js\logger.js
# exit code 0
node --check .\assets\js\storage.js
# exit code 0
node --check .\assets\js\modal-acao-slot.js
# exit code 0
node --check .\assets\js\modal-agendamento.js
# exit code 0
node --check .\assets\js\view-alunos.js
# exit code 0
node --check .\assets\js\cascade-sync-aluno.js
# exit code 0
```

## `npm test`

```text
cd backend
npm test
# 48 pass, 0 fail
```
