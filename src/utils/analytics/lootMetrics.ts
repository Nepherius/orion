// Analytics metrics for loot and drop statistics
import { HuntSession } from '../../types';
import { calculateStdDev, calculateVariance } from './stats';

/**
 * Get the total active duration of a session in hours
 */
function getSessionActiveDurationHours(session: HuntSession): number {
  if (session.status === 'completed') {
    return Math.max(0, Number(session.stats.duration) || 0) / 3600;
  }

  const now = Date.now();
  const pausedMs =
    (session.totalPausedMs || 0) +
    (session.status === 'paused' && session.pausedAt ? now - session.pausedAt : 0);
  const durationMs = Math.max(0, now - session.startTime - pausedMs);
  return durationMs / 1000 / 60 / 60;
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
  const durationMinutes = getSessionActiveDurationHours(session) * 60;

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
  const durationHours = getSessionActiveDurationHours(session);

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
  const durationHours = getSessionActiveDurationHours(session);

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
