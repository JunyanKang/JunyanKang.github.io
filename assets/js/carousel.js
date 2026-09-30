(() => {
  document.querySelectorAll('[data-carousel]').forEach(root => {
    const slides = [...root.querySelectorAll('[data-slide]')];
    if (slides.length < 2) return;
    const controls = root.querySelector('[data-carousel-controls]');
    const dots = [...root.querySelectorAll('[data-slide-to]')];
    const play = root.querySelector('[data-play]');
    const symbol = root.querySelector('[data-play-symbol]');
    const status = root.querySelector('[data-carousel-status]');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let index = 0;
    let paused = reduced.matches;
    let hovering = false;
    let focused = false;
    let timer;
    const delay = Number(root.dataset.interval) || 6500;

    function schedule() {
      clearTimeout(timer);
      if (!paused && !hovering && !focused && !document.hidden) {
        timer = setTimeout(() => show(index + 1), delay);
      }
    }

    function updatePlay() {
      play.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
      symbol.textContent = paused ? '▷' : 'Ⅱ';
    }

    function show(next, announce = false) {
      index = (next + slides.length) % slides.length;
      slides.forEach((slide, n) => {
        slide.hidden = n !== index;
        slide.inert = n !== index;
        if (n === index) dots[n].setAttribute('aria-current', 'true');
        else dots[n].removeAttribute('aria-current');
      });
      if (announce) status.textContent = `Slide ${index + 1} of ${slides.length}: ${slides[index].querySelector('h2').textContent}`;
      schedule();
    }

    root.querySelector('[data-prev]').addEventListener('click', () => show(index - 1, true));
    root.querySelector('[data-next]').addEventListener('click', () => show(index + 1, true));
    dots.forEach((dot, n) => dot.addEventListener('click', () => show(n, true)));
    play.addEventListener('click', () => { paused = !paused; if (!paused) focused = false; updatePlay(); schedule(); });
    root.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') { hovering = true; schedule(); } });
    root.addEventListener('pointerleave', () => { hovering = false; schedule(); });
    root.addEventListener('focusin', () => { focused = true; schedule(); });
    root.addEventListener('focusout', () => setTimeout(() => { focused = root.contains(document.activeElement); schedule(); }, 0));
    root.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const fromSlide = document.activeElement?.closest('[data-slide]');
      show(index + (event.key === 'ArrowRight' ? 1 : -1), true);
      if (fromSlide) slides[index].querySelector('a').focus();
    });
    document.addEventListener('visibilitychange', schedule);
    reduced.addEventListener('change', () => { if (reduced.matches) paused = true; updatePlay(); schedule(); });
    controls.hidden = false;
    updatePlay();
    show(0);
  });
})();
