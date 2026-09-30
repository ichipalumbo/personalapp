# Relatório — Animação de feedback na troca de período (Home: Semana e Dia)

**Data:** 2026-08-28  
**Feature:** `feat/swipe-periodo-home` (continuação)  
**Escopo:** 100% frontend — sem alterações em backend

---

## Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `assets/css/style.css` | Bloco novo inserido logo após `@keyframes timeGridSlotPulse`: dois keyframes, duas classes utilitárias e a media query `prefers-reduced-motion`. Nenhuma regra existente foi tocada. |
| `assets/js/widget-swipe-periodo.js` | Cabeçalho `// Responsabilidade:` atualizado. `window.animarTrocaPeriodo` adicionada dentro da mesma IIFE. |
| `assets/js/view-calendario.js` | Uma linha `animarTrocaPeriodo` adicionada após `renderizarHomeSemana()` em cada um dos três handlers de botão e nos dois callbacks de swipe. |
| `assets/js/view-home.js` | Uma linha `animarTrocaPeriodo` adicionada após `renderizarHomeDia()` em cada um dos três handlers de botão e nos dois callbacks de swipe. |

---

## Valores finais de duração, deslocamento e curva

| Parâmetro | Valor | Justificativa |
|---|---|---|
| Duração | `180ms` | Valor especificado no prompt. Coerente com o intervalo 0.15s–0.3s do restante do projeto. |
| Deslocamento | `16px` | Valor especificado no prompt. Suficiente para o olho registrar a direção, curto o bastante para não parecer transição de tela. |
| Curva | `cubic-bezier(0.4, 0, 0.2, 1)` | Padrão do projeto em animações existentes (`timeGridSlotPulse` e outros). |

Nenhum valor foi ajustado — os do prompt são consistentes com o restante do CSS.

---

## Qual elemento anima e por quê não é o painel

### Aba Semana → `#calendarioSemanalHomeGrid`

O painel `.agenda-panel-semana` contém a barra de navegação (setas, label do período, filtro de aluno). Animar o painel inteiro faria esses controles deslizarem junto com o conteúdo, parecendo defeito visual. O `#calendarioSemanalHomeGrid` é o único elemento cujo `innerHTML` é sobrescrito a cada render — portanto é o único que "mudou de fato" e precisa animar.

### Aba Dia → `#agendaGridHomeHome`

Mesmo raciocínio: `#homeDayPanel` contém o cabeçalho com data e botões de navegação. O conteúdo que efetivamente muda a cada render é `#agendaGridHomeHome`. Animar só ele mantém o cabeçalho estático e o feedback visual focado onde ocorreu a mudança.

---

## Padrão de reflow adotado

Igual ao de `window.abrirEscolhaTipoModalPorSlotHome` em `view-home.js`:

```js
elemento.classList.remove('periodo-anima-avanca', 'periodo-anima-volta');
void elemento.offsetWidth;  // força reflow — sem isso a animação não re-dispara
elemento.classList.add(classe);
elemento.addEventListener('animationend', function () {
  elemento.classList.remove(classe);
}, { once: true });
```

O `animationend` com `{ once: true }` remove a classe automaticamente ao fim da animação, garantindo que o elemento fique limpo para a próxima chamada.

---

## Resultado item por item do roteiro de teste

> Validação estática. Confirmação final em dispositivo real ou DevTools com emulação de toque.

| # | Descrição | Status esperado | Observação |
|---|---|---|---|
| 1 | Semana, swipe avança/volta | ✅ | `aoAvancar` chama `animarTrocaPeriodo(..., 'avanca')`, `aoVoltar` chama `'volta'`. Grid novo entra da direita/esquerda respectivamente. |
| 2 | Dia, swipe avança/volta | ✅ | Idem, sobre `#agendaGridHomeHome`. |
| 3 | Setas avançar e voltar nas duas abas | ✅ | `btnSemanaHomeAnterior`/`btnHomeDiaAnterior` → `'volta'`; `btnSemanaHomeProxima`/`btnHomeDiaProximo` → `'avanca'`. |
| **4** | **Trocas rápidas em sequência** | **✅** | `classList.remove` das duas classes + `void elemento.offsetWidth` antes de `classList.add` garante que o reflow ocorre mesmo quando a animação anterior ainda não terminou. O `animationend` com `{ once: true }` não interfere: se a animação for interrompida por um novo remove, o listener simplesmente não dispara ou dispara sem efeito. |
| 5 | Sem classe presa após trocas | ✅ | `animationend` com `{ once: true }` remove a classe ao final de cada animação. |
| **6** | **"Hoje" na Semana + scrollIntoView** | ℹ️ | O `scrollIntoView` de 120ms no `renderizarHomeSemana` acontece depois da animação de 180ms se completar: 120ms < 180ms, portanto a rolagem ocorre dentro da janela da animação. Ambos operam sobre propriedades diferentes (scroll vs. opacity/transform), sem conflito técnico. O resultado visual — rolagem suave iniciando enquanto o conteúdo ainda faz fade-in — é esperado e deve ser validado manualmente. Se parecer tremido, reportar para correção em rodada específica. |
| 7 | Rolagem vertical intacta | ✅ | Todos os listeners de toque mantêm `{ passive: true }`. A animação aplica apenas `opacity` + `transform` e não toca em `overflow`, `margin` nem `height`. |
| 8 | Tap no card continua abrindo modal | ✅ | Nenhum `preventDefault()` introduzido. `animarTrocaPeriodo` não é chamada em taps (exige `|dx| ≥ 60px`). |
| 9 | Troca de aba não anima | ✅ | `animarTrocaPeriodo` só é chamada dentro dos callbacks de botões de período e do swipe. `alternarModoHome` não foi tocado. |
| **10** | **prefers-reduced-motion** | **✅** | Media query adicionada como primeira regra do tipo no arquivo, com escopo estrito às duas classes novas. Com `animation: none`, o conteúdo muda instantaneamente e `animationend` dispara imediatamente (comportamento padrão do browser quando `animation: none` é aplicado a um listener pendente). Navegação continua correta. |
| 11 | Carga inicial sem animação | ✅ | `animarTrocaPeriodo` não é chamada em `inicializarHome()` nem no primeiro render — só nos handlers de navegação explícita. |

---

## Confirmação: listeners de toque intactos

- Contagem de ocorrências de `passive` no widget: **4** (os quatro handlers: `touchstart`, `touchmove`, `touchcancel`, `touchend`).
- `preventDefault`: **nenhuma ocorrência** no widget.
- A lógica interna de detecção de gesto (constantes, zona morta, dominância horizontal, multitoque, duração máxima) não foi modificada.

---

## O que foi encontrado mas não alterado — riscos fora do escopo

- **`halterBounce`, `pulseAgora`, `homeShimmer`, `girar-sinc`** — animações existentes sem cobertura de `prefers-reduced-motion`. Identificadas conforme esperado; fora do escopo desta rodada.
- **`scrollIntoView` em `renderizarHomeSemana`** — intacto. A sobreposição temporal com a animação de 180ms (ver item 6) precisa de validação manual; qualquer ajuste exigiria mexer no render, que está fora do escopo.
- **`animationend` com `animation: none`** — quando o usuário tem `prefers-reduced-motion: reduce`, o browser pode ou não disparar `animationend` dependendo da implementação. O pior caso é a classe ficar presa (sem a limpeza do `animationend`). Risco baixo na prática: a remoção de ambas as classes acontece antes de cada nova chamada via `classList.remove`, então em qualquer troca subsequente o estado é limpo de qualquer forma.
- **`docs/roadmap.md`** — não alterado conforme instrução.
