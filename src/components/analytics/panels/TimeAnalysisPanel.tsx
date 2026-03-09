import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useHuntStore } from '../../../store';
import { InfoTooltip } from '../../common/InfoTooltip';

interface HourBucket {
  hour: string;
  sessions: number;
  avgReturnRate: number;
  avgProfit: number;
  globals: number;
}

export default function TimeAnalysisPanel() {
  const sessions = useHuntStore((state) => state.sessions);
  const timeRange = useHuntStore((state) => state.analyticsTimeRange);

  const hourlyData = useMemo(() => {
    const filtered = sessions.filter((s) => {
      if (s.status !== 'completed') return false;
      if (timeRange.startTime !== null && s.startTime < timeRange.startTime) return false;
      if (timeRange.endTime !== null && s.startTime > timeRange.endTime) return false;
      return true;
    });

    if (filtered.length === 0) return [];

    // Accumulate stats per hour bucket (0–23)
    const buckets: Array<{
      count: number;
      totalReturnRate: number;
      totalProfit: number;
      globals: number;
    }> = Array.from({ length: 24 }, () => ({
      count: 0,
      totalReturnRate: 0,
      totalProfit: 0,
      globals: 0,
    }));

    for (const session of filtered) {
      // Normalise timestamp — if seconds, multiply to ms
      const tsMs =
        session.startTime < 1_000_000_000_000 ? session.startTime * 1000 : session.startTime;
      const hour = new Date(tsMs).getHours();
      const returnRate =
        session.stats.totalCost > 0 ? (session.stats.totalLoot / session.stats.totalCost) * 100 : 0;
      const profit = session.stats.totalLoot - session.stats.totalCost;

      buckets[hour].count += 1;
      buckets[hour].totalReturnRate += returnRate;
      buckets[hour].totalProfit += profit;
      buckets[hour].globals += session.stats.globals;
    }

    const data: HourBucket[] = buckets.map((bucket, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      sessions: bucket.count,
      avgReturnRate:
        bucket.count > 0 ? parseFloat((bucket.totalReturnRate / bucket.count).toFixed(1)) : 0,
      avgProfit: bucket.count > 0 ? parseFloat((bucket.totalProfit / bucket.count).toFixed(2)) : 0,
      globals: bucket.globals,
    }));

    return data;
  }, [sessions, timeRange.startTime, timeRange.endTime]);

  if (hourlyData.length === 0) return null;

  // Check if there is any activity at all
  const totalSessions = hourlyData.reduce((sum, h) => sum + h.sessions, 0);
  if (totalSessions === 0) return null;

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-bold">Time-of-Day Analysis</h3>
        <InfoTooltip tooltip="Shows session frequency, average return rate, and globals by hour of day. Based on completed sessions within the selected time range." />
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={hourlyData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="hour"
            stroke="var(--color-text-muted)"
            tick={{ fontSize: 11 }}
            interval={1}
          />
          <YAxis
            yAxisId="left"
            stroke="var(--color-text-muted)"
            tick={{ fontSize: 11 }}
            label={{
              value: 'Sessions',
              angle: -90,
              position: 'insideLeft',
              fill: 'var(--color-text-muted)',
              fontSize: 11,
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="var(--color-text-muted)"
            tick={{ fontSize: 11 }}
            label={{
              value: 'Return %',
              angle: 90,
              position: 'insideRight',
              fill: 'var(--color-text-muted)',
              fontSize: 11,
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
            labelStyle={{ color: '#F3F4F6' }}
            formatter={(value: number, name: string) => {
              if (name === 'Avg Return %') return `${value.toFixed(1)}%`;
              if (name === 'Avg Profit') return `${value.toFixed(2)} PED`;
              return value;
            }}
          />
          <Legend />
          <Bar yAxisId="left" dataKey="sessions" fill="#3B82F6" name="Sessions" opacity={0.8} />
          <Bar yAxisId="left" dataKey="globals" fill="#EAB308" name="Globals" opacity={0.8} />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="avgReturnRate"
            stroke="#10B981"
            strokeWidth={2}
            dot={{ r: 3, fill: '#10B981' }}
            name="Avg Return %"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
