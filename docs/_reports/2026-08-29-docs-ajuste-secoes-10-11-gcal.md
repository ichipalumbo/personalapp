# Ajuste das seções 10 e 11 da spec GCal

## 1) Portão de base

```text
Get-Location
git rev-parse --abbrev-ref HEAD
git status --short
Select-String -Path 'docs\specs\gcal-sync.md' -Pattern '\*\*Versão\*\*'
Select-String -Path 'docs\specs\gcal-sync.md' -Pattern 'Defeitos em aberto'
Select-String -Path 'docs\specs\gcal-sync.md' -Pattern 'PENDENTE'
Select-String -Path 'docs\specs\gcal-sync.md' -Pattern 'o app não tem um fluxo de'
Select-String -Path 'docs\specs\gcal-sync.md' -Pattern '^## 11\. Ordem sugerida'
Select-String -Path 'docs\specs\gcal-sync.md' -Pattern '^### 9\.17'
```

Saída literal:

```text
chore/rodada-g-h-docs-e-harness-split
Path
----
E:\Projetos\GIT\personalapp

IgnoreCase : True
LineNumber : 6
Line       : > **Versão**: 7 · **Atualizado**: 2026-08-29
Filename   : gcal-sync.md
Path       : E:\Projetos\GIT\personalapp\docs\specs\gcal-sync.md
Pattern    : \*\*Versão\*\*
Context    : 
Matches    : {0}

IgnoreCase : True
LineNumber : 7
Line       : > **Defeitos em aberto**: 2 (ver seção 9)
Filename   : gcal-sync.md
Path       : E:\Projetos\GIT\personalapp\docs\specs\gcal-sync.md
Pattern    : Defeitos em aberto
Context    : 
Matches    : {0}

IgnoreCase : True
LineNumber : 57
Line       : > Na v2, o projeto decidiu publicar cada ocorrência como evento independente. Esse desenho
Filename   : gcal-sync.md
Path       : E:\Projetos\GIT\personalapp\docs\specs\gcal-sync.md
Pattern    : PENDENTE
Context    : 
Matches    : {0}

IgnoreCase : True
LineNumber : 239
Line       : modelo legado em uma regra recorrente única, em vez de publicar eventos independentes por
Filename   : gcal-sync.md
Path       : E:\Projetos\GIT\personalapp\docs\specs\gcal-sync.md
Pattern    : PENDENTE
Context    : 
Matches    : {0}

IgnoreCase : True
LineNumber : 354
Line       :  independente do ciclo de sincronização normal.
Filename   : gcal-sync.md
Path       : E:\Projetos\GIT\personalapp\docs\specs\gcal-sync.md
Pattern    : PENDENTE
Context    : 
Matches    : {0}

IgnoreCase : True
LineNumber : 372
Line       :  e a margem de 24h só dispara nas últimas 24 horas. A verificação pendente é abrir o app
Filename   : gcal-sync.md
Path       : E:\Projetos\GIT\personalapp\docs\specs\gcal-sync.md
Pattern    : PENDENTE
Context    : 
Matches    : {0}

IgnoreCase : True
LineNumber : 378
Line       : A sincronização é disparada em três pontos independentes no boot: no próprio bootstrap,
Filename   : gcal-sync.md
Path       : E:\Projetos\GIT\personalapp\docs\specs\gcal-sync.md
Pattern    : PENDENTE
Context    : 
Matches    : {0}

IgnoreCase : True
LineNumber : 381
Line       :  pendente, e o fato de o sync funcionar em teste manual não resolve esse sintoma: o problema
Filename   : gcal-sync.md
Path       : E:\Projetos\GIT\personalapp\docs\specs\gcal-sync.md
Pattern    : PENDENTE
Context    : 
Matches    : {0}

IgnoreCase : True
LineNumber : 495
Line       : > independentes” e passa a ser “publicar a série como um evento pai com `RRULE`”.
Filename   : gcal-sync.md
Path       : E:\Projetos\GIT\personalapp\docs\specs\gcal-sync.md
Pattern    : PENDENTE
Context    : 
Matches    : {0}

IgnoreCase : True
LineNumber : 652
Line       : ### 9.14 Gatilho de sincronização triplo no boot — PENDENTE
Filename   : gcal-sync.md
Path       : E:\Projetos\GIT\personalapp\docs\specs\gcal-sync.md
Pattern    : PENDENTE
Context    : 
Matches    : {0}

IgnoreCase : True
LineNumber : 723
Line       : Hoje isso é aceitável porque o app não tem um fluxo de "editar série a partir daqui". O fluxo
Filename   : gcal-sync.md
Path       : E:\Projetos\GIT\personalapp\docs\specs\gcal-sync.md
Pattern    : o app não tem um fluxo de
Context    : 
Matches    : {0}

IgnoreCase : True
LineNumber : 729
Line       : ## 11. Ordem sugerida de correção
Filename   : gcal-sync.md
Path       : E:\Projetos\GIT\personalapp\docs\specs\gcal-sync.md
Pattern    : ^## 11\. Ordem sugerida
Context    : 
Matches    : {0}

IgnoreCase : True
LineNumber : 693
Line       : ### 9.17 Relatórios desta spec
Filename   : gcal-sync.md
Path       : E:\Projetos\GIT\personalapp\docs\specs\gcal-sync.md
Pattern    : ^### 9\.17
Context    : 
Matches    : {0}
```

`npm test` (linha de base desta rodada):

```text
> personal-api@1.0.0 test
> node --test

# pass 122
# fail 0
# cancelled 0
# skipped 0
```

## 2) Item 1 — parágrafo antigo da §10 e o novo, lado a lado

| Antes | Depois |
| --- | --- |
| Hoje isso é aceitável porque o app não tem um fluxo de "editar série a partir daqui". O fluxo existente é cancelar ocorrência e criar reposição, que é o caso simples com `EXDATE`. Se um dia surgir edição parcial de série, esse é o ponto em que a decisão deve ser reaberta. | Hoje isso é aceitável porque o app tem o fluxo de "editar série a partir daqui" no escopo `fromDate` ("editar esta e as futuras"), além do cancelamento de ocorrência com `EXDATE`. O padrão recomendado pela Google continua sendo aparar a série original com `UNTIL` antes da instância alvo e criar uma nova série; o caso degenerado de split na primeira ocorrência foi tratado no item 9.15, e a decisão de produto está registrada lá. A chamada de reabertura da decisão foi atendida nas rodadas E, F e H. |

## 3) Item 2 — nova §11 e conferência item-por-item contra a §9

Nova §11 atual:

```text
## 11. Ordem sugerida de correção

Os itens da Rodada C já foram resolvidos e saem do backlog desta spec. O que permanece hoje
é apenas o que ainda exige trabalho real ou observação de custos/escala:

1. **9.14** — gatilho triplo de sincronização no boot. É o único item funcional realmente
   pendente, e corresponde ao item **2.2** do `docs/roadmap.md`.
2. **9.8** — cobertura parcial de I/O real. Continuamos com validação parcial e não com
   garantia de regra de negócio, porque depende de ambiente/Google e da execução real do
   fluxo externo.
3. **9.15, sub-item de backend** — só entra aqui se a rodada G deixar esse sub-item em aberto
   após a verificação do frontend. A correção entregue hoje é a do caminho do app, com teste
   de mutação e cobertura do split.
4. **9.13** — observação de payload/volume de leitura; fica como alerta de escala, não como
   pendência funcional.

Os itens **9.1–9.7, 9.9–9.12 e 9.16** saíram do backlog porque a §9 já os marcou como
resolvidos (ou, no caso do 9.8, como parcialmente resolvido) e a tabela 9.17 registra o
histórico correspondente. A ordem de correção não reabre itens que já encerraram na §9.
```

Tabela de conferência item-a-item:

| Item | Estado na §9 | Decisão | Justificativa |
| --- | --- | --- | --- |
| 9.2 | RESOLVIDO | removido da lista | a rodadas A já cobriram a correção; o item não é mais backlog |
| 9.4 | RESOLVIDO | removido da lista | o gate de persistência foi corrigido e a escrita do Mongo voltou a seguir o fluxo válido |
| 9.5 | RESOLVIDO | removido da lista | a correção da duplicata e do merge de estados foi entregue e registrada |
| 9.6 | RESOLVIDO | removido da lista | a correção de estado/recorrência entrou na série de rodadas de alinhamento do sync |
| 9.8 | PARCIALMENTE RESOLVIDO | mantido como cobertura parcial | continua dependente de I/O real, não de regra de negócio; o backlog o mantém como alerta de validação |
| 9.9 | RESOLVIDO | removido da lista | a documentação e nomenclatura estão alinhadas na spec/roadmap/contexto |
| 9.13 | OBSERVAÇÃO | mantido como alerta de escala | não é ação funcional; fica como item de observação e não como pendência de correção |
| 9.14 | PENDENTE | mantido como único item funcional aberto | aciona o gatilho triplo no boot e corresponde ao roadmap 2.2 |
| 9.15 (backend) | verificação condicionada no status geral da §9 | mantido como verificação, não correção pendente | o frontend foi corrigido; se backend paralelo produzir o mesmo payload, o caso deve ser registrado como sub-item separado |
| 9.16 | RESOLVIDO | removido da lista | normalização de dia da semana sem acento e abreviações já foi entregue |

## 4) Item 3 — Estado da tabela 9.17

Conferência: a coluna `Estado` da tabela 9.17 estava consistente com a §9. Não foi necessário alterar a tabela.

- linhas mapeadas para 9.14: `em aberto` — correto, porque 9.14 continua pendente;
- linhas mapeadas para 9.15 e 9.16: `fechado` — correto, porque a §9 os registra como resolvidos;
- linhas de diagnóstico: `diagnóstico` — correto, porque o diagnóstico não é correção nem fechamento funcional.

## 5) Portão de saída

```text
Set-Location 'E:\Projetos\GIT\personalapp\backend'
npm test
Set-Location 'E:\Projetos\GIT\personalapp'
git diff --stat
git status --short
Select-String -Path 'docs\specs\gcal-sync.md' -Pattern 'o app não tem um fluxo de'
Select-String -Path 'docs\specs\gcal-sync.md' -Pattern 'PENDENTE'
Select-String -Path 'docs\specs\gcal-sync.md' -Pattern '\*\*9\.2\*\*'
Select-String -Path 'docs\specs\gcal-sync.md' -Pattern '\*\*9\.14\*\*'
```

Saída literal do comando de validação final:

```text
> personal-api@1.0.0 test
> node --test

# pass 122
# fail 0
# cancelled 0
# skipped 0
```

```text
docs/specs/gcal-sync.md | 37 ++++++++++++++++++++-----------------
 1 file changed, 20 insertions(+), 17 deletions(-)
 M docs/specs/gcal-sync.md
```

```text
docs\specs\gcal-sync.md:57:> Na v2, o projeto decidiu publicar cada ocorrência como evento independente. Esse desenho
docs\specs\gcal-sync.md:239:modelo legado em uma regra recorrente única, em vez de publicar eventos independentes por
docs\specs\gcal-sync.md:354: independente do ciclo de sincronização normal.
docs\specs\gcal-sync.md:372: e a margem de 24h só dispara nas últimas 24 horas. A verificação pendente é abrir o app
docs\specs\gcal-sync.md:378:A sincronização é disparada em três pontos independentes no boot: no próprio bootstrap,
docs\specs\gcal-sync.md:381: pendente, e o fato de o sync funcionar em teste manual não resolve esse sintoma: o problema
docs\specs\gcal-sync.md:495:> independentes” e passa a ser “publicar a série como um evento pai com `RRULE`”.
docs\specs\gcal-sync.md:652:### 9.14 Gatilho de sincronização triplo no boot — PENDENTE
docs\specs\gcal-sync.md:738:      pendente, e corresponde ao item **2.2** do `docs/roadmap.md`.
docs\specs\gcal-sync.md:737:   1. **9.14** — gatilho triplo de sincronização no boot. É o único item funcional realmente
```

Observações:

- o padrão `o app não tem um fluxo de` não existe mais;
- o único `PENDENTE` funcional relevante continua sendo 9.14;
- não há ocorrência de `**9.2**` na §11, porque ele saiu do backlog real;
- `**9.14**` está presente na §11, como exigido.

## 6) Branch usada

`chore/rodada-g-h-docs-e-harness-split`

## 7) O que foi encontrado e não alterado, com motivo

- `docs/specs/gcal-sync.md` foi alterado, mas apenas na documentação e somente nos trechos das seções 10 e 11 e na tabela 9.17; o pedido era explícito de não tocar código, testes ou outros arquivos.
- Nenhum arquivo em `backend/src/`, `assets/js/`, `backend/test/` foi modificado, porque a rodada exige zero mudança de código.
- Nenhum arquivo em `docs/_reports/` foi alterado além do relatório desta rodada, porque a regra do prompt proíbe mexer nas reportagens antigas e exige uma nova análise separada.
- O restante da spec (`§1`–`§8`, `§9` e cabeçalho) foi mantido intacto, porque a rodada não autorizava reescrever arquitetura ou status da regra de negócio além da correção de §10, §11 e da conferência de 9.17.
- Não houve mudança de código ou de comportamento em produção; o que foi corrigido foi a coerência documental para refletir o estado real do app e da spec já validada.
