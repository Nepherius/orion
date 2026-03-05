import { emptySessionStats } from '../core/sessionCore';
import type { HuntStore, StoreGetState, StoreSetState } from './storeTypes';
import { calculateStats, saveJsonSetting } from './shared';

export const createSettingsActions = (
  set: StoreSetState,
  get: StoreGetState
): Pick<
  HuntStore,
  | 'updateSettings'
  | 'addToIgnoreList'
  | 'removeFromIgnoreList'
  | 'getActiveSession'
  | 'calculateSessionStats'
> => ({
  updateSettings: (updates) => {
    set((state) => ({
      settings: (() => {
        const settings = { ...state.settings, ...updates };
        // eslint-disable-next-line no-console
        console.debug(
          '[Settings] updateSettings called with:',
          updates,
          'Resulting settings:',
          settings
        );
        void saveJsonSetting('settings', settings);
        return settings;
      })(),
    }));
  },

  addToIgnoreList: (itemName) => {
    set((state) => ({
      settings: (() => {
        const ignoreList = state.settings.ignoreListItems || [];
        if (!ignoreList.includes(itemName)) {
          const updated = { ...state.settings, ignoreListItems: [...ignoreList, itemName] };
          void saveJsonSetting('settings', updated);
          return updated;
        }
        return state.settings;
      })(),
    }));
  },

  removeFromIgnoreList: (itemName) => {
    set((state) => ({
      settings: (() => {
        const ignoreList = state.settings.ignoreListItems || [];
        const updated = {
          ...state.settings,
          ignoreListItems: ignoreList.filter((i) => i !== itemName),
        };
        void saveJsonSetting('settings', updated);
        return updated;
      })(),
    }));
  },

  getActiveSession: () => {
    const state = get();
    return state.sessions.find((s) => s.id === state.activeSessionId) || null;
  },

  calculateSessionStats: (sessionId) => {
    const session = get().sessions.find((s) => s.id === sessionId);
    if (!session) {
      return emptySessionStats();
    }
    return calculateStats(session);
  },
});
