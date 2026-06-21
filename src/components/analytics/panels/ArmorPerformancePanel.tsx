import { useHuntStore } from '../../../store';
import { DataTable, DataTableColumn } from '../../common/DataTable';
import { Panel } from '../../common/Panel';
import { AnalyticsEmptyState } from '../AnalyticsEmptyState';

export default function ArmorPerformancePanel() {
  const armorData = useHuntStore((state) => state.analyticsData.performance?.armorData);

  if (!armorData || armorData.length === 0 || !armorData.some((a) => a.armor !== 'None')) {
    return (
      <AnalyticsEmptyState
        title="Armor Performance"
        message="Complete sessions with armor equipped and recorded damage taken to compare armor performance."
      />
    );
  }

  const columns: Array<DataTableColumn<(typeof armorData)[number]>> = [
    {
      key: 'armor',
      header: 'Armor',
      span: 2,
      render: (armor) => (
        <span className="block truncate" title={armor.armor}>
          {armor.armor}
        </span>
      ),
    },
    { key: 'sessions', header: 'Sessions', align: 'right', render: (armor) => armor.sessions },
    {
      key: 'returnRate',
      header: 'Return %',
      align: 'right',
      render: (armor) => (
        <span
          className={
            armor.returnRate >= 100 ? 'font-semibold text-green-400' : 'font-semibold text-red-400'
          }
        >
          {armor.returnRate.toFixed(1)}%
        </span>
      ),
    },
    {
      key: 'avgDamage',
      header: 'Avg Damage Taken',
      align: 'right',
      render: (armor) => armor.avgDamageTaken.toFixed(2),
    },
  ];

  return (
    <Panel title="Armor Performance">
      <DataTable columns={columns} rows={armorData} getRowKey={(armor) => armor.armor} />
    </Panel>
  );
}
