// =============================================================================
// INVISIBLE GRAZING — TimeSeriesChart
// =============================================================================
// Simple, readable time series for NDVI and rainfall. Two y-axes are used
// because NDVI (0–1) and rainfall (mm) live on different scales.
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

/** Merge two series by date into one row-per-date array. */
function mergeSeries(
  ndvi?: ObservationSeries,
  rainfall?: ObservationSeries,
): Row[] {
  const byDate = new Map<string, Row>();

  if (ndvi) {
    for (const o of ndvi.observations) {
      const row = byDate.get(o.date) ?? { date: o.date };
      row.ndvi = o.value;
      byDate.set(o.date, row);
    }
  }
  if (rainfall) {
    for (const o of rainfall.observations) {
      const row = byDate.get(o.date) ?? { date: o.date };
      row.rainfall = o.value;
      byDate.set(o.date, row);
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
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
            labelFormatter={(d) => new Date(d).toDateString()}
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
              connectNulls={false}
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
              connectNulls={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
