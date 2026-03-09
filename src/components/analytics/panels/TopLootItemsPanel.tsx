import { useHuntStore } from '../../../store';

export default function TopLootItemsPanel() {
  const topLootItems = useHuntStore((state) => state.analyticsData.performance?.topLootItems);

  if (!topLootItems || topLootItems.length === 0) return null;

  return (
    <div className="card p-6">
      <h3 className="text-lg font-bold mb-4">Top Loot Items by Value</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        <div className="grid grid-cols-5 gap-2 text-xs font-bold text-muted pb-2 border-b border-border">
          <div className="col-span-2">Item Name</div>
          <div className="text-right">Total Value</div>
          <div className="text-right">Drops</div>
          <div className="text-right">Avg/Drop</div>
        </div>
        {topLootItems.map((item) => (
          <div
            key={item.name}
            className="grid grid-cols-5 gap-2 text-sm py-1 hover:bg-surface-hover"
          >
            <div className="col-span-2 truncate" title={item.name}>
              {item.name}
            </div>
            <div className="text-right font-semibold text-green-400">
              {item.totalValue.toFixed(2)} PED
            </div>
            <div className="text-right text-muted">{item.drops}</div>
            <div className="text-right">{item.avgValue.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
