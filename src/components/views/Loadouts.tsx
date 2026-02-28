import { NewLoadoutModal } from '../loadouts/NewLoadoutModal';
import { LoadoutList } from '../loadouts/LoadoutList';
import { LoadoutTable } from '../loadouts/LoadoutTable';
import { LoadoutDetailsPanel } from '../loadouts/LoadoutDetailsPanel';
import { useLoadoutsModel } from '../../hooks/useLoadoutsModel';
import { ConfirmModal } from '../common/ConfirmModal';

export function Loadouts() {
  const {
    loadouts,
    filteredLoadouts,
    selectedLoadout,
    selectedLoadoutId,
    setSelectedLoadoutId,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    activeCount,
    favoriteCount,
    showNewModal,
    setShowNewModal,
    editLoadout,
    setEditLoadout,
    handleEdit,
    handleNewLoadout,
    requestDelete,
    confirmDelete,
    deleteConfirmId,
    setDeleteConfirmId,
    duplicateLoadout,
    toggleLoadoutFavorite,
    setPrimaryLoadout,
  } = useLoadoutsModel();

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
        onSetPrimary={setPrimaryLoadout}
        onEdit={handleEdit}
        onDuplicate={duplicateLoadout}
        onDelete={requestDelete}
        onToggleFavorite={toggleLoadoutFavorite}
      />

      {showNewModal && (
        <NewLoadoutModal
          onClose={() => {
            setShowNewModal(false);
            setEditLoadout(null);
          }}
          editLoadout={editLoadout || undefined}
        />
      )}

      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        variant="danger"
        title="Delete Loadout?"
        message="Are you sure you want to delete this loadout?"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}
