use regex::Regex;

/// Language-specific patterns for parsing chat log events
#[derive(Debug, Clone)]
pub struct LanguagePatterns {
    pub hunting_killed: Vec<&'static str>,
    pub mining_found: Vec<&'static str>,
    pub rare_found: Vec<&'static str>,
    pub value_label: Vec<&'static str>,
    pub hof_markers: Vec<&'static str>,
}

impl LanguagePatterns {
    /// Returns patterns for all supported languages
    pub fn all_languages() -> Self {
        Self {
            // Hunting kill phrases
            hunting_killed: vec![
                "killed a creature",
                "has killed a creature",
                "a ucis o creatură",  // Romanian
            ],
            
            // Mining discovery phrases
            mining_found: vec![
                "found a deposit",
                "has found a deposit",
                "a găsit un depozit",  // Romanian
            ],
            
            // Rare item discovery phrases
            rare_found: vec![
                "found a rare item",
                "has found a rare item",
            ],
            
            // Value label phrases
            value_label: vec![
                "with a value of",
                "cu o valoare de",  // Romanian
            ],
            
            // Hall of Fame markers
            hof_markers: vec![
                "Hall of Fame",
                "hall of fame",  // case variation
                "înregistrare a fost adăugată",  // Romanian partial
            ],
        }
    }
    
    /// Build a regex pattern for hunting globals
    pub fn build_hunting_regex(&self) -> Regex {
        let killed = self.hunting_killed.join("|");
        let value = self.value_label.join("|");
        
        // Pattern: [Globals] [] <player> <killed_phrase> (<creature>) <value_phrase> <number> PED
        let pattern = format!(
            r"\[Globals\] \[\] (.+?) ({}) \((.+?)\) ({}) ([\d.]+) PED!?",
            killed, value
        );
        
        Regex::new(&pattern).expect("Invalid hunting regex pattern")
    }
    
    /// Build a regex pattern for mining globals
    pub fn build_mining_regex(&self) -> Regex {
        let found = self.mining_found.join("|");
        let value = self.value_label.join("|");
        
        // Pattern: [Globals] [] <player> <found_phrase> (<deposit>) <value_phrase> <number> PED
        let pattern = format!(
            r"\[Globals\] \[\] (.+?) ({}) \((.+?)\) ({}) ([\d.]+) PED!?",
            found, value
        );
        
        Regex::new(&pattern).expect("Invalid mining regex pattern")
    }
    
    /// Build a regex pattern for rare items
    pub fn build_rare_item_regex(&self) -> Regex {
        let found = self.rare_found.join("|");
        let value = self.value_label.join("|");
        
        // Pattern: [Globals] [] <player> <found_phrase> (<item>) <value_phrase> <number> PEC
        let pattern = format!(
            r"\[Globals\] \[\] (.+?) ({}) \((.+?)\) ({}) ([\d.]+) PEC!?",
            found, value
        );
        
        Regex::new(&pattern).expect("Invalid rare item regex pattern")
    }
    
    /// Check if a line contains a Hall of Fame marker
    pub fn is_hall_of_fame(&self, line: &str) -> bool {
        let line_lower = line.to_lowercase();
        self.hof_markers.iter().any(|marker| line_lower.contains(&marker.to_lowercase()))
    }
}

impl Default for LanguagePatterns {
    fn default() -> Self {
        Self::all_languages()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_hunting_regex_english() {
        let patterns = LanguagePatterns::all_languages();
        let regex = patterns.build_hunting_regex();
        
        let line = "2026-02-26 20:21:41 [Globals] [] Solo roudrunner Firstborn killed a creature (Daspletor Dominant) with a value of 624 PED!";
        assert!(regex.is_match(line));
        
        let caps = regex.captures(line).unwrap();
        assert_eq!(caps.get(1).unwrap().as_str(), "Solo roudrunner Firstborn");
        assert_eq!(caps.get(3).unwrap().as_str(), "Daspletor Dominant");
        assert_eq!(caps.get(5).unwrap().as_str(), "624");
    }
    
    #[test]
    fn test_hunting_regex_romanian() {
        let patterns = LanguagePatterns::all_languages();
        let regex = patterns.build_hunting_regex();
        
        let line = "2026-02-26 18:59:40 [Globals] [] Alexander Spyrotron851 Gav a ucis o creatură (Reinforced Drill Bot 1001) cu o valoare de 14 PED!";
        assert!(regex.is_match(line));
        
        let caps = regex.captures(line).unwrap();
        assert_eq!(caps.get(1).unwrap().as_str(), "Alexander Spyrotron851 Gav");
        assert_eq!(caps.get(3).unwrap().as_str(), "Reinforced Drill Bot 1001");
        assert_eq!(caps.get(5).unwrap().as_str(), "14");
    }
    
    #[test]
    fn test_mining_regex_english() {
        let patterns = LanguagePatterns::all_languages();
        let regex = patterns.build_mining_regex();
        
        let line = "2026-02-26 19:17:51 [Globals] [] blind again try found a deposit (Iron Stone) with a value of 76 PED!";
        assert!(regex.is_match(line));
    }
    
    #[test]
    fn test_hof_detection() {
        let patterns = LanguagePatterns::all_languages();
        
        assert!(patterns.is_hall_of_fame("A record has been added to the Hall of Fame!"));
        assert!(patterns.is_hall_of_fame("O înregistrare a fost adăugată la Hall of Fame!"));
        assert!(!patterns.is_hall_of_fame("Regular global without HoF"));
    }
    
    #[test]
    fn test_rare_item_regex() {
        let patterns = LanguagePatterns::all_languages();
        let regex = patterns.build_rare_item_regex();
        
        let line = "2026-02-26 19:53:01 [Globals] [] Richman1 Richman1 Killer has found a rare item (Augmented Hyperion Armor Catalyst) with a value of 10 PEC!";
        assert!(regex.is_match(line));
        
        let caps = regex.captures(line).unwrap();
        assert_eq!(caps.get(1).unwrap().as_str(), "Richman1 Richman1 Killer");
        assert_eq!(caps.get(3).unwrap().as_str(), "Augmented Hyperion Armor Catalyst");
        assert_eq!(caps.get(5).unwrap().as_str(), "10");
    }
}
