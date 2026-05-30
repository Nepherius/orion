import { useMemo } from 'react';
import { HuntSession } from '../../types';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Crosshair, Shield, Heart, Zap } from 'lucide-react';
import { format } from 'date-fns';
import {
  calculateDamageConsistency,
  calculateHealingEfficiency,
} from '../../utils/analyticsCalculations';
import { MetricTile, Panel } from '../common/Panel';
import { StatCard } from '../common/StatCard';
import { chartAxisProps, chartGridProps, chartTooltipProps } from './chartStyles';

interface CombatAnalyticsProps {
  session: HuntSession;
}

export function CombatAnalytics({ session }: CombatAnalyticsProps) {
  const kills = session.stats.kills;
  const dmgDealt = session.stats.damageDealt;
  const dmgTaken = session.stats.damageTaken || 0;
  const totalHealing = session.stats.totalHealing || 0;
  const shotsFired = session.stats.shotsFired;
  const hits = session.stats.hits;
  const critHits = session.stats.criticalHits;
  const misses = session.stats.misses;
  const dodges = session.stats.dodges;
  const evades = session.stats.evades;

  const hitRate = shotsFired > 0 ? ((hits + critHits) / shotsFired) * 100 : 0;
  const critRate = shotsFired > 0 ? (critHits / shotsFired) * 100 : 0;
  const missRate = shotsFired > 0 ? (misses / shotsFired) * 100 : 0;
  const evasionRate =
    shotsFired > 0
      ? ((session.stats.enemyDodges + session.stats.enemyEvades) / shotsFired) * 100
      : 0;

  // Hit distribution
  const hitDistribution = [
    { name: 'Hits', value: hits, color: '#22C55E' },
    { name: 'Critical Hits', value: critHits, color: '#FBBF24' },
    { name: 'Misses', value: misses, color: 'var(--color-text-muted)' },
  ].filter((item) => item.value > 0);

  // Evasion distribution (Enemy evading our attacks)
  const evasionDistribution = [
    { name: 'Target Dodges', value: session.stats.enemyDodges, color: '#EF4444' },
    { name: 'Target Evades', value: session.stats.enemyEvades, color: '#3B82F6' },
  ].filter((item) => item.value > 0);

  // Damage over time
  const damageChart = useMemo(() => {
    return session.damageEvents.slice(0, 100).map((event, index) => {
      const cumulativeDmg = session.damageEvents
        .slice(0, index + 1)
        .reduce((sum, e) => sum + e.damage, 0);
      return {
        index: index + 1,
        damage: cumulativeDmg,
        time: format(event.timestamp, 'HH:mm:ss'),
      };
    });
  }, [session.damageEvents]);

  // Combat comparison
  const combatComparison = [
    { name: 'Damage Out', value: dmgDealt, color: '#22C55E' },
    { name: 'Damage In', value: dmgTaken, color: '#EF4444' },
    { name: 'Healing', value: totalHealing, color: '#3B82F6' },
  ];

  // New metrics (Category 1, 6, 9)
  const damageConsistency = calculateDamageConsistency(session);
  const healingEfficiency = calculateHealingEfficiency(session);
  const damagePerKill = kills > 0 ? dmgDealt / kills : 0;
  const damageTakenPerKill = kills > 0 ? dmgTaken / kills : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <MetricTile
          label="Kills"
          value={kills}
          icon={<Crosshair className="h-5 w-5 shrink-0" />}
          size="lg"
        />
        <MetricTile
          label="Damage Dealt"
          value={dmgDealt.toFixed(0)}
          tone="positive"
          icon={<Zap className="h-5 w-5 shrink-0" />}
          size="lg"
        />
        <MetricTile
          label="Damage Taken"
          value={dmgTaken.toFixed(0)}
          tone="negative"
          icon={<Shield className="h-5 w-5 shrink-0" />}
          size="lg"
        />
        <MetricTile
          label="Healing"
          value={totalHealing.toFixed(0)}
          tone="accent"
          icon={<Heart className="h-5 w-5 shrink-0" />}
          size="lg"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-3 gap-6">
        {/* Hit Distribution */}
        <Panel title="Hit Distribution">
          {hitDistribution.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted">No combat data</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={hitDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
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

        {/* Evasion Distribution */}
        <Panel title="Evasion Distribution">
          {evasionDistribution.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted">No evasion data</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={evasionDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {evasionDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...chartTooltipProps} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Panel>

        {/* Combat Comparison */}
        <Panel title="Combat Balance">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={combatComparison}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="name" {...chartAxisProps} />
              <YAxis {...chartAxisProps} />
              <Tooltip {...chartTooltipProps} formatter={(value: number) => value.toFixed(0)} />
              <Bar dataKey="value" fill="#3B82F6">
                {combatComparison.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      {/* Damage Over Time */}
      <Panel title="Cumulative Damage Dealt">
        {damageChart.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted">No damage data</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={damageChart}>
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="index" {...chartAxisProps} />
              <YAxis {...chartAxisProps} />
              <Tooltip
                {...chartTooltipProps}
                formatter={(value: number) => [value.toFixed(0), 'Damage']}
                labelFormatter={(label) => `Hit #${label}`}
              />
              <Line type="monotone" dataKey="damage" stroke="#22C55E" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Panel>

      {/* Combat Metrics */}
      <div className="grid grid-cols-4 gap-6">
        <Panel title="Offense">
          <div className="space-y-3">
            <StatCard label="Shots Fired" value={shotsFired} />
            <StatCard label="Hits" value={hits} color="text-green-400" />
            <StatCard label="Critical Hits" value={critHits} color="text-yellow-400" />
            <StatCard label="Misses" value={misses} color="text-muted" />
          </div>
        </Panel>

        <Panel title="Defense">
          <div className="space-y-3">
            <StatCard label="Dodges" value={dodges} color="text-red-400" />
            <StatCard label="Evades" value={evades} color="text-blue-400" />
            <StatCard label="Heals Used" value={session.stats.healsUsed} />
            <StatCard label="Total Healing" value={totalHealing.toFixed(0)} color="text-blue-400" />
          </div>
        </Panel>

        <Panel title="Accuracy">
          <div className="space-y-3">
            <StatCard
              label="Hit Rate"
              value={`${hitRate.toFixed(1)}%`}
              color={hitRate >= 80 ? 'text-green-400' : 'text-yellow-400'}
            />
            <StatCard
              label="Crit Rate"
              value={`${critRate.toFixed(1)}%`}
              color={critRate >= 5 ? 'text-yellow-400' : 'text-body'}
            />
            <StatCard label="Miss Rate" value={`${missRate.toFixed(1)}%`} />
            <StatCard
              label="Evasion Rate"
              value={`${evasionRate.toFixed(1)}%`}
              color={evasionRate >= 20 ? 'text-green-400' : 'text-body'}
            />
          </div>
        </Panel>

        <Panel title="Averages">
          <div className="space-y-3">
            <StatCard
              label="Dmg/Hit"
              value={(shotsFired > 0 ? dmgDealt / shotsFired : 0).toFixed(1)}
            />
            <StatCard
              label="Hit Consistency"
              value={damageConsistency.toFixed(1)}
              info="Std deviation of damage per hit. Lower = more consistent"
            />
            <StatCard label="Dmg/Kill" value={damagePerKill.toFixed(0)} />
            <StatCard
              label="Dmg Taken/Kill"
              value={damageTakenPerKill.toFixed(0)}
              color="text-red-400"
            />
            <StatCard label="Shots/Kill" value={(kills > 0 ? shotsFired / kills : 0).toFixed(1)} />
            <StatCard
              label="Healing Efficiency"
              value={`${healingEfficiency.toFixed(2)}x`}
              color={healingEfficiency >= 1 ? 'text-green-400' : 'text-yellow-400'}
              info="Healing received / damage taken. 1.0 = full recovery"
            />
            <StatCard
              label="Net Damage"
              value={(dmgDealt - dmgTaken).toFixed(0)}
              color={dmgDealt - dmgTaken > 0 ? 'text-green-400' : 'text-red-400'}
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}
