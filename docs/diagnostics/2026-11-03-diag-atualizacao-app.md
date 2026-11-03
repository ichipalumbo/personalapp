# Diagnóstico — Sinalização de atualizações do aplicativo

> **Status**: Concluído no recorte estático · **Criado/Atualizado**: 2026-11-03
> **Pergunta**: como o app pode perceber que existe uma versão mais nova publicada e sinalizar isso ao usuário — sem recarregar no meio de uma edição e sem depender de notificação externa?
> **Base**: `1ff3ca374443c6292c3518c1095054382ab8ce93` (`main`, merge do PR #79) · **Branch**: `feat/atualizacao-app`, criada de `origin/main` com `--no-track`; working tree com apenas `.vscode/` não rastreado.
> **Método**: leitura dirigida de código e documentação, contagens por busca no workspace e execução da suíte `tests-frontend/`. Sem deploy, sem teste em navegador, sem chamada a produção e sem alteração de produto.
> **Limite**: concluído significa investigação registrada. Não comprova comportamento em navegador real, não mede cabeçalhos de cache da Vercel e não aprova implementação. A intervenção está no [plano da frente](../plans/2026-11-03-plan-atualizacao-app.md).
> **Auditoria posterior**: levantamento estático iniciado em 2026-11-03 às 12:54 (UTC−03:00), por **GPT-6.1 Terra**. A seção 13 registra os achados, as retificações e os limites dessa revisão, sem alterar as decisões do dono nem autorizar implementação.

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

1. Uma sessão aberta não recebe necessariamente o código novo sem recarregar. Mesmo com rede, a recarga não comprova por si só que todos os arquivos novos foram carregados: cache, falhas e propagação precisam ser verificados (auditoria, A04).
2. Um arquivo de versão na raiz seria cacheado por essa mesma regra e poderia ser devolvido do cache offline — gerando leitura desatualizada. A proposta prevê excluí-lo explicitamente; a transição de clientes com o SW antigo continua exigindo validação (A03).

### F03 — O registro do service worker recarrega a página em `controllerchange`

`service-worker.js` adiciona o listener **antes** de registrar `/sw.js`, chama `registration.update()` e recarrega em `controllerchange`, protegido apenas por um booleano local (`hasReloadedForServiceWorkerUpdate`). Não há verificação de "já existia controller antes deste registro".

Consequência (inferência, não observada em navegador): como `sw.js` usa `skipWaiting()` + `clients.claim()`, a primeira instalação pode disparar `controllerchange` e recarregar a página sem que o usuário tenha pedido.

### F04 — Nenhuma superfície expõe versão ou verificação

A área do usuário (`#tituloAppSettings`) tem cinco seções: Perfil da conta, Google Agenda, Dados, Sessão e Informações Legais. Não há "Sobre", versão instalada nem ação de verificar atualização.

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

### F07 — O wrapper de API concentra chamadas, mas não representa toda a operação

`apiFetchBackend` é exportado como `window.apiFetchBackend` e usado em chamadas com `GET`, `POST`, `PUT`, `PATCH` e `DELETE`. A auditoria identificou também caminhos alternativos de `fetch` em [google-identity.js](../../assets/js/auth/google-identity.js), usados como fallback quando o wrapper está indisponível. Além disso, uma operação pode compreender várias requisições e processamento posterior à resposta. Contar apenas escritas no wrapper não comprova que toda a operação terminou (A01).

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
- **Cenário proposto para reprodução**: publicar uma alteração de frontend na `main`, manter uma aba com a versão anterior aberta e verificar se o app informa a existência da versão nova. Não foi executado nesta investigação.
- **Evidência estática**: não foi encontrado mecanismo de comparação de versões nem superfície de aviso. A recarga é um possível caminho para obter recursos novos, mas sua efetividade não foi comprovada.
- **Resultado esperado**: sinal perceptível, com aplicação automática quando seguro.
- **O que não foi medido**: comportamento do cenário em navegador real, inclusive recarga em `controllerchange`; cabeçalhos de cache de produção; tempo real entre deploy e propagação.

## 4. Cadeia causal

Deploy publica arquivos novos → uma sessão já aberta pode continuar usando o código carregado → **não há comparação de versões nem superfície de aviso** → o usuário pode permanecer com código antigo sem saber. Uma recarga tenta buscar recursos pela rede, mas não garante, sem confirmação adicional, que todos correspondam à nova publicação.

Pontos centrais da lacuna: **falta de identificador de versão** (F01) e **de gatilho de verificação e superfície de aviso** (F04, F05). O service worker também participa dos riscos de transição e recarga: o listener existente pode recarregar em `controllerchange`, e o cache exige validação específica (A03–A04).

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
| Dados | Risco não comprovado como baixo: a guarda proposta ainda não protege demonstravelmente a operação inteira e a transição do cliente antigo (A01 e A03) |
| Segurança | Baixo — o identificador de versão é público e não passa por `requireAuth`; não deve ser filtrado por `ownerEmail` |
| Operação | Médio — o `sw.js` só é exercitado após deploy; sem staging, a validação é manual em produção |
| Reversibilidade | Parcial — `git revert` do código não desfaz um service worker já instalado em clientes; é preciso publicar outro `sw.js` |

## 8. Opções

### Opção A — `version.json` versionado na raiz (escolhida)

Arquivo com token de build, versão legível e data, atualizado no PR de release. A proposta prevê leitura com `no-store` e exclusão explícita do cache do SW, sem infraestrutura adicional nem build. Riscos: depender do bump manual, confundir a identidade publicada com a do código carregado e não comprovar a aplicação após recarregar (A02, A04 e A08). O mock e um teste estático não substituem a validação do comportamento do SW em navegador (A07).

### Opção B — Função serverless `/api/versao` no projeto do frontend

Devolveria `VERCEL_GIT_COMMIT_SHA` com `no-store`. Benefício: automático e amarrado ao deploy do frontend. Risco: adiciona runtime a um projeto hoje estático e exige validar deploy sem staging. Fica como evolução, trocando só a constante de URL.

### Opção C — Gerar `version.json` no build da Vercel

Exige `vercel.json` na raiz e build command. Benefício: automático. Risco: introduz build step proibido pela convenção do repositório.

### Opção D — Endpoint `/api/versao` no backend

Benefício: automático, sem tocar o frontend. Risco: mede o deploy da API, não o do frontend; os dois projetos sobem separados, abrindo janela de corrida.

### Opção E — `ETag`/`Last-Modified` de um arquivo existente

Benefício: nenhum artefato novo. Risco: só muda quando aquele arquivo muda; deploy que altera apenas um `view-*.js` não seria detectado.

## 9. Recomendação

Opção **A**, escolhida pelo dono, mantém a leitura isolada para uma possível evolução futura. A auditoria não valida que trocar apenas a URL preserve a identificação da versão em execução, a confirmação da atualização ou os testes; esses pontos exigem desenho e validação próprios (A02 e A04). Evitar D como sinal principal por causa da corrida entre os dois deploys.

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
| Reload em `controllerchange` pode ocorrer na primeira instalação do service worker (F03) | pendente nesta frente, no cartão de unificação do service worker; a transição do cliente antigo requer tratamento adicional (A03) |
| Notificação com app fechado (push/WhatsApp) | roadmap 4.2; depende de mecanismo de agendamento no backend |
| Falta de integração contínua (F08) | roadmap/infra; não é pré-requisito desta frente |
| Cabeçalhos de cache da Vercel não verificados | conferência pós-deploy, registrada no plano |
| `.vscode/` não rastreado no workspace | decisão do dono sobre versionar ou ignorar; não pertence a esta frente |

## 12. Critério para abrir o plano

Decisões de escopo, fonte da versão, comportamento e posição do aviso **fechadas pelo dono em 2026-11-03**; baseline da suíte medido. O plano foi aberto com base nesse levantamento; a auditoria posterior identificou lacunas nas guardas e validações que precisam ser avaliadas antes de implementar (seção 13). A intervenção segue no [plano da frente](../plans/2026-11-03-plan-atualizacao-app.md).

## 13. Auditoria posterior do diagnóstico e do plano

- **Data e hora**: iniciada em **2026-11-03 às 12:54 (UTC−03:00)**.
- **Modelo responsável**: **GPT-6.1 Terra**.
- **Base da auditoria**: branch `feat/atualizacao-app`, commit `2f4a87f` sobre a base de código `1ff3ca3`; working tree limpo na revisão. O commit posterior à base inclui o diagnóstico, o plano, o índice documental e `.vscode/extensions.json`.

**Método e limites**: leitura estática do diagnóstico, do plano e dos trechos relacionados de código, mock, testes e documentação. Não foram executados testes, navegador, deploy, requisições à produção ou medições de cabeçalhos nesta auditoria. Os números da seção 2 são da investigação original, não uma nova medição. As severidades abaixo avaliam riscos da **proposta**, salvo indicação em contrário; não descrevem falhas de uma implementação concluída. Os cenários de corrida e comportamento em navegador são inferências a validar, não reproduções observadas.

### A01 — Guarda por requisição não cobre toda a operação · Alto

**Evidência**: o T03 do [plano](../plans/2026-11-03-plan-atualizacao-app.md) prevê contar chamadas não-`GET` em `apiFetchBackend` e observar `#recuperacaoDados`. Em [storage.js](../../assets/js/storage.js), uma operação pode envolver leitura inicial, múltiplas escritas e processamento dos corpos das respostas; o wrapper retorna a resposta antes de o chamador necessariamente consumir o corpo. Em [recuperacao-dados.js](../../assets/js/app-shell/recuperacao-dados.js), o painel é ocultado enquanto uma operação está em andamento. [contexto-dados.js](../../assets/js/app-shell/contexto-dados.js) já acompanha o ciclo de vida de operações e pendências.

**Inferência / impacto**: entre requisições, durante uma leitura ou após os headers, o contador proposto pode estar zerado enquanto o trabalho ainda não terminou e a recuperação continua oculta. Uma recarga nesse intervalo pode interromper a operação ou deixar seu resultado sem confirmação. Contar requisições também não cobre os caminhos de fallback fora do wrapper identificados em F07.

**A tratar antes da implementação**: avaliar a proteção da operação completa, das pendências e dos caminhos fora do wrapper; testar leituras anteriores à escrita, intervalos entre etapas, consumo tardio do corpo e finalização com falha. Não se presume que o contador proposto seja suficiente.

### A02 — Baseline remota não identifica o código carregado · Alto

**Evidência**: o T02 do plano estabelece a baseline pela primeira leitura bem-sucedida de `version.json`; o T07 prevê mostrar a versão instalada.

**Inferência / impacto**: se a página com código antigo já estiver aberta quando ocorrer o deploy e a primeira leitura for concluída depois, ela pode adotar o token novo como baseline sem ter recebido o código novo. Início offline e falha na primeira leitura também deixam a identidade carregada desconhecida. Assim, a comparação pode não detectar a atualização e a versão apresentada pode ser incorreta.

**A tratar**: definir como relacionar a identidade publicada ao código efetivamente carregado, inclusive quando a identidade for desconhecida; testar deploy entre abertura e primeira leitura, falha inicial, retorno da rede e exibição da versão.

### A03 — Primeiro deploy mantém o listener antigo nas abas abertas · Alto

**Evidência**: [service-worker.js](../../assets/js/app-shell/service-worker.js) atualmente recarrega diretamente em `controllerchange`; [sw.js](../../sw.js) usa `skipWaiting()` e `clients.claim()`. O T06 altera o listener da versão nova, não o JavaScript já carregado nas abas antigas.

**Inferência / impacto**: a atualização do worker pode causar `controllerchange` numa página ainda executando o listener antigo e provocar recarga sem a nova guarda, inclusive durante uma edição. A mesma transição exige análise para cada aba controlada. Esse comportamento não foi reproduzido em navegador nesta auditoria.

**A tratar**: planejar e validar explicitamente a migração da versão antiga para a nova, com edição e múltiplas abas; declarar qualquer risco residual que não possa ser eliminado para clientes já abertos. A correção prevista em T06 não deve ser apresentada como retroativa.

### A04 — Recarga e flag não comprovam atualização aplicada · Alto

**Evidência**: o T05 prevê gravar uma flag antes da recarga e exibir depois o toast “App atualizado.”. O [sw.js](../../sw.js) tenta a rede e usa o cache em caso de falha; a auditoria não mediu cache HTTP, propagação ou cabeçalhos de produção.

**Inferência / impacto**: uma recarga pode recuperar recursos antigos ou não comprovar uma combinação coerente de arquivos. Apenas encontrar a flag depois do boot não prova que o código carregado corresponda ao token detectado. Também é necessário avaliar falhas posteriores à recarga e o risco de novas tentativas repetidas.

**A tratar**: definir critério de confirmação e estado inconclusivo, além de teste para indisponibilidade após detecção, recursos desatualizados, propagação desigual e ausência de laço. O texto de sucesso não deve pressupor uma comprovação ainda inexistente.

### A05 — Verificação periódica não consta do cartão T02 · Médio

**Evidência**: a opção de cadência proposta na seção 4 do plano inclui intervalo periódico com a aba visível; o T02 lista `visibilitychange` e `online`, sem incluir explicitamente esse intervalo.

**Inferência / impacto**: se a implementação seguir apenas os gatilhos do cartão, uma aba mantida visível e online pode não verificar um deploy posterior.

**A tratar**: obter a decisão do dono sobre cadência e gatilhos e alinhar o cartão, os critérios e os testes. Os intervalos indicados no plano são proposta, não decisão aprovada.

### A06 — A guarda pode mudar durante a espera para recarregar · Médio

**Evidência**: o T05 prevê tempo mínimo para o estado “aplicando”; o [index.html](../../index.html) também contém interação fora de modal, como a busca de alunos.

**Inferência / impacto**: depois de a guarda indicar ociosidade, o usuário pode abrir um modal, iniciar uma operação ou interagir com outro campo antes da recarga. A guarda descrita não especifica quais interações fora de modal devem adiá-la.

**A tratar**: reavaliar as condições imediatamente antes de recarregar e decidir com o dono quais interações não cobertas por modal devem preservar o trabalho. Testar a abertura de modal e o início de operação durante a espera; não presumir a política para a busca.

### A07 — Mock e teste estático não comprovam o comportamento real · Médio

**Evidência**: [sandbox.js](../../mocks/ui-runtime/sandbox.js) encaminha requisições que não são de API ou Google para o `fetch` nativo; o offline de [mock-runtime.js](../../mocks/ui-runtime/mock-runtime.js) simula o estado e as respostas da API. O plano propõe teste estático para exclusão de cache e roteiro manual no mock.

**Inferência / impacto**: o offline simulado não garante, por si só, que a leitura de `version.json` falhe; um teste textual do SW não prova instalação, ativação, exclusão efetiva do cache ou fallback em navegador. O servidor local com `no-store` também não mede os cabeçalhos da Vercel.

**A tratar**: prever validação comportamental da leitura e do cache, simulação explícita de indisponibilidade do arquivo de versão e roteiro em navegador para instalação e transição do SW antigo para o novo. Incluir múltiplas abas, falhas após a detecção e resultado após a recarga; manter declarada a limitação de produção.

### A08 — Bump manual do token ainda depende de decisão operacional · Médio

**Evidência**: a decisão 5 do plano deixa em aberto quando atualizar o token; a opção escolhida depende de um arquivo versionado manualmente.

**Inferência / impacto**: uma publicação relevante sem alteração do token pode não ser detectada por clientes já abertos. A política e sua verificação não estão definidas.

**A tratar**: decidir responsável, momento e escopo do bump e como verificar sua aplicação no fluxo de entrega, sem presumir uma nova infraestrutura.

### A09 — Sequência do contrato e decisões ainda não está alinhada · Médio

**Evidência**: o plano registra “documentação antes de código”, mas posiciona a spec durável no T09, após cartões de implementação. Também mantém pendentes decisões como aplicação com aba oculta, cadência e regra de bump. O [índice documental](../README.md) exige decisão explícita e contrato para comportamento durável.

**Impacto**: a execução pode chegar a comportamentos dependentes de decisão sem contrato aprovado, ou tratar proposta como autorização.

**A tratar**: resolver com o dono as decisões que bloqueiam os comportamentos correspondentes e alinhar a sequência de contrato, cartões e critérios de aceite. A auditoria não decide produto nem altera o plano.

### A10 — Retificações de precisão documental · Baixo

- A área do usuário tem **cinco**, não três, seções; uma seção adicional seria a sexta. F04 foi corrigido neste diagnóstico; a referência à quarta seção no plano ainda precisa ser avaliada separadamente.
- F03 continua **pendente**, não corrigido; a tabela da seção 11 foi corrigida neste diagnóstico.
- A reprodução da seção 3 era apresentada como observada apesar de não ter havido navegador ou deploy. A seção agora distingue cenário proposto de evidência estática.
- A afirmação de que a recarga com internet garante código novo e a avaliação de risco baixo para dados não estavam comprovadas; F02, cadeia causal e impacto foram ajustados para refletir os limites da auditoria.
- A descrição original de F07 como ponto único para toda chamada e para toda a escrita foi qualificada, inclusive pelos fallbacks identificados e pela duração mais ampla das operações.

**Resultado da auditoria**: existem pontos relevantes a resolver antes de implementar. O diagnóstico registra as evidências e riscos; nenhuma alteração de código ou do plano foi realizada nesta rodada, e nenhum dos achados é considerado corrigido apenas por estar documentado.
