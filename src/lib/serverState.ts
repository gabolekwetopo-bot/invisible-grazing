// =============================================================================
// INVISIBLE GRAZING — server state hook
// =============================================================================
// Reads /api/state, the latest scheduled-scan output. Returns the areas that
// the server has scanned (with real Sentinel-2 and NASA POWER data), the alert
// history, and the timestamp of the last server run.
//
// Refreshes every 5 minutes while the tab is open.
// =============================================================================

import { useEffect, useState } from 'react';
import type { RiskLevel } from '../types';

export interface ServerArea {
  areaId: string;
  areaName: string;
  region?: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  lastRiskLevel: RiskLevel;
  lastNdvi?: number | null;
  lastRainfall?: number | null;
  lastScanAt: string;
  lastAlertAt?: string;
}

export interface ServerAlert {
  id: string;
  areaId: string;
  areaName: string;
  region?: string;
  risk: RiskLevel;
  previousRisk?: RiskLevel;
  kind: 'first-scan' | 'escalation' | 'deescalation';
  headline: string;
  evidence: string;
  at: string;
}

export interface ServerState {
  version: 1;
  lastRunAt: string;
  areas: ServerArea[];
  alerts: ServerAlert[];
}

const EMPTY: ServerState = { version: 1, lastRunAt: '', areas: [], alerts: [] };

export function useServerState(refreshMs = 5 * 60_000) {
  const [state, setState] = useState<ServerState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const r = await fetch('/api/state', { cache: 'no-store' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = (await r.json()) as ServerState;
        if (!cancelled) {
          setState(json);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(String(e).replace(/^Error:\s*/, ''));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const id = window.setInterval(load, refreshMs);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [refreshMs]);

  return { state, loading, error };
}
