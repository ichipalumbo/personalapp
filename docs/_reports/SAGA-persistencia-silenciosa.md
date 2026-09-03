# Saga — Falha silenciosa de persistência

> Consolida 2 rodadas: `2026-09-01-fix-persistencia-silenciosa-gcal` (6h),
> `2026-09-01-fix-persistencia-silenciosa-criacao-edicao` (6i).
> Diagnóstico de origem preservado em `docs/_diags_llm/2026-09-01-diag-persistencia-silenciosa-criacao-edicao.md`.
> Os relatórios originais foram removidos na poda de 2026-09-03.
> Estado normativo atual: `docs/specs/gcal-sync.md` §9.26 e §9.27.

## Causa-raiz

`_persistirDadosComBackend`, em `assets/js/google-calendar.js`, chamava `global.salvarDados` e
**descartava o retorno**, devolvendo `{ ok: true }` fixo. Quando o servidor recusava a
gravação, o chamador recebia sucesso.

Nenhum dos pontos de chamada de `salvarEventoComGCal` checava o retorno.

**Por que passou despercebido tanto tempo**: o frontend é otimista — atualiza a tela antes de
confirmar a persistência. A usuária via o sucesso e só descobria a divergência ao recarregar e
ver a mudança sumir.

## Os pontos afetados

| # | Fluxo | Arquivo |
|---|---|---|
| — | 3 handlers de exclusão (`executarExclusaoInstancia`, `executarExclusaoSerie`, `executarExclusaoAulaAvulsa`) | `modal-acao-slot.js` |
| 1 | Criação de agendamento | `modal-agendamento.js` |
| 2 | Edição sem split | `modal-acao-slot.js` |
| 3 | Reagendamento de reposição | `modal-acao-slot.js` |
| 4 | Split "esta ocorrência" | `modal-acao-slot.js` |
| 5 | Split "a partir desta data" | `modal-acao-slot.js` |
| 6 | Envio de aula avulsa para reposição | `modal-acao-slot.js` |

A etapa 6h cobriu os três handlers de exclusão; a 6i cobriu os seis pontos restantes.

## Como funciona hoje

**Camada 1 — a raiz.** `_persistirDadosComBackend` propaga o retorno real de `salvarDados` em
vez de simular sucesso.

**Camada 2 — os handlers.** Todos seguem o mesmo padrão: capturam snapshot do estado antes da
operação, guardam o retorno de `salvarEventoComGCal`, e checam com `deveEnviarPatchReposicao`.
Em falha: restauram o estado do snapshot, mostram toast de erro e reabrem o modal com os
valores que a usuária tinha digitado.

**Camada 3 — gravação de compensação (splits).** Os pontos 4 e 5 gravam duas vezes em
sequência. Dois mecanismos:

- **Ordem de execução** — a checagem da primeira gravação tem `return`, impedindo a segunda de
  rodar.
- **Compensação** — se a segunda falha, o array `aulas` é restaurado do snapshot, o compromisso
  é buscado de novo e uma **terceira** chamada empurra o estado restaurado para o servidor,
  desfazendo a primeira gravação. Esse mecanismo não existia antes: a etapa anterior só
  precisava de reversão local.

**Camada 4 — desvínculo de reposição (ponto 3).** Além do revert local, chama `PATCH` na
reposição devolvendo `status: "pendente"` e `agendamentoReposicaoId: null`.

## Decisões deliberadas

- **No ponto 3, o modal não fecha em caso de falha.** Fechar e reabrir remontaria os selects e
  perderia os valores escolhidos.
- **A gravação de compensação gera três chamadas de rede num cenário anômalo.** É o preço de
  não deixar o servidor com estado inconsistente — série com `EXDATE` sem a ocorrência nova, ou
  série encerrada sem a série nova.
- **O ramo sem Google Calendar conectado também passou a checar.** Não estava no escopo
  original, mas sem isso a falha silenciosa continuaria para quem não usa a integração.
- **O snapshot copia o array `aulas` inteiro**, não só as exceções. Os ramos de split usam
  `push` e `splice`; restaurar parcialmente não bastaria.

## Limites herdados

- **Existe uma janela de inconsistência transitória nos splits.** Entre a primeira gravação
  persistir e a segunda falhar, o servidor fica com a série cortada e sem a nova. A compensação
  desfaz, mas não elimina a janela — recarregar nesse intervalo mostra a agenda cortada.
- **A mensagem de toast é genérica.** `obterMensagemFalhaPersistencia` fala em "reposição" mesmo
  em contexto de criação e edição, onde a palavra não faz sentido. Mantida por consistência com
  a etapa anterior; ajustar a redação é decisão do dono.
- **Nenhuma validação visual.** Os testes asseguram que o modal reabre com os valores certos por
  asserção no harness, não no browser. Se a reabertura tem lag ou fica estranha, não há teste
  que pegue.
- **A reposição órfã do ponto 6 foi resolvida depois**, na etapa 6i-b — ver
  `2026-09-01-fix-cancelar-reposicao-orfa.md` e §9.27 da spec. Naquele momento, a limitação era
  real: não havia `DELETE` na API de reposições.
