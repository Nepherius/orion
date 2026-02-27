import { useState } from 'react';
import { useHuntStore } from '../../store';
import { Info, Search, ArrowUpDown, ExternalLink } from 'lucide-react';
import { ActiveSessionSidebar } from '../layout/ActiveSessionSidebar';

export function Loot() {
  const activeSession = useHuntStore((state) => state.getActiveSession());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'value' | 'qty' | 'name'>('value');

  if (!activeSession) {
    return (
      <div className="card p-8 text-center text-gray-400">
        <Info className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p>No active session. Start or resume a session to view loot.</p>
      </div>
    );
  }

  // Calculate session grade
  const returns = activeSession.stats.returns;
  const grade =
    returns >= 100 ? 'A' : returns >= 90 ? 'B' : returns >= 80 ? 'C' : returns >= 70 ? 'D' : 'F';
  const gradeColor =
    returns >= 100
      ? 'text-green-400'
      : returns >= 90
        ? 'text-blue-400'
        : returns >= 80
          ? 'text-yellow-400'
          : 'text-red-400';

  // Group loot items by name and sum quantities
  const lootMap = new Map<
    string,
    { name: string; quantity: number; value: number; markup: number; totalValue: number }
  >();
  activeSession.loot.forEach((item) => {
    const existing = lootMap.get(item.name);
    if (existing) {
      existing.quantity += item.quantity;
      existing.value += item.value * item.quantity;
      existing.totalValue += item.totalValue;
    } else {
      lootMap.set(item.name, {
        name: item.name,
        quantity: item.quantity,
        value: item.value * item.quantity,
        markup: item.markup,
        totalValue: item.totalValue,
      });
    }
  });

  const groupedLoot = Array.from(lootMap.values());

  // Filter and sort
  const filteredLoot = groupedLoot.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  filteredLoot.sort((a, b) => {
    switch (sortBy) {
      case 'value':
        return b.value - a.value;
      case 'qty':
        return b.quantity - a.quantity;
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  // Calculate stats
  const totalTTValue = activeSession.stats.totalLoot;
  const totalMarkup = filteredLoot.reduce((sum, item) => sum + (item.totalValue - item.value), 0);
  const avgMarkup =
    filteredLoot.length > 0
      ? filteredLoot.reduce((sum, item) => sum + item.markup, 0) / filteredLoot.length
      : 100;
  const uniqueItems = filteredLoot.length;
  const pedPerItem = uniqueItems > 0 ? totalTTValue / uniqueItems : 0;

  // Top items
  const topItems = [...filteredLoot].sort((a, b) => b.value - a.value).slice(0, 5);
  const topValueItem = topItems[0];

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Main Content */}
      <div className="col-span-9 space-y-6">
        {/* Header with Grade */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400 uppercase">Session Grade</div>
            <div className={`text-5xl font-bold ${gradeColor}`}>{grade}</div>
            <div className="text-sm text-gray-400">
              <div>Return {returns.toFixed(1)}%</div>
              <div>Cost {activeSession.stats.totalCost.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Value Composition */}
        <div className="card p-6">
          <div className="text-xs text-gray-400 uppercase mb-4">VALUE</div>
          <div className="flex items-center gap-2 mb-2">
            <div className="text-2xl font-bold">
              TT {totalTTValue.toFixed(2)} •{' '}
              <span className="text-green-400">{totalMarkup.toFixed(2)}</span>
            </div>
          </div>
          <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-blue-500"
              style={{
                width: `${totalTTValue > 0 ? (totalTTValue / (totalTTValue + totalMarkup)) * 100 : 50}%`,
              }}
            />
            <div
              className="absolute top-0 right-0 h-full bg-green-500"
              style={{
                width: `${totalTTValue > 0 ? (totalMarkup / (totalTTValue + totalMarkup)) * 100 : 50}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-blue-400">
              ● TT Value (
              {totalTTValue > 0
                ? ((totalTTValue / (totalTTValue + totalMarkup)) * 100).toFixed(1)
                : '50.0'}
              %)
            </span>
            <span className="text-green-400">
              ● Markup (
              {totalTTValue > 0
                ? ((totalMarkup / (totalTTValue + totalMarkup)) * 100).toFixed(1)
                : '50.0'}
              %)
            </span>
          </div>
        </div>

        {/* Composition */}
        <div className="card p-6">
          <div className="text-xs text-gray-400 uppercase mb-4">COMPOSITION</div>
          <div className="space-y-2">
            {topItems.slice(0, 2).map((item, idx) => {
              const percent = totalTTValue > 0 ? (item.value / totalTTValue) * 100 : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span>{item.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400">{item.quantity}</span>
                      <span className="text-gray-400">{item.markup}%</span>
                      <span className="font-medium">{item.value.toFixed(2)}</span>
                      <span className="text-gray-400">{percent.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="relative h-1 bg-gray-700 rounded-full overflow-hidden">
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

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold">{uniqueItems}</div>
            <div className="text-xs text-gray-400">Unlocks</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold">{avgMarkup.toFixed(1)}%</div>
            <div className="text-xs text-gray-400">Avg MU</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-green-400">+{totalMarkup.toFixed(2)}</div>
            <div className="text-xs text-gray-400">MU Gain</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold">{pedPerItem.toFixed(3)}</div>
            <div className="text-xs text-gray-400">PED/Item</div>
          </div>
        </div>

        {/* Item List */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="relative flex-1 mr-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input w-full pl-10"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'value' | 'qty' | 'name')}
                className="input"
              >
                <option value="value">⬇ Value</option>
                <option value="qty">⬇ Qty</option>
                <option value="name">⬇ Name</option>
              </select>
              <button className="btn-secondary flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Overlay
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-xs text-gray-400">
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
                  <th className="text-right py-2 px-3">Materials</th>
                  <th className="text-right py-2 px-3">TT</th>
                  <th className="text-right py-2 px-3">Share</th>
                  <th className="text-right py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredLoot.map((item, idx) => {
                  const share = totalTTValue > 0 ? (item.value / totalTTValue) * 100 : 0;
                  const isMaterial = item.name.includes('Oil') || item.name.includes('Shrapnel');
                  return (
                    <tr key={idx} className="border-b border-gray-800 hover:bg-gray-700">
                      <td className="py-2 px-3">
                        <div className="font-medium">{item.value.toFixed(2)}</div>
                        <div className="text-xs text-gray-400">{item.totalValue.toFixed(2)}</div>
                      </td>
                      <td className="py-2 px-3">{item.quantity}</td>
                      <td className="py-2 px-3 font-medium">{item.name}</td>
                      <td className="py-2 px-3 text-right">
                        {isMaterial && <span className="text-blue-400">Materials</span>}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {(item.value / item.quantity).toFixed(4)} PED
                      </td>
                      <td className="py-2 px-3 text-right">{share.toFixed(1)}%</td>
                      <td className="py-2 px-3 text-right">
                        <button className="text-blue-400 hover:text-blue-300">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Highlights */}
        {topValueItem && (
          <div className="card p-6">
            <div className="text-xs text-gray-400 uppercase mb-4">HIGHLIGHTS</div>
            <div className="flex items-center gap-4">
              <div className="text-lg">🏆</div>
              <div>
                <div className="text-sm text-gray-400">Top Value</div>
                <div className="font-bold">{topValueItem.name}</div>
                <div className="text-green-400">{topValueItem.value.toFixed(2)} PED</div>
              </div>
            </div>
          </div>
        )}

        {/* Top Items */}
        <div className="card p-6">
          <div className="text-xs text-gray-400 uppercase mb-4">TOP ITEMS</div>
          <div className="space-y-2">
            {topItems.map((item, idx) => {
              const share = totalTTValue > 0 ? (item.value / totalTTValue) * 100 : 0;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-gray-700 rounded"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 flex items-center justify-center bg-gray-600 rounded font-bold text-sm">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-gray-400">
                        {item.value.toFixed(2)} PED • {share.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{item.value.toFixed(2)} PED</div>
                    <div className="text-xs text-gray-400">{share.toFixed(1)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Session Sidebar */}
      <div className="col-span-3">
        <ActiveSessionSidebar />
      </div>
    </div>
  );
}
