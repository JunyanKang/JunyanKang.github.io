(() => {
  const search = document.getElementById('publication-search');
  if (!search) return;
  const publications = [...document.querySelectorAll('[data-publication]')];
  const empty = document.getElementById('publication-empty');
  const filter = () => {
    const query = search.value.trim().toLowerCase();
    let visible = 0;
    publications.forEach((paper) => {
      paper.hidden = !paper.dataset.search.includes(query);
      if (!paper.hidden) visible++;
    });
    empty.hidden = visible !== 0;
  };
  search.value = new URLSearchParams(window.location.search).get('q') || '';
  search.addEventListener('input', filter);
  filter();
})();

(() => {
  const controls = [...document.querySelectorAll('[data-software-filter]')];
  const groups = [...document.querySelectorAll('[data-software-group]')];
  controls.forEach(control => control.addEventListener('click', () => {
    groups.forEach(group => { group.hidden = control.dataset.softwareFilter !== 'all' && group.dataset.softwareGroup !== control.dataset.softwareFilter; });
    controls.forEach(button => { const active = button === control; button.classList.toggle('is-active',active); button.setAttribute('aria-pressed',String(active)); });
  }));
})();
