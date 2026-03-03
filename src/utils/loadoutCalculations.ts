import { EquipmentItem } from '../types';

interface LoadoutStats {
  costPerShot: number;
  dpp: number;
  totalDamage: number;
  range: number;
  criticalChance: number;
  hitRate: number;
  effectiveDamage: number;
  efficiency: number;
  decay: number;
  ammoBurn: number;
  totalUses: number | null;
}

/**
 * Calculate comprehensive loadout statistics
 */
export function calculateLoadoutStats(
  weapon: EquipmentItem | undefined,
  amplifier: EquipmentItem | undefined,
  scope: EquipmentItem | undefined,
  sight: EquipmentItem | undefined,
  sight2: EquipmentItem | undefined,
  absorber: EquipmentItem | undefined
): LoadoutStats {
  const weaponDecay = weapon?.Properties?.Economy?.Decay || 0;
  const ampDecay = amplifier?.Properties?.Economy?.Decay || 0;
  const scopeDecay = scope?.Properties?.Economy?.Decay || 0;
  const sightDecay = sight?.Properties?.Economy?.Decay || 0;
  const sight2Decay = sight2?.Properties?.Economy?.Decay || 0;
  const absorberDecay = absorber?.Properties?.Economy?.Decay || 0;
  const totalDecay = weaponDecay + ampDecay + scopeDecay + sightDecay + sight2Decay + absorberDecay;

  const weaponAmmoBurn = weapon?.Properties?.Economy?.AmmoBurn || 0;
  const ampAmmoBurn = amplifier?.Properties?.Economy?.AmmoBurn || 0;
  const totalAmmoBurn = weaponAmmoBurn + ampAmmoBurn;
  // Decay is already in PED, AmmoBurn is in PEC so divide by 100 to get PED
  const costPerShot = totalDecay + totalAmmoBurn / 100;

  const weaponDamage = weapon?.Properties?.Damage?.Penetration || 0;
  const totalDamage = weaponDamage;
  const dpp = totalDamage > 0 && costPerShot > 0 ? totalDamage / costPerShot : 0;
  const range = weapon?.Properties?.Range || 0;
  const efficiency = weapon?.Properties?.Economy?.Efficiency || 0;

  return {
    costPerShot,
    dpp,
    totalDamage,
    range,
    criticalChance: 2.0,
    hitRate: 90.0,
    effectiveDamage: totalDamage * 0.9,
    efficiency,
    decay: totalDecay,
    ammoBurn: totalAmmoBurn,
    totalUses: weapon?.Properties?.Economy?.MaxTT
      ? Math.floor(weapon.Properties.Economy.MaxTT / totalDecay)
      : null,
  };
}

/**
 * Filter equipment items by search query
 */
export function filterEquipmentItems(
  items: EquipmentItem[],
  search: string,
  limit: number = 10
): EquipmentItem[] {
  if (!search) return items.slice(0, limit);
  return items
    .filter((item) => item.Name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, limit);
}
