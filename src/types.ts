// Data models for the Loot Tracker

export interface LootItem {
  id: string;
  name: string;
  quantity: number;
  value: number; // TT value (Trade Terminal)
  markup: number; // Markup percentage (100 = no markup, 150 = 50% markup)
  totalValue: number; // value * (markup / 100) * quantity
  timestamp: number;
}

export interface SkillGain {
  id: string;
  skillName: string;
  gainAmount: number;
  timestamp: number;
}

export interface Global {
  id: string;
  creature: string;
  value: number;
  timestamp: number;
  isHoF: boolean; // Hall of Fame (larger globals)
}

export interface DamageEvent {
  id: string;
  damage: number;
  timestamp: number;
  isCritical?: boolean;
}

export interface CombatEvent {
  id: string;
  type: 'miss' | 'dodge' | 'evade' | 'hit' | 'crit';
  timestamp: number;
}

export interface HealingEvent {
  id: string;
  amount: number;
  timestamp: number;
}

export interface DamageTakenEvent {
  id: string;
  damage: number;
  timestamp: number;
  isCritical?: boolean;
}

export interface SessionStats {
  kills: number;
  lootEvents: number;
  globals: number;
  hofs: number;
  totalLoot: number;
  totalCost: number;
  returns: number; // percentage
  duration: number; // in seconds
  shotsFired: number;
  damageDealt: number;
  damageTaken: number;
  healsUsed: number;
  totalHealing: number;
  misses: number;
  dodges: number;
  evades: number;
  criticalHits: number;
  hits: number;
}

export interface HuntSession {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  status: 'active' | 'paused' | 'completed';
  pausedAt?: number;
  totalPausedMs?: number;

  // Hunting details
  weapon: string;
  armor?: string;
  location?: string;

  // Session data
  loot: LootItem[];
  skills: SkillGain[];
  globals: Global[];
  damageEvents: DamageEvent[];
  combatEvents: CombatEvent[];
  healingEvents: HealingEvent[];
  damageTakenEvents: DamageTakenEvent[];
  notes: string;
  loadoutId?: string; // Link to loadout for cost calculations

  // Costs
  ammoCost: number;
  repairCost: number;
  armorDecay: number;
  healingCost: number;
  otherCosts: number;

  // Stats (calculated)
  stats: SessionStats;
}

export interface ItemTemplate {
  id: string;
  name: string;
  category: 'loot' | 'weapon' | 'armor' | 'tool' | 'other';
  defaultTTValue: number;
  defaultMarkup: number;
  description?: string;
}

export interface AppSettings {
  avatarName: string;
  defaultMarkup: number;
  autoSave: boolean;
  overlayEnabled: boolean;
  theme: 'light' | 'dark';
  chatLogPath?: string;
  autoStartSession?: boolean;
}

// Equipment and Loadout types
export interface EquipmentItem {
  Id: number;
  ItemId: number;
  Name: string;
  Properties: any;
}

export interface LoadoutEnhancers {
  dmg: number;
  acc: number;
  rng: number;
  eco: number;
}

export interface Loadout {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  favorite: boolean;
  weapon?: EquipmentItem;
  amplifier?: EquipmentItem;
  scope?: EquipmentItem;
  sight?: EquipmentItem;
  sight2?: EquipmentItem;
  absorber?: EquipmentItem;
  enhancers: LoadoutEnhancers;
  hitProfession: number;
  dmgProfession: number;
  // Calculated stats
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
