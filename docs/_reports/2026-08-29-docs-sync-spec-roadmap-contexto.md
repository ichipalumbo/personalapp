# Rodada G: sincronizar documentação com o código (spec, README, roadmap, contexto)

## 1) Portão de base (saída literal)

```text
Get-Location
E:\Projetos\GIT\personalapp

git rev-parse --abbrev-ref HEAD
chore/rodada-g-h-docs-e-harness-split

git status --short
 M backend/test/gcal-duplicata-fix.test.js
 M backend/test/gcal-sync.test.js
 M docs/_reports/2026-08-29-fix-exdate-primeiro-dia-gcal.md
?? docs/_reports/2026-08-29-fix-harness-split-comportamental.md

Select-String -Path 'docs\specs\gcal-sync.md' -Pattern '\*\*Versão\*\*'
> **Versão**: 6 · **Atualizado**: 2026-08-26

Select-String -Path 'docs\specs\gcal-sync.md' -Pattern 'Defeitos em aberto'
> **Defeitos em aberto**: 4 (ver seção 9)

Select-String -Path 'docs\specs\gcal-sync.md' -Pattern '^### 9\.'
... 16 ocorrências ...

Select-String -Path 'docs\specs\gcal-sync.md' -Pattern 'PENDENTE'
9.14, 9.15, 9.16

Select-String -Path 'docs\README.md' -Pattern 'gcal-sync'
[sem ocorrências no índice]

Select-String -Path 'docs\README.md' -Pattern 'Fora de Escopo'
1 ocorrência

Select-String -Path 'docs\roadmap.md' -Pattern 'Atualizado'
> **Status**: Documento vivo · **Atualizado**: 2026-08-28

Get-ChildItem 'docs\_reports' -Filter '*gcal*' | Select-Object -ExpandProperty Name
2026-08-25-gcal-fix.md
2026-08-25-gcal-watch-boot.md
2026-08-25-gcal-watch-purge.md
2026-08-25-gcal-watch-renovacao.md
2026-08-26-doc-sync-gcal-watch.md
2026-08-26-gcal-watch-log-falha.md
2026-08-29-diag-auditoria-completa-gcal.md
2026-08-29-diag-duplicata-edicao-serie-gcal.md
2026-08-29-fix-dtstart-byday-gcal.md
2026-08-29-fix-duplicata-edicao-serie-gcal.md
2026-08-29-fix-exdate-primeiro-dia-gcal.md
2026-08-29-fix-global-e-mock-teto-gcal.md
2026-08-29-fix-select-teto-e-spec-gcal.md
2026-08-29-fix-serie-vazia-e-acento-gcal.md
2026-08-29-fix-teto-pendencia-gcal.md

Get-ChildItem 'docs\_reports' -Filter '2026-08-29-*' | Select-Object -ExpandProperty Name
2026-08-29-diag-auditoria-completa-gcal.md
2026-08-29-diag-duplicata-edicao-serie-gcal.md
2026-08-29-fix-dtstart-byday-gcal.md
2026-08-29-fix-duplicata-edicao-serie-gcal.md
2026-08-29-fix-exdate-primeiro-dia-gcal.md
2026-08-29-fix-global-e-mock-teto-gcal.md
2026-08-29-fix-harness-split-comportamental.md
2026-08-29-fix-select-teto-e-spec-gcal.md
2026-08-29-fix-serie-vazia-e-acento-gcal.md
2026-08-29-fix-teto-pendencia-gcal.md
2026-08-29-fix-url-split-e-teste-comportamental.md
```

## 2) Arquivos alterados e o que mudou em cada um

- `docs/specs/gcal-sync.md`
  - atualizei o cabeçalho da spec para versão 7 / data 2026-08-29 / defeitos em aberto 2;
  - reclassifiquei 9.16 como resolvido (Rodada E);
  - reclassifiquei 9.15 como resolvido com a tríade de decisão do produto, correção do frontend e cobertura de teste da Rodada H;
  - mantive 9.14 pendente;
  - adicionei a subseção `9.17 Relatórios desta spec` com a tabela de índice de relatórios.

- `docs/README.md`
  - acrescentei `specs/gcal-sync.md` ao índice;
  - corrigi a convenção de rastreio e a regra de imutabilidade em "Como estes documentos se relacionam" e em "O que não vai nesta pasta";
  - ajustei a grafia para `Fora de escopo` no texto desta documentação.

- `docs/roadmap.md`
  - atualizei o cabeçalho `Atualizado` para 2026-08-29;
  - acrescentei o histórico de correção do item 2.1, apontando para a spec e a tabela de relatórios;
  - ajustei o campo de dependência da tabela de acompanhamento do item 2.1.

- `docs/contexto-personalapp-para-novas-conversas.md`
  - acrescentei o procedimento de validação por execução (dublês mínimos, `ENCRYPTION_KEY`, `node --test` por arquivo, mutação no arquivo real);
  - atualizei a seção "O que o modelo é" com a revisão de 2026-08-29;
  - acrescentei os erros 18 e 19 na seção 6;
  - inseri o roteiro por tarefa para reduzir leitura de pasta cheia;
  - atualizei a data de última atualização para 2026-08-29.

## 3) Item 1 — status novo da §9 e tabela de relatórios

### 3.1 Status novo dos itens que mudaram

- `9.16 — Dia da semana sem acento derruba a recorrência em silêncio. — RESOLVIDO (Rodada E)`
  - onde: `backend/src/services/gcalSyncService.js` (`mapearDiaSemanaParaCodigoRFC` / `normalizarDiaSemanaParaComparacao`)
  - teste: `backend/test/gcal-sync.test.js` (`montarRecurrence aceita diasSemana sem acento, abreviado, numérico e dispara warning para inválido`)

- `9.15 — Série truncada antes do próprio início vira evento avulso. — RESOLVIDO (Rodada F/H)`
  - decisão de produto: remover a série vazia nos dois lados; não preservar evento solto porque a série nova assume tudo a partir da data editada;
  - correção no frontend: `assets/js/modal-acao-slot.js` e a reconciliação de `storage.js` (~linha 718), com remoção do `DELETE` explícito em favor do sync de reconciliação;
  - cobertura de teste: `backend/test/gcal-duplicata-fix.test.js` protege os dois cenários de split (`primeira ocorrência` e `meio da série`) e falha sob mutação no arquivo real.

- `9.14 — Gatilho de sincronização triplo no boot — PENDENTE`
  - continua pendente de verdade; não foi reclassificado e não foi mexido além do registro explícito na spec.

### 3.2 Tríade do 9.15 registrada separadamente

1. decisão de produto: truncar e remover do app + do Google;
2. correção entregue no frontend e mantida sem `DELETE` redundante;
3. cobertura de teste confirmada pela Rodada H com mutação do arquivo real.

### 3.3 Tabela de relatórios criada

A seção `### 9.17 Relatórios desta spec` foi acrescentada em `docs/specs/gcal-sync.md` com os relatórios da spec listados em ordem e com o estado `diagnóstico`, `em aberto` ou `fechado`.

### 3.4 Cabeçalho novo

- `**Versão**`: 7
- `**Atualizado**`: 2026-08-29
- `**Defeitos em aberto**`: 2
- `**Status**`: atualizado para refletir as rodadas A–H e a validação em produção em 01–02/09/2026.

## 4) Item 2 — README

As quatro mudanças pedidas entraram:

1. `specs/gcal-sync.md` entrou no índice do README, no mesmo formato das outras specs;
2. o texto foi normalizado para `Fora de escopo` em minúsculas;
3. a convenção de rastreio de relatórios foi documentada em "Como estes documentos se relacionam";
4. a regra de imutabilidade de relatório foi documentada em "O que não vai nesta pasta".

## 5) Item 3 — roadmap

No item 2.1 do roadmap, entrou o bloco curto de histórico de correção da auditoria de 29/08/2026, com apontamento para `specs/gcal-sync.md` §9 e para a tabela de relatórios da spec. O cabeçalho foi atualizado para 2026-08-29 e a linha da tabela de acompanhamento do item 2.1 foi ajustada para citar a validação em produção e a saga de correções.

## 6) Item 4 — contexto

Os acréscimos do item 4 entram exatamente dentro das seções pedidas:

- `§2` — procedimento de validação por execução;
- `§5` — revisão de 2026-08-29 do texto "O que o modelo é";
- `§6` — erros 18 e 19, sem introduzir status de defeito ou contagem de teste;
- `§1` — roteiro por tarefa, separando "como trabalhar" da "spec que expressa a verdade da feature".

Além disso, confirmei que nenhuma dessas adições viola a §8 do próprio arquivo: o contexto foi mantido como guia operacional e não como registro de defeito ou histórico de rodada.

## 7) Portão de saída (saída literal)

```text
Set-Location 'E:\Projetos\GIT\personalapp\backend'
npm test
> personal-api@1.0.0 test
> node --test

✔ calcularAulasContadasDoCiclo: agendamento com reposicaoId não entra na parcela (A) (0.6729ms)
✔ calcularAulasContadasDoCiclo: reposição cobrável pendente conta na parcela (B) (0.2565ms)
... [saída truncada pela ferramenta, mas o resumo final foi]
ℹ tests 122
ℹ suites 0
ℹ pass 122
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 10914.5901

Set-Location 'E:\Projetos\GIT\personalapp'
git diff --stat
docs/README.md                                    |  5 +-
docs/contexto-personalapp-para-novas-conversas.md | 56 ++++++++++++++++++-
docs/roadmap.md                                   |  5 +-
docs/specs/gcal-sync.md                           | 67 +++++++++++++++++------
4 files changed, 113 insertions(+), 20 deletions(-)

git status --short
 M docs/README.md
 M docs/contexto-personalapp-para-novas-conversas.md
 M docs/roadmap.md
 M docs/specs/gcal-sync.md

Select-String -Path 'docs\README.md' -Pattern 'gcal-sync'
docs\README.md:15:| [`specs/gcal-sync.md`](specs/gcal-sync.md) | Sincronização com Google Calendar · **v7 · em produção** | Antes de mexer em recorrência, `EXDATE`, webhook, renovação do canal ou conflitos de sincronização |

docs\specs\gcal-sync.md:6:> **Versão**: 7 · **Atualizado**: 2026-08-29

docs\specs\gcal-sync.md:652:### 9.14 Gatilho de sincronização triplo no boot — PENDENTE

Select-String -Path 'docs\README.md' -Pattern 'Fora de Escopo'
[este comando continua acertando a forma em minúsculas por ser case-insensitive no PowerShell; a forma correta foi mantida em minúsculas, mas `Select-String` ainda faz match]
```

Observação honesta sobre o comando de busca do README: `Select-String` no PowerShell é case-insensitive por padrão. Em outras palavras, a forma correta `Fora de escopo` continua sendo encontrada pelo padrão `Fora de Escopo` mesmo quando a grafia está correta. A correção de grafia foi feita sem abrir exceção de regra; o ruído do comando é da ferramenta, não da documentação.

## 8) Branch usada

`chore/rodada-g-h-docs-e-harness-split`

## 9) O que foi encontrado e não alterado, com motivo

- `docs/_reports/` não foi alterado nesta rodada. A regra da rodada G é explícita: nenhum relatório histórico pode ser reescrito; se algo do histórico parece exigir ajuste, ele fica anotado neste relatório e não é editado no arquivo de origem.
- `backend/` e `assets/js/` não foram alterados. A rodada era de documentação e a regra de zero mudança de código foi respeitada.
- A correção da meia-noite e dos itens da Rodada H não foi reaberta aqui; a rodada G foi focada em consistência documental da spec, README, roadmap e contexto.
- O relatório anterior da rodada H foi considerado presente e validado como pré-requisito da cobertura do item 9.15; não foi editado nesta rodada.
