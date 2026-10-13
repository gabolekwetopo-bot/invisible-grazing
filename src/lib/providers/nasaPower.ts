// =============================================================================
// INVISIBLE GRAZING — NASA POWER provider (real, keyless)
// =============================================================================
// Returns monthly precipitation (PRECTOTCORR) from NASA POWER. No API key.
// Docs: https://power.larc.nasa.gov/docs/services/api/
// =============================================================================

import type { MonitoringArea, ObservationSeries } from '../../types';

const BASE = 'https://power.larc.nasa.gov/api/temporal/monthly/point';

interface NasaPowerMonthlyResponse {
  properties?: { parameter?: { PRECTOTCORR?: Record<string, number> } };
}

function powerKeyToIso(key: string): string | null {
  if (!/^\d{6}$/.test(key)) return null;
  return `${key.slice(0, 4)}-${key.slice(4, 6)}-15`;
}

/**
 * Fetch monthly precipitation for an area from NASA POWER.
 * The monthly endpoint expects start/end as YYYY, not YYYYMMDD.
 */
export async function fetchNasaPowerRainfall(
  area: MonitoringArea,
  startYear = 2019,
  endYear = new Date().getFullYear(),
): Promise<ObservationSeries> {
  const params = new URLSearchParams({
    parameters: 'PRECTOTCORR',
    community: 'AG',
    longitude: String(area.longitude),
    latitude: String(area.latitude),
    start: String(startYear),
    end: String(endYear),
    format: 'JSON',
  });

  const url = `${BASE}?${params.toString()}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`NASA POWER request failed: HTTP ${res.status}`);

  const data = (await res.json()) as NasaPowerMonthlyResponse;
  const raw = data.properties?.parameter?.PRECTOTCORR;
  if (!raw) throw new Error('NASA POWER response did not include PRECTOTCORR.');

  const observations = Object.entries(raw)
    .map(([key, value]) => {
      const date = powerKeyToIso(key);
      if (!date) return null;
      const v = value === -999 ? null : value;
      return { date, value: v, quality: 'good' as const };
    })
    .filter((o): o is { date: string; value: number | null; quality: 'good' } => o !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    sourceId: 'nasa-power',
    indicator: 'Rainfall',
    unit: 'mm',
    observations,
    limitations:
      'NASA POWER monthly precipitation (PRECTOTCORR), 0.5° × 0.625° grid. ' +
      'Reanalysed, not station-measured. Use as climate context.',
  };
}
