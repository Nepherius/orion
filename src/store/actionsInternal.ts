import type { HuntStore, StoreGetState, StoreSetState } from './storeTypes';
import { finalizePendingKillRecord, finalizationInProgress } from './killTracking';

export const createInternalActions = (
  set: StoreSetState,
  get: StoreGetState
): Pick<HuntStore, '_loadCreatureData' | '_finalizePendingKill'> => ({
  _loadCreatureData: async () => {
    const state = get();
    if (state.creatureData) {
      return;
    }

    try {
      const { loadCreatureEntries } = await import('../services/creatureDataLoader');
      const creatures = await loadCreatureEntries();
      set({ creatureData: creatures });
    } catch (error) {
      console.error('[Kill Tracking] Failed to load creature data:', error);
    }
  },

  _finalizePendingKill: async (sessionId: string) => {
    if (finalizationInProgress.has(sessionId)) {
      return;
    }
    finalizationInProgress.add(sessionId);

    try {
      const state = get();
      const pendingKill = state.pendingKills.get(sessionId);
      if (!pendingKill || !state.creatureData) {
        return;
      }

      const session = state.sessions.find((s) => s.id === sessionId);
      if (!session) {
        return;
      }

      const kill = await finalizePendingKillRecord(
        session,
        pendingKill,
        state.creatureData,
        state.settings
      );
      if (kill) {
        set((nextState) => ({
          sessions: nextState.sessions.map((s) => {
            if (s.id === sessionId) {
              return {
                ...s,
                kills: [...s.kills, kill],
                stats: {
                  ...s.stats,
                  kills: s.stats.kills + 1,
                },
                loot: s.loot.map((item) =>
                  pendingKill.lootItemIds.includes(item.id) ? { ...item, killUuid: kill.id } : item
                ),
              };
            }
            return s;
          }),
        }));

        const newPendingKills = new Map(state.pendingKills);
        newPendingKills.delete(sessionId);
        set({ pendingKills: newPendingKills });
      }
    } finally {
      finalizationInProgress.delete(sessionId);
    }
  },
});
