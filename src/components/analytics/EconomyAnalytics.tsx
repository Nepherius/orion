import { useMemo } from 'react';
import { HuntSession } from '../../types';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { DollarSign, TrendingUp, Coins } from 'lucide-react';
import { format } from 'date-fns';
import {
  calculateAmmoCostPerKill,
  calculateWeaponDecayCostPerKill,
} from '../../utils/analyticsCalculations';
import { MetricTile, Panel } from '../common/Panel';
import { StatCard } from '../common/StatCard';
import { chartAxisProps, chartGridProps, chartTooltipProps } from './chartStyles';

interface EconomyAnalyticsProps {
  session: HuntSession;
}

export function EconomyAnalytics({ session }: EconomyAnalyticsProps) {
  const totalLoot = session.stats.totalLoot;
  const totalSpend = session.stats.totalCost;
  const netPL = totalLoot - totalSpend;
  const lootPerPED = totalSpend > 0 ? totalLoot / totalSpend : 0;
  const costPerKill = session.stats.kills > 0 ? totalSpend / session.stats.kills : 0;
  const lootPerKill = session.stats.kills > 0 ? totalLoot / session.stats.kills : 0;

  const ammoCostPerKill = calculateAmmoCostPerKill(session);
  const weaponDecayCostPerKill = calculateWeaponDecayCostPerKill(session);

  // Loot vs Spend over time
  const economyChart = useMemo(() => {
    return session.loot.map((item, index) => {
      const cumulativeLoot = session.loot
        .slice(0, index + 1)
        .reduce((sum, l) => sum + l.totalValue, 0);
      const cumulativeCost = totalSpend * ((index + 1) / session.loot.length);
      return {
        index: index + 1,
        loot: cumulativeLoot,
        spend: cumulativeCost,
        time: format(item.timestamp, 'HH:mm'),
      };
    });
  }, [session.loot, totalSpend]);

  // Top loot items by value
  const topLootItems = [...session.loot]
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 10)
    .map((item) => ({
      name: item.name,
      value: item.totalValue,
    }));

  // Cost breakdown
  const costBreakdown = [
    { name: 'Ammo', value: session.ammoCost },
    { name: 'Weapon Decay', value: session.weaponDecay },
    { name: 'Healing', value: session.healingCost },
    { name: 'Other', value: session.otherCosts },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <MetricTile
          label="Total Loot"
          value={`${totalLoot.toFixed(2)} PED`}
          tone="positive"
          icon={<Coins className="h-5 w-5 shrink-0" />}
          size="lg"
        />
        <MetricTile
          label="Total Spend"
          value={`${totalSpend.toFixed(2)} PED`}
          tone="negative"
          icon={<DollarSign className="h-5 w-5 shrink-0" />}
          size="lg"
        />
        <MetricTile
          label="Net P/L"
          value={`${netPL >= 0 ? '+' : ''}${netPL.toFixed(2)} PED`}
          tone={netPL >= 0 ? 'positive' : 'negative'}
          icon={netPL >= 0 ? <TrendingUp className="h-5 w-5 shrink-0" /> : undefined}
          size="lg"
        />
        <MetricTile label="Loot Per PED" value={lootPerPED.toFixed(2)} size="lg" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Loot vs Spend */}
        <Panel title="Loot vs Spend Over Time">
          {economyChart.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={economyChart}>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="index" {...chartAxisProps} />
                <YAxis {...chartAxisProps} />
                <Tooltip
                  {...chartTooltipProps}
                  formatter={(value: number) => `${value.toFixed(2)} PED`}
                />
                <Legend />
                <Line type="monotone" dataKey="loot" stroke="#22C55E" strokeWidth={2} name="Loot" />
                <Line
                  type="monotone"
                  dataKey="spend"
                  stroke="#EF4444"
                  strokeWidth={2}
                  name="Spend"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Panel>

        {/* Top Loot Items */}
        <Panel title="Top Loot Items">
          {topLootItems.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted">No loot yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topLootItems} layout="vertical">
                <CartesianGrid {...chartGridProps} />
                <XAxis type="number" {...chartAxisProps} />
                <YAxis dataKey="name" type="category" width={120} {...chartAxisProps} />
                <Tooltip
                  {...chartTooltipProps}
                  formatter={(value: number) => [`${value.toFixed(2)} PED`, 'Value']}
                />
                <Bar dataKey="value" fill="#22C55E" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      {/* Cost Breakdown and Metrics */}
      <div className="grid grid-cols-2 gap-6">
        <Panel title="Cost Breakdown">
          {costBreakdown.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted">
              No costs recorded
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={costBreakdown}>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="name" {...chartAxisProps} />
                <YAxis {...chartAxisProps} />
                <Tooltip
                  {...chartTooltipProps}
                  formatter={(value: number) => [`${value.toFixed(2)} PED`, 'Cost']}
                />
                <Bar dataKey="value" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Economic Metrics">
          <div className="space-y-3">
            <StatCard
              label="Total Loot"
              value={`${totalLoot.toFixed(2)} PED`}
              color="text-green-400"
            />
            <StatCard
              label="Total Spend"
              value={`${totalSpend.toFixed(2)} PED`}
              color="text-red-400"
            />
            <StatCard label="Cost/Kill" value={`${costPerKill.toFixed(2)} PED`} />
            <StatCard label="Loot/Kill" value={`${lootPerKill.toFixed(2)} PED`} />
            <StatCard
              label="Ammo Cost/Kill"
              value={ammoCostPerKill.toFixed(2)}
              info="Ammo cost per kill. Shows ammo efficiency"
            />
            <StatCard
              label="Weapon Decay/Kill"
              value={weaponDecayCostPerKill.toFixed(2)}
              info="Weapon decay cost per kill"
            />
            <StatCard
              label="Net P/L"
              value={`${netPL >= 0 ? '+' : ''}${netPL.toFixed(2)} PED`}
              color={netPL >= 0 ? 'text-green-400' : 'text-red-400'}
            />
            <StatCard label="Loot/PED" value={lootPerPED.toFixed(2)} />
          </div>
        </Panel>
      </div>
    </div>
  );
}
