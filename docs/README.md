# Documentação — Personal Josy

> **Finalidade**: índice e governança da documentação · **Atualizado**: 2026-10-23
> Este arquivo define onde registrar cada informação e qual documento consultar; não descreve regras de produto nem a execução de uma frente.
> **Fonte de verdade de regra de negócio**: as specs em `specs/`. Se uma regra não estiver escrita lá, ela não está decidida — confirme antes de implementar.

---

## Índice

| Documento | O que é | Quando ler |
|---|---|---|
| [`roadmap-v3.md`](roadmap-v3.md) | Roadmap oficial: backlog, entregas, dependências e decisões pendentes | Antes de escolher a próxima feature |
| [`reference/arquitetura-aplicacao.md`](reference/arquitetura-aplicacao.md) | Diagrama dos componentes, fluxos de dados e integrações da aplicação | Para entender a arquitetura atual ou localizar limites entre frontend, API, dados e serviços externos |
| [`roadmap-v1.md`](archive/roadmaps/roadmap-v1.md) | Roadmap anterior, renomeado pelo dono; preservado como registro, sem atualização de backlog | Somente para consultar o registro anterior à substituição de 2026-10-14 |
| [`roadmap-v2.md`](archive/roadmaps/roadmap-v2.md) | Variante comparativa, não oficial; não é segundo backlog ativo | Para comparar as propostas de organização anteriores ao v3 |
| [`specs/identidade-e-apresentacao-publica.md`](specs/identidade-e-apresentacao-publica.md) | Contrato de marca, tipografia, ícones por finalidade e cache interno | Antes de alterar apresentação da marca ou instalação do PWA |
| [Apresentação Comercial](apresentacao-personal-josy.md), [Slides HTML](apresentacao-personal-josy.html) e [PDF 16:9](apresentacao-personal-josy.pdf) | Deck comercial e showcase do Personal Josy em slides 16:9 para personal trainers | Para apresentar o produto a novos usuários, parceiros ou em canais de marketing |
| [`specs/interface-e-navegacao.md`](specs/interface-e-navegacao.md) | Navegação, acessibilidade, topos compartilhados, listas e hierarquia visual dos cards | Antes de alterar os padrões transversais da interface |
| [Guia visual](reference/identidade/guia-identidade-visual-v3.md) e [PDF](reference/identidade/guia-identidade-visual-v3.pdf) | Aplicações aprovadas da identidade; Markdown é a fonte, PDF é gerado | Ao usar o kit, conferir fundos, cores e exportações do ícone |
| [Identidade, OAuth e verificação Google](reference/google-oauth-verificacao.md) | Pesquisa com fontes externas e limites; não substitui o contrato aprovado | Ao preparar marca pública, consentimento e verificação, sem confundir nome interno de cache com nome público |
| [`specs/financas-ciclo-cobranca.md`](specs/financas-ciclo-cobranca.md) | Modelo de cobrança por ciclo de vencimento por aluno | Antes de mexer em qualquer coisa financeira, no cadastro de aluno ou na contagem de aulas |
| [`specs/reposicoes-e-competencia.md`](specs/reposicoes-e-competencia.md) | Fila de reposições, competência de cobrança, prazo de validade e extrato do ciclo | Antes de definir como aulas enviadas para reposição entram no cálculo e no histórico financeiro |
| [`specs/gcal-sync.md`](specs/gcal-sync.md) | Sincronização com Google Calendar | Antes de mexer em recorrência, `EXDATE`, webhook, renovação do canal ou conflitos de sincronização |
| [`setup-ambiente-local.md`](setup-ambiente-local.md) | Passo a passo para deixar uma máquina nova rodando frontend, backend e banco de dev, como rodar as duas suítes de teste, e o viewport de referência do mobile (433×762) | Ao configurar um computador novo, quando o ambiente local parar de funcionar, antes de escrever teste novo, ou ao validar UI mobile |
| [`reference/lessons-learned.md`](reference/lessons-learned.md) | Referência de riscos, limites aceitos e armadilhas; não substitui spec nem priorização | Antes de abrir uma rodada sensível, conferindo a vigência do item consultado |
| [`reference/agent-workflow-kit/`](reference/agent-workflow-kit/README.md) | Kit reutilizável: guia de uso, fundamentos, modelos de instruções/governança/spec/diagnóstico/plano e arquiteto opcional. Modelos usados pelo agente local dão formato, sem substituir a política deste app | Ao adaptar o fluxo para outro projeto ou preparar trabalho com o arquiteto |
| [`diagnostics/`](diagnostics/) | Investigações datadas: pergunta, fatos, hipóteses, causas, impacto e alternativas | Quando é preciso entender um problema ou auditar uma área antes de escolher a intervenção |
| [`plans/`](plans/) | Plano vivo da frente: execução proposta/autorizada, critérios de aceite, validação e registro da execução | Para preparar, retomar ou verificar a entrega de uma mudança |
| [`reports/`](archive/reports/) | Relatórios pontuais antigos, **congelados**; não recebem novos arquivos | Para entender o resultado de uma mudança histórica, não para obter regra vigente |
| [`archive/`](archive/) | Processo anterior, **congelado**: relatórios de agente e sagas | Somente para reconstruir a origem de decisões e incidentes |
| [`reference/`](reference/) | Referências do app e material exportável, com finalidade e vigência explicitadas | Para consultar conhecimento de apoio ou adaptar práticas em outro projeto |
| [Auditoria documental](archive/diagnostics/2026-10-14-diag-arquitetura-documentacao.md) | Inventário individual e achados da pasta; fotografia da auditoria, não segundo manual de governança | Para revisar as misturas de função e preparar uma futura redistribuição |
| [Plano da governança](archive/plans/2026-10-14-plan-governanca-documental.md) | Escopo, decisões, execução e validação desta reorganização documental | Para conferir o que foi feito e o que permanece fora da rodada |
| [Migração documental](plans/2026-10-14-plan-migracao-documental.md) | Matriz por trecho: origem, destino, conteúdo incorporado, duplicações e pendências | Para retomar as transferências incrementais sem reabrir a auditoria encerrada |

---

## Como estes documentos se relacionam

- O **roadmap oficial** é [`roadmap-v3.md`](roadmap-v3.md), único documento vivo de planejamento. A substituição foi autorizada pelo dono em 2026-10-14; [`roadmap-v1.md`](archive/roadmaps/roadmap-v1.md) é o registro anterior, renomeado pelo dono e sem novas atualizações de backlog. Referências ao nome antigo em documentos encerrados são históricas. Não criar outras versões paralelas nem versionar por data.
- As **specs** são **uma por feature** e mantêm o contrato aprovado vigente. São evolutivas: mudança de comportamento exige decisão explícita e atualização do contrato, sem reescrever o passado como se a nova regra sempre tivesse existido. O histórico fica no Git, não em arquivos paralelos (`v1.md`, `v2.md`).
- **Versão e status de uma spec existem em um lugar só: o cabeçalho da própria spec.** Nenhum outro documento — nem este índice, nem o roadmap, nem `.github/copilot-instructions.md` — repete o número. Repetir cria drift silencioso: já aconteceu de uma spec andar cinco versões com o índice parado, e um agente confiar no número errado.
- Quando uma feature é entregue, o item correspondente no roadmap é marcado como concluído e passa a **apontar para a spec**, em vez de repetir o conteúdo dela.
- **Spec não referencia plano nem relatório.** A spec é a fonte de verdade e precisa sobreviver à poda de `plans/`, `reports/` e `archive/`. Se um fato de lá importa para a regra, ele é escrito na spec — não linkado.
- **Histórico não é regra vigente.** Plano encerrado, diagnóstico datado, relatório e saga explicam o que se sabia ou executou naquela base. Não justificam alterar produto nem reabrir trabalho por conta própria.
- **Congelamento confirmado em 2026-10-14**: `reports/` e `archive/` são somente consulta, sem novos arquivos, exclusões ou migração. Poda ou transferência futura exige autorização específica e preservação prévia de informação única; esta auditoria não a autoriza.

### Autoridade por assunto

Não há um ranking universal em que o código, a spec ou o plano resolva qualquer disputa. Cada fonte responde por uma dimensão:

| Assunto | Fonte responsável | Se houver divergência |
|---|---|---|
| Comportamento aprovado, regra de negócio e contrato técnico durável | Spec correspondente | Investigar e confirmar com o dono; não inventar regra nem atualizar a spec para legitimar um bug |
| O que o sistema faz na base examinada | Código, testes e observações verificadas; diagnóstico registra a evidência | Registrar diferença entre observado e esperado; código não é aprovação de produto |
| Escopo, sequência, decisões de execução e validação da frente | Plano vivo, respeitando specs e autorizações | Perguntar antes de ampliar escopo; plano não pode sobrescrever regra vigente |
| Priorização e síntese das entregas | Roadmap oficial | Decisão do dono; o detalhe de execução continua no plano |
| Governança documental e navegação | Este índice | Corrigir o roteamento com autorização, sem redistribuir conteúdo implicitamente |
| Permissões, invariantes e forma de operar do agente | [Instruções permanentes](../.github/copilot-instructions.md) | Não tratar template, plano ou benchmark como permissão adicional |
| Configuração e procedimentos operacionais | [Manual de ambiente](setup-ambiente-local.md) | Conferir a execução real; instrução operacional desatualizada não prevalece sobre evidência verificada |

## Spec, Plano e Diagnóstico

### Spec: o contrato durável da feature

**Pergunta**: o que deve acontecer, sob quais condições e por quais decisões aprovadas?

- Contém propósito e escopo da feature, requisitos funcionais/não funcionais pertinentes, regras e invariantes, dados, estados, contratos de API/UI, decisões e casos de borda, e fora de escopo.
- Pode conter arquitetura e justificativas técnicas quando forem necessárias ao contrato. Não é preciso separar PRD e design técnico em arquivos novos neste projeto.
- Decisão relevante mantém contexto, alternativa descartada e consequência. Não confundir esse fundamento durável com a cronologia das rodadas que a implementaram.
- Não contém plano de tarefas, comandos de execução, resultados antes/depois de suíte, mutações ou saga de correções. Referências a testes podem apontar a proteção de um contrato, sem virar relatório de execução.
- Proposta ainda não aprovada fica explicitamente marcada e não autoriza implementação. Trecho atual, histórico e proposta não podem ter redação indistinguível.
- Defeito conhecido pode ser anotado como divergência do contrato, com impacto/limite aceito; fila de execução e status de correção pertencem ao roadmap/plano. Não copiar o backlog inteiro para a spec.
- Critério de qualidade: o comportamento aprovado pode ser compreendido sem consultar conversa, plano ou relatório antigo.

### Plano: a intervenção e sua entrega

**Pergunta**: o que vamos mudar nesta frente, com quais limites, dependências e provas, e o que efetivamente foi feito?

- Contém resultado observável, escopo e fora de escopo, decisões fechadas/pendentes, invariantes referenciadas, baseline, cartões, critérios de aceite, validação, riscos e limites de publicação/rollback.
- É vivo enquanto aberto. O registro da execução entra no mesmo arquivo: alterações, medições datadas, testes/mutações, desvios, decisões adicionais e pendências.
- Critério de aceite no plano é a prova da entrega daquela frente; requisitos permanentes da feature pertencem à spec.
- Decisão de produto descoberta durante a execução precisa da aprovação do dono e da atualização da spec. Decisão de sequência, técnica transitória ou validação fica no plano.
- Encerramento distingue implementação, aceite e publicação; registra o que foi concluído, limitado, cancelado ou deixado a um responsável. Encerrar documento não significa publicar código.
- Plano encerrado não é reescrito: trabalho posterior gera continuação ou plano novo, com referência ao anterior. Não reapresentar o histórico como tarefa ainda aberta.

### Diagnóstico: a investigação e seus limites

**Pergunta**: o que foi observado, por que pode acontecer, qual o impacto e o que falta saber para decidir?

- Contém pergunta investigada, escopo/base/data, fontes e método, reprodução quando aplicável, observado versus esperado, evidências, hipóteses, cadeia causal, impacto/confiança e opções com seus riscos.
- Separa fato observado, inferência, hipótese e decisão já documentada. Não chamar hipótese de causa confirmada.
- Pode recomendar intervenção e indicar um teste discriminante. Não organiza a execução completa nem registra rodadas de implementação; isso pertence ao plano.
- Não precisa comprovar causa-raiz quando a investigação é inconclusiva; precisa declarar o impedimento, a evidência disponível e a próxima pergunta.
- Investigar não autoriza corrigir produto. Criar o diagnóstico como artefato da análise não contradiz um escopo de investigação sem alteração de produto.
- Diagnóstico concluído significa investigação encerrada, não defeito corrigido. Investigação posterior referencia o documento anterior e explicita a nova base, sem atualizar silenciosamente suas conclusões históricas.

### Exemplos de classificação

| Informação | Destino |
|---|---|
| Regra de expiração, congelamento de ciclo pago ou preservação da escolha de cobrança | Spec: contrato permanente e casos de borda |
| Sintoma em uma resposta HTTP, reprodução no mock e hipótese sobre cache vazio | Diagnóstico: evidência e investigação |
| Ordem dos cartões, teste a executar, resultado de mutação e aceite relatado | Plano: organização e prova da intervenção |
| Prioridade da próxima melhoria ou entrega resumida com ponteiro | Roadmap |
| Como iniciar servidor, configurar banco ou executar uma suíte | Manual de ambiente |
| Restrição permanente de Git, autorização ou ferramenta do agente | Instruções permanentes |
| Lições e riscos de apoio que exigem checagem de vigência | Aprendizados; sem substituir contrato nem criar prioridade |

### Ciclo de vida de uma frente de trabalho

O processo **não exige diagnóstico + spec + plano para toda mudança** e não gera relatório final separado:

1. Identificar a regra/contrato e a autorização aplicáveis; ler a fonte vigente.
2. Abrir **diagnóstico** se houver causa desconhecida, auditoria, alternativas ou risco que demande apuração. Causa evidente não exige diagnóstico autônomo.
3. Criar/atualizar **spec** quando for necessário definir ou mudar contrato durável, após resolver as decisões bloqueantes. Correção para cumprir uma regra já definida não exige inventar spec nova.
4. Abrir/atualizar **plano** quando houver frente de execução, critérios ou registro a acompanhar. A execução entra nesse arquivo, nunca em novo relatório.
5. Registrar a regra/decisão durável na fonte permanente e a síntese no roadmap, quando houver item correspondente, sem inventar nova prioridade.
6. Validar, declarar limites, destinar pendências e encerrar a frente. Não confundir tarefa executada, investigação encerrada, aceite e publicação.

**Mudança pontual**: dentro de uma frente aberta, registrar no plano existente; correção isolada sem frente aberta usa plano enxuto em `plans/`; melhoria curta de contrato atualiza a spec e a síntese no roadmap, sem criar documentos de processo redundantes quando não forem necessários. O pedido e a validação precisam continuar rastreáveis. `reports/` não é destino para novas mudanças.

Diagnóstico pode apontar para o plano que assumiu a intervenção; plano aponta para diagnóstico e specs aplicáveis. Isso é rastreabilidade, não dependência normativa da spec em documentos de processo.

### Estrutura e nomes

| Pasta | Finalidade e manutenção | Nome do arquivo |
|---|---|---|
| `specs/` | Contrato vivo de uma feature; atualizar somente com decisão explícita | `<feature>.md`, um arquivo mantido por feature |
| `diagnostics/` | Investigação de uma base datada; não recebe execução de correções | `AAAA-MM-DD-diag-<slug>.md` |
| `plans/` | Frente de trabalho viva até seu encerramento; inclui sua execução | `AAAA-MM-DD-plan-<slug>.md` |
| `reference/` | Conhecimento de apoio com fonte/vigência; não recebe backlog ou diário de execução | Nome por assunto; exportáveis claramente identificados |
| `reference/agent-workflow-kit/` | Modelos e guia para outro projeto; não governa este app | Nomes existentes de guia/templates |
| `reports/` | Relatos pontuais anteriores; congelado, sem novos arquivos | Manter nomes originais |
| `archive/agent-reports/` | Saídas e relatos do processo anterior; congelado | Manter nomes originais |
| `archive/sagas/` | Sínteses históricas de várias rodadas; congelado | Manter nomes originais `SAGA-<tema>.md` |

Raiz de `docs/`: índice/governança, roadmap oficial e manual de ambiente. Variantes anteriores do roadmap são exceções de consulta, não novos documentos vivos. Nomes de pastas e prefixos permanecem em inglês; conteúdo em português. Nenhuma nova pasta é exigida por este desenho.

---

## Convenções

### Cabeçalhos e estados

Os cabeçalhos respondem "qual é a finalidade, a base e a vigência deste documento?". Aplicar o padrão a novos documentos e revisões autorizadas, não reformatar retroativamente o histórico.

| Tipo | Campos mínimos | Estados |
|---|---|---|
| Spec | Status, versão documental, atualizado; defeitos/limites conhecidos quando aplicável | Rascunho; Aprovada, não implementada; Em implementação; Em produção; Substituída |
| Plano | Status, criado/atualizado, responsável, escopo/base e fontes aplicáveis | Rascunho; Aguardando decisão; Em execução; Em validação; Encerrado; Cancelado |
| Diagnóstico | Status, criado/atualizado, pergunta/escopo, base e fontes/método | Em análise; Concluído; Inconclusivo; Substituído |
| Guia ou referência do app | Finalidade, fonte e condição de atualização/vigência | Não impor estado de implementação a um guia |

O status de spec descreve a cobertura do contrato; o de plano, a frente; o de diagnóstico, a investigação. Aprovado exige decisão real, não estimativa do agente. Se houver publicação pendente, declarar o responsável no fechamento, sem anunciar produção.

### Nomenclatura

- Specs: `docs/specs/<nome-da-feature>.md`, em kebab-case, sem prefixo `spec_` (a pasta já diz).
- Uma feature = um arquivo. Se uma feature crescer demais, quebre em seções internas, não em arquivos.

### Informação única e atualização

- Requisito/regra → spec; execução/medição → plano; observação/hipótese → diagnóstico; procedimento → manual; priorização → roadmap; permissão permanente → instruções.
- Preservar o motivo de uma decisão durável, sem carregar a cronologia completa para o contrato.
- Não duplicar versão/status de spec ou contagem de suíte como "estado atual" em outras fontes. Medições datadas de uma investigação/execução são evidência daquela rodada, não contagem viva do projeto.
- Os exportáveis/kit são material para adaptação, não instruções locais. Sua existência não obriga copiar todos os templates nem seguir processos antigos de relatório.
- Antes de podar, mover ou redistribuir informação única, conferir seu destino e obter a autorização aplicável. A auditoria documental de 2026-10-14 define os papéis, mas não executa essa redistribuição.

### Trabalhando com agentes de IA

- Sempre passe o **caminho completo** da spec no prompt (ex.: `docs/specs/financas-ciclo-cobranca.md`). Referência solta pelo nome faz o agente procurar no lugar errado — e ele costuma seguir em frente sem avisar.
- A spec deve resolver explicitamente os casos de borda. O que estiver fora dela deve estar na seção "Fora de escopo" da própria spec, para o agente não inventar solução.
- Instruções permanentes para o agente de código ficam em `.github/copilot-instructions.md`, não aqui; skills vendorizadas ficam em `.agents/skills/`. Agentes customizados do VS Code ficam em `.github/agents/` (ex.: `arquiteto-software.agent.md`, que planeja diagnóstico/plano e não implementa código).

## Benchmarks e adaptação

Base do desenho: [Diátaxis](https://diataxis.fr/) para finalidade conforme necessidade do leitor; [Atlassian PRD](https://www.atlassian.com/agile/product-management/requirements) para comportamento/requisitos; [Atlassian planejamento](https://www.atlassian.com/work-management/project-management/project-planning) para organizar a intervenção; [Google SRE](https://sre.google/sre-book/postmortem-culture/) para investigação com evidências; [Microsoft Azure ADR](https://learn.microsoft.com/en-us/azure/well-architected/architect-role/architecture-decision-record) para contexto, alternativas e consequências de decisões.

São referências de práticas, não uma norma universal de nomes de pastas. Diagnóstico não é necessariamente postmortem; spec não é apenas PRD; plano vivo local também contém execução. Os fundamentos de ADR podem ser registrados nas decisões da spec, sem criar uma pasta de ADRs nesta rodada. A escolha de manter o contrato independente de planos/relatórios é uma convenção deste repositório, não uma exigência dessas fontes.

---

## O que **não** vai nesta pasta

- **Artefatos gerados por ferramenta** (ex.: `graphify-out/`). São saída de análise, não documentação escrita — devem ser regenerados, nunca editados à mão. Atenção: quando desatualizados, referenciam arquivos que já não existem e induzem a erro em varreduras de código.
- **Documentação de API consumida por código** (se um dia existir), que deve viver junto do código que descreve.
