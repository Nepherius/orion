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
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import {
  calculateKillStats,
  calculateMaturityDistribution,
} from '../../utils/analyticsCalculations';
import { DataTable, DataTableColumn } from '../common/DataTable';
import { MetricTile, Panel } from '../common/Panel';
import { chartAxisProps, chartGridProps, chartTooltipProps } from './chartStyles';

interface KillTrackingAnalyticsProps {
  sessions: HuntSession[];
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

export function KillTrackingAnalytics({ sessions }: KillTrackingAnalyticsProps) {
  const killStats = useMemo(() => {
    const stats = calculateKillStats(sessions);
    return Object.entries(stats)
      .map(([creature, data]) => ({
        creature,
        ...data,
      }))
      .sort((a, b) => b.totalKills - a.totalKills);
  }, [sessions]);

  const maturityDistribution = useMemo(() => {
    return calculateMaturityDistribution(sessions);
  }, [sessions]);

  const totalKills = useMemo(() => {
    return killStats.reduce((sum, c) => sum + c.totalKills, 0);
  }, [killStats]);

  const totalKillProfit = useMemo(() => {
    return killStats.reduce((sum, c) => sum + c.totalProfit, 0);
  }, [killStats]);

  const topCreaturesByKills = useMemo(() => {
    return killStats.slice(0, 10).map((c) => ({
      creature: c.creature,
      kills: c.totalKills,
      profit: c.totalProfit,
      returnRate: c.totalCost > 0 ? (c.totalLoot / c.totalCost) * 100 : 0,
    }));
  }, [killStats]);

  const profitPerKillChart = useMemo(() => {
    return killStats
      .filter((c) => c.totalKills > 0)
      .slice(0, 15)
      .map((c) => ({
        creature: c.creature,
        kills: c.totalKills,
        profitPerKill: c.averageProfitPerKill,
        costPerKill: c.averageCostPerKill,
      }));
  }, [killStats]);

  const hpVsProfitChart = useMemo(() => {
    return killStats
      .filter((c) => c.totalKills > 0)
      .map((c) => ({
        creature: c.creature,
        hpDealt: c.averageHPDealt,
        profitPerKill: c.averageProfitPerKill,
        kills: c.totalKills,
      }));
  }, [killStats]);

  const maturityBreakdown = useMemo(() => {
    const maturityCounts: Record<string, number> = {};

    for (const creature in maturityDistribution) {
      for (const entry of maturityDistribution[creature]) {
        if (!maturityCounts[entry.maturity]) {
          maturityCounts[entry.maturity] = 0;
        }
        maturityCounts[entry.maturity] += entry.kills;
      }
    }

    return Object.entries(maturityCounts)
      .map(([maturity, kills]) => ({
        maturity,
        kills,
        percentage: totalKills > 0 ? (kills / totalKills) * 100 : 0,
      }))
      .sort((a, b) => b.kills - a.kills);
  }, [maturityDistribution, totalKills]);

  const topMaturityCreatures = useMemo(() => {
    const comboMap = new Map<
      string,
      {
        creature: string;
        maturity: string;
        kills: number;
        profit: number;
      }
    >();

    for (const session of sessions) {
      if (!session.kills || session.kills.length === 0) {
        continue;
      }

      for (const kill of session.kills) {
        const creature = kill.creatureName || 'Unknown';
        const maturity = kill.maturity || 'Unknown';
        const key = `${creature}::${maturity}`;
        const existing = comboMap.get(key);
        const killProfit = kill.lootValue - kill.cost;

        if (existing) {
          existing.kills += 1;
          existing.profit += killProfit;
        } else {
          comboMap.set(key, {
            creature,
            maturity,
            kills: 1,
            profit: killProfit,
          });
        }
      }
    }

    return Array.from(comboMap.values())
      .filter((c) => c.kills > 0)
      .sort((a, b) => b.kills - a.kills)
      .slice(0, 15);
  }, [sessions]);

  const costEfficiency = useMemo(() => {
    return killStats
      .filter((c) => c.totalKills > 0)
      .map((c) => ({
        creature: c.creature,
        kills: c.totalKills,
        costPerKill: c.averageCostPerKill,
        lootPerKill: c.averageLootPerKill,
        returnRate:
          c.averageCostPerKill > 0 ? (c.averageLootPerKill / c.averageCostPerKill) * 100 : 0,
      }))
      .sort((a, b) => b.kills - a.kills)
      .slice(0, 10);
  }, [killStats]);

  const costEfficiencyColumns: Array<DataTableColumn<(typeof costEfficiency)[number]>> = [
    {
      key: 'creature',
      header: 'Creature',
      render: (creature) => (
        <span className="block truncate font-semibold">{creature.creature}</span>
      ),
    },
    { key: 'kills', header: 'Kills', align: 'right', render: (creature) => creature.kills },
    {
      key: 'costPerKill',
      header: 'Cost/Kill',
      align: 'right',
      render: (creature) => <span className="text-red-400">{creature.costPerKill.toFixed(2)}</span>,
    },
    {
      key: 'lootPerKill',
      header: 'Adj Loot/Kill',
      align: 'right',
      render: (creature) => (
        <span className="text-green-400">{creature.lootPerKill.toFixed(2)}</span>
      ),
    },
    {
      key: 'returnRate',
      header: 'Adj Return',
      align: 'right',
      render: (creature) => (
        <span
          className={`font-semibold ${creature.returnRate >= 100 ? 'text-green-400' : 'text-red-400'}`}
        >
          {creature.returnRate.toFixed(2)}%
        </span>
      ),
    },
  ];

  if (totalKills === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No kills tracked yet. Enable HP-based maturity inference in settings to begin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key metrics cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <MetricTile label="Total Kills Tracked" value={totalKills} tone="accent" size="lg" />
        <MetricTile
          label="Unique Creatures Killed"
          value={killStats.length}
          tone="positive"
          size="lg"
        />
        <MetricTile
          label="Adj Kill Profit"
          value={`${totalKillProfit >= 0 ? '+' : ''}${totalKillProfit.toFixed(2)} PED`}
          tone={totalKillProfit >= 0 ? 'positive' : 'negative'}
          size="lg"
        />
        <MetricTile
          label="Avg Adj P/L Per Kill"
          value={`${totalKills > 0 ? (totalKillProfit / totalKills).toFixed(1) : 0} PED`}
          tone="warning"
          size="lg"
        />
      </div>

      {/* Top creatures by kills and profit */}
      <Panel
        title="Top Creatures by Kill Count"
        tooltip="Shows the top 10 creatures by number of kills tracked, with profit analysis"
      >
        {topCreaturesByKills.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted">No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topCreaturesByKills}>
              <CartesianGrid {...chartGridProps} />
              <XAxis
                dataKey="creature"
                angle={-45}
                textAnchor="end"
                height={80}
                {...chartAxisProps}
              />
              <YAxis
                yAxisId="left"
                label={{ value: 'Kills', angle: -90, position: 'insideLeft' }}
                {...chartAxisProps}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                label={{ value: 'Adjusted P/L (PED)', angle: 90, position: 'insideRight' }}
                {...chartAxisProps}
              />
              <Tooltip
                {...chartTooltipProps}
                formatter={(value) => (typeof value === 'number' ? value.toFixed(1) : value)}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="kills" fill="#3b82f6" name="Kills" />
              <Bar yAxisId="right" dataKey="profit" fill="#10b981" name="Adjusted P/L (PED)" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      {/* Adjusted profit per kill vs cost per kill */}
      <Panel
        title="Cost vs Adjusted P/L Per Kill"
        tooltip="Compares average cost and loot per kill for top creatures"
      >
        {profitPerKillChart.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted">No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={profitPerKillChart}>
              <CartesianGrid {...chartGridProps} />
              <XAxis
                dataKey="creature"
                angle={-45}
                textAnchor="end"
                height={80}
                {...chartAxisProps}
              />
              <YAxis
                label={{ value: 'PED per Kill', angle: -90, position: 'insideLeft' }}
                {...chartAxisProps}
              />
              <Tooltip
                {...chartTooltipProps}
                formatter={(value) => (typeof value === 'number' ? value.toFixed(1) : value)}
              />
              <Legend />
              <Bar dataKey="costPerKill" fill="#ef4444" name="Cost/Kill" />
              <Bar dataKey="profitPerKill" fill="#10b981" name="Adjusted P/L/Kill" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Panel>

      {/* Maturity breakdown */}
      <div className="grid grid-cols-2 gap-6">
        <Panel
          title="Maturity Distribution"
          tooltip="Shows the distribution of kills across different creature maturities"
        >
          {maturityBreakdown.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted">No maturity data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={maturityBreakdown}
                    dataKey="kills"
                    nameKey="maturity"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {maturityBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...chartTooltipProps} formatter={(value) => `${value} kills`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-4">
                {maturityBreakdown.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span>{m.maturity}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-300">{m.kills}</span>
                      <span className="text-muted ml-2">({m.percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Panel>

        {/* Top maturity/creature combos */}
        <Panel
          title="Top Creature/Maturity Combos"
          tooltip="Shows the most frequently encountered creature maturity combinations"
        >
          {topMaturityCreatures.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted">No data yet</div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {topMaturityCreatures.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-border bg-white/[0.03] p-3 transition-colors hover:bg-surface-hover"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{item.creature}</div>
                      <div className="text-xs text-muted">{item.maturity}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-bold text-blue-400">{item.kills} kills</div>
                      <div
                        className={`text-xs ${item.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}
                      >
                        {item.profit >= 0 ? '+' : ''}
                        {item.profit.toFixed(2)} PED
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* HP dealt vs profit scatter */}
      <Panel
        title="Average HP vs Adjusted P/L Per Kill"
        tooltip="Visualizes the relationship between creature HP and profitability"
      >
        {hpVsProfitChart.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted">No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid {...chartGridProps} />
              <XAxis
                dataKey="hpDealt"
                label={{ value: 'Avg HP Dealt', position: 'insideBottomRight', offset: -10 }}
                {...chartAxisProps}
              />
              <YAxis
                label={{ value: 'Adjusted P/L/Kill (PED)', angle: -90, position: 'insideLeft' }}
                {...chartAxisProps}
              />
              <Tooltip
                {...chartTooltipProps}
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value) => (typeof value === 'number' ? value.toFixed(1) : value)}
                labelFormatter={() => ''}
              />
              <Scatter name="Creatures" data={hpVsProfitChart} fill="#8b5cf6" />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </Panel>

      {/* Cost efficiency table */}
      <Panel
        title="Cost Efficiency Analysis"
        tooltip="Shows return on investment per creature type (loot/cost ratio)"
      >
        {costEfficiency.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted">No data yet</div>
        ) : (
          <DataTable
            columns={costEfficiencyColumns}
            rows={costEfficiency}
            getRowKey={(creature) => creature.creature}
          />
        )}
      </Panel>
    </div>
  );
}
