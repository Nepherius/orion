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

