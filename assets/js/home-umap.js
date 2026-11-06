(() => {
  const player = document.querySelector('[data-umap-player]');
  if (!player) return;
  const video = player.querySelector('[data-umap-video]');
  if (!video) return;
  let onScreen = true;
  let failed = false;
  const resume = () => {
    if (failed || !onScreen || document.hidden) return;
    const pending = video.play();
    if (pending) pending.catch(() => {});
  };
  video.addEventListener('loadeddata', () => { failed = false; resume(); });
  video.addEventListener('error', () => { failed = true; });
  // Suspend offscreen playback without adding controls to the hero artwork.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) resume(); else video.pause();
    }, { threshold: 0.05 }).observe(video);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) video.pause(); else resume();
  });
  resume();
})();
