// Panel showing lifetime summary stats for the user
import { useHuntStore } from '../../../store';
import { formatDurationMinutes } from '../../../utils/formatters';
import { MetricTile } from '../../common/Panel';

/**
 * Displays total loot, cost, profit, and return rate for all time
 */
export default function LifetimeStatsPanel() {
  const lifetimeStats = useHuntStore((state) => state.analyticsLifetimeStats);

  const lifetimeProfit = lifetimeStats.totalLoot - lifetimeStats.totalCost;
  const lifetimeReturnRate =
    lifetimeStats.totalCost > 0 ? (lifetimeStats.totalLoot / lifetimeStats.totalCost) * 100 : 0;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <MetricTile
        label="Total Loot"
        value={`${lifetimeStats.totalLoot.toFixed(2)} PED`}
        tone="positive"
      />
      <MetricTile
        label="Total Cost"
        value={`${lifetimeStats.totalCost.toFixed(2)} PED`}
        tone="negative"
      />
      <MetricTile
        label="Net Profit"
        value={`${lifetimeProfit >= 0 ? '+' : ''}${lifetimeProfit.toFixed(2)} PED`}
        tone={lifetimeProfit >= 0 ? 'positive' : 'negative'}
      />
      <MetricTile
        label="Return Rate"
        value={`${lifetimeReturnRate.toFixed(2)}%`}
        tone={lifetimeReturnRate >= 100 ? 'positive' : 'negative'}
      />
      <MetricTile label="Total Kills" value={lifetimeStats.totalKills.toLocaleString()} />
      <MetricTile label="Total Time" value={formatDurationMinutes(lifetimeStats.totalDuration)} />
    </div>
  );
}
