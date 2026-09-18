# Saga — Split de série: exceções, herança de término e série vazia

> Consolida 4 rodadas: `2026-08-30-fix-split-preserva-excecoes`,
> `2026-08-31-fix-split-encadeado-heranca-e-serie-vazia`,
> `2026-08-31-fix-heranca-mae-vazia-split`, `2026-08-31-fix-heranca-contagem-ocorrencias`.
> Diagnóstico de origem preservado em `docs/_diags_llm/2026-08-31-diag-split-encadeado-defeitos-5-e-6.md`.
> Os relatórios originais foram removidos na poda de 2026-09-03.
> Estado normativo atual: `docs/specs/gcal-sync.md` §9.15.

## Os três defeitos

### Exceções perdidas no split

A série de continuação nascia com `excecoes: []` e `excecoesDetalhadas: []`. Efeito prático:
aula que tinha sido remarcada voltava a aparecer, duplicada, na data original.

### Defeito 5 — filha nasce infinita e invade a irmã

O bloco `fromDate` apagava incondicionalmente `recorrenciaFimCondicao` e `recorrenciaDataFim`
da série nova. A premissa era "série nova não tem prazo". Verdadeira quando a mãe era
genuinamente infinita; **falsa quando a mãe já tinha sido aparada por um split anterior**.

Cenário reproduzido: S0 infinita → split → S1 (até 01/09); S1 → split → S2; S1 re-aparada até
06/09 → split → **S3 infinita**, que deveria ter herdado o fim 08/09. S2 e S3 infinitas
duplicam aula nos mesmos dias.

### Defeito 6 — casco invisível

O teste de "série vazia" comparava `recorrenciaDataFim < recorrenciaDataInicio`. Falha quando o
corte cai numa **segunda-feira**: o `UNTIL` vai para o domingo anterior, fim e início ficam
iguais, a comparação dá `false`. A série não é removida, mas gera zero ocorrências — invisível
no app, invisível no Google, existente no banco, consumindo um `googleCalendarEventId`
determinístico.

Caso real em produção: `recorrenciaDataInicio` e `recorrenciaDataFim` ambos em `30/08/2026`
(domingo), com `diasSemana: ['Segunda', 'Terça', 'Quarta']`.

## Como funciona hoje

**Filtro de exceções.** `_filtrarExcecoesAposData` compara com `window.parseDataFlex` — não com
string, porque ordem lexicográfica de data pt-BR está errada — e usa `>=`, não `>`. Item sem
data legível é **preservado**, por conservadorismo. O formato de `excecoesDetalhadas` é
mantido, sem converter objeto em string.

**Captura antes do aparo.** `recorrenciaFimCondicao`, `recorrenciaDataFim` e
`recorrenciaQuantidadeOcorrencias` da mãe são lidos **antes** de a mãe ser aparada. Ler depois
foi uma das mutações que derrubam o teste.

**Verificação de série vazia.** Em vez de comparar datas, o código pergunta ao motor
compartilhado se ainda existe ocorrência, via `window.checarCompromissoNaData`. Se não existe,
a série sai do array com `splice`.

**Herança de término.** A filha herda o fim da mãe quando a mãe termina em `untilDate` e essa
data é posterior ao corte. Quando a mãe termina por contagem de ocorrências, o código calcula o
**fim efetivo**: percorre dias a partir do `recorrenciaDataInicio` original contando ocorrências
reais com `checarCompromissoNaData` até atingir a N-ésima.

**Arquivo**: `assets/js/modal-acao-slot.js`, bloco `fromDate`.

## Decisões deliberadas — não confunda com bug

- **A avulsa criada no `occurrence` nasce com `excecoes: []` de propósito.** Ela representa um
  único dia; não faz sentido herdar exceções de série. Isso foi apontado como defeito em pelo
  menos duas rodadas e **não é**.
- **Exceção na data exata do corte migra para a filha.** O filtro usa `>=`: o corte é
  inclusivo, e o dia do corte pertence ao "daqui pra frente".
- **Só `untilDate` e contagem de ocorrências são reinterpretados na filha.** Outras condições
  de término deixam a filha infinita, por conservadorismo — a regra não está na spec.
- **Exceções anteriores ao corte não são removidas da mãe.** Nunca serão usadas, mas a poda
  retroativa não foi implementada.

## Prova

Mutações que derrubam teste: restaurar `excecoes: []`; restaurar `excecoesDetalhadas: []`;
trocar `>=` por `>`; comparar string em vez de usar `parseDataFlex`; remover o término da filha
incondicionalmente; ler o fim da mãe depois do aparo; herdar sempre, inclusive de mãe infinita;
voltar à comparação de datas invertidas; inverter a condição de remoção; remover o `splice`;
exigir `untilDate` descartando o cálculo de fim efetivo; contar ocorrências a partir do corte em
vez do início.

**O que ficou sem prova**: três guardas do harness de split (remover `excecoes: []` da avulsa,
remover `serieOrigemId` da avulsa, reverter `removerFamiliaSerie` para `splice` de um só)
**não falharam** quando mutadas. O problema não está na correção — está na prova, que não
alcança essas guardas.

## Limites herdados

- **Mãe finita por contagem que sobrevive ao aparo mantém o campo de contagem.** Fica com dois
  critérios de término ao mesmo tempo (`UNTIL` e contagem). Inconsistente, não corrigido —
  entra em redesenho maior de recorrência.
- **A genealogia é invisível para o motor de conflito.** `agenda-conflitos.js` não sabe que
  duas séries são irmãs através de uma avó comum. As correções dos defeitos 5 e 6 reduzem o
  caso extremo tornando as filhas finitas quando possível, mas não o eliminam.

## Queries de diagnóstico em produção

Nenhuma limpeza retroativa foi executada. As duas queries que identificam os registros
afetados:

**Filhas infinitas irmãs (defeito 5)**

```javascript
db.agendamentos.aggregate([
  { $match: {
      ownerEmail,
      serieOrigemId: { $exists: true, $ne: null },
      recorrenciaDataFim: { $exists: false }
  } },
  { $group: { _id: "$serieOrigemId", filhos: { $push: "$id" }, qtdFilhas: { $sum: 1 } } },
  { $match: { qtdFilhas: { $gte: 2 } } }
]);
```

**Cascos invisíveis (defeito 6)**

```javascript
db.agendamentos.find({
  ownerEmail,
  recorrenciaFimCondicao: "untilDate",
  recorrenciaDataInicio: { $exists: true, $ne: null },
  recorrenciaDataFim: { $exists: true, $ne: null },
  $expr: { $eq: ["$recorrenciaDataInicio", "$recorrenciaDataFim"] }
});
```
