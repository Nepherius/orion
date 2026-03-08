export interface AnalyticsOverviewTabProps {
  lifetimeStats: {
    totalLoot: number;
    totalCost: number;
    totalKills: number;
    totalGlobals: number;
    totalHofs: number;
    totalDamage: number;
    totalShotsFired: number;
    totalDuration: number;
    totalSessions: number;
  };
  lifetimeProfit: number;
  lifetimeReturnRate: number;
  lifetimeHitRate: number;
  sessionWinRate: number;
  bestWeapon: { weapon: string } | null;
  bestLocation: { location: string } | null;
  formatDuration: (seconds: number) => string;
}

export function AnalyticsOverviewTab({
  lifetimeStats,
  lifetimeProfit,
  lifetimeReturnRate,
  lifetimeHitRate,
  sessionWinRate,
  bestWeapon,
  bestLocation,
  formatDuration,
}: AnalyticsOverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Lifetime Stats Cards */}
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

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-sm text-muted mb-1">Globals</div>
          <div className="text-2xl font-bold text-yellow-400">{lifetimeStats.totalGlobals}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-muted mb-1">Hall of Fame</div>
          <div className="text-2xl font-bold text-purple-400">{lifetimeStats.totalHofs}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-muted mb-1">Hit Rate</div>
          <div className="text-2xl font-bold text-blue-400">{lifetimeHitRate.toFixed(2)}%</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-muted mb-1">Avg Kill Value</div>
          <div className="text-2xl font-bold text-body">
            {lifetimeStats.totalKills > 0
              ? (lifetimeStats.totalLoot / lifetimeStats.totalKills).toFixed(2)
              : '0.00'}{' '}
            PED
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">Situation Summary</h3>
            <p className="text-sm text-muted mt-1">
              Quick read of current hunting health before drilling into details.
            </p>
          </div>
          <div
            className={`text-sm px-3 py-1 rounded-full border ${
              lifetimeReturnRate >= 100
                ? 'text-green-300 border-green-400/30 bg-green-500/10'
                : 'text-red-300 border-red-400/30 bg-red-500/10'
            }`}
          >
            {lifetimeReturnRate >= 100 ? 'Profitable' : 'Under 100% Return'}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="border border-border rounded p-4">
            <div className="text-sm text-muted mb-2">Current Direction</div>
            <div
              className={`text-xl font-bold ${lifetimeProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}
            >
              {lifetimeProfit >= 0 ? 'Positive' : 'Negative'}
            </div>
            <div className="text-xs text-muted mt-1">{lifetimeProfit.toFixed(2)} PED net</div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="text-sm text-muted mb-2">Session Consistency</div>
            <div className="text-xl font-bold text-blue-400">{sessionWinRate.toFixed(1)}%</div>
            <div className="text-xs text-muted mt-1">Profitable sessions</div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="text-sm text-muted mb-2">Best Setup Snapshot</div>
            <div className="text-sm font-semibold truncate" title={bestWeapon?.weapon || 'N/A'}>
              Weapon: {bestWeapon?.weapon || 'N/A'}
            </div>
            <div
              className="text-sm font-semibold truncate mt-1"
              title={bestLocation?.location || 'N/A'}
            >
              Location: {bestLocation?.location || 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsOverviewTab;
