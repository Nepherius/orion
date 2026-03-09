import { useHuntStore } from '../../../store';
import { InfoTooltip } from '../../common/InfoTooltip';

export default function GlobalAnalysisPanel() {
  const performance = useHuntStore((state) => state.analyticsData.performance);

  if (!performance) return null;

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-bold">Global & Hall of Fame Analysis</h3>
        <InfoTooltip tooltip="Tracks global drop rates and HoF occurrences" />
      </div>
      <div className="grid grid-cols-6 gap-4">
        <div className="border border-border rounded p-4">
          <div className="text-sm text-muted mb-2">Total Globals</div>
          <div className="text-2xl font-bold text-yellow-400">{performance.totalGlobalsCount}</div>
        </div>
        <div className="border border-border rounded p-4">
          <div className="text-sm text-muted mb-2">Total HoFs</div>
          <div className="text-2xl font-bold text-purple-400">{performance.totalHoFsCount}</div>
        </div>
        <div className="border border-border rounded p-4">
          <div className="flex items-center gap-1 text-sm text-muted mb-2">
            Global/Kill
            <InfoTooltip tooltip="Number of globals per kill" />
          </div>
          <div className="text-2xl font-bold text-body">
            {performance.globalDropRatePerKill.toFixed(2)}
          </div>
        </div>
        <div className="border border-border rounded p-4">
          <div className="flex items-center gap-1 text-sm text-muted mb-2">
            Global/Hour
            <InfoTooltip tooltip="Globals per hour of hunting" />
          </div>
          <div className="text-2xl font-bold text-body">
            {performance.globalDropRatePerHour.toFixed(2)}
          </div>
        </div>
        <div className="border border-border rounded p-4">
          <div className="text-sm text-muted mb-2">Avg Global Value</div>
          <div className="text-2xl font-bold text-green-400">
            {performance.avgGlobalValue.toFixed(2)} PED
          </div>
        </div>
        <div className="border border-border rounded p-4">
          <div className="text-sm text-muted mb-2">Best Global</div>
          <div className="text-2xl font-bold text-green-400">
            {performance.bestGlobalValue.toFixed(2)} PED
          </div>
        </div>
      </div>
    </div>
  );
}
