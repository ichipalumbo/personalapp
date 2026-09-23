# Plano de implementação — histórico de reposições e observações

> **Data**: 2026-09-23  
> **Status**: plano registrado; implementação não executada nesta rodada  
> **Branch avaliada**: `main`  
> **Escopo**: item 1.10 do roadmap (histórico contextual de reposições) + item 1.3 (observações por aluno)

## 1. Resultado da avaliação

A spec `docs/specs/reposicoes-e-competencia.md`, seção 9.4, é suficiente para implementar a tela contextual de reposições, desde que a execução siga as decisões e critérios abaixo.

A solução não deve criar aba, rota, `view-reposicoes.js` ou nova regra financeira. A superfície será a tela `Alunos`: um botão permanente no card abre o modal `modalHistoricoReposicoes`; a leitura completa por aluno usa a API existente; o reagendamento reaproveita `window.iniciarReagendamentoReposicao`.

A spec tinha uma divergência entre a janela de alerta de 5 dias registrada no item 0.8 do roadmap e a definição de 7 dias da seção 6.5. A decisão registrada nesta rodada foi alinhar à spec e usar 7 dias. Essa decisão deve ser implementada e provada por teste antes da tela depender dela.

A correção manual dos registros duplicados do item 0.11 foi informada pelo dono como concluída em 2026-09-23 e foi registrada no roadmap/spec. Nenhuma consulta ou alteração no banco foi executada pelo agente.

## 2. Preparação e regras de segurança

- Trabalhar em branch própria antes da primeira alteração de código: `feat/historico-reposicoes-card-aluno`.
- Não fazer commit direto na `main`; cada etapa deve ser revisada e validada antes do commit.
- Não alterar backend de reposições na V1: os endpoints de leitura, PATCH, expiração lazy e reabertura já atendem o fluxo especificado.
- Não ampliar `aulasParaRepor`: esse array continua contendo somente status `pendente`.
- Não recalcular no frontend prazo, competência, cobrança ou valor.
- Alterações em `modal-acao-slot.js` exigem validação específica porque o fluxo também toca persistência de agenda e Google Calendar.

## 3. Ordem de execução e commits

### Etapa 0 — baseline e branch

**Objetivo**: registrar o estado antes da implementação.

Ações:

1. Criar a branch `feat/historico-reposicoes-card-aluno` a partir da `main`.
2. Rodar as duas suítes com o Node real disponível no ambiente.
3. Registrar os números medidos no relatório da execução.
4. Conferir que a árvore está limpa antes do primeiro commit.

Validação esperada na linha de base desta rodada: frontend `47/47`; backend `224/224`.

Commit sugerido: `chore(reposicoes): prepara baseline da tela contextual`

### Etapa 1 — contrato puro de resumo e agrupamento

**Arquivos**:

- `backend/shared/reposicao-flow-helpers.js`
- `tests-frontend/reposicao-flow.test.js`
- `docs/specs/reposicoes-e-competencia.md`

Ações:

1. Alterar `DIAS_ALERTA_REPOSICAO` de 5 para 7, conforme a decisão registrada.
2. Adicionar helper puro para resumo completo por aluno, sempre retornando estado para que o botão seja permanente: neutro, histórico, sem prazo, próxima validade, alerta, vence hoje e prazo encerrado.
3. Adicionar helper puro para agrupar os quatro status (`pendente`, `agendada`, `realizada`, `expirada`) na ordem do modal e ordenar por data/hora original decrescente.
4. Cobrir pluralização, aluno sem registros, aluno diferente, status desconhecido, limite de 7 dias, hoje, prazo vencido e ordenação.
5. Aplicar mutação controlada: trocar 7 por 8 e confirmar que o teste do limite falha; restaurar e confirmar a suíte verde.

Critério de saída: nenhum DOM, `window` ou API dentro dos helpers; frontend verde; backend sem alteração de comportamento financeiro.

Commit sugerido: `feat(reposicoes): adiciona contrato puro do historico`

### Etapa 2 — cache completo e botão permanente no card

**Arquivos**:

- `assets/js/view-alunos.js`
- opcionalmente `assets/js/storage.js`, somente se o cache for centralizado ali
- testes frontend correspondentes

Ações:

1. Criar cache separado para os registros completos, além de estado de carregamento e erro.
2. Alimentar o cache com uma consulta completa de `/reposicoes` no carregamento complementar de Alunos.
3. Manter `aulasParaRepor` filtrado apenas para pendências.
4. Substituir a caixinha condicional atual por um único `<button type="button">` permanente.
5. Interromper propagação e manter edição do card/toggle sem regressão.
6. Fazer o dirty-check considerar o cache e seus estados.
7. Manter a altura estável durante carregamento e exibir erro sem transformar falha em lista vazia.

Critério de saída: todo aluno tem o botão; aluno sem registro exibe estado neutro; clique no botão não abre edição; card e toggle continuam funcionando.

Commit sugerido: `feat(reposicoes): adiciona acesso contextual no card de aluno`

### Etapa 3 — modal, estados e responsividade

**Arquivos**:

- `index.html`
- `assets/css/style.css`
- `assets/js/view-alunos.js`

Ações:

1. Adicionar `modalHistoricoReposicoes`, sem nova view ou rota.
2. Implementar cabeçalho, resumo, grupos, linhas e rodapé conforme a seção 9.4.3.
3. Cobrir estados carregando, vazio, erro com tentativa novamente, conteúdo anterior preservado e aluno inativo.
4. Mostrar status textual, data original, validade, urgência, cobrável/não cobrável e vínculo de agendamento quando resolvível.
5. Omitir IDs, valores, recálculo, ações de status/exclusão e timeline completa de `historico`.
6. Implementar Escape, fechar, foco inicial, retorno do foco ao botão de origem e rolagem interna.
7. Validar desktop e viewport de 430px sem sobreposição ou quebra do rodapé.

Critério de saída: modal isolado, acessível e visualmente estável nos estados definidos pela spec.

Commit sugerido: `feat(reposicoes): cria modal de historico contextual`

### Etapa 4 — reagendamento e retorno ao histórico

**Arquivos**:

- `assets/js/modal-acao-slot.js`
- `assets/js/view-alunos.js`
- testes frontend de integração do fluxo

Ações:

1. Reagendar somente pendência de aluno ativo e ainda existente.
2. Guardar contexto explícito de retorno antes de fechar o histórico.
3. Corrigir a data-base fora da Home: data-base e índice do dia devem vir da mesma data; preservar a data selecionada válida da Home quando existir.
4. Emitir sinal de sucesso apenas depois de persistência da agenda, PATCH e GCal quando aplicável.
5. Reabrir o mesmo histórico após sucesso, erro ou cancelamento sem anunciar sucesso falso.
6. Manter rollback existente e não criar POST paralelo nem alterar cobrança/prazo.
7. Provar que falha de persistência não envia PATCH, inclusive no chamador real quando houver harness suficiente.

Critério de saída: nenhum modal empilhado; pendência não desaparece antes da confirmação; a data fora da Home é correta.

Commit sugerido: `feat(reposicoes): integra reagendamento ao historico`

### Etapa 5 — item 1.3: observações por aluno

**Arquivos prováveis**:

- `index.html`
- `assets/js/view-alunos.js`
- `assets/css/style.css`, apenas se necessário
- testes frontend de persistência/renderização, se houver harness

Ações:

1. Adicionar textarea `observacoes` ao formulário de aluno, com nome de campo único e consistente.
2. Carregar o valor na edição e persistir no objeto do aluno no cadastro/atualização.
3. Exibir a observação na ficha/card somente se a decisão visual for confirmada no início desta etapa; não inventar uma segunda tela.
4. Escapar conteúdo ao renderizar para não inserir texto livre como HTML.
5. Validar cadastro, edição, texto vazio e conteúdo com caracteres especiais.

Esta etapa deve ser um commit separado porque é independente do modal de reposições e pode ser revertida sem afetar o fluxo de reposição.

Commit sugerido: `feat(alunos): adiciona observacoes no cadastro`

## 4. Matriz mínima de validação

### Suítes automatizadas

- Frontend antes: `47/47`.
- Backend antes: `224/224`.
- Após a Etapa 1: frontend deve passar com os novos testes; backend deve continuar verde.
- Após cada etapa frontend: repetir a suíte frontend.
- Após Etapa 4: repetir backend por tocar fluxo de reposição e confirmar que a contagem não caiu.
- Prova de mutação: cada teste novo deve falhar quando sua regra principal for revertida.

### Validação manual da tela

Testar em desktop e 430px:

- aluno sem registros;
- histórico sem pendências;
- pendência sem prazo;
- validade em 7 dias, hoje e vencida;
- histórico misto com os quatro status;
- aluno inativo;
- cache carregando e erro de leitura;
- reagendamento com sucesso;
- falha remota;
- cancelamento do reagendamento;
- retorno de foco e Escape.

## 5. Fora do escopo desta execução

- Aba ou tela global de reposições.
- Busca/filtro global por reposição.
- Notificações push/WhatsApp.
- No-show/cancelamento e alteração de regra financeira.
- Alteração de backend ou migração de dados.
- Correção manual adicional no banco.

## 6. Execução das etapas 0 e 1

### Etapa 0

- Branch criada: `feat/reposicoes-helpers`, a partir de `origin/main`, sem upstream.
- Árvore limpa antes da implementação.
- Baseline medido: frontend `47/47`; backend `224/224`.

### Etapa 1

- `DIAS_ALERTA_REPOSICAO` alinhado para 7 dias.
- Adicionados helpers puros para resumo permanente do card e agrupamento/ordenação do histórico.
- Testes adicionados para estados neutro, histórico, sem prazo, alerta, vencimento e prazo encerrado.
- Prova de mutação executada: alterar o limite de 7 para 8 produziu `2` falhas em `15` testes focados; a mutação foi revertida.
- Resultado final: frontend `54/54`; backend `224/224`.
- Commit ainda não criado; a regra do repositório exige solicitação explícita para commits.

### Etapa 2

- Cache completo de reposições adicionado em `view-alunos.js`, separado de `aulasParaRepor`.
- Estados distintos de carregamento e erro adicionados; falha da consulta não é tratada como lista vazia.
- O card de todo aluno agora renderiza um botão permanente de Reposições.
- Clique e foco têm tratamento visual; a propagação é interrompida para não abrir a edição do aluno.
- O botão já está preparado para chamar `window.abrirHistoricoReposicoes`; o modal e seu controlador ficam para a etapa 3.
- Validação: `node --check` passou; frontend `54/54`; backend `224/224`; `git diff --check` passou.
- Commit ainda não criado; a regra do repositório exige solicitação explícita para commits.

### Etapa 3

- Modal `modalHistoricoReposicoes` adicionado ao `index.html`, sem nova aba, rota ou view.
- Controlador adicionado em `view-alunos.js` com consulta específica por aluno, atualização do cache, estados carregando/vazio/erro e preservação do conteúdo anterior em falha.
- Histórico agrupado em Pendentes, Agendadas, Realizadas e Expiradas, com ordenação por data/hora original.
- Linhas mostram status, aula original, validade, cobrança, urgência e agendamento vinculado quando resolvível.
- Fechamento por `×`, botão de rodapé e Escape; foco retorna ao botão de origem e Tab fica contido no modal.
- Estilos responsivos adicionados: largura máxima de 680px, altura limitada, rolagem interna, skeleton e viewport estreito.
- O botão Reagendar aparece apenas para pendência de aluno ativo presente em `aulasParaRepor`; o retorno ao histórico após a ação continua reservado para a etapa 4.
- Validação: teste de ordem do HTML `5/5`; frontend `54/54`; backend `224/224`; `node --check` e diagnósticos sem erros; `git diff --check` passou.
- Validação manual pendente: abrir o modal em desktop e 430px, conferir alinhamento, rolagem, foco, Escape, estados de carregamento/erro e ausência de sobreposição.
- Commit ainda não criado; a regra do repositório exige solicitação explícita para commits.

## 7. Estado ao registrar este plano

As etapas 0 e 1 foram executadas nesta branch. Permanecem pendentes as etapas 2 a 5 do plano; o item 1.10 ainda não está concluído porque o card, o modal e a integração de reagendamento serão implementados nas etapas seguintes.
