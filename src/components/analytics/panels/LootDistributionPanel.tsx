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
import { InfoTooltip } from '../../common/InfoTooltip';

const BUCKETS = [
  { label: '0–1', min: 0, max: 1, color: '#6B7280' },
  { label: '1–5', min: 1, max: 5, color: '#3B82F6' },
  { label: '5–20', min: 5, max: 20, color: '#10B981' },
  { label: '20–50', min: 20, max: 50, color: '#F59E0B' },
  { label: '50–100', min: 50, max: 100, color: '#EF4444' },
  { label: '100–500', min: 100, max: 500, color: '#8B5CF6' },
  { label: '500+', min: 500, max: Infinity, color: '#EC4899' },
];

export default function LootDistributionPanel() {
  const sessions = useHuntStore((state) => state.sessions);
  const timeRange = useHuntStore((state) => state.analyticsTimeRange);

  const data = useMemo(() => {
    const filtered = sessions.filter((s) => {
      if (timeRange.startTime !== null && s.startTime < timeRange.startTime) return false;
      if (timeRange.endTime !== null && s.startTime > timeRange.endTime) return false;
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
  }, [sessions, timeRange.startTime, timeRange.endTime]);

  const totalDrops = data.reduce((sum, b) => sum + b.count, 0);
  if (totalDrops === 0) return null;

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-bold">Loot Distribution</h3>
        <InfoTooltip tooltip="Histogram showing how your individual loot drops are distributed by PED value. Helps identify whether you rely on many small drops or fewer large ones." />
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="label"
            stroke="var(--color-text-muted)"
            tick={{ fontSize: 11 }}
            label={{
              value: 'Loot Value (PED)',
              position: 'insideBottom',
              offset: -5,
              fill: '#3B82F6',
              fontSize: 11,
            }}
          />
          <YAxis
            stroke="var(--color-text-muted)"
            tick={{ fontSize: 11 }}
            label={{
              value: 'Drops',
              angle: -90,
              position: 'insideLeft',
              fill: '#10B981',
              fontSize: 11,
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
            labelStyle={{ color: '#F3F4F6' }}
            itemStyle={{ color: '#F3F4F6' }}
            formatter={(value: number, name: string, props: { payload?: { totalValue: number; count: number } }) => {
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
    </div>
  );
}
