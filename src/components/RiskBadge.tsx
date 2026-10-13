import type { RiskLevel } from '../types';

const LABELS: Record<RiskLevel, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  insufficient: 'Insufficient Data',
};

const CLASSES: Record<RiskLevel, string> = {
  low: 'risk-low',
  moderate: 'risk-moderate',
  high: 'risk-high',
  insufficient: 'risk-insufficient',
};

export default function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={`ig-badge ${CLASSES[level]}`} title={`Risk level: ${LABELS[level]}`}>
      {LABELS[level]}
    </span>
  );
}
