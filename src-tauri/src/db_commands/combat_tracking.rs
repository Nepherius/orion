// ========== SKILL GAINS ==========

#[tauri::command]
pub fn db_add_skill(
    uuid: String,
    session_uuid: String,
    skill_name: String,
    gain_amount: f64,
    timestamp: i64,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute(
        "INSERT INTO skill_gains (uuid, session_uuid, skill_name, gain_amount, timestamp) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![uuid, session_uuid, skill_name, gain_amount, timestamp],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_get_session_skills(
    session_uuid: String,
    state: State<'_, DbState>,
) -> Result<JsonValue, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT uuid, skill_name, gain_amount, timestamp FROM skill_gains WHERE session_uuid = ?1 ORDER BY timestamp ASC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([session_uuid], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "skillName": row.get::<_, String>(1)?,
                "gainAmount": row.get::<_, f64>(2)?,
                "timestamp": row.get::<_, i64>(3)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut skills = Vec::new();
    for row in rows {
        skills.push(row.map_err(|e| e.to_string())?);
    }
    Ok(json!(skills))
}

// ========== GLOBALS ==========

#[tauri::command]
pub fn db_add_global(
    uuid: String,
    session_uuid: String,
    creature: String,
    value: f64,
    is_hof: bool,
    timestamp: i64,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute(
        "INSERT INTO globals (uuid, session_uuid, creature, value, is_hof, timestamp) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![uuid, session_uuid, creature, value, if is_hof { 1 } else { 0 }, timestamp],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_get_session_globals(
    session_uuid: String,
    state: State<'_, DbState>,
) -> Result<JsonValue, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT uuid, creature, value, is_hof, timestamp FROM globals WHERE session_uuid = ?1 ORDER BY timestamp ASC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([session_uuid], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "creature": row.get::<_, String>(1)?,
                "value": row.get::<_, f64>(2)?,
                "isHoF": row.get::<_, i64>(3)? != 0,
                "timestamp": row.get::<_, i64>(4)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut globals = Vec::new();
    for row in rows {
        globals.push(row.map_err(|e| e.to_string())?);
    }
    Ok(json!(globals))
}

// ========== KILLS ==========

#[derive(serde::Deserialize)]
pub struct AddKillParams {
    uuid: String,
    session_uuid: String,
    creature_name: String,
    maturity: Option<String>,
    hp_dealt: f64,
    cost: f64,
    loot_value: f64,
    timestamp: i64,
}

#[tauri::command]
pub fn db_add_kill(params: AddKillParams, state: State<'_, DbState>) -> Result<(), String> {
    // println!(
    //     "[Kill Tracking] Persisting kill: creature='{}', maturity='{}', hp_dealt={:.2}, loot_value={:.2}",
    //     creature_name,
    //     maturity.clone().unwrap_or_else(|| "Unknown".to_string()),
    //     hp_dealt,
    //     loot_value
    // );

    let conn = state.db.lock().unwrap();
    conn.execute(
        "INSERT INTO kills (uuid, session_uuid, creature_name, maturity, hp_dealt, cost, loot_value, timestamp) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![params.uuid, params.session_uuid, params.creature_name, params.maturity, params.hp_dealt, params.cost, params.loot_value, params.timestamp],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_get_session_kills(
    session_uuid: String,
    state: State<'_, DbState>,
) -> Result<JsonValue, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT uuid, creature_name, maturity, hp_dealt, cost, loot_value, timestamp FROM kills WHERE session_uuid = ?1 ORDER BY timestamp ASC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([session_uuid], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "creatureName": row.get::<_, String>(1)?,
                "maturity": row.get::<_, Option<String>>(2)?,
                "hpDealt": row.get::<_, f64>(3)?,
                "cost": row.get::<_, f64>(4)?,
                "lootValue": row.get::<_, f64>(5)?,
                "timestamp": row.get::<_, i64>(6)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut kills = Vec::new();
    for row in rows {
        kills.push(row.map_err(|e| e.to_string())?);
    }
    Ok(json!(kills))
}

// ========== DAMAGE EVENTS ==========

#[tauri::command]
pub fn db_add_damage_event(
    uuid: String,
    session_uuid: String,
    damage: f64,
    is_critical: bool,
    timestamp: i64,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute(
        "INSERT INTO damage_events (uuid, session_uuid, damage, is_critical, timestamp) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![uuid, session_uuid, damage, if is_critical { 1 } else { 0 }, timestamp],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_get_session_damage_events(
    session_uuid: String,
    state: State<'_, DbState>,
) -> Result<JsonValue, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT uuid, damage, is_critical, timestamp FROM damage_events WHERE session_uuid = ?1 ORDER BY timestamp ASC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([session_uuid], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "damage": row.get::<_, f64>(1)?,
                "isCritical": row.get::<_, i64>(2)? != 0,
                "timestamp": row.get::<_, i64>(3)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut events = Vec::new();
    for row in rows {
        events.push(row.map_err(|e| e.to_string())?);
    }
    Ok(json!(events))
}

// ========== COMBAT EVENTS ==========

#[tauri::command]
pub fn db_add_combat_event(
    uuid: String,
    session_uuid: String,
    event_type: String,
    timestamp: i64,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute(
        "INSERT INTO combat_events (uuid, session_uuid, type, timestamp) VALUES (?1, ?2, ?3, ?4)",
        params![uuid, session_uuid, event_type, timestamp],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_get_session_combat_events(
    session_uuid: String,
    state: State<'_, DbState>,
) -> Result<JsonValue, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT uuid, type, timestamp FROM combat_events WHERE session_uuid = ?1 ORDER BY timestamp ASC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([session_uuid], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "type": row.get::<_, String>(1)?,
                "timestamp": row.get::<_, i64>(2)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut events = Vec::new();
    for row in rows {
        events.push(row.map_err(|e| e.to_string())?);
    }
    Ok(json!(events))
}

// ========== HEALING EVENTS ==========

#[tauri::command]
pub fn db_add_healing_event(
    uuid: String,
    session_uuid: String,
    amount: f64,
    timestamp: i64,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute(
        "INSERT INTO healing_events (uuid, session_uuid, amount, timestamp) VALUES (?1, ?2, ?3, ?4)",
        params![uuid, session_uuid, amount, timestamp],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_get_session_healing_events(
    session_uuid: String,
    state: State<'_, DbState>,
) -> Result<JsonValue, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT uuid, amount, timestamp FROM healing_events WHERE session_uuid = ?1 ORDER BY timestamp ASC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([session_uuid], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "amount": row.get::<_, f64>(1)?,
                "timestamp": row.get::<_, i64>(2)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut events = Vec::new();
    for row in rows {
        events.push(row.map_err(|e| e.to_string())?);
    }
    Ok(json!(events))
}

// ========== DAMAGE TAKEN EVENTS ==========

#[tauri::command]
pub fn db_add_damage_taken_event(
    uuid: String,
    session_uuid: String,
    damage: f64,
    is_critical: bool,
    timestamp: i64,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute(
        "INSERT INTO damage_taken_events (uuid, session_uuid, damage, is_critical, timestamp) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![uuid, session_uuid, damage, if is_critical { 1 } else { 0 }, timestamp],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_get_session_damage_taken_events(
    session_uuid: String,
    state: State<'_, DbState>,
) -> Result<JsonValue, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT uuid, damage, is_critical, timestamp FROM damage_taken_events WHERE session_uuid = ?1 ORDER BY timestamp ASC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([session_uuid], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "damage": row.get::<_, f64>(1)?,
                "isCritical": row.get::<_, i64>(2)? != 0,
                "timestamp": row.get::<_, i64>(3)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut events = Vec::new();
    for row in rows {
        events.push(row.map_err(|e| e.to_string())?);
    }
    Ok(json!(events))
}

// ========== LOADOUTS ==========
