// =============================================================================
// GET /api/scan — daily scheduled scan (global watchlist)
// =============================================================================
// Scans the four seed areas plus 40 real rangeland sites from the global
// watchlist, in parallel batches. Any site whose risk level escalates to
// Moderate or High appears in the alert feed served by /api/state.
//
// Triggered by Vercel Cron at 06:00 UTC daily.
// =============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getCdseToken } from './_cdseAuth.js';
import { readState, writeState, type AreaState, type ScanAlert } from './_scanState.js';
import { GLOBAL_WATCHLIST } from './_watchlist.js';

export const config = { maxDuration: 60 }; // 44 sites at concurrency 3 ≈ 60 s, retry adds margin

const SEEDS: Array<Pick<AreaState, 'areaId' | 'areaName' | 'region' | 'latitude' | 'longitude' | 'radiusKm'>> = [
  { areaId: 'seed-kalahari', areaName: 'Kalahari south transect', region: 'Southern African semi-arid savanna', latitude: -24.65, longitude: 21.85, radiusKm: 25 },
  { areaId: 'seed-laikipia', areaName: 'Laikipia rangeland block', region: 'East African highland rangeland', latitude: 0.30, longitude: 36.90, radiusKm: 25 },
  { areaId: 'seed-nsw',      areaName: 'New South Wales grassland', region: 'Australian semi-arid grassland', latitude: -31.50, longitude: 146.20, radiusKm: 25 },
  { areaId: 'seed-mongolia', areaName: 'Mongolian steppe plot',     region: 'Central Asian cold steppe',     latitude: 46.85, longitude: 103.85, radiusKm: 25 },
];

const ALL_SITES = [
  ...SEEDS,
  ...GLOBAL_WATCHLIST.map((w) => ({
    areaId: w.id,
    areaName: w.name,
    region: w.region,
    latitude: w.latitude,
    longitude: w.longitude,
    radiusKm: w.radiusKm,
  })),
];

const EVALSCRIPT = `//VERSION=3
function setup() { return { input: [{ bands: ["B04","B08","SCL","dataMask"] }], output: [{ id: "ndvi", bands: 1, sampleType: "FLOAT32" }, { id: "dataMask", bands: 1 }] }; }
function evaluatePixel(s) {
  var ndvi = (s.B08 - s.B04) / (s.B08 + s.B04);
  var scl = s.SCL;
  var clear = (scl !== 3 && scl !== 8 && scl !== 9 && scl !== 10 && scl !== 11);
  return { ndvi: [ndvi], dataMask: [s.dataMask * (clear ? 1 : 0)] };
}`;

function bboxFor(lat: number, lon: number, radiusKm: number): [number, number, number, number] {
  const dLat = radiusKm / 111;
  const dLon = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  return [lon - dLon, lat - dLat, lon + dLon, lat + dLat];
}

type Obs = { date: string; value: number | null };

async function fetchNdvi(area: { latitude: number; longitude: number; radiusKm: number }, token: string): Promise<Obs[]> {
  // Retry once on 429 after a short delay. The CDSE free tier occasionally
  // rate-limits parallel requests even when we are inside the concurrency cap.
  try {
    return await fetchNdviOnce(area, token);
  } catch (e) {
    const msg = String(e);
    if (msg.includes('429')) {
      await new Promise((r) => setTimeout(r, 3500));
      return await fetchNdviOnce(area, token);
    }
    throw e;
  }
}

async function fetchNdviOnce(area: { latitude: number; longitude: number; radiusKm: number }, token: string): Promise<Obs[]> {
  const to = new Date();
  const from = new Date(Date.now() - 3 * 365 * 86_400_000);
  const body = {
    input: {
      bounds: { bbox: bboxFor(area.latitude, area.longitude, area.radiusKm), properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' } },
      data: [{ type: 'sentinel-2-l2a', dataFilter: { maxCloudCoverage: 60 } }],
    },
    aggregation: { timeRange: { from: from.toISOString(), to: to.toISOString() }, aggregationInterval: { of: 'P30D' }, evalscript: EVALSCRIPT },
    calculations: { ndvi: { statistics: { default: {} } } },
  };
  const res = await fetch('https://sh.dataspace.copernicus.eu/api/v1/statistics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Sentinel Hub HTTP ${res.status}`);
  const json = (await res.json()) as { data?: Array<{ interval: { from: string }; outputs: { ndvi: { bands: { B0: { stats: { mean: number | null } } } } } }> };
  return (json.data ?? [])
    .map((r) => ({ date: r.interval.from.slice(0, 10), value: r.outputs?.ndvi?.bands?.B0?.stats?.mean ?? null }))
    .filter((o) => typeof o.value === 'number' && Number.isFinite(o.value));
}

async function fetchRainfall(area: { latitude: number; longitude: number }): Promise<Obs[]> {
  const from = new Date(Date.now() - 3 * 365 * 86_400_000).getUTCFullYear();
  const to = new Date().getUTCFullYear();
  const url = 'https://power.larc.nasa.gov/api/temporal/monthly/point?' + new URLSearchParams({
    parameters: 'PRECTOTCORR', community: 'AG',
    longitude: String(area.longitude), latitude: String(area.latitude),
    start: String(from), end: String(to), format: 'JSON',
  }).toString();
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`NASA POWER HTTP ${res.status}`);
  const json = (await res.json()) as { properties?: { parameter?: { PRECTOTCORR?: Record<string, number> } } };
  const raw = json.properties?.parameter?.PRECTOTCORR ?? {};
  const obs: Obs[] = [];
  for (const [key, v] of Object.entries(raw)) {
    if (!/^\d{6}$/.test(key)) continue;
    obs.push({ date: `${key.slice(0,4)}-${key.slice(4,6)}-15`, value: v === -999 ? null : v });
  }
  obs.sort((a, b) => a.date.localeCompare(b.date));
  return obs;
}

type RiskLevel = 'low' | 'moderate' | 'high' | 'insufficient';

function mean(xs: number[]): number | null {
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function assess(ndvi: Obs[], rainfall: Obs[]): { level: RiskLevel; headline: string; evidence: string } {
  const usable = ndvi.filter((o) => o.value != null);
  if (usable.length < 6) {
    return { level: 'insufficient', headline: 'Insufficient observations for a reliable assessment.', evidence: `${usable.length} usable NDVI observations` };
  }
  const sorted = [...usable].sort((a, b) => a.date.localeCompare(b.date));
  const latest = new Date(sorted[sorted.length - 1].date);
  const cutoff = new Date(latest);
  cutoff.setMonth(cutoff.getMonth() - 12);
  const recent = sorted.filter((o) => new Date(o.date) >= cutoff).map((o) => o.value as number);
  const baseline = sorted.filter((o) => new Date(o.date) < cutoff).map((o) => o.value as number);
  const recentMean = mean(recent);
  const baselineMean = mean(baseline);
  const delta = recentMean != null && baselineMean != null ? recentMean - baselineMean : null;

  let rainfallDeficit = false;
  const rainUsable = rainfall.filter((o) => o.value != null);
  if (rainUsable.length) {
    const rLatest = new Date(rainUsable[rainUsable.length - 1].date);
    const rCut = new Date(rLatest);
    rCut.setMonth(rCut.getMonth() - 12);
    const rRecentMean = mean(rainUsable.filter((o) => new Date(o.date) >= rCut).map((o) => o.value as number));
    const rBaseMean = mean(rainUsable.filter((o) => new Date(o.date) < rCut).map((o) => o.value as number));
    if (rRecentMean != null && rBaseMean != null && rBaseMean > 0) {
      rainfallDeficit = (rRecentMean - rBaseMean) / rBaseMean < -0.15;
    }
  }

  let level: RiskLevel = 'low';
  let headline = 'Vegetation appears broadly stable over the assessment window.';
  if (delta != null && delta <= -0.10) {
    level = 'high';
    headline = rainfallDeficit
      ? 'Severe vegetation decline coinciding with a rainfall deficit.'
      : 'Severe vegetation decline with no clear rainfall explanation.';
  } else if (delta != null && delta <= -0.05) {
    level = 'moderate';
    headline = rainfallDeficit
      ? 'Material vegetation decline coinciding with reduced rainfall.'
      : 'Material vegetation decline — investigate potential causes.';
  } else if (delta != null && delta >= 0.05) {
    level = 'low';
    headline = 'Vegetation has improved relative to the baseline period.';
  }

  const evidence = `NDVI change last 12 months: ${delta == null ? 'n/a' : delta.toFixed(3)} (baseline ${baselineMean?.toFixed(3) ?? 'n/a'}, recent ${recentMean?.toFixed(3) ?? 'n/a'})`;
  return { level, headline, evidence };
}

const SEVERITY: Record<RiskLevel, number> = { insufficient: 0, low: 1, moderate: 2, high: 3 };

async function scanOne(
  spec: { areaId: string; areaName: string; region?: string; latitude: number; longitude: number; radiusKm: number },
  token: string,
): Promise<{ area: AreaState; alert?: ScanAlert }> {
  let ndvi: Obs[] = [];
  let rainfall: Obs[] = [];
  try { ndvi = await fetchNdvi(spec, token); } catch (e) { console.warn(`[scan] NDVI ${spec.areaId}:`, e); }
  try { rainfall = await fetchRainfall(spec); } catch (e) { console.warn(`[scan] rain ${spec.areaId}:`, e); }

  const { level, headline, evidence } = assess(ndvi, rainfall);
  const nowIso = new Date().toISOString();

  const area: AreaState = {
    areaId: spec.areaId,
    areaName: spec.areaName,
    region: spec.region,
    latitude: spec.latitude,
    longitude: spec.longitude,
    radiusKm: spec.radiusKm,
    lastRiskLevel: level,
    lastNdvi: ndvi.length ? (ndvi[ndvi.length - 1].value as number) : null,
    lastRainfall: rainfall.length ? (rainfall[rainfall.length - 1].value as number) : null,
    lastScanAt: nowIso,
  };

  return {
    area,
    alert: {
      id: `${spec.areaId}-${nowIso}`,
      areaId: spec.areaId,
      areaName: spec.areaName,
      region: spec.region,
      risk: level,
      kind: 'first-scan',
      headline,
      evidence,
      at: nowIso,
    },
  };
}

/** Run async tasks with a concurrency cap. */
async function withConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      try { results[idx] = await fn(items[idx]); } catch { /* handled inside */ }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const clientId = process.env.VITE_CDSE_CLIENT_ID;
  const clientSecret = process.env.VITE_CDSE_CLIENT_SECRET;
  if (!clientId || !clientSecret) { res.status(500).json({ error: 'CDSE credentials not configured.' }); return; }

  const now = new Date();
  const nowIso = now.toISOString();
  const previous = await readState();
  const prevLevels = new Map(previous.areas.map((a) => [a.areaId, a.lastRiskLevel]));

  const token = await getCdseToken(clientId, clientSecret);

  const results = await withConcurrency(ALL_SITES, 3, (spec) => scanOne(spec, token));

  const nextAreas: AreaState[] = [];
  const newAlerts: ScanAlert[] = [];

  for (const r of results) {
    if (!r) continue;
    const prev = prevLevels.get(r.area.areaId);
    const curr = r.area.lastRiskLevel;

    nextAreas.push(r.area);

    if (prev === undefined) {
      // First ever scan of this site: record level, do not alert.
      continue;
    }

    const escalated = SEVERITY[curr] > SEVERITY[prev];
    const deescalated = SEVERITY[curr] < SEVERITY[prev];

    if (escalated && (curr === 'moderate' || curr === 'high')) {
      newAlerts.push({ ...r.alert!, previousRisk: prev, kind: 'escalation' });
      r.area.lastAlertAt = nowIso;
    } else if (deescalated && (prev === 'moderate' || prev === 'high')) {
      newAlerts.push({ ...r.alert!, previousRisk: prev, kind: 'deescalation' });
      r.area.lastAlertAt = nowIso;
    }
  }

  const nextState = {
    version: 1 as const,
    lastRunAt: nowIso,
    areas: nextAreas,
    alerts: [...newAlerts, ...previous.alerts].slice(0, 200),
  };

  try { await writeState(nextState); } catch (e) { console.warn('[scan] persist failed:', e); }

  res.status(200).json({
    ok: true,
    lastRunAt: nowIso,
    areasScanned: nextAreas.length,
    newAlerts: newAlerts.length,
    alerts: newAlerts,
  });
}
