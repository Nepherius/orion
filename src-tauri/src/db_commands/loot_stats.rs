// ========== LOOT ITEMS ========== 
// Rust module for loot item DB commands in Orion

/// Parameters for adding a loot item to the database
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
    kill_uuid: Option<String>,
}

/// Parameters for updating a loot item in the database
#[derive(serde::Deserialize)]
pub struct UpdateLootParams {
    uuid: String,
    name: Option<String>,
    quantity: Option<i64>,
    value: Option<f64>,
    markup: Option<f64>,
    fixed_value: Option<f64>,
    total_value: Option<f64>,
    kill_uuid: Option<String>,
}

/// Add a loot item to the database
#[tauri::command]
pub fn db_add_loot(params: AddLootParams, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    conn.execute(
        "INSERT INTO loot_items (uuid, session_uuid, name, quantity, value, markup, fixed_value, total_value, timestamp, kill_uuid) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![params.uuid, params.session_uuid, params.name, params.quantity, params.value, params.markup, params.fixed_value, params.total_value, params.timestamp, params.kill_uuid],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn db_update_loot(params: UpdateLootParams, state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.db.lock().unwrap();

    let mut updates = Vec::new();
    let mut values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(v) = params.name {
        updates.push("name = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = params.quantity {
        updates.push("quantity = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = params.value {
        updates.push("value = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = params.markup {
        updates.push("markup = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = params.fixed_value {
        updates.push("fixed_value = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = params.total_value {
        updates.push("total_value = ?");
        values.push(Box::new(v));
    }
    if let Some(v) = params.kill_uuid {
        updates.push("kill_uuid = ?");
        values.push(Box::new(v));
    }

    if updates.is_empty() {
        return Ok(());
    }

    values.push(Box::new(params.uuid.clone()));
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

    let kill_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM kills WHERE session_uuid = ?1",
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
        "kills": kill_count,
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
