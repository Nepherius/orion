import { useHuntStore } from '../../../store';
import { MetricTile, Panel } from '../../common/Panel';

export default function GlobalAnalysisPanel() {
  const performance = useHuntStore((state) => state.analyticsData.performance);

  if (!performance) return null;

  return (
    <Panel
      title="Global & Hall of Fame Analysis"
      tooltip="Tracks global drop rates and HoF occurrences"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <MetricTile
          label="Total Globals"
          value={performance.totalGlobalsCount}
          valueClassName="text-yellow-400"
        />
        <MetricTile
          label="Total HoFs"
          value={performance.totalHoFsCount}
          valueClassName="text-purple-400"
        />
        <MetricTile
          label="Global/Kill"
          tooltip="Number of globals per kill"
          value={performance.globalDropRatePerKill.toFixed(2)}
        />
        <MetricTile
          label="Global/Hour"
          tooltip="Globals per hour of hunting"
          value={performance.globalDropRatePerHour.toFixed(2)}
        />
        <MetricTile
          label="Avg Global Value"
          value={`${performance.avgGlobalValue.toFixed(2)} PED`}
          valueClassName="text-green-400"
        />
        <MetricTile
          label="Best Global"
          value={`${performance.bestGlobalValue.toFixed(2)} PED`}
          valueClassName="text-green-400"
        />
      </div>
    </Panel>
  );
}
