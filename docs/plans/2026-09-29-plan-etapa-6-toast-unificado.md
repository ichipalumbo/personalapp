# Plano de execução — Etapa 6 (achados 4.8 + 4.9, item 5.6 do roadmap)

> **Data de abertura**: 2026-09-29
> **Branch de trabalho**: `feat/etapa-6-toast-unificado` (criada de `origin/main`, sem upstream track)
> **Fonte**: seção "Etapa 6 — Estados assíncronos e recuperação" de
> `docs/diagnostics/2026-09-23-diag-auditoria-ui-ux-mobile.md` (achados 4.8 e 4.9)
> **Item de roadmap**: `docs/roadmap.md`, item 5.6 (Grupo 5 — auditoria de UI/UX mobile)
> **Status**: ✅ CONCLUÍDO — execução 2026-09-29, passada de textos na mesma rodada, validação
> em produção aprovada pelo dono, mergeado na `main` via PR #66 (2026-09-30). Adição da tela de
> finanças registrada abaixo — mergeada via PR #67 (2026-09-30).

## Escopo desta etapa

Achados originais do diagnóstico:

- **4.8 — Erro global bloqueante sem recuperação**: `mostrarOverlayErroConexao()` cobre a tela
  inteira, trava `pointer-events` do `body` durante o estado de progresso e não oferece nenhum
  caminho de recuperação (sem botão de retry, mesmo o parâmetro `onRetry` já existindo e sendo
  ignorado no código atual).
- **4.9 — Toasts/assíncronos: acessibilidade e contraste**: `#toast` não tem `role`/`aria-live`.

Durante o levantamento, uma conversa com o dono ampliou deliberadamente o escopo: em vez de só
corrigir os dois achados isoladamente, a decisão foi **unificar os três mecanismos de feedback
assíncrono do app em um único componente**, seguindo o padrão de mercado (Material Design 3
snackbar + diretrizes de mensagem de erro da Nielsen Norman Group): um único "toast" com estados
visuais diferentes, em vez de componentes separados para cada situação.

## Estado atual — 3 mecanismos fazendo o mesmo papel

Todos vivem em `assets/js/utils-kpi.js`, com CSS em `assets/css/style.css`:

1. **`#toast`** (`mostrarToast(msg, tipo)`) — feedback rápido, auto-some em 3s, cores
   success/error/warning. Já posicionado acima do FAB via `--bottombar-height` (Fase 0.1 e
   Etapa 3). **61 chamadas em 10 arquivos** — não serão alteradas (assinatura preservada).
2. **`#overlay-sinc`** (`mostrarOverlaySinc`, `mostrarOverlaySleepMode`,
   `mostrarOverlayErroConexao`, `ocultarOverlayConexao`, `ocultarOverlaySinc`) — bloqueia a tela
   inteira (`pointer-events: none` no `body`) enquanto uma operação remota demora mais de 3s
   (`SLEEP_MODE_THRESHOLD_MS`, em `storage.js`). Usado por `carregarDados` (contexto
   `'carregando'`) e `salvarDados` (contexto `'syncDados'`).
3. **`#indicador-sync-bg`** (`mostrarIndicadorSyncBackground`, `ocultarIndicadorSyncBackground`) —
   badge discreto no canto inferior-direito, não bloqueante, usado só no contexto
   `'syncCalendario'` (sync automática do Google Calendar).

**Bug encontrado no levantamento**: `executarOperacaoRemotaComFeedback` (`storage.js`) recebe
`opcoes.onRetry` em 4 pontos de chamada (2 em `storage.js`, 1 encapsulado em
`cascade-sync-aluno.js`), mas a função **nunca lê `opcoes.onRetry`** — o parâmetro é morto. O
retry real nunca existiu na UI, apesar do encanamento já estar montado.

**Segundo achado (fio desconectado)**: o contexto `'syncCalendario'` e o `#indicador-sync-bg`
estão **desconectados do fluxo real hoje**. O sync automático do Google Calendar no boot
(`iniciarSyncGoogleCalendarAutomatica`, disparado em `assets/js/app/bootstrap.js`) chama
`ensureCalendarConnection` em `google-identity.js` diretamente — **nunca passa por
`executarOperacaoRemotaComFeedback`**. Nenhuma chamada no código atual usa
`contexto: 'syncCalendario'`. O único feedback visual hoje nesse fluxo automático é um toast de
`warning` disparado só em caso de **erro** de conexão (`google-calendar.js`). Ou seja: abrir o
app hoje **não** produz nenhum toast/badge em caso de sucesso do sync do calendário — só em
falha. Para o experimento do dono (ver "sync do Google Calendar", decisão 4 abaixo) realmente
mostrar algo em runtime, esta etapa também religa esse contexto ao fluxo de boot.

## Decisão de arquitetura (fechada com o dono)

Um único componente (`#toast`, reaproveitando posição e token `--bottombar-height` já calibrados)
com 4 estados visuais:

| Estado | Cor | Comportamento | Ação |
| --- | --- | --- | --- |
| `success` | verde (atual) | auto-some ~3s | — |
| `warning` | laranja (atual) | auto-some ~3s | — |
| `progress` (novo) | neutro/cinza + spinner | fica até resolver | — |
| `error` | vermelho (atual) | fica até ação do usuário | botão "Tentar de novo" ligado ao `onRetry` |

Regra de exibição única (padrão Material Design): nunca mais de 1 notificação visível — uma nova
substitui a anterior.

**Decisões explícitas do dono**:

1. Todos os overlays de progresso deixam de bloquear a tela — nenhuma operação (nem "Carregando
   dados...", nem "Sincronizando...") trava mais `pointer-events` do `body`.
2. Posição: embaixo, no lugar do toast atual (mantendo `--bottombar-height`).
3. Ao clicar em "Tentar de novo" no estado de erro, a notificação troca para o estado `progress`
   ("Carregando...") — sem overlay bloqueante nem tela extra.
4. **A sincronização do Google Calendar (`indicador-sync-bg`, contexto `syncCalendario`) também
   entra no toast unificado.** O dono está ciente do risco levantado (esse indicador foi
   desenhado para ser silencioso; unificar pode fazer o toast aparecer sozinho, sem ação do
   usuário, ao abrir o app) e quer **validar isso na prática** antes de decidir se mantém ou volta
   a um comportamento silencioso só para esse caso. Não é uma decisão definitiva — é um
   experimento deliberado que será avaliado em runtime durante a validação desta etapa.

## Compatibilidade — o que NÃO muda

- As 61 chamadas de `mostrarToast(msg, tipo)` em 10 arquivos continuam idênticas.
- As 7 funções antigas (`mostrarOverlaySinc`, `mostrarOverlaySleepMode`,
  `mostrarOverlayErroConexao`, `ocultarOverlayConexao`, `ocultarOverlaySinc`,
  `mostrarIndicadorSyncBackground`, `ocultarIndicadorSyncBackground`) continuam existindo em
  `utils-kpi.js` com a mesma assinatura — por dentro, passam a delegar para o toast unificado.
  `storage.js` e `cascade-sync-aluno.js` não precisam de nenhuma alteração de chamada.
- Nenhuma regra de negócio (persistência, recorrência, cobrança, Google Calendar, autenticação)
  é alterada — só a camada de apresentação do feedback.

## O que é removido

- `#overlay-sinc` e seu CSS (`.overlay-sinc`, `.overlay-sinc-conteudo`, `.overlay-sinc-spinner`,
  `.overlay-sinc-msg`, `.overlay-sinc-erro`) — bloco completo em `assets/css/style.css`.
- `#indicador-sync-bg` e seu CSS (`.indicador-sync-bg`, `.indicador-sync-bg-spinner`,
  `.indicador-sync-bg-msg`) — bloco completo em `assets/css/style.css`.
- O travamento de `document.body.style.pointerEvents` em qualquer estado de progresso.

## Acessibilidade (resolve 4.9)

- `role="status"` + `aria-live="polite"` nos estados `success`/`warning`/`progress`.
- `role="alert"` + `aria-live="assertive"` no estado `error` (interrompe o leitor de tela, correto
  para falha que exige atenção).

## Passos de execução

1. Reescrever `assets/js/utils-kpi.js`: um novo componente/estado central de toast, com suporte a
   texto + tipo + ação opcional (retry) + duração (auto-some vs. persistente). As 7 funções
   legadas passam a ser wrappers finos sobre esse núcleo.
2. Conectar `onRetry` de fato: o botão "Tentar de novo" do estado `error` executa o callback que
   já é passado por `storage.js`/`cascade-sync-aluno.js`.
3. Atualizar `assets/css/style.css`: novo estado `.toast.progress` (spinner + neutro), remover
   blocos `.overlay-sinc*` e `.indicador-sync-bg*`.
4. Remover o `document.body.style.pointerEvents` do fluxo de `mostrarOverlaySinc`/
   `mostrarOverlayErroConexao`.
5. Adicionar `role`/`aria-live` dinâmicos conforme o estado.
6. Religar o sync automático do Google Calendar (`iniciarSyncGoogleCalendarAutomatica`, chamado
   no boot em `assets/js/app/bootstrap.js`) ao contexto `syncCalendario` de
   `executarOperacaoRemotaComFeedback`, hoje desconectado — sem isso o experimento do dono (ver
   decisão 4) não mostra nada em runtime, porque esse caminho nunca aciona feedback de sucesso.
7. Validar em runtime (320/390/433): fluxo de carregamento normal, fluxo de erro com retry, e o
   comportamento do sync do Google Calendar em background — decidir com o dono, à luz do que for
   observado, se o toast do `syncCalendario` fica visível ou volta a ser silencioso.
8. Medir suíte de frontend antes e depois (`node --test` em `tests-frontend/`) — sem teste
   dedicado a este componente hoje; validação funcional é manual.
9. Relatório final desta etapa com o resultado da validação runtime e a decisão sobre o sync do
   Google Calendar.

## Fora de escopo desta etapa

- Etapa 7 (achados 4.6 final, 4.13, 4.15, 4.16, 4.17) — não é tocada aqui.
- Qualquer criação de teste automatizado para o componente de toast (item 0.12 do roadmap cobre a
  lacuna de cobertura de render, mas é item separado).

## Execução (2026-09-29)

**Suíte de frontend**: 77/77 antes → 77/77 depois (medido em `tests-frontend/`, `node --test`).

**Implementação**:

- `assets/js/utils-kpi.js`: núcleo único `_exibirToast(mensagem, estado, opcoes)` com 4 estados
  (`success`/`warning` auto-somem em 3s; `progress` mostra spinner e fica até `_ocultarToast()`;
  `error` fica até ação, com botão "Tentar de novo" quando `opcoes.onRetry` é passado). As 7
  funções antigas (`mostrarOverlaySinc`, `mostrarOverlaySleepMode`, `mostrarOverlayErroConexao`,
  `ocultarOverlayConexao`, `ocultarOverlaySinc`, `mostrarIndicadorSyncBackground`,
  `ocultarIndicadorSyncBackground`) mantiveram assinatura e passaram a delegar para o núcleo —
  nenhum dos ~60 pontos de chamada em outros arquivos precisou mudar. `role`/`aria-live`
  aplicados dinamicamente (`status`/`polite` para os 3 primeiros estados, `alert`/`assertive`
  para erro).
- `assets/js/storage.js`: `_mostrarOverlayErroComRetry` passou a receber e propagar `onRetry` até
  `mostrarOverlayErroConexao` — o parâmetro que existia morto em 4 pontos de chamada agora chega
  de fato ao botão da UI.
- `assets/js/google-calendar.js`: `iniciarSyncGoogleCalendarAutomatica` (chamada no boot,
  `assets/js/app/bootstrap.js`) passou a rodar dentro de
  `executarOperacaoRemotaComFeedback({ contexto: 'syncCalendario', exibirFalha: false })` — antes
  rodava direto e nunca acionava nenhum feedback de progresso/sucesso.
- `assets/css/style.css`: removidos os blocos `.overlay-sinc*` (bloqueio de tela, ~40 linhas) e
  `.indicador-sync-bg*` (badge separado, ~30 linhas). Adicionados `.toast.progress`,
  `.toast-spinner`, `.toast-msg`, `.toast-retry` — reaproveitando a posição/token
  `--bottombar-height` já calibrado nas Etapas 3 e Fase 0.1.

**Validação em runtime** (servidor estático local, mock `default`, 433×762 DPR 2.81):

- Estado `progress`: exibido sem bloquear (`document.body.style.pointerEvents` permanece vazio),
  `role="status"`, `aria-live="polite"`, spinner visível.
- Estado `error` com `onRetry`: `role="alert"`, `aria-live="assertive"`, botão "Tentar de novo"
  renderizado; clique confirmado disparando o callback (testado com uma flag de controle).
- Estado `success`: auto-esconde após ~3s (classe `show` removida), sem exigir ação.
- `iniciarSyncGoogleCalendarAutomatica` religado: executado com uma operação simulada de 3.5s,
  o toast entrou em `progress` com a mensagem de calendário e voltou ao estado oculto ao concluir
  — confirma que o fio antes desconectado agora aciona o componente unificado.
- Nenhum `#overlay-sinc` nem `#indicador-sync-bg` foi criado em nenhum dos cenários testados
  (elementos legados removidos de fato, não só ocultos).
- Screenshot em 433×762: toast de erro aparece embaixo, sem escurecer a tela, com o botão de
  retry visível — mesma posição do toast de sucesso.

**Nota sobre o experimento pedido pelo dono** ("ver se aparece um monte de toast ao abrir o
app"): o mock de UI usado nesta validação (`mockScenario=default`) bloqueia deliberadamente
qualquer escrita de rede para não tocar produção, então o boot real com login Google e conexão
efetiva ao Calendar não pôde ser observado fim-a-fim neste ambiente — o teste acima simulou o
contexto `syncCalendario` diretamente via `executarOperacaoRemotaComFeedback`. **Recomendação**:
o dono validar em uma sessão real (deploy ou ambiente com login Google funcional) abrindo o app
com a conta conectada ao Google Calendar, observando se o toast de sync aparece sozinho no boot
e se isso é ruidoso o suficiente para reverter a decisão 4 (trazer o `syncCalendario` para o
toast visível). Como o sync normalmente responde em bem menos de 3s (só aparece após
`SLEEP_MODE_THRESHOLD_MS`), a expectativa é que ele raramente apareça em conexões rápidas — mas
isso só se confirma em uso real. **Desfecho (2026-09-30)**: o dono validou no deploy de
produção, aprovou o comportamento e a decisão 4 se manteve sem alteração.

## Encontrado, não alterado

- O parâmetro `onRetry` de `cascade-sync-aluno.js` (`_persistirAgendamentosNoBackend`) já existia
  antes desta etapa e continua funcionando pela mesma via corrigida (`executarOperacaoRemotaComFeedback`
  → `mostrarOverlayErroConexao`) — não precisou de nenhuma mudança adicional nesse arquivo.
- Etapa 7 do diagnóstico (4.6 final, 4.13, 4.15, 4.16, 4.17) permanece intocada, como planejado.

---

## Passada de textos dos toasts (2026-09-29, decisão do dono)

Após a validação em produção aprovada pelo dono, ele solicitou uma revisão de **todos os
textos de toast** do app: vários ainda estavam em tom de mensagem de debug (ex.: "Falha ao...",
"Verifique o console", emojis ✅/❌, `error.message` cru, pontuação de sucesso inconsistente).
Foi produzida uma tabela de ~61 itens numerados (texto atual → texto proposto, uma linha por
local de `mostrarToast`), aprovada item a item pelo dono. Regras acordadas na aprovação:

- Sucesso: frase sem emoji, terminando em `!`.
- Falha: tom de usuário final ("Não foi possível ..."), com "Tente novamente." quando há ação
  possível do usuário; falha com retry automático server-side (ex.: sync do Google Calendar)
  **não** promete retry manual.
- `error.message` de `catch` genérico: quando a tabela não definiu texto fixo, o pass-through
  foi **mantido** (apenas os fallbacks definidos na tabela mudaram).

### Arquivos alterados e o que mudou

- `assets/js/utils-kpi.js` — 2 mensagens do núcleo (sucesso de persistência parcial e erro
  genérico de salvar), já em linguagem de usuário final.
- `assets/js/storage.js` — mapa de `mensagens` dos contextos (`carregando`/`syncDados`/
  `syncCalendario`), "Trabalhando offline..." → "Sem conexão. Seus dados foram salvos neste
  aparelho.", "Dados sincronizados com sucesso no MongoDB!" → "Dados sincronizados com
  sucesso!".
- `assets/js/google-calendar.js` — erro do sync automático no boot: removida a concatenação de
  `error.message` cru (virou "Não foi possível conectar à Google Agenda agora.").
- `assets/js/cascade-sync-aluno.js` — mensagens de sucesso e falha do sync em cascata (removido
  o "Verifique o console").
- `assets/js/settings-modal.js` — removidos ✅ e ❌ das 4 mensagens de conectar/desconectar
  Google Agenda.
- `assets/js/modal-agendamento.js` — fallback de falha de persistência e mensagem de sucesso de
  agendamento (sem ✅).
- `assets/js/modal-acao-slot.js` — 12 textos: exclusão de aula/série (dia único, série,
  "a partir de"), reagendamento de reposição, exclusões aplicadas, remoção de ✅ em 4
  mensagens de sucesso e fallbacks de falha.
- `assets/js/view-alunos.js` — 4 textos: falha de atualização de cobrança (antes
  `erro.message` — agora texto fixo, por decisão donal), "Aluno inativado com sucesso." → com
  `!` (padrão do par), remoção de ✅ em "Aluno atualizado" e "Aluno cadastrado".
- `backend/shared/reposicao-flow-helpers.js` (módulo compartilhado) — as 2 mensagens de `obterMensagemFalhaPersistencia`
  reescritas para o usuário final.
- `backend/test/gcal-persistencia-criacao-agendamento.test.js` — 1 asserção adaptada:
  verificava a substring `'falha'` no toast de erro, que apenas casava com o texto antigo
  ("Falha ao salvar alterações..."). Passou a verificar a intenção real (toast de erro de
  falha de salvamento) contra a mensagem nova. **Provado por mutação**: revertendo a mensagem
  no helper para o texto antigo, o teste falha (1/8 no arquivo); restaurada a correção,
  suíte verde.

### Arquivos encontrados, não alterados

- `assets/js/view-financas.js` — todos os seus itens (~5) aprovados como **manter como estão**;
  nenhuma edição neste arquivo.
- `assets/js/google-identity.js` — repassa o texto dado pelo chamador; as mensagens que passam
  por ele foram atualizadas nos próprios chamadores (acima).

### Suítes (medidas nesta rodada, `node --test`)

- Baseline antes da passada: frontend 77/77, backend 232/232.
- Depois da passada: **frontend 77/77, backend 232/232**.
- Nenhum dos outros testes faz asserção sobre texto de toast (busca confirmada em
  `backend/test/**` e `tests-frontend/**`); a única asserção afetada foi a listada acima.

### Sugestão registrada para futuro (palavra "tentar")

Encontrada na revisão: duas nomenclaturas diferentes para a ação de retry em pontos distintos
do app — o botão do toast unificado usa **"Tentar de novo"** e o botão do erro do histórico de
reposições (tela de alunos) já existia com **"Tentar novamente"**. Não foi alterado nesta
passada (fora do conjunto de toasts aprovado); foi registrada como item de consistência na
Etapa 7 — ver seção "Etapa 7" do diagnóstico (item sugerido 7.1) e item 5.7 do roadmap.

---

## Adição — tela de finanças no toast unificado (2026-09-30, mergeada via PR #67)

> Branch `feat/financas-toast-carregamento` criada de `origin/main` (que já continha o merge da
> Etapa 6 — PR #66, fechada antes); PR separada, commits/push do dono, como sempre. PR #67
> mergeada na `main` em 2026-09-30.

**Por que**: a única tela com loading local (skeleton) que não participava do mecanismo
unificado era a de finanças — sem cache e em rede lenta, ela parecia travada com um texto
minúsculo "Carregando..." no cabeçalho (o fetch tem timeout de 40s e ia direto para a API,
fora do wrapper). Decisão do dono: incluir no toast, preservando a mensagem de **última
atualização** do cabeçalho ("Cache atualizado em ...").

**Arquivos alterados**:
- `assets/js/view-financas.js` — o fetch de `GET /financas` em `carregarFinancas()` passa a
  rodar dentro de `executarOperacaoRemotaComFeedback` com `contexto: 'carregandoFinancas'`,
  `exibirFalha: false` (a tela mantém o tratamento de falha próprio: fallback de cache +
  aviso + estado vazio — evita dois toasts disputando a regra de um só por vez) e
  `silenciosoUI` ligado ao flag `silencioso` (o refresh em background após pagamento/ajuste
  não exibe progresso).
- `assets/js/storage.js` — nova entrada `carregandoFinancas` no mapa de mensagens do wrapper
  ("Carregando finanças...").
- `tests-frontend/view-financas-carregamento-toast.test.js` (novo) — 4 testes em jsdom usando
  o wrapper e o toast **reais** (não stubs): (1) load lento > 3s → `#toast` em estado
  `progress` com "Carregando finanças...", `role="status"`/`aria-live="polite"`, escondido ao
  concluir, cards renderizados e o rótulo "Cache atualizado em ..." presente; (2) load rápido
  (< 3s) → nenhum toast; (3) refresh silencioso > 3s → nenhum toast; (4) falha no load →
  apenas o aviso da própria tela (sem erro duplicado do wrapper, sem botão retry).
  **Provado por mutação**: com o fix revertido (fetch fora do wrapper), o teste 1 falha.

**Não mudou**: a mensagem de última atualização (rótulo "Cache atualizado em ..." em
`#financasCacheLabel`), o estado de sync do cabeçalho, o tratamento de falha local, o
skeleton (continua como placeholder; o toast de progresso entra em cena se o fetch passar de
3s) e nenhuma outra tela.

**Suítes (medidas)**: frontend 77/77 antes → **81/81** depois (4 testes novos); backend
232/232 antes e depois (a mudança não o toca).
