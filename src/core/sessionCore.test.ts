import { describe, expect, it } from 'vitest';
import { HuntSession, Loadout } from '../types';
import {
  calculateSessionStats,
  emptySessionStats,
  ensureSingleLoadoutPrimary,
} from './sessionCore';

function makeLoadout(overrides: Partial<Loadout> = {}): Loadout {
  return {
    id: 'l1',
    name: 'Frontier',
    isPrimary: false,
    favorite: false,
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
  const base: HuntSession = {
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
    stats: emptySessionStats(),
  };

  return {
    ...base,
    ...overrides,
    loot: overrides.loot ?? base.loot,
    skills: overrides.skills ?? base.skills,
    globals: overrides.globals ?? base.globals,
    kills: overrides.kills ?? base.kills,
    damageEvents: overrides.damageEvents ?? base.damageEvents,
    combatEvents: overrides.combatEvents ?? base.combatEvents,
    healingEvents: overrides.healingEvents ?? base.healingEvents,
    damageTakenEvents: overrides.damageTakenEvents ?? base.damageTakenEvents,
    notes: overrides.notes ?? base.notes,
    stats: overrides.stats ?? base.stats,
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
  it('keeps existing totalLoot and returns based on markup-adjusted loot', () => {
    const session = makeSession({
      loot: [
        {
          id: 'loot1',
          name: 'Oil',
          quantity: 2,
          value: 10,
          markup: 125,
          totalValue: 25,
          timestamp: 1,
        },
        {
          id: 'loot2',
          name: 'Rare Component',
          quantity: 1,
          value: 5,
          markup: 200,
          fixedValue: 3,
          totalValue: 8,
          timestamp: 2,
        },
      ],
      ammoCost: 20,
      weaponDecay: 5,
    });

    const stats = calculateSessionStats(session, 5_000);
    expect(stats.totalLoot).toBe(33);
    expect(stats.totalCost).toBe(25);
    expect(stats.returns).toBe(132);
  });

  it('keeps fixed value as an added PED value instead of applying markup', () => {
    const session = makeSession({
      loot: [
        {
          id: 'loot1',
          name: 'Limited Part',
          quantity: 3,
          value: 4,
          markup: 250,
          fixedValue: 1.5,
          totalValue: 16.5,
          timestamp: 1,
        },
      ],
      ammoCost: 10,
    });

    const stats = calculateSessionStats(session, 5_000);
    expect(stats.totalLoot).toBe(16.5);
    expect(stats.returns).toBe(165);
  });

  it('exposes explicit TT and adjusted accounting for mixed loot', () => {
    const session = makeSession({
      loot: [
        {
          id: 'loot1',
          name: 'Animal Oil',
          quantity: 2,
          value: 10,
          markup: 125,
          totalValue: 25,
          timestamp: 1,
        },
        {
          id: 'loot2',
          name: 'Robot Residue',
          quantity: 4,
          value: 3,
          markup: 200,
          totalValue: 24,
          timestamp: 2,
        },
        {
          id: 'loot3',
          name: 'Rare Component',
          quantity: 1,
          value: 5,
          markup: 150,
          fixedValue: 2,
          totalValue: 7,
          timestamp: 3,
        },
      ],
      ammoCost: 40,
      weaponDecay: 10,
    });

    const stats = calculateSessionStats(session, 5_000);
    expect(stats.totalTtLoot).toBe(37);
    expect(stats.totalAdjustedLoot).toBe(56);
    expect(stats.totalMarkupGain).toBe(17);
    expect(stats.totalFixedGain).toBe(2);
    expect(stats.ttReturns).toBeCloseTo(74, 6);
    expect(stats.adjustedReturns).toBeCloseTo(112, 6);
    expect(stats.ttProfit).toBe(-13);
    expect(stats.adjustedProfit).toBe(6);
    expect(stats.totalLoot).toBe(stats.totalAdjustedLoot);
    expect(stats.returns).toBe(stats.adjustedReturns);
  });

  it('returns zeroed explicit accounting fields for empty stats', () => {
    expect(emptySessionStats()).toMatchObject({
      totalTtLoot: 0,
      totalAdjustedLoot: 0,
      totalMarkupGain: 0,
      totalFixedGain: 0,
      ttReturns: 0,
      adjustedReturns: 0,
      ttProfit: 0,
      adjustedProfit: 0,
    });
  });

  it('calculates totals and returns correctly', () => {
    const session = makeSession({
      loot: [
        {
          id: 'loot1',
          name: 'Oil',
          quantity: 1,
          value: 1,
          markup: 100,
          totalValue: 8,
          timestamp: 1,
        },
        {
          id: 'loot2',
          name: 'Hide',
          quantity: 1,
          value: 1,
          markup: 100,
          totalValue: 4,
          timestamp: 2,
        },
      ],
      ammoCost: 2,
      weaponDecay: 1,
      healingCost: 0.5,
      otherCosts: 1,
    });

    const stats = calculateSessionStats(session, 5_000);
    expect(stats.totalLoot).toBe(12);
    expect(stats.totalCost).toBe(4.5);
    expect(stats.returns).toBeCloseTo(266.6667, 4);
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
        { id: 'c1', type: 'player_dodge', timestamp: 1 },
        { id: 'c2', type: 'player_evade', timestamp: 2 },
        { id: 'c3', type: 'player_miss', timestamp: 3 },
        { id: 'c4', type: 'enemy_dodge', timestamp: 4 },
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
    expect(stats.enemyDodges).toBe(1);
    expect(stats.shotsFired).toBe(4);
    expect(stats.healsUsed).toBe(1);
    expect(stats.totalHealing).toBe(5);
    expect(stats.globals).toBe(1);
    expect(stats.hofs).toBe(1);
  });

  it('uses tracked kill events as authoritative kill count', () => {
    const session = makeSession({
      kills: [
        {
          id: 'k1',
          creatureName: 'Argonaut',
          hpDealt: 150,
          cost: 1.2,
          lootValue: 0.9,
          timestamp: 1,
        },
        {
          id: 'k2',
          creatureName: 'Argonaut',
          hpDealt: 145,
          cost: 1.1,
          lootValue: 0.8,
          timestamp: 2,
        },
      ],
    });

    const stats = calculateSessionStats(session, 5_000);
    expect(stats.kills).toBe(2);
  });

  it('counts 0 kills when no tracked kills exist', () => {
    const session = makeSession({ kills: [] });
    const stats = calculateSessionStats(session);
    expect(stats.kills).toBe(0);
  });

  it('counts 1 kill for a single tracked kill', () => {
    const session = makeSession({
      kills: [
        {
          id: 'k1',
          creatureName: 'Berycled',
          hpDealt: 80,
          cost: 0.4,
          lootValue: 0.3,
          timestamp: 1000,
        },
      ],
    });
    const stats = calculateSessionStats(session, 5000);
    expect(stats.kills).toBe(1);
  });
});
