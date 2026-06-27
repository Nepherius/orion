import { invoke } from '@tauri-apps/api/core';
import type {
  AppSettings,
  CombatEvent,
  DamageEvent,
  DamageTakenEvent,
  Global,
  HealingEvent,
  HuntSession,
  ItemTemplate,
  Kill,
  LootItem,
  SessionStats,
  SkillGain,
} from '../types';
import {
  calculateSessionStats as calculateSessionStatsCore,
  emptySessionStats,
} from '../core/sessionCore';
import { defaultOverlayStatIds } from '../utils/overlayStats';
import type { PersistenceError } from './storeTypes';

type PersistenceErrorReporter = (error: PersistenceError) => void;

let persistenceErrorReporter: PersistenceErrorReporter | null = null;

export const setPersistenceErrorReporter = (reporter: PersistenceErrorReporter | null) => {
  persistenceErrorReporter = reporter;
};

const isPersistenceWriteCommand = (command: string): boolean =>
  ['db_add_', 'db_create_', 'db_update_', 'db_delete_', 'db_set_', 'db_clear_'].some((prefix) =>
    command.startsWith(prefix)
  );

export const generateId = () => Math.random().toString(36).substring(2) + Date.now().toString(36);

export const normalizeTemplateItemName = (name: string): string =>
  name
    .replace(/\s*\((m|f)\)$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export const dedupeItemTemplates = (items: ItemTemplate[]): ItemTemplate[] => {
  const deduped = new Map<string, ItemTemplate>();
  for (const item of items) {
    deduped.set(normalizeTemplateItemName(item.name), item);
  }
  return Array.from(deduped.values());
};

export const calculateLootTotalValue = (loot: {
  value: number;
  markup: number;
  quantity: number;
  fixedValue?: number;
}): number => {
  if (loot.fixedValue !== undefined && loot.fixedValue !== null && loot.fixedValue > 0) {
    return (loot.value + loot.fixedValue) * loot.quantity;
  }
  return loot.value * (loot.markup / 100) * loot.quantity;
};

export const calculateStats = (session: HuntSession): SessionStats =>
  calculateSessionStatsCore(session);

export const defaultSettings: AppSettings = {
  avatarName: '',
  defaultMarkup: 100,
  autoSave: true,
  theme: 'dark',
  chatLogPath: '',
  autoStartSession: false,
  overlayX: 20,
  overlayY: 20,
  overlayWidth: 750,
  overlayHeight: 56,
  overlayStatIds: [...defaultOverlayStatIds],
  ignoreListItems: [],
  enableKillTrackingMaturity: true,
  analyticsEnabled: false,
  analyticsConsentAnswered: false,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const safeInvoke = async <T = any>(command: string, args?: Record<string, any>) => {
  try {
    return (await invoke(command, args)) as T;
  } catch (error) {
    console.error(`[DB Error] Command '${command}' failed:`, error);
    if (isPersistenceWriteCommand(command)) {
      persistenceErrorReporter?.({
        command,
        message: error instanceof Error ? error.message : String(error),
        occurredAt: Date.now(),
      });
    }
    return null;
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const saveJsonSetting = async (key: string, value: any) => {
  // eslint-disable-next-line no-console
  console.debug(`[Settings] Saving key '${key}' with value:`, value);
  await safeInvoke('db_set_setting', {
    key,
    value: JSON.stringify(value),
  });
};

export const loadJsonSetting = async <T>(key: string): Promise<T | null> => {
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

export const persistSessionToDb = async (session: HuntSession) => {
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
      weapon_efficiency_snapshot: session.weaponEfficiencySnapshot ?? null,
      dpp_snapshot: session.dppSnapshot ?? null,
      loadout_name_snapshot: session.loadoutNameSnapshot ?? null,
      planned_bankroll: session.plannedBankroll ?? null,
      planned_maturities: session.plannedMaturities ?? [],
      notes: session.notes,
      ammo_cost: session.ammoCost,
      weapon_decay: session.weaponDecay,
      healing_cost: session.healingCost,
      other_costs: session.otherCosts,
      tags: session.tags ?? [],
    },
  });
};

export const updateSessionInDb = async (id: string, updates: Partial<HuntSession>) => {
  const shouldClearEndTime =
    Object.prototype.hasOwnProperty.call(updates, 'endTime') && updates.endTime === undefined;
  const shouldClearPausedAt =
    Object.prototype.hasOwnProperty.call(updates, 'pausedAt') && updates.pausedAt === undefined;
  const shouldClearPlannedBankroll =
    Object.prototype.hasOwnProperty.call(updates, 'plannedBankroll') &&
    (updates.plannedBankroll === null || updates.plannedBankroll === undefined);

  await safeInvoke('db_update_session', {
    params: {
      uuid: id,
      name: updates.name,
      weapon: updates.weapon,
      armor: updates.armor,
      location: updates.location,
      creature: updates.creature,
      start_time: updates.startTime,
      end_time: updates.endTime,
      clear_end_time: shouldClearEndTime,
      status: updates.status,
      paused_at: updates.pausedAt,
      clear_paused_at: shouldClearPausedAt,
      total_paused_ms: updates.totalPausedMs,
      loadout_id: updates.loadoutId,
      weapon_efficiency_snapshot: updates.weaponEfficiencySnapshot,
      dpp_snapshot: updates.dppSnapshot,
      loadout_name_snapshot: updates.loadoutNameSnapshot,
      planned_bankroll: updates.plannedBankroll ?? undefined,
      clear_planned_bankroll: shouldClearPlannedBankroll,
      ...(updates.plannedMaturities !== undefined
        ? { planned_maturities: updates.plannedMaturities }
        : {}),
      notes: updates.notes,
      ammo_cost: updates.ammoCost,
      weapon_decay: updates.weaponDecay,
      healing_cost: updates.healingCost,
      other_costs: updates.otherCosts,
      ...(updates.tags !== undefined ? { tags: updates.tags } : {}),
    },
  });
};

export const hydrateSessionEvents = async (session: HuntSession): Promise<HuntSession> => {
  const [
    loot,
    skills,
    globals,
    kills,
    damageEvents,
    combatEvents,
    healingEvents,
    damageTakenEvents,
  ] = await Promise.all([
    safeInvoke<LootItem[]>('db_get_session_loot', { sessionUuid: session.id }),
    safeInvoke<SkillGain[]>('db_get_session_skills', { sessionUuid: session.id }),
    safeInvoke<Global[]>('db_get_session_globals', { sessionUuid: session.id }),
    safeInvoke<Kill[]>('db_get_session_kills', { sessionUuid: session.id }),
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
    kills: kills ?? [],
    damageEvents: damageEvents ?? [],
    combatEvents: combatEvents ?? [],
    healingEvents: healingEvents ?? [],
    damageTakenEvents: damageTakenEvents ?? [],
    stats: emptySessionStats(),
  };
  hydrated.stats = calculateSessionStatsCore(hydrated);
  return hydrated;
};
