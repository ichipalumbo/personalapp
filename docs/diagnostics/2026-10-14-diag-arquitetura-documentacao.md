# Diagnóstico — Arquitetura e finalidade da documentação

> **Status**: Concluído · **Criado**: 2026-10-14 · **Atualizado**: 2026-10-14
> **Responsável pela análise**: GitHub Copilot · **Dono das decisões**: dono do repositório
> **Base**: branch `docs/auditoria-roadmap`, com alterações documentais anteriores preservadas.

## 1. Pergunta investigada

Qual é a finalidade de cada pasta e documento de `docs/`, especialmente specs, planos e diagnósticos, e como impedir que informações de natureza diferente disputem autoridade?

## 2. Escopo e limites

- Inventário estrutural de todos os arquivos de `docs/` e classificação individual por finalidade.
- Leitura aprofundada das convenções e de trechos que distinguem contrato de produto, investigação, execução e referência operacional.
- Benchmark de fontes públicas, com adaptação explícita ao tamanho e às convenções do projeto.
- Registro das definições permanentes no [índice documental](../README.md), sem transformar este diagnóstico em manual normativo.
- `reports/` e `archive/` ficam congelados, sem novos arquivos, exclusões ou migração, por confirmação do dono nesta rodada.
- Não mover conteúdo do roadmap ou de outros documentos; não reescrever planos/diagnósticos históricos, specs, regras de negócio ou código de produção.
- Não revalidar produção, Google Calendar, banco, suítes de produto ou toda afirmação técnica histórica. A auditoria é documental, não uma certificação funcional.

## 3. Hipótese inicial e teste discriminante

**Hipótese**: as pastas existentes podem ser mantidas, mas falta separar finalidade, autoridade e ciclo de vida. Esse problema permite que uma spec acumule backlog/relato de correção, que um diagnóstico vire plano de execução e que um plano fechado seja lido como regra vigente.

**Como disconfirmar**: encontrar definições atuais e consistentes desses três eixos no índice/instruções, e exemplos de documentos que as respeitem sem ressalvas. Comparar o conteúdo, não apenas o nome da pasta.

**Primeiros indícios a verificar**: o [índice](../README.md) ainda permite relatórios novos apesar do congelamento confirmado; o diagnóstico mobile se apresenta como “Auditoria e Plano de Execução”; specs possuem seções de bugs/entregas que podem misturar contrato e andamento.

## 4. Método

1. Inventariar caminhos, títulos, cabeçalhos, seções e links locais de todos os documentos existentes.
2. Classificar individualmente o propósito esperado e o papel observado; separar achado confirmado de hipótese de desatualização.
3. Aprofundar as leituras de spec, plano e diagnóstico e conferir os documentos periféricos de referência, operação e histórico.
4. Confrontar as convenções com os benchmarks; não tratar taxonomias de mercado como obrigação de criar mais pastas ou ferramentas.
5. Registrar achados e pendências aqui, normas permanentes no índice e a execução no plano desta frente.
6. Validar links, cobertura do inventário e preservação dos documentos fora do escopo de edição.

## 5. Benchmarks consultados

| Fonte | Uso nesta auditoria | Limite da comparação |
|---|---|---|
| [Diátaxis](https://diataxis.fr/) | Separar documentação pela necessidade do leitor: orientação prática, referência e explicação | Não é uma taxonomia de gestão de projetos; não define por si só plano ou diagnóstico |
| [Atlassian — PRD](https://www.atlassian.com/agile/product-management/requirements) | Definir propósito, comportamento esperado, requisitos, perguntas e fora de escopo | A spec local combina requisitos funcionais com contratos técnicos; não será convertida em PRD corporativo |
| [Atlassian — planejamento](https://www.atlassian.com/work-management/project-management/project-planning) | Distinguir objetivos, tarefas, dependências, responsáveis e aceite de uma frente | Não implica introduzir cronograma rígido, orçamento ou nova ferramenta para este projeto |
| [Google SRE — postmortems](https://sre.google/sre-book/postmortem-culture/) | Fundamentar investigação por fatos, impacto, causas e limites, sem atribuição de culpa | Diagnóstico anterior à correção não é sinônimo de postmortem de incidente |
| [Microsoft Azure — ADR](https://learn.microsoft.com/en-us/azure/well-architected/architect-role/architecture-decision-record) | Preservar contexto, alternativas, consequências e motivo de uma decisão relevante | Não torna a spec imutável como um ADR aceito nem exige uma pasta nova; adaptar o fundamento às decisões já presentes |

Conteúdo sintetizado e adaptado; as fontes não prescrevem os nomes de pastas deste repositório. A tentativa de consultar a página inicial de ADRs da AWS retornou erro; ela não fundamenta conclusões nesta versão.

## 6. Estado medido e cobertura

- **Base de entrada**: 86 arquivos, todos Markdown, totalizando 22.338 linhas; nenhuma outra extensão apareceu no inventário de `docs/`.
- **Distribuição**: raiz 5; specs 3; plans 14; diagnostics 11; reference 6; reports 10; archive 37, destes 26 relatórios de agente e 11 sagas.
- **Navegação**: 212 ocorrências de links Markdown locais na base; 2 destinos ausentes, ambos no manual de ambiente. Links externos foram consultados apenas nos benchmarks, não recertificados em toda a pasta; âncoras internas não foram validadas por esse teste de existência.
- **Metadados**: 62 arquivos sem campo `Status` nas primeiras 20 linhas; entre os diagnósticos anteriores, 10 de 11 não possuem esse campo nesse bloco. A contagem inclui histórico, exemplos e referências que não precisam de status de implementação.
- **Títulos**: 4 arquivos sem título principal detectável: três relatórios antigos e o diagnóstico de persistência silenciosa. Há títulos de cartões e exemplos com `#` em outros arquivos; não foram confundidos com documentos extras.
- **Saída literal**: 18 arquivos com marcadores de Git/TAP/suíte. É triagem, não achado automático: exemplos de comando no manual são legítimos, e o histórico congelado não deve ser reformatado por esse detector.
- **Profundidade**: classificação estrutural individual dos 86 documentos, leitura dos títulos/seções e verificações mecânicas; leitura semântica dirigida de casos de fronteira nas três specs, planos, diagnósticos e referências. Não se afirma ter recertificado cada regra, comando ou afirmação técnica das 22.338 linhas.
- **Documentos novos**: este diagnóstico e o plano de governança pertencem à auditoria, não à base de entrada. A execução e seus resultados ficam no [plano da frente](../plans/2026-10-14-plan-governanca-documental.md).

## 7. Achados

As severidades abaixo medem risco documental, não defeitos de produto comprovados nesta rodada.

| ID | Severidade | Evidência e risco | Tratamento desta rodada |
|---|---|---|---|
| F01 | Alta | Índice e instruções permitiam relatórios novos, contrariando o congelamento confirmado de `reports/`/`archive/`. A taxonomia não distinguia suficientemente autoridade por assunto. | Tratado na governança do índice e no roteamento das instruções; pastas preservadas |
| F02 | Alta | Specs misturam contrato, backlog e execução: Finanças §12 contém dívidas/estado de correções; GCal §9 incorpora sagas e contagens de suíte; Reposições §11–§13 combina decisões, testes e débitos. Há regras duráveis nessas mesmas seções, como COUNT e escopo de exclusão. | Definida triagem por trecho; redistribuição não executada. Não mover seções inteiras nem perder regras aprovadas |
| F03 | Alta | Descrições de estado divergem entre fontes: Reposições §9.4 diz “PENDENTE”, enquanto a entrega 1.10 consta no roadmap; Finanças §12.2 descreve CSS como não removido, enquanto 0.3 está concluído. Não é autorização para alinhar contrato automaticamente ao código. | Reconciliação factual pendente, com base e decisão apropriadas; specs intocadas |
| F04 | Média | [Diagnóstico mobile](2026-09-23-diag-auditoria-ui-ux-mobile.md) se apresenta como “Auditoria e Plano de Execução”, com ordem definitiva, status de etapas, registros de conclusão e padrões permanentes. O leitor não distingue investigação, intervenção e contrato. | Fronteiras definidas no índice; documento histórico preservado. Conteúdo único deve ser classificado antes de eventual transferência |
| F05 | Média | [Plano de reposições/observações](../plans/2026-09-23-plan-feat-historico-reposicoes-e-observacoes.md) declara não execução no cabeçalho, mas registra etapas executadas na §6. Planos posteriores distinguem melhor investigação, execução e aceite, porém estados não são uniformes. | Cabeçalhos/ciclo definidos para documentos novos ou revisão autorizada; não reescrever planos anteriores |
| F06 | Média | Três roadmaps conservam texto/cabeçalhos de documento vivo. O v3 é oficial, mas parte do detalhe único continua no original; a simplificação anterior não executou migração. | Índice classifica os três papéis; conteúdo preservado e migração explicitamente pendente |
| F07 | Média | [Aprendizados](../reference/lessons-learned.md) mistura riscos ativos, limites e relatos datados, incluindo versões de specs fora da fonte e declarações antigas de ausência de cobertura. [Plano de cobertura](../plans/2026-10-12-plan-cobertura-render-conflitos-modais.md) registra proteção posterior. A vigência precisa ser verificada por item. | Papel de referência definido; inventário não revalidado integralmente nem convertido em backlog |
| F08 | Média | [Manual de ambiente](../setup-ambiente-local.md) tem links ausentes nas linhas 25 (`assets/js/config/api-config.js`) e 274 (`.vercelignore`), resolvidos indevidamente a partir de `docs/`. Na mesma fonte coexistem visão geral antiga de risco de produção e instruções posteriores de host/mock. | Os dois links foram registrados, não corrigidos. Texto operacional exige verificação específica; não foi declarada nova conclusão sobre execução local |
| F09 | Baixa | Exportação antiga e kit reproduzem processos de relatório/hierarquias para adaptação em outros projetos. O EXPORT cita caminhos do processo anterior e diz que não é para ficar no app; esses materiais não são contrato local. | Público e autoridade explicitados no índice; exportáveis/templates mantidos sem alteração |
| F10 | Baixa | Diagnósticos legados não têm cabeçalhos uniformes; o de persistência inicia no H2 com saída bruta, sem título principal. Ausência de status em arquivos congelados não é, por si só, trabalho a fazer. | Padrões mínimos e significado dos estados definidos; nenhuma reforma retroativa |

**Confiança**: alta para misturas de função, contradições entre textos, metadados e destinos ausentes, pois são observáveis nos documentos. Limitada quanto à vigência dos riscos e à correção funcional do produto, não examinadas integralmente.

## 8. Catálogo individual da base

Cada arquivo de entrada aparece uma vez. O objetivo é o papel esperado no desenho; tratamento não representa uma nova aprovação de produto nem o status atual da implementação.

**Legenda**: V = fonte viva no seu domínio; P = registro de uma frente/execução; D = investigação datada; H = histórico congelado ou anterior; E = exportável/modelo; C = comparação não oficial. F01–F10 apontam os achados acima. Nenhuma classificação move, renomeia ou reescreve o arquivo.

### 8.1 Raiz de docs

| Documento | Objetivo específico | Papel e tratamento |
|---|---|---|
| [README.md](../README.md) | Orientar navegação, finalidade, autoridade e manutenção da documentação | V; governança corrigida nesta rodada (F01) |
| [setup-ambiente-local.md](../setup-ambiente-local.md) | Ensinar configuração local, operação das suítes e validação no mock | V; revisão de links/vigência operacional pendente (F08) |
| [roadmap.md](../roadmap.md) | Preservar o registro completo de evolução anterior ao v3 | H; conservar informações únicas, não atualizar como backlog (F06) |
| [roadmap-v2.md](../roadmap-v2.md) | Permitir comparar a variante intermediária de organização | C; não é fonte oficial; alterações anteriores do dono preservadas (F06) |
| [roadmap-v3.md](../roadmap-v3.md) | Apoiar a escolha de trabalho e a consulta resumida das entregas | V; único roadmap oficial, não contém a migração completa do anterior (F06) |

### 8.2 Specs

| Documento | Objetivo específico | Papel e tratamento |
|---|---|---|
| [financas-ciclo-cobranca.md](../specs/financas-ciclo-cobranca.md) | Definir cobrança por ciclo, snapshots, pagamentos, ajustes, API/UI e leitura segura | V; separar fundamento contratual de backlog/estado histórico em revisão futura (F02/F03) |
| [reposicoes-e-competencia.md](../specs/reposicoes-e-competencia.md) | Definir corrente de reposição, competência, validade, expiração, extrato e gestão contextual | V; preservar precedência sobre a regra de reposições e reconciliar estado/trechos mistos (F02/F03) |
| [gcal-sync.md](../specs/gcal-sync.md) | Definir propriedade dos eventos, recorrência, exceções, escrita/leitura e recuperação GCal | V; seção de bugs contém contrato e saga, exigindo triagem por trecho (F02) |

### 8.3 Planos

| Documento | Objetivo específico | Papel e tratamento |
|---|---|---|
| [2026-09-23-plan-feat-historico-reposicoes-e-observacoes.md](../plans/2026-09-23-plan-feat-historico-reposicoes-e-observacoes.md) | Organizar e registrar a implementação inicial do histórico contextual e observações | P; cabeçalho versus execução precisa de reconciliação autorizada (F05) |
| [2026-09-24-plan-etapa-1-formularios-dialogos-mobile.md](../plans/2026-09-24-plan-etapa-1-formularios-dialogos-mobile.md) | Registrar a frente de formulários, diálogos, foco e correções da Etapa 1 | P; preservar sequência e provas, não usar como contrato vigente por inferência |
| [2026-09-26-plan-etapa-2-legibilidade-toque-cartoes.md](../plans/2026-09-26-plan-etapa-2-legibilidade-toque-cartoes.md) | Registrar tipografia, toque, foco/contraste e os limites aceitos da Etapa 2 | P; referência para o resíduo 5.9, sem reabrir cartões encerrados |
| [2026-09-27-plan-etapa-3-navegacao-e-topo-cartoes.md](../plans/2026-09-27-plan-etapa-3-navegacao-e-topo-cartoes.md) | Registrar navegação inferior, redução do topo e ações operacionais da Etapa 3 | P; preservar decisões/medições e distinguir complementos posteriores |
| [2026-09-27-plan-etapa-4-densidade-cards-cartoes.md](../plans/2026-09-27-plan-etapa-4-densidade-cards-cartoes.md) | Registrar simplificação dos cards e divulgação progressiva de detalhes | P; cartões e execução, não segunda spec de todas as telas |
| [2026-09-27-plan-etapa-5-eventos-simultaneos.md](../plans/2026-09-27-plan-etapa-5-eventos-simultaneos.md) | Registrar alternativas, decisão e validação da apresentação de eventos simultâneos | P; conservar a evolução da decisão; contrato durável requer fonte própria quando revisado |
| [2026-09-29-plan-etapa-6-toast-unificado.md](../plans/2026-09-29-plan-etapa-6-toast-unificado.md) | Registrar unificação do feedback assíncrono, textos e entrega da Etapa 6 | P; não tratar apresentação original como prova do estado atual após refinamentos |
| [2026-09-30-plan-b2-sync-boot.md](../plans/2026-09-30-plan-b2-sync-boot.md) | Registrar desenho, decisões, cartões, testes e aceite da revalidação segura no boot | P; histórico da frente; contratos duráveis têm suas fontes permanentes |
| [2026-09-30-plan-skeletons-cache.md](../plans/2026-09-30-plan-skeletons-cache.md) | Registrar padronização de skeletons/cache B1 e separação do B2 | P; preservar o recorte de execução original |
| [2026-10-01-plan-etapa-7-consistencia-acessibilidade.md](../plans/2026-10-01-plan-etapa-7-consistencia-acessibilidade.md) | Registrar estados, semântica, movimento reduzido e navegação da Etapa 7 | P; não confundir o diagnóstico de origem com autoridade normativa de produto |
| [2026-10-01-plan-servidor-local-e-mock.md](../plans/2026-10-01-plan-servidor-local-e-mock.md) | Registrar a implantação do servidor e do sandbox de validação | P; procedimentos atuais pertencem ao manual de ambiente/mock |
| [2026-10-05-plan-validacao-etapa-7-branch.md](../plans/2026-10-05-plan-validacao-etapa-7-branch.md) | Preparar e registrar o checklist/aceite da Etapa 7 em deploy de branch | P; plano de validação e resultado datado, não manual universal de testes |
| [2026-10-12-plan-cobertura-render-conflitos-modais.md](../plans/2026-10-12-plan-cobertura-render-conflitos-modais.md) | Registrar ampliação da proteção automatizada de render, conflitos e modais | P; fonte das provas e limites, não contagem viva de suíte |
| [2026-10-13-plan-melhorias-fluxos-ux.md](../plans/2026-10-13-plan-melhorias-fluxos-ux.md) | Registrar decisões, execução e aceite de clareza/fluidez nos fluxos principais | P; fechamento distingue branch validada e integração, sem substituir specs |

### 8.4 Diagnósticos

| Documento | Objetivo específico | Papel e tratamento |
|---|---|---|
| [2026-08-29-diag-auditoria-completa-gcal.md](2026-08-29-diag-auditoria-completa-gcal.md) | Investigar divergências de sincronização e levantar riscos da base GCal examinada | D; evidência original, não backlog atual automaticamente |
| [2026-08-29-diag-duplicata-edicao-serie-gcal.md](2026-08-29-diag-duplicata-edicao-serie-gcal.md) | Investigar publicação duplicada ao editar série recorrente | D; distinguir simulação/observação e regra aprovada da época |
| [2026-08-30-diag-vinculo-serie-avulsa-e-conflito-fantasma.md](2026-08-30-diag-vinculo-serie-avulsa-e-conflito-fantasma.md) | Investigar vínculos de família, serialização e conflitos fantasmas | D; conservar evidências, conferir contratos vigentes antes de nova ação |
| [2026-08-31-diag-split-encadeado-defeitos-5-e-6.md](2026-08-31-diag-split-encadeado-defeitos-5-e-6.md) | Investigar defeitos do split encadeado encontrados na validação manual | D; fotografia da reprodução e das hipóteses daquela base |
| [2026-09-01-diag-persistencia-silenciosa-criacao-edicao.md](2026-09-01-diag-persistencia-silenciosa-criacao-edicao.md) | Investigar falhas silenciosas de persistência em criação/edição | D; base e evidências brutas, com título/cabeçalho a tratar apenas se autorizado (F10) |
| [2026-09-18-diag-ciclo-atrasado-bloqueia-ciclo-atual.md](2026-09-18-diag-ciclo-atrasado-bloqueia-ciclo-atual.md) | Investigar o bloqueio do ciclo vigente por histórico atrasado | D; evidência de defeito, não especificação de cálculo atual |
| [2026-09-18-diag-item-1-9-editar-ciclos-historicos.md](2026-09-18-diag-item-1-9-editar-ciclos-historicos.md) | Investigar viabilidade e lacunas para pagar/ajustar ciclos anteriores | D; investigação de evolução, sem transformar proposta em aprovação |
| [2026-09-21-diag-0-11-duplicata-cobranca-reenvio-reposicao.md](2026-09-21-diag-0-11-duplicata-cobranca-reenvio-reposicao.md) | Investigar reenvio de reposição e contagem financeira duplicada | D; causa e opções originais, com contrato e execução em suas fontes |
| [2026-09-21-diag-1-10-tela-dedicada-reposicoes.md](2026-09-21-diag-1-10-tela-dedicada-reposicoes.md) | Investigar o histórico contextual de reposições após abandonar a tela dedicada | D; nome de arquivo preserva a origem, não obriga voltar à proposta antiga |
| [2026-09-23-diag-auditoria-ui-ux-mobile.md](2026-09-23-diag-auditoria-ui-ux-mobile.md) | Preservar achados e rastreabilidade da auditoria mobile original | D/P mistos; padrões, plano e execução precisam de triagem futura (F04) |
| [2026-10-13-diag-auditoria-fluxos-ux.md](2026-10-13-diag-auditoria-fluxos-ux.md) | Investigar clareza e fluidez de Semana, Reposições e Financeiro em base definida | D; diferencia confiança, evidência e não examinado; não atualizar achados históricos como se fossem novos |

### 8.5 Referências e exportáveis

| Documento | Objetivo específico | Papel e tratamento |
|---|---|---|
| [lessons-learned.md](../reference/lessons-learned.md) | Consolidar riscos, limites aceitos e armadilhas úteis à retomada | V de apoio; vigência por item exige revisão; não é spec ou backlog (F07) |
| [EXPORT-boas-praticas-para-outro-projeto.md](../reference/EXPORT-boas-praticas-para-outro-projeto.md) | Preservar um extrato de práticas para adaptar fora deste app | E; conteúdo do processo anterior, sem autoridade local (F09) |
| [agent-workflow-kit/README.md](../reference/agent-workflow-kit/README.md) | Explicar o kit reutilizável, seus princípios e adaptação a outro projeto | E; guia de exportação, não substitui o índice ou as instruções deste app |
| [agent-workflow-kit/copilot-instructions.template.md](../reference/agent-workflow-kit/copilot-instructions.template.md) | Servir de base adaptável ao contrato permanente de outro repositório | E; placeholders e decisões precisam de adaptação, não aplicação automática |
| [agent-workflow-kit/diagnostic.template.md](../reference/agent-workflow-kit/diagnostic.template.md) | Servir de base para investigação com fatos, hipóteses, opções e limites | E; selecionar estado/escopo ao instanciar; não certifica ausência de mudanças em produto |
| [agent-workflow-kit/plan.template.md](../reference/agent-workflow-kit/plan.template.md) | Servir de base a uma frente com cartões, critérios e execução no mesmo arquivo | E; adaptar ao risco, sem exigir todos os campos para qualquer mudança |

### 8.6 Relatórios pontuais congelados

Todos têm finalidade histórica: compreender resultado, motivo e limites da mudança nomeada. Não recebem novo trabalho e não definem regra vigente.

| Documento | Objetivo específico | Papel e tratamento |
|---|---|---|
| [2026-09-01-refactor-nomes-exclusao-e-promise-cobranca.md](../reports/2026-09-01-refactor-nomes-exclusao-e-promise-cobranca.md) | Registrar ajuste dos nomes de exclusão e da resolução da escolha de cobrança | H; manter |
| [2026-09-18-chore-remove-painel-pendentes.md](../reports/2026-09-18-chore-remove-painel-pendentes.md) | Registrar remoção do painel de pendências da Home | H; manter |
| [2026-09-18-feat-editar-ciclos-historicos.md](../reports/2026-09-18-feat-editar-ciclos-historicos.md) | Registrar a entrega de pagamento/ajuste de ciclos anteriores | H; manter |
| [2026-09-18-fix-ciclo-atrasado-bloqueia-ciclo-atual.md](../reports/2026-09-18-fix-ciclo-atrasado-bloqueia-ciclo-atual.md) | Registrar correção do bloqueio do ciclo atual por histórico atrasado | H; manter |
| [2026-09-18-fix-restaurar-funcoes-modal-acao-slot.md](../reports/2026-09-18-fix-restaurar-funcoes-modal-acao-slot.md) | Registrar restauração de funções apagadas do modal de ação | H; manter |
| [2026-09-21-fix-duplicata-cobranca-reenvio-reposicao.md](../reports/2026-09-21-fix-duplicata-cobranca-reenvio-reposicao.md) | Registrar o fix de reabertura sem nova cobrança e seus limites | H; manter |
| [2026-09-27-hotfix-seletor-historico-reposicoes-grupo.md](../reports/2026-09-27-hotfix-seletor-historico-reposicoes-grupo.md) | Registrar correção de seletor do histórico de reposições | H; manter |
| [2026-09-27-remocao-filtros-tela-alunos.md](../reports/2026-09-27-remocao-filtros-tela-alunos.md) | Registrar a decisão e remoção dos filtros da tela Alunos | H; manter |
| [2026-09-30-hotfix-fab-home-troca-tela.md](../reports/2026-09-30-hotfix-fab-home-troca-tela.md) | Registrar correção da persistência do FAB durante troca de tela | H; manter |
| [2026-10-06-fix-aviso-carga-inicial.md](../reports/2026-10-06-fix-aviso-carga-inicial.md) | Registrar aviso imediato de carga inicial e validações da rodada | H; manter |

### 8.7 Relatórios antigos de agente

Registram intervenções e evidências de época, inclusive saídas de terminal. Preservar o arquivo não atesta que a condição descrita continua presente.

| Documento | Objetivo específico | Papel e tratamento |
|---|---|---|
| [2026-08-26-fix-dedupe-calcular-prazo-reposicao.md](../archive/agent-reports/2026-08-26-fix-dedupe-calcular-prazo-reposicao.md) | Registrar deduplicação inicial do cálculo de prazo | H; manter |
| [2026-08-27-feat-login-render-button.md](../archive/agent-reports/2026-08-27-feat-login-render-button.md) | Registrar entrega do botão de login renderizado | H; manter |
| [2026-08-27-feat-ui-acoes-slot.md](../archive/agent-reports/2026-08-27-feat-ui-acoes-slot.md) | Registrar a UI de ações do slot de agenda | H; manter |
| [2026-08-27-fix-badge-continuacao.md](../archive/agent-reports/2026-08-27-fix-badge-continuacao.md) | Registrar correção da badge de continuação de série | H; manter |
| [2026-08-27-fix-login-botao-discreto.md](../archive/agent-reports/2026-08-27-fix-login-botao-discreto.md) | Registrar refinamento do botão de login | H; manter |
| [2026-08-27-fix-login-render-sob-demanda.md](../archive/agent-reports/2026-08-27-fix-login-render-sob-demanda.md) | Registrar correção do render sob demanda no login | H; manter |
| [2026-08-28-feat-animacao-troca-periodo.md](../archive/agent-reports/2026-08-28-feat-animacao-troca-periodo.md) | Registrar animação de troca de período na Home | H; manter |
| [2026-08-28-feat-login-sessao-persistente.md](../archive/agent-reports/2026-08-28-feat-login-sessao-persistente.md) | Registrar mitigação de persistência de sessão Google | H; manter |
| [2026-08-28-feat-swipe-periodo-home.md](../archive/agent-reports/2026-08-28-feat-swipe-periodo-home.md) | Registrar navegação de período por swipe | H; manter |
| [2026-08-28-fix-header-sticky-unificacao-home.md](../archive/agent-reports/2026-08-28-fix-header-sticky-unificacao-home.md) | Registrar unificação e correção de sticky da Home | H; manter |
| [2026-08-29-fix-dtstart-byday-gcal.md](../archive/agent-reports/2026-08-29-fix-dtstart-byday-gcal.md) | Registrar alinhamento de DTSTART ao BYDAY | H; manter |
| [2026-08-29-fix-duplicata-edicao-serie-gcal.md](../archive/agent-reports/2026-08-29-fix-duplicata-edicao-serie-gcal.md) | Registrar correção de duplicata na edição de série | H; manter |
| [2026-08-29-fix-exdate-primeiro-dia-gcal.md](../archive/agent-reports/2026-08-29-fix-exdate-primeiro-dia-gcal.md) | Registrar correção da exceção no primeiro dia da série | H; manter |
| [2026-08-29-fix-harness-split-comportamental.md](../archive/agent-reports/2026-08-29-fix-harness-split-comportamental.md) | Registrar construção/correção da prova comportamental do split | H; manter |
| [2026-08-29-fix-serie-vazia-e-acento-gcal.md](../archive/agent-reports/2026-08-29-fix-serie-vazia-e-acento-gcal.md) | Registrar correções de série vazia, DELETE e dia da semana | H; manter |
| [2026-08-29-fix-url-split-e-teste-comportamental.md](../archive/agent-reports/2026-08-29-fix-url-split-e-teste-comportamental.md) | Registrar correção de URL e cobertura do split | H; manter |
| [2026-08-30-fix-avulsa-limpa-campos-recorrencia.md](../archive/agent-reports/2026-08-30-fix-avulsa-limpa-campos-recorrencia.md) | Registrar limpeza de campos de recorrência em avulsa | H; manter |
| [2026-08-30-fix-conflito-serializacao-until.md](../archive/agent-reports/2026-08-30-fix-conflito-serializacao-until.md) | Registrar correção da serialização do término no conflito | H; manter |
| [2026-08-31-fix-excluir-serie-toda-coerente.md](../archive/agent-reports/2026-08-31-fix-excluir-serie-toda-coerente.md) | Registrar coerência de escopo na exclusão de série completa | H; manter |
| [2026-08-31-fix-restauracao-handlers-exclusao.md](../archive/agent-reports/2026-08-31-fix-restauracao-handlers-exclusao.md) | Registrar restauração dos handlers destrutivos de exclusão | H; manter |
| [2026-09-01-feat-acabamento-modal-exclusao.md](../archive/agent-reports/2026-09-01-feat-acabamento-modal-exclusao.md) | Registrar acabamento do modal de escolha de exclusão | H; manter |
| [2026-09-01-feat-rotulo-exclusao-serie-toda.md](../archive/agent-reports/2026-09-01-feat-rotulo-exclusao-serie-toda.md) | Registrar ajuste do rótulo de exclusão da série toda | H; manter |
| [2026-09-01-fix-cancelar-reposicao-orfa.md](../archive/agent-reports/2026-09-01-fix-cancelar-reposicao-orfa.md) | Registrar limpeza best-effort da reposição órfã no ramo avulso | H; manter |
| [2026-09-01-fix-corrida-salvar-recarregar-exclusao.md](../archive/agent-reports/2026-09-01-fix-corrida-salvar-recarregar-exclusao.md) | Registrar correção de corrida entre salvar e recarregar na exclusão | H; manter |
| [2026-09-01-fix-envio-reposicao-serie.md](../archive/agent-reports/2026-09-01-fix-envio-reposicao-serie.md) | Registrar restauração do despacho de envio para reposição em série | H; manter |
| [2026-09-03-chore-remove-toggle-escopo-criacao-recorrencia.md](../archive/agent-reports/2026-09-03-chore-remove-toggle-escopo-criacao-recorrencia.md) | Registrar remoção de controle de escopo de recorrência | H; manter |

### 8.8 Sagas congeladas

Consolidam várias rodadas para explicar decisões, defeitos e limites herdados. Não são specs, planos vivos nem novos destinos de execução.

| Documento | Objetivo específico | Papel e tratamento |
|---|---|---|
| [SAGA-2026-08-25-recorrencia-e-falha-parcial.md](../archive/sagas/SAGA-2026-08-25-recorrencia-e-falha-parcial.md) | Reconstruir recorrência GCal, falha parcial e fechamento documental de agosto | H; manter |
| [SAGA-ambiente-local.md](../archive/sagas/SAGA-ambiente-local.md) | Reconstruir a montagem do ambiente local e seus limites | H; manter |
| [SAGA-aparo-cadeia-serie.md](../archive/sagas/SAGA-aparo-cadeia-serie.md) | Reconstruir a evolução do aparo de cadeia daqui para frente | H; manter |
| [SAGA-gcal-watch-renovacao-canal.md](../archive/sagas/SAGA-gcal-watch-renovacao-canal.md) | Reconstruir a renovação do canal de webhook | H; manter |
| [SAGA-limpeza-css.md](../archive/sagas/SAGA-limpeza-css.md) | Reconstruir a limpeza de CSS e seletores preservados | H; manter |
| [SAGA-logger-frontend.md](../archive/sagas/SAGA-logger-frontend.md) | Reconstruir decisões do módulo de log frontend | H; manter |
| [SAGA-manutencao-documentacao.md](../archive/sagas/SAGA-manutencao-documentacao.md) | Reconstruir a evolução da manutenção documental | H; manter, sem sobrepor a governança atual |
| [SAGA-persistencia-silenciosa.md](../archive/sagas/SAGA-persistencia-silenciosa.md) | Reconstruir intervenções para falhas silenciosas de persistência | H; manter |
| [SAGA-split-heranca-serie.md](../archive/sagas/SAGA-split-heranca-serie.md) | Reconstruir split, herança de término e série vazia | H; manter |
| [SAGA-teto-pendencia-gcal.md](../archive/sagas/SAGA-teto-pendencia-gcal.md) | Reconstruir decisões sobre teto de pendência GCal | H; manter |
| [SAGA-vinculo-serie-familia.md](../archive/sagas/SAGA-vinculo-serie-familia.md) | Reconstruir vínculos de família de série e conflitos fantasmas | H; manter |

## 9. Objetivo dos documentos desta frente

- **Este diagnóstico**: fotografia da classificação, evidências, benchmarks e achados; não é um inventário vivo para toda nova feature.
- **Plano de governança**: autorização, cartões, execução, provas e fechamento da rodada; não é regra de negócio nem segundo índice.
- **Índice documental**: definições permanentes e navegação. As recomendações implementadas na governança não exigem copiar o catálogo inteiro para o índice.
- **Instruções permanentes**: aplicação operacional desse roteamento pelos agentes, preservando suas demais regras.

## 10. Continuidade recomendada, não executada

| Frente possível | Resultado esperado | Restrições antes de agir |
|---|---|---|
| M01 — triagem do conteúdo único | Identificar, por trecho, contrato durável, decisão, investigação, execução ou procedimento | Não retirar nada do original antes de verificar a fonte de destino; preservar regras e motivos |
| M02 — reconciliação de fontes vivas | Resolver contradições de estado nas specs, Aprendizados, cabeçalhos e manual | Distinguir texto incorreto de comportamento incorreto; confirmar produto e revalidar evidência quando necessário |
| M03 — redistribuição aprovada | Incorporar somente conteúdo necessário às fontes responsáveis, com rastreabilidade | Autorização específica; não reescrever planos fechados nem usar reports/archive como destino |
| M04 — material exportável | Decidir se EXPORT e kit precisam de atualização ou continuam retratos para adaptação | Público diferente; não aplicar automaticamente política do app a outro projeto |

Essas frentes não receberam prioridade, autorização de execução ou novos IDs de roadmap nesta auditoria. Os dois links quebrados do manual podem ser corrigidos em uma intervenção documental mínima, mas permanecem registrados e não alterados aqui.

## 11. Conclusão

A hipótese inicial é sustentada: a estrutura de pastas pode ser mantida; o problema principal é a sobreposição de finalidade, autoridade e estado. Os casos F01–F10 mostram por que renomear arquivos ou só reduzir texto não resolve a confiabilidade documental.

A governança no índice agora distingue contrato durável (spec), intervenção/entrega (plano) e investigação (diagnóstico), além de referência, procedimento e histórico. O ciclo é proporcional à mudança, sem impor três documentos por tarefa nem novas pastas/ferramentas.

Concluir esta auditoria não significa concluir migração, corrigir todas as fontes ou certificar o produto. A checagem confirmou cobertura exata da base e preservação dos documentos fora do escopo; os resultados e o fechamento técnico estão no plano. A decisão de redistribuir permanece com o dono.