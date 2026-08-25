# Item 1 — módulo de log (commit 1)

## Saída do portão

```text
cd E:\Projetos\GIT\personalapp
git branch --show-current
feat/log-plus
git status --short

git log --oneline -6
94dcfa5 feat: add initial spec for Google Calendar synchronization
a7fcb25 Merge pull request #27 from ichipalumbo/new/reposicao-feature
ea26f67 merge: incorpora main, mantém new/reposicao-feature como vencedor nos conflitos
502a9af docs: c4.1b — spec de reposicoes v3, roadmap 0.9, regra de implementacao unica
41b48c3 Merge pull request #25 from ichipalumbo/wip-c4-1a-fix
b625412 wip: c4.1a-fix
Select-String -Path assets\js\*.js -Pattern "console." -SimpleMatch | Measure-Object | Select-Object -ExpandProperty Count
44
Test-Path assets\js\logger.js
False
cd backend
npm test

> personal-api@1.0.0 test
> node --test

✔ calcularAulasContadasDoCiclo: agendamento com reposicaoId não entra na parcela (A) (0.6042ms)
✔ calcularAulasContadasDoCiclo: reposição cobrável pendente conta na parcela (B) (0.1725ms)
✔ calcularAulasContadasDoCiclo: reposição não cobrável só conta quando cicloCobrancaResolvido.inicio bate (0.0948ms)
✔ montarExtratoDoCiclo: ciclo simples fecha com valorTotalCiclo (10.4291ms)
✔ montarExtratoDoCiclo: ciclo com ajuste manual negativo fecha com valorTotalCiclo (0.5210ms)
✔ montarExtratoDoCiclo: reposição cobrável de origem fecha com valorTotalCiclo (0.2789ms)
✔ montarExtratoDoCiclo: cobrável expirada com dataOriginal e validoAte no mesmo ciclo gera uma única linha (0.1068ms)
✔ montarExtratoDoCiclo: reposição já cobrada gera linha zero sem inflar o total (0.0934ms)
✔ montarExtratoDoCiclo: reposição não cobrável fora do ciclo traz nota de ciclo anterior (0.1648ms)
✔ calcularCicloVigente ajusta dia 31 em mês curto (1.0216ms)
✔ calcularCicloVigente cruza o fim de ano corretamente (0.8750ms)
✔ calcularCicloVigente usa fechamentoMesCheio em vez de diaVencimento (0.6724ms)
✔ calcularTotalAulasCobradas respeita piso zero para ajuste negativo (0.0877ms)
✔ calcularValorTotalCiclo ignora contagem quando metodoCobranca == valor_fixo (0.0960ms)
✔ filtrarHistoricoExcluindoCicloAtual remove o ciclo vigente e preserva ciclos anteriores (0.2169ms)
✔ encerrarCicloSobrepostoSeNecessario fecha o ciclo anterior antes do início do novo ciclo (0.1720ms)
✔ POST cria reposicao com status pendente e validoAte derivado (1.7701ms)
✔ POST rejeita payload com validoAte ou cicloCobrancaResolvido (0.1472ms)
✔ PATCH move reposicao para agendada e grava agendamentoReposicaoId (0.4073ms)
✔ PATCH com agendamentoReposicaoId inexistente responde 400 (0.0961ms)
✔ calcularAulasContadasDoCiclo não conta agendamento com reposicaoId (0.1492ms)
✔ calcularPrazoReposicao aplica piso para 2026-07-27 com fechamentoMesCheio (0.1078ms)
✔ PATCH com agendamentoReposicaoId inexistente retorna 400 (0.8827ms)
✔ POST com id de reposicao pendente ja existente retorna 409 e mantem contagem 1 (0.3161ms)
✔ apos reagendar com cobravel false, cicloCobrancaResolvido guarda a janela do ciclo do agendamento e dataOriginal permanece original (0.7851ms)
✔ envio de instancia de serie cria reposicao pendente e nao cria agendamento (0.8718ms)
✔ se a persistencia do agendamento falhar, o patch nao e enviado (0.1478ms)
✔ reposição pendente com validoAte no ciclo mostra prazo na nota (1.7461ms)
✔ reposição pendente com validoAte nulo mantém nota antiga (0.0965ms)
✔ invariante de fechamento: valorTotal do extrato não muda entre prazo preenchido e nulo (10.5754ms)
✔ reposição expirada com validoAte dentro do ciclo usa ramo expirado (0.1757ms)
✔ PRAZO_MINIMO_REPOSICAO_DIAS deve ser 7 (0.5832ms)
✔ Aluno sem ciclo configurado retorna prazo nulo (0.0790ms)
✔ dataOriginal inválida retorna prazo nulo (0.0801ms)
✔ dataOriginal nula retorna prazo nulo (0.0662ms)
✔ Fechamento mensal: data no começo do mês usa fim do mesmo ciclo (0.0975ms)
✔ Fechamento mensal: data a 2 dias do fim do mês aplica piso para o próximo ciclo (0.1123ms)
✔ Fechamento mensal: exatamente 7 dias do fim do ciclo não aplica piso (0.1014ms)
✔ Fechamento mensal: data a 1 dia do fim do ciclo aplica piso (0.1032ms)
✔ Dia de vencimento: data no meio do ciclo usa fim do ciclo atual (0.1184ms)
✔ Dia de vencimento: data a 2 dias do fim do ciclo aplica piso (0.1201ms)
✔ Dia de vencimento: exatamente 7 dias do fim do ciclo não aplica piso (0.0897ms)
✔ Virada de ano: piso em dezembro aponta para janeiro do ano seguinte (0.0960ms)
✔ Virada de ano: sem piso em data inicial do mês preservar ciclo do mês atual (0.0785ms)
✔ Determinismo: mesma dataOriginal e aluno produzem o mesmo prazo em duas chamadas (0.0917ms)
✔ Determinismo: resultado não depende da data do sistema, apenas da dataOriginal (0.0710ms)
✔ Aceita dataOriginal em formato Date object com a mesma regra (0.0915ms)
✔ Aluno com objetivo Consultoria Online e ciclo definido calcula prazo do mês (0.0734ms)
ℹ tests 48
ℹ suites 0
ℹ pass 48
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 300.7187
```

## Ordem real de carga dos scripts no HTML

```html
<div class="toast" id="toast"></div>

<script src="assets/js/logger.js"></script>

<!-- [1] Core State & Data -->
<script src="assets/js/state.js"></script>
<script src="assets/js/storage.js"></script>
```

Isso confirma que `window.log` existe antes de `state.js` e `storage.js`.

## O que mudou

- Criei `assets/js/logger.js` sem dependências, com `window.log` global.
- Mantive quatro níveis em ordem de severidade: `error`, `warn`, `info`, `debug`.
- Adicionei persistência em `localStorage` para `window.log.nivel` com fallback para `'info'`.
- Regisrei o script no HTML antes de `state.js` e `storage.js` para garantir que `window.log` exista no boot.
- Nenhuma regra de negócio foi alterada; a mudança ficou restrita à saída de console e à ordem de carregamento.

## Git diff --stat

```text
assets/js/logger.js | 110 ++++++++++++++++++++++++++++++++++++++++++++++++++++
 index.html          |   2 +
 2 files changed, 112 insertions(+)
```

## Node check

```text
node --check .\assets\js\logger.js
# exit code 0
```

## npm test

```text
cd backend
npm test
# 48 pass, 0 fail
```
