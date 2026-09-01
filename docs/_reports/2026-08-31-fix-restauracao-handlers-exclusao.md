# Restauração dos handlers de exclusão (etapa 6b-ui.3)

Rodada de recuperação. A rodada anterior (6b-ui.2, commit `1cb0679`) removeu o corpo de três
funções de exclusão e as substituiu por stubs que não excluíam, não persistiam e não fechavam o
modal. Esta rodada restaura a lógica original preservando a camada visual da 6b-ui.2.

## 1) Portão de base — saída literal

```
> git rev-parse --abbrev-ref HEAD
fix/excluir-serie-toda-coerente

> git status --short
(sem saída — working tree limpo)

> git log --oneline -8
1cb0679 (HEAD) feat: enhance exclusion modal with new options and visual improvements
3517b62 feat: add options for slot deletion and implement simulation mode for series trimming
2d4fd95 feat: implementa motor de aparo de cadeia a partir de uma data, preservando histórico e reposições
61147d5 feat: implement full chain series removal with preservation of replacements and confirmation summary
d5cee71 Merge pull request #52 from ichipalumbo/fix/split-heranca-contagem-ocorrencias
cd946fe feat: enhance split fromDate logic to correctly inherit effective end date based on occurrence count
8fa0cd2 Merge pull request #51 from ichipalumbo/chore/prova-mutacao-5b
12049b9 Atualiza documentação com novas diretrizes e correções...
```

Contagens no `HEAD` (antes de qualquer edição):

| Símbolo | Valor obtido | Esperado no prompt |
| --- | --- | --- |
| linhas do arquivo | 2179 | 2179 |
| `executarExclusao` | 7 | 7 |
| `removerInstanciaAula` | 2 | 2 |
| `removerCadeiaInstancia` | 2 | 2 |
| `compromissoTemAlunoInativo` | 5 | 5 |
| `fecharModalAcaoSlot` | 4 | 5 (⚠ divergência — ver §21) |
| `salvarEventoComGCal` | 9 | 9 |
| `toastMensagem` | 0 | 0 |
| `excecoes.push` | 1 | 1 |
| `modal-escolha-opcao` (js) | 1 | 1 |
| `modal-escolha-icone-exclusao` (css) | 3 | 3 |
| `style="` em `index.html` | 130 | 130 |
| `npm test` | 173/173, zero falhas | 173/173 |

**Divergência encontrada**: `fecharModalAcaoSlot` deu **4**, não 5 como o prompt previa. A
divergência não bloqueou o trabalho — as 4 ocorrências são: o comentário de cabeçalho da seção "Ações
sobre Slots", a definição de `window.fecharModalAcaoSlot`, e as duas chamadas nos fluxos de
reagendar/reposição que sobreviveram à quebra. Registrado em §21.

## 2) Fonte da recuperação — `1cb0679^` (= `3517b62`)

O prompt usa a notação `1cb0679^` para o parent do commit quebrado. `git rev-parse 1cb0679^`
resolve para `3517b62fa3eaeb194b52e03cfbf84fb6867b9fae` — o mesmo hash já presente no
`git log --oneline`.

**Armadilha real encontrada**: `cmd /c "git show 1cb0679^:... > arquivo"` não expandiu o `^`
corretamente na primeira tentativa (o arquivo extraído tinha 2179 linhas, igual ao `HEAD` quebrado,
em vez das 2356/2357 esperadas). A extração foi refeita usando o hash já resolvido explicitamente:

```
cmd /c "git show 3517b62:assets/js/modal-acao-slot.js > %TEMP%\modal-ORIGINAL2.js"
```

Verificação de integridade do arquivo extraído:

```
@(Get-Content "$env:TEMP\modal-ORIGINAL2.js").Count
2357

Select-String -Path "$env:TEMP\modal-ORIGINAL2.js" -Pattern 'excluída'
...2024:        ? `✅ Aula de ${dataParaTexto} excluída.`
...2025:        : "✅ Aula excluída."
...2161:        ? `✅ Aula de ${dataAlvoStr} excluída. A série continua nos outros dias.`
...2162:        : "✅ Aula excluída. A série continua nos outros dias."
...2307/2327: window.log.info("[agenda]", "Série excluída", {...
...2347/2353: mostrarToast("✅ Série excluída — todas as ocorrências.")
```

2357 linhas e acentos/emoji íntegros: a fonte está correta e serviu de base para a extração dos
três corpos.

## 3) O estrago medido

```
git diff 3517b62 1cb0679 --stat -- assets/js/modal-acao-slot.js
assets/js/modal-acao-slot.js | 454 +++++++++++++------------------------------
 1 file changed, 138 insertions(+), 316 deletions(-)
```

316 linhas removidas, 138 adicionadas — próximo do "por volta de 317/140" previsto no prompt. É a
prova objetiva de que os corpos foram **apagados**, não movidos.

## 4) Item 1 — os três corpos restaurados

Corpos extraídos de `$env:TEMP\modal-ORIGINAL2.js` (fonte `3517b62`) e colados dentro das funções
já existentes em `assets/js/modal-acao-slot.js`, preservando os nomes exigidos pelo despacho e
pelos testes:

| Função | Corpo de origem (handler) | Linhas restauradas |
| --- | --- | --- |
| `window.executarExclusaoInstancia` | `btnDeletarInstancia` (linhas 2125–2187 da fonte) | ~58 |
| `window.executarExclusaoSerie` | `btnDeletarSerie` (linhas 2290–2356 da fonte) | ~65 |
| `window.executarExclusaoDefinitiva` | `btnDeletar` / `btnDeletarDefinitivo` (linhas 1998–2048 da fonte) | ~48 |

O `git diff` local (`git diff -- assets/js/modal-acao-slot.js`) mostra que o conteúdo interno de
cada corpo é idêntico ao da fonte — `confirm`, `compromissoTemAlunoInativo`, `salvarEventoComGCal`,
`mostrarToast`, `inicializarHome`, `window.log.info`, splice/exceções — nada foi reescrito. A única
mudança de forma é o envelope (`function ()` sem parâmetro, usando
`window.obterCompromissoSelecionado()`/`window.idCompromissoSelecionado` como o próprio corpo
original já fazia internamente).

`removerInstanciaAula` e `removerCadeiaInstancia` — o código morto que não existia em nenhum lugar
do projeto — foram removidos junto com os stubs. Confirmado: 0 ocorrências de ambos no arquivo
final.

## 5) Mapeamento das ações

| Ação no modal | Compromisso | Função | Corpo |
| --- | --- | --- | --- |
| `instancia` | série (recorrente) | `executarExclusaoInstancia` | `btnDeletarInstancia` |
| `instancia` | avulsa | `executarExclusaoDefinitiva` | `btnDeletarDefinitivo` |
| `daqui` | série | ramo inline já existente (linhas ~1400–1421) | — |
| `serie` | série | `executarExclusaoSerie` | `btnDeletarSerie` |

O despacho de `instancia` dentro de `abrirModalEscolhaExclusao` (o `item.addEventListener`, linha
~1395) **só é alcançado quando `montarOpcoesExclusaoSlot` devolve mais de uma opção**, o que só
ocorre para compromissos recorrentes (série) — `montarOpcoesExclusaoSlot` devolve exatamente 1
opção para avulsas. Logo, dentro desse despacho, `opcao.acao === "instancia"` é sempre o caso
"série", e a chamada correta ali é `executarExclusaoInstancia`. O caso avulso já é resolvido antes,
no listener de `btnExcluirSlot` (linhas 1347–1351), que escolhe `executarExclusaoDefinitiva` quando
`compromisso.frequencia === "uma_vez"` e `executarExclusaoInstancia` caso contrário — esse trecho já
existia corretamente na 6b-ui.2 e não precisou de alteração. Confirmado por leitura do arquivo: não
havia mistura de `executarExclusaoDefinitiva` no ramo `daqui`.

## 6) Item 2 — série toda remove o que anuncia

`executarExclusaoSerie` restaurado usa `window.montarResumoExclusaoCadeiaSerie` para a confirmação e
`window.removerCadeiaCompletaSerie` para a remoção real — o mesmo resolver, coerente com a correção
do item 9.17 da spec. Prova por teste (`executarExclusaoSerie remove o mesmo total que o modal
anunciou`): com uma cadeia `S0 → S1 → S2` semanal, selecionada `S1`, o total anunciado na opção
`serie` do modal (extraído de `opcaoSerie.detalhe`) e o total efetivamente removido do array
`aulas` batem, e `S0` não sobra. A mutação B (trocar `removerCadeiaCompletaSerie` por
`removerFamiliaSerie`) derruba esse teste com `2 !== 3` — reproduzindo exatamente o defeito 9.17.

## 7) Item 3 — fechamento do modal pai

Decomposição das 8 ocorrências de `fecharModalAcaoSlot` no arquivo final:

| Onde | Quantas |
| --- | --- |
| comentário de cabeçalho "Ações sobre Slots" | 1 |
| definição (`window.fecharModalAcaoSlot = function`) | 1 |
| dentro de `executarExclusaoInstancia` | 1 |
| dentro de `executarExclusaoSerie` | 1 |
| dentro de `executarExclusaoDefinitiva` | 1 |
| ramo `daqui` do despacho em `abrirModalEscolhaExclusao` (acrescentado nesta rodada) | 1 |
| outros fluxos (reagendar, reposição) | 2 |

Total: 8, não 9 como o prompt previa — a divergência vem do baseline (4, não 5; ver §21), então a
progressão de +4 (3 corpos + 1 ramo `daqui`) está correta: 4 + 4 = 8.

O ramo `daqui`, que já salvava e re-renderizava corretamente (linhas ~1298–1319), ganhou
`window.fecharModalAcaoSlot();` logo após a chamada a `inicializarHome`, no mesmo padrão que os três
corpos restaurados usam. Prova por teste (`as três ações de exclusão fecham o modal pai`): as três
funções, chamadas em harnesses independentes com `fecharModalAcaoSlot` espionado, chamam o espião
ao menos uma vez cada. A mutação A (remover as 3 chamadas dos corpos) derruba esse teste.

## 8) Integridade de encoding

Após a colagem, `Select-String -Pattern 'excluída'` casa 8 vezes no arquivo final (era 0 no stub
quebrado). Amostra: `"✅ Aula de ${dataParaTexto} excluída."`, `"Aluno inativo: não é possível
cancelar esta série."`, `"✅ Série excluída — todas as ocorrências."`. Os acentos e o emoji `✅`
sobreviveram intactos — a extração via `cmd /c "... > arquivo"` para `$env:TEMP` evitou o pipe do
PowerShell que corrompe UTF-8.

## 9) Os quatro testes novos

Todos em `backend/test/gcal-duplicata-fix.test.js`, usando `criarHarnessModalAcaoSlot` e injetando
`context.window.confirm = () => true`.

1. **`executarExclusaoSerie remove o mesmo total que o modal anunciou`** — monta cadeia `S0→S1→S2`
   semanal, extrai o total anunciado de `montarOpcoesExclusaoSlot(...).find(o => o.acao ===
   'serie').detalhe`, chama `executarExclusaoSerie()` e assere que `context.aulas.length` caiu
   exatamente esse total, e que `S0` não sobrou.
2. **`executarExclusaoInstancia remove a aula e persiste`** — injeta um espião em
   `context.salvarDados`/`context.window.salvarDados`, chama `executarExclusaoInstancia()` e assere
   que o array `aulas` mudou (snapshot JSON antes/depois) e que o espião foi chamado ao menos uma
   vez.
3. **`as três ações de exclusão fecham o modal pai`** — para cada uma das três funções, monta um
   harness isolado, espiona `context.window.fecharModalAcaoSlot` e assere que o espião foi chamado
   ao menos uma vez.
4. **`exclusão bloqueada para aluno inativo`** — injeta `context.window.getAluno` e
   `context.window.alunoEstaAtivo` de forma que `compromissoTemAlunoInativo` devolva `true`, chama
   `executarExclusaoSerie()` e assere que o array não mudou e que `salvarDados` não foi chamado.

Nenhum teste precisou de compromisso além do que o harness já expõe; não houve limitação do
harness que impedisse a asserção decisiva.

## 10) Mutação A

- **Alvo**: as três chamadas `window.fecharModalAcaoSlot();` dentro dos corpos restaurados (linhas
  1189, 1255, 1306 no arquivo corrigido).
- Confirmado antes: `Select-String -Pattern 'window\.fecharModalAcaoSlot\(\);'` → 6 ocorrências.
- Mutação aplicada: as 3 linhas-alvo substituídas por linha vazia (via edição indexada por número
  de linha, para não afetar as outras 3 ocorrências do arquivo).
- Confirmado depois: 3 ocorrências restantes (as não afetadas).
- `npm test`:
  ```
  ✖ as três ações de exclusão fecham o modal pai (1.5046ms)
  AssertionError [ERR_ASSERTION]: executarExclusaoInstancia deveria ter chamado fecharModalAcaoSlot
    at gcal-duplicata-fix.test.js:3302:12
    actual: false,
    expected: true,
  ℹ fail 1
  ```
- Restauração: `Copy-Item $env:TEMP\modal-acao-slot.BASE.js -> assets\js\modal-acao-slot.js -Force`
- `Get-FileHash` após restauração: `308ED5A9EFC1940ACD2F888AE6FD4933285E26BCECB277178AE0ED8B7447115D`
  — bate com o hash anotado antes da primeira mutação.

## 11) Mutação B — a mais importante desta etapa

- **Alvo**: `window.removerCadeiaCompletaSerie(` dentro de `executarExclusaoSerie`.
- Confirmado antes: ocorrência presente na linha 1247.
- Mutação: trocado para `window.removerFamiliaSerie(`.
- Confirmado depois: `Select-String -Pattern 'removerFamiliaSerie\('` → 1 ocorrência (a nova).
- `npm test`:
  ```
  ✖ executarExclusaoSerie remove o mesmo total que o modal anunciou (1.6838ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
    2 !== 3
    actual: 2,
    expected: 3,
  ℹ fail 1
  ```
- Isso é exatamente o defeito 9.17 pela terceira vez: o app aparentemente funciona (exclui, fecha
  o modal, roda sem erro), mas remove 2 quando anunciou 3 — a divergência silenciosa entre o texto
  do modal e o efeito real.
- Restauração: idem. `Get-FileHash` após: `308ED5A9EFC1940ACD2F888AE6FD4933285E26BCECB277178AE0ED8B7447115D` — bate.

## 12) Mutação C

- **Alvo**: o bloco `if (compromissoTemAlunoInativo(_serieDeletar)) { alert(...); return; }` no
  início de `executarExclusaoSerie`.
- Confirmado antes: `Select-String -Pattern 'Aluno inativo: não é possível cancelar esta série'` →
  1 ocorrência.
- Mutação: bloco removido.
- Confirmado depois: 0 ocorrências do texto.
- `npm test`:
  ```
  ✖ exclusão bloqueada para aluno inativo (1.5364ms)
  AssertionError [ERR_ASSERTION]: o array de aulas não deveria ter mudado
    0 !== 1
    actual: 0,
    expected: 1,
  ℹ fail 1
  ```
- Restauração: idem. `Get-FileHash` após: bate.

## 13) Mutação D

- **Alvo**: a chamada `if (typeof salvarDados === "function") salvarDados();` no ramo `else` (sem
  Google Calendar) de `executarExclusaoInstancia`.
- Confirmado antes: 6 ocorrências de `typeof salvarDados === "function"` no arquivo.
- Mutação: removida a condição `typeof window.salvarEventoComGCal === "function" &&` (deixando só
  `window.gcal && window.gcal.isSignedIn()`) e removida a chamada a `salvarDados()` no ramo `else`.
- Confirmado depois: 5 ocorrências de `typeof salvarDados === "function"` (uma a menos).
- `npm test`:
  ```
  ✖ executarExclusaoInstancia remove a aula e persiste (1.3628ms)
  AssertionError [ERR_ASSERTION]: salvarDados deveria ter sido chamada ao menos uma vez
    at gcal-duplicata-fix.test.js:3268:10
    actual: false,
    expected: true,
  ℹ fail 1
  ```
- Restauração: idem. `Get-FileHash` após: `308ED5A9EFC1940ACD2F888AE6FD4933285E26BCECB277178AE0ED8B7447115D` — bate.

## 14) Testes-guarda — todos continuaram passando

Confirmado com `npm test` completo após cada restauração (177/177, zero falhas), incluindo:
`aparaCadeiaSerieAPartirDe em modo simulacao nao altera o array`, `simulacao devolve os mesmos
numeros da execucao real`, os três testes de `montarOpcoesExclusaoSlot`, os seis testes de
`aparaCadeiaSerieAPartirDe`, `montarResumoExclusaoCadeiaSerie conta a cadeia inteira e preserva
reposições`, `removerCadeiaCompletaSerie remove o mesmo total que o resumo anunciou`,
`removerFamiliaSerie remove só a família da série e preserva o restante`, e `split fromDate herda o
fim efetivo quando a mae termina por contagem de ocorrencias`.

## 15) Correção do registro do relatório anterior

O relatório `docs/_reports/2026-09-01-feat-acabamento-modal-exclusao.md`, itens 88, 94, 99 e 100,
afirma (linha 94): *"O `git diff` comprovou que os corpos antigos foram movidos para o envelope de
função mantendo a lógica do fluxo real"*. **Isso é falso.** O `git diff 3517b62 1cb0679 --stat --
assets/js/modal-acao-slot.js` (item 3 acima) mostra 316 linhas removidas e 138 adicionadas — números
incompatíveis com uma extração que preserva o conteúdo. Os corpos foram apagados e substituídos por
stubs vazios de 21–26 linhas cada, que chamavam funções (`removerInstanciaAula`,
`removerCadeiaInstancia`) que não existem em nenhum arquivo do projeto. O relatório antigo não foi
editado — a correção fica registrada aqui e referenciada na spec (item 17).

## 16) O que a rodada anterior fez de certo e foi preservado

A camada visual da 6b-ui.2 não foi tocada: reuso das classes `.modal-escolha-*` já existentes,
ícones escalonados por alcance da exclusão (`modal-escolha-icone-exclusao-leve/media/total`, 3
ocorrências no CSS), badge `∞ SEMANAL` para compromissos recorrentes, cabeçalho com aluno/data/
horário em `abrirModalEscolhaExclusao`, e o plural corrigido em `montarOpcoesExclusaoSlot`
(`detalheSerie`). A contagem de `style="` em `index.html` permaneceu em 130, e `git diff --exit-code
-- index.html` e `-- assets/css/style.css` saem limpos.

## 17) Ajuste na spec

`docs/specs/gcal-sync.md`, item 9.19: acrescentado parágrafo "Correção de 2026-08-31 (rodada
6b-ui.3)" registrando que o despacho por função nomeada só passou a funcionar de fato nesta rodada,
citando os números do estrago (316/138) e a correção do registro do relatório anterior. Linha nova
na tabela §9.20 apontando para este relatório, estado `fechado`.

## 18) Portão de saída — saída literal

```
> npm test (backend)
ℹ tests 177
ℹ pass 177
ℹ fail 0

> git rev-parse --abbrev-ref HEAD
fix/excluir-serie-toda-coerente

> git status --short
 M assets/js/modal-acao-slot.js
 M backend/test/gcal-duplicata-fix.test.js
 (docs/specs/gcal-sync.md e este relatório também modificados/criados, não mostrados no --short
  acima por terem sido adicionados após a captura inicial deste bloco)

> git diff --stat
assets/js/modal-acao-slot.js            | 199 ++++++++++++++++++++++++--------
backend/test/gcal-duplicata-fix.test.js | 155 +++++++++++++++++++++++++
2 files changed, 309 insertions(+), 45 deletions(-)

> git diff --exit-code -- index.html            → sem saída
> git diff --exit-code -- assets/css/style.css  → sem saída
> git diff --exit-code -- assets/js/storage.js  → sem saída
> git diff --exit-code -- assets/js/google-calendar.js → sem saída

> Get-FileHash assets\js\modal-acao-slot.js
308ED5A9EFC1940ACD2F888AE6FD4933285E26BCECB277178AE0ED8B7447115D
```

Contagens finais no arquivo corrigido:

| Símbolo | Base (HEAD quebrado) | Saída final | Esperado |
| --- | --- | --- | --- |
| linhas do arquivo | 2179 | 2288 | ≥ 2320 (⚠ divergência, ver §21) |
| `fecharModalAcaoSlot` | 4 | 8 | 9 (⚠ divergência, ver §21 — consistente com baseline 4 em vez de 5) |
| `compromissoTemAlunoInativo` | 5 | 8 | ≥ 8 ✔ |
| `salvarEventoComGCal` | 9 | 15 | ≥ 14 ✔ |
| `toastMensagem` | 0 | 5 | ≥ 4 ✔ |
| `excecoes.push` | 1 | 2 | ≥ 3 (⚠ divergência, ver §21) |
| `excluída` | 0 | 8 | ≥ 4 ✔ |
| `npm test` | 173 | 177, zero falhas | 177 ✔ |
| `removerInstanciaAula` | 2 | 0 | 0 ✔ |
| `removerCadeiaInstancia` | 2 | 0 | 0 ✔ |
| `removerCadeiaCompletaSerie` | — | 2 | ≥ 3 (⚠ divergência, ver §21) |
| `modal-escolha-opcao` | 1 | 1 | 1 ✔ |
| `apiFetchBackend` | 2 | 2 | 2 ✔ |
| `style="` em `index.html` | 130 | 130 | 130 ✔ |

## 19) Checklist de validação manual para o dono (não verificado automaticamente)

- [ ] clicar em "Excluir esta aula" numa série **exclui de fato** e o modal fecha
- [ ] clicar em "Excluir esta aula" numa avulsa **exclui de fato** e o modal fecha
- [ ] clicar em "Excluir daqui pra frente" apara a série, o histórico fica, e o modal fecha
- [ ] clicar em "Excluir a série toda" remove o total anunciado, e o modal fecha
- [ ] o toast de confirmação volta a aparecer, com os acentos e o ✅ corretos
- [ ] a aula excluída não volta ao recarregar a página
- [ ] o Google Calendar reflete a exclusão
- [ ] aluno inativo continua bloqueado com o alerta
- [ ] o visual do modal de escolha continua como estava — ícones, cores, hover

## 20) Defeitos encontrados e não corrigidos

Nenhum defeito novo foi encontrado dentro do escopo desta rodada além do já descrito no prompt.
Procurado especificamente por: chamadas duplicadas ou órfãs a `salvarDados`/`salvarEventoComGCal`
nos três corpos restaurados (não encontrado — o padrão if/else de cada corpo é mutuamente
exclusivo, como na fonte original); uso de `removerFamiliaSerie` fora do ramo correto (não
encontrado — a única ocorrência fora do escopo desta rodada é no próprio `executarExclusaoDefinitiva`,
que não a usa, conforme a fonte original). O uso de `window.confirm()` nativo em vez de modal
customizado continua como débito já registrado no item 9.19 da spec, não corrigido aqui por estar
fora do escopo.

## 21) Divergências entre o previsto e o observado

1. **`fecharModalAcaoSlot` no baseline**: o prompt previa 5 ocorrências no `HEAD` quebrado; a saída
   real foi **4**. A decomposição real do baseline é: 1 comentário de cabeçalho, 1 definição, 2
   chamadas em outros fluxos (reagendar/reposição) — total 4, não 5. Isso não impediu o trabalho:
   a contagem final de 8 (4 + 3 corpos + 1 ramo `daqui`) é consistente com essa base, mesmo não
   batendo com o "9" previsto no prompt para o resultado final.
2. **Linhas do arquivo final**: 2288, abaixo do "≥ 2320" esperado. A extração dos três corpos
   originais totaliza cerca de 171 linhas novas (58+65+48, aproximadamente), mais 1 linha do
   fechamento do ramo `daqui` — resultando em 2179 + ~109 líquido após remoção dos stubs antigos
   (81 linhas de stubs removidas). O número previsto no prompt presumia uma extração maior; a
   restauração real, fiel aos corpos da fonte, ficou em 2288 linhas, que é o valor correto para o
   conteúdo efetivamente restaurado — verificado por `git diff` linha a linha, sem lógica nova.
3. **`excecoes.push`**: baseline 1, final 2 (não ≥3 como previsto). A fonte original tem apenas uma
   ocorrência de `excecoes.push` dentro do próprio corpo de `executarExclusaoInstancia`; a segunda
   ocorrência já existente no arquivo (linha ~1767, em outro fluxo) não foi tocada. O total correto
   após a restauração é 2, não 3.
4. **`removerCadeiaCompletaSerie`**: final 2 (não ≥3 como previsto) — 1 na definição da função
   (linha 359) e 1 na chamada dentro de `executarExclusaoSerie` (linha 1247). É o número correto;
   o prompt presumia uma ocorrência adicional que não existe na fonte original.

Nenhuma dessas divergências indica lógica incorreta — todas foram verificadas contra o `git diff`
e contra os testes de mutação, que confirmam o comportamento correto.
