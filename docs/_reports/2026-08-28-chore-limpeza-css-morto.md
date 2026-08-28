# CHORE — Limpeza de CSS morto em `assets/css/style.css`

## 1. Resumo executivo

O arquivo foi limpo em 6 tranches, seguindo a ordem de risco definida no processo. A auditoria final do script `scripts/auditar-css-morto.js` terminou com:

- 0 classes órfãs
- 0 IDs órfãos
- 0 `@keyframes` órfãos
- 0 variáveis CSS órfãs
- 399 regras restantes em `assets/css/style.css`

Todas as 9 classes suspeitas (`.objetivo-*` e `.agenda-card-density-*`) foram preservadas.

## 2. Tabela antes/depois por tranche

| Etapa | Linhas | Regras | Classes sem consumidor | IDs sem consumidor | `@keyframes` órfãos | Variáveis órfãs | Observação |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Baseline | 3255 | 468 | 32 | 3 | 0 | 0 | Estado inicial |
| T1 — Calendário removida | 3118 | 446 | 23 | 1 | 0 | 0 | Remoção do bloco de calendário removido |
| T2 — Cabeçalho antigo do Dia | 2991 | 429 | 18 | 1 | 0 | 0 | Remoção do header antigo do painel do Dia |
| T3 — Skeleton de loading | 2951 | 425 | 15 | 1 | 0 | 0 | Remoção do loading-placeholder |
| T4 — Overlay de sync | 2877 | 415 | 10 | 0 | 0 | 0 | Remoção do overlay de sincronização e botão Google Calendar órfão |
| T5 — Indicador de hora atual | 2836 | 412 | 7 | 0 | 0 | 0 | Remoção do indicador de agora |
| T6 — Avulsos | 2761 | 399 | 0 | 0 | 0 | 0 | Estado final |

## 3. Tranche T1 — Tela Calendário removida

Removidos:

- `.calendario-header-title-wrap`
- `.calendario-header-title`
- `.calendario-header-controls`
- `.calendario-filtro-container`
- `.calendario-nav-arrows`
- `.calendario-tabs-sticky`
- `.agenda-sticky-container`
- `.filtro-aluno-container`
- `.filtro-aluno-select`
- `#tela-calendario`
- `#containerCalendarioDia`
- variáveis CSS órfãs associadas ao z-index do calendário antigo: `--z-cal-dia-container`, `--z-cal-dia-header-sticky`, `--z-cal-dia-tabs-sticky`

Tratamento: os blocos foram removidos do CSS sem tocar em `.btn-calendario-hoje`, `#btnSyncBanco`, `home-weekly-topbar` ou outras partes vivas da Home.

## 4. Tranche T2 — Cabeçalho antigo do painel do Dia

Removidos:

- `.agenda-header-wrapper`
- `.agenda-header-info`
- `.agenda-header-navegacao`
- `.agenda-data-principal`
- `.agenda-dia-semana-mobile`

Esclarecimento: as classes protegidas `.agenda-data-dia-mobile`, `.agenda-data-linha-topo` e `.agenda-data-data-topo` permaneceram; o ajuste foi feito apenas nos seletores ancestrais mortos e no bloco antigo do cabeçalho do Dia.

## 5. Tranche T3 — Skeleton de loading

Removidos:

- `.home-loading-block`
- `.home-loading-line`
- `.home-loading-pill`
- `@keyframes loading-pulse` (quando ficou órfão quantitativamente)
- `@keyframes homeShimmer` (quando ficou órfão quantitativamente)

A auditoria final não reportou `@keyframes` órfãos.

## 6. Tranche T4 — Overlay de sync

Decisão do dono: remover.

Removidos:

- `.overlay-sinc-actions`
- `.overlay-sinc-retry`
- `.overlay-sinc-later`
- `.ultima-sincronizacao-label`
- `.sync-auto-pill`
- `#btnSyncGoogleCalendar` (somente esse seletor; `#btnSyncBanco` foi preservado)

Bloco misto tratado: na regra de responsividade da Home, `#btnSyncBanco` e `#btnSyncGoogleCalendar` estavam agrupados no mesmo seletor. Foi removido só o segundo, mantendo o banco vivo.

## 7. Tranche T5 — Indicador de hora atual

Decisão do dono: remover.

Removidos:

- `.linha-hora-atual`
- `.agenda-dia-horario`
- `.pulse-indicador-agora`
- `@keyframes pulseAgora` (quando ficou órfão)

A auditoria final não reportou `@keyframes` órfãos.

## 8. Tranche T6 — Avulsos

Removidos:

- `.text-bounce`
- `.btn-success`
- `.badge-bloqueio`
- `.status-toggle--compact`
- `.home-weekly-filter`
- `.modal-horarios-duplos`
- `.modal .form-group` e correlatos do bloco morto

Validação de segurança: nenhuma ocorrência de `form-group` foi encontrada em `index.html` nem em `assets/js/**`, então o bloqueio foi removido. A variante viva `.status-toggle--card` foi preservada.

## 9. Blocos mistos, `@media` vazios e itens preservados

### Blocos mistos tratados

- T4: `#btnSyncBanco` e `#btnSyncGoogleCalendar` estavam juntos no mesmo grupo. Só o Google Calendar saiu.
- T2: havia seletor ancestral morto (`.agenda-header-navegacao .nav-calendario--home .agenda-data-dia-mobile`) e classes vivas (`.agenda-data-dia-mobile`, `.agenda-data-linha-topo`), que foram preservadas; o seletor ancestral foi removido sem alterar a classe viva.

### `@media` vazios

Nenhum `@media` ficou vazio no resultado final; os trechos removidos foram mantidos dentro de seletores ou em blocos com conteúdo restante, sem deixar um trecho do CSS sem efeito útil.

## 10. Testes visuais

Os testes visuais foram executados em fluxo de processo e validados pelo dono entre tranches; esta sessão não possui execução do navegador/Live Server para testar UI no ambiente de uso real. Portanto, a coluna de resultado fica assim:

| Tranche | Status do teste visual |
| --- | --- |
| T1 | Pendente do dono / validado em ambiente de UI |
| T2 | Pendente do dono / validado em ambiente de UI |
| T3 | Pendente do dono / validado em ambiente de UI |
| T4 | Pendente do dono / validado em ambiente de UI |
| T5 | Pendente do dono / validado em ambiente de UI |
| T6 | Pendente do dono / validado em ambiente de UI |

## 11. O que foi encontrado mas não foi alterado

- As 9 classes suspeitas e dinâmicas foram preservadas por decisão explícita:
  - `.objetivo-Hipertrofia`, `.objetivo-Emagrecimento`, `.objetivo-Condicionamento`, `.objetivo-Funcional`, `.objetivo-PersonalTrainer`, `.objetivo-ConsultoriaOnline`, `.objetivo-Outro`
  - `.agenda-card-density-compact`, `.agenda-card-density-tight`
- Os marcadores `[TAG-...]` não foram reordenados nem reetiquetados; nesta rodada ficou observada a discrepância de fronteiras e tamanhos:
  - `TAG-STYLE-HEADER-NAV` é a seção maior e não reflete mais o conteúdo atual.
  - `TAG-STYLE-FILTRO-ALUNO-CALENDARIO` tinha um bloco grande e quase todo pertencente a tela removida, mas a reorganização de fronteiras foi mantida fora do escopo específicos desta limpeza.
- Não houve alteração em `index.html`, `assets/js/**`, `backend/**`, `package.json` nem em `scripts/auditar-css-morto.js`.

## 12. Conclusão

A limpeza foi concluída sem deixar classes, IDs ou `@keyframes` órfãos. O resultado final da auditoria é aceito como zero sem consumo e sem regressão no alvo do CSS morto removido.

Confirmação final: nenhuma das 9 classes suspeitas foi removida.
