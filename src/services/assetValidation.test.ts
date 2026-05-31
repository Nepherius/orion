import { describe, expect, it } from 'vitest';
import {
  validateArmorItems,
  validateEquipmentItems,
  validateMedicalTools,
} from './assetValidation';

describe('asset validation', () => {
  it('keeps valid equipment and normalizes missing numeric fields', () => {
    expect(
      validateEquipmentItems({
        data: [
          { Id: 1, ItemId: 2, Name: 'Weapon', Properties: { Economy: { Decay: 0.1 } } },
          { Id: 3, ItemId: 4, Name: '', Properties: {} },
          { Id: 5, ItemId: 6, Properties: {} },
        ],
      } as never)
    ).toEqual([
      {
        Id: 1,
        ItemId: 2,
        Name: 'Weapon',
        Properties: {
          Economy: { Decay: 0.1, AmmoBurn: 0, Efficiency: 0, MaxTT: 0 },
          Damage: { Penetration: 0 },
          Range: 0,
        },
      },
    ]);
  });

  it('drops malformed armor and medical entries', () => {
    expect(validateArmorItems({ armor: ['Pixie', '', 42] } as never)).toEqual(['Pixie']);
    expect(
      validateMedicalTools({
        medicalTools: [
          { name: 'FAP', type: 'fap', tt: 1, markup: 100, decay: 0.1, me: 0 },
          { name: '', type: 'fap' },
          { type: 'fap' },
        ],
      } as never)
    ).toEqual([{ name: 'FAP', type: 'fap', tt: 1, markup: 100, decay: 0.1, me: 0, mecost: null }]);
  });
});
