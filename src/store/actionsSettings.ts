import { emptySessionStats } from '../core/sessionCore';
import type { HuntStore, StoreGetState, StoreSetState } from './storeTypes';
import {
  finalizationInProgress,
  pendingKillFinalizeTimers,
  pendingKillFlag,
  pendingKillStartTime,
} from './killTracking';
import { calculateStats, defaultSettings, safeInvoke, saveJsonSetting } from './shared';

export const createSettingsActions = (
  set: StoreSetState,
  get: StoreGetState
): Pick<
  HuntStore,
  | 'updateSettings'
  | 'addToIgnoreList'
  | 'removeFromIgnoreList'
  | 'clearAllData'
  | 'clearPersistenceError'
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

  clearAllData: async () => {
    const wasWatching = (await safeInvoke<boolean>('is_watching')) === true;
    const stoppedWatching = await safeInvoke<void>('stop_watching_file');
    if (stoppedWatching === null) {
      return false;
    }

    const result = await safeInvoke<void>('db_clear_all_data');
    if (result === null) {
      const chatLogPath = get().settings.chatLogPath;
      if (wasWatching && chatLogPath) {
        await safeInvoke('start_watching_file', { path: chatLogPath });
      }
      return false;
    }

    pendingKillFinalizeTimers.forEach((timer) => clearTimeout(timer));
    pendingKillFinalizeTimers.clear();
    pendingKillFlag.clear();
    pendingKillStartTime.clear();
    finalizationInProgress.clear();

    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    set({
      sessions: [],
      activeSessionId: null,
      itemDatabase: [],
      loadouts: [],
      settings: { ...defaultSettings },
      goals: [],
      pendingKills: new Map(),
      analyticsData: {
        performance: null,
        advanced: null,
        factors: null,
        isLoading: false,
        error: null,
      },
      analyticsTimeRange: {
        startTime: null,
        endTime: null,
      },
      analyticsSelectedTags: [],
      analyticsLifetimeStats: {
        totalLoot: 0,
        totalCost: 0,
        totalKills: 0,
        totalGlobals: 0,
        totalHofs: 0,
        totalDamage: 0,
        totalShotsFired: 0,
        totalDuration: 0,
        totalSessions: 0,
      },
      persistenceError: null,
    });

    return true;
  },

  clearPersistenceError: () => {
    set({ persistenceError: null });
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
