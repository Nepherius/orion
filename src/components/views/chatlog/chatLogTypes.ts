export interface LootEvent {
  timestamp: string;
  player: string;
  creature: string;
  value: number;
  is_hof: boolean;
}

export interface DamageEvent {
  timestamp: string;
  damage: number;
  is_critical: boolean;
}

export interface CombatEvent {
  timestamp: string;
  event_type:
    | 'hit'
    | 'crit'
    | 'player_miss'
    | 'player_dodge'
    | 'player_evade'
    | 'enemy_miss'
    | 'enemy_evade';
}

export interface HealingEvent {
  timestamp: string;
  amount: number;
}

export interface DamageTakenEvent {
  timestamp: string;
  damage: number;
  is_critical: boolean;
}

export interface SkillGain {
  timestamp: string;
  skill_name: string;
  gain: number;
}

export interface ParseResult {
  loot_events: LootEvent[];
  damage_events: DamageEvent[];
  combat_events: CombatEvent[];
  healing_events: HealingEvent[];
  damage_taken_events: DamageTakenEvent[];
  skill_gains: SkillGain[];
}
