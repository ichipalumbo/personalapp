# Saga — Módulo de log do frontend

> Consolida 3 rodadas: `2026-08-25-log-fix-modulo`, `2026-08-25-log-fix-storage`,
> `2026-08-25-log-fix-gatilhos`.
> Os relatórios originais foram removidos na poda de 2026-09-03.

## Causa-raiz

`console.log` espalhado sem padrão de severidade, sem forma de controlar verbosidade, e com
dump de arrays inteiros sem contexto. Ao mesmo tempo, operações críticas de negócio não
deixavam nenhuma trilha — diagnosticar dependia de reproduzir o problema com o DevTools
aberto.

## Linha do tempo

| # | Rodada | O que foi feito |
|---|---|---|
| 1 | `log-fix-modulo` | Criado `assets/js/logger.js`, expondo `window.log` com `error`, `warn`, `info`, `debug` e `grupo`. O nível persiste em `localStorage` na chave `personal_app_log_nivel`. O logger engole as próprias exceções — log nunca pode derrubar o app |
| 2 | `log-fix-storage` | `console.*` de `assets/js/storage.js` migrado para `window.log` com severidade correta. Dump completo virou resumo em `info` + detalhe em `debug` dentro de grupo colapsado |
| 3 | `log-fix-gatilhos` | 12 pontos de negócio instrumentados em `modal-agendamento.js`, `modal-acao-slot.js`, `view-alunos.js` e `cascade-sync-aluno.js` |

## Pontos de negócio instrumentados

Sucesso em `info`, rollback em `warn`. Payload reduzido — id, aluno, data, prazo — nunca o
objeto inteiro.

| Evento | Arquivo | Nível |
|---|---|---|
| Aula avulsa criada · série criada · bloqueio criado | `modal-agendamento.js` | `info` |
| Série editada · instância cancelada · exceção adicionada · reposição criada · série excluída | `modal-acao-slot.js` | `info` |
| Rollback disparado | `modal-acao-slot.js` | `warn` |
| Aluno criado · aluno editado | `view-alunos.js` | `info` |
| Cascade concluído | `cascade-sync-aluno.js` | `info` |

## Decisões deliberadas

- **`window.log` global, sem import.** É o que funciona num frontend sem build step, com
  scripts carregados por tag.
- **Nível padrão `info`.** `debug` fica desligado em produção e é ligado sob demanda com
  `window.log.nivel = 3`, que persiste entre reloads.
- **Log só depois do sucesso da operação**, não na tentativa. Rollback é a única exceção, e
  vai em `warn`.
- **O logger engole exceções internas.** Falha ao serializar ou ao ler `localStorage` não
  pode quebrar o fluxo.

## Ponto de atenção operacional

`logger.js` precisa estar carregado **antes** de qualquer consumidor em `index.html`. Ao
adicionar script novo, confira a posição da tag.

## Limites herdados

- O log é local ao browser. Não há agregação em servidor, nem correlação com os logs do
  backend em `gcalSyncService`.
- Não há timestamp automático nem identificação de sessão — em app multiusuário, o console
  não diz qual conta executou o quê.
- Não há filtro de dado sensível: nome e e-mail de aluno podem ir para o console.
