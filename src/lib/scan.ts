// =============================================================================
// INVISIBLE GRAZING — Scan engine for the war-room
// =============================================================================
// Re-assesses every monitoring area on an interval and produces a timestamped
// feed of risk transitions (low→moderate, moderate→high, etc.). Only real
// transitions create a new alert, so the feed reads as a live monitoring log
// rather than as duplicate noise.
//
// Everything here is client-side. It reads the areas already loaded in the
// browser, runs the same risk engine the rest of the app uses, and stores the
// previous state in memory so a "new" event can be distinguished from a steady
// state. A server-side Sentinel-2 refresh cycle is a documented future step.
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import type { MonitoringArea, RiskAssessment, RiskLevel } from '../types';
import { assessArea } from './risk';

export interface AreaScan {
  area: MonitoringArea;
  risk: RiskAssessment;
  latestObservationDate?: string;
  latestNdviValue?: number | null;
}

export interface ScanAlert {
  id: string;
  areaId: string;
  areaName: string;
  region?: string;
  risk: RiskLevel;
  previousRisk: RiskLevel | null;
  /** "new" = first time seen at this level in this session. */
  kind: 'new' | 'escalation' | 'deescalation' | 'first-scan';
  headline: string;
  evidence: string;
  at: string; // ISO timestamp
}

const SEVERITY: Record<RiskLevel, number> = {
  insufficient: 0,
  low: 1,
  moderate: 2,
  high: 3,
};

function latestUsable(area: MonitoringArea) {
  const ndvi = area.series.find((s) => s.indicator === 'NDVI');
  const usable = ndvi?.observations.filter((o) => o.value != null) ?? [];
  if (!usable.length) return { date: undefined, value: null as number | null };
  const sorted = [...usable].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];
  return { date: last.date, value: last.value as number | null };
}

function describeEvidence(risk: RiskAssessment): string {
  const primary = risk.evidence[0];
  if (!primary) return risk.headline;
  return `${primary.label}: ${primary.value}`;
}

/** Assess every area once, without producing alerts. */
export function scanAreas(areas: MonitoringArea[]): AreaScan[] {
  return areas.map((area) => {
    const risk = assessArea(area);
    const latest = latestUsable(area);
    return {
      area,
      risk,
      latestObservationDate: latest.date,
      latestNdviValue: latest.value,
    };
  });
}

export interface UseLiveScanResult {
  scans: AreaScan[];
  alerts: ScanAlert[];
  lastScanAt: string | null;
  /** 0..1 fraction of the scan cycle currently elapsed, for a progress bar. */
  cycleProgress: number;
  scanning: boolean;
  triggerScan: () => void;
}

/**
 * Runs a scan immediately, then every `intervalMs` (default 60 s).
 * Returns the live feed of alerts plus metadata for the war-room UI.
 */
export function useLiveScan(
  areas: MonitoringArea[],
  intervalMs = 60_000,
): UseLiveScanResult {
  const [scans, setScans] = useState<AreaScan[]>([]);
  const [alerts, setAlerts] = useState<ScanAlert[]>([]);
  const [lastScanAt, setLastScanAt] = useState<string | null>(null);
  const [cycleProgress, setCycleProgress] = useState(0);
  const [scanning, setScanning] = useState(false);
  const lastLevels = useRef<Record<string, RiskLevel>>({});
  const startedAt = useRef<number>(Date.now());

  function runScan() {
    setScanning(true);
    const now = new Date();
    const nowIso = now.toISOString();
    const results = scanAreas(areas);

    const newAlerts: ScanAlert[] = [];
    const nextLevels: Record<string, RiskLevel> = {};

    for (const s of results) {
      nextLevels[s.area.id] = s.risk.level;

      // Only moderate and high generate alerts.
      if (s.risk.level !== 'moderate' && s.risk.level !== 'high') continue;

      const prev = lastLevels.current[s.area.id];
      const isFirstScan = prev === undefined;
      const escalated = prev !== undefined && SEVERITY[s.risk.level] > SEVERITY[prev];
      const deescalated = prev !== undefined && SEVERITY[s.risk.level] < SEVERITY[prev];

      // On the very first scan, surface everything that is currently notable
      // so the panel is not empty. Afterwards only report changes.
      const shouldReport = isFirstScan || escalated || deescalated;
      if (!shouldReport) continue;

      const kind: ScanAlert['kind'] = isFirstScan
        ? 'first-scan'
        : escalated
        ? 'escalation'
        : 'deescalation';

      newAlerts.push({
        id: `${s.area.id}-${nowIso}`,
        areaId: s.area.id,
        areaName: s.area.name,
        region: s.area.region,
        risk: s.risk.level,
        previousRisk: prev ?? null,
        kind,
        headline: s.risk.headline,
        evidence: describeEvidence(s.risk),
        at: nowIso,
      });
    }

    // Most severe first, then most recent.
    newAlerts.sort((a, b) => {
      const s = SEVERITY[b.risk] - SEVERITY[a.risk];
      if (s !== 0) return s;
      return b.at.localeCompare(a.at);
    });

    lastLevels.current = nextLevels;
    setScans(results);
    setAlerts((prev) => [...newAlerts, ...prev].slice(0, 40));
    setLastScanAt(nowIso);
    setScanning(false);
    startedAt.current = Date.now();
  }

  // Initial scan + interval
  useEffect(() => {
    // Reset session state when the set of areas changes meaningfully.
    lastLevels.current = {};
    setAlerts([]);
    runScan();

    const id = window.setInterval(runScan, intervalMs);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areas.length, intervalMs]);

  // Cycle progress for the little progress bar
  useEffect(() => {
    let raf = 0;
    function tick() {
      const elapsed = Date.now() - startedAt.current;
      setCycleProgress(Math.min(1, elapsed / intervalMs));
      raf = window.requestAnimationFrame(tick);
    }
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [intervalMs]);

  return {
    scans,
    alerts,
    lastScanAt,
    cycleProgress,
    scanning,
    triggerScan: runScan,
  };
}
