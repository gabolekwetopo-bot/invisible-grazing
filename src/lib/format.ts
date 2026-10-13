// =============================================================================
// INVISIBLE GRAZING — Formatting helpers
// =============================================================================
// All dates are ISO (YYYY-MM-DD internally). Display uses the user locale by
// default so the product is genuinely global. Units are metric by default.
// =============================================================================

/** Format an ISO date using the user's locale (e.g. 14 Oct 2026 / 14.10.2026). */
export function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Format an ISO date without the year — used in charts. */
export function formatMonthShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

/** Relative time since a date, e.g. "12 days ago". */
export function formatRelative(iso: string | undefined | null): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const days = Math.round((Date.now() - then) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.round(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

/** Fixed-precision number with a fallback dash. */
export function formatNumber(
  value: number | null | undefined,
  digits = 3,
): string {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toFixed(digits);
}

/** Signed change, e.g. "+0.042" or "−0.087". */
export function formatDelta(
  value: number | null | undefined,
  digits = 3,
): string {
  if (value == null || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toFixed(digits)}`;
}

/** Coordinates, always metric and unambiguous (decimal degrees). */
export function formatLatLon(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${ns}, ${Math.abs(lon).toFixed(4)}°${ew}`;
}

/** Title-case a string for region/country labels when the source is raw. */
export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}
