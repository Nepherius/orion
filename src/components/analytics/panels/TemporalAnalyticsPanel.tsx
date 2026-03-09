import { useHuntStore } from '../../../store';
import { InfoTooltip } from '../../common/InfoTooltip';

export default function TemporalAnalyticsPanel() {
  const advanced = useHuntStore((state) => state.analyticsData.advanced);

  if (!advanced) return null;

  const { temporalInsights } = advanced;

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-bold">Temporal Analytics</h3>
        <InfoTooltip tooltip="Time-based behavior and performance patterns" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-border rounded p-4">
          <div className="flex items-center gap-1 text-sm text-muted mb-2">
            Avg Session Duration
            <InfoTooltip tooltip="Average active session length in hours" />
          </div>
          <div className="text-2xl font-bold text-body">
            {temporalInsights.avgSessionHours.toFixed(2)}h
          </div>
        </div>
        <div className="border border-border rounded p-4">
          <div className="flex items-center gap-1 text-sm text-muted mb-2">
            Peak Performance Window
            <InfoTooltip tooltip="Start-hour window with highest average return rate" />
          </div>
          <div className="text-lg font-bold text-green-400">{temporalInsights.bestHourLabel}</div>
          <div className="text-sm text-muted mt-1">
            {temporalInsights.bestHourReturnRate.toFixed(1)}% avg return
          </div>
        </div>
        <div className="border border-border rounded p-4">
          <div className="flex items-center gap-1 text-sm text-muted mb-2">
            Avg Cooldown Gap
            <InfoTooltip tooltip="Average hours between session starts" />
          </div>
          <div className="text-2xl font-bold text-blue-400">
            {temporalInsights.avgGapHours.toFixed(2)}h
          </div>
        </div>
      </div>
    </div>
  );
}
