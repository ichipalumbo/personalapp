# Item 3 — instrumentar gatilhos

## Saída do portão

- Branch: `feat/log-plus`
- Árvore: limpa antes do item.
- `gcalSyncFailed` em `storage.js`: 14
- `_respostaVirtual` em `storage.js`: 3
- `_mutouExcecoes` em `modal-acao-slot.js`: 3
- `updateEvent` em `cascade-sync-aluno.js`: 0
- `enriquecerAgendamentoComAluno` no controller: 4
- `tipoRecorrencia` whitelist presente
- `logger.js`: presente e carregando antes do app
- `npm test` (backend): 74 passando, 0 falhas

## Gatilhos instrumentados

| Arquivo | Evento | Nível | Dados principais |
| --- | --- | --- | --- |
| `assets/js/modal-agendamento.js` | aula avulsa criada | `info` | `id`, `aluno`, `data`, `horario` |
| `assets/js/modal-agendamento.js` | série criada | `info` | `id`, `aluno`, `diasDaSemana`, `condicaoFim` |
| `assets/js/modal-agendamento.js` | bloqueio criado | `info` | `id`, `data`, `horario` |
| `assets/js/modal-acao-slot.js` | edição de série | `info` | `id`, `escopo`, `data` |
| `assets/js/modal-acao-slot.js` | instância cancelada | `info` | `id`, `dataExcecao` |
| `assets/js/modal-acao-slot.js` | exceção adicionada ao agendamento | `info` | `id`, `data` |
| `assets/js/modal-acao-slot.js` | reposição criada | `info` | `id`, `aluno`, `prazo` |
| `assets/js/modal-acao-slot.js` | rollback disparado | `warn` | `id`, `motivo` |
| `assets/js/modal-acao-slot.js` | série excluída | `info` | `id`, `ocorrenciasAfetadas` |
| `assets/js/view-alunos.js` | aluno criado | `info` | `id`, `nome`, `metodoCobranca` |
| `assets/js/view-alunos.js` | aluno editado | `info` | `id`, `nome`, `metodoCobranca` |
| `assets/js/cascade-sync-aluno.js` | cascade concluído | `info` | `id`, `agendamentosAfetados` |

## O que mudou

- Acrescentei registros de sucesso em flujos de agendamento, reposição e aluno sem alterar regras de negócio.
- Mantive o log após confirmação de sucesso e sem payload completo; payloads grandes ficaram em `debug` ou em grupos colapsados.
- Migrei os `console.*` restantes em `cascade-sync-aluno.js` para `window.log` e mantive a operação inalterada.
- Não toquei em `_snapshot`, `_mutouExcecoes`, nem no laço de `_sincronizarAgendamentosViaCRUD` e sua propagação de `gcalSyncFailed`.

## Git diff --stat

```text
 assets/js/cascade-sync-aluno.js | 25 ++++++++++++++++---------
 assets/js/modal-acao-slot.js    | 38 ++++++++++++++++++++++++++++++++++++--
 assets/js/modal-agendamento.js  | 24 ++++++++++++++++++++++++
 assets/js/view-alunos.js        | 12 +++++++++++-
 4 files changed, 87 insertions(+), 12 deletions(-)
```

## node --check

```text
$ node --check .\\assets\\js\\modal-acao-slot.js
$ node --check .\\assets\\js\\modal-agendamento.js
$ node --check .\\assets\\js\\view-alunos.js
$ node --check .\\assets\\js\\cascade-sync-aluno.js
OK
```

## npm test

```text
$ cd backend
$ npm test
74 passing, 0 failing
```
