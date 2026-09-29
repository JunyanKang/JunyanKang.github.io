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

