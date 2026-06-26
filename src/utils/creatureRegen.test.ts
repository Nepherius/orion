import { describe, expect, it } from 'vitest';
import { calculateDamageNeededToBeatRegen } from './creatureRegen';

describe('calculateDamageNeededToBeatRegen', () => {
  it('returns regen amount divided by interval', () => {
    expect(
      calculateDamageNeededToBeatRegen({
        regenInterval: 10,
        regenAmount: 2.5,
      })
    ).toBeCloseTo(0.25);
  });

  it('returns zero when regen is missing', () => {
    expect(calculateDamageNeededToBeatRegen({})).toBe(0);
    expect(calculateDamageNeededToBeatRegen({ regenInterval: 10, regenAmount: null })).toBe(0);
  });

  it('returns zero for non-positive regen values', () => {
    expect(calculateDamageNeededToBeatRegen({ regenInterval: 0, regenAmount: 2 })).toBe(0);
    expect(calculateDamageNeededToBeatRegen({ regenInterval: 10, regenAmount: 0 })).toBe(0);
  });
});
