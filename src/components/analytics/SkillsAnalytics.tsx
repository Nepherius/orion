import { HuntSession } from '../../types';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Award, BookOpen } from 'lucide-react';
import { format } from 'date-fns';

interface SkillsAnalyticsProps {
  session: HuntSession;
}

export function SkillsAnalytics({ session }: SkillsAnalyticsProps) {
  const totalGains = session.skills.reduce((sum, skill) => sum + skill.gainAmount, 0);
  const skillEvents = session.skills.length;
  const skillsPerPED = session.stats.totalCost > 0 ? totalGains / session.stats.totalCost : 0;
  const avgSkillValue = skillEvents > 0 ? totalGains / skillEvents : 0;

  const now = Date.now();
  const pausedMs =
    (session.totalPausedMs || 0) +
    (session.status === 'paused' && session.pausedAt ? now - session.pausedAt : 0);
  const duration = Math.max(0, now - session.startTime - pausedMs);
  const durationHours = duration / 1000 / 60 / 60;
  const skillsPerHour = durationHours > 0 ? totalGains / durationHours : 0;
  const skillsPerKill = session.stats.kills > 0 ? totalGains / session.stats.kills : 0;

  // Skills over time
  const skillsChart = session.skills.map((skill, index) => {
    const cumulativeGains = session.skills
      .slice(0, index + 1)
      .reduce((sum, s) => sum + s.gainAmount, 0);
    return {
      index: index + 1,
      gains: cumulativeGains,
      time: format(skill.timestamp, 'HH:mm:ss'),
    };
  });

  // Skills by type
  const skillsByType = session.skills.reduce(
    (acc, skill) => {
      const existing = acc.find((s) => s.name === skill.skillName);
      if (existing) {
        existing.gains += skill.gainAmount;
        existing.count++;
      } else {
        acc.push({ name: skill.skillName, gains: skill.gainAmount, count: 1 });
      }
      return acc;
    },
    [] as Array<{ name: string; gains: number; count: number }>
  );

  skillsByType.sort((a, b) => b.gains - a.gains);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="text-sm text-gray-400 mb-2">TOTAL GAINS</div>
          <div className="text-3xl font-bold text-purple-400">
            <TrendingUp className="w-5 h-5 inline mr-2" />
            {totalGains.toFixed(4)}
          </div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-gray-400 mb-2">SKILL EVENTS</div>
          <div className="text-3xl font-bold text-blue-400">
            <Award className="w-5 h-5 inline mr-2" />
            {skillEvents}
          </div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-gray-400 mb-2">SKILLS/HOUR</div>
          <div className="text-3xl font-bold text-green-400">{skillsPerHour.toFixed(4)}</div>
        </div>

        <div className="card p-6">
          <div className="text-sm text-gray-400 mb-2">AVG GAIN</div>
          <div className="text-3xl font-bold text-yellow-400">
            <BookOpen className="w-5 h-5 inline mr-2" />
            {avgSkillValue.toFixed(4)}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Skills Over Time */}
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Cumulative Skill Gains</h3>
          {skillsChart.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No skill gains yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={skillsChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="index" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                  formatter={(value: number) => value.toFixed(4)}
                  labelFormatter={(label) => `Event #${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="gains"
                  stroke="#A855F7"
                  strokeWidth={2}
                  dot={{ fill: '#A855F7', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Skills by Type */}
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Skills by Type</h3>
          {skillsByType.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No skills recorded
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={skillsByType.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                  formatter={(value: number) => value.toFixed(4)}
                />
                <Bar dataKey="gains" fill="#A855F7" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Skill Details Table */}
      <div className="card p-6">
        <h3 className="text-lg font-bold mb-4">Skill Breakdown</h3>
        {skillsByType.length === 0 ? (
          <div className="text-center text-gray-400 py-8">No skills recorded</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4">Skill Name</th>
                  <th className="text-right py-3 px-4">Total Gains</th>
                  <th className="text-right py-3 px-4">Event Count</th>
                  <th className="text-right py-3 px-4">Avg/Event</th>
                  <th className="text-right py-3 px-4">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {skillsByType.map((skill, index) => (
                  <tr key={index} className="border-b border-gray-800 hover:bg-gray-700">
                    <td className="py-3 px-4 font-medium">{skill.name}</td>
                    <td className="py-3 px-4 text-right text-purple-400 font-semibold">
                      {skill.gains.toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-right">{skill.count}</td>
                    <td className="py-3 px-4 text-right">
                      {(skill.gains / skill.count).toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {((skill.gains / totalGains) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
                \n{' '}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4 text-purple-400">Performance Metrics</h3>
          <div className="space-y-3">
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Total Gains</span>
              <span className="font-semibold">{totalGains.toFixed(4)}</span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Skill Events</span>
              <span className="font-semibold">{skillEvents}</span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Avg Skill Value</span>
              <span className="font-semibold">{avgSkillValue.toFixed(4)}</span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4 text-blue-400">Efficiency Metrics</h3>
          <div className="space-y-3">
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Skills/PED</span>
              <span className="font-semibold">{skillsPerPED.toFixed(4)}</span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Skills/Hour</span>
              <span className="font-semibold">{skillsPerHour.toFixed(4)}</span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Skills/Kill</span>
              <span className="font-semibold">{skillsPerKill.toFixed(4)}</span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4 text-green-400">Variety Metrics</h3>
          <div className="space-y-3">
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Unique Skills</span>
              <span className="font-semibold">{skillsByType.length}</span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Most Gained</span>
              <span className="font-semibold text-sm">
                {skillsByType[0]?.name.substring(0, 15) || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between p-2 border-b border-gray-700">
              <span className="text-gray-400">Top Skill Value</span>
              <span className="font-semibold">{skillsByType[0]?.gains.toFixed(4) || '0.0000'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
