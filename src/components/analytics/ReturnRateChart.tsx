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
  // Estimated adjusted and TT return over loot events. Costs are interpolated because
  // individual cost events are not persisted with per-event PED deltas.
  const returnRateChart = session.loot.map((item, index) => {
    const cumulativeAdjustedLoot = session.loot
      .slice(0, index + 1)
      .reduce((sum, l) => sum + l.totalValue, 0);
    const cumulativeTtLoot = session.loot
      .slice(0, index + 1)
      .reduce((sum, l) => sum + l.value * l.quantity, 0);
    const cumulativeCost = session.stats.totalCost * ((index + 1) / session.loot.length);
    const adjustedReturnRate =
      cumulativeCost > 0 ? (cumulativeAdjustedLoot / cumulativeCost) * 100 : 0;
    const ttReturnRate = cumulativeCost > 0 ? (cumulativeTtLoot / cumulativeCost) * 100 : 0;
    return {
      index: index + 1,
      adjustedReturnRate: Math.round(adjustedReturnRate * 10) / 10,
      ttReturnRate: Math.round(ttReturnRate * 10) / 10,
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
            formatter={(value: number, name: string) => {
              if (name === 'adjustedReturnRate') return [`${value}%`, 'Adjusted Return'];
              if (name === 'ttReturnRate') return [`${value}%`, 'TT Return'];
              return [`${value}%`, name];
            }}
            labelFormatter={(label) => `Loot Event #${label}`}
          />
          <Area
            type="monotone"
            dataKey="adjustedReturnRate"
            stroke={session.stats.adjustedReturns >= 100 ? '#22C55E' : '#EF4444'}
            fill={session.stats.adjustedReturns >= 100 ? '#22C55E33' : '#EF444433'}
            name="Adjusted Return"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="ttReturnRate"
            stroke="#60A5FA"
            fill="#60A5FA00"
            fillOpacity={0}
            name="TT Return"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
