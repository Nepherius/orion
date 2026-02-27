import { useState } from 'react';
import { Search, X, Plus, Loader } from 'lucide-react';
import { useItemBrowser, EntropyItem } from '../../hooks/useItemBrowser';
import { ItemTemplate } from '../../types';

interface ItemBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: Omit<ItemTemplate, 'id'>) => void;
}

export function ItemBrowserModal({ isOpen, onClose, onAddItem }: ItemBrowserModalProps) {
  const { items, searchQuery, setSearchQuery, loading, error, getTTValue, getCategory } =
    useItemBrowser();
  const [selectedItem, setSelectedItem] = useState<EntropyItem | null>(null);
  const [defaultMarkup, setDefaultMarkup] = useState(100);

  if (!isOpen) return null;

  const handleAddItem = (item: EntropyItem) => {
    onAddItem({
      name: item.Name,
      category: getCategory(item),
      defaultTTValue: getTTValue(item),
      defaultMarkup,
      description: `Item ID: ${item.Id}, Type: ${item.Properties?.Type || 'Unknown'}`,
    });
    setSelectedItem(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full h-5/6 mx-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Browse Item Database</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-600 text-red-300 p-3 rounded mb-4 text-sm">
            Error loading items: {error}
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search items by name or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full pl-10"
            autoFocus
          />
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto mb-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>{searchQuery ? 'No items found matching your search' : 'No items available'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <button
                  key={item.Id}
                  onClick={() => setSelectedItem(item)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedItem?.Id === item.Id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-100'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{item.Name}</div>
                      <div className="text-xs text-gray-400">
                        Type: {item.Properties?.Type || 'Unknown'} | TT:{' '}
                        {getTTValue(item).toFixed(2)} PED
                      </div>
                    </div>
                    <div className="text-xs bg-gray-800 rounded px-2 py-1">{getCategory(item)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Item Details and Add Button */}
        {selectedItem && (
          <div className="border-t border-gray-700 pt-4 space-y-4">
            <div className="bg-gray-700 p-4 rounded">
              <h3 className="font-bold text-lg mb-2">{selectedItem.Name}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-300 mb-3">
                <div>
                  <span className="text-gray-400">ID:</span> {selectedItem.Id}
                </div>
                <div>
                  <span className="text-gray-400">Type:</span>{' '}
                  {selectedItem.Properties?.Type || 'Unknown'}
                </div>
                <div>
                  <span className="text-gray-400">TT Value:</span>{' '}
                  {getTTValue(selectedItem).toFixed(2)} PED
                </div>
                <div>
                  <span className="text-gray-400">Weight:</span>{' '}
                  {selectedItem.Properties?.Weight ?? 'N/A'} kg
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="label text-sm">Default Markup % *</label>
                  <input
                    type="number"
                    min="100"
                    step="1"
                    value={defaultMarkup}
                    onChange={(e) => setDefaultMarkup(Number(e.target.value))}
                    className="input w-full text-sm"
                  />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setSelectedItem(null)} className="btn-secondary flex-1">
                    Back
                  </button>
                  <button
                    onClick={() => handleAddItem(selectedItem)}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add as Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
