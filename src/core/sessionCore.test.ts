import { describe, expect, it } from 'vitest';
import { HuntSession, Loadout } from '../types';
import { calculateSessionStats, emptySessionStats, ensureSingleLoadoutPrimary } from './sessionCore';

function makeLoadout(overrides: Partial<Loadout> = {}): Loadout {
  return {
    id: 'l1',
    name: 'Frontier',
    isPrimary: false,
    favorite: false,
    enhancers: { dmg: 0, acc: 0, rng: 0, eco: 0 },
    hitProfession: 0,
    dmgProfession: 0,
    costPerShot: 0,
    dpp: 0,
    totalDamage: 0,
    range: 0,
    criticalChance: 0,
    hitRate: 0,
    effectiveDamage: 0,
    efficiency: 0,
    decay: 0,
    ammoBurn: 0,
    totalUses: null,
    ...overrides,
  };
}

function makeSession(overrides: Partial<HuntSession> = {}): HuntSession {
  return {
    id: 's1',
    name: 'Session',
    startTime: 1_000,
    status: 'active',
    weapon: 'Rifle',
    armor: '',
    location: '',
    loot: [],
    skills: [],
    globals: [],
    damageEvents: [],
    combatEvents: [],
    healingEvents: [],
    damageTakenEvents: [],
    notes: '',
    ammoCost: 0,
    repairCost: 0,
    armorDecay: 0,
    healingCost: 0,
    otherCosts: 0,
    stats: emptySessionStats(),
    ...overrides,
  };
}

describe('ensureSingleLoadoutPrimary', () => {
  it('marks a single loadout as primary', () => {
    const result = ensureSingleLoadoutPrimary([makeLoadout({ isPrimary: false })]);
    expect(result).toHaveLength(1);
    expect(result[0].isPrimary).toBe(true);
  });

  it('does not mutate multi-loadout list', () => {
    const result = ensureSingleLoadoutPrimary([
      makeLoadout({ id: 'a', isPrimary: false }),
      makeLoadout({ id: 'b', isPrimary: false }),
    ]);
    expect(result.map((l) => l.isPrimary)).toEqual([false, false]);
  });
});

describe('calculateSessionStats', () => {
  it('calculates totals and returns correctly', () => {
    const session = makeSession({
      loot: [
        { id: 'loot1', name: 'Oil', quantity: 1, value: 1, markup: 100, totalValue: 8, timestamp: 1 },
        { id: 'loot2', name: 'Hide', quantity: 1, value: 1, markup: 100, totalValue: 4, timestamp: 2 },
      ],
      ammoCost: 2,
      repairCost: 1,
      armorDecay: 0.5,
      healingCost: 0.5,
      otherCosts: 1,
    });

    const stats = calculateSessionStats(session, 5_000);
    expect(stats.totalLoot).toBe(12);
    expect(stats.totalCost).toBe(5);
    expect(stats.returns).toBeCloseTo(240, 5);
  });

  it('subtracts paused time from duration', () => {
    const session = makeSession({
      startTime: 0,
      status: 'paused',
      pausedAt: 6_000,
      totalPausedMs: 2_000,
    });

    const stats = calculateSessionStats(session, 10_000);
    expect(stats.duration).toBe(4);
  });

  it('computes combat and damage aggregates', () => {
    const session = makeSession({
      damageEvents: [
        { id: 'd1', damage: 10, isCritical: false, timestamp: 1 },
        { id: 'd2', damage: 20, isCritical: true, timestamp: 2 },
      ],
      combatEvents: [
        { id: 'c1', type: 'dodge', timestamp: 1 },
        { id: 'c2', type: 'evade', timestamp: 2 },
        { id: 'c3', type: 'miss', timestamp: 3 },
      ],
      healingEvents: [{ id: 'h1', amount: 5, timestamp: 3 }],
      damageTakenEvents: [{ id: 't1', damage: 7, isCritical: false, timestamp: 4 }],
      globals: [
        { id: 'g1', creature: 'A', value: 10, isHoF: false, timestamp: 1 },
        { id: 'g2', creature: 'B', value: 20, isHoF: true, timestamp: 2 },
      ],
    });

    const stats = calculateSessionStats(session, 9_000);
    expect(stats.damageDealt).toBe(30);
    expect(stats.damageTaken).toBe(7);
    expect(stats.criticalHits).toBe(1);
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.dodges).toBe(1);
    expect(stats.evades).toBe(1);
    expect(stats.shotsFired).toBe(4);
    expect(stats.healsUsed).toBe(1);
    expect(stats.totalHealing).toBe(5);
    expect(stats.globals).toBe(1);
    expect(stats.hofs).toBe(1);
  });
});
