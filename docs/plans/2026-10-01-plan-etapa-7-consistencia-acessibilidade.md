# Plano — Etapa 7: consistência e acessibilidade final (item 5.7)

> **Data de abertura**: 2026-10-01
> **Branch de trabalho**: `feat/etapa-7-consistencia-acessibilidade` (criada de `origin/main`, `--no-track`)
> **Item de roadmap**: 5.7 (Grupo 5)
> **Fonte de verdade do escopo**: `docs/diagnostics/2026-09-23-diag-auditoria-ui-ux-mobile.md`, seção 5 (Etapa 7) e tabela mestra (seção 1)
> **Status**: 🚧 EM ANDAMENTO — **Cartões A e B fechados** (4.13, 4.16, 4.6, 4.17.3, auditoria de 4.17.4/5); C e D pendentes

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
| 4.15 | `prefers-reduced-motion` parcial | pendente (4 animações) |
| 4.16 | ARIA completo de navegação/tabs | ✅ fechado no Cartão B |
| 4.17.1 | mensagem de modo leitura escondida pelo CSS | pendente (precisa de evidência) |
| 4.17.3 | textarea financeiro sem estilo/foco de input | ✅ fechado no Cartão B (resíduo era só a fonte) |
| 4.17.4 | `disabled` global | ✅ **já resolvido na Etapa 2** — auditoria de cobertura feita no Cartão B: 105 interativos, 0 sem nome |
| 4.17.5 | `aria-label` em icon-only | ✅ **já resolvido na Etapa 2** — cobertura verificada no Cartão B |
| 4.17.6 | `href="#"` sem representar a tela ativa no histórico | decisão fechada (item 2 acima) — execução no Cartão D |
| 7.1 | "Tentar de novo" × "Tentar novamente" | pendente (Cartão C) |

---

## Proposta de cartões

| Cartão | Conteúdo | Bloqueio |
| --- | --- | --- |
| **A** ✅ | Cor de estado (4.13): tokens + migração dos usos | fechado em 2026-10-01 |
| **B** ✅ | ARIA e semântica (4.16, 4.6 final, 4.17.3, auditoria de 4.17.4/5) | fechado em 2026-10-01 |
| **C** | Movimento reduzido e textos (4.15, 7.1) | — |
| **D** | Navegação com recarga/histórico (4.17.6) + 4.17.1 | — |

Ordem sugerida de execução: **B → C → D → A** (A por último porque depende da decisão; B e C
são os de menor risco).

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

_(cartões C e D: a preencher)_
