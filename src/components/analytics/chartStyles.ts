export const chartGridProps = {
  strokeDasharray: '3 3',
  stroke: 'var(--color-border)',
  opacity: 0.7,
} as const;

export const chartAxisProps = {
  stroke: 'var(--color-text-muted)',
  tick: { fill: 'var(--color-text-muted)', fontSize: 12 },
  tickLine: false,
} as const;

export const chartTooltipProps = {
  contentStyle: {
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.24)',
  },
  labelStyle: { color: 'var(--color-text)' },
  itemStyle: { color: 'var(--color-text)' },
} as const;
