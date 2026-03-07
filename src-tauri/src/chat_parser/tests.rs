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
    let line = "26-02-27 01:41:54 [System] [] You received Animal Muscle Oil x (9) Value: 0.2700 PED";

    let result = parser.parse_line(line);
    assert!(result.is_some(), "Parser failed to match system pickup line");

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
    assert_eq!(event.event_type, "enemy_miss");
}

#[test]
fn test_parse_combat_dodge() {
    let parser = ChatLogParser::new();
    let line = "2026-02-27 10:15:30 [System] [] The target Dodged your attack";

    let result = parser.parse_combat_event(line);
    assert!(result.is_some());

    let event = result.unwrap();
    assert_eq!(event.event_type, "enemy_dodge");
}

#[test]
fn test_parse_combat_evade() {
    let parser = ChatLogParser::new();
    let line = "2026-02-27 10:15:30 [System] [] You Evaded the attack";

    let result = parser.parse_combat_event(line);
    assert!(result.is_some());

    let event = result.unwrap();
    assert_eq!(event.event_type, "player_evade");
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
fn test_parse_attribute_improved() {
    let parser = ChatLogParser::new();
    let line = "2026-02-28 17:19:07 [System] [] Your Intelligence has improved by 0.0775";

    let result = parser.parse_skill_gain(line);
    assert!(result.is_some());

    let event = result.unwrap();
    assert_eq!(event.gain, 0.0775);
    assert_eq!(event.skill_name, "Intelligence");
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
    let line = "26-02-27 01:41:54 [System] [] You received [Animal Eye Oil] x (9) Value: 0.2700 PED";

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
fn test_parse_system_pickup_rejects_spoofing() {
    let parser = ChatLogParser::new();
    // A player saying they received loot should NOT be parsed
    let spoof_line = "2026-02-28 22:54:52 [Rookie] [axedude axe woodpile] [System]: You received [Energy Matter Residue] x (1681) Value: 16.81 PED bo000owl";

    let result = parser.parse_line(spoof_line);
    assert!(
        result.is_none(),
        "Parser incorrectly matched a player chat message as a system loot event"
    );
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
    assert_eq!(combat_events[0].event_type, "enemy_dodge");
    assert_eq!(healing_events.len(), 1);
    assert_eq!(damage_taken_events.len(), 1);
    assert_eq!(skill_gains.len(), 1);
    assert_eq!(skill_gains[0].skill_name, "Bravado");
}

#[test]
fn test_parse_file_with_damage_excludes_ground_pickup_pairs() {
    let parser = ChatLogParser::new();
    let content = [
        "2026-03-05 12:17:31 [System] [] You received Kaldon x (41) Value: 0.0004 PED",
        "2026-03-05 12:17:31 [System] [] Picked up Kaldon (41)",
        "2026-03-06 00:12:30 [System] [] You received Brukite x (63) Value: 0.0006 PED",
        "2026-03-06 00:12:30 [System] [] Picked up Brukite (63)",
        "2026-03-06 22:54:01 [System] [] You received Bombardo x (12) Value: 0.0001 PED",
        "2026-03-06 22:54:01 [System] [] Picked up Bombardo (12)",
    ]
    .join("\n");

    let (loot_events, _, _, _, _, _) = parser.parse_file_with_damage(&content);

    assert_eq!(
        loot_events.len(),
        0,
        "Ground pickup receive/picked-up pairs should not count as loot"
    );
}

#[test]
fn test_parse_file_with_damage_keeps_unpaired_system_receive() {
    let parser = ChatLogParser::new();
    let content =
        "2026-03-06 22:54:01 [System] [] You received Animal Eye Oil x (12) Value: 0.1200 PED";

    let (loot_events, _, _, _, _, _) = parser.parse_file_with_damage(content);

    assert_eq!(loot_events.len(), 1);
    assert_eq!(loot_events[0].creature, "Animal Eye Oil");
    assert_eq!(loot_events[0].value, 0.12);
}
