// =============================================================================
// INVISIBLE GRAZING — Demonstration scenarios
// =============================================================================
// These are EXPLICITLY SIMULATED. They are used only to demonstrate the
// interface and the risk engine when real data is unavailable. Every scenario
// carries demonstration: true, and its series use the "demonstration" source.
// They are never mixed into real observations without clear labelling.
// =============================================================================

import type { MonitoringArea, Observation, ObservationSeries } from '../types';

/** Deterministic pseudo-random generator so charts look the same on every run. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Monthly ISO dates from startYear-Jan to endYear-Dec. */
function monthlyDates(startYear: number, endYear: number): string[] {
  const out: string[] = [];
  for (let y = startYear; y <= endYear; y++) {
    for (let m = 1; m <= 12; m++) {
      out.push(`${y}-${String(m).padStart(2, '0')}-15`);
    }
  }
  return out;
}

interface SimSeriesOptions {
  base: number;
  /** Fractional annual trend, e.g. -0.03 = 3% decline per year on the base value. */
  annualTrend: number;
  /** Amplitude of seasonal wobble. */
  seasonalAmp: number;
  /** Amplitude of random noise. */
  noise: number;
  /** Value range clamped to [min, max]. */
  min: number;
  max: number;
  seed: number;
  /** Optionally drop some months to simulate gaps/cloud. */
  dropFraction?: number;
}

function simulateSeries(dates: string[], opts: SimSeriesOptions): Observation[] {
  const rnd = mulberry32(opts.seed);
  const startYear = Number(dates[0].slice(0, 4));
  return dates.map((date) => {
    const year = Number(date.slice(0, 4));
    const month = Number(date.slice(5, 7));
    const yearsSinceStart = year - startYear;

    // Trend + seasonal + noise
    const trend = opts.base * (1 + opts.annualTrend * yearsSinceStart);
    const seasonal = Math.sin(((month - 1) / 12) * Math.PI * 2) * opts.seasonalAmp;
    const noise = (rnd() - 0.5) * 2 * opts.noise;
    const raw = trend + seasonal + noise;
    const clamped = Math.max(opts.min, Math.min(opts.max, raw));

    const drop = opts.dropFraction ? rnd() < opts.dropFraction : false;
    return {
      date,
      value: drop ? null : Number(clamped.toFixed(4)),
      quality: drop ? 'poor' : 'good',
    };
  });
}

function makeNDVI(
  dates: string[],
  opts: SimSeriesOptions,
  limitations: string,
): ObservationSeries {
  return {
    sourceId: 'demonstration',
    indicator: 'NDVI',
    unit: 'index',
    observations: simulateSeries(dates, opts),
    limitations,
  };
}

function makeRainfall(dates: string[], seed: number, baseMm: number, trend = 0): ObservationSeries {
  return {
    sourceId: 'demonstration',
    indicator: 'Rainfall',
    unit: 'mm',
    observations: simulateSeries(dates, {
      base: baseMm,
      annualTrend: trend,
      seasonalAmp: baseMm * 0.55,
      noise: baseMm * 0.35,
      min: 0,
      max: baseMm * 2.4,
      seed,
      dropFraction: 0.05,
    }),
    limitations: 'Simulated monthly rainfall for demonstration only.',
  };
}

/* -----------------------------------------------------------------------------
 * Scenario 1 — Persistent vegetation decline (high risk, no rainfall deficit)
 * --------------------------------------------------------------------------- */
const dates1 = monthlyDates(2019, 2026);
const area1: MonitoringArea = {
  id: 'demo-decline',
  name: 'Demonstration — Persistent vegetation decline',
  countryCode: 'NA',
  region: 'Southern Africa savanna (simulated)',
  latitude: -22.5,
  longitude: 27.0,
  radiusKm: 25,
  description:
    'Simulated scenario representing an area with a steady multi-year NDVI decline ' +
    'but no comparable rainfall deficit. A field inspection would be needed to identify ' +
    'the cause (grazing pressure, encroachment, land-use change, or another factor).',
  demonstration: true,
  createdAt: '2026-10-13T00:00:00Z',
  series: [
    makeNDVI(
      dates1,
      {
        base: 0.55,
        annualTrend: -0.03,
        seasonalAmp: 0.08,
        noise: 0.03,
        min: 0.05,
        max: 0.9,
        seed: 101,
      },
      'Simulated 16-day NDVI aggregated to monthly means. Demonstration only.',
    ),
    makeRainfall(dates1, 102, 45, 0.0),
  ],
};

/* -----------------------------------------------------------------------------
 * Scenario 2 — Rainfall-driven vegetation decline (moderate, explained)
 * --------------------------------------------------------------------------- */
const dates2 = monthlyDates(2019, 2026);
const area2: MonitoringArea = {
  id: 'demo-rainfall',
  name: 'Demonstration — Rainfall-driven decline',
  countryCode: 'KE',
  region: 'East African rangeland (simulated)',
  latitude: 1.5,
  longitude: 37.5,
  radiusKm: 30,
  description:
    'Simulated scenario where NDVI declines alongside a clear rainfall deficit. ' +
    'Vegetation change is consistent with drought rather than a confirmed change in ' +
    'land use; the risk engine flags this as moderate and shows the rainfall evidence.',
  demonstration: true,
  createdAt: '2026-10-13T00:00:00Z',
  series: [
    makeNDVI(
      dates2,
      {
        base: 0.42,
        annualTrend: -0.02,
        seasonalAmp: 0.12,
        noise: 0.035,
        min: 0.05,
        max: 0.85,
        seed: 201,
      },
      'Simulated monthly NDVI. Demonstration only.',
    ),
    makeRainfall(dates2, 202, 60, -0.06),
  ],
};

/* -----------------------------------------------------------------------------
 * Scenario 3 — Stable vegetation (low risk)
 * --------------------------------------------------------------------------- */
const dates3 = monthlyDates(2019, 2026);
const area3: MonitoringArea = {
  id: 'demo-stable',
  name: 'Demonstration — Stable vegetation',
  countryCode: 'AU',
  region: 'Australian semi-arid grassland (simulated)',
  latitude: -31.0,
  longitude: 141.0,
  radiusKm: 40,
  description:
    'Simulated scenario representing an area with no material change in NDVI over the ' +
    'assessment window. Included so the dashboard shows a low-risk contrast case.',
  demonstration: true,
  createdAt: '2026-10-13T00:00:00Z',
  series: [
    makeNDVI(
      dates3,
      {
        base: 0.38,
        annualTrend: 0.001,
        seasonalAmp: 0.07,
        noise: 0.025,
        min: 0.05,
        max: 0.8,
        seed: 301,
      },
      'Simulated monthly NDVI. Demonstration only.',
    ),
    makeRainfall(dates3, 302, 35, 0.0),
  ],
};

/* -----------------------------------------------------------------------------
 * Scenario 4 — Insufficient observations
 * --------------------------------------------------------------------------- */
const area4: MonitoringArea = {
  id: 'demo-insufficient',
  name: 'Demonstration — Insufficient observations',
  countryCode: 'MN',
  region: 'Central Asian steppe (simulated)',
  latitude: 47.0,
  longitude: 103.0,
  radiusKm: 35,
  description:
    'Simulated scenario with too few usable NDVI observations to compute a reliable ' +
    'trend. Included to demonstrate the Insufficient Data path of the risk engine.',
  demonstration: true,
  createdAt: '2026-10-13T00:00:00Z',
  series: [
    makeNDVI(
      monthlyDates(2025, 2026),
      {
        base: 0.3,
        annualTrend: -0.01,
        seasonalAmp: 0.06,
        noise: 0.03,
        min: 0.05,
        max: 0.7,
        seed: 401,
        dropFraction: 0.55,
      },
      'Very sparse simulated observations. Demonstration only.',
    ),
  ],
};

export const DEMONSTRATION_AREAS: MonitoringArea[] = [area1, area2, area3, area4];
