# Relatorio — chore/frontend-local-api (2026-08-27)

## 1) Saida literal do portao de base

Comandos executados:

```powershell
git branch --show-current
git status --short
Select-String -Path 'assets\js\storage.js' -Pattern 'personal-app-api.vercel.app'
Select-String -Path 'assets\js\auth\google-identity.js' -Pattern 'personal-app-api.vercel.app'
Select-String -Path 'index.html' -Pattern 'assets/js/state.js'
Select-String -Path 'index.html' -Pattern 'assets/js/storage.js'
Test-Path 'assets\js\config\api-config.js'
```

Saida:

```text
chore/frontend-local-api

assets\js\storage.js:7:const API_BASE_URL = "https://personal-app-api.vercel.app/api";
assets\js\storage.js:14:fetch('https://personal-app-api.vercel.app/').catch(() => {});
assets\js\auth\google-identity.js:5:    const API_BASE_URL = 'https://personal-app-api.vercel.app/api';
index.html:1568:    <script src="assets/js/state.js"></script>
index.html:1569:    <script src="assets/js/storage.js"></script>
False
```

Observacao: `git status --short` retornou vazio no portao de base.

## 2) Arquivos alterados e o que mudou

- `assets/js/config/api-config.js`
  - novo arquivo com deteccao automatica por hostname;
  - centraliza `apiRootUrl`, `apiBaseUrl` e `ambiente` em `window.APP_API_CONFIG`;
  - registra log informativo do ambiente detectado;
  - injeta a tarja visual `LOCAL` apenas em ambiente local, com guarda contra duplicacao.
- `index.html`
  - registrou `assets/js/config/api-config.js` imediatamente antes de `assets/js/state.js`.
- `assets/js/storage.js`
  - passou a consumir `window.APP_API_CONFIG.apiBaseUrl`;
  - adicionou falha alta se `config/api-config.js` nao tiver carregado antes;
  - trocou o warm-up hardcoded por `window.APP_API_CONFIG.apiRootUrl`.
- `assets/js/auth/google-identity.js`
  - passou a consumir `global.APP_API_CONFIG.apiBaseUrl`;
  - adicionou falha alta se `config/api-config.js` nao tiver carregado antes.
- `backend/.env.example`
  - atualizou a orientacao de `MONGODB_URI` para o banco local `personalapp_dev`;
  - registrou explicitamente que o banco `test` e producao e nao deve ser usado localmente.
- `README.md`
  - atualizou a secao "Como Executar Localmente" para padronizar `http://localhost:5500`;
  - documentou deteccao automatica de ambiente, origens OAuth, nota de service worker, dependencia da porta `5000` e a tarja local;
  - removeu a instrucao antiga de trocar manualmente uma unica constante.
- `docs/roadmap.md`
  - marcou o item 3.3 como concluido na tabela e no cabecalho;
  - registrou que a descricao anterior estava incompleta e que a entrega centralizou tres pontos de URL, com falha alta e tarja local.
- `docs/_reports/2026-08-27-chore-frontend-local-api.md`
  - consolidou este relatorio com os portoes, validacoes e justificativas da rodada.

## 3) O que foi encontrado mas nao foi alterado

- `backend/src/` e `backend/server.js` nao foram alterados porque o backend local ja estava pronto e estavam fora do escopo.
- `sw.js` e `assets/js/app/service-worker.js` nao foram alterados por restricao explicita da rodada.
- `assets/css/style.css` nao foi alterado; a tarja local foi injetada por JavaScript com estilo inline para evitar diff em arquivo sujeito ao cache do service worker.
- `CLIENT_ID`, `CALENDAR_SCOPE`, `PROFILE_CACHE_KEY` e demais constantes de `assets/js/auth/google-identity.js` foram mantidas como estavam.
- O warm-up continuou fire-and-forget com `.catch(() => {})`; so a origem deixou de ser hardcoded.

## 4) Por que o fallback e falha alta

Se `config/api-config.js` nao carregar antes dos consumidores e o frontend cair silenciosamente para producao, um teste local volta a gravar no ambiente produtivo sem aviso. A falha alta interrompe o boot de forma explicita e torna o problema visivel imediatamente, preservando a separacao entre ambiente local e producao que o item 3.4 passou a garantir no backend.

## 5) Por que a posicao do `<script>` em `index.html` e obrigatoria

`storage.js` le a configuracao logo no topo do arquivo, antes de qualquer chamada a API, e `auth/google-identity.js` depende da mesma fonte unica para `/api/auth` e `/api/gcal`. Por isso `assets/js/config/api-config.js` precisa existir antes de `assets/js/state.js` e `assets/js/storage.js`; mudar essa ordem quebra a carga e aciona a falha alta de proposito.

## 6) Por que a tarja entra por JS, nao por `index.html` ou `style.css`

`index.html` e `assets/css/style.css` sao same-origin e ficam no cache do service worker. Colocar a tarja nesses arquivos aumentaria a chance de o frontend local servir markup ou CSS antigo logo apos uma edicao. Injetando o indicador por JavaScript, o diff fica fora desses dois arquivos e a validacao local sofre menos com cache velho.

## 7) Registro da descricao incompleta do item 3.3

A descricao anterior do item 3.3 no roadmap e no README tratava o trabalho como "trocar a constante `API_BASE_URL` em `storage.js`". Isso estava incompleto: havia tres pontos hardcoded no frontend:

1. `assets/js/storage.js` — `API_BASE_URL`
2. `assets/js/storage.js` — warm-up fire-and-forget
3. `assets/js/auth/google-identity.js` — segundo `API_BASE_URL` para auth e Google Calendar

Esta rodada centralizou os tres pontos em `assets/js/config/api-config.js` e adicionou a tarja visual de ambiente local.

## 8) Validacao adicional executada

### 8.1) Sintaxe dos arquivos JS alterados

Comandos executados:

```powershell
node --check 'assets\js\config\api-config.js'
node --check 'assets\js\storage.js'
node --check 'assets\js\auth\google-identity.js'
```

Saida:

```text
```

Observacao: os tres comandos finalizaram sem saida, indicando parse valido.

### 8.2) Suite automatizada existente (`backend/npm test`)

Resultado antes das edicoes:

```text
ℹ tests 86
ℹ suites 0
ℹ pass 86
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

Resultado depois das edicoes:

```text
ℹ tests 86
ℹ suites 0
ℹ pass 86
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

## 9) Saida literal do portao de saida

Comandos executados:

```powershell
Select-String -Path 'assets\js\storage.js' -Pattern 'personal-app-api.vercel.app'
Select-String -Path 'assets\js\auth\google-identity.js' -Pattern 'personal-app-api.vercel.app'
Select-String -Path 'index.html' -Pattern 'api-config.js'
Select-String -Path 'assets\js\config\api-config.js' -Pattern 'localhost:5000'
Select-String -Path 'assets\js\config\api-config.js' -Pattern 'APP_ENV_BADGE_ID'
git diff --stat
git status --short
```

Saida:

```text
index.html:1568:    <script src="assets/js/config/api-config.js"></script>
assets\js\config\api-config.js:7:    const LOCAL_API_ROOT_URL = 'http://localhost:5000';
assets\js\config\api-config.js:8:    const LOCAL_API_BASE_URL = 'http://localhost:5000/api';
assets\js\config\api-config.js:6:    const APP_ENV_BADGE_ID = 'appEnvBadge';
assets\js\config\api-config.js:34:            if (!global.document || 
global.document.getElementById(APP_ENV_BADGE_ID)) {
assets\js\config\api-config.js:42:            badge.id = APP_ENV_BADGE_ID;
 README.md                         | 39 ++++++++++++++++-----------------------
 assets/js/auth/google-identity.js |  6 +++++-
 assets/js/storage.js              | 16 +++++++++++-----
 backend/.env.example              |  3 ++-
 docs/roadmap.md                   | 15 ++++++++-------
 index.html                        |  1 +
 6 files changed, 43 insertions(+), 37 deletions(-)
 M README.md
 M assets/js/auth/google-identity.js
 M assets/js/storage.js
 M backend/.env.example
 M docs/roadmap.md
 M index.html
?? assets/js/config/
?? docs/_reports/2026-08-27-chore-frontend-local-api.md
```

Observacoes:

- Os dois primeiros `Select-String` retornaram vazio, confirmando zero ocorrencias remanescentes de `personal-app-api.vercel.app` em `storage.js` e `auth/google-identity.js`.
- A ordem em `index.html` foi conferida durante a edicao: `api-config.js` entrou imediatamente antes de `assets/js/state.js`.
- `git diff --stat` listou exatamente os seis arquivos rastreados esperados; `assets/css/style.css` nao apareceu.
- `git status --short` nao mostrou `assets/js/config/api-config.js` isoladamente porque o Git, no modo padrao, colapsa diretorios novos nao rastreados em `?? assets/js/config/`. As linhas de `Select-String` acima comprovam que o arquivo `assets/js/config/api-config.js` existe e contem `localhost:5000` e `APP_ENV_BADGE_ID`.
