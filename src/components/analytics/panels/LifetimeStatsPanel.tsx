import { useHuntStore } from '../../../store';

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export default function LifetimeStatsPanel() {
  const lifetimeStats = useHuntStore((state) => state.analyticsLifetimeStats);

  const lifetimeProfit = lifetimeStats.totalLoot - lifetimeStats.totalCost;
  const lifetimeReturnRate =
    lifetimeStats.totalCost > 0 ? (lifetimeStats.totalLoot / lifetimeStats.totalCost) * 100 : 0;

  return (
    <div className="grid grid-cols-6 gap-4">
      <div className="card p-4">
        <div className="text-sm text-muted mb-1">Total Loot</div>
        <div className="text-2xl font-bold text-green-400">
          {lifetimeStats.totalLoot.toFixed(2)} PED
        </div>
      </div>
      <div className="card p-4">
        <div className="text-sm text-muted mb-1">Total Cost</div>
        <div className="text-2xl font-bold text-red-400">
          {lifetimeStats.totalCost.toFixed(2)} PED
        </div>
      </div>
      <div className="card p-4">
        <div className="text-sm text-muted mb-1">Net Profit</div>
        <div
          className={`text-2xl font-bold ${lifetimeProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}
        >
          {lifetimeProfit >= 0 ? '+' : ''}
          {lifetimeProfit.toFixed(2)} PED
        </div>
      </div>
      <div className="card p-4">
        <div className="text-sm text-muted mb-1">Return Rate</div>
        <div
          className={`text-2xl font-bold ${lifetimeReturnRate >= 100 ? 'text-green-400' : 'text-red-400'}`}
        >
          {lifetimeReturnRate.toFixed(2)}%
        </div>
      </div>
      <div className="card p-4">
        <div className="text-sm text-muted mb-1">Total Kills</div>
        <div className="text-2xl font-bold text-body">
          {lifetimeStats.totalKills.toLocaleString()}
        </div>
      </div>
      <div className="card p-4">
        <div className="text-sm text-muted mb-1">Total Time</div>
        <div className="text-2xl font-bold text-body">
          {formatDuration(lifetimeStats.totalDuration)}
        </div>
      </div>
    </div>
  );
}
