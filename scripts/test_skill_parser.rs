use regex::Regex;

fn main() {
    // Test case 1: with "experience in your" and "skill" suffix
    let line1 = "2026-02-26 19:26:03 [System] [] You have gained 0.6742 experience in your Rifle skill";
    
    let re1 = Regex::new(r"You have gained ([\d.]+) experience in your (.+?) skill").unwrap();
    
    if let Some(caps) = re1.captures(line1) {
        let gain: f64 = caps.get(1).unwrap().as_str().parse().unwrap();
        let skill_name = caps.get(2).unwrap().as_str().trim();
        println!("Pattern 1 Match - gain: {}, skill: {}", gain, skill_name);
    } else {
        println!("Pattern 1 No match");
    }
    
    // Test case 2: without "experience in your"
    let line2 = "2026-02-26 19:31:05 [System] [] You have gained 0.3519 Bravado";
    
    let re2 = Regex::new(r"You have gained ([\d.]+) (.+)").unwrap();
    
    if let Some(caps) = re2.captures(line2) {
        let gain: f64 = caps.get(1).unwrap().as_str().parse().unwrap();
        let skill_name = caps.get(2).unwrap().as_str().trim();
        println!("Pattern 2 Match - gain: {}, skill: {}", gain, skill_name);
    } else {
        println!("Pattern 2 No match");
    }
    
    // Test case 3: Multi-word skill name
    let line3 = "2026-02-26 19:27:39 [System] [] You have gained 0.5023 experience in your Laser Weaponry Technology skill";
    
    if let Some(caps) = re1.captures(line3) {
        let gain: f64 = caps.get(1).unwrap().as_str().parse().unwrap();
        let skill_name = caps.get(2).unwrap().as_str().trim();
        println!("Pattern 1 Multi-word Match - gain: {}, skill: {}", gain, skill_name);
    } else {
        println!("Pattern 1 Multi-word No match");
    }
}
