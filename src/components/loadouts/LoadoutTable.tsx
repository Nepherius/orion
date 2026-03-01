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
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-bold">Loadouts ({loadouts.length})</h2>
          <button onClick={onNewLoadout} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border">
              <tr className="text-left text-xs text-muted uppercase">
                <th className="p-4">Name / Weapon</th>
                <th className="p-4 text-right">Cost</th>
                <th className="p-4 text-right">DPP</th>
              </tr>
            </thead>
            <tbody>
              {loadouts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-muted">
                    No loadouts found. Create your first loadout!
                  </td>
                </tr>
              ) : (
                loadouts.map((loadout) => (
                  <tr
                    key={loadout.id}
                    onClick={() => onSelectLoadout(loadout.id)}
                    className={`border-b border-border hover:bg-surface cursor-pointer transition-colors ${
                      selectedLoadoutId === loadout.id ? 'bg-surface' : ''
                    }`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Circle
                          className={`w-2 h-2 ${
                            loadout.isPrimary
                              ? 'fill-green-400 text-green-400'
                              : 'fill-gray-600 text-gray-600'
                          }`}
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-body">{loadout.name}</span>
                            {loadout.isPrimary && (
                              <span className="px-2 py-0.5 text-[10px] uppercase font-semibold rounded bg-green-900 text-green-300">
                                PRIMARY
                              </span>
                            )}
                            {loadout.hotkey && (
                              <span className="px-2 py-0.5 text-[10px] uppercase font-semibold rounded bg-blue-900 text-blue-300">
                                CTRL+{loadout.hotkey}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-muted">
                            {loadout.weapon?.Name || 'No weapon'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-blue-400 font-mono">
                        {loadout.costPerShot.toFixed(4)}
                      </div>
                      <div className="text-xs text-gray-500">PED</div>
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
