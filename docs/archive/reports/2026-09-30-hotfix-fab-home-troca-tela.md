# Hotfix — FAB "Novo agendamento" da Home persiste ao trocar de tela (até o destino terminar de carregar)

> **Data**: 2026-09-30
> **Branch**: `feat/padronizar-skeletons-cache` (decisão do dono — continuar na branch atual,
> junto do plano 5.8)
> **Origem**: bug achado pelo dono em produção (2026-09-30), antes de iniciar a execução do
> item 5.8 (skeletons + cache). Registro feito no mesmo commit-branch do plano 5.8.

## Bug

Ao navegar de **Home → Finanças**, o FAB "Novo agendamento" da Home (`#fabNovoHome`) continua
visível e interceptando toque sobre a tela de Finanças **durante todo o carregamento** dela —
só some quando o fetch `/api/financas` termina.

Causa (medida no código):

- O FAB vive no `document.body` (criado por `trocarFABNovoHome` em `assets/js/view-home.js`) —
  **fora** de qualquer `.view-section`, então o `display:none` da Home não o esconde por CSS.
  A única coisa que o remove é o `fab.remove()` dentro da própria `trocarFABNovoHome`.
- O router (`assets/js/app/router.js`) trocava o `display` das telas na hora, mas só chamava
  `trocarFABNovoHome()` dentro do `initializeView` — **depois** do `await` do init da tela de
  destino. No caso da Finanças, o init é `inicializarFinancas` → `carregarFinancas` → o fetch.
  Resultado: o FAB só era reavaliado quando o fetch terminou.

Detalhes:

- O mesmo conflito latente se aplicava a **Home → Alunos** (FAB da Home sobre o FAB
  `#btnFlutuanteAdicionar` "Novo aluno") — o comentário do próprio router (Etapa 3, Rodada 2)
  já advertia da colisão com o FAB de Alunos e dizia que a verificação por visibilidade estaria
  correta "aqui" porque o `display` já teria sido trocado antes do init; mas como a chamada só
  ocorria **depois** do init, a verificação só via o estado final, pós-carregamento.
- **O bug não se reproduz no mock de UI**: `mocks/ui-runtime/mock-runtime.js` resolve
  `/api/financas` com `Promise.resolve` (instantâneo), então a janela de sobreposição é zero.
  Só aparece em rede real (produção) — é o que o dono observou.

## Correção

Arquivo alterado: `assets/js/app/router.js` (única mudança de código).

`navigateTo` agora chama `trocarFABNovoHome()` **imediatamente após a troca de `display`**,
antes do `await initializeView`:

```diff
             if (activeView) {
                 activeView.style.display = 'block';
             }
 
+            // Remove o FAB da Home assim que ela sai de tela — ANTES do init da
+            // tela alvo. ... (comentário completo no arquivo)
+            if (typeof global.trocarFABNovoHome === 'function') {
+                global.trocarFABNovoHome();
+            }
+
             await initializeView(targetId);
```

A chamada idempotente que ficava no `initializeView` foi **mantida** (a função é idempotente —
o comentário original do router já reconhecia), funcionando como proteção para caminhos que
reinicializam a view sem navegar (`refreshCurrentView`). Nenhuma mudança em
`trocarFABNovoHome` / `view-home.js`.

## Validação

- Teste novo `tests-frontend/router-fab-tela.test.js` (jsdom + `router.js` real;
  `inicializarFinancas` simulado com porta controlada para manter o carregamento pendente
  sob controle): navega Home → Finanças e garante que `trocarFABNovoHome` foi chamado e o
  **FAB já saiu do `<body>` enquanto o carregamento da Finanças ainda está em andamento**.
- **Prova de mutação**: revertido o `router.js` para a forma antiga (chamada só no
  `initializeView`) → o teste **falha** (1 fail / 0 pass); restaurado o fix → passa. A mutação
  foi confirmada removida antes de prosseguir.
- Suíte `tests-frontend/` (`node --test`): **81/81 antes → 82/82 depois** (o +1 é o teste novo).
- Suíte `backend/`: sem alterações de backend nesta rodada — não reexecutada.
- **Validação manual (dono)**: ✅ aprovada em 2026-10-01 — em rede real, Home → Finanças e
  Home → Alunos: o FAB "Novo agendamento" some no instante da troca de tela, antes do
  skeleton/carregamento da tela destino terminar. (A correção foi mergeada na `main` via PR #68,
  na mesma branch do item 5.8.)

## Fora de escopo

- Os estados de carregamento em si (skeletons + rótulo de cache) seguem no plano
  `plans/2026-09-30-plan-skeletons-cache.md` item 5.8, aguardando as 3 decisões do dono.
- Nenhum outro ponto de criação/remoção de FAB foi tocado; o comportamento do FAB dentro da
  Home (modo Semana vs. Dia) é inalterado.
