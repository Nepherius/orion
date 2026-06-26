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
import {
  calculateCreatureStats,
  calculateCreatureStatsByLocation,
} from '../../utils/analyticsCalculations';
import { DataTable, DataTableColumn } from '../common/DataTable';
import { MetricTile, Panel } from '../common/Panel';
import { StatCard } from '../common/StatCard';
import { chartAxisProps, chartGridProps, chartTooltipProps } from './chartStyles';

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

  const bestProfitableCreature =
    creatureStats.filter((c) => c.profit > 0).sort((a, b) => b.profit - a.profit)[0] ?? null;

  const returnRateColumns: Array<DataTableColumn<(typeof creatureDifficulty)[number]>> = [
    {
      key: 'creature',
      header: 'Creature',
      render: (creature) => (
        <span className="block truncate font-semibold">{creature.creature}</span>
      ),
    },
    {
      key: 'returnRate',
      header: 'Adj Return %',
      align: 'right',
      render: (creature) => (
        <span
          className={`font-bold ${creature.returnRate >= 100 ? 'text-green-400' : 'text-red-400'}`}
        >
          {creature.returnRate.toFixed(2)}%
        </span>
      ),
    },
    {
      key: 'killsPerSession',
      header: 'Kills/Session',
      align: 'right',
      render: (creature) => creature.avgKillsPerSession.toFixed(2),
    },
    {
      key: 'costPerKill',
      header: 'Cost/Kill',
      align: 'right',
      render: (creature) => creature.costPerKill.toFixed(2),
    },
    {
      key: 'lootPerKill',
      header: 'Loot/Kill',
      align: 'right',
      render: (creature) => (
        <span className="text-green-400">
          {(creature.costPerKill * (creature.returnRate / 100)).toFixed(2)}
        </span>
      ),
    },
  ];

  const creatureColumns: Array<DataTableColumn<(typeof creatureStats)[number]>> = [
    {
      key: 'creature',
      header: 'Creature',
      render: (creature) => (
        <span className="block truncate font-semibold">{creature.creature}</span>
      ),
    },
    { key: 'sessions', header: 'Sessions', align: 'right', render: (creature) => creature.count },
    { key: 'kills', header: 'Kills', align: 'right', render: (creature) => creature.totalKills },
    {
      key: 'returnRate',
      header: 'Adj Return %',
      align: 'right',
      render: (creature) => (
        <span
          className={`font-bold ${creature.returnRate >= 100 ? 'text-green-400' : 'text-red-400'}`}
        >
          {creature.returnRate.toFixed(2)}%
        </span>
      ),
    },
    {
      key: 'profit',
      header: 'Profit',
      align: 'right',
      render: (creature) => (
        <span className={`font-bold ${creature.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {creature.profit >= 0 ? '+' : ''}
          {creature.profit.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'costPerKill',
      header: 'Cost/Kill',
      align: 'right',
      render: (creature) => creature.costPerKill.toFixed(2),
    },
    {
      key: 'lootPerKill',
      header: 'Loot/Kill',
      align: 'right',
      render: (creature) => (
        <span className="text-green-400">{creature.lootPerKill.toFixed(2)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Key metrics cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <MetricTile
          label="Total Unique Creatures"
          value={creatureStats.length}
          tone="accent"
          icon={<Zap className="h-5 w-5 shrink-0" />}
          size="lg"
        />
        <MetricTile
          label="Most Killed Creature"
          value={creatureStats[0]?.creature || 'N/A'}
          tone="positive"
          detail={`${creatureStats[0]?.totalKills || 0} kills`}
          size="md"
        />
        <MetricTile
          label="Most Profitable Creature"
          value={bestProfitableCreature?.creature || 'N/A'}
          tone="positive"
          detail={
            bestProfitableCreature ? `+${bestProfitableCreature.profit.toFixed(2)} PED` : '0 PED'
          }
          size="md"
        />
      </div>

      {/* Most killed per location */}
      <div className="grid grid-cols-2 gap-6">
        <Panel
          title="Most Killed Creature by Location"
          tooltip="Shows the creature with the most kills per location"
        >
          {mostKilledByLocation.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted">No data yet</div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {mostKilledByLocation.map((item, idx) => (
                <StatCard
                  key={idx}
                  label={`${item.location} - ${item.creature}`}
                  value={`${item.kills} (${((item.kills / item.totalLocationKills) * 100).toFixed(1)}%)`}
                  color="text-green-400"
                />
              ))}
            </div>
          )}
        </Panel>

        {/* Most profitable per location */}
        <Panel
          title="Most Profitable Creature by Location"
          tooltip="Shows the creature with the highest profit per location"
        >
          {mostProfitableByLocation.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted">No data yet</div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {mostProfitableByLocation.map((item, idx) => (
                <StatCard
                  key={idx}
                  label={`${item.location} - ${item.creature}`}
                  value={`${item.profit >= 0 ? '+' : ''}${item.profit.toFixed(2)} PED`}
                  color={item.profit >= 0 ? 'text-green-400' : 'text-red-400'}
                />
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Creature performance chart */}
      <div className="grid grid-cols-2 gap-6">
        {/* Cost per Kill vs Loot per Kill */}
        <Panel
          title="Creature Efficiency"
          tooltip="Cost per kill vs Loot per kill for top creatures"
        >
          {creatureEfficiencyChart.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={creatureEfficiencyChart} layout="vertical">
                <CartesianGrid {...chartGridProps} />
                <XAxis type="number" {...chartAxisProps} />
                <YAxis dataKey="creature" type="category" width={100} {...chartAxisProps} />
                <Tooltip
                  {...chartTooltipProps}
                  formatter={(value: number) => `${value.toFixed(2)} PED`}
                />
                <Legend />
                <Bar dataKey="costPerKill" stackId="a" fill="#EF4444" name="Cost/Kill" />
                <Bar dataKey="lootPerKill" stackId="a" fill="#22C55E" name="Loot/Kill" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        {/* Top Profitable Creatures */}
        <Panel title="Top Profitable Creatures" tooltip="Creatures ranked by total profit">
          {topProfitableCreatures.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProfitableCreatures}>
                <CartesianGrid {...chartGridProps} />
                <XAxis
                  dataKey="creature"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  {...chartAxisProps}
                />
                <YAxis {...chartAxisProps} />
                <Tooltip
                  {...chartTooltipProps}
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
        </Panel>
      </div>

      {/* Creature Adjusted Return Ranking */}
      <Panel
        title="Best Adjusted Return by Creature"
        tooltip="Creatures ranked by adjusted return (loot including markup and fixed values divided by cost)"
      >
        {creatureDifficulty.length === 0 ? (
          <div className="flex items-center justify-center text-muted h-64">No data yet</div>
        ) : (
          <DataTable
            columns={returnRateColumns}
            rows={creatureDifficulty}
            getRowKey={(creature) => creature.creature}
            maxHeightClassName="max-h-80 overflow-y-auto"
          />
        )}
      </Panel>

      {/* Detailed Creature Comparison Table */}
      <Panel
        title="All Creatures Comparison"
        tooltip="Complete creature statistics across all sessions"
      >
        {creatureStats.length === 0 ? (
          <div className="flex items-center justify-center text-muted h-64">No data yet</div>
        ) : (
          <DataTable
            columns={creatureColumns}
            rows={creatureStats}
            getRowKey={(creature) => creature.creature}
            maxHeightClassName="max-h-96 overflow-y-auto"
          />
        )}
      </Panel>
    </div>
  );
}
