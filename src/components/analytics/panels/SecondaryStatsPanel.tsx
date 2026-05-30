// Panel showing secondary lifetime stats (globals, HoFs, hit rate, avg kill value)
import { useMemo } from 'react';
import { useHuntStore } from '../../../store';
import { MetricTile } from '../../common/Panel';

/**
 * Displays secondary stats: globals, HoFs, hit rate, and average kill value
 */
export default function SecondaryStatsPanel() {
  const lifetimeStats = useHuntStore((state) => state.analyticsLifetimeStats);
  const sessions = useHuntStore((state) => state.sessions);
  const timeRange = useHuntStore((state) => state.analyticsTimeRange);
  const selectedTags = useHuntStore((state) => state.analyticsSelectedTags);

  // Calculate hit rate for filtered sessions
  const lifetimeHitRate = useMemo(() => {
    const { startTime, endTime } = timeRange;
    const filtered = sessions.filter((s) => {
      if (startTime !== null && s.startTime < startTime) return false;
      if (endTime !== null && s.startTime > endTime) return false;
      if (selectedTags.length > 0 && !selectedTags.every((t) => (s.tags || []).includes(t)))
        return false;
      return true;
    });
    const totalHits = filtered.reduce(
      (sum, s) => sum + (s.stats.hits || 0) + (s.stats.criticalHits || 0),
      0
    );
    return lifetimeStats.totalShotsFired > 0
      ? (totalHits / lifetimeStats.totalShotsFired) * 100
      : 0;
  }, [sessions, timeRange, selectedTags, lifetimeStats.totalShotsFired]);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      <MetricTile label="Globals" value={lifetimeStats.totalGlobals} tone="warning" />
      <MetricTile label="Hall of Fame" value={lifetimeStats.totalHofs} tone="accent" />
      <MetricTile label="Hit Rate" value={`${lifetimeHitRate.toFixed(2)}%`} tone="accent" />
      <MetricTile
        label="Avg Kill Value"
        value={`${
          lifetimeStats.totalKills > 0
            ? (lifetimeStats.totalLoot / lifetimeStats.totalKills).toFixed(2)
            : '0.00'
        } PED`}
      />
    </div>
  );
}
