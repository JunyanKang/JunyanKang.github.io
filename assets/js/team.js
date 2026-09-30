(() => {
  const map = document.querySelector('.kl-origin-map');
  const preview = map?.querySelector('.kl-region-preview');
  if (!preview) return;
  const regions = [...map.querySelectorAll('[data-region]')];
  const title = preview.querySelector('.kl-region-preview-title');
  const row = preview.querySelector('.kl-region-preview-cards');
  const members = new Map();
  document.querySelectorAll('[data-member-region]').forEach(card => {
    const code = card.dataset.memberRegion;
    if (!members.has(code)) members.set(code, []);
    members.get(code).push(card);
  });
  let active = null;
  let closeTimer;
  let frame;
  const cancelClose = () => clearTimeout(closeTimer);
  const hide = () => {
    cancelClose();
    active?.classList.remove('is-active');
    active?.removeAttribute('aria-describedby');
    active = null;
    preview.hidden = true;
  };
  const position = () => {
    if (!active || preview.hidden) return;
    // Province markers avoid bounding boxes spanning offshore islands.
    const anchor = (active.querySelector('circle') || active).getBoundingClientRect();
    const bounds = map.getBoundingClientRect();
    const box = preview.getBoundingClientRect();
    const left = anchor.left + anchor.width / 2 - bounds.left - box.width / 2;
    preview.style.left = `${Math.max(8, Math.min(left, bounds.width - box.width - 8))}px`;
    const headerBottom = document.querySelector('.kl-header')?.getBoundingClientRect().bottom || 0;
    const above = anchor.top - box.height - 12;
    const top = above >= headerBottom + 8 ? above : anchor.bottom + 12;
    preview.style.top = `${top - bounds.top}px`;
  };
  const show = region => {
    cancelClose();
    if (active === region) return;
    hide();
    active = region;
    region.classList.add('is-active');
    const cards = members.get(region.dataset.region) || [];
    if (!cards.length) return;
    title.textContent = region.dataset.regionName;
    row.replaceChildren(...cards.map(source => {
      const card = document.createElement('article');
      card.className = 'kl-region-preview-card';
      const name = source.querySelector('h4').textContent.trim();
      const portrait = source.querySelector('.kl-member-portrait');
      if (portrait) {
        const copy = portrait.cloneNode(true);
        const img = copy.querySelector('img');
        img.loading = 'eager';
        img.alt = '';
        card.append(copy);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'kl-member-portrait kl-region-preview-placeholder';
        placeholder.setAttribute('aria-hidden', 'true');
        placeholder.textContent = name.split(/\s+/).map(part => part[0]).join('');
        card.append(placeholder);
      }
      const label = document.createElement('p');
      label.textContent = name;
      card.append(label);
      return card;
    }));
    region.setAttribute('aria-describedby', preview.id);
    preview.hidden = false;
    position();
  };
  const scheduleClose = () => {
    cancelClose();
    // A short grace period allows movement across the gap into the preview.
    closeTimer = setTimeout(hide, 160);
  };
  regions.forEach(region => {
    region.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'touch') show(region);
    });
    region.addEventListener('pointerleave', scheduleClose);
    region.addEventListener('focus', () => {
      if (region.matches(':focus-visible')) show(region);
    });
    region.addEventListener('blur', scheduleClose);
  });
  preview.addEventListener('pointerenter', cancelClose);
  preview.addEventListener('pointerleave', scheduleClose);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); });
  window.addEventListener('blur', hide);
  const reposition = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(position);
  };
  window.addEventListener('resize', reposition);
  window.addEventListener('scroll', reposition, { passive: true });
})();
