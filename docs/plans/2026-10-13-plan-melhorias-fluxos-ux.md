# Plano — Melhorias de clareza e fluidez: Semana, Reposições e Financeiro

> **Status**: aberto
> **Abertura**: 2026-10-13
> **Responsável**: dono do repositório + agente
> **Branch**: `diag/auditoria-fluxos-ux`
> **Diagnóstico de origem**: [`docs/diagnostics/2026-10-13-diag-auditoria-fluxos-ux.md`](../diagnostics/2026-10-13-diag-auditoria-fluxos-ux.md)
> **Válido contra**: `2041d08` (branch `diag/auditoria-fluxos-ux`; working tree limpo)

> **Este arquivo é vivo.** Enquanto o item estiver aberto, ele recebe decisões, execução, medições e desvios. Não crie relatório separado para "o depois". Depois de fechado, não é reescrito: trabalho posterior gera documento novo.

---

## 1. Objetivo

Tratar os sete pontos de atrito do diagnóstico (cabeçalho com data errada nos modais de escolha, pagamento sem valor/congelamento, ajuste sem efeito visível, rolagem perdida ao fechar modal, textos desatualizados, financeiro sem recuperação, histórico de reposições que mostra "nenhuma" durante o carregamento), conforme as decisões do dono, **sem alterar nenhuma regra de negócio**. Resultado observável: as mudanças aprovadas ficam claras e funcionais no mock, com as suítes afetadas verdes antes e depois de cada cartão; tratamentos parciais e adiamentos ficam explícitos, sem declarar resolvido um achado remanescente.

## 2. Critérios de aceite

Os critérios de implementação se aplicam aos cartões liberados e à opção aprovada. **Corrigido** significa atender integralmente ao achado; **parcialmente tratado** exige registrar o que permanece; **adiado** não autoriza implementação nem conta como correção. Toda decisão de não alterar deve ser registrada nas §12/§13.

- [x] F1 conforme D1/D9 (T01 executado em 2026-10-13 — provas na §11 e registro na §12): modais de escolha exibem **data e horário da ocorrência clicada** e **nome do aluno**; formatação aplicada (“sáb., 17/10 · 18:00”; revisão D13 de 2026-10-13: tudo minúsculo); sem limitações remanescentes no cabeçalho.
- [x] F2 (T03 executado em 2026-10-13 — medições na §12): D3=A — o modal "Marcar como pago" exibe o valor do ciclo selecionado (R$ 220,00 no `default`; R$ 180,00 em `valor_fixo`; histórico não pago com fixture controlada: R$ 300,00 ≠ R$ 400,00 do ciclo atual) e o aviso de congelamento; sem tratamento parcial.
- [x] F3 (T04 executado em 2026-10-13 — medições na §12): D4=B com contrato aprovado — prévia somente leitura no backend (`GET /api/financas/:cicloId/simulacao-ajuste`), paridade prévia × ajuste oficial provada em 8 testes de backend; a UI exibe a linha de substituição e o novo total (debounce de 400 ms na alteração), “Cobrança fixa” no `valor_fixo`, piso zero e falha sem bloquear o Salvar. Nenhum cálculo no frontend (regra 4.3 do repo).
- [x] F4 (T02 executado em 2026-10-13 — medições na §12): fechar o modal não re-renderiza mais a agenda (D2=A; gancho instalado uma única vez) e a posição de rolagem é preservada; validado no mock em 3 ciclos (516→516). **T02 estendido (D12=C)**: a âncora "hoje" fica suprimida em todos os renders pós-ação (edição, exclusões, reagendar, reposição e criação), inclusive nos disparados pela ponte do GCal; mock: edição 516→516, exclusão 516→508 (reflow do card removido) e abrir/fechar 508→508.
- [x] F5 conforme D5=B (T05 executado em 2026-10-13 — provas na §11 e registro na §12): F5a/F5b aplicam as redações aprovadas; F5c entrou nesta frente com o prazo do modal de escolha pré-visualizado pelo módulo compartilhado `calculo-ciclo.js` (mesmo valor do envio) e a spec de reposições reconciliada (v15 — §9.3, decisão 21 e §4.3). Nenhuma decisão de não alterar remanescente.
- [x] Achados absorvidos no T05 (D11=A — T05 executado em 2026-10-13): rótulos legíveis no modo Dia (“Só sáb., 17/10 sai…” — D13), corte do "daqui pra frente" ancorado no dia selecionado (confirm "1 aulas serão aparadas e 0 removidas"; série preservada até 16/10) e "Agendado para: sex., 25/09" sem ISO cru — provas na §11 e registro na §12.
- [ ] F6/F7: falha do financeiro oferece recuperação direta sem recarregar a página; histórico de reposições não afirma "nenhuma" durante o carregamento.
- [ ] Regressão: suíte frontend medida antes/depois de cada cartão que a afete; suíte backend também quando houver mudança em `backend/`, inclusive na exceção D4=B. Números medidos registrados na §12, sem regressões.
- [ ] Nenhuma regra de negócio alterada; arquivos do backend somente nas exceções aprovadas (D4=B no endpoint de prévia; D5=B no UMD do módulo compartilhado, sem mudança de cálculo). Nenhuma escrita em produção; validação de UI no mock (433×762, DPR 2.81 e emulação mobile completa; 320×568 e 390×844 como stress).
- [ ] Todo teste novo provado por mutação (§11); onde não houver teste possível (só visual), lacuna declarada na §10.

## 3. Decisões fechadas

| Decisão | Data | Responsável | Consequência técnica |
|---|---|---|---|
| Rodada 1 = diagnóstico + plano apenas, sem fix | 2026-10-13 | dono | Nenhum arquivo de produto alterado; plano nasce com cartões condicionados às decisões da §4 |
| Frente não altera regra de negócio | 2026-10-13 | dono | Correções restritas a exibição/interação; F3 depende de decisão por envolver a regra 4.3 |
| Validação de UI exclusivamente no mock (`?mockScenario=`, `?mockEscrita=1` só no `default`) | 2026-10-13 | agente + dono | Nenhuma escrita toca rede/banco real |
| Revisão dos seis pontos identificados no plano, sem implementar os cartões | 2026-10-13 | dono | Apenas este plano é atualizado; as escolhas de produto da §4 continuam pendentes |
| Continuar na branch `diag/auditoria-fluxos-ux` nesta revisão | 2026-10-13 | dono | Preservar os dois documentos não commitados; upstream aponta para a própria branch, não para `main` |
| D1 = B — corrigir cabeçalho pelo contexto passado pelo chamador | 2026-10-13 | dono | Helper `montarContextoExibicaoOcorrencia`; os dois chamadores passam nome + data/hora da ocorrência; modais só consomem |
| D9 = Sim — normalizar a exibição ISO | 2026-10-13 | dono | `formatarDataPtBrLegivel` passa a usar `normalizarDataParaISO`; ISO deixa de sair cru em qualquer chamador |
| Formato da linha de data/hora: `sáb., 17/10 · 18:00` (revisado em 2026-10-13 — ver D13) | 2026-10-13 | dono | Capitalização abandonada: tudo minúsculo, como o formato global do app |
| Continuar na branch `diag/auditoria-fluxos-ux` nesta rodada (registro documental) | 2026-10-13 | dono | Working tree do T01 preservado; nenhuma escrita de código nesta rodada |
| D11 = A — achados do T01 absorvidos no T05 (exibição + âncora de execução) | 2026-10-13 | dono | T05 passa a corrigir também o corte do "daqui pra frente" no modo Dia; validação de escrita no mock e teste automatizado entram no cartão |
| D2 = A — fechar o modal não re-renderiza a agenda | 2026-10-13 | dono | Gancho único de fechamento (limpa estado, sem re-render); o wrapper empilhável foi extinto; ações continuam atualizando via `inicializarHome` |
| D12 = C — suprimir a âncora "hoje" em todos os fluxos de ação do usuário | 2026-10-13 | dono | T02 estendido: os 9 call sites passam `semAncoraHoje: true` e o mecanismo central deriva a supressão de `opcoes.operacao` (cobre também os renders internos da ponte do GCal e da grade); flag global `__homeSemAncoraHoje` com clear em `finally` |
| D3 = A — modal de pagamento com valor do ciclo + aviso de congelamento | 2026-10-13 | dono | Valor vem de `alvo.ciclo.valorTotalCiclo` (dados da API — listagem ou histórico; sem cálculo no frontend); redação do aviso encurtada pelo dono na confirmação: “Este ciclo congela após o pagamento — edições futuras na agenda não o alteram.” |
| D4 = B — prévia do ajuste calculada pelo backend | 2026-10-13 | dono | Contrato aprovado e implementado: `GET /api/financas/:cicloId/simulacao-ajuste?aulasManuaisExtras=<int>` (somente leitura; 404/409; reusa o cálculo oficial); UI consome na abertura + a cada alteração (debounce ~400 ms); spec atualizada (v16) e mock com handler + falha `simulacao` |
| D5 = B — F5c nesta frente, com o prazo pré-visualizado pelo módulo compartilhado | 2026-10-13 | dono | `calculo-ciclo.js` passa a rodar também no browser (UMD com fallback de global + erro explícito na ordem invertida; tag em `index.html` após `recurrence-helpers.js`); o modal de escolha exibe `validoAte` idêntico ao do envio; spec de reposições reconciliada (v15 — §9.3, decisão 21 e §4.3) |
| D13 — datas legíveis uniformizadas em **minúsculo** em todos os pontos | 2026-10-13 | dono | Revisa a capitalização do T01/T05: cabeçalhos (“sáb., 17/10 · 18:00”), rótulos (“Só sáb., 17/10 sai…”), detalhes (“Desde sáb., 26/09.”) e “Agendado para” deixam de capitalizar; `formatarDataPtBrLegivel` (minúsculo) é a única forma |

## 4. Decisões pendentes

| # | Pergunta | Opções | Bloqueante? |
|---|---|---|---|
| D1 | F1: corrigir cabeçalho dos modais? Formato do subtítulo | **Resolvida (2026-10-13): B** — contexto passado pelo chamador; formato aprovado `Sáb., 17/10 · 18:00` | — (executada no T01) |
| D2 | F4: preservar rolagem | **Resolvida (2026-10-13): A** — não re-renderizar no fechamento; dependências validadas (ações re-renderizam via `inicializarHome`) | — (executada no T02) |
| D3 | F2: conteúdo do modal de pagamento | A: valor do ciclo + aviso de congelamento / B: só o aviso | **Resolvida (2026-10-13): A**, com redação encurtada pelo dono | — (executada no T03) |
| D4 | F3: efeito do ajuste | A: texto + valores já visíveis na tela / B: prévia calculada pelo backend / C: não alterar | **Resolvida (2026-10-13): B** — contrato aprovado e executado no T04 | — |
| D5 | F5: redação final + F5c (linha de prazo §9.3) | A: ajustar textos aprovados nesta frente + F5c fica para spec própria / B: tudo nesta frente / C: só registrar | **Resolvida (2026-10-13): B** — F5c via módulo compartilhado `calculo-ciclo.js`; redações aprovadas (F5a/F5b/D11) | — (executada no T05) |
| D6 | F6: recuperação do financeiro | A: absorver roadmap 1.11 (botão Atualizar) cobrindo o estado de erro / B: só "Tentar novamente" no erro | **sim (T06)** |
| D7 | F7: corrigir resumo em carregamento | A: "Atualizando…"/esqueleto conforme §9.4.3 / B: ocultar resumo no load | **sim (T07)** — baixo risco não dispensa a escolha do dono |
| D8 | Pré-pago (mês futuro) | Spec nova / roadmap / adiar | não — fora desta frente |
| D9 | F1 formato legível: ISO atual ("2026-09-26") aparece por fallback do formatador — corrigir junto? | **Resolvida (2026-10-13): Sim** — normalizar a exibição no formatador | — (executada no T01) |
| D10 | Ordem de execução, ainda não aprovada | A: por risco, conforme a auditoria (§11) / B: por tema, conforme a sugestão anterior / C: outra ordem definida pelo dono | **sim (ordem da execução)** |
| D11 | Achados do T01 (opções de exclusão no modo Dia + "Agendado para"): destino | A: T05 absorve exibição + âncora de execução / B: T05 só exibição / C: cartão novo | **Resolvida (2026-10-13): A** | — (executada no T05) |
| D12 | Pós-ação: render após edição/exclusão rola a agenda para "hoje" | A: manter (pré-existente, fora do T02) / B: suprimir apenas nos call sites dos modais / C: suprimir em todos os fluxos de ação + derivar da operação no mecanismo central | **Resolvida (2026-10-13): C** | — (executada no T02 estendido) |

Responder uma decisão libera apenas o respectivo cartão, não os demais. D3=B resulta em tratamento parcial de F2; D1=C, D4=C e D5=C deixam os respectivos trabalhos adiados. A ordem da §9 é uma proposta, não uma decisão fechada.

## 5. Escopo

- **Arquivos prováveis**: `assets/js/modal-acao-slot.js` (T01; T05 — rótulos, âncora do "daqui pra frente" e "Agendado para", D11; T02 estendido — 8 call sites), `assets/js/view-calendario.js` (T02), `assets/js/view-home.js` (T02 estendido — mecanismo central), `assets/js/modal-agendamento.js` (T02 estendido — criação; T05), `assets/js/view-financas.js` (T03, T04, T06), `index.html` (T05, textos), `assets/js/view-alunos.js` (T07); testes em `tests-frontend/` quando aplicável (ex.: `modal-acao-slot.test.js`, `view-financas-*.test.js`, `c-alunos-complementos.test.js`).
- **Exceção condicionada a D4=B**: serviço/rota de prévia no backend, testes em `backend/test/` e respostas/cenários em `mocks/ui-runtime/`. Definir e registrar o contrato da API na spec de finanças antes de implementar; não escolher rota ou nomes de campos implicitamente.
- **Documentos**: este plano; `docs/roadmap.md` (item 1.11 e itens relacionados); spec de finanças se D3 exigir registrar o texto e obrigatoriamente se D4=B introduzir o contrato de prévia.
- **Comportamentos que podem mudar**: cabeçalho dos modais de escolha; modal de pagamento; modal de ajuste; rolagem ao fechar modal e após ações (T02 estendido/D12); textos; estado de falha do financeiro; resumo de reposições no carregamento; exibição das opções de exclusão no modo Dia e âncora do corte do "daqui pra frente" (T05/D11); formatação da linha "Agendado para". Nenhuma regra de valor, status ou persistência muda; a prévia D4=B é somente leitura.

## 6. Fora de escopo

- Alterar regras de negócio, cálculo, prazo, ciclo, reposição ou sincronização GCal. D4=B pode expor o cálculo existente como prévia, nunca substituí-lo ou duplicá-lo. A âncora do corte no modo Dia (T05/D11=A) não incorre nesta restrição: alinha a exclusão ao dia em gerenciamento, como nos fluxos de edição e de exclusão de instância, sem tocar cálculo, prazo, ciclo, reposição ou GCal.
- Pagamento antecipado (D8) — decisão de produto em spec separada.
- Alvos de toque do topo (roadmap 5.9) exceto se o dono decidir puxar para cá.
- Refatorações amplas de `view-*` ou mudança de arquitetura do DialogController.
- Backend, exceto se D4=B (prévia de ajuste via API) — aí a suíte de backend entra no ciclo de medição do T04.
- CSS global novo, framework, dependências.

## 7. Invariantes a preservar

- Escrita financeira só é confirmada na UI após HTTP de sucesso (nunca cache).
- Ciclo pago congelado; ajuste com piso zero; snapshot de preço (spec de finanças §5/§6).
- Frontend não reimplementa cálculo de negócio (regra 4.3) e não ganha dependência nova.
- Mock nunca escreve em produção; validação de UI 433×762 como referência.
- Se D4=B: prévia reutiliza o cálculo oficial, não grava dados, não cria ciclo e não confirma pagamento/ajuste. Simulação no mock serve apenas para UI; a paridade financeira é provada no backend.
- Ordem das tags `<script>` do `index.html` preservada; qualquer par novo entra em `DEPENDENCIAS_DE_CARGA` de `tests-frontend/index-html-ordem.test.js`.
- `requireAuth` e o filtro de `ownerEmail` seguem obrigatórios em qualquer rota/query, inclusive na eventual prévia D4=B. Nenhuma alteração nos módulos de autenticação está autorizada.
- Exclusão no modo Dia (T05/D11=A): "só esta" e "daqui pra frente" tomam o dia selecionado como âncora — mesma fonte do cabeçalho "Gerenciando dia".

## 8. Baseline

- Branch `diag/auditoria-fluxos-ux` em `2041d08`; working tree limpo na abertura (2026-10-13).
- **Suíte frontend antes**: **360/360** (0 fail, ~18,6s) — medido em 2026-10-13.
- **Suíte backend antes**: **232/232** (0 fail, ~36,8s) — medido em 2026-10-13.
- Reprodução do defeito: ver §5 do diagnóstico (F1–F7 com passos e textos).
- **Condição de parada**: baseline divergente → medir de novo, registrar na §12 e só prosseguir após confirmação. Qualquer cartão que exija tocar arquivo de backend exige medir também a suíte de backend antes/depois.

## 9. Cartões de tarefas

> Cada cartão está **bloqueado pelas suas decisões locais** até a resposta do dono. Ordem proposta por risco, conforme a auditoria (§11): **T01 → T03 → T02 → T07 → T06 → T05 → T04**. D10 precisa confirmar essa proposta, a alternativa por tema (T01 → T02 → T05 → T07 → T03 → T04 → T06) ou outra ordem, registrando a justificativa de eventual mudança de prioridade.

### Cartão T01 — Cabeçalho dos modais de escolha com a ocorrência correta (F1)
- **Objetivo / resultado**: se D1=A/B, modal "Cobrar esta aula?" e modal "Excluir" exibem a **data/hora da ocorrência clicada** e o **nome do aluno**. A normalização da exibição ISO depende de D9; D1=C deixa o cartão adiado.
- **Depende de**: D1, D9.
- **Arquivos / componentes prováveis**: `assets/js/modal-acao-slot.js` (`abrirModalEscolhaCobrancaReposicao`, `abrirModalEscolhaExclusao`; avaliar `window.dataAlvoAcaoStr` × contexto do chamador); `tests-frontend/modal-acao-slot.test.js` se houver cobertura do cabeçalho.
- **Inclui**: fonte correta da data/hora (ocorrência, não raiz); nome via dado existente (`getAluno`/equivalente no modal de exclusão); normalização e fallback seguro de formatação ISO somente se D9=Sim.
- **Não inclui**: mudar as opções dos modais; mexer em `montarOpcoesExclusaoSlot`; alterar fluxo de envio/exclusão.
- **Decisões pendentes / bloqueios**: D1, D9 (dono).
- **Critérios de aceite**: se D1=A/B, com a série `ag2` do mock o cabeçalho identifica a ocorrência de 17/10/2026 e "Maria Silva" no modal de cobrança **e** no de exclusão, sem usar a data-raiz 26/09. Se D9=Sim, não exibir ISO cru e seguir o formato aprovado; se D9=Não, registrar a limitação de formatação na §13.
- **Validação**: mock `default`, com a emulação da §10. Para a série, abrir o envio por `btnReagendarInstancia`; para a aula única, por `btnMandarParaReposicao`; validar também `btnExcluirSlot` na série. Cobrir ocorrência em dia diferente da raiz e os acessos pelos modos Semana e Dia. Suíte frontend antes/depois; automatizar as asserções de nome/data nos testes existentes quando viável, com prova por mutação (§11), e declarar a lacuna visual restante.
- **Riscos e rollback**: baixo — exibição. Rollback trivial (revert).
- **Limite de tentativas**: no máximo 2. Na segunda falha, registrar a falha e seguir.

### Cartão T02 — Fechar o modal preserva a posição da Semana (F4; T02 estendido: pós-ação)
- **Objetivo / resultado**: após fechar o modal de ação de uma aula em dia distante, a Semana permanece na mesma posição de rolagem (nenhum salto para "hoje"). **T02 estendido (D12=C)**: a posição também é preservada depois das ações ("salvar" na edição, exclusões, reagendar, reposição e criação), que antes re-ancoravam em "hoje" no render pós-escrita.
- **Depende de**: D2; D12 (estendido).
- **Arquivos / componentes prováveis**: `assets/js/view-calendario.js` (`abrirCalendarioAcaoSlot`: gancho de fechamento; `renderizarHomeSemana`: `scrollIntoView` pós-render + gate da supressão), `assets/js/view-home.js` (T02 estendido — `inicializarHome` liga/limpa a supressão), `assets/js/modal-acao-slot.js` e `assets/js/modal-agendamento.js` (T02 estendido — call sites com `semAncoraHoje`); testes em `tests-frontend/view-calendario-fechamento.test.js`, **sem** refatorar por testabilidade sem necessidade.
- **Inclui**: garantir que o fechamento não reposicione indevidamente; se D2=B, capturar/restaurar `scrollTop`; validar que ações com sucesso continuam atualizando os cards; sanar o empilhamento de wrappers (inferência do diagnóstico) se confirmado. T02 estendido (D12=C): flag `__homeSemAncoraHoje` suprimindo a âncora em todos os renders do fluxo de ação — derivada de `opcoes.operacao` no mecanismo central (cobre os renders internos da ponte do GCal) e marcada explicitamente nos 9 call sites.
- **Não inclui**: remover a rolagem inicial legítima ao abrir a tela (`hoje` como âncora de primeira carga) nem a âncora dos renders fora de fluxos de ação (pós-sincronização/bootstrap); mudar `renderizarHomeDia` além do necessário; editar `google-calendar.js` (a derivação por `operacao` evita tocar a ponte).
- **Decisões pendentes / bloqueios**: D2 e D12 (ambas resolvidas em 2026-10-13: A e C).
- **Critérios de aceite**: em uma semana que contenha "Hoje", abrir o modal de um dia distante e fechar sem salto de rolagem, inclusive depois dos callbacks atrasados e da rolagem suave terminarem. Ações que alteram o card continuam refletindo a mudança; a rolagem inicial legítima permanece. T02 estendido: depois de salvar a edição ou concluir a exclusão, a rolagem também permanece (sem re-âncora em "hoje").
- **Validação**: mock `default`+`mockEscrita=1`, com a emulação da §10. Registrar o relógio/data usados e garantir que a semana contém "Hoje"; controlar o relógio apenas nos testes se necessário. Medir a posição do contêiner que realmente rola (`scrollY` da janela ou `scrollTop` do contêiner) antes de abrir e depois de fechar, após o callback atual de 120ms e qualquer rolagem suave terminarem. Repetir abrir/fechar 3× e conferir exclusão/edição no mock; suíte frontend antes/depois. Para o T02 estendido, medir também no salvar da edição e na exclusão (com espera pós-callback); automatizar o gate do render e a derivação da operação em `tests-frontend/` com prova por mutação. Uma medição imediatamente após fechar não comprova o aceite.
- **Riscos e rollback**: médio — o re-render no fechamento pode ter dependência oculta; validar com o fluxo de exclusão e edição no mock. No estendido, o risco de o render pós-ação não passar pela mesma via do fechamento se confirmou no mock (ponte do GCal); mitigado pela derivação no mecanismo central. Revert simples.
- **Limite de tentativas**: no máximo 2. Na segunda falha, registrar a falha e seguir. (O estendido consumiu 1 iteração extra — v1 parametrizada falhou no mock; corrigida com a derivação v2, registrada na §12.)

### Cartão T03 — Modal "Marcar como pago": valor e congelamento (F2)
- **Objetivo / resultado**: se D3=A, exibir o valor do ciclo e o aviso de congelamento; se D3=B, exibir somente o aviso e registrar F2 como parcialmente tratado, com a ausência do valor ainda pendente.
- **Depende de**: D3.
- **Arquivos / componentes prováveis**: `assets/js/view-financas.js` (`abrirModalPagamento`/`ensureModais` — resumo do modal); texto em `index.html` se o modal for montado lá; `tests-frontend/view-financas-*.test.js` se a montagem do resumo for testável.
- **Inclui**: conteúdo aprovado em D3. Na opção A, valor do ciclo selecionado no resumo, vindo da API (listagem ou histórico), sem cálculo novo; redação do aviso aprovada; registrar na spec de finanças se o dono decidir que é contrato.
- **Não inclui**: alterar PATCH de pagamento, extrato, congelamento, badge/status do card.
- **Decisões pendentes / bloqueios**: D3 resolvida (2026-10-13): A, com redação encurtada pelo dono.
- **Critérios de aceite**: em ambas as opções, aviso presente antes de salvar. Se D3=A, valor corresponde ao mesmo ciclo que será pago (vigente ou histórico não pago), nunca ao preço atual do aluno ou a outro ciclo; ex.: R$ 220,00 no cenário `default`. Se D3=B, registrar o valor ausente como pendência na §13, sem declarar F2 integralmente corrigido.
- **Validação**: mock `default`, com a emulação da §10; validar obrigatoriamente `por_aula`, `valor_fixo` e ciclo histórico não pago. Usar respostas/fixtures de histórico controladas se o cenário não cobrir o caso. Para D3=A, conferir valores distintos entre ciclos e snapshot diferente do preço atual do aluno. Suíte frontend antes/depois; pagamento no mock somente com `mockEscrita=1`, conferindo PATCH 200 → `PAGO` e preservação do modal em falha. A montagem do resumo e o valor selecionado devem ter teste automatizado quando viável, com mutação.
- **Riscos e rollback**: baixo — exibição. Revert simples.
- **Limite de tentativas**: no máximo 2. Na segunda falha, registrar a falha e seguir.

### Cartão T04 — "Ajuste manual" com efeito compreensível (F3)
- **Objetivo / resultado**: se D4=A, explicar a substituição do ajuste e mostrar dados já existentes, sem prometer novo total; se D4=B, acrescentar prévia calculada pelo backend; se D4=C, registrar o cartão como adiado. Nenhum cálculo local no frontend (regra 4.3).
- **Depende de**: D4.
- **Arquivos / componentes prováveis**: `assets/js/view-financas.js` (`abrirModalAjuste`); somente se D4=B, serviço/rota no backend reutilizando o cálculo de `financasService.js`, testes em `backend/test/`, contrato na spec de finanças e respostas/cenários em `mocks/ui-runtime/`.
- **Inclui**: explicação textual de que o valor substitui o ajuste atual e dados pertinentes já devolvidos pela API. Para D4=B, definir o contrato antes de implementar: identificação de um ciclo existente e ajuste proposto como entrada; resultado da simulação como saída, com rota e nomes de campos registrados na spec. A prévia é autenticada, isolada por `ownerEmail`, somente leitura e reutiliza o cálculo oficial, sem gravar ajuste/pagamento nem criar ciclo.
- **Não inclui**: alterar a regra de ajuste (piso zero, substituição, snapshot), nem exibir total calculado no frontend.
- **Decisões pendentes / bloqueios**: D4 resolvida (2026-10-13): B, com contrato aprovado (rota/resposta como proposto) e momento da prévia definido — abertura + alteração do campo, debounce ~400 ms.
- **Critérios de aceite**: A/B explicam que o campo substitui o ajuste atual, sem cálculo no frontend. Na opção B, testes do backend comprovam que a prévia coincide com o resultado do ajuste oficial para o mesmo ciclo, snapshot e ajuste proposto, preservando todas as regras existentes e sem escrita durante a simulação. Na opção C, nenhuma implementação; registrar o adiamento.
- **Validação**: suíte frontend antes/depois e UI no mock com a emulação da §10 (campo pré-preenchido `1`). Se D4=B, medir a suíte backend antes/depois; provar paridade prévia × ajuste oficial nos testes do backend para ajuste positivo/negativo, piso zero, `por_aula`, `valor_fixo` e snapshot diferente do preço atual do aluno; verificar isolamento por dono, restrições de ciclo pago e ausência de gravações/criação de ciclo. Atualizar o mock para testar consumo da resposta, carregamento e falha da prévia, sem usá-lo como prova de paridade financeira; toda cobertura nova exige mutação.
- **Riscos e rollback**: médio se D4=B (superfície de API — dinheiro); alto cuidado com a seção "Código que calcula dinheiro" das instruções do repo. Rollback: revert; nenhuma migração de dados.
- **Limite de tentativas**: no máximo 2. Na segunda falha, registrar a falha e seguir.

### Cartão T05 — Textos de produto alinhados e achados do T01 (F5a, F5b; F5c conforme D5; D11=A)
- **Objetivo / resultado**: nenhum texto promete "aba Reposições" ou "próximo passo"; F5c (linha de prazo §9.3) endereçado conforme D5; achados absorvidos do T01 (D11=A): rótulos das opções de exclusão no modo Dia legíveis e coerentes com a execução, corte do "daqui pra frente" ancorado no dia selecionado (não na raiz) e linha "Agendado para" do modal de ação sem ISO cru.
- **Depende de**: D5; D11 (resolvida: A).
- **Arquivos / componentes prováveis**: `index.html` (linha ~1464 do modal de escolha; verificar se há outros trechos com o mesmo texto), `assets/js/modal-agendamento.js` (linhas 178-179), `assets/js/modal-acao-slot.js` (rótulos em `montarOpcoesExclusaoSlot` e âncora do handler de `btnExcluirSlot`; `executarExclusaoSerieAPartirDe`; linha "Agendado para" do modal de ação ~1096), `tests-frontend/modal-acao-slot.test.js` (casos novos — hoje os rótulos não têm cobertura).
- **Inclui**: redação aprovada; busca por outras ocorrências de textos desatualizados ("aba Reposições", "próximo passo") antes de fechar o cartão; dos achados D11=A: (i) exibir nos rótulos a data do dia selecionado em formato legível, com a mesma ordem de fallback dos fluxos de edição/instância (`dataAlvoAcaoStr` → dia selecionado → raiz); (ii) fazer o corte do "daqui pra frente" partir do dia selecionado no modo Dia; (iii) formatar "Agendado para" com o formatador existente (D9).
- **Não inclui**: alterar `montarResumoExclusaoCadeiaSerie`, `aparaCadeiaSerieAPartirDe` ou os demais fluxos de exclusão; mudar comportamento dos modais além dos itens de D11; se D5 decidir por F5c, a linha de prazo só entra com decisão explícita sobre a origem do dado (hoje o prazo nasce no envio — §6.1; "vem do campo retornado pela API" — §9.3 — precisa de confirmação).
- **Decisões pendentes / bloqueios**: D5 resolvida (2026-10-13): B — F5c nesta frente via módulo compartilhado; redações aprovadas. Executado em 2026-10-13 (§12).
- **Critérios de aceite**: textos aprovados aplicados; nenhuma promessa de caminho inexistente restante; se F5c entrar, dado correto exibido no momento correto; no modo Dia (série `ag2`, 17/10): rótulos exibem o dia selecionado em formato legível, "daqui pra frente" remove de 17/10 em diante (não a série inteira a partir da raiz) e "Agendado para" (avulsa João, 25/09) exibe data legível.
- **Validação**: inspeção no mock em 433×762 e 320×568 (textos longos); se algum teste automatizado verifica os textos, atualizar e provar por mutação; suíte frontend antes/depois. Achados D11=A: mock `default`+`mockEscrita=1` no modo Dia sobre `ag2` — conferir rótulos, contagens do confirm e resultado do corte (a raiz não pode ser a âncora); avulsa para "Agendado para"; automatizar rótulos/âncora nos testes (`montarOpcoesExclusaoSlot` é função pura) com prova por mutação e declarar a lacuna visual restante.
- **Riscos e rollback**: baixo-médio — a âncora altera a execução da exclusão no modo Dia (validar com escrita no mock e teste). Revert simples.
- **Limite de tentativas**: no máximo 2. Na segunda falha, registrar a falha e seguir.

### Cartão T06 — Recuperação direta na falha do financeiro (F6; 1.11 somente se D6=A)
- **Objetivo / resultado**: em falha de leitura, o usuário tem ação direta para tentar de novo/atualizar, sem depender de "Sincronizar Dados" ou de recarregar o app.
- **Depende de**: D6.
- **Arquivos / componentes prováveis**: `assets/js/view-financas.js` (estado de erro/vazio; cabeçalho); `tests-frontend/view-financas-carregamento-toast.test.js` ou novo teste.
- **Inclui**: ação de nova leitura no estado de erro, sem recarregar a página. Se D6=A, botão no cabeçalho conforme 1.11, chamando `carregarFinancas({ forcarRemoto: true })` para ignorar cache, tanto com dados visíveis quanto em erro; foco/aria e bloqueio de cliques duplicados durante a leitura. D6=B trata apenas o erro e mantém 1.11 pendente.
- **Não inclui**: alterar a lógica de cache/fila de leitura/contextos (`leiturasDados`, `contextoDados`) — apenas a superfície de recuperação.
- **Decisões pendentes / bloqueios**: D6 (dono).
- **Critérios de aceite**: após falha de GET, mudar a resposta para sucesso e acionar o botão restaura a tela **na mesma sessão, sem reload**, com nova leitura remota e sem escrita. Se D6=A, bypass de cache comprovado mesmo com cache válido/visível. Cliques repetidos durante o voo não geram leituras concorrentes extras; nenhum retry automático novo.
- **Validação**: mock falha → sucesso na mesma página, com a emulação da §10: começar com `mockFalha=financas`, retirar a falha via `__UI_MOCK_RUNTIME.configurarRede` (sem recarga) e acionar o botão. Conferir as chamadas: novo GET, sem POST/PATCH/PUT/DELETE e sem duplicação por clique repetido; validar também cache presente e nova falha preservando dados existentes. Suíte frontend antes/depois; automatizar o fluxo quando viável, com prova por mutação. Registrar na §12 a opção escolhida; somente D6=A permite concluir o roadmap 1.11 após seus critérios passarem.
- **Riscos e rollback**: baixo-médio — encostar em estado de leitura pede cuidado com os guardas de contexto (A→B→A dos testes existentes); não alterar esses guardas. Revert simples.
- **Limite de tentativas**: no máximo 2. Na segunda falha, registrar a falha e seguir.

### Cartão T07 — Histórico de reposições: carregamento sem "nenhuma" (F7)
- **Objetivo / resultado**: durante o carregamento, o resumo do histórico não afirma "nenhuma reposição"; segue §9.4.3 (esqueleto + anúncio), corrigindo para as contagens após o load.
- **Depende de**: D7.
- **Arquivos / componentes prováveis**: `assets/js/view-alunos.js` (resumo do modal de histórico).
- **Inclui**: estado de carregamento explícito no resumo; preservação do comportamento atual pós-load ("1 pendente · 1 realizada").
- **Não inclui**: mudar o fetch, o cache do histórico ou a ordenação dos grupos.
- **Decisões pendentes / bloqueios**: D7 (dono), bloqueante para T07 mesmo sendo de baixo risco.
- **Critérios de aceite**: abrir/reabrir o histórico nunca mostra "nenhuma" antes do resultado. Se D7=A, resumo em carregamento/esqueleto; se D7=B, resumo oculto durante o load; em ambos, anúncio de carregamento e contagens corretas depois. Um resultado realmente vazio só é mostrado após a leitura confirmar o vazio; erro não é tratado como ausência de reposições.
- **Validação**: mock `default` com `mockLatencia`, com a emulação da §10; abrir pela primeira vez e reabrir após cancelar reagendamento, cobrindo resultado com registros, vazio confirmado e erro. Suíte frontend antes/depois; automatizar as transições de resumo quando viável, com prova por mutação.
- **Riscos e rollback**: baixo. Revert simples.
- **Limite de tentativas**: no máximo 2. Na segunda falha, registrar a falha e seguir.

## 10. Matriz de validação

**Emulação obrigatória**: 433×762, DPR 2.81, com métricas, toque e user agent mobile, conforme `docs/setup-ambiente-local.md` §9. Conferir `devicePixelRatio`, suporte a toque, `pointer: coarse` e `hover: none`; não basta redimensionar a janela. Repetir os critérios visuais em 320×568 e 390×844 como stress.

| Tipo | O que cobre | Onde | Observação |
|---|---|---|---|
| Automatizada | Resumos, dados de ciclo selecionado e transições de estado tocados pelos cartões; nenhum cálculo novo no frontend | `tests-frontend/` (`node --test`) | Rodar antes/depois de cada cartão que a afete e registrar na §12; cobertura nova com mutação |
| Automatizada (backend) | Se D4=B: paridade prévia × ajuste oficial, snapshot, piso zero, métodos de cobrança, isolamento e ausência de escrita | `backend/` (`node --test`) | Medir antes/depois de qualquer mudança no backend; mock não prova a regra financeira |
| Manual (obrigatória) | Cabeçalhos nos caminhos de série/avulsa; exclusão no modo Dia (rótulos + corte — T05/D11); rolagem após callback/rolagem suave; pagamento vigente/histórico e `por_aula`/`valor_fixo`; erro → tentativa → sucesso sem reload | Mock: `index.html?mockScenario=default`, com a emulação acima | `?mockEscrita=1` só no `default`; `mockFalha`/`configurarRede` para T06; `mockLatencia` para T07; fixtures controladas quando necessário |
| Negativos | Ação de escrita com falha simulada continua bloqueando/revertendo como hoje (T02, T03) | Mock `mockFalha`/retenção | Não introduzir regressão nos guardas de contexto (A→B→A) |

**Não coberto por esta validação**: pixels, contraste e tipografia fina (permanecem manuais, como já registrado no repo); comportamento real de rede; dados de produção.

## 11. Prova por mutação

| Mutação aplicada | Teste que deve falhar | Resultado observado | Restaurado? |
|---|---|---|---|
| M1 — `montarContextoExibicaoOcorrencia` ignora `dataAlvoAcaoStr` (volta a usar só o dia selecionado) | 3 testes T01 de `modal-acao-slot.test.js` (contexto, cobrança, exclusão) | Falharam: esperado `Sáb., 17/10 · 18:00`, obtido `Seg., 31/08 · 18:00` | Sim — suíte 367/367 após restaurar |
| M2 — nome do aluno sem `getAluno` (fallback "Aluno") | 4 testes T01 de `modal-acao-slot.test.js` | Falharam: obtido `Aluno · Sáb., 17/10 · 18:00`, esperado `Maria Silva ...` | Sim — suíte 367/367 após restaurar |
| M3 — `formatarDataPtBrLegivel` volta a `converterPtBrParaISO` (sem normalização ISO) | `formatarDataPtBrLegivel normaliza entrada ISO (T01/D9)` em `utils-datetime.test.js` | Falhou: obtido `2026-09-26` cru, esperado `sáb., 26/09` | Sim — suíte 367/367 após restaurar |
| M4 — gancho de fechamento volta a re-renderizar a semana | `fechar o modal não re-renderiza a agenda e limpa o estado da ocorrência (D2=A)` em `view-calendario-fechamento.test.js` | Falhou: rendersSemana 1 ≠ 0 | Sim — 2/2 verdes após restaurar |
| M5 — guard de instalação única removido de `instalarGanchoLimpezaFechamentoAcaoSlot` | `o gancho de fechamento é instalado uma única vez, sem reassinar a cada abertura` em `view-calendario-fechamento.test.js` | Falhou: referência de função trocada a cada abertura | Sim — 2/2 verdes após restaurar |
| M6 — gate `if (!ancorarHoje) return;` removido de `renderizarHomeSemana` | `render da semana ancora "hoje" por padrão e respeita a supressão pós-ação (T02 estendido)` em `view-calendario-fechamento.test.js` | Falhou: obtido `['semana-dia-hoje-elemento']` no caso suprimido (esperado `[]`) | Sim — 5/5 verdes após restaurar |
| M7 — derivação removida: `semAncoraHoje` volta a considerar só o parâmetro explícito | `inicializarHome suprime a âncora quando há operação, mesmo sem o parâmetro (T02 estendido — ponte do GCal)` em `view-calendario-fechamento.test.js` | Falhou: flags de render gravadas com `semAncora: false` | Sim — 5/5 verdes após restaurar; suíte 372/372 |
| M8 — preenchimento do valor removido de `abrirModalPagamento` | 3 testes de `view-financas-pagamento.test.js` | Falharam: valor vazio em vez de R$ 400.00 / R$ 300.00 / R$ 250.00 | Sim — 3/3 verdes após restaurar |
| M9 — valor trocado para o do ciclo atual (`alvo.card.cicloAtual.valorTotalCiclo`) | `modal de pagamento do histórico exibe o valor do próprio ciclo, nunca o do ciclo atual (T03/D3=A)` em `view-financas-pagamento.test.js` | Falhou: obtido R$ 400.00 (ciclo atual), esperado R$ 300.00 (histórico) | Sim — 3/3 verdes após restaurar; suíte 375/375 |
| M10 — simulação troca o snapshot pelo preço atual do aluno (`precoAulaSnapshot: aluno && aluno.preco`) | `simulação usa o snapshot do ciclo, nunca o preço atual do aluno` em `financas-simulacao-ajuste.test.js` | Falhou: obtido 999, esperado 60 (e valor zerado no caso sem preço) | Sim — 8/8 verdes após restaurar |
| M11 — piso zero removido da simulação (`aulasContadas + ajusteSimulado`) | `simulação coincide com o ajuste oficial em por_aula com ajuste negativo e piso zero` em `financas-simulacao-ajuste.test.js` | Falhou: obtido -6, esperado 0 | Sim — 8/8 verdes após restaurar; suíte 240/240 |
| M12 — disparo da prévia na abertura removido de `abrirModalAjuste` | 4 testes de `view-financas-ajuste.test.js` | Falharam: 0 chamadas de prévia | Sim — 4/4 verdes após restaurar |
| M13 — texto da prévia usa `aulasContadas` em vez de `totalAulasCobradas` | `abrir o ajuste dispara a prévia...` e `alterar o campo refaz a prévia...` em `view-financas-ajuste.test.js` | Falharam: “4 aula(s)” em vez de “5”/“7” | Sim — 4/4 verdes após restaurar; suíte 379/379 |
| M14 — rótulos da exclusão voltam à data crua (sem `formatarDataPtBrLegivel` + capitalização em `montarOpcoesExclusaoSlot`) | `T05 — rótulos da exclusão exibem a data em formato legível (D11)` em `modal-acao-slot.test.js` | Falhou: obtido `Só 17/10/2026 sai. A série continua.`, esperado `Só Sáb., 17/10 sai. A série continua.` | Sim — restaurado (git status conferido); suíte 386/386 medida após o T05 |
| M15 — âncora do corte revertida (`dataAlvoAcaoStr → compromisso.data → dia selecionado`) em `executarExclusaoSerieAPartirDe` | `T05 — daqui pra frente ancora no dia selecionado no modo Dia (D11)` | Falhou: série removida inteira pela raiz (aulas restantes 0 ≠ 1) | Sim — restaurado; 14/14 focados verdes |
| M16 — preenchimento do prazo removido de `abrirModalEscolhaCobrancaReposicao` (linha F5c nunca preenchida) | 2 testes F5c de `modal-acao-slot.test.js` | Falharam: linha vazia em vez de `Prazo para reposição: até 10/11.` | Sim — restaurado; 14/14 focados verdes |
| M17 — UMD de `calculo-ciclo.js` revertido (require direto no topo, sem fallback de global) | 2 testes de `calculo-ciclo-browser.test.js` | Falharam: `require is not defined` na carga via tag `<script>` | Sim — restaurado; 14/14 focados verdes |
| M18 — `formatarDesdeSerieExibicao` volta à data crua (`return desde \|\| "início"`) | `T05 — rótulos da exclusão exibem a data em formato legível (D11)` e `T05 — confirmação da execução da série toda usa a data legível (D11)` em `modal-acao-slot.test.js` | Falharam: `Desde 26/09/2026.` em vez de `Desde Sáb., 26/09.` (11 pass / 2 fail) | Sim — restaurado; 13/13 focados verdes e suíte 387/387 |
| M19 — linha "Período" da mensagem volta a dd/mm/aaaa (`formatarDataPtBr` em `montarResumoExclusaoCadeiaSerie`) | `T05 — confirmação da execução da série toda usa a data legível (D11)` e `T05 — período da série com data final também sai no formato legível` | Falharam (12 pass / 2 fail): `Período: desde 26/09/2026 até sem data de término.` (e `até 19/12/2026.`) | Sim — restaurado; 14/14 focados verdes e suíte 388/388 |
| M20 — capitalização de volta nos rótulos de exclusão (`dataExibicao` volta a `charAt(0).toUpperCase()`) | `T05 — rótulos da exclusão exibem a data em formato legível (D11)` | Falhou (13 pass / 1 fail): “Só Sáb., 17/10 sai…” em vez de “Só sáb., 17/10 sai…” | Sim — restaurado; 14/14 focados e suíte 388/388 |

## 12. Registro da execução

### 2026-10-13 — Abertura (Rodada 1: diagnóstico + plano)
- **Arquivos alterados**: `docs/diagnostics/2026-10-13-diag-auditoria-fluxos-ux.md` (novo), `docs/plans/2026-10-13-plan-melhorias-fluxos-ux.md` (novo). Nenhum arquivo de produto.
- **Resultado**: 7 achados (F1–F7) com reprodução e evidência; lacuna de pagamento antecipado registrada; benchmark de mercado anexado ao diagnóstico; cartões T01–T07 condicionados às decisões D1–D8.
- **Suíte antes/depois**: antes = frontend **360/360** (~18,6s) e backend **232/232** (~36,8s), medidos em 2026-10-13; depois = não se aplica (nenhuma alteração de código).
- **Desvio do plano**: nenhum.
- **Decisão adicional tomada**: —

### 2026-10-13 — Revisão documental contra a auditoria
- **Branch usada**: `diag/auditoria-fluxos-ux`, continuidade confirmada pelo dono; diagnóstico e plano já estavam não commitados antes da revisão.
- **Arquivos alterados nesta revisão**: somente este plano; diagnóstico, roadmap, specs, código e mocks preservados.
- **Resultado**: seis pontos incorporados: recuperação sem reload e bypass de cache em T06; caminho correto de série em T01; contrato, escopo e paridade oficial condicionais de T04-B; aceite por opção e bloqueios coerentes; prioridade da auditoria como proposta pendente D10; emulação completa e regressões adicionais em T02/T03. D9 incluída nas pendências de fechamento.
- **Suíte antes/depois nesta revisão**: não reexecutadas, pois nenhuma suíte/código foi afetado. Os números da §8 continuam sendo o baseline medido na abertura, não uma nova medição.
- **Desvio do plano**: a ordem por tema deixou de figurar como decisão fechada; o dono ainda precisa escolher a sequência em D10.
- **Decisão adicional tomada**: autorização apenas para ajustar o documento e continuar na branch atual; nenhuma opção de implementação foi aprovada nesta revisão.

### 2026-10-13 — T01 executado (cabeçalho dos modais de escolha — F1)
- **Base**: `diag/auditoria-fluxos-ux`, HEAD `a4f3654` (documentos commitados pelo dono) + mudanças desta rodada no working tree. D10 segue pendente; esta execução seguiu a ordem proposta na §9.
- **Decisões aplicadas**: D1=B (contexto pelo chamador), D9=Sim (normalizar ISO) e formato aprovado `Sáb., 17/10 · 18:00`.
- **Arquivos alterados**: `assets/js/modal-acao-slot.js` (helper `montarContextoExibicaoOcorrencia`; consumo nos modais de cobrança e de exclusão; contexto nos dois chamadores), `assets/js/utils-datetime.js` (formatter normaliza ISO), `tests-frontend/modal-acao-slot.test.js` (+4 testes T01; modais de escolha no harness) e `tests-frontend/utils-datetime.test.js` (novo; +3 testes).
- **Suíte frontend antes/depois**: **360/360 → 367/367** (medido; +7 testes novos, 0 falhas).
- **Suíte backend antes/depois**: **232/232 → 232/232** (medido depois; nenhum arquivo de backend alterado).
- **Prova por mutação**: 3 mutações (M1–M3) derrubaram os testes correspondentes; restauração conferida com `git status` + suítes verdes (§11).
- **Validação manual no mock** (`default`, 433×762, DPR 2.81, toque/UA mobile):
  - Semana, série ag2 na ocorrência 17/10 (raiz 26/09): cobrança exibe "Maria Silva / Sáb., 17/10 · 18:00"; exclusão exibe "Maria Silva · Sáb., 17/10 · 18:00" e opções com 17/10 — antes: "Aluno" e "2026-09-26" cru.
  - Modo Dia (17/10; `dataAlvoAcaoStr` nulo): fallback pelo dia selecionado; cobrança e exclusão corretas.
  - Avulsa (João, 25/09, `btnMandarParaReposicao`): "João Pereira / Sex., 25/09 · 19:00".
- **Achados observados no mock (não alterados — §13)**: opções do modal de exclusão em modo Dia usam a data-raiz crua ("Só 2026-09-26 sai"); modal de ação mostra "Agendado para: 2026-09-25" (ISO cru).
- **Desvio do plano**: nenhum.
- **Decisão adicional tomada**: nenhuma.

### 2026-10-13 — Absorção dos achados do T01 no T05 (revisão documental)
- **Branch usada**: `diag/auditoria-fluxos-ux`, continuidade confirmada pelo dono; working tree do T01 preservado (sem commit novo nesta rodada).
- **Arquivos alterados nesta revisão**: somente este plano.
- **Decisão tomada**: D11=A — os dois achados do T01 são absorvidos no T05: exibição das opções de exclusão no modo Dia, âncora de execução do "daqui pra frente" (dia selecionado) e formatação da linha "Agendado para" do modal de ação.
- **Leitura de código que fundamentou a decisão**: no modo Dia (`dataAlvoAcaoStr` nulo), o handler de `btnExcluirSlot` e `executarExclusaoSerieAPartirDe` usam `compromisso.data` (raiz) antes do dia selecionado, enquanto edição e exclusão de instância usam o dia selecionado; com a raiz, "daqui pra frente" removeria a série inteira — inferência de código, ainda não observada em execução no mock (a validar no T05).
- **Suíte antes/depois nesta revisão**: não reexecutadas (nenhum código alterado); última medição — frontend **367/367**, backend **232/232** (T01, 2026-10-13).
- **Desvio do plano**: nenhum.

### 2026-10-13 — T02 executado (rolagem preservada ao fechar o modal — F4)
- **Base**: `diag/auditoria-fluxos-ux`, HEAD `2fb9666` (T01 commitado pelo dono; working tree limpo na abertura). D10 segue pendente — o dono escolheu executar T02 nesta rodada (o próximo da ordem por risco proposta era T03).
- **Decisão aplicada**: D2=A — fechar o modal não re-renderiza a agenda; o gancho único substitui o wrapper empilhável e apenas limpa `dataAlvoAcaoStr` antes de fechar.
- **Arquivos alterados**: `assets/js/view-calendario.js` (gancho `instalarGanchoLimpezaFechamentoAcaoSlot`, instalado uma única vez) e `tests-frontend/view-calendario-fechamento.test.js` (novo; +2 testes).
- **Suíte frontend antes/depois**: **367/367 → 369/369** (medido; +2 testes novos, 0 falhas).
- **Suíte backend**: não reexecutada (nenhum arquivo de backend alterado); última medição **232/232** (T01).
- **Prova por mutação**: M4 e M5 derrubaram os testes correspondentes; restaurações conferidas com `git status` + 2/2 verdes (§11).
- **Nota de teste (iteração registrada)**: a primeira versão do teste de empilhamento contava chegadas ao fechar original e **não pegou M5** — sem re-render, encadear wrappers chega ao stub uma única vez; foi reformulado para provar a identidade do gancho (reabrir não reassina). O teste "sem abertura pela Semana o fechamento segue sendo o original" foi removido por passar no código antigo (não é cobertura do fix).
- **Validação manual no mock** (`default`+`mockEscrita=1`, 433×762, DPR 2.81, toque/UA mobile):
  - Reprodução antes do fix (mesmo método do aceite): rolagem **516 → 87** ao fechar, sábado fora da tela (diagnóstico: 516 → 96).
  - Pós-fix, abrir/fechar 3× no sábado 17/10: rolagem **516 → 516** em antes/aberto/depois nos 3 ciclos (após o callback de 120 ms e a rolagem suave); sábado permanece na viewport (top ≈409).
  - Edição no mock: horário 18:00 → 17:00 no sábado; card passou a "Maria Silva 17:00 - 18:00"; quinta 15/10 intacta; toast "Alterações salvas na nuvem!".
  - Exclusão no mock: opções com "Só 17/10/2026 sai"; confirm aceito; escrita `PUT /api/agendamentos/… → 200`; sábado 17/10 ficou "Sem agendamentos para este dia"; quinta e domingo intactos; toast "Aula de 17/10/2026 excluída. A série continua nos outros dias.".
  - Observação registrada (§13): após ações, o render do `inicializarHome` mantém o salto para "hoje" (`scrollY` 87) — pré-existente, fora do escopo do T02.
- **Desvio do plano**: nenhum.

### 2026-10-13 — T02 estendido executado (rolagem preservada também após ações — D12=C, pedido do dono)
- **Base**: `diag/auditoria-fluxos-ux`, working tree do T02 preservado (sem commit novo); pedido do dono: "Pode corrigir o comportamento para edição/exclusão também? inclua essa tarefa no card atual e etapa atual".
- **Decisão aplicada**: D12=C — supressão da âncora "hoje" em todos os fluxos de ação do usuário.
- **Arquivos alterados**: `assets/js/view-calendario.js` (flag `__homeSemAncoraHoje` capturada no início de `renderizarHomeSemana`; gate `if (!ancorarHoje) return;` no `setTimeout` de 120 ms), `assets/js/view-home.js` (`inicializarHome` liga a flag com `opcoes.semAncoraHoje === true || Boolean(opcoes.operacao)` e limpa em `finally`), `assets/js/modal-acao-slot.js` (8 sites com `semAncoraHoje: true`: edição, 4 exclusões, reagendar, reposição série/avulsa), `assets/js/modal-agendamento.js` (criação, 1 site), `tests-frontend/view-calendario-fechamento.test.js` (+3 testes: gate do render, derivação por operação e casos sem operação/explícito).
- **Iteração de correção (registrada)**: a primeira versão — só parametrizar os call sites — **falhou no mock** (edição ainda saltava 516→87). A instrumentação em execução mostrou que as edições gravam pela **ponte do GCal** (`salvarEventoComGCal` → `_persistirDadosComBackend`, 2 gravações por edição de série): os renders internos dessa ponte chamam `inicializarHome` sem o parâmetro, e o ramo dos call sites não executa quando `gcal.isSignedIn()` é verdadeiro. A v2 deriva a supressão de `opcoes.operacao` no mecanismo central — como toda escrita carrega `operacao`, a ponte, a grade e os call sites ficam cobertos sem editar `google-calendar.js`.
- **Suíte frontend antes/depois**: **369/369 → 372/372** (medido; +3 testes novos, 0 falhas; uma rodada intermediária registrou timeout de 5 s em `c-financas-recuperacao.test.js` sob carga — o teste passou isolado e na re-execução da suíte, tratado como flake do ambiente).
- **Suíte backend**: não reexecutada (nenhum arquivo de backend alterado); última medição **232/232** (T01).
- **Prova por mutação**: M6 e M7 (§11) derrubaram os testes correspondentes; restauração conferida com `git status` + 5/5 verdes no arquivo focado; suíte completa 372/372 após restaurar.
- **Validação manual no mock** (`default`+`mockEscrita=1`, 433×762, emulação mobile; relógio real 13/10/2026, semana 12–18/10; série ag2 — sábado 17/10):
  - Edição "Daqui pra frente" (18:00 → 14:00): rolagem **516 → 516** (imediato) **→ 516** (+1,5 s); card do sábado atualizado para "14:00 - 15:00"; toast "Alterações salvas na nuvem!". Antes da correção: 516 → 87.
  - Exclusão "Excluir esta aula" (confirm aceito): rolagem **516 → 508 → 508** — preservada sem salto para o topo; a diferença de 8 px é o reflow do card removido do container. Sábado ficou "Sem agendamentos para este dia"; toast "Aula de 17/10/2026 excluída. A série continua nos outros dias.".
  - Regressão do fechamento (T02 base): abrir/fechar "Voltar" 2× — rolagem **508 → 508** nos 2 ciclos.
- **Observação de método**: a validação usou cliques via DOM (`evaluate`), porque a fila de eventos de mouse/toque do CDP ficou presa em sessões anteriores; o comportamento observado é o mesmo caminho de código (handlers de `click`).
- **Desvio do plano**: a extensão foi além do critério original de F4 (que cobria só o fechamento) por decisão explícita do dono (D12=C), registrada no card T02 e nas §2/§3.
- **Decisão adicional tomada**: a supressão cobre também criação, reagendar e reposição (todos os fluxos de ação do usuário); os renders fora de fluxos de ação (pós-sincronização/bootstrap) mantêm a âncora — registrado na §13.

### 2026-10-13 — T03 executado (modal de pagamento: valor e congelamento — F2)
- **Base**: `diag/auditoria-fluxos-ux`, HEAD `6bc515a` (T02 commitado pelo dono; working tree limpo na abertura); continuidade na branch confirmada pelo dono.
- **Decisão aplicada**: D3=A — valor do ciclo + aviso de congelamento; redação encurtada pelo dono na confirmação: “Este ciclo congela após o pagamento — edições futuras na agenda não o alteram.”
- **Arquivos alterados**: `assets/js/view-financas.js` (novos elementos `financasPagamentoValor` — valor de `alvo.ciclo.valorTotalCiclo`, dados da API, sem cálculo — e `financasPagamentoCongelamento` (aviso estático) em `ensureModais`; preenchimento em `abrirModalPagamento`; `aria-describedby` cobre os três textos; `financasPagamentoValor` entra na limpeza de `resetarTelaFinancas`; o aviso não é limpo por ser estático) e `tests-frontend/view-financas-pagamento.test.js` (novo; +3 testes no harness de finanças: por_aula do ciclo atual, histórico não pago ≠ ciclo atual e valor_fixo).
- **Suíte frontend antes/depois**: **372/372 → 375/375** (medido; +3 testes novos, 0 falhas).
- **Suíte backend**: não reexecutada (nenhum arquivo de backend alterado); última medição **232/232** (T01).
- **Prova por mutação**: M8 e M9 (§11) derrubaram os testes correspondentes; restaurações conferidas com `git status` + 3/3 verdes.
- **Validação manual no mock** (`default`+`mockEscrita=1`, 433×762, emulação mobile):
  - Maria (por_aula, atrasado): modal exibe resumo + **R$ 220,00** + aviso de congelamento — antes (F2 do diagnóstico): sem valor e sem menção ao congelamento.
  - João (valor_fixo, em aberto): **R$ 180,00** + aviso.
  - Salvar (mockEscrita=1): PATCH 200 → modal fecha, card vira “Pago” com botões desabilitados, toast “Pagamento confirmado com sucesso!”.
  - Falha do PATCH: modal permanece aberto com valor/aviso visíveis, botão reabilitado e toast “Gravação de pagamento não confirmada. Verifique os dados no servidor.”; região de recuperação de dados exibida.
  - Ciclo histórico não pago: o fixture do mock responde histórico apenas com ciclo pago; o caso foi coberto pelo teste automatizado com fixture controlada (R$ 300,00 ≠ R$ 400,00 do ciclo atual) — lacuna do mock declarada na §13.
- **Desvio do plano**: a redação do aviso foi encurtada pelo dono na confirmação (em vez da sugerida no cartão); a falha de PATCH no mock foi simulada em runtime apenas na rota PATCH (`mockFalha=financas` derruba também a listagem, inviabilizando a validação de preservação do modal).
- **Decisão adicional tomada**: nenhuma.

### 2026-10-13 — T04 executado (ajuste manual com prévia do backend — F3, D4=B)
- **Base**: `diag/auditoria-fluxos-ux`, HEAD `15458f6` (T03 commitado pelo dono; working tree limpo na abertura); continuidade na branch confirmada pelo dono.
- **Decisão aplicada**: D4=B, com contrato aprovado pelo dono nesta rodada: `GET /api/financas/:cicloId/simulacao-ajuste?aulasManuaisExtras=<inteiro>`; resposta `{ metodoCobranca, precoAula, valorFixoCiclo, aulasContadas, aulasManuaisExtras, totalAulasCobradas, valorTotalCiclo }`; 409 pago / 404 inexistente ou de outro dono; ausente/inválido → 0; somente leitura. Momento aprovado: abertura + alteração do campo com debounce (~400 ms). Redações aprovadas: “O valor informado substitui o ajuste atual do ciclo.” e prévia “Novo total: N aula(s) × R$ X → R$ Y” / “Cobrança fixa: total permanece R$ Z.”; na falha, o Salvar continua funcionando.
- **Arquivos alterados**: backend — `financasService.js` (`simularAjusteCiclo`: somente leitura; reusa `resolverSnapshotParaRecalculo` + `calcularTotalAulasCobradas` + `calcularValorTotalCiclo` sobre um clone, sem persistir fallback de legado), `financasController.js` (`simularAjuste`), `financasRoutes.js` (GET antes dos PATCHs); `backend/test/financas-simulacao-ajuste.test.js` (novo; 8 testes: paridade × oficial em por_aula positivo/negativo, piso zero, valor_fixo, snapshot ≠ preço atual, somente leitura/sem fallback persistido/sem criação de ciclo, filtro por dono + 404, 409 sem carregar aluno, normalização 0). Frontend — `assets/js/view-financas.js` (linha de substituição + `financasAjustePrevia` com `role=status`; disparo na abertura e no `input` com debounce de 400 ms + sequência anti-fora-de-ordem; cancelamento no fechamento; limpeza do elemento), `tests-frontend/view-financas-ajuste.test.js` (novo; 4 testes). Mock — `mocks/ui-runtime/mock-runtime.js` (handler da simulação com 404/409/piso zero, declarado antes do handler genérico de “/ajuste”; chave de falha `simulacao`; `recalcularCiclo` alinhado ao snapshot implícito do fixture — regra 5.9) e `mocks/ui-runtime/README.md` (rota de falha + recurso). Spec — `docs/specs/financas-ciclo-cobranca.md` (contrato nas §5.5 e §6; Versão 15 → 16).
- **Suíte backend antes/depois**: **232/232 → 240/240** (medido; +8 testes, 0 falhas; exit code real 0 — o “exit 1” observado em pipes do PowerShell era artefato do pipeline de filtro, não da suíte).
- **Suíte frontend antes/depois**: **375/375 → 379/379** (medido; +4 testes, 0 falhas).
- **Prova por mutação**: M10–M13 (§11) derrubaram os testes correspondentes; restaurações conferidas com `git status` + suítes focadas verdes.
- **Validação manual no mock** (`default`+`mockEscrita=1`, 433×762, emulação mobile):
  - Maria (por_aula, atrasado; campo pré-preenchido 1): abertura exibe “O valor informado substitui o ajuste atual do ciclo.” + “Novo total: 5 aula(s) × R$ 44,00 → R$ 220,00”.
  - Campo 3 → debounce → “Novo total: 7 aula(s) × R$ 44,00 → R$ 308,00”; campo -6 → “Novo total: 0 aula(s) × R$ 44,00 → R$ 0,00” (piso zero, sem negativos).
  - Salvar (PATCH 200): card vira “7 aula(s) cobrada(s) / R$ 308,00”; toast “Ajuste salvo com sucesso!” — prévia e resultado coincidem no mock.
  - João (valor_fixo): “Cobrança fixa: total permanece R$ 180,00.”
  - Carregamento (latência de 1,5 s em runtime): “Calculando prévia…” → valor; falha (`configurarRede({ falhas: ['simulacao'] })`): “Não foi possível calcular a prévia agora.” com Salvar habilitado.
- **Desvio do plano**: nenhum na feature. No mock, o `recalcularCiclo` do modo de escrita usava o preço ATUAL do aluno (fixture a1: R$ 50) e faria o card divergir da prévia (R$ 308 vs R$ 350); foi alinhado ao snapshot implícito do ciclo (R$ 44) dentro do escopo “atualizar o mock para a prévia”. O README do mock registra que a derivação não é prova de paridade financeira.
- **Decisão adicional tomada**: nenhuma.

### 2026-10-13 — T05 executado (textos de produto + achados D11 + F5c — F5, D11=A, D5=B)
- **Base**: `diag/auditoria-fluxos-ux`, HEAD `86720fb` (T04 commitado pelo dono; working tree limpo na abertura); continuidade na branch confirmada pelo dono.
- **Decisões aplicadas**: D5=B — F5c nesta frente, com o prazo pré-visualizado pelo módulo compartilhado `calculo-ciclo.js` (mesmo cálculo do envio; spec de reposições §9.3); redações aprovadas (F5a, F5b e D11 i/iii); D11=A (exibição + âncora de execução).
- **Arquivos alterados**: `index.html` (F5a — “…no card do aluno.”; F5b — default estático “Toque para configurar a repetição.”; novo `#reposicaoEscolhaPrazo` no rodapé do modal de escolha; tag `<script src="backend/shared/calculo-ciclo.js">` após `recurrence-helpers.js`), `assets/js/modal-agendamento.js` (F5b — habilitado → “Toque para ajustar a repetição.”), `assets/js/modal-acao-slot.js` (D11: rótulos legíveis em `montarOpcoesExclusaoSlot`; âncora `dataAlvoAcaoStr → dia selecionado → raiz` em `executarExclusaoSerieAPartirDe` e no handler de `btnExcluirSlot`; “Agendado para” legível; F5c: preenchimento de `#reposicaoEscolhaPrazo` em `abrirModalEscolhaCobrancaReposicao`), `backend/shared/calculo-ciclo.js` (UMD com fallback de global no browser + erro explícito na ordem invertida; caminho Node inalterado), `tests-frontend/modal-acao-slot.test.js` (+5 testes T05; harness com `calculo-ciclo.js`), `tests-frontend/calculo-ciclo-browser.test.js` (novo; +2), `tests-frontend/index-html-ordem.test.js` (par `recurrence-helpers → calculo-ciclo` em `DEPENDENCIAS_DE_CARGA`) e `docs/specs/reposicoes-e-competencia.md` (v15 — §9.3, decisão 21 e §4.3 reconciliados com D5=B).
- **Suíte frontend antes/depois**: **379/379 → 386/386** (medido; +7 testes novos, 0 falhas).
- **Suíte backend antes/depois**: **240/240 → 240/240** (medido depois; o UMD preserva o caminho Node — nenhum arquivo de backend de produto alterado).
- **Prova por mutação**: M14–M17 (§11) derrubaram os testes correspondentes; restaurações conferidas com `git status` + focados 14/14 verdes.
- **Validação manual no mock** (`default`+`mockEscrita=1`, 433×762, DPR 2.81; stress em 320×568):
  - F5a/F5c — modal “Cobrar esta aula?” (série ag2, 17/10): “A aula sai da agenda deste dia e entra na fila de reposições. Você escolhe a nova data depois, no card do aluno.” + “Prazo para reposição: até 10/11.”; sem overflow em 320px (0 problemas medidos por `scrollWidth` e bordas dos elementos).
  - F5b — formulário de agendamento: padrão “Toque para configurar a repetição.” (visível em 320px, sem overflow); após salvar a repetição no modal de recorrência: “Toque para ajustar a repetição.”.
  - D11 (i) — rótulos legíveis: “Só Sáb., 17/10 sai. A série continua.” / “Sáb., 17/10 em diante. O histórico anterior fica.” (sem overflow em 320px).
  - D11 (ii) — modo Dia sobre ag2 em 17/10 (`dataAlvoAcaoStr` nulo): confirm “1 aulas serão aparadas e 0 removidas.”; toast “Exclusão aplicada a partir de 17/10/2026.”; dia 17/10 esvaziado; semana 05–11/10 mantém 10/10 (“Maria Silva 18:00 - 19:00”) e a seguinte fica sem 24/10 — série aparada no dia gerenciado, não removida desde a raiz.
  - D11 (iii) — avulsa João, 25/09: “Agendado para: Sex., 25/09” (antes: “2026-09-25” cru).
  - Busca por textos antigos (“aba Reposições”, “próximo passo”) não encontrou ocorrências em arquivos de produto (só em `docs/archive/` e `docs/diagnostics/`, históricos que não se editam).
- **Desvios do plano**: F5c exigiu que `calculo-ciclo.js` passasse a rodar no browser (UMD com fallback de global) — o ajuste já estava antevisto na pergunta do D5 (“o UMD atual não roda no browser — ajuste pequeno”); o par de carga entrou em `DEPENDENCIAS_DE_CARGA` conforme a regra do repo. A reconciliação da spec foi além do §9.3: a decisão 21 e o §4.3 também davam o prazo como exclusivo do backend e foram atualizados para refletir D5=B.
- **Observações registradas (§13)**: o débito da spec §13 (reposições) sobre `calcularPrazoReposicao` declarada duas vezes em `financasService.js` aparenta obsoleto — o serviço hoje importa/reexporta o módulo compartilhado; e a exclusão de validação no mock alterou apenas o store em memória (`mockEscrita=1`), descartado ao recarregar — sem efeito em arquivo ou dado real.
- **Decisão adicional tomada**: nenhuma.

### 2026-10-13 — T05 complemento (itens do relatório: débito da spec §13 e data legível na série toda)
- **Base**: continuação da rodada do T05 (working tree preservado; o dono escolheu continuar na branch `diag/auditoria-fluxos-ux`). Formato aprovado pelo dono: “Desde Sáb., 26/09.”, sem ano.
- **Itens ajustados**: (a) débito da spec §13 (duplicação de `calcularPrazoReposicao`) marcado como **resolvido** — a declaração redundante saiu em `e4bab3f` (2026-08-25) e o cálculo restante foi extraído para o módulo compartilhado em `57381e0` (2026-09-18); (b) textos “Desde …” da exclusão da série toda (opção do modal + confirmação de execução) passam à data legível, como os demais rótulos do T05 (D11).
- **Arquivos alterados**: `assets/js/modal-acao-slot.js` (helper `formatarDesdeSerieExibicao`; aplicação em `montarOpcoesExclusaoSlot` e `executarExclusaoSerie`), `tests-frontend/modal-acao-slot.test.js` (+1 asserção no teste de rótulos; +1 teste da confirmação), `docs/specs/reposicoes-e-competencia.md` (§13) e este plano.
- **Suíte frontend antes/depois**: **386/386 → 387/387** (medido; +1 teste, 0 falhas).
- **Suíte backend**: não reexecutada (nenhum arquivo de backend alterado); última medição **240/240** (T05).
- **Prova por mutação**: M18 (§11) derrubou os 2 testes correspondentes (11 pass / 2 fail); restauração conferida com `git status` + 13/13 focados verdes.
- **Validação manual no mock** (`default`+`mockEscrita=1`, 433×762, emulação mobile): opção “Excluir a série toda” exibe “As 3 aulas do passado mais todas as aulas futuras. Desde Sáb., 26/09.” (antes: “Desde 26/09/2026.”), sem overflow; confirmação de execução capturada com `confirm` interceptado (retorno false, sem escrita): “As 3 aulas do passado mais todas as aulas futuras. Desde Sáb., 26/09.\n\nPeríodo: desde 26/09/2026 até sem data de término. Reposições continuam preservadas no app.” — a linha “Período: …” mantém dd/mm/aaaa por ser outro dado (período da família), fora do item ajustado; a série permaneceu intacta no estado.
- **Desvios do plano**: nenhum.
- **Decisão adicional tomada**: nenhuma.

### 2026-10-13 — T05 complemento 2 (linha "Período" no padrão legível)
- **Base**: continuação na branch `diag/auditoria-fluxos-ux` (working tree preservado). Forma aprovada pelo dono: minúscula e sem ano (“Período: desde sáb., 26/09 até …”), como o padrão do texto corrido do app (“Início: ter., 22/09”); o detalhe acima, no mesmo confirm, permanece capitalizado (“Desde Sáb., 26/09.”).
- **Mudança**: `montarResumoExclusaoCadeiaSerie` monta `desde`/`ate` da mensagem pelo novo helper `formatarDataSerieExibicao` (legível, minúsculo); `formatarDesdeSerieExibicao` passa a delegar a ele e mantém a capitalização dos detalhes. Único consumidor da mensagem: confirmação da exclusão da série toda.
- **Arquivos alterados**: `assets/js/modal-acao-slot.js`, `tests-frontend/modal-acao-slot.test.js` (+1 teste e +1 asserção) e este plano.
- **Suíte frontend antes/depois**: **387/387 → 388/388** (medido; +1 teste, 0 falhas).
- **Suíte backend**: não reexecutada (nenhum arquivo de backend alterado); última medição **240/240**.
- **Prova por mutação**: M19 (§11) derrubou os 2 testes do período (12 pass / 2 fail); restauração conferida com `git status` + 14/14 focados verdes.
- **Validação manual no mock** (`default`+`mockEscrita=1`, 433×762; `confirm` interceptado com aborto, sem escrita): mensagem “As 3 aulas do passado mais todas as aulas futuras. Desde Sáb., 26/09.\n\nPeríodo: desde sáb., 26/09 até sem data de término. Reposições continuam preservadas no app.”; série intacta no estado.
- **Desvios do plano**: nenhum.
- **Decisão adicional tomada**: nenhuma.

### 2026-10-13 — T05 complemento 3 (datas legíveis uniformizadas em minúsculo — D13, revisão do dono)
- **Base**: continuação na branch `diag/auditoria-fluxos-ux`. O dono revisou a coexistência registrada no complemento 2 (detalhe “Desde Sáb., 26/09.” × período “desde sáb., 26/09”) e decidiu uniformizar **tudo minúsculo** (D13).
- **Mudança**: removidas as 4 capitalizações de data legível em `modal-acao-slot.js` — cabeçalho dos modais de escolha (T01), `dataExibicao` dos rótulos, detalhe “Desde …” (`formatarDesdeSerieExibicao` agora só delega + fallback “início”) e “Agendado para”. Resultado: “sáb., 17/10 · 18:00”, “Só sáb., 17/10 sai…”, “Desde sáb., 26/09.”, “Agendado para: seg., 31/08”. Nenhum ponto capitaliza mais data legível.
- **Arquivos alterados**: `assets/js/modal-acao-slot.js`, `tests-frontend/modal-acao-slot.test.js` (asserts ajustados para minúsculo) e este plano.
- **Suíte frontend antes/depois**: **388/388 → 388/388** (medido; nenhum teste novo, asserts atualizados, 0 falhas).
- **Prova por mutação**: M20 (§11) — capitalização reintroduzida nos rótulos derrubou o teste correspondente; restauração conferida com `git status` + 16/16 focados.
- **Validação manual no mock**: não repetida nesta rodada (ajuste de formato; a pedido do dono — “ajuste simples”; a suíte cobre os textos).
- **Desvios do plano**: nenhum.
- **Decisão adicional tomada**: D13 (registrada na §3) — revisa a decisão de capitalização do T01/T05.

## 13. Achados não alterados

| Risco/achado | Por que não foi tratado | Destino | Dono |
|---|---|---|---|
| Pagamento antecipado (mês futuro, "recebido em X cobre Y") | Exige decisão de produto e spec nova — não é defeito | roadmap + spec futura | dono |
| Alvos de toque do topo (26–34px; roadmap 5.9) | Já mapeado; fora do escopo desta frente | roadmap 5.9 | dono |
| Empilhamento de wrappers de `fecharModalAcaoSlot` (inferência do diagnóstico, confirmada por leitura) | Sanado no T02 (D2=A): gancho instalado uma única vez, provado por teste de identidade (M5) | resolvido (T02) | agente |
| Pós-ação (edição/exclusão): o render do `inicializarHome` ainda rola a agenda para "hoje" (`scrollY` 87 no mock), mesmo com o fechamento corrigido | Resolvido no T02 estendido (D12=C): supressão derivada da operação no mecanismo central + call sites; mock sem salto (edição 516→516; exclusão 516→508, reflow) | resolvido (T02 estendido) | agente |
| Pós-sincronização/bootstrap: os renders fora de fluxos de ação (ex.: `atualizarViewAtualAposSync`, primeira carga) mantêm a âncora "hoje" | Não são ação do usuário; a âncora nesses renders é o comportamento esperado (entrada na Home) | mantido por decisão de escopo (D12=C) | agente |
| F5c — linha de prazo §9.3 no modal de escolha | Resolvido no T05 (D5=B): prazo pré-visualizado pelo módulo compartilhado, valor idêntico ao do envio; spec v15 reconciliada (§9.3, decisão 21, §4.3) | resolvido (T05) | agente |
| F2 — valor ausente no modal, se D3=B | A opção B trata apenas o aviso; ausência do valor continua pendente | registrar tratamento parcial nas §12/§13 | dono |
| Achados adiados por D1=C, D4=C ou D5=C; formatação mantida por D9=Não | Não declarar corrigido o que o dono decidir não implementar | registrar decisão e remanescente nas §12/§13 | dono |
| Exclusão em modo Dia: rótulos com data-raiz crua e corte ancorado na raiz | Resolvido no T05 (D11=A): rótulos legíveis e âncora no dia selecionado; mock confirmou o aparo a partir de 17/10 (10/10 mantido; 24/10 vazio) | resolvido (T05) | agente |
| Modal de ação: linha "Agendado para: 2026-09-25" exibe ISO cru | Resolvido no T05 (D11=A): "Agendado para: Sex., 25/09" | resolvido (T05) | agente |
| Fixture de histórico do mock (`/api/financas/:id/historico`) responde sempre um ciclo pago (R$ 180) | Não permite validar "histórico não pago" na UI; o caso do T03 está coberto por teste automatizado com fixture controlada | mock — quando a UI precisar de histórico não pago | dono |
| Débito da spec §13 (reposições): `calcularPrazoReposicao` declarada duas vezes em `financasService.js` | Resolvido no T05 complemento: declaração redundante removida em `e4bab3f` (2026-08-25) e extração para o módulo compartilhado em `57381e0` (2026-09-18); spec §13 atualizada | resolvido (T05 complemento) | agente |

## 14. Deploy e rollback

- **Efeito externo**: frontend estático (PWA) **e novo endpoint somente leitura no backend** (`simulacao-ajuste`; T04/D4=B). T01–T05 executados; sem migração ou escrita de teste em Mongo/GCal. O T05 faz a webpage carregar `backend/shared/calculo-ciclo.js` por tag `<script>` — mesmo caminho já usado pelo `recurrence-helpers.js`; a validação no mock local não prova o deploy, então conferir que o arquivo é servido no app publicado.
- **Ordem de publicação**: PR do dono para a `main` → deploy automático nos dois projetos Vercel. Push é sempre do dono (`git push -u origin <branch>` na primeira vez). Os dois projetos deployam do mesmo commit; a UI da prévia degrada com mensagem se o endpoint não estiver disponível (Salvar continua) — conferir `personal-app-api` antes de validar a prévia no app publicado.
- **Verificação pós-deploy**: aceite visual pelo dono/Josy no app publicado (não há staging); validação de escritas permanece no mock. Conferir a prévia do ajuste no app publicado (abrir “Editar ajuste” e verificar valor e aviso). No T05, conferir também o modal “Cobrar esta aula?” (texto “no card do aluno” + linha de prazo) e os rótulos de exclusão no modo Dia.
- **Limite do rollback**: realizado pelo dono; reversão do código cobre estas mudanças; se a API reverter antes da UI, a falha da prévia é tratada com mensagem e não bloqueia o Salvar.

## 15. Fechamento

- **Critérios atendidos**: pendente.
- **Pendências**: decisões de implementação D6/D7 (D1–D5, D9, D11 e D12 resolvidas e executadas — D4 no T04, D5 no T05); ordem de execução D10; D8 permanece fora da frente. Executar e validar somente os cartões liberados.
- **Registro obrigatório**: classificar F1–F7 como corrigido, parcialmente tratado ou adiado conforme os resultados e decisões, com os remanescentes na §13; nenhum achado adiado/parcial deve aparecer como integralmente corrigido.
- **Riscos aceitos**: pendente.
- **Data de fechamento**: pendente.
