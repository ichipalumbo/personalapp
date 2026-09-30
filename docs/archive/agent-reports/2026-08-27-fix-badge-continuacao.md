# Relatório — fix/badge-continuacao (2026-08-27)

## 1) Motivo da correção

A badge "Continuação" no card de agenda era uma exibição de mecanismo interno do app: ela refletia o campo `serieOrigemId`, usado quando uma série é criada a partir de um split (`fromDate`) e precisa manter vínculo com a recorrência anterior. Esse detalhe é útil para o `confirm()` de exclusão da série de continuação, mas não deve aparecer como estado do compromisso para o usuário.

O problema é que a badge era excludente: o compromisso deixava de ser classificado como recorrente e passava a mostrar um histórico de edição interna. Para o produto, uma série semanal continua sendo uma recorrência, independentemente de ter sido criada por split. A regra escolhida foi simples: toda série semanal exibe `Recorrente` com o ícone infinito; o campo `serieOrigemId` continua existindo no dado, sem exposição visual.

## 2) Trecho antes / depois

Antes:

```js
} else if (comp.frequencia === 'semanal') {
    const badgeLabel = comp.serieOrigemId
        ? `<i class="fa-solid fa-arrow-turn-down-right"></i> Continuação`
        : `<i class="fa-solid fa-infinity"></i> Recorrente`;
    tagStatusHtml = `<span class="badge-tag-tipo agenda-card-optional agenda-card-status-badge" style="${BADGE_STYLES.recorrente}">${badgeLabel}</span>`;
}
```

Depois:

```js
} else if (comp.frequencia === 'semanal') {
    tagStatusHtml = `<span class="badge-tag-tipo agenda-card-optional agenda-card-status-badge" style="${BADGE_STYLES.recorrente}"><i class="fa-solid fa-infinity"></i> Recorrente</span>`;
}
```

## 3) Preservação do dado e do aviso de continuação

A correção não mexeu no campo `serieOrigemId`, nem no `confirm()` usado quando a série é uma continuação histórica. Isso foi explicitamente preservado, porque a informação continua útil na lógica de exclusão da série e no aviso ao usuário.

O campo continua sendo gravado em:

```js
serieOrigemId: compromisso.id,
```

e o aviso de continuação continua em:

```js
if (_serieDeletar && _serieDeletar.serieOrigemId) {
```

## 4) Portão de base

Comandos executados:

```powershell
Select-String -Path 'assets\js\agenda-card-template.js' -Pattern 'Continuação|serieOrigemId|fa-arrow-turn-down-right' -Context 3,3
Select-String -Path 'assets\js\*.js','assets\js\**\*.js' -Pattern 'Continuação'
Select-String -Path 'assets\js\*.js','assets\js\**\*.js' -Pattern 'serieOrigemId'
```

Saída literal:

```text
assets\js\agenda-card-template.js:206:            if (comp.reagendada || comp.isReposicao) {
assets\js\agenda-card-template.js:207:                tagStatusHtml = `<span class="badge-tag-tipo badge-tag-tipo--reposicao agenda-card-optional agenda-card-status-badge"><i class="fa-solid fa-arrows-rotate"></i> Reposição</span>`;
assets\js\agenda-card-template.js:208:            } else if (comp.frequencia === 'semanal') {
> assets\js\agenda-card-template.js:209:                const badgeLabel = comp.serieOrigemId
> assets\js\agenda-card-template.js:210:                    ? `<i class="fa-solid fa-arrow-turn-down-right"></i> Continuação`
> assets\js\agenda-card-template.js:211:                    : `<i class="fa-solid fa-infinity"></i> Recorrente`;
> assets\js\agenda-card-template.js:212:                tagStatusHtml = `<span class="badge-tag-tipo agenda-card-optional agenda-card-status-badge" style="${BADGE_STYLES.recorrente}">${badgeLabel}</span>`;
assets\js\agenda-card-template.js:213:            } else {
assets\js\agenda-card-template.js:214:                tagStatusHtml = `<span class="badge-tag-tipo agenda-card-optional agenda-card-status-badge" style="${BADGE_STYLES.unico}"><i class="fa-solid fa-thumbtack"></i> Único</span>`;
assets\js\modal-acao-slot.js:1547:          "Esta série é uma continuação de uma série histórica anterior.\n\n" +
assets\js\modal-acao-slot.js:1550:            "Deseja excluir esta série de continuação?",
assets\js\modal-acao-slot.js:1545:      if (_serieDeletar && _serieDeletar.serieOrigemId) {
assets\js\agenda-card-template.js:209:                const badgeLabel = comp.serieOrigemId
assets\js\modal-acao-slot.js:1101:            serieOrigemId: compromisso.id,
```

## 5) Portão de saída

Comandos executados:

```powershell
Select-String -Path 'assets\js\*.js','assets\js\**\*.js' -Pattern 'Continuação'
Select-String -Path 'assets\js\*.js','assets\js\**\*.js' -Pattern 'fa-arrow-turn-down-right'
Select-String -Path 'assets\js\*.js','assets\js\**\*.js' -Pattern 'serieOrigemId'
Select-String -Path 'assets\js\agenda-card-template.js' -Pattern 'fa-infinity' -Context 2,2
node --check 'assets/js/agenda-card-template.js'
git diff --stat
git status --short
```

Saída literal:

```text
assets\js\modal-acao-slot.js:1547:          "Esta série é uma continuação de uma série histórica anterior.\n\n" +
assets\js\modal-acao-slot.js:1550:            "Deseja excluir esta série de continuação?",
assets\js\modal-acao-slot.js:1101:            serieOrigemId: compromisso.id,
assets\js\modal-acao-slot.js:1545:      if (_serieDeletar && _serieDeletar.serieOrigemId) {
---
---
assets\js\modal-acao-slot.js:1101:            serieOrigemId: compromisso.id,
assets\js\modal-acao-slot.js:1545:      if (_serieDeletar && _serieDeletar.serieOrigemId) {
---
  assets\js\agenda-card-template.js:207:                tagStatusHtml = `<span class="badge-tag-tipo badge-tag-tipo--reposicao agenda-card-optional agenda-card-status-badge"><i class="fa-solid fa-arrows-rotate"></i> Reposição</span>`;
  assets\js\agenda-card-template.js:208:            } else if (comp.frequencia === 'semanal') {
> assets\js\agenda-card-template.js:209:                tagStatusHtml = `<span class="badge-tag-tipo agenda-card-optional agenda-card-status-badge" style="${BADGE_STYLES.recorrente}"><i class="fa-solid fa-infinity"></i> Recorrente</span>`;
  assets\js\agenda-card-template.js:210:            } else {
  assets\js\agenda-card-template.js:211:                tagStatusHtml = `<span class="badge-tag-tipo agenda-card-optional agenda-card-status-badge" style="${BADGE_STYLES.unico}"><i class="fa-solid fa-thumbtack"></i> Único</span>`;
---
---
 assets/js/agenda-card-template.js | 5 +----
 1 file changed, 1 insertion(+), 4 deletions(-)
---
[... saida podada ...]
```

## 6) Teste manual documentado

Com o app aberto em `http://localhost:5500`:

1. Localizar uma aula que antes exibia `Continuação`; ela deve passar a exibir `Recorrente` com o ícone infinito.
2. Validar que uma aula avulsa continua com `Único` e uma reposição com `Reposição`.
3. Abrir o modal da série e clicar em **Excluir a série toda**; confirmar que o aviso de continuação histórico continua aparecendo e, ao cancelar nas duas confirmações, nada é excluído.

Este terceiro passo é a verificação crítica: garante que o dado `serieOrigemId` foi preservado e que a remoção da badge não apagou o mecanismo útil do split.
