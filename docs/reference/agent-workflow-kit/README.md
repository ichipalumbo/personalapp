# Kit de trabalho com agentes de IA — guia reutilizável

> **Finalidade**: modelos adaptáveis e agente opcional para investigar, planejar e executar
> trabalho verificável · **Atualizado**: 2026-10-16.
> O kit não governa automaticamente o projeto que o contém. Instruções e decisões locais
> prevalecem; adaptar os modelos antes de instalar. Copiar a pasta não executa comandos.

Modelos não contêm contratos de produto prontos. O [rationale](rationale.md) preserva
incidentes e exemplos do projeto de origem, sem torná-los políticas universais.

---

## 1. Objetivo

Agentes de código erram de formas previsíveis: inventam regra que não existe, confiam em
documento velho, escrevem teste que não prova nada, repetem tentativa sem limite, mexem em
arquivo grande e apagam o que não deviam. Este kit organiza o trabalho para que cada uma
dessas falhas tenha uma barreira barata.

O kit resolve quatro problemas:

1. **Falta de fonte de verdade** — o agente não sabe qual documento vence quando dois divergem.
2. **Ambiguidade tratada como autorização** — o agente decide sozinho uma regra de produto.
3. **Evidência fraca** — teste que passa mesmo com o defeito, código validado só por sintaxe.
4. **Documentação que envelhece** — metadado repetido em dois lugares, link quebrado, arquivo
   movido, histórico tratado como estado atual.

## 2. Princípios

| # | Princípio | Regra prática |
|---|---|---|
| 1 | **Fonte única** | Todo dado mutável (versão, status, contagem) existe em um lugar só. Os outros apontam para ele. |
| 2 | **Autoridade por assunto** | Separar comportamento aprovado, observado, intervenção e permissão; divergência exige apuração. |
| 3 | **Evidência antes de ação** | Ler o código real antes de concluir. Nome de função não é contrato. |
| 4 | **Ambiguidade é portão** | Regra não escrita não pode ser inferida. Apresente opções e espere decisão. |
| 5 | **Escopo mínimo** | Uma frente, um objetivo. Fora de escopo é explícito e não se toca. |
| 6 | **Incremento fechável** | Poucos arquivos por passo, com critério binário de aceite e validação. |
| 7 | **Prova por mutação** | Teste novo só vale se falhar quando a correção é revertida. |
| 8 | **Declarar o que não é coberto** | "Passou tudo" ≠ "funciona". Diga o que a suíte não testa. |
| 9 | **Limite e dependência** | Ao atingir o teto, bloquear o cartão e seus dependentes; registrar falha não equivale a passar. |
| 10 | **Permissão coerente** | Nunca ofereça opção que exige ação proibida ao agente. |
| 11 | **Registro vivo** | Plano aberto recebe a execução no próprio arquivo. Sem relatório final redundante. |
| 12 | **Histórico não é verdade atual** | Diagnóstico e plano fechado explicam o passado, não definem o presente. |

## 3. Autoridade por assunto

| Fonte | Responde por | Não comprova |
|---|---|---|
| Spec aprovada | Comportamento, regras e contratos duráveis | Que tudo foi implementado/publicado |
| Código, testes e runtime | O observado na base efetivamente examinada | Aprovação de uma regra ou correção de um bug |
| Plano vivo | Intervenção autorizada, cartões e provas de execução | Permissão para ampliar escopo ou sobrescrever spec |
| Diagnóstico | Evidência, hipóteses, impacto e opções datadas | Defeito corrigido ou implementação autorizada |
| Roadmap | Priorização e síntese de entregas/dependências | Detalhe de execução ou contrato completo |
| Instruções, índice e guias | Permissões, governança e procedimentos, cada um no seu domínio | Validação de produto por existir documentação |

Não há ranking universal `código > spec`. Investigar divergência e obter a decisão
apropriada, sem atualizar requisito para legitimar bug. Não repetir metadado vivo fora
da fonte; medições datadas/listas de arquivos podem ser evidência legítima no plano.

## 4. Conteúdo do pacote

| Arquivo | Papel | Destino ao adotar |
|---|---|---|
| [README.md](README.md) | Guia, instalação e escolha dos artefatos | Manter junto ao kit |
| [copilot-instructions.template.md](copilot-instructions.template.md) | Regras permanentes e campos de política local | `.github/copilot-instructions.md`, se for o formato adotado |
| [docs-readme.template.md](docs-readme.template.md) | Navegação, autoridade e ciclo documental | Índice do projeto, por exemplo `docs/README.md` |
| [spec.template.md](spec.template.md) | Contrato de uma feature, sem saga de execução | Pasta de specs definida pelo projeto |
| [diagnostic.template.md](diagnostic.template.md) | Investigação sem alterar produto | Pasta de diagnósticos definida pelo projeto |
| [plan.template.md](plan.template.md) | Cartões, validação e registro da execução | Pasta de planos definida pelo projeto |
| [software-architect.agent.template.md](software-architect.agent.template.md) | Perfil opcional de investigação/planejamento no VS Code | `.github/agents/software-architect.agent.md`, depois de adaptar |
| [rationale.md](rationale.md) | Fundamentos e casos do antigo EXPORT revisados | Apoio opcional, não segunda fonte normativa |

O padrão do kit registra execução no plano aberto, sem relatório final paralelo por rodada.
Histórico de relatos/sagas preexistentes não é autorização para voltar a gerá-los.

## 5. Ciclo de trabalho

O ciclo abaixo é da implementação autorizada. Em pedido apenas de avaliação/planejamento,
o arquiteto entrega a análise/plano e **não executa** os passos de teste ou implementação.

```
1. Ler o contrato permanente (copilot-instructions)
2. Identificar a fonte de verdade do que vai mudar
3. Investigar e medir  ──► diagnóstico (se houver dúvida de causa)
4. Fechar ambiguidades ──► pergunta ao responsável, com opções
5. Abrir ou atualizar o plano vivo
6. Medir baseline (testes, reprodução, números)
7. Implementar em incremento pequeno
8. Validar (teste + mutação + verificação do não coberto)
9. Registrar a execução no plano
10. Atualizar roadmap; fechar o plano ou criar continuação
```

Diagnóstico é opcional quando a causa é evidente. Confirmar decisões de produto, autorização
e ambiguidades bloqueantes; não transformar toda decisão rotineira já coberta em novo portão.
Contrato existente pode dispensar spec nova. Plano pequeno usa somente campos pertinentes.

## 6. Quando criar cada documento

| Situação | Documento |
|---|---|
| Causa desconhecida, ou auditoria de uma área | **Diagnóstico** |
| Frente com decisões, várias etapas, ou execução longa | **Plano vivo** |
| Correção isolada, sem frente aberta | **Plano enxuto**, conforme a governança local |
| Melhoria curta de contrato | **Spec e síntese autorizada no roadmap**, sem processo redundante quando não necessário |
| Descoberta durante o trabalho fora do escopo | Registro no plano; depois roadmap ou diagnóstico separado |
| Item concluído | Não criar nada novo: fechar o plano e atualizar o roadmap |

Manter uma fonte viva por assunto. Versões paralelas ou cópias históricas dependem de
autorização explícita e rótulo inequívoco, sem competir com o contrato/backlog vigente.

## 7. Convenções de nome e estado

- Data só onde ordena histórico: `AAAA-MM-DD-<tipo>-<slug>.md`.
- `tipo` em `fix`, `feat`, `chore`, `refactor`, `hotfix`, `remocao`, `docs`.
- `slug` curto, kebab-case, sem acento.
- Selecionar um estado, não copiar uma lista de estados no documento final. Spec, plano e
  diagnóstico têm ciclos diferentes, descritos no modelo de governança; concluído não significa publicado.
- Caminhos relativos dentro do repositório.
- Pastas e prefixos novos em inglês; conteúdo no idioma do time.

## 8. Manutenção da documentação

Faça isto periodicamente — de preferência com script, não a olho:

1. **Links**: todo link relativo resolve para um arquivo existente.
2. **Caminhos citados**: conferir referências reais; distinguir exemplos, placeholders e caminhos históricos.
3. **Duplicação**: nenhum metadado volátil repetido fora da fonte.
4. **Preservação**: antes de retirar/mover conteúdo único, classificar e verificar destino.
  Poda/exclusão não é manutenção automática: exige política e autorização, preservando conclusões.
5. **Congelamento**: plano fechado não é reescrito; correção posterior gera documento novo.
6. **Artefato gerado**: se desatualizado, regenerar; nunca editar à mão.

Auditoria de documentação encontra erro real. Um documento referenciado no índice que não
existe é o sintoma clássico de que ninguém rodou a verificação.

## 9. Checklist de início

- [ ] Li `.github/copilot-instructions.md` deste projeto.
- [ ] Sei qual artefato é a fonte de verdade do que vou mudar.
- [ ] Se existe spec da área, li a seção de fora de escopo.
- [ ] Se a área é sensível, li o documento de aprendizados.
- [ ] Estou numa branch adequada e sei o estado do working tree.
- [ ] Conheço ou planejei o baseline; não apresento validação não executada como medição.

## 10. Checklist de fechamento

- [ ] Executei a validação autorizada antes/depois e reportei medições, ou declarei o que ficou apenas planejado.
- [ ] Teste novo detecta regressão; prova por mutação realizada quando aplicável, restaurada e lacunas explícitas.
- [ ] Declarei o que **não** é coberto pela validação que rodei.
- [ ] Registrei a execução no plano (arquivos, resultado, desvios, pendências).
- [ ] Indiquei ou efetuei a atualização do roadmap correspondente, conforme autorização e papel.
- [ ] Reportei o que encontrei e **não** alterei, com o motivo.
- [ ] Não deixei mutação/temporário e preservei as alterações alheias do working tree.

---

## 11. Como adotar em outro projeto

O kit pode ser guardado no próprio repositório consumidor ou copiado para um local conhecido.
Mantê-lo como subpasta de referência não o ativa: instruções, índice e agente precisam ser
instalados nos caminhos que o projeto e o VS Code reconhecem.

### 11.1 Primeiro pedido à IA: auditoria sem escrita

Em um repositório Git vazio, comece pedindo análise e proposta, ainda sem pedir a instalação:

> Analise este repositório para preparar a instalação do workflow do kit. Nesta etapa, não
> crie nem altere arquivos. Identifique estado real do repositório, idioma, stack/configuração
> existente, convenções, comandos verificáveis, testes, deploy, segurança, tipos de dados e
> integrações. Não leia registros pessoais, dumps, credenciais ou conteúdo de arquivos secretos.
> Separe fatos observados, hipóteses, lacunas e perguntas de confirmação para mim. Proponha como
> adaptar e instalar apenas as instruções, a governança documental e o agente autorizados, sem
> criar specs, diagnósticos, planos, backlog, código de produto ou stack por conta própria.
> Informe os limites de permissão do agente e o que depende de decisão humana.

**O que a IA deve inspecionar**:

- Estado Git, branch e arquivos existentes, distinguindo repositório realmente vazio de
  repositório apenas sem documentação. Preservar arquivos e instruções que já existam.
- Linguagem, pontos de entrada, dependências, comandos disponíveis e testes já configurados;
  ler `package.json`, workflow CI, configuração e exemplos de código quando presentes.
- Ambientes e destinos de deploy, tipos e localização de dados, integrações externas e operações
  difíceis de reverter. Não testar escrita nem inferir configuração secreta.
- Configuração e esquemas podem ser avaliados para identificar formatos e fluxos, mas não abrir
  registros pessoais ou copiar dados reais para a conversa por padrão. Não ler `.env`, tokens,
  chaves privadas, dumps ou arquivos equivalentes. Se uma inspeção de conteúdo for indispensável,
  explicar o motivo, limitar o recorte e pedir autorização explícita antes. Preferir schema,
  metadados, dados sintéticos ou amostra previamente redigida.
- Perfil do usuário e do time: público, idioma, experiência técnica, necessidades de acessibilidade,
  quem decide e quais ferramentas/agentes o ambiente realmente suporta.
- Formatos de customização disponíveis no host (VS Code, editor/CLI ou outro). Não assumir
  que `.github/agents/*.agent.md` é descoberta automaticamente fora de um host compatível.

**Saída desta etapa**: perfil observado do repositório, perfil de uso informado pelo responsável,
fatos, hipóteses, lacunas, riscos e perguntas de confirmação. Incluir uma proposta de adaptação e
arquivos/diretórios do kit, sem produzir ainda um diff de instalação. Se o repo estiver vazio,
isso apenas confirma que produto, regras, deploy e testes ainda não estão definidos; não é licença
para preenchê-los por convenção.

### 11.2 Decisões antes de instalar

Depois de apresentar o que observou, a IA resume o entendimento e pergunta o que não pode ser
deduzido com segurança. Não precisa perguntar novamente fatos visíveis na configuração: deve
apontá-los e pedir correção somente se houver ambiguidade. Perguntas de confirmação típicas:

- **Usuário e trabalho**: quem usará o projeto, para que tarefas, em qual idioma e com qual nível
  de familiaridade técnica? Há requisitos de acessibilidade ou restrições de uso relevantes?
- **Dados**: que tipos de dados o sistema manipula? São pessoais, financeiros, de saúde,
  confidenciais ou regulados? Em quais ambientes existem dados reais? A IA está autorizada a
  inspecionar conteúdo real ou deve limitar-se a schemas, metadados e amostras sintéticas/redigidas?
- **Stack**: a stack detectada é uma decisão existente ou apenas um ponto de partida? Há runtime,
  hospedagem, provedores ou dependências preferidos/proibidos? Se não houver decisão, a IA pode
  comparar opções e recomendar uma, sem instalar dependências ou gerar scaffold de aplicação?
- **Governança**: quem aprova regras de produto, segurança, acesso a dados e publicação? Quais
  operações e caminhos o agente pode editar, e quais comandos/ações ficam reservados ao responsável?
- **Kit e host**: quais artefatos e agente deseja instalar? Em qual editor/host o agente será usado?

O responsável confirma ou ajusta, no mínimo:

- Onde ficam instruções, índice, roadmap, specs, diagnósticos, planos, referências e arquivo
  histórico; quais desses artefatos o projeto realmente quer manter.
- Linguagem, runtime, estrutura, comandos de teste/build, estratégia de deploy e estado inicial
  de CI. Marcar como **desconhecido/não configurado** o que ainda não existe.
- Autoridade de produto: quem aprova comportamento, acesso a dados, segurança, publicação e
  operações remotas. Definir fonte por assunto, não um ranking universal de documentos.
- Protocolo de branch/Git, operações que o agente pode executar, operações reservadas ao humano
  e como a revisão/publicação ocorre. O kit não concede permissões.
- Se quer o agente arquiteto no host atual. Se não, os modelos e instruções continuam utilizáveis
  sem agente customizado.

Registrar separadamente fatos do repositório e decisões do responsável. Não tratar silêncio como
autorização para ler dados reais, instalar dependências, escolher uma stack ou executar ações.
Recomendações podem ser apresentadas com prós, contras e premissas, mas dependem de confirmação
antes de virar configuração.

Não criar spec ativa de funcionalidade sem comportamento aprovado. Não produzir diagnóstico ou
plano só porque há um modelo disponível; esses artefatos serão usados em sessões futuras quando a
necessidade aparecer. Não afirmar cobertura quando não há teste nem declarar “sem ambiente” como
decisão permanente se isso só não foi investigado.

### 11.3 Instalação inicial após autorização

Após a confirmação do perfil e da proposta, o responsável autoriza a instalação. O executor
aplica somente a adaptação aprovada, em alterações pequenas e revisáveis. O objetivo é deixar o
workflow do kit configurado para uso futuro, não iniciar o desenvolvimento do produto:

1. Copia/adapta `copilot-instructions.template.md` para o formato de instruções do host e
   preenche apenas fatos confirmados. Se usar VS Code, conferir a compatibilidade do formato.
2. Copia/adapta `docs-readme.template.md` como índice e governança. Ajusta destinos e remove
   entradas de pastas que o responsável decidiu não criar.
3. Cria somente os diretórios necessários para os artefatos escolhidos, sem replicar toda a
  estrutura de exemplo por padrão.
4. Deixa os templates de spec, diagnóstico e plano disponíveis para uso posterior. Não cria
  documentos de trabalho nem spec ativa durante a instalação do kit.
5. Não cria roadmap/backlog, código de produto, scaffold de aplicação, CI ou configuração de
  deploy, nem instala dependências como parte desta etapa. Esses trabalhos exigem pedido próprio.
6. Se autorizado, instala e adapta o agente conforme a seção 12. Seu perfil só planeja e não
   substitui as instruções de implementação.
7. Apresenta o diff por arquivo e pausa nos itens que exigem decisão. Instalar os arquivos não
  aprova o conteúdo, executa testes, cria branch/commit ou publica o workflow. O usuário poderá
  depois trabalhar com o agente ou iterar com o Copilot em novas sessões, conforme a necessidade.

### 11.4 Verificação de instalação

- Cada destino existe, tem uma finalidade e usa os caminhos reais do projeto; links relativos
  resolvem. Placeholders remanescentes estão marcados, não parecem fatos configurados.
- Instruções e agente não se contradizem; permissões declaradas correspondem às ferramentas e
  ao protocolo do responsável. `tools: [read, search, edit]` não impõe sandbox de diretório.
- A inspeção respeitou o limite de dados aprovado; nenhum dado real ou segredo foi incluído em
  instruções, agente, documentação ou resumo sem necessidade e autorização.
- Um arquivo de teste/solicitação simulada permite conferir se o agente identifica a fonte
  correta, pergunta sobre ambiguidade e limita sua atuação ao papel. Não pedir mudança real de
  produto só para testar a instalação.
- O dono revisa o conteúdo antes de ativar/publicar. Não executar testes que ainda não existem,
  criar CI, instalar dependências ou alterar configurações de deploy sem aprovação.

Para projetos já existentes, usar a mesma sequência de análise, confirmação e instalação, mas
mapear as fontes presentes antes de criar substitutos. A existência de uma pasta ou arquivo com
nome semelhante não prova que tenha a mesma autoridade.

## 12. Como instalar e usar o arquiteto

### Instalação opcional no VS Code

1. Criar `.github/agents/` no projeto consumidor, se ainda não existir.
2. Copiar `software-architect.agent.template.md` para `.github/agents/software-architect.agent.md`.
   O destino precisa terminar em `.agent.md`; o arquivo guardado no kit é um modelo, não instalação automática.
3. Preencher o bloco **Configuração do projeto** no agente: caminhos das instruções, índice,
   roadmap/specs, modelos e pastas autorizadas. Conferir que existem no consumidor.
4. Revisar o frontmatter: `name`, `description`, `tools: [read, search, edit]`, `agents: []`
   e `user-invocable: true`. Não acrescentar terminal ou delegação só para contornar o papel.
5. Abrir o Chat do VS Code e selecionar **Arquiteto de Software** no seletor de agentes.
   Se não aparecer, conferir extensão `.agent.md`, pasta, sintaxe do frontmatter e configuração
   de descoberta da instalação; reabrir o chat/recarregar a janela quando necessário.

No repositório de origem já há um perfil local chamado `arquiteto-software.agent.md`;
não instalar a cópia genérica por cima dele sem adaptar. Os templates compartilhados dão
formato aos artefatos, mas instruções e governança locais continuam definindo as regras.

### Pedidos e passagem para execução

- Para investigar: “Analise o problema informado, confronte código e contrato e registre
  evidências, hipóteses e opções. Não implemente a correção.”
- Para planejar: “Prepare um plano para a decisão aprovada, com cartões por dependência,
  critérios verificáveis e provas a executar. Marque decisões bloqueantes; não implemente.”
- O responsável resolve ambiguidades e aprova o escopo. Proposta salva não significa tarefa liberada.
- Depois, selecionar o agente de implementação autorizado e fornecer o plano, decisões
  fechadas, cartões liberados e política de validação. Não há handoff que execute código automaticamente.
- O executor mede baseline, implementa um cartão, valida e registra antes dos dependentes.
  Ao atingir o teto de falha, bloqueia o cartão e pede decisão; só segue independente autorizado.

### Limites reais

O arquiteto pode ler/pesquisar e escrever documentos autorizados; não executa terminal,
testes, Git, deploy ou subagentes. Recebe estado confiável de branch/working tree ou o pede
ao responsável, sem fingir comando executado. Planeja testes, não inventa seus resultados.

O campo `tools` limita categorias, **não é sandbox de diretórios** para a ferramenta de edição.
Se for necessária barreira técnica de escrita, configurá-la no ambiente; não prometer que
uma frase no agente impede acesso a outros arquivos. Um perfil deste kit também não altera
permissões do editor, do sistema operacional ou da plataforma Git.

## 13. Fundamentos e referências

Os incidentes, o antigo processo de relatórios, exemplos de Git/PowerShell e a matriz de
revisão do EXPORT estão em [rationale.md](rationale.md), fora do guia de operação.

Referências de adaptação: [Diátaxis](https://diataxis.fr/), [PRD — Atlassian](https://www.atlassian.com/agile/product-management/requirements),
[planejamento — Atlassian](https://www.atlassian.com/work-management/project-management/project-planning),
[postmortems — Google SRE](https://sre.google/sre-book/postmortem-culture/),
[ADRs — Microsoft](https://learn.microsoft.com/en-us/azure/well-architected/architect-role/architecture-decision-record)
e [agentes customizados — VS Code](https://code.visualstudio.com/docs/copilot/customization/custom-agents).
Não são um formato universal nem razão para copiar todas as ferramentas/processos.
