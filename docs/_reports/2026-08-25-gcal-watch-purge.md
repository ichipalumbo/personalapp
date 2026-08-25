# Relatório do item 1 — purge do full sync e janela segura

## 1. Portão de base

```text
cd E:\Projetos\GIT\personalapp
git branch --show-current
feat/gcal-watch
git status --short

Select-String -Path backend\src\services\gcalSyncService.js -Pattern "channelExpiration" | Measure-Object | Select-Object -ExpandProperty Count
2
Select-String -Path backend\src\services\gcalSyncService.js -Pattern "if (!connection.syncToken)" -SimpleMatch
backend\src\services\gcalSyncService.js:858:  if (!connection.syncToken) {
cd backend
npm test

> personal-api@1.0.0 test
> node --test
...
ℹ tests 79
ℹ pass 79
ℹ fail 0
```

## 2. O que mudou

- `listCalendarEvents` agora devolve `timeMin` e `timeMax` quando o modo é full sync e `null` em modo incremental.
- `persistSyncResults` só executa purge do full sync se houver janela válida de consulta.
- o delete agora respeita a mesma janela consultada, preservando registros fora dela.
- se a janela estiver ausente ou inválida, o serviço faz `return` defensivo e registra warning em log.
- a comparação usa o campo `BloqueioExterno.data`, que no schema é armazenado como `YYYY-MM-DD` via `normalizarDataParaISO`.

### Formato real do campo `data` em `BloqueioExterno`

O model em `backend/src/models/BloqueioExterno.js` grava `data` como string normalizada:

```js
const BloqueioExternoSchema = new mongoose.Schema({
  data: { type: String, set: (value) => normalizedOrOriginal(value, normalizarDataParaISO) }
});
```

Isso faz `BloqueioExterno.data` ficar no formato real `YYYY-MM-DD` (por exemplo `2026-08-15`). A comparação no full sync foi feita assim:

```js
const dataBloqueio = extrairDataISOValida(bloqueio.data);
const timeMin = extrairDataISOValida(janela.timeMin);
const timeMax = extrairDataISOValida(janela.timeMax);

return dataBloqueio >= timeMin && dataBloqueio <= timeMax;
```

Em outras palavras, somente registros `data` dentro da janela da consulta entram no purge.

## 3. Saída de `git diff --stat`

```text
backend/src/services/gcalSyncService.js |  95 ++++++++++++++++-
backend/test/gcal-sync.test.js          | 177 ++++++++++++++++++++++++++++++++
2 files changed, 267 insertions(+), 5 deletions(-)
```

## 4. Tabela de mutação

| Etapa | Ação | Resultado |
| --- | --- | --- |
| 1 | Reaplicação do patch da janela | `node --test test/gcal-sync.test.js` passa |
| 2 | Revert de uma linha: remoção do guard `if (!isBloqueioDentroDaJanela(...))` | 2 testes falham, mostrando que fora da janela o purge deletava dados legítimos |
| 3 | `git checkout -- backend/src/services/gcalSyncService.js` | arquivo restaurado ao estado anterior da falha |
| 4 | Reaplicação final do patch | suíte volta para `79 pass / 0 fail` |

## 5. Saída do `npm test`

```text
> personal-api@1.0.0 test
> node --test

✔ full sync não apaga bloqueio local fora da janela consultada
✔ full sync apaga bloqueio local dentro da janela que não veio do remoto
✔ sync incremental não dispara purge por varredura
✔ janela ausente ou inválida não dispara delete em full sync
...
ℹ tests 79
ℹ pass 79
ℹ fail 0
ℹ duration_ms 875.5014
```
