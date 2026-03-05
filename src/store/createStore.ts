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

export const useHuntStore = create<HuntStore>()((set, get) => ({
  sessions: [],
  activeSessionId: null,
  itemDatabase: [],
  loadouts: [],
  settings: defaultSettings,
  goals: [],
  pendingKills: new Map(),
  creatureData: null,

  ...createInternalActions(set, get),
  ...createGoalActions(set),
  ...createSessionActions(set, get),
  ...createLootActions(set, get),
  ...createEventActions(set, get),
  ...createItemActions(set),
  ...createLoadoutActions(set, get),
  ...createSettingsActions(set, get),
}));
