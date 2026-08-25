# Item 1 — módulo de log

## Saída do portão

- Branch: `feat/log-plus`
- Árvore: limpa antes do início da rodada.
- `gcalSyncFailed` em `storage.js`: 14
- `_respostaVirtual` em `storage.js`: 3
- `_mutouExcecoes` em `modal-acao-slot.js`: 3
- `updateEvent` em `cascade-sync-aluno.js`: 0
- `enriquecerAgendamentoComAluno` no controller: 4
- `tipoRecorrencia` whitelist presente
- `logger.js`: ausente antes da implementação
- `npm test` (backend): 74 passando, 0 falhas

## Ordem de carga no HTML

No arquivo `index.html`, o carregamento fica assim:

```html
<script src="assets/js/logger.js"></script>
<script src="assets/js/storage.js"></script>
```

A ordem garante que `window.log` exista antes de `storage.js` executar.

## O que mudou

- Criei `assets/js/logger.js` com quatro níveis: `error`, `warn`, `info`, `debug`.
- Exponho `window.log` no escopo global.
- `window.log.nivel` lê e persiste no `localStorage` com chave `personal_app_log_nivel`.
- A API inclui `log.error()`, `log.warn()`, `log.info()`, `log.debug()` e `log.grupo()`.
- O logger nunca lança; qualquer falha é engolida para não quebrar o app.
- O script foi registrado no HTML antes dos demais scripts do app.

## Git diff --stat

```text
$ git diff --stat HEAD~1
 assets/js/logger.js         |  92 ++++++++++++++++++++++++++++++++++++++++++++++
 index.html                  |   1 +
 docs/_reports/2026-08-25-log-fix-modulo.md |  1 +
```

## node --check

```text
$ node --check .\assets\js\logger.js
```

Resultado: OK.

## npm test

```text
$ cd backend
$ npm test
74 passing, 0 failing
```
