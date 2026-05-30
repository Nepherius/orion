import { useMemo } from 'react';
import { useHuntStore } from '../../../store';
import { MetricTile, Panel } from '../../common/Panel';

export default function GeneralProjectionsPanel() {
  const sessions = useHuntStore((state) => state.sessions);
  const advanced = useHuntStore((state) => state.analyticsData.advanced);
  const timeRange = useHuntStore((state) => state.analyticsTimeRange);
  const selectedTags = useHuntStore((state) => state.analyticsSelectedTags);

  const projectedLifetimeProfit = advanced?.projectedLifetimeProfit ?? 0;
  const sessionsToBreakEven = advanced?.sessionsToBreakEven ?? null;

  const totalSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (timeRange.startTime !== null && s.startTime < timeRange.startTime) return false;
      if (timeRange.endTime !== null && s.startTime > timeRange.endTime) return false;
      if (selectedTags.length > 0 && !selectedTags.every((t) => (s.tags || []).includes(t)))
        return false;
      return true;
    }).length;
  }, [sessions, timeRange.startTime, timeRange.endTime, selectedTags]);

  return (
    <Panel
      title="General Projections & Predictions"
      tooltip="Based on recent session trends (last 10 sessions)"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricTile
          label="Projected Lifetime Profit"
          tooltip="Projection = all-time total + average recent trend"
          value={`${projectedLifetimeProfit >= 0 ? '+' : ''}${projectedLifetimeProfit.toFixed(2)} PED`}
          valueClassName={projectedLifetimeProfit >= 0 ? 'text-green-400' : 'text-red-400'}
        />
        {sessionsToBreakEven !== null && (
          <MetricTile
            label="Sessions to Break Even"
            tooltip="Sessions needed at current avg profit to reach 0"
            value={sessionsToBreakEven}
            valueClassName="text-orange-400"
          />
        )}
        <MetricTile
          label="Data Points Analyzed"
          tooltip="Number of sessions analyzed for general projections"
          value={totalSessions}
        />
      </div>
    </Panel>
  );
}
