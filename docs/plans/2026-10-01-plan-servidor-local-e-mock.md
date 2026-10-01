# Plano — Servidor estático local + mock de UI (infra de validação)

> **Data de abertura**: 2026-10-01
> **Branch de trabalho**: `main` (decisão do dono)
> **Origem**: o dono desinstalou a extensão Live Server em 2026-10-01. Sem ela, o frontend
> não tinha mais servidor local — o mock de UI (`mocks/ui-runtime/`) depende de um servidor
> HTTP (é carregado por `<script src>`, e `file://` não serve).
> **Status**: ✅ executado (2026-10-01) — servidor, cenários e docs prontos; validação visual
> do `vitrineEstados` feita em browser e comparação com o `default` sem regressão.

## O que foi feito

### 1. Servidor estático versionado (`scripts/servir-local.js`)

- Promovido a partir do `_static-server.tmp.js` (que estava **rastreado no git** desde a
  Etapa 3, marcado "REMOVER ao fim da sessão"), que foi **removido**.
- Zero dependências (`http`/`fs`), sem `package.json` na raiz — a Vercel usa a raiz como
  _Root Directory_ do frontend e um `package.json` aqui mudaria a detecção de build.
- Padrão `127.0.0.2:5500` (host em que o mock auto-ativa); aceita `--host`/`--port`.
  Uso real com backend local: `node scripts/servir-local.js --host localhost`.
- **Correção de segurança**: o arquivo antigo servia a raiz inteira **sem bloqueio de
  dotfiles** — `http://127.0.0.2:5500/backend/.env` devolvia as credenciais. O novo nega
  qualquer segmento que comece com `.` e `node_modules` (compara caminho relativo, para não
  cair no falso-positivo de `..\raizX`).

### 2. Mock de UI — suporte a estado sem sessão, latência e falha simulada

`mocks/ui-runtime/mock-runtime.js`:

- **Sessão**: `signedIn: false` no cenário → `googleIdentity` responde sem login
  (`isSignedIn`/`getIdToken`/`getOwnerEmail`/`getProfile` coerentes com a ausência de sessão).
- **Latência**: `?mockLatencia=<ms>` (ou `latenciaMs` no cenário) atrasa toda resposta `/api/*`.
- **Falha**: `?mockFalha=<rotas>` devolve HTTP 500 nas rotas listadas (auditar retry/erro).
- As respostas passam por um único `responder()` — mudança de forma, sem alterar o conteúdo
  das fixtures.

### 3. Cenários novos (`mocks/ui-runtime/scenarios.js`)

- **`vitrineEstados`** — para a auditoria da Etapa 7 (item 5.7):
  - ciclo **atrasado** + reposição **pendente a vencer** e **expirada** → amarelo de alerta em
    contextos diferentes (achado **4.13**);
  - ciclo **pago** → "Marcar como pago"/"Editar ajuste" `disabled` em Finanças (achado **4.17.4**);
  - aluno **inativo** com aula hoje → modal em modo somente leitura `#editAvisoAlunoInativo`
    (achado **4.17.1**);
  - **Consultoria Online** → campos do cadastro `disabled` (achado **4.17.4**);
  - configuração financeira **pendente**.
  - Datas **relativas a hoje** (o cenário não "vence" como os pinados em 2026-09-27).
- **`carregamentoLento`** — clone do `default` com `latenciaMs: 4000` (skeleton + toast de progresso).
- **`desconectado`** — clone do `default` com `signedIn: false`.

Nota: **4.15** (movimento reduzido — `prefers-reduced-motion`) e **4.16** (ARIA) se auditam sobre
qualquer cenário; não exigem dado novo.

### 3.1 Correção — sessão logada não se refletia no header (2026-10-01)

Achado do dono: no mock não era possível "estar logado" na interface — o header ficava
travado em "Modo leitura. Faça login para editar.", sem acesso à área do usuário/configurações.

**Causa medida**: o `google-identity.js` real carrega **antes** do mock
(`index.html` 1580 × 1592) e o mock **substitui `window.googleIdentity` inteiro**. O toggle do
header vive em `_updateUi()` da implementação real, que por isso nunca executava — e
`updateGoogleCalendarStatusUI()` no stub era no-op. Resultado inconsistente: `isSignedIn()`
devolvia `true` e `ownerEmail` estava preenchido, mas `#googleSignedOutState` seguia visível e
`#btnUserAreaTrigger` oculto.

**Correção**: o mock passa a aplicar o **mesmo toggle** de `_updateUi()` (nova função
`aplicarEstadoHeaderSessao()`), no install e em cada `addAuthChangeListener`. Com
`signedIn: false` (cenário `desconectado`) o estado "desconectado" é preservado.

**Verificado no navegador**:
- `default`: `signedOutHidden: true`, `signedInHidden: false`, `#btnUserAreaTrigger` visível;
  clicar abre `#appSettingsModal` (`display: flex`) com perfil "Mock User / mock@local.test".
- `desconectado`: header volta a "Entrar com Google" + status "Faça login com Google para
  carregar seus dados da nuvem.".

### 3.2 Modo de escrita em memória — `?mockEscrita=1` (2026-10-01)

Achado do dono: no mock não era possível simular criação/edição (alunos, agendamentos), porque
**toda** escrita retornava 409.

**Decisões do dono**: (1) manter o **bloqueio por padrão** e liberar só por flag; (2) a flag
funciona **apenas no cenário `default`** — os cenários de demonstração/auditoria (ex.:
`vitrineEstados`) seguem bloqueados, para preservar as fixtures que eles exibem; (3) cobertura
dos **recursos principais**; (4) fixtures continuam por cenário.

**Implementação** — `mocks/ui-runtime/mock-runtime.js`:
- Store em memória (`JSON.parse(JSON.stringify(...))` das fixtures do cenário) criado só quando
  `mockEscrita=1` **e** `scenario.name === 'default'`. Nada sai para a rede (o `fetch` é
  interceptado antes), então não há risco de tocar produção; o store morre ao recarregar.
- `tratarEscrita()` cobre: `alunos` (POST/PUT/DELETE), `agendamentos` (POST/PUT/DELETE),
  `reposicoes` (POST, POST `/:id/reabrir`, PATCH `/:id`, DELETE), `configuracao/grade_horarios`
  (PUT) e `financas/:cicloId/pagamento|ajuste` (PATCH, com recálculo de ciclo por snapshot).
- `auth/*` e `gcal/*` **seguem bloqueados** mesmo com a flag (credencial e estado externo).
- Os GETs passaram a ler do store quando ele existe (`dados(nome)`), e foi adicionado o
  `GET /api/reposicoes/:id` (antes caía no handler genérico e quebrava o fluxo de reabertura).

**Verificado no navegador** (`?mockScenario=default&mockEscrita=1`, 127.0.0.2):

| Teste | Resultado |
| --- | --- |
| CRUD de aluno pelo `apiFetchBackend` do app | 4 → POST **201** → 5 → PUT **200** (nome alterado) → DELETE **200** → 4 |
| Fluxo real de UI — "Marcar como pago" (Finanças) | card vira **"Pago"**, botões `disabled`, toast "Pagamento confirmado com sucesso!" |
| `?mockScenario=default` (sem flag) | POST → **409** (bloqueado) |
| `?mockScenario=vitrineEstados&mockEscrita=1` | POST → **409** (flag ignorada fora do `default`) |
| POST não simulado (`/api/gcal/webhook/renew`) | **409** com motivo explícito |

### 4. Documentação- `.github/copilot-instructions.md` §6 — Live Server → `scripts/servir-local.js` + mock.
- `docs/setup-ambiente-local.md` — pré-requisito, diagrama e nova seção 4 + 4.1 (mock).
- `README.md` (raiz) — passo 1 do frontend local.
- `mocks/ui-runtime/README.md` — cenários e flags novos.
- `docs/diagnostics/2026-09-23-diag-auditoria-ui-ux-mobile.md` §7.3 — servidor + cenários.

## Validação

> **Regra (dono, 2026-10-01)**: a validação do mock é **sempre** em **433×762 com DPR 2.81** e
> com **emulação de mobile completa (toque, UA, mídia `pointer`/`hover`)** — o app é
> primariamente mobile. `setViewportSize` sozinho não aplica DPR nem touch. Padrão CDP e
> conferência: `docs/setup-ambiente-local.md` §9.

- `node --check` nos 3 arquivos JS: OK.
- Servidor no ar, respostas medidas:
  `/index.html` 200 · `/mocks/ui-runtime/mock-runtime.js` 200 ·
  `/assets/js/app/router.js` 200 · `/backend/shared/recurrence-helpers.js` 200 ·
  `/backend/.env` **403** · `/.gitignore` **403** · `/backend/node_modules/x.js` **403** ·
  `/%2e%2e%2fbackend%2fserver.js` **403**.
- `vitrineEstados` abierto no navegador: boot do mock OK, datas relativas corretas (01/10 "HOJE"
  com Helena Prado e Sofia Alves marcada "Aluno inativo").
- Comparação `vitrineEstados` × `default`: o erro de console `[storage] Erro ao salvar dados na
  API` aparece **igual nos dois** — **pré-existente**, não introduzido por esta rodada.

## Encontrado, não alterado

- **Erro de console pré-existente no boot do mock**: `salvarDados` → `PUT` bloqueado com 409 →
  `[storage] Erro ao salvar dados na API`. Aparece no `default` também. É o caminho de escrita
  "banco vazio → migrar cache" disparando no mock (o cenário tem alunos, mas o cache local foi
  limpo). Candidato a investigação — toca `storage.js`/`caminho de escrita oculto nº 1` (ver
  `plans/2026-09-30-plan-b2-sync-boot.md`, §3.2). **Não** é escopo desta rodada.
- **`sw.js` no mock**: o `mock-runtime` neutraliza `navigator.serviceWorker.getRegistrations`,
  mas o SW já registrado da origem pode servir HTML/JS antigo — por isso o servidor manda
  `Cache-Control: no-store` e vale o "Update on reload".
