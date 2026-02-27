import { useMemo, useState } from 'react';
import { useHuntStore } from '../store';
import { ItemTemplate } from '../types';

export function useItemDatabaseModel() {
  const { itemDatabase, addItemTemplate, updateItemTemplate, deleteItemTemplate } = useHuntStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemTemplate | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return itemDatabase.filter(
      (item) =>
        item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query)
    );
  }, [itemDatabase, searchQuery]);

  const requestDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteItemTemplate(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleAddSave = (data: Omit<ItemTemplate, 'id'>) => {
    addItemTemplate(data);
    setShowAddModal(false);
  };

  const handleEditSave = (id: string, data: Omit<ItemTemplate, 'id'>) => {
    updateItemTemplate(id, data);
    setEditingItem(null);
  };

  return {
    searchQuery,
    setSearchQuery,
    showAddModal,
    setShowAddModal,
    editingItem,
    setEditingItem,
    filteredItems,
    requestDelete,
    confirmDelete,
    deleteConfirmId,
    setDeleteConfirmId,
    handleAddSave,
    handleEditSave,
  };
}
