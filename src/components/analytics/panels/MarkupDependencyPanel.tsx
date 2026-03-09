import { useMemo } from 'react';
import { useHuntStore } from '../../../store';
import { calculateMarkupDependencyMetrics } from '../../../utils/analyticsCalculations';
import { InfoTooltip } from '../../common/InfoTooltip';

export default function MarkupDependencyPanel() {
  const sessions = useHuntStore((state) => state.sessions);
  const timeRange = useHuntStore((state) => state.analyticsTimeRange);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (timeRange.startTime !== null && s.startTime < timeRange.startTime) return false;
      if (timeRange.endTime !== null && s.startTime > timeRange.endTime) return false;
      return true;
    });
  }, [sessions, timeRange.startTime, timeRange.endTime]);

  const markup = useMemo(
    () => calculateMarkupDependencyMetrics(filteredSessions),
    [filteredSessions]
  );

  if (!markup) {
    return null;
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-bold">Markup Dependency</h3>
        <InfoTooltip tooltip="Compares TT-only profitability against markup-adjusted profitability." />
      </div>
      <div className="grid grid-cols-4 gap-4">
        <div className="border border-border rounded p-4">
          <div className="text-sm text-muted mb-2">Net With Markup</div>
          <div
            className={`text-2xl font-bold ${markup.netWithMarkup >= 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            {markup.netWithMarkup.toFixed(2)} PED
          </div>
        </div>
        <div className="border border-border rounded p-4">
          <div className="text-sm text-muted mb-2">Net At TT</div>
          <div
            className={`text-2xl font-bold ${markup.netAtTt >= 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            {markup.netAtTt.toFixed(2)} PED
          </div>
        </div>
        <div className="border border-border rounded p-4">
          <div className="text-sm text-muted mb-2">Markup Uplift</div>
          <div className="text-2xl font-bold text-yellow-400">
            {markup.totalMarkupGain.toFixed(2)} PED
          </div>
          <div className="text-sm text-muted mt-1">
            {markup.markupShareOfLoot.toFixed(1)}% of loot
          </div>
        </div>
        <div className="border border-border rounded p-4">
          <div className="text-sm text-muted mb-2">Break-even Markup</div>
          <div className="text-2xl font-bold text-blue-400">
            {markup.breakEvenMarkupPercent !== null
              ? `${markup.breakEvenMarkupPercent.toFixed(1)}%`
              : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
}
