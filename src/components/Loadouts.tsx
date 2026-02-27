import { useState } from 'react';
import { useHuntStore } from '../store';
import { Plus, Search, Circle, Star, Edit, Copy, Trash2 } from 'lucide-react';
import { NewLoadoutModal } from './NewLoadoutModal';
import { Loadout } from '../types';

type StatusFilter = 'all' | 'active' | 'favorites';
type SortOption = 'name-az' | 'name-za' | 'cost' | 'dpp';

export function Loadouts() {
  const loadouts = useHuntStore((state) => state.loadouts);
  const { deleteLoadout, duplicateLoadout, toggleLoadoutFavorite, setActiveLoadout } = useHuntStore();
  
  const [showNewModal, setShowNewModal] = useState(false);
  const [editLoadout, setEditLoadout] = useState<Loadout | null>(null);
  const [selectedLoadoutId, setSelectedLoadoutId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name-az');

  const selectedLoadout = loadouts.find((l) => l.id === selectedLoadoutId);

  // Filter loadouts
  let filteredLoadouts = loadouts.filter(
    (loadout) =>
      loadout.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loadout.weapon?.Name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (statusFilter === 'active') {
    filteredLoadouts = filteredLoadouts.filter((l) => l.status === 'active');
  } else if (statusFilter === 'favorites') {
    filteredLoadouts = filteredLoadouts.filter((l) => l.favorite);
  }

  // Sort loadouts
  filteredLoadouts = [...filteredLoadouts].sort((a, b) => {
    switch (sortBy) {
      case 'name-az':
        return a.name.localeCompare(b.name);
      case 'name-za':
        return b.name.localeCompare(a.name);
      case 'cost':
        return a.costPerShot - b.costPerShot;
      case 'dpp':
        return b.dpp - a.dpp;
      default:
        return 0;
    }
  });

  const activeCount = loadouts.filter((l) => l.status === 'active').length;
  const favoriteCount = loadouts.filter((l) => l.favorite).length;

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this loadout?')) {
      deleteLoadout(id);
      if (selectedLoadoutId === id) {
        setSelectedLoadoutId(null);
      }
    }
  };

  const handleEdit = (loadout: Loadout) => {
    setEditLoadout(loadout);
    setShowNewModal(true);
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left Sidebar - Loadout List */}
      <div className="col-span-3 bg-gray-800 rounded-lg p-4 flex flex-col" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search loadouts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full pl-10"
          />
        </div>

        {/* Filters */}
        <div className="mb-4">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Filters</div>
          <div className="space-y-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`w-full flex items-center justify-between p-2 rounded text-sm transition-colors ${
                statusFilter === 'all'
                  ? 'bg-primary-900 text-primary-300'
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Circle className="w-4 h-4" />
                <span>All Loadouts</span>
              </div>
              <span className="text-gray-500">{loadouts.length}</span>
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`w-full flex items-center justify-between p-2 rounded text-sm transition-colors ${
                statusFilter === 'active'
                  ? 'bg-primary-900 text-primary-300'
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Circle className="w-4 h-4 fill-green-400 text-green-400" />
                <span>Active</span>
              </div>
              <span className="text-gray-500">{activeCount}</span>
            </button>
            <button
              onClick={() => setStatusFilter('favorites')}
              className={`w-full flex items-center justify-between p-2 rounded text-sm transition-colors ${
                statusFilter === 'favorites'
                  ? 'bg-primary-900 text-primary-300'
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>Favorites</span>
              </div>
              <span className="text-gray-500">{favoriteCount}</span>
            </button>
          </div>
        </div>

        {/* Sort By */}
        <div className="mb-4">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Sort By</div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="input w-full text-sm"
          >
            <option value="name-az">Name A-Z</option>
            <option value="name-za">Name Z-A</option>
            <option value="cost">Lowest Cost</option>
            <option value="dpp">Highest DPP</option>
          </select>
        </div>

      </div>

      {/* Main Content - Loadout List Table */}
      <div className="col-span-6">
        <div className="card">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="text-xl font-bold">Loadouts ({filteredLoadouts.length})</h2>
            <button
              onClick={() => {
                setEditLoadout(null);
                setShowNewModal(true);
              }}
              className="btn-primary flex items-center gap-2"
            >
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
                {filteredLoadouts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-gray-400">
                      No loadouts found. Create your first loadout!
                    </td>
                  </tr>
                ) : (
                  filteredLoadouts.map((loadout) => (
                    <tr
                      key={loadout.id}
                      onClick={() => setSelectedLoadoutId(loadout.id)}
                      className={`border-b border-gray-700 hover:bg-gray-700 cursor-pointer transition-colors ${
                        selectedLoadoutId === loadout.id ? 'bg-gray-700' : ''
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Circle className={`w-2 h-2 ${loadout.status === 'active' ? 'fill-green-400 text-green-400' : 'fill-gray-600 text-gray-600'}`} />
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

      {/* Right Sidebar - Loadout Details */}
      <div className="col-span-3">
        {selectedLoadout ? (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-xl font-bold mb-1">{selectedLoadout.name}</h3>
              <div className="flex items-center gap-2 text-xs">
                {selectedLoadout.status === 'active' && (
                  <span className="px-2 py-1 rounded bg-green-900 text-green-300 uppercase font-semibold">
                    ACTIVE
                  </span>
                )}
                {selectedLoadout.favorite && (
                  <button
                    onClick={() => toggleLoadoutFavorite(selectedLoadout.id)}
                    className="p-1"
                  >
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  </button>
                )}
                {!selectedLoadout.favorite && (
                  <button
                    onClick={() => toggleLoadoutFavorite(selectedLoadout.id)}
                    className="p-1 text-gray-500 hover:text-yellow-400"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-b border-gray-700 space-y-2">
              {selectedLoadout.status === 'inactive' && (
                <button
                  onClick={() => setActiveLoadout(selectedLoadout.id)}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <Circle className="w-4 h-4 fill-green-400 text-green-400" />
                  Set Active
                </button>
              )}
              {selectedLoadout.status === 'active' && (
                <div className="w-full p-3 bg-green-900 text-green-300 rounded text-center text-sm font-semibold">
                  Currently Active
                </div>
              )}
              <button
                onClick={() => handleEdit(selectedLoadout)}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => duplicateLoadout(selectedLoadout.id)}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Duplicate
              </button>
              <button
                onClick={() => handleDelete(selectedLoadout.id)}
                className="btn-danger w-full flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>

            {/* Stats */}
            <div className="p-4 space-y-4 max-h-[calc(100vh-450px)] overflow-y-auto">
              {/* Cost/Shot & DPP */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-700 rounded p-3 text-center">
                  <div className="text-xs text-gray-400 uppercase mb-1">Cost/Shot</div>
                  <div className="text-xl font-bold text-blue-400">{selectedLoadout.costPerShot.toFixed(3)} <span className="text-xs">PEC</span></div>
                </div>
                <div className="bg-gray-700 rounded p-3 text-center">
                  <div className="text-xs text-gray-400 uppercase mb-1">DPP</div>
                  <div className="text-xl font-bold text-green-400">{selectedLoadout.dpp.toFixed(4)}</div>
                </div>
              </div>

              {/* Offense */}
              <div>
                <div className="text-xs font-bold text-blue-400 uppercase mb-2">Offense</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400">Total Damage</span><span>{selectedLoadout.totalDamage.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Range</span><span>{selectedLoadout.range.toFixed(1)}m</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Critical Chance</span><span>{selectedLoadout.criticalChance.toFixed(1)}%</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Hit Rate</span><span className="text-green-400">{selectedLoadout.hitRate.toFixed(1)}%</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Effective Damage</span><span>{selectedLoadout.effectiveDamage.toFixed(2)}</span></div>
                </div>
              </div>

              {/* Economy */}
              <div>
                <div className="text-xs font-bold text-blue-400 uppercase mb-2">Economy</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400">Efficiency</span><span>{selectedLoadout.efficiency.toFixed(1)}%</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Decay</span><span>{selectedLoadout.decay.toFixed(4)} PEC</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Ammo Burn</span><span>{selectedLoadout.ammoBurn}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Total Uses</span><span>{selectedLoadout.totalUses || 'N/A'}</span></div>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div>
                <div className="text-xs font-bold text-blue-400 uppercase mb-2">Cost Breakdown</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-400">Weapon</span><span>{(selectedLoadout.weapon?.Properties?.Economy?.Decay || 0).toFixed(4)} PEC</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Amplifier</span><span>{(selectedLoadout.amplifier?.Properties?.Economy?.Decay || 0).toFixed(4)} PEC</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Scope</span><span>{(selectedLoadout.scope?.Properties?.Economy?.Decay || 0).toFixed(4)} PEC</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Sight</span><span>{(selectedLoadout.sight?.Properties?.Economy?.Decay || 0).toFixed(4)} PEC</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Sight 2</span><span>{(selectedLoadout.sight2?.Properties?.Economy?.Decay || 0).toFixed(4)} PEC</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Absorber</span><span>0.0000 PEC</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Enhancers</span><span>0.0000 PEC</span></div>
                  <div className="flex justify-between border-t border-gray-600 pt-1 mt-1 font-bold"><span>Total/Shot</span><span className="text-blue-400">{selectedLoadout.costPerShot.toFixed(4)} PEC</span></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card p-8 text-center text-gray-400">
            <Circle className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Select a loadout to view details</p>
          </div>
        )}
      </div>

      {showNewModal && (
        <NewLoadoutModal
          onClose={() => {
            setShowNewModal(false);
            setEditLoadout(null);
          }}
          editLoadout={editLoadout}
        />
      )}
    </div>
  );
}
