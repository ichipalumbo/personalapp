# Relatório — fix/dedupe-calcular-prazo-reposicao

## Portão de base

```text
## branch
fix/dedupe-calcular-prazo-reposicao
## status

## function count
2
## prazo constant count
4
## copilot instructions exists
True
```

## Resposta da Parte 1.1

A — Redundante. Em `calcularCicloVigente` há um retorno antecipado em `if (aluno && aluno.objetivo !== "Consultoria Online" && !aluno.fechamentoMesCheio && !aluno.diaVencimento) { return null; }`, antes mesmo de montar o ciclo. Isso significa que, para aluno sem ciclo configurado, o código vigente já devolve `null` e a execução de `calcularPrazoReposicao` cai no guard de `if (!cicloAtual || !cicloAtual.cicloFimISO) { return { validoAte: null, pisoAplicado: false }; }`. O bloco morto repetia a mesma condição e era duplicado, não uma regra distinta.

## Resposta da Parte 1.2

Não. `normalizarDateOnly` faz `new Date(data.getFullYear(), data.getMonth(), data.getDate())`, ou seja, normaliza a data para meia-noite local, sem hora. Como a diferença entre duas datas normalizadas sempre é um número inteiro de milissegundos de 24h (múltiplo exato de `86400000`), `Math.floor` e `Math.round` produzem o mesmo resultado neste caminho. Não há cenário de um dia de diferença aqui.

## Diff

```text
.github/copilot-instructions.md                   | 47 ++++++++++++++++-------
backend/src/services/financasService.js           | 44 ---------------------
docs/contexto-personalapp-para-novas-conversas.md |  7 ++++
3 files changed, 40 insertions(+), 58 deletions(-)
```

## npm test antes e depois

Antes:

```text
ℹ tests 84
ℹ pass 84
ℹ fail 0
ℹ duration_ms 864.1899
```

Depois:

```text
ℹ tests 84
ℹ pass 84
ℹ fail 0
ℹ duration_ms 931.4928
```

## O que encontrei e não alterei

- `calcularCicloVigente` já retorna `null` para aluno sem `fechamentoMesCheio` e sem `diaVencimento`, então o bloco removido era redundante.
- `normalizarDateOnly` sempre zera a hora, o que faz `Math.floor` e `Math.round` coincidir.
- Não alterei a função ativa de `calcularPrazoReposicao`, `PRAZO_MINIMO_REPOSICAO_DIAS`, `module.exports` nem qualquer arquivo de teste.
- Não mexi em outras specs, no roadmap nem em código fora do escopo autorizado.
