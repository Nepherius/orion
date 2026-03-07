import type { AppSettings, HuntSession } from '../types';
import type { PendingKill } from './storeTypes';
import { generateId, safeInvoke } from './shared';

export const pendingKillFlag = new Map<string, boolean>();
export const pendingKillStartTime = new Map<string, number>();
export const finalizationInProgress = new Set<string>();

export const finalizePendingKillRecord = async (
  session: HuntSession,
  pendingKill: PendingKill,
  creatures: Array<{ name: string; maturity: string; hp: number }>,
  settings: AppSettings
) => {
  if (!session.creature) {
    console.warn('[Kill Tracking] Cannot finalize kill without creature selection');
    return null;
  }

  const damageStartTime = pendingKill.startTimestamp;
  const damageInWindow = session.damageEvents.filter(
    (evt) => evt.timestamp >= damageStartTime && evt.timestamp <= pendingKill.endTimestamp
  );

  const hpDealt = damageInWindow.reduce((sum, evt) => sum + evt.damage, 0);
  if (hpDealt === 0) {
    console.warn('[Kill Tracking] No damage events found for pending kill');
    return null;
  }

  let maturity = 'Unknown';
  if (settings.enableKillTrackingMaturity ?? true) {
    const { inferMaturity } = await import('../services/creatureDataLoader');
    maturity = inferMaturity(session.creature, hpDealt, creatures) ?? 'Unknown';
  }

  const lootValue = session.loot
    .filter((item) => pendingKill.lootItemIds.includes(item.id))
    .reduce((sum, item) => sum + item.totalValue, 0);

  const totalSessionDamage = session.damageEvents.reduce((sum, evt) => sum + evt.damage, 0);
  const totalSessionCost =
    session.ammoCost + session.weaponDecay + session.healingCost + session.otherCosts;
  const killCost = totalSessionDamage > 0 ? (hpDealt / totalSessionDamage) * totalSessionCost : 0;

  const killId = generateId();
  const kill = {
    id: killId,
    creatureName: session.creature,
    maturity,
    hpDealt,
    cost: killCost,
    lootValue,
    timestamp: pendingKill.endTimestamp,
  };

  await safeInvoke('db_add_kill', {
    params: {
      uuid: kill.id,
      session_uuid: session.id,
      creature_name: kill.creatureName,
      maturity: kill.maturity,
      hp_dealt: kill.hpDealt,
      cost: kill.cost,
      loot_value: kill.lootValue,
      timestamp: kill.timestamp,
    },
  });

  for (const lootId of pendingKill.lootItemIds) {
    await safeInvoke('db_update_loot', {
      params: {
        uuid: lootId,
        kill_uuid: killId,
      },
    });
  }

  return kill;
};
