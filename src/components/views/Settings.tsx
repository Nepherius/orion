import { FolderOpen, User, FileText, Palette, Sliders } from 'lucide-react';
import { useSettingsModel } from '../../hooks/useSettingsModel';
import { ConfirmModal } from '../common/ConfirmModal';

export function Settings() {
  const {
    settings,
    updateSettings,
    chatLogPath,
    detectedPath,
    handleBrowse,
    handleChatLogPathChange,
    requestClearData,
    confirmClearData,
    showClearDataConfirm,
    setShowClearDataConfirm,
  } = useSettingsModel();

  const SettingSection = ({
    icon: Icon,
    title,
    description,
    children,
  }: {
    icon: React.ElementType;
    title: string;
    description: string;
    children: React.ReactNode;
  }) => (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-4">
        <Icon className="w-5 h-5 text-primary-500" />
        <div>
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="text-xs text-gray-400">{description}</p>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Settings</h2>
        <p className="text-gray-400">Configure your hunt tracking preferences</p>
      </div>

      {/* Profile Section */}
      <SettingSection icon={User} title="Profile" description="Your avatar information">
        <div>
          <label className="label">Avatar Name</label>
          <input
            type="text"
            value={settings.avatarName}
            onChange={(e) => updateSettings({ avatarName: e.target.value })}
            placeholder="Enter your character name"
            className="input w-full"
          />
          <p className="text-xs text-gray-400 mt-1">
            Used for automatic player filtering in chat logs
          </p>
        </div>
      </SettingSection>

      {/* Log File Section */}
      <SettingSection
        icon={FileText}
        title="Log File"
        description="Entropia Universe chat log configuration"
      >
        <div>
          <label className="label">Chat Log Path</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={chatLogPath}
              onChange={(e) => {
                handleChatLogPathChange(e.target.value);
              }}
              placeholder="Automatic detection"
              className="input flex-1"
            />
            <button onClick={handleBrowse} className="btn-secondary flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Browse
            </button>
          </div>
          {detectedPath && (
            <div className="mt-3 p-2 bg-gray-700 rounded">
              <p className="text-xs text-gray-400 mb-1">Default Location:</p>
              <p className="text-xs text-gray-300 font-mono break-all">{detectedPath}</p>
            </div>
          )}
        </div>
      </SettingSection>

      {/* Theme Section */}
      <SettingSection icon={Palette} title="Theme" description="Display preferences">
        <div>
          <label className="label">Color Scheme</label>
          <select
            value={settings.theme}
            onChange={(e) => updateSettings({ theme: e.target.value as 'light' | 'dark' })}
            className="input w-full"
          >
            <option value="dark">Dark</option>
            <option value="light">Light (Coming Soon)</option>
          </select>
        </div>
      </SettingSection>

      {/* Miscellaneous Section */}
      <SettingSection icon={Sliders} title="Miscellaneous" description="Additional options">
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
            Default markup for new loot items (100% = TT value)
          </p>
        </div>

        <div className="border-t border-gray-600 pt-3">
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
        </div>

        <div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="overlayEnabled"
              checked={settings.overlayEnabled}
              onChange={(e) => updateSettings({ overlayEnabled: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="overlayEnabled" className="text-sm text-gray-300">
              Enable session overlay
            </label>
          </div>
          <p className="text-xs text-gray-400 mt-1 ml-7">
            Show a draggable overlay with session stats during hunts
          </p>
        </div>
      </SettingSection>

      {/* About Section */}
      <div className="card p-5">
        <h3 className="font-semibold text-white mb-3">About</h3>
        <div className="space-y-2 text-sm text-gray-300">
          <p>
            <strong>Orion Loot Tracker</strong> - Version 0.1.0
          </p>
          <p>
            A modern hunt tracking application for Entropia Universe, inspired by Entropia Tally and
            Artemis.
          </p>
          <p className="text-gray-400">
            Track your hunting sessions, loot, costs, globals, and statistics. All data is stored
            locally.
          </p>
          <p className="text-xs text-gray-500">
            Not affiliated with MindArk PE AB or Entropia Universe.
          </p>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card p-5 border border-red-900 bg-red-950 bg-opacity-20">
        <h3 className="font-semibold text-red-400 mb-3">Danger Zone</h3>
        <button onClick={requestClearData} className="btn-danger w-full">
          Clear All Data
        </button>
        <p className="text-xs text-gray-400 mt-2">
          This will permanently delete all sessions, loot data, and settings.
        </p>
      </div>

      <ConfirmModal
        isOpen={showClearDataConfirm}
        onClose={() => setShowClearDataConfirm(false)}
        onConfirm={confirmClearData}
        variant="danger"
        title="Clear All Data?"
        message="Are you sure you want to clear all data? This action cannot be undone!"
        detail="All sessions, loot, loadouts, and settings will be permanently deleted."
        confirmText="Clear All Data"
        cancelText="Cancel"
      />
    </div>
  );
}
