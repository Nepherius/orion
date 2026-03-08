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



#[tauri::command]
pub fn db_get_lifetime_stats(state: State<'_, DbState>) -> Result<JsonValue, String> {
    let conn = state.db.lock().unwrap();

    // Summing across all sessions
    let total_sessions: i64 = conn
        .query_row("SELECT COUNT(*) FROM sessions", [], |row| row.get(0))
        .unwrap_or(0);

    // Get total cost across all sessions
    let total_cost: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(ammo_cost + weapon_decay + healing_cost + other_costs), 0) FROM sessions",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    // Get total loot across all loot_items
    let total_loot: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(total_value), 0) FROM loot_items",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    // Total globals & hofs
    let mut stmt = conn
        .prepare("SELECT COALESCE(SUM(CASE WHEN is_hof = 0 THEN 1 ELSE 0 END), 0), COALESCE(SUM(CASE WHEN is_hof = 1 THEN 1 ELSE 0 END), 0) FROM globals")
        .map_err(|e| e.to_string())?;
    let (total_globals, total_hofs): (i64, i64) = stmt
        .query_row([], |row| Ok((row.get(0)?, row.get(1)?)))
        .unwrap_or((0, 0));

    // Total kills & shots fired
    let mut stmt = conn
        .prepare("
            SELECT 
                (SELECT COUNT(*) FROM combat_events WHERE type LIKE 'kill_%'),
                (SELECT COUNT(*) FROM damage_events) + (SELECT COUNT(*) FROM combat_events WHERE type IN ('player_miss', 'enemy_dodge', 'enemy_evade')),
                (SELECT COALESCE(SUM(damage), 0) FROM damage_events)
        ")
        .map_err(|e| e.to_string())?;
    let (total_kills, total_shots_fired, total_damage): (i64, i64, f64) = stmt
        .query_row([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
        .unwrap_or((0, 0, 0.0));

    // Calculate total duration roughly (summing start to end/now, minus pauses)
    let total_duration: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(
                CASE 
                    WHEN end_time IS NOT NULL THEN end_time - start_time
                    ELSE (strftime('%s','now') * 1000) - start_time
                END - COALESCE(total_paused_ms, 0)
            ), 0) / 1000 FROM sessions",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    Ok(json!({
        "totalLoot": total_loot,
        "totalCost": total_cost,
        "totalKills": total_kills,
        "totalGlobals": total_globals,
        "totalHofs": total_hofs,
        "totalDamage": total_damage,
        "totalShotsFired": total_shots_fired,
        "totalDuration": total_duration,
        "totalSessions": total_sessions
    }))
}
