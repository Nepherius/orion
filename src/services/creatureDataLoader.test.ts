import { describe, expect, it } from 'vitest';
import type { CreatureEntry } from '../types';
import { inferMaturity, mergeCreatureEntryDetails } from './creatureDataLoader';

describe('mergeCreatureEntryDetails', () => {
  it('fills missing regen fields from bundled creature data', () => {
    const staleAppData: CreatureEntry[] = [
      {
        name: 'Exarosaur (Calypso)',
        maturity: 'Mature',
        hp: 60,
      },
    ];
    const bundledData: CreatureEntry[] = [
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

    expect(mergeCreatureEntryDetails(staleAppData, bundledData)).toEqual([
      {
        name: 'Exarosaur (Calypso)',
        maturity: 'Mature',
        hp: 60,
        regenInterval: 620,
        regenAmount: 0.1,
        level: 3,
        attacksPerMinute: 20,
      },
    ]);
  });

  it('preserves explicit null fields from the primary creature data', () => {
    const primaryData: CreatureEntry[] = [
      {
        name: 'Exarosaur (Calypso)',
        maturity: 'Highland',
        hp: 10,
        regenInterval: null,
        regenAmount: null,
      },
    ];
    const bundledData: CreatureEntry[] = [
      {
        name: 'Exarosaur (Calypso)',
        maturity: 'Highland',
        hp: 10,
        regenInterval: 620,
        regenAmount: 0.1,
      },
    ];

    expect(mergeCreatureEntryDetails(primaryData, bundledData)[0]).toMatchObject({
      regenInterval: null,
      regenAmount: null,
    });
  });
});

const exarosaur: CreatureEntry[] = [
  { name: 'Exarosaur (Calypso)', maturity: 'Young', hp: 50 },
  { name: 'Exarosaur (Calypso)', maturity: 'Mature', hp: 60 },
];

describe('inferMaturity', () => {
  it('does not select a maturity whose HP is above dealt damage', () => {
    expect(inferMaturity('Exarosaur (Calypso)', 55, exarosaur)).toBe('Young');
    expect(inferMaturity('Exarosaur (Calypso)', 59, exarosaur)).toBe('Young');
  });

  it('selects exact HP maturity when available', () => {
    expect(inferMaturity('Exarosaur (Calypso)', 60, exarosaur)).toBe('Mature');
  });

  it('allows up to 20% overkill for matched maturity', () => {
    expect(inferMaturity('Exarosaur (Calypso)', 66, exarosaur)).toBe('Mature');
  });

  it('returns undefined when damage is below minimum maturity HP', () => {
    expect(inferMaturity('Exarosaur (Calypso)', 49, exarosaur)).toBeUndefined();
  });

  it('returns undefined when damage exceeds all maturities by more than 20%', () => {
    expect(inferMaturity('Exarosaur (Calypso)', 73, exarosaur)).toBeUndefined();
  });
});
