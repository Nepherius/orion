import { useHuntStore } from '../../../store';
import { InfoTooltip } from '../../common/InfoTooltip';
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

export default function MaturityReturnPanel() {
  const maturityStats = useHuntStore((state) => state.analyticsData.factors?.maturityStats);

  if (!maturityStats || maturityStats.length === 0) return null;

  const chartData = maturityStats.map((item) => ({
    label: `${item.creature} ${item.maturity !== 'Unknown' ? item.maturity : ''}`.trim(),
    returnRate: parseFloat(item.returnRate.toFixed(1)),
    kills: item.totalKills,
    profit: item.profit,
    creature: item.creature,
    maturity: item.maturity,
  }));

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-bold">Return Rate by Maturity</h3>
        <InfoTooltip tooltip="Shows return rate for each creature + maturity combination. Only combos with ≥3 kills are shown. The green line marks 100% (break-even)." />
      </div>
      <ResponsiveContainer width="100%" height={Math.max(320, chartData.length * 28)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            type="number"
            stroke="var(--color-text-muted)"
            tick={{ fontSize: 11 }}
            label={{
              value: 'Return %',
              position: 'insideBottom',
              offset: -5,
              fill: 'var(--color-text-muted)',
              fontSize: 11,
            }}
          />
          <YAxis
            dataKey="label"
            type="category"
            width={140}
            stroke="var(--color-text-muted)"
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
            labelStyle={{ color: 'var(--color-text-body)' }}
            itemStyle={{ color: 'var(--color-text-body)' }}
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
    </div>
  );
}
