import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const data = JSON.parse(await readFile(new URL('assets/geo/china-provinces.geojson', root), 'utf8'));
const names = JSON.parse(await readFile(new URL('_data/region_names_en.json', root), 'utf8'));
const mercator = lat => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) * 180 / Math.PI;
const project = ([lon, lat]) => [30 + (lon - 73) * 14.7, 25 + (mercator(54) - mercator(lat)) * 14.7];
const inset = ([lon, lat]) => [807 + (lon - 105) * 7, 435 + (mercator(25) - mercator(lat)) * 7];
const path = (rings, projection) => rings.map(ring => ring.map((p,i) => `${i ? 'L' : 'M'}${projection(p).map(v=>v.toFixed(2)).join(',')}`).join('') + 'Z').join('');
const regions = data.features.map(f => {
  const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const mainland = [], sea = [];
  // Preserve every source polygon, including islands and the maritime inset.
  for(const polygon of polygons) (polygon[0].some(p=>p[1]<18) ? sea : mainland).push(polygon);
  const center = f.properties.centroid || f.properties.center;
  const [x,y] = center ? project(center) : [0,0];
  const code = String(f.properties.adcode);
  if (!names[code]) throw new Error(`Missing English region name: ${code}`);
  return {code,name:names[code],x,y,
    path:mainland.map(p=>path(p,project)).join(''),sea:sea.map(p=>path(p,inset)).join('')};
});
await writeFile(new URL('_data/china_map.json', root), JSON.stringify({regions})+'\n');
