import { HuntSession } from '../types';

/**
 * Calculate standard deviation of an array of numbers
 */
export function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map((v) => Math.pow(v - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}

/**
 * Calculate variance of an array of numbers
 */
export function calculateVariance(values: number[]): number {
  if (values.length < 2) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map((v) => Math.pow(v - mean, 2));
  return squareDiffs.reduce((a, b) => a + b, 0) / values.length;
}

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
    armorCost: number;
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
          armorCost: 0,
          healingCost: 0,
          otherCost: 0,
          sessions: 0,
        };
      }
      acc[location].totalCost += session.stats.totalCost;
      acc[location].ammoCost += session.ammoCost;
      acc[location].weaponDecay += session.weaponDecay;
      acc[location].armorCost += session.armorDecay;
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
        armorCost: number;
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
  if (session.stats.kills === 0) return 0;
  return session.ammoCost / session.stats.kills;
}

/**
 * Calculate weapon decay cost per kill
 */
export function calculateWeaponDecayCostPerKill(session: HuntSession): number {
  if (session.stats.kills === 0) return 0;
  return session.weaponDecay / session.stats.kills;
}

/**
 * Calculate armor decay cost per kill
 */
export function calculateArmorDecayCostPerKill(session: HuntSession): number {
  if (session.stats.kills === 0) return 0;
  return session.armorDecay / session.stats.kills;
}

/**
 * Calculate loot value variance (consistency of drops)
 */
export function calculateLootVariance(session: HuntSession): number {
  if (session.loot.length < 2) return 0;

  const lootValues = session.loot.map((l) => l.totalValue);
  return calculateVariance(lootValues);
}

/**
 * Calculate loot value standard deviation (consistency metric)
 */
export function calculateLootStdDev(session: HuntSession): number {
  if (session.loot.length < 2) return 0;

  const lootValues = session.loot.map((l) => l.totalValue);
  return calculateStdDev(lootValues);
}

/**
 * Calculate average drop value across loot items
 */
export function calculateAverageDropValue(session: HuntSession): number {
  if (session.loot.length === 0) return 0;

  const totalValue = session.loot.reduce((sum, l) => sum + l.totalValue, 0);
  return totalValue / session.loot.length;
}

/**
 * Get largest single loot drop
 */
export function getLargestDrop(session: HuntSession): number {
  if (session.loot.length === 0) return 0;

  return Math.max(...session.loot.map((l) => l.totalValue));
}

/**
 * Calculate minutes per loot event
 */
export function calculateMinutesPerLootEvent(session: HuntSession): number {
  const now = Date.now();
  const pausedMs =
    (session.totalPausedMs || 0) +
    (session.status === 'paused' && session.pausedAt ? now - session.pausedAt : 0);
  const duration = Math.max(0, now - session.startTime - pausedMs);
  const durationMinutes = duration / 1000 / 60;

  if (session.loot.length === 0) return 0;
  return durationMinutes / session.loot.length;
}

/**
 * Calculate global drop rate per kill
 */
export function calculateGlobalDropRate(session: HuntSession): number {
  if (session.stats.kills === 0) return 0;
  return session.globals.length / session.stats.kills;
}

/**
 * Calculate global drop rate per hour
 */
export function calculateGlobalDropRatePerHour(session: HuntSession): number {
  const now = Date.now();
  const pausedMs =
    (session.totalPausedMs || 0) +
    (session.status === 'paused' && session.pausedAt ? now - session.pausedAt : 0);
  const duration = Math.max(0, now - session.startTime - pausedMs);
  const durationHours = duration / 1000 / 60 / 60;

  if (durationHours === 0) return 0;
  return session.globals.length / durationHours;
}

/**
 * Calculate HoF drop rate per kill
 */
export function calculateHoFDropRate(session: HuntSession): number {
  if (session.stats.kills === 0) return 0;
  const hofCount = session.globals.filter((g) => g.isHoF).length;
  return hofCount / session.stats.kills;
}

/**
 * Calculate HoF drop rate per hour
 */
export function calculateHoFDropRatePerHour(session: HuntSession): number {
  const now = Date.now();
  const pausedMs =
    (session.totalPausedMs || 0) +
    (session.status === 'paused' && session.pausedAt ? now - session.pausedAt : 0);
  const duration = Math.max(0, now - session.startTime - pausedMs);
  const durationHours = duration / 1000 / 60 / 60;

  if (durationHours === 0) return 0;
  const hofCount = session.globals.filter((g) => g.isHoF).length;
  return hofCount / durationHours;
}

/**
 * Calculate average global value
 */
export function calculateAverageGlobalValue(session: HuntSession): number {
  if (session.globals.length === 0) return 0;

  const totalValue = session.globals.reduce((sum, g) => sum + g.value, 0);
  return totalValue / session.globals.length;
}

/**
 * Get the best (highest value) global
 */
export function getBestGlobal(session: HuntSession): number {
  if (session.globals.length === 0) return 0;

  return Math.max(...session.globals.map((g) => g.value));
}

/**
 * Find consecutive profitable sessions (win streaks)
 */
export function calculateProfitableSessionStreaks(sessions: HuntSession[]): {
  currentStreak: number;
  longestStreak: number;
} {
  let currentStreak = 0;
  let longestStreak = 0;

  for (const session of sessions) {
    const profit = session.stats.totalLoot - session.stats.totalCost;
    if (profit >= 0) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  return { currentStreak, longestStreak };
}

/**
 * Calculate session win rate (% profitable sessions)
 */
export function calculateWinRate(sessions: HuntSession[]): number {
  if (sessions.length === 0) return 0;

  const profitable = sessions.filter((s) => s.stats.totalLoot - s.stats.totalCost >= 0).length;
  return (profitable / sessions.length) * 100;
}

/**
 * Calculate creature hunting frequency and profitability
 */
export function calculateCreatureStats(sessions: HuntSession[]): Record<
  string,
  {
    count: number;
    totalLoot: number;
    totalCost: number;
    profit: number;
    returnRate: number;
    totalKills: number;
    totalGlobals: number;
    averageGlobalValue: number;
  }
> {
  return sessions.reduce(
    (acc, session) => {
      const creature = session.creature || 'Unknown';
      if (!acc[creature]) {
        acc[creature] = {
          count: 0,
          totalLoot: 0,
          totalCost: 0,
          profit: 0,
          returnRate: 0,
          totalKills: 0,
          totalGlobals: 0,
          averageGlobalValue: 0,
        };
      }
      acc[creature].count += 1;
      acc[creature].totalLoot += session.stats.totalLoot;
      acc[creature].totalCost += session.stats.totalCost;
      acc[creature].profit += session.stats.totalLoot - session.stats.totalCost;
      acc[creature].totalKills += session.stats.kills;
      acc[creature].totalGlobals += session.globals.length;

      if (session.globals.length > 0) {
        const creatureGlobalValue = session.globals.reduce((sum, g) => sum + g.value, 0);
        acc[creature].averageGlobalValue += creatureGlobalValue / session.globals.length;
      }

      return acc;
    },
    {} as Record<
      string,
      {
        count: number;
        totalLoot: number;
        totalCost: number;
        profit: number;
        returnRate: number;
        totalKills: number;
        totalGlobals: number;
        averageGlobalValue: number;
      }
    >
  );
}

/**
 * Calculate creature difficulty (damage taken per kill)
 */
export function calculateCreatureDifficulty(creatureStats: {
  totalKills: number;
  damageTaken: number;
}): number {
  if (creatureStats.totalKills === 0) return 0;
  return creatureStats.damageTaken / creatureStats.totalKills;
}

/**
 * Calculate session profitability timeline
 * Returns cumulative P/L as we process loot items
 */
export function calculateSessionProfitabilityTimeline(
  session: HuntSession
): Array<{ index: number; cumulativeProfit: number }> {
  const result: Array<{ index: number; cumulativeProfit: number }> = [];
  let cumulativeLoot = 0;

  for (let i = 0; i < session.loot.length; i++) {
    cumulativeLoot += session.loot[i].totalValue;
    const averageCostPerLootEvent = session.stats.totalCost / session.loot.length;
    const cumulativeCost = averageCostPerLootEvent * (i + 1);
    result.push({
      index: i + 1,
      cumulativeProfit: cumulativeLoot - cumulativeCost,
    });
  }

  return result;
}

/**
 * Find the point where session became profitable
 */
export function findBreakEvenPoint(session: HuntSession): number | null {
  const timeline = calculateSessionProfitabilityTimeline(session);
  const breakEvenEvent = timeline.find((t) => t.cumulativeProfit >= 0);
  return breakEvenEvent ? breakEvenEvent.index : null;
}

/**
 * Calculate projected lifetime profit based on recent sessions
 */
export function calculateProjectedLifetimeProfit(
  sessions: HuntSession[],
  samplesFromRecent: number = 10
): number {
  if (sessions.length === 0) return 0;

  // Take the most recent N sessions
  const recentSessions = sessions.slice(0, Math.min(samplesFromRecent, sessions.length));

  // Calculate average profit/loss per session
  const totalProfit = recentSessions.reduce(
    (sum, s) => sum + (s.stats.totalLoot - s.stats.totalCost),
    0
  );
  const avgProfitPerSession = totalProfit / recentSessions.length;

  // Get all-time stats
  const allTimeTotalProfit = sessions.reduce(
    (sum, s) => sum + (s.stats.totalLoot - s.stats.totalCost),
    0
  );

  // Projected = current all-time + average trend
  return allTimeTotalProfit + avgProfitPerSession;
}

/**
 * Calculate sessions needed to break even (if currently negative)
 */
export function calculateSessionsToBreakEven(sessions: HuntSession[]): number | null {
  const currentProfit = sessions.reduce(
    (sum, s) => sum + (s.stats.totalLoot - s.stats.totalCost),
    0
  );

  if (currentProfit >= 0) return null; // Already profitable

  const recentSessions = sessions.slice(0, Math.min(10, sessions.length));
  const avgProfitPerSession =
    recentSessions.reduce((sum, s) => sum + (s.stats.totalLoot - s.stats.totalCost), 0) /
    recentSessions.length;

  if (avgProfitPerSession <= 0) return null; // Can't break even with negative avg

  return Math.ceil(Math.abs(currentProfit) / avgProfitPerSession);
}

/**
 * Calculate skills grouped by location
 */
export function calculateSkillsByLocation(sessions: HuntSession[]): Record<string, number> {
  return sessions.reduce(
    (acc, session) => {
      const location = session.location || 'Unknown';
      const skillGains = session.skills.reduce((sum, skill) => sum + skill.gainAmount, 0);
      acc[location] = (acc[location] || 0) + skillGains;
      return acc;
    },
    {} as Record<string, number>
  );
}

/**
 * Calculate skills grouped by weapon
 */
export function calculateSkillsByWeapon(sessions: HuntSession[]): Record<string, number> {
  return sessions.reduce(
    (acc, session) => {
      const weapon = session.weapon || 'Unknown';
      const skillGains = session.skills.reduce((sum, skill) => sum + skill.gainAmount, 0);
      acc[weapon] = (acc[weapon] || 0) + skillGains;
      return acc;
    },
    {} as Record<string, number>
  );
}

/**
 * Calculate skill gain variance across sessions
 */
export function calculateSkillGainVariance(sessions: HuntSession[]): number {
  if (sessions.length < 2) return 0;

  const skillGains = sessions.map((s) =>
    s.skills.reduce((sum, skill) => sum + skill.gainAmount, 0)
  );

  return calculateVariance(skillGains);
}

/**
 * Calculate skill value per PED spent (efficiency)
 */
export function calculateSkillValuePerCost(sessions: HuntSession[]): number {
  const totalCost = sessions.reduce((sum, s) => sum + s.stats.totalCost, 0);
  const totalSkills = sessions.reduce(
    (sum, s) => sum + s.skills.reduce((skillSum, skill) => skillSum + skill.gainAmount, 0),
    0
  );

  if (totalCost === 0) return 0;
  return totalSkills / totalCost;
}

/**
 * Get all unique skill names from sessions (for debugging)
 */
export function getAllSkillNames(sessions: HuntSession[]): string[] {
  const skillSet = new Set<string>();
  sessions.forEach((session) => {
    session.skills.forEach((skill) => {
      skillSet.add(skill.skillName);
    });
  });
  return Array.from(skillSet).sort();
}

/**
 * Attribute skill list
 */
const ATTRIBUTES = ['Agility', 'Health', 'Intelligence', 'Psyche', 'Stamina', 'Strength'] as const;

/**
 * Calculate attribute gains for a single session
 */
export function calculateSessionAttributeGains(
  session: HuntSession
): Record<string, { gains: number; count: number }> {
  const attributeGains: Record<string, { gains: number; count: number }> = {
    Agility: { gains: 0, count: 0 },
    Health: { gains: 0, count: 0 },
    Intelligence: { gains: 0, count: 0 },
    Psyche: { gains: 0, count: 0 },
    Stamina: { gains: 0, count: 0 },
    Strength: { gains: 0, count: 0 },
  };

  session.skills.forEach((skill) => {
    if (ATTRIBUTES.includes(skill.skillName as (typeof ATTRIBUTES)[number])) {
      attributeGains[skill.skillName].gains += skill.gainAmount;
      attributeGains[skill.skillName].count += 1;
    }
  });

  return attributeGains;
}

/**
 * Calculate lifetime attribute gains across multiple sessions
 */
export function calculateLifetimeAttributeGains(
  sessions: HuntSession[]
): Record<string, { gains: number; count: number }> {
  const attributeGains: Record<string, { gains: number; count: number }> = {
    Agility: { gains: 0, count: 0 },
    Health: { gains: 0, count: 0 },
    Intelligence: { gains: 0, count: 0 },
    Psyche: { gains: 0, count: 0 },
    Stamina: { gains: 0, count: 0 },
    Strength: { gains: 0, count: 0 },
  };

  sessions.forEach((session) => {
    session.skills.forEach((skill) => {
      if (ATTRIBUTES.includes(skill.skillName as (typeof ATTRIBUTES)[number])) {
        attributeGains[skill.skillName].gains += skill.gainAmount;
        attributeGains[skill.skillName].count += 1;
      }
    });
  });

  return attributeGains;
}
