# Diagnóstico — item 1.10: histórico de reposições no card do aluno

> Origem: item 1.10 de `docs/roadmap.md`.
> Atualizado em 2026-09-21 após a decisão de produto de substituir a tela dedicada por gestão contextual no card de Alunos.
> Escopo desta rodada: verificação de código, avaliação de esforço e plano de implementação. **Nenhum código de produção foi alterado.**
>
> Fonte de verdade: `docs/specs/reposicoes-e-competencia.md`, seção 9.4. Este diagnóstico substitui a proposta anterior de aba, router, lista global e drill-down em tela própria.

---

## 1. Conclusão executiva

O item permanece viável com esforço **médio**, mas fica mais concentrado e menos invasivo: não exige nova aba, rota, `view-section` ou `view-reposicoes.js`. A entrega entra na tela `Alunos`, onde a PT já encontra o aluno, por meio de um botão de Reposições sempre visível que abre o histórico daquele aluno em modal.

O backend já possui leitura completa por aluno, expiração lazy e transição de `pendente` para `agendada`. O principal trabalho é frontend:

1. tornar o indicador de reposições um botão permanente e independente do clique de editar aluno;
2. manter uma fonte completa de histórico sem alterar o contrato de `aulasParaRepor`;
3. criar o modal de histórico e seus estados;
4. reconectar o reagendamento sem manter dois modais ativos;
5. corrigir a data-base fora da Home e atualizar a UI somente após confirmação;
6. cobrir as novas interações e os cenários de erro.

| Frente | Esforço |
| --- | --- |
| Botão permanente e resumo no card existente | Baixo a médio |
| Modal de histórico, acessibilidade e responsividade | Médio |
| Cache completo separado e sincronização pós-ação | Médio |
| Integração de reagendamento e contexto de retorno | Médio |
| Testes frontend e regressões de fluxo | Médio |
| **Total** | **Médio** |

Não há necessidade de nova collection, migration, rota ou alteração de regra financeira na V1.

---

## 2. Estado atual confirmado

### 2.1 Backend e contratos existentes

`backend/src/models/Reposicao.js` já persiste `ownerEmail`, `alunoId`, `alunoNome`, data/horário original, `cobravel`, `validoAte`, vínculo de agendamento, `historico` e os status `pendente`, `agendada`, `realizada` e `expirada`.

`GET /api/reposicoes` já filtra por `ownerEmail`, aceita `alunoId`, `status`, `dataMin` e `dataMax`, ordena por data/horário original e aplica expiração lazy antes de responder. Portanto:

- o modal pode consultar `GET /api/reposicoes?alunoId={id}` sem rota nova;
- o resumo de todos os cards pode vir de uma única leitura completa;
- `cancelada` não é um status visual da V1, pois não existe no enum persistido.

O PATCH atual registra `agendamentoReposicaoId` e muda a reposição para `agendada`; para reposição não cobrável, `cicloCobrancaResolvido` é derivado pelo servidor. O frontend não deve recalcular ou enviar prazo, competência ou cobrança.

### 2.2 Card de Alunos já tem o ponto de extensão

`assets/js/view-alunos.js` já monta `montarCaixinhaReposicaoAluno(aluno)` e a inclui em `.aluno-card-indicadores`, junto dos indicadores Financeiro e Consistência. Hoje, porém, ela:

- só aparece quando `resumoReposicoesAluno` encontra pendências com prazo;
- usa apenas `aulasParaRepor`;
- renderiza um `div` informativo, sem ação;
- fica dentro de um `.aluno-card` cujo clique abre `prepararEdicaoAluno(id)`.

O card também contém o toggle Ativo/Inativo, que já usa `event.stopPropagation()`. O novo botão deve seguir o mesmo isolamento: se não interromper a propagação, um clique em Reposições abrirá simultaneamente o histórico e a edição do aluno.

### 2.3 A fonte global atual é deliberadamente incompleta

Em `assets/js/storage.js`, `carregarDados()` chama `GET /reposicoes`, mas filtra a resposta para `status === 'pendente'`, mapeia os registros e preenche `aulasParaRepor`. Esse array alimenta o modal de reagendamento e o aviso atual; ampliar seu conteúdo quebraria esse contrato.

Também foi confirmado que `mapearReposicaoParaUI` descarta campos de histórico que o novo modal pode precisar. Logo, o novo cache precisa manter os objetos completos devolvidos pela API, separado de `aulasParaRepor`.

### 2.4 Modal e fluxo de reagendamento existem, mas dependem da Home

`window.iniciarReagendamentoReposicao(id)` em `assets/js/modal-acao-slot.js` já localiza a pendência em `aulasParaRepor`, bloqueia aluno inativo e abre `modalReagendarAula` com o aluno travado.

O submit do formulário calcula a próxima data com `window.dataSelecionada || new Date()`, mas o índice do dia atual é obtido de `window.dataSelecionada` ou cai em domingo (`0`). Fora da Home, isso pode combinar a data de hoje com o índice de domingo e produzir uma próxima ocorrência incorreta.

O fluxo atual também fecha o modal antes de terminar a confirmação e não expõe um contrato de retorno ao chamador. Para o histórico reabrir após sucesso, erro ou cancelamento, a implementação precisa de sinal/contexto explícito; não pode interpretar simplesmente o fechamento do modal como sucesso.

### 2.5 Estilo, markup e testes reutilizáveis

- `index.html` já carrega `reposicao-flow-helpers.js`, `modal-acao-slot.js` e `view-alunos.js` nesta ordem; não será necessário criar nova view nem registro no router.
- `assets/css/style.css` já possui `.aluno-card-indicadores`, `.aluno-card-indicador`, estados de alerta e a base `.modal-overlay`/`.modal` para estender.
- `tests-frontend/reposicao-flow.test.js` cobre o helper de prazo; os testes atuais confirmam `DIAS_ALERTA_REPOSICAO = 5`.
- `tests-frontend/index-html-ordem.test.js` só impõe dependências de carga existentes; o modal novo no HTML não exige tag de script adicional se a lógica permanecer em `view-alunos.js`.
- Os testes backend de API e prazo já cobrem criação, PATCH, expiração e reabertura. Não há mudança de contrato de backend prevista.

---

## 3. Decisões de implementação já fechadas

| Tema | Decisão |
| --- | --- |
| Superfície de gestão | Botão permanente no card de Alunos; não há aba, rota nem tela dedicada na V1. |
| Preservação do card | Clique livre continua editando aluno; toggle continua independente; Reposições é `<button>` com propagação interrompida. |
| Histórico | Modal próprio `modalHistoricoReposicoes`, não acordeão e não segunda tela. |
| Fonte do histórico | Cache separado de registros completos + leitura específica `GET /reposicoes?alunoId=...`; `aulasParaRepor` segue apenas com pendências. |
| Status exibidos | `pendente`, `agendada`, `realizada`, `expirada`; grupos vazios omitidos; sem `cancelada`. |
| Ordem no modal | Grupos: Pendentes, Agendadas, Realizadas, Expiradas; dentro do grupo, data original mais recente primeiro. |
| Reagendamento | Reutiliza `window.iniciarReagendamentoReposicao`; o histórico fecha antes do modal existente abrir. |
| Data fora da Home | A próxima ocorrência parte de hoje e do seu `getDay()` quando não existir contexto válido da Home. |
| Retorno pós-ação | Contexto explícito de retorno e evento/callback apenas após sucesso remoto; erro/cancelamento reabre o mesmo histórico sem sucesso falso. |
| Janela de atenção | **7 dias**, conforme seção 6.5 e 9.4 da spec consolidada; atualizar o helper e seu teste, hoje em 5 dias. |
| Histórico técnico | `historico` não vira timeline completa na V1. |

---

## 4. Plano de execução recomendado

### Etapa 0 — portão de base

1. Rodar as suítes frontend e backend e registrar as contagens medidas.
2. Confirmar que a lista completa da API contém os quatro status e que `aulasParaRepor` continua filtrada em pendências.
3. Conferir o ponto exato do cálculo da data no submit de `formReagendarAula` e a chamada atual a `window.inicializarHome()` após sucesso.
4. Não iniciar alteração de backend: qualquer lacuna descoberta deve ser demonstrada antes de expandir o escopo.

### Etapa 1 — estado local completo e resumo do card

1. Em `view-alunos.js`, criar estado local para cache completo, carregando e erro de reposições, por exemplo:

   ```text
   reposicoesHistorico: Reposicao[]
   carregandoReposicoesHistorico: boolean
   erroReposicoesHistorico: string | null
   alunoIdHistoricoAberto: string | null
   reposicaoEmAcaoId: string | null
   origemFocoHistorico: HTMLElement | null
   ```

2. Durante `carregarDadosComplementaresAlunos()`, consultar uma vez `GET /reposicoes`, guardar a resposta completa e invalidar o dirty-check de Alunos. Uma falha precisa continuar distinguível de uma resposta vazia.
3. Substituir a caixinha atual por um botão sempre presente, mantendo a mesma célula de indicadores e os dados existentes do card.
4. Derivar do cache as contagens e a mensagem mais urgente por aluno. Não listar datas individuais no card.
5. Ajustar `DIAS_ALERTA_REPOSICAO` de 5 para 7 e adequar os testes do helper à decisão da spec. Não duplicar cálculo de dias no card.

### Etapa 2 — markup e estilos do modal

1. Adicionar em `index.html` o `modalHistoricoReposicoes`, após os modais correlatos e antes do toast, com título, subtítulo, região de resumo, área de conteúdo e botões de fechar.
2. Acrescentar em `style.css` as classes do botão de Reposições, seus estados neutro/atenção/erro, grupos, linhas e skeletons, compondo os estilos existentes de card e modal.
3. No desktop, limitar o modal a 680px e 80vh; no mobile, usar largura útil e rolagem interna. Não permitir que o conteúdo atravesse overlay ou rodapé.
4. Implementar foco inicial no título, Escape, contenção de foco enquanto aberto e retorno ao botão que o abriu.

### Etapa 3 — controlador do histórico

1. Expor funções de abertura, fechamento, recarga e renderização em `view-alunos.js` somente quando isso for necessário à integração de modal; manter o estado encapsulado.
2. Ao abrir, guardar o elemento de origem e garantir uma leitura de `GET /reposicoes?alunoId=...`. Pode mostrar o cache primeiro, mas a resposta específica é a confirmação de estado.
3. Renderizar carregando, vazio, erro com `Tentar novamente`, aluno inativo e ação em andamento.
4. Agrupar os quatro status na ordem decidida. Cada linha mostra status textual, aula original, validade quando houver, urgência nas pendentes, dado de cobrança e, para agendada, nova data/hora apenas se o vínculo resolver entre os agendamentos já carregados.
5. Não renderizar IDs, valor, cálculo de competência, controle de status, exclusão, cancelamento ou timeline completa do array `historico`.

### Etapa 4 — integração segura do reagendamento

1. Ao clicar em `Reagendar`, validar que a reposição ainda é pendente, que o aluno está ativo e que existe em `aulasParaRepor`. Se o estado estiver desatualizado, recarregar antes de abrir o fluxo ou informar que a pendência mudou; nunca criar um PATCH paralelo.
2. Guardar um contexto de retorno do histórico antes de fechá-lo. Esse contexto deve conter aluno, reposição e elemento de foco, não dados financeiros recalculados.
3. Corrigir o fallback da data-base no submit: quando `window.dataSelecionada` não for uma `Date` válida do contexto Home, usar uma única data `hoje` tanto para o índice do dia quanto para a data-base.
4. Depois que agenda, `salvarDados(true)`, PATCH e, quando aplicável, GCal forem confirmados, emitir um evento/callback explícito de sucesso. O controlador do histórico recarrega cache, reabre o modal do mesmo aluno e anuncia a atualização.
5. Em erro ou cancelamento, restaurar o histórico sem remover a pendência nem anunciar sucesso. O fechamento normal do modal de reagendamento não é prova de sucesso.
6. Preservar o rollback e a reabertura existentes; não chamar `POST /reposicoes` nem alterar `cobravel`, `validoAte` ou `cicloCobrancaResolvido` pela nova interface.

### Etapa 5 — testes e validação manual

Criar testes de comportamento, usando o arquivo real e sem sobrescrever seus handlers, para:

- botão de Reposições sempre renderizado, inclusive com zero registros;
- clique/teclado no botão não chamarem edição do aluno; clique na área livre continuar chamando;
- resumo e prioridade de urgência, incluindo a fronteira de 7 dias;
- carregando, vazio, erro e atualização preservando conteúdo anterior;
- agrupamento e ordenação dos quatro status;
- aluno inativo sem ação de reagendar;
- abertura/fechamento do modal e retorno de foco;
- query específica por aluno preservando todos os status;
- fallback correto de data fora da Home;
- sucesso confirmado atualizando cache/badge e reabrindo o mesmo histórico;
- erro e cancelamento mantendo pendência e contexto;
- ausência de modal empilhado.

Rodar as suítes frontend e backend após a implementação e fazer validação manual em desktop e 430px: aluno sem registros, pendência sem prazo, vence em 7 dias, vence hoje, prazo encerrado, histórico misto, aluno inativo, sucesso, erro remoto e cancelamento.

---

## 5. Arquivos prováveis de impacto

| Arquivo | Mudança prevista |
| --- | --- |
| `assets/js/view-alunos.js` | Cache completo local, botão permanente, resumo, controlador e renderização do modal. |
| `index.html` | Markup de `modalHistoricoReposicoes`; sem item de menu, nova main ou nova tag de view. |
| `assets/css/style.css` | Estados do botão, layout das linhas/grupos, skeleton e responsividade do modal. |
| `assets/js/modal-acao-slot.js` | Fallback de data fora da Home e contrato explícito de retorno do reagendamento. |
| `backend/shared/reposicao-flow-helpers.js` | Janela de alerta de 5 para 7 dias, conforme a spec. |
| `tests-frontend/reposicao-flow.test.js` | Limite de alerta atualizado para 7 dias. |
| novos testes em `tests-frontend/` | Card/modal, eventos, estados e integração com reagendamento. |
| `assets/js/storage.js` | Opcional: somente se o cache completo for centralizado ali; não alterar `aulasParaRepor`. |

### Arquivos que não precisam mudar na V1

- `backend/src/models/Reposicao.js`;
- `backend/src/controllers/reposicaoController.js`;
- `backend/src/routes/reposicaoRoutes.js`;
- `backend/src/services/reposicaoService.js`;
- `assets/js/app/router.js`;
- `assets/js/view-home.js`.

---

## 6. Riscos e cuidados

1. **Propagação do clique:** o card inteiro já é clicável. O botão sem `stopPropagation()` quebra a edição por abrir duas superfícies.
2. **Fonte de dados incompleta:** usar somente `aulasParaRepor` produziria histórico falso, pois ela contém apenas pendências. Mantê-la completa quebraria o modal existente de reagendamento.
3. **Falha confundida com vazio:** o `catch` atual de `storage.js` transforma falha de `/reposicoes` em `[]`; o cache do novo indicador precisa guardar estado de erro separado.
4. **Data errada fora da Home:** índice de domingo como fallback, combinado com data de hoje, é incoerente. Data e índice precisam derivar da mesma data-base.
5. **Sucesso antecipado:** fechar o modal ou alterar memória não confirma persistência. O retorno ao histórico ocorre apenas depois do fluxo remoto confirmado.
6. **Modal empilhado:** não manter histórico e reagendamento ativos ao mesmo tempo; usar contexto de retorno explícito.
7. **Duplicação de regra:** prazo, cobrança, competência e expiração permanecem no backend/helpers. A view só apresenta dados e usa o helper compartilhado para urgência.
8. **Inativo e registro removido:** aluno inativo mantém histórico, mas não pode reagendar. Quando o aluno não existir no estado local, o modal deve usar `alunoNome` e fallback `Aluno removido` para leitura, sem criar ação.
9. **Responsividade:** o quarto indicador pode empilhar no card; validar 430px para não comprimir Financeiro/Consistência ou tornar o botão pequeno demais.

---

## 7. Critérios de saída da implementação

1. Não existe nova aba, rota, router ou `view-reposicoes.js`.
2. Todo card de aluno contém um único botão Reposições, inclusive sem registros.
3. O clique de edição e o toggle atuais não regressam.
4. O modal mostra todos os registros daquele aluno, agrupados nos quatro status persistidos.
5. O card e o modal usam estado carregando, vazio e erro distintos.
6. `aulasParaRepor` continua contendo somente pendências.
7. A janela de alerta é de sete dias e está coberta por teste.
8. Apenas pendência de aluno ativo oferece Reagendar.
9. Fora da Home, a próxima data é calculada corretamente a partir de hoje.
10. Não há modal empilhado; sucesso, erro e cancelamento retornam ao mesmo contexto sem sucesso falso.
11. Frontend e backend passam nas suítes após a mudança; nenhum contrato de backend foi modificado sem teste correspondente.
