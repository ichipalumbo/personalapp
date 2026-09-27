# Cartões incrementais — Etapa 2 (legibilidade e toque)

> **Data de abertura**: 2026-09-26
> **Branch de trabalho**: `fix/legibilidade-e-toque` (criada de `origin/main` em `b752601`, sem upstream track)
> **Fonte**: seção "Etapa 2 — Fundação de legibilidade e toque" de `docs/_diags_llm/2026-09-23-diag-auditoria-ui-ux-mobile.md`
> **Inventário inicial (medido 2026-09-26, leitura apenas)**: base de fonte 16px (padrão do browser; o CSS usa 100% `rem`); 89 declarações de `font-size` entre `0.62rem` (≈10px) e `1.6rem` (25.6px), com 3 `!important`; 10 regras `:focus-visible` isoladas e sem regra global; 10 botões `title` sem `aria-label` no `index.html`.

Ordem dos cartões: **A → B → C → D** (B e C independem de A e D; D depende do mapeamento de cores de A/C e fica por último porque mexe em tom e pede revisão visual do dono).

---

# Tarefa A: Escala tipográfica mínima

## Objetivo (1 frase)
Mapear os 89 `font-size` do app para a escala da Etapa 2 (normal 16px / secundário 14px / badges 12–13px / campos mobile ≥16px), eliminando `!important` e qualquer texto legível abaixo de 12px.

## Referência da decisão
Etapa 2 / achado 4.4 ("Tipografia auxiliar muito pequena"); decisão "critério de aceite: DevTools (emulação)".

## Arquivos a tocar
- `assets/css/style.css` (escala de `font-size`)
- `index.html` — **apenas se** um `style="font-size: ..."` inline existir (a ver; o inventário de 89 itens é só do CSS)

## Passos
1. Gerar inventário completo: cada declaração de `font-size` do CSS com a linha, o seletor e qual elemento do `index.html` ela alcança (grep + `elementFromPoint`/`getComputedStyle` para confirmar em runtime).
2. Classificar cada seletor na escala: **16px** (corpo/legenda principal), **14px** (texto secundário), **13px ou 12px** (badges, meta, legendas minúsculas), **≥16px** (títulos, já ok).
3. Regra de piso: nada abaixo de 12px, exceto texto *decorativo puro* (ex.: `font-size: 0` para reset de ícone — não é texto legível e fica).
4. **Regra mobile de campo**: todo `input`/`select`/`textarea` visível deve ter `font-size` efetivo ≥16px nas telas ≤430px (evita zoom automático do Safari iOS). Implementar com as classes existentes dos formulários (`.form-grupo-spa`, `.agenda-modal-data-input-wrapper`, campos do histórico/cobrança) dentro do `@media (max-width: 430px)` já existente.
5. Remover os 3 `!important` de `font-size` (linhas 1241, 1250, 3078) resolvendo o conflito por especificidade.
6. Não criar variáveis CSS nem reorganizar o arquivo — o projeto é deliberadamente enxuto e sem build; a escala vive como valores literais com o comentário único no topo da seção de tipografia (se houver uma; senão, comentário por bloco).

## Fora de escopo (não fazer)
- Tipografia do modal em tela cheia (decisão 10.1) além do piso de 16px nos *campos*.
- Contraste (Cartão D).
- Altura de alvo de toque (Cartão B).
- Mudança de `font-family`, peso ou linha.

## Validação obrigatória (Playwright)
- Viewport 320×568: medir `getComputedStyle(el).fontSize` de uma amostra representativa (título de seção, card de aluno, badge de ciclo, legenda, campo de input) → todos dentro da escala e campos ≥16px.
- Viewport 390×844: mesma amostra → idem.
- Nenhum `fontSize` computado < 12px em texto legível (exceção declarada: `font-size: 0` de reset).
- Comando de teste: `node --test` em `tests-frontend/` (contagem antes/depois).

## Critério de aceite (checklist binário)
- [ ] Zero `font-size` computado abaixo de 12px em texto legível (amostra documentada no commit)
- [ ] Todos os `input`/`select`/`textarea` visíveis têm ≥16px computados em ≤430px
- [ ] Zero `!important` de `font-size` restante
- [ ] Testes automatizados passam (registrar contagem antes/depois)
- [ ] Nenhuma regra de negócio alterada
- [ ] Dono confere a visualização (hierarquia) em 1–2 telas no celular

## Commit sugerido
`fix(tipografia): escala minima de fontes com piso mobile de 16px em campos`

---

# Tarefa B: Alvos de toque ≥44px

## Objetivo (1 frase)
Garantir que toda ação tocável frequente tenha área ≥44×44px (48×48 preferida) em 320×568 e 390×844, sem esticar o layout.

## Referência da decisão
Etapa 2 / achado 4.5 ("Alvos de toque abaixo do recomendado").

## Arquivos a tocar
- `assets/css/style.css` (altura/largura/padding dos controles)
- `assets/js/*.js` — **apenas se** um alvo for gerado dinamicamente menor que 44px (a ver; cards/slots da agenda são o candidato mais provável)

## Passos
1. Inventário de runtime: em 320×568 e 390×844, iterar todos os `button, a, [role=button], .agenda-dia-aula, .time-grid-bg-slot, input, select, .btn-*` e medir `getBoundingClientRect` → lista dos que têm dimensão menor que 44px em qualquer eixo.
2. Classificar por frequência: **frequente** (FAB, setas de período, slots da grade, botões de ciclo/ajuste, filtros) → 48×48 preferencial; **menos frequente** (fechar, icon-only de exclusão) → 44×44.
3. Corrigir com `min-height`/`min-width` + `padding` e `display:flex; align-items:center; justify-content:center`, sem aumentar `font-size` (isso é Cartão A).
4. Grade de horários: se a altura do slot ficar <44px por linha, a correção é da **área de toque** (padding + `display:block` no wrapper) e não o espaçamento visual da grid.

## Fora de escopo (não fazer)
- Semântica ARIA completa de cards/slots (Etapa 7 / achado 4.6).
- Foco visível (Cartão C).
- Mudar o espaçamento visual geral da grade (só a área tocável).

## Validação obrigatória (Playwright)
- Viewport 320×568: varredura automática dos alvos → zero abaixo de 44px; frequentes ≥48px (lista registrada no commit).
- Viewport 390×844: idem.
- Regressão visual: abrir slot da grade → modal de escolha abre normalmente (a área de toque maior não quebrou o alinhamento).
- Comando de teste: `node --test` em `tests-frontend/`.

## Critério de aceite (checklist binário)
- [ ] Zero alvos tocáveis <44×44px nos dois viewports
- [ ] Ações frequentes ≥48×48px
- [ ] Grid de horários manteve alinhamento (validação visual no Dono)
- [ ] Testes automatizados passam (registrar contagem antes/depois)
- [ ] Nenhuma regra de negócio alterada

## Commit sugerido
`fix(toque): alvos de toque minimos de 44-48px`

---

# Tarefa C: Foco visível padronizado + estado disabled + aria-label de botões

## Objetivo (1 frase)
Padronizar `:focus-visible` global (teclado) e o estado `disabled` (opacidade + `cursor` + `aria-disabled`), e dar `aria-label` aos 10 botões icon-only que hoje só têm `title`.

## Referência da decisão
Etapa 2: "Padronizar `:focus-visible`" + "Padronizar diferenciação visual de estado `disabled`" + "Garantir `aria-label` em botões icon-only que hoje dependem só de `title`". (4.6 parcial — o que fica para a Etapa 7 é a semântica ARIA completa de navegação/tabs.)

## Arquivos a tocar
- `assets/css/style.css` (regra global de `:focus-visible` + padronização de `:disabled`)
- `index.html` (10 botões `title` → `aria-label`)
- `assets/js/*.js` — **apenas se** botões com `title` forem gerados dinamicamente na JS sem `aria-label` (a ver)

## Passos
1. Inventário: todos os botões `title` no DOM (estático + dinâmico) sem `aria-label`/texto visível.
2. `aria-label` = o mesmo texto do `title` (idioma: português, padrão do repositório).
3. CSS global: `:where(button, a, [role=button], input, select, textarea):focus-visible { outline: 2px solid <tom-do-tema>; outline-offset: 2px; }` substituindo as 10 regras isoladas atuais (que ficam, se o tom delas for diferente, como override intencional).
4. `disabled` unificado: onde já existe `opacity: 0.6`, padronizar em um seletor único; garantir `pointer-events: none` e `cursor: not-allowed` (ou `default` — decidir com o dono se preferir nenhum cursor).
5. `:where()` para manter especificidade baixa sem `!important`.

## Fora de escopo (não fazer)
- `aria-live`, `role="status"`, semântica de navegação completa (Etapa 6/7 — achado 4.9/4.16).
- Contraste (Cartão D).
- Trocar `alert`/`confirm` (fora de escopo declarado).

## Validação obrigatória (Playwright)
- Viewport 320×568: `Tab` até 5 botões/slots representativos → `getComputedStyle` mostra `outline` visível; `aria-label` presente nos 10 botões do inventário.
- Viewport 390×844: idem.
- Botão `disabled` (ex.: "Marcar como pago" de ciclo pago) → `pointer-events: none` e `opacity < 1`.
- Comando de teste: `node --test` em `tests-frontend/`.

## Critério de aceite (checklist binário)
- [ ] Todo element interativo alcançável por `Tab` tem `:focus-visible` visível (amostra documentada)
- [ ] Zero botão icon-only sem `aria-label`
- [ ] Todo `disabled` tem opacidade + `pointer-events: none` (amostra documentada)
- [ ] Testes automatizados passam (registrar contagem antes/depois)
- [ ] Nenhuma regra de negócio alterada

## Commit sugerido
`feat(a11y): foco visivel, disabled padronizado e aria-label em botoes icon-only`

---

# Tarefa D: Contraste WCAG

## Objetivo (1 frase)
Calcular a razão de contraste de todo par texto/fundo do app e corrigir os que falham em 4.5:1 (texto) / 3:1 (texto grande e UI) com o menor ajuste de tom possível.

## Referência da decisão
Etapa 2: "Corrigir contrastes prioritários identificados no diagnóstico". (Acessibilidade/contraste *do toast* e `role=alert` continuam na Etapa 6 / achado 4.9.)

## Arquivos a tocar
- `assets/css/style.css` (tons de cor)

## Passos
1. Mapeamento: cada seletor com `color` + contexto de `background` efetivo (o CSS tem camadas: card sobre tela sobre modal) — extrair via `getComputedStyle` por amostra em runtime, não por leitura de linha.
2. Calcular razão WCAG (brilho relativo) de cada par.
3. Falhas: texto comum <4.5:1; texto ≥18.66px bold ou ≥24px <3:1; componente de UI (borda, ícone) <3:1.
4. Corrigir **subindo** o tom do texto no tema escuro (menor delta de tom que atinge 4.5:1), evitando virar branco puro (o preto puro #fff em tema escuro é padrão do app e é aceitável).
5. Prioridade: primeiro texto funcional (valores financeiros, status, prazos), depois metadados.

## Fora de escopo (não fazer)
- Recolorir o tema (o tom escuro é identidade do app).
- Contraste do toast (`aria-live`, etc.) — Etapa 6 / achado 4.9.
- "Amarelo sobrecarregado semanticamente" (achado 4.13 — Etapa 7).

## Validação obrigatória (Playwright)
- Viewport 320×568 e 390×844: recalculo de todos os pares da amostra → zero abaixo do mínimo.
- Comando de teste: `node --test` em `tests-frontend/`.

## Critério de aceite (checklist binário)
- [ ] Zero par texto/fundo <4.5:1 (texto) ou <3:1 (grande/UI) na amostra
- [ ] Dono confirma que o tom não quebrou a identidade (1–2 telas)
- [ ] Testes automatizados passam (registrar contagem antes/depois)
- [ ] Nenhuma regra de negócio alterada

## Commit sugerido
`fix(contraste): pares texto-fundo minimos WCAG 4.5:1 no tema escuro`

---

## Registro de execução

| Cartão | Status | Commit do dono | Contagem antes → depois |
| --- | --- | --- | --- |
| A (tipografia) | ✅ commit `386b00c` (donor, 2026-09-26) | `386b00c` | frontend 77/0 → 77/0 |
| B (toque) | ✅ commit `b9a3c07` (dono, 2026-09-27) | `b9a3c07` | frontend 77/0 → 77/0 (medido) |
| C (foco/disabled/aria) | ✅ implementado 2026-09-27 — aguardando commit do dono | — | frontend 77/0 → 77/0 (medido) |
| D (contraste) | ⏳ | — | — |
- Escala aplicada: 16px (corpo) / 14px (secundário) / 12px (piso de badges e meta) / campos 16px. Títulos, ícones, números (KPI) e o clamp da marca mantidos.
- `assets/css/style.css`: 89 declarações de `font-size` remapeadas; 4 `!important` de `font-size` removidos (KPIs, base e @430); `.form-grupo-spa` ganha `textarea` (input+select+textarea a 1rem); input `type="date"` do modal de agendamento a 1rem; reset `font-size:0` da pílula dia-inteiro virou 12px (decisão donal 2026-09-26 — o texto ON/OFF fica visível).
- `index.html`: 13 inlines remapeados (os 3 já a 12px ficaram).
- Descoberta e decisão donal (2026-09-26): o inventário original não cobria inlines **dentro dos templates JS** — havia ~50 declarações (algumas <12px, ex.: 0.72rem ≈ 11,5px em "Contrato: Nx/sem" e 0.64rem ≈ 10,2px em rótulos dos cards de ciclo). O dono optou por incluí-las no mesmo commit: `view-alunos.js` (5), `view-financas.js` (37), `modal-agendamento.js` (2).
- Validação Playwright em 320×568 e 390×844 (mock `?mockScenario=default`): **zero** texto visível legível < 12px em Home/Alunos/Finanças (exceções declaradas: tarja `#appEnvBadge` — injeção de `api-config.js` em host local, `aria-hidden`; checkboxes invisíveis dos toggles, padrão de acessibilidade com controle custom); **todos os campos** `input/select/textarea` visíveis = 16px (incluindo o `type="date"` do modal em ≤430px); **zero** `!important` de `font-size` restante (CSSOM + estilos inline).
- Amostra documentada do critério "zero <12px": `getComputedStyle` de todos os elementos com texto próprio visível nas 3 telas, em ambos os viewports (verificação de 2026-09-26).
- **Correção pós-conferência do dono (2026-09-26)**: a fila de filtros de status da Finanças (Todos/Atrasado/Em aberto/Pago/Pendente) estourava da caixa — o mapeamento para 14px piorou um estouro **pré-existente** (já estourava 14px em 390 com 12.8px, o valor original). Medição comparativa: 14px → +34px; 12px → +1px em 390; 84px em 320 (os 5 rótulos não cabem em linha, em nenhum tamanho legível). **Decisão do dono: remover o filtro completamente** ("pode remover esse filtro completamente"). Removido de `view-financas.js`: estado `STATE.filtro`, markup dos 5 botões, o `.filter()` de `filtrarCards()` (a ordenação por status fica) e o handler `data-financas-filtro`. A tabela de cards continua exibindo todos os alunos, na mesma ordem. Validado: zero estouro horizontal em 320px (scrollWidth 305), zero erro JS, tabs estáticas de agenda (Semana/Dia, Aula/Deslocamento/Bloquear) intactas. `tab-btn` ficou a 12px (camada de badge, usada agora só pelas tabs de agenda).

**Registro do Cartão B (2026-09-26) — escopo: grupos 1 e 2 (decisão donal — "por enquanto só grupo 1 e 2"):**
- Inventário de runtime (320×568 e 390×844, mock `?mockScenario=default`): varredura de `button, a, [role=button], input, select, [onclick]` + elementos com `cursor:pointer` não nativos (cards clicáveis, slots). Alvos <44px classificados em 3 grupos: **1** ações/ciclo da Finanças, **2** grade de horários + ícones do dia, **3** cabeçalho/toolbar.
- **Grupo 3 ficou de fora por decisão do dono** (forçar 44px no topbar esticaria o header, que o cartão B pede para evitar). Permanece <44px e vira candidato a rodada futura: `.nav-link` (107–120×32–35), `.tab-btn` (150–168×30), setas de semana/dia (34×26), "Hoje" (52×26), `#custom-google-login` (147×28), `#btnSyncBanco` (167×28), `.semana-dia-header` (333–392×34), `.btn-dia-pill` (42px).
- **Correções aplicadas (2 arquivos):**
  - `assets/css/style.css` — (a) `#tela-financas article .btn { min-height: 48px }`: ações frequentes do card (Marcar como pago / Editar ajuste / Configurar agora / Tentar novamente, incluindo as do histórico) 38/36px → 48px; escopo limitado ao `#tela-financas` (modais via `<body>`, cabeçalho e `.btn-sm` global intocados). (b) `#tela-financas article summary { min-height: 44px; padding: 12px 0 }`: toggles "Ver extrato do ciclo" / "Ver ciclos anteriores" 19px → 44px. (c) `.btn-config-icon` ganha `min-height: 44px`: botões "Novo agendamento"/"Configurar grade do dia" 42×42 → 42×44 (largura 42px fica como restrição visual declarada — eixo menor atingiu o piso).
  - `assets/js/view-home.js` — `hourHeight` 84 → **96**: o slot vago de 30min ("Agendar HH:MM") vai de 42 → **48px** (ação frequente no critério do cartão). O valor única-fonte escala toda a grade junto (linhas, labels, cards) — validado que o card de evento continua com topo exatamente sobre a linha da hora (diff 0px). Busca em todos os JS confirmou que é a única grade de dia do app.
- **Validação runtime (320×568 e 390×844):** slots 48px uniformes (28), ícones do dia 44px, botões de Finanças 48px (7/7), summaries 44px (6/6), zero overflow horizontal; regressão de clique no slot vago → diálogo "O que você deseja criar?" abre com o horário correto. Zero erro JS de app (os `ERR_CONNECTION_REFUSED` de `localhost:5000` são esperado no mock, sem backend local).
- Suite `tests-frontend`: **77 pass / 0 fail** medido após o cartão (idêntica ao baseline de abertura).
- `_static-server.tmp.js` (entrado acidentalmente em `386b00c`): removido pelo dono no `b9a3c07`. O `.gitignore` continua sem padrão para `*.tmp.js` — o arquivo agora não é versionado.

**Registro do Cartão C (2026-09-27) — foco visível padronizado + estado disabled + aria-label:**
- **Decisões do dono:** (1) tom do anel de foco global = **dourado do tema `#ffd700`**; (2) cursor do `disabled` = **`not-allowed`** (padrão atual do app); (3) escopo na mesma branch `fix/legibilidade-e-toque` ("continuar na atual").
- **A contagem da spec casou com a medida:** a spec falava em "10 botões"; o inventário completo (estático + dinâmico + varredura de ícones `fa-solid` dentro de botão) fechou em **9 botões icon-only sem `aria-label`** (o FAB da tela de Alunos nem tinha `title`) + `:focus-visible` em apenas **7 regras** (todos os demais controles não tinham anel de foco).
- **Correções aplicadas (3 arquivos):**
  - `assets/css/style.css` — (a) regra global `:where(button, a, [role="button"], input, select, textarea):focus-visible { outline: 2px solid #ffd700; outline-offset: 2px }` em `[TAG-STYLE-BASE]` (`:where()` = especificidade 0 → vira o padrão de todo controle; as 7 regras intencionais continuam por cima como override, agora anotadas uma a uma com o motivo). (b) `disabled` padronizado em seletores únicos na base: `button:disabled { opacity: 0.6; cursor: not-allowed; pointer-events: none }` (substitui os 2 blocos duplicados dos botões gcal, removidos) + `input/select/textarea:disabled { cursor: not-allowed; pointer-events: none }` (o `:disabled` de `.form-grupo-spa` perde as duplicatas de cursor, mantém o visual de campo — a opacidade do grupo continua no wrapper `--desabilitado`: 0.55). (c) anotações `Etapa 2 (Cartão C)` nas 7 regras de foco que permanecem (3 tons do Google, os 2 inputs visual-hidden dos toggles, indicador de reposição e fechar modal com `outline: none` + anel próprio).
  - `index.html` — `aria-label` (mesmo texto do `title`, pt-BR) em `#btnSemanaHomeAnterior`, `#btnSemanaHomeProxima`, `#btnExcluirAlunoModal`, `#btnExcluirSlot`; `#btnFlutuanteAdicionar` (FAB de Alunos, ícone `+`) ganha `title` e `aria-label` **"Novo aluno"** (texto definido pelo dono). Os 4 que já tinham (`#btnUserAreaTrigger`, `#btnNovaAgendaSemanal`, `#btnFecharHistoricoReposicoes`, `#btnCloseSettings`) não foram tocados.
  - `assets/js/view-home.js` — `aria-label` (mesmo texto do `title`) nos 4 botões icon-only da navegação do modo Dia (`#btnHomeDiaAnterior`, `#btnHomeDiaProximo`, `#btnHomeDiaNovaAgenda`, `#btnHomeDiaConfigAgenda`).
- **Validação runtime (primário 433×762 + stress 390×844 e 320×568, mock `?mockScenario=default`; servidor temporário reinjetado com autorização do dono e removido ao fim):**
  - Foco — trajeto de Tab com 12 paradas em 433×762 (header da semana ×2, FAB do modo semanal, login Google, nav-link ×3, tabs Semana/Dia, setas da semana, "Hoje"): **todas estabilizam em `outline: 2px solid rgb(255,215,0)`, `outline-offset: 2px`**; `#custom-google-login` mantém o azul `rgb(138,180,248)` (override intencional medido). Mesma verificação em 390×844 e 320×568 (5 paradas cada) — idêntico. Descoberta durante a medição: a leitura **instantânea** do `getComputedStyle` pega o estado inicial da transição (`outline` anima de 1.5px em 0.2–0.3s, por causa do `transition` genérico de `.btn`/`.nav-link`) — a medição de aceite usa o estado estabilizado, e o resultado é o mesmo anel dourado em todos os alvos.
  - `aria-label`: **13/13** botões do inventário com o atributo presente no DOM (9 novos + 4 preexistentes).
  - `disabled` (amostra documentada — card de **Ana Costa**, ciclo pago): "Marcar como pago" e "Editar ajuste" → `opacity: 0.6`, `pointer-events: none`, `cursor: not-allowed`.
  - Regressão: modal "O que você deseja criar?" continua abrindo pelo clique no slot vago (trilha de foco do DialogController intacta), botões do modal ganham o anel dourado no Tab e o `Escape` fecha o modal.
- Suite `tests-frontend`: **77 pass / 0 fail** medido antes (abertura da rodada) e depois do cartão.
- **Encontrado, não alterado:** `title="${tituloExterno}"` em `agenda-card-template.js:285` está num `<div>` de card, não em botão (o critério do cartão é botão; o card tem texto próprio). `aria-disabled` **não foi adicionado** em lugar nenhum: o estado é comunicado por `disabled` nativo, que leitores de tela já anunciam — o atribunto seria redundante (a spec do cartão o citava entre os estados; a decisão registrada é que o visual `opacity + pointer-events` cumpre o critério de aceite).
