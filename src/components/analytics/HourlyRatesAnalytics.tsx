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

interface HourlyRatesAnalyticsProps {
  session: HuntSession;
}

export function HourlyRatesAnalytics({ session }: HourlyRatesAnalyticsProps) {
  const now = Date.now();
  const pausedMs = getSessionPausedMs(session, now);
  const duration = getSessionActiveDurationMs(session, now);
  const durationMinutes = duration / 1000 / 60;
  const durationHours = durationMinutes / 60;

  const lootPerHour = durationHours > 0 ? session.stats.totalLoot / durationHours : 0;
  const spendPerHour = durationHours > 0 ? session.stats.totalCost / durationHours : 0;
  const profitPerHour =
    durationHours > 0 ? (session.stats.totalLoot - session.stats.totalCost) / durationHours : 0;
  const killsPerHour = durationHours > 0 ? session.stats.kills / durationHours : 0;
  const dmgPerHour = durationHours > 0 ? session.stats.damageDealt / durationHours : 0;
  const skillsPerHour =
    durationHours > 0
      ? session.skills.reduce((sum, s) => sum + s.gainAmount, 0) / durationHours
      : 0;
  const eventsPerHour = durationHours > 0 ? session.stats.lootEvents / durationHours : 0;

  // Hourly metrics comparison
  const hourlyMetrics = [
    { name: 'Loot', value: lootPerHour, color: '#22C55E' },
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
  const lootPerMin = durationMinutes > 0 ? session.stats.totalLoot / durationMinutes : 0;
  const spendPerMin = durationMinutes > 0 ? session.stats.totalCost / durationMinutes : 0;
  const killsPerMin = durationMinutes > 0 ? session.stats.kills / durationMinutes : 0;
  const eventsPerMin = durationMinutes > 0 ? session.stats.lootEvents / durationMinutes : 0;
  const profitPerMin =
    durationMinutes > 0 ? (session.stats.totalLoot - session.stats.totalCost) / durationMinutes : 0;
  const totalSkillGains = session.skills.reduce((sum, s) => sum + s.gainAmount, 0);
  const skillsPerMin = durationMinutes > 0 ? totalSkillGains / durationMinutes : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="text-sm text-muted mb-2">LOOT/HOUR</div>
          <div className="text-3xl font-bold text-green-400">
            <DollarSign className="w-5 h-5 inline mr-2" />
            {formatSmallNumber(lootPerHour)}
          </div>
          <div className="text-xs text-muted mt-1">PED</div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-muted mb-2">SPEND/HOUR</div>
          <div className="text-3xl font-bold text-red-400">
            <DollarSign className="w-5 h-5 inline mr-2" />
            {formatSmallNumber(spendPerHour)}
          </div>
          <div className="text-xs text-muted mt-1">PED</div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-muted mb-2">PROFIT/HOUR</div>
          <div
            className={`text-3xl font-bold ${profitPerHour >= 0 ? 'text-blue-400' : 'text-orange-400'}`}
          >
            <TrendingUp className="w-5 h-5 inline mr-2" />
            {profitPerHour >= 0 ? '+' : ''}
            {formatSmallNumber(profitPerHour)}
          </div>
          <div className="text-xs text-muted mt-1">PED</div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-muted mb-2">KILLS/HOUR</div>
          <div className="text-3xl font-bold text-body">
            <Target className="w-5 h-5 inline mr-2" />
            {killsPerHour.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Hourly Economic Metrics */}
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Hourly Economic Rates</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="var(--color-text-muted)" />
              <YAxis stroke="var(--color-text-muted)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid #374151',
                }}
                itemStyle={{ color: 'var(--color-text)' }}
                formatter={(value: number) => [`${formatSmallNumber(value)} PED`, '']}
              />
              <Bar dataKey="value">
                {hourlyMetrics.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Activity Rates */}
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Hourly Activity Rates</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={activityMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="var(--color-text-muted)" />
              <YAxis stroke="var(--color-text-muted)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid #374151',
                }}
                itemStyle={{ color: 'var(--color-text)' }}
                formatter={(value: number) => formatSmallNumber(value)}
              />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Metrics Table */}
      <div className="card p-6">
        <h3 className="text-lg font-bold mb-4">Detailed Hourly Rates</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4">Metric</th>
                <th className="text-right py-3 px-4">Per Hour</th>
                <th className="text-right py-3 px-4">Per Minute</th>
                <th className="text-right py-3 px-4">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-800 hover:bg-surface">
                <td className="py-3 px-4">Loot</td>
                <td className="py-3 px-4 text-right text-green-400 font-semibold">
                  {formatSmallNumber(lootPerHour)} PED
                </td>
                <td className="py-3 px-4 text-right">{formatSmallNumber(lootPerMin)} PED</td>
                <td className="py-3 px-4 text-right">{session.stats.totalLoot.toFixed(2)} PED</td>
              </tr>
              <tr className="border-b border-gray-800 hover:bg-surface">
                <td className="py-3 px-4">Spend</td>
                <td className="py-3 px-4 text-right text-red-400 font-semibold">
                  {formatSmallNumber(spendPerHour)} PED
                </td>
                <td className="py-3 px-4 text-right">{formatSmallNumber(spendPerMin)} PED</td>
                <td className="py-3 px-4 text-right">{session.stats.totalCost.toFixed(2)} PED</td>
              </tr>
              <tr className="border-b border-gray-800 hover:bg-surface">
                <td className="py-3 px-4">Profit/Loss</td>
                <td
                  className={`py-3 px-4 text-right font-semibold ${profitPerHour >= 0 ? 'text-blue-400' : 'text-orange-400'}`}
                >
                  {profitPerHour >= 0 ? '+' : ''}
                  {formatSmallNumber(profitPerHour)} PED
                </td>
                <td className="py-3 px-4 text-right">{formatSmallNumber(profitPerMin)} PED</td>
                <td className="py-3 px-4 text-right">
                  {(session.stats.totalLoot - session.stats.totalCost).toFixed(2)} PED
                </td>
              </tr>
              <tr className="border-b border-gray-800 hover:bg-surface">
                <td className="py-3 px-4">Kills</td>
                <td className="py-3 px-4 text-right text-body font-semibold">
                  {killsPerHour.toFixed(1)}
                </td>
                <td className="py-3 px-4 text-right">{killsPerMin.toFixed(2)}</td>
                <td className="py-3 px-4 text-right">{session.stats.kills}</td>
              </tr>
              <tr className="border-b border-gray-800 hover:bg-surface">
                <td className="py-3 px-4">Loot Events</td>
                <td className="py-3 px-4 text-right font-semibold">{eventsPerHour.toFixed(1)}</td>
                <td className="py-3 px-4 text-right">{eventsPerMin.toFixed(2)}</td>
                <td className="py-3 px-4 text-right">{session.stats.lootEvents}</td>
              </tr>
              <tr className="border-b border-gray-800 hover:bg-surface">
                <td className="py-3 px-4">Damage Dealt</td>
                <td className="py-3 px-4 text-right font-semibold">{dmgPerHour.toFixed(0)}</td>
                <td className="py-3 px-4 text-right">
                  {(durationMinutes > 0 ? session.stats.damageDealt / durationMinutes : 0).toFixed(
                    1
                  )}
                </td>
                <td className="py-3 px-4 text-right">{session.stats.damageDealt.toFixed(0)}</td>
              </tr>
              <tr className="border-b border-gray-800 hover:bg-surface">
                <td className="py-3 px-4">Skill Gains</td>
                <td className="py-3 px-4 text-right text-purple-400 font-semibold">
                  {formatSmallNumber(skillsPerHour)}
                </td>
                <td className="py-3 px-4 text-right">{formatSmallNumber(skillsPerMin)}</td>
                <td className="py-3 px-4 text-right">{formatSmallNumber(totalSkillGains)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Time Summary */}
      <div className="grid grid-cols-3 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4 text-blue-400">
            <Clock className="w-5 h-5 inline mr-2" />
            Time Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between p-2 border-b border-border">
              <span className="text-muted">Total Time</span>
              <span className="font-semibold">{formatDurationMs(duration)}</span>
            </div>
            <div className="flex justify-between p-2 border-b border-border">
              <span className="text-muted">Paused Time</span>
              <span className="font-semibold">{formatDurationMs(pausedMs)}</span>
            </div>
            <div className="flex justify-between p-2 border-b border-border">
              <span className="text-muted">Active Time</span>
              <span className="font-semibold">{formatDurationMs(duration)}</span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4 text-green-400">ROI Metrics</h3>
          <div className="space-y-3">
            <div className="flex justify-between p-2 border-b border-border">
              <span className="text-muted">Return Rate</span>
              <span
                className={`font-semibold ${session.stats.returns >= 100 ? 'text-green-400' : 'text-red-400'}`}
              >
                {session.stats.returns.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between p-2 border-b border-border">
              <span className="text-muted">Loot/Spend</span>
              <span className="font-semibold">
                {(session.stats.totalCost > 0
                  ? session.stats.totalLoot / session.stats.totalCost
                  : 0
                ).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between p-2 border-b border-border">
              <span className="text-muted">Net/Hour</span>
              <span
                className={`font-semibold ${profitPerHour >= 0 ? 'text-green-400' : 'text-red-400'}`}
              >
                {profitPerHour >= 0 ? '+' : ''}
                {formatSmallNumber(profitPerHour)} PED
              </span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4 text-yellow-400">Peak Rates</h3>
          <div className="space-y-3">
            <div className="flex justify-between p-2 border-b border-border">
              <span className="text-muted">Best Hour Est.</span>
              <span className="font-semibold text-green-400">
                {formatSmallNumber(lootPerHour * 1.2)} PED
              </span>
            </div>
            <div className="flex justify-between p-2 border-b border-border">
              <span className="text-muted">Efficiency</span>
              <span className="font-semibold">
                {(session.stats.returns >= 100 ? 100 : session.stats.returns).toFixed(0)}%
              </span>
            </div>
            <div className="flex justify-between p-2 border-b border-border">
              <span className="text-muted">Pace</span>
              <span className="font-semibold">{eventsPerHour.toFixed(1)} events/hr</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
