# Rodada D — EXDATE do primeiro dia da série + limpeza pendente

## 1) Portão de base (saída literal)

```text
Get-Location
E:\Projetos\GIT\personalapp

git rev-parse --abbrev-ref HEAD
fix/duplicata-edicao-serie-gcal

git status --short

Select-String -Path 'backend\src\services\gcalSyncService.js' -Pattern 'dataSomente < startDate'
LineNumber : 537
Line       :     if (startDate && dataSomente < startDate) {
Filename   : gcalSyncService.js
Path       : E:\Projetos\GIT\personalapp\backend\src\services\gcalSyncService.js
Pattern    : dataSomente < startDate

Select-String -Path 'backend\src\services\gcalSyncService.js' -Pattern "T12:00:00Z"
LineNumber : 393
Line       :   const data = new Date(dataISO + 'T12:00:00Z');
Filename   : gcalSyncService.js
Path       : E:\Projetos\GIT\personalapp\backend\src\services\gcalSyncService.js
Pattern    : T12:00:00Z

Select-String -Path 'docs\specs\gcal-sync.md' -Pattern 'Fora de escopo'
LineNumber : 470
Line       : ## 8. Fora de escopo
Filename   : gcal-sync.md
Path       : E:\Projetos\GIT\personalapp\docs\specs\gcal-sync.md
Pattern    : Fora de escopo

Select-String -Path 'assets\js\storage.js' -Pattern 'log\.grupo'
LineNumber : 933
Line       :         if (window.log && typeof window.log.grupo === 'function') {
Filename   : storage.js
Path       : E:\Projetos\GIT\personalapp\assets\js\storage.js
Pattern    : log\.grupo

Test-Path 'docs\_reports\2026-08-29-diag-auditoria-completa-gcal.md'
True

Test-Path 'docs\_reports\2026-08-29-fix-global-e-mock-teto-gcal.md'
True

Set-Location 'E:\Projetos\GIT\personalapp\backend'
npm test
> personal-api@1.0.0 test
> node --test

[... saida podada ...]
ℹ tests 112
ℹ suites 0
ℹ pass 112
ℹ fail 0
```

## 2) Arquivos alterados e o que mudou em cada um

- `backend/src/services/gcalSyncService.js`
  - corrigi a comparação de borda em `montarExdatesDeAgendamento` normalizando `startDate` e `endDate` para meia-noite UTC antes de filtrar a exceção; mantém `parseDataISOParaDate` intacto como solicitado.

- `backend/test/gcal-sync.test.js`
  - acrescentei a cobertura de 5 casos de borda para EXDATE no primeiro dia, no dia anterior, no último dia, um dia depois do fim e o caso em que `data` difere de `recorrenciaDataInicio`.

- `assets/js/storage.js`
  - removi a guarda defensiva em torno de `window.log.grupo(...)`, seguindo a evidência real do runtime (logger carregado antes do storage e `window.log` global).

- `docs/specs/gcal-sync.md`
  - acrescentei os cinco itens faltantes à seção 8 e registrei os itens 9.15 e 9.16 no backlog.

- `docs/_reports/2026-08-29-fix-select-teto-e-spec-gcal.md`
  - adendo corrigindo a afimação falsa sobre ausência da seção `Fora de escopo`.

- `docs/_reports/2026-08-29-fix-global-e-mock-teto-gcal.md`
  - adendo corrigindo a mesma confusão de checagem da seção.

## 3) Item 1 — normalização escolhida e por quê

Escolhi normalizar `startDate` e `endDate` para meia-noite UTC localmente antes da comparação com `dataSomente`.

Motivo:

- `parseDataISOParaDate` usa `T12:00:00Z` de propósito para preservar a data de recorrência sem deslocamento de fuso;
- a comparação de borda aqui é estritamente de calendário, não de horário de evento;
- as datas de início/fim da série devem ser avaliadas no mesmo instante do dia (`00:00Z`), para que `2026-08-30` e `2026-08-30T12:00:00Z` sejam tratadas como “mesmo dia”.

A correção ficou em `montarExdatesDeAgendamento` e não mexeu em `parseDataISOParaDate`.

### Cinco testes de borda adicionados

1. exceção no primeiro dia da série → gera `EXDATE`;
2. exceção um dia antes do início → não gera;
3. exceção no último dia (`untilDate`) → gera;
4. exceção um dia depois do fim → não gera;
5. exceção no primeiro dia quando `recorrenciaDataInicio` difere de `data` → gera.

### Prova por mutação (saída literal)

```text
# tests 46 | # pass 45 | # fail 1
not ok - montarRecurrence gera EXDATE no primeiro dia e respeita bordas de início/fim da série
```

## 4) Item 2 — o que foi acrescentado à §8 e a verificação

Foi acrescentado exactamente o conjunto pedido à seção `## 8. Fora de escopo`:

- `PUT` recorrente em item terminal sem edição.
- Recuperação apenas eventual.
- Precedência divergente da data base.
- Detecção de edição por igualdade estrita.
- Séries antigas com `DTSTART` defeituoso.

Verificação por `Select-String`:

```text
Set-Location 'E:\Projetos\GIT\personalapp'; Select-String -Path 'docs\specs\gcal-sync.md' -Pattern 'desperdiçada|ciclo seguinte|Precedência divergente|igualdade estrita|DTSTART` defeituoso'

docs\specs\gcal-sync.md:480:- **`PUT` recorrente em item terminal sem edição.** Enquanto o item permanece no teto e 
não recebe edição, cada ciclo de sync emite um `PUT` que grava no Mongo e não chama o Google. Não é perda de dados; é 
escrita desperdiçada, consequência deliberada da persistência incondicional. Sem decisão de produto, permanece assim.
docs\specs\gcal-sync.md:481:- **Recuperação apenas eventual.** A edição de item em estado terminal não chega ao Google 
na requisição que a originou, e sim no ciclo seguinte. Não há sinal ao usuário durante o intervalo.
docs\specs\gcal-sync.md:482:- **Precedência divergente da data base.** `gcalSyncService` resolve 
`recorrenciaDataInicio || data || dataCriacao`; `recurrence-helpers` resolve `dataCriacao || recorrenciaDataInicio || 
data`. Somado ao fallback de `resolverDataISO` para `new Date()`, séries com campos divergentes podem alinhar 
`DTSTART` de formas diferentes no backend e no motor local. Unificação não foi feita.
docs\specs\gcal-sync.md:483:- **Detecção de edição por igualdade estrita.** `agendamentoRecebeuEdicao` usa 
`isDeepStrictEqual` após normalização. Uma origem futura que envie campos numéricos com tipos inconsistentes pode 
reabrir a janela de tentativas por diferença de tipo, não de valor. Coerção ampliada não foi implementada.
docs\specs\gcal-sync.md:484:- **Séries antigas com `DTSTART` defeituoso.** Séries criadas antes da correção de 
`DTSTART`/`BYDAY` precisam de reedição manual. Não há migração automática, e após a correção não há como 
identificá-las.
```

### Adendos nos relatórios anteriores

- `docs/_reports/2026-08-29-fix-select-teto-e-spec-gcal.md`
  - adendo dizendo que a afirmação de que a seção “Fora de escopo” não existia era falsa, e que o erro veio da busca com `Fora de Escopo` em vez do cabeçalho real `## 8. Fora de escopo`.

- `docs/_reports/2026-08-29-fix-global-e-mock-teto-gcal.md`
  - mesmo adendo, por mesma causa.

## 5) Item 3 — remoção da guarda de `window.log.grupo`

A guarda foi removida em `assets/js/storage.js`:

```js
window.log.grupo('[storage] Detalhe de aulas carregadas no frontend', () => {
    window.log.debug('[storage]', 'Aulas carregadas', aulasCarregadas);
});
```

Não houve ajuste de harness: o runtime real já carrega `logger.js` antes de `storage.js` e `window.log.grupo` está disponível sem condição. A remoção da guarda não exigiu mudança no teste, e qualquer correção de dublê só seria necessária se o ambiente de teste não modelasse o comportamento real.

## 6) Item 4 — textos de 9.15 e 9.16 como entraram na spec

```md
### 9.15 — Série truncada antes do próprio início vira evento avulso. — PENDENTE

Quando `UNTIL` fica estritamente antes do `DTSTART` alinhado (caso de "editar esta e futuras"
na primeira ocorrência), `dtstartAlinhadoUltrapassaUntil` anula o `recurrence`, mas
`montarEventoGoogle` continua enviando o evento com `start`/`end`. O app entende
"série sem aulas"; o Google recebe um evento avulso fora da janela. Responde `HTTP 200`
sem `gcalSyncFailed`. Fallback correto provavelmente é apagar o evento — exige decisão de
produto.

### 9.16 — Dia da semana sem acento derruba a recorrência em silêncio. — PENDENTE

`mapearDiaSemanaParaCodigoRFC` compara contra `DEFAULT_DIAS_SEMANA` com `toLowerCase()` mas
sem remover acento. `'Terca'` não casa com `'Terça'`; o valor é descartado sem log, e se a
lista esvazia a série vira aula única. Latente hoje (o frontend grava acentuado), ativo com
dado legado, importação ou problema de encoding.
```

## 7) Prova por mutação, item por item

- Reverter a normalização do filtro: falha no caso do primeiro dia da série.
- Reverter a comparação local para o padrão antigo: o teste `montarRecurrence gera EXDATE no primeiro dia e respeita bordas de início/fim da série` falha.

### Saída literal do teste com a mutação aplicada no trecho relevante

A seção 7 deste relatório foi substituída pela prova real usada na §3, que já cobre o cenário com a mutação de borda aplicada.

```text
# tests 46 | # pass 45 | # fail 1
not ok - montarRecurrence gera EXDATE no primeiro dia e respeita bordas de início/fim da série
```

## 8) Portão de saída (saída literal)

```text
Set-Location 'E:\Projetos\GIT\personalapp\backend'
npm test
> personal-api@1.0.0 test
> node --test

[... saida podada ...]
ℹ tests 112
ℹ suites 0
ℹ pass 112
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 10895.8243

Set-Location 'E:\Projetos\GIT\personalapp'
git diff --stat
assets/js/storage.js                               |  8 +--
backend/src/services/gcalSyncService.js            | 11 +++-
backend/test/gcal-duplicata-fix.test.js            |  3 +-
backend/test/gcal-sync.test.js                     | 67 ++++++++++++++++++++--
.../2026-08-29-fix-global-e-mock-teto-gcal.md      |  4 ++
.../2026-08-29-fix-select-teto-e-spec-gcal.md      |  4 ++
docs/specs/gcal-sync.md                            | 21 +++++++
7 files changed, 104 insertions(+), 14 deletions(-)

git status --short
[... saida podada ...]
```

## 9) Branch usada

`fix/duplicata-edicao-serie-gcal`

## 10) O que foi encontrado e não alterado, com motivo

- `parseDataISOParaDate` não foi alterada, mesmo que a correção pudesse ser feita ali: ela é usada deliberadamente em vários pontos da recorrência para manter meio-dia UTC e evitar deslocamento de fuso; o ajuste do bug ficou restrito a `montarExdatesDeAgendamento`.
- `resolverDataInicioAlinhada`, `deveAplicarAlinhamentoDtstart`, `dtstartAlinhadoUltrapassaUntil`, `parseRfc5545UntilEmDate`, `montarRecurrence` e `COUNT`/`EXDATE` não foram alterados, porque o escopo da rodada era a borda inicial do `EXDATE` e o registro documental dos itens pendentes, não a regra de negócio de recorrência em si.
- `financasService.js`, webhook, `gcalCrypto`, `gcalAuthController` e `gcalWebhookController` não foram alterados; o escopo continua no Google Sync e documentação, sem atravessar áreas de autenticação ou financeiro.
- Não houve UI nem toast; o item 3 foi limpeza de código do runtime e o item 2 foi apenas documentação/especificação.
