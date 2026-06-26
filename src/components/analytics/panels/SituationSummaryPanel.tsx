// Panel showing a summary of the current hunting situation
import { useMemo } from 'react';
import { useHuntStore } from '../../../store';
import { MetricTile, Panel } from '../../common/Panel';

/**
 * Displays a quick summary of hunting health, best weapon/location, and win rate
 */
export default function SituationSummaryPanel() {
  const lifetimeStats = useHuntStore((state) => state.analyticsLifetimeStats);
  const advanced = useHuntStore((state) => state.analyticsData.advanced);
  const performance = useHuntStore((state) => state.analyticsData.performance);

  const lifetimeProfit = lifetimeStats.totalAdjustedLoot - lifetimeStats.totalCost;
  const lifetimeReturnRate =
    lifetimeStats.totalCost > 0
      ? (lifetimeStats.totalAdjustedLoot / lifetimeStats.totalCost) * 100
      : 0;

  const sessionWinRate = advanced?.sessionWinRate ?? 0;

  // Find best weapon by adjusted return
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
    <Panel
      title="Situation Summary"
      action={
        <div
          className={`text-sm px-3 py-1 rounded-full border ${
            lifetimeReturnRate >= 100
              ? 'text-green-300 border-green-400/30 bg-green-500/10'
              : 'text-red-300 border-red-400/30 bg-red-500/10'
          }`}
        >
          {lifetimeReturnRate >= 100 ? 'Profitable' : 'Under 100% Return'}
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <MetricTile
          label="Current Direction"
          value={lifetimeProfit >= 0 ? 'Positive' : 'Negative'}
          tone={lifetimeProfit >= 0 ? 'positive' : 'negative'}
          detail={`${lifetimeProfit.toFixed(2)} PED adjusted net`}
          size="sm"
        />
        <MetricTile
          label="Session Consistency"
          value={`${sessionWinRate.toFixed(1)}%`}
          tone="accent"
          detail="Profitable sessions"
          size="sm"
        />
        <div className="rounded-lg border border-border bg-white/[0.03] p-4">
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
    </Panel>
  );
}
