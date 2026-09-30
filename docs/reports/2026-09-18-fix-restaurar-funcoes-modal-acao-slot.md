# Relatório — fix/restaurar-funcoes-modal-acao-slot (2026-09-18)

## 1) Sintoma relatado

Ao clicar em uma aula na agenda, o console do navegador acusava, repetidamente:

```
modal-acao-slot.js:704 Uncaught ReferenceError: obterNomesDiasSemanaModalAcao is not defined
    at window.abrirModalAcaoSlot (modal-acao-slot.js:704:24)
    at window.abrirCalendarioAcaoSlot (view-calendario.js:240:9)
```

O modal de ação sobre o slot não abria — o clique em qualquer aula falhava silenciosamente para a usuária, sem nenhum aviso além do console.

## 2) Causa raiz

A causa **não** foi um bug pontual de uma função esquecida. O commit `9b5ac58` desta mesma sessão (remoção do "Painel de Reposições Pendentes", documentado em [`2026-09-18-chore-remove-painel-pendentes.md`](2026-09-18-chore-remove-painel-pendentes.md)) apagou por engano, junto com o código do painel, um **bloco inteiro de ~250 linhas** de funções auxiliares no topo de `assets/js/modal-acao-slot.js` que não tinham nenhuma relação com o painel, além da função completa `executarExclusaoAulaAvulsa` em outro ponto do arquivo.

Funções apagadas sem relação com o painel:

- `obterCompromissoPorId` / `obterCompromissoSelecionado`
- `gerarIdReposicao`
- `deveEnviarPatchReposicao`
- `obterMensagemFalhaPersistencia`
- `capturarValoresFormularioEdicao`
- `reabrirModalEdicaoComValores`
- `avisarFalhaPersistencia`
- `reverterVinculoReposicaoAgendada`
- `enviarParaReposicao`
- `obterNomesDiasSemanaModalAcao`
- `window.executarExclusaoAulaAvulsa` (função completa, ~75 linhas)

### 2.1) Por que isso não quebrou a sintaxe (e por isso passou despercebido)

A remoção manteve o JavaScript sintaticamente válido — apenas removeu declarações de função inteiras que eram chamadas em outros pontos do arquivo. `node -c` ou qualquer linter de sintaxe não acusaria nada. O erro só se manifesta em **runtime**, no momento em que o código tenta chamar uma função inexistente — e isso só acontece ao interagir de fato com o modal (abrir, editar, excluir, enviar para reposição).

### 2.2) Por que os testes automatizados não pegaram de imediato

A suíte que exercita este arquivo (`backend/test/gcal-duplicata-fix.test.js`) carrega `modal-acao-slot.js` inteiro num harness de `vm.runInNewContext` e invoca as funções expostas em `window`. Ela **pegaria** o problema — e de fato pegou, quando finalmente rodada de ponta a ponta (48 testes falhando com `ReferenceError`). O que faltou foi rodar essa suíte especificamente logo após o commit da remoção do painel, antes de seguir para a tarefa seguinte da sessão.

## 3) Investigação — como a causa raiz foi isolada

1. O erro reportado (`obterNomesDiasSemanaModalAcao is not defined`) foi corrigido pontualmente adicionando a função de volta.
2. A suíte `gcal-duplicata-fix.test.js` foi rodada para validar — revelou **48 falhas adicionais**, todas `ReferenceError` para nomes de função diferentes (`obterCompromissoSelecionado`, `deveEnviarPatchReposicao`, `enviarParaReposicao`, etc.), sinalizando que o problema não era uma função isolada.
3. Cada função foi reconstruída manualmente uma a uma, reduzindo as falhas de 48 → 15 → 9, mas o padrão (múltiplas funções essenciais faltando, todas relacionadas a persistência e edição) apontava para uma remoção em lote, não erros individuais.
4. Comparação de tamanho do arquivo em cada commit do histórico confirmou a suspeita:

   | Commit | Tamanho do arquivo |
   | --- | --- |
   | `c1cbbab` (íntegro, pré-existente) | 211.168 bytes |
   | `d2871bd` (íntegro, imediatamente anterior à remoção do painel) | 106.713 bytes* |
   | `9b5ac58` (commit da remoção do painel) | 94.856 bytes |

   *(`d2871bd` já refletia reduções de commits anteriores e não corrompidas; o salto relevante é `d2871bd` → `9b5ac58`.)*

5. `git show 9b5ac58 -- assets/js/modal-acao-slot.js` confirmou visualmente o diff: um hunk de `-257,+10` linhas no topo do arquivo (o bloco de funções auxiliares) e um segundo hunk de `-83` linhas no meio do arquivo (a função `executarExclusaoAulaAvulsa` inteira) — ambos muito além do que a remoção do painel deveria tocar.

## 4) Correção aplicada

Em vez de continuar reconstruindo função por função (abordagem frágil, já demonstrada insuficiente no passo 3 acima), o arquivo foi restaurado por inteiro a partir do commit `d2871bd` (última versão íntegra conhecida, imediatamente anterior à remoção do painel) via:

```
git checkout d2871bd -- assets/js/modal-acao-slot.js
```

Em seguida, a remoção do painel foi **reaplicada com precisão cirúrgica** sobre essa base íntegra: apenas o bloco `window.togglePainelReposicoes` / `window.renderizarListaReposicoes`, a variável `_ultimaChaveRenderReposicoes` e as referências de cabeçalho associadas foram removidos — preservando todas as demais ~2.550 linhas do arquivo intactas.

`assets/js/view-home.js` recebeu limpeza correspondente: comentário de dependência apontando para `renderizarListaReposicoes` (função que não existe mais) e a variável `elAulasRepor`, que apontava para um elemento HTML já removido do DOM.

## 5) Validação

- `backend/test/gcal-duplicata-fix.test.js` isolado: **103/103 passando** (partindo de 55/103 no início da investigação).
- Suíte completa do backend (`npm test`): **219/219 passando**.
- Suíte completa do frontend (`tests-frontend/`): **45/45 passando**.

Nenhum teste de finanças, reposição, conflito de agenda ou frontend foi afetado — as falhas eram inteiramente isoladas a `modal-acao-slot.js` e ao harness que o carrega.

## 6) Lição registrada

Remoção de código em arquivos grandes via edição em massa (`replace_string_in_file` com blocos grandes) tem risco real de arrastar conteúdo não intencional junto com o alvo, mesmo sem quebrar a sintaxe. A suíte de testes que carrega o arquivo via harness/VM (não apenas checagem de sintaxe) precisa ser executada **imediatamente** após qualquer remoção de bloco, antes de prosseguir para a tarefa seguinte — não apenas ao final da sessão.
