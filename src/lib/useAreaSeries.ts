// =============================================================================
// INVISIBLE GRAZING — Area series hook
// =============================================================================
// Any page that needs a series for an area calls useAreaSeries(area). The hook
// returns whatever series the area already has, or fetches them from Sentinel-2
// and NASA POWER on demand, caches the result in localStorage, and returns the
// populated area. A shared queue caps concurrency so we do not rate-limit
// ourselves against CDSE.
//
// The user should never see an empty area with a "not available" message. If
// the source genuinely returns no clear observations, we say so plainly. Every
// other case is a fetch in progress.
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import type { MonitoringArea, ObservationSeries } from '../types';
import { fetchSentinel2Ndvi } from './providers/sentinel2';
import { fetchNasaPowerRainfall } from './providers/nasaPower';

const CACHE_PREFIX = 'invisible-grazing.siteSeries.';
const YEARS_BACK = 2;

/* -------------------------------------------------------------------------- */
/* Fetch queue — two in-flight requests max, 400 ms gap between starts       */
/* -------------------------------------------------------------------------- */

type Task = () => Promise<void>;

const queue: Task[] = [];
let inFlight = 0;
const MAX_CONCURRENT = 2;
const GAP_MS = 400;

function pump() {
  if (inFlight >= MAX_CONCURRENT) return;
  const next = queue.shift();
  if (!next) return;
  inFlight += 1;
  next()
    .catch(() => undefined)
    .finally(() => {
      inFlight -= 1;
      window.setTimeout(pump, GAP_MS);
    });
}

function enqueue(task: Task) {
  queue.push(task);
  // Kick off immediately if we have capacity.
  window.setTimeout(pump, 0);
}

/* -------------------------------------------------------------------------- */
/* Actual fetcher                                                             */
/* -------------------------------------------------------------------------- */

async function fetchSeriesFor(area: MonitoringArea): Promise<ObservationSeries[]> {
  const toIso = new Date().toISOString();
  const fromIso = new Date(Date.now() - YEARS_BACK * 365 * 86_400_000).toISOString();
  const series: ObservationSeries[] = [];

  try {
    const ndvi = await fetchSentinel2Ndvi(area, { fromIso, toIso });
    if (ndvi.observations.some((o) => o.value != null)) series.push(ndvi);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(`[series] NDVI fetch failed for ${area.name}:`, e);
  }

  try {
    const rain = await fetchNasaPowerRainfall(area, new Date(fromIso).getUTCFullYear());
    if (rain.observations.length) series.push(rain);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(`[series] rainfall fetch failed for ${area.name}:`, e);
  }

  return series;
}

function readCache(areaId: string): MonitoringArea | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + areaId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MonitoringArea;
    if (!parsed.series || parsed.series.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(area: MonitoringArea) {
  try {
    localStorage.setItem(CACHE_PREFIX + area.id, JSON.stringify(area));
  } catch {
    /* quota */
  }
}

/* -------------------------------------------------------------------------- */
/* Hook                                                                       */
/* -------------------------------------------------------------------------- */

export interface UseAreaSeriesResult {
  /** The area with a populated series if the fetch has completed. */
  hydrated: MonitoringArea | null;
  /** True while the fetch is queued or in flight. */
  loading: boolean;
  /** True when the source genuinely returned no usable observations. */
  empty: boolean;
}

/**
 * Returns the area with its full series. If the area already carries a series,
 * it is returned immediately. Otherwise the fetch is queued and the result is
 * cached in localStorage for subsequent calls.
 *
 * @param area       the area to hydrate
 * @param enabled    set to false to skip fetching (e.g. lazy mode until a user
 *                   clicks a specific area)
 */
export function useAreaSeries(
  area: MonitoringArea | undefined,
  enabled = true,
): UseAreaSeriesResult {
  const [hydrated, setHydrated] = useState<MonitoringArea | null>(null);
  const [loading, setLoading] = useState(false);
  const [empty, setEmpty] = useState(false);
  const requested = useRef<string | null>(null);

  useEffect(() => {
    if (!area) return;

    // Already populated in the object we were given.
    if (area.series.length > 0) {
      setHydrated(area);
      setLoading(false);
      setEmpty(false);
      return;
    }

    // Cached.
    const cached = readCache(area.id);
    if (cached) {
      setHydrated(cached);
      setLoading(false);
      setEmpty(false);
      return;
    }

    // Lazy mode: do not fetch until enabled.
    if (!enabled) return;

    // Already requested for this id in this mount.
    if (requested.current === area.id) return;
    requested.current = area.id;

    let cancelled = false;
    setLoading(true);
    setEmpty(false);

    enqueue(async () => {
      const series = await fetchSeriesFor(area);
      if (cancelled) return;
      if (series.length === 0) {
        setEmpty(true);
        setLoading(false);
        return;
      }
      const filled: MonitoringArea = { ...area, series };
      writeCache(filled);
      setHydrated(filled);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [area, enabled]);

  return { hydrated, loading, empty };
}
