import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format } from 'date-fns';
import { useHuntStore } from '../../../store';

export default function PerformanceTrendPanel() {
  const recentSessionsRaw = useHuntStore(
    (state) => state.analyticsData.performance?.recentSessions
  );

  const recentSessions = useMemo(() => {
    if (!recentSessionsRaw) return [];
    return recentSessionsRaw.map((s) => ({
      date: format(s.startTime, 'MM/dd'),
      returnRate: s.returnRate,
      profit: s.profit,
      loot: s.loot,
    }));
  }, [recentSessionsRaw]);

  if (recentSessions.length === 0) return null;

  return (
    <div className="card p-6">
      <h3 className="text-lg font-bold mb-4">Performance Trend (Last 30 Sessions)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={recentSessions}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="date" stroke="var(--color-text-muted)" />
          <YAxis stroke="var(--color-text-muted)" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
            labelStyle={{ color: '#F3F4F6' }}
            formatter={(value: number) => value.toFixed(2)}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="returnRate"
            stroke="#10B981"
            name="Return Rate %"
            strokeWidth={2}
          />
          <Line type="monotone" dataKey="loot" stroke="#3B82F6" name="Loot (PED)" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
