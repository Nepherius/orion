import { HuntSession, Loadout, SessionStats } from '../types';

export function emptySessionStats(): SessionStats {
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
    enemyMisses: 0,
    enemyEvades: 0,
    enemyDodges: 0,
    criticalHits: 0,
    hits: 0,
  };
}

export function ensureSingleLoadoutPrimary(loadouts: Loadout[]): Loadout[] {
  if (loadouts.length !== 1) {
    return loadouts;
  }

  const [onlyLoadout] = loadouts;
  if (onlyLoadout.isPrimary) {
    return loadouts;
  }

  return [{ ...onlyLoadout, isPrimary: true }];
}

export function calculateSessionStats(
  session: HuntSession,
  now: number = Date.now()
): SessionStats {
  const totalLoot = session.loot.reduce((sum, item) => sum + item.totalValue, 0);
  const totalCost =
    session.ammoCost +
    session.weaponDecay +
    session.armorDecay +
    session.healingCost +
    session.otherCosts;
  const returns = totalCost > 0 ? (totalLoot / totalCost) * 100 : 0;

  const basePausedMs = session.totalPausedMs || 0;
  const activePauseMs =
    session.status === 'paused' && session.pausedAt ? now - session.pausedAt : 0;
  const totalPausedMs = basePausedMs + activePauseMs;
  const rawDuration = session.endTime
    ? session.endTime - session.startTime
    : now - session.startTime;
  const duration = Math.max(0, rawDuration - totalPausedMs);

  const misses = session.combatEvents?.filter((e) => e.type === 'player_miss').length || 0;
  const dodges = session.combatEvents?.filter((e) => e.type === 'player_dodge').length || 0;
  const evades = session.combatEvents?.filter((e) => e.type === 'player_evade').length || 0;
  const enemyMisses = session.combatEvents?.filter((e) => e.type === 'enemy_miss').length || 0;
  const enemyEvades = session.combatEvents?.filter((e) => e.type === 'enemy_evade').length || 0;
  const enemyDodges = session.combatEvents?.filter((e) => e.type === 'enemy_dodge').length || 0;
  const criticalHits = session.damageEvents?.filter((e) => e.isCritical).length || 0;
  const regularHits = session.damageEvents?.filter((e) => !e.isCritical).length || 0;
  const totalHits = criticalHits + regularHits;

  const shotsFiredCount = totalHits + misses + enemyDodges + enemyEvades;

  // Kill Tracking: Group loot events by 3-second clusters
  let kills = 0;
  if (session.loot.length > 0) {
    const sortedLoot = [...session.loot].sort((a, b) => a.timestamp - b.timestamp);
    kills = 1;
    let currentClusterStart = sortedLoot[0].timestamp;

    for (let i = 1; i < sortedLoot.length; i++) {
      const itemTimestamp = sortedLoot[i].timestamp;
      const diff = itemTimestamp - currentClusterStart;
      const isNewKill = diff > 3000;
      if (isNewKill) {
        kills++;
        currentClusterStart = itemTimestamp;
      }
    }
  }

  return {
    kills,
    lootEvents: session.loot.length,
    globals: session.globals.filter((g) => !g.isHoF).length,
    hofs: session.globals.filter((g) => g.isHoF).length,
    totalLoot,
    totalCost,
    returns,
    duration: Math.floor(duration / 1000),
    shotsFired: shotsFiredCount,
    damageDealt: session.damageEvents?.reduce((sum, evt) => sum + evt.damage, 0) || 0,
    damageTaken: session.damageTakenEvents?.reduce((sum, evt) => sum + evt.damage, 0) || 0,
    healsUsed: session.healingEvents?.length || 0,
    totalHealing: session.healingEvents?.reduce((sum, evt) => sum + evt.amount, 0) || 0,
    misses,
    dodges,
    evades,
    enemyMisses,
    enemyEvades,
    enemyDodges,
    criticalHits,
    hits: regularHits,
  };
}
