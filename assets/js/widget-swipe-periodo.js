// [TAG-WIDGET-SWIPE-PERIODO] widget-swipe-periodo.js
// Responsabilidade: detectar swipe horizontal por toque e disparar callbacks de troca de período;
//                   aplicar animação direcional de entrada no grid de conteúdo
// Depende de: nada
(function () {
  'use strict';

  // Deslocamento horizontal mínimo para considerar swipe.
  const DISTANCIA_MINIMA_PX = 60;
  // Quanto o movimento horizontal precisa dominar o vertical.
  // Protege a rolagem vertical da lista de agendamentos.
  const RAZAO_DOMINANCIA_HORIZONTAL = 1.5;
  // Faixa nas bordas laterais ignorada: é onde iOS/Android usam o gesto de "voltar".
  const ZONA_MORTA_BORDA_PX = 30;
  // Acima disso o gesto é tratado como hesitação/leitura, não como swipe.
  const DURACAO_MAXIMA_MS = 800;

  window.ativarSwipePeriodo = function (elemento, opcoes) {
    if (!elemento || !opcoes) return;

    const aoAvancar = typeof opcoes.aoAvancar === 'function' ? opcoes.aoAvancar : null;
    const aoVoltar = typeof opcoes.aoVoltar === 'function' ? opcoes.aoVoltar : null;
    if (!aoAvancar && !aoVoltar) return;

    let xInicial = 0;
    let yInicial = 0;
    let tempoInicial = 0;
    let gestoValido = false;

    elemento.addEventListener('touchstart', function (evento) {
      // Multitoque (pinça/zoom) nunca é swipe de período.
      if (!evento.touches || evento.touches.length !== 1) {
        gestoValido = false;
        return;
      }

      const toque = evento.touches[0];

      // Zona morta das bordas: não competir com o gesto de voltar do sistema.
      const larguraTela = window.innerWidth || document.documentElement.clientWidth || 0;
      if (toque.clientX < ZONA_MORTA_BORDA_PX || toque.clientX > (larguraTela - ZONA_MORTA_BORDA_PX)) {
        gestoValido = false;
        return;
      }

      xInicial = toque.clientX;
      yInicial = toque.clientY;
      tempoInicial = Date.now();
      gestoValido = true;
    }, { passive: true });

    // Se um segundo dedo entrar no meio do gesto, invalida.
    elemento.addEventListener('touchmove', function (evento) {
      if (evento.touches && evento.touches.length > 1) {
        gestoValido = false;
      }
    }, { passive: true });

    elemento.addEventListener('touchcancel', function () {
      gestoValido = false;
    }, { passive: true });

    elemento.addEventListener('touchend', function (evento) {
      if (!gestoValido) return;
      gestoValido = false;

      if (!evento.changedTouches || evento.changedTouches.length !== 1) return;

      const toque = evento.changedTouches[0];
      const dx = toque.clientX - xInicial;
      const dy = toque.clientY - yInicial;
      const duracao = Date.now() - tempoInicial;

      if (duracao > DURACAO_MAXIMA_MS) return;
      if (Math.abs(dx) < DISTANCIA_MINIMA_PX) return;
      if (Math.abs(dx) < Math.abs(dy) * RAZAO_DOMINANCIA_HORIZONTAL) return;

      if (dx < 0) {
        if (aoAvancar) aoAvancar();
      } else {
        if (aoVoltar) aoVoltar();
      }
    }, { passive: true });
  };

  window.animarTrocaPeriodo = function (elemento, direcao) {
    if (!elemento) return;
    elemento.classList.remove('periodo-anima-avanca', 'periodo-anima-volta');
    // Forçar reflow para que a remoção seja processada antes de re-adicionar a classe.
    void elemento.offsetWidth;
    const classe = direcao === 'volta' ? 'periodo-anima-volta' : 'periodo-anima-avanca';
    elemento.classList.add(classe);
    elemento.addEventListener('animationend', function () {
      elemento.classList.remove(classe);
    }, { once: true });
  };
})();
