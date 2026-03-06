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
      const previousGlobalCount = acc[creature].totalGlobals;
      acc[creature].totalGlobals += session.globals.length;

      if (session.globals.length > 0) {
        const creatureGlobalValue = session.globals.reduce((sum, g) => sum + g.value, 0);
        const newGlobalCount = previousGlobalCount + session.globals.length;
        acc[creature].averageGlobalValue =
          (acc[creature].averageGlobalValue * previousGlobalCount + creatureGlobalValue) /
          newGlobalCount;
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
  return sessions.reduce(
    (acc, session) => {
      const location = session.location || 'Unknown';
      const creature = session.creature || 'Unknown';

      if (!acc[location]) {
        acc[location] = {
          mostKilled: null,
          mostProfitable: null,
          totalKills: 0,
          creatures: {},
        };
      }

      if (!acc[location].creatures[creature]) {
        acc[location].creatures[creature] = {
          kills: 0,
          sessions: 0,
          totalLoot: 0,
          totalCost: 0,
          profit: 0,
          returnRate: 0,
        };
      }

      const creatureStats = acc[location].creatures[creature];
      creatureStats.kills += session.stats.kills;
      creatureStats.sessions += 1;
      creatureStats.totalLoot += session.stats.totalLoot;
      creatureStats.totalCost += session.stats.totalCost;
      creatureStats.profit = creatureStats.totalLoot - creatureStats.totalCost;
      creatureStats.returnRate =
        creatureStats.totalCost > 0 ? (creatureStats.totalLoot / creatureStats.totalCost) * 100 : 0;

      acc[location].totalKills += session.stats.kills;

      // Update mostKilled
      if (!acc[location].mostKilled || creatureStats.kills > acc[location].mostKilled.kills) {
        acc[location].mostKilled = { creature, kills: creatureStats.kills };
      }

      // Update mostProfitable
      if (
        !acc[location].mostProfitable ||
        creatureStats.profit > acc[location].mostProfitable.profit
      ) {
        acc[location].mostProfitable = { creature, profit: creatureStats.profit };
      }

      return acc;
    },
    {} as Record<
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
    >
  );
}
