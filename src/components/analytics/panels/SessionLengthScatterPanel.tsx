import { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useHuntStore } from '../../../store';
import { InfoTooltip } from '../../common/InfoTooltip';

interface ScatterPoint {
  durationHours: number;
  returnRate: number;
  name: string;
}

export default function SessionLengthScatterPanel() {
  const sessions = useHuntStore((state) => state.sessions);
  const timeRange = useHuntStore((state) => state.analyticsTimeRange);
  const selectedTags = useHuntStore((state) => state.analyticsSelectedTags);

  const points = useMemo(() => {
    const filtered = sessions.filter((s) => {
      if (s.status !== 'completed') return false;
      if (s.stats.totalCost <= 0) return false;
      if (s.stats.duration <= 0) return false;
      if (timeRange.startTime !== null && s.startTime < timeRange.startTime) return false;
      if (timeRange.endTime !== null && s.startTime > timeRange.endTime) return false;
      if (selectedTags.length > 0 && !selectedTags.every((t) => (s.tags || []).includes(t)))
        return false;
      return true;
    });

    return filtered.map(
      (s): ScatterPoint => ({
        durationHours: parseFloat((s.stats.duration / 3600).toFixed(2)),
        returnRate: parseFloat(((s.stats.totalLoot / s.stats.totalCost) * 100).toFixed(1)),
        name: s.name,
      })
    );
  }, [sessions, timeRange.startTime, timeRange.endTime, selectedTags]);

  if (points.length < 3) return null;

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-bold">Session Length vs Profitability</h3>
        <InfoTooltip tooltip="Each dot is a completed session. X-axis is duration in hours, Y-axis is return rate %. The green line marks 100% (break-even)." />
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="durationHours"
            type="number"
            name="Duration"
            unit="h"
            stroke="var(--color-text-muted)"
            tick={{ fontSize: 11 }}
            label={{
              value: 'Duration (hours)',
              position: 'insideBottom',
              offset: -5,
              fill: '#3B82F6',
              fontSize: 11,
            }}
          />
          <YAxis
            dataKey="returnRate"
            type="number"
            name="Return Rate"
            unit="%"
            stroke="var(--color-text-muted)"
            tick={{ fontSize: 11 }}
            label={{
              value: 'Return %',
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
            formatter={(value: number, name: string) => {
              if (name === 'Return Rate') return `${value.toFixed(1)}%`;
              if (name === 'Duration') return `${value.toFixed(2)}h`;
              return value;
            }}
            labelFormatter={(_label: string, payload: Array<{ payload?: ScatterPoint }>) => {
              const point = payload?.[0]?.payload;
              return point?.name || '';
            }}
          />
          <ReferenceLine y={100} stroke="#10B981" strokeDasharray="6 4" strokeWidth={1.5} />
          <Scatter data={points} fill="#3B82F6" fillOpacity={0.7} r={5} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
