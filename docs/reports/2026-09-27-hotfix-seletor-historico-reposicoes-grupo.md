# Hotfix — divergência de seletor CSS/JS no histórico de reposições

> **Data**: 2026-09-27
> **Branch**: `main` (decisão do dono — sem branch nova)
> **Origem**: item 4.17.2 de `docs/diagnostics/2026-09-23-diag-auditoria-ui-ux-mobile.md` (Etapa 7),
> classificado ali como bug isolado corrigível a qualquer momento, sem dependência de decisão
> de produto.

## Bug

- `assets/js/view-alunos.js:471` gera `<section class="historico-reposicao-grupo">` (singular).
- `assets/css/style.css:2457` e `:2460` estilizavam `.historico-reposicoes-grupo` (plural).
- A regra nunca batia: o espaçamento de 18px entre grupos de status (pendente/agendada/
  realizada/expirada) e o estilo do título do grupo (`h4` dourado, uppercase, 0.75rem) não eram
  aplicados no histórico de reposições do aluno.
- Todas as classes irmãs do mesmo bloco (`historico-reposicao-lista`, `-linha`, `-status`,
  `-cobranca`, `-detalhes`, `-data`, `-acao`) já eram singulares nos dois arquivos — só `-grupo`
  divergia.

## Correção

Arquivo alterado: `assets/css/style.css`.

```diff
- .historico-reposicoes-grupo + .historico-reposicoes-grupo {
+ .historico-reposicao-grupo + .historico-reposicao-grupo {
    margin-top: 18px;
  }
- .historico-reposicoes-grupo h4 {
+ .historico-reposicao-grupo h4 {
```

O CSS foi ajustado para singular (não o JS), por consistência com as demais classes do bloco.
Nenhuma regra de negócio foi alterada.

## Validação

- `grep` final: zero ocorrência de `historico-reposicoes-grupo` (plural) em código; as únicas
  ocorrências restantes são no texto descritivo do diagnóstico.
- Suíte `tests-frontend/` (`node --test`): **77/77 antes → 77/77 depois** (nenhum teste cobre a
  regra CSS diretamente; contagem inalterada, como esperado).
- Validação runtime (mock `?mockScenario=alunosEmAtraso`, aluno "Julia Nogueira", grupo
  "Pendentes"): `getComputedStyle` do `h4` do grupo confirmou `color: rgb(255, 215, 0)`,
  `text-transform: uppercase`, `font-size: 12px` — a regra agora se aplica.

## Fora de escopo

Demais itens do achado 4.17 (mensagem de modo leitura, textarea financeiro, disabled/aria-label
já cobertos pela Etapa 2, links de navegação com histórico) e o achado 4.13 (amarelo sobrecarregado
semanticamente) seguem na Etapa 7, sem alteração nesta rodada.
