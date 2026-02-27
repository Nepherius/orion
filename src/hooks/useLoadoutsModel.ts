import { useMemo, useState } from 'react';
import { useHuntStore } from '../store';
import { Loadout } from '../types';

export type StatusFilter = 'all' | 'active' | 'favorites';
export type SortOption = 'name-az' | 'name-za' | 'cost' | 'dpp';

export function useLoadoutsModel() {
  const loadouts = useHuntStore((state) => state.loadouts);
  const { deleteLoadout, duplicateLoadout, toggleLoadoutFavorite, setActiveLoadout } =
    useHuntStore();

  const [showNewModal, setShowNewModal] = useState(false);
  const [editLoadout, setEditLoadout] = useState<Loadout | null>(null);
  const [selectedLoadoutId, setSelectedLoadoutId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name-az');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const selectedLoadout = useMemo(
    () => loadouts.find((l) => l.id === selectedLoadoutId) || null,
    [loadouts, selectedLoadoutId]
  );

  const filteredLoadouts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    let filtered = loadouts.filter(
      (loadout) =>
        loadout.name.toLowerCase().includes(query) ||
        loadout.weapon?.Name.toLowerCase().includes(query)
    );

    if (statusFilter === 'active') {
      filtered = filtered.filter((l) => l.status === 'active');
    } else if (statusFilter === 'favorites') {
      filtered = filtered.filter((l) => l.favorite);
    }

    return [...filtered].sort((a, b) => {
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
  }, [loadouts, searchQuery, statusFilter, sortBy]);

  const activeCount = useMemo(
    () => loadouts.filter((l) => l.status === 'active').length,
    [loadouts]
  );
  const favoriteCount = useMemo(() => loadouts.filter((l) => l.favorite).length, [loadouts]);

  const handleEdit = (loadout: Loadout) => {
    setEditLoadout(loadout);
    setShowNewModal(true);
  };

  const handleNewLoadout = () => {
    setEditLoadout(null);
    setShowNewModal(true);
  };

  const requestDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteLoadout(deleteConfirmId);
      if (selectedLoadoutId === deleteConfirmId) {
        setSelectedLoadoutId(null);
      }
      setDeleteConfirmId(null);
    }
  };

  return {
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
    setActiveLoadout,
  };
}
