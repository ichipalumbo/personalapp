# Roadmap de Melhorias — Agenda Personal Trainer (Prô Josy)

> **Status**: Roadmap oficial · **Atualizado**: 2026-10-17
> Índice de evolução do produto: problemas a resolver, entregas, dependências e decisões pendentes.
> Substitui o [roadmap anterior](roadmap-v1.md), renomeado pelo dono e preservado como registro para consulta histórica.

## Como usar

- Este é o único roadmap mantido. Os IDs anteriores foram preservados; sua numeração não define prioridade nem ordem de execução.
- A priorização continua com o dono. Esta reorganização não escolhe o próximo item nem aprova soluções ainda em avaliação.
- `[ ]` = pendente; `[~]` = em andamento ou parcialmente implementado; `[x]` = entrega concluída no escopo registrado; `[→]` = consolidado em outro item.
- Conclusão de uma entrega não comprova publicação de complementos posteriores. Quando houver integração pendente, ela é indicada separadamente.
- Esforços são estimativas relativas herdadas do planejamento, não compromissos de prazo. Confirmar após definir o escopo.
- Regras vigentes e casos de borda pertencem às specs; execução, testes, mutações e aceite pertencem aos planos. Este índice aponta para essas fontes, sem reproduzi-las.

## Backlog operacional

Itens mapeados para a operação do personal trainer. Estar nesta seção não significa ter execução ou escopo aprovados.

### [ ] 1.2 Relatório de faturamento exportável

- **Resultado esperado**: consultar e exportar o faturamento de um período por aluno, com valores e situação de pagamento, sem reimplementar o cálculo financeiro.
- **Decidir antes**: CSV, Excel ou PDF; critério de período; inclusão de ciclos vigentes ainda sujeitos a mudança ou somente fechados/pagos.
- **Esforço**: baixo para a proposta mínima em CSV; outros formatos dependem do escopo escolhido.
- **Referência**: [spec de Finanças](specs/financas-ciclo-cobranca.md), modelo `CicloFinanceiro` e contratos da API. A exportação ainda precisa de definição própria.

### [ ] 1.4 Contato rápido via WhatsApp

- **Resultado esperado**: iniciar uma conversa a partir do telefone cadastrado no card do aluno, sem copiar o número manualmente.
- **Decidir antes**: tratamento de telefone ausente ou inválido e normalização do número para o link.
- **Esforço**: muito baixo; a proposta atual é somente um atalho de contato, não envio automático de cobrança.
- **Referência**: [tela de Alunos](../assets/js/view-alunos.js); sem spec própria ainda.

### [ ] 1.5 Presença, falta e cancelamento pelo aluno

- **Resultado esperado**: distinguir falta e cancelamento pelo aluno de exclusão/cancelamento pelo personal trainer, permitindo evoluir a cobrança de forma explícita.
- **Decidir antes**: estados de presença e suas consequências financeiras; não derivar regras de cobrança sem aprovação.
- **Risco/dependência**: altera contagem financeira; ampliar a proteção do item 3.1 é recomendado antes da implementação.
- **Esforço**: médio.
- **Referência**: [spec de Finanças, seção 5.9](specs/financas-ciclo-cobranca.md) e [spec de Reposições](specs/reposicoes-e-competencia.md). A evolução exige revisar os contratos vigentes.

### [ ] 1.6 Lembrete de aniversário do aluno

- **Resultado esperado**: registrar a data de nascimento e destacar aniversariantes para facilitar o relacionamento com os alunos.
- **Decidir antes**: apresentação por semana ou mês e escopo do indicador na Home.
- **Esforço**: baixo.
- **Referência**: [cadastro de Alunos](../assets/js/view-alunos.js) e [Home](../assets/js/view-home.js); sem spec própria ainda.

### [ ] 1.7 Busca e filtros na lista de alunos

- **Resultado esperado**: localizar um aluno por nome sem percorrer toda a lista.
- **Decidir antes**: somente busca por nome ou também novos filtros, como dia de treino.
- **Situação atual**: os antigos filtros de status/objetivo foram removidos; por isso o item deixa de ser descrito como parcialmente entregue.
- **Esforço**: muito baixo para busca por nome; reavaliar se houver filtros adicionais.
- **Referência**: [tela de Alunos](../assets/js/view-alunos.js); sem spec própria ainda.

## Confiabilidade e infraestrutura

### [ ] 2.2 Consolidar os gatilhos de sincronização

- **Resultado esperado**: reduzir consultas redundantes e tornar previsível a coordenação entre boot, mudança de sessão e retorno à aba.
- **Decidir antes**: desenho da coordenação, preservando a leitura segura já entregue no item 2.4.
- **Risco/dependência**: integração com GCal é área sensível; autorização específica antes de alterar esse caminho. O item 2.4 já está concluído e não deve ser reimplementado.
- **Esforço**: baixo–médio.
- **Referência**: [spec de GCal, seção 9.14](specs/gcal-sync.md) e [plano B2](plans/2026-09-30-plan-b2-sync-boot.md).

### [ ] 2.3 Ampliar a janela do full sync

- **Resultado esperado**: recuperar bloqueios externos além da janela atual quando a leitura incremental não os trouxer de volta.
- **Decidir antes**: nova janela e seus limites de custo/volume de leitura no Google Calendar.
- **Risco/dependência**: altera sincronização com estado remoto; requer autorização específica e validação do caminho real.
- **Esforço**: médio.
- **Referência**: [spec de GCal, seção 5.2](specs/gcal-sync.md); detalhar o novo escopo antes de implementar.

### [ ] 3.1 Ampliar a cobertura das regras financeiras

- **Resultado esperado**: identificar e cobrir casos financeiros e de reposição ainda sem proteção automatizada, reduzindo risco de cobrança incorreta.
- **Próximo passo**: inventariar as lacunas reais da suíte atual e definir os casos de aceite; não usar contagens históricas como diagnóstico de cobertura.
- **Situação atual**: existe cobertura de negócio no backend e cobertura parcial de lógica/DOM no frontend. Render do Dia, conflitos e modais receberam testes no item 0.12; isso não equivale a cobertura visual completa.
- **Esforço**: baixo, sujeito ao inventário; sem dependência de implantação de ambiente.
- **Referência**: [spec de Finanças](specs/financas-ciclo-cobranca.md), [spec de Reposições](specs/reposicoes-e-competencia.md), [plano de cobertura frontend encerrado](plans/2026-10-12-plan-cobertura-render-conflitos-modais.md) e [execução das suítes](setup-ambiente-local.md).

### [ ] 5.10 Aplicação da identidade visual Personal Josy

- **Resultado esperado**: app e PWA identificados como Personal Josy com a identidade do guia v3 (logo no cabeçalho, nome exibido, ícones de instalação, paleta do guia e Poppins) e alvos de toque do topo ampliados, absorvendo o item 5.9.
- **Decidido**: contrato na [spec de identidade](specs/identidade-e-apresentacao-publica.md); sequência em etapas numa branch única, com um só PR, registrada no plano. Etapa 1 (logo no cabeçalho e área de toque de 44×44 no topo) implementada na branch.
- **Decidir antes**: cor de tema, mapeamento das cores sem correspondente na paleta e pesos da Poppins, cada um na sua etapa.
- **Risco/dependência**: o botão Google é área de autenticação (só área de toque, com aviso prévio); ícones e manifest afetam instalações existentes; a recoloração depende da etapa de variáveis de cor.
- **Esforço**: médio, distribuído em etapas.
- **Referência**: [plano da frente](plans/2026-10-17-plan-aplicacao-identidade-visual.md), [guia de identidade visual v3](reference/identidade/guia-identidade-visual-v3.md) e [ambiente de validação mobile](setup-ambiente-local.md).

## Iniciativas em avaliação

Possibilidades de evolução, não compromissos de entrega. As soluções técnicas citadas no planejamento anterior precisam de confirmação antes de virarem contratos.

### [ ] 4.1 Cobrança automatizada

- **Resultado esperado**: gerar cobranças e reconciliar pagamentos com menos trabalho manual.
- **Decidir antes**: gateway, meios de pagamento, ambiente de teste, falhas e estorno/reabertura; estes últimos não estão cobertos pelo contrato financeiro vigente.
- **Dependências**: ampliar a proteção do item 3.1; ambiente dos itens 3.2–3.4 já entregue.
- **Esforço**: alto.
- **Referência**: [spec de Finanças](specs/financas-ciclo-cobranca.md); exige desenho próprio antes da integração.

### [ ] 4.2 Notificações automáticas

- **Resultado esperado**: reduzir esquecimentos de aulas e cobranças com lembretes para o personal trainer e/ou aluno.
- **Decidir antes**: destinatários, eventos, canal (Web Push ou WhatsApp) e mecanismo de agendamento no backend.
- **Esforço**: alto.
- **Referência**: [contexto e alternativas anteriores](roadmap-v1.md); a infraestrutura PWA existente não representa uma integração de notificações entregue.

### [ ] 4.3 Portal ou app do aluno

- **Resultado esperado**: dar ao aluno acesso à própria agenda e aos pagamentos, reduzindo consultas por mensagem.
- **Decidir antes**: escopo inicial e autorização entre os papéis de personal trainer e aluno sobre os mesmos dados.
- **Risco**: o isolamento atual por conta não implementa esse compartilhamento; não ampliar acesso por inferência.
- **Esforço**: muito alto.
- **Referência**: [regras de isolamento](../.github/copilot-instructions.md) e [contexto anterior](roadmap-v1.md); exige desenho próprio.

### [ ] 4.4 Avaliação física, anamnese e evolução

- **Resultado esperado**: acompanhar avaliações e evolução do aluno em um histórico próprio.
- **Decidir antes**: dados da primeira entrega, inclusão de fotos, privacidade e armazenamento/upload.
- **Esforço**: alto.
- **Referência**: [contexto e escopo exploratório anteriores](roadmap-v1.md); ainda não existe spec desta iniciativa.

### [ ] 4.5 Multi-personal e gestão de equipe

- **Resultado esperado**: atender estúdios ou academias com profissionais e alunos compartilhados.
- **Decidir antes**: demanda por esse modelo, hierarquia de equipe, vínculos e permissões.
- **Risco**: exige revisar a autorização atual; não é uma extensão pequena do isolamento por conta.
- **Esforço**: muito alto.
- **Referência**: [regras de isolamento](../.github/copilot-instructions.md) e [contexto anterior](roadmap-v1.md); exige desenho próprio.

### [ ] 4.6 Auditoria de alterações

- **Resultado esperado**: consultar quem alterou o quê e quando em cadastros, agenda e valores.
- **Decidir antes**: eventos cobertos e desenho do registro de auditoria.
- **Situação atual**: snapshots financeiros preservam preços por ciclo, mas não substituem um histórico geral de alterações.
- **Esforço**: médio–alto.
- **Referência**: [spec de Finanças](specs/financas-ciclo-cobranca.md) para os snapshots e [contexto anterior](roadmap-v1.md) para a proposta transversal.

### [ ] 4.8 Contrato e assinatura digital

- **Resultado esperado**: formalizar termos e documentos assinados pelo aluno.
- **Decidir antes**: documentos, fluxo de assinatura, serviço externo e armazenamento seguro.
- **Esforço**: alto.
- **Referência**: [contexto e alternativas anteriores](roadmap-v1.md); ainda não existe spec desta iniciativa.

### [ ] 4.9 Persistência de login com sessão própria do backend

- **Resultado esperado**: reduzir pedidos de login após a expiração da credencial Google e a retomada do PWA.
- **Decidir antes**: duração, renovação, revogação/logout e transição compatível. Sessão própria é a proposta técnica registrada, não uma implementação aprovada por este índice.
- **Risco**: autenticação é área sensível; confirmar o desenho e a autorização antes de alterar tokens ou armazenamento.
- **Esforço**: médio.
- **Referência**: [regras para autenticação](../.github/copilot-instructions.md) e [proposta anterior](roadmap-v1.md); exige contrato próprio.

## Entregas concluídas

Cada ID aparece uma vez no acompanhamento. Detalhes de implementação e medições permanecem nas referências; uma ressalva não implica reabrir o escopo entregue.

| ID | Estado | Resultado entregue | Referência |
|---|---|---|---|
| 0.1 | `[x]` | Histórico de ciclos e extrato preservam expansão no re-render | [Registro anterior](roadmap-v1.md) |
| 0.2 | `[x]` | Módulos compartilhados consolidados dentro do backend | [Arquitetura](../.github/copilot-instructions.md) |
| 0.3 | `[x]` | CSS órfão da visão mensal e do KPI removido | [Aprendizados e cuidados preservados](reference/APRENDIZADOS.md) |
| 0.4 | `[x]` | Documentação organizada em fontes com funções distintas | [Índice documental](README.md) |
| 0.5 | `[x]` | Collection de reposições e cobrança por competência | [Spec de Reposições](specs/reposicoes-e-competencia.md) |
| 0.6 | `[x]` | Extrato explica a composição da cobrança do ciclo | [Spec de Reposições](specs/reposicoes-e-competencia.md) |
| 0.7 | `[x]` | Validade e expiração lazy de reposições | [Spec de Reposições](specs/reposicoes-e-competencia.md) |
| 0.8 | `[x]` | Avisos de reposição próxima do vencimento | [Regra vigente, seção 6.5](specs/reposicoes-e-competencia.md) |
| 0.9 | `[x]` | Cálculo de prazo exposto em módulo compartilhado único | [Spec de Reposições](specs/reposicoes-e-competencia.md) |
| 0.10 | `[x]` | Declaração redundante do cálculo de prazo removida | [Spec de Reposições, seção 13](specs/reposicoes-e-competencia.md) |
| 0.11 | `[x]` | Reenvio reabre a reposição original sem duplicar cobrança; correção dos dados concluída pelo dono | [Diagnóstico e registro](diagnostics/2026-09-21-diag-0-11-duplicata-cobranca-reenvio-reposicao.md) |
| 0.12 | `[x]` | Cobertura de render do Dia, conflitos e fluxos principais dos modais | [Plano encerrado e limites](plans/2026-10-12-plan-cobertura-render-conflitos-modais.md) |
| 1.1 | `[x]` | Pagamentos, inadimplência e cobrança por ciclo | [Spec de Finanças](specs/financas-ciclo-cobranca.md) |
| 1.3 | `[x]` | Observações no cadastro e card do aluno; não representa anotação por aula | [Registro anterior](roadmap-v1.md) |
| 1.8 | `[→]` | Avisos de aulas a repor consolidados no item 0.8 | [Regra de reposições](specs/reposicoes-e-competencia.md) |
| 1.9 | `[x]` | Pagamento e ajuste de ciclo histórico ainda não pago | [Spec de Finanças, seção 6.3](specs/financas-ciclo-cobranca.md) |
| 1.10 | `[x]` | Histórico de reposições e reagendamento contextual no card do aluno | [Contrato](specs/reposicoes-e-competencia.md) e [complementos recentes](plans/2026-10-13-plan-melhorias-fluxos-ux.md) |
| 1.11 | `[x]` | Atualização manual de leitura em Finanças, com recuperação e feedback localizado | [Contrato](specs/financas-ciclo-cobranca.md) e [aceite/publicação](plans/2026-10-13-plan-melhorias-fluxos-ux.md) |
| 2.1 | `[x]` | Séries GCal com RRULE, EXDATE e renovação ativa do canal | [Spec de GCal e ressalvas](specs/gcal-sync.md) |
| 2.4 | `[x]` | Revalidação segura do cache no boot, publicada pelo PR #70 | [Contratos](specs/financas-ciclo-cobranca.md) e [plano/aceite B2](plans/2026-09-30-plan-b2-sync-boot.md) |
| 3.2 | `[x]` | Backend executável localmente | [Setup](setup-ambiente-local.md) |
| 3.3 | `[x]` | Frontend local com configuração de API local | [Setup](setup-ambiente-local.md) |
| 3.4 | `[x]` | Banco de desenvolvimento separado | [Setup](setup-ambiente-local.md) |
| 3.5 | `[x]` | Suíte independente de frontend, hoje com cobertura parcial de lógica/DOM | [Setup](setup-ambiente-local.md) |
| 4.7 | `[x]` | Cobrança baseada nas ocorrências reais da janela do ciclo | [Spec de Finanças](specs/financas-ciclo-cobranca.md) |
| 5.1 | `[x]` | Formulários e diálogos mobile | [Plano da Etapa 1](plans/2026-09-24-plan-etapa-1-formularios-dialogos-mobile.md) |
| 5.2 | `[x]` | Legibilidade e toque; resíduo do topo mantido no item 5.9 | [Plano da Etapa 2](plans/2026-09-26-plan-etapa-2-legibilidade-toque-cartoes.md) |
| 5.3 | `[x]` | Navegação inferior e topo operacional; FABs unificados em complemento posterior | [Etapa 3](plans/2026-09-27-plan-etapa-3-navegacao-e-topo-cartoes.md) e [complemento](plans/2026-10-13-plan-melhorias-fluxos-ux.md) |
| 5.4 | `[x]` | Cards mais enxutos e detalhes expansíveis | [Plano da Etapa 4](plans/2026-09-27-plan-etapa-4-densidade-cards-cartoes.md) |
| 5.5 | `[x]` | Eventos simultâneos com apresentação híbrida no Dia | [Plano da Etapa 5](plans/2026-09-27-plan-etapa-5-eventos-simultaneos.md) |
| 5.6 | `[x]` | Erros e toasts unificados; apresentação de carga financeira refinada posteriormente | [Etapa 6](plans/2026-09-29-plan-etapa-6-toast-unificado.md) e [refinamento](plans/2026-10-13-plan-melhorias-fluxos-ux.md) |
| 5.7 | `[x]` | Consistência, acessibilidade e navegação persistida | [Etapa 7](plans/2026-10-01-plan-etapa-7-consistencia-acessibilidade.md) e [validação](plans/2026-10-05-plan-validacao-etapa-7-branch.md) |
| 5.8 | `[x]` | Skeletons padronizados e indicação de cache; B2 entregue separadamente no item 2.4 | [Plano de skeletons/cache](plans/2026-09-30-plan-skeletons-cache.md) |
| 5.9 | `[→]` | Alvos de toque do cabeçalho e toolbar consolidados no item 5.10; inventário refeito e ampliação implementada na etapa 1 | [Plano da identidade visual](plans/2026-10-17-plan-aplicacao-identidade-visual.md) |

## Ressalvas e fontes

- **Integração pendente**: complementos de 1.10/5.3 e a entrega de 1.11 têm aceite mobile relatado no deploy específico da branch; PR/merge para a `main` continuam com o dono, conforme o [fechamento da frente UX](plans/2026-10-13-plan-melhorias-fluxos-ux.md). Isso não reabre funcionalidades publicadas anteriormente nem equivale a integração desses complementos.
- **Google Calendar**: o item 2.1 preserva a ressalva de que o gatilho automático de renovação no boot não foi observado isoladamente. Defeitos e limites de I/O real permanecem na [spec de GCal](specs/gcal-sync.md).
- **Validação visual**: testes de lógica/DOM não comprovam pixels, gestos físicos ou todos os fluxos. Usar o [mock e os viewports de referência](setup-ambiente-local.md), com limites registrados em cada plano.
- **Regras de produto**: consultar [Finanças](specs/financas-ciclo-cobranca.md), [Reposições](specs/reposicoes-e-competencia.md) e [GCal](specs/gcal-sync.md). A regra antiga de alerta do item 0.8 não prevalece sobre a spec vigente.
- **Riscos conhecidos**: consultar [Aprendizados](reference/lessons-learned.md); seu inventário não foi revalidado integralmente nesta reorganização nem convertido automaticamente em novos itens.
- **Migração em andamento**: conhecimento técnico de CSS, cobertura e ambiente está sendo incorporado às fontes responsáveis, com origem/destino no [plano de migração](plans/2026-10-14-plan-migracao-documental.md). Isso não significa migração completa do v1. A seção 9.4 da spec de Reposições conserva o título “PENDENTE” e ainda exige reconciliação; os demais riscos não foram revalidados integralmente.

## Compatibilidade de IDs

Os IDs atuais não mudam. Para interpretar documentos anteriores à renumeração de 2026-08-26:

| ID antigo | ID atual |
|---|---|
| 2.10 | 2.2 |
| 2.11 | 2.3 |
| 2.2 | 4.1 |
| 2.3 | 4.2 |
| 2.4 | 4.3 |
| 2.5 | 4.4 |
| 2.6 | 4.5 |
| 2.7 | 4.6 |
| 2.8 | 4.7 |
| 2.9 | 4.8 |

Seções de specs têm numeração independente. O item atual 2.4 é o B2, não o antigo Portal do aluno.

## Manutenção

- Atualizar este arquivo, sem criar novas versões paralelas. O nome `roadmap-v3.md` é a exceção autorizada nesta substituição.
- Acrescentar detalhe a um item próximo da execução no diagnóstico/plano apropriado; não criar specs para todas as ideias distantes apenas para preencher uma referência.
- Ao concluir, resumir o resultado em uma linha e apontar para a fonte. Preservar em uma nota curta somente bloqueios, ressalvas e integração ainda pendentes.
- Registrar contagens de testes, provas por mutação, commits, medições e relatos de aceite no plano da frente, não no roadmap.
- Antes de retirar informação única, confirmar sua preservação no documento responsável. O arquivo anterior permanece como registro, não como fonte de regra vigente ou segundo backlog ativo.

**Referências editoriais**: [roadmaps de alto nível e horizontes flexíveis — Atlassian](https://www.atlassian.com/agile/product-management/roadmaps), [roadmap estratégico — ProductPlan](https://www.productplan.com/glossary/product-roadmap/) e [separação da documentação conforme a necessidade do leitor — Diátaxis](https://diataxis.fr/). A estrutura foi adaptada ao tamanho e às convenções deste projeto; não pressupõe ferramenta nova nem calendário de entrega.