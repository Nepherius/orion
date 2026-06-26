import { HuntSession } from '../../types';
import {
  LineChart,
  Line,
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
import { ReturnRateChart } from './ReturnRateChart';
import { MetricTile, Panel } from '../common/Panel';
import { StatCard } from '../common/StatCard';
import { chartAxisProps, chartGridProps, chartTooltipProps } from './chartStyles';

interface PerformanceAnalyticsProps {
  session: HuntSession;
}

export function PerformanceAnalytics({ session }: PerformanceAnalyticsProps) {
  const profit = session.stats.adjustedProfit;

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
      label: 'Adjusted Return',
      value: `${session.stats.adjustedReturns.toFixed(1)}%`,
      good: session.stats.adjustedReturns >= 100,
    },
    {
      label: 'Adjusted P/L',
      value: `${profit >= 0 ? '+' : ''}${profit.toFixed(2)} PED`,
      good: profit >= 0,
    },
    { label: 'Hit Rate', value: `${hitRate.toFixed(1)}%`, good: hitRate >= 80 },
    { label: 'Crit Rate', value: `${critRate.toFixed(1)}%`, good: critRate >= 5 },
    { label: 'Total Events', value: session.stats.lootEvents, good: true },
    { label: 'Total Kills', value: session.stats.kills, good: true },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        <MetricTile
          label="Adjusted Return"
          value={`${session.stats.adjustedReturns.toFixed(1)}%`}
          tone={session.stats.adjustedReturns >= 100 ? 'positive' : 'negative'}
          icon={
            session.stats.adjustedReturns >= 100 ? (
              <TrendingUp className="h-5 w-5 shrink-0" />
            ) : (
              <TrendingDown className="h-5 w-5 shrink-0" />
            )
          }
          size="lg"
        />
        <MetricTile
          label="Adjusted P/L"
          value={`${profit >= 0 ? '+' : ''}${profit.toFixed(2)} PED`}
          tone={profit >= 0 ? 'positive' : 'negative'}
          size="lg"
        />
        <MetricTile
          label="Hit Rate"
          value={`${hitRate.toFixed(1)}%`}
          tone={hitRate >= 80 ? 'positive' : 'warning'}
          icon={<Target className="h-5 w-5 shrink-0" />}
          size="lg"
        />
        <MetricTile
          label="Crit Rate"
          value={`${critRate.toFixed(1)}%`}
          tone={critRate >= 5 ? 'warning' : 'neutral'}
          icon={<Award className="h-5 w-5 shrink-0" />}
          size="lg"
        />
        <MetricTile
          label="Kills"
          value={session.stats.kills}
          tone="warning"
          icon={<Target className="h-5 w-5 shrink-0" />}
          detail="Estimated from damage events"
          size="lg"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Adjusted and TT Return Over Time */}
        <Panel title="Adjusted Return Over Time">
          <ReturnRateChart session={session} emptyHeight="h-64" />
        </Panel>

        {/* Profit/Loss Over Time */}
        <Panel title="Adjusted P/L Over Time">
          {plChart.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted">No loot data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={plChart}>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="index" {...chartAxisProps} />
                <YAxis {...chartAxisProps} />
                <Tooltip
                  {...chartTooltipProps}
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
        </Panel>
      </div>

      {/* Hit Distribution and Metrics */}
      <div className="grid grid-cols-2 gap-6">
        {/* Hit Distribution Pie */}
        <Panel title="Hit Distribution">
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
                <Tooltip {...chartTooltipProps} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Panel>

        {/* Performance Metrics Table */}
        <Panel title="Performance Metrics">
          <div className="space-y-3">
            {performanceMetrics.map((metric, index) => (
              <StatCard
                key={index}
                label={metric.label}
                value={metric.value}
                color={metric.good ? 'text-green-400' : 'text-red-400'}
              />
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
