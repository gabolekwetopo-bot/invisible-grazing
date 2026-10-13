import { fromUrl } from 'geotiff';

const STAC_SEARCH = 'https://stac.dataspace.copernicus.eu/v1/search';

async function pickCogUrl(item) {
  if (!item.assets) return null;
  const ranked = [];
  for (const [key, asset] of Object.entries(item.assets)) {
    if (key.toLowerCase().includes('thumbnail')) continue;
    if (key.toLowerCase().includes('overview')) continue;
    const href = asset.href ?? '';
    if (/\.tiff?$/i.test(href) || /geotiff/i.test(asset.type ?? '')) {
      ranked.push({ key, href, type: asset.type, roles: asset.roles });
    }
  }
  return ranked[0] ?? null;
}

async function inspectCog(cogUrl, lat, lon) {
  const tiff = await fromUrl(cogUrl, { allowFullFile: false });
  try {
    const image = await tiff.getImage();
    const [minX, minY, maxX, maxY] = image.getBoundingBox();
    const width = image.getWidth();
    const height = image.getHeight();
    const samplesPerPixel = image.getSamplesPerPixel();
    const px = Math.floor(((lon - minX) / (maxX - minX)) * width);
    const py = Math.floor(((maxY - lat) / (maxY - minY)) * height);
    if (px < 0 || px >= width || py < 0 || py >= height) {
      return { outOfBounds: true, px, py, width, height };
    }
    const rasters = await image.readRasters({
      window: [px, py, px + 1, py + 1],
      samples: [0],
    });
    const value = rasters[0]?.[0];
    return { value, px, py, width, height, samplesPerPixel };
  } finally {
    await tiff.close();
  }
}

async function main() {
  // Use a region with certain fires: Botswana Okavango in 2024, or northern Australia.
  // Try Okavango Delta — seasonal burns every dry season.
  const lat = -19.50;
  const lon = 22.90;
  const radiusKm = 25;
  const dLat = radiusKm / 111;
  const dLon = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  const bbox = [lon - dLon, lat - dLat, lon + dLon, lat + dLat];

  console.log('Testing coordinate:', lat, lon, '(Okavango Delta)');
  console.log('bbox:', bbox.map(n => n.toFixed(4)).join(', '));

  const body = {
    collections: ['clms_ba_global_300m_daily_v3_cog'],
    bbox,
    datetime: '2024-01-01T00:00:00Z/2025-12-31T23:59:59Z',
    limit: 40,
  };

  const res = await fetch(STAC_SEARCH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  const items = json.features ?? [];
  console.log('Products returned:', items.length);

  // Print the first product's asset list so we can see what URLs are available.
  if (items[0]) {
    console.log('\nFirst product assets:');
    for (const [k, v] of Object.entries(items[0].assets ?? {})) {
      console.log('  ', k, '→', v.href?.slice(0, 120));
    }
    console.log('First product id:', items[0].id);
    console.log('First product datetime:', items[0].properties?.datetime);
  }

  // Sample the first 15 products: print the raw pixel value we read.
  console.log('\nSampling first 15 products:');
  let checked = 0;
  let nonZero = 0;
  for (const item of items) {
    const pick = await pickCogUrl(item);
    if (!pick) continue;
    checked += 1;
    try {
      const r = await inspectCog(pick.href, lat, lon);
      const v = 'value' in r ? r.value : '(oob)';
      console.log(
        `  ${item.properties.datetime?.slice(0, 10)}  val=${v}  px=${r.px},${r.py}  size=${r.width}x${r.height}  spp=${r.samplesPerPixel}`,
      );
      if (typeof v === 'number' && v > 0) nonZero += 1;
    } catch (e) {
      console.log(`  ${item.properties.datetime?.slice(0, 10)}  ERROR: ${e.message}`);
    }
    if (checked >= 15) break;
  }
  console.log(`\nChecked ${checked}, non-zero values: ${nonZero}`);
}

main().catch(e => { console.error('ERROR:', e); process.exit(1); });
