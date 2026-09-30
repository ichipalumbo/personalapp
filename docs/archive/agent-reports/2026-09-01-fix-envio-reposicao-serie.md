# Restauração do despachante de reposição em série (etapa 6c)

Rodada de recuperação. A regressão do modal de ação de slot apagou o quarto handler e deixou o botão
`btnReagendarInstancia` sem listener real. Em vez de despachar para um único fluxo, o código abriu o
modal de cobrança e retornava imediatamente, então a ação de série nunca chegava ao ramo de
`excecoes.push(...)` e a aula original não era marcada como reposição.

## 1) Causa raiz

O fluxo de reposição chamava `abrirModalEscolhaCobrancaReposicao()` sem aguardar o callback do modal.
Como o callback só concluía depois da escolha do usuário, a função `window.executarEnvioParaReposicao`
retornava antes da mutação de negócio. O efeito prático era silencioso: a action parecia “clicar”, mas
não ajustava `aulas` nem `compromisso.excecoes`.

Além disso, a ação de série e a de avulsa eram tratadas como mesmo caminho no módulo. A correção
precisa manter a diferença de produto:

- avulsa: `splice`
- série: `excecoes.push(dataAlvo)`

## 2) Correção aplicada

- restaurado o despachante `window.executarEnvioParaReposicao` em `assets/js/modal-acao-slot.js`;
- movido o corpo do listener de `btnMandarParaReposicao` para dentro dessa função;
- rewire de `btnMandarParaReposicao` e `btnReagendarInstancia` para o mesmo despachante;
- preservado o guard de aluno inativo e o fechamento do modal pai;
- aguardado o retorno do modal de cobrança com `await window.abrirModalEscolhaCobrancaReposicao(...)`;
- mantido o ramo de série com `excecoes.push(dataAlvo)` e o caminho de avulsa com `splice`.

## 3) Testes de efeito adicionados

Arquivo: `backend/test/gcal-duplicata-fix.test.js`

- `envio para reposição em série preserva a série e marca exceção`
- `envio para reposição em avulsa remove a aula`
- `os dois botões despacham para a mesma função`
- `envio para reposição bloqueado para aluno inativo`

Os testes validam efeitos reais no array e na persistência, não apenas a presença de função.

## 4) Verificação final

```powershell
Set-Location 'E:\Projetos\GIT\personalapp\backend'
npm test
```

Resultado observado:

```text
ℹ tests 181
ℹ suites 0
ℹ pass 181
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 10978.89
```

```powershell
Set-Location 'E:\Projetos\GIT\personalapp'
git rev-parse --abbrev-ref HEAD
git status --short
git diff --stat
```

Resultado observado:

```text
fix/excluir-serie-toda-coerente
(sem saída)
assets/js/modal-acao-slot.js | 17 ++++++++++++++++
backend/test/gcal-duplicata-fix.test.js | 185 ++++++++++++++++++++++++++++++++++++++++++++++++++++++
docs/specs/gcal-sync.md | 20 ++++++++++++++++++++
docs/_reports/2026-09-01-fix-envio-reposicao-serie.md | 61 +++++++++++++++++++++++++++++++++++++
```

Os diffs não tocaram `index.html`, `assets/css/style.css` nem qualquer arquivo fora do escopo permitido.
