import { HuntSession } from '../../types';
import {
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Zap, Target, Clock } from 'lucide-react';
import { getSessionActiveDurationMs } from '../../utils/sessionTiming';
import { MetricTile, Panel } from '../common/Panel';
import { StatCard } from '../common/StatCard';
import { chartAxisProps, chartGridProps, chartTooltipProps } from './chartStyles';

interface EfficiencyAnalyticsProps {
  session: HuntSession;
}

export function EfficiencyAnalytics({ session }: EfficiencyAnalyticsProps) {
  const duration = getSessionActiveDurationMs(session);
  const durationMinutes = duration / 1000 / 60;
  const durationHours = durationMinutes / 60;

  const dpp = session.stats.kills > 0 ? session.stats.totalCost / session.stats.kills : 0;
  const dps = durationMinutes > 0 ? session.stats.totalCost / durationMinutes : 0;
  const killsPerPED =
    session.stats.totalCost > 0 ? session.stats.kills / session.stats.totalCost : 0;
  const killsPerHour = durationHours > 0 ? session.stats.kills / durationHours : 0;
  const avgDmgPerHit =
    session.stats.shotsFired > 0 ? session.stats.damageDealt / session.stats.shotsFired : 0;
  const shotsPerKill = session.stats.kills > 0 ? session.stats.shotsFired / session.stats.kills : 0;

  // Efficiency radar chart
  const efficiencyRadar = [
    {
      category: 'Hit Rate',
      value:
        session.stats.shotsFired > 0
          ? ((session.stats.hits + session.stats.criticalHits) / session.stats.shotsFired) * 100
          : 0,
      max: 100,
    },
    {
      category: 'Crit Rate',
      value:
        session.stats.shotsFired > 0
          ? (session.stats.criticalHits / session.stats.shotsFired) * 100 * 2
          : 0,
      max: 100,
    },
    { category: 'Adj Return', value: session.stats.adjustedReturns, max: 150 },
    { category: 'Dmg/Shot', value: avgDmgPerHit * 2, max: 100 },
    { category: 'Kills/Hour', value: Math.min(killsPerHour * 10, 100), max: 100 },
  ];

  // Time efficiency metrics
  const timeMetrics = [
    { name: 'Kills/Hour', value: killsPerHour },
    {
      name: 'Damage/Hour',
      value: durationHours > 0 ? session.stats.damageDealt / durationHours : 0,
    },
    {
      name: 'Adj Loot/Hour',
      value: durationHours > 0 ? session.stats.totalAdjustedLoot / durationHours : 0,
    },
    {
      name: 'Events/Hour',
      value: durationHours > 0 ? session.stats.lootEvents / durationHours : 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <MetricTile
          label="DPP"
          value={dpp.toFixed(2)}
          icon={<Zap className="h-5 w-5 shrink-0" />}
          detail="Damage per PED"
          size="lg"
        />
        <MetricTile
          label="Kills/Hour"
          value={killsPerHour.toFixed(1)}
          tone="accent"
          icon={<Clock className="h-5 w-5 shrink-0" />}
          size="lg"
        />
        <MetricTile
          label="Avg Dmg/Hit"
          value={avgDmgPerHit.toFixed(1)}
          tone="warning"
          icon={<Target className="h-5 w-5 shrink-0" />}
          size="lg"
        />
        <MetricTile label="Shots/Kill" value={shotsPerKill.toFixed(1)} size="lg" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Efficiency Radar */}
        <Panel title="Efficiency Overview">
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={efficiencyRadar}>
              <PolarGrid stroke="var(--color-border)" />
              <PolarAngleAxis dataKey="category" stroke="var(--color-text-muted)" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="var(--color-text-muted)" />
              <Radar
                name="Efficiency"
                dataKey="value"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.6}
              />
              <Tooltip {...chartTooltipProps} formatter={(value: number) => value.toFixed(1)} />
            </RadarChart>
          </ResponsiveContainer>
        </Panel>

        {/* Time Efficiency */}
        <Panel title="Time Efficiency">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={timeMetrics}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="name" {...chartAxisProps} />
              <YAxis {...chartAxisProps} />
              <Tooltip {...chartTooltipProps} formatter={(value: number) => value.toFixed(2)} />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-3 gap-6">
        <Panel title="Resource Efficiency">
          <div className="space-y-3">
            <StatCard label="DPP" value={dpp.toFixed(2)} />
            <StatCard label="DPS" value={dps.toFixed(2)} />
            <StatCard label="Kills/PED" value={killsPerPED.toFixed(2)} />
            <StatCard
              label="Adj Loot/PED"
              value={(session.stats.totalCost > 0
                ? session.stats.totalAdjustedLoot / session.stats.totalCost
                : 0
              ).toFixed(2)}
            />
          </div>
        </Panel>

        <Panel title="Combat Efficiency">
          <div className="space-y-3">
            <StatCard label="Avg Dmg/Hit" value={avgDmgPerHit.toFixed(1)} />
            <StatCard label="Shots/Kill" value={shotsPerKill.toFixed(1)} />
            <StatCard
              label="Dmg/PED"
              value={(session.stats.totalCost > 0
                ? session.stats.damageDealt / session.stats.totalCost
                : 0
              ).toFixed(1)}
            />
            <StatCard
              label="Hit Rate"
              value={`${(session.stats.shotsFired > 0 ? ((session.stats.hits + session.stats.criticalHits) / session.stats.shotsFired) * 100 : 0).toFixed(1)}%`}
            />
          </div>
        </Panel>

        <Panel title="Time Efficiency">
          <div className="space-y-3">
            <StatCard label="Kills/Hour" value={killsPerHour.toFixed(1)} />
            <StatCard
              label="Adj Loot/Hour"
              value={`${(durationHours > 0 ? session.stats.totalAdjustedLoot / durationHours : 0).toFixed(2)} PED`}
            />
            <StatCard
              label="Spend/Hour"
              value={`${(durationHours > 0 ? session.stats.totalCost / durationHours : 0).toFixed(2)} PED`}
            />
            <StatCard
              label="Events/Hour"
              value={(durationHours > 0 ? session.stats.lootEvents / durationHours : 0).toFixed(1)}
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}
