import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useHuntStore } from '../../../store';

export default function TopSkillsPanel() {
  const topSkills = useHuntStore((state) => state.analyticsData.performance?.topSkills);

  if (!topSkills || topSkills.length === 0) return null;

  return (
    <div className="card p-6">
      <h3 className="text-lg font-bold mb-4">Top Skills Gained</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={topSkills} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis type="number" stroke="var(--color-text-muted)" />
          <YAxis dataKey="name" type="category" stroke="var(--color-text-muted)" width={150} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
            labelStyle={{ color: '#F3F4F6' }}
            formatter={(value: number) => value.toFixed(2)}
          />
          <Bar dataKey="total" fill="#3B82F6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
