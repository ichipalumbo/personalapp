# Diagnóstico — item 1.9: pagar e ajustar ciclos anteriores

> Origem: item 1.9 de `docs/roadmap.md`, iniciado em 2026-09-18.
> Escopo desta rodada: diagnóstico e definição de produto antes de qualquer implementação.
> Branch de trabalho: `feat/editar-ciclos-historicos`.

---

## 1) Objetivo do item

Permitir que a professora execute **"Marcar como pago"** e **"Editar ajuste"** também em ciclos anteriores exibidos dentro de **"Ver ciclos anteriores"** na tela Finanças.

A necessidade ficou concreta quando um ciclo anterior permaneceu com status `atrasado`: a tela já calcula corretamente o ciclo vigente, mas não oferece um caminho visual para quitar ou ajustar a pendência histórica.

## 2) Estado atual

### 2.1 Backend já suporta o alvo genérico

As duas rotas existentes operam por `cicloId`, sem exigir que o documento seja o ciclo vigente:

- `PATCH /api/financas/:cicloId/pagamento`
- `PATCH /api/financas/:cicloId/ajuste`

`marcarCicloComoPago(ownerEmail, cicloId, ...)` busca por `{ _id: cicloId, ownerEmail }`, grava pagamento, congela o extrato e define `status: "pago"`.

`atualizarAjusteCiclo(ownerEmail, cicloId, ...)` usa a mesma busca e rejeita somente quando `dataPagamento` já existe (`HTTP 409`). Portanto, por comportamento atual, ciclos antigos não pagos — `atrasado` ou um eventual `em_aberto` histórico — já são ajustáveis no backend.

Nenhuma rota, controller ou schema novo é necessário para a primeira versão da feature.

### 2.2 O bloqueio é exclusivamente da UI

`assets/js/view-financas.js` carrega o histórico sob demanda em `STATE.historicoPorAluno[alunoId].dados`, mas `renderizarListaHistorico()` mostra apenas o período, status, resumo e extrato.

Os dois botões atuais aparecem somente no ciclo vigente. Além disso, `abrirModalPagamento(cardId, cicloId)` e `abrirModalAjuste(cardId, cicloId)` localizam o ciclo sempre em `card.cicloAtual`; por isso, passar um `cicloId` histórico hoje não basta.

Para habilitar a feature, a UI precisa de uma resolução única do ciclo pelo par `{ alunoId, cicloId }`, procurando primeiro no ciclo vigente do card e depois no cache de histórico em memória. Os modais existentes podem ser reutilizados sem duplicação de formulário.

### 2.3 Atualização após salvar

Hoje, ao salvar pagamento ou ajuste, a UI fecha o modal e chama `carregarFinancas({ forcarRemoto: true })`.

Isso atualiza apenas a listagem principal, porque `GET /api/financas` não devolve histórico por decisão de performance (spec 6.2.1). Logo, para ciclos históricos, esse fluxo deixaria o `<details>` com estado e valores antigos até nova abertura/requisição.

A implementação precisa atualizar o registro correspondente dentro de `STATE.historicoPorAluno[alunoId].dados` com a resposta bem-sucedida do `PATCH` e renderizar somente o conteúdo histórico daquele aluno. A listagem principal ainda pode ser atualizada depois, mas não pode ser a única fonte da atualização visual.

### 2.4 Testes existentes

Há teste do cálculo de ciclo e da competência em `backend/test/financas-pure.test.js` e `backend/test/financas-competencia.test.js`, mas não há cobertura hoje para:

- pagamento por `cicloId` histórico;
- ajuste por `cicloId` histórico;
- rejeição de ajuste em ciclo histórico já pago;
- isolamento por `ownerEmail` nas duas escritas;
- atualização do cache de histórico no frontend depois de um `PATCH` bem-sucedido.

A feature mexe em dinheiro e status de pagamento; esses casos precisam virar testes de regressão antes ou junto da alteração de UI.

## 3) Conflito documental que precisa ser resolvido

A spec `docs/specs/financas-ciclo-cobranca.md` hoje declara em **Fora de Escopo**:

> "Edição retroativa de ciclos antigos além do ajuste do ciclo vigente (histórico é somente leitura)."

O item 1.9 do roadmap propõe exatamente a exceção a essa regra. Antes de implementar, a spec deve ser alterada para substituir essa exclusão por regras explícitas. O roadmap não substitui a spec como fonte de verdade de regra financeira.

## 4) UX proposta, guiada pela skill `anti-ui-slop`

Foi aplicada a playbook de interface operacional (`.agents/skills/vendor/anti-ui-slop/reference/operate.md`): preservar o vocabulário do produto, priorizar fluxo recorrente e cobrir estados de carregamento, erro, sucesso, desabilitado e recuperação.

Proposta visual mínima e coerente com a tela atual:

- Cada item histórico não pago exibe, abaixo do resumo, os mesmos dois comandos já usados no ciclo vigente: **Marcar como pago** e **Editar ajuste**.
- Item histórico `pago` permanece somente leitura: sem ações mutáveis visíveis. O extrato continua acessível.
- Os comandos reutilizam os modais existentes; o cabeçalho do modal mostra aluno e período do ciclo alvo, nunca o ciclo vigente por engano.
- Enquanto o `PATCH` estiver pendente, o botão Salvar do modal fica desabilitado, como já ocorre hoje. O histórico continua aberto e usável depois de uma resposta de sucesso.
- Em erro, o modal permanece aberto com os valores informados; o toast informa a falha. Não aplicar atualização otimista ao histórico.
- Não criar cards dentro de cards, novos painéis ou um fluxo paralelo: as ações ficam no próprio item de histórico, próximo ao status e ao extrato que elas modificam.

## 5) Decisões de produto confirmadas

Confirmação do dono em 2026-09-18, incorporada à spec na seção 6.3 e no caso de borda 27:

1. **Elegibilidade**: todos os ciclos históricos sem `dataPagamento` podem receber ações, incluindo `atrasado` e `em_aberto`.
2. **Data de pagamento**: inicia na data atual, mas permanece editável para registrar a data real do recebimento. Não há restrição ao período original do ciclo.
3. **Ciclo encurtado**: segue o ajuste manual normal, sem confirmação adicional.
4. **Ciclo pago**: permanece somente leitura na UI; não há ação de estorno, reabertura ou novo pagamento nesta V1.

## 6) Plano de implementação após as decisões

1. Atualizar a spec de Finanças: retirar a exclusão de histórico somente leitura e adicionar a regra aprovada para status elegíveis, data de pagamento e ciclo já pago.
2. Adicionar testes de serviço/controller cobrindo pagamento e ajuste de ciclo histórico, `409` para pago e isolamento por `ownerEmail`.
3. Em `view-financas.js`, criar resolução central de ciclo vigente/histórico por `{ alunoId, cicloId }`.
4. Renderizar ações apenas nos históricos sem pagamento, reutilizando delegação de eventos e modais existentes.
5. Após resposta `PATCH` bem-sucedida, recarregar e re-renderizar somente o histórico em memória daquele aluno; não depender da listagem principal para refletir o histórico.
6. Validar manualmente desktop e mobile: item atrasado, item pago, ajuste negativo/piso zero, falha de rede, fechamento/reabertura do histórico e dois históricos abertos em alunos diferentes.
7. Rodar `npm test` em `backend/` e `tests-frontend/`; registrar números medidos e prova por mutação dos novos testes financeiros.

## 7) Fora do escopo desta V1

- Estorno ou reabertura de ciclo pago.
- Edição de preço/snapshot de ciclo histórico.
- Novo endpoint para histórico paginado ou cache persistente de histórico.
- Cobrança automática, WhatsApp, notificações ou fluxo de inadimplência adicional.
- Status de presença/falta/cancelamento de aula (item 1.5).
