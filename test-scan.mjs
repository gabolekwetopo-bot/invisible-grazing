// Direct test of the scan logic — same endpoints the Vercel function calls.
import { readFileSync } from 'node:fs';

const env = readFileSync('.env', 'utf8');
const clientId = (env.match(/VITE_CDSE_CLIENT_ID=(.+)/) || [])[1];
const clientSecret = (env.match(/VITE_CDSE_CLIENT_SECRET=(.+)/) || [])[1];

if (!clientId || !clientSecret) {
  console.error('Missing CDSE credentials in .env');
  process.exit(1);
}

async function getToken() {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId.trim(),
    client_secret: clientSecret.trim(),
  });
  const r = await fetch('https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!r.ok) throw new Error('Token failed: ' + r.status);
  const j = await r.json();
  return j.access_token;
}

const EVALSCRIPT = `//VERSION=3
function setup() { return { input: [{ bands: ["B04","B08","SCL","dataMask"] }], output: [{ id: "ndvi", bands: 1, sampleType: "FLOAT32" }, { id: "dataMask", bands: 1 }] }; }
function evaluatePixel(s) { var ndvi = (s.B08 - s.B04) / (s.B08 + s.B04); var scl = s.SCL; var clear = (scl !== 3 && scl !== 8 && scl !== 9 && scl !== 10 && scl !== 11); return { ndvi: [ndvi], dataMask: [s.dataMask * (clear ? 1 : 0)] }; }`;

async function fetchNdvi(area, token) {
  const dLat = area.radiusKm / 111;
  const dLon = area.radiusKm / (111 * Math.cos((area.latitude * Math.PI) / 180));
  const bbox = [area.longitude - dLon, area.latitude - dLat, area.longitude + dLon, area.latitude + dLat];
  const to = new Date();
  const from = new Date(Date.now() - 3 * 365 * 86_400_000);
  const body = {
    input: { bounds: { bbox, properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' } }, data: [{ type: 'sentinel-2-l2a', dataFilter: { maxCloudCoverage: 60 } }] },
    aggregation: { timeRange: { from: from.toISOString(), to: to.toISOString() }, aggregationInterval: { of: 'P30D' }, evalscript: EVALSCRIPT },
    calculations: { ndvi: { statistics: { default: {} } } },
  };
  const r = await fetch('https://sh.dataspace.copernicus.eu/api/v1/statistics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error('Sentinel Hub error: ' + r.status);
  const j = await r.json();
  return (j.data || []).filter(r => r.outputs?.ndvi?.bands?.B0?.stats?.mean != null).length;
}

const AREAS = [
  { id: 'seed-kalahari', name: 'Kalahari south transect', latitude: -24.65, longitude: 21.85, radiusKm: 25 },
  { id: 'seed-laikipia', name: 'Laikipia rangeland block', latitude: 0.30, longitude: 36.90, radiusKm: 25 },
  { id: 'seed-nsw', name: 'New South Wales grassland', latitude: -31.50, longitude: 146.20, radiusKm: 25 },
  { id: 'seed-mongolia', name: 'Mongolian steppe plot', latitude: 46.85, longitude: 103.85, radiusKm: 25 },
];

async function main() {
  console.log('Getting CDSE token...');
  const token = await getToken();
  console.log('Token acquired.');
  console.log('');
  for (const area of AREAS) {
    const t0 = Date.now();
    try {
      const usable = await fetchNdvi(area, token);
      console.log(area.name.padEnd(32), 'usable NDVI observations:', usable, '  (' + (Date.now() - t0) + 'ms)');
    } catch (e) {
      console.log(area.name.padEnd(32), 'ERROR:', e.message);
    }
  }
  console.log('');
  console.log('If all four returned observations, the scan function will work on Vercel.');
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
