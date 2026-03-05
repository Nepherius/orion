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
  | 'startSession'
  | 'pauseSession'
  | 'resumeSession'
  | 'endSession'
> => ({
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
      kills: [],
      damageEvents: [],
      combatEvents: [],
      healingEvents: [],
      damageTakenEvents: [],
      stats: {
        ...emptySessionStats(),
      },
    };

    set((state) => {
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
      const sessions = state.sessions.map((s) =>
        s.status === 'active' ? { ...s, status: 'paused' as const, pausedAt: now } : s
      );

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
});
