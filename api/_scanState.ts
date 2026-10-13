// =============================================================================
// INVISIBLE GRAZING — server-side state for the scheduled scan
// =============================================================================
// Stores the last-known risk level per area and the alert history, using
// Vercel Blob as a tiny key-value store. Falls back gracefully if Blob is not
// configured: the scan still runs, alerts are just not persisted.
// =============================================================================

import { put, head } from '@vercel/blob';

const STATE_KEY = 'invisible-grazing/scan-state.json';

export interface AreaState {
  areaId: string;
  areaName: string;
  region?: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  lastRiskLevel: 'low' | 'moderate' | 'high' | 'insufficient';
  lastNdvi?: number | null;
  lastRainfall?: number | null;
  lastScanAt: string;
  lastAlertAt?: string;
}

export interface ScanAlert {
  id: string;
  areaId: string;
  areaName: string;
  region?: string;
  risk: 'low' | 'moderate' | 'high' | 'insufficient';
  previousRisk?: 'low' | 'moderate' | 'high' | 'insufficient';
  kind: 'first-scan' | 'escalation' | 'deescalation';
  headline: string;
  evidence: string;
  at: string;
}

export interface ScanState {
  version: 1;
  lastRunAt: string;
  areas: AreaState[];
  alerts: ScanAlert[];
}

const EMPTY_STATE: ScanState = {
  version: 1,
  lastRunAt: new Date(0).toISOString(),
  areas: [],
  alerts: [],
};

/** Read the current state from Blob. Returns empty state if not yet written. */
export async function readState(): Promise<ScanState> {
  try {
    const meta = await head(STATE_KEY).catch(() => null);
    if (!meta) return EMPTY_STATE;
    const res = await fetch(meta.url, { cache: 'no-store' });
    if (!res.ok) return EMPTY_STATE;
    const json = (await res.json()) as ScanState;
    if (!json || json.version !== 1) return EMPTY_STATE;
    return json;
  } catch {
    return EMPTY_STATE;
  }
}

/** Write state back to Blob. Overwrites. */
export async function writeState(state: ScanState): Promise<void> {
  await put(STATE_KEY, JSON.stringify(state), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}
