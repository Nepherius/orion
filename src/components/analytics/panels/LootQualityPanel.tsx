import { useHuntStore } from '../../../store';

export default function LootQualityPanel() {
  const performance = useHuntStore((state) => state.analyticsData.performance);

  if (!performance) return null;

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-bold">Loot Quality & Consistency</h3>
      </div>
      <div className="grid grid-cols-5 gap-4">
        <div className="border border-border rounded p-4">
          <div className="text-sm text-muted mb-2">Average Drop Value</div>
          <div className="text-2xl font-bold text-green-400">
            {performance.avgLootValue.toFixed(2)} PED
          </div>
        </div>
        <div className="border border-border rounded p-4">
          <div className="text-sm text-muted mb-2">Loot Consistency (Std Dev)</div>
          <div className="text-2xl font-bold text-blue-400">
            {performance.overallLootStdDev.toFixed(1)}
          </div>
        </div>
        <div className="border border-border rounded p-4">
          <div className="text-sm text-muted mb-2">Largest Drop</div>
          <div className="text-2xl font-bold text-yellow-400">
            {performance.largestDropValue.toFixed(2)} PED
          </div>
        </div>
        <div className="border border-border rounded p-4">
          <div className="text-sm text-muted mb-2">Minutes Per Loot</div>
          <div className="text-2xl font-bold text-body">
            {performance.avgMinutesPerLoot.toFixed(1)}
          </div>
        </div>
        <div className="border border-border rounded p-4">
          <div className="text-sm text-muted mb-2">Total Loot Events</div>
          <div className="text-2xl font-bold text-purple-400">{performance.totalLootEvents}</div>
        </div>
      </div>
    </div>
  );
}
