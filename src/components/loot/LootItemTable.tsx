import { ArrowUpDown, Search, Trash2 } from 'lucide-react';
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
  return (
    <div className="card p-6">
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

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="text-left py-2 px-3">
                <button className="flex items-center gap-1 hover:text-white">
                  <ArrowUpDown className="w-3 h-3" />
                  Value
                </button>
              </th>
              <th className="text-left py-2 px-3">
                <button className="flex items-center gap-1 hover:text-white">
                  <ArrowUpDown className="w-3 h-3" />
                  Qty
                </button>
              </th>
              <th className="text-left py-2 px-3">
                <button className="flex items-center gap-1 hover:text-white">
                  <ArrowUpDown className="w-3 h-3" />
                  Name
                </button>
              </th>
              <th className="text-right py-2 px-3">Type</th>
              <th className="text-right py-2 px-3">TT</th>
              <th className="text-right py-2 px-3">Share</th>
              <th className="text-right py-2 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {filteredLoot.map((item, idx) => {
              const share = totalAdjustedValue > 0 ? (item.totalValue / totalAdjustedValue) * 100 : 0;
              const itemType = itemTypeCache.get(item.name);
              return (
                <tr
                  key={idx}
                  className="border-b border-gray-800 hover:bg-surface cursor-pointer"
                  onClick={() => onSelectItem(item)}
                >
                  <td className="py-2 px-3">
                    <div className="font-medium">{item.totalValue.toFixed(2)}</div>
                    <div className="text-xs text-muted">
                      TT {item.value.toFixed(2)}
                      {item.markupGain > 0 ? ` + ${item.markupGain.toFixed(2)}` : ''}
                      {item.fixedGain > 0 ? ` + ${item.fixedGain.toFixed(2)}` : ''}
                    </div>
                  </td>
                  <td className="py-2 px-3">{item.quantity}</td>
                  <td className="py-2 px-3 font-medium">{item.name}</td>
                  <td className="py-2 px-3 text-right">
                    {itemType && <span className="text-blue-400">{itemType}</span>}
                  </td>
                  <td className="py-2 px-3 text-right">{(item.value / item.quantity).toFixed(4)} PED</td>
                  <td className="py-2 px-3 text-right">{share.toFixed(1)}%</td>
                  <td
                    className="py-2 px-3 text-right"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <button
                      onClick={() => onDeleteItem(item.name)}
                      className="text-red-400 hover:text-red-300"
                      title="Delete all entries for this item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
