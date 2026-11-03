# Plano — Sinalização de atualizações do app

> **Status**: `Aguardando decisão` — levantamento e cartões registrados; T00 concluído; nenhum arquivo de código alterado; implementação de T01 em diante depende de autorização do dono
> **Abertura**: 2026-11-03
> **Atualizado**: 2026-11-03
> **Responsável**: Luccas (dono) + agente
> **Branch**: `feat/atualizacao-app`, criada de `origin/main` com `git switch -c … --no-track` (sem upstream)
> **Diagnóstico de origem**: [2026-11-03-diag-atualizacao-app.md](../diagnostics/2026-11-03-diag-atualizacao-app.md)
> **Válido contra**: `1ff3ca374443c6292c3518c1095054382ab8ce93`

> **Este arquivo é vivo.** Enquanto a frente estiver aberta, ele recebe decisões, execução, medições e desvios. Não crie um relatório separado para "o depois". Depois de fechado, **não é reescrito**: trabalho posterior gera documento novo.

---

## 1. Objetivo

Fazer o app perceber que existe uma versão mais nova publicada e recarregar sozinho quando for seguro, sinalizando o momento ao usuário. Resultado observável: com uma sessão aberta e um deploy novo na `main`, a faixa abaixo do header anuncia a atualização, o app recarrega quando não há trabalho em andamento e um toast único confirma; com modal, escrita ou alteração não confirmada, o recarregamento espera.

## 2. Critérios de aceite

- [ ] **Funcional**: `version.json` publicado identifica a versão; uma diferença de token dispara o fluxo; token igual não dispara nada.
- [ ] **Funcional**: o recarregamento acontece sem interação do usuário quando o app está ocioso, e fica pendente — sem ser descartado — quando não está.
- [ ] **Segurança / dados**: nenhuma recarga com `.modal-overlay` visível, escrita em andamento (`apiFetchBackend` não-`GET`) ou `#recuperacaoDados` visível; nenhum laço de recarregamento; leitura de versão não passa por `requireAuth` nem por filtro `ownerEmail`.
- [ ] **Regressão**: `tests-frontend/` continua com 517 testes passando mais os novos; a lista de pré-cache do `sw.js` permanece a aprovada; `backend/` não é afetado.
- [ ] **Interface / UX**: faixa acessível (`role="status"`, `aria-live="polite"`), oculta sem reservar espaço, com alvos de 44 px e contraste AA; estados visíveis em 433×762 (DPR 2,81), 390×844 e 320×568.
- [ ] **Operação**: primeira instalação do service worker não recarrega a página; troca de `sw.js` passa pelo mesmo fluxo seguro.
- [ ] **Documental**: contrato durável registrado em spec; entrada correspondente no roadmap, quando o dono decidir o ID.

## 3. Decisões fechadas

| Decisão | Data | Responsável | Consequência técnica |
|---|---|---|---|
| Escopo da entrega: aviso de nova versão **e** verificação manual em "Sobre o app" | 2026-11-03 | Luccas | Duas superfícies: faixa abaixo do header e seção nova na área do usuário |
| Fonte da versão: `version.json` versionado na raiz | 2026-11-03 | Luccas | Nenhuma função serverless, nenhum build step; leitura isolada para migrar depois para `/api/versao` |
| Comportamento: recarregar automaticamente em qualquer versão nova detectada | 2026-11-03 | Luccas | Não existe botão "Agora não"; a faixa é informativa e o reload é do sistema |
| Guarda: recarregar só quando ocioso (sem modal aberto, sem escrita em andamento, sem alteração não confirmada) | 2026-11-03 | Luccas | Guarda bloqueante em T03; o aviso permanece enquanto a condição não libera |
| Posição: faixa compacta abaixo do header, no fluxo normal | 2026-11-03 | Luccas | Não é sticky; não recalcula `--header-height` nem disputa a âncora do `.topo-tela` |
| Arquiteto não implementa; documentação antes de código | 2026-11-03 | Luccas | T00 entrega diagnóstico e plano; T01+ aguardam autorização |
| Sem dependência nova e sem build step | 2026-11-03 | Convenção do repositório | Somente `fetch`, `sessionStorage`, CSS e Font Awesome já presentes |

## 4. Decisões pendentes

| # | Pergunta | Opções | Bloqueante? |
|---|---|---|---|
| 1 | Cadência e gatilhos de verificação | (a) `visibilitychange` com intervalo mínimo de 10–30 min + `online` + intervalo de 30–60 min com a aba visível; (b) só `visibilitychange`; (c) intervalo fixo | não — T02 adota (a) e o dono pode ajustar |
| 2 | Aplicar atualização quando o app está em segundo plano? | (a) não aplicar oculto; aplicar ao voltar; (b) aplicar mesmo oculto | sim para T05 |
| 3 | Entrada no roadmap | (a) novo item na seção "Backlog operacional" (ID 1.8, primeiro livre); (b) sem item, apenas o plano | não para implementar; sim para encerrar T09 |
| 4 | Texto final dos rótulos | (a) textos propostos neste plano; (b) dono define | não |
| 5 | Regra de bump do token | (a) todo PR que altera assets do frontend; (b) somente quando o dono quiser avisar | não — fixar em T09 |

## 5. Escopo

- **Arquivos/componentes prováveis**:
  - `version.json` (novo, raiz)
  - `assets/js/app-shell/atualizacao-app.js` (novo)
  - `assets/js/app-shell/service-worker.js` e `sw.js`
  - `assets/js/app-shell/bootstrap.js`
  - `assets/js/storage.js` (contador de escritas)
  - `index.html` e `assets/css/style.css`
  - `settings-modal.js` e a marcação da área do usuário
  - `mocks/ui-runtime/` e `tests-frontend/`
  - `docs/specs/`, `docs/roadmap-v3.md` e `docs/README.md`
- **Comportamentos que podem mudar**: registro do service worker deixa de recarregar direto em `controllerchange`; primeira instalação deixa de recarregar; área do usuário ganha uma quarta seção.

## 6. Fora de escopo

- Notificação push, WhatsApp ou qualquer aviso com o app fechado (roadmap 4.2).
- Changelog/"o que há de novo" na faixa ou após atualizar.
- Botão "Agora não" ou adiamento manual (contraria a decisão de reload automático).
- Alterar a estratégia de cache do service worker além de excluir o arquivo de versão.
- Build step, `vercel.json` na raiz, função serverless nesta rodada.
- Integração contínua.
- Qualquer alteração em cálculo financeiro, recorrência, conflitos de agenda, autenticação ou sincronização com Google Calendar.
- Tratar `.vscode/` no repositório.

## 7. Invariantes a preservar

- **Isolamento por `ownerEmail`**: a versão é dado público; nenhuma query nova e nenhum filtro de dono.
- **Sem dependência nova e sem build step** no frontend.
- **Ordem de scripts** em `index.html`: o novo módulo precisa carregar antes de `bootstrap.js`; se ler global no topo, incluir o par em `DEPENDENCIAS_DE_CARGA` de `tests-frontend/index-html-ordem.test.js`.
- **`--header-height`** continua sendo a única fonte da âncora do `.topo-tela`.
- **Namespace do cache** `josy-personal` e a lista de pré-cache aprovada permanecem intactos.
- **Toast continua canal único** de feedback assíncrono; o aviso de versão não usa toast.
- **Dourado é identidade, não estado**: âmbar `--cor-estado-aviso` não é usado para sinalizar atualização.
- **Nenhuma recarga** com edição em andamento, modal visível, alteração não confirmada ou aba oculta (se a decisão 2 for "não aplicar oculto").
- **Sem laço de recarregamento**: após o reload, a baseline precisa refletir a nova versão; se a leitura falhar, não recarregar de novo.

## 8. Baseline

- **Branch**: `feat/atualizacao-app`, criada de `origin/main` (`1ff3ca3`), sem upstream configurado.
- **Working tree no início**: apenas `.vscode/` não rastreado; nenhum arquivo versionado modificado.
- **Suíte de frontend antes**: **517 testes, 517 passando, 0 falhas** (`node --test` em `tests-frontend/`, 61,6 s, medido em 2026-11-03).
- **Suíte de backend antes**: não executada nesta rodada documental — nenhum arquivo coberto por ela foi alterado. Medir no início de T01.
- **Reprodução do defeito**: abrir o app, manter a sessão, publicar um deploy na `main` e observar que nada informa a existência de versão nova.
- **Condição de parada**: se o baseline de frontend divergir de 517/0 no início de T01, parar e registrar antes de qualquer alteração.

## 9. Cartões de tarefas

### Etapa A — Contrato e detecção

#### Cartão T00 — Registrar a frente em diagnóstico e plano
- **Objetivo / resultado**: diagnóstico com evidência classificada e plano com cartões, decisões e baseline registrados.
- **Depende de**: nenhum.
- **Arquivos / componentes prováveis**: `docs/diagnostics/2026-11-03-diag-atualizacao-app.md`, este plano e uma linha no índice `docs/README.md`.
- **Inclui**: evidência do estado atual, opções de fonte de versão, decisões do dono, baseline medido, cartões T01–T09.
- **Não inclui**: qualquer alteração de código, configuração de deploy, spec ou roadmap.
- **Decisões pendentes / bloqueios**: nenhum.
- **Critérios de aceite**: os dois arquivos existem com cabeçalho de status; links relativos resolvem; `git status` mostra apenas arquivos de documentação além do `.vscode/` pré-existente.
- **Validação**: revisão dos links relativos; conferência de que nenhum arquivo de código foi tocado.
- **Riscos e rollback**: baixo — reverter é remover os arquivos.
- **Limite de tentativas**: 2.
- **Situação**: **concluído em 2026-11-03**.

#### Cartão T01 — Publicar a identidade de versão e blindar o cache
- **Objetivo / resultado**: `version.json` na raiz identifica a versão publicada e o service worker nunca o serve do cache.
- **Depende de**: T00.
- **Arquivos / componentes prováveis**: `version.json` (novo), `sw.js`, teste novo em `tests-frontend/`.
- **Inclui**: formato com token opaco (`token`), versão legível (`versao`) e data (`publicadoEm`); exclusão explícita do caminho no handler de `fetch` do `sw.js`, com comentário do motivo; teste que lê `sw.js` e falha se alguém remover a exclusão ou incluir o arquivo no pré-cache.
- **Não inclui**: leitura no frontend, UI, agendamento.
- **Decisões pendentes / bloqueios**: nenhum.
- **Critérios de aceite**: o servidor local devolve o JSON com `no-store`; o caminho não é gravado no cache `josy-personal`; o teste de pré-cache existente continua passando.
- **Validação**: `node --test` no arquivo novo; `Invoke-WebRequest` contra `http://127.0.0.2:5500/version.json`; suíte completa de frontend antes/depois.
- **Riscos e rollback**: se a exclusão falhar, o aviso pode ser falso ou nunca aparecer; reverter é `git revert` do `sw.js` no próximo deploy, ciente de que o cliente já instalado só troca de SW na publicação seguinte.
- **Limite de tentativas**: 2.

#### Cartão T02 — Detectar a diferença de versão sem interface
- **Objetivo / resultado**: módulo `atualizacao-app.js` com leitura, baseline e comparação, testável isoladamente.
- **Depende de**: T01.
- **Arquivos / componentes prováveis**: `assets/js/app-shell/atualizacao-app.js` (novo), `index.html` (tag do script), `bootstrap.js` (início após o primeiro render), testes.
- **Inclui**: `fetch` com `cache: 'no-store'` e timeout curto; baseline definida somente por leitura bem-sucedida; comparação por igualdade de token; throttle entre verificações; silêncio em erro, timeout e offline; API exposta (`iniciar`, `verificarAgora`, `estadoAtual`, `aoAtualizar`); gatilhos `visibilitychange` e `online`.
- **Não inclui**: reload, faixa, guarda, seção "Sobre o app".
- **Decisões pendentes / bloqueios**: cadência (decisão 1) — adotar o padrão proposto, ajustável sem retrabalho.
- **Critérios de aceite**: baseline desconhecida nunca produz "atualização disponível"; token diferente detecta; token igual silencia; erro/timeout não gera aviso nem baseline; nenhuma exceção escapa para o boot.
- **Validação**: testes de unidade com `fetch` substituído; teste de ordem de scripts se houver leitura de global no topo; suíte de frontend antes/depois.
- **Riscos e rollback**: polling excessivo ou baseline presa em valor antigo; mitigado por throttle e por redefinir a baseline a cada carregamento.
- **Limite de tentativas**: 2.

#### Cartão T03 — Bloquear a recarga quando há trabalho em andamento
- **Objetivo / resultado**: uma decisão única, explícita e testável sobre "posso recarregar agora?".
- **Depende de**: T02.
- **Arquivos / componentes prováveis**: `assets/js/storage.js`, `assets/js/app-shell/atualizacao-app.js`, testes.
- **Inclui**: contador de escritas em `apiFetchBackend` para métodos diferentes de `GET`, incrementado antes e decrementado em `finally`; detecção de modal visível entre os 13 `.modal-overlay` com `role="dialog"`; verificação de `#recuperacaoDados` visível; verificação de `document.visibilityState`; função pura testável.
- **Não inclui**: recarregar, exibir faixa.
- **Decisões pendentes / bloqueios**: decisão 2 (aplicar ou não com app oculto) define se a visibilidade entra na guarda.
- **Critérios de aceite**: com modal visível, escrita em andamento ou recuperação visível, a resposta é "não" e o estado é reavaliado quando a condição terminar; com tudo livre, "sim"; nenhum contador fica preso após erro HTTP.
- **Validação**: testes jsdom cobrindo cada condição isolada e combinada; teste de vazamento do contador após exceção.
- **Riscos e rollback**: contador vazando trava a atualização indefinidamente — o teste de `finally` é obrigatório.
- **Limite de tentativas**: 2.

### Etapa B — Sinalização e aplicação

#### Cartão T04 — Sinalizar na faixa abaixo do header
- **Objetivo / resultado**: faixa visível e acessível comunicando o estado da atualização.
- **Depende de**: T02, T03.
- **Arquivos / componentes prováveis**: `index.html`, `assets/css/style.css`, `atualizacao-app.js`, testes de DOM.
- **Inclui**: marcação inserida logo após `</header>` e antes de `#headerCacheState`; oculta por padrão sem reservar espaço; `role="status"` e `aria-live="polite"`; estados "atualização disponível, aguardando ocioso" e "aplicando"; ícone de atualização; realce dourado da identidade; alvos de 44 px; empilhamento em 320 px; respeito a `prefers-reduced-motion`.
- **Não inclui**: reload, toast, seção "Sobre o app".
- **Decisões pendentes / bloqueios**: texto final (decisão 4) — usar os rótulos propostos.
- **Critérios de aceite**: oculta não ocupa espaço nem é anunciada; visível anuncia o texto uma única vez; contraste AA com texto escuro sobre o realce; não sobrepõe `#recuperacaoDados`; não colide com `.topo-tela` ao rolar.
- **Validação**: teste de DOM; conferência visual no mock em 433×762 (DPR 2,81), 390×844 e 320×568.
- **Riscos e rollback**: ruído para leitor de tela e disputa de espaço com o aviso de carga; mitigado por um único `role="status"` e posição fixa no fluxo.
- **Limite de tentativas**: 2.

#### Cartão T05 — Aplicar a atualização quando ocioso e confirmar
- **Objetivo / resultado**: recarregamento automático seguro e confirmação única depois.
- **Depende de**: T03, T04.
- **Arquivos / componentes prováveis**: `atualizacao-app.js`, `bootstrap.js`, testes.
- **Inclui**: aplicar quando a guarda liberar; tempo mínimo de exibição do estado "aplicando"; gravação de flag em `sessionStorage` imediatamente antes do reload; exibição do toast "App atualizado." uma única vez após o reload, com remoção da flag; retomada da verificação após o boot.
- **Não inclui**: service worker, seção "Sobre o app".
- **Decisões pendentes / bloqueios**: decisão 2.
- **Critérios de aceite**: reload chamado no máximo uma vez por detecção; nenhum reload com a guarda fechada; ao liberar, aplica sem nova permissão; o toast aparece uma vez e some sozinho; recarregar manualmente não repete o toast; não há laço quando a leitura falha após o reload.
- **Validação**: testes de unidade/DOM com `location.reload` substituído; verificação manual no mock com o arquivo de versão alterado.
- **Riscos e rollback**: laço de recarga é o pior caso — o critério "baseline só com leitura bem-sucedida" protege; remover a chamada de reload reverte sem tocar na UI.
- **Limite de tentativas**: 2.

#### Cartão T06 — Unificar a troca de service worker no fluxo seguro
- **Objetivo / resultado**: `controllerchange` deixa de recarregar direto e a primeira instalação não recarrega.
- **Depende de**: T05.
- **Arquivos / componentes prováveis**: `assets/js/app-shell/service-worker.js`, testes.
- **Inclui**: registrar se já havia `navigator.serviceWorker.controller` antes do `register`; sinalizar o mesmo componente em vez de recarregar; manter `registration.update()`.
- **Não inclui**: alterar a estratégia de cache do `sw.js` além de T01.
- **Decisões pendentes / bloqueios**: nenhum — área sensível, confirmar antes de implementar.
- **Critérios de aceite**: primeira visita não recarrega; troca de `sw.js` passa pela guarda e pela faixa; não existem dois caminhos de recarga.
- **Validação**: teste de unidade com `navigator.serviceWorker` simulado; verificação manual em navegador (instalação limpa e atualização forçada), declarada como obrigatória.
- **Riscos e rollback**: service worker é estado remoto por cliente; `git revert` não desfaz o SW instalado — exige publicar outro `sw.js`.
- **Limite de tentativas**: 2.

### Etapa C — Verificação manual e contrato

#### Cartão T07 — Expor versão e verificação manual em "Sobre o app"
- **Objetivo / resultado**: seção nova na área do usuário com versão instalada, última verificação e ação manual.
- **Depende de**: T02, T05.
- **Arquivos / componentes prováveis**: `index.html`, `assets/css/style.css`, `settings-modal.js` ou `atualizacao-app.js`, testes.
- **Inclui**: exibição da versão legível; data/hora da última verificação; botão "Verificar atualizações"; estados "verificando", "você está na versão mais recente", "nova versão encontrada" e "não foi possível verificar agora"; uso dos componentes já existentes de seção.
- **Não inclui**: changelog, histórico de versões.
- **Decisões pendentes / bloqueios**: nenhum.
- **Critérios de aceite**: versão correta exibida; botão desabilitado durante a verificação; erro informado sem prometer sucesso; leitor de tela recebe o estado.
- **Validação**: teste de DOM; conferência visual no mock.
- **Riscos e rollback**: acúmulo de sinais redundantes na mesma tela; manter um único estado por vez.
- **Limite de tentativas**: 2.

#### Cartão T08 — Reproduzir no mock e validar o comportamento completo
- **Objetivo / resultado**: roteiro reproduzível e registro do aceite visual e comportamental.
- **Depende de**: T04, T05, T06, T07.
- **Arquivos / componentes prováveis**: `mocks/ui-runtime/scenarios.js`, `mocks/ui-runtime/mock-runtime.js`, este plano.
- **Inclui**: override de versão no mock para simular "versão nova" sem deploy; roteiro cobrindo primeira instalação, versão igual, versão nova com app ocioso, versão nova com modal aberto, versão nova com escrita em andamento, offline e retorno à aba; validação em 433×762 (DPR 2,81) com stress em 390×844 e 320×568.
- **Não inclui**: alterar comportamento de produto para acomodar o mock.
- **Decisões pendentes / bloqueios**: nenhum.
- **Critérios de aceite**: cada item do roteiro com resultado registrado neste plano; divergências registradas como desvio, não corrigidas silenciosamente; servidor do mock permanece no ar no viewport de referência ao encerrar a rodada.
- **Validação**: execução manual registrada; suítes completas antes/depois.
- **Riscos e rollback**: mock divergir do real; validar o caminho de leitura contra o `version.json` real pelo menos uma vez.
- **Limite de tentativas**: 2.

#### Cartão T09 — Fixar o contrato durável e a síntese no roadmap
- **Objetivo / resultado**: regra permanente escrita fora do plano, com ponteiro aprovado no roadmap.
- **Depende de**: T05, T07 e decisão 3 do dono.
- **Arquivos / componentes prováveis**: `docs/specs/atualizacoes-do-app.md` (novo), `docs/roadmap-v3.md`, `docs/README.md`.
- **Inclui**: contrato de quando verificar, quando aplicar, guardas, estados e textos; casos de borda (baseline desconhecida, offline, rollback, primeira instalação, múltiplas abas); "Fora de escopo" (push, changelog, adiamento manual); regra operacional de bump do token (decisão 5); síntese no roadmap.
- **Não inclui**: reescrever a spec de interface nem duplicar o conteúdo do plano.
- **Decisões pendentes / bloqueios**: decisão 3 (ID no roadmap) e decisão 5 (regra de bump) — ambas do dono.
- **Critérios de aceite**: o comportamento aprovado é compreendido sem consultar este plano; spec sem dados de execução; roadmap com resultado e ponteiro.
- **Validação**: revisão de conteúdo e links.
- **Riscos e rollback**: spec repetindo detalhe de execução e envelhecendo; manter só contrato.
- **Limite de tentativas**: 2.

## 10. Matriz de validação

| Tipo | O que cobre | Onde | Observação |
|---|---|---|---|
| Automatizada | Leitura, baseline, comparação, throttle, guardas, reload único, toast pós-reload, `controllerchange` sem recarga na primeira instalação | `tests-frontend/` com `node --test` | `fetch`, `location.reload` e `navigator.serviceWorker` substituídos |
| Estática | Ponto único de leitura (`atualizacao-app.js`) | `tests-frontend/` | protege contra duplicação da regra |
| Estática | `version.json` fora do cache do SW e lista de pré-cache intacta | teste que lê `sw.js` | mesmo padrão de `tipografia-poppins.test.js` |
| Ordem | Novo script antes de `bootstrap.js` | `index-html-ordem.test.js` | acrescentar o par se houver leitura de global no topo |
| Manual | Primeira instalação sem recarga extra; troca de `sw.js` pela faixa | navegador, ambiente local | service worker não é testável em jsdom |
| Manual | Layout e acessibilidade da faixa e da seção "Sobre" | mock em 433×762 (DPR 2,81), 390×844, 320×568 | viewport de referência do dono |
| Manual | Offline, timeout e retorno à aba | mock | estados silenciosos |
| Negativos | Modal visível, escrita em andamento, `#recuperacaoDados` visível, aba oculta (se aplicável) | automatizado + manual | nenhum caso pode recarregar |

**Não coberto por esta validação**: comportamento real do service worker em aparelho do dono, cabeçalhos de cache da Vercel e propagação entre o deploy e o próximo carregamento.

## 11. Prova por mutação

| Mutação aplicada | Teste que deve falhar | Resultado observado | Restaurado? |
|---|---|---|---|
| Remover a exclusão do `version.json` no `sw.js` | teste estático do cache do SW | não executado | não |
| Ignorar a guarda de modal aberto | teste de `podeAplicarAgora` com modal visível | não executado | não |
| Não decrementar o contador de escritas em `finally` | teste de vazamento do contador | não executado | não |
| Definir baseline mesmo com leitura com erro | teste de erro/timeout | não executado | não |
| Chamar `location.reload` duas vezes na mesma detecção | teste de recarga única | não executado | não |
| Remover o registro da flag de `sessionStorage` | teste de toast pós-reload | não executado | não |

## 12. Registro da execução

### 2026-11-03 — T00 (documental)
- **Arquivos alterados**: `docs/diagnostics/2026-11-03-diag-atualizacao-app.md` (novo), `docs/plans/2026-11-03-plan-atualizacao-app.md` (novo) e uma linha no índice `docs/README.md`.
- **Resultado**: diagnóstico com evidência classificada e plano com cartões T01–T09; decisões de escopo, fonte, comportamento, guarda e posição registradas; nenhum código alterado.
- **Suíte antes/depois**: `tests-frontend/` 517/517 antes da escrita; depois não aplicável (nenhum arquivo coberto alterado). `backend/` não executada, mesmo motivo.
- **Desvio do plano**: nenhum.
- **Decisão adicional tomada**: branch definida pelo dono como `feat/atualizacao-app`.

## 13. Achados não alterados

| Risco/achado | Por que não foi tratado | Destino | Dono |
|---|---|---|---|
| Reload em `controllerchange` na primeira instalação | pertence a T06 e depende de autorização | este plano | dono |
| Notificação com app fechado | outra feature, outro mecanismo | roadmap 4.2 | dono |
| Ausência de integração contínua | não é pré-requisito desta frente | roadmap/infra | dono |
| Cabeçalhos de cache da Vercel não verificados | exige produção; sem staging | verificação pós-deploy | dono |
| `.vscode/` não rastreado | decisão de repositório, fora do escopo | decisão do dono | dono |

## 14. Deploy e rollback

- **Efeito externo**: novo arquivo público `version.json`; faixa e seção "Sobre o app" no frontend; `sw.js` com uma regra a mais de exclusão.
- **Ordem de publicação**: T01 a T08 dentro do PR da frente; merge na `main` publica produção nos dois projetos. Como não há staging, a verificação pós-deploy é manual e imediata.
- **Verificação pós-deploy**: abrir a versão publicada, confirmar que `version.json` responde com o token esperado e que a faixa não aparece sem deploy novo; então publicar uma alteração mínima com bump de token e confirmar faixa, recarga e toast.
- **Limite do rollback**: `git revert` do frontend devolve o código na próxima publicação, mas **não desfaz um service worker já instalado** em clientes; a correção de SW exige publicar um novo `sw.js`. Reverter o token do `version.json` faz os clientes atualizados detectarem "versão nova" e recarregarem para o código anterior — efeito esperado, não falha.

## 15. Fechamento

- **Critérios atendidos**: somente o critério documental de T00.
- **Implementação**: não iniciada — aguarda autorização do dono.
- **Validação**: baseline de frontend medido (517/517); demais itens não executados.
- **Aceite**: não emitido.
- **Publicação**: não realizada.
- **Pendências**: decisões 1 a 5 da seção 4; cartões T01–T09.
- **Riscos aceitos**: dependência de bump manual do token até eventual migração para `/api/versao`.
- **Data de fechamento**: não aplicável.
