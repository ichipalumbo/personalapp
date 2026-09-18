# Saga — Rodadas de manutenção de documentação

> Consolida 5 rodadas: `2026-08-26-docs-consolidacao-roadmap`,
> `2026-08-26-fix-obter-reposicao-e-fechamento-roadmap`,
> `2026-08-29-docs-ajuste-secoes-10-11-gcal`, `2026-08-29-docs-sync-spec-roadmap-contexto`,
> `2026-09-01-docs-fechamento-etapa-6`.
> Os relatórios originais foram removidos na poda de 2026-09-03.

## Causa-raiz

Depois de várias rodadas seguidas de correção de código, a documentação passou a descrever um
estado que já não existia. O sintoma mais grave: a seção 10 da spec de Google Calendar
**negava a existência de uma feature que já estava implementada** ("o app não tem um fluxo de
editar série a partir daqui"), quando o fluxo `fromDate` já rodava em produção.

## Linha do tempo

| # | Rodada | O que foi feito |
|---|---|---|
| 1 | `docs-consolidacao-roadmap` | Item 0.5 mudou de "implementado na branch" para "em produção" após auditoria contra o código. Débito de `calcularPrazoReposicao` movido do Grupo 2 para o Grupo 0 como item 0.10. Itens órfãos de GCal renumerados. Roadmap foi de 34 para 33 itens |
| 2 | `fix-obter-reposicao-e-fechamento-roadmap` | **Única mudança de regra de negócio do conjunto** — ver abaixo |
| 3 | `docs-ajuste-secoes-10-11-gcal` | Seção 10 reescrita para descrever o fluxo `fromDate` que já existia; seção 11 reordenada refletindo que 9.15 e 9.16 já estavam resolvidos |
| 4 | `docs-sync-spec-roadmap-contexto` | Quatro documentos ressincronizados: spec, `docs/README.md`, roadmap e o documento de contexto. Grafia do cabeçalho corrigida para `Fora de escopo` |
| 5 | `docs-fechamento-etapa-6` | Registro do fechamento da etapa 6 e dos débitos remanescentes; correção de uma referência de arquivo com data errada no nome |

## A única mudança de código

`obterReposicao`, em `backend/src/controllers/reposicaoController.js`, devolvia o documento
cru do Mongo **sem aplicar expiração lazy**. Uma reposição com `validoAte` no passado voltava
com status `pendente` em vez de `expirada`. `listarReposicoes` já aplicava a regra;
`obterReposicao` estava fora do padrão.

A correção chama `reposicaoService.sincronizarExpiracaoLazy(ownerEmail, [reposicao], new Date())`
antes de responder. Dois testes de regressão em `backend/test/reposicao-api.test.js`, provados
por mutação. Suíte foi de 84 para 86.

## Lição de processo que custou duas rodadas

Um agente procurou pela seção `Fora de Escopo` com `E` maiúsculo, não achou o cabeçalho real
`## 8. Fora de escopo`, e reportou que a seção não existia. As duas rodadas seguintes
trabalharam em cima dessa premissa falsa. **Busque cabeçalho sempre case-insensitive.**

## Limites herdados

- **Item 0.8** (avisos in-app de reposição a vencer): a caixinha de contador no card do aluno
  nunca foi implementada — não existe em `index.html` nem em `assets/js/view-alunos.js`.
  Continua no backlog.
- **Item 9.14** (gatilho triplo de sync no boot) e **9.8** (cobertura de I/O real com o
  Google) seguem abertos na spec.
- **Caminho atravessado de `assets/js/shared/recurrence-helpers.js`**: item 0.2 do roadmap,
  não resolvido.
