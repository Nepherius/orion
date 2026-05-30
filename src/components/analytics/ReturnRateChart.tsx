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
import { InfoTooltip } from '../common/InfoTooltip';
import { chartAxisProps, chartGridProps, chartTooltipProps } from './chartStyles';

interface ReturnRateChartProps {
  session: HuntSession;
  emptyHeight?: string;
  margin?: { top: number; right: number; left: number; bottom: number };
}

export function ReturnRateChart({
  session,
  emptyHeight = 'h-64',
  margin = { top: 5, right: 30, left: 0, bottom: 5 },
}: ReturnRateChartProps) {
  // Estimated return rate over loot events. Costs are interpolated across loot events because
  // individual cost events are not persisted with per-event PED deltas.
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
    <div>
      <div className="flex items-center gap-1 text-sm text-muted mb-2">
        Estimated Return Path
        <InfoTooltip tooltip="Loot is cumulative; session cost is interpolated evenly across loot events because per-event PED cost is not stored." />
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={returnRateChart} margin={margin}>
          <CartesianGrid {...chartGridProps} />
          <XAxis dataKey="index" {...chartAxisProps} />
          <YAxis {...chartAxisProps} />
          <Tooltip
            {...chartTooltipProps}
            formatter={(value: number) => [`${value}%`, 'Estimated Return Rate']}
            labelFormatter={(label) => `Loot Event #${label}`}
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
    </div>
  );
}
