// =============================================================================
// INVISIBLE GRAZING — Working set of monitoring areas
// =============================================================================
// For the MVP this is a small in-memory store seeded with the demonstration
// scenarios. It is intentionally decoupled from any page, so we can later swap
// in real areas loaded from a data provider without touching the UI.
// =============================================================================

import type { MonitoringArea } from '../types';
import { DEMONSTRATION_AREAS } from '../data/demonstration';

const STORAGE_KEY = 'invisible-grazing.areas.v1';

/** User-configured areas are persisted in localStorage; demos are not. */
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
    /* quota or disabled storage — silently ignore for MVP */
  }
}

let userAreas: MonitoringArea[] = loadUserAreas();

export function getAllAreas(): MonitoringArea[] {
  return [...userAreas, ...DEMONSTRATION_AREAS];
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

/** Simple id generator for user-created areas. */
export function newAreaId(): string {
  return `area-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
