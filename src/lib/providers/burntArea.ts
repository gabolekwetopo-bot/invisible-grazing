// =============================================================================
// INVISIBLE GRAZING — Copernicus Burnt Area provider (real pixel read)
// =============================================================================
// Reads the day-of-burn (dob_nrt) band from Copernicus Burnt Area COG rasters
// at a specific coordinate. Returns the actual dates on which fire was recorded
// inside the monitoring area, or an empty list if none.
//
// Source: Copernicus Land Monitoring Service Burnt Area v3
// Endpoint: STAC catalogue at stac.dataspace.copernicus.eu/v1
// Product: 300 m global daily, since July 2023
// Method: single-pixel read via HTTP range requests (geotiff.js)
// =============================================================================

import { fromUrl } from 'geotiff';
import type { MonitoringArea } from '../../types';

const STAC_SEARCH = 'https://stac.dataspace.copernicus.eu/v1/search';
const BURNT_AREA_COLLECTION = 'clms_ba_global_300m_daily_v3_cog';

export interface BurnScarHit {
  productId: string;
  productDate: string;
  dayOfBurn: number;
  /** ISO date derived from the day-of-year value in the raster. */
  burnDateIso: string;
  cogUrl: string;
}

export interface BurntAreaResult {
  query: {
    areaId: string;
    latitude: number;
    longitude: number;
    radiusKm: number;
    fromIso: string;
    toIso: string;
    productsScanned: number;
  };
  hits: BurnScarHit[];
  earliestBurn: string | null;
  latestBurn: string | null;
  totalBurns: number;
  limitations: string;
}

interface StacItem {
  id: string;
  bbox: number[];
  properties: { datetime?: string };
  assets?: Record<string, { href: string; type?: string; roles?: string[] }>;
}

function polygonFor(lat: number, lon: number, radiusKm: number): string {
  const dLat = radiusKm / 111;
  const dLon = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  const w = lon - dLon;
  const e = lon + dLon;
  const s = lat - dLat;
  const n = lat + dLat;
  return `${w} ${s},${e} ${s},${e} ${n},${w} ${n},${w} ${s}`;
}

/** Pick the COG asset URL from a STAC item. */
function pickCogUrl(item: StacItem): string | null {
  if (!item.assets) return null;
  // Prefer assets whose href ends in .tif or is type geotiff; skip thumbnails.
  for (const [key, asset] of Object.entries(item.assets)) {
    if (key.toLowerCase().includes('thumbnail')) continue;
    if (key.toLowerCase().includes('overview')) continue;
    const href = asset.href ?? '';
    if (/\.tiff?$/i.test(href) || /geotiff/i.test(asset.type ?? '')) {
      return href;
    }
  }
  return null;
}

/** Convert (year, day-of-year) into an ISO date string. */
function dayOfYearToIso(year: number, doy: number): string {
  const d = new Date(Date.UTC(year, 0, 1));
  d.setUTCDate(d.getUTCDate() + (doy - 1));
  return d.toISOString().slice(0, 10);
}

/**
 * Read the day-of-burn pixel at a coordinate from a remote COG.
 * Returns -1 (nodata) if no fire, otherwise the day-of-year (1-366).
 * Returns null if the pixel is outside the raster footprint or unreadable.
 */
async function readDayOfBurn(cogUrl: string, lat: number, lon: number): Promise<number | null> {
  // geotiff.js needs to open the COG and read the band metadata first.
  const tiff = await fromUrl(cogUrl, {
    // Some CDSE assets require a browser-friendly CORS mode; fetch defaults work.
    allowFullFile: false,
  });
  try {
    const image = await tiff.getImage();
    const bbox = image.getBoundingBox(); // [minX, minY, maxX, maxY]
    const [minX, minY, maxX, maxY] = bbox;

    // Determine pixel column/row for the coordinate.
    const width = image.getWidth();
    const height = image.getHeight();

    // The BA product is EPSG:4326, so lon/lat map linearly to pixel space.
    const px = Math.floor(((lon - minX) / (maxX - minX)) * width);
    const py = Math.floor(((maxY - lat) / (maxY - minY)) * height);

    if (px < 0 || px >= width || py < 0 || py >= height) return null;

    // Read a 1x1 window.
    const rasters = await image.readRasters({
      window: [px, py, px + 1, py + 1],
      samples: [0],
    });
    const r = rasters as unknown as { [n: number]: ArrayLike<number> };
    const value = r[0]?.[0];
    if (typeof value !== 'number') return null;
    // -1 is the documented nodata value; 0 or missing also means no burn.
    if (value <= 0) return null;
    return value;
  } finally {
    await tiff.close();
  }
}

/**
 * Query the STAC catalogue, then verify by reading the actual raster pixel at
 * the given coordinate. Only products with a real day-of-burn value inside the
 * area become hits.
 */
export async function fetchBurntAreaHistory(
  area: MonitoringArea,
  fromIso: string,
  toIso: string,
): Promise<BurntAreaResult> {
  const radiusKm = area.radiusKm ?? 25;
  const dLat = radiusKm / 111;
  const dLon = radiusKm / (111 * Math.cos((area.latitude * Math.PI) / 180));
  const bbox: [number, number, number, number] = [
    area.longitude - dLon,
    area.latitude - dLat,
    area.longitude + dLon,
    area.latitude + dLat,
  ];

  const body = {
    collections: [BURNT_AREA_COLLECTION],
    bbox,
    datetime: `${fromIso}/${toIso}`,
    limit: 200,
  };

  const res = await fetch(STAC_SEARCH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Burnt area STAC query failed: HTTP ${res.status}`);
  }
  const json = (await res.json()) as { features?: StacItem[] };
  const items = json.features ?? [];

  const hits: BurnScarHit[] = [];
  let scanned = 0;

  for (const item of items) {
    const cogUrl = pickCogUrl(item);
    if (!cogUrl) continue;
    scanned += 1;

    const productDate = (item.properties.datetime ?? '').slice(0, 10);
    const year = Number(productDate.slice(0, 4));
    if (!year) continue;

    let dob: number | null;
    try {
      dob = await readDayOfBurn(cogUrl, area.latitude, area.longitude);
    } catch {
      // A single unreadable product should not fail the whole query.
      continue;
    }
    if (dob == null) continue;

    hits.push({
      productId: item.id,
      productDate,
      dayOfBurn: dob,
      burnDateIso: dayOfYearToIso(year, dob),
      cogUrl,
    });
  }

  hits.sort((a, b) => a.burnDateIso.localeCompare(b.burnDateIso));

  return {
    query: {
      areaId: area.id,
      latitude: area.latitude,
      longitude: area.longitude,
      radiusKm,
      fromIso,
      toIso,
      productsScanned: scanned,
    },
    hits,
    earliestBurn: hits[0]?.burnDateIso ?? null,
    latestBurn: hits[hits.length - 1]?.burnDateIso ?? null,
    totalBurns: hits.length,
    limitations:
      'Copernicus Land Monitoring Service Burnt Area v3, 300 m, daily since July 2023. ' +
      'A recorded day-of-burn means fire was detected in the 300 m pixel containing this ' +
      'coordinate, not necessarily across the whole monitoring radius. Very small or ' +
      'low-intensity fires may be missed by the 300 m product.',
  };
}

// Silence unused import warning for environments that compile before bundling.
export const _polygonFor = polygonFor;
