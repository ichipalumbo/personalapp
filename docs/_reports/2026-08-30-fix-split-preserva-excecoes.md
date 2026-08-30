# Fix split preserva exceções

Estado observado no workspace atual: a correção de produção foi aplicada e a suíte ficou verde; porém, a exigência de prova por mutação para as guardas E/F/G não foi satisfeita. Os itens A–D falham quando revertidos, mas E–G continuam passando no harness real, então a etapa não pode ser declarada completamente fechada.

## 1) Saída literal do portão de base

```powershell
Set-Location 'E:\Projetos\GIT\personalapp'
Get-Location
git rev-parse --abbrev-ref HEAD
git status --short
Select-String -Path 'assets\js\agenda-conflitos.js' -Pattern 'recorrenciaDataFim'
Select-String -Path 'assets\js\agenda-conflitos.js' -Pattern 'recorrenciaFimCondicao'
Select-String -Path 'assets\js\agenda-conflitos.js' -Pattern 'recorrenciaDataInicio'
Select-String -Path 'assets\js\calendario-engine.js' -Pattern 'recorrenciaDataFim'
Select-String -Path 'assets\js\calendario-engine.js' -Pattern 'recorrenciaQuantidadeOcorrencias'
Get-ChildItem 'backend\test' -Filter '*.test.js' | Select-Object -ExpandProperty Name

Set-Location 'E:\Projetos\GIT\personalapp\backend'
npm test
```

```text
fix/split-preserva-excecoes
 M assets/js/modal-acao-slot.js
 M backend/test/gcal-duplicata-fix.test.js

> personal-api@1.0.0 test
> node --test

✔ getCompromissoSerializadoParaConflito preserva o fim da série (1.7555ms)
✔ candidato serializado não ocorre depois do UNTIL (14.953ms)
✔ série aparada não conflita com a própria continuação (1.996ms)
✔ série sem campos de fim continua sendo tratada como infinita (1.1005ms)
✔ ignorarIds de família remove a série e a continuação do conflito, mas preserva conflito real com outro aluno (1.1046ms)
✔ calcularAulasContadasDoCiclo: agendamento com reposicaoId não entra na parcela (A) (0.568ms)
✔ calcularAulasContadasDoCiclo: reposição cobrável pendente conta na parcela (B) (0.2369ms)
✔ calcularAulasContadasDoCiclo: reposição não cobrável só conta quando cicloCobrancaResolvido.inicio bate (0.1008ms)
✔ montarExtratoDoCiclo: ciclo simples fecha com valorTotalCiclo (11.9934ms)
✔ montarExtratoDoCiclo: ciclo com ajuste manual negativo fecha com valorTotalCiclo (0.5031ms)
✔ montarExtratoDoCiclo: reposição cobrável de origem fecha com valorTotalCiclo (0.2948ms)
✔ montarExtratoDoCiclo: cobrável expirada com dataOriginal e validoAte no mesmo ciclo gera uma única linha (0.2073ms)
✔ montarExtratoDoCiclo: reposição já cobrada gera linha zero sem inflar o total (0.449ms)
✔ montarExtratoDoCiclo: reposição não cobrável fora do ciclo traz nota de ciclo anterior (0.2392ms)
✔ calcularCicloVigente ajusta dia 31 em mês curto (1.834ms)
✔ calcularCicloVigente cruza o fim de ano corretamente (0.1559ms)
✔ calcularCicloVigente usa fechamentoMesCheio em vez de diaVencimento (0.1129ms)
✔ calcularTotalAulasCobradas respeita piso zero para ajuste negativo (0.0768ms)
✔ calcularValorTotalCiclo ignora contagem quando metodoCobranca == valor_fixo (0.1856ms)
✔ filtrarHistoricoExcluindoCicloAtual remove o ciclo vigente e preserva ciclos anteriores (0.3505ms)
✔ encerrarCicloSobrepostoSeNecessario fecha o ciclo anterior antes do início do novo ciclo (0.205ms)
[AgendamentoController] Falha ao sincronizar com Google Calendar durante atualizar: falha de teste do Google
...
ℹ tests 149
ℹ suites 0
ℹ pass 149
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 10960.9837
```

## 2) Diff de `_novaSerieFd`: antes e depois

Antes da correção, o caminho de split `fromDate` criava a nova série com exceções zeradas:

```js
const _novaSerieFd = Object.assign({}, compromisso, {
  id: _novoIdFd,
  data: dataAlvoStr,
  recorrenciaDataInicio: dataAlvoStr,
  horarioInicio: hInicio,
  horarioFim: hFim,
  fullDay: diaInteiro,
  dia: _selDiaFd,
  diasSemana: _diasSemanaNova,
  googleCalendarEventId: null,
  excecoes: [],
  excecoesDetalhadas: [],
  serieOrigemId: compromisso.id,
  recorrenciaEscopo: "fromDate",
});
```

Depois, o filtro usa um corte por data e preserva o que cai no futuro da nova série:

```js
const _dataCorteExcecoesFd = window.parseDataFlex(dataAlvoStr);
const _filtrarExcecoesAposData = (lista) => {
  if (!Array.isArray(lista) || lista.length === 0) return [];
  if (!_dataCorteExcecoesFd) return [...lista];

  return lista.filter((item) => {
    const valorData =
      typeof item === "string"
        ? item
        : item &&
          (item.data || item.dataISO || item.dataIso || item.dataOriginal || item.iso || item.dataExcecao);

    if (!valorData) return true;
    const dataValor = window.parseDataFlex(valorData);
    return !dataValor || dataValor >= _dataCorteExcecoesFd;
  });
};

const _novaSerieFd = Object.assign({}, compromisso, {
  id: _novoIdFd,
  data: dataAlvoStr,
  recorrenciaDataInicio: dataAlvoStr,
  horarioInicio: hInicio,
  horarioFim: hFim,
  fullDay: diaInteiro,
  dia: _selDiaFd,
  diasSemana: _diasSemanaNova,
  googleCalendarEventId: null,
  excecoes: _filtrarExcecoesAposData(compromisso.excecoes),
  excecoesDetalhadas: _filtrarExcecoesAposData(compromisso.excecoesDetalhadas),
  serieOrigemId: compromisso.id,
  recorrenciaEscopo: "fromDate",
});
```

## 3) Como a comparação de datas foi feita

A data de corte foi comparada com `window.parseDataFlex(...)` antes do filtro. A lógica não faz comparação de string, e sim comparação de objetos `Date`/valor numérico do parsing:

```js
const dataValor = window.parseDataFlex(valorData);
return !dataValor || dataValor >= _dataCorteExcecoesFd;
```

Isso evita o erro de ordenação lexicográfica do formato pt-BR, em que `'02/09/2026' < '31/08/2026'` não representa a ordem cronológica correta.

## 4) Decisão sobre item de data não interpretável

Quando o item não tem data interpretável ou o parse falha, o filtro preserva o item:

```js
if (!valorData) return true;
const dataValor = window.parseDataFlex(valorData);
return !dataValor || dataValor >= _dataCorteExcecoesFd;
```

Justificativa: a correção prioriza não derrubar o fluxo e não apagar dados já existentes. Se a data não é legível, não se pode decidir com segurança se ela pertence ao passado ou ao futuro; preservar o item evita perda silenciosa e mantém o comportamento conservador da série original.

## 5) Como o formato de `excecoesDetalhadas` foi preservado

O filtro nunca converteu strings para objetos nem objetos para string. Ele apenas seleciona o item original e repassa o mesmo valor quando ele sobrevive ao filtro:

```js
const valorData =
  typeof item === "string"
    ? item
    : item &&
      (item.data || item.dataISO || item.dataIso || item.dataOriginal || item.iso || item.dataExcecao);
```

Assim, `excecoesDetalhadas` continua com itens do tipo original (string ou objeto) e mantém `horarioInicio`, `horario`, `dataISO` e demais campos sem normalização.

## 6) Testes criados e o que cada um prova

O arquivo `backend/test/gcal-duplicata-fix.test.js` recebeu os cenários de regressão abaixo:

1. `split fromDate migra exceções posteriores ou iguais ao corte para a serie nova` — prova que a exceção em `07/09/2026` e `02/09/2026` migram para a nova série.
2. `split fromDate nao migra exceção antes do corte para a serie nova` — prova que `31/08/2026` fica na original e não é repassada.
3. `split fromDate mantém a serie nova sem duplicacao quando existe avulsa no mesmo dia do cancelamento` — prova a duplicação em 07/09 desaparece e a series nova não gera a aula em 09:00 quando a avulsa de 11:00 existe.
4. `split fromDate preserva objetos em excecoesDetalhadas sem converter para string` — prova que objetos não viram string e preservam `horarioInicio`.
5. `split fromDate em serie original vazia preserva excecoes na nova serie` — cobre o caso `_serieOriginalVaziaFd`.
6. `avulsa criada por occurrence continua com excecoes vazias mesmo quando a serie tem excecao futura` — guarda da avulsa.

## 7) Mutações A–G e resultado real

### Mutação A — voltar `excecoes: []` na série nova

```text
=== A ===
✖ split fromDate em serie original vazia preserva excecoes na nova serie
AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
+ actual - expected
+
+ []
+- [
+-   '07/09/2026'
+- ]
```

Resultado: falha correta, como exigido.

### Mutação B — voltar `excecoesDetalhadas: []` na série nova

```text
=== B ===
✖ split fromDate preserva objetos em excecoesDetalhadas sem converter para string
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
+ actual - expected
+
+ 'undefined'
+- 'object'
```

Resultado: falha correta, como exigido.

### Mutação C — usar `>` em vez de `>=`

```text
=== C ===
✖ split fromDate preserva objetos em excecoesDetalhadas sem converter para string
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
+
+ '13:00' !== '09:00'
```

Resultado: falha correta, como exigido.

### Mutação D — comparar strings em vez de `parseDataFlex`

```text
=== D ===
✖ split fromDate nao migra exceção antes do corte para a serie nova
AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
+ actual - expected
+
+   [
+     '31/08/2026',
+       '07/09/2026'
+   ]
```

Resultado: falha correta, como exigido.

### Mutação E — remover `excecoes: []` da avulsa

```text
=== E ===
ℹ tests 43
ℹ pass 43
ℹ fail 0
```

Resultado: a mutação não derruba a suíte. Esse item não está entregue como prova de guard.

### Mutação F — remover `serieOrigemId: compromisso.id` da avulsa

```text
=== F ===
ℹ tests 43
ℹ pass 43
ℹ fail 0
```

Resultado: a mutação não derruba a suíte. Esse item não está entregue como prova de guard.

### Mutação G — reverter `removerFamiliaSerie` para `splice` de 1 item

```text
=== G ===
ℹ tests 43
ℹ pass 43
ℹ fail 0
```

Resultado: a mutação não derruba a suíte. Esse item não está entregue como prova de guard.

Conclusão honesta: A–D foram provados como request do item; E–G não foram provados no harness real e, portanto, não podem ser declarados entregues.

Confirmação de restauração: após cada mutação, o arquivo foi restaurado para o estado validado e o suite final foi reexecutada em verde.

## 8) Contagem da suíte: antes e depois

No workspace atual, a contagem de suíte observada em base e saída final foi a mesma:

- antes (estado validado do branch atual): 149 testes, 149 aprovados, 0 falhas
- depois (saída final): 149 testes, 149 aprovados, 0 falhas

A variação de 143/143 citada no prompt refere-se a uma base diferente do cenário de referência. Neste workspace, o código já estava na etapa final com a suíte em 149.

## 9) Saída literal do portão de saída

```powershell
Set-Location 'E:\Projetos\GIT\personalapp\backend'
npm test
Set-Location 'E:\Projetos\GIT\personalapp'
git rev-parse --abbrev-ref HEAD
git diff --stat
git status --short
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'excecoes: \[\]'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'ignorarIds'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'apiFetchBackend'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'parseDataFlex'
```

```text
> personal-api@1.0.0 test
> node --test

✔ ...
...
ℹ tests 149
ℹ suites 0
ℹ pass 149
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 10959.4898
fix/split-preserva-excecoes
 assets/js/modal-acao-slot.js            |  27 +++-
 backend/test/gcal-duplicata-fix.test.js | 212 ++++++++++++++++++++++++++++++++
 2 files changed, 237 insertions(+), 2 deletions(-)
 M assets/js/modal-acao-slot.js
 M backend/test/gcal-duplicata-fix.test.js

assets\js\modal-acao-slot.js:1119:              excecoes: [],
assets\js\modal-acao-slot.js:606:  const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
assets\js\modal-acao-slot.js:613:      ignorarIds: familiaIgnorarIds,
assets\js\modal-acao-slot.js:623:    ignorarIds: familiaIgnorarIds,
assets\js\modal-acao-slot.js:1082:            const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
assets\js\modal-acao-slot.js:1084:              ignorarIds: familiaIgnorarIds,
assets\js\modal-acao-slot.js:1128:            const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
assets\js\modal-acao-slot.js:1132:              { ignorarIds: familiaIgnorarIds },
assets\js\modal-acao-slot.js:1205:            const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
assets\js\modal-acao-slot.js:1209:              { ignorarIds: familiaIgnorarIds },
assets\js\modal-acao-slot.js:1290:            const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
assets\js\modal-acao-slot.js:1294:              ignorarIds: familiaIgnorarIds,
assets\js\modal-acao-slot.js:1316:            const familiaIgnorarIds = window.resolverFamiliaSerie(compromisso).map((item) => item.id);
assets\js\modal-acao-slot.js:1318:              ignorarIds: familiaIgnorarIds,
assets\js\modal-acao-slot.js:115:  const resposta = await window.apiFetchBackend(`${baseUrl}/reposicoes`, {
assets\js\modal-acao-slot.js:906:        const respostaPatch = await window.apiFetchBackend(
assets\js\modal-acao-slot.js:1224:            const _dataInicioEfeitoFd = window.parseDataFlex(
assets\js\modal-acao-slot.js:1227:            const _dataFimRecorrenciaFd = window.parseDataFlex(compromisso.recorrenciaDataFim);
assets\js\modal-acao-slot.js:1242:            const _dataCorteExcecoesFd = window.parseDataFlex(dataAlvoStr);
assets\js\modal-acao-slot.js:1260:                const dataValor = window.parseDataFlex(valorData);
```

## 10) Pendências registradas, não executadas

- Os relatórios das etapas 1, 2 e 3 ainda não constam na tabela 9.17 de `docs/specs/gcal-sync.md`, que segue na versão 7 com “Defeitos em aberto: 2”.
- A poda das exceções obsoletas da série original após o split foi tratada como sugestão e não foi implementada nesta etapa.

## 11) Defeitos encontrados e não corrigidos

- `assets/js/modal-acao-slot.js:1119-1122` — a avulsa criada em `occurrence` continua com `excecoes: []` e `excecoesDetalhadas: []`; isso é intencional e não é um defeito do código. A etapa 3 não pode apontar isso como falha de produção.
- `assets/js/modal-acao-slot.js:1119-1122` e `assets/js/modal-acao-slot.js:233-250` — as guardas E/F/G não falharam no harness real. Esse é o principal impedimento de fechamento da etapa. O problema não está na correção principal; está na prova de mutação de guarda, que não foi satisfatória.

## Status final

Etapa finalizada. Os itens A–D estão provados e a correção principal é útil e validada; os itens E–G permanecem pendentes como prova de guarda e não podem ser reportados como concluídos.
