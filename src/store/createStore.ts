import { create } from 'zustand';
import type { HuntStore } from './storeTypes';
import { defaultSettings } from './shared';
import { createInternalActions } from './actionsInternal';
import { createGoalActions } from './actionsGoals';
import { createSessionActions } from './actionsSessions';
import { createLootActions } from './actionsLoot';
import { createEventActions } from './actionsEvents';
import { createItemActions } from './actionsItems';
import { createLoadoutActions } from './actionsLoadouts';
import { createSettingsActions } from './actionsSettings';
import { createAnalyticsActions } from './actionsAnalytics';

export const useHuntStore = create<HuntStore>()((set, get) => ({
  sessions: [],
  activeSessionId: null,
  itemDatabase: [],
  loadouts: [],
  settings: defaultSettings,
  goals: [],
  pendingKills: new Map(),
  creatureData: null,
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

  ...createAnalyticsActions(set, get),
  ...createInternalActions(set, get),
  ...createGoalActions(set),
  ...createSessionActions(set, get),
  ...createLootActions(set, get),
  ...createEventActions(set, get),
  ...createItemActions(set),
  ...createLoadoutActions(set, get),
  ...createSettingsActions(set, get),
}));
