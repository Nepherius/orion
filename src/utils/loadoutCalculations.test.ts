import { describe, expect, it } from 'vitest';
import { calculateLoadoutStats } from './loadoutCalculations';
import { EquipmentItem } from '../types';

function makeWeapon(): EquipmentItem {
  return {
    Id: 1,
    ItemId: 1,
    Name: 'Test Weapon',
    Properties: {
      Damage: { Penetration: 50 },
      Economy: { Decay: 2, AmmoBurn: 100, Efficiency: 65, MaxTT: 1000 },
      Range: 55,
    },
  };
}

describe('calculateLoadoutStats', () => {
  it('calculates expected baseline values', () => {
    const weapon = makeWeapon();
    const amplifier: EquipmentItem = {
      Id: 2,
      ItemId: 2,
      Name: 'Amp',
      Properties: { Economy: { Decay: 1 } },
    };

    const stats = calculateLoadoutStats(
      weapon,
      amplifier,
      undefined,
      undefined,
      undefined,
      undefined
    );

    expect(stats.decay).toBe(3);
    expect(stats.ammoBurn).toBe(100);
    expect(stats.costPerShot).toBeCloseTo(4, 6);
    expect(stats.totalDamage).toBe(50);
    expect(stats.dpp).toBeCloseTo(12.5, 3);
    expect(stats.range).toBe(55);
    expect(stats.efficiency).toBe(65);
  });
});
