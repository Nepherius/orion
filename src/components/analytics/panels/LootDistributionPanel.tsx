import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useHuntStore } from '../../../store';
import { Panel } from '../../common/Panel';
import { chartAxisProps, chartGridProps, chartTooltipProps } from '../chartStyles';
import { AnalyticsEmptyState } from '../AnalyticsEmptyState';

function generateBucketColor(index: number, totalBuckets: number) {
  // Use HSL for smooth transitions
  // First half: red to yellow (0° to 60°)
  // Second half: green to blue (120° to 240°)
  let hue;
  if (index < totalBuckets / 2) {
    // Red to yellow
    hue = 0 + (index * 60) / (totalBuckets / 2);
  } else {
    // Green to blue
    hue = 120 + ((index - totalBuckets / 2) * 120) / (totalBuckets / 2);
  }

  // Adjust saturation and lightness for better visibility
  const saturation = 80 + (index * 10) / totalBuckets; // 80% to 90%
  const lightness = 40 + (index * 20) / totalBuckets; // 40% to 60%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

const BUCKETS = [
  { label: '0 - 0.10', min: 0, max: 0.1, midpoint: 0.05, color: generateBucketColor(0, 13) },
  { label: '0.10 - 0.25', min: 0.1, max: 0.25, midpoint: 0.175, color: generateBucketColor(1, 13) },
  { label: '0.25 - 0.50', min: 0.25, max: 0.5, midpoint: 0.375, color: generateBucketColor(2, 13) },
  { label: '0.50 - 1.00', min: 0.5, max: 1, midpoint: 0.75, color: generateBucketColor(3, 13) },
  { label: '1.00 - 5.00', min: 1, max: 5, midpoint: 3, color: generateBucketColor(4, 13) },
  { label: '5.00 - 10.00', min: 5, max: 10, midpoint: 7.5, color: generateBucketColor(5, 13) },
  { label: '10.00 - 25.00', min: 10, max: 25, midpoint: 17.5, color: generateBucketColor(6, 13) },
  { label: '25.00 - 50.00', min: 25, max: 50, midpoint: 37.5, color: generateBucketColor(7, 13) },
  { label: '50.00 - 100.00', min: 50, max: 100, midpoint: 75, color: generateBucketColor(8, 13) },
  {
    label: '100.00 - 250.00',
    min: 100,
    max: 250,
    midpoint: 175,
    color: generateBucketColor(9, 13),
  },
  {
    label: '250.00 - 500.00',
    min: 250,
    max: 500,
    midpoint: 375,
    color: generateBucketColor(10, 13),
  },
  {
    label: '500.00 - 1000.00',
    min: 500,
    max: 1000,
    midpoint: 750,
    color: generateBucketColor(11, 13),
  },
  {
    label: '1000.00+',
    min: 1000,
    max: Infinity,
    midpoint: 1500,
    color: generateBucketColor(12, 13),
  },
];

export default function LootDistributionPanel() {
  const sessions = useHuntStore((state) => state.sessions);
  const timeRange = useHuntStore((state) => state.analyticsTimeRange);
  const selectedTags = useHuntStore((state) => state.analyticsSelectedTags);

  const data = useMemo(() => {
    const filtered = sessions.filter((s) => {
      if (timeRange.startTime !== null && s.startTime < timeRange.startTime) return false;
      if (timeRange.endTime !== null && s.startTime > timeRange.endTime) return false;
      if (selectedTags.length > 0 && !selectedTags.every((t) => (s.tags || []).includes(t)))
        return false;
      return true;
    });

    const counts = BUCKETS.map((b) => ({ ...b, count: 0, totalValue: 0 }));

    for (const session of filtered) {
      for (const item of session.loot) {
        const value = item.totalValue;
        const bucket = counts.find((b) => value >= b.min && value < b.max);
        if (bucket) {
          bucket.count += 1;
          bucket.totalValue += value;
        }
      }
    }

    return counts;
  }, [sessions, timeRange.startTime, timeRange.endTime, selectedTags]);

  const totalDrops = data.reduce((sum, b) => sum + b.count, 0);
  if (totalDrops === 0) {
    return (
      <AnalyticsEmptyState
        title="Loot Distribution"
        message="No tracked loot drops are available for the selected filters."
      />
    );
  }

  return (
    <Panel
      title="Loot Distribution"
      tooltip="Histogram showing how your individual loot drops are distributed by PED value. Helps identify whether you rely on many small drops or fewer large ones."
    >
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={data} margin={{ bottom: 60, left: 10, right: 10 }}>
          <CartesianGrid {...chartGridProps} />
          <XAxis
            dataKey="label"
            {...chartAxisProps}
            tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={70}
            label={{
              value: 'Loot Value (PED)',
              position: 'insideBottom',
              offset: -45,
              fill: 'var(--color-text-muted)',
              fontSize: 11,
            }}
          />
          <YAxis
            {...chartAxisProps}
            label={{
              value: 'Drops',
              angle: -90,
              position: 'insideLeft',
              fill: 'var(--color-text-muted)',
              fontSize: 11,
            }}
          />
          <Tooltip
            {...chartTooltipProps}
            formatter={(
              value: number,
              name: string,
              props: { payload?: { totalValue: number; count: number } }
            ) => {
              if (name === 'Drops') {
                const pct = totalDrops > 0 ? ((value / totalDrops) * 100).toFixed(1) : '0';
                const count = props.payload?.count ?? 0;
                const totalValue = props.payload?.totalValue ?? 0;
                const avg = count > 0 ? (totalValue / count).toFixed(2) : '0';
                return [`${value} (${pct}%) — avg ${avg} PED`, name];
              }
              return value;
            }}
            labelFormatter={(label: string) => `${label} PED`}
          />
          <Bar dataKey="count" name="Drops">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  );
}
