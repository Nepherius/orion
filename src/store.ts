import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  HuntSession,
  LootItem,
  SkillGain,
  Global,
  ItemTemplate,
  AppSettings,
  SessionStats,
} from './types';

interface HuntStore {
  sessions: HuntSession[];
  activeSessionId: string | null;
  itemDatabase: ItemTemplate[];
  settings: AppSettings;

  // Session actions
  createSession: (
    session: Omit<HuntSession, 'id' | 'stats' | 'loot' | 'skills' | 'globals'>
  ) => void;
  updateSession: (id: string, updates: Partial<HuntSession>) => void;
  deleteSession: (id: string) => void;
  startSession: (id: string) => void;
  pauseSession: (id: string) => void;
  endSession: (id: string) => void;

  // Loot actions
  addLoot: (sessionId: string, loot: Omit<LootItem, 'id' | 'timestamp'>) => void;
  updateLoot: (sessionId: string, lootId: string, updates: Partial<LootItem>) => void;
  removeLoot: (sessionId: string, lootId: string) => void;

  // Skill actions
  addSkillGain: (sessionId: string, skill: Omit<SkillGain, 'id' | 'timestamp'>) => void;

  // Global actions
  addGlobal: (sessionId: string, global: Omit<Global, 'id' | 'timestamp'>) => void;

  // Item database actions
  addItemTemplate: (item: Omit<ItemTemplate, 'id'>) => void;
  updateItemTemplate: (id: string, updates: Partial<ItemTemplate>) => void;
  deleteItemTemplate: (id: string) => void;

  // Settings actions
  updateSettings: (settings: Partial<AppSettings>) => void;

  // Utility functions
  getActiveSession: () => HuntSession | null;
  calculateSessionStats: (sessionId: string) => SessionStats;
}

const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

const calculateStats = (session: HuntSession): SessionStats => {
  const totalLoot = session.loot.reduce((sum, item) => sum + item.totalValue, 0);
  const totalCost =
    session.ammoCost +
    session.repairCost +
    session.armorDecay +
    session.healingCost +
    session.otherCosts;
  const returns = totalCost > 0 ? (totalLoot / totalCost) * 100 : 0;

  const duration = session.endTime
    ? session.endTime - session.startTime
    : Date.now() - session.startTime;

  return {
    kills: 0, // Will be tracked separately
    lootEvents: session.loot.length,
    globals: session.globals.filter((g) => !g.isHoF).length,
    hofs: session.globals.filter((g) => g.isHoF).length,
    totalLoot,
    totalCost,
    returns,
    duration: Math.floor(duration / 1000), // Convert to seconds
  };
};

export const useHuntStore = create<HuntStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      itemDatabase: [],
      settings: {
        playerName: '',
        defaultMarkup: 105,
        autoSave: true,
        overlayEnabled: false,
        theme: 'dark',
      },

      createSession: (sessionData) => {
        const newSession: HuntSession = {
          ...sessionData,
          id: generateId(),
          loot: [],
          skills: [],
          globals: [],
          stats: {
            kills: 0,
            lootEvents: 0,
            globals: 0,
            hofs: 0,
            totalLoot: 0,
            totalCost: 0,
            returns: 0,
            duration: 0,
          },
        };
        set((state) => ({ sessions: [newSession, ...state.sessions] }));
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
          // Pause any active session
          const sessions = state.sessions.map((s) =>
            s.status === 'active' ? { ...s, status: 'paused' as const } : s
          );

          // Start the selected session
          return {
            sessions: sessions.map((s) =>
              s.id === id ? { ...s, status: 'active' as const, startTime: Date.now() } : s
            ),
            activeSessionId: id,
          };
        });
      },

      pauseSession: (id) => {
        get().updateSession(id, { status: 'paused' });
      },

      endSession: (id) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, status: 'completed' as const, endTime: Date.now() } : s
          ),
          activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
        }));
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

        get().updateSession(sessionId, {
          globals: [...(get().sessions.find((s) => s.id === sessionId)?.globals || []), newGlobal],
        });
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
          };
        }
        return calculateStats(session);
      },
    }),
    {
      name: 'orion-hunt-tracker',
    }
  )
);
