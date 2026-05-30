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
import { Panel } from '../../common/Panel';
import { chartAxisProps, chartGridProps, chartTooltipProps } from '../chartStyles';

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
    <Panel title="Weapon Performance">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={weapons}>
          <CartesianGrid {...chartGridProps} />
          <XAxis dataKey="weapon" angle={-45} textAnchor="end" height={100} {...chartAxisProps} />
          <YAxis {...chartAxisProps} />
          <Tooltip {...chartTooltipProps} formatter={(value: number) => value.toFixed(2)} />
          <Legend />
          <Bar dataKey="returnRate" fill="#10B981" name="Return Rate %" />
          <Bar dataKey="costPer1kDamage" fill="#F59E0B" name="Cost / 1k Dmg (PED)" />
          <Bar dataKey="sessions" fill="#3B82F6" name="Sessions" />
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  );
}
