# Diagnóstico — Sinalização de atualizações do aplicativo

> **Status**: Concluído no recorte estático · **Criado/Atualizado**: 2026-11-03
> **Pergunta**: como o app pode perceber que existe uma versão mais nova publicada e sinalizar isso ao usuário — sem recarregar no meio de uma edição e sem depender de notificação externa?
> **Base**: `1ff3ca374443c6292c3518c1095054382ab8ce93` (`main`, merge do PR #79) · **Branch**: `feat/atualizacao-app`, criada de `origin/main` com `--no-track`; working tree com apenas `.vscode/` não rastreado.
> **Método**: leitura dirigida de código e documentação, contagens por busca no workspace e execução da suíte `tests-frontend/`. Sem deploy, sem teste em navegador, sem chamada a produção e sem alteração de produto.
> **Limite**: concluído significa investigação registrada. Não comprova comportamento em navegador real, não mede cabeçalhos de cache da Vercel e não aprova implementação. A intervenção está no [plano da frente](../plans/2026-11-03-plan-atualizacao-app.md).

## 1. Escopo e fontes

O pedido do dono foi desenhar uma forma de o app sinalizar atualizações — tecnicamente e visualmente — antes de qualquer alteração. Este documento registra a evidência que sustenta esse desenho.

Fontes locais examinadas:

- [sw.js](../../sw.js), [service-worker.js](../../assets/js/app-shell/service-worker.js) e [bootstrap.js](../../assets/js/app-shell/bootstrap.js) — registro do service worker e cache.
- [index.html](../../index.html) — ordem de scripts, header, aviso de carga inicial, recuperação de dados, modais e área do usuário.
- [style.css](../../assets/css/style.css) — header fixo, `.topo-tela`, aviso de carga, toast e tokens de cor.
- [utils-ui.js](../../assets/js/utils-ui.js) — componente único de feedback (toast).
- [storage.js](../../assets/js/storage.js) — ponto único de chamada HTTP (`apiFetchBackend`).
- [manifest.json](../../manifest.json) e [servir-local.js](../../scripts/servir-local.js).
- [tipografia-poppins.test.js](../../tests-frontend/tipografia-poppins.test.js) — padrão de teste que lê `sw.js`.
- [Instruções permanentes](../../.github/copilot-instructions.md) (públicação sem staging, duas suítes, viewport de referência), [índice documental](../README.md), [roadmap](../roadmap-v3.md) e [spec de interface](../specs/interface-e-navegacao.md).

Não examinado: configuração efetiva dos projetos na Vercel, cabeçalhos HTTP de produção, comportamento do service worker em aparelho real e o app instalado no smartphone do dono.

## 2. Fatos observados

### F01 — Não existe identidade de versão do frontend

- As 42 tags `<script>` de `index.html` não usam query string de versão (0 ocorrências de `src="…?`).
- Não há `vercel.json` na raiz; o único é `backend/vercel.json`, e ele roteia tudo para `server.js`.
- `manifest.json` traz campos de PWA (nome, ícones, cores), mas nenhum identificador que a página possa ler.
- O backend responde texto fixo em `/` (`healthRoutes.js`), sem versão, commit ou data.

Consequência: nada no app permite responder "a versão que estou executando é a publicada?".

### F02 — O service worker atual é network-first e cacheia qualquer GET same-origin fora de `/api`

- `install` abre o cache `josy-personal` e faz `addAll` de 7 arquivos (HTML, CSS, `app.js` e 4 faces da Poppins); em seguida chama `skipWaiting()`.
- `activate` apaga caches com outro nome e chama `clients.claim()`.
- `fetch` só intercepta `GET` same-origin fora de `/api/`: busca a rede, grava no cache quando a resposta é `ok` e `type === 'basic'`, cai para o cache em falha, devolve `index.html` para navegação/HTML e 504 quando não há nada.

Consequências:

1. Com internet, um recarregamento já entrega o código novo. O problema real é a **sessão aberta** que nunca recarrega.
2. Um arquivo de versão na raiz seria cacheado por essa mesma regra e poderia ser devolvido do cache offline — gerando leitura desatualizada. Precisa ser excluído explicitamente.

### F03 — O registro do service worker recarrega a página em `controllerchange`

`service-worker.js` adiciona o listener **antes** de registrar `/sw.js`, chama `registration.update()` e recarrega em `controllerchange`, protegido apenas por um booleano local (`hasReloadedForServiceWorkerUpdate`). Não há verificação de "já existia controller antes deste registro".

Consequência (inferência, não observada em navegador): como `sw.js` usa `skipWaiting()` + `clients.claim()`, a primeira instalação pode disparar `controllerchange` e recarregar a página sem que o usuário tenha pedido.

### F04 — Nenhuma superfície expõe versão ou verificação

A área do usuário (`#tituloAppSettings`) tem três seções: Perfil da conta, Google Agenda e Dados. Não há "Sobre", versão instalada nem ação de verificar atualização.

### F05 — Os componentes de feedback existentes não servem como aviso persistente

- `#toast` é **um único elemento** com quatro estados e auto-ocultação: 3 s (sucesso), 4 s (aviso), 5 s (erro) e 8 s (erro com retry). Qualquer chamada sobrescreve a anterior.
- `#headerCacheState` é um `role="status"` sobre a carga inicial de dados ("Carregando dados...").
- `#recuperacaoDados` é um bloco persistente para alteração otimista não confirmada, com `hidden` quando não se aplica.

Consequência: um aviso de atualização com ação precisa de superfície própria; reaproveitar o toast o tornaria efêmero e sujeito a sobrescrita por qualquer sincronização.

### F06 — Header e topos das telas são fixos por uma variável de altura medida em runtime

- `.header` é `position: sticky; top: 0; z-index: 100`.
- `.topo-tela` é `position: sticky; top: var(--header-height); z-index: 10`.
- `--header-height` tem padrão 65 px e é publicado pelo bootstrap a partir da medição real.
- `.aviso-carregamento-dados` fica **no fluxo**, imediatamente após `</header>`, com margem de 6–12 px.
- O toast aparece em `bottom: calc(var(--bottombar-height) + 82px)` com `z-index: 2000`.

Consequência: uma faixa em fluxo abaixo do header não exige recalcular `--header-height` nem disputa a âncora do `.topo-tela`. Uma faixa sticky precisaria das duas coisas. Uma pílula flutuante disputaria a faixa do toast e do FAB.

### F07 — Toda chamada ao backend passa por um ponto único

`apiFetchBackend` é exportado como `window.apiFetchBackend` e usado em 21 pontos de 7 arquivos, com `GET`, `POST`, `PUT`, `PATCH` e `DELETE`. É o lugar natural para contar escritas em andamento.

### F08 — Não há integração contínua

`.github/` contém apenas `copilot-instructions.md` e `agents/arquiteto-software.agent.md`. Nenhum workflow. As suítes rodam localmente por `node --test` (`npm test` em `backend/` e em `tests-frontend/`).

### F09 — Baseline da suíte de frontend medida nesta rodada

`node --test` em `tests-frontend/` na branch `feat/atualizacao-app`: **517 testes, 517 passando, 0 falhas**, 61,6 s. A suíte de `backend/` não foi executada nesta rodada documental, porque nenhum arquivo por ela coberto foi alterado.

### F10 — Já existe teste que lê `sw.js` como texto

`tipografia-poppins.test.js` abre `sw.js` e valida a lista de pré-cache. É o padrão reutilizável para proteger o caminho do arquivo de versão.

### F11 — O servidor local entrega qualquer arquivo da raiz com `no-store`

`servir-local.js` serve a raiz do repositório com `Cache-Control: no-store`, incluindo arquivos novos. Isso permite simular "versão publicada" no mock sem deploy.

### F12 — Não há ambiente intermediário (documentado, não verificado aqui)

As instruções permanentes registram dois projetos Vercel ligados ao repositório, sem branch de preview: qualquer merge na `main` publica produção nos dois. Este diagnóstico não acessou o painel da Vercel.

### F13 — A guarda de ociosidade tem alvos concretos

`index.html` contém **13** contêineres `.modal-overlay` com `role="dialog"`, além do bloco `#recuperacaoDados` com `hidden`. Ambos são verificáveis por DOM.

### F14 — A proposta não exige dependência nova

Tudo cabe em `fetch`, `sessionStorage`, CSS existente e o Font Awesome já carregado.

## 3. Reprodução e verificação possível

- **Pré-condições**: app aberto em aba ou PWA instalado, sessão já carregada e um deploy novo publicado.
- **Passos que reproduzem a lacuna**: publicar qualquer alteração de frontend na `main`; manter a aba aberta; observar que nada no app informa sobre a nova versão.
- **Resultado observado**: ausência total de sinal. O código novo só entra em cena no próximo recarregamento, que o usuário precisa provocar sem saber que existe versão nova.
- **Resultado esperado**: sinal perceptível, com aplicação automática quando seguro.
- **O que não foi medido**: se o `controllerchange` da primeira instalação realmente recarrega a página em navegador real; cabeçalhos de cache de produção; tempo real entre deploy e propagação.

## 4. Cadeia causal

Deploy publica arquivos novos → o service worker é network-first, então um recarregamento já pegaria o código novo → porém **a sessão aberta não recarrega sozinha** e **nada no app compara versões** → o usuário permanece em código antigo indefinidamente.

Ponto exato da divergência: **falta de identificador de versão** (F01) combinada com **falta de gatilho de verificação e de superfície de aviso** (F04, F05). O service worker não é a causa; é apenas o mecanismo que já resolve o próximo carregamento.

## 5. Relação com contratos e specs

- **Definido**: publicação sem staging e deploy automático na `main`; duas suítes independentes; viewport de referência 433×762 com DPR 2,81; hierarquia de topos e uso de dourado como identidade, não como estado ([spec de interface](../specs/interface-e-navegacao.md), seção 5); toast como canal único de feedback assíncrono.
- **Omisso**: não existe contrato sobre frescor de versão do frontend, aviso de atualização, verificação manual, nem sobre recarregar durante edição.
- **Contradições**: nenhuma encontrada. O item 4.2 do roadmap (notificações automáticas) trata de lembrete com app fechado e é outra feature; a infraestrutura PWA existente não é uma integração de notificações entregue.

## 6. Evidências classificadas

| Classificação | Conteúdo |
|---|---|
| Fato observado | F01, F02, F04, F05, F06, F07, F08, F10, F11, F13 e as contagens; F09 medido em 2026-11-03 |
| Inferência | O reload em `controllerchange` na primeira instalação (F03); que um arquivo de versão na raiz seria cacheado pelo SW (F02); que a faixa em fluxo não afeta `--header-height` (F06) |
| Hipótese (a confirmar) | Sessões longas em PWA standalone são o caso real de maior risco de código antigo; cabeçalhos da Vercel não impediriam a leitura do arquivo de versão |
| Decisão já documentada | Deploy automático na `main` sem staging; suítes por `node --test`; viewport de referência; toast único |
| Decisão tomada pelo dono em 2026-11-03 | Escopo (aviso + verificação manual), fonte (`version.json` versionado), comportamento (reload automático em versão nova), guarda (só quando ocioso) e posição (faixa abaixo do header, no fluxo). Registradas no plano |

## 7. Impacto e severidade

| Dimensão | Avaliação |
|---|---|
| Usuário | Médio — sessão longa em código antigo; correções e melhorias não chegam sem recarregar |
| Dados | Baixo pela proposta atual — a guarda impede recarregar com escrita em andamento ou alteração não confirmada |
| Segurança | Baixo — o identificador de versão é público e não passa por `requireAuth`; não deve ser filtrado por `ownerEmail` |
| Operação | Médio — o `sw.js` só é exercitado após deploy; sem staging, a validação é manual em produção |
| Reversibilidade | Parcial — `git revert` do código não desfaz um service worker já instalado em clientes; é preciso publicar outro `sw.js` |

## 8. Opções

### Opção A — `version.json` versionado na raiz (escolhida)

Arquivo com token de build, versão legível e data, atualizado no PR de release. Leitura com `no-store`, exclusão explícita do cache do SW. Benefício: zero infra, zero build, funciona no mock. Risco: disciplina manual — esquecer o bump só suprime o aviso, não quebra. Teste: unitário da leitura/comparação e teste estático de que o caminho não entra no cache do SW.

### Opção B — Função serverless `/api/versao` no projeto do frontend

Devolveria `VERCEL_GIT_COMMIT_SHA` com `no-store`. Benefício: automático e amarrado ao deploy do frontend. Risco: adiciona runtime a um projeto hoje estático e exige validar deploy sem staging. Fica como evolução, trocando só a constante de URL.

### Opção C — Gerar `version.json` no build da Vercel

Exige `vercel.json` na raiz e build command. Benefício: automático. Risco: introduz build step proibido pela convenção do repositório.

### Opção D — Endpoint `/api/versao` no backend

Benefício: automático, sem tocar o frontend. Risco: mede o deploy da API, não o do frontend; os dois projetos sobem separados, abrindo janela de corrida.

### Opção E — `ETag`/`Last-Modified` de um arquivo existente

Benefício: nenhum artefato novo. Risco: só muda quando aquele arquivo muda; deploy que altera apenas um `view-*.js` não seria detectado.

## 9. Recomendação

Opção **A**, com a leitura isolada atrás de uma única constante para permitir migrar para B sem tocar em UI nem em testes. Evitar D como sinal principal por causa da corrida entre os dois deploys.

## 10. Perguntas pendentes

| # | Pergunta | Bloqueante? | Dono da decisão |
|---|---|---|---|
| 1 | Cadência e gatilhos de verificação (intervalo mínimo, `visibilitychange`, `online`) | não | dono; padrão proposto no plano |
| 2 | Quem atualiza o token do `version.json` e em qual momento do PR | não | dono; regra operacional a fixar na spec |
| 3 | Entrada no roadmap como item próprio | não para implementar; sim para encerrar a frente | dono |
| 4 | Texto final dos rótulos da faixa | não | dono |

## 11. Achados fora do escopo

Registrados, **não corrigidos**.

| Achado | Destino sugerido |
|---|---|
| Reload em `controllerchange` pode ocorrer na primeira instalação do service worker (F03) | corrigido dentro desta frente, no cartão de unificação do service worker |
| Notificação com app fechado (push/WhatsApp) | roadmap 4.2; depende de mecanismo de agendamento no backend |
| Falta de integração contínua (F08) | roadmap/infra; não é pré-requisito desta frente |
| Cabeçalhos de cache da Vercel não verificados | conferência pós-deploy, registrada no plano |
| `.vscode/` não rastreado no workspace | decisão do dono sobre versionar ou ignorar; não pertence a esta frente |

## 12. Critério para abrir o plano

Decisões de escopo, fonte da versão, comportamento e posição do aviso **fechadas pelo dono em 2026-11-03**; leitura do código suficiente para listar arquivos e guardas; baseline da suíte medido. Critério atendido — a intervenção segue no [plano da frente](../plans/2026-11-03-plan-atualizacao-app.md).
