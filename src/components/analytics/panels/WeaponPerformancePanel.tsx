import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useHuntStore } from '../../../store';

export default function WeaponPerformancePanel() {
  const weaponData = useHuntStore((state) => state.analyticsData.performance?.weaponData);

  const weapons = useMemo(() => {
    if (!weaponData) return [];
    return weaponData.map((wpn) => {
      const costPer1kDamage = wpn.totalDamage > 0 ? (wpn.totalCost / wpn.totalDamage) * 1000 : 0;
      return {
        ...wpn,
        costPer1kDamage,
      };
    });
  }, [weaponData]);

  if (weapons.length === 0) return null;

  return (
    <div className="card p-6">
      <h3 className="text-lg font-bold mb-4">Weapon Performance</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={weapons}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="weapon"
            stroke="var(--color-text-muted)"
            angle={-45}
            textAnchor="end"
            height={100}
          />
          <YAxis stroke="var(--color-text-muted)" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
            labelStyle={{ color: '#F3F4F6' }}
            formatter={(value: number) => value.toFixed(2)}
          />
          <Legend />
          <Bar dataKey="returnRate" fill="#10B981" name="Return Rate %" />
          <Bar dataKey="costPer1kDamage" fill="#F59E0B" name="Cost / 1k Dmg (PED)" />
          <Bar dataKey="sessions" fill="#3B82F6" name="Sessions" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
