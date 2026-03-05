import { useMemo } from 'react';
import { HuntSession } from '../../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { Zap } from 'lucide-react';
import { InfoTooltip } from '../common/InfoTooltip';
import {
  calculateCreatureStats,
  calculateCreatureStatsByLocation,
} from '../../utils/analyticsCalculations';

interface CreatureAnalyticsProps {
  sessions: HuntSession[];
}

export function CreatureAnalytics({ sessions }: CreatureAnalyticsProps) {
  const creatureStats = useMemo(() => {
    const stats = calculateCreatureStats(sessions);
    return Object.entries(stats)
      .map(([creature, data]) => ({
        creature,
        ...data,
        returnRate: data.totalCost > 0 ? (data.totalLoot / data.totalCost) * 100 : 0,
        avgKillsPerSession: data.count > 0 ? data.totalKills / data.count : 0,
        costPerKill: data.totalKills > 0 ? data.totalCost / data.totalKills : 0,
        lootPerKill: data.totalKills > 0 ? data.totalLoot / data.totalKills : 0,
      }))
      .sort((a, b) => b.totalKills - a.totalKills);
  }, [sessions]);

  const creatureByLocation = useMemo(() => {
    return calculateCreatureStatsByLocation(sessions);
  }, [sessions]);

  // Most killed creatures by location
  const mostKilledByLocation = useMemo(() => {
    return Object.entries(creatureByLocation)
      .filter(([_, data]) => data.mostKilled !== null)
      .map(([location, data]) => ({
        location,
        creature: data.mostKilled!.creature,
        kills: data.mostKilled!.kills,
        totalLocationKills: data.totalKills,
      }))
      .sort((a, b) => b.kills - a.kills);
  }, [creatureByLocation]);

  // Most profitable creatures by location
  const mostProfitableByLocation = useMemo(() => {
    return Object.entries(creatureByLocation)
      .filter(([_, data]) => data.mostProfitable !== null)
      .map(([location, data]) => ({
        location,
        creature: data.mostProfitable!.creature,
        profit: data.mostProfitable!.profit,
      }))
      .sort((a, b) => b.profit - a.profit);
  }, [creatureByLocation]);

  // Creature efficiency (cost vs profit)
  const creatureEfficiencyChart = useMemo(() => {
    return creatureStats
      .filter((c) => c.totalKills > 0)
      .slice(0, 15)
      .map((c) => ({
        creature: c.creature,
        kills: c.totalKills,
        costPerKill: c.costPerKill,
        lootPerKill: c.lootPerKill,
        profit: c.profit,
      }));
  }, [creatureStats]);

  // Top profitable creatures
  const topProfitableCreatures = useMemo(() => {
    return creatureStats
      .filter((c) => c.totalKills > 0)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10)
      .map((c) => ({
        creature: c.creature,
        profit: c.profit,
        kills: c.totalKills,
        returnRate: c.returnRate,
      }));
  }, [creatureStats]);

  // Difficulty ranking (damage/cost per kill vs effectiveness)
  const creatureDifficulty = useMemo(() => {
    return creatureStats
      .filter((c) => c.totalKills > 0)
      .sort((a, b) => b.returnRate - a.returnRate)
      .slice(0, 10)
      .map((c) => ({
        creature: c.creature,
        returnRate: c.returnRate,
        avgKillsPerSession: c.avgKillsPerSession,
        costPerKill: c.costPerKill,
      }));
  }, [creatureStats]);

  return (
    <div className="space-y-6">
      {/* Key metrics cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-6">
          <div className="text-sm text-muted mb-2">TOTAL UNIQUE CREATURES</div>
          <div className="text-3xl font-bold text-blue-400">
            <Zap className="w-5 h-5 inline mr-2" />
            {creatureStats.length}
          </div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-muted mb-2">MOST KILLED CREATURE</div>
          <div className="text-2xl font-bold text-green-400">
            {creatureStats[0]?.creature || 'N/A'}
          </div>
          <div className="text-xs text-muted mt-1">{creatureStats[0]?.totalKills || 0} kills</div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-muted mb-2">MOST PROFITABLE CREATURE</div>
          <div className="text-2xl font-bold text-green-400">
            {creatureStats.length > 0
              ? creatureStats.filter((c) => c.profit > 0).sort((a, b) => b.profit - a.profit)[0]
                  ?.creature || 'N/A'
              : 'N/A'}
          </div>
          <div className="text-xs text-muted mt-1">
            {creatureStats.length > 0
              ? `+${
                  creatureStats
                    .filter((c) => c.profit > 0)
                    .sort((a, b) => b.profit - a.profit)[0]
                    ?.profit.toFixed(2) || 0
                } PED`
              : '0 PED'}
          </div>
        </div>
      </div>

      {/* Most killed per location */}
      <div className="grid grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-bold">Most Killed Creature by Location</h3>
            <InfoTooltip tooltip="Shows the creature with the most kills per location" />
          </div>
          {mostKilledByLocation.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted">No data yet</div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {mostKilledByLocation.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-surface rounded hover:bg-surface-hover transition-colors"
                >
                  <div>
                    <div className="font-semibold text-sm">{item.location}</div>
                    <div className="text-xs text-muted">{item.creature}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-400">{item.kills}</div>
                    <div className="text-xs text-muted">
                      {((item.kills / item.totalLocationKills) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Most profitable per location */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-bold">Most Profitable Creature by Location</h3>
            <InfoTooltip tooltip="Shows the creature with the highest profit per location" />
          </div>
          {mostProfitableByLocation.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted">No data yet</div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {mostProfitableByLocation.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-surface rounded hover:bg-surface-hover transition-colors"
                >
                  <div>
                    <div className="font-semibold text-sm">{item.location}</div>
                    <div className="text-xs text-muted">{item.creature}</div>
                  </div>
                  <div
                    className={`text-right font-bold ${item.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {item.profit >= 0 ? '+' : ''}
                    {item.profit.toFixed(2)} PED
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Creature performance chart */}
      <div className="grid grid-cols-2 gap-6">
        {/* Cost per Kill vs Loot per Kill */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-bold">Creature Efficiency</h3>
            <InfoTooltip tooltip="Cost per kill vs Loot per kill for top creatures" />
          </div>
          {creatureEfficiencyChart.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={creatureEfficiencyChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" stroke="var(--color-text-muted)" />
                <YAxis
                  dataKey="creature"
                  type="category"
                  width={100}
                  stroke="var(--color-text-muted)"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                  formatter={(value: number) => `${value.toFixed(2)} PED`}
                />
                <Legend />
                <Bar dataKey="costPerKill" stackId="a" fill="#EF4444" name="Cost/Kill" />
                <Bar dataKey="lootPerKill" stackId="a" fill="#22C55E" name="Loot/Kill" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Profitable Creatures */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-bold">Top Profitable Creatures</h3>
            <InfoTooltip tooltip="Creatures ranked by total profit" />
          </div>
          {topProfitableCreatures.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProfitableCreatures}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="creature"
                  stroke="var(--color-text-muted)"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="var(--color-text-muted)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                  formatter={(value: number) => [
                    `${value >= 0 ? '+' : ''}${value.toFixed(2)} PED`,
                    'Profit',
                  ]}
                />
                <Bar dataKey="profit" fill="#22C55E">
                  {topProfitableCreatures.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#22C55E' : '#EF4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Creature Return Rate Ranking */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-bold">Best Return Rate by Creature</h3>
          <InfoTooltip tooltip="Creatures ranked by return rate (loot/cost percentage)" />
        </div>
        {creatureDifficulty.length === 0 ? (
          <div className="flex items-center justify-center text-muted h-64">No data yet</div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            <div className="grid grid-cols-5 gap-2 text-xs font-bold text-muted pb-2 border-b border-border sticky top-0 bg-surface">
              <div>Creature</div>
              <div className="text-right">Return %</div>
              <div className="text-right">Kills/Session</div>
              <div className="text-right">Cost/Kill</div>
              <div className="text-right">Loot/Kill</div>
            </div>
            {creatureDifficulty.map((creature, idx) => (
              <div
                key={idx}
                className="grid grid-cols-5 gap-2 text-sm py-2 hover:bg-surface-hover rounded px-2 transition-colors"
              >
                <div className="font-semibold truncate">{creature.creature}</div>
                <div
                  className={`text-right font-bold ${creature.returnRate >= 100 ? 'text-green-400' : 'text-red-400'}`}
                >
                  {creature.returnRate.toFixed(2)}%
                </div>
                <div className="text-right text-muted">
                  {creature.avgKillsPerSession.toFixed(2)}
                </div>
                <div className="text-right text-muted">{creature.costPerKill.toFixed(2)}</div>
                <div className="text-right text-green-400">
                  {(creature.costPerKill * (creature.returnRate / 100)).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detailed Creature Comparison Table */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-bold">All Creatures Comparison</h3>
          <InfoTooltip tooltip="Complete creature statistics across all sessions" />
        </div>
        {creatureStats.length === 0 ? (
          <div className="flex items-center justify-center text-muted h-64">No data yet</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-7 gap-2 text-xs font-bold text-muted pb-2 border-b border-border sticky top-0 bg-surface">
              <div>Creature</div>
              <div className="text-right">Sessions</div>
              <div className="text-right">Kills</div>
              <div className="text-right">Return %</div>
              <div className="text-right">Profit</div>
              <div className="text-right">Cost/Kill</div>
              <div className="text-right">Loot/Kill</div>
            </div>
            {creatureStats.map((creature, idx) => (
              <div
                key={idx}
                className="grid grid-cols-7 gap-2 text-sm py-2 hover:bg-surface-hover rounded px-2 transition-colors"
              >
                <div className="font-semibold truncate">{creature.creature}</div>
                <div className="text-right text-muted">{creature.count}</div>
                <div className="text-right">{creature.totalKills}</div>
                <div
                  className={`text-right font-bold ${creature.returnRate >= 100 ? 'text-green-400' : 'text-red-400'}`}
                >
                  {creature.returnRate.toFixed(2)}%
                </div>
                <div
                  className={`text-right font-bold ${creature.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}
                >
                  {creature.profit >= 0 ? '+' : ''}
                  {creature.profit.toFixed(2)}
                </div>
                <div className="text-right text-muted">{creature.costPerKill.toFixed(2)}</div>
                <div className="text-right text-green-400">{creature.lootPerKill.toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
