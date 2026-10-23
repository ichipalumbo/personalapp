# Arquitetura da aplicação

> **Finalidade**: mapa dos componentes e integrações da aplicação · **Base**: código do repositório em 2026-10-23
>
> Atualizar quando mudarem os limites entre frontend, API, persistência, autenticação, integrações externas ou deploy.

## Diagrama

```mermaid
flowchart TB
    pessoa["Pessoa usuária"]

    subgraph hospedagemWeb["Vercel · personal-app-webpage · raiz do repositório"]
        arquivos["HTML, CSS, JavaScript vanilla e manifest PWA"]
    end

    subgraph navegador["Navegador · SPA/PWA"]
        shell["App shell<br/>bootstrap · router · service worker"]
        telas["Views e modais<br/>Home · Calendário · Alunos · Finanças"]
        estado["Estado em memória<br/>state.js"]
        persistencia["storage.js<br/>API REST · cache/fallback localStorage"]
        auth["google-identity.js<br/>sessão e token de identidade"]
        gcalFront["google-calendar.js<br/>ponte para a API"]
        sw["sw.js<br/>cache de recursos estáticos same-origin"]
        shell --> telas
        telas --> estado
        telas --> persistencia
        auth --> persistencia
        telas --> gcalFront
        gcalFront --> auth
        sw -. controla recursos do app .-> shell
    end

    pessoa --> hospedagemWeb
    hospedagemWeb -->|"entrega app"| navegador

    subgraph hospedagemApi["Vercel · personal-app-api · diretório backend/"]
        api["backend/server.js"]
        express["Express · backend/src/app.js"]
        conexao["Middleware /api<br/>conexão MongoDB"]
        rotas["Rotas e controllers"]
        rotasDados["Rotas de dados<br/>alunos · agenda · finanças · reposições · configurações"]
        rotasGcal["Rotas Google Calendar<br/>OAuth e renovação"]
        webhook["POST /api/webhooks/gcal<br/>notificação externa"]
        health["GET /<br/>health"]
        authApi["requireAuth<br/>valida Google ID token<br/>define req.auth.ownerEmail"]
        servicos["Services e regras de domínio"]
        modelos["Models Mongoose"]
        api --> express
        express --> health
        express --> conexao --> rotas
        rotas --> rotasDados --> authApi --> servicos
        rotas --> rotasGcal --> servicos
        rotas --> webhook --> servicos
        servicos --> modelos
    end

    persistencia -->|"REST /api · Authorization: Bearer"| hospedagemApi
    auth -. "Google ID token" .-> authApi

    subgraph dados["Persistência"]
        mongo[("MongoDB")]
        colecoes["Alunos · Agendamentos · Bloqueios externos<br/>Ciclos financeiros · Reposições · Configurações<br/>Conexões do Google Calendar"]
        modelos --> colecoes -->|"consultas/escritas isoladas por ownerEmail"| mongo
    end

    subgraph google["Serviços Google"]
        gis["Google Identity Services"]
        calendar["Google Calendar API"]
    end

    auth <-->|"login / ID token"| gis
    auth -->|"consentimento Calendar"| gis
    gis -->|"authorization code"| auth
    auth -->|"troca do código · /api/gcal/exchange"| rotasGcal
    gcalFront -->|"operações de sync · REST"| rotasGcal
    servicos <-->|"OAuth · eventos e canais de webhook"| calendar
    calendar -->|"notificação HTTPS"| webhook

    local["Desenvolvimento local<br/>frontend: scripts/servir-local.js<br/>API: backend/server.js · porta 5000"]
    local -. "api-config.js seleciona a API local<br/>por hostname" .-> persistencia
```

## Limites e fluxos

- O frontend é servido como arquivos estáticos e inicializa a SPA a partir de [`index.html`](../../index.html). O service worker atende recursos estáticos da mesma origem; requisições `/api/` não entram nesse cache.
- `storage.js` concentra as chamadas REST e o cache/fallback local. O frontend escolhe a URL da API pelo hostname em [`api-config.js`](../../assets/js/config/api-config.js).
- A API Express conecta ao MongoDB antes de processar as rotas `/api`. As rotas de dados passam por `requireAuth`; as rotas de saúde, OAuth do Calendar e webhook têm caminhos próprios, com proteção definida rota a rota.
- `requireAuth` valida o Google ID token e fornece `ownerEmail`. Os controllers e serviços usam esse escopo nas consultas e gravações dos dados.
- A conexão ao Google Calendar usa um fluxo de autorização próprio. O backend acessa a Calendar API e recebe notificações por webhook; o navegador não chama diretamente a API de calendário.
- Os módulos em [`backend/shared/`](../../backend/shared/) são compartilhados entre frontend e backend quando uma regra precisa ser usada nos dois lados.
- Em produção, os projetos Vercel de frontend e API são independentes. Localmente, o frontend servido pelo repositório aponta para a API local na porta 5000.

## Fontes de verificação

- Frontend e carregamento: [`index.html`](../../index.html), [`bootstrap.js`](../../assets/js/app-shell/bootstrap.js), [`storage.js`](../../assets/js/storage.js) e [`sw.js`](../../sw.js).
- API, rotas e persistência: [`server.js`](../../backend/server.js), [`app.js`](../../backend/src/app.js), [`requireAuth.js`](../../backend/src/middleware/requireAuth.js) e [`database.js`](../../backend/src/config/database.js).
- Integração de calendário: [`google-calendar.js`](../../assets/js/google-calendar.js), [`gcalAuthRoutes.js`](../../backend/src/routes/gcalAuthRoutes.js), [`gcalWebhookRoutes.js`](../../backend/src/routes/gcalWebhookRoutes.js) e [`gcalSyncService.js`](../../backend/src/services/gcalSyncService.js).
