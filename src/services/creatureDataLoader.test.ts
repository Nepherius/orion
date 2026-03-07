import { describe, expect, it } from 'vitest';
import { inferMaturity, type CreatureEntry } from './creatureDataLoader';

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
