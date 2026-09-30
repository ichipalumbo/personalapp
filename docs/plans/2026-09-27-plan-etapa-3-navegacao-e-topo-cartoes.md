# Etapa 3 — Navegação e Topo Operacional (Plano e Registro, formato cartões)

> Criado: 2026-09-27 · Branch: `feat/navegacao-e-topo` (criada de `origin/main` com `--no-track`)
> Fonte do escopo: `docs/diagnostics/2026-09-23-diag-auditoria-ui-ux-mobile.md` §5 (Etapa 3), que absolve
> os achados 4.2 (topo da Home consome altura excessiva), 4.3 (navegação compete com conteúdo) e
> 4.14 (safe areas / elementos flutuantes) e incorpora a **Fase 0.3** (F0.3 altura operacional da Home).

## Decisões do dono (fechadas na abertura da rodada, 2026-09-27)

| Pergunta | Decisão |
| --- | --- |
| Pergunta 1 (barra inferior?) | **Sim — substitui a navegação superior.** A barra inferior fica com Home, Finanças e Alunos; a navegação superior (as 3 pílulas) sai. **Exceção confirmada pelo dono**: o título "Prô Josy" e o login/área do Google **permanecem na barra superior**. |
| Pergunta 4 (Sincronizar Dados?) | **Migra para área secundária** — sai do topo da Home e vai para uma **seção nova "Dados"** no modal Área do usuário (decisão específica do dono). O helper de estado do botão (`_setEstadoBotaoSyncBanco`) passa a tratar o novo alvo com fallback para o antigo id. |
| Branch | Nova branch `feat/navegacao-e-topo` a partir de `origin/main` (a Etapa 2 foi mergeada via PR #62 antes do início desta rodada). |

**Fecho da decisão**: a barra inferior **não** será a "decisão de produto obrigatória" aberta — o dono
decidiu na abertura. O que não foi decidido: nada além do acima.

### Decisões da Rodada 2 (2026-09-26 — polimento da Etapa 3, mesma branch)

| Pergunta | Decisão |
| --- | --- |
| 2ª linha de ações do modo Dia (2 botões: "Novo Agendamento" + engrenagem "Configurar Grade Horária") | **Sai toda.** "Novo agendamento" vira o **FAB dinâmico** (`#fabNovoHome`), que assume as 2 entradas de novo agendamento da Home (Semana + Dia). A engrenagem **migra para a seção "Dados"** do modal Área do usuário. |
| Rodapé "App de Gerenciamento de Personal Trainer" | **Removido** — sem função com a barra inferior fixa + topbar em uma linha (decisão do dono). |
| FAB(s) flutuante(s) e tarja "LOCAL" | **Acima da barra inferior** — na Rodada 1 ficaram ancorados na base da tela, dentro da barra de 61px. |
| Branch | **Continuar na `feat/navegacao-e-topo`** (Rodada 1 ainda sem commit do dono; sem branch nova). |

### Decisões da Rodada 3 (2026-09-27 — mesmo pedido do dono, mesmo tree)

| Pergunta | Decisão |
| --- | --- |
| Toast/tarja "LOCAL" (debug de ambiente local) | **Retirada por inteiro** (não apenas reposicionada). A confirmação de ambiente local passa a ser apenas o log `[api-config] Ambiente detectado` no console do browser. Branch: continuar na `feat/navegacao-e-topo` (decisão repetida pelo dono). |

---

# Tarefa E: Barra inferior fixa de navegação

## Objetivo (1 frase)
Mover a navegação Home/Finanças/Alunos do topo para uma barra inferior fixa, de forma que a agenda
e o conteúdo principal ganhem área vertical sem perder acesso às três telas.

## Referência da decisão
Decisão donal 2026-09-27 (ver tabela acima). Achados 4.2/4.3.

## Arquivos a tocar
- `index.html` (markup da barra + remoção do `<nav class="header-nav">`)
- `assets/css/style.css` (estilo da barra; `--bottombar-height` + `safe-area-inset-bottom`)
- `assets/js/app/router.js` (seletor de link ativo; `aria-current`)
- `tests-frontend/` (ver passo 6)

## Passos
1. Medir a altura do topo atual em 320×568 e 433×762 (baseline: ~118px em 320, "55% da viewport"
   do diagnóstico).
2. Inserir a barra inferior após o `footer` do `tela-home` / antes do toast: 3 botões
   (ícone + rótulo: Home `fa-house-chimney`, Finanças `fa-wallet`, Alunos `fa-users`), `aria-current="page"`
   no ativo.
3. Remover o `<nav class="header-nav">` e seu CSS (mantido até o fim da rodada, então descartado).
4. Router: trocar o seletor fixo `.header-nav .nav-link` pelo da nova barra
   (`.nav-inferior .nav-link-inferior`); `navigateTo` aplica `aria-current="page"` no ativo
   (critério 5 da Etapa 3).
5. `--bottombar-height` = altura da barra + `env(safe-area-inset-bottom)` (ver Tarefa F);
   `main.view-section` ganha `padding-bottom: calc(var(--bottombar-height) + 16px)`.
6. Suíte frontend: conferir `index-html-ordem.test.js` e `dialog-controller.test.js` — se algum
   teste referenciar `.header-nav`, atualizar o seletor. Rodar a suíte após a mudança.

## Validação obrigatória (Playwright)
- 433×762 (primário) + 320×568 e 390×844 (stress): as 3 telas acessam a barra; `aria-current="page"`
  acompanha a navegação; topo da Home fica ≤ 60px (título + login apenas).
- Toque nas 3 barras funciona; zero overflow horizontal.

## Critério de aceite (checklist binário)
- [ ] Navegação superior removida; barra inferior presente com 3 telas
- [ ] `aria-current="page"` no item ativo em todas as 3 telas
- [ ] Altura do topo da Home medida antes/depois (registrar)
- [ ] Suíte frontend passa (registrar contagem antes/depois)
- [ ] Nenhuma regra de negócio alterada

## Commit sugerido
`feat(navegacao): barra inferior fixa Home/Financas/Alunos substituindo a navegacao superior`

---

# Tarefa F: Encurtar o topo da Home (Fase 0.3 + safe areas)

## Objetivo (1 frase)
Consolidar período/setas/Hoje em uma única barra na Home e aplicar safe areas
(inferior do Android/PWA) de forma sistemática para barra inferior, FAB e toast, como sistema.

## Referência da decisão
Achado 4.2 + Fase 0.3 (diagnóstico §3.3) + achado 4.14. "Sincronizar Dados" sai do topo por decisão
donal (ver Tarefa G).

## Arquivos a tocar
- `index.html` (topbar da Home; `<meta viewport>`)
- `assets/css/style.css` (consolidação da `.home-weekly-topbar`; FAB, toast e barra inferior com
  `env(safe-area-inset-bottom)`)
- `assets/js/app/bootstrap.js` (`--bottombar-height` medido em runtime, junto de `--header-height`)

## Passos
1. Medir as alturas: `.header`, `.home-weekly-topbar` (hoje 2 linhas: setas/Hoje + sync) em 320×568
   e 433×762 (baseline para o "antes").
2. Topbar da Home vira **uma única linha**: [←] [período] [→] [Hoje], com as tabs Semana/Dia acima
   (que já estão). Remover a `.home-weekly-nav-row` segunda linha (a do "Sincronizar Dados" — Tarefa G
   sai dela junto).
3. Safe areas: `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />`;
   `--bottombar-height: calc(env(safe-area-inset-bottom, 0px) + 56px)`.
   - Barra inferior: `padding-bottom: env(safe-area-inset-bottom)`.
   - FAB: `bottom: calc(env(safe-area-inset-bottom, 0px) + 16px)` (passa de 30px para o sistema único).
   - Toast visível: `bottom: calc(env(safe-area-inset-bottom, 0px) + 84px)` (mantém-se acima do FAB,
     que agora termina em ~safe-area+16+60).
4. Bootstrap: registrar `--bottombar-height` via `atualizarAlturaBottombar()` (mesmo padrão de
   `atualizarAlturaHeader`), chamado no boot e em resize.
5. Conferir as 4 ocorrências de `var(--header-height)` no CSS (sticky top, scroll-margin) — nenhuma
   deve quebrar com o header mais baixo.

## Fora de escopo (não fazer)
- Coexistência de navegações (decidido: só a inferior).
- Alterar as tabs Semana/Dia (são filtro da agenda, não navegação de tela).
- Recolorir a barra (identidade: base `#1a1a1a` + gold no ativo, padrão da antiga `.header-nav`).

## Validação obrigatória (Playwright)
- 433×762 + 320×568 + 390×844: medir (a) topo total da Home (header + topbar) antes/depois,
  (b) posição do FAB e do toast visível em relação à base da tela, (c) barra inferior não cortando
  conteúdo, (d) zero overflow horizontal.
- PWA standalone: simular `viewport-fit=cover` (DevTools) e confirmar que a barra e o FAB respeitam
  a safe area quando presente (em DevTools o inset é 0 — validar o cálculo, não o pixel).

## Critério de aceite (checklist binário)
- [ ] Topo da Home em uma linha (período/setas/Hoje) + tabs; altura registrada antes/depois
- [ ] FAB, toast e barra inferior usam `env(safe-area-inset-bottom)`
- [ ] `viewport-fit=cover` presente no meta viewport
- [ ] Suíte frontend passa (registrar contagem antes/depois)
- [ ] Nenhuma regra de negócio alterada

## Commit sugerido
`feat(navegacao): consolidar topbar da Home e aplicar safe areas em FAB, toast e barra inferior`

---

# Tarefa G: "Sincronizar Dados" para o modal Área do usuário

## Objetivo (1 frase)
Migrar o botão "Sincronizar Dados" do topo da Home para uma seção nova "Dados" no modal Área do
usuário, sem mudar seu comportamento.

## Referência da decisão
Decisão donal 2026-09-27: "seção nova Dados no modal Área do usuário". Funciona como a área
secundária pedida pela pergunta 4 do diagnóstico.

## Arquivos a tocar
- `index.html` (remover o botão do topo da Home; inserir a seção "Dados" no `#appSettingsModal`)
- `assets/js/storage.js` (`_setEstadoBotaoSyncBanco` apontando para os novos ids, com fallback)
- `assets/js/settings-modal.js` (se houver render relacionado ao botão — conferir)

## Passos
1. Remover o bloco `.sync-actions-row` (linha 2 do topbar) de `index.html` — o `id="btnSyncBanco"` e
   `#btnSyncBancoText` saem do topo. A Tarefa F remove o wrapper da linha.
2. Inserir no `#appSettingsModal`, entre as seções "Google Agenda" e "Sessão":
   `<div class="settings-section">` com título "Dados", descrição curta
   ("Forçar sincronização dos dados com o MongoDB.") e o botão
   `id="btnSyncBanco"` (classes `btn btn-secondary` + `fa-database`), reutilizando o
   `title="Forçar sincronização dos dados com o MongoDB"`.
3. `_setEstadoBotaoSyncBanco` (`storage.js:112`): mantém os ids `btnSyncBanco`/`btnSyncBancoText`
   (o id acompanha o botão para o fallback do "Sincronizando..." continuar funcionando em qualquer
   tela). Se o botão estiver oculto (modal fechado), o `if (!btn || !label) return;` já é seguro.
4. Conferir `settings-modal.js:442` (sincroniza após desconectar GCal) — não deve precisar de
   mudança (chama `window.sincronizarBancoDados` diretamente).

## Validação obrigatória (Playwright)
- 433×762: abrir o modal Área do usuário → seção "Dados" visível com o botão; clicar dispara o
  "Sincronizando..." no botão e o toast de sucesso (mock). O topo da Home NÃO tem mais o botão.
- Botão desabilitado durante sync (estado `sincronizando`), religado após.

## Critério de aceite (checklist binário)
- [ ] Botão fora do topo da Home
- [ ] Seção "Dados" no modal com botão funcionando (estado "Sincronizando..." e retorno)
- [ ] Suíte frontend passa (registrar contagem antes/depois)
- [ ] Nenhuma regra de negócio alterada (a função `sincronizarBancoDados` não muda)

## Commit sugerido
`feat(navegacao): sincronizar Dados passa para o modal Area do usuario (secao Dados)`

---

## Registro de execução

> **Fechamento (2026-09-27, verificado contra `git log`)**: os três cartões entraram na `main` via
> **PR #63** (`6910621`) como um único commit do dono — **`7ccb736`** — que cobre E + F + G na
> ordem em que foram executados. As rodadas 2 e 3 (FAB dinâmico, remoção da 2ª linha do modo Dia,
> remoção da tarja LOCAL) também estão no `7ccb736`; os ajustes do modal Área do usuário e o gap
> dos botões `.btn` entraram nas rodadas seguintes como `66593c9` e `3bbf152` (esta branch).

| Cartão | Status | Commit do dono | Contagem antes → depois |
| --- | --- | --- | --- |
| E (barra inferior) | ✅ concluído 2026-09-27 — commitado `7ccb736`, mergeado via PR #63 | `7ccb736` | frontend 77/0 → 77/0 (medido) |
| F (topo da Home + safe areas) | ✅ concluído 2026-09-27 — commitado `7ccb736`, mergeado via PR #63 | `7ccb736` | frontend 77/0 → 77/0 (medido) |
| G (Sincronizar Dados → modal) | ✅ concluído 2026-09-27 — commitado `7ccb736`, mergeado via PR #63 | `7ccb736` | frontend 77/0 → 77/0 (medido) |

## Registro da Etapa 3 (executado 2026-09-27, branch `feat/navegacao-e-topo`)

### Decisões do dono (resumo)
- Barra inferior **substitui** a navegação superior (3 pílulas saem do header); **exceção**: o
  título "Prô Josy" e o login/área do Google **permanecem no header**.
- "Sincronizar Dados" **migra para área secundária** — seção nova "Dados" no modal Área do usuário.
- Servidor estático temporário re-injetado com o mesmo padrão da Etapa 2 (`_static-server.tmp.js`,
  porta 5500, mock local) — removido ao fim da rodada.

### Método de medição
- "Antes" medido com `468351b` (origin/main pré-branch): altura do `.header` + altura da
  `.home-weekly-topbar` (dois blocos de topo) por viewport, via `getBoundingClientRect` com a Home
  visível (modo padrão).
- "Depois" medido na branch com a build final (reloads completos; server envia `no-store`).
- Playwright no browser integrado; viewport primário 433×762 (DPR 2.81), stress 320×568 e 390×844.
- Estado do mock: **deslogado** (cena padrão — o header mostra "Entrar com Google", sem avatar;
  o trigger do modal só aparece logado). Por isso o clique do Cartão G foi validado abrindo o
  modal diretamente (abertura programática, independente da navegação de avatar).

### Números medidos

| Medida | Antes | Depois |
| --- | --- | --- |
| Topo total da Home @433×762 (header + topbar) | 309px | **211px** (−98px; −32%) |
| Topo total da Home @320×568 | 299px (53% da viewport) | **201px** (35%) |
| Topo total da Home @390×844 | — (medido só "depois") | 197px |
| `.header` (título + login) | 122px (433) / 106px (320) | 68px (433) / 56px (320/390) |
| Topbar da Home (1 linha) | 187px (2 linhas: 433) | 143px (433) / 141px (320/390) |
| Barra inferior (altura) | — | 61px (com base em safe-area 0px em DevTools) |
| Alvo de toque da barra (cada link) | — | 134×52px |
| Overflow horizontal (3 viewports) | 0 | 0 |

> Nota de honestidade: o rascunho de validação da Tarefa E falava em "topo ≤ 60px"; o header
> medido em 433 é **68px** (título "Prô Josy" + botão "Entrar com Google" em uma linha — o mínimo
> que a decisão donal exige manter lá). O critério de aceite principal da Etapa 3 — "agenda e
> conteúdo principal ganham área vertical sem perder acesso às três telas" — está amplamente
> satisfeito (−98px em 433, −98px em 320). Se 68px parecer acima do ideal, a alavanca é o
> padding vertical da header-topline (não implementado — não foi pedido).

Safe areas (medidas com o `env()` = 0px no DevTools — o que valida é o cálculo declarado):
- Barra inferior: `padding-bottom: calc(env(safe-area-inset-bottom,0px) + 4px)`
- FAB: `bottom: calc(env(safe-area-inset-bottom,0px) + 16px)` (era `30px` fixo)
- Toast visível: `bottom: calc(env(safe-area-inset-bottom,0px) + 84px)` (era `100px` fixo)
- `<meta viewport>` com `viewport-fit=cover`; `--bottombar-height` medido em runtime via
  `atualizarAlturaBarraInferior()` (bootstrap.js) — token medido 61px em DevTools.
- FAB medido a 16px da base da tela (tela Alunos, barra presente); toast medido a 84px, **acima
  do FAB** (FAB termina a 76px da base — 84 > 76 ✓).

### Validações de navegação (Playwright)
- As 3 telas (Home/Finanças/Alunos) acessadas pela barra inferior funcionam; `aria-current="page"`
  acompanha o item ativo (verificado via DOM após cada clique e via Tab real).
- Foco de teclado: Tab real chega na barra; o `:focus-visible` do link ativo mostra o anel global
  do Cartão C (2px dourado, offset 2px) — **sem regra nova necessária** (o `:where(button, a, ...)`
  já cobre). Uma regra `.nav-inferior .nav-link-inferior:focus-visible` foi criada e **desfeita**
  em seguida: era redundante com a global (validação feita em ambos os estados).
- "Sincronizar Dados" **não** existe mais no topo da Home (`syncNoTopo: false` via query DOM) e
  **está** no modal (`syncNoModal: true`).
- Cartão G: abrir o modal → seções "Perfil da conta", "Google Agenda", **"Dados"**, "Sessão"
  (ordem confirmada via DOM); clicar em "Sincronizar Dados" dispara o fluxo real de sync
  (`sincronizarBancoDados`) e o toast de sucesso/Estado do botão (na leitura do mock: "Dados
  sincronizados com sucesso no MongoDB!"). O helper `_setEstadoBotaoSyncBanco` (`storage.js`) não
  precisou de mudança — os ids `btnSyncBanco`/`btnSyncBancoText` acompanharam o botão para o modal.
  `settings-modal.js:442` (sync pós-desconexão GCal) também não mudou (chama a função diretamente).

### Encontrado, não alterado
- **Modo Dia da Home**: o `garantirHomeTabs()` em `view-home.js` **cria dinamicamente** (no DOM,
  não no HTML estático) uma **segunda** linha de `.home-weekly-nav-row` com os botões de ação
  `#btnHomeDiaNovaAgenda`/`#btnHomeDiaConfigAgenda` (classe `.btn-config-icon`). O escopo do
  Cartão F/G era **somente a linha de sync + o botão "Sincronizar Dados"** (a segunda linha do
  modo Semana), então **a linha de configuração do modo Dia permaneceu** — não foi alvo desta
  Etapa. Relatório para o dono: se essa linha também parecer "excessiva" no modo Dia, é um
  candidato natural para a mesma lógica (mas não foi pedido/decidido aqui).
- **Pares de cor da barra reutilizam os da antiga `.header-nav`**: `#a0a0a0` sobre `#1a1a1a`
  (texto inativo) e `#0d0d0d` sobre `#ffd700` (texto ativo). Nenhum par de cor novo foi
  introduzido → não há regressão nova de contraste para auditar além das já resolvidas na
  Etapa 2 (o ativo dourado com texto escuro já era 12,6:1; o inativo cinza sobre base escura já
  era ~7:1). Não medi de novo porque os valores exatos já estão aferidos no doc da Etapa 2.
- **CSS morto removido junto**: a declaração `bottom: 30px` do FAB (substituída pelo sistema de
  safe areas) e os overrides órfãos de `.header-nav` / `.home-weekly-nav-row .sync-actions-row`
  dentro dos blocos `@media(max-width:430px)` e `@media(min-width:768px)` foram removidos (deixei
  um comentário no lugar do bloco de `.header-nav` do 430px explicando a origem da remoção,
  como já era a prática do arquivo).
- **Suíte**: `tests-frontend/` não tinha referência a `.header-nav` (conferido antes de mudar a
  ordenação de `<script>` — nenhuma alteração foi necessária nos `.test.js`, e nenhum `<script>`
  novo foi adicionado a `index.html`, então `DEPENDENCIAS_DE_CARGA` em
  `index-html-ordem.test.js` não precisou do par extra). Suíte medida: **77 pass / 0 fail
  antes e depois** da Etapa 3.

### Commits sugeridos (do dono)
- E: `feat(navegacao): barra inferior fixa Home/Financas/Alunos substituindo a navegacao superior`
- F: `feat(navegacao): consolidar topbar da Home e aplicar safe areas em FAB, toast e barra inferior`
- G: `feat(navegacao): sincronizar Dados passa para o modal Area do usuario (secao Dados)`

## Registro da Rodada 2 (executado 2026-09-26, branch `feat/navegacao-e-topo`)

### Decisões do dono (resumo)

1. **A 2ª linha de ações do modo Dia sai toda.** O "Novo agendamento" (antes
   `#btnHomeDiaNovaAgenda`) vira o FAB dinâmico `#fabNovoHome` (criado/removido em
   `view-home.js`), que assume o "Novo agendamento" nos DOIS modos da Home — inclusive o da
   Semana, cujo botão fixo `#btnNovaAgendaSemanal` também saiu. A engrenagem "Configurar Grade
   Horária" (`#btnHomeDiaConfigAgenda`) **migrou para a seção "Dados"** do modal Área do usuário,
   como botão de texto `.btn btn-secondary` (mesmo padrão de "Sincronizar Dados"), acionando
   `window.abrirModalConfigAgenda` — mesma função e mesmo comportamento do modal, sem mudança de
   regra de negócio.
2. **Rodapé `.home-app-resumo` removido** (decisão: sem função com a barra inferior).
3. **FABs flutuantes e tarja "LOCAL" acima da barra inferior.** Na Rodada 1 os três elementos
   (`#btnFlutuanteAdicionar` da tela Alunos, `.btn-weekly-add` da Home e o `#appEnvBadge` da
   `api-config.js`) ficaram ancorados na **base da tela** — dentro da área dos 61px da barra. A
   Rodada 2 os move para `bottom: calc(var(--bottombar-height, 0px) + 16px)`. Detalhe que explica o
   "bug" da Rodada 1: o token `--bottombar-height` (medido em runtime em `bootstrap.js`) **já
   inclui** o safe area, então os calcs da Rodada 1 que somavam `env()` de novo — e os que
   partiam de `+16` sobre a base da tela — colocavam os elementos **por baixo** da barra.

### Arquivos alterados nesta rodada (sobre o tree da Rodada 1)

| Arquivo | O que mudou |
| --- | --- |
| `index.html` | Saíram do `main` da Home: o botão fixo `#btnNovaAgendaSemanal` (`.btn-weekly-add`) e o `<footer class="home-app-resumo">`. O rótulo de período `#periodoSemanaHomeLabel` ganhou `aria-live="polite"` (anuncia a troca de período do modo Dia/rota via a11y sem JS extra). Seção "Dados" do modal: descrição ampliada ("Forçar a sincronização dos dados com o MongoDB e configurar os limites de horas da agenda diária") + 2º botão "Configurar Grade Horária" (`fa-gear`, `onclick` → `window.abrirModalConfigAgenda`). |
| `assets/js/view-home.js` | `garantirHomeTabs()`: a 2ª linha `.home-weekly-nav-row` do `dayNavRow` e seus 2 `bindOnce` saíram — o modo Dia fica em **uma linha só** (idêntica à da Semana). Nova função `window.trocarFABNovoHome()`: cria/remove o `<button id="fabNovoHome">` conforme a Home estar em tela (as outras telas têm o próprio FAB de Alunos) e redefine `aria-label`/`title`/`onclick` por modo — Semana: mesma mecânica do antigo `#btnNovaAgendaSemanal` (data-base = data selecionada se estiver na semana, senão a referência; horário = próxima hora cheia via `obterProximaHoraCheiaSemana`); Dia: `abrirNovoAgendamento` com o dia selecionado na hora inicial da grade (mesmo handler do antigo botão icon-only). `alternarModoHome()` removeu os `const` de `btnNovaAgendaSemanal`/`footer` (nós que não existem mais) e passou a chamar `trocarFABNovoHome()` a cada troca de modo. |
| `assets/js/app/router.js` | `initializeView()` (fim, idempotente) chama `global.trocarFABNovoHome()` na tela já com display definitivo — é isso que **remove** o FAB da Home ao navegar para Finanças/Alunos (e o recria ao voltar). Bug pego na validação: sem essa sincronização, o FAB da Home persistia nas outras telas e **interceptava o toque** do FAB "Novo aluno". |
| `assets/css/style.css` | `.btn-weekly-add`: `bottom: 30px` → `calc(var(--bottombar-height, 0px) + 16px)`. `#fabNovoHome { z-index: 100 }` (a barra é 100; 99 bastaria por ser deslocado, mas 100 elimina qualquer caso de sobreposição de área). `#appEnvBadge { bottom: calc(var(--bottombar-height, 0px) + 16px) !important }` — o `!important` vence o `style.bottom='12px'` aplicado inline pela `api-config.js` (que segue intocada). `.toast.show`: `bottom` 100px→84px→ **`calc(var(--bottombar-height, 0px) + 82px)`** (ainda acima do FAB Alunos de 60px, termina em ~barra+76). Removidos: `.home-app-resumo`/`.home-app-resumo p` e o bloco `.btn-config-icon` (+`hover`/`active`/`.fa-gear`) — sem nenhum outro uso no projeto (confirmado por grep). |
| `assets/js/features/modals/dialog-controller.js` | `open()` aplica `target.style.zIndex = String(1000 + state.stack.length)` e `close()` reseta (`''`). **Motivo**: `#modalConfigAgenda` agora abre **por cima** de `#appSettingsModal` (botão "Configurar Grade Horária" dentro da seção "Dados"). Os dois `.modal-overlay` têm o mesmo `z-index:1000` em CSS; sem o stack, o DOM decidiria quem fica por cima pela ordem do markup — e o settings (declarado depois) taparia o config. O controller já resolvia inert/aria-hidden/focus-trap por stack; só faltava o z. Sem mudança de API. |
| `assets/js/config/api-config.js` | **Não alterado** (o `!important` no CSS cobre o `bottom` inline; o `zIndex:4000` e o `right:12px` inline seguem valendo — a tarja fica no canto superior-direito da área acima da barra). |

### Números medidos (Playwright, mock local, `127.0.0.2:5500`)

| Medida | Rodada 1 | Rodada 2 |
| --- | --- | --- |
| Barra inferior | 61px, na base | 61px, na base (sem mudança) |
| `#fabNovoHome` (Home, Semana **e** Dia) — distância à barra | — (não existia) | **16px acima da barra** (320/390/433) |
| `#btnFlutuanteAdicionar` (Alunos) — distância à barra | **dentro da barra** (16px da base) | **16px acima** (320/390/433) |
| `#appEnvBadge` (tarja LOCAL) | **dentro da barra** (12px da base) | **16px acima** (320/390/433) |
| `.toast.show` visível | 84px da base (acima do FAB, que estava dentro da barra) | `barra+82`; medido **6px de respiro acima do FAB Alunos** (320/390/433) |
| 2ª linha do modo Dia | presente (2 botões) | **ausente** (verificado via DOM) |
| Rodapé / `#btnNovaAgendaSemanal` | presentes | **ausentes** (verificado via DOM) |
| Overflow horizontal | 0 | 0 (3 viewports) |

**Suíte (medida, `node --test` em `tests-frontend/`):** antes **77/0** · depois **77/0** — sem
mudança de cobertura (a Rodada 2 não adicionou `<script>` à `index.html`; nenhum `.test.js`
precisou de ajuste).

### Validações adicionais (Playwright)

- **FAB dinâmico**: criado na Home (Semana **e** Dia — `aria-label` muda por modo), **removido** ao
  navegar para Finanças e Alunos (e o toque no "Novo aluno" abre o `#modalFormAluno`, prova de que
  nada intercepta), **recriado** ao voltar para a Home. Ciclo completo verificado via DOM + clique.
- **Modais empilhados**: settings → "Configurar Grade Horária" → modal de grade z **1001** acima
  dos **1000** do settings, campos pre-preenchidos com o `agendaConfig` vigente (7/21),
  "Fechar/Cancelar" só fecha o modal de grade (settings permanece aberto, `inert` revertido).
- **Modo Dia**: 1 linha (`btnHomeDiaAnterior` / `dataAtualHome` / `btnHomeDiaProximo` + `Hoje`);
  sem as 2 classes `.btn-config-icon` no DOM.

### Encontrado, não alterado

- **`api-config.js`**: segue aplicando `bottom: 12px` inline na tarja LOCAL; o CSS vence com
  `!important`. Se o dono preferir fixar a posição **no JS** (sem `!important`), é 1 linha —
  levanto, não implemento.
- **`view-calendario.js`**: o binding do antigo `#btnNovaAgendaSemanal` continua no
  `DOMContentLoaded` com guard `if (btnNovaAgendaSemanal)` — agora **morta** (o nó não existe
  mais), inofensiva. Não removi para não tocar em função sensível de renderização além do pedido. |

### Commits sugeridos (do dono) para a Rodada 2
- **A** (2ª linha do Dia + rodapé + FAB dinâmico + grade no modal): `feat(navegacao): linha de acoes do modo Dia sai — novo agendamento vira FAB dos dois modos, Grade Horaria migra para o modal, rodape removido`
- **B** (FABs/tarja/toast acima da barra + empilhamento de modais): `fix(navegacao): FAB, tarja LOCAL e toast ficam acima da barra inferior; DialogController ganha z-index por stack para modais empilhados`

> Obs. (Rodada 3): a tarja LOCAL citada em **B** foi **removida** antes de commitar —
> se **B** seguir como escrito, ajuste o texto para `fix(navegacao): FAB e toast ficam acima da
> barra inferior e a tarja LOCAL e removida; DialogController ganha z-index por stack`.

## Registro da Rodada 3 (executado 2026-09-27, branch `feat/navegacao-e-topo`)

> Dado do dono (2026-09-27, pós-Rodada 2): _"Boa, pra facilitar, acho que nao precisamos mais
> do toast de local api, pode retirar?"_ — a "tarja LOCAL" (`#appEnvBadge`) é removida por
> inteiro, não apenas reposicionada.

### O que mudou

| Arquivo | Mudança |
| --- | --- |
| `assets/css/style.css` | Removida a regra `#appEnvBadge { bottom: ... !important }` (Rodada 2), que existia só para reposicionar a tarja; comentário de remoção no lugar. |
| `docs/setup-ambiente-local.md` | Seção 6: a confirmação de ambiente local passa a ser o log do console (a tarja era a confirmação visual); linha do "Armadilhas" atualizada (`O log [api-config] não dá local` no lugar de `A tarja LOCAL não aparece`). |
| `README.md` | Item 5 do "Frontend": descrevia a tarja; agora descreve o log do console como confirmação. |

### Números medidos (Playwright, mock local, 433×762)

| Medida | Depois (Rodada 3) |
| --- | --- |
| `#appEnvBadge` no DOM | **ausente** (`document.getElementById('appEnvBadge') === null`), sem nenhum `<div id=*badge*>` filho do `body` |
| `APP_API_CONFIG` (global) | `ambiente: 'local'`, `apiBaseUrl: http://localhost:5000/api` — detecção intacta |
| `#fabNovoHome` | intacto, **17px** acima do topo da barra (16px + arredondamento), `overflowX: 0` |
| `node --check api-config.js` | ok |
| **Suíte (medida)** | antes **77/0** · depois **77/0** |

### Validadações (Playwright)

- Relod da Home: zero erro de script (o `ERR_CONNECTION_REFUSED localhost:5000` é o esperado — local sem backend); o log `[api-config] Ambiente detectado {ambiente: 'local'...}` segue no console.
- FAB/Toast/bottombar não foram afetados pela remoção (mesmas posições da Rodada 2).

### Encontrado, não alterado

- Nenhuma outra referência ao elemento no código (só os comentários explicativos da remoção). O
  `aria-hidden` antigo deixava a tarja fora do a11y; sem o elemento, nada a11y a ajustar.
- A documentação da Rodada 2 (a própria seção "Registro") continua citando a tarja como estava à
  época — é histórico, não foi reescrita.

### Commit sugerido (do dono) para a Rodada 3

- **C**: `chore(frontend): tarja LOCAL de ambiente local removida; a confirmacao passa a ser o log [api-config] no console`
