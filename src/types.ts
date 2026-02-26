// Data models for the hunt tracker

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

export interface SessionStats {
  kills: number;
  lootEvents: number;
  globals: number;
  hofs: number;
  totalLoot: number;
  totalCost: number;
  returns: number; // percentage
  duration: number; // in seconds
}

export interface HuntSession {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  status: 'active' | 'paused' | 'completed';

  // Hunting details
  creature: string;
  weapon: string;
  armor?: string;
  location: string;

  // Session data
  loot: LootItem[];
  skills: SkillGain[];
  globals: Global[];
  notes: string;

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
  playerName: string;
  defaultMarkup: number;
  autoSave: boolean;
  overlayEnabled: boolean;
  theme: 'light' | 'dark';
}
