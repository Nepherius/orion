import { useState } from 'react';
import { useHuntStore } from '../../store';

interface WelcomeModalProps {
  onComplete?: () => void;
}

export function WelcomeModal({ onComplete }: WelcomeModalProps) {
  const [characterName, setCharacterName] = useState('');
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const updateSettings = useHuntStore((state) => state.updateSettings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (characterName.trim()) {
      updateSettings({
        avatarName: characterName.trim(),
        analyticsEnabled,
        analyticsConsentAnswered: true,
      });
      onComplete?.();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg p-8 max-w-md w-full mx-4 text-center">
        <div className="mb-6">
          <img src="/assets/images/orion_icon.png" alt="Orion" className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-2">Welcome to ORION</h2>
          <p className="text-muted">Enter your Entropia Universe Avatar name to get started.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            placeholder="Character name"
            autoFocus
            className="input w-full"
          />

          <div className="rounded border border-border bg-surface-dark p-3 text-left">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="welcomeAnalytics"
                checked={analyticsEnabled}
                onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <div>
                <label htmlFor="welcomeAnalytics" className="text-sm text-gray-300">
                  Share anonymous usage analytics
                </label>
                <p className="mt-1 text-xs text-muted">
                  Sends app-open events with Orion version, operating system, and a generated
                  install id.
                </p>
              </div>
            </div>
          </div>

          <button type="submit" disabled={!characterName.trim()} className="btn-primary w-full">
            Get Started
          </button>
        </form>
      </div>
    </div>
  );
}
