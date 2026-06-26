import { HuntSession } from '../../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Clock, DollarSign, Target, TrendingUp } from 'lucide-react';
import { formatDurationMs, formatSmallNumber } from '../../utils/formatters';
import { getSessionActiveDurationMs, getSessionPausedMs } from '../../utils/sessionTiming';
import { DataTable, DataTableColumn } from '../common/DataTable';
import { MetricTile, Panel } from '../common/Panel';
import { StatCard } from '../common/StatCard';
import { chartAxisProps, chartGridProps, chartTooltipProps } from './chartStyles';

interface HourlyRatesAnalyticsProps {
  session: HuntSession;
}

export function HourlyRatesAnalytics({ session }: HourlyRatesAnalyticsProps) {
  const now = Date.now();
  const pausedMs = getSessionPausedMs(session, now);
  const duration = getSessionActiveDurationMs(session, now);
  const totalElapsedMs = duration + pausedMs;
  const durationMinutes = duration / 1000 / 60;
  const durationHours = durationMinutes / 60;

  const adjustedLootPerHour =
    durationHours > 0 ? session.stats.totalAdjustedLoot / durationHours : 0;
  const ttLootPerHour = durationHours > 0 ? session.stats.totalTtLoot / durationHours : 0;
  const spendPerHour = durationHours > 0 ? session.stats.totalCost / durationHours : 0;
  const profitPerHour = durationHours > 0 ? session.stats.adjustedProfit / durationHours : 0;
  const killsPerHour = durationHours > 0 ? session.stats.kills / durationHours : 0;
  const dmgPerHour = durationHours > 0 ? session.stats.damageDealt / durationHours : 0;
  const skillsPerHour =
    durationHours > 0
      ? session.skills.reduce((sum, s) => sum + s.gainAmount, 0) / durationHours
      : 0;
  const eventsPerHour = durationHours > 0 ? session.stats.lootEvents / durationHours : 0;

  // Hourly metrics comparison
  const hourlyMetrics = [
    { name: 'Adj Loot', value: adjustedLootPerHour, color: '#22C55E' },
    { name: 'TT Loot', value: ttLootPerHour, color: '#60A5FA' },
    { name: 'Spend', value: spendPerHour, color: '#EF4444' },
    {
      name: 'Profit',
      value: Math.abs(profitPerHour),
      color: profitPerHour >= 0 ? '#3B82F6' : '#F59E0B',
    },
  ];

  // Activity metrics
  const activityMetrics = [
    { name: 'Kills/Hr', value: killsPerHour },
    { name: 'Events/Hr', value: eventsPerHour },
    { name: 'Dmg/Hr', value: dmgPerHour / 100 }, // Scaled for better vis
    { name: 'Skills/Hr', value: skillsPerHour * 1000 }, // Scaled for better vis
  ];

  // Per-minute rates
  const adjustedLootPerMin =
    durationMinutes > 0 ? session.stats.totalAdjustedLoot / durationMinutes : 0;
  const ttLootPerMin = durationMinutes > 0 ? session.stats.totalTtLoot / durationMinutes : 0;
  const spendPerMin = durationMinutes > 0 ? session.stats.totalCost / durationMinutes : 0;
  const killsPerMin = durationMinutes > 0 ? session.stats.kills / durationMinutes : 0;
  const eventsPerMin = durationMinutes > 0 ? session.stats.lootEvents / durationMinutes : 0;
  const profitPerMin = durationMinutes > 0 ? session.stats.adjustedProfit / durationMinutes : 0;
  const totalSkillGains = session.skills.reduce((sum, s) => sum + s.gainAmount, 0);
  const skillsPerMin = durationMinutes > 0 ? totalSkillGains / durationMinutes : 0;

  type HourlyRateRow = {
    metric: string;
    perHour: string;
    perMinute: string;
    total: string;
    perHourClassName?: string;
  };

  const hourlyRateRows: HourlyRateRow[] = [
    {
      metric: 'Adjusted Loot',
      perHour: `${formatSmallNumber(adjustedLootPerHour)} PED`,
      perMinute: `${formatSmallNumber(adjustedLootPerMin)} PED`,
      total: `${session.stats.totalAdjustedLoot.toFixed(2)} PED`,
      perHourClassName: 'text-green-400',
    },
    {
      metric: 'TT Loot',
      perHour: `${formatSmallNumber(ttLootPerHour)} PED`,
      perMinute: `${formatSmallNumber(ttLootPerMin)} PED`,
      total: `${session.stats.totalTtLoot.toFixed(2)} PED`,
      perHourClassName: 'text-blue-400',
    },
    {
      metric: 'Spend',
      perHour: `${formatSmallNumber(spendPerHour)} PED`,
      perMinute: `${formatSmallNumber(spendPerMin)} PED`,
      total: `${session.stats.totalCost.toFixed(2)} PED`,
      perHourClassName: 'text-red-400',
    },
    {
      metric: 'Adjusted P/L',
      perHour: `${profitPerHour >= 0 ? '+' : ''}${formatSmallNumber(profitPerHour)} PED`,
      perMinute: `${formatSmallNumber(profitPerMin)} PED`,
      total: `${session.stats.adjustedProfit.toFixed(2)} PED`,
      perHourClassName: profitPerHour >= 0 ? 'text-blue-400' : 'text-orange-400',
    },
    {
      metric: 'Kills',
      perHour: killsPerHour.toFixed(1),
      perMinute: killsPerMin.toFixed(2),
      total: session.stats.kills.toString(),
      perHourClassName: 'text-body',
    },
    {
      metric: 'Loot Events',
      perHour: eventsPerHour.toFixed(1),
      perMinute: eventsPerMin.toFixed(2),
      total: session.stats.lootEvents.toString(),
    },
    {
      metric: 'Damage Dealt',
      perHour: dmgPerHour.toFixed(0),
      perMinute: (durationMinutes > 0 ? session.stats.damageDealt / durationMinutes : 0).toFixed(1),
      total: session.stats.damageDealt.toFixed(0),
    },
    {
      metric: 'Skill Gains',
      perHour: formatSmallNumber(skillsPerHour),
      perMinute: formatSmallNumber(skillsPerMin),
      total: formatSmallNumber(totalSkillGains),
      perHourClassName: 'text-purple-400',
    },
  ];

  const hourlyRateColumns: Array<DataTableColumn<HourlyRateRow>> = [
    { key: 'metric', header: 'Metric', render: (row) => row.metric },
    {
      key: 'perHour',
      header: 'Per Hour',
      align: 'right',
      render: (row) => (
        <span className={`font-semibold ${row.perHourClassName ?? ''}`}>{row.perHour}</span>
      ),
    },
    { key: 'perMinute', header: 'Per Minute', align: 'right', render: (row) => row.perMinute },
    { key: 'total', header: 'Total', align: 'right', render: (row) => row.total },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <MetricTile
          label="Adj Loot/Hour"
          value={formatSmallNumber(adjustedLootPerHour)}
          tone="positive"
          icon={<DollarSign className="h-5 w-5 shrink-0" />}
          detail="PED"
          size="lg"
        />
        <MetricTile
          label="Spend/Hour"
          value={formatSmallNumber(spendPerHour)}
          tone="negative"
          icon={<DollarSign className="h-5 w-5 shrink-0" />}
          detail="PED"
          size="lg"
        />
        <MetricTile
          label="Adj P/L/Hour"
          value={`${profitPerHour >= 0 ? '+' : ''}${formatSmallNumber(profitPerHour)}`}
          tone={profitPerHour >= 0 ? 'accent' : 'warning'}
          icon={<TrendingUp className="h-5 w-5 shrink-0" />}
          detail="PED"
          size="lg"
        />
        <MetricTile
          label="Kills/Hour"
          value={killsPerHour.toFixed(1)}
          icon={<Target className="h-5 w-5 shrink-0" />}
          size="lg"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Hourly Economic Metrics */}
        <Panel title="Hourly Economic Rates">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyMetrics}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="name" {...chartAxisProps} />
              <YAxis {...chartAxisProps} />
              <Tooltip
                {...chartTooltipProps}
                formatter={(value: number) => [`${formatSmallNumber(value)} PED`, '']}
              />
              <Bar dataKey="value">
                {hourlyMetrics.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        {/* Activity Rates */}
        <Panel title="Hourly Activity Rates">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={activityMetrics}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="name" {...chartAxisProps} />
              <YAxis {...chartAxisProps} />
              <Tooltip
                {...chartTooltipProps}
                formatter={(value: number) => formatSmallNumber(value)}
              />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      {/* Detailed Metrics Table */}
      <Panel title="Detailed Hourly Rates">
        <DataTable
          columns={hourlyRateColumns}
          rows={hourlyRateRows}
          getRowKey={(row) => row.metric}
        />
      </Panel>

      {/* Time Summary */}
      <div className="grid grid-cols-3 gap-6">
        <Panel title="Time Summary" action={<Clock className="h-5 w-5 text-blue-400" />}>
          <div className="space-y-3">
            <StatCard label="Total Time" value={formatDurationMs(totalElapsedMs)} />
            <StatCard label="Paused Time" value={formatDurationMs(pausedMs)} />
            <StatCard label="Active Time" value={formatDurationMs(duration)} />
          </div>
        </Panel>

        <Panel title="ROI Metrics">
          <div className="space-y-3">
            <StatCard
              label="Adjusted Return"
              value={`${session.stats.adjustedReturns.toFixed(1)}%`}
              color={session.stats.adjustedReturns >= 100 ? 'text-green-400' : 'text-red-400'}
            />
            <StatCard
              label="TT Return"
              value={`${session.stats.ttReturns.toFixed(1)}%`}
              color={session.stats.ttReturns >= 100 ? 'text-green-400' : 'text-red-400'}
            />
            <StatCard
              label="Adj Loot/Spend"
              value={(session.stats.totalCost > 0
                ? session.stats.totalAdjustedLoot / session.stats.totalCost
                : 0
              ).toFixed(2)}
            />
            <StatCard
              label="Net/Hour"
              value={`${profitPerHour >= 0 ? '+' : ''}${formatSmallNumber(profitPerHour)} PED`}
              color={profitPerHour >= 0 ? 'text-green-400' : 'text-red-400'}
            />
          </div>
        </Panel>

        <Panel title="Peak Rates">
          <div className="space-y-3">
            <StatCard
              label="Best Hour Est."
              value={`${formatSmallNumber(adjustedLootPerHour * 1.2)} PED`}
              color="text-green-400"
            />
            <StatCard
              label="Efficiency"
              value={`${(session.stats.adjustedReturns >= 100 ? 100 : session.stats.adjustedReturns).toFixed(0)}%`}
            />
            <StatCard label="Pace" value={`${eventsPerHour.toFixed(1)} events/hr`} />
          </div>
        </Panel>
      </div>
    </div>
  );
}
