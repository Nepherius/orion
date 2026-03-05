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
    fixedValue: 0,
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
          fixedValue: matchedItem.defaultFixedValue || 0,
        }));
      }
    }
  }, [formData.name, itemDatabase]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalValue =
      formData.fixedValue > 0
        ? (formData.value + formData.fixedValue) * formData.quantity
        : formData.value * (formData.markup / 100) * formData.quantity;
    addLoot(sessionId, { ...formData, totalValue });
    onClose();
  };

  const totalValue =
    formData.fixedValue > 0
      ? (formData.value + formData.fixedValue) * formData.quantity
      : formData.value * (formData.markup / 100) * formData.quantity;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Add Loot</h2>
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
              disabled={formData.fixedValue > 0}
              className="input w-full"
            />
            <p className="text-xs text-muted mt-1">
              100% = TT value, 150% = TT + 50%{formData.fixedValue > 0 ? ' (ignored when fixed value is set)' : ''}
            </p>
          </div>

          <div>
            <label className="label">Fixed Value (per item, PED)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.fixedValue}
              onChange={(e) => setFormData({ ...formData, fixedValue: Number(e.target.value) })}
              placeholder="0.00"
              className="input w-full"
            />
            <p className="text-xs text-muted mt-1">If set above 0, total uses TT + fixed value and ignores MU.</p>
          </div>

          <div className="bg-surface rounded-lg p-4">
            <div className="text-sm text-muted">Total Value</div>
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
