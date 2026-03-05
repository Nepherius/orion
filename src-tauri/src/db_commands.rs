use rusqlite::OptionalExtension;
use rusqlite::{params, Connection};
use serde_json::{json, Value as JsonValue};
use std::sync::{Arc, Mutex};
use tauri::State;

pub struct DbState {
    pub db: Arc<Mutex<Connection>>,
}

// ========== SESSIONS ==========

#[derive(serde::Deserialize)]
pub struct CreateSessionParams {
    uuid: String,
    name: String,
    weapon: String,
    armor: Option<String>,
    location: Option<String>,
    creature: String,
    start_time: i64,
    status: String,
    loadout_id: Option<String>,
    notes: String,
    ammo_cost: f64,
    weapon_decay: f64,
    healing_cost: f64,
    other_costs: f64,
}

#[tauri::command]
pub fn db_create_session(
    params: CreateSessionParams,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    let _result = conn.execute(
        "INSERT INTO sessions (uuid, name, weapon, armor, location, creature, start_time, status, loadout_id, notes, ammo_cost, weapon_decay, healing_cost, other_costs) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        params![params.uuid, params.name, params.weapon, params.armor, params.location, params.creature, params.start_time, params.status, params.loadout_id, params.notes, params.ammo_cost, params.weapon_decay, params.healing_cost, params.other_costs],
    )
    .map_err(|e| {
        let err_msg = format!("Failed to insert session: {}", e);
        println!("[DB ERROR] {}", err_msg);
        err_msg
    })?;
    Ok(())
}

#[derive(serde::Deserialize)]
pub struct UpdateSessionParams {
    uuid: String,
    name: Option<String>,
    weapon: Option<String>,
    armor: Option<String>,
    location: Option<String>,
    creature: Option<String>,
    end_time: Option<i64>,
    status: Option<String>,
    paused_at: Option<i64>,
    total_paused_ms: Option<i64>,
    loadout_id: Option<String>,
    notes: Option<String>,
    ammo_cost: Option<f64>,
    weapon_decay: Option<f64>,
    healing_cost: Option<f64>,
    other_costs: Option<f64>,
}

#[tauri::command]
pub fn db_update_session(
    params: UpdateSessionParams,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();

    // Build dynamic update query
    let mut updates = Vec::new();
    let mut values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(v) = params.name {
        updates.push("name = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = params.weapon {
        updates.push("weapon = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = params.armor {
        updates.push("armor = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = params.location {
        updates.push("location = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = params.creature {
        updates.push("creature = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = params.end_time {
        updates.push("end_time = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = params.status {
        updates.push("status = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = params.paused_at {
        updates.push("paused_at = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = params.total_paused_ms {
        updates.push("total_paused_ms = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = params.loadout_id {
        updates.push("loadout_id = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = params.notes {
        updates.push("notes = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = params.ammo_cost {
        updates.push("ammo_cost = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = params.weapon_decay {
        updates.push("weapon_decay = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = params.healing_cost {
        updates.push("healing_cost = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = params.other_costs {
        updates.push("other_costs = ?");
        values.push(Box::new(v));
    }

    if updates.is_empty() {
        return Ok(());
    }

    values.push(Box::new(params.uuid.clone()));
    let query = format!("UPDATE sessions SET {} WHERE uuid = ?", updates.join(", "));

    conn.execute(
        &query,
        rusqlite::params_from_iter(values.iter().map(|v| v.as_ref())),
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn db_delete_session(uuid: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute("DELETE FROM sessions WHERE uuid = ?1", params![uuid])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_get_all_sessions(state: State<'_, DbState>) -> Result<JsonValue, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT uuid, name, weapon, armor, location, start_time, end_time, status, paused_at, total_paused_ms, loadout_id, notes, ammo_cost, weapon_decay, healing_cost, other_costs, creature FROM sessions ORDER BY start_time DESC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "weapon": row.get::<_, String>(2)?,
                "armor": row.get::<_, Option<String>>(3)?,
                "location": row.get::<_, Option<String>>(4)?,
                "startTime": row.get::<_, i64>(5)?,
                "endTime": row.get::<_, Option<i64>>(6)?,
                "status": row.get::<_, String>(7)?,
                "pausedAt": row.get::<_, Option<i64>>(8)?,
                "totalPausedMs": row.get::<_, Option<i64>>(9)?,
                "loadoutId": row.get::<_, Option<String>>(10)?,
                "notes": row.get::<_, String>(11)?,
                "ammoCost": row.get::<_, f64>(12)?,
                "weaponDecay": row.get::<_, f64>(13)?,
                "healingCost": row.get::<_, f64>(14)?,
                "otherCosts": row.get::<_, f64>(15)?,
                "creature": row.get::<_, Option<String>>(16)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut sessions = Vec::new();
    for row in rows {
        sessions.push(row.map_err(|e| e.to_string())?);
    }
    Ok(json!(sessions))
}

// ========== LOOT ITEMS ==========

#[derive(serde::Deserialize)]
pub struct AddLootParams {
    uuid: String,
    session_uuid: String,
    name: String,
    quantity: i64,
    value: f64,
    markup: f64,
    fixed_value: Option<f64>,
    total_value: f64,
    timestamp: i64,
}

#[tauri::command]
pub fn db_add_loot(params: AddLootParams, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute(
        "INSERT INTO loot_items (uuid, session_uuid, name, quantity, value, markup, fixed_value, total_value, timestamp) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![params.uuid, params.session_uuid, params.name, params.quantity, params.value, params.markup, params.fixed_value, params.total_value, params.timestamp],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_update_loot(
    uuid: String,
    name: Option<String>,
    quantity: Option<i64>,
    value: Option<f64>,
    markup: Option<f64>,
    fixed_value: Option<f64>,
    total_value: Option<f64>,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();

    let mut updates = Vec::new();
    let mut values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(v) = name {
        updates.push("name = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = quantity {
        updates.push("quantity = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = value {
        updates.push("value = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = markup {
        updates.push("markup = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = fixed_value {
        updates.push("fixed_value = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = total_value {
        updates.push("total_value = ?");
        values.push(Box::new(v));
    }

    if updates.is_empty() {
        return Ok(());
    }

    values.push(Box::new(uuid.clone()));
    let query = format!(
        "UPDATE loot_items SET {} WHERE uuid = ?",
        updates.join(", ")
    );

    conn.execute(
        &query,
        rusqlite::params_from_iter(values.iter().map(|v| v.as_ref())),
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn db_delete_loot(uuid: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute("DELETE FROM loot_items WHERE uuid = ?1", params![uuid])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_get_session_loot(
    session_uuid: String,
    state: State<'_, DbState>,
) -> Result<JsonValue, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT uuid, name, quantity, value, markup, fixed_value, total_value, timestamp FROM loot_items WHERE session_uuid = ?1 ORDER BY timestamp ASC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([session_uuid], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "quantity": row.get::<_, i64>(2)?,
                "value": row.get::<_, f64>(3)?,
                "markup": row.get::<_, f64>(4)?,
                "fixedValue": row.get::<_, Option<f64>>(5)?,
                "totalValue": row.get::<_, f64>(6)?,
                "timestamp": row.get::<_, i64>(7)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| e.to_string())?);
    }
    Ok(json!(items))
}

#[tauri::command]
pub fn db_get_session_loot_grouped(
    session_uuid: String,
    state: State<'_, DbState>,
) -> Result<JsonValue, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT name, SUM(quantity) as quantity, SUM(value) as value, AVG(markup) as markup, SUM(total_value) as total_value, COUNT(*) as count FROM loot_items WHERE session_uuid = ?1 GROUP BY name ORDER BY SUM(total_value) DESC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([session_uuid], |row| {
            Ok(json!({
                "name": row.get::<_, String>(0)?,
                "quantity": row.get::<_, i64>(1)?,
                "value": row.get::<_, f64>(2)?,
                "markup": row.get::<_, f64>(3)?,
                "totalValue": row.get::<_, f64>(4)?,
                "count": row.get::<_, i64>(5)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|e| e.to_string())?);
    }
    Ok(json!(items))
}

#[tauri::command]
pub fn db_get_session_stats(
    session_uuid: String,
    state: State<'_, DbState>,
) -> Result<JsonValue, String> {
    let conn = state.db.lock().unwrap();

    struct SessionStatsRow {
        ammo_cost: f64,
        weapon_decay: f64,
        healing_cost: f64,
        other_costs: f64,
        status: String,
        paused_at: Option<i64>,
        total_paused_ms: Option<i64>,
        start_time: i64,
        end_time: Option<i64>,
    }

    let session_info: SessionStatsRow = conn
        .query_row(
            "SELECT ammo_cost, weapon_decay, healing_cost, other_costs, status, paused_at, total_paused_ms, start_time, end_time FROM sessions WHERE uuid = ?1",
            [&session_uuid],
            |row| {
                Ok(SessionStatsRow {
                    ammo_cost: row.get(0)?,
                    weapon_decay: row.get(1)?,
                    healing_cost: row.get(2)?,
                    other_costs: row.get(3)?,
                    status: row.get(4)?,
                    paused_at: row.get(5)?,
                    total_paused_ms: row.get(6)?,
                    start_time: row.get(7)?,
                    end_time: row.get(8)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;

    // Calculate totals and counts from aggregations
    let total_loot: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(total_value), 0) FROM loot_items WHERE session_uuid = ?1",
            [&session_uuid],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    let loot_events: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM loot_items WHERE session_uuid = ?1",
            [&session_uuid],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let mut stmt = conn
        .prepare("SELECT COALESCE(SUM(CASE WHEN is_hof = 0 THEN 1 ELSE 0 END), 0), COALESCE(SUM(CASE WHEN is_hof = 1 THEN 1 ELSE 0 END), 0) FROM globals WHERE session_uuid = ?1")
        .map_err(|e| e.to_string())?;
    let (globals, hofs): (i64, i64) = stmt
        .query_row([&session_uuid], |row| Ok((row.get(0)?, row.get(1)?)))
        .unwrap_or((0, 0));

    let damage_dealt: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(damage), 0) FROM damage_events WHERE session_uuid = ?1",
            [&session_uuid],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    let mut stmt = conn
        .prepare("SELECT COALESCE(SUM(CASE WHEN is_critical = 1 THEN 1 ELSE 0 END), 0), COALESCE(SUM(CASE WHEN is_critical = 0 THEN 1 ELSE 0 END), 0) FROM damage_events WHERE session_uuid = ?1")
        .map_err(|e| e.to_string())?;
    let (critical_hits, hits): (i64, i64) = stmt
        .query_row([&session_uuid], |row| Ok((row.get(0)?, row.get(1)?)))
        .unwrap_or((0, 0));

    let mut stmt = conn
        .prepare("SELECT COALESCE(SUM(CASE WHEN type = 'player_miss' THEN 1 ELSE 0 END), 0), COALESCE(SUM(CASE WHEN type = 'player_dodge' THEN 1 ELSE 0 END), 0), COALESCE(SUM(CASE WHEN type = 'player_evade' THEN 1 ELSE 0 END), 0), COALESCE(SUM(CASE WHEN type = 'enemy_miss' THEN 1 ELSE 0 END), 0), COALESCE(SUM(CASE WHEN type = 'enemy_evade' THEN 1 ELSE 0 END), 0), COALESCE(SUM(CASE WHEN type = 'enemy_dodge' THEN 1 ELSE 0 END), 0) FROM combat_events WHERE session_uuid = ?1")
        .map_err(|e| e.to_string())?;
    let (misses, dodges, evades, enemy_misses, enemy_evades, enemy_dodges): (
        i64,
        i64,
        i64,
        i64,
        i64,
        i64,
    ) = stmt
        .query_row([&session_uuid], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
            ))
        })
        .unwrap_or((0, 0, 0, 0, 0, 0));

    let heals_used: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM healing_events WHERE session_uuid = ?1",
            [&session_uuid],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let total_healing: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(amount), 0) FROM healing_events WHERE session_uuid = ?1",
            [&session_uuid],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    let damage_taken: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(damage), 0) FROM damage_taken_events WHERE session_uuid = ?1",
            [&session_uuid],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    // Calculate duration
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64;
    let base_paused_ms = session_info.total_paused_ms.unwrap_or(0);

    let active_pause_ms = if session_info.status == "paused" {
        if let Some(p_time) = session_info.paused_at {
            now - p_time
        } else {
            0
        }
    } else {
        0
    };

    let total_paused = base_paused_ms + active_pause_ms;
    let raw_duration = if let Some(end) = session_info.end_time {
        end - session_info.start_time
    } else {
        now - session_info.start_time
    };
    let duration_seconds = std::cmp::max(0, raw_duration - total_paused) / 1000;

    let total_cost = session_info.ammo_cost
        + session_info.weapon_decay
        + session_info.healing_cost
        + session_info.other_costs;
    let returns = if total_cost > 0.0 {
        (total_loot / total_cost) * 100.0
    } else {
        0.0
    };

    Ok(json!({
        "kills": 0,
        "lootEvents": loot_events,
        "globals": globals,
        "hofs": hofs,
        "totalLoot": total_loot,
        "totalCost": total_cost,
        "returns": returns,
        "duration": duration_seconds,
        "shotsFired": hits + critical_hits + misses + enemy_dodges + enemy_evades,
        "damageDealt": damage_dealt,
        "damageTaken": damage_taken,
        "healsUsed": heals_used,
        "totalHealing": total_healing,
        "misses": misses,
        "dodges": dodges,
        "evades": evades,
        "enemyMisses": enemy_misses,
        "enemyEvades": enemy_evades,
        "enemyDodges": enemy_dodges,
        "criticalHits": critical_hits,
        "hits": hits,
    }))
}

#[tauri::command]
pub fn db_get_all_sessions_summary(state: State<'_, DbState>) -> Result<JsonValue, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT uuid, name, weapon, armor, location, status, start_time, end_time, total_paused_ms, paused_at, ammo_cost, weapon_decay, healing_cost, other_costs, notes, loadout_id, creature FROM sessions ORDER BY start_time DESC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "weapon": row.get::<_, String>(2)?,
                "armor": row.get::<_, Option<String>>(3)?,
                "location": row.get::<_, Option<String>>(4)?,
                "status": row.get::<_, String>(5)?,
                "startTime": row.get::<_, i64>(6)?,
                "endTime": row.get::<_, Option<i64>>(7)?,
                "totalPausedMs": row.get::<_, Option<i64>>(8)?,
                "pausedAt": row.get::<_, Option<i64>>(9)?,
                "ammoCost": row.get::<_, f64>(10)?,
                "weaponDecay": row.get::<_, f64>(11)?,
                "healingCost": row.get::<_, f64>(12)?,
                "otherCosts": row.get::<_, f64>(13)?,
                "notes": row.get::<_, String>(14)?,
                "loadoutId": row.get::<_, Option<String>>(15)?,
                "creature": row.get::<_, Option<String>>(16)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut sessions = Vec::new();
    for row in rows {
        sessions.push(row.map_err(|e| e.to_string())?);
    }
    Ok(json!(sessions))
}

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

#[allow(clippy::too_many_arguments)]
#[tauri::command]
pub fn db_create_loadout(
    uuid: String,
    name: String,
    weapon: Option<String>,
    weapon_tt: f64,
    amp: Option<String>,
    amp_tt: f64,
    sight: Option<String>,
    sight_tt: f64,
    scope: Option<String>,
    scope_tt: f64,
    armor: Option<String>,
    notes: Option<String>,
    is_favorite: bool,
    is_active: bool,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute(
        "INSERT INTO loadouts (uuid, name, weapon, weapon_tt, amp, amp_tt, sight, sight_tt, scope, scope_tt, armor, notes, is_favorite, is_active) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        params![uuid, name, weapon, weapon_tt, amp, amp_tt, sight, sight_tt, scope, scope_tt, armor, notes, if is_favorite { 1 } else { 0 }, if is_active { 1 } else { 0 }],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_delete_loadout(uuid: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute("DELETE FROM loadouts WHERE uuid = ?1", params![uuid])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_get_all_loadouts(state: State<'_, DbState>) -> Result<JsonValue, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT uuid, name, weapon, weapon_tt, amp, amp_tt, sight, sight_tt, scope, scope_tt, armor, notes, is_favorite, is_active FROM loadouts")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "weapon": row.get::<_, Option<String>>(2)?,
                "weaponTT": row.get::<_, f64>(3)?,
                "amp": row.get::<_, Option<String>>(4)?,
                "ampTT": row.get::<_, f64>(5)?,
                "sight": row.get::<_, Option<String>>(6)?,
                "sightTT": row.get::<_, f64>(7)?,
                "scope": row.get::<_, Option<String>>(8)?,
                "scopeTT": row.get::<_, f64>(9)?,
                "armor": row.get::<_, Option<String>>(10)?,
                "notes": row.get::<_, Option<String>>(11)?,
                "isFavorite": row.get::<_, i64>(12)? != 0,
                "isActive": row.get::<_, i64>(13)? != 0,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut loadouts = Vec::new();
    for row in rows {
        loadouts.push(row.map_err(|e| e.to_string())?);
    }
    Ok(json!(loadouts))
}

// ========== ITEM TEMPLATES ==========

#[tauri::command]
pub fn db_add_item_template(
    uuid: String,
    name: String,
    category: String,
    default_tt_value: f64,
    default_markup: f64,
    default_fixed_value: Option<f64>,
    description: Option<String>,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute(
        "INSERT INTO item_templates (uuid, name, category, default_tt_value, default_markup, default_fixed_value, description) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![uuid, name, category, default_tt_value, default_markup, default_fixed_value, description],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_delete_item_template(uuid: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute("DELETE FROM item_templates WHERE uuid = ?1", params![uuid])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_get_all_item_templates(state: State<'_, DbState>) -> Result<JsonValue, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT uuid, name, category, default_tt_value, default_markup, default_fixed_value, description FROM item_templates")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "category": row.get::<_, String>(2)?,
                "defaultTTValue": row.get::<_, f64>(3)?,
                "defaultMarkup": row.get::<_, f64>(4)?,
                "defaultFixedValue": row.get::<_, Option<f64>>(5)?,
                "description": row.get::<_, Option<String>>(6)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut templates = Vec::new();
    for row in rows {
        templates.push(row.map_err(|e| e.to_string())?);
    }
    Ok(json!(templates))
}

// ========== SETTINGS ==========

#[tauri::command]
pub fn db_set_setting(key: String, value: String, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_get_setting(key: String, state: State<'_, DbState>) -> Result<Option<String>, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT value FROM settings WHERE key = ?1")
        .map_err(|e| e.to_string())?;

    let result = stmt
        .query_row([key], |row| row.get::<_, String>(0))
        .optional()
        .map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
pub fn db_get_all_settings(state: State<'_, DbState>) -> Result<JsonValue, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT key, value FROM settings")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| e.to_string())?;

    let mut settings = serde_json::Map::new();
    for row in rows {
        let (key, value) = row.map_err(|e| e.to_string())?;
        settings.insert(key, json!(value));
    }
    Ok(json!(settings))
}
