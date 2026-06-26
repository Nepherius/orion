import { describe, expect, it } from 'vitest';
import type { HuntSession } from '../types';
import {
  analyzeSessionDataQuality,
  getCompletedSessionsWithCostOrLootAndNoDuration,
} from './dataQuality';

const session = (overrides: Partial<HuntSession>): HuntSession =>
  ({
    id: 's',
    name: 'Session',
    startTime: 1,
    status: 'completed',
    weapon: '',
    loot: [],
    skills: [],
    globals: [],
    kills: [],
    damageEvents: [],
    combatEvents: [],
    healingEvents: [],
    damageTakenEvents: [],
    notes: '',
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
    ...overrides,
  }) as HuntSession;

describe('analyzeSessionDataQuality', () => {
  it('reports issues that can skew analytics', () => {
    expect(
      analyzeSessionDataQuality([
        session({
          stats: { ...session({}).stats, totalLoot: 10, totalAdjustedLoot: 10, totalCost: 0 },
        }),
        session({
          stats: {
            ...session({}).stats,
            totalLoot: 10,
            totalAdjustedLoot: 10,
            totalCost: 5,
            duration: 0,
          },
          loot: [
            {
              id: 'l',
              name: 'Oil',
              quantity: 1,
              value: 1,
              markup: 100,
              totalValue: 1,
              timestamp: 0,
            },
          ],
        }),
      ]).map((issue) => issue.code)
    ).toEqual([
      'completed-no-duration',
      'loot-without-cost',
      'loot-without-timestamp',
      'completed-without-loadout',
    ]);
  });

  it('selects only completed sessions with cost or loot and no duration for cleanup', () => {
    const badCostSession = session({
      id: 'bad-cost',
      stats: { ...session({}).stats, totalCost: 5, duration: 0 },
    });
    const badLootSession = session({
      id: 'bad-loot',
      stats: { ...session({}).stats, totalLoot: 10, totalAdjustedLoot: 10, duration: 0 },
    });

    expect(
      getCompletedSessionsWithCostOrLootAndNoDuration([
        badCostSession,
        badLootSession,
        session({
          id: 'empty-zero-duration',
          stats: { ...session({}).stats, duration: 0 },
        }),
        session({
          id: 'valid-duration',
          stats: {
            ...session({}).stats,
            totalCost: 5,
            totalLoot: 4,
            totalAdjustedLoot: 4,
            duration: 60,
          },
        }),
        session({
          id: 'active-zero-duration',
          status: 'active',
          stats: { ...session({}).stats, totalCost: 5, duration: 0 },
        }),
      ]).map((matchedSession) => matchedSession.id)
    ).toEqual(['bad-cost', 'bad-loot']);
  });
});
