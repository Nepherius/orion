import { HuntSession } from '../../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Heart, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { MetricTile, Panel } from '../common/Panel';
import { StatCard } from '../common/StatCard';
import { chartAxisProps, chartGridProps, chartTooltipProps } from './chartStyles';

interface HealingAnalyticsProps {
  session: HuntSession;
}

export function HealingAnalytics({ session }: HealingAnalyticsProps) {
  const totalHealing = session.stats.totalHealing || 0;
  const healsUsed = session.stats.healsUsed || 0;
  const healingCost = session.healingCost || 0;
  const damageTaken = session.stats.damageTaken || 0;

  const avgHealAmount = healsUsed > 0 ? totalHealing / healsUsed : 0;
  const costPerHeal = healsUsed > 0 ? healingCost / healsUsed : 0;
  const healingEfficiency = healingCost > 0 ? totalHealing / healingCost : 0;
  const healingToDamageRatio = damageTaken > 0 ? totalHealing / damageTaken : 0;

  // Healing over time
  const healingChart = session.healingEvents.slice(0, 100).map((event, index) => {
    const cumulativeHealing = session.healingEvents
      .slice(0, index + 1)
      .reduce((sum, h) => sum + h.amount, 0);
    return {
      index: index + 1,
      healing: cumulativeHealing,
      time: format(event.timestamp, 'HH:mm:ss'),
    };
  });

  // Healing vs Damage taken over time
  const comparisonChart = [];
  let cumulativeHealing = 0;
  let cumulativeDamage = 0;
  const maxLength = Math.max(session.healingEvents.length, session.damageTakenEvents.length);

  for (let i = 0; i < maxLength; i++) {
    if (session.healingEvents[i]) {
      cumulativeHealing += session.healingEvents[i].amount;
    }
    if (session.damageTakenEvents[i]) {
      cumulativeDamage += session.damageTakenEvents[i].damage;
    }
    comparisonChart.push({
      index: i + 1,
      healing: cumulativeHealing,
      damage: cumulativeDamage,
    });
  }

  // Direct use vs passive healing
  // healsUsed already counts only direct uses (for decay/cost purposes)
  const directUseHeals = session.healingEvents.filter((e) => e.isDirectUse === true).length;
  const passiveHeals = session.healingEvents.filter((e) => e.isDirectUse === false).length;
  const healingTypeData = [
    { name: 'Direct Use', value: directUseHeals, color: '#3B82F6' },
    { name: 'Passive Ticks', value: passiveHeals, color: '#10B981' },
  ].filter((item) => item.value > 0);

  // Healing efficiency breakdown
  const performanceMetrics = [
    {
      label: 'Total Healing',
      value: `${totalHealing.toFixed(0)}`,
      good: totalHealing > 0,
    },
    {
      label: 'Heals Used',
      value: `${healsUsed}`,
      good: healsUsed > 0,
      tooltip: 'Direct uses only (decay/cost per use, not including passive heal-over-time ticks)',
    },
    {
      label: 'Avg Heal Amount',
      value: `${avgHealAmount.toFixed(1)}`,
      good: avgHealAmount > 0,
    },
    {
      label: 'Cost per Heal',
      value: `${costPerHeal.toFixed(2)} PED`,
      good: true,
      tooltip: 'Healing cost divided by direct uses (decay is per use, not per tick)',
    },
    {
      label: 'Healing Efficiency',
      value: `${healingEfficiency.toFixed(2)}`,
      good: healingEfficiency > 1,
      tooltip: 'Amount healed per PED spent on healing',
    },
    {
      label: 'Healing to Damage Ratio',
      value: `${healingToDamageRatio.toFixed(2)}x`,
      good: healingToDamageRatio >= 1,
      tooltip: 'Total healing divided by total damage taken',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <MetricTile
          label="Total Healing"
          value={totalHealing.toFixed(0)}
          tone="positive"
          icon={<Heart className="h-5 w-5 shrink-0" />}
          size="lg"
        />
        <MetricTile
          label="Heals Used"
          value={healsUsed}
          icon={<Activity className="h-5 w-5 shrink-0" />}
          tooltip="Direct uses only (for decay/cost). Passive heal-over-time ticks not counted."
          size="lg"
        />
        <MetricTile
          label="Healing Cost"
          value={`${healingCost.toFixed(2)} PED`}
          tone="negative"
          size="lg"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Healing Over Time */}
        <Panel title="Healing Over Time">
          {healingChart.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted">
              No healing events yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={healingChart}>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="index" {...chartAxisProps} />
                <YAxis {...chartAxisProps} />
                <Tooltip
                  {...chartTooltipProps}
                  formatter={(value: number) => [`${value.toFixed(0)}`, 'Healing']}
                  labelFormatter={(label) => `Event #${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="healing"
                  stroke="#10B981"
                  dot={{ fill: '#10B981', r: 3 }}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Panel>

        {/* Healing vs Damage Taken */}
        <Panel title="Healing vs Damage Taken">
          {comparisonChart.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted">
              No combat data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={comparisonChart}>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="index" {...chartAxisProps} />
                <YAxis {...chartAxisProps} />
                <Tooltip
                  {...chartTooltipProps}
                  formatter={(value: number) => `${value.toFixed(0)}`}
                  labelFormatter={(label) => `Event #${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="healing"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="Healing"
                />
                <Line
                  type="monotone"
                  dataKey="damage"
                  stroke="#EF4444"
                  strokeWidth={2}
                  name="Damage Taken"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      {/* Healing Type Distribution */}
      {healingTypeData.length > 0 && (
        <Panel title="Healing Type Distribution">
          <div className="grid grid-cols-2 gap-8">
            {healingTypeData.map((item) => (
              <div key={item.name} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded" style={{ backgroundColor: item.color }} />
                <div>
                  <div className="text-sm text-muted">{item.name}</div>
                  <div className="text-2xl font-bold text-body">{item.value}</div>
                  <div className="text-xs text-muted">
                    {((item.value / (directUseHeals + passiveHeals)) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Detailed Metrics */}
      <Panel title="Healing Metrics">
        <div className="grid grid-cols-2 gap-4">
          {performanceMetrics.map((metric, index) => (
            <StatCard
              key={index}
              label={metric.label}
              value={metric.value}
              color={metric.good ? 'text-green-400' : 'text-red-400'}
              info={metric.tooltip}
            />
          ))}
        </div>
      </Panel>
    </div>
  );
}
