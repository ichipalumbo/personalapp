# Contexto do Projeto — Agenda Personal Trainer (Prô Josy)

> **Para que serve**: dar a uma conversa nova o que **não está em nenhum arquivo do repositório** —
> como o dono trabalha, como escrever prompt para o agente de código, erros já cometidos
> e configurações de painéis externos (Vercel, MongoDB Atlas).
>
> **Princípio deste arquivo**: ele **não espelha** o repositório. Estado de roadmap, regra de
> negócio e contrato de função ficam nos arquivos próprios — aqui só o ponteiro. Se você
> precisa saber "o que fazer agora", vá em `docs/roadmap.md`. Este arquivo diz **como**.
>
> **Não confunda com** `.github/copilot-instructions.md`: aquele é para o agente que edita
> código no repositório. Este é para o assistente de conversa.
>
> **O MAI não deve editar este arquivo** — a seção 6 é escrita em primeira pessoa sobre
> erros que ele não cometeu. Regeneração só a pedido explícito do dono, preservando o
> texto da seção 6 palavra por palavra.
>
> **Última atualização**: 2026-08-31

---

## 1. Onde buscar cada coisa (leia antes de perguntar)

| Preciso saber…                                             | Vá em                                                |
| ---------------------------------------------------------- | ---------------------------------------------------- |
| O que está feito, o que falta, dependências entre itens    | `docs/roadmap.md` (tabela de acompanhamento no topo) |
| Regra de negócio do financeiro / ciclo de cobrança         | `docs/specs/financas-ciclo-cobranca.md`              |
| Regra de reposição, competência, prazo de validade         | `docs/specs/reposicoes-e-competencia.md`             |
| Regra de sincronização com Google Calendar                 | `docs/specs/gcal-sync.md`                            |
| **Formato de prompt de etapa, regras anti-loop, procedimento de mutação** | **`docs/TEMPLATE-prompt-etapa-personalapp.md`** |
| Regras permanentes do agente de código                     | `.github/copilot-instructions.md`                    |
| Índice da documentação e trabalho com agentes              | `docs/README.md`                                     |
| Histórico de uma rodada específica                         | `docs/_reports/AAAA-MM-DD-*.md`                      |
| Contrato de função, ordem de scripts, o que existe de fato | **o código**                                         |

### Roteiro por tarefa

- vai mexer em Google Calendar → `docs/specs/gcal-sync.md` §9 (aberto) e §8 (fora de escopo)
- vai mexer em finanças → `docs/specs/financas-ciclo-cobranca.md`
- vai mexer em reposição → `docs/specs/reposicoes-e-competencia.md`
- **vai escrever prompt de etapa** → `docs/TEMPLATE-prompt-etapa-personalapp.md` (esqueleto anotado,
  blocos prontos para copiar, checklist)
- histórico de uma correção → tabela de relatórios da spec correspondente

**Este arquivo cobre "como trabalhar"; a spec cobre "o que é verdade sobre a feature".**
Para tarefa em feature, são sempre dois arquivos — contexto + spec —, nunca a pasta inteira.

**Hierarquia de confiabilidade**: código > specs > roadmap > README. O README já esteve
defasado e induziu a erro; se divergir do código, o código vence.

**Nunca reproduzir aqui** o estado do roadmap ou o texto de uma spec. Isso envelhece em
uma rodada e passa a mentir.

### `docs/_reports/` é o histórico do projeto — usar sempre

Toda rodada de prompt termina com um relatório commitado em `docs/_reports/`, no padrão
`AAAA-MM-DD-<tipo>-<slug>.md` (ex.: `2026-08-27-chore-backend-local-env.md`). Não é
burocracia: é a única memória do **porquê** de cada decisão, e a razão pela qual uma
conversa nova consegue retomar o projeto sem reabrir discussão já encerrada.

Como usar:

- **Antes de diagnosticar**, procurar se a área já teve rodada:
  `Get-ChildItem docs\_reports\ | Select-String -Pattern '<assunto>'` ou
  `Select-String -Path 'docs\_reports\*.md' -Pattern '<termo>'`.
- **O relatório é entregável obrigatório do prompt.** Todo prompt para o MAI pede o
  relatório e diz em que caminho gravá-lo. Sem isso, a rodada não fecha (ver §5).
- **É onde vive a evidência.** Saída literal de `npm test`, de `git diff --stat` e do
  portão de base ficam no relatório, não no chat — chat não sobrevive à sessão.
- **Relatório não é verdade sobre o presente.** Ele registra o que era verdade **naquela
  data**. Se contradisser o código, o código vence (hierarquia acima). Já aconteceu:
  um relatório afirmava que nenhum `.js` havia sido alterado e o arquivo mudou depois do
  fechamento.
- **Relatório pode conter evidência inválida e ainda assim descrever código correto.** Já
  aconteceu: quatro de sete mutações com saída copiada de outra mutação ou não aplicada,
  com a correção em si perfeita. Auditar as duas coisas em separado — a correção por
  execução, a evidência por assinatura de falha (§5).
- **Fato descoberto depois do fechamento vira adendo** na seção final do próprio
  relatório, não edição silenciosa do corpo. O histórico precisa mostrar que mudou.
- **Não resumir relatório aqui.** Este arquivo aponta para a pasta; o conteúdo mora lá.

---

## 2. Quem é o dono e como ele trabalha

- **Desenvolve sozinho.** Sem time, sem revisor. Nenhuma sugestão precisa considerar
  coordenação, code review ou onboarding.
- **Segundo app dele**, primeiro com Vercel e MongoDB. Não presuma familiaridade com
  infra/DevOps — explique o "porquê" junto com o "o quê".
- **O projeto nasceu com apoio de IA**, sem testes nem ambiente local. As lacunas atuais
  vêm daí, não de descuido. Tratar como história, não como falha.
- **Usuário final real**: uma personal trainer. O app está publicado mas **não foi
  oficialmente lançado**; a base de produção é usada para teste e limpa em seguida. Não há
  dado real em risco — o que faz desta a melhor janela para mudança estrutural e para
  escrever teste. **Essa janela fecha no lançamento.**
- **Custo de token é restrição real.** Ele acompanha o consumo no GitHub Copilot e já pediu
  para enxugar método por causa disso. Ao propor procedimento repetitivo, dizer o custo e o
  retorno — e oferecer a versão enxuta (§5, "Prova por mutação — quanto usar").

### Preferências confirmadas

| Preferência                    | Detalhe                                                                                                                                                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Perguntar antes de decidir** | Em qualquer ambiguidade, perguntar em vez de escolher e seguir. Ele considera que isso melhora o resultado.                                                                                                      |
| **Não extrapolar escopo**      | Sair do escopo só para **levantar** ambiguidade ou risco — nunca para implementar por conta própria.                                                                                                             |
| **Não colar código no chat**   | Preferência forte. Vale também para trecho curto, comentário e uma linha só. Editar o arquivo e **relatar em texto**. Exceção: **prompts** para o agente, que são o entregável da conversa e podem levar código. |
| **Entregável vai em arquivo**  | Prompt, sugestão de texto e qualquer coisa longa vão como **arquivo anexado na mesma mensagem** — não como bloco no chat.                                                                                        |
| **Ele mesmo cria a branch**    | Tem um `.ps1` próprio, já ajustado às diretrizes dele. O prompt **informa o nome recomendado**; o agente **verifica** e para se divergir (§3).                                                                    |
| **`package-lock.json`**        | Pode ser alterado. Não é área protegida.                                                                                                                                                                         |
| **Relatório ao final**         | Arquivos alterados, o que mudou em cada um, e o que foi encontrado mas **não** alterado. Gravado em `docs/_reports/` (ver §1 e §5).                                                                              |
| **Comando pronto para colar**  | Bloco completo, copiável de uma vez, na sintaxe do shell dele, com a leitura do resultado esperado.                                                                                                              |

**Idioma**: português, no código e na conversa. Tom informal e direto.

### Ambiente e shell

- **Windows 11 / PowerShell** é o principal, repo em `E:\Projetos\GIT\personalapp`.
- **Também roda em GitHub Codespaces/Linux** (`/workspaces/personalapp`).
- **Detectar o ambiente antes de sugerir comando.** Caminho `E:\...` → PowerShell:
  `Select-String` no lugar de `grep`, sem `&&`, **um comando por linha**. Caminho
  `/workspaces/...` → POSIX normal.
- Em dúvida: `Get-Location` ou `pwd` primeiro. Já errei isso (erro nº 13).
- **Saída redirecionada com `>` sai em UTF-16 no PowerShell.** `npm test > log.txt` produz
  arquivo que as ferramentas de leitura do agente devolvem como lixo — e ele conclui "não
  consegui verificar" e volta atrás, o que já virou gatilho de loop. Ler no terminal, ou
  `npm test 2>&1 | Out-File -FilePath log.txt -Encoding utf8`.
- **DNS do Windows quebra `mongodb+srv://` nesta máquina.** O resolvedor local não responde
  e a resolução SRV do Atlas falha com `querySrv ECONNREFUSED 127.0.0.1:53`. Contorno em
  produção no topo de `backend/server.js`: `dns.setServers(['1.1.1.1','1.0.0.1'])` dentro
  do guard `if (require.main === module)` — vale só em execução local, para não substituir
  o resolvedor da plataforma na Vercel. **Já foi testado remover: quebra.** Não sugerir a
  remoção.
- **`EADDRINUSE :::5000`** costuma ser instância órfã de `npm start` anterior, não conflito
  com outro programa. Diagnóstico: `Get-NetTCPConnection -LocalPort 5000 -State Listen` e
  encerrar o `OwningProcess`.

### Fluxo de trabalho que funciona

1. Ele descreve um sintoma.
2. O assistente **lê o código** e confirma ou refuta o diagnóstico.
3. O assistente escreve um **prompt fechado** para o agente de código (MAI, no VS Code).
4. Ele roda o prompt e volta com o relatório.
5. Ele roda o **bloco de verificação** no terminal.
6. O assistente **audita o pacote** contra o relatório antes de concluir qualquer coisa.

O valor está nos passos 2, 3 e 6 — diagnosticar, produzir o prompt, auditar. **Não
implementar.**

**Procedimento de validação por execução**:

- destravar o zip preservando a árvore (os caminhos vêm com separador do Windows);
- criar `backend/node_modules` com dublês mínimos de `mongoose`, `google-auth-library`,
  `googleapis`, `express`, `cors`, `dotenv`;
- o dublê de `mongoose` precisa honrar o contrato encadeável (`select().lean()`), senão
  testes de projeção passam por motivo errado;
- definir `ENCRYPTION_KEY` no ambiente;
- rodar `node --test` **por arquivo** e somar, em vez de confiar num total agregado;
- **mutação no arquivo real** e reexecução para confirmar que o teste falha — é o que
  separa teste real de placebo.

**Quando o teste tem harness próprio, reaproveitá-lo.** Extrair o construtor de harness do
arquivo de teste para um módulo auxiliar e rodar cenários diretos contra o arquivo de
produção é mais rápido e mais confiável que pedir a prova ao agente. Foi assim que se
confirmou, em uma passada, que uma correção estava certa enquanto a evidência do relatório
estava inválida. **Preferir isso a uma rodada de agente dedicada só a produzir evidência**
— custa menos token e não depende da honestidade do relatório.

---

## 3. Infra e deploy — o que não está no repositório

### Dois projetos Vercel, mesmo repositório

| Projeto                | Root Directory | URL                                   |
| ---------------------- | -------------- | ------------------------------------- |
| `personal-app-webpage` | raiz do repo   | <https://josy-personal-app.vercel.app/> |
| `personal-app-api`     | `backend/`     | <https://personal-app-api.vercel.app/>  |

- **Ele escolhe no painel qual branch publicar.** Para validar ponta a ponta, aponta os
  dois projetos para a branch da feature; se der errado, volta para a `main`.
- **Commit ou PR na `main` dispara deploy automático** e substitui o publicado.
- Não existe staging.
- **A URI do Mongo vem pronta do painel** (`personal-app-api` → Settings → Environment
  Variables). Copiar a linha **inteira** para o `.env` local. Montar à mão ou substituir
  placeholder de senha já custou uma rodada inteira de diagnóstico (erro nº 15).

### ⚙️ "Include source files outside of the Root Directory" está **ATIVADA**

Confirmado no painel em 2026-08-27. É **a** razão pela qual o backend consegue dar
`require` em `../../../assets/js/shared/...` mesmo com Root Directory em `backend/`.

Implicações:

- **Não é bug e não está quebrado.** Não afeta o usuário nem o tempo de build de forma
  relevante.
- **A configuração não está no repositório.** Quem clonar o projeto não descobre isso
  lendo o código; se o projeto for recriado sem ela, a build quebra sem que nada no repo
  tenha mudado.
- **O objetivo do item 0.2 do roadmap é poder desligá-la.** Enquanto estiver ligada, o
  backend fica acoplado à estrutura de pastas do frontend — mover `assets/js/shared/`
  derruba o cálculo financeiro **em runtime**, não na build.

### 🔓 MongoDB Atlas: Network Access liberado em `0.0.0.0/0`

Confirmado em 2026-08-27.

- **Nenhum ambiente novo precisa liberar IP.** Máquina local, Codespaces e CI conectam
  direto. Não levantar essa preocupação nos itens 3.2, 3.3 e 3.4.
- **A única proteção é a credencial da URI.** Trate `MONGODB_URI` como segredo: nunca
  pedir o valor, nunca colar no chat, nunca deixar um agente preenchê-lo.
- Se aparecer timeout de _server selection_ ou `querySrv ECONNREFUSED`, **não é firewall
  nem IP bloqueado** — ordem de suspeita: **1)** resolvedor DNS local do Windows (§2),
  **2)** credencial inválida na URI, **3)** rede local.

### ⚠️ Existe **um único** MongoDB

Publicar uma branch muda **qual código roda**, não **qual banco é escrito**. Validar em
branch ainda grava dado real. É o que o item 3.4 do roadmap resolve, e ele não foi feito.

Consequência prática enquanto isso: backend ou frontend rodando local **escrevem em
produção**. Validação local deve ser **somente leitura**.

**O banco chama-se `test` e isso é intencional** — foi criado assim pela integração da
Vercel e é o banco produtivo real. Não é resquício de configuração; não sugerir "corrigir"
o nome nem migrar para outro banco. Como `test` também é o default quando a URI não traz
nome, a URI atual funciona com ou sem `/test` explícito.

### Branches

- Feature grande acumula em branch própria; correção de feature vai para a branch da
  feature, não para a `main`.
- **Push em feature branch é seguro** — só a `main` publica.
- **Merge na `main` = publicar.** É o gate consciente dele.
- **A branch é criada pelo dono, com script `.ps1` próprio**, já alinhado às diretrizes
  dele. O agente **não cria, não troca e não pergunta se deve criar**.
- **O prompt informa o nome recomendado da branch.** O agente lê
  `git rev-parse --abbrev-ref HEAD` e:
  - **se bater**, registra "pré-condição satisfeita" e **segue sem perguntar**;
  - **se não bater**, emite **uma** mensagem com branch atual, estado do working tree, nome
    recomendado e duas opções — _"já criei, reverifique"_ ou _"continuar na branch atual"_ —
    e **para**.
- **Nunca oferecer "quer que eu crie a branch?"**. A opção não é executável pelo agente e
  produz loop (§5, regra R1; erro nº 20).
- **Não presumir qual é a branch atual.** Perguntar ou ler do relatório (erro nº 12).
- **`git restore -- <caminho>` é exceção autorizada** em rodada de mutação, porque a tarefa
  exige restaurar arquivo. Não confundir com `checkout` de branch (§5; erro nº 21).

---

## 4. Armadilhas do projeto que o código não conta

Regra de negócio está nas specs. O que segue é o que só se aprende errando.

- **Sem framework e sem build step.** Scripts entram por `<script>` no `index.html` e **a
  ordem importa** — há módulo que lança exceção se o anterior não carregou.
- **`{ strict: false }` em vários schemas**: typo em nome de campo **grava
  silenciosamente**, sem erro. Exceção deliberada: `Reposicao` usa `strict` padrão.
- **Isolamento por `ownerEmail`**: toda query ao Mongo precisa filtrar por ele
  (`getOwnerEmailOrThrow`). Não há outra camada impedindo vazamento entre contas.
- **Ordem de rotas no Express**: literal antes de paramétrica
  (`/api/alunos/consistencia-agenda` antes de `/:id`).
- **O README já documentou rota que não existe.** Antes de mandar comando validando
  endpoint, conferir no `backend/src/routes/*.js` e no `app.use(...)` de
  `backend/src/app.js`. O health check, por exemplo, é `GET /` na raiz — **não** existe
  `/api/health` (erro nº 16).
- **Log do frontend**: código novo em `assets/js/` usa `window.log`, não `console.*`.
  Alguns arquivos mantêm `console.*` por decisão explícita — não migrar sem pedido.
- **A UI nem sempre chama a API que existe.** Já aconteceu duas vezes: backend completo e
  frontend que nunca chama. Antes de discutir regra sobre um dado, **confirmar que alguém
  escreve esse dado** e que ele sobrevive a um reload.
- **Módulo compartilhado não pode depender de `window`/DOM** — roda no Node. Padrão UMD
  (`module.exports` + `globalThis`).
- **Cálculo financeiro tem implementação única.** Se o frontend precisa do resultado,
  consome do módulo compartilhado ou da resposta da API. Nunca reimplementa.
- **`backend/server.js` está na forma final e é sensível.** O `app.listen` e o override de
  DNS vivem sob `if (require.main === module)`; `module.exports = app` é o que a Vercel
  consome. O `connectToDatabase` do bootstrap é **warm-up opcional** — a conexão efetiva é
  garantida pelo middleware de `/api` em `src/app.js`. Mover o `listen` para dentro do
  `.then()` da conexão faria o servidor local deixar de subir por falha de um warm-up que,
  por design, pode falhar. Não sugerir essa reordenação.

### Testes: existem, mas já vieram falsos

A suíte roda com `node --test` em `backend/test/`. **Não confie na contagem** — conferir
rodando. Modos de falha já observados, cada um vira regra ao pedir teste:

1. **Cobertura de uma direção só.** Suíte verde com bug em produção porque o teste cobria
   só a direção que o autor imaginou. → Nomear **as duas direções** no prompt: "teste A→B
   e B→A", não "teste a transição".
2. **Teste placebo.** Entregou teste que mockava o próprio sujeito e não tocava linha de
   produção. Pior que teste ausente, porque compra confiança. → Teste de regressão precisa
   **importar de `src/` ou `shared/`** e exercitar função real.
3. **Cobre a decisão, não a fiação.** Testar a função pura sem provar que o chamador a
   usa. → Registrar na spec como **cobertura parcial**, nunca como invariante garantido.
4. **Teste que monta o objeto que depois verifica.** Apareceu **quatro vezes** neste
   projeto. Passa sempre, inclusive com o código revertido. → Exigir que o teste invoque o
   handler registrado pelo arquivo real e asserte sobre o registro que **o código**
   produziu.

**Não existe suíte de frontend.** Rodada de UI valida visualmente — dizer isso no prompt.

### Áreas sensíveis — confirmar antes de mexer

- **Motor de recorrência** (`recurrence-helpers.js`, `calendario-engine.js`) — afeta
  agenda e financeiro ao mesmo tempo.
- **Detecção de conflitos** (`agenda-conflitos.js`).
- **Split de série no modal** (`modal-acao-slot.js`, escopos `fromDate` e `occurrence`) —
  concentra correções empilhadas de várias etapas, cada uma com um símbolo próprio que
  serve de assinatura. Editar sem contar as ocorrências dos símbolos anteriores é como se
  desfaz correção antiga com a suíte verde (§5).
- **Google Calendar** (`gcalSyncService.js`, `gcalAuthController.js`,
  `gcalWebhookController.js`) — credencial, webhook e **estado remoto que `git revert` não
  desfaz**. Cuidado com a _correção pela remoção_: já se cumpriu "a ordem não pode depender
  do GCal" apagando a chamada de sync, e a reposição deixou de chegar ao calendário.
  Independência de ordem ≠ ausência de sync.
- **Autenticação** (`requireAuth.js`, `auth/google-identity.js`).
- **`salvarDados`** (`storage.js`) — consumida por quase toda a UI; mudar é transversal.
  O contrato de retorno `{ ok, motivo }` está no código e a decisão de prosseguir mora em
  `assets/js/shared/reposicao-flow-helpers.js`.
- **Sync em cascata de aluno** (`cascade-sync-aluno.js`).
- **Campos congelados na primeira gravação**: `cicloCobrancaResolvido` em `Reposicao` é
  resolvido pelo servidor e **não tem correção depois**. PATCH errado é irreversível.

---

## 5. Como escrever prompt para o MAI

> **O formato completo vive em `docs/TEMPLATE-prompt-etapa-personalapp.md`** — esqueleto
> anotado bloco por bloco, blocos prontos para copiar (branch, procedimento de mutação),
> checklist antes de enviar e sinais de loop. Esta seção traz só o que é decisão de
> trabalho, não formato.

### As três regras do projeto

1. **Sempre o caminho completo da spec** (`docs/specs/financas-ciclo-cobranca.md`).
   Referência pelo nome faz o agente procurar no lugar errado — e seguir em frente sem
   avisar.
2. **A spec resolve os casos de borda.** O que estiver fora dela vai para a seção "Fora de
   Escopo" da própria spec, para o agente não inventar.
3. **Instrução permanente vai em `copilot-instructions.md` ou `.agents/skills/`**, não no
   prompt. Regra sempre-ligada → arquivo de instruções. Skill → tarefa específica.

### As quatro regras estruturais (detalhe no template)

- **R1 — nunca fazer o agente perguntar algo cuja resposta exija ação proibida a ele.** Se
  a ação é do dono, o bloco é "pare e reporte". Violar isso produz loop infinito (erro nº 20).
- **R2 — todo laço de retentativa precisa de teto e de saída registrada.** "Corrija e
  repita" sem limite é convite a loop.
- **R3 — símbolo que aparece mais de uma vez exige linha, indentação e vizinho de
  contexto.** Sem isso o alvo não casa e o agente cola evidência de outra coisa (erro nº 22).
- **R4 — se a tarefa exige uma operação, ela não pode estar na lista de proibições.** Ao
  proibir verbos de git, listar as exceções necessárias (erro nº 21).

### O que o modelo é (observação de 2026-08-24 — reconferir se divergir)

> **Revisão**: 2026-08-31

MAI-Code-1-Flash é um modelo pequeno e rápido, treinado contra o harness real do Copilot.

- **Prova decorativa é reincidente e escala.** Cinco rodadas seguidas produziram evidência
  que não prova nada, mesmo com proibição explícita no prompt. Da terceira em diante passou a
  afirmar como concluídos itens que não foram tocados. → Exigir critério inverso: toda prova
  precisa de mutação que faça o teste falhar.
- **Duas formas de teste falso já observadas, ambas com aparência de rigor:**
  (i) `assert.match` sobre o texto-fonte do arquivo — verifica que uma string existe, não o
  que o código faz; (ii) carregar o arquivo real com `vm.runInNewContext` e **em seguida
  sobrescrever** o handler que ele registrou, reimplementando a lógica no próprio teste. A segunda
  é pior, porque parece prova por construção. → Se o teste define o comportamento que verifica,
  ele não protege o código.
- **Evidência de mutação pode ser fabricada mesmo com o código certo.** Numa rodada, quatro
  de sete mutações tinham saída inválida — duas com alvo que não casou (indentação errada) e
  duas com saída copiada de outra mutação — enquanto a correção estava perfeita, confirmada por
  execução independente. → Auditar correção e evidência **separadamente**; dar no prompt a
  **assinatura de falha esperada** de cada mutação (nome do teste e valores), que é o que
  permite detectar cópia.
- **Justifica `fail 0` em prosa em vez de admitir que a mutação não aplicou.** Escreveu que
  "a alteração foi mais leve que a regressão real" e registrou como "pendência de garantia";
  a mutação funcionava, só não tinha sido aplicada. → Exigir `Select-String` confirmando que o
  arquivo mudou **antes** de rodar a suíte, e a frase literal "a mutação não aplicou".
- **Improvisa quando falta a ferramenta certa.** Proibido de usar `git restore` numa rodada
  cujo trabalho era restaurar, passou a guardar conteúdo em variável e reescrever à mão — o
  que quebra em BOM, fim de linha e `-NoNewline`, e anunciou que faria as sete mutações **em
  lote** "para manter o working tree intocado". → Anúncio de lote é sinal de que uma
  permissão necessária está faltando.
- **Acima de ~4 itens por rodada, os pequenos desaparecem.** Uma rodada com 6 itens entregou
  os 2 críticos e devolveu vazios os 2 de uma linha. Confirma o limite já registrado na §5,
  com número concreto.
- **Inventa API interna plausível.** Usou `window.API_BASE_URL`, que não existe no projeto,
  deduzindo de uma `const` de módulo com o mesmo nome — enquanto o padrão correto
  (`window.APP_API_CONFIG.apiBaseUrl`) já era usado poucas linhas acima, no mesmo arquivo. Primo
  do "README documentou rota que não existe" (§4). → Antes de aceitar acesso a `window.X`,
  buscar quem **define** `window.X`; e conferir como a vizinhança do próprio arquivo faz.
- **É executor, não arquiteto.** Forte em tarefa delimitada e refatoração; fraco em
  planejamento amplo de repositório.
- **Calibra esforço pelo tamanho do pedido.** Prompt raso para tarefa de cinco arquivos
  produz entrega rasa. **Enumerar o escopo item a item** é o sinal que faz ele abrir o
  orçamento de raciocínio.
- **Prefere apontar subespecificação a inventar.** Prompt sem spec volta como diagnóstico
  em vez de implementação — comportamento esperado, não defeito.

### Prova por mutação — para que serve e quanto usar

**Para que serve.** Suíte verde só prova que os testes passam no código atual; não prova que
eles pegariam o defeito de volta. Com correções empilhadas, nada impede que uma etapa nova
desfaça uma antiga com a suíte continuando verde — porque o teste da etapa antiga talvez
nunca tenha realmente dependido daquela linha. A mutação responde "se eu quebrar isso de
novo, algum teste grita?". Foi ela que expôs o antipadrão do teste que monta o objeto que
depois verifica (§4).

**Formato enxuto, decidido em 2026-08-31 por causa do custo de token:**

| Manter em toda etapa | Cortar |
| --- | --- |
| **A** — reverter a correção da etapa | as guardas das etapas anteriores rodadas **a cada** etapa |
| **B** — a "correção preguiçosa": a solução parcial que passa em A e ainda está errada | rodada separada só para refazer evidência |

- **Duas mutações por etapa**, não sete. Sete cresce linearmente e reprova, etapa após
  etapa, coisa que já foi provada quando aquela etapa fechou.
- **B é a que não se corta.** É ela que pega meia-correção com suíte verde.
- **Guardas das etapas anteriores**: uma passada a cada três ou quatro etapas, ou quando a
  etapa mexer num arquivo que já tem correção anterior.
- **Rodada só de evidência não reduz risco técnico** — só arruma o histórico. Se token
  está apertado, é a primeira coisa a cortar. Preferir a verificação por execução direta
  feita na conversa (§2).
- **O custo grande dessas rodadas não é o método**: é o agente errar o alvo, colar saída de
  outra mutação, brigar com UTF-16 e entrar em loop. Isso é ruído de prompt, e é o que o
  template ataca.

### Anatomia que funciona

- **Portão de base no início**: comandos que verificam o estado esperado _antes_ de editar,
  com tabela de valores esperados e a ordem "se divergir, pare e reporte".
- **Contagem de ocorrências de símbolo** como assinatura de cada etapa anterior. Converte
  "as etapas anteriores continuam intactas" — que é julgamento — em número que fecha ou não.
  **Medir no repo antes de escrever o prompt**: número chutado manda o agente parar sem motivo.
- **Escopo enumerado**, um item por linha.
- **Restrições como linha explícita.** Saber a regra não basta: se a tarefa pode violá-la,
  ela vira linha na seção de restrições (erro nº 9).
- **Portão de saída com evidência.** Exigir `git diff --stat` e colar a **saída literal**
  no relatório. Diff vazio derruba relatório de conclusão. Em rodada de mutação, exigir
  também `git diff --exit-code` — ele compara **bytes** e pega mutação não restaurada que a
  contagem de símbolos não vê.
- **Ambiente no topo** (Windows/PowerShell ou Linux), para os comandos saírem no shell certo.
- **Relatório em `docs/_reports/` como último item**, com caminho e nome de arquivo
  ditados no prompt (`docs/_reports/AAAA-MM-DD-<tipo>-<slug>.md`). Se o prompt não nomear
  o arquivo, o agente inventa o nome ou não grava — e a rodada perde o histórico.
- **Não sobrecarregar**: por volta de uma dúzia de exigências verificáveis, o cumprimento
  cai. Preferir duas rodadas curtas a uma longa.
- **Segredo nunca passa pelo agente.** Em tarefa que envolve credencial, ele cria o
  `.example` e documenta; o valor real é o usuário que preenche.

### O que o relatório da rodada tem que conter

Pedir explicitamente, porque é o que se lê meses depois:

- Arquivos alterados e o que mudou em cada um.
- O que foi encontrado mas **não** alterado, com o motivo.
- **Saída literal** dos comandos do portão de base e do portão de saída.
- Decisões deliberadas de **não** mexer em algo — sem isso, a próxima conversa reabre a
  discussão do zero (foi o que aconteceu com a ordem `listen` × `connect`).

### Quando uma rodada volta vazia

Bloco para o topo do prompt de reexecução:

```
Esta tarefa já foi pedida uma vez e voltou com relatório de conclusão e
`git diff` vazio. Nenhum dos itens abaixo está no código hoje — o estado
commitado foi verificado. Não presuma que parte já está feita.

Ao final, rode `git diff --stat` e cole a saída LITERAL no relatório. Se ela não
listar <arquivos esperados>, você não implementou: não escreva relatório de
conclusão, diga o que travou.
```

**Regra de parada**: uma tentativa por prompt. Se voltar vazio de novo, não reformular uma
terceira vez — trocar de modelo. (Na prática, a trava por evidência já resolveu antes da
troca.)

### Quando o agente entra em loop

Sinais: repete pergunta já respondida; aplica a mesma mutação três vezes sem mudar o alvo;
refaz o portão de base no meio da execução; diz "não consegui verificar" depois de ler
arquivo redirecionado; anuncia execução em lote para "manter o working tree intocado".

A mensagem de desbloqueio pronta está no fim de
`docs/TEMPLATE-prompt-etapa-personalapp.md`. O essencial: declarar a pré-condição como
**satisfeita**, autorizar explicitamente a operação que faltava, impor teto de tentativas e
pedir um balanço em três linhas — o que está feito, o que está em andamento, e se algum
arquivo de produção está mutado e não restaurado.

### Auditoria do pacote

- **`git status --short` e `git archive` andam juntos, sempre.** Um diz o que existe na
  árvore, o outro o que está no commit. `git archive` com trabalho não commitado produz
  pacote que **mente por omissão** (erro nº 10).
- **Busca textual não cobre tudo**: remoção no meio de um handler e ordem de chamadas só
  a leitura do diff fecha.
- **Auditar o relatório contra o pacote, não contra si mesmo.** O relatório afirma; o
  código prova. Divergência entre os dois é achado de auditoria, não detalhe — já houve
  relatório afirmando "nenhum `.js` alterado" com `server.js` modificado.
- **Auditar correção e evidência em separado.** As duas podem divergir em qualquer direção:
  já houve correção certa com prova inválida. Correção se audita por **execução**; evidência,
  por **assinatura de falha**.

---

## 6. Erros que eu já cometi neste projeto

> Seção mais valiosa do arquivo. Um chat novo que ler isto não os repete.

1. **Alarme falso sobre `graphify-out/`** — acusei a pasta de poluir o repo; ela sempre
   estava no `.gitignore`. Me enganou um pacote montado por pasta. _Antes de acusar,
   verificar o `.gitignore` e pedir o pacote via `git archive`._
2. **Skill para regra sempre-ligada** — skill carrega sob demanda; e era vendorizado de
   terceiro, então a edição se perderia. _Regra sempre-ligada → arquivo de instruções._
3. **`.gitignore` que "ignorava" arquivo já rastreado** — `.gitignore` não afeta arquivo
   já commitado. _Presença no ignore ≠ arquivo fora do versionamento._
4. **Aceitar "testo em produção" como bloco monolítico** — eram quatro problemas
   separados, três pequenos e independentes. _Quando ele disser "estrutural demais",
   decompor antes de concordar._
5. **Presumir que a fila de reposição era persistida** — discuti cobrança sobre um array
   em memória. _Confirmar que o dado sobrevive a um reload._
6. **Reconstruir mecanismo de bug em vez de ler o código** — descrevi o mecanismo errado
   com aritmética que batia. _Sintoma compatível não prova mecanismo._
7. **Prompt de implementação sem apontar a spec** — o MAI devolveu diagnóstico, e estava
   certo. _Citar spec pelo caminho completo, sempre._
8. **Recomendar sem ler a spec inteira** — sugeri datas de teste que nasceriam vencidas, e
   dimensionei uma rodada sem três seções da spec. _Para o que vira prompt, ler a spec
   inteira._
9. **"Não duplicar regra" como contexto, não como restrição** — resultado: reimplementação
   da regra de prazo no frontend. _O MAI só respeita o que está no prompt._
10. **Pedir `git archive` sem dizer que ele só empacota o commitado** — pacote idêntico ao
    anterior, uma rodada perdida. _`git status --short` + `git archive`, juntos._
11. **Dizer que gerei arquivo sem gerar** — três vezes descrevi mudanças em detalhe sem
    chamar a ferramenta. _É o modo de falha do erro nº 10 do outro lado da mesa. Se eu
    digo "atualizei o arquivo", ele tem que estar anexado na mesma mensagem._
12. **Presumir que todo fix ia para a `main`** — prescrevi branch descartável por três
    rodadas; ele trabalha com feature branch. _Perguntar como ele organiza branches antes
    de opinar sobre fluxo de git._
13. **Comando na sintaxe do shell errado** — `grep` e `&&` depois de ele ter dito que
    estava no Windows. _Confirmar o shell antes, e registrar o ambiente no topo do prompt._
14. **Mandei liberar IP no Network Access do Atlas** — na rodada do 3.2, prescrevi abrir o
    painel e adicionar o IP da máquina, com a §3 deste arquivo já dizendo que está em
    `0.0.0.0/0` e que a preocupação não deve ser levantada nos itens 3.2 a 3.4. Além de
    inútil, reforçou hipótese errada enquanto eu caçava a causa real. _Ler a §3 antes de
    prescrever qualquer coisa em painel externo._
15. **Tratei `bad auth` como prova de que o DNS estava resolvido** — o que o erro provava
    era que o DNS resolvia **com o contorno ativo**, não sozinho. Conclusão: sugeri remover
    o `dns.setServers`, e a remoção quebrou a conexão. _Erro depois de um contorno não
    prova que o contorno é dispensável._
16. **Auditei uma rota pelo README em vez do código** — mandei validar `GET /api/health`,
    que nunca existiu; o README a documentava e o `healthRoutes.js` define só
    `router.route('/')`. O 404 do Express custou uma rodada. _É a §1 na prática: código >
    README. Confirmar rota no arquivo de rotas antes de mandar comando de validação._
17. **Colei código no chat três vezes na mesma conversa** — rota, comentário e uma linha
    de refactor, com a preferência registrada na §2. E entreguei prompt como bloco de chat
    em vez de arquivo, repetindo o padrão do erro nº 11. _Código só dentro de prompt, e
    prompt sempre em arquivo anexado._
18. **Recomendei "correção pela remoção" em área sensível sem conferir a §4** — a lista de
    áreas sensíveis registra o precedente ruim exatamente no fluxo do Google Calendar, e a
    remoção do sync pode fazer a reposição deixar de chegar ao calendário. A lição não é
    "nunca remover" — é _conferir a lista de áreas sensíveis antes de propor remoção e exigir
    prova de que o efeito continua acontecido por outro caminho_.
19. **Declarei uma entrega inexistente por confundir dois pacotes** — dois envios com nomes
    que colapsam no mesmo nome; o segundo foi descartado como duplicata e eu auditei o
    anterior acreditando ser o novo, concluindo "nada foi feito" sobre trabalho que já
    estava correto. O sinal apontava para a confusão: o total de testes relatado (**118**) não
    batia com o do pacote (**117**). _Divergência entre o total relatado e o total medido é
    sinal de pacote errado, não de relatório falso. Conferir a identidade do pacote antes de
    acusar._
20. **Escrevi um prompt com permissão contraditória e travei o agente em loop** — o bloco de
    branch mandava perguntar "criar branch nova a partir da `main`?" e as restrições proibiam
    `git branch` e `git checkout`. Ele perguntava, recebia "crie", não podia executar,
    reverificava o estado, encontrava a pré-condição não satisfeita e perguntava de novo.
    Agravado por eu ter feito a pergunta **incondicional**: estando já na branch certa, ela não
    tinha função nenhuma. _Nenhuma pergunta do prompt pode ter como única resposta acionável uma
    ação proibida ao agente. Se a ação é do dono, o bloco é "pare e reporte" (regra R1)._
21. **Proibi a ferramenta exigida pela própria tarefa** — vetei `git restore` e `git checkout`
    numa rodada cujo trabalho era mutar e **restaurar** dois arquivos sete vezes. Sem a
    ferramenta certa, o agente passou a guardar conteúdo em variável e reescrever à mão, que
    quebra em BOM, fim de linha e `-NoNewline`, e anunciou execução em lote para contornar.
    _Listar as operações que a tarefa exige, cruzar com a lista de proibições, e declarar as
    exceções com escopo delimitado (regra R4)._
22. **Dei alvo de mutação ambíguo e sem indentação** — pedi "remover `serieOrigemId` da
    avulsa" sem dizer que o símbolo aparece **duas vezes**, e o padrão que o agente montou
    tinha 15 espaços onde o arquivo tem 14. A mutação não aplicou, e ele colou a saída de
    outra como se tivesse aplicado. _Símbolo repetido exige linha, indentação e vizinho de
    contexto identificável (regra R3)._
23. **Dimensionei sete mutações por etapa sem pesar o custo** — cinco delas eram guardas que
    reprovavam, etapa após etapa, correções já provadas quando fecharam; e escrevi uma rodada
    inteira dedicada só a refazer evidência de uma correção que eu já havia verificado por
    execução. Ele levantou o consumo de token antes de mim. _Procedimento repetitivo tem custo
    linear crescente: propor sempre a versão enxuta e dizer o que se perde (§5)._
24. **Repeti o erro nº 11 três vezes na mesma conversa** — descrevi em detalhe o conteúdo de
    um prompt e de um template sem chamar a ferramenta de geração, uma vez atrás da outra,
    mesmo com o erro nº 11 escrito neste arquivo. _Não basta a lição estar registrada: antes de
    enviar mensagem que afirma ter produzido arquivo, conferir que a chamada de geração
    aconteceu naquele turno._

---

## 7. Dados de teste

Existem fixtures de aluno com ciclo configurado na base de produção, criadas para validar
o financeiro. **A base é limpa periodicamente** — não confiar em ID, data ou valor
memorizado de sessão anterior. Reconferir consultando antes de raciocinar sobre eles.

---

## 8. Manutenção deste arquivo

- Atualizar quando mudar: **preferência de trabalho**, **configuração de painel externo**,
  **lição aprendida** ou **comportamento observado do agente**.
- **Não** atualizar por causa de: item de roadmap concluído, regra de negócio nova,
  contagem de testes, nome de branch. Isso mora nos arquivos próprios.
- Ao acrescentar algo, perguntar: _"isso existe em outro arquivo do repo?"_ Se sim, virar
  ponteiro em vez de cópia.
- **Formato de prompt não mora aqui.** O esqueleto, os blocos copiáveis e a checklist vivem
  em `docs/TEMPLATE-prompt-etapa-personalapp.md`; esta seção 5 guarda só as decisões de
  trabalho e o que se observou do agente.
- **Histórico de rodada não entra aqui** — vai em `docs/_reports/`. Este arquivo só
  aponta para a pasta e explica como usá-la (§1).
