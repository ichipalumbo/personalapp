# Diagnóstico — Comunicados de novidades e correções

> **Status**: Concluído no recorte documental · **Criado/Atualizado**: 2026-11-03
> **Pergunta**: como comunicar novidades e correções ao usuário quando ele retorna ao app, permitir que feche o comunicado e volte a consultá-lo depois, sem confundir isso com a atualização técnica do aplicativo?
> **Base**: código `1ff3ca374443c6292c3518c1095054382ab8ce93`; documentação até `b8959ec`, com plano técnico modificado e benchmark ainda não commitados na branch `feat/atualizacao-app`.
> **Método**: síntese da conversa, da auditoria anterior e da [referência de benchmark](../reference/benchmark-comunicados-novidades.md); leitura dirigida do plano anterior e de fontes locais já examinadas.
> **Limite**: não foram realizados novos testes, deploy, acesso à produção ou pesquisa adicional nesta rodada. A conclusão é sobre o recorte investigado, não aprovação de solução ou implementação. Decisões ainda abertas permanecem identificadas abaixo.

## 1. Objetivo esclarecido pelo dono

O dono deseja comunicar ao usuário final funcionalidades novas e correções de bugs. A ideia apresentada é abrir um comunicado quando a pessoa abre o app após um longo período, mantê-lo fechado depois que ela o fechar e oferecer acesso fácil ao conteúdo na Área do usuário.

**Ainda não definido**: quantos dias representam um longo período, se esse prazo é necessário, como tratar a primeira visita, como registrar que foi fechado, o conteúdo de comunicados acumulados e o comportamento entre dispositivos ou contas. As alternativas do benchmark são recomendações, não decisões do dono.

## 2. Origem da frente e mudança de entendimento

1. A investigação inicial procurou detectar versões publicadas e aplicar a atualização sem interromper uma edição. O [diagnóstico técnico anterior](2026-11-03-diag-atualizacao-app.md) e o [plano técnico](../plans/2026-11-03-plan-atualizacao-app.md) registram aquela frente.
2. Uma auditoria posterior apontou riscos na identificação da versão carregada, na proteção de operações, na transição de clientes antigos e na confirmação da recarga. O plano técnico foi replanejado com guardas e publicação em etapas; a implementação não foi iniciada.
3. O dono esclareceu que o resultado principal desejado é **comunicar novidades e correções**, com dispensa e acesso posterior. Solicitou um mini benchmark antes de continuar.
4. A [pesquisa de referência](../reference/benchmark-comunicados-novidades.md) encontrou exemplos de notas de versão consultáveis e de avisos dispensáveis, mas não uma regra de mercado comprovada para um prazo mínimo de ausência.
5. Na conversa, foi recomendado priorizar o comunicado e separar a necessidade de recarga técnica. O dono concordou em avançar para um novo plano de comunicados. O encaminhamento formal do plano técnico anterior ainda precisa ser explicitado; nenhum documento antigo foi apagado nem dado como implementado.

## 3. Fatos, inferências e limites

| Classificação | Registro |
|---|---|
| **Pedido do dono** | Comunicar novidades e correções, abrir um comunicado no retorno após longo período, permitir fechar e reabrir pela Área do usuário. |
| **Fato documental** | O plano técnico anterior trata “o que há de novo” como fora de escopo e busca detecção de versão e recarga; ele não implementa o objetivo agora esclarecido. |
| **Fato observado no código** | O [service worker](../../sw.js) usa `skipWaiting()` e `clients.claim()`; [service-worker.js](../../assets/js/app-shell/service-worker.js) recarrega em `controllerchange`. A [Área do usuário](../../assets/js/settings-modal.js) exige sessão ativa para abrir. |
| **Evidência externa** | Os exemplos de VS Code e GitHub Desktop mostram mecanismos de notas ou aviso dispensável; Notion e Slack mantêm notas consultáveis. A [referência](../reference/benchmark-comunicados-novidades.md) aponta as fontes primárias e seus limites. |
| **Inferência** | Um comunicado editorial pode ser desenhado independentemente de uma recarga automática. Lê-lo não comprova que o código efetivamente carregado corresponda ao conteúdo comunicado. |
| **Risco não reproduzido nesta rodada** | Uma troca do worker pode atingir uma aba executando o listener antigo e causar recarga sem a guarda proposta. Isso exige validação própria e não é resolvido apenas por mudar o objetivo desta frente. |
| **Não verificado** | Experiência dos produtos em conta real; comportamento de clientes antigos em navegador; cache e propagação da Vercel; experiência no aparelho do dono e abrangência da dispensa entre dispositivos. |

## 4. Síntese do benchmark

- **VS Code**: disponibiliza notas de versão e uma configuração para mostrá-las após atualização; é exemplo de interface desktop, não prova de comportamento para PWA.
- **GitHub Desktop**: oferece aviso com acesso às novidades e dispensa, registrando localmente a versão vista no código consultado. O trecho não demonstra sincronização entre dispositivos.
- **Notion e Slack**: apresentam notas públicas de lançamentos, melhorias ou correções. As páginas consultadas não demonstram o gatilho exato de um modal na abertura.
- **Plataforma web**: o armazenamento local pode sobreviver a sessões, mas pertence à origem e pode ser apagado ou estar indisponível; `sessionStorage` isolado por aba não atende sozinho à persistência por vários dias. O W3C descreve requisitos de acessibilidade para diálogos. As fontes e ressalvas estão na [referência do benchmark](../reference/benchmark-comunicados-novidades.md).

A amostra é pequena e não comprova um padrão único de mercado nem uma quantidade recomendada de dias de ausência.

## 5. Distinção entre comunicado e atualização técnica

| Dimensão | Pergunta | Limite |
|---|---|---|
| **Comunicado editorial** | O que mudou para o usuário e qual comunicado ele já fechou? | Exibir a mensagem não instala código novo nem comprova que a feature comunicada esteja disponível na sessão atual. |
| **Atualização técnica** | Que código foi carregado e como uma nova versão passa a controlar a página? | Resolver isso pode exigir tratar cache, worker, operações em andamento e clientes antigos; não é automaticamente necessário para publicar uma mensagem. |

**Recomendação para discussão**: definir uma frente própria para o comunicado, sem pressupor comparação de versão técnica, recarga automática ou as etapas P1/P2 do plano anterior. O comportamento existente do service worker deve continuar registrado como risco independente, com eventual tratamento sujeito a decisão e autorização específicas.

## 6. Riscos e pontos a decidir

| Tema | Questão / impacto | Situação |
|---|---|---|
| Gatilho e ausência | Mostrar novidades não vistas na próxima abertura ou somente após período mínimo? Definir abertura, aba restaurada e primeira visita. | Pendente. |
| Conteúdo acumulado | Definir se o app apresenta apenas o comunicado mais recente, resume vários não vistos ou mantém histórico consultável. | Pendente. |
| Dispensa | Definir identidade do comunicado, o que conta como fechado e se novo comunicado deve aparecer após um anterior ser dispensado. | Pendente. |
| Conta e dispositivo | Definir se o fechamento vale apenas no navegador/dispositivo ou acompanha a conta; considerar troca de conta, limpeza ou falha do armazenamento. | Pendente. |
| Segurança de uso | Definir quando o comunicado pode abrir sem interromper login, outro diálogo, edição, recuperação ou operação em andamento; preservar acessibilidade e foco. | Pendente. |
| Disponibilidade | Decidir como lidar com conteúdo ausente, inválido, offline ou potencialmente em cache; não afirmar que o usuário recebeu a versão técnica correspondente. | Pendente. |
| Publicação editorial | Definir responsável por escrever, revisar e publicar, que alterações merecem comunicado e como evitar anunciar funcionalidade indisponível. | Pendente. |
| Worker existente | Recarga em `controllerchange` é independente do comunicado e permanece risco a validar. | Fora da solução presumida; destino e prioridade sujeitos ao dono. |
| Plano anterior | Definir o status e a relação documental com a nova frente, preservando histórico e alterações existentes. | Pendente. |

## 7. Critério para abrir o novo plano

O recorte documental identifica o objetivo, as evidências e as perguntas principais. Um novo plano pode ser elaborado após discutir com o dono as decisões de escopo e comportamento relevantes, apontando para este diagnóstico e para a referência de benchmark. Decisões abertas não devem ser convertidas em regras por suposição; contrato durável aprovado pertence à spec correspondente. Esta investigação não autoriza alteração de código, publicação ou mudança de service worker.

## 8. Adendo — decisões posteriores do dono em 2026-11-03

As perguntas acima preservam o estado do levantamento original. Após sua redação, o dono decidiu discutir e abrir uma frente de comunicados; a referência detalhada das decisões e da execução é o [novo plano](../plans/2026-11-03-plan-comunicados-novidades.md). O plano técnico anterior foi cancelado preservando seu histórico; o risco do worker continua sem correção e requer decisão separada.

- **Gatilho**: na abertura ou recarga, apresentar comunicados não vistos; primeira visita também recebe os disponíveis. Apenas voltar a uma aba aberta não é nova abertura. Aguardar login e demais condições seguras.
- **Experiência**: modal com novidades e correções; reunir não vistos do mais recente para o mais antigo; aguardar fim de outros diálogos, edição, recuperação e operações. A Área do usuário oferece histórico em diálogo próprio sobre ela.
- **Dispensa**: ao fechar a apresentação automática ou o histórico manual, marcar todos os comunicados exibidos naquela lista, mesmo sem rolar até o final; itens ocultos por falta de prova não são marcados. O estado acompanha a conta entre dispositivos apenas após confirmação do backend. Ao trocar de conta, fechar o comunicado anterior e carregar o estado da conta atual.
- **Offline e falhas**: usar cópia local quando confiável e disponível; sem dados confiáveis, aguardar. Ao fechar sem gravação, não avisar que poderá reaparecer; registrar pendência local por conta e tentar sincronizar quando a mesma conta estiver autenticada e online. Ausência de confirmação pode causar reapresentação. Aceita-se apresentação simultânea em dispositivos antes da confirmação.
- **Conteúdo e automação**: manter histórico de comunicados publicados e comunicar apenas novidades/correções relevantes. Gerar rascunho para cada PR, mas só publicar após revisão do dono; estudar GitHub Actions com revisão de dados e autorização específica antes de ativar.
- **Compatibilidade**: exibir apenas comunicados cuja compatibilidade dos recursos relevantes com o código carregado possa ser comprovada. Investigar quais recursos são relevantes por comunicado; se não for possível comprovar, aguardar e também ocultar do histórico. Offline só apresentar quando conteúdo e comprovação correspondentes estiverem disponíveis e forem confiáveis.
- **Roadmap**: registrar item próprio para comunicados com ponteiro para a futura spec. As escolhas acima não autorizam implementação, automação, publicação ou mudanças no worker.

**Limites remanescentes**: a prova técnica da compatibilidade completa, atualização de clientes em código antigo, fonte e validade da prova offline, sincronização idempotente e autorização da automação ainda exigem investigação. O próprio novo requisito de compatibilidade pode exigir reavaliar escolhas técnicas descartadas antes; nenhuma alternativa técnica foi aprovada por este adendo.
