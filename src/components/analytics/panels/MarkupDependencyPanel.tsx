import { useMemo } from 'react';
import { useHuntStore } from '../../../store';
import { calculateMarkupDependencyMetrics } from '../../../utils/analyticsCalculations';
import { MetricTile, Panel } from '../../common/Panel';

export default function MarkupDependencyPanel() {
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

  const markup = useMemo(
    () => calculateMarkupDependencyMetrics(filteredSessions),
    [filteredSessions]
  );

  if (!markup) {
    return null;
  }

  return (
    <Panel
      title="Markup Dependency"
      tooltip="Compares TT-only profitability against markup-adjusted profitability."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Net With Markup"
          value={`${markup.netWithMarkup.toFixed(2)} PED`}
          valueClassName={markup.netWithMarkup >= 0 ? 'text-green-400' : 'text-red-400'}
        />
        <MetricTile
          label="Net At TT"
          value={`${markup.netAtTt.toFixed(2)} PED`}
          valueClassName={markup.netAtTt >= 0 ? 'text-green-400' : 'text-red-400'}
        />
        <MetricTile
          label="Markup Uplift"
          value={`${markup.totalMarkupGain.toFixed(2)} PED`}
          valueClassName="text-yellow-400"
          detail={`${markup.markupShareOfLoot.toFixed(1)}% of loot`}
        />
        <MetricTile
          label="Break-even Markup"
          value={
            markup.breakEvenMarkupPercent !== null
              ? `${markup.breakEvenMarkupPercent.toFixed(1)}%`
              : 'N/A'
          }
          valueClassName="text-blue-400"
        />
      </div>
    </Panel>
  );
}
