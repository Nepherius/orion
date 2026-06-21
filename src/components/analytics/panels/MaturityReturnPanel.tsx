import { useHuntStore } from '../../../store';
import { Panel } from '../../common/Panel';
import { chartAxisProps, chartGridProps, chartTooltipProps } from '../chartStyles';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { AnalyticsEmptyState } from '../AnalyticsEmptyState';

export default function MaturityReturnPanel() {
  const maturityStats = useHuntStore((state) => state.analyticsData.factors?.maturityStats);

  if (!maturityStats || maturityStats.length === 0) {
    return (
      <AnalyticsEmptyState
        title="Return Rate by Maturity"
        message="Track at least 3 kills for a creature and maturity combination to show this comparison."
      />
    );
  }

  const chartData = maturityStats.map((item) => ({
    label: `${item.creature} ${item.maturity !== 'Unknown' ? item.maturity : ''}`.trim(),
    returnRate: parseFloat(item.returnRate.toFixed(1)),
    kills: item.totalKills,
    profit: item.profit,
    creature: item.creature,
    maturity: item.maturity,
  }));

  return (
    <Panel
      title="Return Rate by Maturity"
      tooltip="Shows return rate for each creature + maturity combination. Only combos with ≥3 kills are shown. The green line marks 100% (break-even)."
    >
      <ResponsiveContainer width="100%" height={Math.max(320, chartData.length * 28)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
          <CartesianGrid {...chartGridProps} />
          <XAxis
            type="number"
            {...chartAxisProps}
            label={{
              value: 'Return %',
              position: 'insideBottom',
              offset: -5,
              fill: 'var(--color-text-muted)',
              fontSize: 11,
            }}
          />
          <YAxis dataKey="label" type="category" width={140} {...chartAxisProps} />
          <Tooltip
            {...chartTooltipProps}
            formatter={(value: number, name: string) => {
              if (name === 'Return %') return `${value.toFixed(1)}%`;
              return value;
            }}
            labelFormatter={(
              _label: string,
              payload: Array<{ payload?: (typeof chartData)[0] }>
            ) => {
              const point = payload?.[0]?.payload;
              if (!point) return '';
              return `${point.label} (${point.kills} kills, ${point.profit >= 0 ? '+' : ''}${point.profit.toFixed(2)} PED)`;
            }}
          />
          <ReferenceLine x={100} stroke="#10B981" strokeDasharray="6 4" strokeWidth={1.5} />
          <Bar dataKey="returnRate" name="Return %" barSize={18}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.returnRate >= 100 ? '#22C55E' : '#EF4444'}
                fillOpacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  );
}
