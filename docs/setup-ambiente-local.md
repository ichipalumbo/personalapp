# Setup de ambiente local

> Passo a passo para deixar uma máquina nova rodando o app inteiro localmente:
> frontend em `localhost:5500`, backend em `localhost:5000`, banco `personalapp_dev`.
>
> Reconstruído a partir das rodadas 3.2, 3.3, 3.4 e 3.5 do `roadmap.md`. Se algum passo aqui
> divergir do código, o código é a referência — reporte a divergência.

---

## O que este ambiente é

```
Live Server                 backend/server.js              MongoDB Atlas
localhost:5500       →      localhost:5000        →        personalapp_dev
(frontend)                  (API)                          (clone de produção)
```

Produção continua intocada: o banco de produção é `test`, e a `MONGODB_URI` da Vercel nunca
é alterada por este setup. O nome do banco vive **só** na `MONGODB_URI` do `.env` local,
que não é versionado.

**Sem este setup**, o frontend rodando localmente detecta o hostname como não-local e aponta
para a API de produção — ou seja, **escreve no banco de produção**. A detecção está em
[assets/js/config/api-config.js](assets/js/config/api-config.js) e é baseada apenas no
`hostname`.

---

## Pré-requisitos

| Item | Observação |
|---|---|
| Node.js | As duas suítes usam `node --test`, que exige Node 18+ |
| Extensão Live Server (VS Code) | É o único servidor do frontend — não há build step |
| MongoDB Database Tools | `mongodump` e `mongorestore`, para clonar a base |
| Acesso ao painel Vercel | Projeto `personal-app-api`, para copiar as variáveis |
| Acesso ao Google Cloud Console | Para liberar a origem `localhost` |

---

## 1. Backend: criar o `.env`

```powershell
cd backend
copy .env.example .env
```

Preencha cada chave com os valores de **Vercel → projeto `personal-app-api` → Settings →
Environment Variables**. As chaves e onde cada uma é consumida:

| Variável | Consumida em |
|---|---|
| `PORT` | `backend/src/config/env.js` — default 5000 |
| `MONGODB_URI` | `backend/src/config/env.js`, `backend/src/config/database.js` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_ID` / `GIS_CLIENT_ID` | `env.js`, `gcalAuthController.js`, `gcalSyncService.js` |
| `GOOGLE_CLIENT_SECRET` / `GOOGLE_OAUTH_CLIENT_SECRET` | `gcalAuthController.js`, `gcalSyncService.js` |
| `ENCRYPTION_KEY` | `backend/src/utils/gcalCrypto.js` |
| `BACKEND_URL` | `gcalSyncService.js` — URL HTTPS pública para o webhook |
| `GCAL_TIMEZONE` | `gcalSyncService.js` |
| `NODE_ENV` | `backend/server.js` |

**Altere a `MONGODB_URI` para terminar em `/personalapp_dev`**, não em `/test`. O `.env.example`
já traz esse aviso.

Confirme que o `.env` está fora do versionamento:

```powershell
git status --short
git check-ignore -v backend/.env
```

O `.env` não deve aparecer no `status`, e o `check-ignore` deve casar com a regra `*.env`.
`.env.example` continua versionado por causa da regra `!.env.example`.

---

## 2. Banco de desenvolvimento

O banco de dev vive no **mesmo cluster M0** da produção — o nome do banco vai na própria URI,
então não é preciso criar cluster novo.

Clone de `test` para `personalapp_dev` com remapeamento de namespace:

```powershell
mongodump --uri="<URI_DE_PRODUCAO>" --db=test --out=.\dump-prod
mongorestore --uri="<URI_DE_PRODUCAO>" --nsFrom="test.*" --nsTo="personalapp_dev.*" --dryRun .\dump-prod
mongorestore --uri="<URI_DE_PRODUCAO>" --nsFrom="test.*" --nsTo="personalapp_dev.*" .\dump-prod
```

**Rode o `--dryRun` primeiro e confirme na saída que o destino é `personalapp_dev.*`, não
`test.*`.** Um erro de namespace aqui escreve por cima da produção.

**Não restaure a collection `googlecalendarconnections`.** Sem o documento de conexão, o
`bootstrap.js` não dispara sincronização, e o ambiente local fica isolado do calendário real
sem precisar de flag nenhuma no código. Apague a pasta correspondente do dump antes do
restore, ou use `--nsExclude="test.googlecalendarconnections"`.

Não é preciso seed de `ownerEmail`: ele vem do Google ID token via `requireAuth`. Logando com
a mesma conta Google, o valor bate com o dos dados clonados. Não há migration — o Mongoose
cria collection e índice na primeira gravação.

---

## 3. Google Cloud Console

Libere a origem local no client OAuth:

- **Authorized JavaScript origins**: `http://localhost:5500` e `http://localhost`

`127.0.0.1` e `localhost` são **origens diferentes** para o Google Identity Services, e a
porta precisa constar quando não é 80. Sem isso, o login falha com `origin_mismatch`.

---

## 4. Live Server em `localhost:5500`

Abra `index.html` com o Live Server e **acesse por `http://localhost:5500`**, não por
`http://127.0.0.1:5500`. As duas URLs não são a mesma origem para o Google.

Ambas são reconhecidas como ambiente local pelo `api-config.js`, mas só `localhost` está
autorizada no Console.

---

## 5. Subir o backend

```powershell
cd backend
npm install
npm start
```

Saída esperada:

```text
🔧 Inicializando servidor...
📦 Environment: desenvolvimento
📡 Porta: 5000
📡 Conectando ao MongoDB: mongodb+srv://***@***/personalapp_dev?...
🚀 Servidor rodando na porta 5000
✅ Conectado ao MongoDB com sucesso!
```

Confirme que a URI de conexão termina em **`personalapp_dev`**.

Teste rápido:

```powershell
Invoke-RestMethod -Uri 'http://localhost:5000/'
```

---

## 6. Validar a ligação ponta a ponta

No console do browser, com o frontend aberto em `localhost:5500`:

```text
[api-config] Ambiente detectado {ambiente: 'local', apiBaseUrl: 'http://localhost:5000/api'}
[auth] Sessão Google ativa para: <sua conta>
```

Há também uma tarja **LOCAL** fixa no canto inferior direito, criada pelo `api-config.js`
quando o ambiente é local. Se a tarja não aparecer, você está falando com produção.

E estes dois `404` são o comportamento **correto**:

```text
GET http://localhost:5000/api/gcal/connection?ownerEmail=... 404 (Not Found)
GET http://localhost:5000/api/auth/connection?ownerEmail=... 404 (Not Found)
```

Eles provam que `googlecalendarconnections` não existe no clone e que o sync com o calendário
real não vai disparar. **Se esses `404` pararem de acontecer, o ambiente local está conectado
ao calendário real.**

---

## 7. Rodar as suítes

São **duas suítes independentes**, cada uma com seu `package.json` e seu próprio número. Nenhuma
delas precisa do backend rodando, de `.env` ou de banco — são todas de lógica pura, em processo.

**Backend** — 218 testes:

```powershell
cd backend
npm install
npm test
```

**Frontend** — 37 testes:

```powershell
cd tests-frontend
npm install
npm test
```

Ambas usam `node --test`, o runner nativo do Node. Não há Jest, Vitest nem watch mode.

> Ao rodar no PowerShell, **não filtre a saída com `Select-String` ou `Select-Object`**: o pipe
> mascara o código de saída e a suíte parece falhar mesmo com 0 falhas. Se precisar do código
> real, use `npm test *> $null; $LASTEXITCODE`.

### O que a suíte de frontend cobre

| Arquivo | Cobre |
|---|---|
| `tests-frontend/recurrence-helpers.test.js` | `assets/js/shared/recurrence-helpers.js` — o módulo isomórfico consumido pela agenda e pelo financeiro |
| `tests-frontend/calendario-engine.test.js` | `assets/js/calendario-engine.js` — guard de ordem de carga, repasses e fallback do mapa de dias |
| `tests-frontend/index-html-ordem.test.js` | A ordem das tags `<script>` em `index.html` |

**Não cobre tela.** `view-*.js`, os modais e `agenda-conflitos.js` continuam sem cobertura
automatizada, e a validação de UI segue manual. O `jsdom` já está instalado como
`devDependency`, mas ainda não há teste usando.

### Por que a pasta é separada da raiz

O projeto Vercel do frontend tem _Root Directory_ na raiz do repositório. Um `package.json` na
raiz mudaria o que a Vercel detecta no build. Por isso a suíte mora em `tests-frontend/`, e o
[.vercelignore](.vercelignore) da raiz exclui a pasta do deploy.

### Como os scripts do frontend rodam fora do browser

Os arquivos de `assets/js/` não exportam nada — apenas registram funções em `window`.
`tests-frontend/setup/carregar-frontend.js` executa cada um num contexto `vm` novo, e a
primeira coisa que faz é `globalThis.window = globalThis`. No browser os dois são o mesmo
objeto; no `vm`, não. Sem essa linha, o UMD de `recurrence-helpers` se registra num lugar onde
`calendario-engine` não enxerga, e nada carrega.

Contexto novo a cada carga também é o que permite testar o mesmo arquivo várias vezes sem
esbarrar em redeclaração de `const`.

### Escrevendo teste novo

Todo teste novo precisa ser **provado por mutação**: quebre de propósito o comportamento que
ele cobre e confirme que ele falha. Teste que passa no código quebrado não é cobertura. A regra
está na seção 10 de `.github/copilot-instructions.md`.

Lembre de reverter a mutação e conferir com `git status` antes de seguir.

---

## 8. O guard de ordem do `index.html`

O frontend não tem bundler: **a ordem das tags `<script>` é a resolução de dependências**.
`tests-frontend/index-html-ordem.test.js` protege isso verificando que todo `src` local existe
no disco, que nenhum é declarado duas vezes, que as dependências de tempo de carga vêm antes
dos dependentes, e que carregar o par na ordem inversa realmente lança.

Só entram no guard as dependências lidas **durante a avaliação do script**, não em runtime.
Hoje são duas, ambas protegidas por `throw` explícito no próprio código:

| Precisa carregar antes | Dependente | Global lido |
|---|---|---|
| `assets/js/config/api-config.js` | `assets/js/storage.js` | `window.APP_API_CONFIG` |
| `assets/js/shared/recurrence-helpers.js` | `assets/js/calendario-engine.js` | `window.recurrenceHelpers` |

Os cabeçalhos `// Depende de:` dos arquivos declaram bem mais que isso, mas a maioria é
dependência de runtime e **não** governa ordem de carga — `agenda-conflitos.js`, por exemplo,
declara depender de `view-home.js`, que carrega depois dele. Aplicar a regra genérica dos
cabeçalhos faria o guard falhar sem que houvesse defeito.

**Ao adicionar um script novo em `index.html`**, se ele ler um global no topo do arquivo,
acrescente o par em `DEPENDENCIAS_DE_CARGA` no arquivo de teste.

---

## Armadilhas conhecidas

| Sintoma | Causa real |
|---|---|
| **Todas as rotas protegidas respondem 500** com `"Google auth is not configured on the server."` | `GOOGLE_CLIENT_ID` vazio no `.env`. O `requireAuth` falha **antes** de validar o token e antes de tocar o banco — o sintoma parece falha de banco, mas não é. |
| **Login falha com `origin_mismatch`** | Acessou por `127.0.0.1:5500` em vez de `localhost:5500`, ou a origem não está no Google Cloud Console. |
| **A tarja LOCAL não aparece** | O hostname não é `localhost`/`127.0.0.1`/`::1` — o frontend está apontando para a API de produção. |
| **`❌ Erro: Nenhuma variável de ambiente de conexão ao MongoDB foi encontrada`** | `MONGODB_URI` vazia ou ausente no `.env`. |
| **Alteração no `.env` não fez efeito** | O `.env` é lido no boot. Reinicie o backend. |

---

## O que este setup não cobre

- **Não há webhook do Google Calendar em ambiente local.** `BACKEND_URL` precisa ser uma URL
  HTTPS pública; `localhost` não recebe notificação do Google.
- **Conectar o Google Calendar localmente** exigiria decidir qual conta e qual calendário —
  os agendamentos clonados carregam referência a eventos reais. Isso é decisão separada, e é
  o motivo de `googlecalendarconnections` ficar de fora do clone.
- **Não há branch de preview.** Push na `main` faz deploy em produção nos dois projetos
  Vercel.
