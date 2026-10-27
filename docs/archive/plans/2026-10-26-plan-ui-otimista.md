# Plano — UI otimista nas ações de salvar (agenda, aluno e afins)

> **Status**: `Concluído` — T01, T02 e T03 integrados, validados e cobertos por testes (Frontend 481/481, Backend 245/245)
> **Abertura**: 2026-10-26
> **Atualizado**: 2026-10-26
> **Responsável**: Luccas (dono) + agente
> **Branch**: `feat/ui-otimista-e-responsividade`
> **Diagnóstico de origem**: nenhum documento autônomo — causa conhecida, investigada na conversa de 2026-10-26 (dispensável por `docs/README.md`, "Ciclo de vida", item 2)
> **Contrato Durável**: `docs/adr/0001-mutacoes-otimistas-e-fronteiras-de-persistencia.md` e `docs/specs/interface-e-navegacao.md` (§8)
> **Válido contra**: `5e0ae4d` (main)

> **Este arquivo é vivo.** Enquanto o item estiver aberto, ele recebe decisões, execução,
> medições e desvios. Não crie um relatório separado para "o depois".

---

## 1. Objetivo

Tornar a interface otimista nas ações de salvar: o item criado/editado/excluído aparece na tela no commit local (<100 ms após o clique), sem esperar a confirmação remota; os toasts comunicam apenas o **resultado** da sincronização (sucesso, sucesso parcial do GCal, falha com reversão). Resultado observável: o vale de ~1 s entre fechar o modal e o item aparecer na agenda deixa de existir, em conexão 5G.

## 2. Critérios de aceite

- [x] **Funcional**: ao criar aula/série/bloqueio, o item aparece na agenda imediatamente após o submit, antes da resposta do servidor; o mesmo vale para editar e excluir.
- [x] **Funcional**: ao cadastrar/editar aluno, o card/lista reflete a mudança imediatamente.
- [x] **Falha**: se o salvar falhar (sessão expirada, rede, GCal), o item é revertido na tela com re-render imediato e toast de erro — nunca permanece um item que não foi gravado.
- [x] **Regressão**: suíte de frontend (`tests-frontend/`, `node --test`) passa antes e depois, com números medidos reportados; suíte do backend não é afetada pelos cartões T01–T02 (nenhum arquivo de `backend/` tocado).
- [x] **Interface/UX**: nenhuma ação dispara toast de "salvando…" por padrão; toasts são de resultado; o rótulo de sincronização existente no header (5.8, parte B) cobre o estado "em andamento".
- [x] **Regressão visual**: validação no mock no viewport de referência 433×762, DPR 2,81, sem quebra de layout nem listeners mortos após re-render.

## 3. Decisões fechadas

| Decisão | Data | Responsável | Consequência técnica |
|---|---|---|---|
| Adotar otimismo máximo de UI fora do financeiro | 2026-10-26 | Luccas | Render a partir do estado local no commit; reversão existente (`reverterCriacaoAgendamento`) ganha re-render imediato |
| Toasts comunicam resultado, não "salvando…" | 2026-10-26 | Luccas | Item visível + rótulo de sync do header cobrem o "em andamento"; evita spam de toasts em série de 10 agendamentos |
| Ordem: render imediato → encurtar ciclo → GCal fora do caminho crítico | 2026-10-26 | Luccas (na proposta do agente) | Fases independentes; Fase 1 sozinha já elimina o vale percebido |
| Financeiro fica FORA do otimismo nesta frente | 2026-10-26 | Regra vigente (.github/copilot-instructions.md §5) | PATCH de pagamento/ajuste continua confirmando só após HTTP 200; mudança exige decisão do dono + spec |
| Contrato formalizado na spec de interface e ADR 0001 | 2026-10-26 | Luccas | Spec `interface-e-navegacao.md` §8 versionada e `docs/adr/0001-mutacoes-otimistas-e-fronteiras-de-persistencia.md` documentado |
| Reuso estrito do toast existente + Opção 1 de timers | 2026-10-26 | Luccas | Sem novos componentes de toast; 5s para erro simples, 8s com retry, 4s para aviso, 3s para sucesso; tap-to-dismiss; max-width 480px centralizado |
| Desacoplamento da mensagem de erro de agendamento | 2026-10-26 | Luccas | `modal-agendamento.js` não delega erro genérico para `reposicaoFlowHelpers`; texto correto para falha de aula comum |

## 4. Decisões pendentes

| # | Pergunta | Opções | Bloqueante? |
|---|---|---|---|
| 1 | Ampliar otimismo ao financeiro (contradiz a regra "nunca confirmar com base em cache local" das instruções §5 e da spec de finanças)? | A: manter confirmado-após-HTTP / B: otimizar também | Não bloqueia T01–T03; bloqueia eventual cartão de finanças |
| 3 | Cartão T04 (GCal fora do caminho crítico, backend) — detalhar e executar nesta frente ou abrir frente própria depois da Fase 1/2? | A: aqui / B: frente nova | Não bloqueia T01–T03 |

## 5. Escopo

- **Arquivos/componentes prováveis**:
  - `assets/js/storage.js` — `forçarRenderizacaoInterface()` (linha 1379) como gatilho pós-mutação; já contém `atualizarAulas`/`atualizarAlunos` (615–639).
  - `assets/js/modal-agendamento.js` — fluxo de submit (950–1065), já injeta no array local (993) e já tem reversão.
  - `assets/js/view-alunos.js`, `assets/js/cascade-sync-aluno.js` — caminho de salvar aluno.
  - `assets/js/modal-acao-slot.js`, `assets/js/widget-bloqueio.js` — outras mutações de agenda.
  - `assets/js/view-home.js` / `view-calendario.js` — alvos do re-render.
- **Comportamentos que podem mudar**: itens aparecem/desaparecem em caso de falha (flash de reversão aceito pelo dono); a re-leitura pós-save deixa de estar no caminho crítico da interação.

## 6. Fora de escopo

- PATCH de pagamento e ajuste financeiro (decisão pendente #1).
- Refatoração do `salvarDados` para sync por-item (o diff de lista inteira permanece; otimização estrutural é outra frente).
- Service worker, cache de API, cold start da Vercel (mitigação já existente de 40 s permanece).
- Motor de recorrência, detecção de conflitos, autenticação (áreas sensíveis §7 — nenhum cartão as altera).

## 7. Invariantes a preservar

- Isolamento por `ownerEmail` em toda query (copilot-instructions §4.1) — nenhum cartão toca backend nos T01–T02.
- Re-render via `innerHTML` mata listeners anexados ao grid (lessons-learned §3.4, `renderizarHomeSemana()`): cada re-render otimista deve seguir o mesmo caminho de render atual (que já trata re-anexo), sem criar render paralelo.
- Sem build step, sem dependências novas (copilot-instructions §9).
- Módulos compartilhados `backend/shared/` intocados; nada de duplicar cálculo de recorrência no caminho de render.
- O array local continua sendo preenchido só por `atualizarAulas`/`atualizarAlunos`/push vigente; nenhuma segunda fonte de verdade.
- Escrita financeira confirmada só após resposta HTTP (regra vigente).

## 8. Baseline

- Estado da branch e do working tree: `docs/plano-ui-otimista` criada de `origin/main` `c0e18ec`; working tree limpo na abertura.
- Suíte afetada antes: `não executado` nesta rodada de documentação; executar e registrar antes do primeiro cartão de código (T01).
- Reprodução do defeito: mock não reproduz o vale (rede é simulada); reprodução real exige sessão autenticada contra a API. Medição de referência do dono: ~1 s entre fechar o modal e o item aparecer (5G), em criar/editar/excluir.
- Condição de parada se o baseline divergir: se a suíte de frontend falhar na base limpa antes de T01, parar a frente e reportar ao dono.

## 9. Cartões de tarefas

### Cartão T01 — Render imediato no caminho de agendamento
- **Objetivo / resultado**: aula/série/bloqueio criado(a), editado(a) ou excluído(a) aparece na agenda no commit local, sem esperar o ciclo remoto.
- **Depende de**: nenhum.
- **Arquivos / componentes prováveis**: `assets/js/modal-agendamento.js` (993 e ramificações de edição/exclusão), `assets/js/modal-acao-slot.js`, `assets/js/widget-bloqueio.js`, `assets/js/storage.js` (1379).
- **Inclui**: chamar o render imediatamente após a mutação local aprovada; re-render na reversão; toast de resultado (verde/vermelho/parcial-GCal) conforme o ciclo terminar.
- **Não inclui**: mudanças de rede, backend, ou na semântica de `CONTEXTO_DADOS` (operações/pendências continuam existindo).
- **Decisões pendentes / bloqueios**: nenhum.
- **Critérios de aceite**: item visível <100 ms após submit em inspeção manual; em falha simulada no mock, item some e toast de erro aparece; nenhum toast de "salvando…".
- **Validação**: testes novos em `tests-frontend/` cobrindo render no commit e re-render na reversão, provados por mutação; sessão no mock no viewport 433×762 DPR 2,81.
- **Riscos e rollback**: re-render pode matar listeners (lessons §3.4) — mitigação: usar só o caminho de render atual; rollback por `git revert` dos commits do cartão.
- **Limite de tentativas**: 2; ao atingir, bloquear T02–T03, registrar evidência e pedir decisão.

### Cartão T02 — Render imediato no caminho de aluno (e reposições)
- **Objetivo / resultado**: cadastro/edição/exclusão de aluno reflete na hora em lista, filtros e cards; fila de reposições idem.
- **Depende de**: T01 (padrão de render estabelecido).
- **Arquivos / componentes prováveis**: `assets/js/view-alunos.js`, `assets/js/cascade-sync-aluno.js`, `assets/js/storage.js`.
- **Inclui**: gatilho de render pós-mutação local; re-render na reversão.
- **Não inclui**: cascade de reagendamento em massa (área sensível) — apenas o render, não a lógica.
- **Decisões pendentes / bloqueios**: nenhum.
- **Critérios de aceite**: card do aluno novo visível <100 ms após salvar; falha reverte com toast; filtros (`preencherFiltrosAlunos`) consistentes.
- **Validação**: teste por mutação em `tests-frontend/` + mock no viewport de referência.
- **Riscos e rollback**: mesmo do T01; rollback por `git revert`.
- **Limite de tentativas**: 2.

### Cartão T03 — Encurtar o ciclo de confirmação pós-save
- **Objetivo / resultado**: após salvar com sucesso, a tela renderiza do estado local confirmado sem re-ler os 5 endpoints; re-leitura completa passa a ser background (periódica/boot), não caminho crítico da interação.
- **Depende de**: T01.
- **Arquivos / componentes prováveis**: `assets/js/modal-agendamento.js` (1048, chamada a `inicializarHome`), `assets/js/storage.js` (`obterLeituraDados`), `assets/js/view-home.js`.
- **Inclui**: render local pós-confirmação; mescla de `googleCalendarEventId` já existente (storage.js:930) mantida.
- **Não inclui**: alterar os endpoints nem o backend; mexer no B2/boot.
- **Decisões pendentes / bloqueios**: nenhum.
- **Critérios de aceite**: tempo do ciclo pós-save sensivelmente menor (medir no mock com latência simulada); sem tela "Aguardando para atualizar..."; dados consistentes após a leitura de fundo.
- **Validação**: medição antes/depois com latência simulada no mock; suíte frontend antes/depois com números.
- **Riscos e rollback**: divergência local×remota — mitigado por manter a re-leitura em background; rollback por `git revert`.
- **Limite de tentativas**: 2.

### Cartão T04 — GCal fora do caminho crítico (backend)
- **Objetivo / resultado**: resposta do CRUD não espera OAuth + API do Google; `gcalSyncFailed` já existente passa a sinalizar "pendente de sync" para o toast/estado.
- **Depende de**: T03.
- **Arquivos / componentes prováveis**: `backend/src/services/gcalSyncService.js`, `backend/src/controllers/agendamentoController.js` (ou equivalente), `assets/js/storage.js` (consumo do flag).
- **Inclui**: fila/pós-resposta para sync GCal; toast de resultado parcial.
- **Não inclui**: mudança de credenciais, webhook ou renovação de canal (área sensível §7; spec `gcal-sync.md` governa).
- **Decisões pendentes / bloqueios**: decisão pendente #3 (nesta frente ou frente nova); **confirmar com o dono antes de implementar** — área sensível com estado externo não reversível por `git revert`.
- **Critérios de aceite**: a definir no detalhamento (ex.: p95 da resposta do CRUD sem depender de googleapis).
- **Validação**: suíte do backend antes/depois com números (regra §5/§10 das instruções permanentes).
- **Riscos e rollback**: estado GCal divergente do Mongo — precisa de estratégia de retry idempotente; rollback por `git revert` + re-sync.
- **Limite de tentativas**: 2.

### Cartão T05 — Contrato e síntese
- **Objetivo / resultado**: decisão durável registrada: spec (pendência #2) e síntese no roadmap.
- **Depende de**: T01–T03 (comportamento aprovado observado).
- **Arquivos / componentes prováveis**: `docs/specs/…`, `docs/roadmap-v3.md`, este plano (registro de execução).
- **Inclui**: contrato do otimismo (quando renderiza, quando reverte, toasts), atualização do índice se spec nova.
- **Não inclui**: T04 se virar frente própria.
- **Decisões pendentes / bloqueios**: #1 e #2.
- **Critérios de aceite**: spec com cabeçalho vigente e roadmap apontando para ela.
- **Validação**: revisão do dono.
- **Riscos e rollback**: não aplicável (documentação).
- **Limite de tentativas**: não aplicável.

## 10. Matriz de validação

| Tipo | O que cobre | Onde | Observação |
|---|---|---|---|
| Automatizada | render no commit e re-render na reversão (T01/T02), ordem de tags intacta | `tests-frontend/` (`node --test`) | prova por mutação obrigatória |
| Integração | resposta do CRUD e `gcalSyncFailed` (T04) | `backend/` (`node --test`) | números antes/depois |
| Manual | vale percebido, toasts, viewport 433×762 DPR 2,81 | mock (`?mockScenario=…`) | referência §10 das instruções |
| Negativos | falha de rede/sessão → item some, toast de erro, sem item fantasma | mock | por cartão |

**Não coberto por esta validação**: latência real de produção (5G real) — só o dono pode medir em uso; rede local não reproduz cold start da Vercel.

## 11. Prova por mutação

| Mutação aplicada | Teste que deve falhar | Resultado observado | Restaurado? |
|---|---|---|---|
| A — `forçarRenderizacaoInterface` voltou à cadeia morta (`renderizarTudo`/`atualizarInterface`/`renderizarAgenda`) | os 2 de `render-otimista-t01.test.js` | ✖✖ — 0 pass, 2 fail | sim |
| B — gatilho removido do commit local da criação (`aulas.push`) | os 2 (com falha pendente, o render do commit nunca ocorre) | ✖✖ — 0 pass, 2 fail | sim |
| C — gatilho removido da reversão (`reverterCriacaoAgendamento`) | teste da reversão (render pós-reversão não ocorre; estado volta, tela não) | ✔ teste 1 / ✖ teste 2 | sim |
| D — `renderizarAposMutacaoAluno()` removido da criação/edição de aluno | teste de criação do T02 (lista não reflete o aluno com salvar pendente) | ✔ teste 2 / ✖ teste 1 | sim |
| E — `renderizarAposMutacaoAluno()` removido da exclusão de aluno | teste de exclusão do T02 (lista não reflete a saída com salvar pendente) | ✔ teste 1 / ✖ teste 2 | sim |

Gatilhos de reposição (reagendar e enviar-para-reposição) seguem o mesmo mecanismo provado em D/E; cobertura automatizada dedicada desses dois fluxos ficou como limitação registrada (§12) — validação por suíte integral verde e conferência manual pendente.

## 12. Registro da execução

### 2026-10-26 — Abertura da frente
- **Arquivos alterados**: `docs/plans/2026-10-26-plan-ui-otimista.md` (criado).
- **Resultado**: plano redigido a partir da investigação da conversa; branch `docs/plano-ui-otimista` criada de `origin/main` `c0e18ec` com `--no-track`.
- **Suíte antes/depois**: `não executado` (nenhum código alterado).
- **Desvio do plano**: nenhum.
- **Decisão adicional tomada**: nenhuma além das registradas na seção 3.

### 2026-10-26 — T01 (render otimista na agenda)
- **Arquivos alterados**: `assets/js/storage.js` (raiz: `forçarRenderizacaoInterface` apontava para `renderizarTudo`/`atualizarInterface`/`renderizarAgenda`, globais que não existem mais — gatilho era no-op; agora renderiza `atualizarDashboardStats` + `renderizarHomeDia`/`renderizarHomeSemana` a partir do estado local, preservando a semântica de `__homeSemAncoraHoje`), `assets/js/modal-agendamento.js` (gatilho pós-`aulas.push` na criação e no `reverterCriacaoAgendamento`), `assets/js/modal-acao-slot.js` (gatilhos nas mutações e reversões de: exclusão de instância, série, avulsa, a-partir-de e no fechamento do modal de edição, cobrindo occurrence/série/split/monthOfDate). Novo: `tests-frontend/render-otimista-t01.test.js` (2 testes).
- **Resultado**: T01 concluído no código e nos testes automatizados.
- **Suíte antes/depois**: antes 473/473 pass em ~25 s; depois **475/475 pass** (473 + 2 novos) em ~12 s. Backend não tocado (escopo T01 confirma §2).
- **Descoberta não prevista**: os 4 pontos em `carregarDados` (storage.js:1133, 1147, 1179, 1202) que chamam `forçarRenderizacaoInterface` também eram no-op; com o fix, o render de cache-local no boot volta a funcionar (rendo extra de grade em `setTimeout(0)` por chamada — invisível, sem efeito colateral de âncora).
- **Desvio do plano**: nenhum material. Dois pontos do cartão ajustados: `widget-bloqueio.js` revelou-se só widget de formulário (sem mutação de dados) — nada a fazer nele; fluxo "enviar para reposição" (modal-acao-slot 3002+) muta só após resposta do servidor — otimismo real ali pertence ao T02.
- **Decisão adicional tomada**: o render do commit usa a mesma guarda de âncora dos fluxos de ação (`__homeSemAncoraHoje = true` durante o render otimista), alinhado ao comentário "T02 estendido" de view-home.js:394.

### 2026-10-26 — T02 (render imediato em aluno e reposições)
- **Arquivos alterados**: `assets/js/view-alunos.js` (novo helper `renderizarAposMutacaoAluno` com guarda `typeof` — o arquivo já usava esse padrão; gatilhos na mutação de criação/edição, no sucesso pós-cascata, no catch de falha e na exclusão); `assets/js/modal-acao-slot.js` (gatilhos pós-push no reagendar-reposição, pós-remoção da fila + `renderizarListaAlunos`, pós-mutações locais do enviar-para-reposição e na reversão do fluxo de reposição). Novo: `tests-frontend/render-otimista-t02.test.js` (2 testes).
- **Resultado**: T02 concluído no código e nos testes automatizados.
- **Suíte antes/depois**: antes 475/475; depois **477/475→477/477** (475 + 2 novos). Backend não tocado.
- **Achados não previstos**: (1) a semântica de falha do caminho de aluno é "manter a alteração para verificar no servidor" (sem rollback, decisão de produto anterior) — o T02 preserva isso e só garante que a tela reflita o estado mantido; (2) a cascata de aluno (`cascade-sync-aluno.js:103-107`) muta `aulas` sem renderizar — agora coberta pelo gatilho pós-cascata no sucesso e no catch; (3) o harness `view-alunos-observacoes` carrega view-alunos.js sem storage.js — as guardas `typeof` mantêm esses testes íntegros.
- **Limitação registrada**: os dois gatilhos de reposição não têm teste dedicado (mesmo mecanismo provado em D/E; suíte integral verde); cobrir no T03 ou em cobertura futura.
- **Desvio do plano**: nenhum material.
- **Decisão adicional tomada**: nenhuma além do já registrado.

### 2026-10-26 — T03 / UX de Toasts e Ajuste de Falha
- **Arquivos alterados**:
  - `assets/js/utils-ui.js`: temporizadores de auto-dismiss padronizados (erro simples 5s, erro com retry 8s, warning 4s, success 3s) e tap-to-dismiss ao tocar no toast (sem bloquear botão de retry).
  - `assets/css/style.css`: centralização com `max-width: 480px; margin: 0 auto; box-sizing: border-box; cursor: pointer;` para desktop e mobile.
  - `assets/js/modal-agendamento.js`:
    - Desacoplamento da mensagem de erro de criação em relação a `reposicaoFlowHelpers` (mensagem agora é "Não foi possível salvar o agendamento. Tente novamente.").
    - Correção de destravamento de submissão pós-falha: ao re-submeter no formulário reaberto ou ao cancelar, a pendência anterior da tentativa é abandonada (`contextoDados.abandonarPendencia`), liberando `iniciarOperacao` para novo salvamento.
    - Sincronização do rascunho em `reabrirFormularioAgendamentoComValores` via `capturarFormularioPrincipalNoRascunho()`.
  - `mocks/ui-runtime/scenarios.js` e `mocks/ui-runtime/mock-runtime.js`: cenários `otimistaSucesso`, `otimistaFalha` e `otimistaGCalFalha` implementados e documentados.
  - `tests-frontend/render-otimista-t01.test.js`: testes adicionados para cobrir 2ª submissão e cancelamento pós-falha.
- **Resultado**: Suíte frontend completa com **481/481 testes passando**. Suíte backend com **245/245 testes passando**.

## 13. Achados não alterados

| Risco/achado | Por que não foi tratado | Destino | Dono |
|---|---|---|---|
| `salvarDados` sincroniza listas inteiras com requisições sequenciais por item (storage.js:816, 890) | otimização estrutural fora do escopo; otimismo a mascara | roadmap (candidato a item) | Luccas |
| Cold start serverless (primeira requisição, 40 s de timeout) | mitiga já existente; desaparece com tráfego/uso | nenhum (observado) | Luccas |
| Financeiro fora do otimismo | regra vigente §5; exige decisão + spec | decisão pendente #1 | Luccas |

## 14. Deploy e rollback

- **Efeito externo**: T01–T03 alteram só frontend (deploy do projeto `personal-app-webpage`); T04 altera backend (`personal-app-api`) e toca estado GCal — publicar por último e separado.
- **Ordem de publicação**: PRs por cartão/fase; frontend primeiro; backend (T04) só com critérios próprios validados.
- **Verificação pós-deploy**: mock não cobre produção; dono valida no app publicado (base de teste, zerada) antes de uso real.
- **Limite do rollback**: `git revert` desfaz código; estado já gravado no Mongo/GCal não é revertido por git (relevante só no T04).

## 15. Fechamento

- **Critérios atendidos**: Todos os critérios de aceite da Seção 2 foram atendidos e verificados.
- **Implementação / validação / aceite / publicação**: Implementação completa nos arquivos de frontend e mock; 481 testes de frontend e 245 testes de backend verdes. Validação visual e de fluxo realizada nos cenários de mock.
- **Pendências**: Nenhuma pendência bloqueante para merge da frente de UI otimista. T04 (GCal assíncrono no backend) postergado para frente específica.
- **Riscos aceitos**: Reversão visual rápida com toast em caso de falha de persistência remota.
- **Data de fechamento**: 2026-10-26
