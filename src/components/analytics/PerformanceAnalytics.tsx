import { HuntSession } from '../../types';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, Target, Award } from 'lucide-react';
import { format } from 'date-fns';

interface PerformanceAnalyticsProps {
  session: HuntSession;
}

export function PerformanceAnalytics({ session }: PerformanceAnalyticsProps) {
  const profit = session.stats.totalLoot - session.stats.totalCost;

  // Return rate over time chart data
  const returnRateChart = session.loot.map((item, index) => {
    const cumulativeLoot = session.loot
      .slice(0, index + 1)
      .reduce((sum, l) => sum + l.totalValue, 0);
    const cumulativeCost = session.stats.totalCost * ((index + 1) / session.loot.length);
    const returnRate = cumulativeCost > 0 ? (cumulativeLoot / cumulativeCost) * 100 : 0;
    return {
      index: index + 1,
      returnRate: Math.round(returnRate * 10) / 10,
      time: format(item.timestamp, 'HH:mm:ss'),
    };
  });

  // Profit/Loss over time
  const plChart = session.loot.map((item, index) => {
    const cumulativeLoot = session.loot
      .slice(0, index + 1)
      .reduce((sum, l) => sum + l.totalValue, 0);
    const cumulativeCost = session.stats.totalCost * ((index + 1) / session.loot.length);
    return {
      index: index + 1,
      pl: cumulativeLoot - cumulativeCost,
      time: format(item.timestamp, 'HH:mm:ss'),
    };
  });

  // Hit distribution
  const hitRate =
    session.stats.shotsFired > 0
      ? ((session.stats.hits + session.stats.criticalHits) / session.stats.shotsFired) * 100
      : 0;
  const critRate =
    session.stats.shotsFired > 0
      ? (session.stats.criticalHits / session.stats.shotsFired) * 100
      : 0;

  const hitDistribution = [
    { name: 'Hits', value: session.stats.hits, color: '#22C55E' },
    { name: 'Critical Hits', value: session.stats.criticalHits, color: '#FBBF24' },
    { name: 'Misses', value: session.stats.misses, color: 'var(--color-text-muted)' },
  ].filter((item) => item.value > 0);

  // Performance breakdown
  const performanceMetrics = [
    {
      label: 'Return Rate',
      value: `${session.stats.returns.toFixed(1)}%`,
      good: session.stats.returns >= 100,
    },
    {
      label: 'Profit/Loss',
      value: `${profit >= 0 ? '+' : ''}${profit.toFixed(2)} PED`,
      good: profit >= 0,
    },
    { label: 'Hit Rate', value: `${hitRate.toFixed(1)}%`, good: hitRate >= 80 },
    { label: 'Crit Rate', value: `${critRate.toFixed(1)}%`, good: critRate >= 5 },
    { label: 'Total Events', value: session.stats.lootEvents, good: true },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="text-sm text-muted mb-2">RETURN RATE</div>
          <div
            className={`text-3xl font-bold flex items-center gap-2 ${
              session.stats.returns >= 100 ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {session.stats.returns >= 100 ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )}
            {session.stats.returns.toFixed(1)}%
          </div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-muted mb-2">NET PROFIT/LOSS</div>
          <div className={`text-3xl font-bold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {profit >= 0 ? '+' : ''}
            {profit.toFixed(2)} PED
          </div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-muted mb-2">HIT RATE</div>
          <div
            className={`text-3xl font-bold ${hitRate >= 80 ? 'text-green-400' : 'text-yellow-400'}`}
          >
            <Target className="w-5 h-5 inline mr-2" />
            {hitRate.toFixed(1)}%
          </div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-muted mb-2">CRIT RATE</div>
          <div className={`text-3xl font-bold ${critRate >= 5 ? 'text-yellow-400' : 'text-white'}`}>
            <Award className="w-5 h-5 inline mr-2" />
            {critRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Return Rate Over Time */}
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Return Rate Over Time</h3>
          {returnRateChart.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted">No loot data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={returnRateChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="index" stroke="var(--color-text-muted)" />
                <YAxis stroke="var(--color-text-muted)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                  formatter={(value: number) => [`${value}%`, 'Return Rate']}
                  labelFormatter={(label) => `Event #${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="returnRate"
                  stroke={session.stats.returns >= 100 ? '#22C55E' : '#EF4444'}
                  fill={session.stats.returns >= 100 ? '#22C55E33' : '#EF444433'}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Profit/Loss Over Time */}
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Profit/Loss Over Time</h3>
          {plChart.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted">No loot data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={plChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="index" stroke="var(--color-text-muted)" />
                <YAxis stroke="var(--color-text-muted)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                  formatter={(value: number) => [`${value.toFixed(2)} PED`, 'P/L']}
                  labelFormatter={(label) => `Event #${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="pl"
                  stroke="#3B82F6"
                  dot={{ fill: '#3B82F6', r: 3 }}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Hit Distribution and Metrics */}
      <div className="grid grid-cols-2 gap-6">
        {/* Hit Distribution Pie */}
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Hit Distribution</h3>
          {hitDistribution.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted">
              No combat data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={hitDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {hitDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Performance Metrics Table */}
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            {performanceMetrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-surface rounded">
                <span className="text-gray-300">{metric.label}</span>
                <span
                  className={`font-bold text-lg ${metric.good ? 'text-green-400' : 'text-red-400'}`}
                >
                  {metric.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
