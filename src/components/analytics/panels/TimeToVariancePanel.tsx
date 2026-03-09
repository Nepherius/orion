import { useMemo } from 'react';
import { useHuntStore } from '../../../store';
import { calculateTimeToVarianceMetrics } from '../../../utils/analyticsCalculations';
import { InfoTooltip } from '../../common/InfoTooltip';

export default function TimeToVariancePanel() {
  const sessions = useHuntStore((state) => state.sessions);
  const timeRange = useHuntStore((state) => state.analyticsTimeRange);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (timeRange.startTime !== null && s.startTime < timeRange.startTime) return false;
      if (timeRange.endTime !== null && s.startTime > timeRange.endTime) return false;
      return true;
    });
  }, [sessions, timeRange.startTime, timeRange.endTime]);

  const variance = useMemo(
    () => calculateTimeToVarianceMetrics(filteredSessions, 5),
    [filteredSessions]
  );

  if (!variance) {
    return null;
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-bold">Time-to-Variance</h3>
        <InfoTooltip tooltip="How quickly return volatility stabilizes across completed sessions. pp = percentage points (e.g., 95% to 105% is +10 pp)." />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div className="border border-border rounded p-4">
          <div className="text-sm text-muted mb-2">Recent Volatility (σ)</div>
          <div className="text-2xl font-bold text-body">
            {variance.recentReturnStdDev.toFixed(2)} pp
          </div>
        </div>
        <div className="border border-border rounded p-4">
          <div className="text-sm text-muted mb-2">Overall Volatility (σ)</div>
          <div className="text-2xl font-bold text-body">
            {variance.overallReturnStdDev.toFixed(2)} pp
          </div>
        </div>
        <div className="border border-border rounded p-4">
          <div className="text-sm text-muted mb-2">Stability Threshold</div>
          <div className="text-2xl font-bold text-blue-400">
            {variance.stabilityThreshold.toFixed(2)} pp
          </div>
        </div>
        <div className="border border-border rounded p-4">
          <div className="text-sm text-muted mb-2">Stability Reached</div>
          <div className="text-lg font-bold text-green-400">
            {variance.sessionsToStability
              ? `${variance.sessionsToStability} sessions`
              : 'Not reached'}
          </div>
          {variance.hoursToStability !== null && (
            <div className="text-sm text-muted mt-1">{variance.hoursToStability.toFixed(1)}h</div>
          )}
        </div>
      </div>
    </div>
  );
}
