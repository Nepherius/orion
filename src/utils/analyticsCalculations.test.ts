import { describe, expect, it } from 'vitest';
import {
  calculateGlobalDropRatePerHour,
  calculateMinutesPerLootEvent,
} from './analytics/lootMetrics';
import {
  calculateMarkupDependencyMetrics,
  calculateProjectedLifetimeProfit,
  calculateSessionsToBreakEven,
  calculateTimeToVarianceMetrics,
  calculateWinRate,
} from './analytics/performanceMetrics';
import { calculateVariance } from './analytics/stats';
import type { HuntSession } from '../types';

function createSession(
  overrides: Omit<Partial<HuntSession>, 'stats'> & { stats?: Partial<HuntSession['stats']> }
): HuntSession {
  const base: HuntSession = {
    id: 's',
    name: 'Session',
    startTime: Date.now() - 60_000,
    endTime: undefined,
    status: 'completed',
    pausedAt: undefined,
    totalPausedMs: 0,
    weapon: 'Opalo',
    armor: undefined,
    location: undefined,
    creature: undefined,
    loot: [],
    skills: [],
    globals: [],
    kills: [],
    damageEvents: [],
    combatEvents: [],
    healingEvents: [],
    damageTakenEvents: [],
    notes: '',
    loadoutId: undefined,
    ammoCost: 0,
    weaponDecay: 0,
    healingCost: 0,
    otherCosts: 0,
    stats: {
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
    },
  };

  const stats = {
    ...base.stats,
    ...(overrides.stats || {}),
  };
  const totalAdjustedLoot = overrides.stats?.totalAdjustedLoot ?? stats.totalLoot;
  const totalTtLoot = overrides.stats?.totalTtLoot ?? totalAdjustedLoot;
  const adjustedReturns =
    overrides.stats?.adjustedReturns ??
    (stats.totalCost > 0 ? (totalAdjustedLoot / stats.totalCost) * 100 : 0);
  const ttReturns =
    overrides.stats?.ttReturns ?? (stats.totalCost > 0 ? (totalTtLoot / stats.totalCost) * 100 : 0);

  return {
    ...base,
    ...overrides,
    stats: {
      ...stats,
      totalLoot: totalAdjustedLoot,
      totalTtLoot,
      totalAdjustedLoot,
      returns: overrides.stats?.returns ?? adjustedReturns,
      ttReturns,
      adjustedReturns,
      ttProfit: overrides.stats?.ttProfit ?? totalTtLoot - stats.totalCost,
      adjustedProfit: overrides.stats?.adjustedProfit ?? totalAdjustedLoot - stats.totalCost,
    },
  };
}

describe('analytics calculations', () => {
  it('returns zero variance for an empty sample instead of NaN', () => {
    expect(calculateVariance([])).toBe(0);
  });

  it('calculates win rate from completed sessions only', () => {
    const completedWin = createSession({
      id: 'completed-win',
      status: 'completed',
      stats: { totalLoot: 120, totalCost: 100 },
    });
    const completedLoss = createSession({
      id: 'completed-loss',
      status: 'completed',
      stats: { totalLoot: 80, totalCost: 100 },
    });
    const activeWin = createSession({
      id: 'active-win',
      status: 'active',
      stats: { totalLoot: 1000, totalCost: 1 },
    });

    expect(calculateWinRate([completedWin, completedLoss, activeWin])).toBeCloseTo(50, 8);
  });

  it('uses completed duration for global drop rate per hour', () => {
    const session = createSession({
      startTime: Date.now() - 10 * 24 * 60 * 60 * 1000,
      status: 'completed',
      globals: [
        { id: 'g1', creature: 'A', value: 10, timestamp: 1, isHoF: false },
        { id: 'g2', creature: 'B', value: 20, timestamp: 2, isHoF: false },
      ],
      stats: {
        duration: 3600,
      },
    });

    expect(calculateGlobalDropRatePerHour(session)).toBeCloseTo(2, 8);
  });

  it('uses completed duration for minutes per loot event', () => {
    const session = createSession({
      startTime: Date.now() - 7 * 24 * 60 * 60 * 1000,
      status: 'completed',
      loot: [
        {
          id: 'l1',
          name: 'Oil',
          quantity: 1,
          value: 1,
          markup: 100,
          totalValue: 1,
          timestamp: 1,
        },
        {
          id: 'l2',
          name: 'Wool',
          quantity: 1,
          value: 1,
          markup: 100,
          totalValue: 1,
          timestamp: 2,
        },
      ],
      stats: {
        duration: 3600,
      },
    });

    expect(calculateMinutesPerLootEvent(session)).toBeCloseTo(30, 8);
  });

  it('projects lifetime profit using most recent sessions by startTime', () => {
    const oldLoss = createSession({
      id: 'old',
      startTime: 1,
      stats: { totalLoot: 0, totalCost: 100 },
    });
    const newestGain = createSession({
      id: 'new',
      startTime: 100,
      stats: { totalLoot: 200, totalCost: 0 },
    });

    const projected = calculateProjectedLifetimeProfit([oldLoss, newestGain], 1);
    // all-time profit = +100, most recent avg profit = +200
    expect(projected).toBeCloseTo(300, 8);
  });

  it('break-even estimate uses most recent sessions by startTime', () => {
    const oldNegative = createSession({
      id: 'old',
      startTime: 1,
      stats: { totalLoot: 0, totalCost: 2000 },
    });
    const newerPositives = Array.from({ length: 10 }, (_, i) =>
      createSession({
        id: `new-${i}`,
        startTime: 100 + i,
        stats: { totalLoot: 200, totalCost: 100 },
      })
    );

    const sessionsNeeded = calculateSessionsToBreakEven([oldNegative, ...newerPositives]);
    // current = -1000, recent 10 avg = +100 => should need exactly 10 more similar sessions
    expect(sessionsNeeded).toBe(10);
  });

  it('calculates time-to-variance stabilization from rolling return volatility', () => {
    const sessions = [
      createSession({
        id: 's1',
        startTime: 1,
        status: 'completed',
        stats: { totalLoot: 30, totalCost: 100, duration: 3600 },
      }), // 30%
      createSession({
        id: 's2',
        startTime: 2,
        status: 'completed',
        stats: { totalLoot: 160, totalCost: 100, duration: 3600 },
      }), // 160%
      createSession({
        id: 's3',
        startTime: 3,
        status: 'completed',
        stats: { totalLoot: 40, totalCost: 100, duration: 3600 },
      }), // 40%
      createSession({
        id: 's4',
        startTime: 4,
        status: 'completed',
        stats: { totalLoot: 150, totalCost: 100, duration: 3600 },
      }), // 150%
      createSession({
        id: 's5',
        startTime: 5,
        status: 'completed',
        stats: { totalLoot: 35, totalCost: 100, duration: 3600 },
      }), // 35%
      createSession({
        id: 's6',
        startTime: 6,
        status: 'completed',
        stats: { totalLoot: 101, totalCost: 100, duration: 3600 },
      }), // 101%
      createSession({
        id: 's7',
        startTime: 7,
        status: 'completed',
        stats: { totalLoot: 99, totalCost: 100, duration: 3600 },
      }), // 99%
      createSession({
        id: 's8',
        startTime: 8,
        status: 'completed',
        stats: { totalLoot: 100, totalCost: 100, duration: 3600 },
      }), // 100%
      createSession({
        id: 's9',
        startTime: 9,
        status: 'completed',
        stats: { totalLoot: 100.5, totalCost: 100, duration: 3600 },
      }), // 100.5%
      createSession({
        id: 's10',
        startTime: 10,
        status: 'completed',
        stats: { totalLoot: 99.5, totalCost: 100, duration: 3600 },
      }), // 99.5%
    ];

    const metrics = calculateTimeToVarianceMetrics(sessions, 5);
    expect(metrics).not.toBeNull();
    expect(metrics?.sampleCount).toBe(10);
    expect(metrics?.sessionsToStability).toBe(9);
    expect(metrics?.hoursToStability).toBeCloseTo(9, 8);
  });

  it('calculates markup dependency against TT-only baseline', () => {
    const session = createSession({
      id: 'markup-1',
      status: 'completed',
      stats: { totalCost: 8 },
      loot: [
        {
          id: 'l1',
          name: 'Oil',
          quantity: 2,
          value: 2,
          markup: 120,
          totalValue: 4.8,
          timestamp: 1,
        },
        {
          id: 'l2',
          name: 'Wool',
          quantity: 1,
          value: 1,
          markup: 100,
          totalValue: 1,
          timestamp: 2,
        },
      ],
    });

    const metrics = calculateMarkupDependencyMetrics([session]);
    expect(metrics).not.toBeNull();
    expect(metrics?.totalTtLoot).toBeCloseTo(5, 8);
    expect(metrics?.totalAdjustedLoot).toBeCloseTo(5.8, 8);
    expect(metrics?.totalMarkupGain).toBeCloseTo(0.8, 8);
    expect(metrics?.totalFixedGain).toBeCloseTo(0, 8);
    expect(metrics?.netAtTt).toBeCloseTo(-3, 8);
    expect(metrics?.netWithMarkup).toBeCloseTo(-2.2, 8);
    expect(metrics?.breakEvenMarkupPercent).toBeCloseTo(160, 8);
  });

  it('keeps fixed PED uplift separate from percent markup uplift', () => {
    const session = createSession({
      id: 'fixed-mu-1',
      status: 'completed',
      stats: { totalCost: 10 },
      loot: [
        {
          id: 'l1',
          name: 'Enhancer Component',
          quantity: 1,
          value: 5,
          markup: 200,
          fixedValue: 2,
          totalValue: 7,
          timestamp: 1,
        },
        {
          id: 'l2',
          name: 'Oil',
          quantity: 1,
          value: 4,
          markup: 150,
          totalValue: 6,
          timestamp: 2,
        },
      ],
    });

    const metrics = calculateMarkupDependencyMetrics([session]);
    expect(metrics?.totalTtLoot).toBeCloseTo(9, 8);
    expect(metrics?.totalAdjustedLoot).toBeCloseTo(13, 8);
    expect(metrics?.totalMarkupGain).toBeCloseTo(2, 8);
    expect(metrics?.totalFixedGain).toBeCloseTo(2, 8);
    expect(metrics?.netAtTt).toBeCloseTo(-1, 8);
    expect(metrics?.netWithMarkup).toBeCloseTo(3, 8);
  });
});
