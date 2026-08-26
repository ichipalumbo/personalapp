# CHORE 0.3 — Limpeza de CSS órfão da visão mensal removida

## 1) Portão de base (saída literal)

```text
chore/limpeza-css-orfao
3413
33
1
```

> Observação: `git status --short` veio vazio (sem linhas).

## 2) Tabela de seletores avaliados (método 3 passos)

| Seletor | Linhas onde estava em `style.css` (antes) | Passo 1 — busca literal em `index.html` + `assets/js/**` | Passo 2 — construção dinâmica / fragmento | Veredito |
| --- | --- | --- | --- | --- |
| `.calendario-mensal` | 2393, 2400, 2407, 2411 | vazio | `calendario-mensal`: vazio | **Removido** (sem uso encontrado) |
| `.calendario-grid` | 2416 | vazio | `calendario-grid`: vazio | **Removido** (sem uso encontrado) |
| `.calendario-grid .dia-header` | 2421 | achou `semana-dia-header` em `view-calendario.js` (substring) | `dia-header`: mesmos hits de `semana-dia-header` | **Removido** (não há ocorrência literal de `dia-header` como classe isolada) |
| `.calendario-grid .dia-cell` | 2429, 2442, 2446, 2452, 2457, 2460 e 3387 (`@media`) | vazio | `dia-cell`: vazio | **Removido** (sem uso encontrado) |
| `.calendario-grid .dia-cell .dia-numero` | 2452, 2457 | vazio | `dia-numero`: vazio | **Removido** (sem uso encontrado) |
| `.calendario-mensal .mes-header` | 2400, 2407 | vazio | `mes-header`: vazio | **Removido** (sem uso encontrado) |
| `.calendario-mensal .mes-header .mes-nav` | 2411 | vazio | `mes-nav`: vazio | **Removido** (sem uso encontrado) |
| `.dia-stats-badges` | 2465 e 3391 (`@media`) | vazio | `dia-stats-badges`: vazio | **Removido** (sem uso encontrado) |
| `.badge-stat-mensal` | 2472, 2484 e 3396 (`@media`) | vazio | `badge-stat-mensal`: vazio | **Removido** (sem uso encontrado) |
| `.kpi-dashboard` | 2893 | vazio | `kpi-dashboard`: vazio | **Removido** (sem uso encontrado) |
| `.kpi-card-label` | 2927 | vazio | `kpi-card-label`: vazio | **Removido** (sem uso encontrado) |
| `.kpi-card-value` | 2919 | vazio | `kpi-card-value`: vazio | **Removido** (sem uso encontrado) |

### Evidência literal relevante (passo 1/2)

```text
--- dia-header ---
assets\js\view-calendario.js:185:                <button type="button" class="semana-dia-header" onclick="window.irParaDiaDestaSemana('${dataAlvoFormatada}')">
assets\js\view-calendario.js:186:                    <span class="semana-dia-header-main">
```

## 3) Seletores mantidos apesar de parecerem órfãos

### Grupo `.objetivo-*` (mantido)

Evidência de uso dinâmico:

```text
assets\js\agenda-card-template.js:204:            classes.push(`objetivo-${normalizarObjetivo(objetivo)}`);
assets\js\view-alunos.js:440:                                <span class="objetivo-${objetivoClass}" style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${objetivo}</span>
```

Conclusão: **mantido** (regra dinâmica confirmada).

## 4) Veredito sobre `#tela-calendario` e `#containerCalendarioDia`

Busca literal em `index.html` e `assets/js/**`:

```text
--- tela-calendario em index/html/js ---
--- containerCalendarioDia em index/html/js ---
--- router tela-* ---
assets\js\app\router.js:3:        'tela-home': () => global.inicializarHome,
assets\js\app\router.js:4:        'tela-financas': () => global.inicializarFinancas,
assets\js\app\router.js:5:        'tela-alunos': () => global.inicializarAlunos
```

Ocorrências ainda existentes no CSS:

```text
assets\css\style.css:103:#tela-calendario {
assets\css\style.css:2367:#containerCalendarioDia {
assets\css\style.css:2373:#tela-calendario > .calendario-tabs-sticky {
assets\css\style.css:2383:#containerCalendarioDia .agenda-sticky-container {
assets\css\style.css:3249:  #containerCalendarioDia .agenda-sticky-container {
assets\css\style.css:3254:  #tela-calendario > .calendario-tabs-sticky {
```

Conclusão: **mantidos por segurança** (sem prova suficiente de morte sem validação visual das visões de dia/semana).

## 5) Contagem de chaves (balanceamento CSS)

- Antes:
  - `ABRE=512`
  - `FECHA=512`
- Depois:
  - `ABRE=489`
  - `FECHA=489`

Conclusão: **balanceado antes e depois**.

## 6) Linhas removidas

- Total removido: **152 linhas** (`git diff --stat`).
- Distribuição por bloco:
  - Bloco mensal (`[TAG-STYLE-CALENDARIO-MENSAL]` + regras mensais associadas): **95 linhas**
  - Bloco KPI mensal (`[TAG-STYLE-KPI-DASHBOARD]`): **43 linhas**
  - Sobrescritas mensais em `@media` (final do arquivo): **14 linhas**

## 7) Candidatos NÃO resolvidos nesta rodada

- Fora de escopo 0.3 (mantidos para rodada dedicada):  
  `.btn-success`, `.form-group`, `.text-bounce`, `.home-loading-*`, `.home-weekly-filter`, `.filtro-aluno-container`, `.filtro-aluno-select`, `.calendario-filtro-container`, `.calendario-header-controls`, `.calendario-header-title`, `.calendario-header-title-wrap`, `.calendario-nav-arrows`, `.calendario-tabs-sticky`, `.overlay-sinc-actions`, `.overlay-sinc-later`, `.overlay-sinc-retry`, `.sync-auto-pill`, `.ultima-sincronizacao-label`, `.badge-bloqueio`, `.agenda-dia-horario`, `.linha-hora-atual`, `.pulse-indicador-agora`, `.modal-horarios-duplos`.
- Mantidos por dúvida técnica nesta rodada: `#tela-calendario` e `#containerCalendarioDia`.
