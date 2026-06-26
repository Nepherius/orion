import { useState } from 'react';
import { useHuntStore } from '../../store';
import { AutocompleteInput } from '../common/AutocompleteInput';
import { TagInput } from '../common/TagInput';
import { X } from 'lucide-react';
import { useSessionAutocompleteData } from '../../hooks/useSessionAutocompleteData';
import { SessionAdvisor } from './SessionAdvisor';
import { parseOptionalBankroll } from '../../utils/sessionAdvisor';

interface EditSessionModalProps {
  sessionId: string;
  onClose: () => void;
}

export function EditSessionModal({ sessionId, onClose }: EditSessionModalProps) {
  const session = useHuntStore((state) => state.sessions.find((s) => s.id === sessionId));
  const updateSession = useHuntStore((state) => state.updateSession);
  const loadouts = useHuntStore((state) => state.loadouts);

  // Prefer explicit loadoutId, fallback to matching by weapon item name
  const sessionLoadout =
    loadouts.find((l) => l.id === session?.loadoutId) ||
    loadouts.find((l) => l.weapon?.Name === session?.weapon);

  const [formData, setFormData] = useState({
    name: session?.name || '',
    loadoutId: sessionLoadout?.id || '',
    weapon: session?.weapon || '',
    creature: session?.creature || '',
    location: session?.location || '',
    bankroll:
      session?.plannedBankroll !== undefined && session?.plannedBankroll !== null
        ? String(session.plannedBankroll)
        : '',
    expectedMaturities: session?.plannedMaturities || [],
    notes: session?.notes || '',
    tags: session?.tags || [],
  });
  // Gather all unique tags from existing sessions for suggestions
  const allSessions = useHuntStore((state) => state.sessions);
  const tagSuggestions = Array.from(new Set(allSessions.flatMap((s) => s.tags || []))).sort();

  // Tag handler
  const handleTagsChange = (tags: string[]) => {
    setFormData((prev) => ({ ...prev, tags }));
  };

  const { creatures, creatureEntries, planets } = useSessionAutocompleteData();

  if (!session) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedLoadout = loadouts.find((l) => l.id === formData.loadoutId);
    const { bankroll, expectedMaturities, ...sessionFormData } = formData;
    updateSession(sessionId, {
      ...sessionFormData,
      weapon: selectedLoadout?.weapon?.Name || formData.weapon || 'No Loadout',
      armor: selectedLoadout?.armor ?? session.armor,
      plannedBankroll: parseOptionalBankroll(bankroll),
      plannedMaturities: expectedMaturities,
      tags: formData.tags || [],
    });
    onClose();
  };

  const advisorLoadout = loadouts.find((l) => l.id === formData.loadoutId) || sessionLoadout;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg p-6 max-h-[90vh] max-w-2xl w-full mx-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Edit Hunt Session</h2>
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
            <label className="label">Loadout</label>
            <select
              value={formData.loadoutId}
              onChange={(e) => setFormData({ ...formData, loadoutId: e.target.value })}
              className="input w-full"
            >
              <option value="">Keep current: {formData.weapon}</option>
              {loadouts.map((loadout) => (
                <option key={loadout.id} value={loadout.id}>
                  {loadout.name} {loadout.isPrimary ? '(Primary)' : ''}
                </option>
              ))}
            </select>
          </div>

          <AutocompleteInput
            label="Creature"
            value={formData.creature}
            onChange={(creature) => setFormData({ ...formData, creature, expectedMaturities: [] })}
            options={creatures}
            placeholder="e.g., Atrox Adolescent"
          />

          <AutocompleteInput
            label="Location"
            value={formData.location}
            onChange={(location) => setFormData({ ...formData, location })}
            options={planets}
            placeholder="e.g., Planet Calypso"
          />

          <SessionAdvisor
            loadout={advisorLoadout}
            creature={formData.creature}
            creatureEntries={creatureEntries}
            sessions={allSessions}
            bankroll={formData.bankroll}
            onBankrollChange={(bankroll) => setFormData({ ...formData, bankroll })}
            expectedMaturities={formData.expectedMaturities}
            onExpectedMaturitiesChange={(expectedMaturities) =>
              setFormData({ ...formData, expectedMaturities })
            }
          />

          <TagInput
            label="Tags (optional)"
            value={formData.tags}
            onChange={handleTagsChange}
            suggestions={tagSuggestions}
            maxTags={5}
            placeholder="Add up to 5 tags"
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
              Save Changes
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
