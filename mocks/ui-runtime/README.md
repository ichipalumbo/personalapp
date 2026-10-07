# Mock de runtime para validação de UI

Esta pasta reúne um conjunto de fixtures e um bootstrap para simular o app em qualquer ambiente de desenvolvimento sem tocar em produção.

## O que ele faz

- bloqueia autenticação real do Google;
- finge que o usuário está logado com um e-mail mockado;
- intercepta chamadas de fetch para `/api/*`;
- devolve fixtures por cenário;
- por padrão **bloqueia escrita** (HTTP 409) em endpoints mutáveis — exceto com
  `?mockEscrita=1` no cenário `default` (ver "Modo de escrita");
- substitui `localStorage` por armazenamento isolado **antes** dos scripts do app;
- não lê, copia ou apaga os caches reais da origem; não altera `Storage.prototype` ou `sessionStorage`;
- nos cenários B2, persiste apenas dados sintéticos num envelope reservado para permitir recarga;
- bloqueia API/ping/Google antes do runtime, inclusive requisições feitas com `Request`;
- mantém o fluxo real da interface e da renderização do frontend;
- reflete a sessão no header (avatar + área do usuário).

## Como usar

1. Para validação, use exclusivamente o servidor local e o host dedicado `127.0.0.2`.
2. Use o host `127.0.0.2` para ativar automaticamente o mock ou adicione o parâmetro `?mockScenario=<nome>` para escolher o cenário.
3. O `index.html` carrega `sandbox.js` antes dos consumidores, e cenários/runtime antes do bootstrap.

### Exemplos

- `?mockScenario=default`
- `?mockScenario=agendaLotada`
- `?mockScenario=alunosEmAtraso`
- `?mockScenario=vazio`
- `?mockScenario=vitrineEstados`
- `?mockScenario=carregamentoLento`
- `?mockScenario=desconectado`

### Flags de validação (query string)

- `?mockLatencia=<ms>` — atrasa toda resposta `/api/*` para ver skeleton e o toast de
  progresso. Ex.: `?mockScenario=default&mockLatencia=4000`.
- `?mockFalha=<rotas>` — devolve HTTP 500 nas rotas listadas (para auditar retry/erro).
  Rotas: `configuracao`, `alunos`, `agendamentos`, `reposicoes`, `bloqueios-externos`,
  `financas`, `consistencia-agenda`. Ex.: `?mockScenario=default&mockFalha=reposicoes,financas`.
- `?mockEscrita=1` — **somente no cenário `default`**: libera escrita em um store em memória
  (ver abaixo). Nos demais cenários a escrita continua bloqueada.
- `?mockStatus=401` — muda o status das rotas de `mockFalha` (400–599; padrão 500).
- `?mockJsonInvalido=1` — JSON inválido nos GETs de sucesso, sem transformar bloqueios em sucesso.
- `?mockOffline=1` — `navigator.onLine=false` e falha de rede simulada.
- `?mockReter=1` — segura as respostas até liberação explícita; abort continua funcionando.
- `?mockPersistencia=1` — opt-in de envelope sintético nos cenários antigos; B2 já habilita por padrão.

## Cenários de atualização B2 — E1

Esses cenários usam `CACHE — …` nos dados guardados e `ATUAL — …` nas respostas remotas,
com atraso inicial de 1,8s. O envelope `ui_mock_runtime_v1:<cenário>` é separado dos caches
reais; só ele pode ser escrito no storage nativo. Credencial/código/token não entram nele.

| Cenário | O que prepara |
|---|---|
| `b2CacheAntigo` | Cache principal e financeiro identificados, diferentes do servidor. |
| `b2CacheVazio` | Snapshot vazio válido com servidor contendo alunos. |
| `b2ServidorVazio` | Cache antigo, resposta remota válida vazia. |
| `b2SemSessao` | Cache identificado preservado, sessão ausente/oculta até login simulado. |
| `b2OutraConta` | Cache A, sessão inicial B; B não pode receber cache A. |
| `b2Pendencia` | Snapshot/intenção não confirmada identificada, preservada após reload. |

Exemplo pronto: [cache antigo na lista de alunos](http://127.0.0.2:5500/index.html?mockScenario=b2CacheAntigo#tela-alunos).
O mesmo cenário aceita `#tela-home` e `#tela-financas`; não navega artificialmente à Home.
Para ver o antes por mais tempo, acrescente `&mockLatencia=5000` antes da hash.

**Recarga não ressemeia:** depois de atualizar/adotar dados, o envelope conserva o resultado.
Para repetir o estado inicial use `window.__UI_MOCK_RUNTIME.resetarCache()` (limpa somente
o envelope daquele cenário e recarrega). Sessão A/B e login simulado também sobrevivem ao
reload nesses cenários. Store remoto do modo de escrita continua apenas em memória.

### Controles de infraestrutura (para automação/console no mock)

- `definirSessao({conta: 'A'|'B', autenticado: true|false})`: conta/sessão mock, header,
  listeners e unsubscribe reais; sem OAuth. `googleIdentity.signOut()` simula logout.
- `configurarRede({latenciaMs, falhas: ['reposicoes'], status: 500, jsonInvalido, offline, reter})`:
  controla respostas futuras; troca offline/online emite evento correspondente.
- `liberarRespostas()`: libera as respostas retidas existentes; retorna a quantidade.
  Configure `reter:false` antes se também quiser que as próximas respostas prossigam.
- `obterChamadas()`: cópia dos registros `{id, rota, method, estado, status}`. Inclui o ping
  bloqueado, separável por rota `/`; não registra headers, corpo, query ou credenciais.
  Estados: pendente/respondida/cancelada/bloqueada/falha-rede/falha-corpo.
- Abort durante latência/retenção/corpo de `Request` rejeita `AbortError`; não vira resposta
  de sucesso depois. A escrita já aplicada no store antes de resposta cancelada não é rollback.

E1 prepara/verifica infraestrutura; **não declara o aceite E2 concluído**. O mock não
implementa fielmente regras financeiras, efeitos lazy Mongo ou I/O de Google Calendar.

## Modo de escrita (opt-in) — `?mockEscrita=1`

Abre-se `http://127.0.0.2:5500/index.html?mockScenario=default&mockEscrita=1`.

- O mock monta um **store em memória** semeado pelas fixtures do `default` e passa a responder
  POST/PUT/PATCH/DELETE sobre ele; os GETs seguintes refletem o que foi criado/editado/excluído.
- **Nada sai para a rede** — o `fetch` já é interceptado antes disso, então não há risco de tocar
  produção. O store **é descartado ao recarregar a página** (não persiste).
- Recursos simulados: `alunos`, `agendamentos`, `reposicoes` (inclusive `/:id/reabrir`),
  `configuracao/grade_horarios` e os PATCHs de finanças (`/pagamento` e `/ajuste`).
- **Segue bloqueado** mesmo aqui: `auth/*` e `gcal/*` (envolvem credencial e estado externo).
- Fora do `default` (ex.: `vitrineEstados`, cenários de auditoria), a flag é ignorada e a escrita
  continua retornando 409 — para preservar as fixtures de demonstração.

## Carregamento rápido

O carregamento deve acontecer como script, e não com `fetch()`. `fetch()` apenas baixa o
texto do arquivo e não executa JavaScript. Se o seu ambiente usa uma cópia própria do
`index.html`, o sandbox deve estar antes de logger/storage/auth, e os outros scripts antes do bootstrap:

```html
<script src="/mocks/ui-runtime/sandbox.js"></script>
<script src="/mocks/ui-runtime/scenarios.js"></script>
<script src="/mocks/ui-runtime/mock-runtime.js"></script>
```

O servidor estático do próprio repo serve o app no host dedicado do mock:

```powershell
node scripts/servir-local.js
```

E abre-se uma destas URLs:

```text
http://127.0.0.2:5500/index.html?mockScenario=default
http://127.0.0.2:5500/index.html?mockScenario=agendaLotada
http://127.0.0.2:5500/index.html?mockScenario=alunosEmAtraso
http://127.0.0.2:5500/index.html?mockScenario=vazio
http://127.0.0.2:5500/index.html?mockScenario=vitrineEstados
```

No host `127.0.0.2`, o cenário `default` é ativado mesmo sem parâmetro. Em outros hosts,
sem `mockScenario`, o mock não é ativado: o app segue usando o login Google e a API normal.

Ao abrir uma URL com `mockScenario`, os scripts do app veem somente o storage isolado.
Caches reais daquela origem permanecem intocados e inacessíveis ao app nesse modo. Fora
do host/parâmetro mock, sandbox/runtime não substituem storage nem fetch.

## Cenários disponíveis

- `default` — dashboard completo com alunos e agenda.
- `agendaLotada` — tela densa, agenda com vários horários em sequência.
- `densidadeAgenda` — demonstra a densidade de card (TIGHT/NORMAL) na agenda do Dia.
- `agendaSimultaneos` — eventos sobrepostos (2/3/4 colunas) para o motor de colisões.
- `alunosEmAtraso` — alunos com alertas e atraso no ciclo.
- `vazio` — estado sem dados para validar empty states.
- `vitrineEstados` — **vitrine dos estados da Etapa 7**: ciclo atrasado + reposição a vencer
  (amarelo de alerta, achado 4.13), ciclo pago (botões `disabled` em Finanças, 4.17.4), aluno
  inativo com aula hoje (modal em modo somente leitura, 4.17.1) e Consultoria Online (campos
  desabilitados). Datas **relativas a hoje**.
- `carregamentoLento` — clone do `default` com `latenciaMs` de 4s (skeleton + toast de progresso).
- `desconectado` — clone do `default` com `signedIn: false` (sem sessão/perfil).

Sobre a sessão: nos cenários logados o mock **reflete a sessão no header** (avatar + botão da
área do usuário, que abre o modal de configurações). Isso é necessário porque o mock substitui
`window.googleIdentity` e o toggle do header da implementação real não roda sozinho. O status
do Google Agenda é sempre `connected: false`.

## Observações importantes

- **a validação é sempre no viewport de referência do app:** **433×762 com DPR 2.81** e com
  **emulação de mobile completa (toque, UA, mídia `pointer`/`hover`)** — o app é primariamente
  mobile. `setViewportSize` isolado não basta (DPR fica `2`, sem touch, mídias falsas). Padrão
  completo e conferência em `docs/setup-ambiente-local.md` §9;
- 320×568 e 390×844 seguem válidos como **stress test** (menores que a referência);
- este mock é apenas para UI/UX e validação visual;
- **não** substitui testes de backend nem autenticação real — inclusive no modo de escrita
  (`?mockEscrita=1`), que simula o servidor em memória, não as regras de negócio;
- sem `?mockEscrita=1`, a escrita é bloqueada (409) para evitar qualquer efeito colateral;
  com a flag, o store é só em memória e se perde ao recarregar.

## Mudança de cenário em runtime

Se o app já estiver carregado, você pode trocar o cenário com:

```js
window.__UI_MOCK_RUNTIME.setScenario('agendaLotada');
```

## Estrutura

```text
mocks/
  ui-runtime/
    README.md
    sandbox.js
    scenarios.js
    mock-runtime.js
```
