import { useMemo } from 'react';
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
import { calculateSessionAttributeGains } from '../../utils/analyticsCalculations';
import { getSessionActiveDurationHours } from '../../utils/sessionTiming';
import { DataTable, DataTableColumn } from '../common/DataTable';
import { MetricTile, Panel } from '../common/Panel';
import { StatCard } from '../common/StatCard';
import { chartAxisProps, chartGridProps, chartTooltipProps } from './chartStyles';

interface SkillsAnalyticsProps {
  session: HuntSession;
}

export function SkillsAnalytics({ session }: SkillsAnalyticsProps) {
  const totalGains = session.skills.reduce((sum, skill) => sum + skill.gainAmount, 0);
  const skillEvents = session.skills.length;
  const skillsPerPED = session.stats.totalCost > 0 ? totalGains / session.stats.totalCost : 0;
  const avgSkillValue = skillEvents > 0 ? totalGains / skillEvents : 0;

  const durationHours = getSessionActiveDurationHours(session);
  const skillsPerHour = durationHours > 0 ? totalGains / durationHours : 0;
  const skillsPerKill = session.stats.kills > 0 ? totalGains / session.stats.kills : 0;

  // Skills over time
  const skillsChart = useMemo(() => {
    return session.skills.map((skill, index) => {
      const cumulativeGains = session.skills
        .slice(0, index + 1)
        .reduce((sum, s) => sum + s.gainAmount, 0);
      return {
        index: index + 1,
        gains: cumulativeGains,
        time: format(skill.timestamp, 'HH:mm:ss'),
      };
    });
  }, [session.skills]);

  // Skills by type
  const skillsByType = useMemo(() => {
    const res = session.skills.reduce(
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
    res.sort((a, b) => b.gains - a.gains);
    return res;
  }, [session.skills]);

  // Calculate attribute gains
  const sortedAttributes = useMemo(() => {
    const attributeGains = calculateSessionAttributeGains(session);
    return Object.entries(attributeGains)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.gains - a.gains);
  }, [session]);

  // Attribute descriptions
  const attributeDescriptions: Record<string, string> = {
    Agility:
      'Affects coordination, finesse, and grace; influences movement speed and is vital for many professions.',
    Health: 'Determines how much damage your avatar can withstand before dying.',
    Intelligence: 'Impacts actions involving the mind, memory, and reasoning.',
    Psyche: 'Influences willpower, mental strength, and mindforce.',
    Stamina: 'Affects bodily hardiness, constitution, and physical toughness.',
    Strength: 'Governs raw muscle power, lifting capacity, and brute force.',
  };

  const skillColumns: Array<DataTableColumn<(typeof skillsByType)[number]>> = [
    {
      key: 'name',
      header: 'Skill Name',
      span: 2,
      render: (skill) => <span className="font-medium">{skill.name}</span>,
    },
    {
      key: 'gains',
      header: 'Total Gains',
      align: 'right',
      render: (skill) => (
        <span className="font-semibold text-purple-400">{skill.gains.toFixed(2)}</span>
      ),
    },
    { key: 'count', header: 'Event Count', align: 'right', render: (skill) => skill.count },
    {
      key: 'average',
      header: 'Avg/Event',
      align: 'right',
      render: (skill) => (skill.gains / skill.count).toFixed(2),
    },
    {
      key: 'share',
      header: '% of Total',
      align: 'right',
      render: (skill) => `${(totalGains > 0 ? (skill.gains / totalGains) * 100 : 0).toFixed(1)}%`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <MetricTile
          label="Total Gains"
          value={totalGains.toFixed(2)}
          tone="accent"
          icon={<TrendingUp className="h-5 w-5 shrink-0" />}
          size="lg"
        />
        <MetricTile
          label="Skill Events"
          value={skillEvents}
          tone="accent"
          icon={<Award className="h-5 w-5 shrink-0" />}
          size="lg"
        />
        <MetricTile
          label="Skills/Hour"
          value={skillsPerHour.toFixed(2)}
          tone="positive"
          size="lg"
        />
        <MetricTile
          label="Avg Gain"
          value={avgSkillValue.toFixed(2)}
          tone="warning"
          icon={<BookOpen className="h-5 w-5 shrink-0" />}
          size="lg"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Skills Over Time */}
        <Panel title="Cumulative Skill Gains">
          {skillsChart.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted">
              No skill gains yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={skillsChart}>
                <CartesianGrid {...chartGridProps} />
                <XAxis dataKey="index" {...chartAxisProps} />
                <YAxis {...chartAxisProps} />
                <Tooltip
                  {...chartTooltipProps}
                  formatter={(value: number) => value.toFixed(2)}
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
        </Panel>

        {/* Skills by Type */}
        <Panel title="Skills by Type">
          {skillsByType.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted">
              No skills recorded
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={skillsByType.slice(0, 10)}>
                <CartesianGrid {...chartGridProps} />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  {...chartAxisProps}
                />
                <YAxis {...chartAxisProps} />
                <Tooltip {...chartTooltipProps} formatter={(value: number) => value.toFixed(2)} />
                <Bar dataKey="gains" fill="#A855F7" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
      </div>

      {/* Attributes Panel */}
      <Panel
        title="Attributes"
        tooltip="Core character attributes advancement. These are fundamental progression elements."
      >
        {sortedAttributes.some((attr) => attr.gains > 0) ? (
          <div className="grid grid-cols-2 gap-4 mb-4">
            {sortedAttributes.map((attr) => (
              <div key={attr.name} className="border border-border rounded p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold text-lg mb-1">{attr.name}</div>
                    <div className="text-xs text-muted mb-2">
                      {attributeDescriptions[attr.name]}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-end pt-2 border-t border-border">
                  <div className="text-3xl font-bold text-cyan-400">{attr.gains.toFixed(2)}</div>
                  <div className="text-sm text-muted">{attr.count} events</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted py-8">No attribute gains recorded</div>
        )}
      </Panel>

      {/* Debug: Show all skill names for attribute identification */}
      <Panel title="All Skills This Session" className="border-yellow-500/30">
        {skillsByType.length > 0 ? (
          <div className="text-xs text-muted space-y-1 max-h-32 overflow-y-auto">
            {skillsByType.map((skill) => (
              <div
                key={skill.name}
                className="p-1 bg-gray-700/20 rounded px-2 flex justify-between"
              >
                <span>{skill.name}</span>
                <span className="text-gray-500">({skill.gains.toFixed(2)})</span>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted">No skills recorded</span>
        )}
      </Panel>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-6">
        <Panel title="Performance Metrics">
          <div className="space-y-3">
            <StatCard label="Total Gains" value={totalGains.toFixed(2)} />
            <StatCard label="Skill Events" value={skillEvents} />
            <StatCard label="Avg Skill Value" value={avgSkillValue.toFixed(2)} />
          </div>
        </Panel>

        <Panel title="Efficiency Metrics">
          <div className="space-y-3">
            <StatCard label="Skills/PED" value={skillsPerPED.toFixed(2)} />
            <StatCard label="Skills/Hour" value={skillsPerHour.toFixed(2)} />
            <StatCard label="Skills/Kill" value={skillsPerKill.toFixed(2)} />
          </div>
        </Panel>

        <Panel title="Variety Metrics">
          <div className="space-y-3">
            <StatCard label="Unique Skills" value={skillsByType.length} />
            <StatCard label="Most Gained" value={skillsByType[0]?.name.substring(0, 15) || 'N/A'} />
            <StatCard label="Top Skill Value" value={skillsByType[0]?.gains.toFixed(2) || '0.00'} />
          </div>
        </Panel>
      </div>

      {/* Skill Details Table */}
      <Panel title="Skill Breakdown">
        {skillsByType.length === 0 ? (
          <div className="text-center text-muted py-8">No skills recorded</div>
        ) : (
          <DataTable columns={skillColumns} rows={skillsByType} getRowKey={(skill) => skill.name} />
        )}
      </Panel>
    </div>
  );
}
