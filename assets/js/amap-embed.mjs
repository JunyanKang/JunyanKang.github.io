export function parseLocation(value) {
  const parts = String(value).split(',');
  const coordinates = parts.map(Number);
  if (coordinates.length !== 2 || coordinates.some(n => !Number.isFinite(n)) ||
      Math.abs(coordinates[0]) > 180 || Math.abs(coordinates[1]) > 90 || parts.some(part => !part.trim())) {
    throw new Error('Invalid map coordinates');
  }
  return coordinates;
}

export function loadAMap(key) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(() => reject(new Error('Map loading timed out')), 15000);
    window.kangLabAMapReady = () => { clearTimeout(timer); resolve(window.AMap); };
    script.onerror = () => { clearTimeout(timer); reject(new Error('Map service unavailable')); };
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}&callback=kangLabAMapReady`;
    document.head.append(script);
  });
}

export async function initAMap() {
  const body = document.body;
  const status = document.querySelector('.map-status');
  const retry = document.querySelector('[data-retry]');
  retry.addEventListener('click', () => location.reload());
  let renderTimer;
  const showError = () => {
    clearTimeout(renderTimer);
    status.hidden = false;
    status.querySelector('span').textContent = 'Map unavailable. Retry or open in AMap.';
    retry.hidden = false;
    body.dataset.mapState = 'error';
  };
  try {
    const center = parseLocation(body.dataset.location);
    const AMap = await loadAMap(body.dataset.jsKey);
    const map = new AMap.Map('amap', {center, zoom:16, dragEnable:true, zoomEnable:true, scrollWheel:true, viewMode:'2D'});
    renderTimer = setTimeout(showError, 20000);
    map.on('complete', () => {clearTimeout(renderTimer); status.hidden = true; body.dataset.mapState = 'ready';});
    map.on('error', showError);
    map.add(new AMap.Marker({position:center, title:'Kang Lab',content:'<span class="lab-pin"></span>',offset:new AMap.Pixel(-11,-27)}));
    const satellite = new AMap.TileLayer.Satellite();
    const roads = new AMap.TileLayer.RoadNet();
    const layerButton = document.querySelector('[data-satellite]');
    let satelliteOn = false;
    layerButton.addEventListener('click', () => {
      satelliteOn = !satelliteOn;
      if (satelliteOn) map.add([satellite, roads]);
      else map.remove([satellite, roads]);
      layerButton.setAttribute('aria-pressed', String(satelliteOn));
      layerButton.textContent = satelliteOn ? 'Street map' : 'Satellite';
    });
    document.querySelector('[data-zoom="in"]').addEventListener('click', () => map.zoomIn());
    document.querySelector('[data-zoom="out"]').addEventListener('click', () => map.zoomOut());
    document.querySelector('[data-reset]').addEventListener('click', () => map.setZoomAndCenter(16, center));
    document.querySelectorAll('button[disabled]').forEach(button => {button.disabled = false;});
    // Keep runtime view state inspectable for pan/zoom regression checks without exposing SDK internals.
    const recordView = () => {const point = map.getCenter(); body.dataset.mapCenter = `${point.lng},${point.lat}`; body.dataset.mapZoom = String(map.getZoom());};
    map.on('moveend', recordView);
    map.on('zoomend', recordView);
    recordView();
  } catch {showError();}
}

if (typeof document !== 'undefined') initAMap();
