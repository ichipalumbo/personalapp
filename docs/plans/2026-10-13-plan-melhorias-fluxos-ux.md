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

- [x] F1 conforme D1/D9 (T01 executado em 2026-10-13 — provas na §11 e registro na §12): modais de escolha exibem **data e horário da ocorrência clicada** e **nome do aluno**; formatação aprovada aplicada (“Sáb., 17/10 · 18:00”); sem limitações remanescentes no cabeçalho.
- [ ] F2 conforme D3: opção A mostra valor e aviso de congelamento; opção B mostra só o aviso e deixa a ausência do valor registrada como tratamento parcial.
- [ ] F3 conforme D4: A explica o ajuste com dados existentes; B apresenta prévia oficial do backend; C deixa o cartão adiado. Nenhuma opção reimplementa cálculo no frontend (regra 4.3 do repo).
- [ ] F4: fechar o modal de ação preserva a posição de rolagem da Semana, inclusive após os callbacks e a rolagem assíncronos terminarem.
- [ ] F5 conforme D5: textos aprovados alinhados ao fluxo real; F5c e qualquer decisão de não alterar ficam registrados separadamente.
- [ ] Achados absorvidos no T05 (D11=A): rótulos das opções de exclusão no modo Dia exibem o dia selecionado em formato legível; o corte do "daqui pra frente" parte do dia selecionado, não da raiz; "Agendado para" do modal de ação sem ISO cru.
- [ ] F6/F7: falha do financeiro oferece recuperação direta sem recarregar a página; histórico de reposições não afirma "nenhuma" durante o carregamento.
- [ ] Regressão: suíte frontend medida antes/depois de cada cartão que a afete; suíte backend também quando houver mudança em `backend/`, inclusive na exceção D4=B. Números medidos registrados na §12, sem regressões.
- [ ] Nenhuma regra de negócio alterada; arquivos do backend somente na exceção aprovada D4=B, reutilizando o cálculo oficial. Nenhuma escrita em produção; validação de UI no mock (433×762, DPR 2.81 e emulação mobile completa; 320×568 e 390×844 como stress).
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
| Formato aprovado da linha de data/hora: `Sáb., 17/10 · 18:00` | 2026-10-13 | dono | Capitalização aplicada no contexto de exibição; o formato global do app (minúsculo) permanece |
| Continuar na branch `diag/auditoria-fluxos-ux` nesta rodada (registro documental) | 2026-10-13 | dono | Working tree do T01 preservado; nenhuma escrita de código nesta rodada |
| D11 = A — achados do T01 absorvidos no T05 (exibição + âncora de execução) | 2026-10-13 | dono | T05 passa a corrigir também o corte do "daqui pra frente" no modo Dia; validação de escrita no mock e teste automatizado entram no cartão |

## 4. Decisões pendentes

| # | Pergunta | Opções | Bloqueante? |
|---|---|---|---|
| D1 | F1: corrigir cabeçalho dos modais? Formato do subtítulo | **Resolvida (2026-10-13): B** — contexto passado pelo chamador; formato aprovado `Sáb., 17/10 · 18:00` | — (executada no T01) |
| D2 | F4: preservar rolagem | A: não re-renderizar no fechamento (validar dependências do re-render) / B: re-renderizar e restaurar `scrollTop` capturado | **sim (T02)** |
| D3 | F2: conteúdo do modal de pagamento | A: valor do ciclo + aviso de congelamento / B: só o aviso | **sim (T03)** |
| D4 | F3: efeito do ajuste | A: texto + valores já visíveis na tela / B: prévia calculada pelo backend / C: não alterar | **sim (T04)** |
| D5 | F5: redação final + F5c (linha de prazo §9.3) | A: ajustar textos aprovados nesta frente + F5c fica para spec própria / B: tudo nesta frente / C: só registrar | **sim (T05)** |
| D6 | F6: recuperação do financeiro | A: absorver roadmap 1.11 (botão Atualizar) cobrindo o estado de erro / B: só "Tentar novamente" no erro | **sim (T06)** |
| D7 | F7: corrigir resumo em carregamento | A: "Atualizando…"/esqueleto conforme §9.4.3 / B: ocultar resumo no load | **sim (T07)** — baixo risco não dispensa a escolha do dono |
| D8 | Pré-pago (mês futuro) | Spec nova / roadmap / adiar | não — fora desta frente |
| D9 | F1 formato legível: ISO atual ("2026-09-26") aparece por fallback do formatador — corrigir junto? | **Resolvida (2026-10-13): Sim** — normalizar a exibição no formatador | — (executada no T01) |
| D10 | Ordem de execução, ainda não aprovada | A: por risco, conforme a auditoria (§11) / B: por tema, conforme a sugestão anterior / C: outra ordem definida pelo dono | **sim (ordem da execução)** |
| D11 | Achados do T01 (opções de exclusão no modo Dia + "Agendado para"): destino | A: T05 absorve exibição + âncora de execução / B: T05 só exibição / C: cartão novo | **Resolvida (2026-10-13): A** | — (executada no T05) |

Responder uma decisão libera apenas o respectivo cartão, não os demais. D3=B resulta em tratamento parcial de F2; D1=C, D4=C e D5=C deixam os respectivos trabalhos adiados. A ordem da §9 é uma proposta, não uma decisão fechada.

## 5. Escopo

- **Arquivos prováveis**: `assets/js/modal-acao-slot.js` (T01; T05 — rótulos, âncora do "daqui pra frente" e "Agendado para", D11), `assets/js/view-calendario.js` (T02), `assets/js/view-financas.js` (T03, T04, T06), `index.html` (T05, textos), `assets/js/modal-agendamento.js` (T05), `assets/js/view-alunos.js` (T07); testes em `tests-frontend/` quando aplicável (ex.: `modal-acao-slot.test.js`, `view-financas-*.test.js`, `c-alunos-complementos.test.js`).
- **Exceção condicionada a D4=B**: serviço/rota de prévia no backend, testes em `backend/test/` e respostas/cenários em `mocks/ui-runtime/`. Definir e registrar o contrato da API na spec de finanças antes de implementar; não escolher rota ou nomes de campos implicitamente.
- **Documentos**: este plano; `docs/roadmap.md` (item 1.11 e itens relacionados); spec de finanças se D3 exigir registrar o texto e obrigatoriamente se D4=B introduzir o contrato de prévia.
- **Comportamentos que podem mudar**: cabeçalho dos modais de escolha; modal de pagamento; modal de ajuste; rolagem ao fechar modal; textos; estado de falha do financeiro; resumo de reposições no carregamento; exibição das opções de exclusão no modo Dia e âncora do corte do "daqui pra frente" (T05/D11); formatação da linha "Agendado para". Nenhuma regra de valor, status ou persistência muda; a prévia D4=B é somente leitura.

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

### Cartão T02 — Fechar o modal preserva a posição da Semana (F4)
- **Objetivo / resultado**: após fechar o modal de ação de uma aula em dia distante, a Semana permanece na mesma posição de rolagem (nenhum salto para "hoje").
- **Depende de**: D2.
- **Arquivos / componentes prováveis**: `assets/js/view-calendario.js` (`abrirCalendarioAcaoSlot`: wrapper de fechamento; `renderizarHomeSemana`: `scrollIntoView` pós-render); possível teste em `tests-frontend/` se a lógica for extraída, **sem** refatorar por testabilidade sem necessidade.
- **Inclui**: garantir que o fechamento não reposicione indevidamente; se D2=B, capturar/restaurar `scrollTop`; validar que ações com sucesso continuam atualizando os cards; sanar o empilhamento de wrappers (inferência do diagnóstico) se confirmado.
- **Não inclui**: remover a rolagem inicial legítima ao abrir a tela (`hoje` como âncora de primeira carga); mudar `renderizarHomeDia` além do necessário.
- **Decisões pendentes / bloqueios**: D2 (dono).
- **Critérios de aceite**: em uma semana que contenha "Hoje", abrir o modal de um dia distante e fechar sem salto de rolagem, inclusive depois dos callbacks atrasados e da rolagem suave terminarem. Ações que alteram o card continuam refletindo a mudança; a rolagem inicial legítima permanece.
- **Validação**: mock `default`+`mockEscrita=1`, com a emulação da §10. Registrar o relógio/data usados e garantir que a semana contém "Hoje"; controlar o relógio apenas nos testes se necessário. Medir a posição do contêiner que realmente rola (`scrollY` da janela ou `scrollTop` do contêiner) antes de abrir e depois de fechar, após o callback atual de 120ms e qualquer rolagem suave terminarem. Repetir abrir/fechar 3× e conferir exclusão/edição no mock; suíte frontend antes/depois. Uma medição imediatamente após fechar não comprova o aceite.
- **Riscos e rollback**: médio — o re-render no fechamento pode ter dependência oculta; validar com o fluxo de exclusão e edição no mock. Revert simples.
- **Limite de tentativas**: no máximo 2. Na segunda falha, registrar a falha e seguir.

### Cartão T03 — Modal "Marcar como pago": valor e congelamento (F2)
- **Objetivo / resultado**: se D3=A, exibir o valor do ciclo e o aviso de congelamento; se D3=B, exibir somente o aviso e registrar F2 como parcialmente tratado, com a ausência do valor ainda pendente.
- **Depende de**: D3.
- **Arquivos / componentes prováveis**: `assets/js/view-financas.js` (`abrirModalPagamento`/`ensureModais` — resumo do modal); texto em `index.html` se o modal for montado lá; `tests-frontend/view-financas-*.test.js` se a montagem do resumo for testável.
- **Inclui**: conteúdo aprovado em D3. Na opção A, valor do ciclo selecionado no resumo, vindo da API (listagem ou histórico), sem cálculo novo; redação do aviso aprovada; registrar na spec de finanças se o dono decidir que é contrato.
- **Não inclui**: alterar PATCH de pagamento, extrato, congelamento, badge/status do card.
- **Decisões pendentes / bloqueios**: D3 (dono) — conteúdo e redação.
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
- **Decisões pendentes / bloqueios**: D4 (dono) — A/B/C; B também exige contrato registrado e aprovado antes da implementação.
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
- **Decisões pendentes / bloqueios**: D5 (dono).
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

## 13. Achados não alterados

| Risco/achado | Por que não foi tratado | Destino | Dono |
|---|---|---|---|
| Pagamento antecipado (mês futuro, "recebido em X cobre Y") | Exige decisão de produto e spec nova — não é defeito | roadmap + spec futura | dono |
| Alvos de toque do topo (26–34px; roadmap 5.9) | Já mapeado; fora do escopo desta frente | roadmap 5.9 | dono |
| Empilhamento de wrappers de `fecharModalAcaoSlot` (inferência) | Será sanado (ou registrado) no T02 | este plano, T02 | agente |
| F5c — linha de prazo §9.3 no modal de escolha | Depende de D5; origem do dado precisa de confirmação (prazo nasce no envio) | este plano, T05 / spec | dono |
| F2 — valor ausente no modal, se D3=B | A opção B trata apenas o aviso; ausência do valor continua pendente | registrar tratamento parcial nas §12/§13 | dono |
| Achados adiados por D1=C, D4=C ou D5=C; formatação mantida por D9=Não | Não declarar corrigido o que o dono decidir não implementar | registrar decisão e remanescente nas §12/§13 | dono |
| Exclusão em modo Dia: rótulos usam a data-raiz crua e o corte do "daqui pra frente" ancora na raiz (removeria a série inteira; inferência de código) | Absorvido no T05 por D11=A (exibição + âncora de execução); execução pendente | este plano, T05 | agente |
| Modal de ação: linha "Agendado para: 2026-09-25" exibe ISO cru | Absorvido no T05 por D11=A (exibição); execução pendente | este plano, T05 | agente |

## 14. Deploy e rollback

- **Efeito externo**: frontend estático (PWA); se D4=B, também contrato de prévia somente leitura no backend. Nenhuma migração ou escrita de teste em Mongo/GCal; nenhum cartão de produto foi executado nesta revisão.
- **Ordem de publicação**: PR do dono para a `main` → deploy automático nos dois projetos Vercel. Push é sempre do dono (`git push -u origin <branch>` na primeira vez). Se D4=B, definir compatibilidade entre os deploys independentes e verificar disponibilidade do contrato do backend antes de validar a UI dependente.
- **Verificação pós-deploy**: aceite visual pelo dono/Josy no app publicado (não há staging); validação de escritas permanece no mock. Se D4=B, conferir a prévia somente leitura e sua compatibilidade com a UI.
- **Limite do rollback**: realizado pelo dono; reversão do código cobre estas mudanças sem migração/estado remoto de teste. Se D4=B, avaliar compatibilidade UI/API separadamente; não presumir que ambos os deploys revertem juntos.

## 15. Fechamento

- **Critérios atendidos**: pendente.
- **Pendências**: decisões de implementação D2–D7 (D1, D9 e D11 resolvidas); ordem de execução D10; contrato aprovado se D4=B. D8 permanece fora da frente. Executar e validar somente os cartões liberados.
- **Registro obrigatório**: classificar F1–F7 como corrigido, parcialmente tratado ou adiado conforme os resultados e decisões, com os remanescentes na §13; nenhum achado adiado/parcial deve aparecer como integralmente corrigido.
- **Riscos aceitos**: pendente.
- **Data de fechamento**: pendente.
