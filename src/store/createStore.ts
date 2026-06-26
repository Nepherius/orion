import { create } from 'zustand';
import type { HuntStore } from './storeTypes';
import { defaultSettings, setPersistenceErrorReporter } from './shared';
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
  analyticsSelectedTags: [],
  analyticsLifetimeStats: {
    totalLoot: 0,
    totalTtLoot: 0,
    totalAdjustedLoot: 0,
    totalMarkupGain: 0,
    totalFixedGain: 0,
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

setPersistenceErrorReporter((persistenceError) => {
  useHuntStore.setState({ persistenceError });
});
