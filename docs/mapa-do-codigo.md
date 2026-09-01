# Mapa do código

> **Papel deste arquivo**: onde as coisas estão e em que ordem carregam. É conhecimento de **código**, não regra de negócio.
>
> Este arquivo muda quando o **código** muda. Procedimento de ambiente fica em [`ambiente-local.md`](ambiente-local.md); regra de negócio fica nas specs em [`specs/`](specs/).
>
> **Atualizado**: 2026-09-01 · conferido contra `index.html` e a árvore real do repositório.

---

## Arquitetura em uma tela

```text
[Frontend SPA - browser]
    |- entrada compatível (app.js)
    |- app shell: bootstrap.js, router.js, service-worker.js
    |- views: view-home.js, view-financas.js, view-calendario.js, view-alunos.js
    |- modais: modal-agendamento.js, modal-acao-slot.js, settings-modal.js
    |- estado em memória (state.js)
    |- persistência/sync (storage.js)
    v
[API Express - backend/server.js]
    |- cria app em backend/src/app.js
    |- rotas -> controllers -> services -> models
    v
[MongoDB - via Mongoose]
```

Sem build step, sem bundler, sem framework. Os scripts são carregados por tags `<script>` e conversam por globais em `window`.

---

## Árvore

```text
personalapp/
|- index.html
|- sw.js
|- manifest.json
|- assets/
|  |- css/style.css
|  |- js/
|  |  |- logger.js
|  |  |- state.js                       <- estado global (alunos, aulas, agendaConfig)
|  |  |- storage.js                     <- sync API + fallback localStorage
|  |  |- utils-kpi.js                   <- toast e overlays de sync
|  |  |- utils-datetime.js
|  |  |- utils-formatters.js
|  |  |- alunos-helpers.js
|  |  |- calendario-engine.js           <- motor de recorrência
|  |  |- agenda-conflitos.js
|  |  |- agenda-card-template.js
|  |  |- cascade-sync-aluno.js
|  |  |- widget-stepper-duracao.js
|  |  |- widget-bloqueio.js
|  |  |- widget-swipe-periodo.js
|  |  |- modal-agendamento.js
|  |  |- modal-acao-slot.js
|  |  |- settings-modal.js
|  |  |- view-home.js
|  |  |- view-financas.js
|  |  |- view-calendario.js
|  |  |- view-alunos.js
|  |  |- google-calendar.js             <- ponte frontend -> backend (nao chama a API do Google)
|  |  |- app.js
|  |  |- app/
|  |  |  |- bootstrap.js
|  |  |  |- router.js
|  |  |  |- service-worker.js
|  |  |- auth/
|  |  |  |- google-identity.js          <- window.googleIdentity
|  |  |- config/
|  |  |  |- api-config.js               <- unico lugar que define a URL da API
|  |  |- features/
|  |  |  |- modals/
|  |  |  |  |- scheduling-flow-state.js
|  |  |  |  |- scheduling-serializer.js
|  |  |  |- user/
|  |  |  |  |- user-area-session-helper.js
|  |  |- shared/
|  |  |  |- recurrence-helpers.js       <- ISOMORFICO: consumido tambem pelo backend
|  |  |  |- reposicao-flow-helpers.js   <- ISOMORFICO: consumido por teste do backend
|- backend/
|  |- server.js
|  |- vercel.json
|  |- scripts/normalize-agenda-formats.js
|  |- src/
|  |  |- app.js
|  |  |- config/            database.js, env.js
|  |  |- middleware/        requireAuth.js
|  |  |- controllers/       agendamento, aluno, bloqueioExterno, config,
|  |  |                     financas, gcalAuth, gcalWebhook, reposicao
|  |  |- models/            Agendamento, Aluno, BloqueioExterno, CicloFinanceiro,
|  |  |                     Config, GoogleCalendarConnection, Reposicao
|  |  |- routes/            agendamento, aluno, bloqueioExterno, config, financas,
|  |  |                     gcalAuth, gcalWebhook, health, reposicao
|  |  |- services/          agendaConsistency, agendamento, financas, gcalSync, reposicao
|  |  |- utils/             controllerHelpers, emailNormalizer, gcalCrypto, ownerScope,
|  |  |                     studentValueExtractors, time, valueNormalizer
|  |- test/                 10 arquivos, executados com node --test
|- docs/
|- scripts/auditar-css-morto.js
```

> A pasta `shared/` está fisicamente em `assets/js/shared/`, mas é consumida pelo backend por um `require` que atravessa para fora de `backend/`. Isso é dívida técnica conhecida — item 0.2 do [`roadmap.md`](roadmap.md).

---

## Ordem de carregamento dos scripts

A ordem importa: cada módulo depende de globais definidos por scripts anteriores. `calendario-engine.js`, por exemplo, lança erro se `recurrence-helpers.js` não tiver carregado antes.

Ordem real em `index.html`:

| # | Script | Observação |
| --- | --- | --- |
| 1 | `logger.js` | carregado no topo do `<body>`, antes de tudo |
| 2 | `config/api-config.js` | define a URL da API; falha alto se ausente |
| 3 | `state.js` | |
| 4 | `storage.js` | |
| 5–7 | `utils-kpi.js`, `utils-datetime.js`, `utils-formatters.js` | |
| 8–9 | `shared/recurrence-helpers.js`, `shared/reposicao-flow-helpers.js` | isomórficos |
| 10–12 | `alunos-helpers.js`, `calendario-engine.js`, `agenda-conflitos.js` | |
| 13–15 | `widget-stepper-duracao.js`, `widget-bloqueio.js`, `widget-swipe-periodo.js` | |
| 16–17 | `features/modals/scheduling-flow-state.js`, `scheduling-serializer.js` | |
| 18–19 | `modal-agendamento.js`, `modal-acao-slot.js` | |
| 20 | `agenda-card-template.js` | |
| 21–23 | `view-home.js`, `view-financas.js`, `view-calendario.js` | |
| 24–25 | `cascade-sync-aluno.js`, `view-alunos.js` | |
| 26–27 | `auth/google-identity.js`, `features/user/user-area-session-helper.js` | |
| 28–29 | `settings-modal.js`, `google-calendar.js` | |
| 30–32 | `app/service-worker.js`, `app/router.js`, `app/bootstrap.js` | |
| 33 | `app.js` | último, depende de tudo |

Ao adicionar um arquivo JS, inclua a tag na posição correta. Módulo compartilhado consumido no frontend precisa entrar **antes** dos consumidores diretos.

---

## Convenção de nomes

| Prefixo | Camada | Exemplo |
| --- | --- | --- |
| `state` | estado global | `state.js` |
| `storage` | persistência | `storage.js` |
| `utils-` | utilitários puros, sem DOM | `utils-datetime.js` |
| `alunos-` | helpers de domínio | `alunos-helpers.js` |
| `calendario-` | motor de calendário/recorrência | `calendario-engine.js` |
| `agenda-` | lógica de agenda | `agenda-conflitos.js` |
| `widget-` | componentes de UI reutilizáveis | `widget-bloqueio.js` |
| `modal-` | controladores de modais | `modal-acao-slot.js` |
| `view-` | views das abas | `view-home.js` |
| `app/` | app shell | `app/router.js` |
| `shared/` | módulo isomórfico, sem `window`/DOM | `shared/recurrence-helpers.js` |

---

## Armadilhas de nome já registradas

| Nome | O que ele **não** faz |
| --- | --- |
| `salvarEventoComGCal` | não salva evento no Google. Ignora os dois argumentos e apenas garante a conexão antes de chamar `salvarDados`. Já produziu diagnóstico errado. |
| `google-calendar.js` | não fala com a API do Google. É ponte frontend → backend; o sync real está em `backend/src/services/gcalSyncService.js`. |
| `utils-kpi.js` | não calcula KPI. Sobrou como utilitário de toast e overlay depois da remoção do dashboard antigo. |
| `btnReagendarInstancia` | não reagenda. Envia para a fila de reposição. Débito de nomenclatura registrado. |

---

## Inventário de rotas

> **Inventário, não contrato.** O contrato de cada rota pertence à spec do domínio correspondente e migra para lá conforme cada spec nascer. Se esta lista divergir do código, o código vence.

Base: `/api`. Todas exigem `Authorization: Bearer <google_id_token>`, exceto o health check.

| Recurso | Rotas | Domínio |
| --- | --- | --- |
| `/alunos` | `GET`, `POST`; `GET /consistencia-agenda`; `GET`/`PUT`/`DELETE /:id` | Alunos |
| `/agendamentos` | `GET`, `POST`; `GET`/`PUT`/`PATCH`/`DELETE /:id` | Agenda |
| `/configuracao` | `GET`, `POST`; `GET /grade_horarios`; `GET /all`; `POST /item`; `GET`/`PUT`/`DELETE /:id` | Agenda |
| `/financas` | `GET`; `GET /:alunoId/historico`; `PATCH /:cicloId/pagamento`; `PATCH /:cicloId/ajuste` | Financeiro |
| `/reposicoes` | `GET`, `POST`; `GET`/`PATCH /:id`; `POST /:id/historico` | Financeiro |
| `/bloqueios-externos` | `GET`, `POST`; `GET`/`PUT`/`DELETE /:id` | Integrações |
| `/gcal` e `/auth` | `GET /connection`; `POST /exchange`; `POST /webhook/renew`; `DELETE /connection` | Integrações |
| `/webhooks/gcal` | `POST` | Integrações |
| `/` (raiz, fora de `/api`) | `GET` — health check, sem auth, resposta em texto puro | Plataforma |

Notas que valem para todas:

- `ownerEmail` **nunca** vai no payload do cliente. Ele é extraído do JWT por `requireAuth`.
- Rota literal precisa ser declarada **antes** de rota com parâmetro, senão o Express trata o literal como id.
- A sincronização é CRUD granular item a item. Não existe rota `/sincronizar` bulk.

---

## Contrato de camadas do CSS (Calendário > Dia)

Para evitar regressão de sobreposição entre indicadores da grade e elementos sticky, a visão Dia segue um contrato fixo de camadas em `assets/css/style.css`.

Tokens: `--z-cal-dia-container`, `--z-cal-dia-grid-surface`, `--z-cal-dia-grid-lines`, `--z-cal-dia-grid-slots`, `--z-cal-dia-grid-events`, `--z-cal-dia-grid-now-indicator`, `--z-cal-dia-header-sticky`, `--z-cal-dia-tabs-sticky`.

Regras obrigatórias:

- Elemento interno da grade fica **abaixo** de `--z-cal-dia-header-sticky`.
- As tabs sticky ficam **acima** do header sticky e de toda a grade.
- Indicador visual novo usa token dedicado, nunca número mágico.
- Sobreposição com sticky se resolve ajustando token ou stacking context, não com estilo inline pontual.

Stacking contexts usados para previsibilidade: `#containerCalendarioDia` e `.time-grid-content-col`, ambos com `isolation: isolate`.

---

## Manutenção deste arquivo

Quando uma feature mudar a estrutura de arquivos, a ordem de scripts ou as rotas, atualize aqui **no mesmo commit**. Documentação defasada já fez o roadmap começar errado uma vez.
