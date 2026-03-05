import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { ItemTemplate } from '../../types';
import { useItemDatabaseModel } from '../../hooks/useItemDatabaseModel';
import { ConfirmModal } from '../common/ConfirmModal';
import { useItemBrowser, EntropyItem } from '../../hooks/useItemBrowser';
import { useHuntStore } from '../../store';

export function ItemDatabase() {
  const {
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
  } = useItemDatabaseModel();

  const {
    items: entropyItems,
    getTTValue,
    getCategory,
    loading: _entropyLoading,
  } = useItemBrowser();
  const [entropyMarkups, setEntropyMarkups] = useState<{ [key: number]: number }>({});

  // Get ignore list from store
  const ignoreList = useHuntStore((state) => state.settings.ignoreListItems || []);
  const addToIgnoreList = useHuntStore((state) => state.addToIgnoreList);
  const removeFromIgnoreList = useHuntStore((state) => state.removeFromIgnoreList);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  // Filter Entropia items based on search
  const filteredEntropyItems = searchQuery
    ? entropyItems
        .filter(
          (item) =>
            item.Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.Properties?.Type?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 10) // Limit to 10 results
    : [];

  const handleSaveCustom = (item: EntropyItem) => {
    const markupValue = entropyMarkups[item.Id] || 100;
    handleAddSave({
      name: item.Name,
      category: getCategory(item),
      defaultTTValue: getTTValue(item),
      defaultMarkup: markupValue,
    });
    // Clear the markup after saving
    setEntropyMarkups((prev) => {
      const newMarkups = { ...prev };
      delete newMarkups[item.Id];
      return newMarkups;
    });
  };

  return (
    <div className="space-y-6">
      <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Add Item Template
      </button>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Search local items or Entropia database..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="input w-full pl-10 pr-10"
        />
        {searchQuery && (
          <button
            onClick={() => handleSearchChange('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-400 hover:text-red-300 transition-colors"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Local Items Table */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Your Items</h3>
        {filteredItems.length === 0 && !searchQuery ? (
          <p className="text-center text-muted py-8">
            No items in database. Add item templates to quickly add loot with default values.
          </p>
        ) : filteredItems.length === 0 ? (
          <p className="text-center text-muted py-4 text-sm">No matching items</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3">Item Name</th>
                  <th className="text-left py-2 px-3">Category</th>
                  <th className="text-right py-2 px-3">Default TT Value</th>
                  <th className="text-right py-2 px-3">Default Markup</th>
                  <th className="text-right py-2 px-3">Fixed Value</th>
                  <th className="text-right py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-800 hover:bg-surface">
                    <td className="py-2 px-3 font-medium">{item.name}</td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-1 text-xs rounded bg-gray-600">{item.category}</span>
                    </td>
                    <td className="py-2 px-3 text-right">{item.defaultTTValue.toFixed(2)} PED</td>
                    <td className="py-2 px-3 text-right">{item.defaultMarkup}%</td>
                    <td className="py-2 px-3 text-right">
                      {item.defaultFixedValue && item.defaultFixedValue > 0
                        ? `${item.defaultFixedValue.toFixed(2)} PED`
                        : '-'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingItem(item)}
                          className="text-primary-400 hover:text-primary-300"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => requestDelete(item.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Entropia Database Results */}
      {searchQuery && filteredEntropyItems.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Entropia Database</h3>
          <div className="space-y-2">
            {filteredEntropyItems.map((item) => (
              <div
                key={item.Id}
                className="border border-border rounded p-4 bg-surface hover:bg-surface transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.Name}</h4>
                    <p className="text-xs text-muted mt-1">
                      Type: {item.Properties?.Type || 'Unknown'} • TT: {getTTValue(item).toFixed(2)}{' '}
                      PED
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-muted">Markup %:</label>
                      <input
                        type="number"
                        min="100"
                        step="1"
                        value={entropyMarkups[item.Id] || 100}
                        onChange={(e) =>
                          setEntropyMarkups((prev) => ({
                            ...prev,
                            [item.Id]: Number(e.target.value),
                          }))
                        }
                        className="input w-16 text-sm"
                      />
                    </div>
                    <button onClick={() => handleSaveCustom(item)} className="btn-primary text-sm">
                      Save Custom
                    </button>
                    <button
                      onClick={() => addToIgnoreList(item.Name)}
                      className="btn-secondary text-sm"
                      title="Add this item to ignore list"
                    >
                      Ignore
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ignore List */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Ignore List</h3>
        <p className="text-sm text-muted mb-4">
          Items in this list will be skipped by ChatLogMonitor
        </p>
        <div className="space-y-3">
          {ignoreList.length > 0 ? (
            <div className="border border-border rounded p-3 bg-surface">
              <div className="flex flex-wrap gap-2">
                {ignoreList.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 bg-surface px-3 py-1 rounded text-sm"
                  >
                    <span>{item}</span>
                    <button
                      onClick={() => removeFromIgnoreList(item)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-muted py-4 text-sm">No items in ignore list</p>
          )}
        </div>
      </div>

      {showAddModal && <ItemModal onClose={() => setShowAddModal(false)} onSave={handleAddSave} />}

      {editingItem && (
        <ItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(data) => handleEditSave(editingItem.id, data)}
        />
      )}

      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        variant="danger"
        title="Delete Item?"
        message="Are you sure you want to delete this item template?"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}

interface ItemModalProps {
  item?: ItemTemplate;
  onClose: () => void;
  onSave: (data: Omit<ItemTemplate, 'id'>) => void;
}

function ItemModal({ item, onClose, onSave }: ItemModalProps) {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    category: item?.category || ('loot' as const),
    defaultTTValue: item?.defaultTTValue || 0,
    defaultMarkup: item?.defaultMarkup || 100,
    defaultFixedValue: item?.defaultFixedValue || 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{item ? 'Edit' : 'Add'} Item Template</h2>
          <button onClick={onClose} className="text-muted hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Item Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Animal Oil Residue"
              className="input w-full"
            />
          </div>

          <div>
            <label className="label">Category *</label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value as 'loot' | 'weapon' | 'armor' | 'tool' | 'other',
                })
              }
              className="input w-full"
            >
              <option value="loot">Loot</option>
              <option value="weapon">Weapon</option>
              <option value="armor">Armor</option>
              <option value="tool">Tool</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="label">Default TT Value *</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.defaultTTValue}
              onChange={(e) => setFormData({ ...formData, defaultTTValue: Number(e.target.value) })}
              placeholder="0.00"
              className="input w-full"
            />
          </div>

          <div>
            <label className="label">Default Markup % *</label>
            <input
              type="number"
              required
              min="100"
              step="1"
              value={formData.defaultMarkup}
              onChange={(e) => setFormData({ ...formData, defaultMarkup: Number(e.target.value) })}
              disabled={formData.defaultFixedValue > 0}
              className="input w-full"
            />
          </div>

          <div>
            <label className="label">Default Fixed Value (PED)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.defaultFixedValue}
              onChange={(e) =>
                setFormData({ ...formData, defaultFixedValue: Number(e.target.value) })
              }
              placeholder="0.00"
              className="input w-full"
            />
            <p className="text-xs text-muted mt-1">
              When set above 0, MU is ignored for this item template.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" className="btn-primary flex-1">
              {item ? 'Update' : 'Add'} Item
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
