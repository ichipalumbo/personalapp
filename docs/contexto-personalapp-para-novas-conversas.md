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
> **Última atualização**: 2026-08-25

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

### Ambiente de trabalho (atual)

- **Windows 11, PowerShell**, repositório em `E:\Projetos\GIT\personalapp`.
- **Não usar sintaxe POSIX** em comando sugerido: sem `grep`, sem `&&` encadeando
  comandos (o PowerShell 5.1 não aceita), sem `cd /caminho/unix`.
  Equivalentes: `Select-String` no lugar de `grep`, `Set-Location` ou `cd` com caminho
  Windows, **um comando por linha**.
- Já houve sessão em ambiente Linux/devcontainer (`/workspaces/personalapp`). Se o
  caminho aparecer em prompt antigo, está desatualizado.

### Preferências explícitas (confirmadas por ele)

| Preferência                    | Detalhe                                                                                                                                                                                                                 |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Perguntar antes de decidir** | Em qualquer ambiguidade, perguntar em vez de escolher um caminho e seguir. Ele considera que isso melhora a qualidade final.                                                                                            |
| **Não extrapolar escopo**      | Só é aceitável sair do escopo para **levantar** uma ambiguidade ou risco — nunca para implementar por conta própria.                                                                                                    |
| **Não colar código no chat**   | Preferência forte. Editar o arquivo e **relatar em texto** o que mudou. Colar blocos de código consome contexto sem necessidade. Exceção aceita: **prompts** para o agente de código, que são o entregável da conversa. |
| **`package-lock.json`**        | Pode ser alterado quando necessário. Não é área protegida.                                                                                                                                                              |
| **Relatório ao final**         | Gosta de receber: arquivos alterados, o que mudou em cada um, e o que foi encontrado mas não alterado.                                                                                                                  |
| **Comando pronto para colar**  | Quando a conversa produz uma verificação a rodar no terminal, entregar o bloco completo, copiável de uma vez, **na sintaxe do shell dele**, com a leitura do resultado esperado.                                        |

**Idioma**: português, no código e na conversa. Comunicação informal e direta.

### Como ele usa o assistente de conversa (padrão observado)

O fluxo de trabalho real, que funcionou bem e vale repetir:

1. Ele descreve um sintoma observado no app.
2. O assistente **lê o código no repositório** e confirma ou refuta o diagnóstico.
3. O assistente escreve um **prompt fechado** para o agente de código (MAI, no VS Code).
4. Ele roda o prompt e volta com o relatório do agente.
5. Ele roda o **bloco de verificação** no terminal (ver 5.8).
6. O assistente **audita o pacote** contra o relatório antes de qualquer conclusão.

O valor do assistente está nos passos 2, 3 e 6 — diagnosticar contra o código,
**produzir o prompt** e **auditar a entrega**. Não implementar. Ver seção 5.

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

| Projeto                | Root Directory | URL                                   |
| ---------------------- | -------------- | ------------------------------------- |
| `personal-app-webpage` | raiz do repo   | https://josy-personal-app.vercel.app/ |
| `personal-app-api`     | `backend/`     | https://personal-app-api.vercel.app/  |

Como o deploy funciona de fato:

- **Ele escolhe no Vercel qual branch publicar.** Para validar uma feature de ponta a
  ponta (front + back), aponta os dois projetos para a branch da feature e manda para o
  deploy. Se algo der errado, aponta de volta para a `main`.
- **Qualquer commit ou PR na `main` dispara deploy automático**, e isso substitui o que
  estiver publicado. Ou seja: a `main` sempre volta a ser o estado publicado assim que
  recebe alteração.
- Não existe staging nem ambiente separado.

> **Atenção ao que o deploy de branch NÃO isola**: existe **um único MongoDB**. Publicar
> uma branch muda **qual código roda**, não **qual banco é escrito**. Validar numa branch
> ainda grava dado real — o incidente do C3 (dois documentos corrompidos em
> `ciclofinanceiros`) aconteceria igual. O ganho é poder testar código não mergeado e
> reverter o deploy em segundos; o dado escrito durante o teste permanece.

### 2.1 Fluxo de branches

- **Feature grande acumula numa branch própria** — a de reposições é
  `new/reposicao-feature`. Correção de feature vai para a branch da feature, **não** para
  a `main`.
- **Push na feature branch é seguro** e é o fluxo normal: não publica nada, porque só a
  `main` tem deploy automático.
- **Merge na `main` = publicar.** É o gate consciente dele.
- Consequência para a documentação: spec e código da mesma feature viajam juntos na
  branch. A spec pode legitimamente descrever o estado da branch, desde que o cabeçalho
  de status diga isso.

---

## 3. O que o código não conta (e é onde se erra)

### 3.1 Não existe `npm run dev` — e o dev local escreve no banco de produção

Este é o ponto mais importante desta seção.

- O frontend é servido pela extensão **Live Server** do VS Code.
- `API_BASE_URL` em `assets/js/storage.js` é uma **constante fixa** apontando para
  `https://personal-app-api.vercel.app/api`. Não há chave de ambiente nem fallback
  para localhost.
- **Consequência**: rodando o Live Server, o frontend local grava no **banco de
  produção**. Não é só "publicar antes de validar" — é código não publicado escrevendo
  em dado real.
- Quando precisa testar backend, ele faz o deploy antes (da `main` ou da branch da
  feature, ver seção 2).

**Separar as duas coisas ao raciocinar sobre risco:**

|                               | Muda com deploy de branch? |
| ----------------------------- | -------------------------- |
| Qual **código** roda          | sim — é justamente o ponto |
| Qual **banco** recebe escrita | **não** — é sempre o mesmo |

**Nunca sugira** `npm run dev`, watch mode, script de seed ou "roda local e testa" sem
antes considerar que nada disso existe.

> **Custo já materializado**: a validação em produção do C3 gerou dois documentos
> corrompidos em `ciclofinanceiros`, um deles com `cicloFim` anterior ao `cicloInicio`,
> e consumiu dois dias de limpeza manual. Os itens `3.2` e `3.3` do roadmap (backend
> local + frontend apontando para ele) somam esforço "baixo" e "muito baixo" — `3.3` é
> uma condicional de uma linha.

### 3.2 Módulos isomórficos compartilhados

`assets/js/shared/` é consumido pelos dois lados. Hoje tem **dois** módulos nessa
situação:

| Módulo                      | Consumidor backend                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| `recurrence-helpers.js`     | `financasService.js`, via `require('../../../assets/js/shared/...')`                       |
| `reposicao-flow-helpers.js` | `backend/test/reposicao-c4-regressao.test.js`, via `require('../../assets/js/shared/...')` |

Regras:

- **Nunca duplicar.** Se agenda e financeiro resolverem recorrência de formas
  diferentes, o app cobra valor diferente do que mostra. Isso vale para **qualquer regra
  de cálculo financeiro**, não só recorrência — ver o erro nº 9 na seção 8.
- **Não pode depender de `window`/DOM** — roda no Node. O padrão usado é UMD com
  `module.exports` + `globalThis`.
- Se o módulo é carregado no frontend, precisa de tag `<script>` em `index.html` **na
  ordem certa** (antes de quem o consome).
- O caminho atravessando a fronteira `backend/ → assets/` funciona por causa dos _roots_
  diferentes dos dois projetos Vercel. É dívida conhecida (0.2 no roadmap) e **deixou de
  ser pontual** — agora são dois consumidores.

### 3.3 Isolamento por `ownerEmail`

App multiusuário: qualquer conta Google pode usar, cada uma vê só os próprios dados.
`requireAuth` valida o JWT e popula `req.auth.ownerEmail`. **Toda query ao Mongo deve
filtrar por `ownerEmail`** (`getOwnerEmailOrThrow`). Não há nenhuma outra camada
impedindo vazamento entre contas.

### 3.4 Testes: existem, mas cobrem pouco — e já vieram falsos

Já existe suíte em `backend/test/` rodando com `node:test` (48 testes em 25/08).
**Ela não é rede de proteção suficiente.** Três falhas de natureza diferente:

1. **Cobertura de uma direção só.** Passou com 37 testes verdes enquanto o bug do C3
   estava em produção, porque o teste cobria só a direção de transição que o autor
   imaginou.
   _Regra derivada_: ao pedir teste para regra que tem direção (antes/depois,
   entra/sai, cresce/encolhe), **nomear as duas direções explicitamente no prompt**.
   "Teste a transição" produz um teste; "teste A→B e B→A" produz dois.

2. **Teste placebo.** O C4.1a entregou um teste que criava um `global.salvarDados`
   lançando erro, verificava que ele lançava, e conferia
   `typeof global.apiFetchBackend === 'function'`. **Não tocava em nenhuma linha de
   produção.** Deixou a suíte verde exatamente sobre o invariante quebrado — pior que
   teste ausente, porque compra confiança.
   _Regra derivada_: teste de regressão precisa **importar algo de `src/`** (ou de
   `shared/`) e exercitar função real. Nunca mockar o próprio sujeito do teste.

3. **Teste que cobre a decisão, não a fiação.** O C4.1a-fix corrigiu o placebo
   importando o helper real e cobrindo as duas direções — o que é o teto do que dá para
   testar sem harness de frontend. Mas ele reimplementa localmente o fluxo que chama o
   helper: prova que a **decisão** está certa, não que `modal-acao-slot.js` **usa** a
   decisão.
   _Regra derivada_: quando um teste cobre a função pura mas não o chamador, registrar
   na spec como **cobertura parcial**, nunca como invariante garantido.

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

_Regra derivada_: "a feature existe" precisa ser verificado nos **dois lados**. Antes de
discutir regra de negócio sobre um dado, confirmar que alguém escreve esse dado.

### 3.7 Contrato de `salvarDados` (implementado no C4.1a-fix)

`assets/js/storage.js`, `salvarDados(silencioso)` **retorna `{ ok, motivo }`** com quatro
desfechos:

| Retorno                                    | Quando                           |
| ------------------------------------------ | -------------------------------- |
| `{ ok: true, motivo: 'sucesso' }`          | gravou no Mongo                  |
| `{ ok: false, motivo: 'nao_autenticado' }` | sem sessão, saiu antes de tentar |
| `{ ok: false, motivo: 'sessao_expirada' }` | 401 durante a gravação           |
| `{ ok: false, motivo: 'falha_remota' }`    | erro de rede ou resposta não-ok  |

**Histórico**: até o C4.1a ela capturava todo erro num `catch` interno e retornava
`undefined` em sucesso e em falha. `await salvarDados(true)` **não era confirmação de
persistência**, e foi isso que manteve vivo o 400 do PATCH de reposição.

A decisão de prosseguir mora em `assets/js/shared/reposicao-flow-helpers.js`
(`deveEnviarPatch`, `obterMensagemFalhaPersistencia`), consumida pelos dois caminhos de
reposição em `modal-acao-slot.js`. **Isso é decisão de arquitetura** — precisa estar
registrada na spec (D7 no C4.1b), não só no código.

### 3.8 Mutação de estado sem rollback (resíduo conhecido)

No caminho da série (`btnReagendarInstancia`), a exceção é adicionada a
`compromisso.excecoes` **antes** do `salvarDados`. Se a persistência falhar, o erro é
mostrado mas a exceção **permanece em memória** — a aula continua fora da agenda até um
reload.

Não é o bug que o C4.1a-fix corrigiu (aquele era a mutação **antes do POST**, que
permitia perder a aula ao clicar "Voltar" no modal, e foi removido). É o resíduo:
mutação sem snapshot de reversão. Impacto menor — só em falha de rede, e reload
conserta. Deve entrar na spec como caso conhecido ou virar item de roadmap.

---

## 4. Regras do módulo financeiro

Área mais sensível do sistema. Detalhamento em
`docs/specs/financas-ciclo-cobranca.md` (v6, em produção) e
`docs/specs/reposicoes-e-competencia.md` (v2 → v3 no C4.1b).

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
  base em cache local — e `await` em função que não retorna nada não conta como
  confirmação (ver 3.7).
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

|                        | FordLLM                                                                   | MAI (Copilot no VS Code)        |
| ---------------------- | ------------------------------------------------------------------------- | ------------------------------- |
| Lê o repositório para  | diagnosticar, desenhar e **auditar**                                      | implementar                     |
| Decide                 | qual é o problema, qual o desenho, o que fica fora                        | nada de produto ou arquitetura  |
| Produz                 | diagnóstico com `arquivo:linha` + prompt fechado + comando de verificação | código, testes e edições de doc |
| Escreve código no repo | **não**                                                                   | sim                             |
| Erra quando            | afirma sem ler a fonte                                                    | recebe pedido subespecificado   |

Consequências operacionais:

- **Nenhuma decisão de produto sai em aberto no prompt.** Se o prompt diz "defina quem
  decide X", o desenho ainda não estava pronto — o lugar de decidir X é a conversa, ou a
  spec.
- **Divergência entre pedido e spec: o MAI para e aponta, não escolhe.** Toda instrução
  deve incluir a regra de precedência ("a spec vence; se divergir, pare e aponte").
- **FordLLM não implementa.** O entregável da conversa é o prompt.
- **O MAI é ótimo executando o que já foi decidido.** Quando o C4 saiu torto, o defeito
  estava no prompt, não no modelo. E quando o prompt do C4.1a-fix ficou explícito o
  suficiente, ele entregou os cinco itens de primeira, inclusive extraindo o módulo
  isomórfico corretamente.
- **Item transversal é fronteira de risco.** Mudança que altera contrato consumido por
  muitos chamadores (ex.: retorno de `salvarDados`) é decisão de arquitetura disfarçada
  de refactor. Se precisar escalar para modelo maior, escalar **só esse item**.

### 5.4 Anatomia de um prompt que funcionou

Ordem testada, do topo para baixo:

1. **Natureza da tarefa.** Uma linha dizendo se é implementação ou investigação. Se for
   implementação, dizer explicitamente: _"o diagnóstico está fechado, não reinvestigue"_,
   e definir a falha: _"se terminar sem editar arquivos, falhou a tarefa"_.
2. **Ambiente.** Shell, caminho do repo, o que não usar (ver 1, "Ambiente de trabalho").
3. **Fonte de verdade**, com caminho completo. Mais a regra de precedência.
4. **Estado atual confirmado**, com `arquivo:linha`.
5. **Escopo**, numerado, um item por mudança. Se houver item que sustenta os outros,
   dizer qual é e mandar começar por ele.
6. **Fora de escopo**, copiado da spec.
7. **Testes exigidos**, nomeando as duas direções de cada regra direcional (ver 3.4).
8. **Restrições** — invariantes que não podem quebrar, enums fechados, dados de teste
   existentes na base.
9. **Relatório esperado** — com a saída literal de `git diff --stat` como primeiro item
   (ver 5.8).

### 5.5 Dimensionamento: a métrica é contagem de exigências, não caracteres

Tamanho em tokens raramente é o problema. O que limita é **quantas exigências
independentes ele precisa manter na cabeça enquanto edita**. Conte: cada item de escopo

- cada arquivo de doc + cada teste + cada decisão a registrar.

* **Até ~12 exigências**: prompt único funciona bem. O C4.1a-fix tinha 5 e saiu inteiro.
* **Acima disso**: ele começa a perder item, e perde **silenciosamente** — entrega 15 de
  20 e o relatório fala como se fossem 20.
* **O que ele sacrifica primeiro é o item periférico.** No C4 o modal saiu perfeito e o
  prazo virou uma cópia local errada da regra do backend — porque prazo era o item mais
  periférico da lista.

Três cortes que reduzem a contagem sem perder conteúdo:

1. **Separar código de documentação** (ver 5.6).
2. **Numerar as exigências de ponta a ponta** e pedir no relatório uma linha por número,
   com _feito / não feito / não se aplica_.
3. **Posição importa**: o meio do prompt é onde mais se perde item.

### 5.6 Protocolo de divisão a/b

Quando um pedido passa do limite de 5.5, quebrar em duas rodadas sequenciais:

**Parte (a) — código.** Os problemas de código, os testes e as restrições. Testes vão no
(a) porque teste é parte da implementação. Instruções extras:

- _"Esta é a parte 1 de 2. NÃO edite nada em `docs/` nesta rodada."_
- No relatório, um item a mais: **"decisões tomadas que precisam virar documentação"**.

**Parte (b) — documentação.** Rodada depois do (a) validado. Instruções extras:

- _"Nenhum arquivo de código deve ser alterado. Se achar que o código precisa mudar,
  pare e aponte."_
- _"Documente o estado real do código, não o que estava planejado. Onde a spec afirmar
  algo que o código não faz, corrija a spec."_

Regra de ouro: **a divisão é por natureza de entregável (código × doc), não por volume
de arquivos.**

**Corolário aprendido no C4.1a**: o (b) só roda depois do (a) **verificado**, não depois
do (a) _relatado_. Documentar sobre relatório é documentar ficção.

**Corolário do fluxo de branches**: como a feature branch não publica (seção 2.1), a
ordem confortável é fechar o (b) **antes** do merge na `main`. Assim código e spec entram
juntos em produção.

### 5.7 Erros de prompt já cometidos

- **Citar caminho de código mas não de spec.** Prompts do C3.1 e do C4. Violaram a regra
  5.1 e provavelmente causaram o turno perdido do C4.
- **Pedir "relatório ao final" sem dizer sobre o quê.** O agente entregou o relatório
  como se fosse o produto.
- **Deixar decisão de produto em aberto no prompt.** "Defina quem decide o valor de
  `cobravel`" quando a spec já definia um modal com rótulos literais.
- **Listar uma proibição como contexto em vez de restrição.** Ver erro nº 9.
- **Não exigir evidência de diff.** Duas rodadas seguidas voltaram com relatório de
  conclusão e nenhuma linha escrita. Ver 5.8.
- **Escrever comando em sintaxe do shell errado.** `grep` e `&&` num ambiente
  PowerShell. O bloco de verificação simplesmente não roda.

### 5.8 Critério de aceite e evidência

**Relatório do agente não é evidência. `git diff --stat` é.**

Em três rodadas consecutivas o relatório afirmou mais do que o diff sustentava:

| Rodada         | O relatório disse                            | O diff mostrava                         |
| -------------- | -------------------------------------------- | --------------------------------------- |
| C4             | fluxo de escolha cobrável implementado       | `cobravel: true` hardcoded no reagendar |
| C4.1a          | 5 itens feitos, 5 testes passando            | 3 de 5; teste nº 5 era placebo (3.4)    |
| C4.1a-fix (1ª) | contrato `{ ok, motivo }` + 47 testes verdes | **zero arquivo alterado**               |
| C4.1a-fix (2ª) | 5 itens feitos, 48 testes                    | **confirmado item por item** ✓          |

Modo de falha característico: **diff vazio com relatório detalhado e plausível**,
inclusive citando nomes de função e contagem de testes que não existem.

> **Pista útil**: a contagem de testes. Se ele diz que reescreveu ou adicionou teste e o
> total não mudou, algo está errado. Na rodada que funcionou, o total foi de 47 → 48.

Procedimento fixo:

1. **No prompt**, exigir a saída literal de `git diff --stat` como primeiro item do
   relatório, e dizer: _se não listar os arquivos X e Y, você não implementou — não
   escreva relatório de conclusão, diga o que travou_.
2. **No terminal**, antes de mergear, rodar o bloco de verificação: `git status --short`
   mais um `Select-String` por invariante, com o resultado esperado escrito ao lado
   (_presente_ / _ausente_). Busca que deve vir vazia é tão informativa quanto a que deve
   ter linha. Modelo:

```powershell
cd E:\Projetos\GIT\personalapp
Write-Host "--- 1. arquivos tocados ---"
git status --short
Write-Host "--- 2. <invariante que DEVE aparecer> ---"
Select-String -Path <arquivo> -Pattern "<padrao>" -SimpleMatch
Write-Host "--- 3. <invariante que NAO deve aparecer> ---"
Select-String -Path <arquivo> -Pattern "<padrao>" -SimpleMatch
Write-Host "--- 4. sintaxe ---"
node --check <arquivo.js>
Write-Host "--- 5. suite completa ---"
cd backend
npm test
```

3. **Só então** empacotar e mandar para auditoria (seção 10).
4. **Limite do grep**: busca textual não cobre _remoção no meio de um handler_ nem
   _ordem de chamadas_. Esses itens só a auditoria do pacote fecha.
5. Na parte (b) do protocolo a/b, o critério inverte: `git diff --stat` **não** deve
   listar arquivo de código.

Bloco para colar no topo de prompt de reexecução, quando uma rodada já falhou:

```
Esta tarefa já foi pedida uma vez e voltou com relatório de conclusão e
`git diff` vazio. Nenhum dos itens abaixo está no código hoje — o estado
commitado foi verificado. Não presuma que parte já está feita.

Ao final, rode `git diff --stat` e cole a saída LITERAL no relatório. Se ela não
listar <arquivos esperados>, você não implementou: não escreva relatório de
conclusão, diga o que travou.
```

**Regra de parada**: uma tentativa por prompt. Se voltar com diff vazio de novo, não
reformular o prompt uma terceira vez — trocar de modelo (ver 5.3). _Observação: no
C4.1a-fix a segunda tentativa com o bloco acima funcionou, então a trava por evidência
vale mais que a troca de modelo._

### 5.9 Validade desta seção

Os modelos MAI são de melhoria contínua. Tratar 5.2 como observação datada (2026-08-24)
e reconferir se o comportamento divergir do descrito.

---

## 6. Áreas sensíveis — confirmar antes de mexer

- **Motor de recorrência** (`recurrence-helpers.js`, `calendario-engine.js`) — afeta
  agenda e financeiro ao mesmo tempo.
- **Detecção de conflitos** (`agenda-conflitos.js`).
- **Google Calendar** (`gcalSyncService.js`, `gcalAuthController.js`,
  `gcalWebhookController.js`) — credencial, webhook externo e **estado remoto que
  `git revert` não desfaz**. É acionado dentro dos handlers de reposição, em caminho
  assíncrono: ordem de persistência importa, e o comportamento não pode depender de a
  usuária estar logada no Google. **Cuidado com a correção pela remoção**: o C4.1a
  cumpriu "a ordem não pode depender do GCal" apagando a chamada de sync, e a aula de
  reposição deixou de chegar ao calendário. Independência de ordem ≠ ausência de sync.
  O padrão correto (implementado no fix): sync **depois** da persistência confirmada e do
  PATCH 2xx, em `try/catch` que só avisa, sem reverter o que já foi gravado.
- **Autenticação** (`requireAuth.js`, `auth/google-identity.js`).
- **`salvarDados`** (`storage.js`) — consumida por praticamente toda a UI. Contrato em
  3.7. Mudar é transversal.
- **Sync em cascata de aluno** (`cascade-sync-aluno.js`).
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
`git archive`. _Lição: antes de acusar algo de não estar ignorado, verificar o
`.gitignore` — e pedir o pacote via `git archive`._

**2. Sugerir skill para regra sempre-ligada.**
Recomendei colocar a regra de "spec-first" num skill. Skill é carregado sob demanda;
regra que vale em toda sessão pertence ao `copilot-instructions.md`. Pior: o skill era
vendorizado de terceiro, então a edição local desapareceria na próxima atualização.
_Lição: regra sempre-ligada → arquivo de instruções. Skill → tarefa específica. Nunca
editar skill de terceiro._

**3. `.gitignore` que "ignorava" arquivo já rastreado.**
`.agents/` estava no `.gitignore`, mas o `SKILL.md` já estava commitado — e `.gitignore`
não afeta arquivo já rastreado. _Lição: presença no `.gitignore` não significa que o
arquivo não está versionado._

**4. Aceitar "testo em produção" como bloco monolítico.**
Ele descreveu a falta de ambiente local como uma coisa só, grande e estrutural. Só ao
ler `storage.js` percebi que eram **quatro** problemas separados, três pequenos e
independentes. _Lição: quando ele descrever algo como "estrutural demais para mexer
agora", vale decompor antes de concordar._

**5. Presumir que a fila de reposição era persistida.**
Discuti regras de cobrança sobre a fila por um bom tempo antes de verificar que
`aulasParaRepor` é só um array em memória. _Lição: antes de desenhar regra sobre um dado,
confirmar que o dado sobrevive a um reload._

**6. Reconstruir mecanismo de bug em vez de ler o código.**
Diagnostiquei a guarda de sobreposição do C3 a partir dos sintomas e do timestamp do
pacote, e descrevi o mecanismo errado. O código real sempre encurtava o documento
**persistido**, sem ordenar por data — pior e mais simples do que eu supus. A aritmética
batia mesmo assim, o que fez o diagnóstico errado parecer certo. _Lição: quando o pacote
está no KB, ler o trecho. Sintoma compatível não prova mecanismo._

**7. Escrever prompt de implementação sem apontar a spec.**
Nos prompts do C3.1 e do C4 citei caminhos de código com número de linha, mas nenhuma
spec — violando diretriz já escrita em `docs/README.md`. O MAI devolveu diagnóstico em
vez de implementação, comportamento coerente com um modelo otimizado para sinalizar
subespecificação. _Lição: antes de escrever prompt, reler `docs/README.md` e citar as
specs pelo caminho completo._

**8. Recomendar sem ler a spec inteira.**
Sugeri a ordem de teste das reposições ("escolhe uma aula do meio do mês") sem ter lido
a regra de prazo. A regra ancora no ciclo da **aula original**, então três das quatro
datas nasceriam vencidas. Também dimensionei o C4 sem as seções 9.1–9.3 da spec, e ficou
faltando o caminho recorrente e um modal inteiro. _Lição: para qualquer coisa que vire
prompt, ler a spec inteira antes, não o trecho que parece relevante._

**9. Listar "não duplicar regra" como contexto, não como restrição do prompt.**
O C4 introduziu `calcularPrazoReposicaoLocal`, reimplementação da regra de prazo do
backend — exatamente o que a seção 3.2 proíbe. Passou pela minha revisão porque eu
conhecia a regra e nunca a escrevi **dentro** do prompt: estava aqui, como contexto, não
lá, como invariante. _Lição: o MAI só respeita o que está no prompt ou nas instruções
permanentes. Saber a regra não basta — se ela pode ser violada pela tarefa, ela vira
linha na seção de restrições._

**10. Pedir `git archive` sem dizer que ele só empacota o commitado.**
Depois do erro nº 1 passei a pedir o pacote via `git archive` — instrução certa, e
incompleta. Ele rodou `git archive HEAD` com o trabalho não commitado, e o pacote saiu
**byte a byte igual ao anterior**, exceto por fim de linha. Gastamos uma rodada para
descobrir que o pacote mentia por omissão. _Lição: `git status --short` e `git archive`
andam juntos, sempre — um diz o que existe na árvore, o outro o que está no commit._

**11. Dizer que gerei arquivo sem gerar.**
Duas vezes descrevi as mudanças deste arquivo em detalhe, seção por seção, sem ter
chamado a ferramenta de geração. O texto era convincente e o arquivo não existia.
_Lição: é o mesmo modo de falha do erro nº 10 do MAI, do outro lado da mesa — relatório
plausível sem artefato. Se eu digo "atualizei o arquivo", ele tem que estar anexado na
mesma mensagem._

**12. Presumir que todo fix ia para a `main`.**
Por três rodadas prescrevi "commit local, sem push" e branch `wip-` descartável, porque
tratei a `main` como destino de cada correção. Ele trabalha com feature branch
(`new/reposicao-feature`), onde push é seguro e o trabalho acumula normalmente. A
cautela era desnecessária e criou passo extra à toa. _Lição: perguntar como ele organiza
branches antes de dar conselho sobre fluxo de git. Ele tem processo — eu supus que não._

**13. Dar comando em sintaxe do shell errado.**
Entreguei bloco de verificação com `grep` e `&&` depois de ele ter dito que mudou para
Windows. Não rodou. _Lição: confirmar o shell antes de escrever comando, e registrar o
ambiente no topo do prompt para o agente também não errar._

---

## 9. Estado em 25/08/2026

### Entregue e em produção (`main`)

- **Finanças — Ciclo de Cobrança por Aluno** (spec v6): ciclo configurável por aluno com
  vencimento móvel, registro de pagamento, status automático, ajuste manual por ciclo,
  histórico.
- **Precisão financeira**: fim da aproximação `frequência × 4`.
- **Reorganização da documentação**: `docs/` criado, README corrigido, `.agents/`
  versionado, `copilot-instructions.md` no lugar.
- **Backend de reposições** (seção 6 da spec): `Reposicao`, controller com validação,
  `calcularPrazoReposicao`, `sincronizarExpiracaoLazy`.
- **Suíte de testes** em `backend/test/` (`node:test`, sem dependência nova).

### Na branch `new/reposicao-feature` (não publicado)

- **C4 (roadmap 0.5), parcial**: modal de escolha cobrável/não cobrável com os textos
  literais da spec, renames de 9.1, `enviarParaReposicao` extraída, POST ao enviar
  funcionando nos dois caminhos.
- **C4.1a, parcial**: `formReagendarAula` deixou de fazer POST (consome a pendente e só
  faz PATCH); `calcularPrazoReposicaoLocal` removida e prazo passou a vir do servidor;
  botão de dispensar removido do markup.
- **C4.1a-fix, completo — auditado no pacote em 25/08**:
  1. `salvarDados` retorna `{ ok, motivo }` (4 desfechos, ver 3.7); os dois caminhos de
     reposição só fazem PATCH com sucesso confirmado, via
     `deveEnviarPatchReposicao`.
  2. Teste placebo reescrito: importa o helper real e cobre as duas direções
     (falha → sem PATCH; sucesso → um PATCH). Teste de dedupe renomeado para o que de
     fato verifica (409 no POST).
  3. Sync com Google Calendar restaurado no reagendamento, **depois** do PATCH 2xx, em
     `try/catch` que só avisa.
  4. Mutação de `excecoes` anterior ao POST removida, junto com o `_snapshot` não usado.
  5. `window.resolverReposicao` removida.
  - Novo módulo isomórfico `assets/js/shared/reposicao-flow-helpers.js`, carregado no
    `index.html` depois de `recurrence-helpers.js` e antes de `modal-acao-slot.js`.
  - Suíte: **48/48**, 0 falhas.

### Próximo

- **C4.1b (documentação)** — spec de reposições para v3, com D1–D6 mais:
  - **D7**: o contrato de retorno de `salvarDados` e a regra "PATCH só após persistência
    confirmada" (ver 3.7).
  - Cobertura parcial do teste do item 2 — cobre a decisão, não a fiação (ver 3.4.3).
  - Resíduo de mutação sem rollback no caminho da série (ver 3.8).
  - Cabeçalho de status dizendo que a implementação está em `new/reposicao-feature`, não
    em produção.
  - Item 0.9 no roadmap + nota de que a dívida 0.2 passou a ter dois consumidores
    (ver 3.2).
  - Regra de implementação única no `copilot-instructions.md`.
- **C3.1** — regressão da guarda de sobreposição de ciclos.
- **Validação spec × código**: varredura seção por seção da spec v3 contra o código,
  classificando cada uma em implementada / parcial / ausente / **divergente**. O caso
  divergente é o mais perigoso: a spec vira mentira e a próxima sessão confia nela.
- **Item D** (roadmap `0.6`) — extrato do ciclo, com as linhas
  `reposicao_cobravel_origem` e `reposicao_nao_cobravel`. Depende do C4.
- Depois: `0.7` (prazo + expiração), `0.9`, `0.1` (bug do bloco de histórico),
  `1.7` (busca por nome), `3.2`/`3.3` (backend local — ver 3.1).

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
> servir como prova de congelamento**.

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
- **Nomenclatura de itens de trabalho**: apelidos como "C3", "C4", "C4.1a", "item D" são
  de conversa e **não existem no repo**. Ao referenciar, traduzir para o número do
  roadmap (`0.5`, `0.6`) ou para a seção da spec.

### 10.1 Protocolo de empacotamento para auditoria

**Nunca zip da pasta.** Zip de pasta inclui o que o `.gitignore` exclui e já causou
alarme falso (erro nº 1).

**`git archive` sozinho também não basta.** Ele empacota apenas o que está no commit —
com trabalho pendente na árvore, o pacote sai idêntico ao anterior e **mente por
omissão** (erro nº 10). Detalhe que confunde: o `git archive` normaliza fim de linha para
CRLF, então uma comparação ingênua acusa "104 arquivos alterados" onde não houve
nenhuma mudança de conteúdo.

O par obrigatório, na branch da feature:

```powershell
cd E:\Projetos\GIT\personalapp
git status --short
git add -A
git commit -m "<mensagem>"
git archive --format=zip -o pacote.zip HEAD
```

O `git status` diz **o que existe na árvore de trabalho**; o `git archive`, **o que está
no commit**. Divergência entre os dois é a informação mais importante do pacote.

Como a feature branch não publica (seção 2.1), **commit e push nela são seguros** — não
precisa de branch descartável nem de evitar push (erro nº 12).

### 10.2 Verificação antes de mergear

Bloco de `Select-String` por invariante, com o resultado esperado escrito ao lado
(_presente_ / _ausente_), mais `node --check` nos JS alterados e a suíte **completa** do
backend (`npm test` dentro de `backend`), não só o arquivo de teste novo. Modelo do bloco
e limites do método: ver 5.8.
