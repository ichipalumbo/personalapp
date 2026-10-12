# Plano — Cobertura automatizada do render do Dia + lacunas vizinhas (item 0.12)

> **Status**: aberto — T01–T03 executados (2026-10-12); T04–T07 pendentes
> **Abertura**: 2026-10-12
> **Responsável**: dono do repositório + agente
> **Branch**: `feat/cobertura-render-conflitos-modais`
> **Diagnóstico de origem**: nenhum (frente de cobertura). Origem técnica: [`2026-09-27-plan-etapa-5-eventos-simultaneos.md`](2026-09-27-plan-etapa-5-eventos-simultaneos.md) — regra das bandas da Etapa 5
> **Válido contra**: `3fc25f0` (main)

> **Este arquivo é vivo.** Enquanto o item estiver aberto, ele recebe decisões, execução, medições e desvios — não crie relatório separado para "o depois". Depois de fechado, não é reescrito: correção posterior gera documento novo.

---

## 1. Objetivo

Cobrir com testes automatizados, na suíte de frontend (`node --test` + `jsdom`), a camada hoje sem execução automatizada: o render da visão Dia (`renderizarAgendaDia` em `view-home.js` + `agenda-card-template.js`), o módulo `agenda-conflitos.js` e os fluxos principais dos modais (`modal-agendamento.js` e `modal-acao-slot.js`) — **sem alterar nenhuma regra de produção**. Resultado observável: mutações nas regras cobertas (bandas 2 vs 3+, dedup de banda, ordem das linhas) derrubam testes; o código atual permanece verde.

## 2. Critérios de aceite

- [ ] Render do Dia coberto no jsdom: fumaça (grade + card) e regras de banda (T02–T04).
- [ ] `agenda-conflitos.js`: coberto o que o inventário (T01) apontar como descoberto, **sem duplicar** a suíte de backend existente.
- [ ] Modais: fluxos principais + um caminho de erro/validação por modal (decisão 1 = B) (T06–T07).
- [ ] Cada teste novo provado por mutação — tabela da §11 preenchida com resultado observado e restauração conferida.
- [ ] Nenhum arquivo de produção alterado; se um alvo se provar intestável sem mudar produção, parar e escalar decisão (não refatorar por conta própria).
- [ ] Números de suíte medidos antes/depois registrados na §12; lacunas residuais declaradas na §10.

## 3. Decisões fechadas

| Decisão | Data | Responsável | Consequência técnica |
|---|---|---|---|
| Escopo ampliado para as lacunas vizinhas: render do Dia + `agenda-conflitos.js` + modais | 2026-10-12 | dono | plano com 8 cartões; modais entram com fluxos principais |
| Branch única para plano + implementação: `feat/cobertura-render-conflitos-modais` | 2026-10-12 | dono | sem branch só-docs; PR único para a frente |
| Roadmap 0.12 → `[~]` com link para este plano | 2026-10-12 | dono | rastreabilidade no documento vivo |

## 4. Decisões pendentes

| # | Pergunta | Opções | Bloqueante? |
|---|---|---|---|
| 1 | Profundidade dos modais | **Resolvida no T01 (2026-10-12)**: **B** — fluxos principais + um caminho de erro/validação por modal | — |
| 2 | Se um teste revelar defeito real de produção | A: corrigir nesta frente (com aprovação); B: registrar na §13 e virar item novo | não — só se ocorrer |

## 5. Escopo

- **Arquivos novos** (confirmados no T01): `tests-frontend/render-dia.test.js`, `tests-frontend/agenda-conflitos.test.js`, `tests-frontend/modal-agendamento.test.js`, `tests-frontend/modal-acao-slot.test.js`; `tests-frontend/setup/` **apenas se** houver reuso entre os novos arquivos.
- **Documentos**: este plano; `docs/roadmap.md` (link/status).
- **Comportamentos que podem mudar**: nenhum em tela ou regra; passa a existir rede de proteção no render/conflitos/modais.

## 6. Fora de escopo

- Refatorar `view-home.js` ou os modais para "testabilidade" — só com decisão explícita, se inevitável.
- Cobertura visual real: pixels, ellipsis, clipping e contraste — permanece manual (433×762 referência; 390×844 e 320×568 stress).
- Modo Semana (`renderizarHomeSemana`), Finanças e telas `view-*` (ficam para o item 3.1).
- Backend, CSS, GCal real, rede e migração de dados.

## 7. Invariantes a preservar

- **Produção intocada**: nenhuma mudança de comportamento em `assets/js/*` sem aprovação.
- Regras da Etapa 5 preservadas como contrato do render: banda 2 → colunas/Outlook; banda 3+ → linhas/contêiner; dedup por componente; dia inteiro fora do grafo; ordem por início com tie-break de fim.
- Cards acionáveis continuam `<button>`; evento GCal externo continua `<div>` sem foco.
- Suíte existente verde; testes determinísticos (data fixa em fixture; sem rede real; usar data passada em `dataSelecionada` para o indicador de hora atual não interferir).

## 8. Baseline

- Branch `feat/cobertura-render-conflitos-modais` criada de `origin/main` (`3fc25f0`) em 2026-10-12; working tree limpo na abertura.
- **Suíte frontend antes**: **337/337** (medido em 2026-10-11) — reconferir na execução.
- **Suíte backend**: **232/232** (medido em 2026-10-11); não afetada, salvo se um cartão tocar arquivo do backend — aí medir de novo.
- Reprodução de defeito: não se aplica (frente de cobertura).
- **Condição de parada**: baseline divergente → medir de novo e registrar na §12 antes de prosseguir.

## 9. Cartões de tarefas

A implementação deve **concluir, validar e registrar um cartão antes de avançar ao próximo**, respeitando as dependências. Cada cartão fecha com a validação medida registrada na §12 e as mutações da §11 preenchidas.

### Cartão T01 — Inventário de cobertura existente e harnesses por alvo
- **Objetivo / resultado**: tabela "coberto × descoberto" dos três alvos + harness decidido por alvo, registrados neste plano.
- **Depende de**: —
- **Arquivos / componentes prováveis**: leitura apenas — `tests-frontend/**`, `backend/test/**`, `assets/js/view-home.js`, `assets/js/agenda-conflitos.js`, `assets/js/modal-agendamento.js`, `assets/js/modal-acao-slot.js`, `assets/js/agenda-card-template.js`.
- **Inclui**: mapear padrões aproveitáveis (`tests-frontend/setup/carregar-frontend.js`, harnesses `ambiente()` do d1/d3, harnesses `vm` de GCal no backend); listar os globais exigidos por `renderizarAgendaDia` (`contextoDados`, `agendaConfig`, `dataSelecionada`, `getDiaTextoSelecionado`, `getAluno`, `ehBloqueioDiaInteiroCompromisso`, `criarCardAgendamento`, `checarCompromissoNaData`) e por cada modal; registrar o inventário já conhecido na abertura (ver §13): conflitos e modais têm cobertura **parcial** na suíte de backend (`backend/test/agenda-conflitos.test.js` cobre serialização, UNTIL, `ignorarIds` e conflito externo; `gerarResumoConflitosDatas` não aparece coberto; `modal-agendamento.js` e `modal-acao-slot.js` são carregados por harnesses `vm` de GCal); o render do Dia **não tem nenhuma execução automatizada** (`renderizarAgendaDia` não aparece em `tests-frontend/`).
- **Não inclui**: escrever testes; alterar qualquer arquivo fora de `docs/`.
- **Decisões pendentes / bloqueios**: resolve a decisão pendente 1 (profundidade dos modais).
- **Critérios de aceite**: inventário preenchido no plano; harness escolhido para cada alvo; decisão 1 resolvida e registrada.
- **Validação**: revisão documental contra o código; nenhum teste executa.
- **Riscos e rollback**: nenhum (somente leitura).
- **Limite de tentativas**: no máximo 2. Na segunda falha, registrar a falha e seguir.

### Cartão T02 — Fumaça: `renderizarAgendaDia` desenha a grade com um card
- **Objetivo / resultado**: primeiro teste executando o render ponta a ponta em jsdom: grade montada + card de aula posicionado.
- **Depende de**: T01.
- **Arquivos / componentes prováveis**: `tests-frontend/render-dia.test.js` (nome confirmado no T01).
- **Inclui**: ambiente jsdom com scripts na ordem do `index.html` (módulos reais: `recurrence-helpers`, `calendario-engine`, `utils-datetime`, `widget-bloqueio`, `agenda-card-template`, `view-home`) e stubs explícitos e registrados para o resto; fixture com `agendaConfig` explícito, `dataSelecionada` em data passada e 1 aula; asserts: `.time-grid-wrapper` presente; exatamente 1 `.agenda-dia-aula`; `style` com `top`/`height` coerentes com a grade da fixture; ausência de `.formato-outlook`/`.formato-linha`; `onclick="abrirModalAcaoSlot('id')"` preservado.
- **Não inclui**: bandas (T03), bordas (T04), tipos não-aula.
- **Decisões pendentes / bloqueios**: nenhum.
- **Critérios de aceite**: teste verde no código atual; mutação "suprimir a emissão do card no ramo sem banda" derruba o teste.
- **Validação**: `node --test` em `tests-frontend/` antes/depois; mutação revertida e conferida com `git status`.
- **Riscos e rollback**: o render pode exigir mais globais que o previsto → stub mínimo explícito, sem "consertar" produção; rollback é apagar o arquivo de teste.
- **Limite de tentativas**: no máximo 2. Na segunda falha, registrar a falha e seguir.

### Cartão T03 — Regras das bandas: 2 vs 3+, dedup, ordem e dia inteiro
- **Objetivo / resultado**: travar a regra da Etapa 5 com testes que falham sob cada mutação correspondente.
- **Depende de**: T02.
- **Arquivos / componentes prováveis**: `tests-frontend/render-dia.test.js`.
- **Inclui** (fixtures/asserts): dupla com sobreposição parcial → 2 `.formato-outlook`, `left: 0%` e `left: 50%`, `width: calc(50% - 4px)`, sem `.agenda-banda-grupo`; tripla encadeada → exatamente 1 `.agenda-banda-grupo` com 3 `.formato-linha` na ordem (início; empate → fim), `top` do contêiner = menor início e `height` = span até o maior fim; par com início igual → 2 colunas (não vira linha); bloqueio de dia inteiro + aulas → dia inteiro com largura total, sem `formato-*` e fora de contêiner; evento sem banda → posicionamento absoluto direto.
- **Não inclui**: densidade/estilo visual.
- **Decisões pendentes / bloqueios**: nenhum.
- **Critérios de aceite**: cada mutação da §11 (linhas de T03) derruba o teste correspondente; suíte verde depois de restaurada.
- **Validação**: `node --test`; mutações revertidas; `git status` conferido.
- **Riscos e rollback**: asserts são sobre `style` inline e classes (contrato do render), não sobre pixels — declarado na §10.
- **Limite de tentativas**: no máximo 2. Na segunda falha, registrar a falha e seguir.

### Cartão T04 — Bordas do render: dia vazio, tipos e volume
- **Objetivo / resultado**: cobrir bordas estruturais sem prometer validação visual.
- **Depende de**: T03.
- **Arquivos / componentes prováveis**: `tests-frontend/render-dia.test.js`.
- **Inclui**: dia sem eventos → grade renderiza e 0 cards; 7 eventos de 30 min no mesmo span → 1 contêiner e 7 linhas (clipping visual não é provado em jsdom — declarado); GCal externo em banda → `<div>` sem `onclick` com `.formato-linha`; deslocamento/bloqueio interno → `<button>`; unicidade: cada id exatamente 1× no DOM.
- **Não inclui**: textos/densidade específicos.
- **Decisões pendentes / bloqueios**: nenhum.
- **Critérios de aceite**: teste de unicidade derruba sob mutação "pular eventos no loop das linhas".
- **Validação**: `node --test`; mutação revertida.
- **Riscos e rollback**: nenhum além do precedente.
- **Limite de tentativas**: no máximo 2. Na segunda falha, registrar a falha e seguir.

### Cartão T05 — `agenda-conflitos.js`: cobrir o descoberto sem duplicar
- **Objetivo / resultado**: fechar as lacunas do módulo apontadas no T01 (previsão: `gerarResumoConflitosDatas` e caminhos não cobertos de `getConflitosNoDia`).
- **Depende de**: T01.
- **Arquivos / componentes prováveis**: `tests-frontend/agenda-conflitos.test.js` (novo — decidido no T01; suíte de backend intocada); duplicar teste existente é proibido.
- **Inclui**: colisão parcial/total/adjacente, `ignorarIds`, label de evento externo (`[Google Agenda]`), resumo com limite 6 + "e mais N" e dedupe de datas.
- **Não inclui**: reescrever cobertura já existente.
- **Decisões pendentes / bloqueios**: T01 decide o arquivo-alvo.
- **Critérios de aceite**: cobertura nova verde; nenhum teste existente removido.
- **Validação**: mutações "inverter `inicioA < fimB && inicioB < fimA`" e "limite 6→5 no resumo"; `node --test`.
- **Riscos e rollback**: se o inventário mostrar cobertura integral pela suíte backend, o cartão se reduz a registrar a decisão de não duplicar e o escopo volta ao dono.
- **Limite de tentativas**: no máximo 2. Na segunda falha, registrar a falha e seguir.

### Cartão T06 — `modal-agendamento.js`: fluxo principal de criação
- **Objetivo / resultado**: cobrir abertura e submissão do agendamento único com o serializer real.
- **Depende de**: T01.
- **Arquivos / componentes prováveis**: `tests-frontend/modal-agendamento.test.js` (novo), em jsdom com DOM real (decidido no T01); o harness de `backend/test/gcal-persistencia-criacao-agendamento.test.js` serve de referência de cenários e mapa de dependências — arquivos do backend intocados.
- **Inclui**: abrir via `abrirAgendamentoModal(dia, hora, tipo)` (entrada decidida no T01; escolha inicial de tipo/FAB ficam fora — §10); preencher campos mínimos; submeter com `salvarDados` stubado; assert do payload serializado e do fechamento; um caminho de erro/validação (decisão 1 = **B**): submissão inválida não grava e dá feedback.
- **Não inclui**: recorrência completa (fora pelo T01 — declarada na §10) e GCal.
- **Decisões pendentes / bloqueios**: nenhum (profundidade resolvida no T01: **B**).
- **Critérios de aceite**: fluxo feliz e caminho de erro/validação cobertos; as mutações da §11 (linhas de T06) derrubam os testes correspondentes.
- **Validação**: `node --test` antes/depois; stub registrado; mutação revertida.
- **Riscos e rollback**: superfície de dependências grande (state/storage/widgets/conflitos/serializer) — harness carrega módulos reais e documenta os stubs; rollback é apagar o teste.
- **Limite de tentativas**: no máximo 2. Na segunda falha, registrar a falha e seguir.

### Cartão T07 — `modal-acao-slot.js`: edição e cancelamento de aula avulsa
- **Objetivo / resultado**: cobrir abrir → editar → salvar e cancelar/fechar sem escrita.
- **Depende de**: T01; T06 (harness pode ser compartilhado).
- **Arquivos / componentes prováveis**: `tests-frontend/modal-acao-slot.test.js` (novo).
- **Inclui**: `abrirModalAcaoSlot(id)` com aula avulsa; alteração de campo simples (ex.: horário/descrição) com `salvarDados` stub e payload assertado; um caminho de erro/validação (decisão 1 = **B**): aviso de conflito na edição (mecânica exata a confirmar na execução); confirmações stubadas; fechar/cancelar sem chamada de escrita.
- **Não inclui**: split de série e fluxo de reposição/reagendamento (decidido no T01: já cobertos pela suíte de backend; sem duplicar).
- **Decisões pendentes / bloqueios**: nenhum — T01 decidiu que split/reposição ficam fora.
- **Critérios de aceite**: as mutações da §11 (linhas de T07) derrubam os testes; nenhum modal empilhado no caminho de cancelamento.
- **Validação**: `node --test` antes/depois; mutação revertida.
- **Riscos e rollback**: mesmo perfil do T06; residuais declarados se fora pelo T01.
- **Limite de tentativas**: no máximo 2. Na segunda falha, registrar a falha e seguir.

### Cartão T08 — Fechamento: medição final, matriz de mutações e roadmap
- **Objetivo / resultado**: consolidar §11/§12, medir a suíte final e atualizar o status do item 0.12 no roadmap.
- **Depende de**: T02–T07.
- **Arquivos / componentes prováveis**: este plano; `docs/roadmap.md`.
- **Inclui**: rodar as duas suítes e registrar os números; preencher a §11 com resultados observados; atualizar o roadmap (0.12 → `[x]` se os critérios forem atendidos; senão registrar pendências na §15); preencher a §15.
- **Não inclui**: relatório separado.
- **Decisões pendentes / bloqueios**: decisão 2 (defeito revelado), se ocorrer.
- **Critérios de aceite**: §11/§12 completas; roadmap atualizado.
- **Validação**: números medidos nas duas suítes.
- **Riscos e rollback**: nenhum.
- **Limite de tentativas**: no máximo 2. Na segunda falha, registrar a falha e seguir.

### Inventário T01 — cobertura existente × descoberta (2026-10-12)

Levantado por leitura da suíte e do código; nenhum teste novo executado neste cartão. Fatos verificados no código atual.

**Alvo 1 — Render do Dia (`view-home.js` + `agenda-card-template.js`)**

- **Coberto hoje**: nada. `renderizarAgendaDia` não aparece em `tests-frontend/`; nenhum teste executa o render.
- **Descoberto**: tudo — grade (horas, labels, linhas, slots), posicionamento absoluto dos cards, bandas 2 vs 3+, dedup de banda (`gruposVistos`), dia inteiro fora do grafo, tipos (`<button>` interno vs `<div>` GCal externo), unicidade de ids, indicador de hora atual, dirty-check (`_ultimaChaveRenderAgenda`).
- **Dependências reais do render** (verificado no código): `contextoDados.atual/capturar` (early-return), `getDiaTextoSelecionado` (`utils-datetime`), `agendaConfig` e `aulas` (lexicais do `state.js`), `checarCompromissoNaData` (`calendario-engine`), `getAluno` (`alunos-helpers`, opcional), `ehBloqueioDiaInteiroCompromisso` (`widget-bloqueio`), `criarCardAgendamento` (`agenda-card-template`), `dataSelecionada` (declarado em `view-home.js:15`), `grid.clientWidth`/`innerWidth` (heurística de densidade — em jsdom: 0 → fallbacks determinísticos).
- **Harness decidido**: JSDOM + `vm.runInContext` via `dom.getInternalVMContext()` (padrão do `d1-hidratacao-render.test.js`), com módulos reais na ordem do `index.html` — `state` → `app-shell/contexto-dados` (pelo `tests-frontend/setup/contexto-dados.js`) → `utils-datetime` → `recurrence-helpers` → `alunos-helpers` → `calendario-engine` → `widget-bloqueio` → `agenda-card-template` → `view-home` (conjunto mínimo exato validado na prática do T02). Stubs apenas de `googleIdentity` (pelo setup); sem rede. Data fixa no passado (indicador de hora atual e scroll ficam fora do caminho); grid com id `agendaGridHomeHome` (call site `view-home.js:192`); escritas nos lexicais (`aulas`, `agendaConfig`) por script no contexto.

**Alvo 2 — `agenda-conflitos.js`**

- **Coberto hoje (parcial)** — 5 testes em `backend/test/agenda-conflitos.test.js`: `getCompromissoSerializadoParaConflito` (fim de série/UNTIL/quantidade), série aparada não conflita com a própria continuação (via `getDatasConflitoRecorrencia` + `getConflitosRecorrenciaEmDatas`), `ignorarIds` de família preservando conflito real com outro aluno (`getConflitosNoDia`).
- **Descoberto**: `gerarResumoConflitosDatas` (0 testes: dedupe de datas, limite 6 + "e mais N"); labels de `getConflitosNoDia` (nome do aluno, fallback "Aula", `[Google Agenda]` para `google_external`, descrição genérica); adjacência (fim == início NÃO conflita) e sobreposição parcial/total; `aulas` ausente/não-array → `[]`; escopo legado `monthOfDate` (corte de 40 dias) em `getDatasConflitoRecorrencia`; dedupe de datas de entrada em `getConflitosRecorrenciaEmDatas`.
- **Harness decidido**: `tests-frontend/agenda-conflitos.test.js` **novo** (lógica é de frontend pura — seção 10 das instruções), reusando `tests-frontend/setup/carregar-frontend.js` (`criarAmbiente` + `carregarScripts`) com `recurrence-helpers` → `state` → `utils-datetime` → `alunos-helpers` → `calendario-engine` → `agenda-conflitos`; `aulas`/`alunos` por script no contexto. Backend intocado; os 5 testes existentes não são duplicados.

**Alvo 3 — Modais (`modal-agendamento.js`, `modal-acao-slot.js`)**

- **Coberto hoje (parcial, suíte do backend, harness `vm` com DOM falso)**:
  - `gcal-persistencia-criacao-agendamento.test.js` (8 testes): criação feliz via `abrirAgendamentoModal` → submit (operação real do `contextoDados` + serializer real `scheduling-serializer.js`); fechar pelo botão (`DialogController` stubado); cancelar sem/com alteração (confirmação); clique no fundo da recorrência; falha de gravação com/sem GCal (rollback + toast + reabre preenchido + pendência).
  - `gcal-duplicata-fix.test.js`: harness `criarHarnessModalAcaoSlot` (linha 217) usado por dezenas de testes (linhas 1483–2592+) — abrir/fechar `modalAcaoSlot` com `DialogController` stubado e submits de edição (splits `fromDate`, reagendamento, reposição) com conflitos **stubados** (registram `ignorarIds` recebidos).
- **Descoberto**: qualquer execução com **DOM real** (classList, foco, visibilidade verdadeiros), integração com o `agenda-conflitos` real (aviso de conflito na tela), pré-preenchimento dos campos nos elementos, steppers/limites reais (`widget-stepper-duracao`), validação de formulário, `DialogController` real, edição avulsa "salvar" com payload pelo serializer real; e, sem cobertura em nenhuma das duas suítes, a escolha inicial de tipo (`abrirEscolhaTipoModal`/`selecionarTipoAgendamento`) e o FAB de novo agendamento (`abrirNovoAgendamento`) — verificados por busca.
- **Harness decidido**: JSDOM padrão D1 (DOM real) + módulos reais na ordem do `index.html` (inclui `storage`, `utils-ui`, widgets, `features/modals/scheduling-flow-state`, `features/modals/scheduling-serializer`, `features/modals/dialog-controller`); stubs registrados apenas de: escrita (`window.salvarDados` assignado), `gcal.isSignedIn → false`, `mostrarToast` (captura), `confirm` (não implementado no jsdom), `inicializarHome`. Cenários do harness do backend servem de referência; arquivos do backend intocados.

**Decisões tomadas no T01**: profundidade dos modais = **B** (fluxos principais + um caminho de erro/validação por modal); T05 na suíte de frontend (arquivo novo); split/reposição ficam fora dos testes de frontend do T07 (já cobertos pela suíte de backend); mutações dos modais definidas na §11.

## 10. Matriz de validação

| Tipo | O que cobre | Onde | Observação |
|---|---|---|---|
| Automatizada | Render do Dia (fumaça, bandas, bordas), conflitos descobertos, fluxos principais dos modais | `tests-frontend/` (`node --test` + jsdom) | núcleo da frente |
| Integração | Modais com serializer/state reais e `salvarDados` stubado; render com `agenda-card-template` real | `tests-frontend/` | stubs registrados no T01 |
| Manual | Pixels, ellipsis, clipping, contraste nos viewports 433×762 / 390×844 / 320×568 | Browser (mock) | **permanece manual** — não reproduzível em jsdom |
| Negativos | Dia vazio; unicidade de cards; payload inválido nos modais | `tests-frontend/` | parte dos cartões |

**Não coberto por esta validação**: CSS computado e layout real, animações, modo Semana, Finanças, telas `view-*`, GCal real e backend; ficam fora desta frente a escolha inicial de tipo/FAB (`abrirEscolhaTipoModal`/`abrirNovoAgendamento`) e o fluxo completo de criação recorrente (parcialmente coberto no backend).

## 11. Prova por mutação

| Mutação aplicada | Teste que deve falhar | Resultado observado | Restaurado? |
|---|---|---|---|
| Suprimir a emissão do card no ramo sem banda | T02 — fumaça | falhou como esperado (0 cards; esperado 1) | sim |
| Limiar de banda `>= 3` → `>= 2` | T03 — dupla vira linha | falhou como esperado (dupla/início-igual sem Outlook: 0 ≠ 2) | sim |
| Remover o dedup `gruposVistos` | T03 — contêiner único por banda | falhou como esperado (3 contêineres; esperado 1) | sim |
| Remover o tie-break `|| a.end - b.end` | T03 — ordem das linhas | falhou como esperado (tri-a antes de tri-b) | sim |
| Incluir dia inteiro no grafo de sobreposição | T03 — dia inteiro | falhou como esperado (bloqueio ganhou formato Outlook) | sim |
| Pular eventos no loop das linhas | T04 — unicidade/contagem | — | — |
| Inverter `inicioA < fimB && inicioB < fimA` | T05 — colisão | — | — |
| Limite 6 → 5 em `gerarResumoConflitosDatas` | T05 — resumo | — | — |
| Omitir um campo do payload no `serializarRascunhoAgendamento` | T06 — fluxo feliz | — | — |
| Suprimir a validação de submissão inválida (sem aluno) | T06 — erro/validação (decisão 1 = B) | — | — |
| Descartar o novo horário no salvar da edição avulsa | T07 — fluxo feliz | — | — |
| Suprimir o aviso de conflito na edição avulsa | T07 — erro/validação (decisão 1 = B) | — | — |

*Mutações dos modais: o ponto exato (função/ramo) é localizado no início de T06/T07; se o mecanismo no código for outro, o ajuste é registrado na §12.*

## 12. Registro da execução

### 2026-10-12 — Abertura do plano
- **Arquivos alterados**: `docs/plans/2026-10-12-plan-cobertura-render-conflitos-modais.md` (novo); `docs/roadmap.md` (0.12 → `[~]` + link; data do documento).
- **Resultado**: plano registrado com escopo ampliado (decisão do dono); branch `feat/cobertura-render-conflitos-modais` criada de `origin/main` (`3fc25f0`).
- **Suíte antes/depois**: não se aplica (somente documentação).
- **Desvio do plano**: —
- **Decisão adicional tomada**: —

### 2026-10-12 — T01 executado (inventário)
- **Arquivos alterados**: este plano (inventário na §9; decisão 1 na §4; mutações na §11; achados na §13).
- **Resultado**: inventário dos 3 alvos registrado — render sem nenhuma execução automatizada; conflitos com cobertura parcial (5 testes no backend) e lacunas listadas; modais com cobertura parcial via harnesses `vm` de DOM falso. Harnesses decididos por alvo; decisão pendente 1 resolvida (**B** — fluxos principais + um caminho de erro/validação por modal); T05 na suíte de frontend (arquivo novo; backend intocado).
- **Suíte antes/depois**: não se aplica (somente leitura + este plano).
- **Desvio do plano**: nenhum.
- **Decisão adicional tomada**: split/reposição ficam fora do T07 (já cobertos no backend); fluxo completo de criação recorrente e escolha inicial de tipo/FAB declarados fora da frente (§10).

### 2026-10-12 — T02 executado (fumaça do render)
- **Arquivos alterados**: `tests-frontend/render-dia.test.js` (novo); mutação temporária revertida em `assets/js/view-home.js` (arquivo sem alteração final — conferido no git).
- **Resultado**: primeiro teste executando `renderizarAgendaDia('agendaGridHomeHome')` em jsdom com módulos reais — grade montada (altura 1536px em grade 06:00–22:00 injetada), card único `<button>` posicionado (top 288px / height 96px), `onclick` de ação e ausência de formato de banda verificados. Prova por mutação: a supressão do card no ramo sem banda derruba exatamente o assert do card (0 ≠ 1).
- **Suíte antes/depois**: frontend **337/337 → 338/338** (medidos em 2026-10-12); pós-reversão da mutação reconfirmado 338/338.
- **Desvio do plano**: nenhum.
- **Decisão adicional tomada**: fixture usa `agendaConfig` 06:00–22:00 (≠ padrão 07–21) para provar que o estado injetado dirige o render.

### 2026-10-12 — T03 executado (regras das bandas)
- **Arquivos alterados**: `tests-frontend/render-dia.test.js` (+4 testes); quatro mutações temporárias em `assets/js/view-home.js`, todas revertidas (arquivo sem alteração final — conferido no git).
- **Resultado**: bandas travadas — dupla parcial e par com início igual em colunas Outlook (`left` 0%/50%, `width` `calc(50% - 4px)`, sem contêiner); tripla em contêiner único com 3 linhas na ordem início/desempate-por-fim e hora comprimida; dia inteiro fora do grafo, largura total e sem formato. Um assert do próprio teste foi corrigido na execução (altura do dia inteiro: 1536px, não 960px — confusão minutos×px do teste, não do render).
- **Suíte antes/depois**: frontend **338/338 → 342/342** (medidos em 2026-10-12); pós-reversão das mutações reconfirmado 342/342.
- **Desvio do plano**: nenhum.
- **Decisão adicional tomada**: —

## 13. Achados não alterados

| Risco/achado | Por que não foi tratado | Destino | Dono |
|---|---|---|---|
| Cobertura **parcial** de `agenda-conflitos.js` e dos modais já existe na suíte de backend (harnesses `vm` de GCal) — a declaração "segue sem cobertura" do item 3.1/instruções precisa de releitura quando o 3.1 for executado | verificado na abertura; fora do escopo desta frente corrigir a redação do 3.1 | roadmap 3.1 (na execução dele) | dono |
| `gerarResumoConflitosDatas` sem cobertura — **confirmado no T01** (0 testes) | levantamento inicial | este plano (T05) | — |
| Escolha inicial de tipo/FAB (`abrirEscolhaTipoModal`/`abrirNovoAgendamento`) e fluxo completo de criação recorrente sem cobertura | fora do escopo contido de T06/T07 (decisão 1 = B cobre erro/validação, não variantes de abertura) | declarado na §10; avaliar em rodada futura | dono |

## 14. Deploy e rollback

- **Efeito externo**: nenhum — `tests-frontend/` é excluída do deploy Vercel (`.vercelignore`) e o restante são docs.
- **Ordem de publicação**: PR da branch quando o dono decidir.
- **Verificação pós-deploy**: não se aplica (sem mudança de runtime).
- **Limite do rollback**: `git revert` resolve por completo (sem estado externo).

## 15. Fechamento

- **Critérios atendidos**: —
- **Pendências**: —
- **Riscos aceitos**: —
- **Data de fechamento**: —
