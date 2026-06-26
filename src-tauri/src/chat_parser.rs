//! Chat log parser and event data structures for Orion
use crate::language_patterns::LanguagePatterns;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

/// Loot event parsed from chat log
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LootEvent {
    pub timestamp: String,
    pub player: String,
    pub creature: String,
    pub value: f64,
    pub is_hof: bool,
    pub source: String,
}

/// Skill gain event parsed from chat log
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillGain {
    pub timestamp: String,
    pub skill_name: String,
    pub gain: f64,
}

/// Damage event parsed from chat log
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DamageEvent {
    pub timestamp: String,
    pub damage: f64,
    pub is_critical: bool,
}

/// Combat event parsed from chat log
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CombatEvent {
    pub timestamp: String,
    pub event_type: String, // "player_miss", "player_dodge", "player_evade", "hit", "crit"
}

/// Healing event parsed from chat log
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealingEvent {
    pub timestamp: String,
    pub amount: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DamageTakenEvent {
    pub timestamp: String,
    pub damage: f64,
    pub is_critical: bool,
}

pub type ParsedEvents = (
    Vec<LootEvent>,
    Vec<DamageEvent>,
    Vec<CombatEvent>,
    Vec<HealingEvent>,
    Vec<DamageTakenEvent>,
    Vec<SkillGain>,
);

pub struct ChatLogParser {
    global_regex: Regex,
    mining_regex: Regex,
    rare_item_regex: Regex,
    enhancer_break_regex: Regex,
    system_receive_regex: Regex,
    system_picked_up_regex: Regex,
    damage_regex: Regex,
    healing_regex: Regex,
    damage_taken_regex: Regex,
    skill_gain_exp_regex: Regex,
    skill_gain_simple_regex: Regex,
    attribute_improved_regex: Regex,
    language_patterns: LanguagePatterns,
}

impl ChatLogParser {
    pub fn new() -> Self {
        let language_patterns = LanguagePatterns::default();

        // Build regex patterns from language patterns
        let global_regex = language_patterns.build_hunting_regex();
        let mining_regex = language_patterns.build_mining_regex();
        let rare_item_regex = language_patterns.build_rare_item_regex();
        let damage_regex = language_patterns.build_damage_regex();
        let healing_regex = Regex::new(r"You healed yourself ([\d.]+) points?").unwrap();
        let damage_taken_regex = Regex::new(r"You took ([\d.]+) points? of damage").unwrap();
        let skill_gain_exp_regex =
            Regex::new(r"You have gained ([\d.]+) experience in your (.+?) skill").unwrap();
        let skill_gain_simple_regex = Regex::new(r"You have gained ([\d.]+) (.+)").unwrap();
        let attribute_improved_regex = Regex::new(r"Your (.+?) has improved by ([\d.]+)").unwrap();
        let enhancer_break_regex = Regex::new(
            r"\[System\](?: \[\])? Your enhancer .+? broke\. .*? You received (?P<value>[\d.]+) PED (?P<item>.+?)\.\s*$",
        )
        .unwrap();

        // Pattern for system "You received" loot lines. Match either
        // `You received [Item] x (N) Value: X PED` or
        // `You received Item x (N) Value: X PED` (no brackets).
        let system_receive_regex = Regex::new(
            r"\[System\](?: \[\])? You received (?:\[(?P<item_br>.+?)\]|(?P<item_plain>.+?)) x \([\d,]+\) Value: (?P<value>[\d.]+) PED\s*$"
        ).unwrap();
        let system_picked_up_regex = Regex::new(
            r"\[System\](?: \[\])? Picked up (?:\[(?P<item_br>.+?)\]|(?P<item_plain>.+?)) \([\d,]+\)\s*$",
        )
        .unwrap();

        Self {
            global_regex,
            mining_regex,
            rare_item_regex,
            enhancer_break_regex,
            system_receive_regex,
            system_picked_up_regex,
            damage_regex,
            healing_regex,
            damage_taken_regex,
            skill_gain_exp_regex,
            skill_gain_simple_regex,
            attribute_improved_regex,
            language_patterns,
        }
    }

    fn extract_timestamp(line: &str) -> String {
        if let Some(pos) = line.find(" [") {
            line[..pos].trim().to_string()
        } else {
            line.chars().take(19).collect::<String>()
        }
    }

    pub fn parse_line(&self, line: &str) -> Option<LootEvent> {
        let timestamp = Self::extract_timestamp(line);

        // Check if it's a Hall of Fame using multilingual detection
        let is_hof = self.language_patterns.is_hall_of_fame(line);

        // Try rare item pattern first (takes precedence)
        if let Some(caps) = self.rare_item_regex.captures(line) {
            let player = caps.get(1)?.as_str().trim().to_string();
            let item_name = caps.get(3)?.as_str().trim().to_string();
            let value_pec: f64 = caps.get(5)?.as_str().parse().ok()?;
            // Convert PEC to PED (1 PED = 100 PEC)
            let value = value_pec / 100.0;

            return Some(LootEvent {
                timestamp,
                player,
                creature: format!("Rare: {}", item_name),
                value,
                is_hof,
                source: "rare_item".to_string(),
            });
        }

        // Try hunting global pattern
        if let Some(caps) = self.global_regex.captures(line) {
            let player = caps.get(1)?.as_str().trim().to_string();
            let creature = caps.get(3)?.as_str().trim().to_string();
            let value: f64 = caps.get(5)?.as_str().parse().ok()?;

            return Some(LootEvent {
                timestamp,
                player,
                creature,
                value,
                is_hof,
                source: "hunting_global".to_string(),
            });
        }

        // Try mining global pattern
        if let Some(caps) = self.mining_regex.captures(line) {
            let player = caps.get(1)?.as_str().trim().to_string();
            let creature = format!("Mining: {}", caps.get(3)?.as_str().trim());
            let value: f64 = caps.get(5)?.as_str().parse().ok()?;

            return Some(LootEvent {
                timestamp,
                player,
                creature,
                value,
                is_hof,
                source: "mining_global".to_string(),
            });
        }

        // Enhancer break compensation appears as a "You received" line without
        // normal loot quantity/value formatting.
        if let Some(caps) = self.enhancer_break_regex.captures(line) {
            let creature = caps
                .name("item")
                .map(|m| m.as_str().trim().to_string())
                .unwrap_or_default();
            let value: f64 = caps
                .name("value")
                .and_then(|m| m.as_str().parse().ok())
                .unwrap_or(0.0);

            return Some(LootEvent {
                timestamp,
                player: String::new(),
                creature,
                value,
                is_hof: false,
                source: "enhancer_break".to_string(),
            });
        }

        // Try system "You received" pattern (loot pickup)
        if let Some(caps) = self.system_receive_regex.captures(line) {
            let creature = caps
                .name("item_br")
                .or_else(|| caps.name("item_plain"))
                .map(|m| m.as_str().trim().to_string())
                .unwrap_or_default();
            let value: f64 = caps
                .name("value")
                .and_then(|m| m.as_str().parse().ok())
                .unwrap_or(0.0);

            return Some(LootEvent {
                timestamp,
                // system lines don't include a player name; use empty string
                player: String::new(),
                creature,
                value,
                is_hof: false,
                source: "system_receive".to_string(),
            });
        }

        None
    }

    pub fn parse_damage_line(&self, line: &str) -> Option<DamageEvent> {
        let timestamp = Self::extract_timestamp(line);

        // Check for critical hit damage
        let is_critical = line.contains("Critical hit - Additional damage!");

        // Try damage pattern: [System] [] You inflicted X points of damage
        // or: [System] [] Critical hit - Additional damage! You inflicted X points of damage
        if let Some(caps) = self.damage_regex.captures(line) {
            let damage: f64 = caps.get(2)?.as_str().parse().ok()?;

            return Some(DamageEvent {
                timestamp,
                damage,
                is_critical,
            });
        }

        None
    }

    pub fn parse_combat_event(&self, line: &str) -> Option<CombatEvent> {
        let timestamp = Self::extract_timestamp(line);

        let event_type = if line.contains("The target Dodged your attack") {
            Some("enemy_dodge".to_string())
        } else if line.contains("The target Evaded your attack") {
            Some("enemy_evade".to_string())
        } else if line.contains("You missed") {
            Some("player_miss".to_string())
        } else if line.contains("The attack missed you") {
            Some("enemy_miss".to_string())
        } else if line.contains("You Evaded the") {
            Some("player_evade".to_string())
        } else if line.contains("You dodged") {
            Some("player_dodge".to_string())
        } else {
            None
        }?;

        Some(CombatEvent {
            timestamp,
            event_type,
        })
    }

    pub fn parse_healing_event(&self, line: &str) -> Option<HealingEvent> {
        let timestamp = Self::extract_timestamp(line);

        // Pattern: You healed yourself X points
        if line.contains("You healed yourself") {
            let caps = self.healing_regex.captures(line)?;
            let amount: f64 = caps.get(1)?.as_str().parse().ok()?;

            return Some(HealingEvent { timestamp, amount });
        }

        None
    }

    pub fn parse_damage_taken(&self, line: &str) -> Option<DamageTakenEvent> {
        let timestamp = Self::extract_timestamp(line);

        let is_critical = line.contains("Critical hit - Additional damage!");

        // Pattern: You took X points of damage
        // or: Critical hit - Additional damage! You took X points of damage
        if line.contains("You took") && line.contains("points of damage") {
            let caps = self.damage_taken_regex.captures(line)?;
            let damage: f64 = caps.get(1)?.as_str().parse().ok()?;

            return Some(DamageTakenEvent {
                timestamp,
                damage,
                is_critical,
            });
        }

        None
    }

    pub fn parse_skill_gain(&self, line: &str) -> Option<SkillGain> {
        let timestamp = Self::extract_timestamp(line);

        // Try attribute pattern first: "Your AttributeName has improved by X"
        if line.contains("has improved by") {
            if let Some(caps) = self.attribute_improved_regex.captures(line) {
                let skill_name = caps.get(1)?.as_str().trim().to_string();
                let gain: f64 = caps.get(2)?.as_str().parse().ok()?;

                return Some(SkillGain {
                    timestamp,
                    skill_name,
                    gain,
                });
            }
        }

        // Try standard skill gain patterns
        if !line.contains("You have gained") {
            return None;
        }

        // Try pattern 1: "You have gained X experience in your SkillName skill"
        if line.contains("experience in your") {
            if let Some(caps) = self.skill_gain_exp_regex.captures(line) {
                let gain: f64 = caps.get(1)?.as_str().parse().ok()?;
                let skill_name = caps.get(2)?.as_str().trim().to_string();

                return Some(SkillGain {
                    timestamp,
                    skill_name,
                    gain,
                });
            }
        } else {
            // Try pattern 2: "You have gained X SkillName" (without "experience in your")
            if let Some(caps) = self.skill_gain_simple_regex.captures(line) {
                let gain: f64 = caps.get(1)?.as_str().parse().ok()?;
                let skill_name = caps.get(2)?.as_str().trim().to_string();

                return Some(SkillGain {
                    timestamp,
                    skill_name,
                    gain,
                });
            }
        }

        None
    }

    #[allow(dead_code)]
    pub fn parse_file(&self, content: &str) -> Vec<LootEvent> {
        let (loot_events, _, _, _, _, _) = self.parse_file_with_damage(content);
        loot_events
    }

    pub fn parse_file_with_damage(&self, content: &str) -> ParsedEvents {
        let mut loot_events = Vec::new();
        let mut damage_events = Vec::new();
        let mut combat_events = Vec::new();
        let mut healing_events = Vec::new();
        let mut damage_taken_events = Vec::new();
        let mut skill_gains = Vec::new();

        // Ground pickups generate paired system lines at the same timestamp:
        // "You received ..." + "Picked up ...". Exclude those from loot.
        let mut picked_up_by_timestamp: HashMap<String, HashSet<String>> = HashMap::new();
        for line in content.lines() {
            if let Some(caps) = self.system_picked_up_regex.captures(line) {
                let item = caps
                    .name("item_br")
                    .or_else(|| caps.name("item_plain"))
                    .map(|m| m.as_str().trim().to_string())
                    .unwrap_or_default();
                if !item.is_empty() {
                    let timestamp = Self::extract_timestamp(line);
                    picked_up_by_timestamp
                        .entry(timestamp)
                        .or_default()
                        .insert(item);
                }
            }
        }

        for line in content.lines() {
            if let Some(loot) = self.parse_line(line) {
                let is_ground_pickup = loot.player.is_empty()
                    && picked_up_by_timestamp
                        .get(&loot.timestamp)
                        .is_some_and(|items| items.contains(&loot.creature));

                if is_ground_pickup {
                    continue;
                }
                loot_events.push(loot);
            } else if let Some(damage) = self.parse_damage_line(line) {
                damage_events.push(damage);
            } else if let Some(combat) = self.parse_combat_event(line) {
                combat_events.push(combat);
            } else if let Some(healing) = self.parse_healing_event(line) {
                healing_events.push(healing);
            } else if let Some(damage_taken) = self.parse_damage_taken(line) {
                damage_taken_events.push(damage_taken);
            } else if let Some(skill) = self.parse_skill_gain(line) {
                skill_gains.push(skill);
            }
        }

        (
            loot_events,
            damage_events,
            combat_events,
            healing_events,
            damage_taken_events,
            skill_gains,
        )
    }
}

#[cfg(test)]
mod tests;
