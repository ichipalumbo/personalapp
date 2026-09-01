# Instruções do repositório — Agenda Personal Trainer (Prô Josy)

Regras permanentes para agentes de IA que **editam código** neste repositório.
Valem para todas as sessões, independentemente da tarefa.

> **Este arquivo guarda regra e fato estável — nunca número volátil.**
> Contagem de testes, versão de spec, quantidade de defeitos e estado de backlog
> **não entram aqui**: envelhecem em uma rodada e passam a mentir para quem confia.
> Esses valores moram na fonte — `docs/roadmap.md`, o cabeçalho de cada spec e a
> saída de `npm test`. Se precisar do número, vá lá buscar.

---

## 1. Como trabalhar comigo

- **Em caso de ambiguidade, pergunte antes de decidir.** Não escolha um caminho e
  siga. Uma pergunta curta antes vale mais que uma correção depois. É preferência
  explícita do dono, não formalidade.
- **Não extrapole o escopo pedido.** A única exceção é *levantar* uma ambiguidade
  ou um risco que você encontrou — traga o ponto, mas não implemente por conta.
- **Não escreva blocos de código no chat.** Edite o arquivo e relate em texto o que
  mudou e por quê. Vale também para trecho curto e para uma linha só.
- **Ao final, relate**: arquivos alterados, o que mudou em cada um, e o que você
  encontrou mas **não** alterou. O que você viu e deixou passar é tão importante
  quanto o que consertou.
- **Não conclua sem verificar.** Comando que falha, saída truncada ou resultado
  inesperado não viram "provavelmente funcionou". Confirme ou diga que não deu.
- **Custo de token é restrição real** para o dono. Ofereça a versão enxuta de
  procedimento repetitivo e diga o custo junto com o retorno.

### Idioma

Código, comentários, nomes de variáveis, mensagens de UI e conversa em **português**.
Mantenha o padrão do arquivo que estiver editando.

### Ambiente e comandos

O repositório é editado a partir de **três ambientes diferentes**: duas máquinas
Windows com PowerShell e o GitHub Codespaces, em Linux. Caminho do repositório, shell
e o que está instalado **mudam entre eles** — nenhum dos três é o "padrão".

- **Nunca presuma caminho, shell ou dependência instalada.** Em dúvida,
  `Get-Location` ou `pwd` antes de qualquer comando.
- **Verifique a capacidade antes de prometer o resultado.** Dependência do backend
  instalada, `.env` presente e porta livre são propriedades **do ambiente**, não do
  projeto. Já aconteceu de a suíte não rodar por falta de `node_modules` — isso não
  é defeito do código.
- **Se algo não rodou, diga que não rodou.** Comando que falhou não vira estimativa.

Um dos ambientes mantém o repositório dentro de **pasta sincronizada em nuvem**, o
que pode causar lock de arquivo e atraso de sincronização. Se um arquivo parecer ter
sumido ou voltado sozinho, **confirme em disco e no `git log` antes de concluir que
houve perda de trabalho.**

A matriz de ambientes e o que checar ao trocar de máquina estão em
`docs/ambiente-local.md`.

No PowerShell:

- **Nunca use `&&`**; separe com `;` ou um comando por linha.
- Use `Select-String` no lugar de `grep`, `Get-ChildItem` no lugar de `ls`.
- **Redirecionar com `>` grava em UTF-16** e produz arquivo ilegível para as
  ferramentas de leitura. Use `| Out-File -Encoding utf8` quando precisar de arquivo.
- `Get-Content` no PowerShell 5.1 lê em ANSI: arquivo UTF-8 aparece com acento
  quebrado no console. Isso é exibição, **não** corrupção — confirme lendo com
  UTF-8 explícito antes de "consertar" o que não está quebrado.

Entregue comando pronto para colar, com a leitura do resultado esperado.

---

## 2. Onde está a verdade

**Hierarquia**: código > specs > roadmap > README. Se divergir, o código vence — e a
documentação é que deve ser corrigida.

Antes de alterar **qualquer regra de negócio**, leia a spec do domínio em
`docs/specs/<domínio>/`. Os domínios são `alunos`, `agenda`, `financeiro`,
`integracoes` e `plataforma`, cada um com um `README.md` de índice.

- **O índice do domínio aponta; a spec decide.** Índice não contém regra.
- **A spec é a fonte de verdade.** Não infira regra que não esteja escrita nela.
- Cada spec tem uma seção de **decisões e casos de borda** (ambiguidades já
  resolvidas) e uma de **fora de escopo** (o que foi deliberadamente deixado de
  fora). Consulte as duas antes de propor solução.
- **Domínio sem spec escrita significa comportamento não decidido.** Nesse caso o
  código é o estado de fato, não a decisão de produto — e qualquer mudança de
  comportamento precisa ser confirmada com o dono.
- Sempre use o **caminho completo** da spec ao referenciá-la. Citar só o nome do
  arquivo faz o agente procurar no lugar errado e seguir em frente sem avisar.

Mapa da documentação: `docs/README.md`. Backlog e dívidas: `docs/roadmap.md`.

---

## 3. Como o app foi construído

Contexto que explica quase toda decisão estranha que você vai encontrar.

**Nasceu com apoio de IA, sem testes e sem ambiente local.** As lacunas atuais vêm
daí, não de descuido. Trate como história do projeto, não como falha a corrigir de
passagem.

**É desenvolvido por uma pessoa só**, sem revisor. Nenhuma sugestão precisa
considerar code review, onboarding de time ou coordenação. Em compensação, não
existe segunda pessoa para pegar o seu erro.

**Usuário final real**: uma personal trainer. O app está publicado, mas ainda não
foi lançado oficialmente. **Não assuma que erro em produção é inofensivo** — o
grau de folga muda no lançamento e é o dono quem sabe onde isso está hoje.

Decisões estruturais que valem como restrição:

- **Frontend sem build step**, por escolha. JavaScript vanilla, sem framework e sem
  bundler. Os scripts carregam por tag `<script>` em `index.html` e **a ordem
  importa**: módulos dependem de globais definidos por scripts anteriores, e alguns
  lançam erro se a dependência não carregou antes. Ao adicionar um `.js`, inclua a
  tag na posição correta.
- **Backend serverless**, Node/Express/Mongoose em `backend/`, com `package.json`
  próprio. Entry point `backend/server.js`, app montado em `backend/src/app.js`.
  **Não há processo contínuo, logo não existe cron**: estado derivado (expiração,
  status) é recalculado na leitura e persistido se mudou. Não proponha job em
  background — ele não tem onde rodar.
- **Resiliência é de leitura, não de escrita.** Em falha de API o frontend mostra
  cache local; escrita só é dada como concluída após resposta de sucesso. Onde a
  ação é destrutiva ou financeira, o fluxo é deliberadamente **pessimista**:
  confirma no servidor antes de refletir na tela, com rollback do estado local em
  caso de falha. Não "otimize" isso para optimistic-UI sem decisão explícita.
- **MongoDB via Mongoose, a maioria dos schemas com `{ strict: false }`.** Isso
  permite gravar campo não declarado — ou seja, **um typo em nome de campo não gera
  erro**. Confira nomes contra o schema. Há exceção proposital: o schema de
  reposição usa `strict` padrão justamente porque alimenta cálculo financeiro e não
  pode aceitar campo errado em silêncio. Confirme qual é o caso antes de assumir.
- **PWA com service worker registrado** (`sw.js`, `assets/js/app/service-worker.js`).
  Ele cacheia arquivos same-origin e pode servir versão antiga do frontend depois de
  uma edição.

---

## 4. A stack que não está no repositório

Nada disto se descobre lendo o código, e tudo isto quebra o projeto se for ignorado.

### Deploy — dois projetos Vercel, um repositório

| Projeto                | Root Directory      | Serve                                 |
| ---------------------- | ------------------- | ------------------------------------- |
| `personal-app-webpage` | raiz do repositório | o app (frontend)                      |
| `personal-app-api`     | `backend/`          | a API                                 |

- **Não existe staging.** Push ou merge na `main` faz redeploy automático em
  produção **nos dois**. Não há branch de preview permanente; deploy manual de
  branch de teste é possível, mas qualquer mudança na `main` o substitui.
- **A opção "Include source files outside of the Root Directory" está ativada** no
  projeto da API. É **ela** que faz o `require` do backend alcançar módulo fora de
  `backend/` funcionar. Não está versionada: quem recriar o projeto sem ela quebra a
  build sem que nada no repositório tenha mudado.
- Os *roots* diferentes são o que sustenta o arranjo atual. **Mudança de estrutura
  de pastas pode quebrar o deploy sem quebrar nada localmente.**

### Banco — MongoDB Atlas

- Produção e desenvolvimento vivem no **mesmo cluster**, em bancos diferentes. O
  banco de produção tem nome herdado da configuração inicial; o de desenvolvimento é
  separado. **Qual banco você está usando vem da `MONGODB_URI`**, não do código.
- A URI correta é copiada **inteira** do painel da Vercel. Montar à mão ou
  substituir placeholder de senha já custou uma rodada inteira de diagnóstico.
- O `.env` fica fora do repositório. `backend/.env.example` lista as chaves.

### Identidade e Google

- O login usa Google Identity Services. O **Client ID é público** e aparece em texto
  puro no frontend; o que é segredo é o **Client Secret**, que só existe no backend.
- As **origens autorizadas** no OAuth precisam incluir as de desenvolvimento local.
  Faltando qualquer uma, o login falha com `origin_mismatch` — sintoma que parece
  bug de código e não é.
- O **canal de webhook do Google Calendar expira** em poucos dias e precisa de
  renovação ativa. Sem isso ele morre em silêncio: não há erro, só param de chegar
  notificações.

### O que isso implica para você

**Sincronização com o Google e escrita no Mongo produzem estado remoto que
`git revert` não desfaz.** Reverter o commit não apaga o evento criado no calendário
nem desfaz a gravação no banco. É a razão de várias restrições deste documento.

Procedimento de painel (Vercel, Atlas, Google Cloud) e histórico de erros já
cometidos ficam em `docs/contexto-personalapp-para-novas-conversas.md`. Ambiente
local, `.env` e troubleshooting ficam em `docs/ambiente-local.md`.

---

## 5. Regras de arquitetura que não podem ser quebradas

### 5.1 Isolamento por `ownerEmail`

O app é multiusuário: qualquer conta Google pode usar, e cada conta vê apenas os
próprios dados.

- Toda rota autenticada passa por `requireAuth`, que valida o JWT do Google e popula
  `req.auth.ownerEmail`.
- **Toda query ao MongoDB deve ser filtrada por `ownerEmail`**, obtido via
  `getOwnerEmailOrThrow(req)` (`backend/src/utils/ownerScope.js`).
- Esquecer esse filtro vaza dados entre contas. **Não há nenhuma outra camada
  protegendo contra isso.** Vale para toda collection e toda rota nova.

### 5.2 Implementação única de regra de negócio

**Cálculo implementado no backend não pode ser reimplementado no frontend.**

- Se o frontend precisa do resultado, consome da resposta da API.
- Se o cálculo precisa existir dos dois lados, mora em **módulo compartilhado
  único** e é consumido por ambos.
- É proibido manter cópias divergentes da mesma regra em arquivos diferentes.

Motivo concreto: no fluxo de reposições, uma cópia local da regra de prazo divergiu
da implementação oficial e o erro só apareceu em produção.

### 5.3 Módulos compartilhados e a fronteira `backend/ → assets/`

Os módulos em `assets/js/shared/` são consumidos pelos **dois lados**: pelo frontend
via tag `<script>`, e pelo backend via `require` relativo que **atravessa para fora
de `backend/`**. Há mais de um módulo nessa situação e mais de um consumidor no
backend — **levante todos antes de mexer**, porque consertar um import e esquecer os
outros quebra o deploy.

Regras:

- **Módulo compartilhado não pode depender de `window`, `document` ou API de
  browser** — ele roda no Node.
- Todo módulo compartilhado consumido no frontend precisa de tag `<script>` em
  `index.html`, carregada **antes** dos consumidores diretos.
- **Nunca duplicar a lógica para "resolver" a travessia.** Se a agenda e o
  financeiro resolverem recorrência de formas diferentes, o app cobra um valor
  diferente do que mostra.
- A travessia é dívida técnica **conhecida e aceita** (ver roadmap). Funciona por
  causa da configuração de deploy descrita em §4. **Não conserte de passagem** —
  exige validar os dois projetos Vercel.

### 5.4 Ordem de declaração de rotas

Rota literal vem **antes** de rota com parâmetro. Uma rota literal declarada depois
de `/:id` é capturada como se o literal fosse um id.

---

## 6. Código que calcula dinheiro

O módulo financeiro exige cuidado extra. As regras abaixo são invariantes, não
sugestões:

- **Recálculo usa sempre o snapshot do ciclo**, nunca o preço atual do aluno. Um
  reajuste vale a partir do próximo ciclo, jamais retroativamente. Já houve o
  defeito oposto em produção: reajustar um aluno reescrevia a dívida de meses
  anteriores.
- **Ciclo pago é congelado permanentemente.** Nenhuma alteração posterior na agenda
  o modifica, e tentativa de ajuste é rejeitada.
- **Piso zero**: o total de aulas cobradas nunca fica negativo, mesmo com ajuste
  manual negativo. O PT não paga para trabalhar.
- **Cada aula é cobrada exatamente uma vez** — nunca zero, nunca duas. É a
  propriedade que o modelo de competência existe para garantir.
- **Escrita financeira só é considerada concluída após resposta HTTP de sucesso.**
  Nunca confirme na UI com base em cache local.
- **Toda alteração no serviço financeiro exige rodar a suíte antes e depois**, e
  reportar os dois números. Não existe teste de frontend: validação de UI é manual.

O detalhamento está na spec do domínio financeiro. Se a regra que você precisa não
estiver escrita lá, ela não está decidida — pergunte.

---

## 7. Áreas sensíveis — avise antes de mexer

Alteração nestas áreas deve ser confirmada **antes** de implementada, mesmo que
pareça pequena. O critério não é dificuldade: é o tamanho do estrago quando erra.

- **Motor de recorrência** — afeta agenda e financeiro ao mesmo tempo. Mudar como
  uma data é resolvida muda o que o app cobra.
- **Edição, split e exclusão de série, e envio para reposição** — concentra as
  operações destrutivas do app, com escopos diferentes (esta ocorrência, daqui pra
  frente, série toda) e cadeias de séries criadas por divisões anteriores. É a área
  com maior histórico de regressão do projeto; vários defeitos só apareceram com
  duas divisões encadeadas.
- **Detecção de conflitos de horário.**
- **Sincronização com Google Calendar** — credencial, webhook externo e estado
  remoto que `git revert` não desfaz.
- **Autenticação e escopo por conta** — é a fronteira de segurança do app.
- **Sync em cascata de aluno** — altera vários agendamentos numa operação só.

---

## 8. Testes e prova por mutação

- O backend tem suíte automatizada, executada com `node --test` via `npm test`
  dentro de `backend/`. O frontend **não tem** suíte: validação é visual e manual.
- **Teste novo precisa ser provado por mutação**: reverta o fix e o teste tem de
  falhar. Teste que passa no código antigo não é cobertura, é decoração.
- **Mutação no arquivo real de produção**, não numa cópia. Prova em cópia não prova
  que o caminho executado em runtime está coberto.
- Rode a suíte **antes e depois** e reporte os dois números. O número absoluto não
  vale nada isolado — o que importa é a diferença e a ausência de falhas.
- Se a suíte não rodar no seu ambiente, **diga isso** em vez de estimar. Dependência
  ausente e teste que não executou não são o mesmo que teste que passou.

---

## 9. Convenções de código

- **Idioma**: português, conforme §1. Mantenha o padrão do arquivo que estiver
  editando.
- **Sem dependências novas sem confirmar.** O projeto é deliberadamente enxuto: o
  frontend não tem nenhuma dependência e o backend tem poucas. Se algo exigir
  biblioteca nova, levante a questão antes de instalar.
- **Sem build step no frontend.** Não introduza bundler, transpilador ou sintaxe que
  dependa deles.
- **Comentário só para o que o código não consegue mostrar** — o motivo, a
  armadilha, a decisão. Não narre o que a linha seguinte faz.
- `package-lock.json` pode ser alterado quando necessário. Não é área protegida.

---

## 10. Onde escrever documentação

Cada tipo de informação tem um lugar. Escrever no lugar errado cria segunda fonte de
verdade, e duas fontes divergem na primeira alteração.

| Conteúdo | Onde |
| --- | --- |
| Regra de negócio decidida | `docs/specs/<domínio>/<feature>.md` |
| Índice de domínio (aponta, não decide) | `docs/specs/<domínio>/README.md` |
| Índice geral, mapa de domínios e de telas | `docs/README.md` |
| Como rodar, `.env`, troubleshooting | `docs/ambiente-local.md` |
| Árvore de arquivos, ordem de scripts, rotas | `docs/mapa-do-codigo.md` |
| Backlog e dívidas técnicas | `docs/roadmap.md` |
| Visão geral do projeto e ponteiros | `README.md` (raiz) |
| Relatório de uma rodada | `docs/_reports/AAAA-MM-DD-<tipo>-<slug>.md` |
| Diagnóstico ou auditoria exploratória | `docs/_diags_llm/AAAA-MM-DD-diag-<slug>.md` |

Regras que valem para todos:

- **O relatório da rodada é entregável, não cortesia.** É a única memória do
  *porquê* de cada decisão, e o que permite a uma conversa nova retomar o projeto
  sem reabrir discussão encerrada. Registre também o que você encontrou e **não**
  alterou, e a branch usada.
- **Relatório e diagnóstico são históricos.** Documento de item já fechado é
  imutável; correção posterior vai em documento novo que referencia o antigo. Não
  reescreva histórico para ficar coerente com o presente.
- **Roadmap é documento único e vivo.** Nunca versione por data nem duplique em
  `roadmap-v2.md`.
- `.agents/skills/` guarda skills versionados. O que estiver sob `vendor/` é
  **vendorizado de fonte externa: não edite** — alteração local se perde na próxima
  atualização. Regra própria vai neste arquivo.
- **Artefato gerado por ferramenta não é fonte de verdade.** Não edite à mão; se
  estiver desatualizado, regenere. Quando velho, ele referencia arquivo que já não
  existe e envenena busca por código.

---

## 11. Git — política de branch

O agente pode executar **duas** operações git, e somente após confirmação explícita
do dono:

- `git fetch origin`
- `git checkout -b <nome> <base>`

Proibido: commit, push, merge, rebase, `reset`, `restore`, `stash`, `checkout` de
arquivo, tag, alteração de `.git/config`.

**No início de toda rodada**, antes de escrever qualquer arquivo, o agente pergunta:

> Deseja que eu crie uma nova branch, ou prefere continuar na branch atual?

Informando: branch atual, se há alterações não commitadas, e um nome sugerido. Sem
indicar opção recomendada.

**A pergunta é pré-condição, não tarefa.** Ler código enquanto espera é permitido;
escrever não. Após a resposta, o agente **continua no mesmo turno** até concluir a
rodada. Encerrar o turno tendo apenas resolvido a questão da branch é falha.

**Resposta ausente ou ambígua:** perguntar de novo. Nunca presumir a escolha do dono.

**Continuar na branch atual é resposta válida** e dispensa nova pergunta enquanto o
dono não mudar de orientação — inclusive quando ele declara isso para a sessão
inteira.

**Working tree sujo + pedido de branch nova:** parar e relatar. A decisão é do dono.

Nome: `<tipo>/<escopo-curto>`, com `tipo` em `fix`, `feat`, `chore`, `docs`, `diag`,
`refactor`. O relatório registra a branch usada.

### Por que a restrição existe

Sync com Google Calendar e escrita no Mongo de produção envolvem **estado remoto que
`git revert` não desfaz**. A trilha de commits precisa ser inteiramente do dono, para
que exista um ponto de retorno confiável quando o estado externo divergir do código.