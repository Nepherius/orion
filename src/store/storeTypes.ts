// Type definitions for Zustand store state and analytics
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

/**
 * Represents a kill event pending loot assignment
 */
export interface PendingKill {
  startTimestamp: number;
  endTimestamp: number;
  lootItemIds: string[];
}

export interface PersistenceError {
  command: string;
  message: string;
  occurredAt: number;
}

export interface AnalyticsPerformanceSqlData {
  avgLootValue: number;
  overallLootStdDev: number;
  largestDropValue: number;
  avgMinutesPerLoot: number;
  totalLootEvents: number;
  totalGlobalsCount: number;
  totalHoFsCount: number;
  globalDropRatePerKill: number;
  globalDropRatePerHour: number;
  avgGlobalValue: number;
  bestGlobalValue: number;
  topLootItems: Array<{
    name: string;
    totalValue: number;
    quantity: number;
    drops: number;
    avgValue: number;
  }>;
  allGlobals: Array<{
    id: string;
    creature: string;
    value: number;
    isHoF: boolean;
    sessionName: string;
    location?: string;
    timestamp: number;
  }>;
  recentSessions: Array<{ startTime: number; returnRate: number; profit: number; loot: number }>;
  locationData: Array<{
    location: string;
    sessions: number;
    returnRate: number;
    profit: number;
    globals: number;
  }>;
  costData: Array<{ name: string; value: number; color: string }>;
  weaponData: Array<{
    weapon: string;
    sessions: number;
    returnRate: number;
    totalLoot: number;
    totalCost: number;
    avgDamage: number;
    totalDamage: number;
    totalKills: number;
  }>;
  topSkills: Array<{ name: string; total: number }>;
  armorData: Array<{ armor: string; sessions: number; returnRate: number; avgDamageTaken: number }>;
  loadoutData: Array<{
    loadoutId: string;
    sessions: number;
    returnRate: number;
    profit: number;
    avgKills: number;
  }>;
}

export interface AnalyticsAdvancedSqlData {
  sessionWinRate: number;
  profitableStreaks: { currentStreak: number; longestStreak: number };
  temporalInsights: {
    avgSessionHours: number;
    bestHourLabel: string;
    bestHourReturnRate: number;
    avgGapHours: number;
  };
  creatureAnalysis: Array<{
    creature: string;
    count: number;
    returnRate: number;
    profit: number;
    totalKills: number;
    totalGlobals: number;
    totalLoot: number;
    totalCost: number;
  }>;
  skillsByLocation: Array<{ location: string; skillGains: number }>;
  skillsByWeapon: Array<{ weapon: string; skillGains: number }>;
  lifetimeAttributeGains: Record<string, { gains: number; count: number }>;
  allSkillNames: string[];
  skillGainVariance: number;
  skillValuePerCost: number;
  totalSkillGains: number;
  projectedLifetimeProfit: number;
  sessionsToBreakEven: number | null;
}

export interface AnalyticsLifetimeStats {
  totalLoot: number;
  totalCost: number;
  totalKills: number;
  totalGlobals: number;
  totalHofs: number;
  totalDamage: number;
  totalShotsFired: number;
  totalDuration: number;
  totalSessions: number;
}

export interface AnalyticsFactorSqlData {
  maturityStats: Array<{
    creature: string;
    maturity: string;
    totalKills: number;
    totalCost: number;
    totalLoot: number;
    returnRate: number;
    profit: number;
  }>;
  hourlyHeatmap: Array<{
    dayOfWeek: number;
    hour: number;
    sessions: number;
    avgReturnRate: number;
    avgProfit: number;
  }>;
  killEfficiency: Array<{
    creature: string;
    totalKills: number;
    totalCost: number;
    totalLoot: number;
    avgCostPerKill: number;
    avgLootPerKill: number;
    returnRate: number;
  }>;
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

  analyticsData: {
    performance: AnalyticsPerformanceSqlData | null;
    advanced: AnalyticsAdvancedSqlData | null;
    factors: AnalyticsFactorSqlData | null;
    isLoading: boolean;
    error: string | null;
  };
  analyticsTimeRange: {
    startTime: number | null;
    endTime: number | null;
  };
  analyticsSelectedTags: string[];
  analyticsLifetimeStats: AnalyticsLifetimeStats;
  persistenceError: PersistenceError | null;

  _loadCreatureData: () => Promise<void>;
  fetchAnalyticsData: (
    startTime: number | null,
    endTime: number | null,
    tags?: string[]
  ) => Promise<void>;
  setAnalyticsTimeRange: (startTime: number | null, endTime: number | null) => void;
  setAnalyticsSelectedTags: (tags: string[]) => void;
  fetchLifetimeStats: (
    startTime: number | null,
    endTime: number | null,
    tags?: string[]
  ) => Promise<void>;
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
  deleteSessions: (ids: string[]) => Promise<void>;
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
  clearAllData: () => Promise<boolean>;
  clearPersistenceError: () => void;

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
