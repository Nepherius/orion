import { HuntSession } from '../../types';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

interface ReturnRateChartProps {
  session: HuntSession;
  emptyHeight?: string;
  margin?: { top: number; right: number; left: number; bottom: number };
}

export function ReturnRateChart({ 
  session, 
  emptyHeight = "h-64",
  margin = { top: 5, right: 30, left: 0, bottom: 5 }
}: ReturnRateChartProps) {
  // Return rate over time chart data
  const returnRateChart = session.loot.map((item, index) => {
    const cumulativeLoot = session.loot
      .slice(0, index + 1)
      .reduce((sum, l) => sum + l.totalValue, 0);
    const cumulativeCost = session.stats.totalCost * ((index + 1) / session.loot.length);
    const returnRate = cumulativeCost > 0 ? (cumulativeLoot / cumulativeCost) * 100 : 0;
    return {
      index: index + 1,
      returnRate: Math.round(returnRate * 10) / 10,
      time: format(item.timestamp, 'HH:mm:ss'),
    };
  });

  if (returnRateChart.length === 0) {
    return (
      <div className={`${emptyHeight} flex items-center justify-center text-muted`}>
        No loot data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={returnRateChart} margin={margin}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="index" stroke="var(--color-text-muted)" />
        <YAxis stroke="var(--color-text-muted)" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
          formatter={(value: number) => [`${value}%`, 'Return Rate']}
          labelFormatter={(label) => `Event #${label}`}
        />
        <Area
          type="monotone"
          dataKey="returnRate"
          stroke={session.stats.returns >= 100 ? '#22C55E' : '#EF4444'}
          fill={session.stats.returns >= 100 ? '#22C55E33' : '#EF444433'}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
