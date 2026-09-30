# Remoção dos filtros de Status/Objetivo da tela Alunos

> **Data**: 2026-09-27
> **Branch**: `main` (decisão do dono)
> **Origem**: pedido direto do dono ("deixar mais clean por enquanto"), independente das etapas
> da auditoria mobile — não é a Etapa 4 (`docs/diagnostics/2026-09-23-diag-auditoria-ui-ux-mobile.md`),
> que trata de densidade/informação de cards com pergunta de produto própria.

## O que existia

A tela Alunos tinha 2 `<select>` ("Filtrar por status": Todos/Ativos/Inativos; "Filtrar por
objetivo": Todos/Personal Trainer/Consultoria Online) entre o título "Seus Alunos" e a grade de
cards. Eles filtravam a lista renderizada em `renderizarListaAlunos()`.

## Decisão

Remoção completa (não apenas ocultar) — mesmo padrão já usado na remoção do filtro de status da
tela Finanças na Etapa 2 (`386b00c`). Sem código morto reativável.

## Alterações

- `index.html`: removido o bloco `<div style="display:grid...">` com os 2 `form-grupo-spa` dos
  selects, entre o `<h3>Seus Alunos</h3>` e `<div class="alunos-grid" id="listaAlunos">`.
- `assets/js/view-alunos.js`:
  - Removidas `obterFiltroStatusAlunos()` e `obterFiltroObjetivoAlunos()`.
  - Em `renderizarListaAlunos()`: removidos os dois filtros da chave de dirty-check, removido o
    `.filter()` por status/objetivo (a lista renderiza `alunos` diretamente), removido o estado
    vazio "Nenhum aluno encontrado com os filtros selecionados" (ficava inatingível sem filtro).
  - Removidos os 2 listeners de `change` (`filtroStatus`/`filtroObjetivo`) em `DOMContentLoaded`.
  - Mantidas `normalizarStatusAlunoLocal`/`normalizarObjetivoAluno` — usadas em outros pontos
    (render do card, formulário de cadastro, `alternarStatusAluno`).
- `tests-frontend/view-alunos-observacoes.test.js`: removidos os 2 `<select>` do fixture HTML,
  que só existiam para satisfazer os `getElementById` agora inexistentes.

## Validação

- `grep` final por `filtroAlunosStatus|filtroAlunosObjetivo|obterFiltroStatusAlunos|
  obterFiltroObjetivoAlunos`: zero ocorrência em código.
- Suíte `tests-frontend/` (`node --test`): **77/77 antes → 77/77 depois**.
- Runtime (mock `?mockScenario=alunosEmAtraso`, 320×568 via CDP com DPR 2.81 + touch): tela
  Alunos renderiza os 3 alunos direto sob o título, sem os selects no DOM
  (`temFiltroStatus`/`temFiltroObjetivo` = `false`), `scrollWidth === clientWidth === 320`
  (zero overflow horizontal), sem erro JS novo.

## Fora de escopo

Switches de status/objetivo do formulário de cadastro/edição de aluno, card do aluno, e qualquer
regra de negócio — nada disso foi alterado.
