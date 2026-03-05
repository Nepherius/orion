import { useEffect, useState } from 'react';
import { useHuntStore } from '../../store';
import { AutocompleteInput } from '../common/AutocompleteInput';
import { X } from 'lucide-react';
import { HuntSession } from '../../types';
import { loadCreatureNames } from '../../services/creatureDataLoader';

interface NewSessionModalProps {
  onClose: () => void;
  onSessionCreated?: () => void;
}

export function NewSessionModal({ onClose, onSessionCreated }: NewSessionModalProps) {
  const createSession = useHuntStore((state) => state.createSession);
  const loadouts = useHuntStore((state) => state.loadouts);
  const primaryLoadout = useHuntStore((state) => state.getPrimaryLoadout());

  const [formData, setFormData] = useState({
    name: '',
    loadoutId: primaryLoadout?.id || '',
    location: '',
    creature: '',
    notes: '',
  });

  const [creatures, setCreatures] = useState<string[]>([]);
  const [planets, setPlanets] = useState<string[]>([]);

  useEffect(() => {
    // Load creatures and planets data
    Promise.all([
      loadCreatureNames().then((data) => setCreatures(data)),
      fetch('/assets/creatures/planets.json')
        .then((res) => res.json())
        .then((data) => setPlanets(data.planets || [])),
    ]).catch((err) => console.error('Failed to load autocomplete data:', err));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedLoadout = loadouts.find((l) => l.id === formData.loadoutId);
    const selectedWeaponName =
      selectedLoadout?.weapon?.Name || selectedLoadout?.name || 'No Loadout';
    const selectedArmorName = selectedLoadout?.armor || undefined;
    const baseHealingCost = selectedLoadout?.medicalMECost || 0;

    // Define the initial session object for database insertion (without stats, id, etc.)
    const newSessionInit: Omit<
      HuntSession,
      | 'id'
      | 'stats'
      | 'loot'
      | 'skills'
      | 'globals'
      | 'kills'
      | 'damageEvents'
      | 'combatEvents'
      | 'healingEvents'
      | 'damageTakenEvents'
    > = {
      name: formData.name,
      location: formData.location || 'Unknown',
      loadoutId: formData.loadoutId || undefined,
      weapon: selectedWeaponName,
      armor: selectedArmorName,
      creature: formData.creature || '',
      notes: formData.notes,
      startTime: Date.now(),
      status: 'active',
      ammoCost: 0,
      weaponDecay: 0,
      healingCost: baseHealingCost,
      otherCosts: 0,
    };

    // Tauri db insertion creates the UUID and the store initializes omitted collections/stats.
    createSession(newSessionInit);

    onClose();
    onSessionCreated?.();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">New Hunt Session</h2>
          <button onClick={onClose} className="text-muted hover:text-white">
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
                  {loadout.name} {loadout.isPrimary ? '(Primary)' : ''}
                </option>
              ))}
            </select>
          </div>

          <AutocompleteInput
            label="Location"
            value={formData.location}
            onChange={(location) => setFormData({ ...formData, location })}
            options={planets}
            placeholder="e.g., Port Atlantis"
          />

          <AutocompleteInput
            label="Creature"
            value={formData.creature}
            onChange={(creature) => setFormData({ ...formData, creature })}
            options={creatures}
            placeholder="e.g., Atrox Adolescent"
          />

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
