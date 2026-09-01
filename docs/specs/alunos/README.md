# Domínio — Alunos

> **Papel deste arquivo**: índice do domínio. Ele **aponta**; a regra mora na spec.
>
> **Atualizado**: 2026-09-01

---

## O que este domínio cobre

Quem é o aluno e o que acontece com ele ao longo do tempo.

- Cadastro: nome, contato, local de treino, objetivo e frequência de contrato.
- Objetivo (`Personal Trainer` / `Consultoria Online`) e o que ele habilita.
- Status `ativo` / `inativo`, transições e o que fica bloqueado enquanto inativo.
- Exclusão do aluno e seu efeito em cascata.
- Listagem, filtros e indicadores do card.

## O que este domínio **não** cobre

| Assunto | Domínio dono |
| --- | --- |
| Valor, método de cobrança e ciclo de vencimento | [`../financeiro/`](../financeiro/README.md) |
| Aulas do aluno na agenda | [`../agenda/`](../agenda/README.md) |

**Fronteira que gera confusão**: os campos financeiros aparecem no formulário do aluno, mas quem decide a regra deles é o domínio Financeiro, em [`../financeiro/financas-ciclo-cobranca.md`](../financeiro/financas-ciclo-cobranca.md) §3.1. Este domínio decide o **cadastro e o ciclo de vida**, não o preço.

## Specs deste domínio

| Spec | Decide | Status |
| --- | --- | --- |
| `alunos-cadastro-e-ciclo-de-vida.md` | campos, objetivo, ativo/inativo, reativação, exclusão em cascata, filtros | **pendente** |

## Sem spec ainda — comportamento definido pelo código

| Comportamento | Onde está hoje |
| --- | --- |
| Modelo persistido | `backend/src/models/Aluno.js` |
| CRUD, normalização de status e exclusão em cascata | `backend/src/controllers/alunoController.js` |
| Formulário, listagem, filtros e indicadores | `assets/js/view-alunos.js` |
| Consulta de aluno e regra de "está ativo" | `assets/js/alunos-helpers.js` |
| Consistência entre contrato e agenda | `backend/src/services/agendaConsistencyService.js` |

Enquanto não houver spec, **o código é a verdade**.

## Ponto de atenção conhecido

`DELETE /api/alunos/:id` remove o aluno **e apaga os agendamentos vinculados**. É comportamento implementado, não decisão de produto registrada — precisa ser confirmado quando a spec nascer.
