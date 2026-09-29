import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const contact = JSON.parse(await readFile(`${root}/_data/contact.json`, 'utf8'));
const key = process.env.AMAP_WEB_SERVICE_KEY;
const imagePath = `${root}/assets/maps/contact-amap.png`;
const metadataPath = `${root}/_data/contact_map.json`;

// Never log request URLs or upstream bodies: they may contain credentials.
async function request(endpoint, params) {
  const url = new URL(`https://restapi.amap.com/v3/${endpoint}`);
  url.search = new URLSearchParams({ ...params, key });
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error();
    return response;
  } catch {
    throw new Error(`AMap ${endpoint} request failed. Check service availability and key permissions.`);
  }
}

await rm(imagePath, { force: true });
await writeFile(metadataPath, JSON.stringify({ available: false, address: contact.address_zh }));
if (!key) {
  if (process.env.REQUIRE_CONTACT_MAP === 'true') throw new Error('AMAP_WEB_SERVICE_KEY is required for production publication.');
  console.log('No AMap key: building a navigation-link fallback for local/PR preview.');
} else {
  const response = await request('geocode/geo', { address: contact.address_zh });
  const result = await response.json();
  if (result.status !== '1') throw new Error('AMap address lookup failed. Check key permissions and quota.');
  const matches = result.geocodes || [];
  const location = matches.find(item => item.level === '门牌号') || matches.find(item => item.level === '门址');
  if (!location || !/^\d+(\.\d+)?,\d+(\.\d+)?$/.test(location.location)) {
    throw new Error('AMap could not resolve a street address. Review the CMS contact address before publishing.');
  }
  const map = await request('staticmap', {
    location: location.location, zoom: '15', size: '750*400', scale: '2',
    markers: `large,0xD7443E,A:${location.location}`,
  });
  const bytes = Buffer.from(await map.arrayBuffer());
  if (!map.headers.get('content-type')?.startsWith('image/png') || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
    throw new Error('AMap did not return a PNG map. Check static-map permissions and quota.');
  }
  await mkdir(`${root}/assets/maps`, { recursive: true });
  // Preserve the original map, including its attribution and approval number.
  await writeFile(imagePath, bytes);
  await writeFile(metadataPath, JSON.stringify({
    available: true, address: contact.address_zh, location: location.location,
    image: '/assets/maps/contact-amap.png', generated_at: new Date().toISOString(),
  }, null, 2));
  console.log('Contact map generated; no credentials are included in the published assets.');
}
