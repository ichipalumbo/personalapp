# Plano — Confiabilidade de Sincronização (GCal/Sessão), Blindagem Financeira e Operação Rápida em Alunos

> **Status**: `Em execução` — T00, T01, T02 e T03 concluídos; T04–T06 aguardando execução
> **Abertura**: 2026-10-27
> **Atualizado**: 2026-11-03
> **Responsável**: Luccas (dono) + agente
> **Branch**: `feat/confiabilidade-gcal-testes-alunos` (criada a partir de `origin/main` em `20a85a9` com `--no-track`)
> **Diagnóstico de origem**: nenhum documento autônomo — decisões tomadas no grill de 2026-10-27 com inspeção direta de `agendamentoController.js`, `gcalSyncService.js`, `bootstrap.js`, `google-identity.js` e `storage.js` (dispensável por [`docs/README.md`](../README.md), "Ciclo de vida", item 2)
> **Contratos duráveis**: [`docs/specs/gcal-sync.md`](../specs/gcal-sync.md), [`docs/specs/interface-e-navegacao.md`](../specs/interface-e-navegacao.md), [`docs/specs/financas-ciclo-cobranca.md`](../specs/financas-ciclo-cobranca.md) e [`docs/specs/reposicoes-e-competencia.md`](../specs/reposicoes-e-competencia.md)
> **Válido contra**: `20a85a9` (`main`)

> **Este arquivo é vivo.** Enquanto a frente estiver aberta, ele recebe decisões, execução,
> medições e desvios. Não crie um relatório separado para "o depois".
> Depois de fechado, **não é reescrito**: trabalho posterior gera documento novo.

---

## 1. Objetivo

Executar a sequência priorizada para o uso diário da Prô Josy após a entrega da UI otimista: (1) consolidar sessão e sincronização com o Google Calendar tirando a chamada externa do caminho crítico do CRUD na Vercel (T04 da frente anterior + itens `2.2`, `2.3`, Risco `1.1` e Risco `1.3`), (2) ampliar a blindagem automatizada de finanças e reposições (`3.1`), e (3) entregar as melhorias rápidas de operação na tela de Alunos (`1.7` busca por nome e `1.4` atalho WhatsApp). Resultado observável: CRUD de agendamento responde em ~50–100 ms no MongoDB com flush assíncrono seguro na Vercel, boot sem chamadas redundantes nem divergência de conta Google no celular, full sync cobrindo 6 meses à frente, suítes automatizadas cobrindo as lacunas financeiras/reposições e localização/contato imediato de alunos.

---

## 2. Critérios de aceite

- [x] **Documental (T00)**: planos concluídos (`2026-10-17-plan-aplicacao-identidade-visual.md` e `2026-10-26-plan-ui-otimista.md`) arquivados em [`docs/archive/plans/`](../archive/plans/) com links preservados; [`docs/roadmap-v3.md`](../roadmap-v3.md) atualizado com o item `5.11` e com as decisões desta frente.
- [x] **Sessão e Boot (T01 — Item `2.2` + Risco `1.3`)**: perfil derivado diretamente do JWT válido em `gis_session_cache` (impedindo exibir conta A enquanto assina requisições com conta B no celular); gatilhos de sincronização e renovação do canal GCal coordenados de forma idempotente por `ownerEmail` entre boot, restauração tardia de sessão (`auth-change`) e retorno à aba (`visibilitychange`), preservando integralmente o B2 (`2.4`).
- [x] **GCal fora do caminho crítico na Vercel (T02 — antigo `T04`)**: `POST`/`PUT`/`DELETE /api/agendamentos` confirmam imediatamente no MongoDB (`gcalStatus: 'pendente'` em criações/edições; deleção imediata no Mongo + registro em `GcalReconciliationQueue` pelo **Outbox Pattern** no `DELETE`); flush dedicado pós-save sincroniza os itens pendentes com o Google Calendar sem risco de congelamento de Lambda na Vercel e mantém os toasts de falha parcial (`gcalSyncFailed` / `tokenExpired`).
- [x] **Janela de Full Sync e Data Base (T03 — Item `2.3` + Risco `1.1`)**: modo full de `listCalendarEvents` ampliado de `[-1 mês, +2 meses]` para `[-1 mês, +6 meses]`, com reconciliação restrita à mesma janela; `gcalSyncService.js` alinhado à precedência canônica de data base de `recurrence-helpers.js` (`dataCriacao || recorrenciaDataInicio || data`), sem alterar o motor financeiro.
- [ ] **Contratos e Riscos (T04)**: [`docs/specs/gcal-sync.md`](../specs/gcal-sync.md) e [`docs/reference/lessons-learned.md`](../reference/lessons-learned.md) atualizados refletindo o desacoplamento do CRUD, o Outbox no `DELETE`, a nova janela `[-1m, +6m]` e o encerramento dos riscos `1.1` e `1.3`.
- [ ] **Blindagem Financeira e de Reposições (T05 — Item `3.1`)**: lacunas inventariadas nas regras financeiras/reposições e os 2 gatilhos otimistas de reposição (enviar para reposição e reagendar reposição) cobertos por testes automatizados provados por mutação.
- [ ] **Operação Rápida em Alunos (T06 — Itens `1.7` e `1.4`)**: busca textual instantânea somente por nome na lista de alunos (`1.7`) e botão de atalho WhatsApp (`wa.me/55...` para números nacionais de 10–11 dígitos, oculto/desabilitado quando telefone ausente ou inválido, `1.4`).
- [ ] **Segurança e Isolamento**: toda query e fila (`Agendamento`, `GcalReconciliationQueue`, `GoogleCalendarConnection`) estritamente filtrada por `ownerEmail` via `getOwnerEmailOrThrow(req)` (regra 4.1).
- [ ] **Regressão e Validação Visual**: suítes de backend (`backend/`) e frontend (`tests-frontend/`) medidas antes e depois de cada cartão aplicável, com prova por mutação para todo teste novo; validação visual no mock no viewport de referência `433×762`, `DPR 2.81`.

---

## 3. Decisões fechadas

| Decisão | Data | Responsável | Consequência técnica |
|---|---|---|---|
| Foco 100% na operação diária e confiabilidade para a Prô Josy | 2026-10-27 | Luccas | Épicos de plataforma (`4.1`–`4.8`) e verificação pública de OAuth permanecem fora da fila imediata |
| Sequência de ondas: Passo 0 (Higiene) → Onda 1 (GCal/Sessão) → Onda 2 (`3.1` Testes) → Onda 3 (`1.7`+`1.4` Alunos) → Onda 4 (`1.2`/`1.5` Finanças) | 2026-10-27 | Luccas | Prioriza estabilidade de sincronização e blindagem de testes antes de evoluir regras financeiras |
| Executar o desacoplamento do GCal no backend (antigo `T04`) já na Onda 1 | 2026-10-27 | Luccas | Incorporado como Cartão T02 deste plano e consolidado no item `2.2` do roadmap |
| Arquitetura do T02 (antigo `T04`): Opção A — Commit rápido no Mongo + endpoint dedicado de flush GCal pós-save | 2026-10-27 | Luccas | Evita que a Vercel congele Promises fire-and-forget após `res.json()`, acelera séries/cascatas e preserva o retorno de `gcalSyncFailed` para o toast |
| Comportamento do `DELETE` no T02: **Outbox Pattern** via `GcalReconciliationQueue` | 2026-10-27 | Luccas | `DELETE /api/agendamentos/:id` apaga do Mongo imediatamente (não ressuscita aula nem cobra indevidamente se o Google falhar) e enfileira `{ action: 'delete', googleCalendarEventId }` para o flush remover do Google |
| Risco `1.3` + Item `2.2` juntos no T01: derivar perfil do JWT da sessão e unificar coordenador de boot/auth-change | 2026-10-27 | Luccas | `gis_session_cache` passa a ser a fonte única de verdade para token + perfil; coordenador idempotente por `ownerEmail` garante 1 verificação de status e 1 verificação de canal por sessão |
| Item `2.3`: nova janela do Full Sync em `[-1 mês, +6 meses]` | 2026-10-27 | Luccas | Cobre 1 semestre de bloqueios/feriados futuros sem inflar excessivamente o payload de `singleEvents=true` |
| Risco `1.1`: `recurrence-helpers.js` é a referência canônica da data base | 2026-10-27 | Luccas | `gcalSyncService.js` alinha-se à ordem `dataCriacao \|\| recorrenciaDataInicio \|\| data` (ou consome helper compartilhado), mantendo o cálculo financeiro intocado |
| Escopo enxuto de `1.7` e `1.4` na tela de Alunos | 2026-10-27 | Luccas | `1.7`: apenas busca textual instantânea por nome (sem filtros extras); `1.4`: link `wa.me/55...` normalizando 10–11 dígitos e oculto/desabilitado quando sem telefone válido |
| Continuar na branch `main` para o Passo 0 e criação deste plano | 2026-10-27 | Luccas | Registro documental concluído na branch atual; implementação de código pedirá confirmação de branch e das áreas sensíveis (§7 das instruções) |

---

## 4. Decisões pendentes

| # | Pergunta | Opções | Bloqueante? |
|---|---|---|---|
| 1 | Na Onda 4 (após concluirmos T01–T06), qual evolução financeira atacar primeiro: `1.2` (Exportação CSV de faturamento) ou `1.5` (Presença, falta e cancelamento pelo aluno)? | A: `1.2` CSV / B: `1.5` Presença e falta | Não bloqueia T01–T06; decidir ao abrir a Onda 4 |
| 2 | Persistência de login com sessão própria do backend (`4.9`) será necessária após a correção do Risco `1.3` (T01)? | A: Avaliar no uso real após T01 / B: Abrir plano próprio | Não bloqueia T01–T06 |

---

## 5. Escopo

- **Arquivos/componentes prováveis**:
  - **Documentação (T00 e T04)**: [`docs/roadmap-v3.md`](../roadmap-v3.md), [`docs/README.md`](../README.md), [`docs/specs/gcal-sync.md`](../specs/gcal-sync.md), [`docs/reference/lessons-learned.md`](../reference/lessons-learned.md), [`docs/archive/plans/`](../archive/plans/).
  - **Sessão e Gatilhos de Boot (T01 — Áreas sensíveis: Autenticação e GCal)**: [`assets/js/auth/google-identity.js`](../../assets/js/auth/google-identity.js), [`assets/js/app-shell/bootstrap.js`](../../assets/js/app-shell/bootstrap.js), [`assets/js/google-calendar.js`](../../assets/js/google-calendar.js).
  - **GCal fora do caminho crítico / Outbox (T02 — Área sensível: GCal)**: [`backend/src/controllers/agendamentoController.js`](../../backend/src/controllers/agendamentoController.js), [`backend/src/services/gcalSyncService.js`](../../backend/src/services/gcalSyncService.js), [`backend/src/models/GcalReconciliationQueue.js`](../../backend/src/models/GcalReconciliationQueue.js), [`backend/src/routes/`](../../backend/src/routes), [`assets/js/storage.js`](../../assets/js/storage.js), [`mocks/ui-runtime/mock-runtime.js`](../../mocks/ui-runtime/mock-runtime.js).
  - **Full Sync `[-1m, +6m]` e Risco `1.1` (T03 — Área sensível: GCal)**: [`backend/src/services/gcalSyncService.js`](../../backend/src/services/gcalSyncService.js), [`backend/shared/recurrence-helpers.js`](../../backend/shared/recurrence-helpers.js) (somente exportação/consumo se aplicável, sem alterar regra de recorrência).
  - **Blindagem de Testes (T05)**: [`backend/test/`](../../backend/test) (ou arquivos `*.test.js` em `backend/`), [`tests-frontend/`](../../tests-frontend).
  - **Alunos — Busca e WhatsApp (T06)**: [`assets/js/view-alunos.js`](../../assets/js/view-alunos.js), [`index.html`](../../index.html), [`assets/css/style.css`](../../assets/css/style.css), [`tests-frontend/`](../../tests-frontend).
- **Comportamentos que mudam**:
  - `gis_profile_cache` deixa de poder divergir de `gis_session_cache`;
  - Boot e restauração tardia de sessão disparam verificação de status e renovação do canal GCal uma única vez por `ownerEmail`;
  - `POST`/`PUT`/`DELETE /api/agendamentos` respondem após gravar no MongoDB, enquanto a sincronização com o Google Calendar ocorre em flush dedicado logo em seguida;
  - `DELETE` apaga do MongoDB imediatamente mesmo se o Google estiver indisponível, reconciliando a deleção via `GcalReconciliationQueue`;
  - Full Sync do Google Calendar passa a buscar de `-1 mês` a `+6 meses`;
  - Lista de alunos ganha campo de busca por nome e botão de contato via WhatsApp.

---

## 6. Fora de escopo

- Refatoração do diff completo de `salvarDados` em `storage.js` para envio em lote único de agendamentos (estacionado como candidato futuro se houver gargalo real após o T02).
- Mutações otimistas em operações financeiras (`PATCH` de pagamento e ajuste manual permanecem aguardando HTTP 200, conforme regra §5 das instruções permanentes).
- Épicos de plataforma (`4.1` a `4.8`) e preparação de verificação pública do OAuth Google.
- Sessão própria de autenticação no backend (`4.9`), condicionada à avaliação pós-T01.
- Alteração na lógica de cálculo financeiro (`financasService.js`, `calculo-ciclo.js`) ou na expansão de recorrência (`recurrence-helpers.js`).

---

## 7. Invariantes a preservar

- **Isolamento estrito por `ownerEmail`** (`getOwnerEmailOrThrow(req)`) em toda query ao MongoDB, inclusive nas operações sobre `GcalReconciliationQueue` e no novo endpoint de flush de pendentes (regra 4.1).
- **Módulos compartilhados (`backend/shared/`)** sem dependência de DOM/`window` e consumidos como fonte única entre frontend e backend (regras 4.2 e 4.3).
- **Ordem de declaração de rotas Express**: rotas literais (ex.: `/sync-pending` ou `/flush-gcal`) declaradas **antes** de rotas com parâmetro `/:id` (regra 4.4).
- **B2 (`2.4`) preservado**: a coordenação de gatilhos do T01 não reimplementa nem enfraquece a revalidação segura do cache no boot entregue no PR #70.
- **Regras financeiras intocadas**: snapshots de preço, congelamento de ciclo pago (HTTP 409) e piso zero permanecem inalterados (regra 5).
- **Confirmação prévia em áreas sensíveis**: antes de iniciar a implementação de código nos cartões T01, T02 e T03 (que tocam `google-identity.js`, `gcalSyncService.js` e `agendamentoController.js`), confirmar explicitamente com o dono conforme a seção 7 de `.github/copilot-instructions.md`.

---

## 8. Baseline

- **Estado da branch e do working tree na abertura**: branch `main` em `429386a` antes do T00; branch `feat/confiabilidade-gcal-testes-alunos` criada em `20a85a9` com working tree limpo antes do T01.
- **Suíte medida na base (`20a85a9`)**: Frontend medida antes do T01 em `487/487` passando (`tests-frontend/`), e após o T01 em `491/491` passando. Backend medida na abertura em `245/245` passando (será remedida antes do T02).
- **Condição de parada se o baseline divergir**: se qualquer uma das suítes (`tests-frontend/` ou `backend/`) falhar na base limpa antes de iniciar um cartão de código, interromper a execução e reportar ao dono.

---

## 9. Cartões de tarefas

### Cartão T00 — Higiene documental e abertura do plano vivo
- **Objetivo / resultado**: arquivar os planos concluídos (`5.10` e UI otimista) em `docs/archive/plans/`, atualizar `docs/roadmap-v3.md` com as entregas e decisões do grill e registrar este plano detalhado em `docs/plans/`.
- **Depende de**: nenhum.
- **Arquivos / componentes**: `docs/roadmap-v3.md`, `docs/README.md`, `docs/archive/plans/2026-10-17-plan-aplicacao-identidade-visual.md`, `docs/archive/plans/2026-10-26-plan-ui-otimista.md`, `docs/plans/2026-10-27-plan-confiabilidade-gcal-testes-alunos.md`.
- **Inclui**: movimentação com ajuste mecânico de links relativos, adição do item `5.11` no roadmap e detalhamento dos cartões T01–T06.
- **Não inclui**: alteração de código de produção ou de testes.
- **Decisões pendentes / bloqueios**: nenhum.
- **Critérios de aceite**: links relativos válidos, `git status` limpo de arquivos temporários e plano registrado em `docs/plans/`.
- **Validação**: conferência de links via busca e mock aberto no viewport de referência `433×762`, `DPR 2.81`.
- **Riscos e rollback**: reversão simples por `git`.
- **Limite de tentativas**: não aplicável (concluído).

---

### Onda 1 — Confiabilidade Google Calendar & Sessão

### Cartão T01 — Blindar cache de sessão/perfil (Risco `1.3`) e consolidar gatilhos de sincronização no boot (Item `2.2`)
- **Objetivo / resultado**: eliminar a possibilidade de divergência silenciosa entre `gis_session_cache` e `gis_profile_cache` no celular com duas contas Google e unificar os gatilhos de sincronização/renovação do Google Calendar entre boot e `auth-change` num coordenador único idempotente por `ownerEmail`.
- **Depende de**: T00.
- **Arquivos / componentes prováveis**: `assets/js/auth/google-identity.js`, `assets/js/app-shell/bootstrap.js`, `assets/js/google-calendar.js`, `tests-frontend/`.
- **Inclui**:
  1. Em `google-identity.js`: derivar `_profile` (`name`, `email`, `picture`, `sub`) diretamente do payload do `idToken` válido ao persistir e restaurar a sessão; limpar `gis_profile_cache` sempre que `gis_session_cache` expirar, for inválido ou ausente; manter compatibilidade de leitura.
  2. Em `bootstrap.js`: substituir os disparos separados de `iniciarSyncGoogleCalendarAutomatica` e `dispararVerificacaoCanalGCal` no boot e no `addAuthChangeListener` por um coordenador único por `ownerEmail` (garantindo que tanto o login disponível no boot quanto a sessão restaurada após `whenReady` disparem exatamente 1 verificação de status e 1 verificação de canal `webhook/renew`, e que a troca de conta reexecute para o novo `ownerEmail`).
- **Não inclui**: alterar `syncBootDados` (B2 / item `2.4`), alterar `OCULTO_MINIMO_PARA_REFRESH_MS` do `visibilitychange` ou implementar sessão própria no backend (`4.9`).
- **Decisões pendentes / bloqueios**: confirmar aviso de área sensível (`google-identity.js` e GCal, seção 7 das instruções) antes de editar.
- **Critérios de aceite**:
  - Se `gis_profile_cache` contiver a conta A e `gis_session_cache` contiver o JWT da conta B (ou estiver expirado), o app nunca exibe a conta A nem mistura identidades;
  - No boot autenticado, `/gcal/auth/status` e `/gcal/webhook/renew` são chamados no máximo 1 vez cada para o `ownerEmail` ativo;
  - Na restauração de sessão após `whenReady`, `/gcal/webhook/renew` também é disparado 1 vez para o `ownerEmail` restaurado.
- **Validação**: testes unitários/DOM em `tests-frontend/` provados por mutação; validação no mock em `433×762`, `DPR 2.81`.
- **Riscos e rollback**: regressão no fluxo de login ou inicialização do header; rollback por `git revert`.
- **Limite de tentativas**: 2; ao atingir, parar, registrar evidência e pedir decisão ao dono.

### Cartão T02 — Desacoplar Google Calendar do caminho crítico do CRUD na Vercel (antigo `T04`) com Outbox no `DELETE`
- **Objetivo / resultado**: fazer `POST`, `PUT` e `DELETE /api/agendamentos` responderem HTTP 200 imediatamente após persistir no MongoDB (~50–100 ms), executando a sincronização com o Google Calendar em um endpoint dedicado de flush chamado pelo frontend ao final do batch de `salvarDados`, usando `GcalReconciliationQueue` (Outbox Pattern) para deleções.
- **Depende de**: T01.
- **Arquivos / componentes prováveis**: `backend/src/controllers/agendamentoController.js`, `backend/src/services/gcalSyncService.js`, `backend/src/models/GcalReconciliationQueue.js`, `backend/src/routes/agendamentoRoutes.js` (ou `gcalRoutes`), `assets/js/storage.js`, `mocks/ui-runtime/mock-runtime.js`, `backend/test/`, `tests-frontend/`.
- **Inclui**:
  1. Em `POST` e `PUT /api/agendamentos`: gravar no MongoDB marcando `gcalStatus: 'pendente'` (respeitando a guarda de estado terminal `gcalSyncPausado` quando não houve edição) e retornar HTTP 200 imediatamente sem aguardar `googleapis`.
  2. Em `DELETE /api/agendamentos/:id`: apagar o documento de `Agendamento` no MongoDB imediatamente e, se possuía `googleCalendarEventId`, gravar `{ ownerEmail, action: 'delete', googleCalendarEventId, agendamentoId: id }` em `GcalReconciliationQueue`, retornando HTTP 200.
  3. Novo endpoint autenticado (declarado antes de rotas `/:id`, regra 4.4, filtrado por `ownerEmail`, regra 4.1) para processar os agendamentos com `gcalStatus: 'pendente'` e os itens da `GcalReconciliationQueue` do `ownerEmail`, retornando os `googleCalendarEventId` criados/atualizados e as flags `gcalSyncFailed` / `tokenExpired` / `needsReconnect`.
  4. Em `storage.js` (`_sincronizarAgendamentosViaCRUD`): disparar o flush ao final do envio dos agendamentos modificados/excluídos, mesclando os `googleCalendarEventId` retornados no estado local e mantendo exatamente o mesmo contrato de toasts de falha parcial (`gcalSyncFailed`).
- **Não inclui**: alterar webhooks do Google Calendar, credenciais OAuth ou regras financeiras.
- **Decisões pendentes / bloqueios**: nenhum — aviso de área sensível (`gcalSyncService.js` / `agendamentoController.js`) confirmado pelo dono antes da edição.
- **Critérios de aceite**:
  - `POST`/`PUT`/`DELETE /api/agendamentos` não invocam a API do Google dentro da própria requisição CRUD;
  - Falha transitória do Google durante uma exclusão não mantém o agendamento vivo no MongoDB;
  - Quando o flush encontra `200/204/404/410` no `DELETE` do Google, o registro sai da `GcalReconciliationQueue`; quando encontra erro `5xx`/rede, permanece na fila e sinaliza `gcalSyncFailed: true`;
  - Toasts de sucesso, falha parcial do GCal (`otimistaGCalFalha`) e falha de persistência continuam funcionando no frontend e no mock.
- **Validação**: suíte `backend/` e `tests-frontend/` antes e depois com prova por mutação; validação nos cenários `otimistaSucesso`, `otimistaFalha` e `otimistaGCalFalha` do mock em `433×762`, `DPR 2.81`.
- **Riscos e rollback**: estado pendente na fila se o cliente fechar o app entre o CRUD e o flush (mitigado por processar pendentes também no próximo flush/sync); rollback de código por `git revert`.
- **Limite de tentativas**: 2.

### Cartão T03 — Ampliar janela do Full Sync para `[-1m, +6m]` (Item `2.3`) e alinhar precedência de data base (Risco `1.1`)
- **Objetivo / resultado**: ampliar a janela do modo full de `listCalendarEvents` de `[-1 mês, +2 meses]` para `[-1 mês, +6 meses]` e alinhar `resolverDataISO` em `gcalSyncService.js` à precedência canônica de `recurrence-helpers.js` (`dataCriacao || recorrenciaDataInicio || data`).
- **Depende de**: T02.
- **Arquivos / componentes prováveis**: `backend/src/services/gcalSyncService.js`, `backend/shared/recurrence-helpers.js` (se exposto helper), `backend/test/`.
- **Inclui**:
  1. Em `listCalendarEvents` (`gcalSyncService.js`): alterar `timeMax` de `+2 meses` para `+6 meses`, mantendo `timeMin` em `-1 mês` e o purge de `BloqueioExterno` restrito a `isBloqueioDentroDaJanela`.
  2. Em `gcalSyncService.js`: alinhar a resolução da data base à ordem canônica de `recurrence-helpers.js` (`dataCriacao || recorrenciaDataInicio || data`).
- **Não inclui**: alterar a lógica de `recurrence-helpers.js` usada pelo financeiro/agenda nem alterar o comportamento de fallback de data inválida (Risco `1.2`, mantido separado para não quebrar testes existentes sem decisão específica).
- **Decisões pendentes / bloqueios**: nenhum — aviso de área sensível (`gcalSyncService.js` e `recurrence-helpers.js`) confirmado pelo dono antes da edição.
- **Critérios de aceite**:
  - `listCalendarEvents` sem `syncToken` consulta `timeMin = -1 mês` e `timeMax = +6 meses`;
  - Agendamento com `dataCriacao` e `recorrenciaDataInicio` distintos resolve a mesma data base em `recurrence-helpers.js` e em `gcalSyncService.js`.
- **Validação**: testes automatizados em `backend/` provados por mutação; suíte completa do backend verde.
- **Riscos e rollback**: aumento moderado no número de instâncias retornadas no full sync (paginação via `nextPageToken` já suportada em `fetchCalendarPage`); rollback por `git revert`.
- **Limite de tentativas**: 2.

### Cartão T04 — Atualizar contratos vigentes (`gcal-sync.md`, `lessons-learned.md` e `roadmap-v3.md`)
- **Objetivo / resultado**: refletir nas fontes permanentes o novo contrato de sincronização pós-CRUD, o Outbox no `DELETE`, a janela `[-1m, +6m]`, a coordenação do boot (`2.2`) e o encerramento dos riscos `1.1` e `1.3`.
- **Depende de**: T01, T02, T03.
- **Arquivos / componentes prováveis**: `docs/specs/gcal-sync.md`, `docs/reference/lessons-learned.md`, `docs/roadmap-v3.md`.
- **Inclui**: atualização de versão no cabeçalho de `docs/specs/gcal-sync.md` (sem repetir o número em outros arquivos), atualização das seções 5.2, 6, 7 e 9.14, baixa dos riscos `1.1` e `1.3` em `lessons-learned.md` e marcação de `[x]` nos itens `2.2` e `2.3` do roadmap.
- **Não inclui**: alteração de código.
- **Decisões pendentes / bloqueios**: nenhum.
- **Critérios de aceite**: specs e roadmap consistentes e sem links quebrados.
- **Validação**: inspeção documental e verificação de links.
- **Riscos e rollback**: não aplicável (documentação).
- **Limite de tentativas**: não aplicável.

---

### Onda 2 — Blindagem Automatizada (`3.1`)

### Cartão T05 — Inventariar e cobrir lacunas de testes financeiros/reposições + gatilhos otimistas de reposição (Item `3.1`)
- **Objetivo / resultado**: fechar as lacunas automatizadas identificadas nas regras financeiras/reposições e adicionar os 2 testes dedicados de render otimista para "enviar para reposição" e "reagendar reposição" (pendência herdada do T02 da frente de UI otimista).
- **Depende de**: T04 (ou executável de forma independente após a Onda 1).
- **Arquivos / componentes prováveis**: `tests-frontend/render-otimista-t02.test.js` (ou novo arquivo de teste em `tests-frontend/`), testes em `backend/`, `docs/roadmap-v3.md`.
- **Inclui**:
  1. Inventário objetivo dos caminhos de `financasService.js`, `calculo-ciclo.js` e `reposicao-flow-helpers.js` ainda sem asserção direta;
  2. Testes automatizados no frontend cobrindo o commit otimista e a reversão em falha nos fluxos de enviar aula para reposição e reagendar reposição em `modal-acao-slot.js`;
  3. Testes automatizados no backend para as bordas financeiras/reposições inventariadas;
  4. Prova por mutação de cada teste novo.
- **Não inclui**: alterar regras de cálculo em `financasService.js` ou `calculo-ciclo.js` (a menos que um bug real seja descoberto, caso em que se para e pergunta ao dono).
- **Decisões pendentes / bloqueios**: nenhum.
- **Critérios de aceite**: todos os testes novos passam no código atual e falham quando a mutação correspondente é introduzida; item `3.1` atualizado no roadmap.
- **Validação**: suítes `backend/` e `tests-frontend/` antes e depois, com tabela de mutações preenchida na §11.
- **Riscos e rollback**: zero risco em produção (apenas arquivos de teste); rollback por `git revert`.
- **Limite de tentativas**: 2.

---

### Onda 3 — Operação Rápida em Alunos (`1.7` + `1.4`)

### Cartão T06 — Implementar busca por nome (`1.7`) e atalho rápido de WhatsApp (`1.4`) na tela de Alunos
- **Objetivo / resultado**: permitir filtrar instantaneamente a lista de alunos por nome e iniciar conversa no WhatsApp a partir do telefone cadastrado no card do aluno com um toque.
- **Depende de**: T05.
- **Arquivos / componentes prováveis**: `assets/js/view-alunos.js`, `index.html`, `assets/css/style.css`, `tests-frontend/`.
- **Inclui**:
  1. **Busca por nome (`1.7`)**: campo de busca textual no topo da tela de Alunos (filtragem case-insensitive e insensível a acentos sobre `aluno.nome`), preservando o termo digitado durante re-renders otimistas de edição/criação e exibindo estado vazio claro quando nenhum aluno corresponder à busca.
  2. **Atalho WhatsApp (`1.4`)**: helper puro de normalização de telefone (remove não-dígitos; aceita 10 ou 11 dígitos nacionais prefixando `55`, ou `55` + 10/11 dígitos já com DDI; rejeita números fora desse padrão); botão/link `https://wa.me/<numero>` com `target="_blank" rel="noopener noreferrer"` e alvo de toque mínimo de `44×44 px` no card do aluno; oculto/desabilitado quando o aluno não tiver telefone válido.
- **Não inclui**: filtros por status/objetivo/dia da semana nem envio automático de mensagens de cobrança.
- **Decisões pendentes / bloqueios**: nenhum.
- **Critérios de aceite**:
  - Digitar no campo de busca filtra os cards imediatamente sem perder foco nem quebrar a expansão dos cards;
  - Aluno com `(11) 98765-4321` gera link `https://wa.me/5511987654321`; aluno sem telefone ou com número inválido não exibe ação ativa de WhatsApp;
  - Alvos de toque ≥ 44×44 px e contraste conforme o guia no viewport `433×762`, `DPR 2.81`.
- **Validação**: testes em `tests-frontend/` provados por mutação + validação visual no mock nos viewports `433×762` (`DPR 2.81`), `390×844` e `320×568`.
- **Riscos e rollback**: interferência no clique de expandir card do aluno (mitigado com `stopPropagation` no link/botão do WhatsApp); rollback por `git revert`.
- **Limite de tentativas**: 2.

---

## 10. Matriz de validação

| Tipo | O que cobre | Onde | Observação |
|---|---|---|---|
| Automatizada (Frontend) | Consistência de sessão/perfil e coordenador de boot (T01), flush pós-save no `storage.js` (T02), gatilhos otimistas de reposição (T05), busca por nome e normalização de WhatsApp (T06) | `tests-frontend/` (`node --test`) | Prova por mutação obrigatória para cada teste novo |
| Automatizada (Backend) | CRUD desacoplado do GCal + Outbox `GcalReconciliationQueue` no `DELETE` + endpoint de flush (T02), janela `[-1m, +6m]` e precedência de data base (T03), casos financeiros/reposições (T05) | `backend/` (`node --test`) | Medir e reportar contagens antes e depois |
| Manual / Visual | Boot, toasts dos cenários `otimistaSucesso`/`otimistaFalha`/`otimistaGCalFalha`, busca de alunos e botão de WhatsApp no viewport `433×762`, `DPR 2.81` | Mock (`http://127.0.0.2:5500/index.html?mockScenario=...`) | Seguir seção 10 de `.github/copilot-instructions.md` |
| Negativos | Cache divergente entre duas contas Google (T01), falha do Google no `DELETE` sem ressuscitar agendamento (T02), telefone vazio/curto/inválido no card do aluno (T06) | `tests-frontend/`, `backend/` e mock | Por cartão |

**Não coberto por esta validação**: chamada real à API do Google Calendar em produção e abertura do aplicativo nativo do WhatsApp no aparelho físico — exigem validação pelo dono após o deploy.

---

## 11. Prova por mutação

| Mutação aplicada | Teste que deve falhar | Resultado observado | Restaurado? |
|---|---|---|---|
| **M1 (T01 — `google-identity.js`)**: aceitar `perfilFallback` sem validar igualdade do `email` com o JWT e manter `_profile = perfilEmCache` quando `gis_session_cache` está ausente | `T01-01` e `T01-02` em `tests-frontend/t01-sessao-boot-gcal.test.js` | Ambos falharam (`T01-01`: retornou `ana@example.com` em vez de `bia@example.com`; `T01-02`: manteve perfil residual com sessão ausente) | Sim |
| **M2 (T01 — `bootstrap.js`)**: remover guarda de idempotência `ownerEmail === ultimoOwnerEmailGCal` e omitir disparo de `renovarCanalGoogleCalendar` na restauração de sessão em `addAuthChangeListener` | `T01-03` e `T01-04` em `tests-frontend/t01-sessao-boot-gcal.test.js` | Ambos falharam (`T01-03`: duplicou `iniciarSyncGoogleCalendarAutomatica` para a mesma conta; `T01-04`: `chamadasRenovarCanal` ficou vazio `[]` após restauração tardia) | Sim |
| **M3 (T02 — `agendamentoController.js`)**: apagar o item da `GcalReconciliationQueue` também no ramo de erro `5xx`/rede do flush, eliminando a retenção do Outbox | `excluirAgendamento apaga do Mongo imediatamente e quando o Google falha com 500 no flush mantém item na GcalReconciliationQueue e sinaliza gcalSyncFailed` | Falhou (`1/8`): a fila ficou vazia e o teste não encontrou o item retido | Sim |
| **M4 (T02 — `agendamentoController.js`)**: desativar o upsert do Outbox em `excluirAgendamento` (`if (googleCalendarEventId && false)`), mantendo a deleção imediata no Mongo | `...enfileira na GcalReconciliationQueue e flush remove do Google`, `...trata 404/410 do Google como sucesso...` e `...quando o Google falha com 500...` | Falharam `3/8` (a ordem `['mongo','queue-outbox','google','queue-remove']` deixou de existir e a fila nunca foi populada) | Sim |
| **M5 (T02 — `storage.js`)**: desativar o flush pós-CRUD (`if (precisaFlushGcal && false)`) | `T02-01` e `T02-02` em `tests-frontend/t02-flush-gcal-storage.test.js` | Ambos falharam (`0/2`): nenhuma chamada a `POST /api/agendamentos/flush-gcal` e `gcalSyncFailed` não propagado | Sim |
| **M6 (T02 — `storage.js`)**: manter o flush mas remover a mesclagem de `googleCalendarEventId` retornado por ele | `T02-01` em `tests-frontend/t02-flush-gcal-storage.test.js` | Falhou (`1/2`): o agendamento local ficou sem `googleCalendarEventId`, enquanto `T02-02` (que não depende da mesclagem) continuou passando | Sim |
| **M7 (T03 — `gcalSyncService.js`)**: regredir `timeMax` do full sync de `+6` para `+2` meses | `T03-01` e `T03-02` em `backend/test/t03-janela-fullsync-data-base.test.js` | Ambos falharam (`2/5`, restaram 3 verdes): `timeMax` veio com ~61 dias em vez de ~182 | Sim |
| **M8 (T03 — `gcalSyncService.js`)**: trocar `resolverDataBaseRecorrencia` para a precedência antiga (`recorrenciaDataInicio \|\| data \|\| dataCriacao`) | `T03-04` em `backend/test/t03-janela-fullsync-data-base.test.js` | Falhou (`1/5`): o RRULE saiu com `BYMONTH=4;BYMONTHDAY=20` (de `recorrenciaDataInicio`) em vez de `BYMONTH=3;BYMONTHDAY=15` (de `dataCriacao`) | Sim |
| **M9 (T03 — `recurrence-helpers.js`)**: inverter a ordem do helper canônico para `data \|\| recorrenciaDataInicio \|\| dataCriacao` | `T03-03`, `T03-04` e `T03-05` em `backend/test/t03-janela-fullsync-data-base.test.js` | Falharam `3/5`: a precedência canônica e os dois consumidores no `gcalSyncService` divergiram | Sim |

---

## 12. Registro da execução

### 2026-10-27 — T00 (Higiene documental e abertura do plano vivo)
- **Arquivos alterados**:
  - `docs/archive/plans/2026-10-17-plan-aplicacao-identidade-visual.md` (movido de `docs/plans/`, com ajuste mecânico de 4 links relativos);
  - `docs/archive/plans/2026-10-26-plan-ui-otimista.md` (movido de `docs/plans/`);
  - `docs/roadmap-v3.md` (atualizado cabeçalho para `2026-10-27`, adicionada entrega `5.11`, registrados escopos confirmados em `1.4`, `1.7`, `2.2`, `2.3` e `3.1`, e apontado para este plano vivo);
  - `docs/README.md` (atualizado índice para referenciar o plano vivo da frente);
  - `docs/plans/2026-10-27-plan-confiabilidade-gcal-testes-alunos.md` (criado).
- **Resultado**: T00 concluído; todas as decisões das 3 rodadas do grill foram formalizadas em cartões incrementais (T01–T06).
- **Suíte antes/depois**: `não executado` (alteração estritamente documental).
- **Desvio do plano**: na primeira resposta do Passo 0, as decisões haviam sido registradas apenas no `roadmap-v3.md` sem criar o documento de plano em `docs/plans/`; corrigido imediatamente a pedido do dono com a criação deste plano completo seguindo `plan.template.md`.
- **Decisão adicional tomada**: continuar na branch `main` para o registro documental do T00.

### 2026-10-27 — T01 (Blindar cache de sessão/perfil e consolidar gatilhos de sincronização no boot)
- **Arquivos alterados**:
  - `assets/js/auth/google-identity.js`: adicionada `_derivarPerfilDoToken(token, perfilFallback)` e decodificação UTF-8 segura em `_decodeJwtPayload`; `_restoreCachedSession` e `_persistSession` passam a derivar `_profile` diretamente do JWT válido em `gis_session_cache`, aproveitando `gis_profile_cache` apenas quando pertence ao mesmo `email` e limpando `gis_profile_cache` sempre que `gis_session_cache` estiver ausente, inválido ou expirado; `isSignedIn`, `getOwnerEmail` e `getProfile` também passam a verificar expiração do token;
  - `assets/js/app-shell/bootstrap.js`: substituídos os disparos separados de `dispararVerificacaoCanalGCal` e `iniciarSyncGoogleCalendarAutomatica` por `coordenarGCalParaSessao`, idempotente por `ownerEmail` entre boot, `iniciarSyncBoot` e `addAuthChangeListener`, e sincronizado `ultimoOwnerEmail` após `googleIdentity.initialize()` para impedir reexecução duplicada quando o GIS confirma a mesma sessão já restaurada do cache;
  - `tests-frontend/t01-sessao-boot-gcal.test.js` (criado): 4 testes cobrindo divergência entre `gis_profile_cache` (conta A) e `gis_session_cache` (conta B), limpeza de `gis_profile_cache` quando `gis_session_cache` está ausente/expirado, idempotência no boot autenticado e disparo único de status + `webhook/renew` na restauração tardia de sessão e troca de conta;
  - `docs/plans/2026-10-27-plan-confiabilidade-gcal-testes-alunos.md`: atualizado com baseline medido, prova por mutação e registro do T01.
- **Resultado**: T01 concluído e validado por testes automatizados, prova por mutação e mock local.
- **Suíte antes/depois**: `tests-frontend/` antes `487/487` passando → depois `491/491` passando.
- **Desvio do plano**: nenhum.
- **Decisão adicional tomada**: criada branch `feat/confiabilidade-gcal-testes-alunos` a partir de `origin/main` (`--no-track`), autorizadas as áreas sensíveis (§7) e definido pelo dono executar apenas o T01 nesta rodada.

### 2026-11-03 — T02 (GCal fora do caminho crítico do CRUD com Outbox no `DELETE`)
- **Arquivos alterados**:
  - `backend/src/controllers/agendamentoController.js`: `criarAgendamento` e `atualizarAgendamento` gravam com `gcalStatus: 'pendente'` (preservando a guarda de estado terminal `gcalSyncPausado`) e respondem 200 sem chamar `googleapis`; `excluirAgendamento` apaga do Mongo imediatamente e faz upsert de `{ ownerEmail, action: 'delete', googleCalendarEventId, agendamentoId }` em `GcalReconciliationQueue`, devolvendo `queuedForGcalDelete`; novo `sincronizarPendentesGcal` processa a fila de deleções e os agendamentos pendentes do `ownerEmail`, limpando a fila em `200/204/404/410` e retendo o item com `gcalSyncFailed: true` em `5xx`/rede;
  - `backend/src/routes/agendamentoRoutes.js`: `POST /flush-gcal` declarado **antes** de `router.route('/:id')` (regra 4.4);
  - `backend/src/services/gcalSyncService.js`: `reconcileAndSyncRetroactiveAppointments` passou a varrer também `{ gcalStatus: 'pendente' }` e o `deleteOne` da `GcalReconciliationQueue` deixou de descartar itens em erro `5xx`;
  - `assets/js/storage.js`: `_sincronizarAgendamentosViaCRUD` dispara `POST /api/agendamentos/flush-gcal` ao final do batch quando houve `gcalStatus: 'pendente'` ou `queuedForGcalDelete: true`, mescla os `googleCalendarEventId` retornados e propaga `gcalSyncFailed`; `_normalizarAgendamentoParaComparacao` e `_removerCamposPendenciaGcalDoAgendamento` ignoram/limpam `gcalStatus` para não gerar diff falso entre `sincronizado`/`desconectado` e o estado local;
  - `mocks/ui-runtime/mock-runtime.js`: simula `POST /api/agendamentos/flush-gcal` e devolve `gcalStatus: 'pendente'`/`queuedForGcalDelete` nos cenários `otimistaSucesso`, `otimistaFalha` e `otimistaGCalFalha`;
  - `backend/test/gcal-duplicata-fix.test.js`, `backend/test/gcal-login-fallback.test.js` e `backend/test/gcal-sync.test.js`: 13 testes de controller alinhados à arquitetura `CRUD + sincronizarPendentesGcal` e 5 asserções de rollback otimista atualizadas para o contrato pós-PR #77 (`obterPendencia() === null` e `semOperacoes() === true`);
  - `tests-frontend/t02-flush-gcal-storage.test.js` (criado): `T02-01` (flush após `POST` pendente, ordem `POST → flush` e mesclagem do `googleCalendarEventId`) e `T02-02` (flush após `DELETE` com `queuedForGcalDelete`, propagação de `gcalSyncFailed` e toast de aviso);
  - `docs/plans/2026-10-27-plan-confiabilidade-gcal-testes-alunos.md`: atualizado com este registro, as mutações M3–M6 e o fechamento do cartão.
- **Resultado**: T02 concluído; nenhum `POST`/`PUT`/`DELETE` de agendamento chama a API do Google dentro da própria requisição e a falha transitória do Google na exclusão não ressuscita o agendamento no MongoDB.
- **Suíte antes/depois**: `backend/` antes `240/245` (5 falhas pré-existentes em `gcal-duplicata-fix.test.js` por asserções defasadas do PR #77) → baseline ajustada `245/245` → depois `245/245` passando; `tests-frontend/` antes `491/491` → depois `493/493` passando.
- **Desvio do plano**: as 5 falhas encontradas no baseline do `backend/` não eram do T02 — vinham de asserções de rollback otimista anteriores ao PR #77. Com autorização do dono, foram atualizadas no lugar em vez de ignoradas, porque cobrem rollback de série (`occurrence` e `fromDate`) que nenhuma outra suíte exercita.
- **Decisão adicional tomada**: o flush em `storage.js` só dispara quando a resposta do CRUD traz `gcalStatus: 'pendente'` ou `queuedForGcalDelete: true`, o que mantém compatibilidade com harnesses sintéticos de teste que não conhecem a rota nova.

### 2026-11-03 — T03 (Janela do full sync `[-1m, +6m]` e precedência canônica da data base)
- **Arquivos alterados**:
  - `backend/shared/recurrence-helpers.js`: extraída `resolverDataBaseCompromisso(comp)` com a precedência canônica `dataCriacao || recorrenciaDataInicio || data`; `resolverCompromissoRecorrenteNaData` passou a consumi-la em vez de repetir a expressão, e o helper foi exportado. Refatoração sem mudança de comportamento — o motor financeiro/agenda continua idêntico;
  - `backend/src/services/gcalSyncService.js`: novo adaptador `resolverDataBaseRecorrencia(agendamento)`, que consome o helper canônico e devolve a mesma `Date` em UTC-12h que o restante do serviço usa; **os 6 pontos** que resolviam a data base com a ordem divergente (`resolverDataInicioAlinhada`, `dtstartAlinhadoUltrapassaUntil`, `montarExdatesDeAgendamento`, `BYMONTHDAY` de mensal, `BYMONTH/BYMONTHDAY` de anual e `UNTL` de `monthOfDate`) passaram a usar o adaptador; `timeMax` do full sync ampliado de `+2` para `+6` meses, com `timeMin` mantido em `-1` mês e o purge de `BloqueioExterno` continuando restrito a `isBloqueioDentroDaJanela`;
  - `backend/test/t03-janela-fullsync-data-base.test.js` (criado): 5 testes — janela do full sync (`T03-01`), ausência de regressão para `+2` meses (`T03-02`), precedência canônica no helper compartilhado (`T03-03`) e equivalência entre `gcalSyncService` e `recurrence-helpers` com campos divergentes (`T03-04` e `T03-05`);
  - `docs/plans/2026-10-27-plan-confiabilidade-gcal-testes-alunos.md`: atualizado com este registro, as mutações M7–M9 e o fechamento do cartão.
- **Resultado**: T03 concluído; o Risco `1.1` (duas implementações da mesma precedência) deixa de existir porque a ordem agora vive apenas em `recurrence-helpers.js`. O Risco `1.2` (fallback silencioso para "hoje" em data inválida) permanece intacto, como previsto no cartão.
- **Suíte antes/depois**: `backend/` antes `245/245` → depois `250/250` passando; `tests-frontend/` antes `493/493` → depois `493/493` passando (nenhuma regressão no motor compartilhado).
- **Desvio do plano**: a única diferença em relação ao cartão é que a correção da precedência não ficou restrita ao `gcalSyncService.js`: para cumprir a regra 4.3, a ordem canônica foi extraída para o módulo compartilhado e o serviço passou a consumi-la. Autorizado pelo dono antes da edição.
- **Decisão adicional tomada**: os 6 pontos do `gcalSyncService.js` foram unificados num adaptador único (e não apenas reordenados um a um), para que a divergência não possa voltar por edição parcial.

---

## 13. Achados não alterados

| Risco/achado | Por que não foi tratado | Destino | Dono |
|---|---|---|---|
| `resolverDataISO` faz fallback silencioso para `new Date()` quando recebe data inválida (`lessons-learned.md` §1.2) | Alterar esse fallback exige revisar testes existentes que dependem dele; fora do escopo do Risco `1.1` | Mantido em `docs/reference/lessons-learned.md` §1.2 | Luccas |
| Backend sem `'use strict'` global e sem linter de variável não declarada (`lessons-learned.md` §1.4) | Exige auditoria própria para não quebrar código legado | Mantido em `docs/reference/lessons-learned.md` §1.4 | Luccas |
| `salvarDados` envia requisições CRUD por item em loop (`storage.js:816, 890`) | O commit rápido no Mongo (T02) + UI otimista já removem o gargalo de 1,5 s por item do Google; refatorar o diff completo fica estacionado | `docs/roadmap-v3.md` / avaliação pós-T02 | Luccas |

---

## 14. Deploy e rollback

- **Efeito externo**:
  - **T01, T05 (frontend) e T06**: afetam apenas o projeto `personal-app-webpage` (frontend).
  - **T02 e T03**: afetam `personal-app-api` (backend) e `personal-app-webpage` (frontend), além da collection `GcalReconciliationQueue` e chamadas ao Google Calendar.
- **Ordem de publicação**: na publicação do T02, o deploy do backend (`personal-app-api`, com o novo endpoint de flush e suporte ao `gcalStatus: 'pendente'`) deve estar no ar junto ou imediatamente antes do frontend que o consome; todas as mudanças entram na `main` via Pull Request do dono.
- **Verificação pós-deploy**: no app publicado, criar/editar/excluir um agendamento em sessão conectada ao Google Calendar e confirmar: (1) resposta imediata do CRUD, (2) evento refletido/removido na Google Agenda após o flush e (3) ausência de chamadas duplicadas de `webhook/renew` no boot.
- **Limite do rollback**: `git revert` reverte o código imediatamente; eventos já sincronizados ou removidos no Google Calendar e documentos já gravados no MongoDB não são desfeitos por `git revert`.

---

## 15. Fechamento

- **Critérios atendidos**: `em andamento` (T00, T01, T02 e T03 concluídos).
- **Implementação / validação / aceite / publicação**: T00, T01, T02 e T03 implementados e validados localmente; T04–T06 pendentes de execução.
- **Pendências**: executar T04 a T06 nas próximas rodadas. O T02 depende de deploy coordenado (backend antes do frontend) para valer em produção.
- **Riscos aceitos**: nenhum adicional até o momento.
- **Data de fechamento**: `em aberto`
