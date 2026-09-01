## 1. Escopo do defeito

O defeito ativo era o rótulo de exclusão da série: o resumo do modal contava registros da cadeia como se fossem aulas reais e, em séries divididas, anunciava um número pequeno demais para o volume que desapareceria da agenda recorrente.

A decisão do dono foi manter o `total` como contagem de registros removíveis, porque esse valor é a guarda que preserva o defeito 6 e a defesa contra "casco invisível". O que mudou foi a descrição do efeito em aulas: contar o passado de verdade e não prometer um número para o futuro infinito.

## 2. Correção entregue

Em `assets/js/modal-acao-slot.js`:

- `montarResumoExclusaoCadeiaSerie` agora expõe `ocorrenciasPassadas` e `temAulaFutura`.
- A contagem do passado usa `window.checarCompromissoNaData` sobre a família inteira, respeitando `!item.isReposicao`, `excecoes` e a regra de que o dia de hoje conta como futuro, não como passado.
- O teto defensivo da varredura ficou em dois anos; isso evita laço sem limite em séries antigas, sem perder o caso de negócio que importa.
- `montarOpcoesExclusaoSlot` agora usa as quatro fórmulas pedidas:
  - passado > 0 e futuro: `As N aulas do passado mais todas as aulas futuras. Desde {desde}.`
  - passado = 0 e futuro: `Todas as aulas, a partir de hoje. Desde {desde}.`
  - passado > 0 e sem futuro: `As N aulas desta série, todas no passado. Desde {desde}.`
  - passado = 0 e sem futuro: `Nenhuma aula restante nesta série.`
- O `confirm` de `executarExclusaoSerie` usa a mesma frase do detalhe do modal para evitar contradição de UX.
- O valor `total` continua contando registros removíveis, sem mexer no guard clause `if (_resumoExclusao.total === 0)`.

## 3. Prova de regressão por mutação

A correção foi validada por mutação e restauração do arquivo de produção, em três etapas:

- A: trocar `ocorrenciasPassadas` por `total` no detalhe do modal: o teste de texto volta ao defeito original e a regressão reaparece.
- B: remover o corte em "hoje" da varredura do passado: o resumo passa a contar o passado inteiro e a série que começa amanhã mostra `> 0` ocorrências passadas. Isso prova que a correção preguiçosa e a linha do corte em hoje são decisivas.
- C: fazer `total` devolver `ocorrenciasPassadas` em vez de `ids.length`: o teste de remoção completa falha, mostrando que a guarda de registros continua essencial.

A restauração do arquivo base foi feita após cada mutação e a validação final ocorreu com a suíte completa.

## 4. Testes e validação

No arquivo `backend/test/gcal-duplicata-fix.test.js`:

- atualizei o teste de plural para a nova frase do modal;
- adicionei `resumo conta as ocorrências passadas da cadeia inteira`;
- adicionei `dia em exceção não entra na contagem de passado`;
- adicionei `série encerrada não promete aulas futuras`;
- adicionei `série que começa amanhã não anuncia aulas passadas`.

Validação final executada:

```text
cd backend
npm test
```

Resultado: 191 testes, 191 aprovados, 0 falhas.

## 5. Decisão de implementação registrada

A formulação do rótulo foi escolhida para refletir a realidade do domínio: o passado é finito e contável; o futuro pode ser infinito e não precisa ser numerado. Isso é o ponto de equilíbrio entre honestidade do efeito e segurança contra a reabertura do defeito 6.
