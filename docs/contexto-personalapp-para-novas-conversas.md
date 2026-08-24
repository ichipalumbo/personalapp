# Contexto do Projeto — Agenda Personal Trainer (Prô Josy)

> **Para que serve este documento**: dar a uma conversa nova (chat zerado, sem histórico)
> tudo que foi aprendido em sessões anteriores sobre este projeto e sobre como o dono
> dele gosta de trabalhar.
>
> **Não confunda com** `.github/copilot-instructions.md`: aquele é para o agente que
> **edita código dentro do repositório**. Este aqui é para o **assistente de conversa**,
> e inclui coisas que não estão no código — histórico de decisões, preferências de
> trabalho e erros já cometidos.
>
> **Última atualização**: 2026-08-24

---

## 1. Quem é o dono do projeto e como ele trabalha

- **Desenvolve sozinho.** Não há time, não há revisor. Nenhuma sugestão precisa
  considerar coordenação, code review ou onboarding de terceiros.
- **É o segundo app dele**, e o primeiro usando **Vercel** e **MongoDB**. Não presuma
  familiaridade com práticas de infra/DevOps — explique o "porquê" junto com o "o quê".
- **O projeto nasceu com apoio de IA.** No começo o Copilot montou a estrutura e não
  criou testes nem ambiente local. Boa parte das lacunas atuais vem daí, não de
  descuido. Tratar como história, não como falha.
- **Usuário final real**: uma personal trainer (Prô Josy). O app está publicado, mas
  **ainda não foi oficialmente lançado**. A base de produção é usada para teste e limpa
  em seguida. Não há dado real em risco, o que torna esta a melhor janela para mudanças
  estruturais e para escrever testes. **Essa janela fecha no lançamento.**

### Preferências explícitas (confirmadas por ele)

| Preferência | Detalhe |
|---|---|
| **Perguntar antes de decidir** | Em qualquer ambiguidade, perguntar em vez de escolher um caminho e seguir. Ele considera que isso melhora a qualidade final. |
| **Não extrapolar escopo** | Só é aceitável sair do escopo para **levantar** uma ambiguidade ou risco — nunca para implementar por conta própria. |
| **Não colar código no chat** | Preferência forte. Editar o arquivo e **relatar em texto** o que mudou. Colar blocos de código consome contexto sem necessidade. Exceção aceita: **prompts** para o agente de código, que são o entregável da conversa. |
| **`package-lock.json`** | Pode ser alterado quando necessário. Não é área protegida. |
| **Relatório ao final** | Gosta de receber: arquivos alterados, o que mudou em cada um, e o que foi encontrado mas não alterado. |

**Idioma**: português, no código e na conversa. Comunicação informal e direta.

### Como ele usa o assistente de conversa (padrão observado)

O fluxo de trabalho real, que funcionou bem e vale repetir:

1. Ele descreve um sintoma observado no app em produção.
2. O assistente **lê o código no repositório** e confirma ou refuta o diagnóstico.
3. O assistente escreve um **prompt fechado** para o agente de código (MAI, no VS Code).
4. Ele roda o prompt, valida em produção e volta com o resultado.

O valor do assistente de conversa está nos passos 2 e 3 — diagnosticar contra o código e
**produzir o prompt**, não implementar. Ver seção 5.

---

## 2. O projeto em uma página

**O que é**: sistema de gestão de alunos, agenda e cobrança para personal trainer.

**Stack**:
- **Frontend**: JavaScript vanilla, **sem framework e sem build step**. Scripts
  carregados por tags `<script>` em `index.html` — **a ordem importa** (há módulos que
  lançam erro se um anterior não tiver carregado).
- **Backend**: Node + Express + Mongoose, em `backend/` com `package.json` próprio.
- **Banco**: MongoDB. Vários schemas usam `{ strict: false }` — um typo em nome de campo
  **grava silenciosamente**, sem erro. **Exceção**: `Reposicao` usa `strict` padrão,
  deliberadamente (ver 4.1 da spec de reposições).
- **PWA**: service worker registrado.

**Deploy**: dois projetos Vercel independentes, ligados ao mesmo repositório.

| Projeto | Root Directory | URL |
|---|---|---|
| `personal-app-webpage` | raiz do repo | https://josy-personal-app.vercel.app/ |
| `personal-app-api` | `backend/` | https://personal-app-api.vercel.app/ |

**Push ou merge na `main` vai direto para produção nos dois.** Não existe staging nem
branch de preview. Deploy manual de branch de teste é possível, mas qualquer alteração
na `main` o substitui. Ele escolheu essa simplicidade conscientemente por desenvolver
sozinho.

---

## 3. O que o código não conta (e é onde se erra)

### 3.1 Não existe `npm run dev` — e o dev local escreve em produção

Este é o ponto mais importante desta seção.

- O frontend é servido pela extensão **Live Server** do VS Code.
- `API_BASE_URL` em `assets/js/storage.js` é uma **constante fixa** apontando para
  `https://personal-app-api.vercel.app/api`. Não há chave de ambiente nem fallback
  para localhost.
- **Consequência**: rodando o Live Server, o frontend local grava no **banco de
  produção**. Não é só "publicar antes de validar" — é código não publicado escrevendo
  em dado real.
- Quando precisa testar backend, ele faz o deploy antes.

**Nunca sugira** `npm run dev`, watch mode, script de seed ou "roda local e testa" sem
antes considerar que nada disso existe.

> **Custo já materializado**: a validação em produção do C3 (ver seção 8) gerou dois
> documentos corrompidos em `ciclofinanceiros`, um deles com `cicloFim` anterior ao
> `cicloInicio`, e consumiu dois dias de limpeza manual. Os itens `3.2` e `3.3` do
> roadmap (backend local + frontend apontando para ele) somam esforço "baixo" e
> "muito baixo" — `3.3` é uma condicional de uma linha.

### 3.2 Módulo isomórfico de recorrência

`assets/js/shared/recurrence-helpers.js` é consumido pelos dois lados:
- frontend, por tag `<script>`;
- backend, via `require('../../../assets/js/shared/recurrence-helpers')` em
  `financasService.js` — três níveis para **fora** de `backend/`.

Regras:
- **Nunca duplicar.** Se agenda e financeiro resolverem recorrência de formas
  diferentes, o app cobra valor diferente do que mostra. Isso vale para **qualquer regra
  de cálculo financeiro**, não só recorrência — ver o erro nº 9 na seção 8.
- **Não pode depender de `window`/DOM** — roda no Node.
- O caminho atravessado funciona por causa dos *roots* diferentes dos dois projetos
  Vercel. É dívida conhecida (0.2 no roadmap). Não "consertar de passagem".

### 3.3 Isolamento por `ownerEmail`

App multiusuário: qualquer conta Google pode usar, cada uma vê só os próprios dados.
`requireAuth` valida o JWT e popula `req.auth.ownerEmail`. **Toda query ao Mongo deve
filtrar por `ownerEmail`** (`getOwnerEmailOrThrow`). Não há nenhuma outra camada
impedindo vazamento entre contas.

### 3.4 Testes: existem, mas cobrem pouco

Já existe suíte em `backend/test/` rodando com `node:test`. **Ela não é rede de
proteção suficiente** — passou com 37 testes verdes enquanto o bug do C3 estava em
produção, porque o teste cobria só a direção de transição que o autor imaginou.

*Regra derivada*: ao pedir teste para regra que tem direção (antes/depois, entra/sai,
cresce/encolhe), **nomear as duas direções explicitamente no prompt**. "Teste a
transição" produz um teste; "teste A→B e B→A" produz dois.

Dois bugs financeiros já escaparam para produção antes disso (aula excluída continuar
sendo cobrada; reajuste alterando ciclos antigos retroativamente). Nenhum afetou
cobrança de aluno real, porque a base é limpa e o app não foi lançado.

### 3.5 Ordem de rotas no Express

Rota literal antes de rota com parâmetro. Ex.: `/api/alunos/consistencia-agenda` precisa
vir antes de `/:id`.

### 3.6 A UI nem sempre chama a API que existe

Padrão que já apareceu duas vezes: o backend está completo (model, controller,
validação, serviço) e **o frontend nunca o chama**. Foi o caso da fila de reposição —
`aulasParaRepor` é array em `state.js`, e a única chamada a `/reposicoes` no frontend
inteiro era um `GET`.

*Regra derivada*: "a feature existe" precisa ser verificado nos **dois lados**. Antes de
discutir regra de negócio sobre um dado, confirmar que alguém escreve esse dado.

---

## 4. Regras do módulo financeiro

Área mais sensível do sistema. Detalhamento em
`docs/specs/financas-ciclo-cobranca.md` (v6, em produção) e
`docs/specs/reposicoes-e-competencia.md` (v2 → v3 em andamento).

- **Recálculo sempre pelo snapshot** do ciclo (`precoAulaSnapshot`, `valorFixoSnapshot`,
  `metodoCobranca`), nunca pelo preço atual do aluno. Reajuste vale do próximo ciclo em
  diante, jamais retroativamente.
- **Ciclo pago é congelado permanentemente.** Alteração posterior na agenda não o
  modifica. Tentativa de ajuste retorna HTTP 409.
- **Ciclo não pago NÃO é imutável.** Distinção que já causou bug: a guarda de
  sobreposição reconciliava `status` e contagem, mas nunca `cicloFim`, deixando ciclo
  aberto preso a uma janela truncada.
- **Piso zero**: total de aulas cobradas nunca fica negativo, mesmo com ajuste manual
  negativo.
- **Escrita financeira só é confirmada na UI após resposta HTTP de sucesso.** Nunca com
  base em cache local.
- O cálculo percorre a janela real de datas do ciclo e conta ocorrências resolvidas pelo
  motor de recorrência — não usa mais a aproximação `frequência × 4`.
- **Modelo de competência** (spec de reposições): a aula é cobrada no ciclo em que estava
  **originalmente marcada**, não no ciclo em que acontece. Garantia de projeto: cada aula
  é cobrada **exatamente uma vez**, nunca zero, nunca duas.
- **O vínculo que o financeiro lê é `agendamento.reposicaoId`**, não as flags visuais
  `isReposicao` / `reagendada`. Agendamento de reposição sem `reposicaoId` é contado como
  aula avulsa e cobrado indevidamente.
- **Cálculo financeiro tem implementação única.** Se o frontend precisar do resultado,
  consome do módulo compartilhado ou da resposta da API. Nunca reimplementa. Já foi
  violado uma vez (erro nº 9).

**Fora de escopo hoje**: feriados (aula em feriado é contada normalmente) e estorno /
reabertura de ciclo pago.

---

## 5. Divisão de trabalho: FordLLM arquiteta, MAI executa

> Fonte: `docs/README.md` (seção "Trabalhando com agentes de IA") + material público da
> Microsoft/GitHub sobre os modelos MAI, consultado em 2026-08-24.

### 5.1 As três regras que já eram do projeto

1. **Sempre passar o caminho completo da spec no prompt** (ex.:
   `docs/specs/financas-ciclo-cobranca.md`). Referência solta pelo nome faz o agente
   procurar no lugar errado — e ele costuma seguir em frente sem avisar.
2. **A spec resolve os casos de borda.** O que estiver fora dela deve estar na seção
   "Fora de Escopo" da própria spec, para o agente não inventar solução.
3. **Instrução permanente vai em `.agents/skills/` ou `copilot-instructions.md`**, não no
   prompt.

### 5.2 O que o modelo é, e o que isso implica

O MAI-Code-1-Flash é um modelo **pequeno e rápido** (arquitetura esparsa, poucos
parâmetros ativos por token), treinado diretamente contra o harness de produção do
Copilot — ou seja, contra o fluxo real de editar arquivo, chamar terminal e buscar
contexto no repositório. A versão 1.1 acrescentou visão e melhorias em seguir instrução
e uso de ferramenta.

Três consequências práticas:

**a) Ele é executor, não arquiteto.** O ponto forte é refatoração e tarefa delimitada;
para planejamento amplo de repositório, modelos maiores rendem mais.

**b) Ele calibra esforço pelo tamanho do pedido.** O modelo tem controle adaptativo de
profundidade: responde curto para pedido simples e gasta mais raciocínio quando a tarefa
parece exigir. Prompt raso para tarefa de cinco arquivos tende a produzir entrega rasa.
Enumerar o escopo item a item é o sinal que faz ele abrir o orçamento.

**c) Ele prefere apontar subespecificação a inventar.** O modelo é explicitamente
otimizado para reconhecer problema mal especificado em vez de produzir uma solução
plausível e errada. **Isso é uma virtude, não um defeito** — mas significa que prompt sem
fonte de verdade tende a voltar como diagnóstico. Ver o erro nº 7 da seção 8.

### 5.3 A divisão de papéis (decisão explícita do projeto)

**FordLLM (assistente de conversa) é o arquiteto. O MAI é o engenheiro que aplica a
arquitetura.**

| | FordLLM | MAI (Copilot no VS Code) |
|---|---|---|
| Lê o repositório para | diagnosticar e desenhar | implementar |
| Decide | qual é o problema, qual o desenho, o que fica fora | nada de produto ou arquitetura |
| Produz | diagnóstico com `arquivo:linha` + prompt fechado | código, testes e edições de doc |
| Escreve código no repo | **não** | sim |
| Erra quando | afirma sem ler a fonte | recebe pedido subespecificado |

Consequências operacionais:

- **Nenhuma decisão de produto sai em aberto no prompt.** Se o prompt diz "defina quem
  decide X", o desenho ainda não estava pronto — o lugar de decidir X é a conversa, ou a
  spec. Já aconteceu: pedi ao MAI para "definir o dono de `cobravel`" quando a spec já
  havia decidido um modal com rótulos literais.
- **Divergência entre pedido e spec: o MAI para e aponta, não escolhe.** Toda instrução
  deve incluir a regra de precedência ("a spec vence; se divergir, pare e aponte").
- **FordLLM não implementa.** O entregável da conversa é o prompt. Colar código no chat
  também contraria a preferência do dono (seção 1).
- **O MAI é ótimo executando o que já foi decidido.** A qualidade da entrega é
  proporcional à qualidade do desenho que chega nela — quando o C4 saiu torto, o defeito
  estava no prompt, não no modelo.

### 5.4 Anatomia de um prompt que funcionou

Ordem testada, do topo para baixo:

1. **Natureza da tarefa.** Uma linha dizendo se é implementação ou investigação. Se for
   implementação, dizer explicitamente: *"o diagnóstico está fechado, não reinvestigue"*,
   e definir a falha: *"se terminar sem editar arquivos, falhou a tarefa"*.
2. **Fonte de verdade**, com caminho completo. Mais a regra de precedência.
3. **Estado atual confirmado**, com `arquivo:linha`. Poupa o agente de reinvestigar e
   ancora o diagnóstico em algo verificável.
4. **Escopo**, numerado, um item por mudança.
5. **Fora de escopo**, copiado da spec. Sem isso ele preenche a lacuna sozinho.
6. **Testes exigidos**, nomeando as duas direções de cada regra direcional (ver 3.4).
7. **Restrições** — invariantes que não podem quebrar, enums fechados, dados de teste
   existentes na base.
8. **Relatório esperado** — e deixar claro que ele descreve o que **foi escrito**, não o
   que foi encontrado.

### 5.5 Dimensionamento: a métrica é contagem de exigências, não caracteres

Tamanho em tokens raramente é o problema. Um prompt de 13 mil caracteres dá ~3,5 mil
tokens — irrelevante diante de `modal-acao-slot.js`, que tem 65 KB e ele vai ler inteiro.

O que realmente limita é **quantas exigências independentes ele precisa manter na cabeça
enquanto edita**. Conte: cada item de escopo + cada arquivo de doc + cada teste + cada
decisão a registrar.

- **Até ~12 exigências**: prompt único funciona bem.
- **Acima disso**: ele começa a perder item, e perde **silenciosamente** — entrega 15 de
  20 e o relatório fala como se fossem 20.
- **O que ele sacrifica primeiro é o item periférico**, resolvido do jeito mais curto.
  No C4 o modal saiu perfeito (texto literal, rótulos certos) e o prazo virou uma cópia
  local errada da regra do backend — porque prazo era o item mais periférico da lista.

Três cortes que reduzem a contagem sem perder conteúdo:

1. **Separar código de documentação** (ver 5.6). É a costura mais natural.
2. **Numerar as exigências de ponta a ponta** e pedir no relatório uma linha por número,
   com *feito / não feito / não se aplica*. Item omitido fica visível.
3. **Posição importa**: o meio do prompt é onde mais se perde item. Não colocar ali o
   bloco que você menos quer perder.

### 5.6 Protocolo de divisão a/b

Quando um pedido passa do limite de 5.5, quebrar em duas rodadas sequenciais:

**Parte (a) — código.** Os problemas de código, os testes e as restrições. Testes vão no
(a) porque teste é parte da implementação, não documentação. Instruções extras:
- *"Esta é a parte 1 de 2. NÃO edite nada em `docs/` nesta rodada."*
- No relatório, um item a mais: **"decisões tomadas que precisam virar documentação"** —
  é o que alimenta o (b).

**Parte (b) — documentação.** Rodada depois do (a) validado. Instruções extras:
- *"Nenhum arquivo de código deve ser alterado. Se achar que o código precisa mudar,
  pare e aponte."*
- *"Documente o estado real do código, não o que estava planejado. Onde a spec afirmar
  algo que o código não faz, corrija a spec."*

Por que essa ordem é melhor do que um prompt único:
- O (b) documenta o que **de fato** ficou no diff, em vez de o que o arquiteto previu.
- Se o (a) sair errado, você não perdeu a rodada de documentação junto.
- Perguntas que o MAI levantou no (a) entram como resposta na spec no (b).

Regra de ouro: **a divisão é por natureza de entregável (código × doc), não por volume
de arquivos.** Dividir "metade dos arquivos agora, metade depois" cria estado
intermediário quebrado.

### 5.7 Erros de prompt já cometidos

- **Citar caminho de código mas não de spec.** Os prompts do C3.1 e do C4 traziam
  `financasService.js:719` mas nenhuma spec. Violaram a regra 5.1 e provavelmente
  causaram o turno perdido do C4.
- **Pedir "relatório ao final" sem dizer sobre o quê.** O agente entregou o relatório
  como se fosse o produto. O relatório precisa ser definido como *resumo do que foi
  escrito*.
- **Deixar decisão de produto em aberto no prompt.** Escrever "defina quem decide o valor
  de `cobravel`" quando a spec já definia um modal com rótulos literais. Se está na spec,
  cite a seção; não reabra.
- **Listar uma proibição como contexto em vez de restrição.** Ver erro nº 9 da seção 8.

### 5.8 Critério de aceite

Antes de subir qualquer coisa: `git diff --stat` precisa mostrar os arquivos esperados.
Diff vazio com relatório bonito é o modo de falha mais comum. Na parte (b), o inverso:
`git diff --stat` **não** deve mostrar arquivo de código.

### 5.9 Validade desta seção

Os modelos MAI são de melhoria contínua — comportamento e desempenho mudam com novos
checkpoints. Tratar 5.2 como observação datada (2026-08-24) e reconferir se o
comportamento divergir do descrito.

---

## 6. Áreas sensíveis — confirmar antes de mexer

- **Motor de recorrência** (`recurrence-helpers.js`, `calendario-engine.js`) — afeta
  agenda e financeiro ao mesmo tempo.
- **Detecção de conflitos** (`agenda-conflitos.js`).
- **Google Calendar** (`gcalSyncService.js`, `gcalAuthController.js`,
  `gcalWebhookController.js`) — envolve credencial, webhook externo e **estado remoto que
  `git revert` não desfaz**. É acionado dentro dos handlers de reposição, em caminho
  assíncrono: ordem de persistência importa, e o comportamento não pode depender de a
  usuária estar logada no Google.
- **Autenticação** (`requireAuth.js`, `auth/google-identity.js`).
- **Sync em cascata de aluno** (`cascade-sync-aluno.js`) — altera vários agendamentos de
  uma vez.
- **Campos congelados na primeira gravação**: `cicloCobrancaResolvido` em `Reposicao` é
  resolvido pelo servidor e **não tem correção depois**. Um PATCH com o agendamento
  errado é irreversível.

---

## 7. Onde as coisas moram — hierarquia de fontes de verdade

Em ordem de confiabilidade:

1. **O código** — sempre a referência final.
2. **`docs/specs/`** — fonte de verdade de **regra de negócio**. Não inferir regra que
   não esteja escrita. Cada spec tem seções "Decisões e Casos de Borda" e "Fora de
   Escopo".
3. **`docs/roadmap.md`** — backlog e débitos técnicos. Documento vivo, único, não
   versionado por data.
4. **`README.md`** — onboarding. **Já esteve defasado e induziu a erro.** Se divergir do
   código, o código vence.

Outros:
- `.github/copilot-instructions.md` — regras permanentes para o agente no VS Code.
- `.agents/skills/` — versionado. O `anti-ui-slop` é **vendorizado** de
  `github/awesome-copilot` (tem `github-tree-sha` no frontmatter): **não editar**, pois
  alteração local se perde na próxima atualização. Regra própria vai no
  `copilot-instructions.md`.

**Este arquivo** (`docs/contexto-personalapp-para-novas-conversas.md`) é mantido pelo
FordLLM na conversa, **fora do fluxo de implementação**. O MAI não deve editá-lo: a
seção 8 é escrita em primeira pessoa sobre erros que ele não cometeu.

---

## 8. Erros que eu já cometi neste projeto

> Seção mais valiosa deste documento. Um chat novo que ler isto não os repete.

**1. Alarme falso sobre `graphify-out/`.**
Afirmei que a pasta poluía o repositório e deveria ser ignorada. Ela **sempre esteve no
`.gitignore`**. O que me enganou foi ler um pacote montado por pasta em vez de por
`git archive`. *Lição: antes de acusar algo de não estar ignorado, verificar o
`.gitignore` — e pedir o pacote via `git archive`, que respeita as regras de ignore.*

**2. Sugerir skill para regra sempre-ligada.**
Recomendei colocar a regra de "spec-first" num skill. Skill é carregado sob demanda;
regra que vale em toda sessão pertence ao `copilot-instructions.md`. Pior: o skill em
questão era vendorizado de terceiro, então a edição local desapareceria na próxima
atualização. *Lição: regra sempre-ligada → arquivo de instruções. Skill → tarefa
específica. Nunca editar skill de terceiro.*

**3. `.gitignore` que "ignorava" arquivo já rastreado.**
`.agents/` estava no `.gitignore`, mas o `SKILL.md` já estava commitado — e `.gitignore`
não afeta arquivo já rastreado. *Lição: presença no `.gitignore` não significa que o
arquivo não está versionado.*

**4. Aceitar "testo em produção" como bloco monolítico.**
Ele descreveu a falta de ambiente local como uma coisa só, grande e estrutural. Só ao
ler `storage.js` percebi que eram **quatro** problemas separados, três pequenos e
independentes. *Lição: quando ele descrever algo como "estrutural demais para mexer
agora", vale decompor antes de concordar.*

**5. Presumir que a fila de reposição era persistida.**
Discuti regras de cobrança sobre a fila por um bom tempo antes de verificar que
`aulasParaRepor` é só um array em memória. *Lição: antes de desenhar regra sobre um dado,
confirmar que o dado sobrevive a um reload.*

**6. Reconstruir mecanismo de bug em vez de ler o código.**
Diagnostiquei a guarda de sobreposição do C3 a partir dos sintomas e do timestamp do
pacote, e descrevi o mecanismo errado ("encurta o novo contra o antigo"). O código real
sempre encurtava o documento **persistido**, sem ordenar por data — pior e mais simples
do que eu supus. A aritmética batia mesmo assim, o que fez o diagnóstico errado parecer
certo. *Lição: quando o pacote está no KB, ler o trecho. Sintoma compatível não prova
mecanismo. E dizer explicitamente quando a afirmação vem de reconstrução, não de leitura.*

**7. Escrever prompt de implementação sem apontar a spec.**
Nos prompts do C3.1 e do C4 citei caminhos de código com número de linha, mas nenhuma
spec — violando uma diretriz que já estava escrita em `docs/README.md`. O agente MAI
devolveu diagnóstico em vez de implementação, comportamento coerente com um modelo
otimizado para sinalizar subespecificação. *Lição: antes de escrever prompt, reler
`docs/README.md` e citar as specs pelo caminho completo. E: quando ele perguntar "você
lembra da diretriz X?", procurar no repo em vez de responder de memória.*

**8. Recomendar sem ler a spec inteira.**
Sugeri a ordem de teste das reposições ("escolhe uma aula do meio do mês") sem ter lido
a regra de prazo. A regra ancora no ciclo da **aula original**, então três das quatro
datas nasceriam vencidas. Também dimensionei o C4 sem as seções 9.1–9.3 da spec, e ficou
faltando o caminho recorrente e um modal inteiro. *Lição: para qualquer coisa que vire
prompt, ler a spec inteira antes, não o trecho que parece relevante.*

**9. Listar "não duplicar regra" como contexto, não como restrição do prompt.**
O C4 introduziu `calcularPrazoReposicaoLocal`, uma reimplementação da regra de prazo do
backend — exatamente o que a seção 3.2 deste documento proíbe. E passou pela minha
revisão porque eu conhecia a regra e nunca a escrevi **dentro** do prompt: estava aqui,
como contexto do projeto, não lá, como invariante que ele não podia quebrar. A cópia
ainda estava errada no caminho `diaVencimento`, produzindo piso falso. *Lição: o MAI só
respeita o que está no prompt ou nas instruções permanentes. Saber a regra não basta —
se ela pode ser violada pela tarefa em questão, ela vira linha na seção de restrições.
E o que vale para toda sessão vai para o `copilot-instructions.md`.*

---

## 9. Estado em 24/08/2026

### Entregue
- **Finanças — Ciclo de Cobrança por Aluno** (spec v6, em produção): ciclo configurável
  por aluno com vencimento móvel, registro de pagamento, status automático, ajuste manual
  por ciclo, histórico. Substituiu o antigo sistema de KPI financeiro.
- **Precisão financeira**: fim da aproximação `frequência × 4`.
- **Reorganização da documentação**: `docs/` criado, README corrigido, `.agents/`
  versionado, `copilot-instructions.md` no lugar.
- **Backend de reposições** (seção 6 da spec): `Reposicao`, controller com validação,
  `calcularPrazoReposicao`, `sincronizarExpiracaoLazy`.
- **Suíte de testes** em `backend/test/` (`node:test`, sem dependência nova), incluindo
  `reposicao-prazo.test.js` com virada de ano e o limite exato de 7 dias.
- **C4 (roadmap 0.5), parcial**: modal de escolha cobrável/não cobrável com os textos
  literais da spec, renames de 9.1, `enviarParaReposicao` extraída, POST ao enviar
  funcionando nos dois caminhos.

### Em andamento
- **C4.1** — correções sobre o C4, dividido em duas rodadas (ver 5.6):
  - **C4.1a (código)**: reagendar deve consumir a pendente em vez de criar documento
    novo; ordem persistir→confirmar→PATCH idêntica com e sem GCal; remoção de
    `calcularPrazoReposicaoLocal` com o prazo passando a aparecer no toast pós-POST;
    separar "enviar" de "reagendar" no caminho recorrente; dispensar pendente deve
    persistir.
  - **C4.1b (documentação)**: spec para v3 com as decisões D1–D6, item 0.9 no roadmap,
    regra de implementação única no `copilot-instructions.md`.
- **C3.1** — regressão da guarda de sobreposição de ciclos.

### Próximo
- **Validação spec × código**: varredura seção por seção da spec v3 contra o código,
  classificando cada uma em implementada / parcial / ausente / **divergente**. O caso
  divergente é o mais perigoso: a spec vira mentira e a próxima sessão confia nela.
- **Item D** (roadmap `0.6`) — extrato do ciclo, com as linhas
  `reposicao_cobravel_origem` e `reposicao_nao_cobravel`. Depende do C4.
- Depois: `0.7` (prazo + expiração), `0.9` (expor `calcularPrazoReposicao` pelo módulo
  compartilhado, depende de `0.2`), `0.1` (bug do bloco de histórico), `1.7` (busca por
  nome), `3.2`/`3.3` (backend local — ver 3.1).

### Dados de teste na base (podem ter mudado; conferir antes de usar)
- Aluno de teste id `1784736533061`.
- 4 aulas **únicas** em julho: 06, 13, 20 e 27/07.
- Recorrência ativa a partir de **01/08**.
- Ciclo `2026-07-01 → 2026-07-31` **pago**, 4 aulas, R$ 260 — fixture criada à mão.
  Serve de caso "ciclo anterior já pago" para o item D. **Não pode ser alterada.**
- Ciclo de agosto em aberto.
- Collection `reposicaos` vazia no momento do último pacote.

> **Nota sobre a fixture de julho**: ela nasceu divergente da agenda (4 aulas declaradas,
> 0 agendadas), e essa divergência funcionava como detector de vazamento do congelamento.
> Depois que as 4 aulas foram criadas, o valor bate por construção e **julho deixou de
> servir como prova de congelamento**. Não tirar conclusão sobre congelamento a partir
> dele.

> **Nota sobre prazo de reposição**: das 4 aulas de julho, só a de **27/07** gera
> `validoAte` futuro (`2026-08-31`, com piso aplicado, pois a margem de 4 dias é menor que
> o piso de 7). As outras três nascem vencidas e viram `expirada` na primeira leitura.

### Estado da documentação
- `docs/specs/reposicoes-e-competencia.md` — **v2**, indo para v3 no C4.1b.
- **Grafia normalizada**: `'reposicao'`, sem acento, em todo lugar.

---

## 10. Convenções

- **Idioma**: código, comentários, variáveis e mensagens de UI em português.
- **Sem dependência nova sem confirmar.** O frontend não tem nenhuma; o backend tem seis.
- **Sem build step no frontend.** Nada de bundler, transpilador ou sintaxe que dependa
  deles.
- **Artefato gerado por ferramenta** nunca é fonte de verdade, não se edita à mão, e se
  estiver desatualizado se regenera.
- **Pacote para análise**: pedir sempre via `git archive`, nunca zip da pasta. Zip de
  pasta inclui o que o `.gitignore` exclui e já causou alarme falso (erro nº 1).
- **Nomenclatura de itens de trabalho**: apelidos como "C3", "C4", "C4.1a", "item D" são
  de conversa e **não existem no repo**. Ao referenciar, traduzir para o número do
  roadmap (`0.5`, `0.6`) ou para a seção da spec.

---

## 11. O que atualizar neste documento

Reler e ajustar quando:

1. **Uma feature for entregue** — atualizar a seção 9 (entregue / em andamento / próximo).
2. **Uma spec for criada ou versionada** — refletir nas seções 4 e 7.
3. **O ambiente de desenvolvimento mudar** — a seção 3.1 é a que envelhece mais rápido
   e a que mais causa conselho errado. Se um dia existir backend local ou banco de dev,
   corrigir imediatamente.
4. **Uma decisão de arquitetura for tomada** — especialmente se o `require` atravessado
   (3.2) for resolvido.
5. **Os dados de teste da base mudarem** — a lista em 9 é a que mais desatualiza no dia a
   dia.
6. **O comportamento do agente de código mudar** — os modelos MAI evoluem por checkpoint
   (ver 5.9). Se a seção 5 deixar de bater com a prática, corrigir.
7. **Um prompt sair torto** — perguntar se foi desenho (seção 5.3), dimensionamento
   (5.5) ou restrição não escrita (erro nº 9), e ajustar a seção correspondente.
8. **Eu errar de novo** — acrescentar na seção 8. É o que mais economiza tempo em
   sessões futuras.
