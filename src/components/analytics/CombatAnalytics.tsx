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
  const missRate = shotsFired + misses > 0 ? (misses / (shotsFired + misses)) * 100 : 0;
  const evasionRate =
    shotsFired + misses > 0 ? ((dodges + evades) / (shotsFired + misses)) * 100 : 0;

  // Hit distribution
  const hitDistribution = [
    { name: 'Hits', value: hits, color: '#22C55E' },
    { name: 'Critical Hits', value: critHits, color: '#FBBF24' },
    { name: 'Misses', value: misses, color: '#9CA3AF' },
  ].filter((item) => item.value > 0);

  // Evasion distribution
  const evasionDistribution = [
    { name: 'Dodges', value: dodges, color: '#EF4444' },
    { name: 'Evades', value: evades, color: '#3B82F6' },
  ].filter((item) => item.value > 0);

  // Damage over time
  const damageChart = session.damageEvents.slice(0, 100).map((event, index) => {
    const cumulativeDmg = session.damageEvents
      .slice(0, index + 1)
      .reduce((sum, e) => sum + e.damage, 0);
    return {
      index: index + 1,
      damage: cumulativeDmg,
      time: format(event.timestamp, 'HH:mm:ss'),
    };
  });

  // Combat comparison
  const combatComparison = [
    { name: 'Damage Out', value: dmgDealt, color: '#22C55E' },
    { name: 'Damage In', value: dmgTaken, color: '#EF4444' },
    { name: 'Healing', value: totalHealing, color: '#3B82F6' },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="text-sm text-gray-400 mb-2">KILLS</div>
          <div className="text-3xl font-bold text-white">
            <Crosshair className="w-5 h-5 inline mr-2" />
            {kills}
          </div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-gray-400 mb-2">DAMAGE DEALT</div>
          <div className="text-3xl font-bold text-green-400">
            <Zap className="w-5 h-5 inline mr-2" />
            {dmgDealt.toFixed(0)}
          </div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-gray-400 mb-2">DAMAGE TAKEN</div>
          <div className="text-3xl font-bold text-red-400">
            <Shield className="w-5 h-5 inline mr-2" />
            {dmgTaken.toFixed(0)}
          </div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-gray-400 mb-2">HEALING</div>
          <div className="text-3xl font-bold text-blue-400">
            <Heart className="w-5 h-5 inline mr-2" />
            {totalHealing.toFixed(0)}
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-3 gap-6">
        {/* Hit Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Hit Distribution</h3>
          {hitDistribution.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No combat data
            </div>
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
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Evasion Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Evasion Distribution</h3>
          {evasionDistribution.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No evasion data
            </div>
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
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Combat Comparison */}
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Combat Balance</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={combatComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                formatter={(value: number) => value.toFixed(0)}
              />
              <Bar dataKey="value" fill="#3B82F6">
                {combatComparison.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Damage Over Time */}
      <div className="card p-6">
        <h3 className="text-lg font-bold mb-4">Cumulative Damage Dealt</h3>
        {damageChart.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400">No damage data</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={damageChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="index" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                formatter={(value: number) => [value.toFixed(0), 'Damage']}
                labelFormatter={(label) => `Hit #${label}`}
              />
              <Line type="monotone" dataKey="damage" stroke="#22C55E" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Combat Metrics */}
      <div className="grid grid-cols-4 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4 text-green-400">Offense</h3>
          <div className="space-y-3">
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Shots Fired</span>
              <span className="font-semibold">{shotsFired}</span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Hits</span>
              <span className="font-semibold text-green-400">{hits}</span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Critical Hits</span>
              <span className="font-semibold text-yellow-400">{critHits}</span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Misses</span>
              <span className="font-semibold text-gray-400">{misses}</span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4 text-blue-400">Defense</h3>
          <div className="space-y-3">
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Dodges</span>
              <span className="font-semibold text-red-400">{dodges}</span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Evades</span>
              <span className="font-semibold text-blue-400">{evades}</span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Heals Used</span>
              <span className="font-semibold">{session.stats.healsUsed}</span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Total Healing</span>
              <span className="font-semibold text-blue-400">{totalHealing.toFixed(0)}</span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4 text-yellow-400">Accuracy</h3>
          <div className="space-y-3">
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Hit Rate</span>
              <span
                className={`font-semibold ${hitRate >= 80 ? 'text-green-400' : 'text-yellow-400'}`}
              >
                {hitRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Crit Rate</span>
              <span className={`font-semibold ${critRate >= 5 ? 'text-yellow-400' : 'text-white'}`}>
                {critRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Miss Rate</span>
              <span className="font-semibold">{missRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Evasion Rate</span>
              <span
                className={`font-semibold ${evasionRate >= 20 ? 'text-green-400' : 'text-white'}`}
              >
                {evasionRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4 text-purple-400">Averages</h3>
          <div className="space-y-3">
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Dmg/Hit</span>
              <span className="font-semibold">
                {(shotsFired > 0 ? dmgDealt / shotsFired : 0).toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Dmg/Kill</span>
              <span className="font-semibold">{(kills > 0 ? dmgDealt / kills : 0).toFixed(0)}</span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Shots/Kill</span>
              <span className="font-semibold">
                {(kills > 0 ? shotsFired / kills : 0).toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Net Damage</span>
              <span
                className={`font-semibold ${dmgDealt - dmgTaken > 0 ? 'text-green-400' : 'text-red-400'}`}
              >
                {(dmgDealt - dmgTaken).toFixed(0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
