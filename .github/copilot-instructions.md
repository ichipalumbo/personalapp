# Instruções do repositório — Agenda Personal Trainer (Prô Josy)

Instruções permanentes para agentes de IA trabalhando neste repositório.
Aplicam-se a **todas** as sessões, independentemente da tarefa.

---

## 1. Como trabalhar comigo

- **Em caso de ambiguidade, pergunte antes de decidir.** Não escolha um caminho
  e siga. Uma pergunta curta antes vale mais que uma correção depois. Isso é
  preferência explícita do dono do repositório.
- **Não extrapole o escopo pedido.** A única exceção é levantar uma
  ambiguidade ou um risco que você encontrou — aí traga o ponto, mas não
  implemente por conta própria.
- **Não escreva blocos de código no chat.** Edite o arquivo diretamente e
  reporte em texto o que mudou e por quê. Colar código na conversa consome
  contexto sem necessidade.
- **Ao final, relate**: arquivos alterados, o que mudou em cada um, e o que
  você encontrou mas não alterou.
- `package-lock.json` pode ser alterado quando necessário.

---

## 2. Fonte de verdade das decisões de produto

Antes de alterar **qualquer regra de negócio**, leia a especificação
correspondente em `docs/specs/`.

- A spec é a fonte de verdade. **Não infira regras que não estejam escritas
  nela** — o que não está coberto deve ser tratado como fora de escopo e
  confirmado com o dono do repositório.
- Cada spec tem uma seção "Decisões e Casos de Borda" com as ambiguidades já
  resolvidas, e uma seção "Fora de Escopo" com o que foi deliberadamente
  deixado de fora. Consulte as duas antes de propor solução.
- Backlog, priorização e débitos técnicos conhecidos: `docs/roadmap.md`.
- Índice da documentação: `docs/README.md`.

Spec ativa: `docs/specs/financas-ciclo-cobranca.md` (v5, em produção).

---

## 3. Stack e estrutura

**Frontend** — JavaScript vanilla, sem framework e **sem build step**. Os
scripts são carregados por tags `<script>` em `index.html`, e **a ordem
importa**: módulos dependem de globais definidos por scripts anteriores
(ex.: `calendario-engine.js` lança erro se `recurrence-helpers.js` não tiver
carregado antes). Ao adicionar um arquivo JS, inclua a tag na posição correta.

**Backend** — Node/Express/Mongoose em `backend/`, com `package.json` próprio.
Entry point `backend/server.js`, app montado em `backend/src/app.js`.

**Banco** — MongoDB via Mongoose. Vários schemas usam `{ strict: false }`, o
que permite gravar campos não declarados. Isso facilita evolução, mas também
significa que **um typo em nome de campo não gera erro** — confira nomes contra
o schema.

**PWA** — service worker registrado (`sw.js`, `assets/js/app/service-worker.js`).

---

## 4. Regras de arquitetura que não podem ser quebradas

### 4.1 Isolamento por `ownerEmail`

O app é multiusuário: qualquer conta Google pode usar, e cada conta vê apenas
os próprios dados.

- Toda rota autenticada passa por `requireAuth`, que valida o JWT do Google e
  popula `req.auth.ownerEmail`.
- **Toda query ao MongoDB deve ser filtrada por `ownerEmail`**, obtido via
  `getOwnerEmailOrThrow(req)` (`backend/src/utils/ownerScope.js`).
- Esquecer esse filtro vaza dados entre contas. Não há nenhuma outra camada
  protegendo contra isso.

### 4.2 Módulo isomórfico de recorrência

`assets/js/shared/recurrence-helpers.js` é consumido pelos **dois lados**:

- frontend, via tag `<script>` em `index.html`;
- backend, via `require('../../../assets/js/shared/recurrence-helpers')` em
  `financasService.js` — um caminho relativo que atravessa para **fora** de
  `backend/`.

Regras:

- **Nunca duplicar essa lógica.** Se a agenda e o financeiro resolverem
  recorrência de formas diferentes, o app cobra um valor diferente do que
  mostra. É o motivo declarado da decisão (seção 2.4 da spec).
- **O módulo não pode depender de `window`, `document` ou API de browser** —
  ele roda no Node.
- O caminho atravessado é uma dívida técnica conhecida (12.1 da spec / item 0.2
  do roadmap). Funciona hoje por causa da configuração dos projetos Vercel.
  Não "conserte" isso de passagem — é mudança que exige validar os dois deploys.

### 4.3 Ordem de declaração de rotas

Rotas literais devem ser declaradas **antes** de rotas com parâmetro.
Ex.: `/api/alunos/consistencia-agenda` vem antes de `/:id`, senão o Express
trata `consistencia-agenda` como um id.

---

## 5. Código que calcula dinheiro

O módulo financeiro (`backend/src/services/financasService.js`, collection
`CicloFinanceiro`, tela `assets/js/view-financas.js`) exige cuidado extra:

- **Não existe teste automatizado neste repositório.** Não há runner
  configurado em `backend/package.json`. Toda validação é manual, em produção.
  Dois bugs financeiros reais já escaparam para prod por causa disso.
- **Recálculo usa sempre o snapshot do ciclo** (`precoAulaSnapshot`,
  `valorFixoSnapshot`, `metodoCobranca`), nunca o preço atual do aluno. Um
  reajuste vale a partir do próximo ciclo, jamais retroativamente.
- **Ciclo pago é congelado permanentemente.** Nenhuma alteração posterior na
  agenda o modifica. Tentativa de ajuste retorna HTTP 409.
- **Piso zero**: o total de aulas cobradas nunca pode ser negativo, mesmo com
  ajuste manual negativo.
- Escrita financeira (`PATCH` de pagamento e ajuste) só é considerada concluída
  na UI após resposta HTTP de sucesso. Nunca confirmar com base em cache local.

Detalhamento completo nas seções 5 e 6 de `docs/specs/financas-ciclo-cobranca.md`.

---

## 6. Deploy — não há ambiente de staging

Dois projetos Vercel independentes, ambos ligados a este repositório:

| Projeto                | Root Directory      | URL                                   |
| ---------------------- | ------------------- | ------------------------------------- |
| `personal-app-webpage` | raiz do repositório | https://josy-personal-app.vercel.app/ |
| `personal-app-api`     | `backend/`          | https://personal-app-api.vercel.app/  |

**Fluxo real de desenvolvimento** (não existe `npm run dev`):

- O frontend é servido localmente pela extensão Live Server do VS Code.
- Não há backend local em execução: `API_BASE_URL` em `assets/js/storage.js`
  é uma constante fixa apontando para a API de produção. **Portanto o
  frontend rodando local escreve no banco de produção.**
- Quando é preciso testar alteração de backend, o deploy é feito antes.
- Não sugira `npm run dev`, watch mode, script de seed ou ambiente local —
  nada disso existe hoje. Se uma tarefa depender de execução local, diga
  isso explicitamente em vez de assumir que há como rodar.

**Push ou merge na `main` faz redeploy automático em produção nos dois.**
Não existe branch de preview nem ambiente intermediário.

- Deploys manuais de branch de teste são possíveis, mas qualquer alteração na
  `main` os substitui.
- Consequência prática: **qualquer coisa que entra na `main` está em produção,
  usada por um usuário real.** Trate mudanças em cálculo financeiro, agenda e
  sincronização com o Google Calendar com esse nível de cuidado.
- Os _roots_ diferentes dos dois projetos são o que faz o caminho atravessado
  da seção 4.2 funcionar. Mudanças de estrutura de pastas podem quebrar o
  deploy sem quebrar nada localmente.

---

## 7. Áreas sensíveis — avise antes de mexer

Alterações nestas áreas devem ser confirmadas antes de implementadas, mesmo
que pareçam pequenas:

- **Motor de recorrência** (`recurrence-helpers.js`, `calendario-engine.js`) —
  afeta agenda e financeiro ao mesmo tempo.
- **Detecção de conflitos de horário** (`agenda-conflitos.js`).
- **Sincronização com Google Calendar** (`gcalSyncService.js`,
  `gcalAuthController.js`, `gcalWebhookController.js`) — envolve credencial,
  webhook externo e estado remoto que não é reversível por `git revert`.
- **Autenticação** (`requireAuth.js`, `auth/google-identity.js`).
- **Sync em cascata de aluno** (`cascade-sync-aluno.js`) — altera vários
  agendamentos de uma vez.

---

## 8. Documentação e artefatos

- `docs/specs/` — specs de feature, uma por arquivo, versionadas no cabeçalho.
  Fonte de verdade de regra de negócio.
- `docs/roadmap.md` — documento vivo, único. Não duplicar nem versionar por data.
- `README.md` (raiz) — visão geral e onboarding. **A árvore de arquivos pode
  estar desatualizada**; o código é sempre a referência. Se notar divergência,
  reporte.
- `.agents/skills/` — skills de agente, versionados. O `anti-ui-slop` é
  **vendorizado** de `github/awesome-copilot` (veja o `github-tree-sha` no
  frontmatter): **não edite**, pois alterações locais se perdem na próxima
  atualização. Regras próprias vão neste arquivo.
- Ferramentas de análise que gerem artefatos (grafo de dependências, etc.)
  produzem material **gerado**: não é fonte de verdade, não deve ser editado à
  mão e, se estiver desatualizado, deve ser regenerado.

---

## 9. Convenções

- **Idioma**: código, comentários, nomes de variáveis e mensagens de UI em
  português. Mantenha o padrão do arquivo que estiver editando.
- **Sem dependências novas sem confirmar.** O projeto é deliberadamente enxuto:
  o frontend não tem nenhuma, e o backend tem seis. Se algo exigir uma
  biblioteca nova, levante a questão antes.
- **Sem build step no frontend.** Não introduza bundler, transpilador ou
  sintaxe que dependa deles.
