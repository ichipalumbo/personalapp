# TEST_PLAN — Casos críticos (MVP)

1. Concorrência: dois alunos tentam agendar o mesmo slot ao mesmo tempo
- Expectativa: apenas 1 sucesso (200), outro recebe 409 Conflict
- Como testar: script que chama /api/slots/:slotId/agendar em paralelo

2. Cancelamento com antecedência insuficiente
- Expectativa: 403 Forbidden

3. Bulk add com colisões
- Expectativa: API retorna lista de conflitos e cria apenas slots válidos

4. Evento deletado manualmente no Calendar
- Expectativa: na próxima sincronização o slot volta para `disponivel`

5. Reagendamento: professor marca presença 'Reagendado' e cria slot de reposição
- Expectativa: novo slot criado e `Agendamento` atualizado com `dataReagendamento`

6. Validações: email do aluno deve ser Gmail (MVP)
- Testar emails inválidos → 400

7. Timezone handling
- Testar agendamento em timezone diferente e verificar timestamps em UTC

