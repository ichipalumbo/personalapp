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
> **Última atualização**: 2026-08-20

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
  em seguida — hoje está zerada. Não há dado real em risco, o que torna esta a melhor
  janela para mudanças estruturais e para escrever testes. **Essa janela fecha no
  lançamento.**

### Preferências explícitas (confirmadas por ele)

| Preferência | Detalhe |
|---|---|
| **Perguntar antes de decidir** | Em qualquer ambiguidade, perguntar em vez de escolher um caminho e seguir. Ele considera que isso melhora a qualidade final. |
| **Não extrapolar escopo** | Só é aceitável sair do escopo para **levantar** uma ambiguidade ou risco — nunca para implementar por conta própria. |
| **Não colar código no chat** | Preferência forte. Editar o arquivo e **relatar em texto** o que mudou. Colar blocos de código consome contexto sem necessidade. |
| **`package-lock.json`** | Pode ser alterado quando necessário. Não é área protegida. |
| **Relatório ao final** | Gosta de receber: arquivos alterados, o que mudou em cada um, e o que foi encontrado mas não alterado. |

**Idioma**: português, no código e na conversa. Comunicação informal e direta.

---

## 2. O projeto em uma página

**O que é**: sistema de gestão de alunos, agenda e cobrança para personal trainer.

**Stack**:
- **Frontend**: JavaScript vanilla, **sem framework e sem build step**. Scripts
  carregados por tags `<script>` em `index.html` — **a ordem importa** (há módulos que
  lançam erro se um anterior não tiver carregado).
- **Backend**: Node + Express + Mongoose, em `backend/` com `package.json` próprio.
- **Banco**: MongoDB. Vários schemas usam `{ strict: false }` — um typo em nome de campo
  **grava silenciosamente**, sem erro.
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

### 3.2 Módulo isomórfico de recorrência

`assets/js/shared/recurrence-helpers.js` é consumido pelos dois lados:
- frontend, por tag `<script>`;
- backend, via `require('../../../assets/js/shared/recurrence-helpers')` em
  `financasService.js` — três níveis para **fora** de `backend/`.

Regras:
- **Nunca duplicar.** Se agenda e financeiro resolverem recorrência de formas
  diferentes, o app cobra valor diferente do que mostra.
- **Não pode depender de `window`/DOM** — roda no Node.
- O caminho atravessado funciona por causa dos *roots* diferentes dos dois projetos
  Vercel. É dívida conhecida (0.2 no roadmap). Não "consertar de passagem".

### 3.3 Isolamento por `ownerEmail`

App multiusuário: qualquer conta Google pode usar, cada uma vê só os próprios dados.
`requireAuth` valida o JWT e popula `req.auth.ownerEmail`. **Toda query ao Mongo deve
filtrar por `ownerEmail`** (`getOwnerEmailOrThrow`). Não há nenhuma outra camada
impedindo vazamento entre contas.

### 3.4 Não há teste automatizado

Nenhum runner configurado em `backend/package.json`. Toda validação é manual, em
produção. **Dois bugs financeiros escaparam para prod** por isso (aula excluída continuar
sendo cobrada; reajuste alterando ciclos antigos retroativamente), mas eles **não
afetaram cobrança de aluno real** porque a base de produção foi limpa e o app ainda não foi
lançado oficialmente. Ambos foram corrigidos.

### 3.5 Ordem de rotas no Express

Rota literal antes de rota com parâmetro. Ex.: `/api/alunos/consistencia-agenda` precisa
vir antes de `/:id`.

---

## 4. Regras do módulo financeiro

Área mais sensível do sistema. Detalhamento em
`docs/specs/financas-ciclo-cobranca.md` (v6, em produção).

- **Recálculo sempre pelo snapshot** do ciclo (`precoAulaSnapshot`, `valorFixoSnapshot`,
  `metodoCobranca`), nunca pelo preço atual do aluno. Reajuste vale do próximo ciclo em
  diante, jamais retroativamente.
- **Ciclo pago é congelado permanentemente.** Alteração posterior na agenda não o
  modifica. Tentativa de ajuste retorna HTTP 409.
- **Piso zero**: total de aulas cobradas nunca fica negativo, mesmo com ajuste manual
  negativo.
- **Escrita financeira só é confirmada na UI após resposta HTTP de sucesso.** Nunca com
  base em cache local.
- O cálculo percorre a janela real de datas do ciclo e conta ocorrências resolvidas pelo
  motor de recorrência — não usa mais a aproximação `frequência × 4`.

**Fora de escopo hoje**: feriados (aula em feriado é contada normalmente) e estorno /
reabertura de ciclo pago.

---

## 5. Áreas sensíveis — confirmar antes de mexer

- **Motor de recorrência** (`recurrence-helpers.js`, `calendario-engine.js`) — afeta
  agenda e financeiro ao mesmo tempo.
- **Detecção de conflitos** (`agenda-conflitos.js`).
- **Google Calendar** (`gcalSyncService.js`, `gcalAuthController.js`,
  `gcalWebhookController.js`) — envolve credencial, webhook externo e **estado remoto que
  `git revert` não desfaz**.
- **Autenticação** (`requireAuth.js`, `auth/google-identity.js`).
- **Sync em cascata de aluno** (`cascade-sync-aluno.js`) — altera vários agendamentos de
  uma vez.

---

## 6. Onde as coisas moram — hierarquia de fontes de verdade

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

---

## 7. Erros que eu já cometi neste projeto

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
não afeta arquivo já rastreado. O repo estava num estado ambíguo. *Lição: presença no
`.gitignore` não significa que o arquivo não está versionado.*

**4. Aceitar "testo em produção" como bloco monolítico.**
Ele descreveu a falta de ambiente local como uma coisa só, grande e estrutural. Só ao
ler `storage.js` percebi que eram **quatro** problemas separados, três deles pequenos e
independentes (testes de função pura, backend local, frontend apontando para o local) e
apenas um realmente grande (banco de dev separado). *Lição: quando ele descrever algo
como "estrutural demais para mexer agora", vale decompor antes de concordar.*

**5. Presumir que a fila de reposição era persistida.**
Discuti regras de cobrança sobre a fila por um bom tempo antes de verificar que
`aulasParaRepor` é só um array em memória, nunca gravado. *Lição: antes de desenhar
regra sobre um dado, confirmar que o dado sobrevive a um reload.*

---

## 8. Estado em 20/08/2026

### Entregue
- **Finanças — Ciclo de Cobrança por Aluno** (spec v6, em produção): ciclo configurável
  por aluno com vencimento móvel, registro de pagamento, status automático, ajuste manual
  por ciclo, histórico. Substituiu o antigo sistema de KPI financeiro
  (`kpiService.js` e cálculos de projeção em `utils-kpi.js` **não existem mais**).
- **Precisão financeira**: fim da aproximação `frequência × 4`.
- **Reorganização da documentação**: `docs/` criado, README corrigido, `.agents/`
  versionado, `copilot-instructions.md` no lugar.

### Em aberto (por ordem sugerida)
1. `0.1` — bug do bloco "Ver ciclos anteriores" que fecha sozinho no re-render.
2. `1.7` — busca por nome na lista de alunos (filtros por status e objetivo já existem).
3. `3.1` — testes das funções puras do financeiro. **Barato, não depende de nada, e é o
   único item que protege código que mexe com dinheiro.**
4. `1.3`/`1.4` — observações por aluno e botão de WhatsApp.
5. `3.2`/`3.3` — backend local e frontend apontando para ele.

**Próximo passo sugerido**: `0.1` + `1.7` num prompt só — esforço mínimo, arquivos
diferentes, sem risco de conflito.

### Estado atual da documentação
- **Spec nova**: `docs/specs/reposicoes-e-competencia.md` está registrada como **proposta,
  não implementada**.
- **Grafia normalizada**: o tipo de aula no financeiro e no serializer passou a usar
  `'reposicao'`, sem acento.
- **Gatilho de v6 da Finanças**: o de reposições **já disparou**. A spec de Finanças
  precisa seguir a regra de competência que a nova spec define.

### Gatilhos para uma v6 da spec de Finanças
- `1.5` (status de no-show) muda a regra 5.8: contagem passaria a considerar presença,
  não mera existência do compromisso na agenda.
- `2.1` (cobrança automatizada) obriga a definir estorno/reabertura de ciclo pago.
- **Reposições** (spec nova): já moveram a regra de contagem para o modelo de competência,
  então a v6 da Finanças foi disparada antes de qualquer outra mudança de negócio.

---

## 9. Convenções

- **Idioma**: código, comentários, variáveis e mensagens de UI em português.
- **Sem dependência nova sem confirmar.** O frontend não tem nenhuma; o backend tem seis.
- **Sem build step no frontend.** Nada de bundler, transpilador ou sintaxe que dependa
  deles.
- **Artefato gerado por ferramenta** (grafo de dependências etc.) nunca é fonte de
  verdade, não se edita à mão, e se estiver desatualizado se regenera.

---

## 10. O que atualizar neste documento

Reler e ajustar quando:

1. **Uma feature for entregue** — atualizar a seção 8 (entregue / em aberto).
2. **Uma spec for criada ou versionada** — refletir na seção 4 e na 6.
3. **O ambiente de desenvolvimento mudar** — a seção 3.1 é a que envelhece mais rápido
   e a que mais causa conselho errado. Se um dia existir backend local ou banco de dev,
   corrigir imediatamente.
4. **Uma decisão de arquitetura for tomada** — especialmente se o `require` atravessado
   (3.2) for resolvido.
5. **Eu errar de novo** — acrescentar na seção 7. É o que mais economiza tempo em
   sessões futuras.
