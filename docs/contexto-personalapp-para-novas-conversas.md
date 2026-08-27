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
> erros que ele não cometeu.
>
> **Última atualização**: 2026-08-27

---

## 1. Onde buscar cada coisa (leia antes de perguntar)

| Preciso saber…                                             | Vá em                                                |
| ---------------------------------------------------------- | ---------------------------------------------------- |
| O que está feito, o que falta, dependências entre itens    | `docs/roadmap.md` (tabela de acompanhamento no topo) |
| Regra de negócio do financeiro / ciclo de cobrança         | `docs/specs/financas-ciclo-cobranca.md`              |
| Regra de reposição, competência, prazo de validade         | `docs/specs/reposicoes-e-competencia.md`             |
| Regra de sincronização com Google Calendar                 | `docs/specs/gcal-sync.md`                            |
| Regras permanentes do agente de código                     | `.github/copilot-instructions.md`                    |
| Índice da documentação e trabalho com agentes              | `docs/README.md`                                     |
| Histórico de uma rodada específica                         | `docs/_reports/AAAA-MM-DD-*.md`                      |
| Contrato de função, ordem de scripts, o que existe de fato | **o código**                                         |

**Hierarquia de confiabilidade**: código > specs > roadmap > README. O README já esteve
defasado e induziu a erro; se divergir do código, o código vence.

**Nunca reproduzir aqui** o estado do roadmap ou o texto de uma spec. Isso envelhece em
uma rodada e passa a mentir.

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

### Preferências confirmadas

| Preferência                    | Detalhe                                                                                                                           |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| **Perguntar antes de decidir** | Em qualquer ambiguidade, perguntar em vez de escolher e seguir. Ele considera que isso melhora o resultado.                       |
| **Não extrapolar escopo**      | Sair do escopo só para **levantar** ambiguidade ou risco — nunca para implementar por conta própria.                              |
| **Não colar código no chat**   | Preferência forte. Editar o arquivo e **relatar em texto**. Exceção: **prompts** para o agente, que são o entregável da conversa. |
| **`package-lock.json`**        | Pode ser alterado. Não é área protegida.                                                                                          |
| **Relatório ao final**         | Arquivos alterados, o que mudou em cada um, e o que foi encontrado mas **não** alterado.                                          |
| **Comando pronto para colar**  | Bloco completo, copiável de uma vez, na sintaxe do shell dele, com a leitura do resultado esperado.                               |

**Idioma**: português, no código e na conversa. Tom informal e direto.

### Ambiente e shell

- **Windows 11 / PowerShell** é o principal, repo em `E:\Projetos\GIT\personalapp`.
- **Também roda em GitHub Codespaces/Linux** (`/workspaces/personalapp`).
- **Detectar o ambiente antes de sugerir comando.** Caminho `E:\...` → PowerShell:
  `Select-String` no lugar de `grep`, sem `&&`, **um comando por linha**. Caminho
  `/workspaces/...` → POSIX normal.
- Em dúvida: `Get-Location` ou `pwd` primeiro. Já errei isso (erro nº 13).

### Fluxo de trabalho que funciona

1. Ele descreve um sintoma.
2. O assistente **lê o código** e confirma ou refuta o diagnóstico.
3. O assistente escreve um **prompt fechado** para o agente de código (MAI, no VS Code).
4. Ele roda o prompt e volta com o relatório.
5. Ele roda o **bloco de verificação** no terminal.
6. O assistente **audita o pacote** contra o relatório antes de concluir qualquer coisa.

O valor está nos passos 2, 3 e 6 — diagnosticar, produzir o prompt, auditar. **Não
implementar.**

---

## 3. Infra e deploy — o que não está no repositório

### Dois projetos Vercel, mesmo repositório

| Projeto                | Root Directory | URL                                   |
| ---------------------- | -------------- | ------------------------------------- |
| `personal-app-webpage` | raiz do repo   | https://josy-personal-app.vercel.app/ |
| `personal-app-api`     | `backend/`     | https://personal-app-api.vercel.app/  |

- **Ele escolhe no painel qual branch publicar.** Para validar ponta a ponta, aponta os
  dois projetos para a branch da feature; se der errado, volta para a `main`.
- **Commit ou PR na `main` dispara deploy automático** e substitui o publicado.
- Não existe staging.

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
- Se aparecer timeout de _server selection_ ao conectar, **não é firewall** — procurar
  em credencial, URI ou rede local.

### ⚠️ Existe **um único** MongoDB

Publicar uma branch muda **qual código roda**, não **qual banco é escrito**. Validar em
branch ainda grava dado real. É o que o item 3.4 do roadmap resolve, e ele não foi feito.

Consequência prática enquanto isso: backend ou frontend rodando local **escrevem em
produção**. Validação local deve ser **somente leitura**.

### Branches

- Feature grande acumula em branch própria; correção de feature vai para a branch da
  feature, não para a `main`.
- **Push em feature branch é seguro** — só a `main` publica.
- **Merge na `main` = publicar.** É o gate consciente dele.
- **A branch é criada pelo usuário antes do prompt.** O agente edita arquivos e para —
  não roda git. Commit, push e PR são dele, no VS Code.
- **Não presumir qual é a branch atual.** Perguntar ou ler do relatório (erro nº 12).

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
- **Log do frontend**: código novo em `assets/js/` usa `window.log`, não `console.*`.
  Alguns arquivos mantêm `console.*` por decisão explícita — não migrar sem pedido.
- **A UI nem sempre chama a API que existe.** Já aconteceu duas vezes: backend completo e
  frontend que nunca chama. Antes de discutir regra sobre um dado, **confirmar que alguém
  escreve esse dado** e que ele sobrevive a um reload.
- **Módulo compartilhado não pode depender de `window`/DOM** — roda no Node. Padrão UMD
  (`module.exports` + `globalThis`).
- **Cálculo financeiro tem implementação única.** Se o frontend precisa do resultado,
  consome do módulo compartilhado ou da resposta da API. Nunca reimplementa.

### Testes: existem, mas já vieram falsos

A suíte roda com `node --test` em `backend/test/`. **Não confie na contagem** — conferir
rodando. Três modos de falha já observados, cada um vira regra ao pedir teste:

1. **Cobertura de uma direção só.** Suíte verde com bug em produção porque o teste cobria
   só a direção que o autor imaginou. → Nomear **as duas direções** no prompt: "teste A→B
   e B→A", não "teste a transição".
2. **Teste placebo.** Entregou teste que mockava o próprio sujeito e não tocava linha de
   produção. Pior que teste ausente, porque compra confiança. → Teste de regressão precisa
   **importar de `src/` ou `shared/`** e exercitar função real.
3. **Cobre a decisão, não a fiação.** Testar a função pura sem provar que o chamador a
   usa. → Registrar na spec como **cobertura parcial**, nunca como invariante garantido.

**Não existe suíte de frontend.** Rodada de UI valida visualmente — dizer isso no prompt.

### Áreas sensíveis — confirmar antes de mexer

- **Motor de recorrência** (`recurrence-helpers.js`, `calendario-engine.js`) — afeta
  agenda e financeiro ao mesmo tempo.
- **Detecção de conflitos** (`agenda-conflitos.js`).
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

### As três regras do projeto

1. **Sempre o caminho completo da spec** (`docs/specs/financas-ciclo-cobranca.md`).
   Referência pelo nome faz o agente procurar no lugar errado — e seguir em frente sem
   avisar.
2. **A spec resolve os casos de borda.** O que estiver fora dela vai para a seção "Fora de
   Escopo" da própria spec, para o agente não inventar.
3. **Instrução permanente vai em `copilot-instructions.md` ou `.agents/skills/`**, não no
   prompt. Regra sempre-ligada → arquivo de instruções. Skill → tarefa específica.

### O que o modelo é (observação de 2026-08-24 — reconferir se divergir)

MAI-Code-1-Flash é um modelo pequeno e rápido, treinado contra o harness real do Copilot.

- **É executor, não arquiteto.** Forte em tarefa delimitada e refatoração; fraco em
  planejamento amplo de repositório.
- **Calibra esforço pelo tamanho do pedido.** Prompt raso para tarefa de cinco arquivos
  produz entrega rasa. **Enumerar o escopo item a item** é o sinal que faz ele abrir o
  orçamento de raciocínio.
- **Prefere apontar subespecificação a inventar.** Prompt sem spec volta como diagnóstico
  em vez de implementação — comportamento esperado, não defeito.

### Anatomia que funciona

- **Portão de base no início**: comandos que verificam o estado esperado _antes_ de editar,
  com tabela de valores esperados e a ordem "se divergir, pare e reporte".
- **Escopo enumerado**, um item por linha.
- **Restrições como linha explícita.** Saber a regra não basta: se a tarefa pode violá-la,
  ela vira linha na seção de restrições (erro nº 9).
- **Portão de saída com evidência.** Exigir `git diff --stat` e colar a **saída literal**
  no relatório. Diff vazio derruba relatório de conclusão.
- **Ambiente no topo** (Windows/PowerShell ou Linux), para os comandos saírem no shell certo.
- **Não sobrecarregar**: por volta de uma dúzia de exigências verificáveis, o cumprimento
  cai. Preferir duas rodadas curtas a uma longa.
- **Segredo nunca passa pelo agente.** Em tarefa que envolve credencial, ele cria o
  `.example` e documenta; o valor real é o usuário que preenche.

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

### Auditoria do pacote

- **`git status --short` e `git archive` andam juntos, sempre.** Um diz o que existe na
  árvore, o outro o que está no commit. `git archive` com trabalho não commitado produz
  pacote que **mente por omissão** (erro nº 10).
- **Busca textual não cobre tudo**: remoção no meio de um handler e ordem de chamadas só
  a leitura do diff fecha.

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
