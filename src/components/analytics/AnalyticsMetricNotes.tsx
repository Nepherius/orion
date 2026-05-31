import { Panel } from '../common/Panel';

const metricNotes = [
  {
    label: 'Return rate',
    formula: 'total loot / total cost * 100',
    note: 'Zero-cost sessions are excluded or shown as 0 where a ratio would be invalid.',
  },
  {
    label: 'Profit / loss',
    formula: 'total loot - total cost',
    note: 'Uses adjusted loot value where markup/fixed value is already reflected in the session.',
  },
  {
    label: 'Hourly rates',
    formula: 'metric total / active session hours',
    note: 'Active time excludes paused time when pause metadata is available.',
  },
  {
    label: 'Correlation / statistical panels',
    formula: 'completed sessions with duration > 0 and cost > 0',
    note: 'Panels hide or warn when the sample is too small for a meaningful model.',
  },
];

export function AnalyticsMetricNotes() {
  return (
    <Panel title="Metric Notes">
      <details className="text-sm text-muted">
        <summary className="cursor-pointer text-body">Calculation assumptions</summary>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          {metricNotes.map((metric) => (
            <div key={metric.label} className="rounded border border-border bg-white/[0.03] p-3">
              <div className="font-semibold text-body">{metric.label}</div>
              <div className="mt-1 font-mono text-xs text-blue-300">{metric.formula}</div>
              <div className="mt-2 text-xs">{metric.note}</div>
            </div>
          ))}
        </div>
      </details>
    </Panel>
  );
}
