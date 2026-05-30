import { useMemo } from 'react';
import { useHuntStore } from '../../../store';
import { calculateTimeToVarianceMetrics } from '../../../utils/analyticsCalculations';
import { MetricTile, Panel } from '../../common/Panel';

export default function TimeToVariancePanel() {
  const sessions = useHuntStore((state) => state.sessions);
  const timeRange = useHuntStore((state) => state.analyticsTimeRange);
  const selectedTags = useHuntStore((state) => state.analyticsSelectedTags);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (timeRange.startTime !== null && s.startTime < timeRange.startTime) return false;
      if (timeRange.endTime !== null && s.startTime > timeRange.endTime) return false;
      if (selectedTags.length > 0 && !selectedTags.every((t) => (s.tags || []).includes(t)))
        return false;
      return true;
    });
  }, [sessions, timeRange.startTime, timeRange.endTime, selectedTags]);

  const variance = useMemo(
    () => calculateTimeToVarianceMetrics(filteredSessions, 5),
    [filteredSessions]
  );

  if (!variance) {
    return null;
  }

  return (
    <Panel
      title="Time-to-Variance"
      tooltip="How quickly return volatility stabilizes across completed sessions. pp = percentage points (e.g., 95% to 105% is +10 pp)."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Recent Volatility (σ)"
          value={`${variance.recentReturnStdDev.toFixed(2)} pp`}
        />
        <MetricTile
          label="Overall Volatility (σ)"
          value={`${variance.overallReturnStdDev.toFixed(2)} pp`}
        />
        <MetricTile
          label="Stability Threshold"
          value={`${variance.stabilityThreshold.toFixed(2)} pp`}
          valueClassName="text-blue-400"
        />
        <MetricTile
          label="Stability Reached"
          value={
            variance.sessionsToStability
              ? `${variance.sessionsToStability} sessions`
              : 'Not reached'
          }
          valueClassName="text-green-400"
          detail={
            variance.hoursToStability !== null
              ? `${variance.hoursToStability.toFixed(1)}h`
              : undefined
          }
        />
      </div>
    </Panel>
  );
}
