// Data models for the Loot Tracker

export interface LootItem {
  id: string;
  name: string;
  quantity: number;
  value: number; // TT value (Trade Terminal)
  markup: number; // Markup percentage (100 = no markup, 150 = 50% markup)
  fixedValue?: number; // Fixed PED value per item (overrides markup when set)
  totalValue: number; // value * (markup / 100) * quantity
  timestamp: number;
  killUuid?: string; // Associated kill UUID
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  isCompleted: boolean;
  createdAt: number;
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

export interface Kill {
  id: string;
  creatureName: string;
  maturity?: string;
  hpDealt: number;
  cost: number;
  lootValue: number;
  timestamp: number;
}

export interface DamageEvent {
  id: string;
  damage: number;
  timestamp: number;
  isCritical?: boolean;
}

export interface CombatEvent {
  id: string;
  type:
    | 'hit'
    | 'crit'
    | 'player_miss'
    | 'player_dodge'
    | 'player_evade'
    | 'enemy_miss'
    | 'enemy_evade'
    | 'enemy_dodge';
  timestamp: number;
}

export interface HealingEvent {
  id: string;
  amount: number;
  timestamp: number;
  isDirectUse?: boolean;
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
  enemyMisses: number;
  enemyEvades: number;
  enemyDodges: number;
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
  creature?: string;

  // Session data
  loot: LootItem[];
  skills: SkillGain[];
  globals: Global[];
  kills: Kill[];
  damageEvents: DamageEvent[];
  combatEvents: CombatEvent[];
  healingEvents: HealingEvent[];
  damageTakenEvents: DamageTakenEvent[];
  notes: string;
  loadoutId?: string; // Link to loadout for cost calculations

  // Costs
  ammoCost: number;
  weaponDecay: number;
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
  defaultFixedValue?: number; // Fixed PED value per item (overrides markup when set)
  description?: string;
}

export interface AppSettings {
  avatarName: string;
  defaultMarkup: number;
  autoSave: boolean;
  theme: 'dark' | 'light' | 'high-contrast' | 'calypso' | 'arkadia';
  chatLogPath?: string;
  autoStartSession?: boolean;
  overlayX?: number;
  overlayY?: number;
  overlayWidth?: number;
  overlayHeight?: number;
  ignoreListItems?: string[]; // Items to ignore in ChatLogMonitor
  enableKillTrackingMaturity?: boolean; // Enable HP-based maturity inference for kills (experimental)
}

// Equipment and Loadout types
interface EquipmentEconomy {
  Decay?: number;
  AmmoBurn?: number;
  Efficiency?: number;
  MaxTT?: number;
  Value?: number;
}

interface EquipmentDamage {
  Penetration?: number;
}

interface EquipmentProperties {
  Type?: string;
  Weight?: number;
  Economy?: EquipmentEconomy;
  Damage?: EquipmentDamage;
  Range?: number;
  [key: string]: unknown;
}

export interface EquipmentItem {
  Id: number;
  ItemId: number;
  Name: string;
  Properties: EquipmentProperties;
}

export interface Loadout {
  id: string;
  name: string;
  hotkey?: number;
  isPrimary: boolean;
  favorite: boolean;
  armor?: string;
  medicalTool?: string;
  medicalTT?: number;
  medicalMarkup?: number;
  medicalDecay?: number;
  medicalME?: number;
  medicalMEMarkup?: number;
  medicalMECost?: number;
  weapon?: EquipmentItem;
  amplifier?: EquipmentItem;
  scope?: EquipmentItem;
  sight?: EquipmentItem;
  sight2?: EquipmentItem;
  absorber?: EquipmentItem;
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
