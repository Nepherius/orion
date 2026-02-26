import { useHuntStore } from '../store';

export function Settings() {
  const { settings, updateSettings } = useHuntStore();

  return (
    <div className="card p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Settings</h2>

      <div className="space-y-6">
        <div>
          <label className="label">Player Name</label>
          <input
            type="text"
            value={settings.playerName}
            onChange={(e) => updateSettings({ playerName: e.target.value })}
            placeholder="Your player name"
            className="input w-full"
          />
          <p className="text-xs text-gray-400 mt-1">
            Your Entropia Universe player name (optional)
          </p>
        </div>

        <div>
          <label className="label">Default Markup %</label>
          <input
            type="number"
            min="100"
            step="1"
            value={settings.defaultMarkup}
            onChange={(e) => updateSettings({ defaultMarkup: Number(e.target.value) })}
            className="input w-full"
          />
          <p className="text-xs text-gray-400 mt-1">
            Default markup percentage for new loot items (100% = TT value)
          </p>
        </div>

        <div>
          <label className="label">Theme</label>
          <select
            value={settings.theme}
            onChange={(e) => updateSettings({ theme: e.target.value as 'light' | 'dark' })}
            className="input w-full"
          >
            <option value="dark">Dark</option>
            <option value="light">Light (Coming Soon)</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="autoSave"
            checked={settings.autoSave}
            onChange={(e) => updateSettings({ autoSave: e.target.checked })}
            className="w-4 h-4"
          />
          <label htmlFor="autoSave" className="text-sm text-gray-300">
            Auto-save data automatically
          </label>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="overlayEnabled"
            checked={settings.overlayEnabled}
            onChange={(e) => updateSettings({ overlayEnabled: e.target.checked })}
            className="w-4 h-4"
          />
          <label htmlFor="overlayEnabled" className="text-sm text-gray-300">
            Enable overlay mode (Coming Soon)
          </label>
        </div>

        <div className="border-t border-gray-700 pt-6">
          <h3 className="text-lg font-semibold mb-4">About</h3>
          <div className="space-y-2 text-sm text-gray-300">
            <p>
              <strong>Orion Hunt Tracker</strong> - Version 0.1.0
            </p>
            <p>
              A modern hunt tracking application for Entropia Universe, inspired by Entropia Tally
              and Artemis.
            </p>
            <p className="text-gray-400">
              Track your hunting sessions, loot, costs, globals, and statistics. All data is stored
              locally in your browser.
            </p>
            <p className="text-xs text-gray-500 mt-4">
              Not affiliated with MindArk PE AB or Entropia Universe.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-6">
          <h3 className="text-lg font-semibold mb-4 text-red-400">Danger Zone</h3>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to clear all data? This cannot be undone!')) {
                localStorage.clear();
                window.location.reload();
              }
            }}
            className="btn-danger"
          >
            Clear All Data
          </button>
          <p className="text-xs text-gray-400 mt-2">
            This will permanently delete all sessions, loot data, and settings.
          </p>
        </div>
      </div>
    </div>
  );
}
