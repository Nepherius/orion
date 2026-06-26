// Panel showing lifetime summary stats for the user
import { useHuntStore } from '../../../store';
import { formatDurationMinutes } from '../../../utils/formatters';
import { MetricTile } from '../../common/Panel';

/**
 * Displays total loot, cost, profit, and adjusted return for all time
 */
export default function LifetimeStatsPanel() {
  const lifetimeStats = useHuntStore((state) => state.analyticsLifetimeStats);

  const lifetimeAdjustedLoot = lifetimeStats.totalAdjustedLoot;
  const lifetimeTtProfit = lifetimeStats.totalTtLoot - lifetimeStats.totalCost;
  const lifetimeProfit = lifetimeAdjustedLoot - lifetimeStats.totalCost;
  const lifetimeReturnRate =
    lifetimeStats.totalCost > 0 ? (lifetimeAdjustedLoot / lifetimeStats.totalCost) * 100 : 0;
  const lifetimeTtReturnRate =
    lifetimeStats.totalCost > 0 ? (lifetimeStats.totalTtLoot / lifetimeStats.totalCost) * 100 : 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      <MetricTile
        label="Total Cost"
        value={`${lifetimeStats.totalCost.toFixed(2)} PED`}
        tone="negative"
      />
      <MetricTile
        label="TT Loot"
        value={`${lifetimeStats.totalTtLoot.toFixed(2)} PED`}
        tone="accent"
      />
      <MetricTile
        label="TT P/L"
        value={`${lifetimeTtProfit >= 0 ? '+' : ''}${lifetimeTtProfit.toFixed(2)} PED`}
        tone={lifetimeTtProfit >= 0 ? 'positive' : 'negative'}
      />
      <MetricTile
        label="TT Return"
        value={`${lifetimeTtReturnRate.toFixed(2)}%`}
        tone={lifetimeTtReturnRate >= 100 ? 'positive' : 'negative'}
      />
      <MetricTile
        label="MU/Fixed Uplift"
        value={`+${(lifetimeStats.totalMarkupGain + lifetimeStats.totalFixedGain).toFixed(2)} PED`}
        detail={`MU ${lifetimeStats.totalMarkupGain.toFixed(2)} · fixed ${lifetimeStats.totalFixedGain.toFixed(2)}`}
        tone="positive"
      />
      <MetricTile
        label="Adjusted Loot"
        value={`${lifetimeAdjustedLoot.toFixed(2)} PED`}
        tone="positive"
      />
      <MetricTile
        label="Adjusted P/L"
        value={`${lifetimeProfit >= 0 ? '+' : ''}${lifetimeProfit.toFixed(2)} PED`}
        tone={lifetimeProfit >= 0 ? 'positive' : 'negative'}
      />
      <MetricTile
        label="Adjusted Return"
        value={`${lifetimeReturnRate.toFixed(2)}%`}
        tone={lifetimeReturnRate >= 100 ? 'positive' : 'negative'}
      />
      <MetricTile label="Total Kills" value={lifetimeStats.totalKills.toLocaleString()} />
      <MetricTile label="Total Time" value={formatDurationMinutes(lifetimeStats.totalDuration)} />
    </div>
  );
}
