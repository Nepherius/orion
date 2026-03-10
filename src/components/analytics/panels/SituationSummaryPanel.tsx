// Panel showing a summary of the current hunting situation
import { useMemo } from 'react';
import { useHuntStore } from '../../../store';

/**
 * Displays a quick summary of hunting health, best weapon/location, and win rate
 */
export default function SituationSummaryPanel() {
  const lifetimeStats = useHuntStore((state) => state.analyticsLifetimeStats);
  const advanced = useHuntStore((state) => state.analyticsData.advanced);
  const performance = useHuntStore((state) => state.analyticsData.performance);

  const lifetimeProfit = lifetimeStats.totalLoot - lifetimeStats.totalCost;
  const lifetimeReturnRate =
    lifetimeStats.totalCost > 0 ? (lifetimeStats.totalLoot / lifetimeStats.totalCost) * 100 : 0;

  const sessionWinRate = advanced?.sessionWinRate ?? 0;

  // Find best weapon by return rate
  const bestWeapon = useMemo(() => {
    const weaponPerf = performance?.weaponData;
    if (!weaponPerf || weaponPerf.length === 0) return null;
    return [...weaponPerf].sort((a, b) => b.returnRate - a.returnRate)[0];
  }, [performance?.weaponData]);

  // Find best location with at least 2 sessions
  const bestLocation = useMemo(() => {
    const locationPerf = performance?.locationData;
    if (!locationPerf || locationPerf.length === 0) return null;
    const candidates = locationPerf.filter((loc) => loc.sessions >= 2);
    if (candidates.length === 0) return null;
    return [...candidates].sort((a, b) => b.returnRate - a.returnRate)[0];
  }, [performance?.locationData]);

  return (
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
  );
}
