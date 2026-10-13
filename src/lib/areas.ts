// =============================================================================
// INVISIBLE GRAZING — Working set of monitoring areas
// =============================================================================
// Combines user-created areas (persisted in localStorage) with four real seed
// areas whose series are hydrated and cached by src/lib/seedHydrate.ts. When
// the cache has data for a seed, it is merged in so every area returns with
// real Sentinel-2 NDVI and real NASA POWER rainfall attached.
// =============================================================================

import type { MonitoringArea, ObservationSeries } from '../types';
import { DEMONSTRATION_AREAS } from '../data/demonstration';

const STORAGE_KEY = 'invisible-grazing.areas.v1';
const SEED_CACHE_KEY = 'invisible-grazing.seedSeries.v1';

interface SeedCacheEntry {
  hydratedAt: string;
  series: ObservationSeries[];
}
type SeedCache = Record<string, SeedCacheEntry>;

function loadUserAreas(): MonitoringArea[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MonitoringArea[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUserAreas(areas: MonitoringArea[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(areas));
  } catch {
    /* quota or disabled storage */
  }
}

function loadSeedCache(): SeedCache {
  try {
    const raw = localStorage.getItem(SEED_CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as SeedCache;
  } catch {
    return {};
  }
}

/** Merge cached real series into the four seed areas. */
function getHydratedSeeds(): MonitoringArea[] {
  const cache = loadSeedCache();
  return DEMONSTRATION_AREAS.map((area) => {
    const entry = cache[area.id];
    if (!entry || !entry.series?.length) return area;
    return { ...area, series: entry.series };
  });
}

let userAreas: MonitoringArea[] = loadUserAreas();

export function getAllAreas(): MonitoringArea[] {
  return [...userAreas, ...getHydratedSeeds()];
}

export function getUserAreas(): MonitoringArea[] {
  return [...userAreas];
}

export function getAreaById(id: string): MonitoringArea | undefined {
  return getAllAreas().find((a) => a.id === id);
}

export function addUserArea(area: MonitoringArea): void {
  userAreas = [...userAreas.filter((a) => a.id !== area.id), area];
  saveUserAreas(userAreas);
}

export function removeUserArea(id: string): void {
  userAreas = userAreas.filter((a) => a.id !== id);
  saveUserAreas(userAreas);
}

export function newAreaId(): string {
  return `area-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
