# Diagnóstico — item 1.10: tela dedicada de reposições

> Origem: item 1.10 de `docs/roadmap.md`, investigado em 2026-09-21.
> Escopo desta rodada: diagnóstico, avaliação de esforço e plano de execução.
> **Nenhum código foi alterado.**
> Branch: `main` (decisão do dono — continuar na branch atual).
>
> Contexto de produto: a PT já gerencia reposições no fluxo operacional; a tela
> dedicada será a primeira entrega para concentrar essa gestão depois que o
> painel da Home foi removido.

---

## 1) Conclusão executiva

O item é viável com esforço **médio**, mas a maior parte do trabalho está no
frontend. O backend já oferece a entidade persistida, listagem por aluno/status/
período, expiração lazy, reagendamento por PATCH e reabertura da mesma reposição.
O que falta é transformar esses contratos em uma experiência navegável:

1. nova aba `Reposições` no menu;
2. lista inicial de cards agrupados por aluno;
3. drill-down separado com o histórico completo daquele aluno;
4. ação de reagendar cada reposição pendente;
5. recarga e atualização coerentes após a ação;
6. cobertura de testes para router, agrupamento, estados e integração do modal.

Estimativa relativa:

| Frente | Esforço |
| --- | --- |
| Estrutura da nova view, navegação e responsividade | Médio |
| Lista de cards por aluno e drill-down | Médio |
| Reuso/correção do fluxo de reagendamento fora da Home | Médio |
| Ajuste do estado carregado e atualização após escrita | Baixo a médio |
| Testes frontend e regressões de backend | Médio |
| **Total** | **Médio** |

Não há necessidade aparente de nova collection, migration ou rota backend para
a V1.

---

## 2) Estado atual confirmado

### 2.1 O dado já existe no backend

`backend/src/models/Reposicao.js` já persiste:

- `ownerEmail` e `alunoId`;
- data e horário originais;
- `cobravel`;
- `status` (`pendente`, `agendada`, `realizada`, `expirada`);
- `agendamentoOriginalId`;
- `agendamentoReposicaoId`;
- `validoAte`;
- `historico`.

Há índice por `ownerEmail + alunoId + status`, adequado para a listagem da
nova tela.

### 2.2 A API já cobre a leitura necessária

`GET /api/reposicoes` já:

- filtra obrigatoriamente por `ownerEmail`;
- aceita `alunoId`, `status`, `dataMin` e `dataMax`;
- ordena por data e horário original;
- aplica expiração lazy antes de responder.

`GET /api/reposicoes/:id` permite carregar uma reposição individual quando
necessário. Portanto, a V1 pode começar consumindo a API existente.

### 2.3 O reagendamento já tem persistência e contrato

O backend já aceita a transição de `pendente` para `agendada` via PATCH,
registrando `agendamentoReposicaoId` e calculando no servidor o
`cicloCobrancaResolvido` da reposição não cobrável.

O fluxo de reabertura também já existe:

- `POST /api/reposicoes/:id/reabrir`;
- volta para `status: pendente`;
- zera `agendamentoReposicaoId`;
- registra `reaberta_por_reenvio` no histórico.

Isso reduz o risco de a nova tela criar uma segunda regra financeira ou uma
segunda forma de reabrir reposições.

### 2.4 O frontend hoje não tem a tela

O `index.html` contém apenas as telas `tela-home`, `tela-financas` e
`tela-alunos`. O router registra somente esses três inicializadores. Não há:

- item de menu `Reposições`;
- `view-reposicoes.js`;
- container para a nova tela;
- inicializador registrado no router;
- estado de drill-down;
- lista navegável de todas as reposições.

Há texto no modal de envio dizendo que a escolha da nova data ocorre na aba
Reposições, mas essa aba ainda não existe. A implementação deve fechar essa
inconsistência.

### 2.5 O estado global atualmente descarta os históricos

`storage.js` busca `GET /reposicoes`, mas filtra a resposta para manter somente
registros com `status === 'pendente'` antes de preencher `aulasParaRepor`.

Esse estado serve aos indicadores atuais do card de aluno, mas não é suficiente
para a nova tela, que precisa exibir pendentes, agendadas/reagendadas,
realizadas, expiradas e canceladas conforme o contrato do roadmap. A nova view
deve usar uma fonte que preserve a lista completa; não deve ampliar
`aulasParaRepor` silenciosamente e quebrar o comportamento existente.

### 2.6 Existe reaproveitamento visual no card de aluno

`view-alunos.js` já possui:

- renderização de cards em grade;
- indicadores financeiros e de consistência;
- indicador de reposições pendentes e alerta de prazo;
- invalidation/dirty-check para re-renderização.

Esse padrão pode orientar a aparência dos cards da nova lista, mas o card de
Reposições precisa representar a situação agregada do aluno, não apenas o
alerta de pendências.

---

## 3) Lacunas funcionais que a implementação precisa resolver

### 3.1 Lista inicial agrupada por aluno

A primeira visão deve agrupar os registros por `alunoId`, usando o aluno
correspondente para exibir o nome e informações consistentes. Cada card deve
resumir, no mínimo:

- quantidade de reposições pendentes;
- quantidade agendada/reagendada;
- quantidade expirada;
- quantidade realizada;
- indicação de prazo próximo ou encerrado quando houver pendente;
- ação de abrir o histórico do aluno.

O card não deve listar datas soltas na visão inicial, conforme a decisão do
roadmap.

Alunos sem nenhuma reposição não devem aparecer nessa tela. Alunos inativos
com histórico devem continuar visíveis, pois a tela é de histórico e gestão,
não uma lista de alunos ativos.

### 3.2 Drill-down separado, não acordeão

O clique no card deve trocar para uma visão/painel de detalhe do aluno, com:

- nome do aluno;
- botão de voltar para a lista;
- todas as reposições do aluno;
- agrupamento ou ordenação por status e data;
- data original, horário, status e validade;
- informação de cobrança (`cobravel`) sem recalcular regra no frontend;
- histórico de eventos quando essa informação for útil para rastreabilidade.

Esse detalhe deve ser uma navegação de visão, como o fluxo de edição de aluno,
e não um acordeão inline.

### 3.3 Reagendamento a partir da nova tela

Cada reposição `pendente` deve oferecer a ação de reagendar. O caminho
recomendado é reaproveitar `window.iniciarReagendamentoReposicao`, que ficou
sem chamadores depois da remoção do painel da Home.

Há um acoplamento importante: o modal atual recebe um dia da semana e calcula a
próxima ocorrência a partir de `window.dataSelecionada`, contexto que pertence
à Home. Fora da Home, isso pode produzir uma data incorreta sem erro visível.

A implementação deve corrigir a base de cálculo para usar a data de hoje
quando o modal for aberto fora da Home, preservando um único modal de
reagendamento no aplicativo. Não deve ser criado um segundo modal paralelo.

Depois do reagendamento, a tela deve:

1. aguardar resposta HTTP de sucesso;
2. atualizar a reposição para `agendada`;
3. refletir o novo agendamento;
4. voltar ao detalhe do aluno sem perder o contexto;
5. manter a lista inicial coerente ao retornar.

Em caso de falha, a UI não pode confirmar a operação com cache local.

---

## 4) Plano de execução recomendado

### Etapa 0 — fechar o contrato da V1 antes de codar

Confirmar com o dono, se necessário:

1. se `realizada` deve ser exibida com esse rótulo ou como `concluída`;
2. se o histórico de eventos deve aparecer já na V1 ou apenas os dados
   resumidos da reposição;
3. se a ação de reagendar deve abrir o fluxo atual por dia da semana ou se a
   expectativa de produto é escolher uma data diretamente.

A recomendação técnica é manter o fluxo atual por dia da semana na V1, pois
evita duplicação de regra e mantém o escopo médio previsto. Uma escolha de data
direta seria uma decisão de produto e aumentaria a superfície da mudança.

### Etapa 1 — modelo de estado e carregamento

1. Definir um estado local da view, separado de `aulasParaRepor`, com:
   - lista completa de reposições;
   - aluno selecionado;
   - modo lista/detalhe;
   - estado de carregamento, erro e ação em andamento.
2. Reaproveitar `GET /api/reposicoes` ou criar um carregador específico no
   frontend que preserve todos os status.
3. Garantir que a chamada continue escopada pelo backend e que falha de rede
   seja exibida, não convertida silenciosamente em lista vazia.
4. Definir uma estratégia de recarga após reagendamento: atualizar a view a
   partir da resposta e, em seguida, sincronizar remotamente para confirmar o
   estado completo.

### Etapa 2 — shell da tela e router

1. Adicionar o link de navegação `Reposições` ao `index.html`.
2. Adicionar a nova `main` ou o container da tela.
3. Criar `assets/js/view-reposicoes.js`.
4. Registrar `tela-reposicoes` em `assets/js/app/router.js`.
5. Carregar o script na seção de Page Views do `index.html`, depois das
   dependências que ele usa e antes do bootstrap/app.
6. Manter a ordem das tags compatível com os testes de
   `DEPENDENCIAS_DE_CARGA`.

### Etapa 3 — lista de cards por aluno

1. Agrupar reposições por `alunoId`.
2. Resolver nome e dados do aluno usando as estruturas já carregadas.
3. Ordenar os cards de forma determinística, priorizando pendências e depois
   nome do aluno, ou registrar outra ordem aprovada.
4. Renderizar estados de vazio, carregando e erro.
5. Reaproveitar classes/padrões visuais de `view-alunos.js`, sem copiar a
   regra de prazo; usar `reposicao-flow-helpers.js` para os cálculos de alerta.
6. Tornar o card inteiro acessível e com indicação clara de que abre detalhes.

### Etapa 4 — drill-down do aluno

1. Guardar o `alunoId` selecionado.
2. Renderizar cabeçalho, botão de voltar e resumo.
3. Renderizar todos os status previstos pela V1.
4. Ordenar por status/data de forma que pendentes sejam fáceis de encontrar.
5. Exibir validade e alerta apenas quando aplicável, usando o helper
   compartilhado.
6. Exibir estado vazio específico para aluno sem registros após uma recarga.

### Etapa 5 — reconectar o reagendamento

1. Expor ou reutilizar o chamador de `iniciarReagendamentoReposicao` na nova
   view.
2. Corrigir o fallback de data do modal fora da Home.
3. Garantir que a reposição seja vinculada ao novo agendamento somente após o
   fluxo de persistência esperado.
4. Re-renderizar o detalhe após sucesso.
5. Preservar os tratamentos existentes de reabertura e rollback; não criar uma
   nova chamada direta a `POST /reposicoes` para uma reposição já existente.

### Etapa 6 — testes e validação manual

1. Atualizar o teste de ordem do `index.html` para a nova tag e dependências.
2. Criar testes frontend para:
   - registro do router;
   - agrupamento por aluno;
   - contagem por status;
   - vazio, carregando e erro;
   - entrada/saída do drill-down;
   - fallback de data fora da Home;
   - ação de reagendamento após sucesso e após erro.
3. Adicionar ou ampliar testes backend apenas se surgir mudança de contrato.
4. Rodar a suíte frontend e a suíte backend antes e depois da implementação,
   reportando os números medidos.
5. Fazer validação manual no desktop e em viewport estreita:
   - lista com vários alunos;
   - aluno somente com pendente;
   - aluno com histórico misto;
   - prazo vencido;
   - reagendamento bem-sucedido;
   - falha de rede;
   - retorno do detalhe para a lista.

---

## 5) Arquivos prováveis de impacto

### Alterações esperadas

- `index.html`
  - novo item de menu;
  - container da tela;
  - tag do novo script.
- `assets/js/app/router.js`
  - registro de `tela-reposicoes`.
- `assets/js/view-reposicoes.js`
  - novo estado, carregamento, lista e drill-down.
- `assets/js/modal-acao-slot.js`
  - reconexão do chamador e fallback de data fora da Home.
- `assets/js/storage.js`
  - somente se for necessário expor uma coleção completa ou um carregador
    reutilizável; não alterar `aulasParaRepor` sem preservar o contrato atual.
- `assets/css/style.css`
  - somente classes novas que não possam ser compostas pelos padrões atuais.
- `tests-frontend/index-html-ordem.test.js`
  - ordem da nova tag e dependências.
- novos testes em `tests-frontend/`
  - view, agrupamento, estados e reagendamento.

### Arquivos que não precisam mudar na V1

- `backend/src/models/Reposicao.js`;
- `backend/src/controllers/reposicaoController.js`;
- `backend/src/routes/reposicaoRoutes.js`;
- `backend/src/services/reposicaoService.js`;
- `backend/shared/reposicao-flow-helpers.js`.

Esses arquivos já sustentam a leitura e a persistência necessárias. Alterá-los
sem uma lacuna concreta aumentaria o risco em uma área ligada ao financeiro.

---

## 6) Riscos e cuidados

### 6.1 Fonte de dados incompleta

O risco técnico mais provável é reutilizar `aulasParaRepor`, que contém apenas
pendentes, e entregar uma tela que parece funcionar, mas não mostra o
histórico. A lista completa deve ter uma fonte explicitamente definida.

### 6.2 Data errada no modal fora da Home

Esse é o risco funcional mais importante da integração. O modal atual depende
de estado global da Home. O teste precisa falhar se a nova view voltar a usar
uma `dataSelecionada` inexistente ou desatualizada.

### 6.3 Duplicação de regra de negócio

Não recalcular no frontend:

- prazo de validade;
- competência financeira;
- ciclo cobrado;
- valor da reposição.

Esses dados devem vir da API ou dos módulos compartilhados existentes.

### 6.4 Reagendamento parcial

O fluxo altera agenda e reposição em etapas relacionadas. A tela deve aguardar
as respostas e usar os mesmos helpers de persistência/rollback já presentes,
sem exibir sucesso baseado apenas em mutação local.

### 6.5 Escopo visual

Adicionar uma quarta aba reduz o espaço disponível no cabeçalho, especialmente
em telas estreitas. A navegação precisa ser validada em até 430px, onde já há
regras específicas para os links do header.

### 6.6 Dados históricos e status

O schema atual não possui `cancelada` no enum de status; a spec do roadmap usa
“cancelada” como categoria histórica, mas o código atual trabalha com
`expirada` e exclusão do registro. Antes de implementar uma categoria visual
“cancelada”, deve-se confirmar se ela significa um status persistido ou apenas
um evento no histórico. Não criar um novo status por inferência.

---

## 7) Fora de escopo recomendado para a V1

- filtro por data;
- filtro por “a vencer”;
- busca textual por aluno;
- alteração manual de status;
- exclusão/cancelamento de reposição pela nova tela;
- criação de uma segunda forma de reagendamento por data direta;
- mudança de regra financeira ou de competência;
- alteração do modelo de dados;
- sincronização adicional com Google Calendar além do fluxo já utilizado pelo
  reagendamento.

Esses itens podem ser avaliados depois que a lista e o drill-down estiverem
estáveis.

---

## 8) Critérios de aceite

1. A aba `Reposições` aparece no menu e é inicializada pelo router.
2. A visão inicial mostra um card por aluno com reposições, sem datas soltas.
3. O card resume corretamente os status existentes na resposta da API.
4. Clicar no card abre uma visão separada do aluno.
5. O drill-down mostra pendentes, agendadas/reagendadas, realizadas e expiradas
   quando existirem.
6. O botão de voltar retorna à lista sem perder os dados carregados.
7. Uma reposição pendente pode ser reagendada a partir do drill-down.
8. O cálculo de data do modal funciona fora do contexto da Home.
9. Após sucesso, a reposição deixa de aparecer como pendente sem recarregar a
   página inteira manualmente.
10. Após erro, a UI não confirma sucesso nem perde o registro.
11. A lista continua isolada por `ownerEmail` via API.
12. A tela não duplica regras de prazo ou cobrança.
13. A suíte frontend cobre a nova tag, router e estados principais.
14. A suíte backend permanece verde; nenhuma mudança de backend é feita sem
   teste correspondente.

---

## 9) Decisão recomendada para a execução

Implementar a V1 em uma rodada dedicada de frontend, em ordem:

1. fonte completa de reposições e estado da view;
2. shell/router;
3. lista por aluno;
4. drill-down;
5. reagendamento e fallback de data;
6. testes e validação manual.

O backend não deve ser expandido nesta primeira rodada. Se, durante a
implementação, a necessidade de “cancelada” exigir novo estado persistido, essa
decisão deve ser interrompida e confirmada antes de alterar schema, controller
ou financeiro.

