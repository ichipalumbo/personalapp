# Item 2 — migrar storage.js e cortar o ruído

## Saída do portão

- Branch: `feat/log-plus`
- Árvore: limpa antes do início do item.
- `gcalSyncFailed` em `storage.js`: 14
- `_respostaVirtual` em `storage.js`: 3
- `_mutouExcecoes` em `modal-acao-slot.js`: 3
- `updateEvent` em `cascade-sync-aluno.js`: 0
- `enriquecerAgendamentoComAluno` no controller: 4
- `tipoRecorrencia` whitelist presente
- `npm test` (backend): 74 passando, 0 falhas

## O que mudou

- Removi o ruído de `console.*` em `assets/js/storage.js` para `window.log` com severidade correta.
- Mantive as condições e fluxos intactos; só troquei a saída de console.
- Substituí o dump completo de aulas por resumo em `info` + grupo colapsado em `debug`.
- Mantive os `console.debug` do Aviso-Fix no nível correto, sem alterar mensagens ou condições.

## Git diff --stat

```text
 assets/js/storage.js | 59 ++++++++++++++++++++++++++++++++--------------------
 1 file changed, 36 insertions(+), 23 deletions(-)
```

## node --check

```text
$ node --check .\assets\js\storage.js
OK
```

## npm test

```text
$ cd backend
$ npm test
74 passing, 0 failing
```
