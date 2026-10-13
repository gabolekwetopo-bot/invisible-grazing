// =============================================================================
// INVISIBLE GRAZING — Sentinel-2 NDVI provider (real observations)
// =============================================================================
// Calls the local Vite proxy at /api/cdse/statistics, which injects a CDSE
// OAuth token server-side and forwards the request to Sentinel Hub's
// Statistical API.
//
// Returns real NDVI observations from Sentinel-2 L2A. Cloud, cloud-shadow,
// snow, water, and no-data pixels are masked using the SCL band. Intervals
// with no clear pixels return null values, which the risk engine treats as
// missing data.
//
// Source:     ESA Copernicus Sentinel-2 L2A, via CDSE
// Resolution: 10 m native (mean over the requested bbox)
// Cadence:    5-day revisit, aggregated to 10-day or 30-day intervals here
// =============================================================================

import type { MonitoringArea, Observation, ObservationSeries } from '../../types';

const PROXY_URL = '/api/cdse/statistics';

/** Evaluates NDVI with SCL-based masking. Do not edit without a reason. */
const EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04","B08","SCL","dataMask"] }],
    output: [
      { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function evaluatePixel(s) {
  var ndvi = (s.B08 - s.B04) / (s.B08 + s.B04);
  var scl = s.SCL;
  // SCL classes to mask: 3 = cloud shadow, 8 = cloud medium prob,
  // 9 = cloud high prob, 10 = thin cirrus, 11 = snow/ice
  var clear = (scl !== 3 && scl !== 8 && scl !== 9 && scl !== 10 && scl !== 11);
  return { ndvi: [ndvi], dataMask: [s.dataMask * (clear ? 1 : 0)] };
}`;

interface ShStatsInterval {
  interval: { from: string; to: string };
  outputs: {
    ndvi: {
      bands: {
        B0: {
          stats: {
            mean: number | null;
            stDev?: number;
            sampleCount?: number;
            noDataCount?: number;
          };
        };
      };
    };
  };
}

interface ShStatsResponse {
  data: ShStatsInterval[];
}

/** Build a bbox roughly radiusKm wide around a coordinate. */
function bboxFor(lat: number, lon: number, radiusKm: number): [number, number, number, number] {
  const dLat = radiusKm / 111;
  const dLon = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  return [lon - dLon, lat - dLat, lon + dLon, lat + dLat];
}

/** Decide a sensible aggregation interval for the requested time span. */
function pickInterval(fromIso: string, toIso: string): string {
  const days = (Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000;
  if (days <= 200) return 'P10D';
  if (days <= 800) return 'P30D';
  return 'P30D';
}

/** True when the mean is a usable number (filters NaN and sentinel values). */
function isUsable(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= -1 && v <= 1;
}

export interface FetchNdviOptions {
  fromIso: string;
  toIso: string;
  radiusKm?: number;
  maxCloudCoverage?: number;
}

/**
 * Fetch a real Sentinel-2 NDVI time series for an area.
 * Throws if the proxy or upstream service fails — caller decides fallback.
 */
export async function fetchSentinel2Ndvi(
  area: MonitoringArea,
  opts: FetchNdviOptions,
): Promise<ObservationSeries> {
  const radiusKm = opts.radiusKm ?? area.radiusKm ?? 25;
  const bbox = bboxFor(area.latitude, area.longitude, radiusKm);
  const interval = pickInterval(opts.fromIso, opts.toIso);

  const payload = {
    input: {
      bounds: {
        bbox,
        properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' },
      },
      data: [
        {
          type: 'sentinel-2-l2a',
          dataFilter: { maxCloudCoverage: opts.maxCloudCoverage ?? 60 },
        },
      ],
    },
    aggregation: {
      timeRange: { from: opts.fromIso, to: opts.toIso },
      aggregationInterval: { of: interval },
      evalscript: EVALSCRIPT,
    },
    calculations: {
      ndvi: { statistics: { default: {} } },
    },
  };

  const resp = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Sentinel-2 request failed: HTTP ${resp.status} ${text.slice(0, 200)}`);
  }

  const json = (await resp.json()) as ShStatsResponse;
  const observations: Observation[] = (json.data ?? []).map((row) => {
    const stats = row.outputs?.ndvi?.bands?.B0?.stats;
    const mean = stats?.mean;
    const sampleCount = stats?.sampleCount ?? 0;
    const noData = stats?.noDataCount ?? 0;
    // Guard against NaN and out-of-range values. The API returns NaN when
    // every pixel in the interval was masked out.
    const usable = isUsable(mean);
    return {
      date: row.interval.from.slice(0, 10),
      value: usable ? Number((mean as number).toFixed(4)) : null,
      quality:
        !usable ? 'poor'
        : sampleCount === 0 || noData > sampleCount * 0.8 ? 'fair'
        : 'good',
    };
  });

  return {
    sourceId: 'sentinel-2',
    indicator: 'NDVI',
    unit: 'index',
    observations,
    limitations:
      'Sentinel-2 L2A surface reflectance, aggregated to the requested interval. ' +
      'Clouds, cloud shadows, snow and water are masked using the SCL band; ' +
      'intervals with no clear pixels return null. The mean is computed over a ' +
      `~${radiusKm} km radius around the selected coordinate.`,
  };
}
