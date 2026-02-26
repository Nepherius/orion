import { useState } from 'react';
import { useHuntStore } from '../store';
import { X } from 'lucide-react';

interface AddGlobalModalProps {
  sessionId: string;
  onClose: () => void;
}

export function AddGlobalModal({ sessionId, onClose }: AddGlobalModalProps) {
  const session = useHuntStore((state) => state.sessions.find((s) => s.id === sessionId));
  const addGlobal = useHuntStore((state) => state.addGlobal);
  const [formData, setFormData] = useState({
    creature: session?.creature || '',
    value: 0,
    isHoF: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addGlobal(sessionId, formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Add Global / HoF</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Creature *</label>
            <input
              type="text"
              required
              value={formData.creature}
              onChange={(e) => setFormData({ ...formData, creature: e.target.value })}
              placeholder="e.g., Atrox"
              className="input w-full"
            />
          </div>

          <div>
            <label className="label">Value (PED) *</label>
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

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isHoF"
              checked={formData.isHoF}
              onChange={(e) => setFormData({ ...formData, isHoF: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="isHoF" className="text-sm text-gray-300">
              This is a Hall of Fame (HoF) 🏆
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" className="btn-primary flex-1">
              Add Global
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
