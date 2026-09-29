export function providerForCountry(country) {
  return country === 'CN' || !country ? 'amap' : 'google';
}

export function mapLinks(provider, address, location = '') {
  const query = encodeURIComponent(address);
  if (provider === 'google') return {
    embed: `https://maps.google.com/maps?q=${query}&output=embed`,
    directions: `https://www.google.com/maps/dir/?api=1&destination=${query}`,
    name: 'Google Maps',
  };
  return {
    directions: /^\d+(\.\d+)?,\d+(\.\d+)?$/.test(location)
      ? `https://uri.amap.com/marker?position=${location}&name=${query}&coordinate=gaode&callnative=0&src=KangLab`
      : `https://uri.amap.com/search?keyword=${query}&view=map&src=KangLab&callnative=0`,
    name: 'AMap',
  };
}

export async function lookupCountry(fetcher = fetch, timeoutMs = 3000) {
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      (async () => {
        const response = await fetcher('https://api.country.is/', {
          signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer',
        });
        if (!response.ok) return null;
        const { country } = await response.json();
        return typeof country === 'string' && /^[A-Z]{2}$/.test(country) ? country : null;
      })(),
      new Promise(resolve => { timer = setTimeout(() => { controller.abort(); resolve(null); }, timeoutMs); }),
    ]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function initContactMap(root, fetcher = fetch) {
  const select = root.querySelector('select');
  const preview = root.querySelector('[data-amap-preview]');
  const google = root.querySelector('[data-google-map]');
  const status = root.querySelector('[data-map-status]');
  let country = null;
  function render() {
    const provider = select.value === 'auto' ? providerForCountry(country) : select.value;
    const links = mapLinks(provider, root.dataset.address, root.dataset.location);
    preview.hidden = provider !== 'amap';
    google.hidden = provider !== 'google';
    if (provider === 'google' && !google.hasAttribute('src')) google.src = links.embed;
    status.textContent = select.value === 'auto'
      ? `Auto · ${links.name}${country ? '' : ' (default)'}` : links.name;
    root.dataset.provider = provider;
  }
  select.addEventListener('change', render);
  render();
  country = await lookupCountry(fetcher);
  render();
}

if (typeof document !== 'undefined') {
  const root = document.querySelector('[data-contact-map]');
  if (root) initContactMap(root);
}
