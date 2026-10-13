// =============================================================================
// INVISIBLE GRAZING — Invisible Grazing Risk Index (preliminary, rules-based)
// =============================================================================
// This is an EXPLAINABLE, RULES-BASED screen. It is NOT a validated model.
// Thresholds are provisional experimental design assumptions and are documented
// in the README. It returns Insufficient Data rather than a false positive.
//
// The engine NEVER claims that vegetation decline proves overgrazing.
// It only flags areas that warrant further investigation.
// =============================================================================

import type {
  Alert,
  MonitoringArea,
  ObservationSeries,
  RiskAssessment,
  RiskEvidence,
  RiskLevel,
} from '../types';
import { DATA_SOURCES } from './sources';
import { formatDate, formatDelta, formatNumber } from './format';

/* --------------------------------------------------------------------------
 * Provisional thresholds (documented as experimental, not validated).
 * ------------------------------------------------------------------------ */
const T = {
  /** Minimum paired observations required for any assessment. */
  MIN_OBSERVATIONS: 6,
  /** Window (in months) used to compare "recent" vs "baseline". */
  RECENT_WINDOW_MONTHS: 12,
  /** NDVI change over the window that counts as a material decline. */
  NDVI_DECLINE_MATERIAL: -0.05,
  /** NDVI change that counts as a severe decline. */
  NDVI_DECLINE_SEVERE: -0.10,
  /** NDVI change that counts as an improvement. */
  NDVI_IMPROVEMENT: 0.05,
};

/* --------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------ */

function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

/** Mean of a numeric array, ignoring nulls. Returns null when nothing to mean. */
function mean(values: (number | null | undefined)[]): number | null {
  const nums = values.filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Find a series by indicator name from an area. */
function findSeries(area: MonitoringArea, indicator: string): ObservationSeries | undefined {
  return area.series.find((s) => s.indicator === indicator);
}

/** True if every series feeding this assessment is simulated. */
function assessProvenance(area: MonitoringArea): RiskAssessment['basedOn'] {
  if (area.series.length === 0) return 'insufficient';
  const sources = area.series.map((s) => DATA_SOURCES[s.sourceId]);
  const anySim = sources.some((s) => s.simulated);
  const anyReal = sources.some((s) => !s.simulated);
  if (anySim && anyReal) return 'mixed';
  if (anySim) return 'demonstration';
  return 'observations';
}

/* --------------------------------------------------------------------------
 * Main assessment
 * ------------------------------------------------------------------------ */

export function assessArea(area: MonitoringArea): RiskAssessment {
  const evidence: RiskEvidence[] = [];
  const computedAt = new Date().toISOString();

  const ndviSeries = findSeries(area, 'NDVI');
  const rainSeries = findSeries(area, 'Rainfall');

  const observations = ndviSeries?.observations.filter((o) => o.value != null) ?? [];

  // Insufficient-data guard -------------------------------------------------
  if (observations.length < T.MIN_OBSERVATIONS) {
    return {
      level: 'insufficient',
      headline: 'Insufficient observations for a reliable assessment.',
      evidence: [
        {
          label: 'Usable NDVI observations',
          value: `${observations.length} (minimum ${T.MIN_OBSERVATIONS})`,
          direction: 'neutral',
        },
      ],
      alternativeExplanations: [],
      recommendedActions: [
        'Continue collecting observations before interpreting a trend.',
        'Verify that cloud cover or sensor outages are not hiding data.',
      ],
      computedAt,
      basedOn: assessProvenance(area),
    };
  }

  // Sort oldest → newest
  const sorted = [...observations].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const latestDate = new Date(latest.date);

  const recentCutoff = new Date(latestDate);
  recentCutoff.setMonth(recentCutoff.getMonth() - T.RECENT_WINDOW_MONTHS);

  const recent = sorted.filter((o) => new Date(o.date) >= recentCutoff);
  const baseline = sorted.filter((o) => new Date(o.date) < recentCutoff);

  const recentMean = mean(recent.map((o) => o.value));
  const baselineMean = mean(baseline.map((o) => o.value));
  const delta =
    recentMean != null && baselineMean != null ? recentMean - baselineMean : null;

  // ---- Evidence 1: recent vs baseline NDVI --------------------------------
  evidence.push({
    label: `NDVI change (last ${T.RECENT_WINDOW_MONTHS} months vs prior baseline)`,
    value:
      delta == null
        ? 'not computable'
        : `${formatDelta(delta)} (baseline ${formatNumber(baselineMean)}, recent ${formatNumber(recentMean)})`,
    direction: delta == null ? 'neutral' : delta < 0 ? 'up' : delta > 0 ? 'down' : 'neutral',
  });

  // ---- Evidence 2: latest observation date ---------------------------------
  evidence.push({
    label: 'Latest usable observation',
    value: formatDate(latest.date),
    direction: 'neutral',
  });

  // ---- Evidence 3: rainfall context (if available) -------------------------
  let rainfallDeficit = false;
  if (rainSeries) {
    const rainRecent = rainSeries.observations.filter(
      (o) => o.value != null && new Date(o.date) >= recentCutoff,
    );
    const rainBaseline = rainSeries.observations.filter(
      (o) => o.value != null && new Date(o.date) < recentCutoff,
    );
    const rainRecentMean = mean(rainRecent.map((o) => o.value));
    const rainBaselineMean = mean(rainBaseline.map((o) => o.value));
    if (rainRecentMean != null && rainBaselineMean != null && rainBaselineMean > 0) {
      const pct = (rainRecentMean - rainBaselineMean) / rainBaselineMean;
      rainfallDeficit = pct < -0.15;
      evidence.push({
        label: 'Rainfall change (same window)',
        value: `${(pct * 100).toFixed(0)}% vs baseline`,
        direction: pct < -0.15 ? 'up' : pct > 0.15 ? 'down' : 'neutral',
      });
    }
  } else {
    evidence.push({
      label: 'Rainfall context',
      value: 'not available for this area',
      direction: 'neutral',
    });
  }

  // ---- Decide the risk level ----------------------------------------------
  let level: RiskLevel = 'low';
  let headline = 'Vegetation appears broadly stable over the assessment window.';

  if (delta != null && delta <= T.NDVI_DECLINE_SEVERE) {
    level = 'high';
    headline = rainfallDeficit
      ? 'Severe vegetation decline coinciding with a rainfall deficit.'
      : 'Severe vegetation decline with no clear rainfall explanation.';
  } else if (delta != null && delta <= T.NDVI_DECLINE_MATERIAL) {
    level = 'moderate';
    headline = rainfallDeficit
      ? 'Material vegetation decline coinciding with reduced rainfall.'
      : 'Material vegetation decline — investigate potential causes.';
  } else if (delta != null && delta >= T.IMPROVEMENT) {
    level = 'low';
    headline = 'Vegetation has improved relative to the baseline period.';
  }

  // ---- Alternative explanations (always include — honesty by design) -------
  const alternativeExplanations = [
    'Drought or reduced rainfall',
    'Fire',
    'Land clearing or cultivation change',
    'Seasonal phenology (green-up / senescence)',
    'Pest or disease outbreak',
    'Cloud contamination or sensor artefacts',
    'A change in grazing pressure (requires independent field evidence to confirm)',
  ];

  // ---- Recommended actions --------------------------------------------------
  const recommendedActions: string[] = [
    'Compare with neighbouring areas to see whether the decline is local or regional.',
    'Review recent rainfall records for the same period.',
    'Check for fire, land-use change, or new cultivation in the area.',
  ];
  if (level === 'high') {
    recommendedActions.unshift(
      'Prioritise a field inspection to identify the cause of the decline.',
    );
  }
  if (level === 'insufficient') {
    recommendedActions.push('Continue collecting observations before acting on this signal.');
  }

  return {
    level,
    headline,
    evidence,
    alternativeExplanations,
    recommendedActions,
    computedAt,
    basedOn: assessProvenance(area),
  };
}

/* --------------------------------------------------------------------------
 * Early-warning alerts
 * ------------------------------------------------------------------------ */
export function deriveAlert(area: MonitoringArea): Alert | null {
  const risk = assessArea(area);
  if (risk.level !== 'high' && risk.level !== 'moderate') return null;

  const ndvi = area.series.find((s) => s.indicator === 'NDVI');
  const usable = ndvi?.observations.filter((o) => o.value != null) ?? [];
  if (usable.length === 0) return null;

  const sorted = [...usable].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  return {
    id: `alert-${area.id}`,
    areaId: area.id,
    areaName: area.name,
    title:
      risk.level === 'high'
        ? 'Sustained vegetation decline detected'
        : 'Vegetation decline — investigate',
    summary: risk.headline,
    observedChange: `NDVI ${formatNumber(first.value)} → ${formatNumber(last.value)}`,
    observationPeriod: `${formatDate(first.date)} to ${formatDate(last.date)}`,
    potentialExplanations: risk.alternativeExplanations.slice(0, 4),
    recommendedFollowUp: risk.recommendedActions[0] ?? 'Review the area in detail.',
    risk: risk.level,
    asOf: last.date,
    basedOn: area.demonstration ? 'demonstration' : 'observations',
  };
}
