(() => {
  document.querySelectorAll('[data-carousel]').forEach(root => {
    const slides = [...root.querySelectorAll('[data-slide]')];
    if (slides.length < 2) return;
    const controls = root.querySelector('[data-carousel-controls]');
    const dots = [...root.querySelectorAll('[data-slide-to]')];
    const status = root.querySelector('[data-carousel-status]');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let index = 0;
    let hovering = false;
    let focused = false;
    let timer;
    const delay = Number(root.dataset.interval) || 6500;

    function schedule() {
      clearTimeout(timer);
      if (!reduced.matches && !hovering && !focused && !document.hidden) {
        timer = setTimeout(() => show(index + 1), delay);
      }
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

    dots.forEach((dot, n) => dot.addEventListener('click', () => show(n, true)));
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
    reduced.addEventListener('change', schedule);
    controls.hidden = false;
    show(0);
  });
})();
