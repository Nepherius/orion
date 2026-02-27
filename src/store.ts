import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
} from './types';
import { calculateLoadoutStats } from './utils/loadoutCalculations';

interface HuntStore {
  sessions: HuntSession[];
  activeSessionId: string | null;
  itemDatabase: ItemTemplate[];
  loadouts: Loadout[];
  settings: AppSettings;

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
  addLoot: (sessionId: string, loot: Omit<LootItem, 'id' | 'timestamp'>) => void;
  updateLoot: (sessionId: string, lootId: string, updates: Partial<LootItem>) => void;
  removeLoot: (sessionId: string, lootId: string) => void;

  // Skill actions
  addSkillGain: (sessionId: string, skill: Omit<SkillGain, 'id' | 'timestamp'>) => void;

  // Global actions
  addGlobal: (sessionId: string, global: Omit<Global, 'id' | 'timestamp'>) => void;

  // Combat event actions
  addDamageEvent: (sessionId: string, damage: number, isCritical?: boolean) => void;
  addCombatEvent: (
    sessionId: string,
    eventType: 'miss' | 'dodge' | 'evade' | 'hit' | 'crit' | 'incoming_miss' | 'incoming_evade'
  ) => void;
  addHealingEvent: (sessionId: string, amount: number) => void;
  addDamageTakenEvent: (sessionId: string, damage: number, isCritical?: boolean) => void;

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
  setActiveLoadout: (id: string) => void;
  getActiveLoadout: () => Loadout | null;

  // Settings actions
  updateSettings: (settings: Partial<AppSettings>) => void;

  // Utility functions
  getActiveSession: () => HuntSession | null;
  calculateSessionStats: (sessionId: string) => SessionStats;
}

const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

let syncInitialized = false;
let isApplyingRemoteSync = false;
const storeSyncSourceId = `store-${Math.random().toString(36).slice(2)}`;

type StoreSyncPayload = {
  sourceId: string;
  sessions: HuntSession[];
  activeSessionId: string | null;
  loadouts: Loadout[];
};

const calculateStats = (session: HuntSession): SessionStats => {
  const totalLoot = session.loot.reduce((sum, item) => sum + item.totalValue, 0);
  const totalCost =
    session.ammoCost +
    session.repairCost +
    session.armorDecay +
    session.healingCost +
    session.otherCosts;
  const returns = totalCost > 0 ? (totalLoot / totalCost) * 100 : 0;

  const now = Date.now();
  const basePausedMs = session.totalPausedMs || 0;
  const activePauseMs =
    session.status === 'paused' && session.pausedAt ? now - session.pausedAt : 0;
  const totalPausedMs = basePausedMs + activePauseMs;
  const rawDuration = session.endTime
    ? session.endTime - session.startTime
    : now - session.startTime;
  const duration = Math.max(0, rawDuration - totalPausedMs);

  const misses = session.combatEvents?.filter((e) => e.type === 'miss').length || 0;
  const dodges = session.combatEvents?.filter((e) => e.type === 'dodge').length || 0;
  const evades = session.combatEvents?.filter((e) => e.type === 'evade').length || 0;
  const criticalHits = session.damageEvents?.filter((e) => e.isCritical).length || 0;
  const regularHits = session.damageEvents?.filter((e) => !e.isCritical).length || 0;
  const totalHits = criticalHits + regularHits;
  
  // Shots fired = combat events that actually registered (hits/crits) or were avoided (dodges/evades), not misses
  const shotsFiredCount = totalHits + dodges + evades;

  return {
    kills: 0, // Will be tracked separately
    lootEvents: session.loot.length,
    globals: session.globals.filter((g) => !g.isHoF).length,
    hofs: session.globals.filter((g) => g.isHoF).length,
    totalLoot,
    totalCost,
    returns,
    duration: Math.floor(duration / 1000), // Convert to seconds
    shotsFired: shotsFiredCount,
    damageDealt: session.damageEvents?.reduce((sum, evt) => sum + evt.damage, 0) || 0,
    damageTaken: session.damageTakenEvents?.reduce((sum, evt) => sum + evt.damage, 0) || 0,
    healsUsed: session.healingEvents?.length || 0,
    totalHealing: session.healingEvents?.reduce((sum, evt) => sum + evt.amount, 0) || 0,
    misses,
    dodges,
    evades,
    criticalHits,
    hits: regularHits,
  };
};

export const useHuntStore = create<HuntStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      itemDatabase: [],
      loadouts: [],
      settings: {
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
      },

      createSession: (sessionData) => {
        const newSession: HuntSession = {
          ...sessionData,
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
            kills: 0,
            lootEvents: 0,
            globals: 0,
            hofs: 0,
            totalLoot: 0,
            totalCost: 0,
            returns: 0,
            duration: 0,
            shotsFired: 0,
            damageDealt: 0,
            damageTaken: 0,
            healsUsed: 0,
            totalHealing: 0,
            misses: 0,
            dodges: 0,
            evades: 0,
            criticalHits: 0,
            hits: 0,
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
      },

      deleteSession: (id) => {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
          activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
        }));
      },

      startSession: (id) => {
        set((state) => {
          const now = Date.now();
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
      },

      pauseSession: (id) => {
        const now = Date.now();
        get().updateSession(id, { status: 'paused', pausedAt: now });
      },

      resumeSession: (id) => {
        set((state) => {
          const now = Date.now();
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
      },

      endSession: (id) => {
        set((state) => {
          const now = Date.now();
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
      },

      addLoot: (sessionId, lootData) => {
        const newLoot: LootItem = {
          ...lootData,
          id: generateId(),
          timestamp: Date.now(),
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
      },

      addSkillGain: (sessionId, skillData) => {
        const newSkill: SkillGain = {
          ...skillData,
          id: generateId(),
          timestamp: Date.now(),
        };

        get().updateSession(sessionId, {
          skills: [...(get().sessions.find((s) => s.id === sessionId)?.skills || []), newSkill],
        });
      },

      addGlobal: (sessionId, globalData) => {
        const newGlobal: Global = {
          ...globalData,
          id: generateId(),
          timestamp: Date.now(),
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
      },

      addDamageEvent: (sessionId, damage, isCritical = false) => {
        const newDamageEvent: DamageEvent = {
          id: generateId(),
          damage,
          timestamp: Date.now(),
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
      },

      addCombatEvent: (sessionId, eventType) => {
        // Skip incoming attack events - they're not player shots
        if (eventType === 'incoming_miss' || eventType === 'incoming_evade') {
          return;
        }

        const newCombatEvent: CombatEvent = {
          id: generateId(),
          type: eventType,
          timestamp: Date.now(),
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
            : state.loadouts.find((l) => l.name === session.weapon);

          // Apply shot costs only for player shots (hit/crit/miss/dodge/evade where player attacked)
          const ammoCostPerShot = (loadout?.ammoBurn || 0) / 10000;
          const decayCostPerShot = (loadout?.decay || 0) / 100;

          return {
            sessions: state.sessions.map((s) => {
              if (s.id === sessionId) {
                const updated = {
                  ...s,
                  combatEvents: [...(s.combatEvents || []), newCombatEvent],
                  ammoCost: s.ammoCost + ammoCostPerShot,
                  repairCost: s.repairCost + decayCostPerShot,
                };
                updated.stats = calculateStats(updated);
                return updated;
              }
              return s;
            }),
          };
        });
      },

      addHealingEvent: (sessionId, amount) => {
        const newHealingEvent: HealingEvent = {
          id: generateId(),
          amount,
          timestamp: Date.now(),
        };

        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id === sessionId) {
              const updated = {
                ...s,
                healingEvents: [...(s.healingEvents || []), newHealingEvent],
              };
              updated.stats = calculateStats(updated);
              return updated;
            }
            return s;
          }),
        }));
      },

      addDamageTakenEvent: (sessionId, damage, isCritical = false) => {
        const newDamageTakenEvent: DamageTakenEvent = {
          id: generateId(),
          damage,
          timestamp: Date.now(),
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
      },

      addItemTemplate: (itemData) => {
        const newItem: ItemTemplate = {
          ...itemData,
          id: generateId(),
        };
        set((state) => ({ itemDatabase: [...state.itemDatabase, newItem] }));
      },

      updateItemTemplate: (id, updates) => {
        set((state) => ({
          itemDatabase: state.itemDatabase.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }));
      },

      deleteItemTemplate: (id) => {
        set((state) => ({
          itemDatabase: state.itemDatabase.filter((item) => item.id !== id),
        }));
      },

      // Loadout actions
      createLoadout: (loadoutData) => {
        const newLoadout: Loadout = {
          ...loadoutData,
          id: generateId(),
        };
        set((state) => ({
          loadouts: [newLoadout, ...state.loadouts],
        }));
      },

      updateLoadout: (id, updates) => {
        set((state) => ({
          loadouts: state.loadouts.map((loadout) =>
            loadout.id === id ? { ...loadout, ...updates } : loadout
          ),
        }));
      },

      deleteLoadout: (id) => {
        set((state) => ({
          loadouts: state.loadouts.filter((loadout) => loadout.id !== id),
        }));
      },

      duplicateLoadout: (id) => {
        const loadout = get().loadouts.find((l) => l.id === id);
        if (loadout) {
          const duplicate: Loadout = {
            ...loadout,
            id: generateId(),
            name: `${loadout.name} (Copy)`,
            status: 'inactive',
          };
          set((state) => ({
            loadouts: [duplicate, ...state.loadouts],
          }));
        }
      },

      toggleLoadoutFavorite: (id) => {
        set((state) => ({
          loadouts: state.loadouts.map((loadout) =>
            loadout.id === id ? { ...loadout, favorite: !loadout.favorite } : loadout
          ),
        }));
      },

      setActiveLoadout: (id) => {
        set((state) => ({
          loadouts: state.loadouts.map((loadout) => ({
            ...loadout,
            status: loadout.id === id ? 'active' : 'inactive',
          })),
        }));
      },

      getActiveLoadout: () => {
        const state = get();
        return state.loadouts.find((l) => l.status === 'active') || null;
      },

      updateSettings: (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
        }));
      },

      getActiveSession: () => {
        const state = get();
        return state.sessions.find((s) => s.id === state.activeSessionId) || null;
      },

      calculateSessionStats: (sessionId) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        if (!session) {
          return {
            kills: 0,
            lootEvents: 0,
            globals: 0,
            hofs: 0,
            totalLoot: 0,
            totalCost: 0,
            returns: 0,
            duration: 0,
            shotsFired: 0,
            damageDealt: 0,
            damageTaken: 0,
            healsUsed: 0,
            totalHealing: 0,
            misses: 0,
            dodges: 0,
            evades: 0,
            criticalHits: 0,
            hits: 0,
          };
        }
        return calculateStats(session);
      },
    }),
    {
      name: 'orion-loot-tracker',
      onRehydrateStorage: () => (state) => {
        // Recalculate all loadout stats when store is loaded
        if (state?.loadouts) {
          state.loadouts = state.loadouts.map((loadout) => {
            const stats = calculateLoadoutStats(loadout.weapon, loadout.amplifier, loadout.scope, {
              dmg: loadout.enhancers?.dmg || 0,
              acc: loadout.enhancers?.acc || 0,
              rng: loadout.enhancers?.rng || 0,
              eco: loadout.enhancers?.eco || 0,
            });
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
        }
      },
    }
  )
);

// Setup event listeners for cross-window synchronization
export async function setupStoreSync() {
  if (syncInitialized) {
    return;
  }
  syncInitialized = true;

  // Broadcast relevant store state changes to other windows
  let lastSyncedSnapshot = '';
  useHuntStore.subscribe((state) => {
    if (isApplyingRemoteSync) {
      return;
    }

    const snapshot = {
      sessions: state.sessions,
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
  listen('store-sync', (event: Event<StoreSyncPayload>) => {
    const payload = event.payload;
    if (!payload || payload.sourceId === storeSyncSourceId) {
      return;
    }

    isApplyingRemoteSync = true;
    useHuntStore.setState((prevState) => ({
      ...prevState,
      sessions: payload.sessions,
      activeSessionId: payload.activeSessionId,
      loadouts: payload.loadouts,
    }));
    isApplyingRemoteSync = false;
  }).catch(() => {
    // Silently fail if listen is not available (dev environment)
  });

}

