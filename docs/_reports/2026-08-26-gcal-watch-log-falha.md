# GCal Watch — fechamento do ponto cego do log de falha

## Saída do portão

```powershell
cd E:\Projetos\GIT\personalapp
git branch --show-current
git status --short
Select-String -Path assets\js\google-calendar.js -Pattern "channel_valid" -SimpleMatch
Select-String -Path assets\js\storage.js -Pattern "gcalSyncFailed" | Measure-Object | Select-Object -ExpandProperty Count
Test-Path assets\js\logger.js
git diff --stat main -- backend/
```

Resultado:

```text
fix/gcal-watch-log-falha
 M assets/js/google-calendar.js

assets\js\google-calendar.js:71:            } else if (!renewed && reason === 'channel_valid' && window.log && typeof 
window.log.debug === 'function') {
assets\js\google-calendar.js:73:            } else if (!renewed && reason !== 'channel_valid' && window.log && typeof 
window.log.warn === 'function') {
14
True
```

Observação: `git diff --stat main -- backend/` saiu vazio, como exigido; não houve alteração em backend.

## O que mudou

Em `_verificarCanalGoogleCalendar`, faltava o caso em que o backend devolve `renewed: false` com `reason` diferente de `channel_valid`. Antes, esse payload era ignorado porque o frontend só tratava:

- `renewed === true` -> `info`
- `renewed === false && reason === 'channel_valid'` -> `debug`

O backend pode responder HTTP 200 mesmo quando a renovação falha de verdade, por exemplo com `reason: 'renewal_failed'` e `error`. Esse cenário caía no encadeamento e não emitia log nenhum.

O reparo adicionou o ramo final em `warn`, preservando os ramos existentes e mantendo o mesmo padrão defensivo:

- prefixo `[gcal]`
- guarda `window.log && typeof window.log.warn === 'function'`
- inclui `reason` e `error` quando vierem no payload
- não altera o retorno da função nem o `catch` de erro de rede
- não toca em backend

## Trecho antes e depois

Antes:

```js
if (renewed && window.log && typeof window.log.info === 'function') {
    window.log.info('[gcal]', 'Canal renovado', {
        reason,
        synced,
        activeItems: Number(payload.activeItems || 0),
        cancelledItems: Number(payload.cancelledItems || 0)
    });
} else if (!renewed && reason === 'channel_valid' && window.log && typeof window.log.debug === 'function') {
    window.log.debug('[gcal]', 'Canal ainda válido, nada a fazer', { reason });
}
```

Depois:

```js
if (renewed && window.log && typeof window.log.info === 'function') {
    window.log.info('[gcal]', 'Canal renovado', {
        reason,
        synced,
        activeItems: Number(payload.activeItems || 0),
        cancelledItems: Number(payload.cancelledItems || 0)
    });
} else if (!renewed && reason === 'channel_valid' && window.log && typeof window.log.debug === 'function') {
    window.log.debug('[gcal]', 'Canal ainda válido, nada a fazer', { reason });
} else if (!renewed && reason !== 'channel_valid' && window.log && typeof window.log.warn === 'function') {
    const logPayload = { reason };
    if (payload.error) {
        logPayload.error = payload.error;
    }
    window.log.warn('[gcal]', 'Falha ao verificar/renovar o canal do Google Calendar.', logPayload);
}
```

## Git diff --stat

```text
$ git diff --stat -- assets/js/google-calendar.js
assets/js/google-calendar.js | 6 ++++++
 1 file changed, 6 insertions(+)
```

## Validação

```powershell
cd E:\Projetos\GIT\personalapp
node --check .\assets\js\google-calendar.js
git diff --stat main -- backend/
cd backend
npm test
```

Resultado do `npm test`:

```text
> personal-api@1.0.0 test
> node --test

✔ ...
ℹ tests 84
ℹ suites 0
ℹ pass 84
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 841.3517
```

Conclusão: a correção é isolada no frontend, mantém a API de backend intacta e deixa a suíte em 84/84 com 0 falhas.
