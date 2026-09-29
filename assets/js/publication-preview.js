(() => {
  const papers = [...document.querySelectorAll('[data-preview-config]')];
  if (!papers.length) return;
  const panel = document.createElement('aside');
  panel.className = 'kl-figure-preview'; panel.id = 'publication-figure-preview'; panel.hidden = true;
  panel.setAttribute('aria-label', 'Publication figure preview');
  const close = document.createElement('button');
  close.className = 'kl-figure-close';
  close.type = 'button'; close.textContent = '×'; close.setAttribute('aria-label', 'Close figure preview');
  const status = document.createElement('p'); status.setAttribute('role', 'status');
  const viewport = document.createElement('div'); viewport.className = 'kl-figure-viewport';
  const image = document.createElement('img'); image.decoding = 'async'; viewport.append(image);
  const source = document.createElement('a'); source.target = '_blank'; source.rel = 'noopener noreferrer'; source.className = 'kl-figure-source';
  panel.append(close, status, viewport, source); document.body.append(panel);
  let active = null, hideTimer, showTimer, pinned = false, restoringFocus = false, generation = 0;

  function hide(restore = false) {
    clearTimeout(hideTimer); clearTimeout(showTimer); generation++;
    const trigger = active?.title;
    if (active) active.title.setAttribute('aria-expanded', 'false');
    active = null; pinned = false; panel.hidden = true;
    if (restore) { restoringFocus = true; trigger?.focus({ preventScroll: true }); restoringFocus = false; }
  }
  function position() {
    if (!active) return;
    const rect = active.title.getBoundingClientRect(), box = panel.getBoundingClientRect();
    const left = Math.max(12, Math.min(rect.right - box.width, innerWidth - box.width - 12));
    const below = rect.bottom + 10;
    const top = below + box.height <= innerHeight - 12 ? below : Math.max(12, rect.top - box.height - 10);
    panel.style.left = `${left}px`; panel.style.top = `${top}px`;
  }
  async function show(item, pin = false) {
    clearTimeout(hideTimer); clearTimeout(showTimer);
    if (active === item && !panel.hidden) { pinned ||= pin; return; }
    hide(); active = item; pinned = pin;
    const request = ++generation;
    item.title.setAttribute('aria-expanded', 'true');
    source.textContent = `${item.config.credit || 'Original article'} · Source ↗`; source.href = item.config.source;
    status.textContent = 'Loading figure…'; status.hidden = false;
    viewport.hidden = true; panel.hidden = false;
    image.alt = [item.config.alt || item.title.textContent, item.config.credit].filter(Boolean).join(' · '); image.src = item.config.image;
    position();
    try {
      await image.decode();
      if (request !== generation) return;
      const crop = item.config.crop;
      const width = crop?.width || image.naturalWidth, height = crop?.height || image.naturalHeight;
      const scale = Math.min((panel.clientWidth - 24) / width, Math.max(100, innerHeight * .53) / height);
      viewport.style.width = `${width * scale}px`; viewport.style.height = `${height * scale}px`;
      image.style.width = `${(crop?.source_width || image.naturalWidth) * scale}px`;
      image.style.height = `${(crop?.source_height || image.naturalHeight) * scale}px`;
      image.style.left = `${-(crop?.x || 0) * scale}px`; image.style.top = `${-(crop?.y || 0) * scale}px`;
      status.hidden = true; viewport.hidden = false; position();
    } catch {
      if (request !== generation) return;
      status.textContent = 'Preview unavailable. Use the DOI link to open the article.'; position();
    }
  }
  function scheduleHide() {
    clearTimeout(hideTimer);
    if (pinned) return;
    hideTimer = setTimeout(() => {
      if (!panel.matches(':hover') && !panel.contains(document.activeElement) && document.activeElement !== active?.title) hide();
    }, 200);
  }
  papers.forEach(script => {
    const paper = script.closest('[data-publication]');
    const title = paper.querySelector('[data-paper-preview]');
    let config;
    try { config = JSON.parse(script.textContent); } catch { return; }
    const item = { title, config };
    title.setAttribute('aria-controls', panel.id); title.setAttribute('aria-expanded', 'false');
    let touch = false;
    title.addEventListener('pointerdown', event => { touch = event.pointerType === 'touch' || event.pointerType === 'pen'; });
    title.addEventListener('click', event => {
      if (!touch) return;
      event.preventDefault(); touch = false;
      if (active === item && pinned) hide(); else void show(item, true);
    });
    title.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch' || pinned) return;
      clearTimeout(hideTimer); clearTimeout(showTimer); showTimer = setTimeout(() => show(item), 120);
    });
    title.addEventListener('pointerleave', () => { clearTimeout(showTimer); scheduleHide(); });
    title.addEventListener('focus', () => { if (!pinned && !restoringFocus) void show(item); });
    title.addEventListener('blur', scheduleHide);
  });
  close.addEventListener('click', () => hide(true));
  panel.addEventListener('pointerenter', () => clearTimeout(hideTimer));
  panel.addEventListener('pointerleave', scheduleHide); panel.addEventListener('focusout', scheduleHide);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && active) { event.preventDefault(); hide(panel.contains(document.activeElement)); } });
  document.addEventListener('pointerdown', event => { if (active && !panel.contains(event.target) && !active.title.contains(event.target)) hide(); });
  document.getElementById('publication-search')?.addEventListener('input', () => hide());
  window.addEventListener('resize', () => hide());
  window.addEventListener('scroll', () => {
    // Browser focus/scroll-into-view can finish after a Figure click.
    if (!active) return;
    if (pinned || document.activeElement === active.title || active.title.matches(':hover')) position();
    else hide();
  }, { passive:true });
})();
