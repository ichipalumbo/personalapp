# Plano — Comunicados de novidades e correções

> **Status**: `Aguardando decisão` — decisões de produto registradas; viabilidade de compatibilidade, persistência e automação ainda não demonstrada; nenhuma implementação ou publicação autorizada
> **Abertura/Atualizado**: 2026-11-03 · **Responsável**: Luccas (dono) + agente
> **Branch**: `feat/atualizacao-app`, escolhida pelo dono; **base de código**: `1ff3ca374443c6292c3518c1095054382ab8ce93`; **base documental**: `738af7b`, mais os registros desta rodada.
> **Fontes**: [diagnóstico de comunicados](../diagnostics/2026-11-03-diag-comunicados-novidades.md), [benchmark](../reference/benchmark-comunicados-novidades.md), [spec de interface](../specs/interface-e-navegacao.md), [índice documental](../README.md) e [roadmap](../roadmap-v3.md). O [plano técnico anterior](2026-11-03-plan-atualizacao-app.md) foi cancelado e permanece como histórico.

Este plano é vivo e recebe nele próprio o registro das decisões adicionais, execução, medições e desvios. Ele não substitui a spec durável nem autoriza implementação, ativação de automação, deploy ou alterações em áreas sensíveis.

## 1. Objetivo

Comunicar funcionalidades novas e correções relevantes em um modal acessível na abertura do app, preservando o fechamento por conta entre dispositivos e permitindo reabrir um histórico em **Novidades**, na Área do usuário. O comunicado só é exibido quando a compatibilidade dos recursos relevantes com o código em execução puder ser comprovada. Mostrar novidades não significa atualizar o app nem comprovar que uma recarga ocorreu.

A identificação e a comprovação dessa compatibilidade **não estão resolvidas**. É um portão de viabilidade, não uma tarefa de implementação já aprovada. O risco anterior de recarga automática em `controllerchange` continua independente e sem correção.

## 2. Decisões do dono — 2026-11-03

| Tema | Decisão |
|---|---|
| Abertura | Exibir automaticamente quando houver comunicados não vistos, inclusive no primeiro acesso da conta. Abertura significa início ou recarga da página; só voltar a uma aba aberta não conta como abertura. Não exigir período mínimo de ausência. |
| Login | Sem sessão, aguardar login; após autenticar, apresentar quando as demais condições forem satisfeitas. Não associar fechamento anônimo à próxima conta. |
| Conteúdo automático | Agrupar os comunicados não vistos comprovadamente compatíveis, do mais recente ao mais antigo, no mesmo modal. Aguardar outros diálogos, edição, recuperação ou operação em andamento; não fechá-los automaticamente. |
| Acesso manual | A Área do usuário contém acesso **Novidades** a um diálogo de histórico sobre ela; mostrar todos os comunicados publicados cuja compatibilidade esteja comprovada e ocultar os demais até a prova. |
| Marcar como visto | Ao fechar a apresentação automática ou o histórico manual, marcar todos os comunicados exibidos na lista daquela apresentação, mesmo que a pessoa não role até o final. Itens ocultos por falta de comprovação não são marcados. O fechamento da interface não depende de confirmação remota. |
| Conta e dispositivos | O estado de visto acompanha a conta entre dispositivos, confirmado pelo backend; antes da confirmação, admite-se que apareça simultaneamente em mais de um dispositivo. Cada leitura/escrita de dados privados deve respeitar `ownerEmail`. |
| Offline | Usar cópia local por conta quando conteúdo, estado e comprovação de compatibilidade estiverem disponíveis e forem confiáveis. Sem dados confiáveis, não abrir automaticamente até poder obtê-los. |
| Fechamento sem rede | Fechar sem aviso de falha; manter pendência local por conta, sem credenciais, e tentar sincronizá-la quando a **mesma conta** estiver autenticada e online. Sem confirmação do backend o comunicado pode reaparecer. |
| Troca de conta | Fechar o comunicado da conta anterior e carregar o estado da nova; não transmitir nem marcar pendência da conta antiga em nome da nova. |
| Compatibilidade | Antes de exibir conteúdo automático ou histórico, comprovar compatibilidade de todos os recursos relevantes de cada comunicado com o código carregado. Investigar e listar esses recursos; HTML/token isolado não basta. Se a prova for inconclusiva, aguardar e não exibir esse conteúdo. |
| Publicação editorial | Gerar um rascunho para cada PR; o dono revisa e decide publicar apenas novidades ou correções relevantes. Mudanças puramente internas não precisam gerar comunicado publicado. |
| Automação | Planejar GitHub Actions para rascunhos, sujeito a investigação da informação acessada, retenção, dependências, permissões e autorização explícita antes de ativar. Nenhum envio de código ou dados privados a serviço externo não autorizado. |
| Roadmap | Criar item operacional próprio, com ponteiro para a futura spec. Identificador proposto: **1.8**, livre no índice consultado; confirmar novamente antes de registrar. |
| Plano anterior | Cancelar o plano técnico, preservando histórico; risco de recarga pelo worker permanece para decisão e prioridade separadas. |

**Correções de precedência**: a escolha de rascunho para cada PR com publicação apenas após revisão substitui a alternativa inicialmente mencionada de publicar automaticamente todos os PRs. Em caso de falha de armazenamento, fechar sem aviso e aceitar reaparecimento; não assumir gravação remota confirmada.

## 3. Escopo, limites e invariantes

### Inclui

- Catálogo editorial e identificação estável dos comunicados; critério e evidências de compatibilidade dos recursos relevantes a investigar antes de escolher arquitetura.
- Histórico/estado de leitura por conta no backend, incluindo isolamento por `ownerEmail`, resposta de confirmação e testes entre contas.
- Cópia e fila locais por conta, compatibilidade offline comprovada, sincronização posterior e proteção contra respostas antigas ou troca de sessão.
- Modal automático e histórico em diálogo coordenado pela infraestrutura existente; acessibilidade e validação visual no mock.
- Spec durável após resolução dos bloqueios; item no roadmap; investigação e proposta de automação editorial no GitHub Actions.

### Fora de escopo ou sujeito a nova autorização

- Notificação push ou aviso com o app fechado; mudança de produto para recarregar automaticamente; implementação automática do plano técnico cancelado.
- Alterar autenticação, Google Calendar, motor de recorrência, conflitos, sync em cascata ou service worker sem confirmação específica. Se compatibilidade completa exigir mudar cache, worker, build, introduzir dependência ou alterar os limites aprovados, **parar e pedir decisão**, não ampliar escopo silenciosamente.
- Ligar CI/Actions, chamar APIs ou ferramentas de terceiros, conceder permissões ou publicar conteúdo sem revisão e autorização do dono.
- Tratar o risco existente de `controllerchange` como corrigido. O destino e prioridade dessa correção continuam com o dono.

### Invariantes

- Confirmar todos os recursos relevantes de cada comunicado; igualdade de versão do HTML ou consulta a conteúdo remoto isolada não são prova suficiente.
- Não exibir conteúdo sem prova compatível, inclusive no histórico manual; não apresentar cache ou prova antiga como atual sem validação.
- Isolamento de conta por `getOwnerEmailOrThrow(req)` em toda query privada; não confiar em `ownerEmail` fornecido pelo cliente como autoridade.
- Tentar sincronização de visto somente quando a mesma conta estiver autenticada; proteger a fila de mistura entre contas e não armazenar credenciais.
- Não interromper edição, operação, recuperação ou outro diálogo; respeitar pilha, foco e fechamento definidos pela [spec de interface](../specs/interface-e-navegacao.md).
- Sem novo build no frontend e sem dependências novas sem confirmação; preservar ordem de scripts e as regras do repositório.

## 4. Bloqueios e perguntas técnicas

| # | Questão a investigar ou decidir | Bloqueia |
|---|---|---|
| B1 | Inventário dos recursos relevantes por comunicado; como comprovar no navegador a identidade/coerência dos recursos realmente executados e como validar a prova depois de mudança de cache, rollback ou sessão. HTML isolado não basta. | Spec final, implementação de apresentação e publicação. |
| B2 | Como um cliente antigo obtém código e comprovação compatíveis sem recarga automática decidida, inclusive na primeira implantação e no modo offline. Uma solução impossível ou que dependa de mudar o worker exige retornar ao dono. | Implementação e aceite. |
| B3 | Quem fornece e mantém a lista de recursos relevantes por comunicado; versão estável e validade editorial da prova; se uma correção de backend exige prova além dos recursos frontend. | Spec final e publicação de comunicado. |
| B4 | Modelo/rotas para visto por conta, consistência entre abas/dispositivos, atualização incremental e confirmação; reconciliar pendências offline, falha de gravação local, expiração de sessão e cache de estado. | Implementação backend/frontend. |
| B5 | Sincronização posterior sem repetir efeitos perigosos: demonstrar uma operação idempotente ou outra solução segura diante de timeout/resposta perdida; preservar invariantes de gravações existentes. | Implementação de retry. |
| B6 | Geração automática de rascunho por PR: dados acessados, redator/mecanismo, permissões mínimas, PRs de fork, conteúdo privado, limites, custo e local de saída; revisão humana e nenhuma publicação automática. | Implementação/ativação de Actions e qualquer integração externa. |
| B7 | Comportamento exato quando um ou mais comunicados falham na comprovação, quando faltam dados, quando uma página foi restaurada pelo navegador e quando não há sessão; manter decisões da seção 2 e perguntar se houver nova regra. | Spec e testes correspondentes. |
| B8 | Regra editorial em casos de correção/revogação de comunicado, remoção de conteúdo, alteração posterior do texto ou histórico longo; integridade e vínculo do visto à versão do comunicado. | Spec e publicação editorial. |
| B9 | Ordem de publicações P1 backend/P2 frontend, compatibilidade retroativa entre deploys independentes, evidência de API em produção e rollback seguro, sem presumir staging ou autorização. | Publicação da frente. |

Nenhum bloqueio técnico é considerado resolvido por constar neste plano. Registrar resultados de investigação e pedir aprovação para mudanças de regra ou de escopo antes de implementar.

## 5. Critérios de aceite

- [ ] Na abertura e após login, se houver dados e prova confiáveis, mostrar em um só modal os comunicados não vistos e compatíveis, na ordem escolhida; aguardar condições protegidas e não abrir ao simples retorno à aba.
- [ ] Primeira conta recebe os comunicados disponíveis; outra conta não herda visto ou pendências. Troca de sessão fecha o conteúdo anterior sem exibi-lo à nova conta.
- [ ] A Área do usuário reabre histórico completo **filtrado pela compatibilidade comprovada**; fechamento automático e manual marcam todos os itens exibidos na respectiva lista, mesmo sem rolagem até o fim, e nunca os itens ocultos.
- [ ] O backend confirma o visto por conta; duas contas e dois dispositivos não se misturam. Falha, timeout e resposta perdida não causam regressão nem confirmam gravação não comprovada.
- [ ] Offline só exibe dados e prova confiáveis da conta correta; ao fechar, fila isolada persiste e tenta sincronizar com a mesma conta autenticada. Quando não for possível armazenar ou obter prova, seguir a decisão final de B4/B7, sem avisar falha de fechamento como sucesso remoto.
- [ ] Incompatibilidade, recursos mistos, prova ausente/antiga ou recurso relevante não comprovado impedem apresentação automática **e manual**. A viabilidade real dessa garantia deve ser demonstrada, não presumida.
- [ ] A geração de rascunho para cada PR é demonstrada sem publicação automática; somente conteúdo revisado e aprovado pelo dono vira comunicado. Automação e permissões só são ativadas após autorização específica e revisão dos dados.
- [ ] Modal tem nome acessível, foco inicial, fechamento visível, navegação por teclado, pilha correta e retorno de foco; validação no mock em 433×762/DPR 2,81, com stress em 390×844 e 320×568.
- [ ] Spec aprovada antes do código, roadmap com ponteiro, suítes afetadas medidas antes/depois, testes novos provados por mutação e riscos/limites registrados. Sem claims de produção, aceite ou correção de worker sem evidência.

## 6. Cartões e dependências

### T00 — Diagnóstico e decisões iniciais
- **Situação**: concluído nesta rodada documental. [Diagnóstico](../diagnostics/2026-11-03-diag-comunicados-novidades.md), [benchmark](../reference/benchmark-comunicados-novidades.md) e decisões da seção 2 registram a origem. O plano técnico anterior foi cancelado sem correção do worker.

### T01 — Investigar compatibilidade e viabilidade
- **Depende de**: T00. Apenas leitura, testes locais controlados e investigação documental; não alterar código do produto ou worker sem autorização.
- **Inclui**: B1–B3 e B7; inventário dos recursos relevantes, carregamento de HTML/JS/CSS e módulos compartilhados, cache HTTP e do worker, recursos mistos, prova e validade no offline, rollback, cliente antigo e recursos necessários para correções de backend.
- **Aceite**: registrar alternativas com evidências, prova discriminante e riscos; mostrar como o usuário recebe código compatível sem presumir reload; identificar requisitos externos ou mudanças de escopo. Se não for possível demonstrar a garantia, parar e consultar o dono; nunca substituir a exigência por token do HTML.

### T02 — Desenhar persistência e sincronização
- **Depende de**: T00; pode ser investigado em paralelo com T01.
- **Inclui**: B4/B5, modelo por conta, fonte confiável do estado, fila local durável e por conta, confirmação e retry seguro/idempotente, concorrência, leitura desatualizada, resposta perdida e troca de conta.
- **Aceite**: propor contrato e testes que assegurem que somente a conta autenticada seja afetada, que confirmação antiga não apague pendência nova e que falta de confirmação possa causar reapresentação sem duplicar efeitos. Não duplicar ou enfraquecer os fluxos existentes de recuperação financeira e agenda.

### T03 — Investigar rascunhos e revisão humana
- **Depende de**: T00; independente de T01/T02 para pesquisa.
- **Inclui**: B6/B8, alternativas GitHub Actions, processamento de cada PR, classificação editorial, revisão do dono, dados visíveis para o processo, PRs de fork e efeitos externos.
- **Aceite**: proposta de permissões mínimas e dados tratados, sem publicação automática; provar viabilidade de criar rascunho sem divulgar código ou dados privados a terceiros. Caso exija integração, dependência ou permissão não aprovada, interromper e pedir autorização. Pesquisa não ativa workflow.

### T04 — Aprovar spec e registrar roadmap
- **Depende de**: T01–T03 e decisões adicionais do dono. Se investigações ficarem inconclusivas, registrar bloqueio e não aprovar contrato incompleto como implementável.
- **Arquivos previstos**: `docs/specs/comunicados-novidades.md`, `docs/README.md` e `docs/roadmap-v3.md`.
- **Aceite**: contrato durável com status, casos de borda e fora de escopo; item 1.8 ou outro ID após conferir disponibilidade; ponteiro para spec; sem classificar implementação ou publicação como concluídas.

### T05 — Implementar dados e sincronização por conta
- **Depende de**: T04 e autorização de implementação; modelo/rotas apenas após prova de B4/B5.
- **Inclui**: armazenamento de visto, API autenticada com filtro por `ownerEmail`, confirmação, fila local e reconciliação segura. Arquivos específicos serão definidos no desenho, não presumidos.
- **Aceite/validação**: testes focados de backend e frontend cobrindo duas contas, isolamento, mudança de sessão, concorrência de dispositivos, offline, indisponibilidade local, timeout e resposta perdida; testes por mutação; suítes afetadas antes/depois conforme seção 7.
- **Gate de compatibilidade entre deploys**: antes de P1, comprovar que o backend novo aceita clientes antigos e que o frontend anterior continua funcionando; após P1 validar com autorização do dono que a API publicada responde e isola contas. Só propor P2 quando P1 estiver confirmado. Sem garantia ou evidência, parar.

### T06 — Implementar catálogo e comprovação
- **Depende de**: T01 e T04; autorização de implementação e, se necessário, aprovação específica para áreas sensíveis.
- **Inclui**: fonte editorial, identidade do conteúdo, critérios de prova e cache confiável. Não presume alteração no worker, token, dependência ou build.
- **Aceite/validação**: testes positivos e negativos para todos os recursos considerados relevantes, versões antigas, mistura de recursos, conteúdo inválido, rollback, alteração da prova e offline; não apresentar o que não possa ser comprovado.

### T07 — Implementar apresentação e histórico
- **Depende de**: T05/T06 e T04.
- **Inclui**: apresentação na abertura após login, modal agrupado, espera por trabalho em andamento, histórico manual sobre a Área do usuário, marcação ao fechar, troca de conta e estados sem conteúdo confiável.
- **Aceite/validação**: testes DOM e mock, foco e pilha, modais dinâmicos, uso em segundo plano/retorno conforme contrato, contas/dispositivos, conteúdo parcialmente compatível e erro; verificação visual nos três viewports.

### T08 — Automação de rascunhos com aprovação
- **Depende de**: T03/T04 e autorização explícita para adicionar ou ativar GitHub Actions e as permissões/integrações necessárias.
- **Inclui**: gerar rascunho para cada PR, permitir revisão e publicação deliberada pelo dono; não enviar dados privados para terceiros sem autorização. A ausência de decisão bloqueia somente a automação e qualquer aceitação que a exija; não autoriza substituir o requisito por uma solução manual definitiva.
- **Aceite/validação**: testes apropriados, revisão de permissões e dados, prova de que alterações internas não são publicadas sem revisão e de que falha da automação não publica conteúdo; registrar limites e autorização.

### T09 — Validação integrada e fechamento
- **Depende de**: T05–T08; publicação/aceite dependem de autorização do dono.
- **Inclui**: cenários da seção 7, revisão da spec e roadmap, resultados de mutação, decisão editorial, limites de produção e verificação autorizada após deploy.
- **Aceite**: diferenciar implementação, aceite e publicação; nenhum comunicado de teste ou deploy adicional em produção sem decisão explícita; nenhum risco de worker declarado corrigido por esta entrega.

## 7. Validação planejada

| Camada | Cenários mínimos |
|---|---|
| Compatibilidade | Recursos relevantes iguais/diferentes, HTML novo com JS antigo, cache misto, prova ausente ou alterada, rollback, primeiro carregamento, offline e cliente antigo. Confirmar que a falta de prova bloqueia modal e histórico. |
| Backend / isolamento | Contas A/B, leitura/escrita sob `ownerEmail` autenticado, chamadas tentando usar identidade de outra conta, duas abas/dispositivos, gravação idempotente, concorrência e confirmação. |
| Fila local | Conta A offline, fechamento, troca para B, retorno de A; persistência indisponível; timeout com escrita confirmada ou desconhecida; resposta antiga, repetição segura e não apagar nova pendência. |
| UI / acesso | Login tardio, primeira visita, modais em pilha, edição/recuperação/operação, agregação e ordenação, fechamento, histórico manual, informação apresentada e mudança de conta; acessibilidade e foco. |
| Editorial / Actions | Rascunho por PR, revisão do dono, PR interno/externo conforme permissões aprovadas, nenhum publish automático, dados mínimos e falhas. Não executar workflow antes da autorização. |
| Visual | Mock em 433×762/DPR 2,81; stress em 390×844 e 320×568. Testes de DOM não comprovam layout ou integração real. |

**Baseline**: medição histórica do plano anterior de 517/517 frontend não vale como contagem atual. Antes de cada alteração de código, medir a suíte afetada; repetir depois e registrar os números reais. Backend e frontend são suítes independentes. Executar primeiro testes focados e, conforme instruções do repositório, as suítes afetadas antes/depois.

## 8. Prova por mutação

| Mutação proposta | Teste deve detectar | Situação |
|---|---|---|
| Ignorar um recurso relevante ou aceitar prova ausente | Exibição indevida em modal e histórico | Não executada |
| Remover filtro de `ownerEmail` da leitura/escrita | Vazamento ou modificação entre contas A/B | Não executada |
| Enviar pendência local sob outra conta | Contaminação de estado após troca de sessão | Não executada |
| Confirmar visto sem resposta de sucesso ou apagar pendência mais nova | Perda de intenção ou confirmação falsa | Não executada |
| Remover deduplicação/idempotência de sincronização | Resultado duplicado ou regressão sob timeout e repetição | Não executada |
| Abrir comunicado enquanto outra operação/modal protege trabalho | Interrupção ou pilha de foco incorreta | Não executada |
| Publicar rascunho sem revisão do dono | Publicação não autorizada | Não executada |

Para cada teste novo, demonstrar falha com a proteção revertida/mutada, restaurar a mutação e verificar o estado do Git; registrar resultado observado, não apenas intenção.

## 9. Publicação e rollback

- Dois projetos Vercel são publicados a partir da `main` e não há staging. Como os deploys são independentes, planejar **P1 backend compatível** sem depender do frontend novo e **P2 frontend/funcionalidade** apenas após P1 estar validado; cada merge continua podendo disparar ambos os projetos. P1 não autoriza P2.
- Antes de P1, demonstrar compatibilidade retroativa e plano de falha/rollback; após autorização do dono, validar a API publicada e o isolamento por conta sem usar dados reais indevidamente. Se a validação for inconclusiva, parar antes de P2. As opções reais de prova em produção devem ser acordadas com o dono; sem staging, teste local não é prova de deploy.
- Rascunho e comunicado também têm ciclos de publicação distintos; vincular a publicação do texto à disponibilidade comprovada dos recursos relevantes. Sem comprovação, não exibir.
- O dono executa commit, push e merge; cada deploy, automação e alteração em worker dependem das autorizações aplicáveis. Não disparar PR de teste, publicar conteúdo ou habilitar workflow por conta própria.
- Rollback deve preservar isolamento e não descartar vistos/pendências por suposição. Nenhuma reversão Git comprova desfazer estado gravado no Mongo ou worker previamente instalado.
- Cabeçalhos, propagação e comportamento em aparelho real não foram medidos. Após autorização, registrar o que for possível verificar em produção e os limites remanescentes; nunca sugerir que foi validado apenas por teste local.

## 10. Registro da execução

### 2026-11-03 — Diagnóstico e plano documental

- **Base**: branch `feat/atualizacao-app`; commit `738af7b` apareceu durante a rodada por ação externa, após o diagnóstico inicial. O dono autorizou continuar preservando esse estado. O commit também removeu `.github/agents/arquiteto-software.agent.md`; remoção externa, não alterada nesta rodada.
- **Registros**: [diagnóstico](../diagnostics/2026-11-03-diag-comunicados-novidades.md) com adendo das decisões, este plano, cancelamento histórico do [plano técnico](2026-11-03-plan-atualizacao-app.md), índice e item de roadmap proposto.
- **Resultado**: escopo de comunicado separado da recarga; decisões de apresentação, compatibilidade, conta/offline e rascunhos registradas. Critérios técnicos não foram comprovados.
- **Testes e publicação**: não executados; rodada exclusivamente documental. Nenhuma implementação, ativação de Actions ou deploy realizado.

## 11. Estado de fechamento

- **Concluído**: levantamento documental e decisões iniciais de produto; T00.
- **Pendente**: investigações T01–T03, decisões B1–B9, spec, implementação, testes/mutações, autorização e validação de publicação.
- **Riscos independentes**: recarga existente no worker, propagação/cache de produção, disponibilidade do mecanismo de prova, sincronização offline e dados acessados por Actions.
- **Aceite / publicação**: não emitidos. Plano aberto.
