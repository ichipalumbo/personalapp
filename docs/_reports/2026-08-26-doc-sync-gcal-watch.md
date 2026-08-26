# Relatório — doc-sync GCal-Watch + Log-Fix

## Portão de base

```powershell
cd E:\Projetos\GIT\personalapp
git branch --show-current
git status --short
Test-Path assets\js\logger.js
Select-String -Path backend\src\services\gcalSyncService.js -Pattern "isBloqueioDentroDaJanela" | Measure-Object | Select-Object -ExpandProperty Count
Select-String -Path backend\src\services\gcalSyncService.js -Pattern "shouldRenewWebhookChannel" | Measure-Object | Select-Object -ExpandProperty Count
Select-String -Path assets\js\app\bootstrap.js -Pattern "gcalWatchCheckDisparado" | Measure-Object | Select-Object -ExpandProperty Count
```

Resultado observado:

```text
docs/sync-gcal-watch
 M docs/contexto-personalapp-para-novas-conversas.md
 M docs/roadmap.md
 M docs/specs/gcal-sync.md
 M docs/specs/reposicoes-e-competencia.md
True
2
2
3
```

Observação: o portão foi validado antes da edição documental; a árvore ficou limpa somente no início da tarefa, e foi modificada somente nos arquivos autorizados desta documentação.

## Git diff contra `main`

```powershell
cd E:\Projetos\GIT\personalapp
git diff --stat main -- backend/
git diff --stat main -- assets/
git diff --stat main -- index.html
```

Resultado observado:

```text
# sem saída
# sem saída
# sem saída
```

Os diffs de código em `backend/`, `assets/` e `index.html` permaneceram vazios, conforme a regra do documento.

## Arquivos alterados e seções documentadas

### `docs/specs/gcal-sync.md`
- Bump de versão e data no cabeçalho.
- Documentação do comportamento real de renovação ativa do canal do webhook do Google Calendar.
- Registro da janela de 24 horas em `shouldRenewWebhookChannel`, do `channels.stop` defensivo e do `syncConnection` imediato após renovação.
- Registro do single-flight por `ownerEmail` e do limite de processo/serverless.
- Documentação do purge do full sync com janela, preservação de bloqueios fora da janela e retorno defensivo sem delete quando a janela é inválida.
- Registro do gatilho em `assets/js/app/bootstrap.js`, do guard `gcalWatchCheckDisparado` e do botão manual de diagnóstico.
- Estado de validação em produção e débito técnico pendente da consolidação do triplo disparo no boot.

### `docs/specs/reposicoes-e-competencia.md`
- Ajuste do cabeçalho de status para refletir implementação mergeada e validada em produção.
- Registro da divergência de implementação de `calcularPrazoReposicao` como débito técnico.
- Marcação da caixinha 9.5 como pendente, não entregue.
- Observação do ramo morto no POST de reposição (`cicloCobrancaResolvido`).
- Manutenção da regra de negócio e da classificação de extrato; não houve mudança de regra.

### `docs/roadmap.md`
- Item de sincronização do Google Calendar marcado como concluído, com ressalva da validação em 02/09/2026.
- Inclusão de itens abertos sem prioridade atribuída para: consolidação da sincronização tripla no boot, alargamento da janela do full sync, deduplicação de `calcularPrazoReposicao` e implementação da caixinha 9.5.

### `docs/contexto-personalapp-para-novas-conversas.md`
- Atualização da convenção de log: `window.log` como padrão para `assets/js/` e exceções explícitas de `console.*`.
- Registro do requisito de renovação ativa do canal do Google Calendar, do endpoint e do gatilho de boot/botão manual.
- Manutenção do tom e da estrutura geral do arquivo sem reescrever seções não alteradas.

## Saída do `npm test`

```powershell
cd E:\Projetos\GIT\personalapp
cd backend
npm test
```

Resultado observado:

```text
> personal-api@1.0.0 test
> node --test

✔ ...
✔ ...
...
ℹ tests 84
ℹ suites 0
ℹ pass 84
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 14289.6028
```

Conclusão: suíte sem falhas, com 84 testes passando e 0 falhas.
