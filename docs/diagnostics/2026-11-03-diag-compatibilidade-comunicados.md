# Diagnóstico — Compatibilidade comprovável para comunicados

> **Status**: Concluído no recorte de investigação (T01) · **Criado/Atualizado**: 2026-11-03 · decisões posteriores do dono na seção 11
> **Pergunta**: como comprovar, no navegador, que o código **efetivamente executado** é compatível com um comunicado antes de exibi-lo — e como um cliente antigo obtém código compatível sem recarga automática?
> **Base**: código em `1ff3ca374443c6292c3518c1095054382ab8ce93` (idêntico ao `HEAD` `3019494` para tudo fora de `docs/`, `.github/` e `.vscode/`), branch `feat/atualizacao-app`.
> **Método**: leitura do código; medições locais com o servidor estático e o mock; inspeção somente leitura de cabeçalhos HTTP publicados; experimento controlado em cópia descartável do repositório, fora da árvore versionada.
> **Limite**: nada foi alterado no produto, no worker, na Vercel ou em automação. Não houve acesso a dados reais, login em produção nem execução de suíte de backend. As conclusões valem para esta base e não aprovam arquitetura, implementação ou publicação.

Este documento responde a B1, B2, B3 e B7 do [plano da frente](../plans/2026-11-03-plan-comunicados-novidades.md) e continua o [diagnóstico de origem](2026-11-03-diag-comunicados-novidades.md). O [diagnóstico técnico anterior](2026-11-03-diag-atualizacao-app.md) permanece como registro da frente cancelada de sinalização de versão.

## 1. Fatos observados

### F01 — Não existe identidade de recurso executado

- `index.html` tem **42** tags `<script>`: **41 locais** e uma externa (`https://accounts.google.com/gsi/client`, carregada com `async`). Nenhuma usa query string de versão.
- Não há `version.json`, `meta http-equiv`, serviço de versão nem workflow em `.github/` (que contém apenas `.github/copilot-instructions.md`).
- Consequência: hoje nada no app responde "quais recursos, com qual conteúdo, estão executando nesta página".

### F02 — Cabeçalhos publicados revalidam a cada carregamento, e o host documentado é outro

Medições de `GET`/`HEAD` somente leitura em 2026-11-03:

| URL | Resposta observada |
|---|---|
| `https://josy-personal-app.vercel.app/` | `307` para `https://personal-josy.vercel.app/` |
| `https://personal-josy.vercel.app/` | `200`, `Cache-Control: public, max-age=0, must-revalidate`, `ETag`, `Last-Modified`, `Content-Length: 75097` (igual ao `index.html` local) |
| `.../assets/js/view-financas.js` | `200`, mesmo `Cache-Control`, `ETag`, `Content-Length: 69613` (igual ao arquivo local) |
| `.../assets/css/style.css` | `200`, mesmo `Cache-Control`, `ETag`, `Content-Length: 115651` |
| `.../sw.js` | `200`, mesmo `Cache-Control`, `ETag`, `Content-Length: 2370` |
| `https://personal-app-api.vercel.app/` | `200`, `Cache-Control: public, max-age=0, must-revalidate`, sem qualquer identificador de release |

Consequências:

1. `max-age=0` + `must-revalidate` significa que o navegador **revalida cada recurso antes de reutilizar a cópia**; quando o `ETag` muda, o corpo novo vem no mesmo carregamento. Isso favorece a obtenção de código novo na próxima abertura, mas não impede conjunto misto quando parte das requisições falha (F03).
2. A origem efetiva é `personal-josy.vercel.app`; `josy-personal-app.vercel.app` redireciona. Como armazenamento local e escopo de service worker são por origem, o host documentado nas instruções não é a origem onde o app executa.
3. A API responde com `max-age=0, must-revalidate`, ou seja, respostas de API não ficam em cache HTTP. O `SW` também não intercepta `/api/` (F03). Logo a "cópia local" de estado e catálogo precisa ser explícita, não herdada de cache.

### F03 — O service worker entrega rede primeiro, mas monta o conjunto por URL

Em [sw.js](../../sw.js): `install` pré-cacheia 7 arquivos (`index.html`, `style.css`, `app.js` e 4 faces da Poppins), chama `skipWaiting()`; `activate` apaga caches de outro nome e chama `clients.claim()`; `fetch` intercepta **todo** `GET` same-origin fora de `/api/`, busca a rede, grava cópia quando a resposta é `ok` e `basic`, cai para o cache **por URL** em falha, devolve `/index.html` cacheado para navegação e `504` quando não há nada.

Consequência: o cache é um mapa por URL. Se parte das requisições falhar depois de um deploy, uma mesma página pode executar arquivos novos e antigos — o estado "recurso misto". Reproduzido no experimento E2 (seção 2).

### F04 — `cache: 'no-store'` não contorna o service worker

[api-config.js](../../assets/js/config/api-config.js) e [sandbox.js](../../mocks/ui-runtime/sandbox.js) não interferem nisto: o `fetch` feito pela página continua passando pelo handler do worker. Com a rede indisponível, o worker responde `200` com o corpo **cacheado** — inclusive para requisições com `cache: 'no-store'` (experimento E3, seção 2).

Consequência: "baixar o arquivo e comparar o hash com o esperado" não prova frescor nem identidade do código executado. A prova só é válida se vier do corpo que o documento realmente executou.

### F05 — Só há uma medida disponível do que foi executado: o tamanho do corpo

`performance.getEntriesByType('resource')` expõe `decodedBodySize` do corpo entregue ao documento, inclusive quando o corpo saiu do cache do worker offline (experimentos E1 e E2, seção 2). É a única medida de "código executado" obtível **sem alterar arquivos**.

Limite: tamanho em bytes não é identidade. Uma edição que preserve o comprimento do arquivo passa na aferição.

### F06 — O markup do HTML também participa do comportamento

`index.html` não tem JS inline, mas tem **15** atributos inline de evento (`onclick`, `onchange`, `onsubmit`, `oninput`). Um comunicado sobre mudança de UI pode depender de markup, não só de módulo JS.

### F07 — CSS não se auto-identifica

`document.styleSheets` expõe apenas regras já normalizadas pelo navegador, não os bytes carregados. Uma hash de `cssText` teria de ser produzida em navegador, não em Node. Não existe hoje mecanismo que prove a identidade do CSS executado.

### F08 — Não há integração contínua

Sem workflow em `.github/`, toda verificação é local (`node --test` em `backend/` e em `tests-frontend/`). Qualquer garantia de integridade precisa ser verificável por teste que o dono roda, não por pipeline.

### F09 — Baseline medida nesta rodada

`npm test` em `tests-frontend/`: **517 testes, 517 passando, 0 falhas**, 75,2 s. Suíte de `backend/` não executada — nenhum arquivo por ela coberto foi alterado nesta rodada documental.

### F10 — O mock não persiste chave nova fora da lista permitida

[mock sandbox](../../mocks/ui-runtime/sandbox.js) substitui `localStorage` por fachada em memória cuja persistência filtra `personal_alunos`, `personal_aulas`, `personal_reposicoes`, `personal_cache_pendencias` e outras chaves listadas. Uma chave nova (por exemplo, estado local de comunicados) **funciona em memória mas não persiste** entre recarregamentos persistentes do mock sem entrar nessa lista. Registrado aqui porque afeta a demonstração de "cópia local por conta"; o desenho é de T02.

### F11 — Existem ganchos de sessão e visibilidade, mas não de "abertura"

- [bootstrap.js](../../assets/js/app-shell/bootstrap.js) já escuta `googleIdentity.addAuthChangeListener`, o que dá o ponto para fechar apresentação e recarregar estado na troca de conta.
- O mesmo arquivo já trata `document.addEventListener('visibilitychange', …)` com limiar de tempo oculto para refresh de dados.
- Não há registro de "esta é a primeira carga desta sessão de navegação"; "abertura" hoje equivale, na prática, a um carregamento de página.

### F12 — O ambiente local não reproduz a revalidação de produção

[servir-local.js](../../scripts/servir-local.js) entrega tudo com `Cache-Control: no-store`, sem `ETag` nem `Content-Length`. O mock simula offline apenas no nível de `/api` e Google; demais requisições vão ao `fetch` nativo. Portanto teste local não mede o comportamento de cache HTTP de produção nem substitui validação em aparelho real.

## 2. Experimentos controlados

### E1 — Medição do conjunto executado no mock

- Ambiente: `node scripts/servir-local.js`, página `http://127.0.0.2:5500/index.html?mockScenario=default`, navegador integrado.
- Resultado: 42 entradas de `initiatorType: 'script'` — **41 scripts locais** com `decodedBodySize` **igual ao tamanho em disco** de cada arquivo (amostra: `logger.js` 4096, `sandbox.js` 5331, `api-config.js` 1739, `state.js` 999, `contexto-dados.js` 13931, `utils-ui.js` 4908, `storage.js` 69473, `utils-datetime.js` 7993) e uma entrada `client`, injetada pela extensão do ambiente do navegador. O script externo do Google não produziu entrada neste ambiente.

### E2 — Conjunto misto, com `resource timing`

- Ambiente: cópia descartável do repositório fora da árvore versionada (removida ao fim), servida em `127.0.0.2:5501`; mesmo worker do app.
- Procedimento: com o worker controlando a página, gravei no cache `josy-personal` um corpo adulterado para `assets/js/utils-formatters.js` (337 → 355 bytes), coloquei o navegador offline e recarreguei.
- Resultado: a página abriu com o mesmo conjunto de scripts; o recurso adulterado veio do cache e `decodedBodySize` registrou **355**, enquanto os demais mantiveram seus tamanhos. O estado "arquivo antigo no meio de arquivos atuais" é observável por medição.

### E3 — `fetch(no-store)` entrega corpo antigo

- No mesmo estado de E2, `fetch('/assets/js/utils-formatters.js', { cache: 'no-store' })` devolveu **200** com o corpo adulterado (marca `corpo-antigo` presente).
- Confirma F04: a página não tem como, por `fetch`, distinguir "publicado agora" de "cacheado que o worker devolveu".

**Síntese**: é possível **detectar** mistura medindo o corpo executado (B, abaixo); não é possível **provar** identidade com as APIs atuais sem que o próprio recurso se identifique (A).

## 3. B1 — Alternativas de prova de identidade executada

| Alternativa | Como prova | Discrimina edição de mesmo tamanho | Sobrevive a cache/offline | Toca código de produto | Veredito |
|---|---|---|---|---|---|
| **A — marcador auto-declarado por arquivo** (`{ recurso, versao, hash }` lido do próprio módulo executado) | O recurso executado publica a própria identidade; teste em Node recalcula a hash do conteúdo (com o literal do marcador substituído por placeholder) e falha se divergir | Sim | Sim — a identidade vem do corpo executado | Sim: uma linha por arquivo citado em comunicado, mais script de regeneração e teste | **Única alternativa que produz prova**; exige autorização e, se o comunicado citar módulo compartilhado, toca área sensível |
| **A′ — manifesto de versões gerado e verificado por teste** (mapa `recurso → [versão, tamanho]`, sem editar cada módulo) | Script gera o manifesto; teste confere contra os arquivos em disco; navegador compara `decodedBodySize` | Não | Parcial | Só artefato gerado + teste | Evita editar módulos sensíveis, mas continua sendo comparação por tamanho e não ordena versões sem ambiguidade |
| **B — aferição por `decodedBodySize`** de cada recurso citado | Medida do corpo executado, sem tocar arquivos | Não | Sim | Não | Detecta mistura na prática; **não é prova** |
| **C — baixar o arquivo e comparar hash com o publicado** | `fetch` | Sim, para o publicado | Não (F04) | Não | Não prova o executado; serve no máximo para aferir o publicado |
| **D — token central de release** (um arquivo/JSON com contador) | Comparação de um valor único | — | Sim | Sim, um arquivo e bump manual | Não detecta mistura entre recursos, como já registrado em A02 do diagnóstico anterior |
| **E — hash no nome do arquivo ou SRI** | Integridade declarada no HTML | Sim | Sim | Sim, e exige build | Proibido pela convenção do repositório (sem build step) |

**Requisito adicional que restringe A**: o histórico manual precisa exibir comunicado antigo em cliente mais novo, o que exige relação de ordem (`versão executada >= versão exigida`). Hash de conteúdo não ordena. Por isso o marcador precisa carregar **contador monotônico por arquivo** além da hash de integridade: a hash impede que o contador fique defasado em relação ao conteúdo, o contador fornece a ordem, e o teste é o que fecha a deriva.

Limite declarado de A: o contador é mantido à mão. O teste detecta conteúdo alterado sem hash atualizada, não detecta conteúdo alterado **com** hash atualizada e contador não incrementado. O efeito do esquecimento é conservador — o comunicado correspondente não aparece —, não é exibição indevida.

## 4. B2 — Como o cliente antigo obtém código compatível

1. **Sem recarga autorizada, ele não obtém durante a sessão.** O código executado não muda sem novo carregamento; a entrega de recursos novos depende do worker (rede primeiro) ou da próxima navegação.
2. **A próxima abertura é o caminho real.** Como produção envia `max-age=0, must-revalidate` em todos os recursos (F02), cada abertura revalida tudo e recebe os corpos novos quando o `ETag` muda. "Abertura" já é, por decisão do dono, o único gatilho de apresentação automática — os dois conceitos coincidem.
3. **Consequência de produto**: o comunicado aparece na **primeira abertura em que o cliente já executa o recurso provado**. Ele não aparece retroativamente em aba antiga. Isso satisfaz o invariante "não exibir sem prova", ao custo de atraso de uma abertura.
4. **Primeiro deploy do mecanismo**: clientes cujo código ainda não tem marcador não provam nada e não veem comunicado. Não há caminho que os atualize sem recarga; qualquer exigência de "aparecer já na primeira publicação" depende de mecanismo de atualização/recarga, que é decisão separada e hoje está fora de escopo.
5. **Offline**: catálogo e identidades locais permitem prova enquanto o conjunto executado bater. Se o conjunto for misto (E2), a prova falha e o comunicado fica oculto — comportamento conservador e coerente com a decisão de 2026-11-03.
6. **Rollback**: publicar código anterior devolve contadores menores; comunicados que exigem versão maior deixam de ser exibidos. É o sentido seguro da falha, mas implica que comunicado já visto pode desaparecer do histórico durante o rollback — efeito a registrar na spec.

## 5. B3 — Origem, manutenção e validade da lista de recursos

- **Quem declara**: o catálogo de comunicados versionado no repositório, revisado pelo dono no PR. Cada comunicado declara os recursos exigidos e a versão mínima. O rascunho automático por PR (T03) pode *sugerir* a lista a partir do diff; a autoridade é o catálogo revisado, nunca o rascunho.
- **Verificação de deriva**: teste em `tests-frontend/` falha se um comunicado citar recurso inexistente, sem marcador, ou com marcador divergente do conteúdo. É o mesmo padrão já usado para ler `sw.js` como texto em `tipografia-poppins.test.js`. Prova por mutação obrigatória, conforme regra do repositório.
- **Validade editorial**: o vínculo é `(recurso, versão mínima)`, sem expiração por data. Revogar um comunicado é removê-lo/desativá-lo no catálogo; ele deixa de aparecer mesmo em cliente compatível. Reescrita de texto gera nova revisão do comunicado — o vínculo do "visto" a id + revisão pertence a B8.
- **Correções de backend**: identidade de frontend **não prova** comportamento de backend. Alternativas:
  1. não comunicar correções puramente de backend (reduz escopo e evita prova impossível);
  2. exigir sinal de release na API — [healthRoutes.js](../../backend/src/routes/healthRoutes.js) hoje devolve texto fixo em `/`, e caberia um identificador monotônico; requer alteração de backend, deploy P1 antes de P2 e prova **somente online** (offline não comprova);
  3. aceitar que um recurso de frontend publicado junto com o backend sirva de indício — é heurística, colide com o invariante de prova.

## 6. B7 — Matriz de comportamento proposta

| Situação | Comportamento | Origem |
|---|---|---|
| Um ou mais comunicados sem prova | Não exibir o item; se nada sobrar, não abrir o modal e não listar no histórico | decisão de 2026-11-03 |
| Prova para parte dos itens | Abrir só os provados, na ordem definida; ao fechar, marcar **apenas** os exibidos | decisão de 2026-11-03 |
| Catálogo ausente, inválido ou incompleto | Não abrir automaticamente; histórico sem itens; nada é marcado | invariante "não exibir sem prova" |
| Offline com catálogo e prova locais | Abrir apenas o que estiver comprovável na cópia local | decisão de 2026-11-03 |
| Offline sem prova local | Não abrir; aguardar | idem |
| Retorno a aba (`visibilitychange`) ou restauração (`pageshow` com `persisted`) | Não é abertura; não abrir automaticamente | decisão de 2026-11-03 |
| Sem sessão | Aguardar login; fechamento anônimo não é associado a conta | idem |
| Troca de conta | Fechar a apresentação anterior e recarregar o estado da nova | idem |
| Conjunto executado misto (E2) | Tratar como prova ausente | invariante |

## 7. Inventário de classes de recurso

| Classe | Exemplos nesta base | Prova possível hoje |
|---|---|---|
| Módulo JS local de tela/modal | `view-financas.js`, `settings-modal.js`, `dialog-controller.js` | A (marcador) ou B (tamanho) |
| Módulo compartilhado consumido pelo frontend | `recurrence-helpers.js`, `calculo-ciclo.js`, `reposicao-flow-helpers.js` | A (marcador) — **área sensível, exige confirmação** |
| App shell / entrada | `bootstrap.js`, `router.js`, `service-worker.js`, `app.js` | A ou B |
| Markup | `index.html` | A (marcador no próprio HTML, verificado por teste) |
| Estilo | `style.css`, `all.min.css` | Nenhuma exata (F07); B mede tamanho |
| Worker | `sw.js` | Verificável por teste estático, não pelo documento |
| Externo | `accounts.google.com/gsi/client` | Fora do controle do app; não pode ser provado |
| Recursos não executáveis | fontes, ícones, `manifest.json` | Irrelevantes para prova de comportamento |

## 8. O que não foi medido

- Comportamento em aparelho real; instalação e atualização de worker em navegador real, incluindo a transição de cliente antigo para novo e o reload em `controllerchange`.
- Restauração por `bfcache` (`pageshow` com `persisted`) — a regra acima é decisão, não medição.
- Cache HTTP com `ETag` em navegador real: o ambiente local serve `no-store` (F12), e produção não foi carregada em navegador nesta rodada.
- Comportamento de cache de borda da Vercel (`X-Vercel-Cache` apareceu como `MISS` nas medições), tempo real de propagação e cabeçalhos por tipo de resposta.
- Suíte de `backend/` e validação visual (nenhuma alteração de UI nesta rodada).

## 9. Perguntas para o dono

Nenhuma delas está respondida por este documento. Todas bloqueiam pelo menos parte de T04–T07. (Respostas do dono em 2026-11-03: seção 11.)

| # | Pergunta | Impacto |
|---|---|---|
| P1 | Autoriza o marcador auto-declarado (alternativa A)? Se sim, comunicados podem exigir módulos de `backend/shared/` — área sensível que exige confirmação específica — ou o escopo fica restrito a arquivos não sensíveis? | Define se a garantia de prova é atingível e o tamanho do escopo |
| P2 | Aceita que o comunicado apareça somente na primeira abertura em que o cliente já executa o código provado, sem qualquer recarga automática? | Fecha B2 sem reabrir a frente cancelada |
| P3 | Correções puramente de backend: não comunicar, ou adotar sinal de release na API (deploy P1 e prova só online)? | Define se B3 tem solução ou exclusão |
| P4 | Markup e CSS: exigir prova (marcador no HTML e mecanismo separado para CSS, que hoje não existe) ou restringir comunicados a recursos JS provados? | Define o inventário mínimo por comunicado |
| P5 | Aceita contador monotônico por arquivo mantido no próprio arquivo, verificado por teste e regenerado por script local, em vez de hash puro? | Viabiliza histórico (`>=`) sem build step |
| P6 | Sem nenhum item provado, a entrada **Novidades** na Área do usuário fica oculta ou visível com estado vazio? | Comportamento de UI não coberto pela decisão de 2026-11-03 |

## 10. Critério de saída

A garantia exigida pelo plano **é demonstrável** — mas somente com a alternativa A, que implica alterar arquivos de produto e manter contadores verificados por teste. As alternativas sem alteração de código (B, C, D) não produzem prova. Sem decisão sobre P1–P6, T04 não pode aprovar contrato nem T05–T07 podem implementar. Este documento não autoriza implementação, automação, publicação ou alteração de worker.

## 11. Decisões posteriores — 2026-11-03

As perguntas da seção 9 foram respondidas pelo dono depois da redação deste diagnóstico. O registro durável e as consequências estão na seção 2 do [plano da frente](../plans/2026-11-03-plan-comunicados-novidades.md); os itens abaixo apenas fecham o que este documento deixou aberto, sem reescrever as conclusões anteriores.

| # | Decisão |
|---|---|
| P1/P5 | Alternativa A completa: marcador auto-declarado por recurso citado, com contador monotônico e hash verificada por teste; inclui autorizar marcador em `backend/shared/`, com confirmação específica no PR (T06). |
| P2 | Comunicado aparece na primeira abertura em que o cliente já executa o código provado; nenhuma recarga automática nesta frente. |
| P3 | Correção puramente de backend **não** vira comunicado; sinal de release na API descartado nesta rodada. |
| P4 | Conjunto comprovável: **JS + HTML**. CSS fica fora do conjunto comprovável (F07). |
| P6 | Entrada **Novidades** permanece visível com estado vazio; o modal automático não abre. |

Efeitos colaterais aceitos e registrados no plano: atraso de uma abertura, rollback pode ocultar comunicado já visto (ordem por `>=`) e comunicado dependente só de CSS ou só de backend não é publicável.
