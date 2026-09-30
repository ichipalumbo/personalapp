# Plano — Skeletons padronizados + indicador de dados em cache (item 5.8)

> **Data de abertura**: 2026-09-30
> **Branch de trabalho**: `feat/padronizar-skeletons-cache` (criada de `origin/main`, sem upstream track)
> **Origem**: decisão do dono de resolver **antes** da Etapa 7 os dois itens abertos que ficaram
> registrados no fechamento do 5.6 (Etapa 6) — "skeletons de carregamento" e "indicação
> explícita de dados em cache" (escopo original do diagnóstico, achados 4.8/4.9, seção Etapa 6 de
> `docs/_diags_llm/2026-09-23-diag-auditoria-ui-ux-mobile.md`).
> **Item de roadmap**: 5.8 (novo, Grupo 5) — criado junto com este plano.
> **Status**: 💬 PLANO — aguardando aprovação do dono (3 decisões no fim deste documento) antes de
> qualquer escrita de código.
> **Nota (2026-09-30)**: antes da execução deste plano, o dono acionou um bug separado na
> mesma branch — FAB "Novo agendamento" da Home persistia ao trocar de tela (router.js).
> Corrigido e testado à parte: `2026-09-30-hotfix-fab-home-troca-tela.md`. Sem sobreposição de
> arquivos com este plano.

## Por que agora

A Etapa 6 unificou o feedback de operações remotas no toast (limiar de 3s). O que sobrou: as
telas têm **loadings locais** (skeletons/textos próprios, cada um diferente) e o fallback para
dados locais (cache) não tem **indicação consistente** ao usuário. Como isso fecha a última ponta
aberta do escopo original da Etapa 6 e é pré-requisito natural para a Etapa 7 (que vai auditar
consistência global de estados), o dono decidiu fazer antes, em rodadas isoladas.

## Inventário do estado atual (medido 2026-09-30, leitura de código)

Cinco mecanismos de "carregando" existem hoje — nenhum idêntico ao outro:

| # | Onde | O que mostra | Mecanismo |
|---|------|--------------|-----------|
| 1 | **Home** (`view-home.js`, `renderizarLoadingHome`) | "Sincronizando agenda..." + "..." no contador + 3 blocos de 112px | **inline styles** (gradiente dourado, sem animação) |
| 2 | **Finanças** (`view-financas.js`, `renderizarSkeleton`) | 3 cards cinza estáticos (`#1d1d1d`, sem animação) + "Cache atualizado em ..." e "Carregando..." no cabeçalho | **inline styles** |
| 3 | **Histórico de reposições** (`view-alunos.js`, `renderizarHistoricoReposicoes`) | `role="status"` + 3 barras de 78px **com animação de pulso** + texto sr-only | **CSS próprio** (`.historico-reposicoes-skeleton` + `@keyframes historicoReposicoesPulso` em `style.css`) |
| 4 | **Toast unificado** (Etapa 6) | "Carregando finanças..." / "Carregando..." etc. em `#toast` estado `progress` | `utils-kpi.js` + `.toast.progress` / `.toast-spinner` |
| 5 | **Fallback de conexão** (`storage.js`) | Toast "Sem conexão. Seus dados foram salvos neste aparelho." (`warning`) | `mostrarToast` |

Dados de apoio do inventário:

- **Calendário** (`view-calendario.js`) **não tem fetch próprio** — renderiza do estado em memória
  carregado pelo boot do Home; herda o mecanismo 1.
- **Finanças é a única tela com rótulo de cache** ("Cache atualizado em ..." em
  `#financasCacheLabel`); o cache global (localStorage, `storage.js`) não tem nenhuma indicação
  de UI — em offline/sessão expirada o usuário vê o app abrir com dados locais e só descobre (se
  descobre) pelo toast de `storage.js`.
- `aria-busy` existe **só** no modal de reposições (item 3). Home e finanças não marcam o
  container durante o load.
- As cores de skeleton divergem: dourado-0.08% (Home) × `#1d1d1d` (Finanças) × `#2a2a2a`
  animado (Reposições).

## Parte A — Padronizar skeletons

### Proposta A1 (recomendada): padrão CSS, markup mínimo por tela

Um único "bloco" de skeleton em `style.css`, reaproveitado pelas telas com tamanhos locais:

- Classe `.skeleton` (base): background neutro `#1d1d1d`, `border-radius: 10px`, animação de
  pulso **única** (reuso do `historicoReposicoesPulso` 1.2s alternate, renomeada para um keyframe
  genérico) — o pulso do item 3 é o que está mais próximo do padrão (acessível e discreto);
  os itens 1 e 2 ganham o movimento que falta e os três passam a ser idênticos em cor/ritmo.
- Variantes por altura via `style="height: Npx"` no markup existente (112px Home / 72px e
  16/10px linhas do card Finanças / 78px modal) — **não** se inventa nova taxonomia de tamanho;
  cada tela mantém a silhueta do que carrega ali.
- **Remove**: os inline styles de gradiente dourado do Home, os blocos inline da Finanças (viram
  `<div class="skeleton">`), e a classe `historico-reposicoes-skeleton` vira alias/retirada
  (o bloco do modal passa a `.skeleton` + altura 78px; o `@keyframes` próprio é eliminado).
- `aria-busy="true"`/`"false"` no container durante o load (Home e Finanças ganham; reposições
  já tem) — barato e direto; a auditoria completa de ARIA segue na Etapa 7.

**Por que A1 e não um módulo JS**: skeleton é apresentação pura, sem regra de negócio; as 3
marcups diferem na silhueta (que é o ponto certo de diferir). Um `skeleton-helpers.js` compartilhado
só centralizaria `<div class="skeleton">`, o que não justifica dependência nova + tag em
`index.html` (que arrasta revisão do teste de ordem `index-html-ordem.test.js`). Se as silhuetas
divergirem de novo no futuro, aí faz sentido o módulo.

### Fora de escopo da Parte A

- Mudar a silhueta/altura de qualquer tela (manter exatamente o que cada uma "imita").
- Skeletons em fluxo que não carregam (modais com dados já em memória).

## Parte B — Indicador de dados em cache

O app hoje **sempre abre com dados locais** (cache) e sincroniza em background. Falta dizer isso
ao usuário quando a sessão *começou no cache ainda sem confirmar o remoto*.

### Proposta (mínima, no topo do app)

- Indicador **no topo do app** (região do header da barra superior, onde hoje vive o título),
  visível **apenas** no estado: "apresentando dados locais + sincronização remota ainda pendente".
- Desaparece quando: (a) o sync remoto confirma com sucesso, **ou** (b) já cai no aviso de
  desconexão do `storage.js` (o toast de `warning` assume o papel, para não duplicar mensagem).
- Não interfere no toast unificado (mesmo elemento não é usado — é um rótulo fixo do header,
  padrão do "Cache atualizado em ..." que já existe na Finanças).
- **A cor/texto seguem a regra de estado da Etapa 7**: propositalmente **não** usar amarelo
  (achado 4.13 — amarelo está sobrecarregado semântico); proposta de cor: cinza neutro claro
  (`#909090`, contraste ≥ 4.5:1) — mesma linha das metadados de cache já aprovadas na Etapa 4.

### O que **não** entra em Parte B

- "Cache atualizado em ..." vira componente global (cada tela decide manter o seu — o da
  Finanças já estava aprovado pelo dono em Etapa 4; não mexer).
- Indicador de *escrita* em andamento (o "Salvando..." do toast já cobre).
- Persistência de "última sincronização" global (hoje só Finanças grava `atualizadoEm` no seu
  próprio cache; criar um global implica regra nova de business — fora).

## Decisões do dono (respondidas antes de qualquer escrita)

1. **Parte A**: aprova a proposta **A1** (CSS padrão + `aria-busy`, sem módulo JS novo)?
2. **Parte B — onde escopo**: (a) indicador global no header (proposta); (b) só a Parte A,
   deixando cache para outra rodada; (c) outro escopo que o dono definir.
3. **Texto da Parte B** (se aprovada): proponho "Carregando dos dados deste aparelho —
   sincronizando..." (padrão do "Sem conexão. Seus dados foram salvos neste aparelho." da
   Etapa 6, aprovado). Alternativa mais curta: "Sincronizando dados...". O dono escolhe o
   texto exato (linguagem de usuário final, sem tecnicismo).

## Passos de execução (após aprovação)

1. **Baseline** das suítes (`tests-frontend/` e `backend/`, `node --test`) — reportar medidos.
   (Esperado: frontend 81 — 77 originais + 4 da ETAPA 6 adição mergeada via PR #67 — e backend 232.)
2. **Parte A — CSS**: keyframe genérico + `.skeleton`; remover `@keyframes historicoReposicoesPulso`
   e `.historico-reposicoes-skeleton` (virar alias temporário só se o teste exigir). 
3. **Parte A — telas**: Home, Finanças e modal de reposições passam a `.skeleton` + `aria-busy`
   no container do load.
4. **Parte B** (se aprovada): estado em `storage.js` ("cache pendente de confirmação") + rótulo
   no header + remoção no sucesso/falha. Texto exato só após decisão 3.
5. **Validação** (viewport primário **433×762 DPR 2.81** + stress 320×568 / 390×844, seção 9 de
   `docs/setup-ambiente-local.md`): Home com e sem cache; Finanças com e sem cache; abrir histórico
   de reposições em rede lenta; offline no boot (rótulo de cache + toast coexistem, sem duplicar
   mensagem).
6. **Regras do teste por feature**: como `view-*.js` seguem sem cobertura (seção 10 das
   instruções, front do repositório), **validação de tela é manual** + as suítes verdes. Se um
   teste novo for necessário (ex.: estado de cache em `storage.js` rodando node), segue a regra
   "provado por mutação" (reverta o fix, o teste deve cair, restaure e confirme `git status`).
7. **Docs**: report de execução (este arquivo ganha seção "Execução"), roadmap 5.8 → `[~]`/`[x]`,
   seção Etapa 6 da auditoria ganha apontador para 5.8 (o "item aberto" deixa de ser aberto).

## Suítes (registro — mede-se no passo 1 e repete no fim)

- Baseline: ____ (medir e preencher)
- Após execução: ____ (medir e preencher)

## Encontrei, não alterado (relevante para o plano)

- O toast de `storage.js` "Sem conexão. Seus dados foram salvos neste aparelho." (Etapa 6,
  já publicado) — a Parte B precisa **coordenar** com ele (não sobrepor), não reescrevê-lo.
- "Cache atualizado em ..." da Finanças — item aprovado em Etapa 4 (Cartão), **não** tocar.
- `historico-reposicoes-skeleton` (Etapa 2, Cartão D) — é o que está *mais próximo* do padrão
  desejado (tem animação e `role="status"`); vai ser o modelo de cor/ritmo da `.skeleton` nova,
  não será tratado como defeito.
