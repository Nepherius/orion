import type { LootEvent } from '../components/views/chatlog/chatLogTypes';
import type { AppSettings, LootKillTrackingMode } from '../types';

export type LootEventRuleAction =
  | 'track'
  | 'ignore'
  | 'track_no_kill'
  | 'attach_without_finalizing';

export interface LootEventRuleDecision {
  action: LootEventRuleAction;
  killTrackingMode: LootKillTrackingMode;
  reason?: string;
}

const BUILT_IN_NO_KILL_ITEMS = new Set([
  'vibrant sweat',
  'explosive projectile',
  'explosive projectiles',
  'metal residue',
]);

const normalizeLootName = (name: string): string =>
  name
    .replace(/\s*\((m|f)\)$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export function classifyLootEventForTracking(
  event: LootEvent,
  settings: Pick<AppSettings, 'ignoreListItems'>
): LootEventRuleDecision {
  const itemName = normalizeLootName(event.creature);
  const ignoredItems = settings.ignoreListItems || [];
  const isIgnored = ignoredItems.some((ignored) => normalizeLootName(ignored) === itemName);

  if (isIgnored) {
    return { action: 'ignore', killTrackingMode: 'none', reason: 'ignore_list' };
  }

  if (event.source === 'enhancer_break') {
    return {
      action: 'attach_without_finalizing',
      killTrackingMode: 'attachOnly',
      reason: 'enhancer_break',
    };
  }

  if (BUILT_IN_NO_KILL_ITEMS.has(itemName)) {
    return { action: 'track_no_kill', killTrackingMode: 'none', reason: 'non_hunt_pickup' };
  }

  return { action: 'track', killTrackingMode: 'normal' };
}
