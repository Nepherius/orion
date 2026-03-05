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
import { InfoTooltip } from '../common/InfoTooltip';
import {
  calculateKillStats,
  calculateMaturityDistribution,
} from '../../utils/analyticsCalculations';

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
      returnRate: c.totalLoot > 0 ? (c.totalProfit / c.totalLoot) * 100 : 0,
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
        returnRate: c.totalLoot > 0 ? (c.averageLootPerKill / c.averageCostPerKill) * 100 : 0,
      }))
      .sort((a, b) => b.kills - a.kills)
      .slice(0, 10);
  }, [killStats]);

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
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="text-sm text-muted mb-2">TOTAL KILLS TRACKED</div>
          <div className="text-3xl font-bold text-blue-400">{totalKills}</div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-muted mb-2">UNIQUE CREATURES KILLED</div>
          <div className="text-3xl font-bold text-green-400">{killStats.length}</div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-muted mb-2">TOTAL KILL PROFIT</div>
          <div
            className={`text-3xl font-bold ${totalKillProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}
          >
            {totalKillProfit >= 0 ? '+' : ''}
            {totalKillProfit.toFixed(2)} PED
          </div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-muted mb-2">AVG PROFIT PER KILL</div>
          <div className="text-3xl font-bold text-amber-400">
            {totalKills > 0 ? (totalKillProfit / totalKills).toFixed(1) : 0} PED
          </div>
        </div>
      </div>

      {/* Top creatures by kills and profit */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-bold">Top Creatures by Kill Count</h3>
          <InfoTooltip tooltip="Shows the top 10 creatures by number of kills tracked, with profit analysis" />
        </div>
        {topCreaturesByKills.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted">No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topCreaturesByKills}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="creature"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12 }}
                label={{ value: 'Kills', angle: -90, position: 'insideLeft' }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                label={{ value: 'Profit (PED)', angle: 90, position: 'insideRight' }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                formatter={(value) => (typeof value === 'number' ? value.toFixed(1) : value)}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="kills" fill="#3b82f6" name="Kills" />
              <Bar yAxisId="right" dataKey="profit" fill="#10b981" name="Profit (PED)" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Profit per kill vs cost per kill */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-bold">Cost vs Profit Per Kill</h3>
          <InfoTooltip tooltip="Compares average cost and loot per kill for top creatures" />
        </div>
        {profitPerKillChart.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted">No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={profitPerKillChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="creature"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                label={{ value: 'PED per Kill', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                formatter={(value) => (typeof value === 'number' ? value.toFixed(1) : value)}
              />
              <Legend />
              <Bar dataKey="costPerKill" fill="#ef4444" name="Cost/Kill" />
              <Bar dataKey="profitPerKill" fill="#10b981" name="Profit/Kill" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Maturity breakdown */}
      <div className="grid grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-bold">Maturity Distribution</h3>
            <InfoTooltip tooltip="Shows the distribution of kills across different creature maturities" />
          </div>
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
                  <Tooltip formatter={(value) => `${value} kills`} />
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
        </div>

        {/* Top maturity/creature combos */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-bold">Top Creature/Maturity Combos</h3>
            <InfoTooltip tooltip="Shows the most frequently encountered creature maturity combinations" />
          </div>
          {topMaturityCreatures.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted">No data yet</div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {topMaturityCreatures.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-surface rounded hover:bg-surface-hover transition-colors"
                >
                  <div>
                    <div className="font-semibold text-sm">{item.creature}</div>
                    <div className="text-xs text-muted">{item.maturity}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-400">{item.kills} kills</div>
                    <div
                      className={`text-xs ${item.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}
                    >
                      {item.profit >= 0 ? '+' : ''}
                      {item.profit.toFixed(2)} PED
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* HP dealt vs profit scatter */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-bold">Average HP vs Profit Per Kill</h3>
          <InfoTooltip tooltip="Visualizes the relationship between creature HP and profitability" />
        </div>
        {hpVsProfitChart.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted">No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="hpDealt"
                tick={{ fontSize: 12 }}
                label={{ value: 'Avg HP Dealt', position: 'insideBottomRight', offset: -10 }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                label={{ value: 'Profit/Kill (PED)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value) => (typeof value === 'number' ? value.toFixed(1) : value)}
                labelFormatter={() => ''}
              />
              <Scatter name="Creatures" data={hpVsProfitChart} fill="#8b5cf6" />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Cost efficiency table */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-bold">Cost Efficiency Analysis</h3>
          <InfoTooltip tooltip="Shows return on investment per creature type (loot/cost ratio)" />
        </div>
        {costEfficiency.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted">No data yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-muted">Creature</th>
                  <th className="text-right p-3 text-muted">Kills</th>
                  <th className="text-right p-3 text-muted">Cost/Kill</th>
                  <th className="text-right p-3 text-muted">Loot/Kill</th>
                  <th className="text-right p-3 text-muted">Return Rate</th>
                </tr>
              </thead>
              <tbody>
                {costEfficiency.map((creature, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-border hover:bg-surface-hover transition-colors"
                  >
                    <td className="p-3 font-semibold">{creature.creature}</td>
                    <td className="text-right p-3 text-gray-300">{creature.kills}</td>
                    <td className="text-right p-3 text-red-400">
                      {creature.costPerKill.toFixed(2)}
                    </td>
                    <td className="text-right p-3 text-green-400">
                      {creature.lootPerKill.toFixed(2)}
                    </td>
                    <td
                      className={`text-right p-3 font-semibold ${creature.returnRate >= 100 ? 'text-green-400' : 'text-red-400'}`}
                    >
                      {creature.returnRate.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
