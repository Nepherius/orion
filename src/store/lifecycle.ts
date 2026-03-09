import { emit, listen, type Event } from '@tauri-apps/api/event';
import { ensureSingleLoadoutPrimary, emptySessionStats } from '../core/sessionCore';
import { calculateLoadoutStats } from '../utils/loadoutCalculations';
import type { AppSettings, Goal, HuntSession, ItemTemplate, Loadout } from '../types';
import type { HuntStore, OverlaySessionCommandPayload, StoreSyncPayload } from './storeTypes';
import {
  dedupeItemTemplates,
  defaultSettings,
  hydrateSessionEvents,
  loadJsonSetting,
  safeInvoke,
  saveJsonSetting,
} from './shared';
import type { StoreApi, UseBoundStore } from 'zustand';

let dbStoreInitialized = false;
let syncInitialized = false;
let isApplyingRemoteSync = false;
let allowBroadcasting = true;
const storeSyncSourceId = `store-${Math.random().toString(36).slice(2)}`;

type HuntStoreHook = UseBoundStore<StoreApi<HuntStore>>;

export async function initializeStoreFromDb(useHuntStore: HuntStoreHook) {
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
        kills: [],
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
  const normalizedItemDatabase = dedupeItemTemplates(storedItemDatabase ?? []);

  if ((storedItemDatabase ?? []).length !== normalizedItemDatabase.length) {
    void saveJsonSetting('itemDatabase', normalizedItemDatabase);
  }

  useHuntStore.setState((prev) => ({
    ...prev,
    sessions,
    activeSessionId:
      storedActiveSessionId ?? sessions.find((s) => s.status === 'active')?.id ?? null,
    settings: storedSettings ?? defaultSettings,
    loadouts: normalizedHydratedLoadouts,
    itemDatabase: normalizedItemDatabase,
    goals: storedGoals ?? [],
  }));
}

export async function setupStoreSync(useHuntStore: HuntStoreHook, delayBroadcastMs = 0) {
  if (syncInitialized) {
    return () => {};
  }
  syncInitialized = true;

  if (delayBroadcastMs > 0) {
    allowBroadcasting = false;
    setTimeout(() => {
      allowBroadcasting = true;
    }, delayBroadcastMs);
  }

  let lastSyncedSnapshot = '';
  const unsubscribe = useHuntStore.subscribe((state) => {
    if (isApplyingRemoteSync || !allowBroadcasting) {
      return;
    }

    const strippedSessions = state.sessions.map((s) => ({
      ...s,
      loot: [],
      skills: [],
      globals: [],
      kills: [],
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
      // Ignore emit failures in non-Tauri contexts.
    });
  });

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
    return () => {};
  });

  const unlistenSyncRequest = await listen('store-sync-request', () => {
    const state = useHuntStore.getState();

    const strippedSessions = state.sessions.map((s) => ({
      ...s,
      loot: [],
      skills: [],
      globals: [],
      kills: [],
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
      // Ignore emit failures in non-Tauri contexts.
    });
  }).catch(() => {
    return () => {};
  });

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
    return () => {};
  });

  const unlistenOverlayGeometry = await listen(
    'overlay-geometry-changed',
    (event: Event<{ x: number; y: number; width: number; height: number }>) => {
      const payload = event.payload;
      if (!payload) return;

      useHuntStore.getState().updateSettings({
        overlayX: payload.x,
        overlayY: payload.y,
        overlayWidth: payload.width,
        overlayHeight: payload.height,
      });
    }
  ).catch(() => {
    return () => {};
  });

  let requestInterval: number | undefined;
  if (delayBroadcastMs > 0) {
    setTimeout(() => {
      emit('store-sync-request', { sourceId: storeSyncSourceId }).catch(() => {
        // Ignore emit failures in non-Tauri contexts.
      });
    }, 100);

    requestInterval = window.setInterval(() => {
      const state = useHuntStore.getState();
      if (!state.activeSessionId) {
        emit('store-sync-request', { sourceId: storeSyncSourceId }).catch(() => {
          // Ignore emit failures in non-Tauri contexts.
        });
      }
    }, 2000);
  }

  return () => {
    unsubscribe();
    unlistenSync();
    unlistenSyncRequest();
    unlistenOverlayCommand();
    unlistenOverlayGeometry();
    if (requestInterval !== undefined) {
      window.clearInterval(requestInterval);
    }
    syncInitialized = false;
    allowBroadcasting = true;
    isApplyingRemoteSync = false;
  };
}
