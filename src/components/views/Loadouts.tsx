import { useState } from 'react';
import { useHuntStore } from '../../store';
import { NewLoadoutModal } from '../loadouts/NewLoadoutModal';
import { LoadoutList } from '../loadouts/LoadoutList';
import { LoadoutTable } from '../loadouts/LoadoutTable';
import { LoadoutDetailsPanel } from '../loadouts/LoadoutDetailsPanel';
import { Loadout } from '../../types';

type StatusFilter = 'all' | 'active' | 'favorites';
type SortOption = 'name-az' | 'name-za' | 'cost' | 'dpp';

export function Loadouts() {
  const loadouts = useHuntStore((state) => state.loadouts);
  const {
    deleteLoadout,
    duplicateLoadout,
    toggleLoadoutFavorite,
    setActiveLoadout,
  } = useHuntStore();

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

  const handleEdit = (loadout: Loadout) => {
    setEditLoadout(loadout);
    setShowNewModal(true);
  };

  const handleNewLoadout = () => {
    setEditLoadout(null);
    setShowNewModal(true);
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      <LoadoutList
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
        activeCount={activeCount}
        favoriteCount={favoriteCount}
        totalCount={loadouts.length}
      />

      <LoadoutTable
        loadouts={filteredLoadouts}
        selectedLoadoutId={selectedLoadoutId}
        onSelectLoadout={setSelectedLoadoutId}
        onNewLoadout={handleNewLoadout}
      />

      <LoadoutDetailsPanel
        loadout={selectedLoadout || null}
        onSetActive={setActiveLoadout}
        onEdit={handleEdit}
        onDuplicate={duplicateLoadout}
        onDelete={(id) => {
          deleteLoadout(id);
          if (selectedLoadoutId === id) {
            setSelectedLoadoutId(null);
          }
        }}
        onToggleFavorite={toggleLoadoutFavorite}
      />

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


