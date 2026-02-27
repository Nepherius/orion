import { useState } from 'react';
import { useHuntStore } from '../../store';
import { Plus, Search, Edit2, Trash2, X } from 'lucide-react';
import { ItemTemplate } from '../../types';

export function ItemDatabase() {
  const { itemDatabase, addItemTemplate, updateItemTemplate, deleteItemTemplate } = useHuntStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemTemplate | null>(null);

  const filteredItems = itemDatabase.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      deleteItemTemplate(id);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Item Database</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Item Template
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input w-full pl-10"
        />
      </div>

      {/* Items Table */}
      {filteredItems.length === 0 ? (
        <p className="text-center text-gray-400 py-8">
          {searchQuery
            ? 'No items found'
            : 'No items in database. Add item templates to quickly add loot with default values.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-3">Item Name</th>
                <th className="text-left py-2 px-3">Category</th>
                <th className="text-right py-2 px-3">Default TT Value</th>
                <th className="text-right py-2 px-3">Default Markup</th>
                <th className="text-left py-2 px-3">Description</th>
                <th className="text-right py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-b border-gray-800 hover:bg-gray-700">
                  <td className="py-2 px-3 font-medium">{item.name}</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-1 text-xs rounded bg-gray-600">{item.category}</span>
                  </td>
                  <td className="py-2 px-3 text-right">{item.defaultTTValue.toFixed(2)} PED</td>
                  <td className="py-2 px-3 text-right">{item.defaultMarkup}%</td>
                  <td className="py-2 px-3 text-sm text-gray-400">{item.description || '-'}</td>
                  <td className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="text-primary-400 hover:text-primary-300"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
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

      {showAddModal && (
        <ItemModal
          onClose={() => setShowAddModal(false)}
          onSave={(data) => {
            addItemTemplate(data);
            setShowAddModal(false);
          }}
        />
      )}

      {editingItem && (
        <ItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(data) => {
            updateItemTemplate(editingItem.id, data);
            setEditingItem(null);
          }}
        />
      )}
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
    defaultMarkup: item?.defaultMarkup || 105,
    description: item?.description || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{item ? 'Edit' : 'Add'} Item Template</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
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
              className="input w-full"
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description..."
              className="input w-full h-20 resize-none"
            />
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
