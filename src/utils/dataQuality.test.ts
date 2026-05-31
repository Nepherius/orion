import { describe, expect, it } from 'vitest';
import type { HuntSession } from '../types';
import { analyzeSessionDataQuality } from './dataQuality';

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
    ...overrides,
  }) as HuntSession;

describe('analyzeSessionDataQuality', () => {
  it('reports issues that can skew analytics', () => {
    expect(
      analyzeSessionDataQuality([
        session({ stats: { ...session({}).stats, totalLoot: 10, totalCost: 0 } }),
        session({
          stats: { ...session({}).stats, totalLoot: 10, totalCost: 5, duration: 0 },
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
});
