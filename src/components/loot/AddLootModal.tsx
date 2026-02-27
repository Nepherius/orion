import { useState, useEffect } from 'react';
import { useHuntStore } from '../../store';
import { X } from 'lucide-react';

interface AddLootModalProps {
  sessionId: string;
  onClose: () => void;
}

export function AddLootModal({ sessionId, onClose }: AddLootModalProps) {
  const addLoot = useHuntStore((state) => state.addLoot);
  const settings = useHuntStore((state) => state.settings);
  const itemDatabase = useHuntStore((state) => state.itemDatabase);
  const [formData, setFormData] = useState({
    name: '',
    quantity: 1,
    value: 0,
    markup: settings.defaultMarkup,
  });

  // Auto-fill TT value and markup when item name matches database
  useEffect(() => {
    if (formData.name.trim()) {
      const matchedItem = itemDatabase.find(
        (item) => item.name.toLowerCase() === formData.name.toLowerCase()
      );
      if (matchedItem) {
        setFormData((prev) => ({
          ...prev,
          value: matchedItem.defaultTTValue,
          markup: matchedItem.defaultMarkup,
        }));
      }
    }
  }, [formData.name, itemDatabase]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalValue = formData.value * (formData.markup / 100) * formData.quantity;
    addLoot(sessionId, { ...formData, totalValue });
    onClose();
  };

  const totalValue = formData.value * (formData.markup / 100) * formData.quantity;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Add Loot</h2>
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
            <label className="label">Quantity *</label>
            <input
              type="number"
              required
              min="1"
              step="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
              className="input w-full"
            />
          </div>

          <div>
            <label className="label">TT Value (per item) *</label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
              placeholder="0.00"
              className="input w-full"
            />
          </div>

          <div>
            <label className="label">Markup % *</label>
            <input
              type="number"
              required
              min="100"
              step="1"
              value={formData.markup}
              onChange={(e) => setFormData({ ...formData, markup: Number(e.target.value) })}
              className="input w-full"
            />
            <p className="text-xs text-gray-400 mt-1">100% = TT value, 150% = TT + 50%</p>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-400">Total Value</div>
            <div className="text-2xl font-bold text-green-400">{totalValue.toFixed(2)} PED</div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" className="btn-primary flex-1">
              Add Loot
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
