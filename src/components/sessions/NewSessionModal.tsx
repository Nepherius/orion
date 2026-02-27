import { useState } from 'react';
import { useHuntStore } from '../../store';
import { X } from 'lucide-react';

interface NewSessionModalProps {
  onClose: () => void;
  onSessionCreated?: () => void;
}

export function NewSessionModal({ onClose, onSessionCreated }: NewSessionModalProps) {
  const createSession = useHuntStore((state) => state.createSession);
  const loadouts = useHuntStore((state) => state.loadouts);
  const activeLoadout = useHuntStore((state) => state.getActiveLoadout());

  const [formData, setFormData] = useState({
    name: '',
    loadoutId: activeLoadout?.id || '',
    armor: '',
    location: '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedLoadout = loadouts.find((l) => l.id === formData.loadoutId);
    createSession({
      ...formData,
      weapon: selectedLoadout?.name || 'No Loadout',
      loadoutId: formData.loadoutId || undefined,
      startTime: Date.now(),
      status: 'active',
      ammoCost: 0,
      repairCost: 0,
      armorDecay: 0,
      healingCost: 0,
      otherCosts: 0,
      notes: formData.notes,
    });
    onClose();
    onSessionCreated?.();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">New Hunt Session</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Session Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Evening Atrox Hunt"
              className="input w-full"
            />
          </div>

          <div>
            <label className="label">Loadout *</label>
            <select
              required
              value={formData.loadoutId}
              onChange={(e) => setFormData({ ...formData, loadoutId: e.target.value })}
              className="input w-full"
            >
              <option value="">Select a loadout</option>
              {loadouts.map((loadout) => (
                <option key={loadout.id} value={loadout.id}>
                  {loadout.name} {loadout.status === 'active' ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Armor</label>
            <input
              type="text"
              value={formData.armor}
              onChange={(e) => setFormData({ ...formData, armor: e.target.value })}
              placeholder="e.g., Pixie Armor"
              className="input w-full"
            />
          </div>

          <div>
            <label className="label">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Port Atlantis"
              className="input w-full"
            />
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              className="input w-full h-20 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" className="btn-primary flex-1">
              Create Session
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
