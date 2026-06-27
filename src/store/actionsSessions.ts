import { emptySessionStats } from '../core/sessionCore';
import type { HuntSession } from '../types';
import type { HuntStore, StoreGetState, StoreSetState } from './storeTypes';
import {
  calculateStats,
  generateId,
  persistSessionToDb,
  saveJsonSetting,
  safeInvoke,
  updateSessionInDb,
} from './shared';

export const createSessionActions = (
  set: StoreSetState,
  get: StoreGetState
): Pick<
  HuntStore,
  | 'createSession'
  | 'updateSession'
  | 'deleteSession'
  | 'deleteSessions'
  | 'startSession'
  | 'pauseSession'
  | 'resumeSession'
  | 'endSession'
> => {
  const deleteSessionsFromStore = async (ids: string[]) => {
    const uniqueIds = Array.from(new Set(ids)).filter(Boolean);
    if (uniqueIds.length === 0) return;

    const idsToDelete = new Set(uniqueIds);
    const shouldClearActiveSession = idsToDelete.has(get().activeSessionId ?? '');

    set((state) => ({
      sessions: state.sessions.filter((s) => !idsToDelete.has(s.id)),
      activeSessionId: shouldClearActiveSession ? null : state.activeSessionId,
    }));

    await Promise.all(uniqueIds.map((id) => safeInvoke('db_delete_session', { uuid: id })));
    if (shouldClearActiveSession) {
      await saveJsonSetting('activeSessionId', null);
    }
  };

  return {
    createSession: (sessionData) => {
      const now = Date.now();
      const selectedLoadout = sessionData.loadoutId
        ? get().loadouts.find((loadout) => loadout.id === sessionData.loadoutId)
        : undefined;
      const newSession: HuntSession = {
        ...sessionData,
        creature: sessionData.creature || 'Unknown',
        weaponEfficiencySnapshot:
          sessionData.weaponEfficiencySnapshot ?? selectedLoadout?.efficiency,
        dppSnapshot: sessionData.dppSnapshot ?? selectedLoadout?.dpp,
        loadoutNameSnapshot: sessionData.loadoutNameSnapshot ?? selectedLoadout?.name,
        id: generateId(),
        pausedAt: undefined,
        totalPausedMs: 0,
        loot: [],
        skills: [],
        globals: [],
        kills: [],
        damageEvents: [],
        combatEvents: [],
        healingEvents: [],
        damageTakenEvents: [],
        stats: {
          ...emptySessionStats(),
        },
      };
      const sessionsToPause =
        newSession.status === 'active' ? get().sessions.filter((s) => s.status === 'active') : [];

      set((state) => {
        if (newSession.status === 'active') {
          const sessions = state.sessions.map((s) =>
            s.status === 'active' ? { ...s, status: 'paused' as const, pausedAt: now } : s
          );
          return { sessions: [newSession, ...sessions], activeSessionId: newSession.id };
        }

        return { sessions: [newSession, ...state.sessions] };
      });

      void persistSessionToDb(newSession);
      if (newSession.status === 'active') {
        sessionsToPause.forEach((session) => {
          void updateSessionInDb(session.id, { status: 'paused', pausedAt: now });
        });
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
      void deleteSessionsFromStore([id]);
    },

    deleteSessions: deleteSessionsFromStore,

    startSession: (id) => {
      const now = Date.now();
      const sessionToStart = get().sessions.find((session) => session.id === id);
      const selectedLoadout = sessionToStart?.loadoutId
        ? get().loadouts.find((loadout) => loadout.id === sessionToStart.loadoutId)
        : undefined;
      const sessionsToPause = get().sessions.filter((s) => s.status === 'active' && s.id !== id);
      set((state) => {
        const sessions = state.sessions.map((s) =>
          s.status === 'active' ? { ...s, status: 'paused' as const, pausedAt: now } : s
        );

        return {
          sessions: sessions.map((s) =>
            s.id === id
              ? {
                  ...s,
                  status: 'active' as const,
                  startTime: now,
                  pausedAt: undefined,
                  totalPausedMs: 0,
                  weaponEfficiencySnapshot:
                    s.weaponEfficiencySnapshot ?? selectedLoadout?.efficiency,
                  dppSnapshot: s.dppSnapshot ?? selectedLoadout?.dpp,
                  loadoutNameSnapshot: s.loadoutNameSnapshot ?? selectedLoadout?.name,
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
          weaponEfficiencySnapshot:
            currentlyActive.weaponEfficiencySnapshot ?? selectedLoadout?.efficiency,
          dppSnapshot: currentlyActive.dppSnapshot ?? selectedLoadout?.dpp,
          loadoutNameSnapshot: currentlyActive.loadoutNameSnapshot ?? selectedLoadout?.name,
        });
      }
      sessionsToPause.forEach((session) => {
        void updateSessionInDb(session.id, { status: 'paused', pausedAt: now });
      });
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
      const sessionsToPause = get().sessions.filter((s) => s.status === 'active' && s.id !== id);

      const pausedGapForResume = (session: HuntSession): number => {
        if (session.pausedAt) {
          return Math.max(0, now - session.pausedAt);
        }

        if (session.status === 'completed') {
          if (session.endTime) {
            return Math.max(0, now - session.endTime);
          }

          if (session.stats.duration > 0) {
            const targetPausedMs = now - session.startTime - session.stats.duration * 1000;
            return Math.max(0, targetPausedMs - (session.totalPausedMs || 0));
          }
        }

        return 0;
      };

      set((state) => {
        const sessions = state.sessions.map((s) =>
          s.status === 'active' ? { ...s, status: 'paused' as const, pausedAt: now } : s
        );

        return {
          sessions: sessions.map((s) => {
            if (s.id !== id) {
              return s;
            }

            const resumed = {
              ...s,
              status: 'active' as const,
              endTime: undefined,
              totalPausedMs: (s.totalPausedMs || 0) + pausedGapForResume(s),
              pausedAt: undefined,
            };
            return {
              ...resumed,
              stats: calculateStats(resumed),
            };
          }),
          activeSessionId: id,
        };
      });

      const resumed = get().sessions.find((s) => s.id === id);
      if (resumed) {
        void updateSessionInDb(id, {
          status: 'active',
          endTime: undefined,
          pausedAt: undefined,
          totalPausedMs: resumed.totalPausedMs,
          ammoCost: resumed.ammoCost,
          weaponDecay: resumed.weaponDecay,
          healingCost: resumed.healingCost,
          otherCosts: resumed.otherCosts,
        });
      }
      sessionsToPause.forEach((session) => {
        void updateSessionInDb(session.id, { status: 'paused', pausedAt: now });
      });
      void saveJsonSetting('activeSessionId', id);
    },

    endSession: async (id) => {
      await get()._finalizePendingKill(id);

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
  };
};
