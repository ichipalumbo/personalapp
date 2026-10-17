# Diagnóstico — Clareza e fluidez nos fluxos Semana, Reposições e Financeiro

> **Data**: 2026-10-13
> **Status**: concluído
> **Escopo**: **somente leitura** — nenhum arquivo de produto foi alterado nesta rodada; os únicos artefatos são este documento e o plano `docs/archive/plans/2026-10-13-plan-melhorias-fluxos-ux.md`
> **Fontes consultadas**: inspeção manual no mock (`mocks/ui-runtime/` servido por `scripts/servir-local.js`), código (`index.html`, `assets/js/view-calendario.js`, `assets/js/modal-acao-slot.js`, `assets/js/modal-agendamento.js`, `assets/js/view-financas.js`, `assets/js/view-alunos.js`, `assets/js/utils-datetime.js`), specs (`docs/specs/financas-ciclo-cobranca.md` v15; `docs/specs/reposicoes-e-competencia.md` v14), `docs/archive/roadmaps/roadmap-v1.md`, suítes de teste (medidas em 2026-10-13), benchmark público de mercado
> **Válido contra**: `2041d08` — branch `diag/auditoria-fluxos-ux`, working tree limpo

---

## 1. Pergunta investigada

Os três fluxos de maior uso no dia a dia — **Semana** (agenda), **Reposições** e **Financeiro** — estão claros e fluidos o suficiente para uso diário, e onde estão os pontos concretos de atrito ou de divergência entre o que a tela mostra e o que a spec e o código determinam?

---

## 2. Resumo executivo

- **Sintoma**: os fluxos funcionam de ponta a ponta (incluindo escrita validada no mock), mas há sete pontos de atrito que custam tempo ou confiança no uso diário — o mais grave exibindo **data errada em um modal de decisão financeira** (F1).
- **Causa**: combinação de (a) cabeçalhos de modal alimentados pelo compromisso-raiz da série em vez da ocorrência clicada (F1); (b) ausência de valor e de aviso de congelamento no modal de pagamento (F2); (c) ajuste manual sem consequência visível, limitado pela regra de não duplicar cálculo no frontend (F3); (d) re-render + rolagem automática da semana ao fechar modal (F4); (e) textos desatualizados de produto (F5); (f) falha de carregamento sem caminho de recuperação direto (F6); (g) estado de carregamento do histórico de reposições que mostra "nenhuma" antes de saber o resultado (F7). Causas **confirmadas** por leitura de código + observação no mock para F1–F4 e F7; F5a é contradição direta de spec; F5b é texto de scaffolding.
- **Impacto**: decisão de cobrança com data errada (risco de registrar competência no lugar errado), pagamento confirmado sem ver o valor, ajuste sem ver o efeito, perda da posição na agenda ao consultar um dia distante, textos que prometem caminhos que não existem, e becos sem saída em caso de falha.
- **Nível de confiança**: **alto** para F1, F2, F3, F4, F5a, F5b, F6 e F7 (observados no mock e conferidos no código); **médio** para o item de prazo do §9.3 (ver F5c — pergunta em aberto, não defeito fechado) e para a descrição do empilhamento de wrappers em F4 (leitura de código, não medido em runtime).

---

## 3. Escopo e fora de escopo

- **Examinado**: aba Semana da Home (default, agendaLotada, vazio), fluxo de ação do slot (ações, edição, exclusão, envio para reposição), modais de escolha (cobrança/exclusão), histórico de reposições do card do aluno, tela Finanças (cards, pagamento, ajuste, falha de leitura), fluxos de escrita no mock, viewport 433×762 (referência) + 390×844 e 320×568 (stress), medições de alvos de toque.
- **Não examinado**: tela de Configurações, sincronização Google Calendar (somente leitura de código), backend em produção, dados reais, autenticação (tratada em frentes próprias), performance/custos, fluxo do modo Dia a fundo (usa o mesmo motor do modo Semana, mas não foi navegado item a item nesta rodada).
- **Confirmação**: nenhum arquivo de produto foi alterado. As suítes foram apenas executadas (somente leitura).

---

## 4. Estado atual medido

### 4.1 Método

- Frontend servido pelo servidor estático versionado: `node scripts/servir-local.js` → `http://127.0.0.2:5500`.
- Mock `mocks/ui-runtime/` com cenários `default` e `vitrineEstados`; escrita habilitada só com `?mockEscrita=1` (cenário `default`, store em memória, sem rede real); falha simulada com `?mockFalha=financas`.
- Emulação mobile completa via CDP: viewport de referência 433×762 com DPR 2.81; stress em 390×844 e 320×568. Sem overflow horizontal em nenhum dos três.
- O mock intercepta `/api/*`, finge login, limpa caches e **não toca dado real**. Nenhuma escrita saiu para a rede/banco.

### 4.2 Evidências por achado

| ID | Achado | Evidência observada (texto exato no mock) |
| --- | --- | --- |
| F1 | Modal de decisão usa a data-raiz da série, não a ocorrência clicada; exclusão ainda perde o nome do aluno | Ocorrência de sábado 17/10/2026 (série semanal raiz 26/09). Modal "Cobrar esta aula?" exibiu `Maria Silva` / `2026-09-26 · 18:00`. Modal "Excluir" exibiu `Aluno · 2026-09-26 · 18:00` — enquanto as opções corretas mostravam `Só 17/10/2026 sai da agenda...` e `17/10/2026 em diante` |
| F2 | "Marcar como pago" não mostra o valor nem o aviso de congelamento | Modal observado: `Marcar como pago` / `Maria Silva • 01/09/2026 → 30/09/2026` / `Data do pagamento` / `Forma de pagamento` / `Cancelar` / `Salvar`. Sem `R$ 220,00` (valor existia no card atrás do modal). Sem menção de que o ciclo congela permanentemente após o pagamento |
| F3 | "Ajuste manual" não mostra o efeito do ajuste | Modal observado: `Ajuste manual` / `Maria Silva • 01/09/2026 → 30/09/2026` / `Ajuste de aulas (pode ser negativo)` (pré-preenchido `1`) / `Observação` / `Cancelar` / `Salvar`. Sem "novo total", sem explicação de que o valor substitui o ajuste atual, sem preço/aula visível |
| F4 | Fechar o modal re-renderiza a semana e salta a rolagem | Rolagem em `516` ao abrir o modal da aula de sábado; ao fechar (Voltar), a rolagem foi para `96` — o sábado (topo em `829`) saiu da viewport. O Google Agenda Android preserva a posição (benchmark, §4.6) |
| F5 | Textos desatualizados de produto | (a) `index.html:1464`: "A aula sai da agenda deste dia e entra na fila de reposições. Você escolhe a nova data depois, **na aba Reposições**." — aba que a spec diz que não existe e não será criada. (b) `modal-agendamento.js:178-179`: "A configuração detalhada da repetição será conectada no próximo passo." (variante: "será refinada no próximo passo do fluxo.") — leitura de produto inacabado |
| F6 | Finanças sem recuperação direta em falha de leitura | `?mockFalha=financas` exibiu "Não foi possível atualizar agora." (no cabeçalho e na área, duas vezes), sem nenhum botão de tentar novamente/atualizar (`retry: []` na inspeção) |
| F7 | Histórico de reposições mostra "nenhuma" durante o carregamento | Ao abrir o histórico e ao reabrir após cancelar um reagendamento: resumo `Maria Silva · nenhuma reposição` com o anúncio `Carregando histórico de reposições`; após o load, corrige para `1 pendente · 1 realizada`. A spec §9.4.3 diz "nunca mostrar vazio" no estado de carregamento |

### 4.3 Medições de toque (já mapeadas no roadmap 5.9 — registradas aqui para completude)

| Alvo | Altura medida | Referência de toque (44px) |
| --- | --- | --- |
| Aba "Semana" (barra inferior) | 32px | abaixo |
| Setas de navegação de período | 26px | abaixo |
| Botão "Hoje" | 28px | abaixo |
| Cabeçalho do dia na semana | 34px | abaixo |
| FAB | 58px | ok |

Nenhum destes é achado novo — todos constam do item 5.9 do `docs/archive/roadmaps/roadmap-v1.md` e seguem sem correção.

### 4.4 Suítes de teste (baseline medido)

| Suíte | Resultado | Duração | Data |
| --- | --- | --- | --- |
| `tests-frontend/` (`node --test`) | **360 pass / 360** — 0 fail | ~18,6s | 2026-10-13 |
| `backend/` (`node --test`) | **232 pass / 232** — 0 fail | ~36,8s | 2026-10-13 |

Números medidos nesta rodada; não lidos de documentação. As duas suítes ficaram verdes — os achados deste diagnóstico são de exibição/interação, não de regra de negócio.

### 4.5 Fluxos de escrita exercitados no mock (somente `?mockEscrita=1`, cenário `default`)

| Fluxo | Resultado observado |
| --- | --- |
| Criar aula avulsa | `POST` 201; card "Único" aparece no sábado 17/10 14:00 |
| Marcar ciclo como pago | `PATCH` 200; status muda para `PAGO` + toast "Pagamento confirmado com sucesso!" |
| Excluir instância de série | `PUT` 200; aviso "Aula de 17/10/2026 excluída. A série continua nos outros dias."; exceção `17/10/2026` gravada na série |

### 4.6 Referências de mercado (material público oficial — benchmark, não teste de concorrente)

| App | O que foi observado publicamente | Uso proposto |
| --- | --- | --- |
| Google Agenda (Android) | Edição de evento recorrente pergunta o escopo ("Este evento" / "Este e os seguintes") **com a data do evento aberto**; criar recorrente é um seletor "Não se repete" no topo do formulário; fechar folhas preserva a posição da timeline | Referência para F1 (data da ocorrência) e F4 (posição preservada) |
| Calendly | Página Calendar em timeline agrupada por data; ação `Cancel` (com confirmação "Yes, cancel" e mensagem opcional) é **distinta** de `Reschedule` | Referência de clareza entre ações próximas (F1) |
| Tecnofit Personal | App do personal: "Registre os recebimentos e quitações das mensalidades"; financeiro com fluxo de caixa "realizadas ou previstas" e contas a receber; agenda com "controle de presença, faltas e reposições" e fila de espera | Referência para F2 (valor visível antes de confirmar; separação previsto × recebido) |

O benchmark serve para comparação **por tarefa** (ex.: "escolher escopo de recorrência sabendo qual é a ocorrência"), não para copiar funcionalidades.

---

## 5. Reprodução mínima

| ID | Pré-condições | Passos | Observado | Esperado |
| --- | --- | --- | --- | --- |
| F1 | `node scripts/servir-local.js`; `index.html?mockScenario=default`; emular mobile | Navegar a Semana até 17/10/2026 (ocorrência da série de sábado da Maria) → tocar no card → "Enviar para reposição" (e, de novo, "Excluir") | Data `2026-09-26 · 18:00` nos dois modais; nome `Aluno` no modal de exclusão | Nome do aluno + **data e horário da aula em questão** (17/10), como as próprias opções do modal de exclusão já mostram |
| F2 | idem | Finanças → card da Maria (ciclo atrasado R$ 220,00) → "Marcar como pago" | Modal sem valor e sem aviso de congelamento | Valor do ciclo visível e aviso de que o ciclo fica congelado após o pagamento |
| F3 | idem | Finanças → card da Maria → "Ajuste manual" | Campo `1` pré-preenchido; sem efeito exibido | Usuário entende o que o campo substitui e qual o efeito no total |
| F4 | idem | Semana → rolar até o sábado (rolagem ~516) → tocar na aula → fechar o modal | Rolagem salta para ~96; o dia consultado sai da tela | Posição de rolagem preservada ao fechar |
| F5 | idem | (a) modal de escolha de reposição (texto do parágrafo); (b) abrir modal de agendamento e ver o subtítulo da repetição | Textos "na aba Reposições" e "no próximo passo" | Textos que descrevem o fluxo real (sem aba; sem promessa de passo futuro) |
| F6 | `index.html?mockScenario=default&mockEscrita=1&mockFalha=financas` | Abrir tela Finanças | "Não foi possível atualizar agora." sem nenhuma ação | Ao menos uma ação direta de tentar de novo / atualizar |
| F7 | idem ao F1 | Alunos → card da Maria → bloco Reposições (abrir durante o carregamento) | `nenhuma reposição` enquanto carrega | Estado de carregamento explícito; sem afirmar "nenhuma" antes do resultado |

---

## 6. Cadeia causal

- **F1 — data/nome do cabeçalho dos modais de escolha.**
  Entrada: toque no card da ocorrência → `abrirCalendarioAcaoSlot(id, dataStr)` grava a data clicada em `window.dataAlvoAcaoStr` (`view-calendario.js`). O modal de ações e `montarOpcoesExclusaoSlot` usam essa data corretamente (as opções saem certas). **Ponto exato da divergência**: os cabeçalhos usam outra fonte — `abrirModalEscolhaCobrancaReposicao` monta `dataOriginal = compromisso.data` (raiz da série) e `abrirModalEscolhaExclusao` usa `compromisso.alunoNome || compromisso.aluno || "Aluno"` e `compromisso.data || compromisso.dataInicio` (`modal-acao-slot.js`). O nome correto existe: o modal de cobrança usa `window.getAluno(compromisso.alunoId)`; o de exclusão não faz esse lookup. Observação adicional: com `data` em ISO ("2026-09-26"), `formatarDataPtBrLegivel` devolve a entrada sem converter (parse pt-BR falha), então o modal exibiu o ISO cru — **inferência de leitura de código, consistente com o texto observado**.
- **F2 — valor/congelamento ausentes no pagamento.**
  `abrirModalPagamento` (`view-financas.js`) monta o resumo apenas com `nome • cicloInicio → cicloFim`; o valor (`valorTotalCiclo`) está disponível no card que abriu o modal, mas não é levado ao modal. O congelamento pós-pagamento (spec §5/§6; HTTP 409 para ajustes posteriores) não é comunicado em nenhum texto do modal — o usuário só descobre o efeito depois, com botões desabilitados.
- **F3 — ajuste sem efeito visível.**
  `abrirModalAjuste` (`view-financas.js`) pré-preenche `aulasManuaisExtras` e não exibe o resultado. Pela regra 4.3 do repositório, o frontend **não pode reimplementar** o cálculo (total, piso zero) — o caminho correto depende de decisão (ver §10): ou a API devolve prévia, ou o modal explica o efeito em texto sem número calculado localmente.
- **F4 — rolagem perdida ao fechar modal.**
  `abrirCalendarioAcaoSlot` (`view-calendario.js`) substitui `window.fecharModalAcaoSlot` por um wrapper que, ao fechar, chama `renderizarHomeSemana()` e `renderizarHomeDia()`. `renderizarHomeSemana` termina com `setTimeout(..., 120)` → `scrollIntoView` para `semana-dia-hoje-elemento`. Resultado: fechar o modal re-renderiza a grade e rola de volta para perto de "hoje". **Inferência adicional (leitura, não medida)**: cada abertura empilha um novo wrapper capturando o anterior como "original", então N aberturas encadeiam N re-renderizações no fechamento.
- **F5 — textos desatualizados.**
  (a) `index.html:1464` promete "na aba Reposições", que a spec §9.4 declarou inexistente (a gestão é no card do aluno; o FAB "Agendar Reposição" e o histórico do aluno são os caminhos reais). (b) `modal-agendamento.js:178-179` traz texto de scaffolding ("no próximo passo"). (c) não existe nenhuma ocorrência de "Prazo para reposição" no código, embora a spec §9.3 preveja essa linha no rodapé do modal de escolha quando houver prazo — pergunta em aberto (§12), porque o prazo nasce no envio (§6.1) e o modal de escolha acontece antes.
- **F6 — sem recuperação no financeiro.**
  Em falha de leitura sem cache, `view-financas.js` grava `STATE.erro = "Não foi possível atualizar agora."` e renderiza estado vazio — sem ação de recarga (o roadmap já registra o item 1.11 nesse sentido).
- **F7 — "nenhuma" durante carregamento.**
  O resumo do histórico (`view-alunos.js`) trata "sem dados ainda" como "nenhuma reposição" enquanto o fetch do aluno está em voo; a spec §9.4.3 exige esqueleto + anúncio de carregamento, sem afirmar vazio.

---

## 7. Relação com contratos e specs

- **O que está definido**:
  - `docs/specs/reposicoes-e-competencia.md` §9.3: modal de escolha deve exibir **"a data e o horário da aula em questão"**, formato `Terça, 10/03 · 08:00`, nome do aluno obrigatório; rodapé fixo `Não pode ser alterado depois.`; `Prazo para reposição: até dd/mm.` quando houver prazo.
  - §9.4 e §11 (#23): a gestão de reposições é **no card do aluno**; "a aba não existe e não será criada nesta V1"; §9.4.3: no carregamento do modal, esqueleto e "nunca mostrar vazio".
  - `docs/specs/financas-ciclo-cobranca.md` §5/§6 e §7 (#16, #22, #27): ciclo pago é congelado; recálculo usa snapshot; ajuste manual com piso zero.
  - Regra 4.3 do repositório: cálculo de negócio não pode ser duplicado no frontend.
- **O que está omisso**: nada na spec sobre mostrar o valor/congelamento **dentro** do modal de pagamento (F2) nem sobre o efeito do ajuste no modal (F3) — são lacunas de UX, não contradições; qualquer solução exige decisão do dono.
- **Contradições encontradas**: F5a é contradição direta entre `index.html` e §9.4/§11#23 (texto promete aba inexistente). F1 contradiz §9.3 (data exibida é a da raiz, não "a aula em questão"). F7 contradiz §9.4.3 (mostra vazio durante carregamento).
- **Decisões documentadas que NÃO devem ser tratadas como defeito**: o rodapé `Não pode ser alterado depois.` convive com a edição de cobrável em ciclo aberto (§6.4/§11#3) — texto fixado pela própria spec; os alvos de toque do topo (roadmap 5.9) já estão mapeados.

---

## 8. Evidências classificadas

| Classificação | Conteúdo |
| --- | --- |
| **Fato observado** (mock + leitura de código) | F1 (textos exatos nos dois modais; campos `compromisso.data`/`alunoNome` no código; `dataAlvoAcaoStr` correto disponível); F2/F3 (textos exatos; resumos montados só com nome+período); F4 (rolagem 516→96; wrapper + `setTimeout` + `scrollIntoView` no código); F5a/F5b (linhas exatas em `index.html:1464` e `modal-agendamento.js:178-179`); F5c (nenhuma ocorrência de "Prazo para reposição" no código); F6 ("Não foi possível atualizar agora." sem botão); F7 (resumo "nenhuma reposição" com anúncio de carregamento); suítes 360/360 e 232/232 |
| **Inferência** | Em F1, que o ISO cru apareceu porque `formatarDataPtBrLegivel` devolve a entrada quando o parse falha; em F4, que os wrappers empilham a cada abertura de modal (N aberturas → N re-renderizações no fechamento); em F3, que a decisão de implementação precisará ou de prévia da API ou de texto sem número |
| **Hipótese (a confirmar)** | F5c: que a linha "Prazo para reposição: até dd/mm." deva aparecer no modal de escolha **antes** do envio (a spec diz que o prazo "vem do campo retornado pela API", mas o prazo nasce no envio — §6.1) |
| **Decisão já documentada** | Rodapé "Não pode ser alterado depois." é texto fixado pela spec e convive com a edição de cobrável (§6.4/§11#3); alvos de toque do topo são o item 5.9 do roadmap; repasses de escrita sempre confirmam HTTP antes de UI (§5, seção "Código que calcula dinheiro" das instruções do repo) |

---

## 9. Impacto e severidade

| ID | Severidade | Usuário | Dados | Operação | Reversibilidade |
| --- | --- | --- | --- | --- | --- |
| F1 | **Alta** | Decisão de cobrança tomada olhando data errada | Risco de registrar competência no ciclo errado (a decisão está certa nas opções, errada no cabeçalho) | Aparece em todo envio para reposição/exclusão de série | Só exibição; correção barata |
| F2 | **Alta** | Confirma pagamento sem ver o valor; não sabe que congela | Nenhum (valor não muda) | Alto uso mensal (todo ciclo pago) | Só exibição |
| F3 | Média-alta | Ajuste vira tentativa e erro | Nenhum direto; ajuste é reversível enquanto não pago | Médio | Só exibição (com cuidado na regra 4.3) |
| F4 | Média | Perde a posição na agenda a cada consulta | Nenhum | Frequente (toda consulta a dia distante) | Só interação |
| F5 | Média | Textos prometem caminhos/próximos passos inexistentes | Nenhum | Reduz confiança de uso | Só exibição (F5a contradiz spec — alinhar com §9.4) |
| F6 | Média | Beco sem saída em falha; só "Sincronizar Dados" resolve | Nenhum | Intermitente (rede) | Só interação |
| F7 | Baixa | Leitura momentânea falsa ("nenhuma") | Nenhum | Intermitente | Só exibição |

---

## 10. Opções

### F1 — Data e nome no cabeçalho dos modais de escolha
- **A (recomendada)**: usar `window.dataAlvoAcaoStr` (já disponível) para data/hora da ocorrência nos dois modais e `window.getAluno(compromisso.alunoId)` (nome) também no modal de exclusão; formatar via `formatarDataPtBrLegivel` com fallback seguro para ISO. Só exibição; alinha com §9.3.
- **B**: mudar os chamadores para passar um contexto explícito (`{nome, dataHora}`) aos modais. Mais estrutural, mesma superfície de arquivos.
- **Exige decisão humana?** Sim — confirmar F1 como correção (e se o formato do subtítulo deve seguir o padrão da spec `Terça, 10/03 · 08:00`).

### F2 — Pagamento: valor e congelamento
- **A**: exibir o valor do ciclo (do dado já carregado na tela) + linha de aviso de congelamento no modal. Ajuste de texto pode exigir registro na spec de finanças.
- **B**: apenas o aviso de congelamento (sem valor). Menor, porém mantém o risco de não memorizar o valor.
- **Exige decisão humana?** Sim — conteúdo e redação (produto).

### F3 — Ajuste: efeito visível
- **A**: texto explicativo + valor do ciclo/preço-aula já presentes na tela (sem calcular novo total no front).
- **B**: prévia do resultado calculada pelo **backend** (ex.: campo na resposta ou endpoint de simulação) — mais desenvolvimento, respeita 4.3 integralmente.
- **C**: não alterar; manter como está, se o uso real não incomodar (consultar dono).
- **Exige decisão humana?** Sim — qual abordagem e se aceita custo de backend.

### F4 — Posição preservada ao fechar modal
- **A**: não re-renderizar a semana no fechamento (remover o wrapper) ou preservar a rolagem antes/depois do re-render. Cuidado: o re-render existe por motivo (atualizar card após ação); a ação de sucesso continua atualizando via fluxo de dados — validar que nenhum caso dependa do re-render de fechamento.
- **B**: manter re-render e restaurar `scrollTop` capturado antes.
- **Exige decisão humana?** Sim — comportamento desejado (manter atualização × preservar posição; provavelmente ambos).

### F5 — Textos
- **A**: alinhar `index.html:1464` à spec §9.4 (sem "aba Reposições") e revisar os textos de scaffolding do `modal-agendamento.js`.
- **B**: manter e só registrar.
- **Exige decisão humana?** Sim — redação final e se F5c (prazo no modal de escolha) deve ser tratado nesta frente ou em spec própria.

### F6 — Recuperação no financeiro
- **A**: absorver o item 1.11 do roadmap (botão Atualizar) já com estado de erro — mesma mudança cobre os dois.
- **B**: só botão "Tentar novamente" no estado de erro.
- **Exige decisão humana?** Sim — qual forma e se entra nesta frente.

### F7 — Histórico de reposições no carregamento
- **A**: trocar o resumo para estado de carregamento ("Atualizando…" / esqueleto) conforme §9.4.3.
- **B**: ocultar o resumo durante o load.
- **Exige decisão humana?** Sim — confirmar correção (baixo risco).

---

## 11. Recomendação

Priorizar **F1 e F2** (decisão financeira com informação errada/ausente — maior dano por uso), depois **F4** (fricção diária mais frequente), **F7 e F6** (baixas, alto retorno), **F5** (higiene de produto) e **F3** por último, por depender de decisão sobre superfície de backend. Nenhuma alteração deve mexer em regra de negócio: todas as opções acima são de exibição/interação, exceto F3-B, que adiciona campo/serviço no backend e por isso exige mais cuidado (suíte de backend antes/depois).

---

## 12. Perguntas pendentes

| # | Pergunta | Bloqueante? | Dono da decisão |
| --- | --- | --- | --- |
| 1 | Corrigir F1 nesta frente? Formato do subtítulo segue `Sáb., 17/10 · 18:00` (spec §9.3) ou outro? | sim (para T01) | dono do repo |
| 2 | F2: mostrar valor **e** aviso de congelamento? Redação do aviso? | sim (para T03) | dono do repo |
| 3 | F3: abordagem A (texto+valores existentes), B (prévia via backend) ou C (não alterar)? | sim (para T04) | dono do repo |
| 4 | F4: preservar posição com ou sem re-render (A ou B)? Algum caso depende do re-render no fechamento? | sim (para T02) | dono do repo |
| 5 | F5: redação aprovada; F5c (linha de prazo §9.3) entra nesta frente, em spec própria ou sai? | não bloqueia T05; bloqueia F5c | dono do repo |
| 6 | F6: tratar junto do roadmap 1.11? Botão "Atualizar" no cabeçalho basta para o caso de falha? | sim (para T06) | dono do repo |
| 7 | F7: confirmar correção do resumo em carregamento | não (baixo risco) | dono do repo |
| 8 | Lacuna de **pagamento antecipado** (quitar mês futuro; "recebido em X, cobre Y") — entra em spec nova? (ver §13) | não | dono do repo |
| 9 | Parar o servidor mock ao final da rodada ou deixar rodando para validação? | não | dono do repo |

---

## 13. Achados fora do escopo

| Achado | Destino sugerido |
| --- | --- |
| **Pagamento antecipado não representável**: hoje só existe o ciclo vigente (lazy); não há ação para quitar um período futuro antecipadamente nem representação "recebido em outubro, cobre novembro"; ajustes pós-pagamento hoje ficam na conversa (WhatsApp) e editar ciclo pago é 409 por design. Requer decisão de produto e spec. | `docs/archive/roadmaps/roadmap-v1.md` (novo item) + spec futura |
| Alvos de toque do topo (26–34px medidos; roadmap 5.9) | já mapeado — roadmap 5.9 |
| "Sincronizar Dados" fora do topo / refresh manual | já coberto pelo item 1.11 do roadmap |
| Texto "Não pode ser alterado depois." vs. edição de cobrável | decisão documentada (§9.3 × §6.4/§11#3) — não tratar como defeito |
| Empilhamento de wrappers de `fecharModalAcaoSlot` (inferência) | resolver dentro de F4 se confirmado; se sobrar, registrar em diagnóstico próprio |

---

## 14. Critério para abrir o plano

Decisões 1–4 e 6–7 da §12 respondidas pelo dono (corrigir/não corrigir e redações), com confirmação de que a frente **não altera regra de negócio** — feitas, o plano `docs/archive/plans/2026-10-13-plan-melhorias-fluxos-ux.md` fica executável cartão a cartão. Enquanto as decisões estiverem abertas, a implementação correspondente não deve começar.
