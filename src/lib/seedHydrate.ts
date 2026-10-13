// =============================================================================
// INVISIBLE GRAZING — Seed area hydration
// =============================================================================
// On first load, fetches real Sentinel-2 NDVI and real NASA POWER rainfall for
// each seed area that does not yet have a cached series, then persists the
// result in localStorage. Idempotent: skips areas that are already hydrated.
// =============================================================================

import type { MonitoringArea, ObservationSeries } from '../types';
import { fetchSentinel2Ndvi } from './providers/sentinel2';
import { fetchNasaPowerRainfall } from './providers/nasaPower';

const CACHE_KEY = 'invisible-grazing.seedSeries.v1';

interface CacheShape {
  [areaId: string]: {
    hydratedAt: string;
    series: ObservationSeries[];
  };
}

function loadCache(): CacheShape {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as CacheShape;
  } catch {
    return {};
  }
}

function saveCache(cache: CacheShape): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* quota or disabled storage */
  }
}

const YEARS_BACK = 3;

function dateRange(): { fromIso: string; toIso: string } {
  const to = new Date();
  const from = new Date(Date.now() - YEARS_BACK * 365 * 86_400_000);
  return { fromIso: from.toISOString(), toIso: to.toISOString() };
}

/**
 * For each seed area (demonstration flag must be false and name must start with
 * a known prefix), fetch real data if not yet cached. Returns the areas with
 * series populated where possible.
 */
export async function hydrateSeedAreas(
  areas: MonitoringArea[],
  onProgress?: (msg: string) => void,
): Promise<MonitoringArea[]> {
  const cache = loadCache();
  const { fromIso, toIso } = dateRange();
  const out: MonitoringArea[] = [];

  for (const area of areas) {
    // Only hydrate the four seeds; user-created areas come with their own data.
    const isSeed = area.id.startsWith('seed-');
    if (!isSeed || area.series.length > 0) {
      out.push(area);
      continue;
    }

    const cached = cache[area.id];
    if (cached && cached.series.length > 0) {
      out.push({ ...area, series: cached.series });
      continue;
    }

    onProgress?.(`Fetching real Sentinel-2 NDVI for ${area.name}…`);
    const series: ObservationSeries[] = [];

    try {
      const ndvi = await fetchSentinel2Ndvi(area, { fromIso, toIso });
      const usable = ndvi.observations.filter((o) => o.value != null).length;
      if (usable > 0) series.push(ndvi);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`[IG] Sentinel-2 failed for ${area.name}:`, e);
    }

    onProgress?.(`Fetching real NASA POWER rainfall for ${area.name}…`);
    try {
      const rain = await fetchNasaPowerRainfall(
        area,
        new Date(fromIso).getUTCFullYear(),
      );
      if (rain.observations.length > 0) series.push(rain);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`[IG] NASA POWER failed for ${area.name}:`, e);
    }

    if (series.length > 0) {
      cache[area.id] = { hydratedAt: new Date().toISOString(), series };
      saveCache(cache);
    }

    out.push({ ...area, series });
  }

  return out;
}
