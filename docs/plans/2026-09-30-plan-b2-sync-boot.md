# 2026-09-30 — Desenho do B2: sincronização de leitura no boot sobre cache

> **Status**: DESENHO revalidado (não executado) · autor: IA, revisão do dono pendente
> **Item**: o "caminho B2" deixado de fora na execução do **5.8**
> (`2026-09-30-plan-skeletons-cache.md`) — o dono voltou a pedir o desenho em 2026-09-30,
> após a explicação do padrão de mercado (stale-while-revalidate).
> **Branch da rodada**: `feat/padronizar-skeletons-cache` (decisão do dono: seguir nela).
> **Escopo desta rodada**: varredura completa + desenho. Nenhuma linha de código do app foi alterada.
> **Revalidação (2026-09-30, mesma data)**: o dono pediu releitura completa em busca de
> brechas. Encontradas e corrigidas **3 brechas de desenho** (marcadas inline como
> "Correção da revalidação"): (1) crítica — `somenteLeitura` como descrito originalmente
> não impedia a perda do cache em caso de remoto vazio, porque o `return` que blindava
> isso estava dentro do `if` pulado; (2) a guarda R2 apagava cache de usuário legítimo
> ainda não logado; (3) a trava R4 não cobria o cruzamento leitura-B2 × escrita-usuário.
> Também registrada 1 ambiguidade de UX a decidir na execução (botão manual durante
> sync em voo).

## Decisões do dono (registradas em 2026-09-30)

1. **Escopo do desenho**: B2-puro **+ esqueleto de ETag** (capítulo de desenho no
   backend, sem implementação agora).
2. **R1 (caminho de escrita "banco vazio")**: **não dispara no boot**. O boot é só
   leitura; a migração de dados locais para o Atlas continua disponível quando o app
   abre **sem cache** (caminho de recovery original).
3. **R2 (caches sem dono)**: **entrar no escopo** do desenho — escopar `personal_financas_cache`
   por `ownerEmail` e avaliar as demais chaves globais de localStorage.

---

## 1. Contexto — o que o 5.8 descobriu

A premissa original do plano 5.8 era "o app sempre abre com dados locais e
sincroniza em background". Medido no código, **não**: o boot com cache
(`carregarDados` em `assets/js/storage.js`) renderiza na hora e **retorna sem nenhuma
chamada remota** (2 short-circuits: `_cacheInicializado=false` e
`_cachePossuiDados && !forcarRemoto`, ambos retornando `{ origem: 'local-cache' }`).
Por isso a execução do 5.8 fez o **B1** (rótulo global só nos syncs remotos que já
existiam: troca de login, botão "Sincronizar Dados", auto-refresh) e deixou o B2
("disparar sync no boot também") fora — comportamento novo de negócio, candidato a
futuro item de roadmap (provavelmente junto do 2.2).

O dono entendeu que é importante e pediu varredura completa + desenho antes de
decidir se implementa. Este report é esse desenho.

## 2. Padrão de mercado aplicado (resumo)

Stale-while-revalidate: (1) render do cache imediato; (2) revalidação condicional
(ETag/304) quando viável; (3) reconciliação de **leitura** com o servidor como fonte
de verdade; (4) indicador sutil não-bloqueante (o B1 já entrega); (5) TTL/throttle;
(6) silêncio offline. Duas regras duras: nunca merge de escrita no boot e nunca
pisar em formulário aberto. Detalhamento no item 7 (etapa ETag).

## 3. Varredura — estado atual medido (base do desenho)

### 3.1 Cadeia de boot

`bootstrap.js → initialize()`:
1. `googleIdentity.initialize()` + `await whenReady(1600)`;
2. `router.navigateTo('tela-home')` — o `initializeView` do router chama
   `inicializarHome()` **sem args**;
3. `inicializarHome()` (`view-home.js`): `deveSincronizar` = `!__sincronizacaoInicialConcluida`
   (sempre `true` no boot) → `_sincronizarDadosHome` →
   `carregarDados({ forcarRender: false, forcarRemoto: false })` —
   **`forcarRemoto` vem de `opcoes.sincronizar === true`, que é `undefined` no boot**;
   com cache, entra num short-circuit local e o boot termina sem rede de dados.
   (O loading da Home só aparece `deveMostrarLoading` quando não há cache local.)
4. **Depois** da navegação, o bootstrap ancora em `setTimeout(0)`:
   `dispararVerificacaoCanalGCal()` (guarda `gcalWatchCheckDisparado`) e
   `iniciarSyncGoogleCalendarAutomatica()` — 2ª rede de chamadas paralela,
   **independente** de `carregarDados` (spec `gcal-sync.md` 5.1.3: "Nenhum dos três
   `carregarDados` existentes dispara a renovação").
5. Listeners já registrados no bootstrap: **auth-change**
   (`carregarDados({forcarRender:false, forcarRemoto:true})` + refresh da view) e
   **visibilitychange** auto-refresh (≥90s oculto, throttle 30s, guarda
   `autoRefreshEmAndamento`, `silenciosoUI:true`, `silenciarAuthToast:true`).

Gatilhos remotos que existem hoje: auth-change, auto-refresh, botão manual
`window.sincronizarBancoDados` (guarda `_syncBancoEmAndamento`), e chamadas pontuais
de views (`view-alunos.js`, `modal-acao-slot.js` — refresh pós-gravação).

### 3.2 O caminho remoto de `carregarDados` (o que o B2 reutilizaria)

- `Promise.all` de **5 fetches**: `/alunos`, `/agendamentos`, `configuracao/grade_horarios`,
  `/bloqueios-externos` (fallback `[]`), `/reposicoes` (fallback `[]`); primeira
  requisição da vida com timeout de **40s**, depois `API_TIMEOUT_MS` (8s).
- **Caminho de escrita oculto nº 1 ("banco vazio")**: se `alunos.length===0 &&
  aulas.length===0` no remoto e existir backup local (`personalTrainerData` ou
  `personal_alunos`/`personal_aulas`), o app faz `atualizarAlunos/...` +
  **`salvarDados(true)`** + toast "Seus dados locais foram migrados com sucesso".
  `salvarDados` é **CRUD bidirecional** (`_sincronizarAlunosViaCRUD` /
  `_sincronizarAgendamentosViaCRUD`): POST o que falta no remoto, PUT o que mudou,
  **DELETE no remoto o que não existe no local**, mais `PUT` de grade.
- **Caminho de escrita oculto nº 2 ("migração de objetivos")**: a normalização de
  `objetivo`/`corObjetivo` na leitura; se mudou algo, `salvarDados(true)` de novo.
- Sucesso: `salvarNoLocalStorage()` (5 chaves: `personal_alunos`, `personal_aulas`,
  `personal_reposicoes`, `personal_limitesGrade`, `faturamentoMeta`) + render
  (se `forcarRender`).
- Falha: `local-fallback` — recarrega cache local, toast "Sem conexão. Seus dados
  foram salvos neste aparelho." (suprimido se `silenciosoUI`).
- 401: `local-auth-expirado` + toast "Sua sessão Google expirou..." (suprimido se
  `silenciarAuthToast`).
- **Rótulo de cache (B1)**: `_marcarSyncSobreCache()` acende quando
  `usuarioAutenticadoNoApp() && _cachePossuiDados` — **o B2 acenderia o rótulo
  automaticamente por esta definição**, sem mudança em UI nova.

### 3.3 Caches locais — espalhadas, desalinhadas

| Onde | O quê | Escopo por dono? |
| --- | --- | --- |
| `personal_alunos`, `personal_aulas`, `personal_reposicoes`, `personal_limitesGrade`, `faturamentoMeta` (`storage.js`) | os 5 datasets principais | ❌ nenhuma |
| `personal_financas_cache` (`storage.js`, `{atualizadoEm, dados}`) | último `GET /api/financas` | ❌ |
| `gis_profile_cache`, `gis_session_cache`, `gcal_connection_cache` (`auth/google-identity.js`, `google-calendar.js`) | sessão Google / estado OAuth | ✅ intrínsecos (token do dono logado) |

Consequência R2 medida: trocar de conta Google **com o app fechado** e reabrir → o
login novo restaura, mas o boot **renderiza o cache do dono anterior** e só corrige
no sync remoto (1–8s). Pior caso R2×R1: Mongo do novo dono vazio + cache do antigo →
o caminho "banco vazio" **re-semeia o Mongo do novo dono com os dados do antigo**
(leak entre contas — o app é multiusuário por `ownerEmail`).

### 3.4 Serviço worker (`sw.js`)

Shell: cache-first. `/api/`: **network-first**, cache só como fallback de erro
(retorna 504 sintético "Offline"). Não interfere no B2, mas explica o 504 do
Live Server visto na execução do 5.8. Nenhuma mudança planejada.

### 3.5 Regras de negócio que **limitam** o desenho (specs lidas na íntegra)

- **Finanças 6.1 / decisão #14** — "cache local apenas leitura/resiliência a cold
  start... **Exibir o cache imediatamente e atualizar quando a resposta chegar**".
  O B2 é a implementação dessa frase no boot; **não é regra nova**, é a regra que
  falta.
- **Finanças 5.8/5.9 / decisão #23** — recálculo do ciclo não-pago é automático a
  cada leitura de `GET /api/financas` (é o que corrige a contagem após exclusão de
  aula, decisão #16); recálculo usa **só snapshot**; ciclo **pago** congelado — o
  B2 não toca congelamento algum (só re-consulta a GET).
- **Finanças 6.2/#25** — histórico de ciclos fora do cache persistente (só memória
  de sessão) → inalterado pelo B2.
- **Reposições** — o bloco de reposições em tela e o modal fazem **leituras
  próprias** (`GET /api/...`); o texto da spec ("o modal tenta a leitura própria")
  continua verdadeiro no B2.
- **gcal-sync 9.14** — "gatilho **triplo** de sincronização no boot" pendente; o 2.2
  do roadmap ("Consolidação das três syncs no boot") é o item-pai da consolidação.
  **O B2 cria um 4º ponto de boot de dados** — a descrição de 9.14/2.2 precisa ser
  atualizada para refletir isso (ver item 8).
- **Isolamento `ownerEmail`** (regra 4.1 das instruções do repositório) — toda query
  filtra por dono; a R2 é o espelho frontend dessa regra (o backend já isola; o
  cache não).

### 3.6 Riscos encontrados (classificados)

- **R1 (alto) — caminho de escrita "banco vazio" no boot**: decidido **não disparar
  no boot** (decisão 2 acima). Sem mudança de código, o B2 o ativaría no boot com
  cache + Mongo zerado (exatamente o fluxo de "limpar produção" do dono).
- **R2 (médio, elevado pela R1) — caches sem dono**: decisão **incluir no escopo**
  (decisão 3). Cenário de leak entre contas descrito em 3.3.
- **R3 (médio) — 401 silencioso vira toast surpresa**: no boot com cache, a
  falha de 401 mostraria "Sua sessão Google expirou..." sobre uma Home já pintada.
  Tratado com `silenciarAuthToast: true` (mesma opção que o auto-refresh já usa).
- **R4 (médio) — concorrência no boot**: no mesmo segundo correm gcal-watch +
  gcal-connection + (B2) 5 fetches + possível auth-change. Hoje cada gatilho tem
  guarda própria; não existe trava **global** de "1 sync remoto de dados por vez".
  Tratado com trava global (§5.4).
- **R5 (baixo para B2, central no item 7) — sem ETag no backend**: nenhum
  `ETag`/`If-None-Match`/`Last-Modified` existe em nenhuma rota (`grep` em
  `backend/src` vazio). O B2-puro reenvia o payload inteiro a cada boot; o desenho
  do item 7 é o caminho para tornar barato.
- **R6 (baixo) — timeout de 40s com rótulo à vista**: na primeira requisição da
  vida, o rótulo "Sincronizando dados..." pode durar ~40s em rede ruim. Desenhado
  como-is (a alternativa — cap de display — ficaria como nota opcional, item 9).
- **Observação (não se muda no B2)**: o auto-refresh re-renderiza **só a view ativa**
  (`refreshCurrentView`). No boot a ativa é a Home; Alunos/Finanças ficam frescos
  na próxima navegação (as telas leem cache local + GET próprio). Comportamento
  idêntico ao do auto-refresh atual, documentado para não causar surpresa.

## 4. O que o B2-puro **não** faz (fronteiras do desenho)

- Não implementa ETag (desenhado, item 7) — zero mudança de backend.
- Não encara a consolidação dos gatilhos GCal do boot (9.14/2.2 segue pendente,
  mas a nota passa a considerar o B2).
- Não cria fila de escrita offline (o app já grava direto na API + espelha em
  localStorage; fora de escopo por spec).
- Não altera TTL/throttle do auto-refresh (90s/30s mantêm).
- Não adiciona novas UI além do rótulo B1 já executado.

## 5. Desenho — B2-puro

### 5.1 Gatilho e ponto de chamada

Nova função em `storage.js`: `window.sincronizarBootSobreCache()`, chamada uma vez
no `bootstrap.js` **após** os dois triggers GCal (final do `initialize()`), de modo
que a Home já tenha sido pintada do cache e para não preceder as chamadas GCal.
Guardas, todas dentro da função (testeável isoladamente):

1. `!_syncBootDisparado` (uma vez por sessão) e marca ao chamar;
2. `usuarioAutenticadoNoApp()`;
3. `_cachePossuiDados` (sem cache o gatilho normal do boot já resolve — ver 5.6);
4. `!_syncRemotoDadosEmAndamento` (trava global, 5.4);
5. `navigator.onLine !== false` (atalho barato; a falha de rede real já é tratada).

Chamada efetiva — **idêntica à do auto-refresh** (caminho em produção há semanas):

```
carregarDados({
  forcarRender: false,
  forcarRemoto: true,
  silenciosoUI: true,
  silenciarAuthToast: true,
  somenteLeitura: true        // novo — ver 5.2
})
// no sucesso: refreshActiveView(router) — a view ativa (Home) pinta os dados frescos
```

Rótulo: acende sozinho via `_marcarSyncSobreCache()` (definido em 3.2) — **nenhuma
UI nova**; some no `finally` (sucesso, falha ou 401).

### 5.2 Tratamento R1 — `somenteLeitura`

Nova opção em `carregarDados`/`salvarDados`: **`somenteLeitura: true`**.

> **Correção da revalidação (2026-09-30)**: a primeira versão deste desenho
> dizia que bastava pular os dois caminhos de escrita ocultos. **Isso não
> bastava** — reler o controle de fluxo real de `carregarDados` mostra que o
> `return` da migração fica **dentro** do `if (listaAlunosAPI.length === 0 &&
> listaAulasAPI.length === 0)`. Se esse `if` for apenas pulado, a função
> **continua** e executa, incondicionalmente logo abaixo, `atualizarAlunos(
> listaAlunosAPI)` / `atualizarAulas(aulasParaCarregar)` com os arrays
> **vazios** do remoto, e depois `salvarNoLocalStorage()` — ou seja, o cache
> local seria apagado de qualquer forma, só que por um caminho diferente do
> que o R1 queria fechar. A correção precisa agir **antes** desse ponto:

- **Guarda nova, no topo do bloco de tratamento da resposta bem-sucedida**: se
  `somenteLeitura === true` **e** `listaAlunosAPI.length === 0 && listaAulasAPI.length
  === 0` **e** havia cache local com dados (`_cachePossuiDados` antes da
  chamada) → **sair imediatamente** sem tocar `atualizarAlunos`/`atualizarAulas`/
  `salvarNoLocalStorage`, mantendo o estado de memória e o localStorage
  intactos, com um `log.warn` ("Boot: remoto vazio com cache local presente —
  preservando cache, sem migrar.") e retorno equivalente a `{ origem:
  'local-cache' }`. Isso fecha o R1 de fato — nenhuma leitura de estado
  muda, nenhuma escrita ocorre.
- "migração de objetivos → `salvarDados(true)`" (branch
  `houveMigracaoPersistenteAlunos`) — **continua** bloqueada por
  `somenteLeitura`, mas aqui o pulo é seguro: a branch só é alcançada quando o
  remoto **não** está vazio (já passou da guarda acima), então pular apenas o
  `salvarDados(true)` não descarta nada — os dados normalizados já foram
  aplicados ao estado em memória e ao `localStorage` normalmente; só a
  gravação de volta no Mongo fica para o próximo sync não-`somenteLeitura`.

Somente **o gatilho de boot** passa `somenteLeitura: true`. Auto-refresh,
auth-change, botão manual e iniciais de views seguem sem a flag (a recovery original
com sem-cache segue intacta — teste de regressão obrigatório, item 6).

Consequência documentada: se o Mongo for zerado e o aparelho tiver cache, o app
**funciona do cache** até que o dono crie/importe dados pela UI (qualquer gravação
via `salvarDados` normal re-semeia o banco legítima).

### 5.3 Tratamento R3

`silenciarAuthToast: true` no gatilho de boot. Em 401 com cache: `local-auth-expirado`,
cache preservada, **sem toast**; o fluxo de login do Google (prompt da GIS) assume a
comunicação, comportamento idêntico ao auto-refresh com 401.

### 5.4 Tratamento R4 — trava global

Novo flag em `storage.js`: `_syncRemotoDadosEmAndamento`, true no início do caminho
remoto de `carregarDados` e false no `finally`. Todas as entradas existentes
(gatilho de boot, auth-change, auto-refresh, `sincronizarBancoDados`, refresh de
views) passam a ser **mútua-mente exclusivas**: quem chega com a trava levantada
delega ao sync em voo (comportamento: "já tem sync em curso, o resultado dele
cobre"). As guardas por-gatilho existentes (`autoRefreshEmAndamento`,
`_syncBancoEmAndamento`, `gcalWatchCheckDisparado`) **permanecem** (defesa em
profundidade, zero custo).

> **Correção da revalidação (2026-09-30) — brecha de escopo**: a trava acima só
> serializa chamadas de **leitura** (`carregarDados` × `carregarDados`). Ela
> **não** cobre `salvarDados` — que faz sua própria `GET` fresca dentro do CRUD
> (`_sincronizarAlunosViaCRUD`/`_sincronizarAgendamentosViaCRUD`) antes de
> calcular o diff a aplicar. Se o boot-sync (B2) estiver em voo exatamente
> quando o usuário salva algo (ex.: editar um agendamento), são duas operações
> HTTP independentes sobre a mesma coleção, cada uma computando diff a partir
> de uma fotografia potencialmente diferente — risco real de POST duplicado
> ou DELETE indevido (a regra de mercado "nunca pisar em formulário/gravação em
> curso" da seção 2 da conversa). **Correção**: a trava vira
> `_syncRemotoEmAndamento` (leitura **e** escrita) com prioridade de escrita —
> se `salvarDados` for chamado enquanto uma leitura B2/auto-refresh está em
> voo, a leitura é **abortada** (ou seu resultado descartado ao terminar) e a
> escrita segue sem esperar; se for o inverso (leitura chega com escrita em
> voo), a leitura **aguarda** a escrita terminar antes de iniciar. Isso exige
> um `AbortController` acessível para a leitura em voo — ponto a detalhar na
> rodada de execução, não neste desenho.

**Ambiguidade de UX a decidir (revalidação)**: se o botão manual "Sincronizar
Dados" for tocado enquanto a trava já estiver levantada por outro gatilho
(boot/auto-refresh), o clique deve (a) anexar-se ao sync em curso e mostrar
"Sincronizando..." imediatamente, ou (b) ficar sem efeito visível até o próximo
clique? Recomendo (a) — o usuário não pode ver o botão "parado" sem feedback
quando algo já está de fato sincronizando. Decisão do dono na rodada de
execução.

### 5.5 Tratamento R2 — escopo das caches por `ownerEmail`

Objetivo: um boot **nunca** renderiza (nem migra) dados de outro dono.

1. **Nova chave** `personal_cache_dono` no `localStorage` = `ownerEmail` da sessão
   que fez a última escrita (gravada em `salvarNoLocalStorage()` e nas 3 operações
   de `limparCacheFinancas`/cache de finanças; lida no boot).
2. **Guarda de leitura em `carregarDadosDoLocalStorage()`**: se
   `personal_cache_dono` existir **e** `ownerEmail atual` **também existir**
   (usuário autenticado) **e** os dois divergirem → **remove do `localStorage`
   as 5 chaves de dado + a chave de dono** e não carrega nada para o estado de
   memória; `_cachePossuiDados = false`.
   > **Correção da revalidação (2026-09-30) — brecha de desenho**: a primeira
   > versão comparava `personal_cache_dono !== ownerEmail atual` sem checar se
   > havia sessão. Isso quebrava um caso real e já suportado hoje: o app
   > **mostra cache para quem ainda não logou** (`carregarDados` tem o caminho
   > dedicado `local-sem-login`). Se o app reabre e a sessão Google ainda não
   > restaurou (ou expirou), `ownerEmail atual` é `null`; a comparação ingênua
   > `"a@b.com" !== null` é verdadeira e apagaria o cache de um usuário
   > **legítimo que simplesmente ainda não logou** — o oposto do objetivo da
   > R2. A guarda corrigida **só dispara com um dono atual conhecido e
   > divergente**; ausência de sessão nunca é motivo de descarte.
   Detalhe que torna a remoção (e não apenas o "não carregar") obrigatória: o
   caminho de escrita "banco vazio" lê o backup **direto do `localStorage`**,
   não do estado de memória — sem a remoção, a migração re-semearia o Mongo com
   o cache do antigo dono (cenário R2×R1 de 3.3, e note que esse caminho de
   migração já está desligado no boot pela correção do R1 em 5.2 — a remoção
   aqui continua valendo para os demais gatilhos, ex.: auth-change, que **não**
   usam `somenteLeitura`). Efeitos em cadeia:
   - boot com cache **de outro dono** → comportamento igual a boot **sem cache**
     (skeleton na Home, chamada remota normal do boot, **sem** rótulo "sobre cache"
     — o `_marcarSyncSobreCache` cai por `_cachePossuiDados=false`), e o caminho
     "banco vazio" **não pode executar a migração** (ele só roda se houver backup
     local — a guarda também protege a R1 contra o cenário de leak R2×R1, 3.3);
   - troca de conta **com o app aberto** (auth-change) → mesmo: cache descartada,
     sync remoto do novo dono;
   - dona igual ao `person_cache_dono` → inalterado, zero novo custo.
3. **`personal_financas_cache`** ganha campo `ownerEmail` no objeto
   `{atualizadoEm, ownerEmail, dados}`; `obterCacheFinancas()` retorna `null` se o
   campo não bater com a sessão atual (a telinha de Finanças e o card do aluno
   (`obterResumoFinanceiroPorAluno`) passam a tratar "cache sem dono" como "sem
   cache" — já tratam `null` hoje).
4. **Demais chaves globais** (`personal_alunos` etc.): cobertas pela guarda 2 da
   chave única `personal_cache_dono` — **não** escopa cada chave
   individualmente (5 chaves × formato raw = migração mais arriscada por zero
   ganho real: o dono atual do espelho é sempre o dono da sessão, por definição da
   guarda). `faturamentoMeta` segue a mesma guarda.
5. Chaves de sessão/OAuth (`gis_*`, `gcal_connection_cache`) **não entram** —
   já são intrínsecas ao token/logado do dono.
6. **Sem efeito no backend** e na regra de isolamento 4.1 (que já filtra
   `ownerEmail` em toda query) — a guarda é defesa do **estado local** só.

### 5.6 Sequência de boot de cabeça no B2 (caso: app fechado → reaberto → cache do dono atual)

1. `whenReady(1600)` → sessão restaurada do cache OAuth (`gis_session_cache`);
2. `navigateTo('tela-home')` → `inicializarHome()` → `carregarDados` sem remota →
   **Home pintada do cache na hora** (com 3 barras `.skeleton` da 5.8 só se **não**
   havia cache);
3. GCal: watch-check + connection (paralelos, `setTimeout(0)`);
4. `sincronizarBootSobreCache()` → rótulo "Sincronizando dados..." acende no
   header → os 5 GETs → `somenteLeitura` → dados novos;
5. Sucesso: `salvarNoLocalStorage` (com nova `personal_cache_dono`),
   `refreshActiveView` → Home re-renderiza com os frescos; rótulo some.
   Falha: cache intacta, rótulo some, **sem toast** (silencioso); 401: item 5.3.

Caso sem cache (boot primeiro uso / após clear): o passo 4 é **pulador**
(`_cachePossuiDados=false`) — o boot já faz a chamada remota via `inicializarHome`
(como hoje), skeleton da 5.8 na Home, e o botão "Sincronizar Dados" continua como
gatilho de recovery.

## 6. Testes planejados (`tests-frontend/`, harness jsdom + `vm`, padrão do repositório)

Arquivo: `tests-frontend/boot-sync-b2.test.js` (novo). Casos:

1. **Boot com cache + online** → 1 batch de 5 GETs; rótulo visível **durante** o voo,
   oculto no sucesso; view refreshada; `personal_cache_dono` gravada.
2. **Boot com cache + rede caida** → cache intacta; rótulo apaga sem toast
   (silencioso); nenhum dado perdido.
3. **Boot com cache + 401** → `local-auth-expirado`; cache preservada; **sem toast**
   (R3).
4. **Boot sem cache** → gatilho não dispara (o boot normal já resolve); no máximo
   1 batch de GETs (prova anti-dobro).
5. **Trava global (R4)**: sync manual em voo + boot → **1** batch de GETs total; o
   segundo é delegado / pulado.
6. **R1**: boot com cache + remoto **vazio** (lista `[]`) → **zero writes** (POST/PUT/DELETE
   zero), `salvarNoLocalStorage` não sobrescreve o backup, sem toast "migrados".
7. **Regressão R1**: boot **sem cache** + remoto vazio + backup local → migração
   **segue funcionando** como hoje.
8. **R2-a**: boot com cache + `personal_cache_dono` de outra conta (e `ownerEmail`
   atual conhecido, sessão restaurada) → cache descartada (estado de memória
   vazio), chamada remota normal, rótulo não acende, migração não executa.
9. **R2-b**: `personal_financas_cache` com `ownerEmail` diverso →
   `obterCacheFinancas()` retorna `null`.
10. **R2-c**: mesmo dono → zero novo overhead (cache lida normalmente).
11. **R2-d (brecha da revalidação)**: cache com `personal_cache_dono` gravado, mas
    `ownerEmail` atual ainda não restaurado (sessão não chegou/expirada) → cache
    não é descartado; app continua mostrando os dados em cache no caminho
    `local-sem-login` de hoje. Prova de que a guarda R2 não regride o caso já
    suportado de "ver cache sem estar logado".
12. **R1-b (brecha da revalidação)**: boot com cache + `somenteLeitura` + remoto
    devolvendo listas vazias → o estado de memória (`obterAlunos()`/`obterAulas()`)
    permanece idêntico ao de antes da chamada e `localStorage` não é regravado
    (spy em `atualizarAlunos`/`atualizarAulas`/`salvarNoLocalStorage` com zero
    chamadas) — cobre o caminho que a v1 do desenho deixava passar.
13. **R4-b (brecha da revalidação)**: `salvarDados` chamado enquanto um boot-sync
    de leitura está em voo → a leitura não aplica seu resultado por cima da
    escrita (ordem final do estado reflete a escrita do usuário, não a leitura
    stale); o inverso (leitura chega com escrita em voo) → leitura aguarda.

**Prova de mutação** (regra do repositório): para cada fix reverter individualmente
(`somenteLeitura` ignorado → caso 6 deve falhar; guarda de vazio removida → caso 12
deve falhar; guarda R2 removida → caso 8 deve falhar; guarda R2 sem checar sessão
atual → caso 11 deve falhar; trava global removida → caso 5 deve falhar; trava sem
cobrir escrita → caso 13 deve falhar; `silenciarAuthToast` removido → caso 3 deve
falhar). Confirma `git status` limpo após restaurar.

## 7. Esqueleto de ETag (desenhado, não implementado)

Objetivo de mercado (item 3.6-R5 + 2): tornar **barato** o sync repetido — o
custo real do B2 não é o payload (KBs) e sim o **recalculo servidor** que cada
`GET /api/financas` dispara (recontagem dia-a-dia de agenda por aluno não-pago,
cálculo das reposições, sincronização de ciclos — ver "revisão N+1" da spec).
Um 304 economiza isso todo.

- **Caminho (weak ETag por rota)**: cada `GET` de listagem calcula
  `W/"<ownerEmail-hash>:<count>:<maxUpdatedAt>"` a partir da **própria**
  collection filtrada pelo dono (1 agregação, indexada se houver índice em
  `updatedAt`) — ex.: `/alunos` → collection `Aluno`. Um ETag por rota, em
  memória por sessão (persistência opcional). Resposta:
  - `If-None-Match` bate nos dois → **304**, body vazio;
  - não bate → 200 completo + novo `ETag`.
- **Contrato no cliente**: `apiFetchBackend` passa `If-None-Match` (do último `ETag`
  em memória por sessão + persistido opcionalmente) e trata 304 como **sucesso**
  sem payload → `carregarDados` mantém o cache (não sobrescreve por vazio), o
  rótulo do B1 some, `refreshActiveView` fica opcional (dados idênticos).
- **Onde ajuda mais**: `view-financas.js` (recalculador pesado) e `view-home.js`
  (lista de agendamentos). O 5-parallel do boot vira 5 HEAD-like quase gratuitos.
- **Custos/cuidados**:
  - `updatedAt` precisa ser mantido nos schemas (verificar quais collections têm —
    `CicloFinanceiro` tem; `Aluno` e `Agendamento` **a conferir** — se faltar, 1º
    passo é o campo, que é backend só);
  - ETag **weak** (`W/`) é o correto aqui: o body 200 é derivado na hora (recálculo
    de leitura) e pode variar sem o documento mudar em conteúdo semanticamente
    relevante; o ETag marca "os documentos de base mudaram?";
  - 304 + `somenteLeitura` nunca escreve (compatível com 5.2);
  - service worker: em `fetch()` nativo, `response.ok` é `false` para 304 (só
    200–299). O caminho `network-first` do `sw.js` tratará o 304 como resposta
    normal (não entra no cache, é retornado ao chamador) — **mas** o `catch` do
    handler de fetch só roda se o `fetch` rejeitar, e 304 não rejeita; mesmo
    assim, **testar** o caminho do SW com 304 explicitamente na rodada ETag
    (comportamento pode variar por browser — Chrome/Edge/Firefox concordam em
    `ok===false`, mas a validação é obrigatória pelo padrão do repositório).
- **Sequência de rodadas sugerida (se o dono aprovar o B2)**:
  1. rodada atual (este report) — decisão;
  2. rodada B2-puro (§5);
  3. rodada ETag (backend + `apiFetchBackend` + 1 telinha de prova (Finanças));
  4. 2.2/9.14: consolidação dos gatilhos de boot (dados + GCal) num único orquestrador.
- **Roadmap (registrado em 2026-09-30)**: o B2 virou o item **2.4** (Grupo 2, esforço
  Médio, vizinho do 2.2). O ETag/304 fica como rodada separada dentro do 2.4 — não
  ganhou número próprio.

## 8. Atualizações de documentação pendentes (apenas se o B2 for executado)

- `docs/specs/gcal-sync.md` §9.14: "tripla" passa a considerar o 4º ponto (boot de
  dados) — a consolidação do 2.2 engloba ele.
- `docs/roadmap.md`: **feito em 2026-09-30** — item 2.4 (tabela + seção, com link para
  este report) e nota no 2.2 sobre a ordem de consolidação.
- `docs/specs/financas-ciclo-cobranca.md` §6.1: nota "implementado no boot (B2,
  2026-XX)" quando executar.
- `docs/plans/2026-09-30-plan-skeletons-cache.md`: pointer para este report na
  seção B2 (o dono pediu o desenho; o plano segue EXECUTADO com B1).

## 9. Pendências / riscos residuais aceitos no desenho

- **R6** (40s de rótulo em rede ruim): aceito as-is; cap de display opcional (nota).
- **Sw com 304**: validação explícita exigida na rodada ETag (item 7).
- **Auto-refresh com Mongo zerado** (espelho da R1 fora do boot): comportamento de
  hoje, **não muda no B2** — registrado como observação para o dono (o mesmo
  `somenteLeitura` poderia se estender, mas foge do escopo desta rodada).
- **ETag de campo `updatedAt`**: 1º passo depende de confirmar presença/correção do
  campo nas collections (a conferir, backend só).
- **Multi-janelas do mesmo dono** (2 abas): fora do desenho de escopo (o app é
  1 usuário/1 abas na prática); a trava global é por-janela (memória JS).
- **Ambiguidade de UX (revalidação, §5.4)**: botão "Sincronizar Dados" tocado com
  a trava já levantada por outro gatilho — decisão do dono pendente (recomendação:
  anexar ao sync em curso e refletir "Sincronizando..." de imediato).
- **`AbortController` para leitura em voo (revalidação, §5.4)**: a prioridade de
  escrita sobre leitura exige cancelar (ou descartar) uma leitura já em rede —
  mecanismo concreto (abort vs. flag de descarte pós-resposta) fica para detalhar
  na rodada de execução do B2-puro, não neste desenho.

## 10. Validade

Este desenho é válido contra o código de `feat/padronizar-skeletons-cache` no
commit `bb9762b` + mudanças não-commitadas da rodada de skeletons (arquivos
`storage.js`, `view-home.js`, `view-financas.js`, `view-alunos.js`, `style.css`,
`index.html`). Se a rodada de skeletons mudar alguma das âncoras citadas (short-
circuits de `carregarDados`, `_marcarSyncSobreCache`, guardas do auto-refresh),
reler esta seção antes de executar.
