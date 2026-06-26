import { describe, expect, it } from 'vitest';
import type { CreatureEntry, HuntSession, Kill, Loadout } from '../types';
import { emptySessionStats } from '../core/sessionCore';
import { calculateSessionAdvisor } from './sessionAdvisor';

function makeLoadout(overrides: Partial<Loadout> = {}): Loadout {
  return {
    id: 'l1',
    name: 'Test loadout',
    isPrimary: false,
    favorite: false,
    weapon: {
      Id: 1,
      ItemId: 1,
      Name: 'Rifle',
      Properties: {
        UsesPerMinute: 60,
        Economy: { Decay: 1, AmmoBurn: 100, Efficiency: 60, MaxTT: 10 },
        Damage: { Penetration: 20 },
        Range: 50,
      },
    },
    costPerShot: 0.02,
    dpp: 3,
    totalDamage: 20,
    range: 50,
    criticalChance: 2,
    hitRate: 90,
    effectiveDamage: 18,
    efficiency: 60,
    decay: 1,
    ammoBurn: 100,
    totalUses: null,
    ...overrides,
  };
}

function makeSession(overrides: Partial<HuntSession> = {}): HuntSession {
  return {
    id: 's1',
    name: 'Run',
    startTime: 1,
    status: 'completed',
    weapon: 'Rifle',
    creature: 'Bristlehog',
    loot: [],
    skills: [],
    globals: [],
    kills: [],
    damageEvents: [],
    combatEvents: [],
    healingEvents: [],
    damageTakenEvents: [],
    notes: '',
    ammoCost: 10,
    weaponDecay: 0,
    healingCost: 0,
    otherCosts: 0,
    stats: emptySessionStats(),
    ...overrides,
  };
}

function makeKill(overrides: Partial<Kill> = {}): Kill {
  return {
    id: 'k1',
    creatureName: 'Bristlehog',
    maturity: 'Pup',
    hpDealt: 20,
    cost: 0.1,
    lootValue: 0,
    timestamp: 1,
    ...overrides,
  };
}

function makeFrontierLoadout(overrides: Partial<Loadout> = {}): Loadout {
  return makeLoadout({
    weapon: {
      Id: 2952,
      ItemId: 2002952,
      Name: 'Frontier Hunting Rifle, Adjusted',
      Properties: {
        UsesPerMinute: 48,
        Economy: { Decay: 0.02, AmmoBurn: 180, Efficiency: 65, MaxTT: 2 },
        Damage: { Penetration: 2.5, Burn: 7.5 },
        Range: 70,
      },
    },
    costPerShot: 0.0182,
    dpp: 10 / 0.0182,
    totalDamage: 10,
    effectiveDamage: 9,
    efficiency: 65,
    decay: 0.02,
    ammoBurn: 180,
    ...overrides,
  });
}

const bristlehog: CreatureEntry[] = [
  {
    name: 'Bristlehog',
    maturity: 'Pup',
    hp: 20,
    regenInterval: 9,
    regenAmount: 1,
    level: 1,
    attacksPerMinute: 19,
  },
];

const maturitySpread: CreatureEntry[] = [
  {
    name: 'Atrox',
    maturity: 'Young',
    hp: 500,
    regenInterval: 210,
    regenAmount: 2.38,
    level: 12,
    attacksPerMinute: 15,
  },
  {
    name: 'Atrox',
    maturity: 'Provider',
    hp: 1000,
    regenInterval: 210,
    regenAmount: 4.76,
    level: 24,
    attacksPerMinute: 15,
  },
  {
    name: 'Atrox',
    maturity: 'Alpha',
    hp: 1740,
    regenInterval: 210,
    regenAmount: 8.29,
    level: 37,
    attacksPerMinute: 15,
  },
];

const exarosaurMature: CreatureEntry[] = [
  {
    name: 'Exarosaur (Calypso)',
    maturity: 'Mature',
    hp: 60,
    regenInterval: 620,
    regenAmount: 0.1,
    level: 3,
    attacksPerMinute: 20,
  },
];

const exarosaurMaturities: CreatureEntry[] = [
  {
    name: 'Exarosaur (Calypso)',
    maturity: 'Young',
    hp: 50,
    regenInterval: 520,
    regenAmount: 0.1,
    level: 3,
    attacksPerMinute: 20,
  },
  ...exarosaurMature,
  {
    name: 'Exarosaur (Calypso)',
    maturity: 'Provider',
    hp: 120,
    regenInterval: 360,
    regenAmount: 0.33,
    level: 4,
    attacksPerMinute: 20,
  },
  {
    name: 'Exarosaur (Calypso)',
    maturity: 'Prowler',
    hp: 200,
    regenInterval: 360,
    regenAmount: 0.56,
    level: 6,
    attacksPerMinute: 20,
  },
];

describe('calculateSessionAdvisor', () => {
  it('returns incomplete without a loadout', () => {
    const result = calculateSessionAdvisor({
      loadout: null,
      creatureName: 'Bristlehog',
      creatureEntries: bristlehog,
      sessions: [],
    });

    expect(result.score).toBeNull();
    expect(result.label).toBe('Incomplete');
  });

  it('scores bankroll depth from estimated cost per kill', () => {
    const result = calculateSessionAdvisor({
      loadout: makeLoadout(),
      creatureName: 'Bristlehog',
      creatureEntries: bristlehog,
      bankroll: 1,
      sessions: [],
    });

    expect(result.score).not.toBeNull();
    expect(result.factors.find((factor) => factor.id === 'bankroll')?.points).toBe(3);
    expect(result.factors.find((factor) => factor.label === 'Bankroll gate')).toBeTruthy();
  });

  it('penalizes a plan that cannot beat regeneration', () => {
    const result = calculateSessionAdvisor({
      loadout: makeLoadout({ effectiveDamage: 0.5, totalDamage: 0.5 }),
      creatureName: 'Big Regen',
      creatureEntries: [
        {
          name: 'Big Regen',
          maturity: 'Default',
          hp: 100,
          regenInterval: 1,
          regenAmount: 20,
        },
      ],
      sessions: [],
    });

    expect(result.factors.find((factor) => factor.id === 'dps-regen')?.points).toBe(0);
    expect(result.metrics.estimatedKillSeconds).toBeUndefined();
    expect(result.metrics.estimatedShotsToKill).toBeUndefined();
    expect(result.label).toBe('Risky');
  });

  it('scores the same loadout lower when armor is selected', () => {
    const noArmor = calculateSessionAdvisor({
      loadout: makeLoadout({ armor: '' }),
      creatureName: 'Bristlehog',
      creatureEntries: bristlehog,
      sessions: [],
    });
    const armored = calculateSessionAdvisor({
      loadout: makeLoadout({ armor: 'Pixie' }),
      creatureName: 'Bristlehog',
      creatureEntries: bristlehog,
      sessions: [],
    });

    expect(armored.score).toBeLessThan(noArmor.score ?? 0);
    expect(armored.factors.find((factor) => factor.id === 'armor')?.points).toBe(1);
    expect(noArmor.factors.find((factor) => factor.id === 'armor')?.points).toBe(3);
  });

  it('scores an armored regen-beating loadout above an unarmored loadout that cannot beat regen', () => {
    const creatureEntries: CreatureEntry[] = [
      {
        name: 'Big Regen',
        maturity: 'Default',
        hp: 100,
        regenInterval: 1,
        regenAmount: 20,
      },
    ];

    const unarmoredCannotKill = calculateSessionAdvisor({
      loadout: makeLoadout({ armor: '', effectiveDamage: 0.5, totalDamage: 0.5 }),
      creatureName: 'Big Regen',
      creatureEntries,
      sessions: [],
    });
    const armoredCanKill = calculateSessionAdvisor({
      loadout: makeLoadout({
        armor: 'Pixie',
        weapon: {
          Id: 2,
          ItemId: 2,
          Name: 'Bigger Rifle',
          Properties: {
            UsesPerMinute: 60,
            Economy: { Decay: 1, AmmoBurn: 100, Efficiency: 60, MaxTT: 10 },
            Damage: { Penetration: 45 },
            Range: 50,
          },
        },
        effectiveDamage: 40,
        totalDamage: 45,
      }),
      creatureName: 'Big Regen',
      creatureEntries,
      sessions: [],
    });

    expect((armoredCanKill.score ?? 0) - (unarmoredCannotKill.score ?? 0)).toBeGreaterThan(20);
  });

  it('uses personal completed session history after three sessions', () => {
    const sessions = [1, 2, 3].map((index) =>
      makeSession({
        id: `s${index}`,
        loot: [
          {
            id: `l${index}`,
            name: 'Oil',
            quantity: 1,
            value: 10,
            markup: 105,
            totalValue: 11,
            timestamp: index,
          },
        ],
      })
    );

    const result = calculateSessionAdvisor({
      loadout: makeLoadout(),
      creatureName: 'Bristlehog',
      creatureEntries: bristlehog,
      sessions,
    });

    const history = result.factors.find((factor) => factor.id === 'history');
    expect(history?.points).toBeGreaterThan(0);
    expect(result.metrics.personalSessions).toBe(3);
  });

  it('adds impact for good same-loadout history', () => {
    const sessions = [1, 2, 3].map((index) =>
      makeSession({
        id: `s${index}`,
        loadoutId: 'l1',
        loadoutNameSnapshot: 'Test loadout',
        loot: [
          {
            id: `l${index}`,
            name: 'Oil',
            quantity: 1,
            value: 10,
            markup: 105,
            totalValue: 11,
            timestamp: index,
          },
        ],
      })
    );

    const result = calculateSessionAdvisor({
      loadout: makeLoadout(),
      creatureName: 'Bristlehog',
      creatureEntries: bristlehog,
      sessions,
    });

    const sameLoadoutHistory = result.factors.find(
      (factor) => factor.id === 'same-loadout-history'
    );
    expect(sameLoadoutHistory?.points).toBeGreaterThan(0);
    expect(result.metrics.sameLoadoutSessions).toBe(3);
  });

  it('uses selected maturity instead of median fallback', () => {
    const fallback = calculateSessionAdvisor({
      loadout: makeLoadout({ effectiveDamage: 80, totalDamage: 90 }),
      creatureName: 'Atrox',
      creatureEntries: maturitySpread,
      sessions: [],
    });
    const selectedYoung = calculateSessionAdvisor({
      loadout: makeLoadout({ effectiveDamage: 80, totalDamage: 90 }),
      creatureName: 'Atrox',
      creatureEntries: maturitySpread,
      plannedMaturities: ['Young'],
      sessions: [],
    });

    expect(fallback.metrics.creatureEntry?.maturity).toBe('Provider');
    expect(selectedYoung.metrics.creatureEntry?.maturity).toBe('Young');
    expect(selectedYoung.metrics.maturitySelectionMode).toBe('selected');
    expect(selectedYoung.metrics.estimatedCostPerKill).toBeLessThan(
      fallback.metrics.estimatedCostPerKill ?? Number.POSITIVE_INFINITY
    );
  });

  it('uses a higher-maturity-weighted average when several maturities are selected', () => {
    const result = calculateSessionAdvisor({
      loadout: makeLoadout({ effectiveDamage: 80, totalDamage: 90 }),
      creatureName: 'Atrox',
      creatureEntries: maturitySpread,
      plannedMaturities: ['Young', 'Alpha'],
      sessions: [],
    });

    expect(result.metrics.creatureEntry?.maturity).toBe('Weighted (2 selected)');
    expect(result.metrics.creatureEntry?.hp).toBeGreaterThan((500 + 1740) / 2);
    expect(result.metrics.creatureEntry?.hp).toBeLessThan(1740);
    expect(result.metrics.maturityAggregationMode).toBe('risk-weighted');
    expect(result.factors.find((factor) => factor.id === 'data-confidence')?.detail).toContain(
      'risk-weighted average'
    );
  });

  it('tanks the score when any selected maturity cannot beat regeneration', () => {
    const result = calculateSessionAdvisor({
      loadout: makeLoadout({ effectiveDamage: 20, totalDamage: 22 }),
      creatureName: 'Regen Test',
      creatureEntries: [
        {
          name: 'Regen Test',
          maturity: 'Low',
          hp: 50,
          regenInterval: 10,
          regenAmount: 1,
        },
        {
          name: 'Regen Test',
          maturity: 'High',
          hp: 100,
          regenInterval: 1,
          regenAmount: 30,
        },
      ],
      plannedMaturities: ['Low', 'High'],
      sessions: [],
    });

    expect(result.metrics.failedRegenMaturities).toContain('High');
    expect(result.factors.find((factor) => factor.id === 'dps-regen')?.points).toBe(0);
    expect(result.score).toBeLessThan(45);
    expect(result.label).toBe('Risky');
  });

  it('penalizes severe weapon overkill against selected maturity HP', () => {
    const normalFit = calculateSessionAdvisor({
      loadout: makeLoadout({ effectiveDamage: 8, totalDamage: 9 }),
      creatureName: 'Bristlehog',
      creatureEntries: bristlehog,
      plannedMaturities: ['Pup'],
      sessions: [],
    });
    const overkill = calculateSessionAdvisor({
      loadout: makeLoadout({
        weapon: {
          Id: 3,
          ItemId: 3,
          Name: 'Oversized Rifle',
          Properties: {
            UsesPerMinute: 60,
            Economy: { Decay: 1, AmmoBurn: 100, Efficiency: 60, MaxTT: 10 },
            Damage: { Penetration: 110 },
            Range: 50,
          },
        },
        effectiveDamage: 100,
        totalDamage: 110,
      }),
      creatureName: 'Bristlehog',
      creatureEntries: bristlehog,
      plannedMaturities: ['Pup'],
      sessions: [],
    });

    expect(overkill.factors.find((factor) => factor.id === 'damage-hp-fit')?.points).toBe(0);
    expect(overkill.score).toBeLessThan(normalFit.score ?? 0);
    expect(overkill.score).toBeLessThan(65);
  });

  it('treats missing regen as low risk under 50 hp', () => {
    const result = calculateSessionAdvisor({
      loadout: makeLoadout({ effectiveDamage: 8, totalDamage: 9 }),
      creatureName: 'Tiny Unknown',
      creatureEntries: [
        {
          name: 'Tiny Unknown',
          maturity: 'Small',
          hp: 49,
          regenInterval: null,
          regenAmount: null,
        },
      ],
      plannedMaturities: ['Small'],
      sessions: [],
    });

    expect(result.metrics.regenRisk).toBe('unknown-low');
    expect(result.factors.find((factor) => factor.id === 'dps-regen')?.points).toBeGreaterThan(0);
  });

  it('caps missing regen over 150 hp as high risk', () => {
    const result = calculateSessionAdvisor({
      loadout: makeLoadout({ effectiveDamage: 80, totalDamage: 90 }),
      creatureName: 'Large Unknown',
      creatureEntries: [
        {
          name: 'Large Unknown',
          maturity: 'Big',
          hp: 200,
          regenInterval: null,
          regenAmount: null,
        },
      ],
      plannedMaturities: ['Big'],
      bankroll: 1000,
      sessions: [],
    });

    expect(result.metrics.regenRisk).toBe('unknown-high');
    expect(result.factors.find((factor) => factor.id === 'dps-regen')?.points).toBe(4);
    expect(result.score).toBeLessThan(45);
    expect(result.label).toBe('Risky');
  });

  it('uses known regen data for Exarosaur Calypso Mature', () => {
    const result = calculateSessionAdvisor({
      loadout: makeLoadout({ effectiveDamage: 8, totalDamage: 9 }),
      creatureName: 'Exarosaur (Calypso)',
      creatureEntries: exarosaurMature,
      plannedMaturities: ['Mature'],
      sessions: [],
    });

    expect(result.metrics.regenRisk).toBe('known');
    expect(result.metrics.creatureEntry?.maturity).toBe('Mature');
    expect(result.metrics.regenDps).toBeCloseTo(0.1 / 620);
    expect(result.factors.find((factor) => factor.id === 'dps-regen')?.detail).not.toContain(
      'missing'
    );
  });

  it('uses combat-adjusted damage for Exarosaur Mature kill estimates without history', () => {
    const result = calculateSessionAdvisor({
      loadout: makeFrontierLoadout(),
      creatureName: 'Exarosaur (Calypso)',
      creatureEntries: exarosaurMature,
      plannedMaturities: ['Mature'],
      bankroll: 100,
      sessions: [],
    });

    expect(result.metrics.costEstimateSource).toBe('theoretical');
    expect(result.metrics.planningDamagePerShot).toBeCloseTo(6.75);
    expect(result.metrics.estimatedCostPerKill).toBeGreaterThan(0.16);
    expect(result.metrics.bankrollKills).toBeLessThan(625);
  });

  it('uses logged maturity kill cost when enough matching kills exist', () => {
    const kills = Array.from({ length: 30 }, (_, index) =>
      makeKill({
        id: `k${index}`,
        creatureName: 'Exarosaur (Calypso)',
        maturity: 'Mature',
        hpDealt: 63,
        cost: 0.1787,
      })
    );
    const result = calculateSessionAdvisor({
      loadout: makeFrontierLoadout(),
      creatureName: 'Exarosaur (Calypso)',
      creatureEntries: exarosaurMature,
      plannedMaturities: ['Mature'],
      bankroll: 100,
      sessions: [
        makeSession({
          creature: 'Exarosaur (Calypso)',
          kills,
          ammoCost: 5,
          weaponDecay: 0.361,
        }),
      ],
    });

    expect(result.metrics.costEstimateSource).toBe('maturity-history');
    expect(result.metrics.historicalKillSamples).toBe(30);
    expect(result.metrics.estimatedCostPerKill).toBeCloseTo(0.1787);
    expect(result.metrics.bankrollKills).toBeCloseTo(559.6, 1);
  });

  it('caps a strong combat fit to caution when entered bankroll covers fewer than 50 kills', () => {
    const result = calculateSessionAdvisor({
      loadout: makeFrontierLoadout(),
      creatureName: 'Exarosaur (Calypso)',
      creatureEntries: exarosaurMature,
      plannedMaturities: ['Mature'],
      bankroll: 5,
      sessions: [],
    });

    expect(result.metrics.bankrollKills).toBeLessThan(50);
    expect(result.score).toBeLessThan(65);
    expect(result.label).toBe('Caution');
    expect(result.factors.find((factor) => factor.label === 'Bankroll gate')).toBeTruthy();
  });

  it('scores the selected Exarosaur Provider maturity instead of falling back to Prowler', () => {
    const result = calculateSessionAdvisor({
      loadout: makeFrontierLoadout(),
      creatureName: 'Exarosaur (Calypso)',
      creatureEntries: exarosaurMaturities,
      plannedMaturities: ['Provider'],
      bankroll: 100,
      sessions: [],
    });

    expect(result.metrics.creatureEntry?.maturity).toBe('Provider');
    expect(result.metrics.regenRisk).toBe('known');
    expect(result.metrics.regenDps).toBeCloseTo(0.33 / 360);
    expect(result.metrics.costEstimateSource).toBe('theoretical');
  });

  it('does not use low maturity creature history for Exarosaur Prowler cost estimates', () => {
    const youngKills = Array.from({ length: 40 }, (_, index) =>
      makeKill({
        id: `young-${index}`,
        creatureName: 'Exarosaur (Calypso)',
        maturity: 'Young',
        hpDealt: 54,
        cost: 0.1516,
      })
    );
    const matureKills = Array.from({ length: 40 }, (_, index) =>
      makeKill({
        id: `mature-${index}`,
        creatureName: 'Exarosaur (Calypso)',
        maturity: 'Mature',
        hpDealt: 63,
        cost: 0.1787,
      })
    );

    const result = calculateSessionAdvisor({
      loadout: makeFrontierLoadout(),
      creatureName: 'Exarosaur (Calypso)',
      creatureEntries: exarosaurMaturities,
      plannedMaturities: ['Prowler'],
      bankroll: 100,
      sessions: [
        makeSession({
          creature: 'Exarosaur (Calypso)',
          kills: [...youngKills, ...matureKills],
          ammoCost: 13,
          weaponDecay: 0.22,
        }),
      ],
    });

    expect(result.metrics.creatureEntry?.maturity).toBe('Prowler');
    expect(result.metrics.costEstimateSource).toBe('theoretical');
    expect(result.metrics.estimatedCostPerKill).toBeGreaterThan(0.5);
    expect(result.metrics.bankrollKills).toBeLessThan(200);
  });

  it('caps very slow Exarosaur Prowler plans as risky even when regen is mathematically beaten', () => {
    const result = calculateSessionAdvisor({
      loadout: makeFrontierLoadout(),
      creatureName: 'Exarosaur (Calypso)',
      creatureEntries: exarosaurMaturities,
      plannedMaturities: ['Prowler'],
      bankroll: 100,
      sessions: [],
    });

    expect(result.metrics.estimatedKillSeconds).toBeGreaterThan(30);
    expect(result.score).toBeLessThan(45);
    expect(result.label).toBe('Risky');
    expect(result.factors.find((factor) => factor.label === 'Kill pace gate')).toBeTruthy();
  });

  it('penalizes overamping and caps usable amplifier damage', () => {
    const result = calculateSessionAdvisor({
      loadout: makeLoadout({
        weapon: {
          Id: 1,
          ItemId: 1,
          Name: 'Small Rifle',
          Properties: {
            UsesPerMinute: 60,
            Economy: { Decay: 1, AmmoBurn: 100, Efficiency: 60, MaxTT: 10 },
            Damage: { Penetration: 20 },
            Range: 50,
          },
        },
        amplifier: {
          Id: 2,
          ItemId: 2,
          Name: 'Oversized Amp',
          Properties: {
            Economy: { Decay: 1, AmmoBurn: 100, Efficiency: 0, MaxTT: 10 },
            Damage: { Burn: 20 },
          },
        },
        totalDamage: 40,
        effectiveDamage: 36,
        costPerShot: 0.04,
      }),
      creatureName: 'Atrox',
      creatureEntries: maturitySpread,
      plannedMaturities: ['Young'],
      sessions: [],
    });

    expect(result.metrics.maxDamagePerShot).toBe(30);
    expect(result.metrics.wastedAmplifierDamage).toBe(10);
    expect(result.factors.find((factor) => factor.id === 'amplifier-fit')?.points).toBeLessThan(4);
  });
});
