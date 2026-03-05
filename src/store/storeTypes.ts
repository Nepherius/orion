import type { StoreApi } from 'zustand';
import type {
  AppSettings,
  Global,
  Goal,
  HuntSession,
  ItemTemplate,
  Loadout,
  LootItem,
  SessionStats,
  SkillGain,
} from '../types';

export interface PendingKill {
  startTimestamp: number;
  endTimestamp: number;
  lootItemIds: string[];
}

export interface HuntStore {
  sessions: HuntSession[];
  activeSessionId: string | null;
  itemDatabase: ItemTemplate[];
  loadouts: Loadout[];
  settings: AppSettings;
  goals: Goal[];

  pendingKills: Map<string, PendingKill>;
  creatureData: Array<{ name: string; maturity: string; hp: number }> | null;

  _loadCreatureData: () => Promise<void>;
  _finalizePendingKill: (sessionId: string) => Promise<void>;

  addGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;

  createSession: (
    session: Omit<
      HuntSession,
      | 'id'
      | 'stats'
      | 'loot'
      | 'skills'
      | 'globals'
      | 'kills'
      | 'damageEvents'
      | 'combatEvents'
      | 'healingEvents'
      | 'damageTakenEvents'
    >
  ) => void;
  updateSession: (id: string, updates: Partial<HuntSession>) => void;
  deleteSession: (id: string) => void;
  startSession: (id: string) => void;
  pauseSession: (id: string) => void;
  resumeSession: (id: string) => void;
  endSession: (id: string) => Promise<void>;

  addLoot: (
    sessionId: string,
    loot: Omit<LootItem, 'id' | 'timestamp'> & { timestamp?: number }
  ) => Promise<void>;
  updateLoot: (sessionId: string, lootId: string, updates: Partial<LootItem>) => void;
  updateLootByName: (
    sessionId: string,
    itemName: string,
    updates: Pick<Partial<LootItem>, 'markup' | 'fixedValue'>
  ) => void;
  removeLoot: (sessionId: string, lootId: string) => void;
  removeLootByName: (sessionId: string, itemName: string) => void;

  addSkillGain: (
    sessionId: string,
    skill: Omit<SkillGain, 'id' | 'timestamp'> & { timestamp?: number }
  ) => void;

  addGlobal: (
    sessionId: string,
    global: Omit<Global, 'id' | 'timestamp'> & { timestamp?: number }
  ) => void;

  addDamageEvent: (
    sessionId: string,
    damage: number,
    isCritical?: boolean,
    timestamp?: number
  ) => void;
  addCombatEvent: (
    sessionId: string,
    eventType:
      | 'hit'
      | 'crit'
      | 'player_miss'
      | 'player_dodge'
      | 'player_evade'
      | 'enemy_miss'
      | 'enemy_evade'
      | 'enemy_dodge',
    timestamp?: number
  ) => void;
  addHealingEvent: (
    sessionId: string,
    amount: number,
    timestamp?: number,
    options?: { applyCost?: boolean; isDirectUse?: boolean }
  ) => void;
  addDamageTakenEvent: (
    sessionId: string,
    damage: number,
    isCritical?: boolean,
    timestamp?: number
  ) => void;

  addItemTemplate: (item: Omit<ItemTemplate, 'id'>) => void;
  updateItemTemplate: (id: string, updates: Partial<ItemTemplate>) => void;
  deleteItemTemplate: (id: string) => void;

  createLoadout: (loadout: Omit<Loadout, 'id'>) => void;
  updateLoadout: (id: string, updates: Partial<Loadout>) => void;
  deleteLoadout: (id: string) => void;
  duplicateLoadout: (id: string) => void;
  toggleLoadoutFavorite: (id: string) => void;
  setPrimaryLoadout: (id: string) => void;
  getPrimaryLoadout: () => Loadout | null;

  updateSettings: (settings: Partial<AppSettings>) => void;
  addToIgnoreList: (itemName: string) => void;
  removeFromIgnoreList: (itemName: string) => void;

  getActiveSession: () => HuntSession | null;
  calculateSessionStats: (sessionId: string) => SessionStats;
}

export type StoreSyncPayload = {
  sourceId: string;
  sessions: HuntSession[];
  activeSessionId: string | null;
  loadouts: Loadout[];
};

export type OverlaySessionCommandPayload = {
  sessionId: string;
  command: 'pause' | 'resume' | 'next_loadout' | 'prev_loadout';
};

export type StoreSetState = StoreApi<HuntStore>['setState'];
export type StoreGetState = StoreApi<HuntStore>['getState'];
