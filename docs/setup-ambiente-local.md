# Setup de ambiente local

> Passo a passo para deixar uma máquina nova rodando o app inteiro localmente:
> frontend em `localhost:5500`, backend em `localhost:5000`, banco `personalapp_dev`.
>
> Reconstruído a partir das rodadas 3.2, 3.3, 3.4 e 3.5 do `roadmap.md`. Se algum passo aqui
> divergir do código, o código é a referência — reporte a divergência.

---

## O que este ambiente é

```
servir-local.js             backend/server.js              MongoDB Atlas
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
| Servidor estático do próprio repo | `node scripts/servir-local.js` — substitui o Live Server (desinstalado em 2026-10-01) e é o único servidor do frontend (não há build step) |
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

## 4. Servir o frontend em `localhost:5500`

Suba o servidor estático do próprio repo:

```powershell
node scripts/servir-local.js --host localhost --port 5500
```

Acesse por **`http://localhost:5500`**, não por `http://127.0.0.1:5500`. As duas URLs não
são a mesma origem para o Google.

Ambas são reconhecidas como ambiente local pelo `api-config.js`, mas só `localhost` está
autorizada no Console.

> Sem `--host`, o servidor sobe em `127.0.0.2:5500` — que é o host do **mock** (seção 4.1).
> Para o app real com backend local, use `--host localhost`.

### 4.1 Mock de UI (validação de tela sem backend nem Mongo)

A validação de tela usa o mock em `mocks/ui-runtime/`, **nunca produção**. Ele intercepta
`/api/*`, finge login, bloqueia escrita e limpa os caches — não toca dado real.

```powershell
node scripts/servir-local.js
# abrir http://127.0.0.2:5500/index.html?mockScenario=<cenário>
```

No host `127.0.0.2` o cenário `default` ativa sozinho. Cenários e flags completos estão em
[`mocks/ui-runtime/README.md`](../mocks/ui-runtime/README.md) — inclui `vitrineEstados`
(auditoria de estados da Etapa 7), `carregamentoLento`, `desconectado` e as flags
`?mockLatencia=<ms>` e `?mockFalha=<rotas>`.

> **Validação obrigatória no mobile de referência.** Toda validação do mock **deve** ser feita
> em **433×762 com DPR 2.81** e com **emulação de mobile completa (toque, UA, mídia
> `pointer`/`hover`)** — o app é primariamente mobile. `setViewportSize` sozinho não basta:
> sem a emulação completa o DPR fica `2`, `ontouchstart` ausente e `matchMedia('(pointer:
> coarse)')` falso, e qualquer código que decida algo por esses sinais mede errado. O padrão
> completo e a conferência estão na **seção 9**.

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

A confirmação de ambiente local é esse log acima: `ambiente: 'local'` com a
`apiBaseUrl` de `localhost:5000`. Se o log der `producao`, você está falando com a
API de produção. (Até a Rodada 3 da Etapa 3 era uma tarja **LOCAL** no canto da
tela; a partir daí a verificação é só pelo console.)

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

São **duas suítes independentes**, cada uma com seu `package.json`. Nenhuma delas precisa do
backend rodando, de `.env` ou de banco — rodam em processo.

**O total de testes não é escrito aqui de propósito.** Número em documentação envelhece e passa
a mentir sem avisar. Meça sempre — e meça **antes e depois** do ajuste, reportando os dois
números. A suíte deve **começar verde**: se ela chegar com falha antes de você tocar em qualquer
coisa, isso é achado, não ruído — investigue ou reporte antes de seguir, em vez de tratar as
falhas como "pré-existentes e esperadas".

**Backend**:

```powershell
cd backend
npm install
npm test
```

**Frontend**:

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
| `recurrence-helpers.test.js` | `backend/shared/recurrence-helpers.js` — o módulo isomórfico consumido pela agenda e pelo financeiro (recorrência, exceções, limites, `parseDataFlex`) |
| `calendario-engine.test.js` | `assets/js/calendario-engine.js` — guard de ordem de carga, repasses para `recurrenceHelpers` e fallback do mapa de dias |
| `reposicao-flow.test.js` | `backend/shared/reposicao-flow-helpers.js` — a regra de alerta "a vencer" (limite de dias, resumo por aluno, agrupamento do histórico) |
| `index-html-ordem.test.js` | A ordem das tags `<script>` em `index.html` (ver seção 8) |
| `dialog-controller.test.js` | `assets/js/features/modals/dialog-controller.js` — foco no contexto, Escape, underlay e a declaração de cada `modal-overlay` do `index.html` |
| `settings-modal-dialog.test.js` | `assets/js/settings-modal.js` no `DialogController` — área do usuário e política de fechar pelo fundo |
| `router-fab-tela.test.js` | `assets/js/app/router.js` — ordem de remoção do FAB da Home na troca de tela (o FAB não pode esperar o carregamento do destino) |
| `router-historico.test.js` | `assets/js/app/router.js` — tela inicial vinda da URL, `replaceState` no boot, `pushState` na navegação e ausência de escrita quando a URL muda por fora |
| `view-alunos-observacoes.test.js` | `assets/js/view-alunos.js` — observação escapada no card, edição e a pilha de diálogos do aluno |
| `view-financas-carregamento-toast.test.js` | `assets/js/view-financas.js` — toast unificado no carregamento lento, silêncio abaixo do limiar e refresh em background |
| `view-financas-historico.test.js` | `assets/js/view-financas.js` — ciclos anteriores: ações só no não pago, pagamento no `DialogController` e falha HTTP mantendo o modal |
| `header-cache-state.test.js` | O rótulo de cache do header (5.8, caminho B1) — acende só em sync remoto **sobre** cache local |

**Cobre tela? Só pontualmente.** O `jsdom` é `devDependency` e **8 dos 12 arquivos** o usam para
executar views e modais de verdade — mas sempre em recortes específicos (uma função de render,
um diálogo, um estado de carregamento). **Tela** no sentido de comportamento visual completo
(layout, densidade, contraste, área de toque, fluxo de ponta a ponta) **continua sem cobertura**:
a validação de UI segue manual, nos viewports da seção 9. `agenda-conflitos.js` segue sem
cobertura automatizada.

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
| `backend/shared/recurrence-helpers.js` | `assets/js/calendario-engine.js` | `window.recurrenceHelpers` |

Os cabeçalhos `// Depende de:` dos arquivos declaram bem mais que isso, mas a maioria é
dependência de runtime e **não** governa ordem de carga — `agenda-conflitos.js`, por exemplo,
declara depender de `view-home.js`, que carrega depois dele. Aplicar a regra genérica dos
cabeçalhos faria o guard falhar sem que houvesse defeito.

**Ao adicionar um script novo em `index.html`**, se ele ler um global no topo do arquivo,
acrescente o par em `DEPENDENCIAS_DE_CARGA` no arquivo de teste.

---

## 9. Viewport de referência para validação do mobile

O app é de uso pessoal, e o celular do dono é o **alvo de aceite** da UI
mobile. Ao medir/validar tela no mobile (tipografia, alvos de toque,
contraste, regressão visual), usar:

| Propriedade | Valor |
|---|---|
| Viewport em CSS | **433 × 762 px** |
| DPR (`devicePixelRatio`) | **2.81** (≈ 1216 × 2141 px físicos) |

Como simular no DevTools: F12 → device toolbar → dispositivo custom →
largura `433`, altura `762`, zoom `100%`, device scale factor `2.81`.

**Playwright (agentes) — `setViewportSize` sozinho NÃO garante DPR nem modo mobile.**
`page.setViewportSize({ width: 433, height: 762 })` define só o viewport em
px CSS. Sem mais nada, a página continua em **modo desktop**: mouse (não
touch), `devicePixelRatio` herdado do lançamento do browser (medido: chegou
a ficar em `2`, não `2.81`, mesmo com o viewport certo), `matchMedia
'(pointer: coarse)'` e `'(hover: none)'` **falsos**, `ontouchstart` ausente,
User-Agent de desktop. Qualquer código do app (CSS ou JS) que decida algo
por esses sinais mede errado se só o viewport for setado.

Para emular mobile de forma completa (viewport + DPR + touch + UA + mídia
de ponteiro), forçar via CDP:

```js
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setDeviceMetricsOverride', {
  width: 433,
  height: 762,
  deviceScaleFactor: 2.81,
  mobile: true
});
await cdp.send('Emulation.setTouchEmulationEnabled', {
  enabled: true,
  maxTouchPoints: 5
});
await cdp.send('Emulation.setUserAgentOverride', {
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  platform: 'Android'
});
await cdp.send('Emulation.setEmitTouchEventsForMouse', {
  enabled: true,
  configuration: 'mobile'
});
await page.reload({ waitUntil: 'load' }); // alguns sinais só se refletem em matchMedia após reload
```

Confirmar sempre antes de medir/capturar — não presumir pelo `setViewportSize`:

```js
await page.evaluate(() => ({
  dpr: window.devicePixelRatio,
  w: window.innerWidth, h: window.innerHeight,
  ontouch: 'ontouchstart' in window,
  coarse: matchMedia('(pointer: coarse)').matches,
  hoverNone: matchMedia('(hover: none)').matches
}));
```

Esperado: `dpr: 2.81`, `w: 433`, `h: 762`, `ontouch: true`, `coarse: true`,
`hoverNone: true`. Se qualquer um vier diferente, a emulação não foi aplicada.

**Ressalvas:**

- **433px fica acima do breakpoint `@media (max-width: 430px)`** do
  `assets/css/style.css`. Neste viewport, os modais abrem **centralizados**,
  não em tela cheia pela base. O piso de 16px dos campos de formulário **não**
  depende daquele breakpoint (é global).
- 320×568 e 390×844 (usados nas validações dos Cartões A/B da Etapa 2)
  continuam válidos como **stress test**: são menores que a referência e
  capturam estouro que o 433px esconderia.

---

## Armadilhas conhecidas

| Sintoma | Causa real |
|---|---|
| **Todas as rotas protegidas respondem 500** com `"Google auth is not configured on the server."` | `GOOGLE_CLIENT_ID` vazio no `.env`. O `requireAuth` falha **antes** de validar o token e antes de tocar o banco — o sintoma parece falha de banco, mas não é. |
| **Login falha com `origin_mismatch`** | Acessou por `127.0.0.1:5500` em vez de `localhost:5500`, ou a origem não está no Google Cloud Console. |
| **O log `[api-config] Ambiente detectado` não dá `local`** | O hostname não é `localhost`/`127.0.0.1`/`::1` — o frontend está apontando para a API de produção. |
| **`❌ Erro: Nenhuma variável de ambiente de conexão ao MongoDB foi encontrada`** | `MONGODB_URI` vazia ou ausente no `.env`. |
| **Alteração no `.env` não fez efeito** | O `.env` é lido no boot. Reinicie o backend. |
| **Comando de terminal "rodando" sem dar retorno** (a ferramenta reporta "moved to background") | `node -e "..."` com aspas aninhadas: o PowerShell quebra o parse e o shell fica em espera (prompt de continuação `>>` repetindo a linha). O comando **não encerrou** — não é um comando demorado. Conferir `>>` no output, matar o terminal e rodar de novo sem JS em linha (criar script `.tmp.js` e remover, ou usar busca do workspace em vez de script). |

---

## O que este setup não cobre

- **Não há webhook do Google Calendar em ambiente local.** `BACKEND_URL` precisa ser uma URL
  HTTPS pública; `localhost` não recebe notificação do Google.
- **Conectar o Google Calendar localmente** exigiria decidir qual conta e qual calendário —
  os agendamentos clonados carregam referência a eventos reais. Isso é decisão separada, e é
  o motivo de `googlecalendarconnections` ficar de fora do clone.
- **Não há branch de preview.** Push na `main` faz deploy em produção nos dois projetos
  Vercel.
