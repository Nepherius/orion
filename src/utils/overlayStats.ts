import type { OverlayStatId } from '../types';

export interface OverlayStatDefinition {
  id: OverlayStatId;
  label: string;
  description: string;
  group: 'Core' | 'Returns' | 'Combat' | 'Costs' | 'Progress';
}

export const defaultOverlayStatIds: OverlayStatId[] = [
  'time',
  'loadout',
  'totalCost',
  'adjustedProfit',
  'adjustedReturn',
  'kills',
];

export const compactOverlayStatIds: OverlayStatId[] = [
  'time',
  'loadout',
  'adjustedProfit',
  'adjustedReturn',
  'kills',
];

export const combatOverlayStatIds: OverlayStatId[] = [
  'time',
  'loadout',
  'creature',
  'kills',
  'avgDps',
  'weaponDpp',
  'critRate',
  'hitRate',
  'missRate',
  'globals',
];

export const economyOverlayStatIds: OverlayStatId[] = [
  'time',
  'loadout',
  'totalCost',
  'ttLoot',
  'adjustedLoot',
  'adjustedProfit',
  'adjustedReturn',
  'ttReturn',
  'markupGain',
];

export const costTrackerOverlayStatIds: OverlayStatId[] = [
  'time',
  'loadout',
  'totalCost',
  'ammoCost',
  'weaponDecay',
  'healingCost',
  'otherCosts',
  'adjustedReturn',
  'kills',
];

export const fullDetailOverlayStatIds: OverlayStatId[] = [
  'time',
  'loadout',
  'creature',
  'totalCost',
  'adjustedLoot',
  'adjustedProfit',
  'adjustedReturn',
  'ttReturn',
  'markupGain',
  'kills',
  'avgDps',
  'weaponDpp',
  'critRate',
  'hitRate',
  'weaponDecay',
  'healingCost',
  'skillGains',
];

/** @deprecated Use fullDetailOverlayStatIds instead */
export const forumRequestedOverlayStatIds: OverlayStatId[] = fullDetailOverlayStatIds;

export interface OverlayProfile {
  id: string;
  label: string;
  description: string;
  statIds: OverlayStatId[];
}

export const overlayProfiles: OverlayProfile[] = [
  {
    id: 'compact',
    label: 'Compact',
    description: 'Minimal essentials at a glance',
    statIds: compactOverlayStatIds,
  },
  {
    id: 'default',
    label: 'Standard',
    description: 'Balanced overview with key stats',
    statIds: defaultOverlayStatIds,
  },
  {
    id: 'combat',
    label: 'Combat',
    description: 'Damage, accuracy, and kill tracking',
    statIds: combatOverlayStatIds,
  },
  {
    id: 'economy',
    label: 'Economy',
    description: 'Returns, markup, and profit analysis',
    statIds: economyOverlayStatIds,
  },
  {
    id: 'costTracker',
    label: 'Cost Tracker',
    description: 'Detailed spending breakdown',
    statIds: costTrackerOverlayStatIds,
  },
  {
    id: 'fullDetail',
    label: 'Full Detail',
    description: 'Comprehensive stats for deep analysis',
    statIds: fullDetailOverlayStatIds,
  },
];

export const overlayStatDefinitions: OverlayStatDefinition[] = [
  { id: 'time', label: 'Time', description: 'Current session timer.', group: 'Core' },
  {
    id: 'loadout',
    label: 'Loadout',
    description: 'Current loadout or weapon name.',
    group: 'Core',
  },
  {
    id: 'creature',
    label: 'Creature',
    description: 'Session creature name or maturity when available.',
    group: 'Core',
  },
  {
    id: 'totalCost',
    label: 'Total Cost',
    description: 'All recorded spend for the session.',
    group: 'Returns',
  },
  {
    id: 'ttLoot',
    label: 'TT Loot',
    description: 'Loot value before markup or fixed-value adjustments.',
    group: 'Returns',
  },
  {
    id: 'adjustedLoot',
    label: 'Adjusted Loot',
    description: 'Loot after markup and fixed-value adjustments.',
    group: 'Returns',
  },
  {
    id: 'adjustedProfit',
    label: 'Adjusted P/L',
    description: 'Adjusted loot minus total cost.',
    group: 'Returns',
  },
  {
    id: 'adjustedReturn',
    label: 'Adjusted Return',
    description: 'Adjusted loot divided by total cost.',
    group: 'Returns',
  },
  {
    id: 'ttReturn',
    label: 'TT Return',
    description: 'TT loot divided by total cost.',
    group: 'Returns',
  },
  {
    id: 'markupGain',
    label: 'MU/Fixed Uplift',
    description: 'PED added by markup and fixed-value estimates.',
    group: 'Returns',
  },
  {
    id: 'kills',
    label: 'Kills',
    description: 'Tracked kills in the current session.',
    group: 'Combat',
  },
  {
    id: 'lootEvents',
    label: 'Loot Events',
    description: 'Loot events captured from chat/logging.',
    group: 'Combat',
  },
  {
    id: 'globals',
    label: 'Globals',
    description: 'Globals and HoFs in the current session.',
    group: 'Combat',
  },
  {
    id: 'avgDps',
    label: 'Avg DPS',
    description: 'Average session damage per second.',
    group: 'Combat',
  },
  {
    id: 'weaponDpp',
    label: 'Weapon DPP',
    description: 'Configured loadout damage per PED.',
    group: 'Combat',
  },
  {
    id: 'critRate',
    label: 'Crit %',
    description: 'Critical hits as a percentage of shots fired.',
    group: 'Combat',
  },
  {
    id: 'hitRate',
    label: 'Hit %',
    description: 'Landed hits as a percentage of shots fired.',
    group: 'Combat',
  },
  {
    id: 'missRate',
    label: 'Miss %',
    description: 'Player misses as a percentage of shots fired.',
    group: 'Combat',
  },
  {
    id: 'ammoCost',
    label: 'Ammo',
    description: 'Ammo spend recorded for the session.',
    group: 'Costs',
  },
  {
    id: 'weaponDecay',
    label: 'Weapon Decay',
    description: 'Weapon and attachment decay recorded for the session.',
    group: 'Costs',
  },
  {
    id: 'healingCost',
    label: 'Healing/FAP',
    description: 'Healing tool decay and Mind Essence cost.',
    group: 'Costs',
  },
  {
    id: 'otherCosts',
    label: 'Other Costs',
    description: 'Any other manually entered session costs.',
    group: 'Costs',
  },
  {
    id: 'skillGains',
    label: 'Skill Gains',
    description: 'Total skill gain value captured this session.',
    group: 'Progress',
  },
];

const overlayStatIds = new Set(overlayStatDefinitions.map((definition) => definition.id));

export function normalizeOverlayStatIds(statIds?: OverlayStatId[]): OverlayStatId[] {
  if (!statIds || statIds.length === 0) {
    return [...defaultOverlayStatIds];
  }

  const normalized = statIds.filter(
    (id, index): id is OverlayStatId => overlayStatIds.has(id) && statIds.indexOf(id) === index
  );

  return normalized.length > 0 ? normalized : [...defaultOverlayStatIds];
}
