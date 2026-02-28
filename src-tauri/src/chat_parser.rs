use crate::language_patterns::LanguagePatterns;
use regex::Regex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LootEvent {
    pub timestamp: String,
    pub player: String,
    pub creature: String,
    pub value: f64,
    pub is_hof: bool,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillGain {
    pub timestamp: String,
    pub skill_name: String,
    pub gain: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DamageEvent {
    pub timestamp: String,
    pub damage: f64,
    pub is_critical: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CombatEvent {
    pub timestamp: String,
    pub event_type: String, // "miss", "dodge", "evade", "hit", "crit"
}

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
    system_receive_regex: Regex,
    damage_regex: Regex,
    healing_regex: Regex,
    damage_taken_regex: Regex,
    skill_gain_exp_regex: Regex,
    skill_gain_simple_regex: Regex,
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

        // Pattern for system "You received" loot lines. Match either
        // `You received [Item] x (N) Value: X PED` or
        // `You received Item x (N) Value: X PED` (no brackets).
        let system_receive_regex = Regex::new(
            r"You received (?:\[(?P<item_br>.+?)\]|(?P<item_plain>.+?)) x \([\d,]+\) Value: (?P<value>[\d.]+) PED"
        ).unwrap();

        Self {
            global_regex,
            mining_regex,
            rare_item_regex,
            system_receive_regex,
            damage_regex,
            healing_regex,
            damage_taken_regex,
            skill_gain_exp_regex,
            skill_gain_simple_regex,
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

        let event_type = if line.contains("The attack missed you") {
            // Enemy attack missed - player evaded
            Some("incoming_miss".to_string())
        } else if line.contains("The target Dodged your attack") {
            // Player attacked, target dodged the attack - player shot
            Some("dodge".to_string())
        } else if line.contains("You Evaded the") {
            // Enemy attack - player evaded
            Some("incoming_evade".to_string())
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
        content
            .lines()
            .filter_map(|line| self.parse_line(line))
            .collect()
    }

    pub fn parse_file_with_damage(&self, content: &str) -> ParsedEvents {
        let mut loot_events = Vec::new();
        let mut damage_events = Vec::new();
        let mut combat_events = Vec::new();
        let mut healing_events = Vec::new();
        let mut damage_taken_events = Vec::new();
        let mut skill_gains = Vec::new();

        for line in content.lines() {
            if let Some(loot) = self.parse_line(line) {
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
mod tests {
    use super::*;

    #[test]
    fn test_parse_hunting_global() {
        let parser = ChatLogParser::new();
        let line = "2026-02-26 18:59:40 [Globals] [] Alexander Spyrotron851 Gav a ucis o creatură (Reinforced Drill Bot 1001) cu o valoare de 14 PED!";

        let result = parser.parse_line(line);
        assert!(result.is_some());

        let event = result.unwrap();
        assert_eq!(event.player, "Alexander Spyrotron851 Gav");
        assert_eq!(event.creature, "Reinforced Drill Bot 1001");
        assert_eq!(event.value, 14.0);
        assert!(!event.is_hof);
    }

    #[test]
    fn test_parse_hof() {
        let parser = ChatLogParser::new();
        let line = "2026-02-26 19:00:11 [Globals] [] Best BG God a ucis o creatură (Thorifoid Apprentice Shaman) cu o valoare de 1080 PED! O înregistrare a fost adăugată la Hall of Fame!";

        let result = parser.parse_line(line);
        assert!(result.is_some());

        let event = result.unwrap();
        assert_eq!(event.value, 1080.0);
        assert!(event.is_hof);
    }

    #[test]
    fn test_parse_mining_global() {
        let parser = ChatLogParser::new();
        let line = "2026-02-26 19:00:14 [Globals] [] Valuk Valuk Karantanski a găsit un depozit (C-type Asteroid VI) cu o valoare de 52 PED! O înregistrare a fost adăugată la Hall of Fame!";

        let result = parser.parse_line(line);
        assert!(result.is_some());

        let event = result.unwrap();
        assert!(event.creature.starts_with("Mining:"));
        assert_eq!(event.value, 52.0);
        assert!(event.is_hof);
    }

    #[test]
    fn test_parse_mining_hof() {
        let parser = ChatLogParser::new();
        let line = "2026-02-26 19:17:51 [Globals] [] blind again try found a deposit (Iron Stone) with a value of 76 PED! A record has been added to the Hall of Fame!";

        let result = parser.parse_line(line);
        assert!(result.is_some());

        let event = result.unwrap();
        assert_eq!(event.player, "blind again try");
        assert!(event.creature.starts_with("Mining:"));
        assert_eq!(event.creature, "Mining: Iron Stone");
        assert_eq!(event.value, 76.0);
        assert!(event.is_hof);
    }

    #[test]
    fn test_parse_rare_item() {
        let parser = ChatLogParser::new();
        let line = "2026-02-26 19:53:01 [Globals] [] Richman1 Richman1 Killer has found a rare item (Augmented Hyperion Armor Catalyst) with a value of 10 PEC! A record has been added to the Hall of Fame!";

        let result = parser.parse_line(line);
        assert!(result.is_some());

        let event = result.unwrap();
        assert_eq!(event.player, "Richman1 Richman1 Killer");
        assert_eq!(event.creature, "Rare: Augmented Hyperion Armor Catalyst");
        assert_eq!(event.value, 0.10); // 10 PEC = 0.10 PED
        assert!(event.is_hof);
    }

    #[test]
    fn test_parse_hunting_hof_english() {
        let parser = ChatLogParser::new();
        let line = "2026-02-26 20:21:41 [Globals] [] Solo roudrunner Firstborn killed a creature (Daspletor Dominant) with a value of 624 PED! A record has been added to the Hall of Fame!";

        let result = parser.parse_line(line);
        assert!(result.is_some());

        let event = result.unwrap();
        assert_eq!(event.player, "Solo roudrunner Firstborn");
        assert_eq!(event.creature, "Daspletor Dominant");
        assert_eq!(event.value, 624.0);
        assert!(event.is_hof);
    }

    #[test]
    fn test_parse_prowler_global() {
        let parser = ChatLogParser::new();
        let line = "2026-02-26 19:14:41 [Globals] [] Prowler Gankoholic Reloaded killed a creature (Reinforced Drill Bot 1001) with a value of 16 PED!";

        let result = parser.parse_line(line);
        assert!(result.is_some(), "Parser failed to match the line");

        let event = result.unwrap();
        assert_eq!(event.player, "Prowler Gankoholic Reloaded");
        assert_eq!(event.creature, "Reinforced Drill Bot 1001");
        assert_eq!(event.value, 16.0);
        assert!(!event.is_hof);
    }

    #[test]
    fn test_parse_system_pickup_no_brackets() {
        let parser = ChatLogParser::new();
        let line =
            "26-02-27 01:41:54 [System] [] You received Animal Muscle Oil x (9) Value: 0.2700 PED";

        let result = parser.parse_line(line);
        assert!(
            result.is_some(),
            "Parser failed to match system pickup line"
        );

        let event = result.unwrap();
        assert_eq!(event.player, ""); // System pickups have no player
        assert_eq!(event.creature, "Animal Muscle Oil");
        assert_eq!(event.value, 0.27);
        assert!(!event.is_hof);
    }
    #[test]
    fn test_parse_damage_english() {
        let parser = ChatLogParser::new();
        let line = "2026-02-27 01:41:42 [System] [] You inflicted 7.4 points of damage";

        let result = parser.parse_damage_line(line);
        assert!(result.is_some());

        let event = result.unwrap();
        assert_eq!(event.damage, 7.4);
        assert_eq!(event.timestamp, "2026-02-27 01:41:42");
    }

    #[test]
    fn test_parse_damage_large() {
        let parser = ChatLogParser::new();
        let line = "2026-02-27 10:15:30 [System] [] You inflicted 125.8 points of damage";

        let result = parser.parse_damage_line(line);
        assert!(result.is_some());

        let event = result.unwrap();
        assert_eq!(event.damage, 125.8);
        assert!(!event.is_critical);
    }

    #[test]
    fn test_parse_damage_critical() {
        let parser = ChatLogParser::new();
        let line = "2026-02-27 10:15:30 [System] [] Critical hit - Additional damage! You inflicted 17.7 points of damage";

        let result = parser.parse_damage_line(line);
        assert!(result.is_some());

        let event = result.unwrap();
        assert_eq!(event.damage, 17.7);
        assert!(event.is_critical);
    }

    #[test]
    fn test_parse_combat_miss() {
        let parser = ChatLogParser::new();
        let line = "2026-02-27 10:15:30 [System] [] The attack missed you";

        let result = parser.parse_combat_event(line);
        assert!(result.is_some());

        let event = result.unwrap();
        assert_eq!(event.event_type, "incoming_miss");
    }

    #[test]
    fn test_parse_combat_dodge() {
        let parser = ChatLogParser::new();
        let line = "2026-02-27 10:15:30 [System] [] The target Dodged your attack";

        let result = parser.parse_combat_event(line);
        assert!(result.is_some());

        let event = result.unwrap();
        assert_eq!(event.event_type, "dodge");
    }

    #[test]
    fn test_parse_combat_evade() {
        let parser = ChatLogParser::new();
        let line = "2026-02-27 10:15:30 [System] [] You Evaded the attack";

        let result = parser.parse_combat_event(line);
        assert!(result.is_some());

        let event = result.unwrap();
        assert_eq!(event.event_type, "incoming_evade");
    }

    #[test]
    fn test_parse_healing() {
        let parser = ChatLogParser::new();
        let line = "2026-02-27 10:15:30 [System] [] You healed yourself 23.4 points";

        let result = parser.parse_healing_event(line);
        assert!(result.is_some());

        let event = result.unwrap();
        assert_eq!(event.amount, 23.4);
    }

    #[test]
    fn test_parse_damage_taken() {
        let parser = ChatLogParser::new();
        let line = "2026-02-27 10:15:30 [System] [] You took 3.1 points of damage";

        let result = parser.parse_damage_taken(line);
        assert!(result.is_some());

        let event = result.unwrap();
        assert_eq!(event.damage, 3.1);
        assert!(!event.is_critical);
    }

    #[test]
    fn test_parse_damage_taken_critical() {
        let parser = ChatLogParser::new();
        let line = "2026-02-27 10:15:30 [System] [] Critical hit - Additional damage! You took 7.2 points of damage";

        let result = parser.parse_damage_taken(line);
        assert!(result.is_some());

        let event = result.unwrap();
        assert_eq!(event.damage, 7.2);
        assert!(event.is_critical);
    }

    #[test]
    fn test_parse_skill_gain() {
        let parser = ChatLogParser::new();
        let line = "2026-02-27 10:15:30 [System] [] You have gained 0.3438 Bravado";

        let result = parser.parse_skill_gain(line);
        assert!(result.is_some());

        let event = result.unwrap();
        assert_eq!(event.gain, 0.3438);
        assert_eq!(event.skill_name, "Bravado");
    }

    #[test]
    fn test_parse_skill_gain_with_experience() {
        let parser = ChatLogParser::new();
        let line =
            "2026-02-26 19:26:03 [System] [] You have gained 0.6742 experience in your Rifle skill";

        let result = parser.parse_skill_gain(line);
        assert!(result.is_some());

        let event = result.unwrap();
        assert_eq!(event.gain, 0.6742);
        assert_eq!(event.skill_name, "Rifle");
    }

    #[test]
    fn test_parse_skill_gain_multi_word() {
        let parser = ChatLogParser::new();
        let line = "2026-02-26 19:27:39 [System] [] You have gained 0.5023 experience in your Laser Weaponry Technology skill";

        let result = parser.parse_skill_gain(line);
        assert!(result.is_some());

        let event = result.unwrap();
        assert_eq!(event.gain, 0.5023);
        assert_eq!(event.skill_name, "Laser Weaponry Technology");
    }

    #[test]
    fn test_parse_system_pickup_with_brackets() {
        let parser = ChatLogParser::new();
        let line =
            "26-02-27 01:41:54 [System] [] You received [Animal Eye Oil] x (9) Value: 0.2700 PED";

        let result = parser.parse_line(line);
        assert!(
            result.is_some(),
            "Parser failed to match bracketed system pickup line"
        );

        let event = result.unwrap();
        assert_eq!(event.player, "");
        assert_eq!(event.creature, "Animal Eye Oil");
        assert_eq!(event.value, 0.27);
        assert!(!event.is_hof);
    }

    #[test]
    fn test_parse_file_with_damage_routes_events_correctly() {
        let parser = ChatLogParser::new();
        let content = [
            "2026-02-27 01:41:42 [System] [] You inflicted 7.4 points of damage",
            "2026-02-27 01:41:43 [System] [] The target Dodged your attack",
            "2026-02-27 01:41:44 [System] [] You healed yourself 23.4 points",
            "2026-02-27 01:41:45 [System] [] You took 3.1 points of damage",
            "2026-02-27 01:41:46 [System] [] You have gained 0.3438 Bravado",
            "26-02-27 01:41:54 [System] [] You received [Animal Eye Oil] x (9) Value: 0.2700 PED",
        ]
        .join("\n");

        let (
            loot_events,
            damage_events,
            combat_events,
            healing_events,
            damage_taken_events,
            skill_gains,
        ) = parser.parse_file_with_damage(&content);

        assert_eq!(loot_events.len(), 1);
        assert_eq!(loot_events[0].creature, "Animal Eye Oil");
        assert_eq!(damage_events.len(), 1);
        assert_eq!(combat_events.len(), 1);
        assert_eq!(combat_events[0].event_type, "dodge");
        assert_eq!(healing_events.len(), 1);
        assert_eq!(damage_taken_events.len(), 1);
        assert_eq!(skill_gains.len(), 1);
        assert_eq!(skill_gains[0].skill_name, "Bravado");
    }
}
