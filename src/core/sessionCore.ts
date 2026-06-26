import { HuntSession, Loadout, SessionStats } from '../types';
import { calculateSessionAccounting } from '../utils/lootAccounting';

export function emptySessionStats(): SessionStats {
  return {
    kills: 0,
    lootEvents: 0,
    globals: 0,
    hofs: 0,
    totalLoot: 0,
    totalTtLoot: 0,
    totalAdjustedLoot: 0,
    totalMarkupGain: 0,
    totalFixedGain: 0,
    totalCost: 0,
    returns: 0,
    ttReturns: 0,
    adjustedReturns: 0,
    ttProfit: 0,
    adjustedProfit: 0,
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
  const totalCost =
    session.ammoCost + session.weaponDecay + session.healingCost + session.otherCosts;
  const accounting = calculateSessionAccounting(session.loot, totalCost);
  const totalLoot = accounting.totalAdjustedLoot;
  const returns = accounting.adjustedReturns;

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

  // Authoritative kill count comes from tracked kill events.
  const kills = session.kills?.length || 0;

  return {
    kills,
    lootEvents: session.loot.length,
    globals: session.globals.filter((g) => !g.isHoF).length,
    hofs: session.globals.filter((g) => g.isHoF).length,
    totalLoot,
    totalTtLoot: accounting.totalTtLoot,
    totalAdjustedLoot: accounting.totalAdjustedLoot,
    totalMarkupGain: accounting.totalMarkupGain,
    totalFixedGain: accounting.totalFixedGain,
    totalCost,
    returns,
    ttReturns: accounting.ttReturns,
    adjustedReturns: accounting.adjustedReturns,
    ttProfit: accounting.ttProfit,
    adjustedProfit: accounting.adjustedProfit,
    duration: Math.floor(duration / 1000),
    shotsFired: shotsFiredCount,
    damageDealt: session.damageEvents?.reduce((sum, evt) => sum + evt.damage, 0) || 0,
    damageTaken: session.damageTakenEvents?.reduce((sum, evt) => sum + evt.damage, 0) || 0,
    healsUsed: session.healingEvents?.filter((evt) => evt.isDirectUse !== false).length || 0,
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
