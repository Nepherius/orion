import { AlertCircle } from 'lucide-react';
import { NewLoadoutModal } from '../loadouts/NewLoadoutModal';
import { LoadoutList } from '../loadouts/LoadoutList';
import { LoadoutTable } from '../loadouts/LoadoutTable';
import { LoadoutDetailsPanel } from '../loadouts/LoadoutDetailsPanel';
import { useLoadoutsModel } from '../../hooks/useLoadoutsModel';
import { usePageVisibility } from '../../hooks/usePageVisibility';
import { ConfirmModal } from '../common/ConfirmModal';

export function Loadouts() {
  const isPageVisible = usePageVisibility();
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

  if (!isPageVisible) {
    return (
      <div className="card p-8 text-center text-muted">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-60" />
        <p>Loadouts is paused while the app is in the background.</p>
      </div>
    );
  }

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
