(() => {
  const slider = document.querySelector('.depoimentos-slider');
  const cards = [...document.querySelectorAll('.depoimento-destaque[id^="depoimento-"]')];
  const controles = document.querySelector('.controles-depoimentos');
  if (!slider || !cards.length || !controles) return;

  const contador = controles.querySelector('.contador-depoimentos');
  let atual = 0;

  function mostrar(indice, focar = true) {
    atual = (indice + cards.length) % cards.length;
    cards.forEach((card, i) => {
      const ativo = i === atual;
      card.style.transform = `translateX(-${atual * 100}%)`;
      card.classList.toggle('is-ativo', ativo);
      card.inert = !ativo;
      card.setAttribute('aria-hidden', String(!ativo));
    });
    contador.textContent = `${atual + 1} / ${cards.length}`;
    if (focar) cards[atual].focus({ preventScroll: true });
  }

  controles.addEventListener('click', (evento) => {
    const botao = evento.target.closest('button[data-mover]');
    if (!botao) return;
    mostrar(atual + (botao.dataset.mover === 'proximo' ? 1 : -1));
  });

  let inicioToque = null;
  slider.addEventListener('pointerdown', (evento) => {
    inicioToque = evento.clientX;
  });
  slider.addEventListener('pointerup', (evento) => {
    if (inicioToque === null) return;
    const distancia = evento.clientX - inicioToque;
    inicioToque = null;
    if (Math.abs(distancia) > 45) mostrar(atual + (distancia < 0 ? 1 : -1), false);
  });
  slider.addEventListener('pointercancel', () => { inicioToque = null; });

  let temporizador;
  const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function iniciarAutomatico() {
    if (movimentoReduzido || document.hidden || temporizador) return;
    temporizador = window.setInterval(() => mostrar(atual + 1, false), 3000);
  }
  function pausarAutomatico() {
    window.clearInterval(temporizador);
    temporizador = null;
  }

  slider.addEventListener('mouseenter', pausarAutomatico);
  slider.addEventListener('mouseleave', iniciarAutomatico);
  slider.addEventListener('focusin', pausarAutomatico);
  slider.addEventListener('focusout', iniciarAutomatico);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pausarAutomatico();
    else iniciarAutomatico();
  });

  mostrar(0, false);
  iniciarAutomatico();
})();