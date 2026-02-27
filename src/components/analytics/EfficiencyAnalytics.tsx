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

interface EfficiencyAnalyticsProps {
  session: HuntSession;
}

export function EfficiencyAnalytics({ session }: EfficiencyAnalyticsProps) {
  const now = Date.now();
  const pausedMs =
    (session.totalPausedMs || 0) +
    (session.status === 'paused' && session.pausedAt ? now - session.pausedAt : 0);
  const duration = Math.max(0, now - session.startTime - pausedMs);
  const durationMinutes = duration / 1000 / 60;
  const durationHours = durationMinutes / 60;

  const dpp = session.stats.kills > 0 ? session.stats.totalCost / session.stats.kills : 0;
  const dps = durationMinutes > 0 ? session.stats.totalCost / durationMinutes : 0;
  const killsPerPED = session.stats.totalCost > 0 ? session.stats.kills / session.stats.totalCost : 0;
  const killsPerHour = durationHours > 0 ? session.stats.kills / durationHours : 0;
  const avgDmgPerHit =
    session.stats.shotsFired > 0 ? session.stats.damageDealt / session.stats.shotsFired : 0;
  const shotsPerKill =
    session.stats.kills > 0 ? session.stats.shotsFired / session.stats.kills : 0;

  // Efficiency radar chart
  const efficiencyRadar = [
    { category: 'Hit Rate', value: (session.stats.shotsFired > 0 ? ((session.stats.hits + session.stats.criticalHits) / session.stats.shotsFired) * 100 : 0), max: 100 },
    { category: 'Crit Rate', value: (session.stats.shotsFired > 0 ? (session.stats.criticalHits / session.stats.shotsFired) * 100 * 2 : 0), max: 100 },
    { category: 'Return Rate', value: session.stats.returns, max: 150 },
    { category: 'Dmg/Shot', value: avgDmgPerHit * 2, max: 100 },
    { category: 'Kills/Hour', value: Math.min(killsPerHour * 10, 100), max: 100 },
  ];

  // Time efficiency metrics
  const timeMetrics = [
    { name: 'Kills/Hour', value: killsPerHour },
    { name: 'Damage/Hour', value: durationHours > 0 ? session.stats.damageDealt / durationHours : 0 },
    { name: 'Loot/Hour', value: durationHours > 0 ? session.stats.totalLoot / durationHours : 0 },
    { name: 'Events/Hour', value: durationHours > 0 ? session.stats.lootEvents / durationHours : 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="text-sm text-gray-400 mb-2">DPP (Damage Per PED)</div>
          <div className="text-3xl font-bold text-white">
            <Zap className="w-5 h-5 inline mr-2" />
            {dpp.toFixed(2)}
          </div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-gray-400 mb-2">KILLS/HOUR</div>
          <div className="text-3xl font-bold text-blue-400">
            <Clock className="w-5 h-5 inline mr-2" />
            {killsPerHour.toFixed(1)}
          </div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-gray-400 mb-2">AVG DMG/HIT</div>
          <div className="text-3xl font-bold text-yellow-400">
            <Target className="w-5 h-5 inline mr-2" />
            {avgDmgPerHit.toFixed(1)}
          </div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-gray-400 mb-2">SHOTS/KILL</div>
          <div className="text-3xl font-bold text-white">{shotsPerKill.toFixed(1)}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Efficiency Radar */}
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Efficiency Overview</h3>
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart data={efficiencyRadar}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis dataKey="category" stroke="#9CA3AF" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#9CA3AF" />
              <Radar
                name="Efficiency"
                dataKey="value"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.6}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                formatter={(value: number) => value.toFixed(1)}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Time Efficiency */}
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Time Efficiency</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={timeMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                formatter={(value: number) => value.toFixed(2)}
              />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-3 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4 text-blue-400">Resource Efficiency</h3>
          <div className="space-y-3">
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">DPP</span>
              <span className="font-semibold">{dpp.toFixed(2)}</span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">DPS</span>
              <span className="font-semibold">{dps.toFixed(2)}</span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Kills/PED</span>
              <span className="font-semibold">{killsPerPED.toFixed(2)}</span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Loot/PED</span>
              <span className="font-semibold">
                {(session.stats.totalCost > 0 ? session.stats.totalLoot / session.stats.totalCost : 0).toFixed(3)}
              </span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4 text-green-400">Combat Efficiency</h3>
          <div className="space-y-3">
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Avg Dmg/Hit</span>
              <span className="font-semibold">{avgDmgPerHit.toFixed(1)}</span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Shots/Kill</span>
              <span className="font-semibold">{shotsPerKill.toFixed(1)}</span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Dmg/PED</span>
              <span className="font-semibold">
                {(session.stats.totalCost > 0 ? session.stats.damageDealt / session.stats.totalCost : 0).toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Hit Rate</span>
              <span className="font-semibold">
                {(session.stats.shotsFired > 0
                  ? ((session.stats.hits + session.stats.criticalHits) / session.stats.shotsFired) * 100
                  : 0
                ).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4 text-yellow-400">Time Efficiency</h3>
          <div className="space-y-3">
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Kills/Hour</span>
              <span className="font-semibold">{killsPerHour.toFixed(1)}</span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Loot/Hour</span>
              <span className="font-semibold">
                {(durationHours > 0 ? session.stats.totalLoot / durationHours : 0).toFixed(2)} PED
              </span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Spend/Hour</span>
              <span className="font-semibold">
                {(durationHours > 0 ? session.stats.totalCost / durationHours : 0).toFixed(2)} PED
              </span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Events/Hour</span>
              <span className="font-semibold">
                {(durationHours > 0 ? session.stats.lootEvents / durationHours : 0).toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
