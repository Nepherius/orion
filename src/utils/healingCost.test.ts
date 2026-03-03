import { describe, expect, it } from 'vitest';
import { calculateHealingCostPerUse } from './healingCost';

describe('calculateHealingCostPerUse', () => {
  it('calculates FAP cost with no MU and ignores ME cost', () => {
    const result = calculateHealingCostPerUse({
      medicalDecay: 20,
      medicalMarkup: 100,
      medicalME: 200,
      medicalMEMarkup: 150,
      isFapType: true,
    });

    expect(result).toBeCloseTo(0.2, 6);
  });

  it('calculates mindforce cost with no MU', () => {
    const result = calculateHealingCostPerUse({
      medicalDecay: 20,
      medicalMarkup: 100,
      medicalME: 100,
      medicalMEMarkup: 100,
      isFapType: false,
    });

    expect(result).toBeCloseTo(0.21, 6);
  });

  it('calculates tool MU with no ME MU', () => {
    const result = calculateHealingCostPerUse({
      medicalDecay: 20,
      medicalMarkup: 120,
      medicalME: 100,
      medicalMEMarkup: 100,
      isFapType: false,
    });

    expect(result).toBeCloseTo(0.25, 6);
  });

  it('calculates ME MU with no tool MU', () => {
    const result = calculateHealingCostPerUse({
      medicalDecay: 20,
      medicalMarkup: 100,
      medicalME: 100,
      medicalMEMarkup: 130,
      isFapType: false,
    });

    expect(result).toBeCloseTo(0.213, 6);
  });

  it('calculates both tool MU and ME MU together', () => {
    const result = calculateHealingCostPerUse({
      medicalDecay: 10,
      medicalMarkup: 115,
      medicalME: 200,
      medicalMEMarkup: 130,
      isFapType: false,
    });

    expect(result).toBeCloseTo(0.141, 6);
  });

  it('clamps negative values to zero', () => {
    const result = calculateHealingCostPerUse({
      medicalDecay: -10,
      medicalMarkup: -100,
      medicalME: -20,
      medicalMEMarkup: -120,
      isFapType: false,
    });

    expect(result).toBe(0);
  });
});
