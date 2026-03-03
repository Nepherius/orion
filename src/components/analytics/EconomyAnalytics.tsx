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
import { InfoTooltip } from '../common/InfoTooltip';
import {
  calculateAmmoCostPerKill,
  calculateWeaponDecayCostPerKill,
} from '../../utils/analyticsCalculations';

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
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="text-sm text-muted mb-2">TOTAL LOOT</div>
          <div className="text-3xl font-bold text-green-400">
            <Coins className="w-5 h-5 inline mr-2" />
            {totalLoot.toFixed(2)} PED
          </div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-muted mb-2">TOTAL SPEND</div>
          <div className="text-3xl font-bold text-red-400">
            <DollarSign className="w-5 h-5 inline mr-2" />
            {totalSpend.toFixed(2)} PED
          </div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-muted mb-2">NET P/L</div>
          <div
            className={`text - 3xl font - bold ${netPL >= 0 ? 'text-green-400' : 'text-red-400'} `}
          >
            {netPL >= 0 ? <TrendingUp className="w-5 h-5 inline mr-2" /> : null}
            {netPL >= 0 ? '+' : ''}
            {netPL.toFixed(2)} PED
          </div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-muted mb-2">LOOT PER PED</div>
          <div className="text-3xl font-bold text-body">{lootPerPED.toFixed(2)}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Loot vs Spend */}
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Loot vs Spend Over Time</h3>
          {economyChart.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={economyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="index" stroke="var(--color-text-muted)" />
                <YAxis stroke="var(--color-text-muted)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
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
        </div>

        {/* Top Loot Items */}
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Top Loot Items</h3>
          {topLootItems.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted">No loot yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topLootItems} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" stroke="var(--color-text-muted)" />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={120}
                  stroke="var(--color-text-muted)"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                  formatter={(value: number) => [`${value.toFixed(2)} PED`, 'Value']}
                />
                <Bar dataKey="value" fill="#22C55E" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Cost Breakdown and Metrics */}
      <div className="grid grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Cost Breakdown</h3>
          {costBreakdown.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted">
              No costs recorded
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={costBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" />
                <YAxis stroke="var(--color-text-muted)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                  formatter={(value: number) => [`${value.toFixed(2)} PED`, 'Cost']}
                />
                <Bar dataKey="value" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Economic Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between p-3 bg-surface rounded">
              <span className="text-gray-300">Total Loot</span>
              <span className="font-bold text-green-400">{totalLoot.toFixed(2)} PED</span>
            </div>
            <div className="flex justify-between p-3 bg-surface rounded">
              <span className="text-gray-300">Total Spend</span>
              <span className="font-bold text-red-400">{totalSpend.toFixed(2)} PED</span>
            </div>
            <div className="flex justify-between p-3 bg-surface rounded">
              <span className="text-gray-300">Cost/Kill</span>
              <span className="font-bold text-body">{costPerKill.toFixed(2)} PED</span>
            </div>
            <div className="flex justify-between p-3 bg-surface rounded">
              <span className="text-gray-300">Loot/Kill</span>
              <span className="font-bold text-body">{lootPerKill.toFixed(2)} PED</span>
            </div>
            <div className="flex justify-between p-3 bg-surface rounded">
              <div className="flex items-center gap-2 text-gray-300">
                Ammo Cost/Kill
                <InfoTooltip tooltip="Ammo cost per kill. Shows ammo efficiency" />
              </div>
              <span className="font-bold text-body">{ammoCostPerKill.toFixed(2)}</span>
            </div>
            <div className="flex justify-between p-3 bg-surface rounded">
              <div className="flex items-center gap-2 text-gray-300">
                Weapon Decay/Kill
                <InfoTooltip tooltip="Weapon decay cost per kill" />
              </div>
              <span className="font-bold text-body">{weaponDecayCostPerKill.toFixed(2)}</span>
            </div>
            <div className="flex justify-between p-3 bg-surface rounded">
              <span className="text-gray-300">Net P/L</span>
              <span className={`font - bold ${netPL >= 0 ? 'text-green-400' : 'text-red-400'} `}>
                {netPL >= 0 ? '+' : ''}
                {netPL.toFixed(2)} PED
              </span>
            </div>
            <div className="flex justify-between p-3 bg-surface rounded">
              <span className="text-gray-300">Loot/PED</span>
              <span className="font-bold text-body">{lootPerPED.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
