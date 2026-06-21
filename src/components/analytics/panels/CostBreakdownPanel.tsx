import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useHuntStore } from '../../../store';
import { Panel } from '../../common/Panel';
import { chartTooltipProps } from '../chartStyles';
import { AnalyticsEmptyState } from '../AnalyticsEmptyState';

export default function CostBreakdownPanel() {
  const costData = useHuntStore((state) => state.analyticsData.performance?.costData);

  if (!costData || costData.length === 0) {
    return (
      <AnalyticsEmptyState
        title="Cost Breakdown"
        message="No session costs are available for the selected filters."
      />
    );
  }

  return (
    <Panel title="Cost Breakdown">
      <div className="flex items-center justify-center">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={costData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => `${entry.name}: ${entry.value.toFixed(2)} PED`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {costData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              {...chartTooltipProps}
              formatter={(value: number) => `${value.toFixed(2)} PED`}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
