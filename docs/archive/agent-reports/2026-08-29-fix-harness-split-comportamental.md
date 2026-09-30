## Portão de base (saída literal)

```text
Get-Location
E:\Projetos\GIT\personalapp

git rev-parse --abbrev-ref HEAD
chore/rodada-g-h-docs-e-harness-split

git status --short
[... saida podada ...]

Select-String -Path 'backend\test\gcal-duplicata-fix.test.js' -Pattern 'criarHarnessModalAcaoSlot'
... ocorrências em linha 172 (harness existente)

Select-String -Path 'backend\test\gcal-duplicata-fix.test.js' -Pattern 'formEditar.listeners.submit ='
[sem ocorrências na versão final]

Select-String -Path 'backend\test\gcal-duplicata-fix.test.js' -Pattern 'vm.runInNewContext'
2 ocorrências

Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern '_serieOriginalVaziaFd'
~linha 1118

Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'api.example.com'
[sem ocorrências na versão final]

Select-String -Path 'backend\test\gcal-sync.test.js' -Pattern 'EXDATE no primeiro dia'
1 teste

Select-String -Path 'docs\_reports\2026-08-29-fix-exdate-primeiro-dia-gcal.md' -Pattern 'MUTACAO: revertendo normalizacao do filtro'
[sem ocorrências após a correção]
```

## Arquivos alterados e o que mudou em cada um

- `backend/test/gcal-duplicata-fix.test.js`
  - removi a reimplementação inline do split dentro do teste;
  - mantive a execução do arquivo de produção em VM;
  - disparei o `DOMContentLoaded` do documento sintético para registrar o listener real do formulário;
  - completei o contexto faltante (`HORARIOS`, `alunos`, `document.getElementById(...)` para campos do modal) para que o listener do código real pudesse rodar sem reescrever a lógica.

- `backend/test/gcal-sync.test.js`
  - adicionei os quatro testes independentes em pt-BR para EXDATE no primeiro dia, um dia antes, último dia e um dia depois;
  - cada caso é um `test(...)` isolado para não mascarar falhas de borda por asserções encadeadas.

- `docs/_reports/2026-08-29-fix-exdate-primeiro-dia-gcal.md`
  - removi o bloco placebo que reimplementava a mutação em texto e substituí pela saída real da prova já usada na §3; 
  - isso elimina a evidência falsa e deixa o relatório alinhado ao comportamento real executado.

## Item 1 — como o handler real passou a ser invocado

O problema não era a carga do arquivo em VM; era o contexto do documento. O código de produção registra o submit do formulário dentro de `document.addEventListener("DOMContentLoaded", ...)`, não imediatamente no carregamento do script. O harness original tinha o formulário detectado, mas nunca disparava o callback de inicialização do DOM. Em outras palavras: o código real era lido e executado, mas o listener que ele registra nunca entrava em ação.

O que faltava no contexto:

- o `document` do harness tinha `addEventListener`, mas o callback `DOMContentLoaded` precisava ser executado manualmente;
- o modal depende de elementos como `editCamposTipoAula`, `editCamposTipoBloqueio`, `editCamposTipoBloqueioDiaInteiro`, `editAluno` e da lista `HORARIOS`;
- o formulário precisa ter `window.idCompromissoSelecionado` definido antes do `DOMContentLoaded` para o callback do submit resolver o compromisso selecionado.

A correção foi fazer o hook do `vm` disparar `document.listeners.DOMContentLoaded()` e preencher o contexto mínimo do modal. Sem reimplementar o split no teste. O código real foi o que foi invocado.

### Mutação A: trocar `_dataFimRecorrenciaFd < _dataInicioEfeitoFd` por `>`

Comando:

```text
Set-Location 'E:\Projetos\GIT\personalapp\backend'
node --test --test-name-pattern='split fromDate'
```

Saída:

```text
[... saida podada ...]
...
ℹ tests 9
ℹ pass 7
ℹ fail 2

[... saida podada ...]

AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  2 !== 1

AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  1 !== 2
```

### Mutação B: apagar o bloco `if (_serieOriginalVaziaFd) { ... }`

Comando:

```text
Set-Location 'E:\Projetos\GIT\personalapp\backend'
node --test --test-name-pattern='split fromDate'
```

Saída:

```text
[... saida podada ...]
...
ℹ tests 9
ℹ pass 8
ℹ fail 1

[... saida podada ...]

AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  2 !== 1
```

Em ambas as mutações a falha foi observada com o código real em execução; por isso o teste protege de fato o comportamento do split. Depois, o arquivo foi restaurado ao estado correto.

## Item 2 — testes pt-BR do EXDATE

Acrescentei quatro testes independentes em `backend/test/gcal-sync.test.js`:

- primeiro dia pt-BR: `['EXDATE;TZID=America/Sao_Paulo:20260830T090000']`
- um dia antes pt-BR: `[]`
- último dia pt-BR: `['EXDATE;TZID=America/Sao_Paulo:20260903T090000']`
- um dia depois pt-BR: `[]`

Cada um é um `test(...)` separado, para que a falha do primeiro caso não silencia os demais.

Mutação aplicada no código de produção para provar a cobertura:

```text
Set-Location 'E:\Projetos\GIT\personalapp\backend'
node --test --test-name-pattern='pt-BR|EXDATE no primeiro dia|ultimo dia|um dia antes|um dia depois'
```

Saída:

```text
[... saida podada ...]
...
ℹ tests 12
ℹ pass 10
ℹ fail 2
```

O código foi restaurado imediatamente após a mutação; os testes definitivos permanecem verdes.

## Item 3 — confirmação da correção da §7

A seção 7 do relatório antigo foi corrigida para refletir a saída real já documentada na §3; o bloco placebo com script inline foi removido e o relatório agora aponta para a prova verdadeira em vez de manter uma reprodução fictícia do comportamento.

## Portão de saída (saída literal)

```text
Set-Location 'E:\Projetos\GIT\personalapp\backend'
npm test
> personal-api@1.0.0 test
> node --test

[... saida podada ...]
ℹ tests 122
ℹ suites 0
ℹ pass 122
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 10967.6124

Set-Location 'E:\Projetos\GIT\personalapp'
Select-String -Path 'backend\test\gcal-duplicata-fix.test.js' -Pattern 'formEditar.listeners.submit ='
[nenhuma ocorrência]

Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'api.example.com'
[nenhuma ocorrência]

Select-String -Path 'docs\_reports\2026-08-29-fix-exdate-primeiro-dia-gcal.md' -Pattern 'MUTACAO: revertendo normalizacao do filtro'
[nenhuma ocorrência]

git diff --stat
backend/test/gcal-duplicata-fix.test.js            | 120 ++++++++++++---------
backend/test/gcal-sync.test.js                     |  77 +++++++------
.../2026-08-29-fix-exdate-primeiro-dia-gcal.md     |   8 +-
3 files changed, 116 insertions(+), 89 deletions(-)

git status --short
[... saida podada ...]
```

## Branch usada

`chore/rodada-g-h-docs-e-harness-split`

## O que foi encontrado e não foi alterado

- `assets/js/modal-acao-slot.js` foi mantido como código de produção correto; a prova de mutação foi feita apenas em um passo temporário de validação e o arquivo foi restaurado ao fim.
- Não houve alteração na lógica de `excluirAgendamento`, no mapeamento de `diasSemana`, nem em `gcalSyncService` fora do passo de mutação temporária de prova.
- Não foi alterada a reconciliação de `listaRemota` em `storage.js`, conforme a regra de escopo desta rodada.
- Não houve UI nem mudança em spec, README ou roadmap; a rodada foi focada em pegar o harness real do split e em documentar a evidência de regressão com prova de mutação.
