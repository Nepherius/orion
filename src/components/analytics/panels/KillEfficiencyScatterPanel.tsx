import { useHuntStore } from '../../../store';
import { Panel } from '../../common/Panel';
import { chartAxisProps, chartGridProps, chartTooltipProps } from '../chartStyles';
import { AnalyticsEmptyState } from '../AnalyticsEmptyState';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ZAxis,
} from 'recharts';

interface ScatterPoint {
  avgCostPerKill: number;
  avgLootPerKill: number;
  creature: string;
  totalKills: number;
  returnRate: number;
}

export default function KillEfficiencyScatterPanel() {
  const killEfficiency = useHuntStore((state) => state.analyticsData.factors?.killEfficiency);

  if (!killEfficiency || killEfficiency.length === 0) {
    return (
      <AnalyticsEmptyState
        title="Kill Efficiency Scatter"
        message="Track kills with both costs and loot to compare creature efficiency."
      />
    );
  }

  const points: ScatterPoint[] = killEfficiency.map((item) => ({
    avgCostPerKill: parseFloat(item.avgCostPerKill.toFixed(3)),
    avgLootPerKill: parseFloat(item.avgLootPerKill.toFixed(3)),
    creature: item.creature,
    totalKills: item.totalKills,
    returnRate: parseFloat(item.returnRate.toFixed(1)),
  }));

  // Determine axis max for the break-even reference line
  const maxVal = Math.max(...points.map((p) => Math.max(p.avgCostPerKill, p.avgLootPerKill)), 1);
  const axisMax = Math.ceil(maxVal * 1.15);

  // Scale range for bubble sizes
  const minKills = Math.min(...points.map((p) => p.totalKills));
  const maxKills = Math.max(...points.map((p) => p.totalKills));

  return (
    <Panel
      title="Kill Efficiency Scatter"
      tooltip="Each dot is a creature type. X = average cost per kill, Y = average loot per kill. Points above the diagonal line are profitable creatures. Dot size reflects kill count."
    >
      <ResponsiveContainer width="100%" height={380}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid {...chartGridProps} />
          <XAxis
            dataKey="avgCostPerKill"
            type="number"
            name="Avg Cost/Kill"
            unit=" PED"
            {...chartAxisProps}
            domain={[0, axisMax]}
            label={{
              value: 'Avg Cost/Kill (PED)',
              position: 'insideBottom',
              offset: -5,
              fill: '#EF4444',
              fontSize: 11,
            }}
          />
          <YAxis
            dataKey="avgLootPerKill"
            type="number"
            name="Avg Adj Loot/Kill"
            unit=" PED"
            {...chartAxisProps}
            domain={[0, axisMax]}
            label={{
              value: 'Avg Adj Loot/Kill (PED)',
              angle: -90,
              position: 'insideLeft',
              fill: '#22C55E',
              fontSize: 11,
            }}
          />
          <ZAxis
            dataKey="totalKills"
            range={[40, maxKills === minKills ? 120 : 300]}
            name="Kills"
          />
          <Tooltip
            {...chartTooltipProps}
            formatter={(value: number, name: string) => {
              if (name === 'Avg Cost/Kill') return `${value.toFixed(3)} PED`;
              if (name === 'Avg Adj Loot/Kill') return `${value.toFixed(3)} PED`;
              if (name === 'Kills') return value;
              return value;
            }}
            labelFormatter={(_label: string, payload: Array<{ payload?: ScatterPoint }>) => {
              const point = payload?.[0]?.payload;
              if (!point) return '';
              return `${point.creature} (${point.returnRate}% adjusted return)`;
            }}
          />
          {/* Break-even diagonal line — y = x */}
          <ReferenceLine
            segment={[
              { x: 0, y: 0 },
              { x: axisMax, y: axisMax },
            ]}
            stroke="#10B981"
            strokeDasharray="6 4"
            strokeWidth={1.5}
          />
          <Scatter data={points} fill="#3B82F6" fillOpacity={0.7} />
        </ScatterChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted">
        <span>Above line = profitable</span>
        <span>Below line = unprofitable</span>
        <span>Dot size = kill count</span>
      </div>
    </Panel>
  );
}
