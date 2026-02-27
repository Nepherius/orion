import { useState } from 'react';
import { useHuntStore } from '../store';

interface WelcomeModalProps {
  onComplete?: () => void;
}

export function WelcomeModal({ onComplete }: WelcomeModalProps) {
  const [characterName, setCharacterName] = useState('');
  const updateSettings = useHuntStore((state) => state.updateSettings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (characterName.trim()) {
      updateSettings({ avatarName: characterName.trim() });
      onComplete?.();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4 text-center">
        <div className="mb-6">
          <img src="/icon.png" alt="Orion" className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-2">Welcome to ORION</h2>
          <p className="text-gray-400">Enter your Entropia Universe Avatar name to get started.</p>
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

          <button
            type="submit"
            disabled={!characterName.trim()}
            className="btn-primary w-full"
          >
            Get Started
          </button>
        </form>
      </div>
    </div>
  );
}
