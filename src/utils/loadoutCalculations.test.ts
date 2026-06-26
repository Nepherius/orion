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
    expect(stats.costPerShot).toBeCloseTo(0.04, 6);
    expect(stats.totalDamage).toBe(50);
    expect(stats.dpp).toBeCloseTo(1250, 3);
    expect(stats.range).toBe(55);
    expect(stats.efficiency).toBe(65);
    expect(stats.totalUses).toBe(50000);
  });

  it('calculates weapon total uses from weapon decay only', () => {
    const weapon = makeWeapon();
    const amplifier: EquipmentItem = {
      Id: 2,
      ItemId: 2,
      Name: 'High Decay Amp',
      Properties: { Economy: { Decay: 48 } },
    };

    const stats = calculateLoadoutStats(
      weapon,
      amplifier,
      undefined,
      undefined,
      undefined,
      undefined
    );

    expect(stats.decay).toBe(50);
    expect(stats.totalUses).toBe(50000);
  });

  it('includes every weapon and amplifier damage type in DPP', () => {
    const weapon = makeWeapon();
    weapon.Properties.Damage = { Penetration: 20, Burn: 30 };
    const amplifier: EquipmentItem = {
      Id: 2,
      ItemId: 2,
      Name: 'Damage Amp',
      Properties: {
        Damage: { Impact: 10 },
        Economy: { Decay: 1 },
      },
    };

    const stats = calculateLoadoutStats(
      weapon,
      amplifier,
      undefined,
      undefined,
      undefined,
      undefined
    );

    expect(stats.totalDamage).toBe(60);
    expect(stats.dpp).toBeCloseTo(1500, 3);
  });
});
