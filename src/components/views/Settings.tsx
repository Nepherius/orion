import {
  FolderOpen,
  User,
  FileText,
  Palette,
  Sliders,
  AlertCircle,
  ShieldCheck,
  Monitor,
  RotateCcw,
} from 'lucide-react';
import { useSettingsModel } from '../../hooks/useSettingsModel';
import { usePageVisibility } from '../../hooks/usePageVisibility';
import { ConfirmModal } from '../common/ConfirmModal';
import { AlertModal } from '../common/AlertModal';
import { InfoTooltip } from '../common/InfoTooltip';
import { Panel } from '../common/Panel';
import { open } from '@tauri-apps/plugin-shell';
import type { OverlayStatId } from '../../types';
import {
  normalizeOverlayStatIds,
  overlayProfiles,
  overlayStatDefinitions,
} from '../../utils/overlayStats';
import { defaultSettings } from '../../store/shared';

interface SettingSectionProps {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}

const SettingSection = ({ icon: Icon, title, description, children }: SettingSectionProps) => (
  <Panel>
    <div className="flex items-center gap-3 mb-4">
      <Icon className="w-5 h-5 text-primary-500" />
      <div>
        <h3 className="font-semibold text-white">{title}</h3>
        <p className="text-xs text-muted">{description}</p>
      </div>
    </div>
    <div className="space-y-3">{children}</div>
  </Panel>
);

export function Settings() {
  const isPageVisible = usePageVisibility();
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
    clearDataError,
    setClearDataError,
  } = useSettingsModel();
  const selectedOverlayStatIds = normalizeOverlayStatIds(settings.overlayStatIds);
  const selectedOverlayStatSet = new Set(selectedOverlayStatIds);
  const overlayStatGroups = ['Core', 'Returns', 'Combat', 'Costs', 'Progress'].map((group) => ({
    group,
    stats: overlayStatDefinitions.filter((stat) => stat.group === group),
  }));

  const updateOverlayStatIds = (ids: OverlayStatId[]) => {
    updateSettings({ overlayStatIds: ids.length > 0 ? ids : selectedOverlayStatIds });
  };

  const toggleOverlayStat = (id: OverlayStatId) => {
    const next = selectedOverlayStatSet.has(id)
      ? selectedOverlayStatIds.filter((statId) => statId !== id)
      : [...selectedOverlayStatIds, id];

    updateOverlayStatIds(next);
  };

  if (!isPageVisible) {
    return (
      <Panel contentClassName="py-4 text-center text-muted">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-60" />
        <p>Settings is paused while the app is in the background.</p>
      </Panel>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Settings</h2>
        <p className="text-muted">Configure your hunt tracking preferences</p>
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
          <p className="text-xs text-muted mt-1">
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
            <div className="mt-3 p-2 bg-surface rounded">
              <p className="text-xs text-muted mb-1">Default Location:</p>
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
            onChange={(e) =>
              updateSettings({
                theme: e.target.value as
                  | 'dark'
                  | 'light'
                  | 'high-contrast'
                  | 'calypso'
                  | 'arkadia'
                  | 'rocktropia'
                  | 'cyrene'
                  | 'monria'
                  | 'next-island'
                  | 'toulan',
              })
            }
            className="input w-full"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="high-contrast">High Contrast</option>
            <option value="calypso">Calypso</option>
            <option value="arkadia">Arkadia</option>
            <option value="rocktropia">Rocktropia</option>
            <option value="cyrene">Cyrene</option>
            <option value="monria">Monria</option>
            <option value="next-island">Next Island</option>
            <option value="toulan">Toulan</option>
          </select>
        </div>
      </SettingSection>

      <SettingSection
        icon={Monitor}
        title="Overlay"
        description="Choose which live session stats appear in the overlay bar"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {overlayProfiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => updateOverlayStatIds([...profile.statIds])}
                className="btn-secondary text-sm"
                title={profile.description}
              >
                {profile.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              updateSettings({
                overlayX: defaultSettings.overlayX,
                overlayY: defaultSettings.overlayY,
                overlayWidth: defaultSettings.overlayWidth,
                overlayHeight: defaultSettings.overlayHeight,
              })
            }
            className="btn-secondary flex items-center gap-2 text-sm"
            title="Reset overlay size and position"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Size/Position
          </button>
        </div>

        <div className="space-y-4 border-t border-border pt-4">
          {overlayStatGroups.map(({ group, stats }) => (
            <div key={group}>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {group}
              </h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {stats.map((stat) => (
                  <label
                    key={stat.id}
                    htmlFor={`overlay-stat-${stat.id}`}
                    className="flex cursor-pointer items-start gap-3 rounded border border-border bg-white/[0.03] px-3 py-2 hover:bg-surface-hover"
                  >
                    <input
                      id={`overlay-stat-${stat.id}`}
                      type="checkbox"
                      checked={selectedOverlayStatSet.has(stat.id)}
                      onChange={() => toggleOverlayStat(stat.id)}
                      className="mt-0.5 h-4 w-4 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-gray-300">{stat.label}</span>
                      <span className="block text-xs text-muted">{stat.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
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
          <p className="text-xs text-muted mt-1">
            Default markup for new loot items (100% = TT value)
          </p>
        </div>

        <div className="border-t border-border pt-3">
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

        <div className="border-t border-border pt-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enableKillTrackingMaturity"
              checked={settings.enableKillTrackingMaturity ?? true}
              onChange={(e) => updateSettings({ enableKillTrackingMaturity: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="enableKillTrackingMaturity" className="text-sm text-gray-300">
              HP-based maturity inference (experimental)
            </label>
            <InfoTooltip tooltip="Automatically infer creature maturity by matching HP dealt to known creature stats. If disabled, all kills will show Unknown maturity for analytical purposes." />
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="autoStartSession"
              checked={settings.autoStartSession ?? false}
              onChange={(e) => updateSettings({ autoStartSession: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="autoStartSession" className="text-sm text-gray-300">
              Auto-start sessions when chat log is detected
            </label>
            <InfoTooltip tooltip="Automatically start a new session when activity is detected in the chat log file." />
          </div>
        </div>
      </SettingSection>

      {/* Privacy Section */}
      <SettingSection icon={ShieldCheck} title="Privacy" description="Anonymous usage analytics">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="analyticsEnabled"
            checked={settings.analyticsEnabled ?? false}
            onChange={(e) =>
              updateSettings({
                analyticsEnabled: e.target.checked,
                analyticsConsentAnswered: true,
              })
            }
            className="mt-1 h-4 w-4"
          />
          <div>
            <div className="flex items-center gap-2">
              <label htmlFor="analyticsEnabled" className="text-sm text-gray-300">
                Share anonymous usage analytics
              </label>
              <InfoTooltip tooltip="Sends app-open event payloads with Orion version, operating system, build mode, and a generated local install id. Avatar names, chat log paths, sessions, loot, and Entropia data stay local." />
            </div>
            <p className="mt-1 text-xs text-muted">
              Turn this off to stop analytics and clear the local analytics id.
            </p>
          </div>
        </div>
      </SettingSection>

      {/* About Section */}
      <Panel title="About">
        <div className="space-y-2 text-sm text-gray-300">
          <p>
            <strong>Orion Loot Tracker</strong> - Version 0.1.0
          </p>
          <p>
            A modern hunt tracking application for Entropia Universe, inspired by{' '}
            <button
              onClick={() => open('https://github.com/EntropiaTally/entropia-tally-app')}
              className="text-primary-400 hover:text-primary-300 underline cursor-pointer"
            >
              Entropia Tally
            </button>{' '}
            and{' '}
            <button
              onClick={() => open('https://www.thedeltaproject.net/artemis')}
              className="text-primary-400 hover:text-primary-300 underline cursor-pointer"
            >
              Artemis
            </button>
            .
          </p>
          <p className="text-muted">
            Track your hunting sessions, loot, costs, globals, and statistics. All data is stored
            locally.
          </p>
          <p className="text-xs text-muted">
            Not affiliated with MindArk PE AB or Entropia Universe.
          </p>
        </div>
      </Panel>

      {/* Danger Zone */}
      <Panel title="Danger Zone" className="border-red-900 bg-red-950 bg-opacity-20">
        <button onClick={requestClearData} className="btn-danger w-full">
          Clear All Data
        </button>
        <p className="text-xs text-muted mt-2">
          This will permanently delete all sessions, loot data, and settings.
        </p>
      </Panel>

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

      <AlertModal
        isOpen={clearDataError !== null}
        onClose={() => setClearDataError(null)}
        variant="error"
        title="Could Not Clear Data"
        message={clearDataError ?? ''}
        detail="Your existing database has been left in place."
      />
    </div>
  );
}
