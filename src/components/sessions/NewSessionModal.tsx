import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useHuntStore } from '../../store';
import { AutocompleteInput } from '../common/AutocompleteInput';
import { ConfirmModal } from '../common/ConfirmModal';
import { TagInput } from '../common/TagInput';
import { X } from 'lucide-react';
import { HuntSession } from '../../types';
import { useSessionAutocompleteData } from '../../hooks/useSessionAutocompleteData';
import { SessionAdvisor } from './SessionAdvisor';
import { parseOptionalBankroll } from '../../utils/sessionAdvisor';

interface NewSessionModalProps {
  onClose: () => void;
  onSessionCreated?: () => void;
}

type NewSessionInit = Omit<
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
>;

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export function NewSessionModal({ onClose, onSessionCreated }: NewSessionModalProps) {
  const createSession = useHuntStore((state) => state.createSession);
  const loadouts = useHuntStore((state) => state.loadouts);
  const primaryLoadout = useHuntStore((state) => state.getPrimaryLoadout());
  const chatLogPath = useHuntStore((state) => state.settings.chatLogPath);
  const [pendingSession, setPendingSession] = useState<NewSessionInit | null>(null);
  const [chatLogWarning, setChatLogWarning] = useState('');
  const [isValidatingChatLog, setIsValidatingChatLog] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    loadoutId: string;
    location: string;
    creature: string;
    bankroll: string;
    expectedMaturities: string[];
    notes: string;
    tags: string[];
  }>({
    name: '',
    loadoutId: primaryLoadout?.id || '',
    location: '',
    creature: '',
    bankroll: '',
    expectedMaturities: [],
    notes: '',
    tags: [],
  });
  // Gather all unique tags from existing sessions for suggestions
  const allSessions = useHuntStore((state) => state.sessions);
  const tagSuggestions = Array.from(new Set(allSessions.flatMap((s) => s.tags || []))).sort();
  // Tag handler
  const handleTagsChange = (tags: string[]) => {
    setFormData((prev) => ({ ...prev, tags }));
  };

  const { creatures, creatureEntries, planets } = useSessionAutocompleteData();
  const selectedLoadout = loadouts.find((loadout) => loadout.id === formData.loadoutId);

  const finishCreatingSession = (session: NewSessionInit) => {
    createSession(session);
    onClose();
    onSessionCreated?.();
  };

  const buildSession = (): NewSessionInit => {
    return {
      name: formData.name,
      location: formData.location || 'Unknown',
      loadoutId: formData.loadoutId || undefined,
      weapon: selectedLoadout?.weapon?.Name || selectedLoadout?.name || 'No Loadout',
      armor: selectedLoadout?.armor || undefined,
      creature: formData.creature || '',
      notes: formData.notes,
      tags: formData.tags || [],
      plannedBankroll: parseOptionalBankroll(formData.bankroll),
      plannedMaturities: formData.expectedMaturities,
      startTime: Date.now(),
      status: 'active',
      ammoCost: 0,
      weaponDecay: 0,
      healingCost: selectedLoadout?.medicalMECost || 0,
      otherCosts: 0,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newSession = buildSession();

    setIsValidatingChatLog(true);
    try {
      await invoke('validate_chat_log_path', { path: chatLogPath || '' });
      finishCreatingSession(newSession);
    } catch (error) {
      setPendingSession(newSession);
      setChatLogWarning(getErrorMessage(error));
    } finally {
      setIsValidatingChatLog(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg p-6 max-h-[90vh] max-w-2xl w-full mx-4 overflow-y-auto">
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
            placeholder="e.g., Planet Calypso"
          />

          <AutocompleteInput
            label="Creature"
            value={formData.creature}
            onChange={(creature) => setFormData({ ...formData, creature, expectedMaturities: [] })}
            options={creatures}
            placeholder="e.g., Atrox Adolescent"
          />

          <SessionAdvisor
            loadout={selectedLoadout}
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
            <button type="submit" className="btn-primary flex-1" disabled={isValidatingChatLog}>
              {isValidatingChatLog ? 'Checking Chat Log…' : 'Create Session'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>

      <ConfirmModal
        isOpen={pendingSession !== null}
        onClose={() => setPendingSession(null)}
        onConfirm={() => {
          if (pendingSession) {
            finishCreatingSession(pendingSession);
          }
        }}
        variant="warning"
        title="Chat Log Not Found"
        message="Orion cannot access the configured chat log, so this session will not be tracked automatically."
        detail={`${chatLogWarning} Check the Chat Log Path in Settings, or continue without automatic tracking.`}
        confirmText="Start Without Tracking"
        cancelText="Cancel"
      />
    </div>
  );
}
