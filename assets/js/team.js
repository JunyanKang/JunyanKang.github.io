(() => {
  const controls = [...document.querySelectorAll('[data-region]')];
  const cards = [...document.querySelectorAll('[data-member-region]')];
  const groups = [...document.querySelectorAll('[data-member-group]')];
  const status = document.getElementById('team-filter-status');
  if (!cards.length) return;
  const select = control => {
    const region = control.dataset.region;
    let count = 0;
    cards.forEach(card => { card.hidden = region !== 'all' && card.dataset.memberRegion !== region; if (!card.hidden) count++; });
    groups.forEach(group => {
      const hasMembers = [...group.querySelectorAll('[data-member-region]')].some(card => !card.hidden);
      const showEmptyAlumni = region === 'all' && group.dataset.memberGroup === 'alumni' && group.querySelector('[data-empty-member-group]');
      group.hidden = !hasMembers && !showEmptyAlumni;
    });
    controls.forEach(button => { const active = button.dataset.region === region; button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active)); });
    status.textContent = `${region === 'all' ? 'All regions' : control.dataset.regionName} · ${count} members`;
  };
  controls.forEach(control => {
    control.addEventListener('click', () => select(control));
    if(control.tagName.toLowerCase() !== 'button') control.addEventListener('keydown', event => { if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(control); } });
  });
})();
