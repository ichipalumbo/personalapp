# Fundamentos e lições para adaptar o kit

> **Origem**: EXPORT de práticas do `personalapp`, extraído em 2026-09-30.
> **Revisão para o kit**: 2026-10-16, incorporando a auditoria de governança documental.
> Material de apoio com exemplos de um projeto real; não é segunda instrução permanente,
> fonte de regra de negócio ou autorização para executar comandos no projeto consumidor.

Os modelos e o [guia de uso](README.md) organizam a aplicação das práticas. Este documento
explica motivos, incidentes e limites. Nomes de produto, caminhos antigos e escolhas de
ambiente são contexto de origem, não dependências que outro projeto deva reproduzir.

---

## 1. Instruções específicas e verificáveis

O aprendizado de origem foi tornar explícitos permissões, arquitetura, execução real,
áreas sensíveis e limites de validação. Regras como "não inventar um comando de dev" ou
"confirmar escrita sensível no servidor" existem para prevenir um erro observável.

Levar para outro projeto o **método** de descrever regra, motivo, risco e verificação,
não a stack, as URLs ou a preferência pessoal de origem. Um projeto novo não precisa
esperar um incidente para adotar uma barreira preventiva; basta declarar seu fundamento.
O [template de instruções](copilot-instructions.template.md) é o ponto de adaptação,
mantido conciso e com ponteiros para detalhes que não precisam estar sempre no contexto.

---

## 2. Autoridade por assunto, não ranking universal

O EXPORT original separava instrução, spec e prompt, mas ainda chamava a decisão de produto
de "congelada" e repetia `código > specs`. A revisão distingue o contrato aprovado do
comportamento observado: código pode demonstrar um bug, não aprová-lo.

Spec é viva no contrato; plano é vivo na frente; diagnóstico é datado na investigação.
Prompt delimita uma tarefa e não redefine regras permanentes. Decisão de produto que
surge na conversa precisa de aprovação e registro na fonte durável, não apenas no prompt.

Um problema real de manutenção foi repetir números de versão em índice e instruções;
a spec avançava e o leitor confiava no número antigo. Manter o número/status na fonte,
sem proibir medições datadas e listas de arquivos legítimas no registro de execução.
O [modelo de governança](docs-readme.template.md) e o [modelo de spec](spec.template.md)
explicitam essas fronteiras, inclusive decisões/casos de borda e fora de escopo.

---

## 3. Memória do projeto sem diário redundante

O processo antigo usava `docs/_reports/` por rodada e depois sagas. Isso preservava motivos,
mas espalhava estado, duplicava resultados e exigia várias leituras para retomar uma frente.
Esse processo é **histórico, não o fluxo recomendado por este kit**.

O padrão revisado guarda execução no plano aberto, contrato na spec, prioridades no roadmap
e procedimentos no guia operacional. Não exige diagnóstico + spec + plano para toda tarefa:
uma causa evidente pode dispensar investigação autônoma; uma correção de regra existente
não precisa de contrato novo. Uma frente aberta recebe o registro em seu próprio plano.

Preservar três categorias de conhecimento que se perdem facilmente:

- Risco não tratado, com fonte/base e responsável quando houver; não presumir que continua ativo.
- Limite aceito por decisão, que não deve reaparecer como bug por ignorar seu motivo.
- Armadilha verificada e seu teste de prevenção, sem repetir toda a saída bruta no contexto.

Arquivar facilita a navegação, mas não encerra defeito, publica código ou autoriza poda.
Antes de mover/remover texto, identificar conteúdo único, destino e autorização. Não
reescrever conclusão histórica para fazê-la parecer uma constatação atual.

Um contexto opcional para novas conversas pode apontar fontes e registrar decisões humanas
ou infraestrutura fora do código. Não precisa ser mais uma cópia das instruções; relatos
em primeira pessoa não devem ser reescritos pelo agente sem autorização de quem os assina.

---

## 4. Git: preservar a barreira, adaptar a permissão

A política Git foi uma das práticas mais valorizadas no relato de origem. O incidente
abaixo justifica uma barreira concreta, não uma proibição universal de automação.

### 4.1 O problema real que a política resolve

Um agente criou uma branch com `git checkout -b <nome> origin/main` (sem `--no-track`). O
Git configurou o upstream da branch nova como `origin/main`, e um push subsequente (inclusive
o botão "Sync Changes" do VS Code) foi **direto para a `main`**, sem PR, sem revisão — e
disparou deploy em produção sem ninguém ter revisado o diff.

### 4.2 Perfil conservador adotado na origem

O projeto de origem reservou publicação ao humano e limitou alterações Git do agente.
O perfil abaixo é **exemplo para decisão local**, não permissão concedida por este kit:

- O agente pode executar **no máximo duas operações git por conta própria**, e **só após
  confirmação explícita** do dono a cada vez:
  - `git fetch origin`
  - `git switch -c <nome> origin/main --no-track`
- **O `--no-track` é obrigatório** — é a correção direta do incidente acima.
- **Nunca usar `git checkout -b <nome> origin/main`** (sem a flag).
- O **push é sempre feito pelo dono** (humano), nunca pelo agente. O primeiro push de uma
  branch nova precisa de `-u` para registrar o upstream corretamente e permitir abrir PR:
  `git push -u origin <nome>`.
- **Proibido ao agente**: commit, push, merge, rebase, `reset`, `restore`, `stash`,
  `checkout` de arquivo, tag, alteração de `.git/config`.
- **Toda mudança entra na branch principal por pull request.** Nunca push direto, mesmo
  quando o Git permitiria.
- Se o agente notar que a branch atual já tem upstream apontando para a branch principal
  (verificável com `git config --get-regexp "branch\..*\.merge"`), deve **reportar antes de
  qualquer escrita**, não seguir silenciosamente.

Na adoção, separar consultas de branch/status/diff das operações que alteram estado e
declarar quem pode criar branch, fazer commit, abrir PR e publicar. Configurar proteção
de branch e CI quando pertinentes: instrução em Markdown não é garantia técnica contra push.

### 4.3 O protocolo de pergunta no início de cada rodada

Quando o projeto escolher o protocolo de pergunta por rodada, antes de escrever o agente pergunta se o
dono quer uma branch nova a partir da principal ou continuar na atual — informando: branch
atual, se há alterações não commitadas, e um nome sugerido (sem indicar opção recomendada,
para não induzir a resposta).

Regras que evitam o problema de loop (ver R1 na seção 5):

- **A pergunta é pré-condição, não tarefa.** Ler código enquanto espera é permitido;
  escrever não.
- Depois de respondida, o agente **continua no mesmo turno** até concluir a rodada —
  encerrar o turno tendo só resolvido a questão da branch é tratado como falha do processo.
- **Resposta ausente ou ambígua → perguntar de novo.** Nunca presumir a escolha.
- **Working tree sujo + pedido de branch nova → parar e relatar.** Decisão do dono, não do
  agente.
- Convenção de nome: `<tipo>/<escopo-curto>` (tipos: `fix`, `feat`, `chore`, `docs`, `diag`,
  `refactor`).

### 4.4 Variante observada em prompts de execução (`docs/TEMPLATE-...`)

Numa variação do fluxo (quando o dono cria a branch com script próprio fora do agente), o
protocolo do agente muda de "pedir para criar" para **"verificar e parar se divergir"**:

1. Ler a branch atual.
2. Se for a esperada: registrar "pré-condição satisfeita" e seguir sem perguntar.
3. Se não for: emitir **uma única** mensagem com branch atual, estado do working tree,
  branch sugerida e duas opções executáveis pelo dono — "já criei, reverifique" /
   "continuar na atual" — e parar.

A ideia central, reaproveitável em qualquer projeto: **nunca ofereça ao usuário uma opção
que dependa de uma ação que o próprio agente não tem permissão de executar.** Isso é a causa
raiz mais comum de loop em fluxo de branch.

---

## 5. Regras estruturais para prompts de execução (agente "executor")

Os papéis de arquiteto e executor separam investigação/planejamento de implementação.
Não representam uma garantia de qualidade ou uma escolha obrigatória de modelo/preço.
Um prompt de execução pode delimitar uma tarefa liberada, sem reproduzir todo o manual.

Quatro regras, cada uma nascida de uma falha real observada:

- **R1 — nunca faça o agente perguntar algo cuja resposta exija uma ação proibida a ele.**
  Se a ação é do dono, o bloco deve ser "pare e reporte", não "pergunte se quer que eu
  faça". Violar isso produz loop sem saída (visto na prática com a pergunta de branch).
- **R2 — todo laço de retentativa precisa de teto e de saída registrada.** Nunca "corrija e
  repita" sem limite. Ao atingir o teto, bloquear o cartão e seus dependentes, registrar
  a evidência e pedir decisão. Trabalho independente só avança com autorização; registrar
  falha não é cumprir o critério de aceite.
- **R3 — símbolo que aparece mais de uma vez no código-alvo exige linha aproximada,
  indentação e um vizinho de contexto identificável no prompt.** Sem isso, o agente aplica
  a mutação no lugar errado e ainda assim reporta sucesso (aconteceu: indentação diferente
  em 1 espaço, mutação não aplicou, saída de outra mutação foi colada como evidência).
- **R4 — se a tarefa exige uma operação, essa operação não pode estar na lista de
  proibições genéricas.** Declarar permissões/exceções por escopo, sem transformar a necessidade
  de provar um teste em autorização de restore amplo ou de apagar trabalho alheio. Reverter
  precisamente a mutação própria e conferir o estado antes de continuar.

Estrutura de prompt recomendada (esqueleto usado aqui), útil como checklist:

1. Cabeçalho de identidade: o defeito em uma frase, número da etapa, se é ativo ou latente,
   escopo mínimo declarado (para inibir refactor espontâneo).
2. Contexto opcional com caminho completo de arquivo/seção (nunca nome solto).
3. Bloco de ambiente (SO, shell, como não usar `&&` no PowerShell, como não redirecionar
   saída em encoding errado, se existe ou não ambiente local).
4. Bloco de branch — verificação, não criação (seção 4.4).
5. Bloco de skills permitidas/proibidas nesta rodada.
6. Tabela de etapas anteriores e seu estado (fechada/em andamento), com uma instrução clara
  de onde registrar defeito fora de escopo. Se bloquear o fechamento, registrar o bloqueio
  e obter autorização antes de ampliar a intervenção.
7. **"Portão de base"**: comandos a rodar **antes de editar qualquer coisa**, com os valores
   esperados de cada um documentados lado a lado (branch, contagem de ocorrências de um
   símbolo que assina uma correção anterior, resultado da suíte de teste). Se um valor não
   bater, parar e reportar em vez de seguir.
8. Descrição do defeito atual e do critério de aceite.

**Falhas relatadas em execuções** (evidências de risco do processo, não avaliação universal
de uma família de modelos):

- Produz "evidência decorativa" (teste que verifica o próprio texto-fonte, ou que
  sobrescreve o handler que deveria testar) mesmo sob proibição explícita.
- Justifica em prosa uma mutação que não foi de fato aplicada, em vez de admitir a falha.
- Rodadas com muitos itens deixaram verificações pequenas esquecidas; decompor por resultado
  e dependência, não assumir um número universal de tarefas que qualquer modelo consegue executar.
- Inventa API interna plausível por analogia de nome, em vez de confirmar onde ela é
  definida.

**Contramedida geral adotada**: exigir "prova por mutação" — todo teste novo deve ser
comprovado revertendo a correção e confirmando que o teste passa a falhar; se não falhar,
não é cobertura.

---

## 6. Convenções de código e arquitetura que vale generalizar

- **Isolamento de dados por identidade do usuário**: se o app é multiusuário, toda consulta
  de leitura/escrita ao banco deve ser filtrada por um identificador de dono, obtido sempre
  pela mesma função utilitária central — não espalhar essa checagem "na mão" em cada rota.
  Documentar explicitamente que **não existe outra camada de proteção** contra vazamento
  entre contas, se for o caso.
- **Módulo compartilhado entre duas camadas (ex.: frontend/backend) não pode depender de
  globais exclusivos de uma delas** (ex.: `window`, `document`). Usar módulo compatível
  com ambos os ambientes (`module.exports` + fallback de global era o exemplo local), sem
  impor esse formato a toda stack. Deixar isso registrado como regra de
  arquitetura, com o motivo (evitar que a mesma regra de negócio seja calculada de duas
  formas diferentes e divirja silenciosamente).
- **Implementação única de regra de negócio.** Se dois lugares do código parecem precisar
  da mesma regra, a regra deve morar em um módulo único consumido por ambos — nunca
  duplicada. Registrar o incidente real que motivou a regra (aqui: uma cópia local de regra
  de prazo divergiu da oficial e o erro só apareceu em produção).
- **Ordem de rotas HTTP**: rotas literais antes de rotas com parâmetro dinâmico, sempre que
  o framework resolver por ordem de declaração (Express, por exemplo).
- **Ordem de carregamento de script sem bundler**: se o frontend não tem build step e
  depende de tags `<script>` em sequência, documentar explicitamente a dependência de ordem
  e manter um teste automatizado que valida essa ordem (aqui existe
  `tests-frontend/index-html-ordem.test.js`, atualizado a cada novo script que lê um global
  no topo do arquivo).
- **Escrita de dado sensível (ex.: financeiro) só é considerada concluída após confirmação
  do servidor** (HTTP 200/201), nunca com base em estado local otimista — mesmo que o
  restante da UI use optimistic UI por padrão. Documentar a exceção explicitamente.
- **Campo "congelado" após a primeira gravação** (snapshot que não deve ser recalculado
  retroativamente) é um padrão explícito e documentado, não um efeito colateral acidental —
  evita que um agente "corrija" um valor que parece desatualizado mas é intencionalmente
  imutável.

---

## 7. Perfil de ambiente: exemplo Windows/PowerShell

Aplicar somente ao ambiente correspondente, verificando versão do shell e ferramenta.
São lições de origem, não instruções para shells Unix nem instalação implícita de runtime:

- **Nunca embutir código multi-linha com aspas aninhadas em `node -e "..."` (ou
  equivalente)** no PowerShell — aspas duplas dentro de aspas duplas quebram o parser e o
  terminal entra em estado de continuação (prompt repetindo a linha), que o gerenciador de
  tarefas do agente interpreta como comando pendurado. Preferir escrever um arquivo de
  script temporário, executar, remover — ou usar busca textual do workspace em vez de
  script para perguntas simples ("onde isso existe", "quantas ocorrências").
- **Background não prova sucesso, falha ou travamento.** Em um comando supostamente curto,
  inspecionar a saída e os prompts antes de repetir/interromper. Um prompt de continuação
  `>>` por aspas abertas não é teste demorado; uma suíte longa sem saída pode ser legítima.
  Seguir o protocolo de leitura/retomada da ferramenta, sem polling cego.
- **Redirecionamento de saída com `>` no PowerShell 5.1 sai em UTF-16**, ilegível por
  ferramentas de leitura de texto puro. Usar `2>&1 | Out-File -Encoding utf8` quando
  precisar salvar saída de comando em arquivo.
- **Medir exit code de verdade**: pipelines com `Select-String`/`npm` mascaram o código de
  saída real. Preferir capturar a saída, filtrar por padrão de interesse (`tests \d+`,
  `pass \d+`, `fail \d+`) somente depois de guardar `$LASTEXITCODE`. No Node, escolher TAP
  explicitamente quando o resumo depender desse formato; não inventar contagens se o parser falhar.
- **Confirmar o diretório de execução** no terminal persistente. Usar base explícita e
  navegação verificada; um caminho relativo é adequado quando sua base é conhecida, não
  uma razão para decretar caminhos absolutos em todo comando.
- Guardar esse tipo de lição em **memória de repositório** (arquivo dedicado, não
  espalhado pelas instruções gerais) para reaproveitar entre sessões sem repetir o erro.

---

## 8. Skills vendorizadas — não editar

Quando uma skill de terceiro é importada, registrar a política de atualização e onde ficam
as regras próprias do projeto. O caso de origem não transforma qualquer skill local em
material vendorizado nem impõe um catálogo específico. Documentar:

- origem/revisão e condição de material vendorizado, em metadados ou manifesto apropriado;
- que **não deve ser editada localmente**, porque a próxima atualização/sincronização
  sobrescreve qualquer alteração feita ali;
- onde regras **próprias** do projeto (mesmo que relacionadas ao mesmo tema da skill
  vendorizada) devem viver em vez disso — um arquivo separado, não vendorizado.

---

## 9. Resumo — o que priorizar ao portar para o outro projeto

1. Definir fontes e permissões reais, incluindo comportamento aprovado versus observado.
2. Escolher política Git/revisão/publicação e suas barreiras técnicas; considerar o incidente de upstream.
3. Separar contrato, investigação e execução, sem impor três documentos para toda tarefa.
4. Exigir validação discriminante e resultados medidos, com limites declarados.
5. Manter um backlog oficial enxuto e preservar motivos de decisões nas fontes adequadas.
6. Registrar áreas sensíveis, dependências e limites de reversão do projeto de destino.
7. Instalar o arquiteto opcional somente depois de adaptar caminhos/política; passar o plano
  aprovado para implementação sem confundir proposta salva com autorização.

## Rastreabilidade da revisão do EXPORT

| Seção de origem | Tratamento neste documento/kit |
|---|---|
| 1 — instruções permanentes | Motivos preservados na seção 1; prescrição e campos ficam no template de instruções |
| 2 — camadas e metadados | Generalizada na seção 2; acrescidos autoridade por assunto e contrato evolutivo |
| 3 — memória documental | Processo de relatórios/sagas identificado como superado; lições e continuidade preservadas na seção 3 |
| 4 — Git | Incidente e perfil conservador preservados como exemplo, sem impor a mesma permissão a todo consumidor |
| 5 — execução | Regras R1–R4 preservadas/corrigidas; falha bloqueia dependentes e papéis não são classes de modelo |
| 6 — arquitetura | Princípios preservados com exemplos adaptáveis, não uma stack obrigatória |
| 7 — terminal | Mantido como perfil de ambiente e corrigido o tratamento de diretório, formato e exit code |
| 8 — terceiros | Política de origem/atualização preservada sem dependência de skill específica |
| 9 — prioridades de adoção | Atualizada para o processo revisado, sem recomendar relatório por rodada |
