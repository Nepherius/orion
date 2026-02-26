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

pub struct ChatLogParser {
    global_regex: Regex,
    mining_regex: Regex,
}

impl ChatLogParser {
    pub fn new() -> Self {
        // Pattern for hunting globals (multiple language support)
        let global_regex = Regex::new(
            r"\[Globals\] \[\] (.+?) (a ucis o creatură|killed a creature|has killed) \((.+?)\) (cu o valoare de|with a value of) ([\d.]+) PED"
        ).unwrap();
        
        // Pattern for mining globals
        let mining_regex = Regex::new(
            r"\[Globals\] \[\] (.+?) (a găsit un depozit|found a deposit|has found) \((.+?)\) (cu o valoare de|with a value of) ([\d.]+) PED"
        ).unwrap();
        
        Self {
            global_regex,
            mining_regex,
        }
    }
    
    pub fn parse_line(&self, line: &str) -> Option<LootEvent> {
        // Extract timestamp from start of line
        let timestamp = line.split(" [").next()?.to_string();
        
        // Check if it's a Hall of Fame
        let is_hof = line.contains("Hall of Fame") || line.contains("Hall of Fame");
        
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
    }
}
