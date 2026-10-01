# Auditoria e Plano de Execução — UI/UX Mobile (documento consolidado)

> **Versão**: consolidação de 2026-09-24, reconciliando:
> - `2026-09-23-diag-auditoria-ui-ux-mobile.md` (diagnóstico original + revisão `anti-ui-slop`)
> - `docs/plans/2026-09-24-plan-etapa-1-formularios-dialogos-mobile.md` (plano e execução da Etapa 1)
>
> **Atualização de status (2026-09-27)**: status das etapas sincronizado com os relatórios de
> execução `docs/plans/2026-09-26-plan-etapa-2-legibilidade-toque-cartoes.md` (Etapa 2, mergeada na
> `main` via PR #62) e `docs/plans/2026-09-27-plan-etapa-3-navegacao-e-topo-cartoes.md` (Etapa 3,
> mergeada na `main` via PR #63), verificados contra `git log`. O conteúdo de escopo dos achados
> e das etapas não mudou — apenas status, progresso e decisões fechadas.
>
> **Atualização de status (2026-09-30)**: Etapa 6 **concluída** — implementada em
> `feat/etapa-6-toast-unificado` (2026-09-29), validada em produção pelo dono e mergeada na
> `main` via PR #66; adição posterior (tela de finanças no toast de carregamento) mergeada via
> PR #67, ambas em 2026-09-30 — ver seção 5, Etapa 6, e
> `docs/plans/2026-09-29-plan-etapa-6-toast-unificado.md`.
>
> **Objetivo desta reescrita**: eliminar a duplicidade entre os "achados 4.1–4.17" (levantamento
> amplo) e os "achados materiais" da revisão `anti-ui-slop` (fila de prioridade), mapear cada
> achado a exatamente uma etapa dona, e endereçar os itens que estavam **órfãos** (sem etapa
> atribuída) nos documentos originais.
>
> **Premissa confirmada**: o aplicativo é usado integralmente em celulares; desktop não é alvo
> de otimização. Nenhuma regra de negócio (persistência, recorrência, cobrança, Google Calendar,
> autenticação) deve ser alterada por este plano em nenhuma etapa.

---

## Como ler este documento

1. A **seção 1** é a tabela mestra — se você só tem 30 segundos, olhe essa tabela.
2. A **seção 2** explica a ordem de execução e por que ela não é simplesmente "1, 2, 3, 4...".
3. As **seções 3 a 5** detalham, respectivamente: hotfixes pontuais (Fase 0), achados completos
   com dono definido, e cada etapa estrutural.
4. As **seções 6 a 9** são material de apoio permanente (padrões a preservar, decisões pendentes,
   matriz de validação, escopo).

Legenda de status usada em todo o documento:

| Símbolo | Significado |
| --- | --- |
| ✅ | Concluído e validado |
| 🟡 | Em andamento / parcialmente coberto |
| ⏳ | Planejado, não iniciado |
| ⚠️ | Estava órfão nos documentos originais — endereçado nesta reescrita |

---

## 1) Tabela mestra de rastreabilidade

| # | Item | Origem | Etapa dona | Status |
| --- | --- | --- | --- | --- |
| 0.1 | Toast invisível bloqueia toque no FAB | Achado material 2 (revisão `anti-ui-slop`) | **Fase 0** (hotfix isolado, recomendado **imediato**) | ✅ *corrigido (`f55d78e` + `bottom` de `.toast.show`) — ver seção 3.1* |
| 0.2 | Cadastro de aluno sem saída em 320×568 | Achado material 1 = 4.1 | Fase 0 → absorvido pela **Etapa 1** | ✅ |
| 0.3 | Topo da Home consome mais da metade da viewport | Achado material 3 = 4.2 | Fase 0 → absorvida pela **Etapa 3** | ✅ *(ETAPA 3 CONCLUÍDA — ver seções 3.3 e 5; −98px de topo em 433 e 320, medida no report `2026-09-27-etapa-3-navegacao-e-topo-cartoes.md`)* |
| 4.1 | Formulário extenso sem saída operacional | Diagnóstico §4.1 | Etapa 1 | ✅ |
| 4.2 | Topo da Home consome altura excessiva | Diagnóstico §4.2 | Etapa 3 | ✅ *ETAPA 3 CONCLUÍDA (2026-09-27, `7ccb736`): header 122→68px @433 — ver seção 5* |
| 4.3 | Navegação principal compete com conteúdo | Diagnóstico §4.3 | Etapa 3 | ✅ *ETAPA 3 CONCLUÍDA: navegação superior trocada por barra inferior fixa (3 telas, alvos 134×52px) — ver seção 5* |
| 4.4 | Tipografia auxiliar muito pequena | Diagnóstico §4.4 | Etapa 2 | ✅ *ETAPA 2 CONCLUÍDA (2026-09-26, `386b00c`): escala mínima aplicada; 89 declarações + ~50 inlines de templates JS; zero texto legível <12px; filtros de status da Finanças removidos por decisão do dono no fim do cartão A (estouro pré-existente), o que também atende a 4.10 parcialmente — ver seção 5* |
| 4.5 | Alvos de toque abaixo do recomendado | Diagnóstico §4.5 | Etapa 2 | 🟡 *ETAPA 2 CONCLUÍDA no escopo decidido: grupos 1 (Finanças → 48px) e 2 (grade de horários → 48px) corrigidos em `b9a3c07`; grupos 3 (cabeçalho/toolbar) deixados <44px por decisão do dono, registrados no report da Etapa 2 como candidatos a rodada futura* |
| 4.6 | Cards/slots sem interação equivalente por teclado | Diagnóstico §4.6 | Etapa 2 (foco/teclado básico) + Etapa 7 (semântica final) | 🟡 *partida Etapa 2 concluída (Cartão C, `81485c5`): `:focus-visible` global dourado padronizado, 13/13 botões icon-only com `aria-label`. Semântica final de cards/tabs segue na Etapa 7 — ver seção 5* |
| 4.7 | Gerenciamento de diálogo inconsistente | Diagnóstico §4.7 | Etapa 1 | ✅ |
| 4.8 | Erro global bloqueante sem recuperação | Diagnóstico §4.8 | Etapa 6 | ✅ *implementado 2026-09-29, validado em produção pelo dono e mergeado via PR #66 (2026-09-30): overlay bloqueante removido, retry conectado ao `onRetry` que existia morto (ver seção 5, Etapa 6)* |
| 4.9 | Toasts/assíncronos: acessibilidade e contraste | Diagnóstico §4.9 | Etapa 6 | ✅ *implementado 2026-09-29: `role`/`aria-live` dinâmicos por estado — ver seção 5, Etapa 6* |
| 4.10 | Filtros apertados | Diagnóstico §4.10 | Etapa 4 | ✅ *resolvida sem ser a Etapa 4 estrutural: o fim do Cartão A da Etapa 2 (2026-09-26, `386b00c`) removeu o filtro de status da Finanças (estouro pré-existente; decisão do dono). Os 2 filtros de Alunos (status/objetivo) foram removidos por completo em 2026-09-27, pedido direto do dono ("deixar mais clean"), fora da sequência formal — ver `docs/reports/2026-09-27-remocao-filtros-tela-alunos.md`. Nada resta a fazer neste achado; a Etapa 4 perde este escopo* |
| 4.11 | Cards com informação excessiva | Diagnóstico §4.11 | Etapa 4 | ⏳ |
| 4.12 | Eventos simultâneos na agenda diária | Diagnóstico §4.12 | Etapa 5 | ✅ *ETAPA 5 CONCLUÍDA (2026-09-27, mergeada na `main`): formato híbrido estilo Outlook — banda de 2 em colunas, banda de 3+ em linhas empilhadas; fundo do Dia nivelado/esticado — ver seção 5, Etapa 5* |
| 4.13 | Amarelo sobrecarregado semanticamente | Diagnóstico §4.13 | **Etapa 7 (ampliada)** | ⚠️ ⏳ *órfão — ver seção 5, Etapa 7* |
| 4.14 | Safe areas / elementos flutuantes | Diagnóstico §4.14 | Etapa 3 | ✅ *ETAPA 3 CONCLUÍDA (2026-09-27, `7ccb736`): `--bottombar-height` medido em runtime, FAB/toast/barra ancorados no token, `viewport-fit=cover` no meta — valores declarados no report da Etapa 3 (env()=0 no DevTools; valida o cálculo, não o pixel)* |
| 4.15 | Movimento reduzido parcial | Diagnóstico §4.15 | Etapa 7 | ⏳ |
| 4.16 | Navegação/tabs sem ARIA completo | Diagnóstico §4.16 | Etapa 7 | 🟡 *parte: a barra inferior da Etapa 3 (2026-09-27) já opera `aria-current="page"` no item ativo (validado no report da Etapa 3). O restante da semântica de tabs/navegação segue na Etapa 7* |
| 4.17 | 6 inconsistências específicas (inclui bug de seletor CSS/JS) | Diagnóstico §4.17 | **Etapa 7 (ampliada)** | ⚠️ ⏳ *órfão — ver seção 5, Etapa 7* |

---

## 2) Ordem de execução definitiva

A ordem abaixo substitui qualquer leitura sequencial simples de "Etapa 1, 2, 3...". Ela reflete a
fila de prioridade da revisão `anti-ui-slop` **mesclada** com as etapas estruturais:

1. ~~**Fase 0.2** — cadastro bloqueado em 320×568~~ → ✅ concluída (absorvida pela Etapa 1, que
   também resolveu 4.7 de forma mais ampla que o pedido original).
2. ~~**Fase 0.1 — toast bloqueando toque**~~ → ✅ **concluída** (ver seção 3.1): a correção de
   `pointer-events` está no `f55d78e` desde 2026-09-24, e o `bottom` de `.toast.show` (toast
   visível não cobrindo o FAB) entrou junto na branch `fix/mobile-formularios-dialogos`.
3. ~~**Etapa 2 — fundação de legibilidade e toque**~~ → ✅ **concluída (2026-09-26)** — cartões
   A/B/C/D, commits `386b00c`, `b9a3c07`, `81485c5`, `e73f312`; mergeada na `main` via PR #62
   (`468351b`). Report: `docs/plans/2026-09-26-plan-etapa-2-legibilidade-toque-cartoes.md`.
4. ~~**Etapa 3 — navegação e topo operacional**~~ → ✅ **concluída (2026-09-27)** — cartões
   E/F/G + rodadas 2 e 3 (FAB dinâmico, remoção da linha de ações do modo Dia, remoção da tarja
   LOCAL), commit `7ccb736` (+ `66593c9`, `3bbf152`); mergeada na `main` via PR #63
   (`6910621`). Report: `docs/plans/2026-09-27-plan-etapa-3-navegacao-e-topo-cartoes.md`.
5. **Etapas 4, 5, 6** → seguem a ordem original do diagnóstico, sem dependência forte entre si.
6. **Etapa 7 — consistência e acessibilidade final (ampliada)** → agora inclui explicitamente
   4.13 e 4.17, que não tinham dono nos documentos originais. **Atualização (2026-09-27)**:
   os itens 4.17.4 e 4.17.5 foram resolvidos de facto pelos cartões C e D da Etapa 2 (padrões
   `disabled` e `aria-label` já são globais) — a Etapa 7 executa auditoria de cobertura, não
   trabalho novo.

**Por que a Fase 0.1 não foi feita junto com a Etapa 1?** O relatório de conclusão da Etapa 1
registra explicitamente que `#toast` ficou **fora de escopo**. Isso foi uma decisão correta de
contenção de escopo (evitar misturar infraestrutura de diálogo com bug de toast), mas teve o
efeito colateral de deixar o achado mais crítico da revisão original sem execução. Esta reescrita
resolve essa lacuna tornando a Fase 0.1 explícita e prioritária.

---

## 3) Fase 0 — hotfixes pontuais (fora da estrutura de diálogo)

### 3.1 ✅ Fase 0.1 — Toast invisível bloqueia o FAB de adicionar aluno *(concluída — registro no fim da seção)*

**Evidência (já validada na auditoria original)**

- Após a mensagem de autenticação, tentativas de tocar no FAB de adicionar aluno foram
  interceptadas por `#toast`.
- `utils-kpi.js` remove apenas a classe `.show` após três segundos.
- `.toast` permanece `position: fixed`, ocupando a faixa inferior entre `left: 20px` e
  `right: 20px`, mesmo com `opacity: 0`.
- O estado oculto não define `pointer-events: none` nem `visibility: hidden`.

**Impacto**: uma mensagem transitória pode tornar uma ação primária aparentemente inerte, sem
explicação visível.

**Menor correção concreta**: desativar `pointer-events` no estado oculto do `.toast` e reativá-lo
somente enquanto `.show` estiver presente. Validar em seguida que o toast visível não se sobrepõe
ao FAB nem à futura safe area inferior.

**Por que isso é Fase 0 e não parte de uma etapa estrutural**: é CSS puro, sem dependência do
`DialogController` (o toast não é um diálogo), sem infraestrutura nova, e sem necessidade de
esperar as decisões de Etapa 6. Pode e deve ser feito como correção isolada de 1 commit.

**Nota para a Etapa 6**: quando a Etapa 6 tratar o achado 4.9 (acessibilidade/contraste do toast,
`role="status"`/`role="alert"`, `aria-live`), ela deve **assumir que o bug de `pointer-events`
já foi corrigido aqui** — não deve refazer esse hotfix. O `bottom` do toast visível também **não**
precisa ser reavaliado da forma fixa de agora: a Etapa 3 (2026-09-27, `7ccb736`) o reancorou em
`calc(var(--bottombar-height, 0px) + 82px)`, que já inclui a safe area inferior via token.
**Registro de conclusão (2026-09-26)**:
- Estado oculto: `pointer-events: none` no `.toast` e `auto` no `.toast.show`, no `f55d78e`
  (2026-09-24). Validado em runtime em 320×568: com o toast oculto, toque na faixa cobrindo
  o FAB alcança `#btnFlutuanteAdicionar`.
- O critério de aceite "o toast visível não se sobrepõe ao FAB nem à futura safe area inferior"
  exigiu um complemento: `bottom: 100px` no `.toast.show` (o FAB ocupa a faixa de 30 a 90px da
  base). Validado em 320×568 e 390×844: sem sobreposição entre toast visível e FAB.
- Restante da fila: apenas acessibilidade/contraste do achado 4.9, na Etapa 6.
### 3.2 ✅ Fase 0.2 — Cadastro de aluno bloqueado em 320×568 *(concluída)*

Absorvida integralmente pela Etapa 1 (ver seção 5). O que era pensado como "correção mínima"
(Subetapa 1 do plano da Etapa 1) acabou sendo seguido por uma iniciativa maior — a criação do
`DialogController` — mas o achado original está resolvido e validado.

### 3.3 ✅ Fase 0.3 — Altura operacional da Home *(concluída — absorvida pela Etapa 3)*

**Evidência (já validada na auditoria original)**

- Em 320×568 px, o header mediu aproximadamente 118 px de altura.
- O primeiro painel da agenda começou em aproximadamente 314 px — cerca de 55% da primeira
  viewport consumida antes do conteúdo operacional.

**Menor correção concreta**: remover **Sincronizar Dados** do fluxo superior primário e
consolidar período, setas e Hoje em uma única barra.

**Decisão de escopo desta reescrita**: em vez de tratar isso como uma quarta rodada isolada de
Fase 0 (o que criaria uma nova pendência solta), ela passa a ser o **primeiro objetivo dentro da
Etapa 3**, já que ambas tratam da mesma área (topo da Home) e Etapa 3 já tem esse achado (4.2)
como escopo. Isso evita duas rodadas de mudança na mesma região do layout em momentos diferentes.

**Registro de conclusão (2026-09-27)**: concluída dentro da Etapa 3 (commits `7ccb736`,
`66593c9` — ver seção 5). "Sincronizar Dados" e "Configurar Grade Horária" saem do topo para a
seção "Dados" do modal Área do usuário; topbar em uma linha; topo da Home cai de
309→211px em 433×762 e 299→201px em 320×568 (−32%). Números completos no report
`docs/plans/2026-09-27-plan-etapa-3-navegacao-e-topo-cartoes.md`.

---

## 4) Padrões existentes a preservar (válido para todas as etapas)

1. A identidade escura e a marca são consistentes entre as telas.
2. Ações primárias possuem destaque visual claro.
3. Formulários geralmente associam `label` e campo por `for`/`id`.
4. A agenda já trata truncamento e densidade de cards em vários cenários.
5. Há estados vazios distintos para ausência de dados e ausência de resultados por filtro.
6. O histórico de reposições já possui uma implementação mais completa de diálogo — agora
   generalizada pelo `DialogController` (Etapa 1).
7. O modal de recorrência já limita altura e oferece rolagem interna — idem.
8. Estados financeiros combinam texto e ícone, sem depender exclusivamente de cor.
9. O gesto de swipe protege o scroll vertical e as bordas reservadas a gestos do sistema.
10. A estrutura mobile-first do CSS oferece uma base adequada para evoluir sem introduzir
    framework ou build step.

---

## 5) Etapas estruturais

### Etapa 1 — Formulários e diálogos mobile ✅ CONCLUÍDA

**Achados endereçados**: 4.1, 4.7 (e a Fase 0.2 completa).

**Resultado real** (ver relatório de execução para detalhes de commits):
- 14 superfícies migradas para o `DialogController` compartilhado.
- Tela completa no mobile (≤430px) para aluno, agendamento e recorrência (decisão 10.1).
- Pilha de diálogos real, com empilhamento e retorno de foco validados.
- Validação automatizada: frontend 77/77; backend 232/232.
- Fora de escopo mantido conscientemente: diálogos nativos (`alert`/`confirm`), `#overlay-sinc`
  e a acessibilidade do `#toast` (a Fase 0.1 do toast está concluída — ver seção 3.1).

**Decisões que ficam disponíveis como padrão para as próximas etapas** (seção 10.0 do plano
original — reaproveitar, não redecidir):

| Tema | Decisão |
| --- | --- |
| Tela cheia no mobile | Aluno, criar agendamento, configurar recorrência e área do usuário. |
| Cancelar com alterações | Confirmação apenas em aluno e agendamento; demais descartam direto. |
| Clique fora / backdrop | Nunca fecha nenhum diálogo. |
| Rodapé com teclado | Botões no fim da rolagem, sem rodapé fixo. |
| Escape | Fecha todos os diálogos, mesmo caminho de Cancelar/Voltar. |
| Critério de aceite | DevTools (emulação). |
| Confirmações nativas | Fora de escopo. |

---

### Etapa 2 — Fundação de legibilidade e toque ✅ CONCLUÍDA (2026-09-26, mergeada na `main` via PR #62 / `468351b`)

**Achados endereçados**: 4.4, 4.5, 4.6 (parcial — só a parte de foco/teclado básico; a semântica
ARIA completa de tabs/navegação fica para a Etapa 7).

**Resultado real** (ver relatório `docs/plans/2026-09-26-plan-etapa-2-legibilidade-toque-cartoes.md`):
- Cartões A→D executados nesta ordem, nos commits `386b00c` (A), `b9a3c07` (B), `81485c5` (C),
  `e73f312` (D). Suítes medidas a cada cartão: 77/0 na suíte de frontend.
- Escala tipográfica aplicada (16/14/12px + campos ≥16px); zero texto legível <12px e zero
  `!important` de `font-size`. Descoberta no fim do Cartão A: ~50 declarações de `font-size` em
  templates JS (`view-alunos.js`, `view-financas.js`, `modal-agendamento.js`) — incluídas pela
  decisão do dono. No mesmo fechamento, o filtro de status da Finanças (estouro pré-existente)
  foi **removido por decisão do dono**, o que atende parcialmente ao achado 4.10 sem ser a Etapa 4.
- Alvos de toque: grupos 1 e 2 corrigidos (Finanças 48px, slots da grade 48px, ícones do dia
  44px). Grupo 3 (cabeçalho/toolbar) deixou <44px **por decisão do dono** — registrado no report
  da Etapa 2 como candidata a rodada futura.
- `:focus-visible` global padronizado (anel dourado 2px via `:where()`), `disabled` unificado
  (`opacity 0.6` + `pointer-events: none` + `cursor: not-allowed`), `aria-label` em 13/13 botões
  icon-only inventariados.
- Contraste WCAG: 3 pares corrigidos nos 3 viewports (amostra de 289 pares por viewport;
  revalidação final: zero falhas em 433×762, 390×844 e 320×568).

**Escopo** (historial, mantido para rastreamento):
- Criar escala tipográfica mínima (texto normal 16px, secundário 14px, badges 12–13px, campos
  mobile ≥16px para evitar zoom automático no Safari iOS).
- Aumentar áreas de toque para no mínimo 44×44px (preferencialmente 48×48px em ações frequentes).
- Padronizar `:focus-visible` em botões, links, tabs, cards acionáveis e campos.
- Padronizar diferenciação visual de estado `disabled`.
- Garantir `aria-label` em botões icon-only que hoje dependem só de `title`.
- Corrigir contrastes prioritários identificados no diagnóstico.

**Critério de conclusão**: informações essenciais permanecem legíveis sem zoom e ações frequentes
respeitam pelo menos 44×44px.

**Nota de dependência**: não depende do `DialogController` nem toca estrutura de diálogo — pode
rodar em paralelo/antes da Fase 0.1 se for conveniente, já que são áreas de código diferentes.

---

### Etapa 3 — Navegação e topo operacional ✅ CONCLUÍDA (2026-09-27, mergeada na `main` via PR #63 / `6910621`)

**Achados endereçados**: 4.2, 4.3, 4.14 (+ absorve Fase 0.3).

**Resultado real** (ver relatório `docs/plans/2026-09-27-plan-etapa-3-navegacao-e-topo-cartoes.md`):
- Cartões E/F/G + rodadas 2 e 3 no commit `7ccb736`; a correção do modal Área do usuário
  (rolagem interna + bottom-sheet, `66593c9`) e o gap entre ícone e texto nos botões `.btn`
  (`3bbf152`) entraram junto na mesma branch. Suítes medidas a cada rodada: 77/0 na de frontend.
- Barra inferior fixa (Home/Finanças/Alunos, alvos 134×52px) substituindo as 3 pílulas do topo —
  exceção donal confirmada: título "Prô Josy" e login Google permanecem na barra superior
  (`aria-current="page"` acompanha a navegação, o que atende parcialmente o 4.16).
- "Sincronizar Dados" (pergunta 4) e "Configurar Grade Horária" (2ª linha do modo Dia) migrados
  para a seção "Dados" do modal Área do usuário; o "Novo agendamento" da 2ª linha vira FAB
  dinâmico (`#fabNovoHome`) dos dois modos; rodapé da Home removido. Decisões fechadas na
  abertura da rodada pelo dono (perguntas 1 e 4 desta seção — ver seção 6).
- Safe areas sistêmicas: token `--bottombar-height` medido em runtime (safe area + altura da
  barra); FAB, toast e barra inferior ancorados no token; `viewport-fit=cover` no meta.
- Remoção da tarja "LOCAL" de ambiente local (rodada 3) — a confirmação de ambiente local passa
  a ser o log `[api-config] Ambiente detectado` no console.
- Números: topo da Home 309→211px @433×762 (−32%), header 122→68px, zero overflow horizontal nos
  3 viewports. Medição e anotações completas na seção "Registro da Etapa 3" do report.

**Escopo** (historial, mantido para rastreamento):
1. **Primeiro objetivo (herdado da Fase 0.3)**: remover Sincronizar Dados do fluxo superior
   primário e consolidar período/setas/Hoje em uma única barra.
2. Avaliar e decidir (não inferir) se haverá barra de navegação inferior fixa (Home, Finanças,
   Alunos) substituindo a barra superior atual — decisão de produto, ver seção 6, pergunta 1.
3. Aplicar safe areas de forma sistemática (barra inferior, FAB, toast como um sistema único).
4. Posicionar o botão flutuante acima da barra inferior, se ela for aprovada.
5. Preservar estado ativo semanticamente com `aria-current`.

**Critério de conclusão**: agenda e conteúdo principal ganham área vertical sem perder acesso às
três telas principais.

**Decisão de produto obrigatória antes de iniciar**: pergunta 1 da seção 6 — a barra inferior
substitui integralmente a navegação superior ou coexistirá em alguma tela?
→ **Fechada na abertura da rodada (2026-09-27)**: substitui integralmente (exceção: título e
login permanecem no topo); a pergunta 4 foi fechada na mesma rodada (migração para área
secundária → seção "Dados" do modal).

---

### Etapa 4 — Densidade de cards ⏳ PENDENTE (escopo reduzido)

**Achados endereçados**: 4.11 (4.10 já resolvido — ver tabela mestra e nota abaixo).

**Nota (2026-09-27)**: o achado 4.10 ("filtros apertados") saiu do escopo desta etapa. Os
filtros de Finças e de Alunos foram **removidos por completo** em duas rodadas isoladas
(Etapa 2, Cartão A, e hotfix de 2026-09-27), por decisão direta do dono, em vez de adaptados.
O que resta nesta etapa é só 4.11 (cards com informação excessiva).

**Escopo**: aplicar divulgação progressiva nos cards de Alunos/Finças/agenda; remover
redundâncias antes de truncar ou reduzir fonte (evitar reabrir o problema que a Etapa 2 acabou
de corrigir).

**Critério de conclusão**: cards continuam compreensíveis em 320–430px sem informação
redundante ou excessiva no primeiro nível.

---

### Etapa 5 — Agenda diária e colisões ✅ CONCLUÍDA (2026-09-27, mergeada na `main`)

> Plano: [`../plans/2026-09-27-plan-etapa-5-eventos-simultaneos.md`](../plans/2026-09-27-plan-etapa-5-eventos-simultaneos.md)
> · roadmap item **5.5** (`[x]`). Formato híbrido estilo Outlook: banda de 2 em colunas
> proporcionais, banda de 3+ em linhas empilhadas; fundo do modo Dia nivelado e esticado.

**Achados endereçados**: 4.12.

**Escopo**: prototipar alternativas para eventos simultâneos; escolher solução com teste visual
em dados extremos; preservar nome, horário e status no primeiro nível.

**Critério de conclusão**: dois a quatro eventos simultâneos permanecem distinguíveis e acionáveis
em 320px.

**Decisão de produto obrigatória antes de iniciar**: pergunta 3 da seção 6 — qual comportamento
deve ser adotado para eventos simultâneos na agenda diária?

---

### Etapa 6 — Estados assíncronos e recuperação ✅ CONCLUÍDO (2026-09-30)

> Implementado em 2026-09-29 na branch `feat/etapa-6-toast-unificado`, validado em produção
> pelo dono e mergeado na `main` via PR #66 (2026-09-30).

**Achados endereçados**: 4.8, 4.9.

**Pré-condição**: assume que a **Fase 0.1 (bug de `pointer-events` do toast) já está corrigida**
— confirmado, base preservada nesta etapa.

**Escopo original**:
- Corrigir overlay de erro bloqueante → preferir banner persistente e não bloqueante.
- Informar quando dados em cache estão sendo exibidos e quando foram atualizados.
- Oferecer retry junto ao erro.
- `role="status"` para sucesso e `role="alert"` para erro no toast; `aria-live` consistente.
- Padronizar skeletons e indicação de progresso de salvamento.

**Escopo ampliado na execução (decisão do dono, 2026-09-29)**: em vez de só corrigir os dois
achados isoladamente, os três mecanismos de feedback assíncrono do app (`#toast`,
`#overlay-sinc` bloqueante, `#indicador-sync-bg` silencioso) foram **unificados em um único
componente** com 4 estados visuais (`success`/`warning` auto-somem, `progress` fica até
resolver, `error` fica até ação com botão "Tentar de novo") — padrão Material Design 3
snackbar + diretrizes de erro da Nielsen Norman Group. Detalhe completo, arquivos alterados e
resultado da validação em
[`plans/2026-09-29-plan-etapa-6-toast-unificado.md`](../plans/2026-09-29-plan-etapa-6-toast-unificado.md).

**O que ficou resolvido**:
- Overlay bloqueante eliminado — nenhum estado trava mais `pointer-events` do `body`.
- `onRetry`, que existia morto em 4 pontos de chamada (`storage.js`,
  `cascade-sync-aluno.js`), agora está conectado ao botão real da UI.
- `role`/`aria-live` dinâmicos por estado (`status`/`polite` para progresso e sucesso,
  `alert`/`assertive` para erro).
- O sync automático do Google Calendar no boot (`iniciarSyncGoogleCalendarAutomatica`), que
  antes não acionava nenhum feedback, foi religado ao contexto `syncCalendario` do componente
  unificado.

**Validação em produção (concluída)**: o dono validou o comportamento no deploy Vercel com
login Google real e aprovou (2026-09-29/30) — a dúvida sobre o toast do sync do calendário ao
abrir o app (que o mock de UI local bloqueia e não permitiu observar fim-a-fim) foi resolvida
em uso real, sem mudança de decisão sobre a visibilidade do toast. Skeletons de carregamento e
indicação explícita de "dados em cache" (2 itens do escopo original) **não foram implementados
nesta rodada** — ficaram fora por não terem sido pedidos na decisão de escopo desta execução.
Em 2026-09-30 o dono decidiu executá-los **antes** da Etapa 7: viraram o item do roadmap
**5.8** (plano em `docs/plans/2026-09-30-plan-skeletons-cache.md`) — **executado na mesma
data** (Parte A: skeleton padronizado `.skeleton` + `aria-busy`; Parte B: rótulo "Sincronizando
dados..." no header, caminho B1 após a descoberta de que o boot com cache não dispara sync
remoto — detalhe na seção "Execução" do relatório) e **concluído**: mergeado na `main` via
PR #68, com validação visual do dono aprovada em 2026-10-01.

**Critério de conclusão original**: toda falha possui caminho de recuperação e nenhuma escrita é
apresentada como concluída antes da resposta da API. Retry e recuperação de erro: atendido.
Skeletons/indicação de cache: não implementados nesta rodada (ver parágrafo acima).

**Adição (2026-09-30, branch `feat/financas-toast-carregamento` — mergeada na `main` via
PR #67)**: decisão do dono — a tela
de finanças, a única do app que tinha loading local (skeleton) sem participar do toast
unificado, entrou no mecanismo compartilhado: o fetch de `carregarFinancas()` agora roda
via `executarOperacaoRemotaComFeedback` (contexto `carregandoFinancas`, toast de progresso
após 3s, falha continuando no tratamento local da tela). A etiqueta de última atualização
do cache (“Cache atualizado em ...”) permanece no cabeçalho. Validação do dono em produção:
aprovada em 2026-10-01. Ver relatório da Etapa 6 (seção “Adição — tela de finanças”).

---

### Etapa 7 — Consistência e acessibilidade final (ampliada) ⏳ PENDENTE

**Achados endereçados**: 4.6 (parte final — semântica de cards/tabs), 4.15, 4.16, **4.13 e 4.17
(órfãos endereçados nesta reescrita)**.

**Escopo original**:
- Completar semântica de tabs e navegação (`aria-current`, `role` apropriados).
- Completar `prefers-reduced-motion`.
- Validar teclado, leitor de tela e texto ampliado nos fluxos principais.

**⚠️ Escopo adicionado nesta reescrita — item 4.13**:
- Revisar o uso do amarelo como cor de estado. O diagnóstico aponta sobrecarga semântica (a
  mesma cor usada para significados diferentes conforme o contexto). Escopo mínimo: mapear todos
  os usos atuais de amarelo como indicador de estado, decidir um significado único por cor (ou
  introduzir uma cor adicional), e não depender exclusivamente de cor para nenhum estado
  (reforça o padrão já usado em finanças, ver seção 4, item 8).

**⚠️ Escopo adicionado nesta reescrita — item 4.17 (6 inconsistências específicas)**:
1. Mensagem de modo leitura escondida permanentemente pelo CSS mesmo com usuário desconectado
   — corrigir para exibir quando aplicável.
2. ✅ **Bug real de seletor** *(corrigido 2026-09-27 — hotfix isolado na `main`, ver
   `docs/reports/2026-09-27-hotfix-seletor-historico-reposicoes-grupo.md`)*: JS gera
   `.historico-reposicao-grupo`, CSS usava `.historico-reposicoes-grupo` — divergência de nome
   corrigida no CSS (ajustado para singular, consistente com as classes irmãs do bloco).
3. Textarea financeiro não compartilha integralmente estilo/foco de inputs e selects — padronizar.
4. Diferenciação global de botões desabilitados — reaproveitar o padrão já definido na Etapa 2 em
   vez de criar um novo.
5. Botões icon-only dependentes só de `title` sem nome acessível robusto — reaproveitar padrão
   `aria-label` já definido na Etapa 2.
6. Links de navegação com `href="#"` sem representar a tela ativa no histórico — decisão de
   produto (ver seção 6, pergunta 5) antes de implementar.

**Nota de sequenciamento interno**: os itens 4 e 5 do 4.17 são apenas "aplicar o padrão da
Etapa 2 nos lugares que ela não cobriu" — não é trabalho novo de design, é auditoria de cobertura.
O item 2 (bug de seletor CSS/JS) foi corrigido isoladamente em 2026-09-27, antes desta etapa, por
ser um bug isolado de 1 linha sem dependência de decisão de produto.

**⚠️ Item sugerido na execução da Etapa 6 (2026-09-29) — 7.1, consistência de nomenclatura de
retry**: a passada de textos do toast (post-validação em produção, ver
[`plans/2026-09-29-plan-etapa-6-toast-unificado.md`](../plans/2026-09-29-plan-etapa-6-toast-unificado.md))
encontrou dois nomes diferentes para a mesma ação de "tentar de novo" em pontos distintos do
app: o botão do **toast unificado** usa *"Tentar de novo"* (`utils-kpi.js`) e o botão do erro do
**histórico de reposições** (tela de alunos) já existia com *"Tentar novamente"*
(`view-alunos.js`, ao lado de "Não foi possível carregar o histórico."). Nenhum dos dois era o
texto em aprovação nessa rodada, por isso nenhum foi alterado. Sugestão: na Etapa 7, padronizar
a palavra em um único texto em todo o app (ou, se mantiver duas, documentar a regra de quando
cada uma se aplica — ex.: "tela" vs. "ação"). Escopo mínimo: grep por `Tentar` nas mensagens de
UI e alinhar.

**Progresso já acumulado (2026-09-27, verificado contra `git log`)**: os itens 4.17.4
(disabled) e 4.17.5 (aria-label icon-only) foram resolvidos de facto pelos cartões C e D da
Etapa 2 — o padrão é global e os 13 botões inventariados têm `aria-label`; o que resta na Etapa
7 é auditoria de cobertura (novos botões criados após o inventário), não trabalho novo.
O item 4.17.2 (bug de seletor) foi corrigido nesta mesma data, como hotfix isolado (ver relatório
linkado no item 2 acima) — não depende mais da execução da Etapa 7.

**Critério de conclusão**: os fluxos principais são operáveis sem toque e permanecem
compreensíveis com zoom/texto ampliado; nenhuma das 6 inconsistências do item 4.17 permanece;
uso de cor de estado é semanticamente consistente.

---

## 6) Decisões de produto pendentes (não inferir durante implementação)

Aplicável às etapas ainda não iniciadas (a Etapa 1 já teve suas decisões fechadas na seção 5,
tabela 10.0):

1. ~~A barra inferior (Etapa 3) substitui integralmente a navegação superior ou coexistirá em
   alguma tela?~~ → **Fechada na abertura da Etapa 3 (2026-09-27)**: substitui integralmente;
   título e login permanecem no topo por exceção donal.
2. Quais informações são indispensáveis no primeiro nível dos cards de agenda, aluno e finanças
   (Etapa 4)?
3. Qual comportamento desejado para eventos simultâneos na agenda diária (Etapa 5)?
4. ~~A sincronização manual deve permanecer exposta na Home ou migrar para área secundária
   (Etapa 3 / Fase 0.3)?~~ → **Fechada na abertura da Etapa 3 (2026-09-27)**: migra para área
   secundária — seção "Dados" no modal Área do usuário (junto com "Configurar Grade Horária").
5. A tela ativa deve sobreviver à recarga e participar do histórico Voltar/Avançar (Etapa 7,
   item 4.17.6)?
6. Amarelo como cor de estado: manter um único significado ou introduzir cor adicional
   (Etapa 7, item 4.13)?

Estas são decisões de experiência; não devem ser inferidas durante a implementação nem pelo
modelo executor (Qwen) nem pelo planejador.

---

## 7) Matriz mínima de validação mobile (válida para todas as etapas)

### 7.1 Viewports e estados obrigatórios

**Referência primária: 433×762 com DPR 2.81** — o smartphone real do dono; é o alvo de aceite.
Sempre com **emulação de mobile completa (toque, UA, mídia `pointer`/`hover`)**, nunca só
`setViewportSize` (seção 9 de `docs/setup-ambiente-local.md`). A tabela abaixo é complementar.

| Cenário | Objetivo |
| --- | --- |
| **433×762 (DPR 2.81)** | **Referência primária — smartphone real do dono** |
| 320×568 | Pior caso de largura e altura suportadas |
| 360×640 e 360×800 | Android compacto e alongado |
| 390×844 | iPhone atual de tamanho intermediário |
| 430×932 | Celular grande |
| Paisagem | Altura reduzida e barras do navegador |
| Teclado aberto | Campos e ações finais acessíveis |
| PWA standalone | Safe areas e elementos fixos |
| Texto do sistema ampliado | Reflow sem corte ou sobreposição |
| `prefers-reduced-motion` | Ausência de movimento não essencial |
| Offline/rede lenta | Cache, erro, retry e loading |

### 7.2 Dados de teste necessários

Nomes e locais longos; muitos alunos; valores financeiros grandes; observações extensas; dois a
quatro eventos simultâneos; cards de 30 minutos; listas vazias e listas filtradas sem resultado;
erro remoto com cache disponível e sem cache.

### 7.3 Ambiente recomendado

Servir o frontend pelo servidor estático do próprio repo (`node scripts/servir-local.js`,
substitui o Live Server desinstalado em 2026-10-01) e usar o runtime mockado em
`mocks/ui-runtime/` (preserva o frontend real, intercepta `/api/*`, bloqueia escritas,
remove caches locais):

```text
http://127.0.0.2:5500/index.html?mockScenario=default
```

Cenários disponíveis: `default`, `agendaLotada`, `densidadeAgenda`, `agendaSimultaneos`,
`alunosEmAtraso`, `vazio`, **`vitrineEstados`** (estados da Etapa 7), **`carregamentoLento`** e
**`desconectado`**. Flags: `?mockLatencia=<ms>` e `?mockFalha=<rotas>` (HTTP 500 simulado).
Detalhe em [`mocks/ui-runtime/README.md`](../../mocks/ui-runtime/README.md).

Checklist mínimo por ajuste:
1. Abrir a URL mockada em **433×762 com DPR 2.81 e emulação de mobile completa (toque, UA,
   mídia `pointer`/`hover`)** — referência primária; confirmar `dpr=2.81`, `ontouchstart` e
   `matchMedia('(pointer:coarse)')` antes de medir (seção 9 de `docs/setup-ambiente-local.md`).
2. Reproduzir o fluxo na tela afetada e verificar loading, erro, vazio e conteúdo preenchido.
3. Repetir em 320×568 e 390×844 (stress test); testar também teclado aberto quando houver formulário.
4. Confirmar que nenhuma ação de escrita altera dados reais.
5. Registrar cenário, viewport e resultado junto do relatório da etapa.

---

## 8) Fora de escopo (válido para todo este plano, todas as etapas)

- Introdução de framework, dependência ou build step.
- Otimização específica para desktop ou tablet.
- Redesign da identidade da marca.
- Alteração de recorrência, conflitos, autenticação, Google Calendar ou sincronização em cascata,
  salvo confirmação explícita e isolada para essa mudança específica.
- Substituição de `alert()`/`confirm()` nativos sem decisão expressa em contrário.
- Definição unilateral de qualquer decisão listada na seção 6 por parte do modelo executor.

---

## 9) Anexo — template de cartão incremental para execução assistida por modelo on-premises

Ao converter qualquer etapa/subetapa deste documento em execução, use o formato abaixo por
tarefa, preenchido por um passo de extração separado do passo de execução.

**Granularidade esperada**: cada etapa deve ser decomposta em uma sequência de cartões pequenos,
até que a soma deles complete todo o seu escopo. Cada cartão deve representar uma única correção
coerente, revisável e validável de forma independente — pequena o suficiente para normalmente
resultar em um único commit. A relação não é uma obrigação mecânica: o cartão guia o incremento,
e o commit correspondente é criado pelo dono do repositório conforme a política de branch. Não
agrupar vários achados independentes no mesmo cartão apenas por pertencerem à mesma etapa.

```markdown
# Tarefa: <nome curto>

## Objetivo (1 frase)
...

## Referência da decisão
<seção/decisão deste documento que autoriza a tarefa, ex.: "Etapa 2", "achado 4.17.2">

## Arquivos a tocar
- ...

## Passos
1. ...

## Fora de escopo (não fazer)
- ...

## Validação obrigatória (Playwright)
- Viewport 320x568: <ação> → <resultado esperado>
- Viewport 390x844: <ação> → <resultado esperado>
- Comando de teste: `...`

## Critério de aceite (checklist binário)
- [ ] ...
- [ ] Testes automatizados passam (registrar contagem antes/depois)
- [ ] Nenhuma regra de negócio alterada

## Commit sugerido
<tipo>(<escopo>): <mensagem>
```

**Regra de uso**: primeiro, gerar todos os cartões incrementais necessários para cobrir a etapa,
mantendo explícita a ordem entre eles quando houver dependência. O modelo que gera os cartões só
recebe a etapa/achado relevante deste documento, nunca o documento inteiro. O modelo que executa
só recebe o cartão da vez. Uma etapa só é concluída quando todos os seus cartões e a validação
integrada final tiverem sido concluídos.
