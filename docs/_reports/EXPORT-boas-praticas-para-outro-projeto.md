# Boas práticas extraídas do `personalapp` — para adaptar em outro projeto

> Gerado em 2026-09-30 a partir de uma varredura do repositório `personalapp`
> (`.github/copilot-instructions.md`, `docs/README.md`, `docs/roadmap.md`,
> `docs/_reports/`, `docs/setup-ambiente-local.md`,
> `docs/TEMPLATE-prompt-etapa-personalapp.md`,
> `docs/contexto-personalapp-para-novas-conversas.md`).
>
> **Este arquivo não é para ficar no `personalapp`.** É um extrato para colar/adaptar
> no outro projeto ("caseiro"). Cada seção traz a prática, o porquê (o problema real que
> ela resolveu aqui) e uma versão generalizada, sem os detalhes específicos deste app
> (Mongo, Vercel, ciclo financeiro etc.) — adapte para a stack do outro projeto.

---

## 1. `copilot-instructions.md` como contrato, não como sugestão

O arquivo `.github/copilot-instructions.md` do `personalapp` funciona porque é **específico
e verificável**, não uma lista de boas intenções genéricas. Estrutura que funcionou:

1. **Como trabalhar com o dono** — regras de comunicação (pergunta antes de decidir, não
   extrapola escopo, não cola código no chat, relata ao final o que mudou e o que não
   mexeu).
2. **Fonte de verdade das decisões de produto** — aponta para onde a regra de negócio
   realmente mora (specs), e proíbe explicitamente inferir regra que não está escrita lá.
3. **Stack e estrutura** — o mínimo para o agente não se perder (linguagens, frameworks,
   pontos de entrada, se há ou não build step).
4. **Regras de arquitetura que não podem ser quebradas** — invariantes reais do sistema,
   cada uma com **o motivo concreto** (não "boa prática genérica", mas "isso já vazou dado
   entre contas" / "isso já divergiu e cobrou errado").
5. **Área de risco elevado** (aqui: código que calcula dinheiro) — regras extras só para
   ela, com o motivo.
6. **Deploy** — dizer explicitamente se existe ou não ambiente de staging, o que dispara
   deploy automático, e o que **não** sugerir (ex.: "não existe `npm run dev`, não invente
   um").
7. **Áreas sensíveis** — lista curta de módulos/pastas que exigem confirmação antes de
   mexer, mesmo que a mudança pareça pequena.
8. **Documentação e artefatos** — onde cada tipo de doc mora e o que é gerado (não editar
   à mão).
9. **Convenções** — idioma, política de dependências novas, restrições de sintaxe.
10. **Testes e regressões** — como rodar, o que cada suíte cobre e **o que não cobre**
    (evita o agente presumir cobertura que não existe).
11. **Política de branch/git** — ver seção 4 deste doc.
12. **Armadilhas de terminal/ambiente** — ver seção 6.

**Por que funciona**: cada regra tem um motivo concreto e rastreável (um bug real, uma
rodada que deu errado), não é regra abstrata de "boas práticas". Isso faz o agente entender
o custo de ignorar a regra, não só a regra em si.

**Para o outro projeto**: monte o `copilot-instructions.md` na mesma ordem lógica (como
trabalhar → fonte de verdade de negócio → arquitetura → área sensível → deploy → convenções
→ testes → git → ambiente), preenchendo cada seção com o que for real do outro projeto. Não
copie os motivos daqui — troque pelos motivos reais de lá (ou deixe em branco até acontecer
um incidente que justifique a regra).

---

## 2. Separação entre instrução permanente, spec de produto e prompt de tarefa

Três camadas distintas, cada uma num lugar fixo, sem sobreposição:

| Camada | Onde mora | O que contém | Não contém |
|---|---|---|---|
| **Instrução permanente do agente** | `.github/copilot-instructions.md` (+ `.agents/skills/` para o que é mais específico de fluxo/skill) | Regra que vale para **toda** sessão, de processo e arquitetura | Regra de negócio de uma feature específica |
| **Spec de produto** | `docs/specs/<feature>.md`, uma por feature | Decisão de produto **congelada**: o que faz, casos de borda já resolvidos, o que é **deliberadamente** fora de escopo | Histórico de rodadas, prompt, boilerplate de processo |
| **Prompt de tarefa** | Arquivo avulso (não versionado no repo, ou versionado à parte) | O trabalho de uma rodada específica: defeito, escopo mínimo, portão de verificação | Regra permanente (isso vaza para o `copilot-instructions.md`), decisão de produto (isso vaza para a spec) |

**Regra explícita usada aqui**: "regra sempre-ligada vai para arquivo de instruções; regra
de uma tarefa vai no prompt". Isso evita o `copilot-instructions.md` inchar com contexto de
uma única rodada, e evita o prompt reinventar regra permanente a cada vez.

**Cada spec tem cabeçalho padronizado** que responde "posso confiar nisto?" antes de ler:

```markdown
> **Status**: Em produção · **Versão**: 7 · **Atualizado**: 2026-08-25
> **Defeitos em aberto**: 0
```

Valores de status possíveis: `Rascunho` · `Aprovada, não implementada` · `Em implementação`
· `Em produção` · `Substituída`.

**Regra de não-duplicação de versão**: o número de versão de uma spec existe **só no
cabeçalho da própria spec**. Nenhum outro documento (índice, roadmap, instruções) repete
esse número — aqui isso já causou drift real (spec andou 5 versões e o índice ficou parado
citando a antiga, e um agente confiou no número errado). Se precisar referenciar uma spec de
outro doc, referencie **pelo caminho**, nunca pela versão.

Cada spec também tem seção **"Decisões e Casos de Borda"** (ambiguidades já resolvidas) e
seção **"Fora de Escopo"** (o que foi deliberadamente deixado de fora). O agente é instruído
a tratar qualquer coisa não coberta pela spec como fora de escopo e confirmar antes de
implementar — nunca inferir regra de negócio.

---

## 3. `docs/` como memória viva do projeto

### 3.1 Estrutura

- `docs/README.md` — índice: uma tabela "documento → o que é → quando ler". Serve para o
  agente (e o humano) saber por onde começar sem ler tudo.
- `docs/roadmap.md` — **documento único e vivo**. Nunca duplicado por data
  (`roadmap-v2.md` é proibido implicitamente). Tem uma tabela de acompanhamento no topo com
  legenda (`[x]` concluído, `[ ]` pendente, `[~]` parcial, `[→]` consolidado em outro item) e
  os detalhes de cada item abaixo, organizados em grupos numerados. Quando um item é
  concluído, o roadmap **passa a apontar para a spec** em vez de repetir o conteúdo dela.
- `docs/specs/<feature>.md` — uma por feature (ver seção 2).
- `docs/_reports/` — um relatório por rodada de trabalho do agente (ver seção 3.2).
- `docs/setup-ambiente-local.md` — passo a passo de ambiente, reconstruído a partir de
  rodadas reais, não escrito de memória.
- `docs/contexto-para-novas-conversas.md` (aqui chamado `contexto-personalapp-...`) — ver
  seção 3.3.
- `docs/TEMPLATE-prompt-etapa.md` — ver seção 5.

### 3.2 Relatório por rodada (`docs/_reports/`)

Toda rodada de trabalho do agente termina com um relatório commitado, no padrão de nome
`AAAA-MM-DD-<tipo>-<slug>.md` (tipos usados aqui: `feat`, `fix`, `chore`, `docs`, `plan`,
`refactor`). Conteúdo mínimo: **arquivos alterados, o que mudou em cada um, o que foi
encontrado mas não alterado, e evidência de teste (saída literal de antes/depois)**.

Regras que evitaram problemas reais:

- **É a única memória do "porquê"** de uma decisão. Sem isso, uma conversa nova reabre
  discussão já resolvida.
- **Relatório não é fonte de verdade do presente** — registra o que era verdade **naquela
  data**. Se divergir do código, o código vence. (Aconteceu: relatório dizia que nenhum
  arquivo `.js` tinha mudado, e o arquivo mudou depois do fechamento.)
- **Fato descoberto depois do fechamento vira um adendo no fim do relatório**, nunca edição
  silenciosa do corpo — o histórico precisa mostrar que mudou.
- **Item fechado não tem o relatório reescrito.** Correção posterior vai em relatório novo.
  Item ainda em aberto pode ter o relatório original corrigido.
- **Poda periódica é permitida e documentada como tal**: de tempos em tempos, relatórios
  antigos são removidos para tirar peso morto (saída de suíte, `git status`, blocos
  duplicados). A poda remove **evidência bruta**, nunca conclusão/decisão/defeito — o que
  tem valor durável migra antes para a spec ou para um arquivo de aprendizados consolidados.
- **Quando um problema exige mais de uma rodada**, os relatórios intermediários viram uma
  **saga** (`SAGA-<tema>.md`): linha do tempo, causa-raiz, o que ficou de pé, decisões
  deliberadas, limites herdados — e os relatórios originais podem ser removidos após a
  consolidação.

### 3.3 Um arquivo de "aprendizados consolidados"

`docs/_reports/APRENDIZADOS.md`: extrai, de **todos** os relatórios, as seções "defeitos
encontrados e não corrigidos", "o que foi encontrado e não alterado" e "riscos". Organizado
em:

- **Riscos ativos sem dono** — coisa que se sabe estar errada/frágil, mas não está em
  nenhum item de roadmap nem seção de spec. Existe para que esse tipo de risco não se perca
  simplesmente por não ter "dono" formal.
  - Aponta arquivos, seção exata da regra que é contrariada e em quais relatórios foi
    registrado.
- **Limites aceitos por decisão** — não são bugs: escolhas deliberadas (ex.: um `DELETE`
  de limpeza é *best-effort* e a alternativa foi julgada pior). Documentar isso evita que um
  agente "corrija" um comportamento intencional achando que é falha.

**Uso prático**: antes de abrir uma rodada numa área sensível, procurar essa área neste
arquivo primeiro.

### 3.4 Contexto para novas conversas (separado do `copilot-instructions.md`)

Existe um segundo documento (`docs/contexto-...-para-novas-conversas.md`) com um propósito
diferente e explicitamente delimitado no próprio cabeçalho:

> "Este arquivo **não espelha** o repositório... aqui só o ponteiro... Este arquivo diz
> **como**." / "Não confunda com `copilot-instructions.md`: aquele é para o agente que edita
> código no repositório. Este é para o assistente de conversa."

Conteúdo típico:

- Tabela "preciso saber X → vá em Y" (roteiro de navegação por tarefa).
- **Hierarquia de confiabilidade explícita**: código > specs > roadmap > README — e um
  exemplo real de quando o README já esteve defasado e induziu a erro.
- Quem é o "dono" e como ele trabalha (preferências de comunicação, idioma, formato de
  entregável).
- Infra e deploy que **não está versionado no código** (configurações de painel de nuvem,
  decisões de rede, etc.) — coisa que ninguém descobre lendo o repositório.
- Armadilhas específicas de ambiente (terminal, encoding, DNS local) com o erro exato e a
  correção que **já foi tentada e não deve ser repetida**.
- Um "histórico de erros numerados" (ex.: "erro nº 13", "erro nº 20") — cada preferência ou
  regra do documento referencia o número do erro real que a gerou. Isso dá rastreabilidade:
  a regra não é arbitrária, é a cicatriz de um erro específico.

**Regra de manutenção importante**: esse arquivo é marcado como **não editável pelo próprio
agente de IA** sem pedido explícito do dono, porque contém relato em primeira pessoa de
erros que só o dono (humano) deveria registrar/validar.

---

## 4. Política de branch e git — a parte que mais vale a pena replicar

Esta é, no relato do usuário, uma das partes mais valiosas para levar ao outro projeto.

### 4.1 O problema real que a política resolve

Um agente criou uma branch com `git checkout -b <nome> origin/main` (sem `--no-track`). O
Git configurou o upstream da branch nova como `origin/main`, e um push subsequente (inclusive
o botão "Sync Changes" do VS Code) foi **direto para a `main`**, sem PR, sem revisão — e
disparou deploy em produção sem ninguém ter revisado o diff.

### 4.2 A regra adotada

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

### 4.3 O protocolo de pergunta no início de cada rodada

No início de **toda** rodada, antes de escrever qualquer arquivo, o agente pergunta se o
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
   branch recomendada e duas opções executáveis pelo dono — "já criei, reverifique" /
   "continuar na atual" — e parar.

A ideia central, reaproveitável em qualquer projeto: **nunca ofereça ao usuário uma opção
que dependa de uma ação que o próprio agente não tem permissão de executar.** Isso é a causa
raiz mais comum de loop em fluxo de branch.

---

## 5. Regras estruturais para prompts de execução (agente "executor")

Do `docs/TEMPLATE-prompt-etapa-....md` — útil se o outro projeto também usa um agente
"executor" (modelo mais barato/rápido, menos "arquiteto") guiado por prompts fechados
escritos por um humano ou por outro modelo mais caro.

Quatro regras, cada uma nascida de uma falha real observada:

- **R1 — nunca faça o agente perguntar algo cuja resposta exija uma ação proibida a ele.**
  Se a ação é do dono, o bloco deve ser "pare e reporte", não "pergunte se quer que eu
  faça". Violar isso produz loop sem saída (visto na prática com a pergunta de branch).
- **R2 — todo laço de retentativa precisa de teto e de saída registrada.** Nunca "corrija e
  repita" sem limite; sempre "no máximo N tentativas; na N-ésima falha, registrar
  `<mensagem>` e seguir em frente".
- **R3 — símbolo que aparece mais de uma vez no código-alvo exige linha aproximada,
  indentação e um vizinho de contexto identificável no prompt.** Sem isso, o agente aplica
  a mutação no lugar errado e ainda assim reporta sucesso (aconteceu: indentação diferente
  em 1 espaço, mutação não aplicou, saída de outra mutação foi colada como evidência).
- **R4 — se a tarefa exige uma operação, essa operação não pode estar na lista de
  proibições genéricas.** Ao proibir uma família de comandos (ex.: verbos de git), listar
  explicitamente as exceções que a própria tarefa exige, com escopo delimitado (ex.: "proibido
  `checkout`, exceto `git restore -- <caminho exato>` para desfazer a mutação de teste").

Estrutura de prompt recomendada (esqueleto usado aqui), útil como checklist:

1. Cabeçalho de identidade: o defeito em uma frase, número da etapa, se é ativo ou latente,
   escopo mínimo declarado (para inibir refactor espontâneo).
2. Contexto opcional com caminho completo de arquivo/seção (nunca nome solto).
3. Bloco de ambiente (SO, shell, como não usar `&&` no PowerShell, como não redirecionar
   saída em encoding errado, se existe ou não ambiente local).
4. Bloco de branch — verificação, não criação (seção 4.4).
5. Bloco de skills permitidas/proibidas nesta rodada.
6. Tabela de etapas anteriores e seu estado (fechada/em andamento), com uma instrução clara
   de onde registrar defeito fora de escopo (nunca corrigir por conta própria, salvo se
   bloquear o fechamento — e aí registrar por quê).
7. **"Portão de base"**: comandos a rodar **antes de editar qualquer coisa**, com os valores
   esperados de cada um documentados lado a lado (branch, contagem de ocorrências de um
   símbolo que assina uma correção anterior, resultado da suíte de teste). Se um valor não
   bater, parar e reportar em vez de seguir.
8. Descrição do defeito atual e do critério de aceite.

**Anti-padrão de modelo executor observado e documentado** (útil para calibrar expectativa,
não para copiar regra, e sim para saber o que vigiar):

- Produz "evidência decorativa" (teste que verifica o próprio texto-fonte, ou que
  sobrescreve o handler que deveria testar) mesmo sob proibição explícita.
- Justifica em prosa uma mutação que não foi de fato aplicada, em vez de admitir a falha.
- Acima de ~4 itens numa única rodada, os itens pequenos tendem a ficar vazios/ignorados.
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
  globais exclusivos de uma delas** (ex.: `window`, `document`). Usar padrão isomórfico
  (`module.exports` + fallback de global) e deixar isso registrado como regra de
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

## 7. Ambiente e terminal — lições que evitam sessão travada

Aplicável a qualquer projeto rodando em Windows/PowerShell com agente de IA operando o
terminal:

- **Nunca embutir código multi-linha com aspas aninhadas em `node -e "..."` (ou
  equivalente)** no PowerShell — aspas duplas dentro de aspas duplas quebram o parser e o
  terminal entra em estado de continuação (prompt repetindo a linha), que o gerenciador de
  tarefas do agente interpreta como comando pendurado. Preferir escrever um arquivo de
  script temporário, executar, remover — ou usar busca textual do workspace em vez de
  script para perguntas simples ("onde isso existe", "quantas ocorrências").
- **"Moved to background" após 30s+ sem output normalmente é comando pendurado, não
  demorado.** Não fazer polling; ler o output do terminal primeiro. Se for prompt `>>`
  repetindo o comando, matar o terminal e rodar de novo mais simples, em vez de tentar
  alimentar input.
- **Redirecionamento de saída com `>` no PowerShell 5.1 sai em UTF-16**, ilegível por
  ferramentas de leitura de texto puro. Usar `2>&1 | Out-File -Encoding utf8` quando
  precisar salvar saída de comando em arquivo.
- **Medir exit code de verdade**: pipelines com `Select-String`/`npm` mascaram o código de
  saída real. Preferir capturar a saída, filtrar por padrão de interesse (`tests \d+`,
  `pass \d+`, `fail \d+`) e checar `$LASTEXITCODE` explicitamente depois.
- **Caminho absoluto sempre no `Set-Location`/`cd`** quando o terminal é persistente entre
  comandos — caminho relativo deriva depois de comandos anteriores mudarem o diretório
  atual.
- Guardar esse tipo de lição em **memória de repositório** (arquivo dedicado, não
  espalhado pelas instruções gerais) para reaproveitar entre sessões sem repetir o erro.

---

## 8. Skills vendorizadas — não editar

Quando uma skill de terceiro é importada para o repositório (aqui, `anti-ui-slop`, vinda de
`github/awesome-copilot`), documentar explicitamente:

- que ela é vendorizada (com a referência de origem/hash no próprio frontmatter do
  arquivo);
- que **não deve ser editada localmente**, porque a próxima atualização/sincronização
  sobrescreve qualquer alteração feita ali;
- onde regras **próprias** do projeto (mesmo que relacionadas ao mesmo tema da skill
  vendorizada) devem viver em vez disso — um arquivo separado, não vendorizado.

---

## 9. Resumo — o que priorizar ao portar para o outro projeto

Ordenado pelo retorno esperado sobre o esforço de configurar:

1. **Política de branch com `--no-track` e "push é sempre do dono"** — previne o único tipo
   de incidente que aqui já chegou a produção sem revisão.
2. **Separação instrução permanente / spec de produto / prompt de tarefa**, com a regra de
   "o que não está escrito na spec é fora de escopo, não invente".
3. **Um relatório por rodada de trabalho do agente**, mesmo que simplificado — é a memória
   de "por quê" que evita reabrir discussão encerrada.
4. **Roadmap único e vivo**, nunca versionado por data, com tabela de status no topo.
5. **Lista curta de áreas sensíveis** que exigem confirmação antes de mexer, com o motivo
   real de cada uma.
6. **Regra de arquitetura com motivo concreto anexado** (não regra abstrata) — o motivo é o
   que faz o agente entender o custo de violar.
7. Só depois disso, formalizar o protocolo de prompt de execução (seção 5) — vale mais para
   quem já usa um agente "executor" barato como camada separada de um agente "arquiteto".
