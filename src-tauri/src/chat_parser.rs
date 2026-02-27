use regex::Regex;
use serde::{Deserialize, Serialize};
use crate::language_patterns::LanguagePatterns;

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

pub struct ChatLogParser {
    global_regex: Regex,
    mining_regex: Regex,
    rare_item_regex: Regex,
    system_receive_regex: Regex,
    language_patterns: LanguagePatterns,
}

impl ChatLogParser {
    pub fn new() -> Self {
        let language_patterns = LanguagePatterns::default();
        
        // Build regex patterns from language patterns
        let global_regex = language_patterns.build_hunting_regex();
        let mining_regex = language_patterns.build_mining_regex();
        let rare_item_regex = language_patterns.build_rare_item_regex();

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
            language_patterns,
        }
    }
    
    pub fn parse_line(&self, line: &str) -> Option<LootEvent> {
        // Extract timestamp from start of line (more robust)
        let timestamp = if let Some(pos) = line.find(" [") {
            line[..pos].trim().to_string()
        } else {
            // Fallback: take first 19 characters (typical timestamp format)
            line.chars().take(19).collect::<String>()
        };
        
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
            let value: f64 = caps.name("value").and_then(|m| m.as_str().parse().ok()).unwrap_or(0.0);

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
    
    pub fn parse_file(&self, content: &str) -> Vec<LootEvent> {
        content
            .lines()
            .filter_map(|line| self.parse_line(line))
            .collect()
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
        assert_eq!(event.is_hof, false);
    }
    
    #[test]
    fn test_parse_hof() {
        let parser = ChatLogParser::new();
        let line = "2026-02-26 19:00:11 [Globals] [] Best BG God a ucis o creatură (Thorifoid Apprentice Shaman) cu o valoare de 1080 PED! O înregistrare a fost adăugată la Hall of Fame!";
        
        let result = parser.parse_line(line);
        assert!(result.is_some());
        
        let event = result.unwrap();
        assert_eq!(event.value, 1080.0);
        assert_eq!(event.is_hof, true);
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
        assert_eq!(event.is_hof, true);
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
        assert_eq!(event.is_hof, true);
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
        assert_eq!(event.is_hof, true);
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
        assert_eq!(event.is_hof, true);
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
        assert_eq!(event.is_hof, false);
    }
    
    #[test]
    fn test_parse_system_pickup_no_brackets() {
        let parser = ChatLogParser::new();
        let line = "26-02-27 01:41:54 [System] [] You received Animal Muscle Oil x (9) Value: 0.2700 PED";
        
        let result = parser.parse_line(line);
        assert!(result.is_some(), "Parser failed to match system pickup line");
        
        let event = result.unwrap();
        assert_eq!(event.player, ""); // System pickups have no player
        assert_eq!(event.creature, "Animal Muscle Oil");
        assert_eq!(event.value, 0.27);
        assert_eq!(event.is_hof, false);
    }
}
