# Etapa 6i — Persistência silenciosa em criação, edição, split e envio para reposição

Branch: `fix/excluir-serie-toda-coerent` — **pré-condição de branch satisfeita**.

---

## 1. Portão de base

```text
Get-Location
C:\Users\LBRESSIA\OneDrive - azureford\Documents\GitHub Person\personalapp

git rev-parse --abbrev-ref HEAD
fix/excluir-serie-toda-coerent

git status --short
<sem saída — working tree limpa>

git log --oneline -6
c6829df (HEAD -> fix/excluir-serie-toda-coerent, origin/fix/excluir-serie-toda-coerent) feat: add detailed diagnostic report for silent persistence failures in event creation and editing
1dfdaf1 feat: confirm persistence of deletions with Google Calendar connected and update documentation
9c2cbbd feat: enhance error handling in event deletion functions and add tests for persistence failures
e73460c feat: enhance series deletion modal to accurately reflect past occurrences and future classes
39c7180 feat: add Uizze design stack and reference materials for UI guidance
6f4cf63 Merge pull request #53 from ichipalumbo/fix/excluir-serie-toda-coerente
```

### 1.1 Reconferência dos seis pontos contra o relatório da 6i-a

Todos os seis pontos foram reconferidos por leitura direta dos arquivos. **Nenhum tinha mudado
desde o diagnóstico.** As linhas se deslocaram apenas pelas edições desta rodada.

| Ponto | Local confirmado antes da edição | Bate com a 6i-a? |
| --- | --- | --- |
| 1 | `modal-agendamento.js:907`, handler de `submit` de `formAgendamento` | sim |
| 2 | `modal-acao-slot.js:2380-2384`, handler de `submit` de `formEditarCompromisso` | sim |
| 3 | `modal-acao-slot.js:1813-1818`, handler de `submit` de `formReagendarAula` | sim |
| 4 | `modal-acao-slot.js:2390`, `_novaOcorrenciaSerie` | sim |
| 5 | `modal-acao-slot.js:2395`, `_novaSerieSplit` | sim |
| 6 | `modal-acao-slot.js:2508-2512`, `window.executarEnvioParaReposicao`, ramo `!ehSerie` | sim |

### 1.2 Ocorrência não relacionada encontrada no meio da rodada

Depois de rodar `npm install` no `backend/` (o `node_modules/` não existia e a suíte não subia —
o `npm test` da sessão anterior falhava com `MODULE_NOT_FOUND` em `mongoose`), o `git diff`
passou a mostrar `.gitignore` modificado, com `node_modules/` trocado por `backend/node_modules/`.
**Essa alteração não foi feita por esta rodada** e o `git status` do portão de base estava limpo.
O arquivo foi devolvido ao conteúdo original por edição direta (não por comando git) e o
`git diff --stat` final já não lista `.gitignore`. Registro aqui porque não sei a origem da
alteração e ela pode reaparecer.

---

## 2. Ponto 1 — Criar aula (`modal-agendamento.js`)

### Implementação

O handler de `submit` de `formAgendamento` virou `async`. A chamada, que era disparada e
esquecida (`window.salvarEventoComGCal(...)` sem `await` e sem checagem), passou a ser aguardada
e checada.

Três funções novas no arquivo, todas acima do bloco de listeners:

- `persistenciaAgendamentoConcluida(resultado)` — delega para
  `window.reposicaoFlowHelpers.deveEnviarPatch`, com o mesmo fallback local que
  `modal-acao-slot.js` já usa. Não é mecanismo novo: é o par já em uso no projeto, alcançado
  pelo módulo compartilhado `assets/js/shared/reposicao-flow-helpers.js`, que o `index.html`
  carrega antes de `modal-agendamento.js`.
- `obterMensagemFalhaPersistenciaAgendamento(resultado)` — idem, para a mensagem de toast.
- `capturarValoresFormularioAgendamento()` / `reabrirFormularioAgendamentoComValores(valores)` /
  `reverterCriacaoAgendamento(...)` — captura os valores digitados antes do modal fechar, remove
  a aula de `aulas` em caso de falha, dispara o toast de erro e reabre o formulário chamando
  `window.abrirAgendamentoModal` (o mesmo caminho de abertura normal) e reinjetando os valores
  capturados. O rascunho de recorrência (`rascunhoFluxoAgendamento`) também é preservado e
  restaurado, porque `abrirAgendamentoModal` cria um rascunho novo e descartaria o anterior.

### Sub-decisão registrada

O `else` (Google Agenda desconectada) chamava `salvarDados()` sem `await` e sem checagem — mesmo
defeito, mesmo bloco `if/else`. Foi corrigido junto, seguindo o precedente da 6h, que também
tratou os dois ramos nos três handlers de exclusão. É a opção que muda menos comportamento além
do decidido: sem isso, a Josy sem Google Agenda conectada continuaria com a falha silenciosa que
esta etapa existe para eliminar.

### Prova por mutação

Mutação: neutralizar a checagem do ramo com Google Agenda conectada
(`if (false && !persistenciaAgendamentoConcluida(...))`), voltando ao comportamento antigo de
seguir como se tivesse dado certo.

```text
npm test
✖ Ponto 1 — falha na gravação remove a aula, avisa e reabre o formulário preenchido (9.0819ms)
ℹ tests 211
ℹ pass 210
ℹ fail 1
```

Mutação revertida; suíte volta a 211/211.

---

## 3. Ponto 2 — Editar compromisso, sem split (`modal-acao-slot.js`, `formEditarCompromisso`)

### Implementação

No começo do handler, junto do `_snapshotEdicao` que já existia, passaram a ser capturados:

- `_idCompromissoEdicao` — o id, para reabrir o modal depois do revert;
- `_snapshotAulasEdicao` — cópia do array `aulas` inteiro (mesmo padrão da 6h: `excecoes` e
  `excecoesDetalhadas` copiadas por valor), porque o revert precisa desfazer também as inserções
  e remoções que os ramos de split fazem no array;
- `_valoresFormularioEdicao` — via `capturarValoresFormularioEdicao()`, o que a Josy submeteu.

A primeira gravação (`compromisso`, `operacao: "atualizar"`) passou a ter o retorno atribuído a
`_resultadoPrimeiraGravacao` e checado com `deveEnviarPatchReposicao`. Em falha: restaura
`aulas` a partir do snapshot, chama `avisarFalhaPersistencia` (toast de erro com
`obterMensagemFalhaPersistencia`) e `reabrirModalEdicaoComValores`, que reabre por
`window.abrirModalAcaoSlot` e reinjeta os valores submetidos — inclusive o escopo de
recorrência, que `abrirModalAcaoSlot` normalmente força para `fromDate`.

Essa primeira checagem é **comum aos três ramos** (sem split, `occurrence` e `fromDate`), como o
prompt pediu — não foi duplicada.

### Sub-decisão registrada

O ramo sem Google Agenda conectada (`else`) também passou a checar o retorno de `salvarDados()`,
pelo mesmo motivo do Ponto 1.

### Prova por mutação

Mutação: neutralizar a checagem da primeira gravação
(`if (false && !deveEnviarPatchReposicao(_resultadoPrimeiraGravacao))`).

```text
npm test
✖ Ponto 2 — edição sem split reverte, avisa e reabre o modal preenchido quando a gravação falha
  AssertionError [ERR_ASSERTION]: o horário anterior precisa voltar
  '10:00' !== '09:00'
✖ Ponto 4 — falha na PRIMEIRA gravação do split occurrence impede a segunda e reverte tudo
  AssertionError [ERR_ASSERTION]: a segunda gravação não pode ser disparada quando a primeira falha
  3 !== 1
ℹ tests 211
ℹ pass 208
ℹ fail 3
```

Mutação revertida; suíte volta a 211/211.

---

## 4. Ponto 3 — Reagendar reposição (`modal-acao-slot.js`, `formReagendarAula`)

### Implementação

O `try/catch` que existia em volta da chamada foi removido e substituído por checagem do
retorno, porque — como a 6i-a apontou — `salvarEventoComGCal` não lança exceção no caminho real
de falha (resolve com `{ ok: false, motivo }`), então aquele `catch` nunca disparava nesse
cenário e o aviso amarelo que ele montava era código morto na prática.

Em falha, o novo caminho:

1. chama `reverterVinculoReposicaoAgendada(repObj.id)` — função nova, que faz `PATCH` no mesmo
   endpoint de reposições devolvendo `status: "pendente"` e `agendamentoReposicaoId: null`;
2. remove `novoCompromisso` de `aulas`;
3. chama `salvar(true)` de novo (persistência de compensação, silenciosa) para que o servidor
   também perca o compromisso removido;
4. lança `Error(obterMensagemFalhaPersistencia(...))`, que o `catch` externo já existente
   converte em toast de erro.

O `aulasParaRepor = aulasParaRepor.filter(...)` foi movido para depois da checagem — antes ele
rodava independentemente do resultado, tirando a reposição da fila mesmo quando a gravação não
tinha se confirmado.

**Sobre "reabrir a tela de reagendamento":** ela nunca chega a fechar nesse caminho.
`window.fecharReagendarAulaModal()` só é chamado depois do bloco de gravação, então em falha o
modal continua aberto com o dia, horário e duração que a Josy escolheu. Não foi preciso escrever
código de reabertura, e escrever um seria pior — reabrir um modal já aberto reexecutaria a
montagem dos selects e poderia perder os valores. Sub-decisão conservadora, registrada aqui.

Os dois passos anteriores (`salvar(true)` e o `PATCH` que marca `agendada`) já eram checados
antes desta rodada e não foram alterados.

### Prova por mutação

Mutação: `if (false && !deveEnviarPatchReposicao(resultadoGCal))`.

```text
npm test
✖ Ponto 3 — falha na gravação do reagendamento devolve a reposição para pendente e remove a aula
  AssertionError [ERR_ASSERTION]: a aula criada precisa sair do array
  + actual - expected
  + {
  +   alunoId: 'aluno-1',
  +   data: '2026-08-31',
  ...
```

Mutação revertida; suíte volta a 211/211.

---

## 5. Pontos 4 e 5 — Splits `occurrence` e `fromDate`

### Correção de ordem de execução

O `if (_novaOcorrenciaSerie) { ... } else if (_novaSerieSplit) { ... }` virou um único
`_alvoSegundaGravacao = _novaOcorrenciaSerie || _novaSerieSplit`, colocado **depois** da checagem
da primeira gravação. Como a checagem termina em `return`, a segunda gravação deixou de rodar
quando a primeira falha.

### Mecanismo de reversão remota — construído nesta etapa

**Não existia mecanismo reaproveitável para desfazer uma gravação que já persistiu.** A 6h só
precisava de reversão local: numa exclusão que falha, nada foi para o servidor, então restaurar
o array `aulas` basta. Nos splits o caso é outro — a primeira gravação já persistiu no Mongo
quando a segunda falha, e restaurar só a memória deixaria servidor e tela divergentes até o
próximo save.

O mecanismo construído aproveita o fato de que `salvarEventoComGCal` persiste o **array `aulas`
inteiro** via `salvarDados` (ele ignora o agendamento recebido no primeiro argumento e apenas
delega para `_persistirDadosComBackend`). Então a compensação é:

1. `aulas.splice(0, aulas.length, ..._snapshotAulasEdicao)` — devolve a memória ao estado
   anterior à edição, o que já remove o item da segunda gravação e desfaz o `EXDATE`/`UNTIL` da
   primeira;
2. `obterCompromissoPorId(_idCompromissoEdicao)` — pega a cópia restaurada;
3. `await window.salvarEventoComGCal(compromissoRestaurado, { operacao: "atualizar", snapshotAnterior: compromisso })`
   — empurra esse estado restaurado para o servidor, desfazendo lá a primeira gravação.

Os dois caminhos de falha estão nomeados no código com comentários explícitos
(`FALHA NA PRIMEIRA GRAVAÇÃO` / `FALHA NA SEGUNDA GRAVAÇÃO`), não colapsados num `catch` único,
como o prompt exigiu.

### Prova por mutação — ordem de execução (obrigatória para 4 e 5)

Mutação: remover o `return` que interrompe o fluxo depois da falha da primeira gravação, para
que a segunda volte a rodar.

```text
npm test
✖ Ponto 4 — falha na PRIMEIRA gravação do split occurrence impede a segunda e reverte tudo
  AssertionError [ERR_ASSERTION]: a segunda gravação não pode ser disparada quando a primeira falha
  3 !== 1
ℹ tests 211
ℹ pass 209
ℹ fail 2
```

(Os dois que falham são o do Ponto 4 e o equivalente do Ponto 5.) Mutação revertida; suíte volta
a 211/211.

### Prova por mutação — gravação de compensação

Mutação: `if (false && _compromissoRestaurado)`, desligando a terceira chamada.

```text
npm test
✖ Ponto 4 — falha na SEGUNDA gravação do split occurrence dispara compensação da primeira
  AssertionError [ERR_ASSERTION]: primeira, segunda e a gravação de compensação
  2 !== 3
ℹ fail 2
```

Mutação revertida; suíte volta a 211/211.

---

## 6. Ponto 6 — Enviar aula avulsa para reposição (`executarEnvioParaReposicao`, ramo `!ehSerie`)

### Implementação parcial

Feito:

- snapshot do array `aulas` (`_snapshotAulasReposicao`), montado só quando `!ehSerie`;
- checagem do retorno de `salvarEventoComGCal(compromisso, { operacao: "excluir", ... })`, e
  também do `salvarDados()` do ramo sem Google Agenda conectada, que antes era chamado sem
  checagem nenhuma;
- no `catch`, restauração do array a partir do snapshot quando `!ehSerie`, com log de rollback
  no mesmo formato que o ramo `ehSerie` já usava. O toast de erro já existia e continua.

### O que NÃO foi feito, e por quê

**Desfazer no servidor a reposição já criada: NÃO EXECUTADO.**

O prompt instruía a "reaproveitar a lógica de rollback remoto que o ramo `ehSerie` desta mesma
função já usa". **Essa lógica não existe.** Por leitura do código:

- o `catch` do ramo `ehSerie` reverte apenas `compromisso.excecoes` em memória
  (`compromisso.excecoes = [...(_snapshot.excecoes || [])]`) e mostra um toast. Não há nenhuma
  chamada de rede de desfazimento ali;
- `backend/src/routes/reposicaoRoutes.js` expõe `GET /`, `POST /`, `GET /:id`, `PATCH /:id` e
  `POST /:id/historico`. **Não existe `DELETE`**;
- o `enum` de `status` em `backend/src/models/Reposicao.js` é
  `['pendente', 'agendada', 'realizada', 'expirada']`. **Não existe estado de cancelamento**, e o
  schema não é `strict: false`, então um status inventado seria rejeitado pelo `runValidators` do
  `findOneAndUpdate`.

Ou seja: não há como anular uma reposição criada com a API que existe hoje. Implementar a decisão
do dono exigiria alterar o backend (novo endpoint `DELETE` ou novo valor de `status`), e
`backend/src/` está fora da lista de arquivos que esta rodada pode tocar.

Consequência prática, para o dono decidir o que fazer: se a gravação falhar no ponto 6, a aula
volta para a agenda **mas a reposição criada continua na fila**, apontando para uma aula que
"voltou". Fica registrado como débito no item `9.27` da spec.

A afirmação do item `9.20` da spec de que "o rollback existe e reverte a criação remota" está
**incorreta** contra o código atual. Não a alterei nesta rodada porque o item `9.20` não está na
lista de alterações permitidas — o registro da divergência fica aqui e no `9.27`.

### Prova por mutação

Mutação: `if (false && !deveEnviarPatchReposicao(resultadoPersistencia))` no ramo com Google
Agenda conectada.

```text
npm test
✖ Ponto 6 — falha na gravação do envio para reposição devolve a aula avulsa à agenda e avisa
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected
    [
  -   'avulsa-p6',
      'avulsa-p6-vizinha'
    ]
```

Mutação revertida; suíte volta a 211/211.

### Teste que ficaria a cargo do mecanismo inexistente

O teste pedido no prompt — *"confirmando que, em caso de falha, a reposição criada no servidor é
desfeita pelo mesmo mecanismo do ramo `ehSerie`"* — **NÃO EXECUTADO**, pelo motivo acima: não há
mecanismo a testar, nem no ramo `ehSerie` nem no `!ehSerie`.

---

## 7. Testes

15 testes novos, todos passando. Suíte foi de **196** para **211**.

### Arquivo novo — `backend/test/gcal-persistencia-criacao-agendamento.test.js` (Ponto 1)

Não existia harness para `modal-agendamento.js`. O novo arquivo carrega via `vm` os scripts
reais na ordem do `index.html` (`reposicao-flow-helpers.js`, `scheduling-flow-state.js`,
`scheduling-serializer.js`, `modal-agendamento.js`), dispara o `DOMContentLoaded` e submete o
formulário real. Só as dependências externas são mockadas (`salvarDados`,
`salvarEventoComGCal`, `mostrarToast`, `gcal`, helpers de data e de conflito). O `document` é um
stub que cria elementos sob demanda.

| Teste | Cobre |
| --- | --- |
| criação com gravação bem-sucedida mantém a aula e não reabre o formulário | sucesso |
| falha na gravação remove a aula, avisa e reabre o formulário preenchido | revert + toast + reabertura com `agendaAluno`, `agendaHoraInicio` e `agendaDuracao` corretos |
| falha na gravação sem Google Agenda conectada também reverte, avisa e reabre | o ramo `else`, com `motivo: 'sessao_expirada'` |

### Arquivo existente — `backend/test/gcal-duplicata-fix.test.js` (Pontos 2 a 6)

Reaproveita `criarHarnessModalAcaoSlot`, como o prompt pediu. Uma mudança no harness:
`salvarDados` default passou de `async () => {}` para `async () => ({ ok: true, motivo: 'sucesso' })`.
Sem isso, os ramos sem Google Agenda conectada — que agora checam o retorno — leriam `undefined`
como falha e reverteriam. O novo default é fiel ao contrato real: `salvarDados` em
`assets/js/storage.js` sempre retorna objeto com `ok`.

| Teste | Cobre |
| --- | --- |
| Ponto 2 — edição sem split com gravação bem-sucedida | sucesso: 1 gravação, sem revert, sem reabertura |
| Ponto 2 — edição sem split reverte, avisa e reabre o modal preenchido | revert do horário, toast de erro, reabertura com os valores submetidos |
| Ponto 4 — split occurrence com as duas gravações bem-sucedidas | sucesso: 2 gravações, `EXDATE` mantido |
| Ponto 4 — falha na PRIMEIRA gravação impede a segunda e reverte tudo | **só 1 gravação**, `EXDATE` desfeito, ocorrência nova fora do array |
| Ponto 4 — falha na SEGUNDA gravação dispara compensação da primeira | **3 gravações**, a terceira `atualizar` com a série já sem `EXDATE` |
| Ponto 5 — split fromDate com as duas gravações bem-sucedidas | sucesso: `recorrenciaDataFim` do corte gravado |
| Ponto 5 — falha na PRIMEIRA gravação impede a segunda e reverte tudo | **só 1 gravação**, `UNTIL` do corte desfeito |
| Ponto 5 — falha na SEGUNDA gravação dispara compensação da primeira | **3 gravações**, a terceira envia a série sem o corte |
| Ponto 3 — reagendamento com gravação bem-sucedida | 1 `PATCH` (`agendada`), aula mantida, fila esvaziada |
| Ponto 3 — falha devolve a reposição para pendente e remove a aula | **2 `PATCH`**, o segundo com `status: 'pendente'` e `agendamentoReposicaoId: null` |
| Ponto 6 — envio de avulsa com gravação bem-sucedida | aula sai da agenda |
| Ponto 6 — falha devolve a aula avulsa à agenda e avisa | aula de volta no array, toast de erro |

Detalhe de harness que custou uma iteração: arrays criados dentro do contexto `vm` têm protótipo
de outro realm, então `assert.deepEqual` (que em `node:assert/strict` é `deepStrictEqual`) falha
comparando `[]` com `[]`. As asserções sobre `excecoes` usam `Array.from(...)`, como os testes
antigos do arquivo já faziam.

---

## 8. Documentação

Em `docs/specs/gcal-sync.md`:

- item **`9.27`** novo (próximo número livre, confirmado por `Select-String -Pattern '^### 9\.'` —
  o maior em uso era `9.26`), com a tabela das seis decisões, a correção de ordem de execução dos
  splits, a explicação da gravação de compensação e o registro do limite do Ponto 6;
- item **`9.23`, nº 6** marcado como fechado, apontando para o `9.27`, com a redação corrigida:
  passa a citar `executarEnvioParaReposicao` explicitamente, imprecisão que a 6i-a tinha
  levantado;
- duas linhas novas na tabela do **`9.24`**: o relatório de diagnóstico da 6i-a (que não estava
  listado) e este relatório.

---

## 9. Portão de saída

```text
npm test
ℹ tests 211
ℹ suites 0
ℹ pass 211
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 13652.7293
(exit code 0)

git status --short
 M assets/js/modal-acao-slot.js
 M assets/js/modal-agendamento.js
 M backend/test/gcal-duplicata-fix.test.js
 M docs/specs/gcal-sync.md
?? backend/test/gcal-persistencia-criacao-agendamento.test.js
?? docs/_reports/2026-09-01-fix-persistencia-silenciosa-criacao-edicao.md

git diff --stat
 assets/js/modal-acao-slot.js            | 266 +++++++++++++++++++----
 assets/js/modal-agendamento.js          |  90 +++++++-
 backend/test/gcal-duplicata-fix.test.js | 362 +++++++++++++++++++++++++++++++-
 docs/specs/gcal-sync.md                 |  ...

git diff --exit-code -- assets/js/google-calendar.js   → 0 (limpo)
git diff --exit-code -- index.html                     → 0 (limpo)
git diff --exit-code -- docs/_diags_llm/               → 0 (limpo)
git diff --exit-code -- docs/contexto-personalapp-para-novas-conversas.md → 0 (limpo)

Select-String -Path 'docs\specs\gcal-sync.md' -Pattern '9\.23'
docs\specs\gcal-sync.md:845:### 9.23 — Débitos remanescentes da etapa 6 — REGISTRO
docs\specs\gcal-sync.md:925:| docs/_reports/2026-09-01-docs-fechamento-etapa-6.md | 9.22 / 9.23 | fechado |
docs\specs\gcal-sync.md:928:| docs/_reports/2026-09-01-diag-persistencia-silenciosa-criacao-edicao.md | 9.23 nº 6 | diagnóstico |
docs\specs\gcal-sync.md:929:| docs/_reports/2026-09-01-fix-persistencia-silenciosa-criacao-edicao.md | 9.27 / 9.23 nº 6 | fechado |
```

### Verificação dos três pontos da 6h

Os três handlers de exclusão corrigidos na 6h (`executarExclusaoInstancia`,
`executarExclusaoSerie`, `executarExclusaoAulaAvulsa`) **não foram alterados**. Confirmado por
conteúdo, não por número de linha: `git diff -U0 -- assets/js/modal-acao-slot.js` produz hunks
começando em `@@ -87,0` e o seguinte só em `@@ -1811`, e as três funções ficam entre as linhas
originais 1284 e 1471 — inteiramente dentro do intervalo sem hunk.

---

## 10. Resumo do que ficou pendente

1. **Reversão remota da reposição no Ponto 6** — exige backend (endpoint `DELETE` ou novo
   `status`), fora do escopo desta rodada. Registrado no `9.27`.
2. **Item `9.20` da spec contém afirmação incorreta** sobre o rollback remoto do ramo `ehSerie`.
   Não corrigido por não estar na lista de alterações permitidas.
3. **Mensagem de toast genérica.** `obterMensagemFalhaPersistencia` devolve "Falha ao salvar
   alterações antes de concluir a reposição." também nos caminhos de criação e edição, onde a
   palavra "reposição" não faz sentido. Foi mantida por instrução explícita de não inventar
   mecanismo novo, e porque é exatamente o que os três pontos da 6h já mostram hoje. Ajustar a
   redação é decisão do dono.
4. **Nada de validação de UI.** Como sempre neste projeto, não há teste de frontend em navegador:
   as reaberturas de modal foram validadas por asserção sobre os valores dos campos no harness,
   não visualmente.
