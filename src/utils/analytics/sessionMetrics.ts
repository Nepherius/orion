import { HuntSession } from '../../types';
import { calculateStdDev } from './stats';

/**
 * Calculate damage consistency (inverse of variance)
 * Returns standard deviation of damage per hit
 */
export function calculateDamageConsistency(session: HuntSession): number {
  if (session.damageEvents.length === 0) return 0;

  const damageValues = session.damageEvents.map((e) => e.damage);
  return calculateStdDev(damageValues);
}

/**
 * Calculate healing efficiency ratio
 * Healing received vs damage taken (useful for survivability)
 */
export function calculateHealingEfficiency(session: HuntSession): number {
  const damageTaken = session.stats.damageTaken || 0;
  const healing = session.stats.totalHealing || 0;

  if (damageTaken === 0) return 0;
  return healing / damageTaken;
}

/**
 * Calculate net damage (damage dealt - damage taken)
 */
export function calculateNetDamage(session: HuntSession): number {
  return session.stats.damageDealt - (session.stats.damageTaken || 0);
}

/**
 * Calculate damage per kill
 */
export function calculateDamagePerKill(session: HuntSession): number {
  if (session.stats.kills === 0) return 0;
  return session.stats.damageDealt / session.stats.kills;
}

/**
 * Calculate cost per location for all sessions
 */
export function calculateCostByLocation(sessions: HuntSession[]): Record<
  string,
  {
    totalCost: number;
    ammoCost: number;
    weaponDecay: number;
    healingCost: number;
    otherCost: number;
    sessions: number;
  }
> {
  return sessions.reduce(
    (acc, session) => {
      const location = session.location || 'Unknown';
      if (!acc[location]) {
        acc[location] = {
          totalCost: 0,
          ammoCost: 0,
          weaponDecay: 0,
          healingCost: 0,
          otherCost: 0,
          sessions: 0,
        };
      }
      acc[location].totalCost += session.stats.totalCost;
      acc[location].ammoCost += session.ammoCost;
      acc[location].weaponDecay += session.weaponDecay;
      acc[location].healingCost += session.healingCost;
      acc[location].otherCost += session.otherCosts;
      acc[location].sessions += 1;
      return acc;
    },
    {} as Record<
      string,
      {
        totalCost: number;
        ammoCost: number;
        weaponDecay: number;
        healingCost: number;
        otherCost: number;
        sessions: number;
      }
    >
  );
}

/**
 * Calculate ammo efficiency (cost per kill)
 */
export function calculateAmmoCostPerKill(session: HuntSession): number {
  if (!session?.stats?.kills) return 0;
  const ammo = Number(session.ammoCost) || 0;
  return ammo / session.stats.kills;
}

/**
 * Calculate weapon decay cost per kill
 */
export function calculateWeaponDecayCostPerKill(session: HuntSession): number {
  if (!session?.stats?.kills) return 0;
  const decay = Number(session.weaponDecay) || 0;
  return decay / session.stats.kills;
}
