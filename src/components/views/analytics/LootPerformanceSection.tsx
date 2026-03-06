import { format } from 'date-fns';
import { InfoTooltip } from '../../common/InfoTooltip';

interface TopLootItem {
  name: string;
  totalValue: number;
  quantity: number;
  drops: number;
  avgValue: number;
}

interface GlobalEntry {
  id: string;
  creature: string;
  value: number;
  isHoF: boolean;
  sessionName: string;
  location?: string;
  timestamp: number;
}

interface LootPerformanceSectionProps {
  avgLootValue: number;
  overallLootStdDev: number;
  largestDropValue: number;
  avgMinutesPerLoot: number;
  totalLootEvents: number;
  totalGlobalsCount: number;
  totalHoFsCount: number;
  globalDropRatePerKill: number;
  globalDropRatePerHour: number;
  avgGlobalValue: number;
  bestGlobalValue: number;
  topLootItems: TopLootItem[];
  allGlobals: GlobalEntry[];
}

export function LootPerformanceSection({
  avgLootValue,
  overallLootStdDev,
  largestDropValue,
  avgMinutesPerLoot,
  totalLootEvents,
  totalGlobalsCount,
  totalHoFsCount,
  globalDropRatePerKill,
  globalDropRatePerHour,
  avgGlobalValue,
  bestGlobalValue,
  topLootItems,
  allGlobals,
}: LootPerformanceSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Loot Performance</h2>
        <span className="text-sm text-muted">Value quality, globals, and item distribution</span>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-bold">Loot Quality & Consistency</h3>
          <InfoTooltip tooltip="Analyzes loot value distribution and drop frequency" />
        </div>
        <div className="grid grid-cols-5 gap-4">
          <div className="border border-border rounded p-4">
            <div className="text-sm text-muted mb-2">Average Drop Value</div>
            <div className="text-2xl font-bold text-green-400">{avgLootValue.toFixed(2)} PED</div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Loot Consistency (Std Dev)
              <InfoTooltip tooltip="Std dev of all filtered loot values; lower means more consistent drops" />
            </div>
            <div className="text-2xl font-bold text-blue-400">{overallLootStdDev.toFixed(1)}</div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="text-sm text-muted mb-2">Largest Drop</div>
            <div className="text-2xl font-bold text-yellow-400">
              {largestDropValue.toFixed(2)} PED
            </div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Minutes Per Loot
              <InfoTooltip tooltip="Average time between loot drops" />
            </div>
            <div className="text-2xl font-bold text-body">{avgMinutesPerLoot.toFixed(1)}</div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="text-sm text-muted mb-2">Total Loot Events</div>
            <div className="text-2xl font-bold text-purple-400">{totalLootEvents}</div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-bold">Global & Hall of Fame Analysis</h3>
          <InfoTooltip tooltip="Tracks global drop rates and HoF occurrences" />
        </div>
        <div className="grid grid-cols-6 gap-4">
          <div className="border border-border rounded p-4">
            <div className="text-sm text-muted mb-2">Total Globals</div>
            <div className="text-2xl font-bold text-yellow-400">{totalGlobalsCount}</div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="text-sm text-muted mb-2">Total HoFs</div>
            <div className="text-2xl font-bold text-purple-400">{totalHoFsCount}</div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Global/Kill
              <InfoTooltip tooltip="Number of globals per kill" />
            </div>
            <div className="text-2xl font-bold text-body">{globalDropRatePerKill.toFixed(2)}</div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="flex items-center gap-1 text-sm text-muted mb-2">
              Global/Hour
              <InfoTooltip tooltip="Globals per hour of hunting" />
            </div>
            <div className="text-2xl font-bold text-body">{globalDropRatePerHour.toFixed(2)}</div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="text-sm text-muted mb-2">Avg Global Value</div>
            <div className="text-2xl font-bold text-green-400">{avgGlobalValue.toFixed(2)} PED</div>
          </div>
          <div className="border border-border rounded p-4">
            <div className="text-sm text-muted mb-2">Best Global</div>
            <div className="text-2xl font-bold text-green-400">
              {bestGlobalValue.toFixed(2)} PED
            </div>
          </div>
        </div>
      </div>

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

      {allGlobals.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">
            Top Globals {allGlobals.some((g) => g.isHoF) && '& Hall of Fame'}
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-5 gap-2 text-xs font-bold text-muted pb-2 border-b border-border sticky top-0 bg-surface">
              <div>Creature</div>
              <div className="text-right">Value</div>
              <div>Session</div>
              <div>Location</div>
              <div className="text-right">Date</div>
            </div>
            {allGlobals.map((global) => (
              <div
                key={global.id}
                className={`grid grid-cols-5 gap-2 text-sm py-2 hover:bg-surface-hover ${global.isHoF ? 'bg-purple-900/20' : ''}`}
              >
                <div className="font-semibold text-yellow-400 flex items-center gap-1">
                  {global.isHoF && <span className="text-purple-400">★</span>}
                  {global.creature}
                </div>
                <div className="text-right font-bold text-green-400">
                  {global.value.toFixed(2)} PED
                </div>
                <div className="truncate text-muted" title={global.sessionName}>
                  {global.sessionName}
                </div>
                <div className="truncate text-muted" title={global.location || 'Unknown'}>
                  {global.location || 'Unknown'}
                </div>
                <div className="text-right text-muted">{format(global.timestamp, 'MM/dd/yy')}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
