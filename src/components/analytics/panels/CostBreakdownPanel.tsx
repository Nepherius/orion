import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useHuntStore } from '../../../store';

export default function CostBreakdownPanel() {
  const costData = useHuntStore((state) => state.analyticsData.performance?.costData);

  if (!costData || costData.length === 0) return null;

  return (
    <div className="card p-6">
      <h3 className="text-lg font-bold mb-4">Cost Breakdown</h3>
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
              contentStyle={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
              itemStyle={{ color: 'var(--color-text)' }}
              formatter={(value: number) => `${value.toFixed(2)} PED`}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
