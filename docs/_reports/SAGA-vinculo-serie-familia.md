# Saga — Vínculo série↔avulsa e conflito fantasma

> Consolida 3 rodadas: `2026-08-30-fix-vinculo-serie-familia`,
> `2026-08-30-fix-vinculo-serie-familia-correcao`,
> `2026-08-30-fix-vinculo-serie-familia-prova-ignorarids`.
> Diagnóstico de origem preservado em `docs/_diags_llm/2026-08-30-diag-vinculo-serie-avulsa-e-conflito-fantasma.md`.
> Os relatórios originais foram removidos na poda de 2026-09-03.
> Estado normativo atual: `docs/specs/gcal-sync.md` §9.15.

## Causa-raiz

O app criava aulas derivadas — avulsa no escopo `occurrence`, série nova no `fromDate` — **sem
guardar vínculo com a série mãe**. O campo `serieOrigemId` existia, mas estava praticamente
morto: escrito só no split, lido só no aviso.

Três consequências em cascata:

1. Série aparada e sua continuação não sabiam uma da outra → **conflito fantasma** (uma série
   aparada gerava 18 conflitos falsos contra a própria continuação).
2. Avulsa órfã sobrevivia à exclusão da série.
3. Avulsa herdava a estrutura de recorrência da avó, com risco de `RRULE` indevido.

## Linha do tempo

**Rodada 1 — vínculo de família.** Avulsa passou a gravar `serieOrigemId: compromisso.id` no
escopo `occurrence`. Criado `window.resolverFamiliaSerie`, travessia em largura com proteção
contra ciclo. Cinco pontos de `ignorarIds` passaram a receber a família inteira. Exclusão em
cascata via `removerFamiliaSerie`, preservando `isReposicao: true`.

*Problema descoberto na revisão*: as mutações foram **afirmadas sem evidência de execução**, e
o dublê de `getConflitosNoDia` mascarava a prova real.

**Rodada 2 — correção da correção.** A mesma família não serve para os dois usos. Separadas:

- `resolverFamiliaSerie` — travessia completa (pais, filhos, irmãos), usada para ignorar
  conflito;
- `resolverFamiliaDescendenteSerie` — travessia estritamente descendente, usada para exclusão,
  para não remover a série histórica anterior.

`removerFamiliaSerie` passou a usar a versão descendente.

**Rodada 3 — prova por espião.** O dublê virou espião: `getConflitosNoDia` e
`getConflitosRecorrenciaEmDatas` continuam devolvendo `[]`, mas registram o `ignorarIds`
recebido. Sete testes novos, um por ponto de `ignorarIds`. Mutações A–G (voltar cada ponto
para `[compromisso.id]`) derrubam um teste cada; mutação removendo `serieOrigemId` derruba
dois; mutação revertendo `removerFamiliaSerie` para `splice` de um só registro derruba dois.
Suíte final: 143 testes.

**Arquivos**: `assets/js/modal-acao-slot.js`, `assets/js/agenda-conflitos.js`,
`backend/test/gcal-duplicata-fix.test.js`, `backend/test/agenda-conflitos.test.js`.

## Decisões deliberadas

- **Duas travessias, não uma.** Conflito precisa ignorar a árvore genealógica inteira;
  exclusão precisa respeitar a trilha histórica e remover só descendentes. São regras
  diferentes e **não podem ser fundidas** — foi exatamente a tentativa de fundi-las que fez a
  primeira rodada falhar.
- **Reposição nunca é removida em cascata.** Aula marcada `isReposicao: true` participa da
  contabilidade financeira e da fila de reposições; apagá-la junto violaria integridade de
  negócio.
- **Os cinco pontos de `ignorarIds` usam a mesma regra.** Conflito legítimo com outro aluno
  continua sendo detectado — o que se ignora é só a própria família.

## Limites herdados

- **O espião é observacional.** Ele prova que o `ignorarIds` correto chegou, **não** que o
  motor de conflito em `assets/js/agenda-conflitos.js` está certo. São coisas diferentes.
- A avulsa continua herdando `tipoRecorrencia`, `diasSemana`, `recorrenciaDataInicio` e os
  demais campos de recorrência da avó. O risco é **latente**: o motor de `RRULE` tem gate
  duplo (`frequencia` e `tipoRecorrencia`), então hoje não vira série — mas viraria se o gate
  mudasse. Tratado depois, na etapa 4.
- `assets/js/cascade-sync-aluno.js` não foi tocado. O vínculo serve a conflito e exclusão, não
  a sync em massa.
