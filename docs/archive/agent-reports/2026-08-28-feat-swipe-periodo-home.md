# Relatório — Swipe horizontal para trocar período na Home

**Data:** 2026-08-28  
**Feature:** `feat/swipe-periodo-home`  
**Escopo:** 100% frontend — sem alterações em backend

---

## Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `assets/js/widget-swipe-periodo.js` | **Criado.** IIFE que expõe `window.ativarSwipePeriodo(elemento, { aoAvancar, aoVoltar })`. |
| `index.html` | Tag `<script src="assets/js/widget-swipe-periodo.js"></script>` inserida no bloco `[4] UI Widgets`, após `widget-bloqueio.js` e antes dos `[5] Modais` e `[6] Page Views`. |
| `assets/js/view-calendario.js` | Bloco de swipe adicionado dentro do `DOMContentLoaded` existente, imediatamente antes de `#btnNovaAgendaSemanal`. Liga o widget ao `.agenda-panel-semana`. |
| `assets/js/view-home.js` | Bloco de swipe adicionado ao final de `garantirHomeTabs()`, após todos os `bindOnce`. Liga o widget ao `#homeDayPanel`. |

---

## Constantes do widget (valores finais)

| Constante | Valor | Justificativa |
|---|---|---|
| `DISTANCIA_MINIMA_PX` | `60` | Valor especificado no prompt. Filtra micro-toques e taps. |
| `RAZAO_DOMINANCIA_HORIZONTAL` | `1.5` | Valor especificado no prompt. Garante que a componente horizontal seja 1,5× maior que a vertical antes de aceitar o gesto, protegendo a rolagem vertical. |
| `ZONA_MORTA_BORDA_PX` | `30` | Valor especificado no prompt. Evita conflito com o gesto "voltar" nativo de iOS e Android, que parte da borda da tela. |
| `DURACAO_MAXIMA_MS` | `800` | Valor especificado no prompt. Descartar gestos longos (hesitação, leitura do conteúdo com dedo apoiado). |

Nenhuma constante foi ajustada — os valores do prompt já cobrem os casos de uso esperados.

---

## Elemento âncora de cada aba e motivo

### Aba Semana → `.agenda-panel-semana`

Elemento declarado estaticamente no `index.html` (linha 253). Sobrevive a qualquer re-render, pois `renderizarHomeSemana()` reescreve apenas o `innerHTML` do `#calendarioSemanalHomeGrid` (filho interno), não do container `.agenda-panel-semana`. Um listener registrado diretamente no grid morreria a cada navegação de semana.

### Aba Dia → `#homeDayPanel`

Elemento criado dinamicamente por `garantirHomeTabs()` e inserido uma única vez no DOM. O `id` é estável durante toda a sessão. O conteúdo renderizável (`#agendaGridHomeHome`) é reescrito por `renderizarHomeDia()`, mas o painel em si permanece. Por isso o swipe é registrado no painel, não no grid interno.

---

## O que os handlers das setas fazem

### Aba Semana (`view-calendario.js`, `DOMContentLoaded`)

```
btnSemanaHomeAnterior → semanaReferencia.setDate(getDate() - 7) + renderizarHomeSemana()
btnSemanaHomeProxima  → semanaReferencia.setDate(getDate() + 7) + renderizarHomeSemana()
btnSemanaHomeHoje     → semanaReferencia = new Date()            + renderizarHomeSemana()
```

Nenhum dos dois handlers de avanço/retorno faz qualquer outra coisa além de ajustar a data e re-renderizar. Os callbacks do swipe replicam **exatamente** esse caminho.

### Aba Dia (`view-home.js`, `garantirHomeTabs`)

```
btnHomeDiaAnterior → dataSelecionada.setDate(getDate() - 1) + renderizarHomeDia()
btnHomeDiaProximo  → dataSelecionada.setDate(getDate() + 1) + renderizarHomeDia()
btnHomeDiaHoje     → dataSelecionada = new Date()            + renderizarHomeDia()
```

Idem: os callbacks do swipe replicam **exatamente** esse caminho.

---

## Guarda contra acúmulo de listeners

### Aba Dia — `dataset.swipeAtivo`

`garantirHomeTabs()` retorna cedo (`return`) se `#homeDayPanel` já existir (linha 70). Portanto o bloco `bindOnce` e o bloco de swipe só executam quando o painel é criado pela primeira vez. A guarda `dataset.swipeAtivo !== 'true'` é uma camada extra de segurança caso essa lógica de retorno antecipado mude no futuro.

### Aba Semana — `dataset.swipeAtivo`

O `DOMContentLoaded` dispara uma única vez por carregamento de página. A guarda existe igualmente como defesa em profundidade.

---

## Roteiro de teste manual — resultado esperado por item

> Testes realizados via inspeção estática do código. Validação em dispositivo deve ser feita pela usuária final ou com DevTools em modo de emulação de toque.

| # | Descrição | Status esperado | Observação |
|---|---|---|---|
| 1 | Semana — avançar e voltar | ✅ | Callbacks chamam `setDate(±7)` + `renderizarHomeSemana()`, mesmo caminho das setas. Label `#periodoSemanaHomeLabel` é atualizado dentro de `renderizarHomeSemana()`. |
| **2** | **Rolagem vertical não troca período** | **✅** | `RAZAO_DOMINANCIA_HORIZONTAL = 1.5` exige `|dx| ≥ 1.5 × |dy|`. Scroll puro (dy >> dx) nunca satisfaz. Todos os listeners são `{ passive: true }`: a rolagem nativa não é bloqueada. |
| 3 | Tap no card continua abrindo modal | ✅ | `touchend` só dispara callback se `|dx| ≥ 60px`. Um tap não desloca 60 px. `preventDefault()` não é chamado em nenhum ponto, logo o evento `click` do `onclick` inline do card não é cancelado. |
| 4 | Tap no cabeçalho do dia (aba Semana) | ✅ | Mesmo motivo do item 3 — tap não acumula 60 px de deslocamento horizontal. |
| 5 | Dia — avançar e voltar | ✅ | Callbacks chamam `setDate(±1)` + `renderizarHomeDia()`, mesmo caminho das setas. |
| 6 | Sem acúmulo de listener | ✅ | `dataset.swipeAtivo` impede registro duplo. `garantirHomeTabs()` já retorna cedo se `#homeDayPanel` existe. |
| 7 | Gesto de voltar do sistema preservado | ✅ | `ZONA_MORTA_BORDA_PX = 30`: toque iniciado nos primeiros ou últimos 30 px da tela define `gestoValido = false` e ignora o touchend. |
| 8 | Setas intactas | ✅ | Os handlers das setas não foram tocados. |
| 9 | Swipe vertical não faz nada | ✅ | Filtro de dominância horizontal descarta gestos onde `|dx| < |dy| × 1.5`. |

---

## O que foi encontrado mas não alterado — riscos identificados

- **`garantirHomeTabs()` guarda por existência do elemento, não por flag.** A função retorna imediatamente se `#homeDayPanel` já existir. O bloco de swipe foi inserido depois dos `bindOnce`, portanto só executa uma vez. Não há risco de acúmulo, mas a guarda `dataset.swipeAtivo` permanece como defesa extra.
- **`renderizarHomeSemana()` sobrescreve `#calendarioSemanalHomeGrid` com `innerHTML`.** Confirma a decisão de ancorar no `.agenda-panel-semana` externo. Sem risco novo.
- **Sem testes automatizados de frontend.** A validação dos itens acima é estática. Itens 2, 3 e 6 devem ser confirmados com toque real no dispositivo.
- **`widget-bloqueio.js` e `widget-stepper-duracao.js`** não foram lidos — não eram necessários para esta tarefa.
- **`docs/roadmap.md`** não foi alterado conforme instrução do prompt.
