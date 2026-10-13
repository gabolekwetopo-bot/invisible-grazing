// =============================================================================
// INVISIBLE GRAZING — Seed monitoring areas
// =============================================================================
// Four rangeland sites across different ecosystems. Coordinates are real.
// Series are empty here; real Sentinel-2 NDVI and real NASA POWER rainfall are
// fetched on first load by src/lib/seedHydrate.ts and cached in localStorage.
// =============================================================================

import type { MonitoringArea } from '../types';

export interface SeedSpec {
  id: string;
  name: string;
  countryCode?: string;
  region: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  description: string;
}

export const SEED_SPECS: SeedSpec[] = [
  {
    id: 'seed-kalahari',
    name: 'Kalahari south transect',
    countryCode: 'BW',
    region: 'Southern African semi-arid savanna',
    latitude: -24.65,
    longitude: 21.85,
    radiusKm: 25,
    description:
      'Semi-arid savanna in the southern Kalahari. Long dry season, summer rainfall, sparse woody cover.',
  },
  {
    id: 'seed-laikipia',
    name: 'Laikipia rangeland block',
    countryCode: 'KE',
    region: 'East African highland rangeland',
    latitude: 0.30,
    longitude: 36.90,
    radiusKm: 25,
    description:
      'Highland rangeland north of the equator. Bimodal rainfall, mixed grass and bushland, grazing pressure from livestock and wildlife.',
  },
  {
    id: 'seed-nsw',
    name: 'New South Wales grassland',
    countryCode: 'AU',
    region: 'Australian semi-arid grassland',
    latitude: -31.50,
    longitude: 146.20,
    radiusKm: 25,
    description:
      'Semi-arid grassland in inland New South Wales. Highly variable rainfall, summer-dominant, extensive grazing.',
  },
  {
    id: 'seed-mongolia',
    name: 'Mongolian steppe plot',
    countryCode: 'MN',
    region: 'Central Asian cold steppe',
    latitude: 46.85,
    longitude: 103.85,
    radiusKm: 25,
    description:
      'Cold steppe in central Mongolia. Short growing season, low precipitation, traditional pastoral use.',
  },
];

/** Build a MonitoringArea from a seed spec, with an empty series. */
export function seedToArea(spec: SeedSpec): MonitoringArea {
  return {
    id: spec.id,
    name: spec.name,
    countryCode: spec.countryCode,
    region: spec.region,
    latitude: spec.latitude,
    longitude: spec.longitude,
    radiusKm: spec.radiusKm,
    description: spec.description,
    demonstration: false,
    createdAt: new Date().toISOString(),
    series: [],
  };
}

/** Legacy export used by other modules. Returns the four seed areas, empty. */
export const DEMONSTRATION_AREAS: MonitoringArea[] = SEED_SPECS.map(seedToArea);
