// =============================================================================
// INVISIBLE GRAZING — Core data model
// =============================================================================
// Every observation carries its provenance so the UI can always answer:
//   - where did this come from?
//   - when was it observed?
//   - is it real satellite data or a labelled demonstration?
// =============================================================================

/** Categories of data source we support or plan to support. */
export type DataSourceKind =
  | 'sentinel-2'      // real satellite vegetation (via a derived product)
  | 'modis'           // real broad-area vegetation index
  | 'chirps'          // real rainfall
  | 'nasa-power'      // real rainfall / climate
  | 'era5'            // real climate reanalysis
  | 'field'           // in-situ measurement (not yet implemented)
  | 'demonstration';  // simulated — MUST be labelled in the UI

export interface DataSource {
  id: DataSourceKind;
  name: string;
  /** Short description shown in tooltips and reports. */
  description: string;
  /** Native spatial resolution if known, e.g. "10 m", "250 m", "0.05°". */
  spatialResolution?: string;
  /** Typical revisit / cadence, e.g. "5 days", "16 days", "monthly". */
  temporalResolution?: string;
  /** Public landing page so users can verify the source themselves. */
  homepage?: string;
  /** True when the values are simulated, not measured. */
  simulated: boolean;
}

/** One vegetation or environmental observation at a location. */
export interface Observation {
  /** ISO date (YYYY-MM-DD) the observation refers to. */
  date: string;
  /** Observed value (e.g. NDVI). Null when missing/cloud-masked. */
  value: number | null;
  /** Optional second value — e.g. rainfall in mm at the same date. */
  secondaryValue?: number | null;
  /** Quality flag if the provider exposes one. */
  quality?: 'good' | 'fair' | 'poor' | 'unknown';
}

/** A time series from a single source for a single indicator. */
export interface ObservationSeries {
  sourceId: DataSourceKind;
  /** e.g. "NDVI", "Rainfall (mm)". */
  indicator: string;
  /** Unit string, e.g. "index", "mm". */
  unit: string;
  /** Ordered oldest → newest. */
  observations: Observation[];
  /** Notes on limitations, cloud cover, gaps, etc. */
  limitations?: string;
}

/** A user-configured or demonstration monitoring area. */
export interface MonitoringArea {
  id: string;
  name: string;
  /** ISO 3166-1 alpha-2 country code, when known. */
  countryCode?: string;
  /** Human-readable region / ecoregion label. */
  region?: string;
  latitude: number;
  longitude: number;
  /** Radius in km for a circular area, when applicable. */
  radiusKm?: number;
  /** Optional GeoJSON polygon for drawn areas. */
  geometry?: unknown;
  /** Free-form description shown on the investigation page. */
  description?: string;
  /** True when this whole area is a labelled demonstration scenario. */
  demonstration: boolean;
  createdAt: string;
  series: ObservationSeries[];
}

/** Risk levels — no numeric ambiguity. */
export type RiskLevel = 'low' | 'moderate' | 'high' | 'insufficient';

/** A single piece of evidence used by the risk engine. */
export interface RiskEvidence {
  label: string;
  /** Human-readable value, e.g. "-0.08 NDVI over 12 months". */
  value: string;
  /** Whether this evidence pushes risk up, down, or is neutral. */
  direction: 'up' | 'down' | 'neutral';
}

/** Explainable output of the risk engine. */
export interface RiskAssessment {
  level: RiskLevel;
  /** Short headline, e.g. "Persistent decline with rainfall deficit". */
  headline: string;
  /** Evidence items, ordered by importance. */
  evidence: RiskEvidence[];
  /** Alternative explanations the user should consider. */
  alternativeExplanations: string[];
  /** Suggested next investigative steps. */
  recommendedActions: string[];
  /** ISO date the assessment was computed. */
  computedAt: string;
  /** "demonstration" when any input series is simulated. */
  basedOn: 'observations' | 'demonstration' | 'mixed' | 'insufficient';
}

/** Early-warning alert derived from a series. */
export interface Alert {
  id: string;
  areaId: string;
  areaName: string;
  /** e.g. "Sustained vegetation decline". */
  title: string;
  /** Short evidence summary. */
  summary: string;
  observedChange: string;
  observationPeriod: string;
  potentialExplanations: string[];
  recommendedFollowUp: string;
  risk: RiskLevel;
  /** ISO date of the latest observation supporting this alert. */
  asOf: string;
  basedOn: 'observations' | 'demonstration';
}

/** Summary row used on the dashboard. */
export interface AreaSummary {
  area: MonitoringArea;
  risk: RiskAssessment;
  latestObservationDate?: string;
  latestValue?: number | null;
  trend?: 'declining' | 'stable' | 'improving' | 'unknown';
}
