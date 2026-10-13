// =============================================================================
// INVISIBLE GRAZING — TimeSeriesChart
// =============================================================================
// Time series for NDVI and rainfall. Both series are bucketed to the first day
// of the month before merging, so the two lines align on a shared x-axis even
// when their native dates differ by a few days.
// =============================================================================

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { ObservationSeries } from '../types';
import { formatMonthShort } from '../lib/format';

interface Row {
  date: string;
  ndvi?: number | null;
  rainfall?: number | null;
}

/** Convert any ISO date to the first day of its month, e.g. 2025-03-15 → 2025-03-01. */
function toMonthStart(iso: string): string {
  return iso.slice(0, 7) + '-01';
}

/**
 * Merge two series into one row per calendar month. Values within the same
 * month are averaged when more than one observation falls in that month.
 */
function mergeSeries(ndvi?: ObservationSeries, rainfall?: ObservationSeries): Row[] {
  const buckets = new Map<string, { ndvi: number[]; rainfall: number[] }>();

  if (ndvi) {
    for (const o of ndvi.observations) {
      if (o.value == null) continue;
      const key = toMonthStart(o.date);
      const b = buckets.get(key) ?? { ndvi: [], rainfall: [] };
      b.ndvi.push(o.value);
      buckets.set(key, b);
    }
  }
  if (rainfall) {
    for (const o of rainfall.observations) {
      if (o.value == null) continue;
      const key = toMonthStart(o.date);
      const b = buckets.get(key) ?? { ndvi: [], rainfall: [] };
      b.rainfall.push(o.value);
      buckets.set(key, b);
    }
  }

  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

  return [...buckets.entries()]
    .map(([date, b]) => ({
      date,
      ndvi: mean(b.ndvi),
      rainfall: mean(b.rainfall),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export default function TimeSeriesChart({
  ndvi,
  rainfall,
  height = 320,
}: {
  ndvi?: ObservationSeries;
  rainfall?: ObservationSeries;
  height?: number;
}) {
  const data = mergeSeries(ndvi, rainfall);
  const showRain = Boolean(rainfall);
  const showNdvi = Boolean(ndvi);

  if (data.length === 0) {
    return (
      <div
        className="ig-muted"
        style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        No observations available for this area.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--ig-border)" strokeDasharray="2 4" />
          <XAxis
            dataKey="date"
            tickFormatter={formatMonthShort}
            tick={{ fontSize: 11, fill: 'var(--ig-text-muted)' }}
            stroke="var(--ig-border-strong)"
            minTickGap={24}
          />
          {showNdvi && (
            <YAxis
              yAxisId="ndvi"
              domain={[0, 1]}
              tick={{ fontSize: 11, fill: 'var(--ig-text-muted)' }}
              stroke="var(--ig-border-strong)"
              width={36}
              label={{
                value: 'NDVI',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 11, fill: 'var(--ig-text-muted)' },
              }}
            />
          )}
          {showRain && (
            <YAxis
              yAxisId="rain"
              orientation="right"
              tick={{ fontSize: 11, fill: 'var(--ig-text-muted)' }}
              stroke="var(--ig-border-strong)"
              width={44}
              label={{
                value: 'Rainfall (mm)',
                angle: 90,
                position: 'insideRight',
                style: { fontSize: 11, fill: 'var(--ig-text-muted)' },
              }}
            />
          )}
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: '1px solid var(--ig-border)',
              boxShadow: 'var(--ig-shadow)',
            }}
            labelFormatter={(d) => new Date(String(d)).toDateString()}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {showNdvi && (
            <Line
              yAxisId="ndvi"
              type="monotone"
              dataKey="ndvi"
              name="NDVI"
              stroke="var(--ig-forest)"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          )}
          {showRain && (
            <Line
              yAxisId="rain"
              type="monotone"
              dataKey="rainfall"
              name="Rainfall (mm)"
              stroke="var(--ig-clay)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
