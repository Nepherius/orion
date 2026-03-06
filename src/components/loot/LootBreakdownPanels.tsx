import type { GroupedLootItem } from './lootTypes';
import { InfoTooltip } from '../common/InfoTooltip';

interface LootBreakdownPanelsProps {
  totalAdjustedValue: number;
  totalTTValue: number;
  totalMarkup: number;
  totalFixedValue: number;
  topItems: GroupedLootItem[];
  uniqueItems: number;
  avgMarkup: number;
  pedPerItem: number;
}

export function LootBreakdownPanels({
  totalAdjustedValue,
  totalTTValue,
  totalMarkup,
  totalFixedValue,
  topItems,
  uniqueItems,
  avgMarkup,
  pedPerItem,
}: LootBreakdownPanelsProps) {
  const topValueItem = topItems[0];

  return (
    <>
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="text-2xl font-bold">Loot Value Distribution</div>
          <InfoTooltip tooltip="TT = Trade Terminal Value, MU = Markup, MV = Market Value" />
        </div>
        <div className="relative h-2 bg-surface rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-blue-500"
            style={{
              width: `${totalAdjustedValue > 0 ? (totalTTValue / totalAdjustedValue) * 100 : 0}%`,
            }}
          />
          <div
            className="absolute top-0 h-full bg-green-500"
            style={{
              left: `${totalAdjustedValue > 0 ? (totalTTValue / totalAdjustedValue) * 100 : 0}%`,
              width: `${totalAdjustedValue > 0 ? (totalMarkup / totalAdjustedValue) * 100 : 0}%`,
            }}
          />
          <div
            className="absolute top-0 h-full bg-violet-500"
            style={{
              left: `${
                totalAdjustedValue > 0
                  ? ((totalTTValue + totalMarkup) / totalAdjustedValue) * 100
                  : 0
              }%`,
              width: `${totalAdjustedValue > 0 ? (totalFixedValue / totalAdjustedValue) * 100 : 0}%`,
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="text-blue-400">
            TT Value (
            {totalAdjustedValue > 0 ? ((totalTTValue / totalAdjustedValue) * 100).toFixed(1) : '0.0'}
            %)
          </span>
          <span className="text-green-400">
            MU (
            {totalAdjustedValue > 0 ? ((totalMarkup / totalAdjustedValue) * 100).toFixed(1) : '0.0'}
            %)
          </span>
          <span className="text-violet-400">
            MV (
            {totalAdjustedValue > 0 ? ((totalFixedValue / totalAdjustedValue) * 100).toFixed(1) : '0.0'}
            %)
          </span>
        </div>
      </div>

      <div className="card p-6">
        <div className="text-xs text-muted uppercase mb-4">COMPOSITION</div>
        <div className="space-y-2">
          {topItems.slice(0, 5).map((item, idx) => {
            const percent = totalAdjustedValue > 0 ? (item.totalValue / totalAdjustedValue) * 100 : 0;
            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span>{item.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-muted">{item.quantity}</span>
                    <span className="text-muted">{item.markup}%</span>
                    <span className="font-medium">{item.totalValue.toFixed(2)}</span>
                    <span className="text-muted">{percent.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="relative h-1 bg-surface rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-yellow-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold">{uniqueItems}</div>
          <div className="text-xs text-muted">Unlocks</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold">{avgMarkup.toFixed(1)}%</div>
          <div className="text-xs text-muted">Avg MU</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-green-400">+{totalMarkup.toFixed(2)}</div>
          <div className="text-xs text-muted">MU Gain</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-violet-400">+{totalFixedValue.toFixed(2)}</div>
          <div className="text-xs text-muted">MV Gain</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold">{pedPerItem.toFixed(3)}</div>
          <div className="text-xs text-muted">PED/Item</div>
        </div>
      </div>

      {topValueItem && (
        <div className="card p-6">
          <div className="text-xs text-muted uppercase mb-4">HIGHLIGHTS</div>
          <div className="flex items-center gap-4">
            <div className="text-lg">🏆</div>
            <div>
              <div className="text-sm text-muted">Top Value</div>
              <div className="font-bold">{topValueItem.name}</div>
              <div className="text-green-400">{topValueItem.totalValue.toFixed(2)} PED</div>
            </div>
          </div>
        </div>
      )}

      <div className="card p-6">
        <div className="text-xs text-muted uppercase mb-4">TOP ITEMS</div>
        <div className="space-y-2">
          {topItems.map((item, idx) => {
            const share = totalAdjustedValue > 0 ? (item.totalValue / totalAdjustedValue) * 100 : 0;
            return (
              <div key={idx} className="flex items-center justify-between p-2 bg-surface rounded">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center bg-gray-600 rounded font-bold text-sm">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-muted">
                      {item.totalValue.toFixed(2)} PED • {share.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{item.value.toFixed(2)} PED</div>
                  <div className="text-xs text-muted">{share.toFixed(1)}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
