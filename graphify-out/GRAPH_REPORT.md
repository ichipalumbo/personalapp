# Graph Report - personalapp  (2026-07-30)

## Corpus Check
- 67 files · ~47,094 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 564 nodes · 1051 edges · 40 communities (38 shown, 2 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 74 edges (avg confidence: 0.52)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e606fab1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- gcalSyncService.js
- getOwnerEmailOrThrow
- storage.js
- src/app.js
- google-identity.js
- gcalAuthController.js
- alunoController.js
- modal-agendamento.js
- utils-kpi.js
- agendamentoController.js
- Agendamento.js
- dependencies
- Agenda Personal Trainer (Prô Josy)
- state.js
- scheduling-serializer.js
- view-alunos.js
- agenda-card-template.js
- settings-modal.js
- scheduling-flow-state.js
- manifest.json
- normalize-agenda-formats.js
- bootstrap.js
- modal-acao-slot.js
- cascade-sync-aluno.js
- vercel.json
- user-area-session-helper.js
- sw.js

## God Nodes (most connected - your core abstractions)
1. `getOwnerEmailOrThrow()` - 33 edges
2. `carregarDados()` - 21 edges
3. `Agenda Personal Trainer (Prô Josy)` - 17 edges
4. `salvarDados()` - 13 edges
5. `criarAgendamento()` - 12 edges
6. `exchangeAuthCode()` - 12 edges
7. `atualizarAgendamento()` - 11 edges
8. `limparPayload()` - 11 edges
9. `responderErro()` - 11 edges
10. `responderErroConfig()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `renderizarCalendario()` --references--> `DIAS_SEMANA`  [EXTRACTED]
  assets/js/calendario-engine.js → assets/js/state.js
- `createApp()` --calls--> `createGcalAuthRoutes()`  [EXTRACTED]
  backend/src/app.js → backend/src/routes/gcalAuthRoutes.js
- `responderErroAgendamento()` --calls--> `responderErro()`  [EXTRACTED]
  backend/src/controllers/agendamentoController.js → backend/src/utils/controllerHelpers.js
- `limparPayloadAgendamento()` --calls--> `limparPayload()`  [EXTRACTED]
  backend/src/controllers/agendamentoController.js → backend/src/utils/controllerHelpers.js
- `listarAgendamentos()` --calls--> `getOwnerEmailOrThrow()`  [EXTRACTED]
  backend/src/controllers/agendamentoController.js → backend/src/utils/ownerScope.js

## Import Cycles
- None detected.

## Communities (40 total, 2 thin omitted)

### Community 0 - "gcalSyncService.js"
Cohesion: 0.07
Nodes (45): processGcalWebhook(), { syncConnectionByWebhookHeaders }, GoogleCalendarConnectionSchema, mongoose, express, { processGcalWebhook }, router, Agendamento (+37 more)

### Community 1 - "getOwnerEmailOrThrow"
Cohesion: 0.12
Nodes (35): atualizarBloqueioExterno(), BloqueioExterno, criarBloqueioExterno(), excluirBloqueioExterno(), { getOwnerEmailOrThrow }, { limparPayload, responderErro }, limparPayloadBloqueio(), listarBloqueiosExternos() (+27 more)

### Community 2 - "storage.js"
Cohesion: 0.13
Nodes (38): _agendamentosSaoIguais(), _alunosSaoIguais(), apiFetchBackend(), atualizarAlunos(), atualizarAulas(), atualizarLimitesGrade(), atualizarViewAtualAposSync(), _cacheTemDados() (+30 more)

### Community 3 - "src/app.js"
Cohesion: 0.08
Nodes (29): app, { connectToDatabase }, { createApp }, { getEnvConfig }, { port, mongoURI }, agendamentoRoutes, alunoRoutes, bloqueioExternoRoutes (+21 more)

### Community 4 - "google-identity.js"
Cohesion: 0.14
Nodes (31): _attemptSilentSessionRestore(), _atualizarCacheConexaoCalendario(), _bindCustomLoginButton(), checkCalendarConnectionStatus(), _consultarConexaoCalendario(), _decodeJwtPayload(), deleteCalendarConnection(), ensureCalendarConnection() (+23 more)

### Community 5 - "gcalAuthController.js"
Cohesion: 0.12
Nodes (29): Agendamento, BloqueioExterno, desconectarGoogleCalendar(), { encryptRefreshToken, decryptRefreshToken }, exchangeAuthCode(), { getOwnerEmailOrThrow }, GoogleCalendarConnection, { limparPayload, responderErro } (+21 more)

### Community 6 - "alunoController.js"
Cohesion: 0.16
Nodes (27): Agendamento, Aluno, atualizarAluno(), {
  calcularProjecaoMensalCompleta,
  calcularProjecaoRealizadaAteHoje,
  calcularProjecaoAproximada,
  calcularAulasFaltamAgendar,
  contarReposicoesPorAluno
}, criarAluno(), excluirAluno(), garantirStatusAluno(), { getOwnerEmailOrThrow } (+19 more)

### Community 7 - "modal-agendamento.js"
Cohesion: 0.11
Nodes (23): ativarTrapFocoModalRecorrencia(), atualizarCabecalhoModalAgendamento(), atualizarCampoDataModalAgendamento(), atualizarInfoHorarioAlvoModal(), atualizarRascunhoPrincipalAgendamento(), capturarFormularioPrincipalNoRascunho(), clonarEstadoRecorrenciaAgendamento(), criarContextoSlotAgendamento() (+15 more)

### Community 8 - "utils-kpi.js"
Cohesion: 0.13
Nodes (19): calcularAulasFaltamAgendar(), calcularKPIsAluno(), calcularKPIsTodosAlunos(), calcularProjecaoAproximada(), calcularProjecaoMensalCompleta(), calcularProjecaoRealizadaAteHoje(), exportarDados(), _garantirOverlaySinc() (+11 more)

### Community 9 - "agendamentoController.js"
Cohesion: 0.15
Nodes (23): Agendamento, Aluno, atualizarAgendamento(), criarAgendamento(), enriquecerAgendamentoComAluno(), excluirAgendamento(), { getOwnerEmailOrThrow }, { limparPayload, responderErro } (+15 more)

### Community 10 - "Agendamento.js"
Cohesion: 0.16
Nodes (17): AgendamentoSchema, mongoose, { normalizarDataParaISO, normalizarHorarioHHMM }, { normalizedOrOriginal }, BloqueioExternoSchema, mongoose, { normalizarDataParaISO, normalizarHorarioHHMM }, { normalizedOrOriginal } (+9 more)

### Community 11 - "dependencies"
Cohesion: 0.10
Nodes (20): dependencies, cors, dotenv, express, google-auth-library, googleapis, mongoose, description (+12 more)

### Community 12 - "Agenda Personal Trainer (Prô Josy)"
Cohesion: 0.10
Nodes (20): 1) Frontend, 2) Backend, 3) Ajustar URL da API no Frontend (ambiente local), Agenda Personal Trainer (Prô Josy), API Resumida, Arquitetura (Visao Geral), Autenticacao e Modo de Uso, Como Executar Localmente (+12 more)

### Community 13 - "state.js"
Cohesion: 0.13
Nodes (15): getAulasDoDia(), getDiasNoMes(), getNomeMes(), getPrimeiroDiaSemana(), navegarMes(), renderizarCalendario(), agendaConfig, alunos (+7 more)

### Community 14 - "scheduling-serializer.js"
Cohesion: 0.24
Nodes (14): aplicarRecorrenciaLegada(), criarDataIsoMeioDia(), criarResultadoErro(), derivarHorarioEDuracao(), formatarDataPtBrSegura(), montarPayloadBase(), normalizarTipo(), obterDiaSemanaPorIso() (+6 more)

### Community 15 - "view-alunos.js"
Cohesion: 0.18
Nodes (11): aplicarClasseCampoDesabilitado(), aplicarRegrasObjetivoNoFormulario(), normalizarObjetivoAluno(), normalizarObjetivoAlunoFallbackLocal(), normalizarStatusAlunoFallbackLocal(), normalizarStatusAlunoLocal(), normalizarValorAlunoComFallback(), objetivoSwitchEstaAtivo() (+3 more)

### Community 16 - "agenda-card-template.js"
Cohesion: 0.20
Nodes (4): converterHorarioParaMinutos(), normalizarHex(), resolverCompromissoConcluido(), resolverCorObjetivoAula()

### Community 17 - "settings-modal.js"
Cohesion: 0.42
Nodes (11): atualizarPerfilUsuarioUI(), atualizarUIStatusGoogleCalendar(), closeUserAreaModal(), handleConnectGoogleCalendar(), handleDisconnectGoogleCalendar(), initialize(), limparDadosGoogleExternosLocais(), normalizarMensagemGoogleAgenda() (+3 more)

### Community 18 - "scheduling-flow-state.js"
Cohesion: 0.27
Nodes (6): criarEstadoRecorrenciaAgendamento(), normalizarDiasSemana(), normalizarEscopoRecorrencia(), normalizarPadraoRecorrencia(), normalizarQuantidadeOcorrencias(), normalizarTerminoRecorrencia()

### Community 19 - "manifest.json"
Cohesion: 0.22
Nodes (8): background_color, display, icons, name, orientation, short_name, start_url, theme_color

### Community 20 - "normalize-agenda-formats.js"
Cohesion: 0.33
Nodes (6): fs, main(), path, readCount(), rootDir, targets

### Community 21 - "bootstrap.js"
Cohesion: 0.60
Nodes (5): atualizarAlturaHeader(), atualizarAlturaTabsCalendario(), atualizarMedidasLayout(), initialize(), refreshActiveView()

### Community 22 - "modal-acao-slot.js"
Cohesion: 0.47
Nodes (4): aplicarModoSomenteLeituraAlunoInativo(), compromissoTemAlunoInativo(), obterCompromissoPorId(), obterCompromissoSelecionado()

### Community 23 - "cascade-sync-aluno.js"
Cohesion: 0.60
Nodes (3): _atualizarAgendamentosNoGCal(), _persistirAgendamentosNoBackend(), sincronizarAgendamentosDoAluno()

### Community 26 - "vercel.json"
Cohesion: 0.50
Nodes (3): builds, routes, version

## Knowledge Gaps
- **143 isolated node(s):** `DIAS`, `HORARIOS`, `alunos`, `aulas`, `aulasParaRepor` (+138 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getOwnerEmailOrThrow()` connect `getOwnerEmailOrThrow` to `agendamentoController.js`, `gcalAuthController.js`, `alunoController.js`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `limparPayload()` connect `gcalAuthController.js` to `agendamentoController.js`, `alunoController.js`, `getOwnerEmailOrThrow`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `responderErro()` connect `gcalAuthController.js` to `agendamentoController.js`, `alunoController.js`, `getOwnerEmailOrThrow`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **What connects `DIAS`, `HORARIOS`, `alunos` to the rest of the system?**
  _143 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `gcalSyncService.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07227891156462585 - nodes in this community are weakly interconnected._
- **Should `getOwnerEmailOrThrow` be split into smaller, more focused modules?**
  _Cohesion score 0.11951219512195121 - nodes in this community are weakly interconnected._
- **Should `storage.js` be split into smaller, more focused modules?**
  _Cohesion score 0.13090418353576247 - nodes in this community are weakly interconnected._