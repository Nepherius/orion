import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { emit, listen, type Event } from '@tauri-apps/api/event';
import {
  HuntSession,
  LootItem,
  SkillGain,
  Global,
  DamageEvent,
  CombatEvent,
  HealingEvent,
  DamageTakenEvent,
  ItemTemplate,
  AppSettings,
  SessionStats,
  Loadout,
  Goal,
} from './types';
import { calculateLoadoutStats } from './utils/loadoutCalculations';
import {
  calculateSessionStats as calculateSessionStatsCore,
  emptySessionStats,
  ensureSingleLoadoutPrimary,
} from './core/sessionCore';

interface HuntStore {
  sessions: HuntSession[];
  activeSessionId: string | null;
  itemDatabase: ItemTemplate[];
  loadouts: Loadout[];
  settings: AppSettings;
  goals: Goal[];

  // Goal actions
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;

  // Session actions
  createSession: (
    session: Omit<
      HuntSession,
      | 'id'
      | 'stats'
      | 'loot'
      | 'skills'
      | 'globals'
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
  endSession: (id: string) => void;

  // Loot actions
  addLoot: (
    sessionId: string,
    loot: Omit<LootItem, 'id' | 'timestamp'> & { timestamp?: number }
  ) => void;
  updateLoot: (sessionId: string, lootId: string, updates: Partial<LootItem>) => void;
  removeLoot: (sessionId: string, lootId: string) => void;
  removeLootByName: (sessionId: string, itemName: string) => void;

  // Skill actions
  addSkillGain: (
    sessionId: string,
    skill: Omit<SkillGain, 'id' | 'timestamp'> & { timestamp?: number }
  ) => void;

  // Global actions
  addGlobal: (
    sessionId: string,
    global: Omit<Global, 'id' | 'timestamp'> & { timestamp?: number }
  ) => void;

  // Combat event actions
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
  addHealingEvent: (sessionId: string, amount: number, timestamp?: number) => void;
  addDamageTakenEvent: (
    sessionId: string,
    damage: number,
    isCritical?: boolean,
    timestamp?: number
  ) => void;

  // Item database actions
  addItemTemplate: (item: Omit<ItemTemplate, 'id'>) => void;
  updateItemTemplate: (id: string, updates: Partial<ItemTemplate>) => void;
  deleteItemTemplate: (id: string) => void;

  // Loadout actions
  createLoadout: (loadout: Omit<Loadout, 'id'>) => void;
  updateLoadout: (id: string, updates: Partial<Loadout>) => void;
  deleteLoadout: (id: string) => void;
  duplicateLoadout: (id: string) => void;
  toggleLoadoutFavorite: (id: string) => void;
  setPrimaryLoadout: (id: string) => void;
  getPrimaryLoadout: () => Loadout | null;

  // Settings actions
  updateSettings: (settings: Partial<AppSettings>) => void;
  addToIgnoreList: (itemName: string) => void;
  removeFromIgnoreList: (itemName: string) => void;

  // Utility functions
  getActiveSession: () => HuntSession | null;
  calculateSessionStats: (sessionId: string) => SessionStats;
}

const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

let syncInitialized = false;
let isApplyingRemoteSync = false;
let allowBroadcasting = true; // Start true by default
const storeSyncSourceId = `store-${Math.random().toString(36).slice(2)}`;

type StoreSyncPayload = {
  sourceId: string;
  sessions: HuntSession[];
  activeSessionId: string | null;
  loadouts: Loadout[];
};

type OverlaySessionCommandPayload = {
  sessionId: string;
  command: 'pause' | 'resume' | 'next_loadout' | 'prev_loadout';
};

const calculateStats = (session: HuntSession): SessionStats => calculateSessionStatsCore(session);

const defaultSettings: AppSettings = {
  avatarName: '',
  defaultMarkup: 100,
  autoSave: true,
  theme: 'dark',
  chatLogPath: '',
  autoStartSession: true,
  overlayX: 20,
  overlayY: 20,
  overlayWidth: 750,
  overlayHeight: 56,
  ignoreListItems: [],
};

const safeInvoke = async <T = unknown>(command: string, args?: Record<string, unknown>) => {
  try {
    return (await invoke(command, args)) as T;
  } catch (error) {
    // Log errors so we can see when database operations fail
    console.error(`[DB Error] Command '${command}' failed:`, error);
    return null;
  }
};

const saveJsonSetting = async (key: string, value: unknown) => {
  // eslint-disable-next-line no-console
  console.debug(`[Settings] Saving key '${key}' with value:`, value);
  await safeInvoke('db_set_setting', {
    key,
    value: JSON.stringify(value),
  });
};

const loadJsonSetting = async <T>(key: string): Promise<T | null> => {
  const raw = await safeInvoke<string | null>('db_get_setting', { key });
  if (!raw) {
    // eslint-disable-next-line no-console
    console.debug(`[Settings] loadJsonSetting: No value for key '${key}'`);
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as T;
    // eslint-disable-next-line no-console
    console.debug(`[Settings] loadJsonSetting: Loaded key '${key}' value:`, parsed);
    return parsed;
  } catch {
    console.warn(`[Settings] loadJsonSetting: Failed to parse value for key '${key}'`);
    return null;
  }
};

const persistSessionToDb = async (session: HuntSession) => {
  await safeInvoke('db_create_session', {
    params: {
      uuid: session.id,
      name: session.name,
      weapon: session.weapon,
      armor: session.armor ?? null,
      location: session.location ?? null,
      creature: session.creature ?? 'Unknown',
      start_time: session.startTime,
      status: session.status,
      loadout_id: session.loadoutId ?? null,
      notes: session.notes,
      ammo_cost: session.ammoCost,
      weapon_decay: session.weaponDecay,
      healing_cost: session.healingCost,
      other_costs: session.otherCosts,
    },
  });
};

const updateSessionInDb = async (id: string, updates: Partial<HuntSession>) => {
  await safeInvoke('db_update_session', {
    params: {
      uuid: id,
      name: updates.name,
      weapon: updates.weapon,
      armor: updates.armor,
      location: updates.location,
      creature: updates.creature,
      end_time: updates.endTime,
      status: updates.status,
      paused_at: updates.pausedAt,
      total_paused_ms: updates.totalPausedMs,
      loadout_id: updates.loadoutId,
      notes: updates.notes,
      ammo_cost: updates.ammoCost,
      weapon_decay: updates.weaponDecay,
      healing_cost: updates.healingCost,
      other_costs: updates.otherCosts,
    },
  });
};

const hydrateSessionEvents = async (session: HuntSession): Promise<HuntSession> => {
  const [loot, skills, globals, damageEvents, combatEvents, healingEvents, damageTakenEvents] =
    await Promise.all([
      safeInvoke<LootItem[]>('db_get_session_loot', { sessionUuid: session.id }),
      safeInvoke<SkillGain[]>('db_get_session_skills', { sessionUuid: session.id }),
      safeInvoke<Global[]>('db_get_session_globals', { sessionUuid: session.id }),
      safeInvoke<DamageEvent[]>('db_get_session_damage_events', { sessionUuid: session.id }),
      safeInvoke<CombatEvent[]>('db_get_session_combat_events', { sessionUuid: session.id }),
      safeInvoke<HealingEvent[]>('db_get_session_healing_events', { sessionUuid: session.id }),
      safeInvoke<DamageTakenEvent[]>('db_get_session_damage_taken_events', {
        sessionUuid: session.id,
      }),
    ]);

  const hydrated: HuntSession = {
    ...session,
    loot: loot ?? [],
    skills: skills ?? [],
    globals: globals ?? [],
    damageEvents: damageEvents ?? [],
    combatEvents: combatEvents ?? [],
    healingEvents: healingEvents ?? [],
    damageTakenEvents: damageTakenEvents ?? [],
    stats: emptySessionStats(),
  };
  // Recalculate stats from loaded data so kills (and everything else) are accurate
  hydrated.stats = calculateSessionStatsCore(hydrated);
  return hydrated;
};

export const useHuntStore = create<HuntStore>()((set, get) => ({
  sessions: [],
  activeSessionId: null,
  itemDatabase: [],
  loadouts: [],
  settings: defaultSettings,
  goals: [],

  addGoal: (goalData) => {
    set((state) => {
      const newGoal: Goal = {
        ...goalData,
        id: generateId(),
        createdAt: Date.now(),
      };
      const goals = [...(state.goals || []), newGoal];
      void saveJsonSetting('goals', goals);
      return { goals };
    });
  },
  updateGoal: (id, updates) => {
    set((state) => {
      const goals = (state.goals || []).map((g) => (g.id === id ? { ...g, ...updates } : g));
      void saveJsonSetting('goals', goals);
      return { goals };
    });
  },
  deleteGoal: (id) => {
    set((state) => {
      const goals = (state.goals || []).filter((g) => g.id !== id);
      void saveJsonSetting('goals', goals);
      return { goals };
    });
  },

  createSession: (sessionData) => {
    const newSession: HuntSession = {
      ...sessionData,
      creature: sessionData.creature || 'Unknown',
      id: generateId(),
      pausedAt: undefined,
      totalPausedMs: 0,
      loot: [],
      skills: [],
      globals: [],
      damageEvents: [],
      combatEvents: [],
      healingEvents: [],
      damageTakenEvents: [],
      stats: {
        ...emptySessionStats(),
      },
    };
    set((state) => {
      // If new session should start immediately, pause existing active session(s)
      if (newSession.status === 'active') {
        const now = Date.now();
        const sessions = state.sessions.map((s) =>
          s.status === 'active' ? { ...s, status: 'paused' as const, pausedAt: now } : s
        );
        return { sessions: [newSession, ...sessions], activeSessionId: newSession.id };
      }

      return { sessions: [newSession, ...state.sessions] };
    });

    void persistSessionToDb(newSession);
    if (newSession.status === 'active') {
      void saveJsonSetting('activeSessionId', newSession.id);
    }
  },

  updateSession: (id, updates) => {
    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id === id) {
          const updated = { ...session, ...updates };
          updated.stats = calculateStats(updated);
          return updated;
        }
        return session;
      }),
    }));

    void updateSessionInDb(id, updates);
  },

  deleteSession: (id) => {
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
    }));

    void safeInvoke('db_delete_session', { uuid: id });
    if (get().activeSessionId === null) {
      void saveJsonSetting('activeSessionId', null);
    }
  },

  startSession: (id) => {
    const now = Date.now();
    set((state) => {
      // Pause any active session
      const sessions = state.sessions.map((s) =>
        s.status === 'active' ? { ...s, status: 'paused' as const, pausedAt: now } : s
      );

      // Start the selected session
      return {
        sessions: sessions.map((s) =>
          s.id === id
            ? {
                ...s,
                status: 'active' as const,
                startTime: now,
                pausedAt: undefined,
                totalPausedMs: 0,
              }
            : s
        ),
        activeSessionId: id,
      };
    });
    const currentlyActive = get().sessions.find((s) => s.id === id);
    if (currentlyActive) {
      void updateSessionInDb(id, {
        status: 'active',
        startTime: now,
        pausedAt: undefined,
        totalPausedMs: 0,
      });
    }
    void saveJsonSetting('activeSessionId', id);
  },

  pauseSession: (id) => {
    const now = Date.now();
    const session = get().sessions.find((s) => s.id === id);
    if (session) {
      get().updateSession(id, { status: 'paused', pausedAt: now });
      void updateSessionInDb(id, {
        status: 'paused',
        pausedAt: now,
        ammoCost: session.ammoCost,
        weaponDecay: session.weaponDecay,
        healingCost: session.healingCost,
        otherCosts: session.otherCosts,
      });
    }
  },

  resumeSession: (id) => {
    const now = Date.now();
    set((state) => {
      // Pause any active session
      const sessions = state.sessions.map((s) =>
        s.status === 'active' ? { ...s, status: 'paused' as const, pausedAt: now } : s
      );

      // Resume the selected session
      return {
        sessions: sessions.map((s) =>
          s.id === id
            ? {
                ...s,
                status: 'active' as const,
                totalPausedMs: (s.totalPausedMs || 0) + (s.pausedAt ? now - s.pausedAt : 0),
                pausedAt: undefined,
              }
            : s
        ),
        activeSessionId: id,
      };
    });
    const resumed = get().sessions.find((s) => s.id === id);
    if (resumed) {
      void updateSessionInDb(id, {
        status: 'active',
        pausedAt: undefined,
        totalPausedMs: resumed.totalPausedMs,
        ammoCost: resumed.ammoCost,
        weaponDecay: resumed.weaponDecay,
        healingCost: resumed.healingCost,
        otherCosts: resumed.otherCosts,
      });
    }
    void saveJsonSetting('activeSessionId', id);
  },

  endSession: (id) => {
    const now = Date.now();
    set((state) => {
      return {
        sessions: state.sessions.map((s) =>
          s.id === id
            ? {
                ...s,
                status: 'completed' as const,
                endTime: now,
                totalPausedMs: (s.totalPausedMs || 0) + (s.pausedAt ? now - s.pausedAt : 0),
                pausedAt: undefined,
              }
            : s
        ),
        activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
      };
    });
    const ended = get().sessions.find((s) => s.id === id);
    if (ended) {
      void updateSessionInDb(id, {
        status: 'completed',
        endTime: now,
        totalPausedMs: ended.totalPausedMs,
        pausedAt: undefined,
        // Flush running totals back to DB on end
        ammoCost: ended.ammoCost,
        weaponDecay: ended.weaponDecay,
        healingCost: ended.healingCost,
        otherCosts: ended.otherCosts,
      });
    }
    if (get().activeSessionId === null) {
      void saveJsonSetting('activeSessionId', null);
    }
  },

  addLoot: (sessionId, lootData) => {
    const newLoot: LootItem = {
      ...lootData,
      id: generateId(),
      timestamp: lootData.timestamp || Date.now(),
      totalValue: lootData.value * (lootData.markup / 100) * lootData.quantity,
    };

    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id === sessionId) {
          const updated = { ...session, loot: [...session.loot, newLoot] };
          updated.stats = calculateStats(updated);
          return updated;
        }
        return session;
      }),
    }));

    void safeInvoke('db_add_loot', {
      params: {
        uuid: newLoot.id,
        session_uuid: sessionId,
        name: newLoot.name,
        quantity: newLoot.quantity,
        value: newLoot.value,
        markup: newLoot.markup,
        total_value: newLoot.totalValue,
        timestamp: newLoot.timestamp,
      },
    });
  },

  updateLoot: (sessionId, lootId, updates) => {
    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id === sessionId) {
          const updated = {
            ...session,
            loot: session.loot.map((item) => {
              if (item.id === lootId) {
                const updatedItem = { ...item, ...updates };
                updatedItem.totalValue =
                  updatedItem.value * (updatedItem.markup / 100) * updatedItem.quantity;
                return updatedItem;
              }
              return item;
            }),
          };
          updated.stats = calculateStats(updated);
          return updated;
        }
        return session;
      }),
    }));

    void safeInvoke('db_update_loot', {
      uuid: lootId,
      name: updates.name,
      quantity: updates.quantity,
      value: updates.value,
      markup: updates.markup,
      totalValue: updates.totalValue,
    });
  },

  removeLoot: (sessionId, lootId) => {
    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id === sessionId) {
          const updated = {
            ...session,
            loot: session.loot.filter((item) => item.id !== lootId),
          };
          updated.stats = calculateStats(updated);
          return updated;
        }
        return session;
      }),
    }));

    void safeInvoke('db_delete_loot', { uuid: lootId });
  },

  removeLootByName: (sessionId, itemName) => {
    let itemsToDelete: LootItem[] = [];

    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id === sessionId) {
          itemsToDelete = session.loot.filter((item) => item.name === itemName);
          const updated = {
            ...session,
            loot: session.loot.filter((item) => item.name !== itemName),
          };
          updated.stats = calculateStats(updated);
          return updated;
        }
        return session;
      }),
    }));

    itemsToDelete.forEach((item) => {
      void safeInvoke('db_delete_loot', { uuid: item.id });
    });
  },

  addSkillGain: (sessionId, skillData) => {
    const newSkill: SkillGain = {
      ...skillData,
      id: generateId(),
      timestamp: skillData.timestamp || Date.now(),
    };

    get().updateSession(sessionId, {
      skills: [...(get().sessions.find((s) => s.id === sessionId)?.skills || []), newSkill],
    });

    void safeInvoke('db_add_skill', {
      uuid: newSkill.id,
      sessionUuid: sessionId,
      skillName: newSkill.skillName,
      gainAmount: newSkill.gainAmount,
      timestamp: newSkill.timestamp,
    });
  },

  addGlobal: (sessionId, globalData) => {
    const newGlobal: Global = {
      ...globalData,
      id: generateId(),
      timestamp: globalData.timestamp || Date.now(),
    };

    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id === sessionId) {
          const updated = { ...session, globals: [...session.globals, newGlobal] };
          updated.stats = calculateStats(updated);
          return updated;
        }
        return session;
      }),
    }));

    void safeInvoke('db_add_global', {
      uuid: newGlobal.id,
      sessionUuid: sessionId,
      creature: newGlobal.creature,
      value: newGlobal.value,
      isHof: newGlobal.isHoF,
      timestamp: newGlobal.timestamp,
    });
  },

  addDamageEvent: (sessionId, damage, isCritical = false, timestamp?: number) => {
    const newDamageEvent: DamageEvent = {
      id: generateId(),
      damage,
      timestamp: timestamp || Date.now(),
      isCritical,
    };

    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id === sessionId) {
          const updated = {
            ...s,
            damageEvents: [...(s.damageEvents || []), newDamageEvent],
          };
          updated.stats = calculateStats(updated);
          return updated;
        }
        return s;
      }),
    }));

    void safeInvoke('db_add_damage_event', {
      uuid: newDamageEvent.id,
      sessionUuid: sessionId,
      damage: newDamageEvent.damage,
      isCritical: newDamageEvent.isCritical,
      timestamp: newDamageEvent.timestamp,
    });
  },

  addCombatEvent: (sessionId, eventType, timestamp?: number) => {
    const newCombatEvent: CombatEvent = {
      id: generateId(),
      type: eventType,
      timestamp: timestamp || Date.now(),
    };

    set((state) => {
      const session = state.sessions.find((s) => s.id === sessionId);
      if (!session) {
        console.warn('Session not found:', sessionId);
        return state;
      }

      // Find loadout by matching loadoutId or weapon name
      const loadout = session.loadoutId
        ? state.loadouts.find((l) => l.id === session.loadoutId)
        : state.loadouts.find(
            (l) => l.weapon?.Name === session.weapon || l.name === session.weapon
          );

      // Apply shot costs only for player shots (hit/crit/player_miss/enemy_dodge/enemy_evade)
      const isPlayerAttack = ['hit', 'crit', 'player_miss', 'enemy_dodge', 'enemy_evade'].includes(
        eventType
      );
      const ammoCostPerShot = isPlayerAttack ? (loadout?.ammoBurn || 0) / 10000 : 0;
      const decayCostPerShot = isPlayerAttack ? (loadout?.decay || 0) / 100 : 0;

      return {
        sessions: state.sessions.map((s) => {
          if (s.id === sessionId) {
            const updated = {
              ...s,
              combatEvents: [...(s.combatEvents || []), newCombatEvent],
              ammoCost: s.ammoCost + ammoCostPerShot,
              weaponDecay: s.weaponDecay + decayCostPerShot,
            };
            updated.stats = calculateStats(updated);
            return updated;
          }
          return s;
        }),
      };
    });

    void safeInvoke('db_add_combat_event', {
      uuid: newCombatEvent.id,
      sessionUuid: sessionId,
      eventType: newCombatEvent.type,
      timestamp: newCombatEvent.timestamp,
    });

    // Also save the accumulated ammo and decay costs to the session summary
    const updatedSession = get().sessions.find((s) => s.id === sessionId);
    if (updatedSession) {
      void updateSessionInDb(sessionId, {
        ammoCost: updatedSession.ammoCost,
        weaponDecay: updatedSession.weaponDecay,
      });
    }
  },

  addHealingEvent: (sessionId, amount, timestamp?: number) => {
    const newHealingEvent: HealingEvent = {
      id: generateId(),
      amount,
      timestamp: timestamp || Date.now(),
    };

    set((state) => {
      const session = state.sessions.find((s) => s.id === sessionId);
      if (!session) {
        return state;
      }

      const loadout = session.loadoutId
        ? state.loadouts.find((l) => l.id === session.loadoutId)
        : state.loadouts.find(
            (l) => l.weapon?.Name === session.weapon || l.name === session.weapon
          );
      const healCostPerUse = loadout?.medicalMECost || 0;

      return {
        sessions: state.sessions.map((s) => {
          if (s.id === sessionId) {
            const updated = {
              ...s,
              healingEvents: [...(s.healingEvents || []), newHealingEvent],
              healingCost: s.healingCost + healCostPerUse,
            };
            updated.stats = calculateStats(updated);
            return updated;
          }
          return s;
        }),
      };
    });

    void safeInvoke('db_add_healing_event', {
      uuid: newHealingEvent.id,
      sessionUuid: sessionId,
      amount: newHealingEvent.amount,
      timestamp: newHealingEvent.timestamp,
    });

    const updatedSession = get().sessions.find((s) => s.id === sessionId);
    if (updatedSession) {
      void updateSessionInDb(sessionId, {
        healingCost: updatedSession.healingCost,
      });
    }
  },

  addDamageTakenEvent: (sessionId, damage, isCritical = false, timestamp?: number) => {
    const newDamageTakenEvent: DamageTakenEvent = {
      id: generateId(),
      damage,
      timestamp: timestamp || Date.now(),
      isCritical,
    };

    set((state) => ({
      sessions: state.sessions.map((s) => {
        if (s.id === sessionId) {
          const updated = {
            ...s,
            damageTakenEvents: [...(s.damageTakenEvents || []), newDamageTakenEvent],
          };
          updated.stats = calculateStats(updated);
          return updated;
        }
        return s;
      }),
    }));

    void safeInvoke('db_add_damage_taken_event', {
      uuid: newDamageTakenEvent.id,
      sessionUuid: sessionId,
      damage: newDamageTakenEvent.damage,
      isCritical: newDamageTakenEvent.isCritical,
      timestamp: newDamageTakenEvent.timestamp,
    });
  },

  addItemTemplate: (itemData) => {
    const newItem: ItemTemplate = {
      ...itemData,
      id: generateId(),
    };
    set((state) => {
      const itemDatabase = [...state.itemDatabase, newItem];
      void saveJsonSetting('itemDatabase', itemDatabase);
      return { itemDatabase };
    });
  },

  updateItemTemplate: (id, updates) => {
    set((state) => ({
      itemDatabase: (() => {
        const itemDatabase = state.itemDatabase.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        );
        void saveJsonSetting('itemDatabase', itemDatabase);
        return itemDatabase;
      })(),
    }));
  },

  deleteItemTemplate: (id) => {
    set((state) => ({
      itemDatabase: (() => {
        const itemDatabase = state.itemDatabase.filter((item) => item.id !== id);
        void saveJsonSetting('itemDatabase', itemDatabase);
        return itemDatabase;
      })(),
    }));
  },

  // Loadout actions
  createLoadout: (loadoutData) => {
    const newLoadout: Loadout = {
      ...loadoutData,
      id: generateId(),
    };
    set((state) => {
      const loadouts = ensureSingleLoadoutPrimary([newLoadout, ...state.loadouts]);
      void saveJsonSetting('loadouts', loadouts);
      return { loadouts };
    });
  },

  updateLoadout: (id, updates) => {
    set((state) => ({
      loadouts: (() => {
        const loadouts = state.loadouts.map((loadout) =>
          loadout.id === id ? { ...loadout, ...updates } : loadout
        );
        void saveJsonSetting('loadouts', loadouts);
        return loadouts;
      })(),
    }));
  },

  deleteLoadout: (id) => {
    set((state) => ({
      loadouts: (() => {
        const loadouts = ensureSingleLoadoutPrimary(
          state.loadouts.filter((loadout) => loadout.id !== id)
        );
        void saveJsonSetting('loadouts', loadouts);
        return loadouts;
      })(),
    }));
  },

  duplicateLoadout: (id) => {
    const loadout = get().loadouts.find((l) => l.id === id);
    if (loadout) {
      const duplicate: Loadout = {
        ...loadout,
        id: generateId(),
        name: `${loadout.name} (Copy)`,
        isPrimary: false,
      };
      set((state) => {
        const loadouts = [duplicate, ...state.loadouts];
        void saveJsonSetting('loadouts', loadouts);
        return { loadouts };
      });
    }
  },

  toggleLoadoutFavorite: (id) => {
    set((state) => ({
      loadouts: (() => {
        const loadouts = state.loadouts.map((loadout) =>
          loadout.id === id ? { ...loadout, favorite: !loadout.favorite } : loadout
        );
        void saveJsonSetting('loadouts', loadouts);
        return loadouts;
      })(),
    }));
  },

  setPrimaryLoadout: (id) => {
    set((state) => ({
      loadouts: (() => {
        const loadouts = state.loadouts.map((loadout) => ({
          ...loadout,
          isPrimary: loadout.id === id,
        }));
        void saveJsonSetting('loadouts', loadouts);
        return loadouts;
      })(),
    }));
  },

  getPrimaryLoadout: () => {
    const state = get();
    return state.loadouts.find((l) => l.isPrimary) || null;
  },

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
}));

let dbStoreInitialized = false;

export async function initializeStoreFromDb() {
  // Allow re-initialization if store is empty (page refresh, etc)
  const currentState = useHuntStore.getState();
  if (dbStoreInitialized && currentState.settings.avatarName) {
    return;
  }
  dbStoreInitialized = true;

  const [
    sessionRows,
    storedSettings,
    storedLoadouts,
    storedItemDatabase,
    storedActiveSessionId,
    storedGoals,
  ] = await Promise.all([
    safeInvoke<Array<Partial<HuntSession>>>('db_get_all_sessions_summary'),
    loadJsonSetting<AppSettings>('settings'),
    loadJsonSetting<Loadout[]>('loadouts'),
    loadJsonSetting<ItemTemplate[]>('itemDatabase'),
    loadJsonSetting<string | null>('activeSessionId'),
    loadJsonSetting<Goal[]>('goals'),
  ]);
  // eslint-disable-next-line no-console
  console.debug('[Settings] Loaded settings from DB:', storedSettings);

  const sessions = await Promise.all(
    (sessionRows ?? []).map(async (row) => {
      const session: HuntSession = {
        id: String(row.id ?? ''),
        name: row.name ?? 'Session',
        startTime: Number(row.startTime ?? Date.now()),
        endTime: row.endTime ? Number(row.endTime) : undefined,
        status: (row.status as HuntSession['status']) ?? 'completed',
        pausedAt: row.pausedAt ? Number(row.pausedAt) : undefined,
        totalPausedMs: row.totalPausedMs ? Number(row.totalPausedMs) : 0,
        weapon: row.weapon ?? '',
        armor: row.armor,
        location: row.location,
        creature: row.creature || row.name || 'Unknown',
        loot: [],
        skills: [],
        globals: [],
        damageEvents: [],
        combatEvents: [],
        healingEvents: [],
        damageTakenEvents: [],
        notes: row.notes ?? '',
        loadoutId: row.loadoutId,
        ammoCost: Number(row.ammoCost ?? 0),
        weaponDecay: Number(row.weaponDecay ?? 0),
        healingCost: Number(row.healingCost ?? 0),
        otherCosts: Number(row.otherCosts ?? 0),
        stats: {
          ...emptySessionStats(),
        },
      };
      return hydrateSessionEvents(session);
    })
  );

  const hydratedLoadouts = (storedLoadouts ?? []).map((loadout) => {
    const stats = calculateLoadoutStats(
      loadout.weapon,
      loadout.amplifier,
      loadout.scope,
      loadout.sight,
      loadout.sight2,
      loadout.absorber
    );
    return {
      ...loadout,
      costPerShot: stats.costPerShot,
      dpp: stats.dpp,
      totalDamage: stats.totalDamage,
      range: stats.range,
      criticalChance: stats.criticalChance,
      hitRate: stats.hitRate,
      effectiveDamage: stats.effectiveDamage,
      efficiency: stats.efficiency,
      decay: stats.decay,
      ammoBurn: stats.ammoBurn,
      totalUses: stats.totalUses,
    };
  });

  const normalizedHydratedLoadouts = ensureSingleLoadoutPrimary(hydratedLoadouts);

  useHuntStore.setState((prev) => ({
    ...prev,
    sessions,
    activeSessionId:
      storedActiveSessionId ?? sessions.find((s) => s.status === 'active')?.id ?? null,
    settings: storedSettings ?? defaultSettings,
    loadouts: normalizedHydratedLoadouts,
    itemDatabase: storedItemDatabase ?? [],
    goals: storedGoals ?? [],
  }));
}

// Setup event listeners for cross-window synchronization
export async function setupStoreSync(delayBroadcastMs = 0) {
  if (syncInitialized) {
    return;
  }
  syncInitialized = true;

  // Optionally delay broadcasting (for overlay to load initial state from DB first)
  if (delayBroadcastMs > 0) {
    allowBroadcasting = false;
    setTimeout(() => {
      allowBroadcasting = true;
    }, delayBroadcastMs);
  }

  // Broadcast relevant store state changes to other windows
  let lastSyncedSnapshot = '';
  const unsubscribe = useHuntStore.subscribe((state) => {
    if (isApplyingRemoteSync || !allowBroadcasting) {
      return;
    }

    // The overlay window only needs session stats, weapon name, and timers.
    const strippedSessions = state.sessions.map((s) => ({
      ...s,
      loot: [],
      skills: [],
      globals: [],
      damageEvents: [],
      combatEvents: [],
      healingEvents: [],
      damageTakenEvents: [],
      notes: '',
    }));

    const snapshot = {
      sessions: strippedSessions,
      activeSessionId: state.activeSessionId,
      loadouts: state.loadouts,
    };
    const serialized = JSON.stringify(snapshot);

    if (serialized === lastSyncedSnapshot) {
      return;
    }

    lastSyncedSnapshot = serialized;
    const payload: StoreSyncPayload = {
      sourceId: storeSyncSourceId,
      ...snapshot,
    };

    emit('store-sync', payload).catch(() => {
      // Silently fail if emit is not available (dev environment)
    });
  });

  // Listen for full store sync events from other windows
  const unlistenSync = await listen('store-sync', (event: Event<StoreSyncPayload>) => {
    const payload = event.payload;
    if (!payload || payload.sourceId === storeSyncSourceId) {
      return;
    }

    const normalizedLoadouts = ensureSingleLoadoutPrimary(payload.loadouts);

    isApplyingRemoteSync = true;
    useHuntStore.setState((prevState) => ({
      ...prevState,
      sessions: payload.sessions,
      activeSessionId: payload.activeSessionId,
      loadouts: normalizedLoadouts,
    }));
    isApplyingRemoteSync = false;
  }).catch(() => {
    // Silently fail if listen is not available (dev environment)
    return () => {};
  });

  // Listen for state request events (when a new window opens and needs current state)
  const unlistenSyncRequest = await listen('store-sync-request', () => {
    // Immediately broadcast current state to the requesting window
    const state = useHuntStore.getState();

    const strippedSessions = state.sessions.map((s) => ({
      ...s,
      loot: [],
      skills: [],
      globals: [],
      damageEvents: [],
      combatEvents: [],
      healingEvents: [],
      damageTakenEvents: [],
      notes: '',
    }));

    const payload: StoreSyncPayload = {
      sourceId: storeSyncSourceId,
      sessions: strippedSessions,
      activeSessionId: state.activeSessionId,
      loadouts: state.loadouts,
    };
    emit('store-sync', payload).catch(() => {
      // Silently fail if emit is not available
    });
  }).catch(() => {
    // Silently fail if listen is not available (dev environment)
    return () => {};
  });

  // Listen for overlay session commands (overlay is read-only except pause/resume controls)
  const unlistenOverlayCommand = await listen(
    'overlay-session-command',
    (event: Event<OverlaySessionCommandPayload>) => {
      const payload = event.payload;
      if (!payload?.sessionId) {
        return;
      }

      const state = useHuntStore.getState();
      if (payload.command === 'pause') {
        state.pauseSession(payload.sessionId);
        return;
      }

      if (payload.command === 'resume') {
        state.resumeSession(payload.sessionId);
        return;
      }

      if (payload.command === 'next_loadout' || payload.command === 'prev_loadout') {
        const session = state.sessions.find((s) => s.id === payload.sessionId);
        if (!session || state.loadouts.length === 0) {
          return;
        }

        const currentIndex = session.loadoutId
          ? state.loadouts.findIndex((l) => l.id === session.loadoutId)
          : state.loadouts.findIndex((l) => l.name === session.weapon);

        const nextIndex =
          payload.command === 'next_loadout'
            ? currentIndex >= 0
              ? (currentIndex + 1) % state.loadouts.length
              : 0
            : currentIndex >= 0
              ? (currentIndex - 1 + state.loadouts.length) % state.loadouts.length
              : state.loadouts.length - 1;

        const selectedLoadout = state.loadouts[nextIndex];
        state.updateSession(payload.sessionId, {
          weapon: selectedLoadout.name,
          loadoutId: selectedLoadout.id,
        });
      }
    }
  ).catch(() => {
    // Silently fail if listen is not available (dev environment)
    return () => {};
  });

  // If this window is loading with a delay (overlay), request current state from other windows
  let requestInterval: number | undefined;
  if (delayBroadcastMs > 0) {
    // Initial request shortly after opening
    setTimeout(() => {
      emit('store-sync-request', { sourceId: storeSyncSourceId }).catch(() => {
        // Silently fail if emit is not available
      });
    }, 100);

    // Periodically request state if we don't have an active session
    // This handles edge cases: initial request fails, main window starts session
    // after overlay opens, or sync is lost for any reason
    requestInterval = window.setInterval(() => {
      const state = useHuntStore.getState();
      if (!state.activeSessionId) {
        emit('store-sync-request', { sourceId: storeSyncSourceId }).catch(() => {
          // Silently fail if emit is not available
        });
      }
    }, 2000); // Check every 2 seconds
  }

  // Return cleanup function for proper teardown
  return () => {
    unsubscribe();
    unlistenSync();
    unlistenSyncRequest();
    unlistenOverlayCommand();
    if (requestInterval !== undefined) {
      window.clearInterval(requestInterval);
    }
  };
}
