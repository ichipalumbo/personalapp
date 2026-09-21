# Relatório — fix/duplicata-cobranca-reenvio-reposicao (2026-09-21)

## 1) Sintoma

Ao reagendar uma reposição, o novo compromisso recebe `reposicaoId`. Se essa aula
era enviada novamente para reposição, o fluxo criava outro documento `Reposicao`.
Quando ambos eram cobráveis, a mesma aula de origem podia entrar duas vezes no
cálculo financeiro.

## 2) Decisões confirmadas

- Usar rota dedicada `POST /api/reposicoes/:id/reabrir`.
- Reabrir o mesmo registro para reposições cobráveis e não cobráveis.
- Preservar `validoAte` original; o reenvio não renova o prazo.
- Ocultar a opção "Cobrar neste ciclo" no reenvio vinculado e preservar a decisão
  de cobrança já gravada.

## 3) Implementação

- O backend executa uma atualização atômica filtrada por `ownerEmail`, retornando a
  reposição para `pendente`, limpando `agendamentoReposicaoId` e acrescentando o
  evento `reaberta_por_reenvio` em `historico`.
- O frontend consulta a reposição apontada por `compromisso.reposicaoId` e chama
  `/reabrir` em vez de `POST /api/reposicoes`.
- O modal apresenta uma única ação de reabertura para compromissos já vinculados.
- A regra foi incorporada à seção 5.3, ao prazo da seção 6.4 e ao modal da seção
  9.3 da spec de reposições.

## 4) Cobertura e validação

- Suíte backend antes da alteração: 222 testes passando.
- Suíte backend após a alteração: 224 testes passando.
- Teste mutacional do backend: falhou ao trocar `status: 'pendente'` por
  `'agendada'`, confirmando que a regressão detecta a correção removida.
- Regressão de frontend no harness: confirma consulta da origem, chamada da rota
  `/reabrir` e ausência de criação de segundo documento.
- Suíte frontend: 45 testes passaram e 1 falhou por `jsdom` ausente, problema
  preexistente do ambiente (`view-financas-historico.test.js`).

## 5) Dados de produção

O dono do repositório confirmou duplicatas existentes em produção e fará a
correção manual separadamente. Nenhuma escrita no Mongo de produção foi feita
nesta rodada. A operação deve seguir dry-run, backup da coleção e avaliação de
ajuste em ciclos já pagos, conforme o diagnóstico
[`2026-09-21-diag-0-11-duplicata-cobranca-reenvio-reposicao.md`](../_diags_llm/2026-09-21-diag-0-11-duplicata-cobranca-reenvio-reposicao.md).

## 6) Arquivos alterados

- `backend/src/controllers/reposicaoController.js`
- `backend/src/routes/reposicaoRoutes.js`
- `assets/js/modal-acao-slot.js`
- `backend/test/reposicao-api.test.js`
- `backend/test/gcal-duplicata-fix.test.js`
- `docs/specs/reposicoes-e-competencia.md`
- `docs/roadmap.md`
