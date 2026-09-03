# Saga — Rodadas de 2026-08-25: recorrência no Google, falha parcial e fechamento documental

> Consolida 10 rodadas de 2026-08-25: `gcal-fix`, `sync-fix-titulo`, `sync-fix-cascade`,
> `sync-fix-aviso`, `aviso-fix`, `b2-fix`, `excecao-fix`, `c-fix`, `doc-close`, `doc-fix`.
> Os relatórios originais foram removidos na poda de 2026-09-03.

## Causa-raiz

Duas frentes entrelaçadas. No **backend**, os campos de recorrência não chegavam ao Google
porque faltavam na whitelist de `montarPayloadGCal`, e `alunoNome`/`objetivo` não existem no
documento `Agendamento`, então o título do evento saía genérico. No **frontend**, recargas
redundantes invalidavam referências vivas antes de mutações, havia código morto chamando
função inexistente, e falha parcial do Google (Mongo grava, Google falha) não chegava ao
usuário.

## Linha do tempo

| # | Rodada | Problema | Correção | Arquivos |
|---|---|---|---|---|
| 1 | `gcal-fix` | Campos de recorrência não iam ao Google | Whitelist de `montarPayloadGCal` expandida com `tipoRecorrencia`, `frequencia`, `intervaloRecorrencia`, `diasSemana`, `dia`, `recorrenciaEscopo`, `recorrenciaDataInicio`, `recorrenciaDataFim`, `recorrenciaFimCondicao`, `recorrenciaQuantidadeOcorrencias`, `dataCriacao`, `excecoes`, `excecoesDetalhadas`, `timeZone` | `backend/src/controllers/agendamentoController.js` |
| 2 | `sync-fix-titulo` | Título genérico no evento | `atualizarAgendamento` chama `enriquecerAgendamentoComAluno` antes de montar o payload; a resposta HTTP continua sendo o documento do Mongo, sem os campos extras | `backend/src/controllers/agendamentoController.js` |
| 3 | `sync-fix-cascade` | `_atualizarAgendamentosNoGCal` chamava `window.gcal.updateEvent`, que não existe | Função e o bloco que a invocava removidos; `_persistirAgendamentosNoBackend` é o caminho real | `assets/js/cascade-sync-aluno.js` |
| 4 | `sync-fix-aviso` | Falha do Google era silenciosa | `salvarDados` inspeciona o corpo das respostas após o `Promise.all`; se alguma traz `gcalSyncFailed: true`, exibe toast de **aviso** (não erro) | `assets/js/storage.js` |
| 5 | `aviso-fix` | A flag precisava atravessar `POST`, `PUT` e `DELETE` | `_respostaVirtual(status, extras)` ganhou o segundo parâmetro, mantendo retrocompatibilidade com `_sincronizarAlunosViaCRUD`, que chama sem argumentos | `assets/js/storage.js` |
| 6 | `b2-fix` | Falha ao reagendar instância fazia a aula sumir sem volta | Snapshot de `compromisso.excecoes` antes da mutação e restauração no `catch` | `assets/js/modal-acao-slot.js` |
| 7 | `excecao-fix` | `enviarParaReposicao` chamava `carregarDados` internamente, invalidando a referência viva no array `aulas` | Chamada interna removida — os dois chamadores já recarregam depois de persistir | `assets/js/modal-acao-slot.js` |
| 8 | `c-fix` | 11 guardas corrompidas; `UNTIL` em formato estendido; contagem local divergindo do Google | Guardas restauradas em `montarRecurrence` e `montarExdatesDeAgendamento`; `formatarDataUtcRfc5545` passou a gerar `YYYYMMDDT235959Z`; filtro de exceção removido de `contarOcorrenciasAteData` | `backend/src/services/gcalSyncService.js`, `assets/js/shared/recurrence-helpers.js` |
| 9-10 | `doc-close`, `doc-fix` | Specs e roadmap descreviam estado anterior ao código | Specs de gcal-sync, finanças e reposições atualizadas; roadmap renumerado; referências a branch inexistente corrigidas | `docs/**` |

## Decisões deliberadas

- **`alunoNome` e `objetivo` não são persistidos no `Agendamento`.** São enriquecidos apenas
  no momento de montar o evento do Google. Persistir criaria dado duplicado que pode divergir
  do cadastro do aluno.
- **Falha parcial responde HTTP 200 com `gcalSyncFailed: true`.** O Mongo gravou; a falha do
  Google é contingência, não erro fatal. Não há retry nem fila.
- **`UNTIL` em RFC 5545 básico**, não ISO 8601. `toISOString()` foi rejeitado de propósito.
- **`COUNT` não é reduzido por exceção.** `contarOcorrenciasAteData` conta o tamanho da série;
  a exceção é expressa via `EXDATE`, não abatendo o `COUNT`. O filtro continua apenas em
  `checarCompromissoNaData`.

## Limites herdados

- `montarRespostaFalhaGcal` responde `200` com `partialSuccess: true`. Reportado três vezes,
  mantido de propósito.
- `frequencia` pode chegar como `'semanal'` em padrão mensal; o segundo `if` de
  `montarRecurrence` continua sendo condição notória.
- `patchAgendamento` não publica no Google — fora de escopo por decisão do dono.
- `_agendamentosSaoIguais` não detecta mudança quando o array local é substituído em vez de
  mutado. É consequência do problema de referência, não a causa.
- Handlers de DOM (`btnReagendarInstancia`, `btnMandarParaReposicao`, `enviarParaReposicao`)
  não têm cobertura automatizada — acoplados a `window`, `document` e ao array global `aulas`.
