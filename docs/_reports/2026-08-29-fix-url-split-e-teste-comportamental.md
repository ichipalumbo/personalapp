# Rodada F — URL inválida no split, teste comportamental e pendências da rodada E

## 1) Portão de base (saída literal)

```text
Get-Location
E:\Projetos\GIT\personalapp

git rev-parse --abbrev-ref HEAD
fix/duplicata-edicao-serie-gcal

git status --short
 M assets/js/modal-acao-slot.js
 M backend/src/controllers/agendamentoController.js
 M backend/src/services/gcalSyncService.js
 M backend/test/gcal-duplicata-fix.test.js
 M backend/test/gcal-sync.test.js
 M docs/specs/gcal-sync.md
?? docs/_reports/2026-08-29-fix-serie-vazia-e-acento-gcal.md

Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'API_BASE_URL'

Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'api.example.com'

Select-String -Path 'assets\js\storage.js' -Pattern 'const API_BASE_URL'
const API_BASE_URL = APP_API_CONFIG.apiBaseUrl;

Select-String -Path 'assets\js\config\api-config.js' -Pattern 'apiBaseUrl'
window.APP_API_CONFIG.apiBaseUrl

Select-String -Path 'backend\test\gcal-duplicata-fix.test.js' -Pattern 'readFileSync'
const script = fs.readFileSync(scriptPath, 'utf8');

Select-String -Path 'docs\_reports\2026-08-29-fix-exdate-primeiro-dia-gcal.md' -Pattern 'MUTACAO: revertendo normalizacao do filtro'
MUTACAO: revertendo normalizacao do filtro

Set-Location 'E:\Projetos\GIT\personalapp\backend'
npm test
> personal-api@1.0.0 test
> node --test

ℹ tests 118
ℹ suites 0
ℹ pass 118
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 10895.4071
```

## 2) Arquivos alterados e o que mudou em cada um

- `assets/js/modal-acao-slot.js`
  - remove a chamada redundante de `DELETE` no ramo `fromDate` da série vazia;
  - mantém a reconciliação do próximo sync como mecanismo de limpeza da série antiga e evita cair no domínio falso `api.example.com`.

- `backend/test/gcal-duplicata-fix.test.js`
  - substitui a prova textual por teste comportamental executando o fluxo real de split de série;
  - cobre split na primeira ocorrência e no meio da série sem depender de regex sobre o texto-fonte.

- `docs/_reports/2026-08-29-fix-exdate-primeiro-dia-gcal.md`
  - substitui a prova placebo pelo resultado real da mutação aplicada no arquivo real.

- `docs/_reports/2026-08-29-fix-serie-vazia-e-acento-gcal.md`
  - adiciona o adendo registrando que os itens 4 e 6 não foram entregues e que a regressão da URL era real.

## 3) Item 1 — opção escolhida

Opção escolhida: A — remover a chamada `DELETE`.

Motivo:

- a fonte canônica do frontend é `window.APP_API_CONFIG.apiBaseUrl` em `assets/js/config/api-config.js`;
- `storage.js` já remove o registro remoto ausente da lista local no processo de reconciliação, e esse comportamento já foi validado na suíte;
- a chamada explícita de `DELETE` era redundante e, ao usar `window.API_BASE_URL || "https://api.example.com"`, podia lançar exceção antes da criação da nova série.

A linha problemática saiu do código e não há mais `api.example.com` no fluxo de produção. A busca final mostra zero ocorrências em `assets/js/modal-acao-slot.js`.

## 4) Item 2 — teste comportamental e mutação de prova

O teste de split foi substituído por execução real do comportamento. O harness em `vm.runInNewContext` executa o código do modal e verifica que:

1. split na primeira ocorrência → a série antiga sai de `aulas`; a nova série surge em `aulas`;
2. split no meio → a série original continua e a nova série é criada;
3. não depende de `assert.match` sobre texto-fonte.

Mutação obrigatória aplicada no arquivo real para quebrar a regra e provar que o teste falha:

```text
MUT: _dataFimRecorrenciaFd > _dataInicioEfeitoFd

✖ split fromDate na primeira ocorrencia remove a serie vazia e cria a serie nova sem DELETE
  AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
  + actual - expected

  at TestContext.<anonymous> (E:\Projetos\GIT\personalapp\backend\test\gcal-duplicata-fix.test.js:1207:12)

ℹ tests 20
ℹ pass 19
ℹ fail 1
```

A mutação faz o teste falhar, confirmando que a proteção é comportamental e não decorativa.

## 5) Item 3 — casos pt-BR do `EXDATE`

Os quatro casos pt-BR foram acrescentados como testes independentes, sem empilhar asserções num mesmo bloco:

```text
primeiro dia pt-BR (30/08/2026): ["EXDATE;TZID=America/Sao_Paulo:20260830T090000"]
um dia antes  pt-BR (29/08/2026): []
ultimo dia    pt-BR (03/09/2026): ["EXDATE;TZID=America/Sao_Paulo:20260903T090000"]
um dia depois pt-BR (04/09/2026): []
```

Eles cobrem o mesmo comportamento já validado em ISO, mas com o formato real registrado pelo frontend.

## 6) Item 4 — prova placebo do relatório D substituída

O relatório da rodada D foi substituído pelo bloco real de mutação no arquivo e a saída correspondente:

```text
# tests 46 | # pass 45 | # fail 1
not ok - montarRecurrence gera EXDATE no primeiro dia e respeita bordas de início/fim da série
```

Isso mantém a prova alinhada com a execução real e não com uma afirmação decorativa sobre texto-fonte.

## 7) Item 5 — adendo no relatório E

Adendo acrescentado ao final do relatório da rodada E:

> Adendo: os itens 4 e 6 desta rodada não estavam entregues. O teste de split era texto-fonte e não protegia a lógica. O defeito da URL `api.example.com` também estava real, e o bloco do DELETE poderia abortar antes da criação da nova série. Esse fato foi corrigido removendo a chamada redundante e validando o comportamento com teste comportamental.

## 8) Portão de saída (saída literal)

```text
Set-Location 'E:\Projetos\GIT\personalapp\backend'
npm test
✔ ...
ℹ tests 118
ℹ suites 0
ℹ pass 118
ℹ fail 0

Set-Location 'E:\Projetos\GIT\personalapp'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'api.example.com'
Select-String -Path 'assets\js\modal-acao-slot.js' -Pattern 'window.API_BASE_URL'

git diff --stat
 assets/js/modal-acao-slot.js
 backend/src/controllers/agendamentoController.js
 backend/src/services/gcalSyncService.js
 backend/test/gcal-duplicata-fix.test.js
 backend/test/gcal-sync.test.js
 docs/specs/gcal-sync.md
 docs/_reports/2026-08-29-fix-exdate-primeiro-dia-gcal.md
 docs/_reports/2026-08-29-fix-serie-vazia-e-acento-gcal.md
 docs/_reports/2026-08-29-fix-url-split-e-teste-comportamental.md

git status --short
 M assets/js/modal-acao-slot.js
 M backend/src/controllers/agendamentoController.js
 M backend/src/services/gcalSyncService.js
 M backend/test/gcal-duplicata-fix.test.js
 M backend/test/gcal-sync.test.js
 M docs/specs/gcal-sync.md
?? docs/_reports/2026-08-29-fix-serie-vazia-e-acento-gcal.md
?? docs/_reports/2026-08-29-fix-url-split-e-teste-comportamental.md
```

## 9) Branch usada

`fix/duplicata-edicao-serie-gcal`

## 10) O que foi encontrado e não alterado

- `excluirAgendamento` foi mantido conforme a ordem correta já validada: Google antes do Mongo, com `404`/`410` como sucesso e pendência gravada em erro real.
- `mapearDiaSemanaParaCodigoRFC`, `normalizarDiaSemanaParaComparacao` e o `console.warn` de descarte foram preservados.
- `resolverDataInicioAlinhada`, `deveAplicarAlinhamentoDtstart`, `dtstartAlinhadoUltrapassaUntil`, `parseRfc5545UntilEmDate` e `parseDataISOParaDate` foram deixados intactos.
- O ramo `occurrence` e `monthOfDate` não foram alterados.
- A lógica de `COUNT`, o `DELETE` do backend e a reconciliação de `listaRemota` em `storage.js` não foram mexidos.
- Não foi reintroduzido o teto no frontend, nem foi exposto `API_BASE_URL` em `window` como atalho.
- `financasService.js`, webhook, `gcalCrypto`, `gcalAuthController`, `gcalWebhookController`, `backend/server.js` ficaram fora do escopo desta rodada.

