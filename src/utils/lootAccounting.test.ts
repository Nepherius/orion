import { describe, expect, it } from 'vitest';
import {
  calculateLootAccounting,
  calculateLootItemAccounting,
  calculateSessionAccounting,
} from './lootAccounting';

describe('lootAccounting', () => {
  it('calculates TT, adjusted value, and markup gain for percent markup loot', () => {
    const accounting = calculateLootItemAccounting({
      quantity: 2,
      value: 10,
      totalValue: 25,
      fixedValue: 0,
    });

    expect(accounting).toEqual({
      ttValue: 20,
      adjustedValue: 25,
      markupGain: 5,
      fixedGain: 0,
    });
  });

  it('treats fixed value as extra PED and excludes markup gain', () => {
    const accounting = calculateLootItemAccounting({
      quantity: 3,
      value: 4,
      totalValue: 16.5,
      fixedValue: 1.5,
    });

    expect(accounting).toEqual({
      ttValue: 12,
      adjustedValue: 16.5,
      markupGain: 0,
      fixedGain: 4.5,
    });
  });

  it('keeps negative markup gain when adjusted value is below TT', () => {
    const accounting = calculateLootItemAccounting({
      quantity: 1,
      value: 10,
      totalValue: 8,
      fixedValue: 0,
    });

    expect(accounting.markupGain).toBe(-2);
  });

  it('sums mixed loot into explicit TT and adjusted totals', () => {
    const totals = calculateLootAccounting([
      { quantity: 2, value: 10, totalValue: 25 },
      { quantity: 4, value: 3, totalValue: 24 },
      { quantity: 1, value: 5, totalValue: 7, fixedValue: 2 },
    ]);

    expect(totals).toEqual({
      totalTtLoot: 37,
      totalAdjustedLoot: 56,
      totalMarkupGain: 17,
      totalFixedGain: 2,
    });
  });

  it('calculates TT and adjusted returns from the same cost base', () => {
    const totals = calculateSessionAccounting(
      [
        { quantity: 2, value: 10, totalValue: 25 },
        { quantity: 4, value: 3, totalValue: 24 },
        { quantity: 1, value: 5, totalValue: 7, fixedValue: 2 },
      ],
      50
    );

    expect(totals.ttReturns).toBeCloseTo(74, 6);
    expect(totals.adjustedReturns).toBeCloseTo(112, 6);
    expect(totals.ttProfit).toBe(-13);
    expect(totals.adjustedProfit).toBe(6);
  });
});
