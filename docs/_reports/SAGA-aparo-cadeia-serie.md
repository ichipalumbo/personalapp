# Saga — Motor de aparo de cadeia "daqui pra frente"

> Consolida 2 rodadas: `2026-08-31-feat-aparo-cadeia-serie` (6b-core),
> `2026-08-31-fix-escopo-aparo-cadeia` (6b-fix).
> Os relatórios originais foram removidos na poda de 2026-09-03.
> Estado normativo atual: `docs/specs/gcal-sync.md` §9.18.

## O que o motor faz

`window.aparaCadeiaSerieAPartirDe(idOuCompromisso, dataCorte)` percorre a cadeia descendente da
série e suas avulsas irmãs, aparando ou removendo conforme a data de corte, sem subir ao
ancestral e sem tocar no histórico.

Retorna `{ aparadas, removidas, reposicoesPreservadas, ids }` — a UI usa esses números para
montar o resumo da confirmação, em vez de recalcular por conta própria.

Opera **em lugar** no array `aulas`. Persistência é responsabilidade da camada de UI.

## As cinco regras

| Alvo | Regra |
|---|---|
| Série selecionada | Se fica vazia após o aparo, é removida; senão recebe `untilDate` na véspera do corte |
| Descendente que começa **no corte ou depois** | Removido |
| Descendente que começa antes e continua depois | Aparado na véspera do corte |
| Avulsa irmã (mesmo `serieOrigemId`, `frequencia: 'uma_vez'`) | Sai se a data for `>=` corte; fica se for anterior |
| Reposição (`isReposicao`) | **Sempre preservada**, em qualquer data |

A verificação de "fica vazia" reusa a mesma lógica do split, via
`window.checarCompromissoNaData`. Sem reimplementação.

## Os dois defeitos que a segunda rodada corrigiu

**Descendente inteiramente anterior ao corte era removido.** Havia uma cláusula
`if (dataFim && dataFim < dataCorte) { removerItem() }` que apagava todo descendente cuja série
terminasse antes do corte — inclusive os que estavam íntegros e gerando aulas normalmente. Uma
série de 01/09 a 04/09 sumia num corte em 07/09. A cláusula foi removida: descendente que
termina antes do corte **não é tocado**.

**O escopo subia até o ancestral avulso.** A última cláusula de `mesmoRamo` incluía
`item.id === raizRelacionada`, o que selecionava o **próprio ancestral** para remoção, fazendo o
escopo extravasar para cima na cadeia. A cláusula foi removida.

**Arquivo**: `assets/js/modal-acao-slot.js`.

## Decisões deliberadas

- **Histórico é intocável.** Só o que atravessa o corte é aparado. Descendente inteiramente
  anterior fica.
- **Avulsa irmã a partir do corte é tratada como continuação**, não como histórico — por isso
  sai. A exceção é reposição.
- **Reposição sobrevive em qualquer data, inclusive no passado.** É ato administrativo, não
  geração automática de série. Reposição futura foi agendada de propósito; reposição passada já
  foi consumida e mexer na cobrança é outro assunto.
- **`reposicoesPreservadas` volta no retorno** para que a UI possa avisar quantas ficam, sem
  recalcular. Decisão e mensagem saem do mesmo lugar.

## Limite herdado

A confirmação final continua usando `window.confirm()` nativo. Débito registrado em
`docs/specs/gcal-sync.md` §9.19 e §9.23.
