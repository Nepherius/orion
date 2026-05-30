import { useHuntStore } from '../../../store';
import { DataTable, DataTableColumn } from '../../common/DataTable';
import { Panel } from '../../common/Panel';

export default function TopLootItemsPanel() {
  const topLootItems = useHuntStore((state) => state.analyticsData.performance?.topLootItems);

  if (!topLootItems || topLootItems.length === 0) return null;

  const columns: Array<DataTableColumn<(typeof topLootItems)[number]>> = [
    {
      key: 'name',
      header: 'Item Name',
      span: 2,
      render: (item) => (
        <span className="block truncate" title={item.name}>
          {item.name}
        </span>
      ),
    },
    {
      key: 'totalValue',
      header: 'Total Value',
      align: 'right',
      render: (item) => (
        <span className="font-semibold text-green-400">{item.totalValue.toFixed(2)} PED</span>
      ),
    },
    { key: 'drops', header: 'Drops', align: 'right', render: (item) => item.drops },
    {
      key: 'avgValue',
      header: 'Avg/Drop',
      align: 'right',
      render: (item) => item.avgValue.toFixed(2),
    },
  ];

  return (
    <Panel title="Top Loot Items" action={<span className="text-xs text-muted">By value</span>}>
      <DataTable
        columns={columns}
        rows={topLootItems}
        getRowKey={(item) => item.name}
        maxHeightClassName="max-h-96 overflow-y-auto"
      />
    </Panel>
  );
}
