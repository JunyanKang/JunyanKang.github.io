(() => {
  const player = document.querySelector('[data-umap-player]');
  if (!player) return;
  const video = player.querySelector('[data-umap-video]');
  const toggle = player.querySelector('[data-umap-toggle]');
  const label = player.querySelector('[data-umap-label]');
  const icon = player.querySelector('[data-umap-icon]');
  if (!video || !toggle) return;
  let manualPause = false;
  let onScreen = true;
  let failed = false;
  const update = () => {
    if (failed) { toggle.hidden = true; return; }
    toggle.hidden = false;
    toggle.setAttribute('aria-label', video.paused ? 'Play animation' : 'Pause animation');
    if (label) label.textContent = video.paused ? 'Play' : 'Pause';
    if (icon) icon.setAttribute('d', video.paused ? 'M7 4v16l13-8z' : 'M7 5h3v14H7zm7 0h3v14h-3z');
  };
  const resume = () => {
    if (failed || manualPause || !onScreen || document.hidden) return;
    const pending = video.play();
    if (pending) pending.catch(update);
  };
  video.addEventListener('loadeddata', () => { failed = false; update(); });
  video.addEventListener('play', update);
  video.addEventListener('pause', update);
  const unavailable = () => { failed = true; toggle.hidden = true; };
  video.addEventListener('error', unavailable);
  video.querySelectorAll('source').forEach(source => source.addEventListener('error', unavailable));
  toggle.addEventListener('click', () => {
    manualPause = !video.paused;
    if (manualPause) video.pause(); else resume();
  });
  // Suspend work offscreen without overriding an explicit user pause.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) resume(); else video.pause();
    }, { threshold: 0.05 }).observe(video);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) video.pause(); else resume();
  });
  update();
  resume();
})();
