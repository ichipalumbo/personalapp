# Domínio — Agenda

> **Papel deste arquivo**: índice do domínio. Ele **aponta**; a regra mora na spec.
>
> **Atualizado**: 2026-09-01

---

## O que este domínio cobre

O compromisso: como ele nasce, se repete, é alterado e deixa de existir.

- Tipos de compromisso: aula, bloqueio, deslocamento e reposição agendada.
- Aula avulsa e série recorrente, exceções e cadeias de séries criadas por split.
- Escopos de edição e exclusão: só esta, daqui pra frente, série toda.
- Detecção de conflito de horário.
- Grade de horários que define a régua da agenda.

## O que este domínio **não** cobre

| Assunto | Domínio dono |
| --- | --- |
| Se a aula é cobrada e em qual ciclo | [`../financeiro/`](../financeiro/README.md) |
| Se a aula vira reposição e com qual competência | [`../financeiro/`](../financeiro/README.md) |
| Como a série vira `RRULE` no Google | [`../integracoes/`](../integracoes/README.md) |
| Restrições por aluno inativo | [`../alunos/`](../alunos/README.md) |

Este é o domínio que mais atravessa os outros: a agenda é o dado que o financeiro conta e que a integração publica. Alteração aqui tem efeito em dinheiro e em estado remoto.

## Specs deste domínio

| Spec | Decide | Status |
| --- | --- | --- |
| `agenda-e-agendamentos.md` | tipos, recorrência, exceções, escopos de edição/exclusão, conflito, persistência pessimista | **pendente** |
| `configuracao-da-grade.md` | faixa de horários da agenda, validação e efeito sobre compromissos existentes | **pendente** |

## Sem spec ainda — comportamento definido pelo código

| Comportamento | Onde está hoje |
| --- | --- |
| Modelo persistido do compromisso | `backend/src/models/Agendamento.js` |
| CRUD e efeito colateral de sincronização | `backend/src/controllers/agendamentoController.js` |
| Motor de recorrência isomórfico | `assets/js/shared/recurrence-helpers.js` |
| Criação de agendamento e recorrência na UI | `assets/js/modal-agendamento.js` |
| Edição, split, exclusão e envio para reposição | `assets/js/modal-acao-slot.js` |
| Conflito de horário | `assets/js/agenda-conflitos.js` |
| Grade de horários | `backend/src/models/Config.js`, `backend/src/controllers/configController.js` |

Enquanto não houver spec, **o código é a verdade**. O histórico de decisões já tomadas sobre séries e exclusões está em [`../integracoes/gcal-sync.md`](../integracoes/gcal-sync.md) §9, porque foi lá que os defeitos apareceram — parte desse conteúdo deve migrar para cá quando a spec nascer.

## Avisos permanentes

- Área sensível: motor de recorrência e detecção de conflito afetam agenda e financeiro ao mesmo tempo.
- O motor de recorrência é consumido pelo backend e não pode depender de `window` ou DOM.
