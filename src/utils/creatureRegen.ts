export interface CreatureRegenStats {
  regenInterval?: number | null;
  regenAmount?: number | null;
}

function positiveFiniteNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Returns the damage rate required to break even against a creature's regeneration.
 * With Entropia Nexus mob data, RegenerationInterval is treated as seconds, so this is DPS.
 */
export function calculateDamageNeededToBeatRegen(stats: CreatureRegenStats): number {
  const interval = positiveFiniteNumber(stats.regenInterval);
  const amount = positiveFiniteNumber(stats.regenAmount);

  if (interval === null || amount === null) {
    return 0;
  }

  return amount / interval;
}
