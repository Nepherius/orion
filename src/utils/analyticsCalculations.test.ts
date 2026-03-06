import { describe, expect, it } from 'vitest';
import {
  calculateGlobalDropRatePerHour,
  calculateMinutesPerLootEvent,
} from './analytics/lootMetrics';
import {
  calculateProjectedLifetimeProfit,
  calculateSessionsToBreakEven,
} from './analytics/performanceMetrics';
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
    },
  };

  return {
    ...base,
    ...overrides,
    stats: {
      ...base.stats,
      ...(overrides.stats || {}),
    },
  };
}

describe('analytics calculations', () => {
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
});
