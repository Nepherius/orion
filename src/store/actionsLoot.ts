import type { LootItem } from '../types';
import { pendingKillFlag, pendingKillStartTime, pendingKillFinalizeTimers } from './killTracking';
import type { HuntStore, PendingKill, StoreGetState, StoreSetState } from './storeTypes';
import { calculateLootTotalValue, calculateStats, generateId, safeInvoke } from './shared';

export const createLootActions = (
  set: StoreSetState,
  get: StoreGetState
): Pick<
  HuntStore,
  'addLoot' | 'updateLoot' | 'updateLootByName' | 'removeLoot' | 'removeLootByName'
> => ({
  addLoot: async (sessionId, lootData, options) => {
    const ignoreList = get().settings.ignoreListItems || [];
    if (ignoreList.includes(lootData.name)) {
      return;
    }
    const killTrackingMode = options?.killTrackingMode ?? 'normal';

    await get()._loadCreatureData();

    const newLoot: LootItem = {
      ...lootData,
      id: generateId(),
      timestamp: lootData.timestamp || Date.now(),
      totalValue: calculateLootTotalValue(lootData),
    };

    const state = get();
    const hasPendingFlag = pendingKillFlag.get(sessionId) === true;
    const shouldAttachToPendingKill = hasPendingFlag && killTrackingMode !== 'none';
    const shouldFinalizePendingKill = hasPendingFlag && killTrackingMode === 'normal';
    const existingPendingKill = state.pendingKills.get(sessionId);

    if (shouldAttachToPendingKill) {
      const startTimestamp = pendingKillStartTime.get(sessionId) ?? newLoot.timestamp;
      const updatedPendingKill: PendingKill = existingPendingKill
        ? {
            ...existingPendingKill,
            endTimestamp: newLoot.timestamp,
            lootItemIds: [...existingPendingKill.lootItemIds, newLoot.id],
          }
        : {
            startTimestamp,
            endTimestamp: newLoot.timestamp,
            lootItemIds: [newLoot.id],
          };

      const newPendingKills = new Map(state.pendingKills);
      newPendingKills.set(sessionId, updatedPendingKill);
      set({ pendingKills: newPendingKills });
    }

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
        fixed_value: newLoot.fixedValue,
        total_value: newLoot.totalValue,
        timestamp: newLoot.timestamp,
        kill_uuid: newLoot.killUuid,
      },
    });

    if (shouldFinalizePendingKill) {
      // Clear any existing debounce timer so we don't close the window prematurely
      // while more items from the same kill are still being processed.
      const existingTimer = pendingKillFinalizeTimers.get(sessionId);
      if (existingTimer !== undefined) {
        clearTimeout(existingTimer);
      }

      // Capture sessionId in closure for the timer callback
      const capturedSessionId = sessionId;
      const timer = setTimeout(() => {
        pendingKillFinalizeTimers.delete(capturedSessionId);
        pendingKillFlag.set(capturedSessionId, false);
        pendingKillStartTime.delete(capturedSessionId);
        void get()._finalizePendingKill(capturedSessionId);
      }, 150);

      pendingKillFinalizeTimers.set(sessionId, timer);
    }
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
                updatedItem.totalValue = calculateLootTotalValue(updatedItem);
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
      params: {
        uuid: lootId,
        name: updates.name,
        quantity: updates.quantity,
        value: updates.value,
        markup: updates.markup,
        fixed_value: updates.fixedValue,
        total_value: updates.totalValue,
      },
    });
  },

  updateLootByName: (sessionId, itemName, updates) => {
    const matchingLoot =
      get()
        .sessions.find((s) => s.id === sessionId)
        ?.loot.filter((item) => item.name === itemName) || [];

    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id !== sessionId) {
          return session;
        }

        const updatedSession = {
          ...session,
          loot: session.loot.map((item) => {
            if (item.name !== itemName) {
              return item;
            }

            const updatedItem = {
              ...item,
              ...updates,
            };
            updatedItem.totalValue = calculateLootTotalValue(updatedItem);
            return updatedItem;
          }),
        };
        updatedSession.stats = calculateStats(updatedSession);
        return updatedSession;
      }),
    }));

    matchingLoot.forEach((item) => {
      const nextItem = {
        ...item,
        ...updates,
      };
      const nextTotal = calculateLootTotalValue(nextItem);

      void safeInvoke('db_update_loot', {
        params: {
          uuid: item.id,
          markup: updates.markup,
          fixed_value: updates.fixedValue,
          total_value: nextTotal,
        },
      });
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
});
