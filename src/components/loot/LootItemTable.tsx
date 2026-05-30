import { Search, Trash2 } from 'lucide-react';
import { DataTable, DataTableColumn } from '../common/DataTable';
import { Panel } from '../common/Panel';
import type { GroupedLootItem, LootSortBy } from './lootTypes';

interface LootItemTableProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  sortBy: LootSortBy;
  onSortByChange: (value: LootSortBy) => void;
  filteredLoot: GroupedLootItem[];
  totalAdjustedValue: number;
  itemTypeCache: Map<string, string>;
  onSelectItem: (item: GroupedLootItem) => void;
  onDeleteItem: (itemName: string) => void;
}

export function LootItemTable({
  searchQuery,
  onSearchQueryChange,
  sortBy,
  onSortByChange,
  filteredLoot,
  totalAdjustedValue,
  itemTypeCache,
  onSelectItem,
  onDeleteItem,
}: LootItemTableProps) {
  const columns: Array<DataTableColumn<GroupedLootItem>> = [
    {
      key: 'value',
      header: 'Value',
      span: 1.2,
      render: (item) => (
        <>
          <div className="font-medium">{item.totalValue.toFixed(2)}</div>
          <div className="text-xs text-muted">
            TT {item.value.toFixed(2)}
            {item.markupGain > 0 ? ` + ${item.markupGain.toFixed(2)}` : ''}
            {item.fixedGain > 0 ? ` + ${item.fixedGain.toFixed(2)}` : ''}
          </div>
        </>
      ),
    },
    {
      key: 'quantity',
      header: 'Qty',
      render: (item) => item.quantity,
    },
    {
      key: 'name',
      header: 'Name',
      span: 1.6,
      render: (item) => <span className="font-medium">{item.name}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      align: 'right',
      render: (item) => {
        const itemType = itemTypeCache.get(item.name);
        return itemType ? <span className="text-blue-400">{itemType}</span> : null;
      },
    },
    {
      key: 'tt',
      header: 'TT',
      align: 'right',
      render: (item) => `${(item.value / item.quantity).toFixed(4)} PED`,
    },
    {
      key: 'share',
      header: 'Share',
      align: 'right',
      render: (item) => {
        const share = totalAdjustedValue > 0 ? (item.totalValue / totalAdjustedValue) * 100 : 0;
        return `${share.toFixed(1)}%`;
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (item) => (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onDeleteItem(item.name);
          }}
          className="text-red-400 hover:text-red-300"
          title="Delete all entries for this item"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <Panel>
      <div className="flex items-center justify-between mb-4">
        <div className="relative flex-1 mr-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="input w-full pl-10"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as LootSortBy)}
            className="input"
          >
            <option value="value">⬇ Value</option>
            <option value="qty">⬇ Qty</option>
            <option value="name">⬇ Name</option>
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={filteredLoot}
        getRowKey={(item) => item.name}
        onRowClick={onSelectItem}
        emptyMessage="No loot items match the current search."
      />
    </Panel>
  );
}
