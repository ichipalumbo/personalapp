# Plano — Sinalização de atualizações do app

> **Status**: `Cancelado` — em 2026-11-03, o dono redirecionou o objetivo para comunicados de novidades; implementação técnica deste plano não foi iniciada. O risco existente de recarga pelo service worker permanece sem correção e será decidido separadamente.
> **Continuação de produto**: [plano de comunicados de novidades](2026-11-03-plan-comunicados-novidades.md), baseado no [diagnóstico dos comunicados](../diagnostics/2026-11-03-diag-comunicados-novidades.md). Este plano é preservado como histórico; suas propostas e decisões de execução não autorizam implementação na nova frente.
> **Abertura**: 2026-11-03
> **Atualizado**: 2026-11-03
> **Responsável**: Luccas (dono) + agente
> **Branch**: `feat/atualizacao-app`; na revisão do replanejamento, o upstream aponta para `origin/feat/atualizacao-app`, não para `main`
> **Diagnóstico de origem e auditoria**: [2026-11-03-diag-atualizacao-app.md](../diagnostics/2026-11-03-diag-atualizacao-app.md), seção 13
> **Base de código**: `1ff3ca374443c6292c3518c1095054382ab8ce93`; **base documental do replanejamento**: `b8959ec`

> **Este arquivo é vivo.** Enquanto a frente estiver aberta, ele recebe decisões, execução, medições e desvios. Não crie um relatório separado para "o depois". Depois de fechado, **não é reescrito**: trabalho posterior gera documento novo.

---

## 1. Objetivo

Sinalizar uma diferença entre a identidade incorporada ao HTML carregado e a versão publicada em `version.json` na abertura do app ou mediante verificação manual, e recarregar automaticamente quando as guardas permitirem. A troca posterior do service worker é um gatilho independente de recarga segura, sem nova consulta de versão. O app também poderá tentar uma recarga limitada quando a identidade carregada for desconhecida e a leitura remota for válida.

**Limite assumido**: não há consulta periódica, nem ao voltar à aba ou reconectar. Uma publicação posterior à abertura não é descoberta automaticamente apenas por mudança do token; pode ser detectada na verificação manual ou numa próxima abertura. A troca posterior do worker continua sendo um gatilho independente de recarga segura. A comparação identifica o HTML, não comprova que todos os recursos pertençam à mesma publicação. Após uma recarga automática cuja origem possa ser atribuída, informa-se apenas “App recarregado”, não “App atualizado”.

## 2. Critérios de aceite

- [ ] **Identidade e detecção**: token do HTML carregado é comparado ao `version.json` válido na abertura e por ação manual; identidade conhecida e igual não dispara recarga por versão; identidade diferente ou desconhecida segue as decisões da seção 3. A leitura publicada não substitui a identidade carregada.
- [ ] **Limites de tentativas**: recarga automática somente com registro confiável que sobreviva à navegação; no máximo uma tentativa por token ou por identidade confiável de worker, por sessão da aba. Registro indisponível, identidade do worker desconhecida ou resultado não confirmável mantém estado inconclusivo sem repetição automática insegura.
- [ ] **Segurança / dados**: antes da recarga, e novamente após qualquer espera, verificar modal, ciclo completo de operação, pendências, recuperação e foco de campo fora de modal. A única exceção de fechamento é a definida para a Área do usuário em verificação manual. Nenhum acesso novo a dados autenticados ou query sem `ownerEmail`.
- [ ] **Operação**: primeira instalação não recarrega; troca posterior do worker segue o fluxo seguro apenas para páginas que já o carregaram. Transição dos clientes antigos tem prova específica, risco residual e autorização por publicação; não há garantia retroativa.
- [ ] **Interface / UX**: faixa acessível no fluxo abaixo do header; informar apenas “App recarregado” quando a origem automática puder ser atribuída; não exibir versão carregada desconhecida nem afirmar que todos os recursos foram atualizados. Validar 433×762 (DPR 2,81), 390×844 e 320×568.
- [ ] **Regressão**: suítes afetadas medidas antes/depois, testes novos provados por mutação e dependências de scripts protegidas; preservar o pré-cache e o comportamento existente salvo alteração adicional aprovada.
- [ ] **Documental e operação**: spec aprovada antes do código da feature, checklist de token no PR e item operacional no roadmap com identificador a confirmar; aceite dos textos pelo dono e resultados registrados neste plano.

## 3. Decisões fechadas

| Decisão | Data | Responsável | Consequência técnica |
|---|---|---|---|
| Escopo da entrega: aviso de nova versão **e** verificação manual em "Sobre o app" | 2026-11-03 | Luccas | Duas superfícies: faixa abaixo do header e seção nova na área do usuário |
| Fonte publicada: `version.json` versionado na raiz | 2026-11-03 | Luccas | Sem função serverless ou build step; o arquivo remoto não é prova da identidade carregada |
| Comportamento: recarregar automaticamente em qualquer versão nova detectada | 2026-11-03 | Luccas | Não existe botão "Agora não"; a faixa é informativa e o reload é do sistema |
| Guarda: recarregar só quando ocioso (sem modal aberto, sem escrita em andamento, sem alteração não confirmada) | 2026-11-03 | Luccas | Guarda bloqueante em T03; o aviso permanece enquanto a condição não libera |
| Posição: faixa compacta abaixo do header, no fluxo normal | 2026-11-03 | Luccas | Não é sticky; não recalcula `--header-height` nem disputa a âncora do `.topo-tela` |
| Arquiteto não implementa; documentação antes de código | 2026-11-03 | Luccas | T00 entregue; investigação técnica e spec aprovada precedem implementação; código depende de autorização |
| Sem dependência nova e sem build step | 2026-11-03 | Convenção do repositório | Manter a stack existente; qualquer dependência adicional exige confirmação |

### Decisões do replanejamento — 2026-11-03

Todas abaixo foram tomadas por Luccas durante esta rodada; não significam autorização para implementar, publicar ou alterar áreas sensíveis.

| Tema | Decisão e limite |
|---|---|
| Verificação | Consultar `version.json` somente na abertura/carregamento do app e por ação manual. Sem polling, consulta ao voltar à aba ou ao reconectar. Abertura significa inicializar/recarregar a página, não apenas voltar a ela. |
| Aba oculta e foco | Aplicar também em segundo plano se as demais guardas liberarem; esperar enquanto um campo fora de modal estiver em foco, usando o foco informado pelo navegador no momento da recarga, inclusive com a aba oculta. |
| Identidade carregada | Comparar o token incorporado ao HTML efetivamente carregado com o token publicado. A correspondência não comprova a versão de todos os scripts e estilos; não atribuir esse significado à comparação. Não exibir versão carregada enquanto sua identidade for desconhecida. |
| Identidade desconhecida | Na primeira leitura remota válida, inclusive na abertura, permitir tentativa automática; limitar a uma tentativa por token por sessão da aba. Se não houver registro confiável que sobreviva à recarga, não recarregar automaticamente. Erro, offline ou leitura inválida não são leitura válida. |
| Worker | Primeira instalação não recarrega. Uma troca posterior de `controllerchange` é gatilho próprio do fluxo seguro, sem exigir consulta adicional específica de versão; limitar a uma tentativa por identidade confiável de worker por sessão da aba. Sem identidade confiável ou registro persistente, não recarregar automaticamente. Uma nova abertura após a recarga continua sujeita à verificação normal de abertura. |
| Resultado | Sem confirmação “App atualizado”. Mostrar somente “App recarregado” após recarga automática cuja origem possa ser atribuída à abertura atual; sem atribuição confiável, não mostrar. Resultado inconclusivo não provoca repetição automática insegura. |
| Verificação manual | Se detectar atualização, fechar automaticamente somente a Área do usuário, quando ela for o modal ativo e não houver outro diálogo ou trabalho protegido. Caso contrário, aguardar; não fechar outros modais ou descartar alterações. |
| Publicação inicial | Preparar o listener seguro numa publicação separada, sem modificar `sw.js`; considerar a troca do worker somente em publicação posterior. Parar antes de cada publicação e pedir autorização; antes da troca, apresentar evidências e risco residual de abas antigas ao dono. |
| Token | Bump em todo PR que alterar frontend ou módulos compartilhados usados pelo frontend; publicações sem essa alteração mantêm o token e não são sinalizadas por ele. Checklist obrigatório no PR, revisado pelo dono. |
| Roadmap e textos | Criar item operacional com ponteiro para a spec, após confirmar identificador livre. Textos são provisórios e exigem aceite do dono antes do fechamento. |

**Precedência**: a decisão de não recarregar sem registro confiável substitui a alternativa inicialmente considerada de recarregar mesmo sem registro; a regra de não mostrar aviso sem atribuição confiável substitui a alternativa de mostrá-lo em caso inconclusivo. A exceção de fechar a Área do usuário é restrita às condições acima e não substitui a guarda geral de modais.

## 4. Questões e portões ainda abertos

| # | Questão / evidência necessária | Bloqueio |
|---|---|---|
| 1 | Desenho verificável da identidade incorporada ao HTML, do token remoto, dos estados desconhecido/inconclusivo e da política por sessão; demonstrar comportamento com cache e recargas manuais. | Antes da spec final e dos cartões de código correspondentes. |
| 2 | Inventário dos ciclos de operação, pendências, formulários, chamadas fora do wrapper e eventos que liberam a guarda; demonstrar que a consulta e a reavaliação não criam lacunas. | Antes da implementação da guarda. |
| 3 | Como obter identidade confiável da troca do worker, distinguir a origem da recarga e evitar laço entre gatilhos de worker e token; se não houver prova suficiente, aplicar as regras conservadoras aprovadas, sem inventar garantia. | Antes dos cartões de worker e confirmação e do aceite da preparação P1. |
| 4 | Validar o roteiro antigo → preparação → troca do worker, inclusive abas antigas não migradas, e apresentar risco residual. | Antes de pedir autorização para cada publicação; uma etapa não autoriza a seguinte. |
| 5 | Identificador livre no roadmap e aceite dos textos definitivos. | Antes do registro no roadmap e do fechamento, respectivamente. |
| 6 | Necessidade de alteração de estratégia de cache além da exclusão do arquivo de versão. | Fora do escopo atual; se o desenho exigir, parar e obter nova decisão antes de implementar. |

## 5. Escopo

- **Arquivos/componentes prováveis, sujeitos ao desenho e autorização**: `version.json`; `index.html` (incluindo identidade carregada e nova seção), `assets/css/style.css`; novo módulo em `assets/js/app-shell/`; `service-worker.js`, `sw.js` e `bootstrap.js`; `contexto-dados.js`, `storage.js` e consumidores, somente se necessários para a guarda; `settings-modal.js`; `mocks/ui-runtime/` e `tests-frontend/`; futura spec, roadmap e índice documental.
- **Comportamentos previstos**: listener novo deixa de recarregar diretamente em `controllerchange`; primeira instalação não recarrega; a Área do usuário passa de cinco para seis seções. As abas que ainda executam o listener antigo não herdam a nova proteção.
- **Fronteira de autorização**: qualquer necessidade de alterar autenticação, sincronização GCal ou outra área sensível é comunicada e confirmada antes; a presente rodada replaneja somente este documento.

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
- **Ordem de scripts**: qualquer novo consumidor de global no topo deve ter a dependência registrada em `DEPENDENCIAS_DE_CARGA` de `tests-frontend/index-html-ordem.test.js`.
- **Layout**: `--header-height` continua sendo a única âncora do `.topo-tela`; a faixa fica no fluxo. Preservar contraste, foco, redução de movimento e a hierarquia da [spec de interface](../specs/interface-e-navegacao.md).
- **Cache**: namespace `josy-personal` e pré-cache aprovado permanecem; exclusão do arquivo de versão no novo worker precisa de teste comportamental. O worker antigo continua sujeito à estratégia anterior.
- **Trabalho em andamento**: proteger operação inteira, pendências e formulários, não apenas chamadas não-`GET` ou painel visível. Reavaliar imediatamente antes da recarga; respeitar foco e exceção restrita da seção 3.
- **Sem promessas indevidas**: token remoto não identifica o HTML carregado; token do HTML não comprova os demais recursos. Falha ou indisponibilidade não deve ser apresentada como atualização confirmada.
- **Sem laço**: antes de recarregar, exigir registro confiável da tentativa e limite aprovado por identidade e sessão da aba; o evento de worker também precisa de identidade própria. Se não for possível comprovar o registro ou a origem, manter estado inconclusivo.
- **Limite de transição**: o listener antigo permanece ativo nas abas antigas. Não anunciar proteção retroativa nem eliminar o risco residual por suposição.

## 8. Baseline

- **Base original de código**: `1ff3ca3`; branch `feat/atualizacao-app`, criada a partir de `origin/main` com `--no-track`. À abertura original, `.vscode/` estava não rastreado; essa é uma fotografia histórica, não o estado atual.
- **Base do replanejamento**: `b8959ec`; working tree limpo antes desta edição; a branch agora acompanha sua própria branch remota.
- **Medição histórica**: frontend **517/517**, 0 falhas, 61,6 s em 2026-11-03, antes de T00. Backend não executado nessa rodada documental. Não foram executadas suítes na auditoria ou no replanejamento.
- **Próxima implementação**: medir a suíte afetada antes e depois; registrar os números reais e investigar falhas ou diferenças de base antes de alterar código. A contagem histórica não é um limite rígido nem prova da situação atual.
- **Cenário de reprodução**: sessão aberta atravessando um deploy; foi proposto por leitura estática, não executado em navegador ou produção. Os testes do plano devem reproduzir separadamente detecção, cache e transição do worker.

## 9. Cartões de tarefas — replanejados após A01–A10

Os cartões originais T01–T09 não foram executados; seus números são mantidos abaixo com escopo e dependências revistos. T00 e seu registro histórico permanecem. Os novos cartões anteriores a T01 impedem que a solução seja implementada com lacunas conhecidas.

### Etapa A — Evidência e contrato antes do código

#### T00 — Registrar a frente
- **Situação**: concluído em 2026-11-03. O resultado e as medições originais permanecem na seção 12.

#### T00-A — Investigar identidade e transição
- **Objetivo**: desenhar, sem alterar produto, o vínculo entre token do HTML e `version.json`, o limite de tentativas por aba e a identidade de worker; distinguir evidência do HTML da coerência dos demais recursos.
- **Modo**: investigação por leitura e testes locais controlados; nenhum experimento que altere código do produto ou publique o worker sem autorização específica.
- **Depende de**: T00 e decisões da seção 3.
- **Investigar**: leitura com worker antigo que ainda pode servir o JSON de cache; validade de resposta, erros e timeout; implantação entre carregamento e leitura; inicialização offline; rollback; estados desconhecido/inconclusivo; registro confiável disponível ou negado; recarga manual e possibilidade de atribuir sua origem.
- **Transição**: exercitar em navegador local o listener antigo e a proposta de preparação sem modificar `sw.js`; examinar múltiplas abas e workers preexistentes. Uma aba antiga não é considerada migrada por ter passado tempo ou por outra aba ter atualizado.
- **Aceite**: riscos e solução proposta registrados neste plano, com testes discriminantes e limitações; demonstrar como evitar falsa leitura de versão enquanto o worker antigo controla a página. Se não houver identidade confiável do worker ou origem atribuível, usar o comportamento conservador aprovado, sem alegar garantia inexistente.
- **Bloqueio**: se a solução exigir mudar a estratégia de cache além da exclusão já prevista, build, dependência ou mudança das decisões, parar e consultar o dono.

#### T00-B — Inventariar trabalho protegido
- **Objetivo**: mapear operações completas, tarefas e respostas, pendências, formulários/modais dinâmicos, foco e chamadas que não passam pelo wrapper.
- **Depende de**: T00; pode ocorrer em paralelo a T00-A.
- **Aceite**: mapa de fontes e eventos de liberação, incluindo `contextoDados`, recuperação, fallbacks e identidade/sessão; plano de testes para leitura antes da escrita, intervalos entre etapas, corpo tardio, falhas e estado que muda durante a espera. Não assumir que a contagem do wrapper ou a visibilidade do painel prova ociosidade.
- **Limite**: se for necessário alterar autenticação, GCal ou outra área sensível, registrar e pedir autorização específica antes de qualquer edição.

#### T00-C — Fixar o contrato antes de implementar
- **Objetivo**: criar a spec durável da feature com decisões aprovadas e casos de borda esclarecidos por T00-A/B; incluir a regra de bump e a transição em etapas.
- **Depende de**: T00-A e T00-B; aprovação do dono quando o desenho revelar nova decisão de produto.
- **Arquivos prováveis**: `docs/specs/atualizacoes-do-app.md`, `docs/README.md` e, após confirmar ID, `docs/roadmap-v3.md`.
- **Aceite**: contrato compreensível sem depender deste plano; estados, limites e exceção de modal explícitos; status apropriado e links válidos; item operacional com resultado e ponteiro, sem declarar entrega. Se alguma pergunta seguir aberta, identificá-la como bloqueio, não como decisão.

### Etapa B — Preparação independente do worker

#### T00-P — Preparar cliente e primeiro portão de publicação
- **Objetivo**: instalar no código da página um listener que não execute recarga direta insegura; não modificar `sw.js` nesta etapa.
- **Depende de**: T00-C, desenho demonstrado e autorização explícita para implementar. Implementar somente o necessário à preparação, com comportamento conservador se a guarda ou identificação não estiver disponível.
- **Aceite técnico**: primeira instalação não recarrega no cliente preparado; nenhum `controllerchange` do cliente preparado contorna guarda e limites aprovados; testes negativos e mutações evidenciam a proteção. O cliente antigo permanece inalterável enquanto estiver carregado.
- **Estado intermediário**: P1 precisa explicitar e validar o comportamento para uma troca real de worker antes de P2. Se T00-A/B não demonstrar como cumprir nessa etapa o gatilho próprio, a guarda e o limite aprovados, parar e pedir nova decisão; uma preparação que apenas ignora trocas não deve ser publicada como equivalente sem autorização.
- **Publicação P1**: após testes e revisão, parar e pedir autorização ao dono para o PR/publicação da preparação; o agente não faz commit, push ou merge. Registrar versão, evidências e resultado da publicação quando realizados pelo dono.
- **Bloqueio**: P1 não autoriza P2 e não comprova que todas as abas antigas migraram. Não publicar o novo worker junto com P1.

### Etapa C — Identidade, guarda e aplicação

#### T01 — Identidade publicada e exclusão de cache
- **Depende de**: T00-A, T00-C e preparação P1 publicada/validada; autorização de implementação.
- **Inclui**: `version.json`, identidade do HTML definida no desenho, exclusão no novo `sw.js` e checklist manual de bump. Não presumir que `no-store` contorne o worker antigo.
- **Aceite**: teste comportamental do handler comprova que o novo worker não grava nem entrega a versão do cache; lista de pré-cache e namespace preservados; leitura válida é distinguida de erro, timeout, dados inválidos e possível resposta antiga. Nenhuma publicação do worker sem P2.

#### T02 — Comparar identidades e disparar verificação
- **Depende de**: T01 e T00-A/C.
- **Inclui**: leitura na abertura e por solicitação manual, comparação do token do HTML com o remoto, estado conhecido/desconhecido e tratamento de erro/offline; sem verificação periódica, `online` ou retorno à aba.
- **Aceite**: token carregado igual não gera recarga por versão; token diferente gera solicitação; identidade desconhecida e leitura válida permitem uma tentativa limitada conforme T05; erro não fabrica identidade nem sinaliza sucesso. Testar deploy entre carregamento e leitura, documento antigo e JSON novo, falha inicial, JSON inválido e concorrência de verificações.

#### T03 — Guarda para ciclo completo de trabalho
- **Depende de**: T00-B/C; integrado a T02 antes da recarga.
- **Inclui**: operação completa e tarefas associadas, pendências independentemente da visibilidade do painel, recuperação visível, modais estáticos e dinâmicos, campo fora de modal em foco e tratamento da aba oculta conforme seção 3; observar eventos de liberação.
- **Aceite**: nenhuma recarga enquanto protegido, inclusive entre chamadas e durante corpo tardio; após liberação, reavaliar sem perder a solicitação; mudança de estado durante a espera volta a bloquear. Testar exceção/falha e concorrência sem contador preso nem abertura prematura da guarda.

#### T04 — Faixa de sinalização
- **Depende de**: T02, T03 e contrato T00-C.
- **Inclui**: faixa acessível, oculta sem espaço, sob o header; estado de espera e tentativa, inclusive resultado inconclusivo quando cabível; preservar hierarquia, contraste, foco e movimento reduzido.
- **Aceite**: sem colisão com recuperação ou topos; testes DOM e mock em 433×762/DPR 2,81, 390×844 e 320×568. Textos provisórios exigem aceite posterior do dono.

#### T05 — Recarga limitada e resultado honesto
- **Depende de**: T02, T03, T04 e solução de registro/atribuição de T00-A.
- **Inclui**: uma tentativa automática por token por sessão de aba; registro confiável antes da recarga; reavaliação imediata da guarda; resultado inconclusivo sem repetição insegura; aviso “App recarregado” somente se a origem automática puder ser atribuída à abertura atual.
- **Aceite**: teste de falha ou negação do armazenamento bloqueia recarga; falha após recarga e repetição do mesmo token não criam laço; token diferente segue o limite próprio; nenhuma recarga manual recebe aviso indevido. Não afirmar que os demais recursos foram atualizados. A prova de ausência de laço deve cobrir também a alternância entre os gatilhos de token e de worker, sem ampliar os limites aprovados.

#### T06 — Troca posterior do worker no mesmo fluxo
- **Depende de**: T00-P, T00-A, T03 e T05.
- **Inclui**: diferenciar primeira instalação de troca; tratar troca como gatilho próprio sem consultar `version.json`; limitar uma tentativa por identidade confiável do worker por sessão da aba, exigindo registro persistente.
- **Aceite**: sem identidade/registro confiáveis, não recarregar; eventos duplicados não criam laço; modais e operações bloqueiam; nenhum caminho do cliente preparado recarrega diretamente. Não declarar que abas antigas estão protegidas.

#### T07 — Verificação manual em “Sobre o app”
- **Depende de**: T02, T03, T05 e T00-C.
- **Inclui**: sexta seção na Área do usuário, botão de verificação e estado acessível; não exibir versão carregada desconhecida nem apresentar igualdade de tokens como prova de todos os recursos.
- **Aceite**: ao detectar versão, fechar apenas a Área do usuário se for o modal ativo e não houver outro diálogo ou trabalho protegido; caso contrário aguardar. Verificar sucesso, erro, leitura inválida, foco e ausência de fechamento de outros modais.

### Etapa D — Prova integrada e publicação separada

#### T08 — Validar comportamento e risco da transição
- **Depende de**: T01–T07 e T00-P.
- **Inclui**: testes e roteiro da seção 10, mock com indisponibilidade explícita da leitura de versão e navegador local com workers e abas reais; registrar separadamente resultado local, risco residual e limites de produção.
- **Aceite**: cobrir antigo → P1 → troca proposta, aba que nunca carregou P1, múltiplas abas, operação em curso, falhas de rede/cache, armazenamento indisponível e recarga manual; nenhuma simulação é apresentada como prova do ambiente Vercel ou do aparelho do dono.
- **Publicação P2**: parar antes de trocar o worker publicado; apresentar evidências e risco residual e pedir nova decisão explícita do dono, mesmo que P1 já tenha sido aprovada. Nenhuma ação de publicação é executada pelo agente.

#### T09 — Revisar contrato, roadmap e fechamento
- **Depende de**: T08, spec de T00-C, identificação do item no roadmap e aceite dos textos.
- **Inclui**: atualizar spec apenas com decisões duráveis já aprovadas; síntese e ponteiro no roadmap; checklist de PR para bump; registrar execuções, mutações, riscos residuais, aceite e publicação separadamente neste plano.
- **Aceite**: o contrato não depende do plano; nenhum item é declarado entregue, validado em produção ou aceito sem evidência e decisão correspondentes.

## 10. Matriz de validação

| Tipo | Cenários obrigatórios | Limite |
|---|---|---|
| Identidade / detecção | Token do HTML igual, diferente e desconhecido; deploy entre HTML e leitura; JSON inválido, erro, timeout e offline; aberturas e verificação manual; ausência de polling e de gatilho `online`/retorno | Comparação identifica o HTML, não todos os recursos. Worker antigo e cache HTTP precisam de cobertura própria. |
| Guardas | Modal estático/dinâmico, pilha de diálogos, pendência e recuperação, operação completa com GET inicial, intervalo entre escritas, corpo tardio e falha; campo externo em foco; aba oculta; guarda que fecha durante espera | Testar reavaliação imediatamente antes do reload e liberação sem perder pedido. |
| Verificação manual | Detecção com Área do usuário ativa, outro modal empilhado, operação ou pendência; fechar somente a área e só nas condições aprovadas | Não descartar outros diálogos ou alterações. |
| Tentativas / aviso | Registro indisponível, mesmo token ou worker repetido, token novo, identidade de worker desconhecida, alternância entre gatilhos de token e worker, recarga manual, navegação/boot interrompidos e origem inconclusiva | Sem persistência confiável não recarregar; sem origem atribuível não anunciar recarga automática. |
| Worker e cache | Teste comportamental do `fetch`, `install` e `activate`; navegador local com instalação inicial, worker antigo, P1, P2 proposta, abas que não migraram e múltiplas abas | Teste textual e jsdom não comprovam o ciclo real do worker; o teste local não comprova Vercel. |
| Mock | Versões controladas; indisponibilidade explícita do arquivo de versão, não apenas `mockOffline`; operações retidas e condições de foco | Confirmar leitura real do arquivo separadamente; nenhum cenário toca produção. |
| Ordem / UI | Dependências de scripts; layout e acessibilidade no mock em 433×762 (DPR 2,81), 390×844 e 320×568 | Cobertura de DOM não substitui inspeção visual. |
| Suítes e mutações | Medir a suíte afetada antes/depois; provar testes novos por mutação e restaurar cada mutação antes de seguir | Medições históricas não são contagem atual. |

**Fora da prova local**: cache e cabeçalhos efetivos da Vercel, propagação de produção, comportamento do PWA no aparelho do dono e existência de outras abas antigas. Registrar evidência ou limite antes de cada portão de publicação.

## 11. Prova por mutação

| Mutação proposta | Proteção esperada | Situação |
|---|---|---|
| Remover a exclusão efetiva de `version.json` no novo worker | Teste comportamental detecta gravação/entrega indevida do cache | Não executada |
| Trocar token do HTML pela primeira leitura remota | Teste de deploy entre HTML e leitura detecta identidade falsificada | Não executada |
| Ignorar operação ativa entre chamadas ou corpo pendente | Teste de ciclo completo detecta recarga antes da finalização | Não executada |
| Remover reavaliação da guarda imediatamente antes da recarga | Teste de modal/ação iniciada durante a espera falha | Não executada |
| Ignorar registro persistente ou limite por token/worker | Testes de armazenamento negado e repetição detectam recarga insegura | Não executada |
| Tratar primeira instalação como troca ou recarregar diretamente em `controllerchange` | Testes de worker detectam recarga indevida | Não executada |
| Mostrar aviso sem atribuição automática confiável | Testes de recarga manual/origem inconclusiva detectam aviso indevido | Não executada |

Cada teste novo deve falhar quando sua proteção for mutada; registrar resultado real, restaurar a alteração e verificar o estado do Git antes de seguir. A tabela não afirma que as mutações foram aplicadas.

## 12. Registro da execução

### 2026-11-03 — T00 (documental)
- **Arquivos alterados**: `docs/diagnostics/2026-11-03-diag-atualizacao-app.md` (novo), `docs/plans/2026-11-03-plan-atualizacao-app.md` (novo) e uma linha no índice `docs/README.md`.
- **Resultado**: diagnóstico com evidência classificada e plano com cartões T01–T09; decisões de escopo, fonte, comportamento, guarda e posição registradas; nenhum código alterado.
- **Suíte antes/depois**: `tests-frontend/` 517/517 antes da escrita; depois não aplicável (nenhum arquivo coberto alterado). `backend/` não executada, mesmo motivo.
- **Desvio do plano**: nenhum.
- **Decisão adicional tomada**: branch definida pelo dono como `feat/atualizacao-app`.

### 2026-11-03 — Replanejamento após auditoria
- **Base**: diagnóstico auditado em `b8959ec`; branch `feat/atualizacao-app`, limpa antes da edição; dono escolheu continuar nela.
- **Arquivo alterado**: este plano. O diagnóstico auditado, a spec, o roadmap e o código não foram alterados nesta rodada.
- **Resultado**: decisões do dono registradas na seção 3; questões de prova, contrato anterior ao código, preparação P1 e portão separado para P2, cartões, validação e mutações reordenados para tratar A01–A10.
- **Testes**: não executados; mudança exclusivamente documental. Nenhuma hipótese técnica foi considerada comprovada e nenhuma publicação foi realizada ou autorizada.
- **Pontos a resolver à época**: T00-A/B, viabilidade do aviso com origem atribuível, identidade de worker, comportamento completo do cliente em P1, ausência de laço entre gatilhos, contrato T00-C, identificador do roadmap e aceite dos textos.

### 2026-11-03 — Cancelamento e redirecionamento
- **Decisão do dono**: cancelar este plano técnico e abrir uma frente de comunicados; preservar o documento como histórico sem executar os cartões.
- **Situação**: apenas T00 documental havia sido realizado. Código, spec da feature, testes de implementação e publicação não foram executados.
- **Risco residual**: a recarga existente em `controllerchange` e o impacto em clientes antigos permanecem não corrigidos; análise e prioridade ficam para decisão separada do dono.
- **Nova frente**: [diagnóstico de comunicados](../diagnostics/2026-11-03-diag-comunicados-novidades.md) e [plano de comunicados](2026-11-03-plan-comunicados-novidades.md). A exigência de compatibilidade dos recursos pode demandar nova investigação técnica, sem reativar automaticamente as propostas deste plano.

## 13. Achados não alterados

| Risco/achado | Por que não foi tratado | Destino | Dono |
|---|---|---|---|
| Reload no cliente antigo em `controllerchange` | P1 não alcança abas já abertas; depende de transição e decisão sobre risco residual | T00-A, T00-P e portão P2 | dono |
| Identidade/coerência de todos os recursos | token do HTML não comprova scripts/CSS; solução mais ampla não foi aprovada | limite explícito do contrato | dono |
| Notificação com app fechado | outra feature, outro mecanismo | roadmap 4.2 | dono |
| Ausência de integração contínua | fora do escopo; checklist de bump é manual | roadmap/infra | dono |
| Cabeçalhos e propagação da Vercel | não verificados nesta rodada; sem staging | portões de publicação e verificação autorizada | dono |
| `.vscode/` | o estado não rastreado descrito no diagnóstico é histórico; `extensions.json` já está versionado em `2f4a87f` | fora da frente | dono |

## 14. Deploy e rollback

- **P1 — preparação**: publicar separadamente o cliente com listener seguro, sem modificar `sw.js`. Antes, obter autorização explícita do dono; depois, registrar resultado e limitações. P1 não garante que abas antigas tenham migrado.
- **P2 — mudança do worker/feature**: antes de qualquer publicação que troque o worker, apresentar teste local, evidência disponível de P1 e risco residual das abas antigas; parar e pedir nova decisão explícita. O dono decide e executa os passos de publicação; autorização de P1 não implica autorização de P2.
- **Efeito e verificação**: arquivo público de versão, identidade do HTML, interface e exclusão no novo worker, sujeitos ao desenho. Produção não tem staging; validar o que o dono autorizar, sem presumir que um segundo deploy de teste ou bump já esteja autorizado.
- **Rollback**: uma publicação de correção ou reversão é decisão e operação do dono. Reverter código não desfaz imediatamente o worker já instalado nem o JavaScript das abas abertas; outro worker pode exigir publicação posterior e reenfrentar a transição. Token revertido pode acionar comparação, sujeito a guardas e limites; não presumir que isso garanta versão coerente dos recursos.

## 15. Fechamento

- **Resultado**: plano cancelado pelo dono em 2026-11-03 após esclarecimento do objetivo; T00 e a pesquisa permanecem como histórico, sem afirmar entrega da solução técnica.
- **Implementação / validação / publicação**: não realizadas. A medição histórica de 517/517 frontend corresponde à rodada documental inicial, não a esta decisão.
- **Aceite**: não emitido para a solução técnica. Os cartões não executados deixam de constituir fila ativa; a nova frente é a de comunicados.
- **Risco não resolvido**: reload existente em `controllerchange` e transição de clientes antigos; tratamento e prioridade requerem decisão separada do dono. A compatibilidade exigida na nova frente também precisa de investigação própria.
- **Data de cancelamento**: 2026-11-03.
