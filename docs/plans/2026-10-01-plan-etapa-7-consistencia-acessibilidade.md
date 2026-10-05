# Plano — Etapa 7: consistência e acessibilidade final (item 5.7)

> **Data de abertura**: 2026-10-01
> **Branch de trabalho**: `feat/etapa-7-consistencia-acessibilidade` (criada de `origin/main`, `--no-track`)
> **Item de roadmap**: 5.7 (Grupo 5)
> **Fonte de verdade do escopo**: `docs/diagnostics/2026-09-23-diag-auditoria-ui-ux-mobile.md`, seção 5 (Etapa 7) e tabela mestra (seção 1)
> **Status**: ✅ CONCLUÍDA — **Cartões A, B, C e D fechados** (4.13, 4.16, 4.6, 4.17.3, auditoria de 4.17.4/5, 4.15, 7.1, 4.17.1 e 4.17.6)

---

## Decisões do dono (2026-10-01)

1. **Formato**: dividir a etapa em **cartões**, como nas etapas anteriores.
2. **4.17.6 (histórico/recarga)**: **sim** — a tela ativa deve sobreviver à recarga **e**
   participar do histórico Voltar/Avançar.
3. **4.13 (amarelo)**: **levantar o inventário completo antes de decidir** — decisão de cor fica
   para depois do mapa (produzido abaixo).

---

## Escopo herdado (o que a etapa precisa fechar)

| Achado | Conteúdo | Situação |
| --- | --- | --- |
| 4.6 (parte final) | semântica de cards/tabs | ✅ fechado no Cartão B |
| 4.13 | amarelo sobrecarregado semanticamente | ✅ fechado no Cartão A |
| 4.15 | `prefers-reduced-motion` parcial | ✅ fechado no Cartão C |
| 4.16 | ARIA completo de navegação/tabs | ✅ fechado no Cartão B |
| 4.17.1 | mensagem de modo leitura escondida pelo CSS | ✅ fechado no Cartão D — **diagnóstico corrigido**: não era só uma linha de CSS |
| 4.17.3 | textarea financeiro sem estilo/foco de input | ✅ fechado no Cartão B (resíduo era só a fonte) |
| 4.17.4 | `disabled` global | ✅ **já resolvido na Etapa 2** — auditoria de cobertura feita no Cartão B: 105 interativos, 0 sem nome |
| 4.17.5 | `aria-label` em icon-only | ✅ **já resolvido na Etapa 2** — cobertura verificada no Cartão B |
| 4.17.6 | `href="#"` sem representar a tela ativa no histórico | ✅ fechado no Cartão D (hash, conforme item 2) |
| 7.1 | "Tentar de novo" × "Tentar novamente" | ✅ fechado no Cartão C (spec decide) |

---

## Proposta de cartões

| Cartão | Conteúdo | Bloqueio |
| --- | --- | --- |
| **A** ✅ | Cor de estado (4.13): tokens + migração dos usos | fechado em 2026-10-01 |
| **B** ✅ | ARIA e semântica (4.16, 4.6 final, 4.17.3, auditoria de 4.17.4/5) | fechado em 2026-10-01 |
| **C** ✅ | Movimento reduzido e textos (4.15, 7.1) | fechado em 2026-10-01 |
| **D** ✅ | Navegação com recarga/histórico (4.17.6) + 4.17.1 | fechado em 2026-10-01 |

Ordem sugerida de execução: **B → C → D → A** (A por último porque depende da decisão; B e C
são os de menor risco). **A ordem proposta não foi seguida**: o dono optou por fazer A primeiro
(e a decisão de cor foi tomada junto com o inventário), depois B, C e D.

---

## Cartão A — Inventário do 4.13 (levantado 2026-10-01)

Método: varredura de `assets/css/style.css` (3.191 linhas) associando cada ocorrência ao seu
seletor, mais varredura dos estilos inline em `assets/js/**` (20 ocorrências).

### O que existe hoje

| Papel | Cor(es) | Onde aparece (exemplos) |
| --- | --- | --- |
| **Identidade / destaque / ativo** | `#ffd700` (dourado) | `.marca-ativa`, `.btn-primary`, `#btnFlutuanteAdicionar`, `.btn-weekly-add`, `.nav-link-inferior.ativo`, `.btn-dia-pill.active`, `.tab-btn.active`, `.btn-escopo-recorrencia.active`, toggles `:checked`, `:focus-visible` global, títulos de seção (`.modal-title`, `.settings-section-title`, `.modal h3`, `.historico-reposicao-grupo h4`), ícones decorativos |
| **Estado de aviso** | `#ffb74d`, `#ff9800` (âmbar) | `.aluno-card-indicador--alerta .aluno-card-indicador-titulo`, `.aluno-card-indicador--alerta` (fundo `rgba(255,152,0,.12)`), `.historico-reposicao-status--pendente`, `.historico-reposicao-detalhes strong`, `.toast.warning`, `.badge-desloc` |
| **Indicador informativo** | `#ffd700` | `.aluno-card-indicador-titulo` (título do indicador comum do card de aluno) |
| **Categoria / decoração** | `#ffb878` (Tangerine GCal) | `--objetivo-tangerina`, `.agenda-dia-aula`, `.agenda-dia-aula-detalhes`, `.modal-escolha-icone-aula`, `.modal-escolha-icone-exclusao-media` |
| **Erro / negativo** | `#ff5252`, `#ff7070`, `#ff8f8f`, `#ffcbc8`, `#ff8b84`, `#ff8a80`, `#ef9a9a` | `.btn-gcal-disconnect`, `.btn-google-signout`, `.gcal-status-feedback.error`, status "atrasado" em `view-financas.js` |

### A sobreposição concreta (medida)

1. **Dourado com dois papéis.** `#ffd700` é identidade/destaque **e** é a cor do indicador
   informativo do card do aluno (`.aluno-card-indicador-titulo`, linha 830) — que fica **ao lado**
   da variante de alerta, cuja cor é âmbar (`#ffb74d`, linha 834). O usuário vê dois amarelos
   próximos com significados diferentes.
2. **Aviso com três matizes.** O estado "a vencer/pendente" usa `#ffb74d`, `#ff9800` e
   `rgba(255,152,0,...)` — sem token único, e sem regra escrita de qual usar quando.
3. **Âmbar de aviso × Tangerine de categoria.** `#ffb74d` (aviso) e `#ffb878` (categoria/objetivo)
   são vizinhos o suficiente para se confundirem em tela pequena.
4. **Não há nenhum token de cor de estado no `:root`** — apenas `--objetivo-tangerina`. As 77
   ocorrências são literais espalhados pelo arquivo.

### Usos inline no JS (20)
Concentrados em `view-financas.js` (11 — inclui a lógica de status: `#81c784` pago, `#ff8a80`
atrasado, `#ffd700` em aberto), `view-alunos.js` (4), `modal-agendamento.js` (2),
`view-home.js` (1) e `agenda-card-template.js` (1 — badge de recorrente).

### Decisão tomada (2026-10-01)
Com o inventário acima, o dono fechou o papel único de cada cor: **dourado `#ffd700` =
identidade/destaque** e **Tangerine = categoria GCal**; o restante (paleta de estado) ficou a
critério da implementação. Execução registrada em "Execução → Cartão A".

Opções descartadas: (b) dourado ficaria com o alerta — manteria a ambiguidade entre identidade e
estado; (c) não depender só de cor — já é o caso (os indicadores têm ícone e rótulo), mas não
resolve o problema de dois amarelos com significados diferentes.

---

## Execução

### Cartão A — Cor de estado (4.13) · 2026-10-01

**Decisão do dono**: manter o **dourado `#ffd700` = identidade/destaque** e o **Tangerine
`--objetivo-tangerina` = categoria GCal**; o restante fica a critério da implementação.
Escopo: CSS **+** os estilos inline do JS.

**O que entrou**:

- `assets/css/style.css` — bloco `[TAG-STYLE-ESTADO]` em `:root` com a paleta de estado e a regra
  escrita: `ok #81c784` · `informativo #64b5f6` · `aviso #ffb74d` (+ `-fundo` e `-borda`) ·
  `erro #ff8a80` · `neutro #cfcfcf`. Estados deixam de usar literal espalhado.
- Migrados para token: `.aluno-card-indicador--alerta` (fundo/borda/título),
  `.historico-reposicao-status--{pendente,agendada,realizada,expirada}`,
  `.historico-reposicao-detalhes strong`, `.agenda-semana-card-time--completed` e `.toast.warning`.
- `.toast` (success), `.toast.error` e o realce do `.toast-retry` passaram para a paleta de estado
  com **texto escuro `#1a1a1a`** — fecha o achado 4.9 de carona (ver medições abaixo). O
  `.toast.warning` já tinha ido no mesmo sentido.
- `assets/js/view-financas.js` — os 2 pontos de status inline (histórico e card) passaram de
  `#81c784`/`#ff8a80`/`#ffd700` para `var(--cor-estado-ok|erro|neutro)`. **"Em aberto" deixou de
  ser dourado** (o dourado é identidade, não estado).
- Unificação de matiz: `--expirada` (`#ef9a9a` → `--cor-estado-erro`) e `.badge-desloc` deixou de
  dividir o `#ff9800` com o aviso — agora esse âmbar só existe em badge de **tipo**.

**Verificado no navegador** (mock `vitrineEstados`, **433×762 DPR 2.81 + emulação de toque**;
`dpr 2.81`, `ontouch true`, `pointer:coarse true`):

| Elemento | Medido | Esperado |
| --- | --- | --- |
| Indicador de alerta (título) | `rgb(255,183,77)` | `--cor-estado-aviso` ✅ |
| Indicador de alerta (fundo) | `rgba(255,183,77,0.12)` | token ✅ |
| Indicador informativo | `rgb(255,215,0)` | dourado = identidade ✅ |
| Finanças "Atrasado" | `rgb(255,138,128)` | `--cor-estado-erro` ✅ |
| Finanças "Em aberto" | `rgb(207,207,207)` | `--cor-estado-neutro` ✅ |
| Finanças "Pago" | `rgb(129,199,132)` | `--cor-estado-ok` ✅ |
| Toast `warning` | fundo `rgb(255,183,77)` · texto `rgb(26,26,26)` | contraste **10.06:1** ✅ |
| Toast `success` | fundo `rgb(129,199,132)` · texto `rgb(26,26,26)` | contraste **8.65:1** ✅ |
| Toast `error` | fundo `rgb(255,138,128)` · texto `rgb(26,26,26)` | contraste **7.62:1** ✅ |
| Botão `.toast-retry` (só existe no `error`) | fundo `rgba(0,0,0,0.12)` · texto `rgb(26,26,26)` | legível sobre o preenchimento claro ✅ |

**Suítes**: `tests-frontend` **84/84, 0 falhas**.

**4.9 (contraste dos toasts) fechado de carona.** O achado 4.9 foi dado como concluído na Etapa 6,
mas os toasts coloridos ainda usavam **branco sobre preenchimento claro**: medido ≈ **2.8:1**
(`#fff` sobre `#4caf50`, success) e ≈ **4.2:1** (`#fff` sobre `#e53935`, error) — os dois abaixo de
AA 4.5:1. Como o `warning` já ia usar o token de estado com texto escuro, o dono autorizou fechar
os três de uma vez: `.toast` base (success), `.toast.error` e o realce do `.toast-retry` passaram
para a paleta de estado com `#1a1a1a`. O `.toast.progress` **não** mudou (fundo escuro `#1a1a1a`,
texto claro — contraste adequado, e o spinner só existe nesse estado).

**Não alterado de propósito** (não é estado): `#ffd700` como identidade/destaque (61 usos),
`--objetivo-*` (categoria GCal), `.badge-aula`/`.badge-desloc` (tipo), ícones decorativos em
`#64b5f6` (`.aluno-card-observacoes i`, cabeçalhos de modais).

### Cartão B — ARIA e semântica (4.16, 4.6, 4.17.3, auditoria de 4.17.4/5) · 2026-10-01

**Decisão do dono (4.6)**: o card de agenda vira `<button>` nativo; o card de aluno deixa de
ser o alvo de teclado e ganha um botão "Editar" próprio. Contexto da decisão: o card de aluno
tem interativo aninhado (toggle de status e `<details>`), e `role="button"` com filhos
interativos dentro é justamente o que o padrão ARIA desaconselha.

**O que entrou**:

- **Abas (4.16)** — `index.html` + `view-home.js`: os dois grupos viram `role="tablist"` com nome
  acessível ("Visualização da agenda" e "Tipo de compromisso"); cada botão recebe `role="tab"` e
  `aria-selected`; os painéis recebem `role="tabpanel"` + `aria-labelledby`
  (`#agendaPanelSemana`, `#homeDayPanel`). `alternarModoHome` e `selecionarTipoAgendamento`
  passam a sincronizar `aria-selected` — a classe `.active` é só visual.
  `#tabAgendarDeslocamento` fica **sem** `aria-controls`: o modo não tem painel próprio (os dois
  painéis de campos ficam ocultos) e `aria-controls` é opcional no padrão.
- **Card de agenda (4.6)** — `agenda-card-template.js`: os 3 cards acionáveis passam de
  `<div onclick>` para `<button type="button">`, o que dá Tab + Enter/Espaço **sem JS**. Por isso
  o conteúdo interno virou `<span>` (button só aceita conteúdo de frase — os `<div>` viraram
  inválidos dentro dele). O card somente-leitura do GCal **continua `<div>`**: não é acionável e
  não deve entrar na ordem de foco. `style.css` ganhou `button.agenda-dia-aula`, que zera apenas
  o que o UA ainda impõe (fonte, cor, alinhamento, largura) — margin/padding/border/background
  seguem vindo das classes do card, para não brigar com a especificidade de `.agenda-semana-card`
  nem com os formatos outlook/linha da Etapa 5.
- **Card de aluno (4.6)** — `view-alunos.js` + `style.css`: novo `.aluno-card-editar` (32×32,
  `aria-label="Editar <nome>"`, ícone de lápis) dentro da área que já fazia `stopPropagation`, ao
  lado do toggle. O card continua clicável ao toque (alvo grande); o botão existe para o teclado.
- **Fonte dos campos e dos botões (4.17.3)** — `style.css`: `input, select, textarea {
  font-family: inherit }`, estendido a **`button`** em decisão separada do dono (2026-10-01, mesma
  rodada): era o último controle fora do padrão — o `.btn` ficava em `Arial` ao lado de texto em
  Segoe UI. **Não afeta os ícones**: `.fa-solid` é classe (especificidade 0,1,0) e vence o seletor
  de elemento (0,0,1), mantendo `"Font Awesome 6 Free"` — verificado nos dois grupos
  (`fa-solid` e `fa-brands`).
- **Fonte do card** — `button.agenda-dia-aula { font: inherit }`, pelo mesmo motivo (botão não
  herda a fonte do app).

**Verificado no navegador** (mock `default`, **433×762 DPR 2.81 + emulação de toque**;
`dpr 2.81`, `ontouch true`, `pointer:coarse true`):

| Medição | Antes | Depois |
| --- | --- | --- |
| Card de agenda: tag | `DIV` | `BUTTON` (3/3 acionáveis) ✅ |
| Card de agenda: nome acessível | — | "Maria Silva 08:00 - 09:00 Studio Centro Recorrente" ✅ |
| Card de agenda: fonte | Arial (UA) | `"Segoe UI", Tahoma, …` ✅ |
| Card de agenda: largura | 404px (= pai) | 404px (= pai) ✅ |
| Card de agenda: padding / fundo / raio | `9px 12px 10px 10px` / `rgba(255,184,120,0.05)` / `6px` | idênticos ✅ |
| Abas: `role`/`aria-selected`/`aria-controls` | ausentes | presentes; `aria-selected` acompanha a troca (Semana `false` ↔ Dia `true`) ✅ |
| Painel do Dia após trocar para Dia | — | `role=tabpanel`, `aria-labelledby=tabHomeDia`, `display:block`; painel Semana `display:none` ✅ |
| `.aluno-card-editar` | — | 4/4 cards, 32×32, `aria-label` correto ✅ |
| Campos: `font-family` | input/select `Arial`, textarea `monospace` | os três na fonte do app ✅ |
| Textarea vs input no modal de finanças | fontes diferentes | fontes **iguais** ✅ |
| Botões: `font-family` | `.btn` em `Arial` | **todos** os `<button>` na fonte do app (0 com fonte divergente) ✅ |
| Ícones dentro de botões | — | `fa-solid` → `"Font Awesome 6 Free"`, `fa-brands` → `"Font Awesome 6 Brands"` ✅ |
| `option` dentro de `select` | — | herda junto com o select ✅ |
| Regressão de tamanho (bônus) | botão "Hoje" 12px · card 16px | inalterados ✅ |

**Auditoria de cobertura do 4.17.4 / 4.17.5** (era o que restava desses dois, já resolvidos de
fato na Etapa 2): **105 elementos interativos e 45 campos de formulário, zero sem nome
acessível** — incluindo os modais ocultos no DOM e o conteúdo do histórico de reposições, que é
renderizado em runtime. `button[disabled]` medido: `opacity .6`, `cursor: not-allowed`,
`pointer-events: none` (a regra única global). Nenhum uso de `[aria-disabled]` no app.

**4.17.3 — quase todo já estava resolvido de fato.** A Etapa 2 (`386b00c`) foi quem colocou o
`textarea` na regra compartilhada `.form-grupo-spa input, select, textarea`. Medi no modal de
finanças: borda, fundo, cor, `font-size` 16px, padding, raio, largura e o foco `#ffd700` já eram
idênticos ao input. O único resíduo era a **fonte**, agora unificada.

**Suítes**: `tests-frontend` **84/84** e `backend` **232/232**, 0 falhas (antes e depois).

**Limitação da validação — teclado não chegou a ser observado.** Enter/Espaço não produzem efeito
**nenhum** nesta sessão de navegador: testei o card (Playwright e CDP `Input.dispatchKeyEvent`) e
um **controle** — `#btnSemanaHomeProxima`, um botão comum que já existia antes desta rodada —
também não reagiu ao Enter, enquanto o clique programático no mesmo botão funcionou. Ou seja, o
problema é do ambiente, não do código: os eventos de teclado não estão sendo entregues à página.
O que está provado é o **mecanismo** (o card é um `<button>` real, entra na ordem de foco com o
`aria-label`/conteúdo como nome acessível, e a ativação por Enter/Espaço é garantia do navegador
para esse elemento). A ativação com o teclado físico segue **não verificada**.

**Fora do escopo, registrado sem alterar**:

- **Navegação por setas no `tablist`** (roving `tabindex` + Arrow/Home/End) não foi implementada.
  O escopo escrito da etapa pede "semântica de tabs e navegação (`aria-current`, `role`
  apropriados)" — a camada que a especificação ARIA exige está feita; setas são prática
  recomendada do APG, não requisito. As duas abas seguem acessíveis por Tab.
- **`.btn` continua em `Arial`.** Botões também não herdam a fonte do app; a decisão do dono
  cobriu os campos, e o card de agenda resolveu o caso dele localmente. Não estendi a regra para
  `button` para não ampliar o escopo por conta própria.
- **`getComputedStyle` durante transição CSS mente.** Ao medir o foco dos campos, a leitura deu
  `#333` (valor anterior) mesmo com 500ms de espera e com a regra casando no `CSS.getMatchedStylesForNode`.
  Com `transition: none` o valor veio `#ffd700`. Mesma armadilha que o toast do Cartão A — vale
  como regra: **medir estilo com transição exige neutralizar a transição**.

### Cartão C — Movimento reduzido e textos (4.15, 7.1) · 2026-10-01

**Decisão do dono**: o `prefers-reduced-motion` cobre as animações **e** as transições de
movimento (`transform`/`opacity`); as de cor seguem. O texto de retry padroniza em
**"Tentar novamente"** (é o que as specs fixam).

**Correções de rumo no escopo herdado** (o diagnóstico estava desatualizado):

- O achado nomeava `halterBounce`, `pulseAgora`, `homeShimmer` e `girar-sinc`. **As três primeiras
  não existem mais** — eram keyframes residuais removidos pela limpeza de CSS
  (`archive/sagas/SAGA-limpeza-css.md`, T3 e T5). Sobrou `girar-sinc`.
- O bloco `@media (prefers-reduced-motion: reduce)` que já existia ficava **no meio** do arquivo
  (linha ~2473), **antes** de `.skeleton` (2769) e `.toast` (2938). Como media query não soma
  especificidade, ele **perdia** para as duas — a classe não era zerada. Ou seja: o "parcial" que
  havia não funcionava justamente nos dois casos mais visíveis (spinner e skeleton).

**O que entrou**:

- `assets/css/style.css` — o bloco `reduce` foi **movido para o fim do arquivo** (única forma de
  vencer as declarações originais) e ampliado. Cobre: `periodo-anima-*`, `time-grid-bg-slot-clicked`,
  `.skeleton`, `.toast-spinner` (`animation: none`) + as transições de movimento
  (`.nav-icon-anim`, `#btnFlutuanteAdicionar`, `.btn-weekly-add`, `.agenda-dia-aula`, `.card-stat`,
  `.duracao-stepper-btn`, `.modal-escolha-opcao`, `.modal-recorrencia-trigger`, `.toast`) e as
  mistas dos botões do Google/GCal, que **mantêm** `background`/`border-color`/`color`.
- `assets/js/widget-swipe-periodo.js` — **guard em `animarTrocaPeriodo`**: sai cedo quando o
  movimento está reduzido. Sem isso, `animationend` nunca dispararia (a animação é `none`) e a
  classe ficaria presa no elemento, vazando um listener `{ once: true }` a cada swipe.
- `assets/js/utils-kpi.js` — botão do toast de erro: `"Tentar de novo"` → **`"Tentar novamente"`**.
  Grep por `Tentar` achou **3** pontos (toast, histórico de reposições e histórico de finanças);
  as **duas specs** fixam "Tentar novamente" — o toast era o único fora do padrão.

**Verificado no navegador** (mock `default` e `carregamentoLento`, **433×762 DPR 2.81 + emulação
de toque**, com `prefers-reduced-motion` emulado via CDP nos dois estados):

| Medição | `reduce` | `no-preference` |
| --- | --- | --- |
| `.skeleton` `animation-name` | `none` ✅ | (padrão) |
| `.toast-spinner` `animation-name` | `none` ✅ | `girar-sinc` ✅ |
| `.periodo-anima-avanca` `animation-name` | `none` ✅ | — |
| `.toast` / `.agenda-semana-card` / `#btnFlutuanteAdicionar` / `.nav-icon-anim` `transition` | `none`, 0s ✅ | `all`/`transform` 0.2–0.3s ✅ |
| `.btn-google-custom` `transition-property` | `background, border-color` ✅ | `transform, background, border-color` ✅ |
| `animarTrocaPeriodo` adiciona a classe? | **não** ✅ | **sim** ✅ |
| `.status-toggle-knob` `transform` | `translateX(14px)` preservado ✅ | idem |
| `.time-grid-hour-label` `transform` | `translateY(-50%)` preservado ✅ | idem |
| Card da agenda no modo Dia | ainda `BUTTON` (Cartão B intacto) ✅ | — |
| Texto do retry no toast | `"Tentar novamente"` ✅ | — |

Os dois últimos itens são o contra-teste: provam que a neutralização não encostou em `transform`
de **estado** (knob do toggle) nem de **posicionamento** (centralização do rótulo de hora) — nesses,
mover não é decoração.

**Suítes**: `tests-frontend` **84/84** e `backend` **232/232**, 0 falhas.

**Fora do escopo, registrado sem alterar**:

- **`.app-header` tem `transition: all 0.3s`** e não foi tocado: nenhuma propriedade de movimento
  muda no header, então o `all` não produz movimento. Vale como observação, não como defeito.
- **`.status-toggle` (track/knob) não tem transição no knob** — o knob salta em vez de deslizar
  mesmo com movimento liberado. É pré-existente e não é do 4.15 (o achado é sobre *reduzir*
  movimento, não adicionar); registrado aqui para não se perder.

_(cartão D: a preencher)_

---

## Cartão D — Navegação com histórico (4.17.6) e mensagem de modo leitura (4.17.1)

### Decisões do dono (2026-10-01)

1. **4.17.6 — a tela ativa vai para a URL por `hash`** (`#tela-financas`), não por caminho.
   Motivo: roteamento por caminho (`/financas`) exigiria rewrite no `scripts/servir-local.js` e no
   deploy estático do Vercel — sem isso, recarregar em `/financas` devolveria 404. A hash não passa
   pelo servidor, então reload e Voltar/Avançar funcionam sem config nova. A query string
   (`?tela=`) foi descartada por exigir `pushState`/`popstate` manuais sem ganho.
2. **4.17.1 — o pill "Modo leitura" só aparece no desktop** (a partir de 768px).

### 4.17.1 — o diagnóstico do achado estava incompleto

O achado dizia "escondida permanentemente pelo CSS". Isso se confirma em parte: a regra base tem
`display: none` e **nenhuma** das outras três regras (duas em media queries) mexeu em `display`,
em nenhuma largura. Mas **tirar o `display: none` não resolve** — quebra o header:

| Medição forçando o pill visível | Resultado |
| --- | --- |
| 433×762 | pill com `left: -23px` — **sai 23px para fora da tela**, sobre a marca (`visivelNaTela: false`) |
| 320×568 | pill com `left: -112px` — pior ainda |

Ou seja, é restrição de **layout**, não defeito de uma declaração. A decisão (2) resolve pelo
caminho barato: exibir onde cabe.

Contexto que reduz a urgência: o usuário desconectado **já recebe o recado** pelo toast
_"Faça login com Google para carregar seus dados da nuvem."_ — o pill era redundante, não a única
fonte da informação.

### O que entrou

- `assets/js/app/router.js`:
  - `lerTelaDaHash()` / `telaValida()` — a hash só é aceita se for uma tela conhecida
    (`VIEW_INITIALIZERS`); hash desconhecida ou malformada (`#%E0%A4%A`, que faz
    `decodeURIComponent` lançar) cai na padrão em vez de derrubar o app.
  - `registrarTelaNaUrl()` — escreve `#<tela>` na URL. **Primeira escrita usa `replaceState`**
    (a tela do boot não é navegação do usuário: Voltar deve sair do app) e as seguintes usam
    `pushState`. A comparação com a hash atual é o que também guarda a navegação vinda da própria
    URL — sem ela, cada Voltar criaria uma entrada nova (pingue-pongue).
  - `sincronizarComUrl()` — listener de `hashchange` registrado em `bindNavigation()`. Cobre
    Voltar/Avançar e edição manual da barra de endereços. `popstate` seria um segundo listener
    para o mesmo evento, já que só criamos entradas que diferem no fragmento.
  - Todo acesso à History API é defendido com try/catch: URL é acessório, a troca de tela é o
    essencial e não pode depender dela.
  - `getTelaInicial()` — tela da URL se conhecida, senão a padrão. O router continua dono da
    decisão; o bootstrap não interpreta hash.
  - `navigateTo()` agora **ignora id que não é tela** (antes escondia todas as views).
- `assets/js/app/bootstrap.js` — `navigateTo('tela-home')` → `navigateTo(router.getTelaInicial())`.
- `index.html` — os três `href="#"` do `.nav-inferior` passaram a `#tela-home`,
  `#tela-financas` e `#tela-alunos`.
- `assets/css/style.css` — `.header-readonly-pill`: comentário na regra base e
  `display: inline-flex` dentro do `@media (min-width: 768px)` que já existia (onde o elemento já
  ganhava `flex: 1 1 auto`). Concentrar no breakpoint já existente evita media query nova.

### Verificado no navegador (mock `desconectado`, CDP)

**4.17.1 — visibilidade por largura** (`display` computado; `flex` é o valor *blockificado* de
`inline-flex` num flex item, comportamento esperado, não divergência):

| Largura | `display` | Dentro da tela | Altura do header | Estouro horizontal |
| --- | --- | --- | --- | --- |
| 320×568 | `none` ✅ | — | 54px | não |
| 390×844 | `none` ✅ | — | 54px | não |
| 431×762 | `none` ✅ | — | 66px | não |
| **433×762** (referência) | `none` ✅ | — | 66px | não |
| 600×900 | `none` ✅ | — | 66px | não |
| **768×900** | `flex` ✅ | `left 270 / right 511` ✅ | 83px | não |
| 1024×800 | `flex` ✅ | `left 526 / right 767` ✅ | 72px | não |
| 1440×900 | `flex` ✅ | `left 750 / right 990` ✅ | 72px | não |

Em 900×700 a altura do header é **72px com o pill visível e 72px com ele oculto** — o aviso não
empurra o layout. Contraste do texto (`#9eb0c3` sobre o header `rgba(13,13,13,0.88)`):
**8,75:1** (AA pede 4,5:1), 12px / peso 700. Captura do header confere a ordem visual:
marca à esquerda, aviso no centro, botão de login à direita.

**4.17.6 — ciclo completo de navegação** (433×762 DPR 2.81 + toque):

| Ação | `location.hash` | Link ativo / `aria-current` | Tela visível |
| --- | --- | --- | --- |
| Boot (sem hash na URL) | `#tela-home` ✅ | `tela-home` | `tela-home` |
| Clique em Finanças | `#tela-financas` ✅ | `tela-financas` | `tela-financas` |
| **Recarregar** | `#tela-financas` ✅ | `tela-financas` | `tela-financas` ✅ |
| **Voltar** | `#tela-home` ✅ | `tela-home` | `tela-home` ✅ |
| **Avançar** | `#tela-financas` ✅ | `tela-financas` | `tela-financas` ✅ |
| Hash inválida digitada | `#tela-financas` (realinhada) ✅ | `tela-financas` | `tela-financas` (não mudou) |

A linha do reload é o ganho do achado: antes, recarregar sempre caía na Home.

### Testes

Novo arquivo `tests-frontend/router-historico.test.js` (7 casos): tela inicial vinda da URL;
fallback para hash ausente, desconhecida e malformada; boot com `replaceState` e abrindo a tela da
URL; clique empilhando `pushState`; mudança de URL por fora navegando **sem** escrever na URL;
hash inválida realinhando com `replaceState` sem trocar de tela; id desconhecido ignorado.

O medidor registra as chamadas de `pushState`/`replaceState` e **delega ao original**, para que
`location.hash` continue sendo atualizada de verdade. O helper que simula o Voltar usa o método
**original**, não o instrumentado: a mudança de URL é do navegador, não do app, e não pode contar
como escrita do app (foi o que fez duas asserções falharem na primeira rodada — erro do medidor,
não do código).

**Prova por mutação** (as duas confirmadas com reversão e `git status` limpo):

| Mutação | Falhas |
| --- | --- |
| remover a escrita na URL em `navigateTo` | 2 (`boot ... abre a tela que veio na URL`, `clicar ... empilha`) ✅ |
| remover o guard de hash igual em `registrarTelaNaUrl` | 2 (`boot ...`, `mudança de URL por fora navega sem reescrever`) ✅ |

**Uma mutação NÃO foi detectada e virou remoção de código:** o parâmetro
`{ registrarHistorico: false }` que `sincronizarComUrl` passava a `navigateTo` não tinha efeito
observável — no caminho vindo da URL a hash já é a da tela de destino, então o guard de hash igual
já barra a escrita. Parâmetro removido em vez de mantido como código morto; a proteção é o guard,
e é ele que a mutação acima prova.

**Suítes**: `tests-frontend` **91/91** (84 + 7 novos) e `backend` **232/232**, 0 falhas.
O `router-fab-tela.test.js` (ordem do FAB da Home, achado anterior) continua verde — era o teste
sob maior risco de quebra.

### Encontrado e não alterado

- **`mocks/ui-runtime/mock-runtime.js:476`** chama `navigateTo('tela-home')` 150ms após instalar o
  mock, mas com **condição avaliada na hora** (`if (window.__appShell && ...)`): como o mock
  instala antes do `__appShell` existir, o `setTimeout` **não é agendado** e o trecho não executa.
  É código morto pré-existente — não mexi (fora do escopo) e **não** foi o que impediu a validação
  do reload, que passou.
- **`docs/specs/gcal-sync.md`** (linhas ~295 e ~353) descrevia a renovação do canal como
  acontecendo "após `router.navigateTo('tela-home')`", e o boot passou a navegar para a tela da
  URL. **Resolvido**: a spec foi atualizada para a navegação inicial e a versão dela subiu para a
  12 (commit `71e24b4`, rodada de fechamento de lacunas).
- **`tests-frontend/router-fab-tela.test.js`** mantém `href="#"` nos seus links. Não precisa mudar
  (o teste não olha href), mas agora diverge do `index.html` real; deixei como está para não
  alterar teste que não pertence a este cartão.

### Correção posterior à validação (2026-10-05)

A validação em deploy provisório encontrou um defeito neste cartão: **após recarregar, a primeira
navegação do usuário substituía a entrada de histórico em vez de empilhar**, e o Voltar pulava uma
tela — e o caminho da recarga é justamente o que o 4.17.6 existe para resolver. Corrigido em
`assets/js/app/router.js` (`jaEscreveuNaUrl` passou a marcar "o boot já passou", e não "a URL foi
escrita"), com caso novo em `tests-frontend/router-historico.test.js` e prova por mutação.
Medições, provas e o registro da validação inteira em
[`plans/2026-10-05-validacao-etapa-7-branch.md`](2026-10-05-validacao-etapa-7-branch.md).
Suítes após o fix: frontend **92/92**, backend **232/232**.

**A ressalva do teclado caiu nesta rodada**: a validação no aparelho confirmou os 7 itens de
teclado e TalkBack que o Cartão B registrava como "não pôde ser observada neste ambiente".


