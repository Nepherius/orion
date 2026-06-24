import type { HuntSession } from '../types';

export interface DataQualityIssue {
  code: string;
  message: string;
  count: number;
}

export function isCompletedSessionWithCostOrLootAndNoDuration(session: HuntSession): boolean {
  return (
    session.status === 'completed' &&
    session.stats.duration <= 0 &&
    (session.stats.totalCost > 0 || session.stats.totalLoot > 0)
  );
}

export function getCompletedSessionsWithCostOrLootAndNoDuration(
  sessions: HuntSession[]
): HuntSession[] {
  return sessions.filter(isCompletedSessionWithCostOrLootAndNoDuration);
}

export function analyzeSessionDataQuality(sessions: HuntSession[]): DataQualityIssue[] {
  const completedWithNoDuration = getCompletedSessionsWithCostOrLootAndNoDuration(sessions).length;

  const lootWithoutCost = sessions.filter(
    (session) => session.stats.totalLoot > 0 && session.stats.totalCost <= 0
  ).length;

  const lootWithoutTimestamp = sessions.reduce(
    (count, session) =>
      count +
      session.loot.filter(
        (item) =>
          typeof item.timestamp !== 'number' ||
          !Number.isFinite(item.timestamp) ||
          item.timestamp <= 0
      ).length,
    0
  );

  const completedWithoutLoadout = sessions.filter(
    (session) => session.status === 'completed' && session.stats.totalCost > 0 && !session.loadoutId
  ).length;

  const issues: DataQualityIssue[] = [];
  if (completedWithNoDuration > 0) {
    issues.push({
      code: 'completed-no-duration',
      message: 'completed sessions have cost or loot but no duration',
      count: completedWithNoDuration,
    });
  }
  if (lootWithoutCost > 0) {
    issues.push({
      code: 'loot-without-cost',
      message: 'sessions have loot but zero recorded cost',
      count: lootWithoutCost,
    });
  }
  if (lootWithoutTimestamp > 0) {
    issues.push({
      code: 'loot-without-timestamp',
      message: 'loot entries are missing usable timestamps',
      count: lootWithoutTimestamp,
    });
  }
  if (completedWithoutLoadout > 0) {
    issues.push({
      code: 'completed-without-loadout',
      message: 'completed paid sessions are not linked to a loadout',
      count: completedWithoutLoadout,
    });
  }

  return issues;
}
