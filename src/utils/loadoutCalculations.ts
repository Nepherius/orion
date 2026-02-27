import { EquipmentItem, LoadoutEnhancers, Loadout } from '../types';

export interface LoadoutStats {
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
  enhancers: LoadoutEnhancers
): LoadoutStats {
  const weaponDecay = weapon?.Properties?.Economy?.Decay || 0;
  const ampDecay = amplifier?.Properties?.Economy?.Decay || 0;
  const scopeDecay = scope?.Properties?.Economy?.Decay || 0;
  const totalDecay = weaponDecay + ampDecay + scopeDecay;

  const ammoBurn = weapon?.Properties?.Economy?.AmmoBurn || 0;
  const costPerShot = (totalDecay + ammoBurn) / 100; // PEC to PED

  const weaponDamage = weapon?.Properties?.Damage?.Penetration || 0;
  const totalDamage = weaponDamage * (1 + enhancers.dmg * 0.01);

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
    ammoBurn,
    totalUses: weapon?.Properties?.Economy?.MaxTT
      ? Math.floor(weapon.Properties.Economy.MaxTT / totalDecay)
      : null,
  };
}

/**
 * Filter equipment items by search query
 */
export function filterEquipmentItems(items: EquipmentItem[], search: string, limit: number = 10): EquipmentItem[] {
  if (!search) return items.slice(0, limit);
  return items
    .filter((item) => item.Name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, limit);
}

/**
 * Get equipment cost breakdown
 */
export function getEquipmentCosts(loadout: Partial<Loadout>): {
  weapon: number;
  amplifier: number;
  scope: number;
  sight: number;
  sight2: number;
  absorber: number;
  enhancers: number;
  total: number;
} {
  return {
    weapon: loadout.weapon?.Properties?.Economy?.Decay || 0,
    amplifier: loadout.amplifier?.Properties?.Economy?.Decay || 0,
    scope: loadout.scope?.Properties?.Economy?.Decay || 0,
    sight: loadout.sight?.Properties?.Economy?.Decay || 0,
    sight2: loadout.sight2?.Properties?.Economy?.Decay || 0,
    absorber: loadout.absorber?.Properties?.Economy?.Decay || 0,
    enhancers: 0, // Placeholder
    total: loadout.costPerShot || 0,
  };
}
