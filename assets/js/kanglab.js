(() => {
  const toggle = document.querySelector('.kl-menu-toggle');
  const nav = document.getElementById('site-navigation');
  if (!toggle || !nav) return;
  const mobile = window.matchMedia('(max-width: 760px)');
  let open = false;
  function render() {
    toggle.hidden = !mobile.matches;
    nav.hidden = mobile.matches && !open;
    toggle.setAttribute('aria-expanded', String(open && mobile.matches));
    toggle.querySelector('span').textContent = open && mobile.matches ? 'Close' : 'Menu';
  }
  toggle.addEventListener('click', () => { open = !open; render(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && open && mobile.matches) {
      open = false;
      render();
      toggle.focus();
    }
  });
  document.addEventListener('click', event => {
    if (open && !event.target.closest('.kl-header')) { open = false; render(); }
  });
  nav.addEventListener('click', event => {
    if (event.target.closest('a') && mobile.matches) { open = false; render(); }
  });
  mobile.addEventListener('change', () => { open = false; render(); });
  render();
})();

(() => {
  const search = document.getElementById('publication-search');
  if (!search) return;
  const publications = [...document.querySelectorAll('[data-publication]')];
  const empty = document.getElementById('publication-empty');
  const result = document.getElementById('publication-results');
  const clear = document.querySelector('[data-clear-publications]');
  const filter = () => {
    const query = search.value.trim().toLowerCase();
    let visible = 0;
    publications.forEach((paper) => {
      paper.hidden = !paper.dataset.search.includes(query);
      if (!paper.hidden) visible++;
    });
    empty.hidden = visible !== 0;
    clear.hidden = search.value.length === 0;
    result.hidden = !query;
    result.textContent = `${visible} of ${publications.length} publications`;
    const url = new URL(window.location.href);
    if (query) url.searchParams.set('q', search.value.trim());
    else url.searchParams.delete('q');
    window.history.replaceState(null, '', url);
  };
  search.value = new URLSearchParams(window.location.search).get('q') || '';
  search.addEventListener('input', filter);
  clear.addEventListener('click', () => { search.value = ''; filter(); search.focus(); });
  filter();
})();

(() => {
  const field = document.querySelector('[data-resource-search]');
  if (!field) return;
  const search = document.getElementById('resource-search');
  const result = document.getElementById('resource-results');
  const clear = document.querySelector('[data-clear-resources]');
  const groups = [...document.querySelectorAll('.kl-external-group')];
  const entries = groups.flatMap(group => [...group.querySelectorAll('li')]);
  const indexed = entries.map(element => ({ element, text: element.textContent.toLowerCase() }));
  function filter() {
    const words = search.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    let count = 0;
    indexed.forEach(({ element, text }) => {
      element.hidden = !words.every(word => text.includes(word));
      if (!element.hidden) count++;
    });
    groups.forEach(group => { group.hidden = ![...group.querySelectorAll('li')].some(item => !item.hidden); });
    clear.hidden = !search.value;
    result.hidden = words.length === 0;
    result.textContent = count ? `${count} of ${entries.length} resources` : 'No matching resources. Try a different name or topic.';
  }
  search.addEventListener('input', filter);
  clear.addEventListener('click', () => { search.value = ''; filter(); search.focus(); });
  field.hidden = false;
})();

(() => {
  const filters = document.querySelector('[data-news-filters]');
  if (!filters) return;
  const buttons = [...filters.querySelectorAll('[data-news-filter]')];
  const stories = [...document.querySelectorAll('[data-news-category]')];
  const result = document.getElementById('news-results');
  buttons.forEach(button => button.addEventListener('click', () => {
    stories.forEach(story => { story.hidden = !!button.dataset.newsFilter && story.dataset.newsCategory !== button.dataset.newsFilter; });
    buttons.forEach(item => { item.classList.toggle('is-active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
    result.hidden = false;
    result.textContent = `${stories.filter(story => !story.hidden).length} of ${stories.length} stories`;
  }));
  filters.hidden = false;
})();

(() => {
  const controls = [...document.querySelectorAll('[data-software-filter]')];
  const groups = [...document.querySelectorAll('[data-software-group]')];
  controls.forEach(control => control.addEventListener('click', () => {
    groups.forEach(group => { group.hidden = control.dataset.softwareFilter !== 'all' && group.dataset.softwareGroup !== control.dataset.softwareFilter; });
    controls.forEach(button => { const active = button === control; button.classList.toggle('is-active',active); button.setAttribute('aria-pressed',String(active)); });
  }));
})();
