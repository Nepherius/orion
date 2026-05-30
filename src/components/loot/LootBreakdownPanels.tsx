import { Award } from 'lucide-react';
import { MetricTile, Panel } from '../common/Panel';
import type { GroupedLootItem } from './lootTypes';

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
      <Panel
        title="Loot Value Distribution"
        tooltip="TT = Trade Terminal Value, MU = Markup, MV = Market Value"
      >
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
            {totalAdjustedValue > 0
              ? ((totalTTValue / totalAdjustedValue) * 100).toFixed(1)
              : '0.0'}
            %)
          </span>
          <span className="text-green-400">
            MU (
            {totalAdjustedValue > 0 ? ((totalMarkup / totalAdjustedValue) * 100).toFixed(1) : '0.0'}
            %)
          </span>
          <span className="text-violet-400">
            MV (
            {totalAdjustedValue > 0
              ? ((totalFixedValue / totalAdjustedValue) * 100).toFixed(1)
              : '0.0'}
            %)
          </span>
        </div>
      </Panel>

      <Panel title="Composition">
        <div className="space-y-2">
          {topItems.slice(0, 5).map((item, idx) => {
            const percent =
              totalAdjustedValue > 0 ? (item.totalValue / totalAdjustedValue) * 100 : 0;
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
      </Panel>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricTile label="Unlocks" value={uniqueItems} />
        <MetricTile label="Avg MU" value={`${avgMarkup.toFixed(1)}%`} />
        <MetricTile
          label="MU Gain"
          value={`+${totalMarkup.toFixed(2)}`}
          valueClassName="text-green-400"
        />
        <MetricTile
          label="MV Gain"
          value={`+${totalFixedValue.toFixed(2)}`}
          valueClassName="text-violet-400"
        />
        <MetricTile label="PED/Item" value={pedPerItem.toFixed(3)} />
      </div>

      {topValueItem && (
        <Panel title="Highlights">
          <div className="flex items-center gap-4">
            <Award className="h-5 w-5 text-yellow-400" />
            <div>
              <div className="text-sm text-muted">Top Value</div>
              <div className="font-bold">{topValueItem.name}</div>
              <div className="text-green-400">{topValueItem.totalValue.toFixed(2)} PED</div>
            </div>
          </div>
        </Panel>
      )}

      <Panel title="Top Items">
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
      </Panel>
    </>
  );
}
