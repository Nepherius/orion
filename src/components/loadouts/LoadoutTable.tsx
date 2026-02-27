import { Plus, Circle } from 'lucide-react';
import { Loadout } from '../../types';

interface LoadoutTableProps {
  loadouts: Loadout[];
  selectedLoadoutId: string | null;
  onSelectLoadout: (id: string) => void;
  onNewLoadout: () => void;
}

export function LoadoutTable({
  loadouts,
  selectedLoadoutId,
  onSelectLoadout,
  onNewLoadout,
}: LoadoutTableProps) {
  return (
    <div className="col-span-6">
      <div className="card">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Loadouts ({loadouts.length})</h2>
          <button onClick={onNewLoadout} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-700">
              <tr className="text-left text-xs text-gray-400 uppercase">
                <th className="p-4">Name / Weapon</th>
                <th className="p-4 text-right">Cost</th>
                <th className="p-4 text-right">DPP</th>
              </tr>
            </thead>
            <tbody>
              {loadouts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-400">
                    No loadouts found. Create your first loadout!
                  </td>
                </tr>
              ) : (
                loadouts.map((loadout) => (
                  <tr
                    key={loadout.id}
                    onClick={() => onSelectLoadout(loadout.id)}
                    className={`border-b border-gray-700 hover:bg-gray-700 cursor-pointer transition-colors ${
                      selectedLoadoutId === loadout.id ? 'bg-gray-700' : ''
                    }`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Circle
                          className={`w-2 h-2 ${
                            loadout.status === 'active'
                              ? 'fill-green-400 text-green-400'
                              : 'fill-gray-600 text-gray-600'
                          }`}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{loadout.name}</span>
                            {loadout.status === 'active' && (
                              <span className="px-2 py-0.5 text-[10px] uppercase font-semibold rounded bg-green-900 text-green-300">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-400">{loadout.weapon?.Name || 'No weapon'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-blue-400 font-mono">{loadout.costPerShot.toFixed(3)}</div>
                      <div className="text-xs text-gray-500">PEC</div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-green-400 font-mono">{loadout.dpp.toFixed(4)}</div>
                      <div className="text-xs text-gray-500">DPP</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
