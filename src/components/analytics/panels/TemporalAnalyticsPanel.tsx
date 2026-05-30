import { useHuntStore } from '../../../store';
import { MetricTile, Panel } from '../../common/Panel';

export default function TemporalAnalyticsPanel() {
  const advanced = useHuntStore((state) => state.analyticsData.advanced);

  if (!advanced) return null;

  const { temporalInsights } = advanced;

  return (
    <Panel title="Temporal Analytics" tooltip="Time-based behavior and performance patterns">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricTile
          label="Avg Session Duration"
          tooltip="Average active session length in hours"
          value={`${temporalInsights.avgSessionHours.toFixed(2)}h`}
        />
        <MetricTile
          label="Peak Performance Window"
          tooltip="Start-hour window with highest average return rate"
          value={temporalInsights.bestHourLabel}
          valueClassName="text-green-400"
          detail={`${temporalInsights.bestHourReturnRate.toFixed(1)}% avg return`}
        />
        <MetricTile
          label="Avg Cooldown Gap"
          tooltip="Average hours between session starts"
          value={`${temporalInsights.avgGapHours.toFixed(2)}h`}
          valueClassName="text-blue-400"
        />
      </div>
    </Panel>
  );
}
