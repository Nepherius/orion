import { HuntSession } from '../../types';

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
  const stats: Record<
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
  > = {};
  const sessionSets: Record<string, Set<string>> = {};
  const globalValueTotals: Record<string, number> = {};

  sessions.forEach((session) => {
    const kills = session.kills || [];
    if (kills.length === 0) return;

    const creaturesInSession = new Set<string>();

    kills.forEach((kill) => {
      const creature = kill.creatureName || 'Unknown';
      if (!stats[creature]) {
        stats[creature] = {
          count: 0,
          totalLoot: 0,
          totalCost: 0,
          profit: 0,
          returnRate: 0,
          totalKills: 0,
          totalGlobals: 0,
          averageGlobalValue: 0,
        };
        sessionSets[creature] = new Set();
        globalValueTotals[creature] = 0;
      }

      stats[creature].totalKills += 1;
      stats[creature].totalLoot += kill.lootValue;
      stats[creature].totalCost += kill.cost;
      stats[creature].profit += kill.lootValue - kill.cost;
      creaturesInSession.add(creature);
    });

    const sessionCreature = session.creature || 'Unknown';
    if (session.globals.length > 0 && stats[sessionCreature]) {
      stats[sessionCreature].totalGlobals += session.globals.length;
      globalValueTotals[sessionCreature] += session.globals.reduce((sum, g) => sum + g.value, 0);
    }

    creaturesInSession.forEach((creature) => {
      sessionSets[creature].add(session.id);
    });
  });

  Object.entries(stats).forEach(([creature, data]) => {
    data.count = sessionSets[creature]?.size || 0;
    data.returnRate = data.totalCost > 0 ? (data.totalLoot / data.totalCost) * 100 : 0;
    data.averageGlobalValue =
      data.totalGlobals > 0 ? globalValueTotals[creature] / data.totalGlobals : 0;
  });

  return stats;
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
 * Calculate projected lifetime profit based on recent sessions
 */
export function calculateProjectedLifetimeProfit(
  sessions: HuntSession[],
  samplesFromRecent: number = 10
): number {
  if (sessions.length === 0) return 0;

  // Take the most recent N sessions by start time
  const recentSessions = [...sessions]
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, Math.min(samplesFromRecent, sessions.length));

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

  const recentSessions = [...sessions]
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, Math.min(10, sessions.length));
  const avgProfitPerSession =
    recentSessions.reduce((sum, s) => sum + (s.stats.totalLoot - s.stats.totalCost), 0) /
    recentSessions.length;

  if (avgProfitPerSession <= 0) return null; // Can't break even with negative avg

  return Math.ceil(Math.abs(currentProfit) / avgProfitPerSession);
}

/**
 * Calculate creature stats by location
 * Returns data organized by location, showing most killed and most profitable creatures
 */
export function calculateCreatureStatsByLocation(sessions: HuntSession[]): Record<
  string,
  {
    mostKilled: { creature: string; kills: number } | null;
    mostProfitable: { creature: string; profit: number } | null;
    totalKills: number;
    creatures: Record<
      string,
      {
        kills: number;
        sessions: number;
        totalLoot: number;
        totalCost: number;
        profit: number;
        returnRate: number;
      }
    >;
  }
> {
  const result: Record<
    string,
    {
      mostKilled: { creature: string; kills: number } | null;
      mostProfitable: { creature: string; profit: number } | null;
      totalKills: number;
      creatures: Record<
        string,
        {
          kills: number;
          sessions: number;
          totalLoot: number;
          totalCost: number;
          profit: number;
          returnRate: number;
        }
      >;
    }
  > = {};
  const sessionSets: Record<string, Record<string, Set<string>>> = {};

  sessions.forEach((session) => {
    const location = session.location || 'Unknown';
    if (!result[location]) {
      result[location] = {
        mostKilled: null,
        mostProfitable: null,
        totalKills: 0,
        creatures: {},
      };
      sessionSets[location] = {};
    }

    (session.kills || []).forEach((kill) => {
      const creature = kill.creatureName || 'Unknown';
      if (!result[location].creatures[creature]) {
        result[location].creatures[creature] = {
          kills: 0,
          sessions: 0,
          totalLoot: 0,
          totalCost: 0,
          profit: 0,
          returnRate: 0,
        };
        sessionSets[location][creature] = new Set();
      }

      const creatureStats = result[location].creatures[creature];
      creatureStats.kills += 1;
      creatureStats.totalLoot += kill.lootValue;
      creatureStats.totalCost += kill.cost;
      creatureStats.profit = creatureStats.totalLoot - creatureStats.totalCost;
      creatureStats.returnRate =
        creatureStats.totalCost > 0 ? (creatureStats.totalLoot / creatureStats.totalCost) * 100 : 0;
      sessionSets[location][creature].add(session.id);
      result[location].totalKills += 1;
    });
  });

  Object.entries(result).forEach(([location, locationData]) => {
    Object.entries(locationData.creatures).forEach(([creature, creatureStats]) => {
      creatureStats.sessions = sessionSets[location][creature]?.size || 0;

      if (!locationData.mostKilled || creatureStats.kills > locationData.mostKilled.kills) {
        locationData.mostKilled = { creature, kills: creatureStats.kills };
      }

      if (
        !locationData.mostProfitable ||
        creatureStats.profit > locationData.mostProfitable.profit
      ) {
        locationData.mostProfitable = { creature, profit: creatureStats.profit };
      }
    });
  });

  return result;
}
