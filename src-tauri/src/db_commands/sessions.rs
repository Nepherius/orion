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
    tags: Option<Vec<String>>,
}

#[tauri::command]
pub fn db_create_session(
    params: CreateSessionParams,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.db.lock().unwrap();
    // Serialize tags as JSON string, or store as NULL if not present
    let tags_json = params.tags.as_ref().map(|tags| serde_json::to_string(tags).unwrap());
    let _result = conn.execute(
        "INSERT INTO sessions (uuid, name, weapon, armor, location, creature, start_time, status, loadout_id, notes, ammo_cost, weapon_decay, healing_cost, other_costs, tags) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
        params![params.uuid, params.name, params.weapon, params.armor, params.location, params.creature, params.start_time, params.status, params.loadout_id, params.notes, params.ammo_cost, params.weapon_decay, params.healing_cost, params.other_costs, tags_json],
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
    tags: Option<Vec<String>>,
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
    if let Some(tags) = params.tags {
        // Serialize tags as JSON string
        let tags_json = serde_json::to_string(&tags).unwrap();
        updates.push("tags = ?");
        values.push(Box::new(tags_json));
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
        .prepare("SELECT uuid, name, weapon, armor, location, start_time, end_time, status, paused_at, total_paused_ms, loadout_id, notes, ammo_cost, weapon_decay, healing_cost, other_costs, creature, tags FROM sessions ORDER BY start_time DESC")
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            let tags_str: Option<String> = row.get(17)?;
            let tags: Vec<String> = if let Some(s) = tags_str {
                serde_json::from_str(&s).unwrap_or_else(|_| Vec::new())
            } else {
                Vec::new()
            };
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
                "tags": tags,
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
                (SELECT COUNT(*) FROM kills),
                (SELECT COUNT(*) FROM damage_events) + (SELECT COUNT(*) FROM combat_events WHERE type IN ('player_miss', 'enemy_dodge', 'enemy_evade')),
                (SELECT COALESCE(SUM(damage), 0) FROM damage_events)
        ")
        .map_err(|e| e.to_string())?;
    let (total_kills, total_shots_fired, total_damage): (i64, i64, f64) = stmt
        .query_row([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)))
        .unwrap_or((0, 0, 0.0));

    // Calculate total duration using the same logic as frontend session stats:
    // - raw duration: end-start, or now-start for active/paused sessions
    // - paused duration: total_paused_ms + live paused segment (now - paused_at when status is paused)
    // - clamp each session to >= 0 before summing
    let total_duration: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(
                MAX(
                    (
                        CASE
                            WHEN end_time IS NOT NULL THEN end_time - start_time
                            ELSE (strftime('%s','now') * 1000) - start_time
                        END
                    ) - (
                        COALESCE(total_paused_ms, 0) +
                        CASE
                            WHEN status = 'paused' AND paused_at IS NOT NULL
                                THEN (strftime('%s','now') * 1000) - paused_at
                            ELSE 0
                        END
                    ),
                    0
                )
            ), 0) / 1000
             FROM sessions",
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

#[derive(serde::Deserialize)]
pub struct AnalyticsStatsRangeParams {
    start_time: Option<i64>,
    end_time: Option<i64>,
    tags: Option<Vec<String>>,
}

#[tauri::command]
pub fn db_get_analytics_stats(
    params: AnalyticsStatsRangeParams,
    state: State<'_, DbState>,
) -> Result<JsonValue, String> {
    let conn = state.db.lock().unwrap();
    let start_time = params.start_time;
    let end_time = params.end_time;
    let tags = params.tags;

    // Summing across sessions within selected time range (inclusive on both ends).
        let tags_json = tags.as_ref().map(|t| serde_json::to_string(t).unwrap_or("[]".to_string())).unwrap_or("[]".to_string());
        let total_sessions: i64 = conn
                .query_row(
                        "SELECT COUNT(*) FROM sessions s
                         WHERE (?1 IS NULL OR s.start_time >= ?1)
                             AND (?2 IS NULL OR s.start_time <= ?2)
                             AND (?3 IS NULL OR ?3 = '[]' OR (
                                 SELECT COUNT(*) FROM json_each(?3)
                                 WHERE json_each.value NOT IN (
                                     SELECT value FROM json_each(s.tags)
                                 )
                             ) = 0
                         )",
                        params![start_time, end_time, tags_json],
                        |row| row.get(0),
                )
                .unwrap_or(0);

    // Get total cost across sessions in range.
    let total_cost: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(s.ammo_cost + s.weapon_decay + s.healing_cost + s.other_costs), 0)
             FROM sessions s
             WHERE (?1 IS NULL OR s.start_time >= ?1)
               AND (?2 IS NULL OR s.start_time <= ?2)
               AND (?3 IS NULL OR ?3 = '[]' OR (
                   SELECT COUNT(*) FROM json_each(?3)
                   WHERE json_each.value NOT IN (
                       SELECT value FROM json_each(s.tags)
                   )
               ) = 0
             )",
            params![start_time, end_time, tags_json],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    // Get total loot for sessions in range.
    let total_loot: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(li.total_value), 0)
             FROM loot_items li
             JOIN sessions s ON s.uuid = li.session_uuid
             WHERE (?1 IS NULL OR s.start_time >= ?1)
               AND (?2 IS NULL OR s.start_time <= ?2)
               AND (?3 IS NULL OR ?3 = '[]' OR (
                   SELECT COUNT(*) FROM json_each(?3)
                   WHERE json_each.value NOT IN (
                       SELECT value FROM json_each(s.tags)
                   )
               ) = 0
             )",
            params![start_time, end_time, tags_json],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    // Total globals & hofs in range.
    let mut stmt = conn
        .prepare(
            "SELECT
                COALESCE(SUM(CASE WHEN g.is_hof = 0 THEN 1 ELSE 0 END), 0),
                COALESCE(SUM(CASE WHEN g.is_hof = 1 THEN 1 ELSE 0 END), 0)
             FROM globals g
             JOIN sessions s ON s.uuid = g.session_uuid
             WHERE (?1 IS NULL OR s.start_time >= ?1)
               AND (?2 IS NULL OR s.start_time <= ?2)
               AND (?3 IS NULL OR ?3 = '[]' OR (
                   SELECT COUNT(*) FROM json_each(?3)
                   WHERE json_each.value NOT IN (
                       SELECT value FROM json_each(s.tags)
                   )
               ) = 0
             )",
        )
        .map_err(|e| e.to_string())?;
    let (total_globals, total_hofs): (i64, i64) = stmt
        .query_row(params![start_time, end_time, tags_json], |row| Ok((row.get(0)?, row.get(1)?)))
        .unwrap_or((0, 0));

    // Total kills, shots fired, and damage in range.
    let mut stmt = conn
        .prepare(
             "SELECT
                (SELECT COUNT(*)
                 FROM kills k
                 JOIN sessions s ON s.uuid = k.session_uuid
                 WHERE (?1 IS NULL OR s.start_time >= ?1)
                   AND (?2 IS NULL OR s.start_time <= ?2)
                   AND (?3 IS NULL OR ?3 = '[]' OR (SELECT COUNT(*) FROM json_each(?3) WHERE json_each.value NOT IN (SELECT value FROM json_each(s.tags))) = 0)),
                (SELECT COUNT(*)
                 FROM damage_events de
                 JOIN sessions s ON s.uuid = de.session_uuid
                 WHERE (?1 IS NULL OR s.start_time >= ?1)
                   AND (?2 IS NULL OR s.start_time <= ?2)
                   AND (?3 IS NULL OR ?3 = '[]' OR (SELECT COUNT(*) FROM json_each(?3) WHERE json_each.value NOT IN (SELECT value FROM json_each(s.tags))) = 0))
                +
                (SELECT COUNT(*)
                 FROM combat_events ce
                 JOIN sessions s ON s.uuid = ce.session_uuid
                 WHERE ce.type IN ('player_miss', 'enemy_dodge', 'enemy_evade')
                   AND (?1 IS NULL OR s.start_time >= ?1)
                   AND (?2 IS NULL OR s.start_time <= ?2)
                   AND (?3 IS NULL OR ?3 = '[]' OR (SELECT COUNT(*) FROM json_each(?3) WHERE json_each.value NOT IN (SELECT value FROM json_each(s.tags))) = 0)),
                (SELECT COALESCE(SUM(de.damage), 0)
                 FROM damage_events de
                 JOIN sessions s ON s.uuid = de.session_uuid
                 WHERE (?1 IS NULL OR s.start_time >= ?1)
                   AND (?2 IS NULL OR s.start_time <= ?2)
                   AND (?3 IS NULL OR ?3 = '[]' OR (SELECT COUNT(*) FROM json_each(?3) WHERE json_each.value NOT IN (SELECT value FROM json_each(s.tags))) = 0))",
        )
        .map_err(|e| e.to_string())?;
    let (total_kills, total_shots_fired, total_damage): (i64, i64, f64) = stmt
        .query_row(params![start_time, end_time, tags_json], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })
        .unwrap_or((0, 0, 0.0));

    // Calculate total duration from sessions in range using frontend-equivalent duration logic.
    let total_duration: i64 = conn
        .query_row(
            "SELECT COALESCE(SUM(
                MAX(
                    (
                        CASE
                            WHEN s.end_time IS NOT NULL THEN s.end_time - s.start_time
                            ELSE (strftime('%s','now') * 1000) - s.start_time
                        END
                    ) - (
                        COALESCE(s.total_paused_ms, 0) +
                        CASE
                            WHEN s.status = 'paused' AND s.paused_at IS NOT NULL
                                THEN (strftime('%s','now') * 1000) - s.paused_at
                            ELSE 0
                        END
                    ),
                    0
                )
            ), 0) / 1000
             FROM sessions s
             WHERE (?1 IS NULL OR s.start_time >= ?1)
               AND (?2 IS NULL OR s.start_time <= ?2)
               AND (?3 IS NULL OR ?3 = '[]' OR (
                   SELECT COUNT(*) FROM json_each(?3)
                   WHERE json_each.value NOT IN (
                       SELECT value FROM json_each(s.tags)
                   )
               ) = 0
             )",
            params![start_time, end_time, tags_json],
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

#[tauri::command]
pub fn db_get_analytics_performance_data(
    params: AnalyticsStatsRangeParams,
    state: State<'_, DbState>,
) -> Result<JsonValue, String> {
    let conn = state.db.lock().unwrap();
    let start_time = params.start_time;
    let end_time = params.end_time;

        let tags = params.tags;
        let tags_json = tags.as_ref().map(|t| serde_json::to_string(t).unwrap_or("[]".to_string())).unwrap_or("[]".to_string());
        let (avg_loot_value, avg_loot_squared): (f64, f64) = conn
                .query_row(
                        "SELECT
                                COALESCE(AVG(li.total_value), 0),
                                COALESCE(AVG(li.total_value * li.total_value), 0)
                         FROM loot_items li
                         JOIN sessions s ON s.uuid = li.session_uuid
                         WHERE (?1 IS NULL OR s.start_time >= ?1)
                             AND (?2 IS NULL OR s.start_time <= ?2)
                             AND (?3 IS NULL OR ?3 = '[]' OR (
                                 SELECT COUNT(*) FROM json_each(?3)
                                 WHERE json_each.value NOT IN (
                                     SELECT value FROM json_each(s.tags)
                                 )
                             ) = 0
                         )",
                        params![start_time, end_time, tags_json],
                        |row| Ok((row.get(0)?, row.get(1)?)),
                )
                .unwrap_or((0.0, 0.0));
    let variance = (avg_loot_squared - (avg_loot_value * avg_loot_value)).max(0.0);
    let overall_loot_std_dev = variance.sqrt();

        let largest_drop_value: f64 = conn
                .query_row(
                        "SELECT COALESCE(MAX(li.total_value), 0)
                         FROM loot_items li
                         JOIN sessions s ON s.uuid = li.session_uuid
                         WHERE (?1 IS NULL OR s.start_time >= ?1)
                             AND (?2 IS NULL OR s.start_time <= ?2)
                             AND (?3 IS NULL OR ?3 = '[]' OR (
                                 SELECT COUNT(*) FROM json_each(?3)
                                 WHERE json_each.value NOT IN (
                                     SELECT value FROM json_each(s.tags)
                                 )
                             ) = 0
                         )",
                        params![start_time, end_time, tags_json],
                        |row| row.get(0),
                )
                .unwrap_or(0.0);

        let total_loot_events: i64 = conn
                .query_row(
                        "SELECT COUNT(*)
                         FROM loot_items li
                         JOIN sessions s ON s.uuid = li.session_uuid
                         WHERE (?1 IS NULL OR s.start_time >= ?1)
                             AND (?2 IS NULL OR s.start_time <= ?2)
                             AND (?3 IS NULL OR ?3 = '[]' OR (
                                 SELECT COUNT(*) FROM json_each(?3)
                                 WHERE json_each.value NOT IN (
                                     SELECT value FROM json_each(s.tags)
                                 )
                             ) = 0
                         )",
                        params![start_time, end_time, tags_json],
                        |row| row.get(0),
                )
                .unwrap_or(0);

    let (total_globals_count, total_hofs_count, avg_global_value, best_global_value): (
        i64,
        i64,
        f64,
        f64,
        ) = conn
                .query_row(
                        "SELECT
                                COUNT(*),
                                COALESCE(SUM(CASE WHEN g.is_hof = 1 THEN 1 ELSE 0 END), 0),
                                COALESCE(AVG(g.value), 0),
                                COALESCE(MAX(g.value), 0)
                         FROM globals g
                         JOIN sessions s ON s.uuid = g.session_uuid
                         WHERE (?1 IS NULL OR s.start_time >= ?1)
                             AND (?2 IS NULL OR s.start_time <= ?2)
                             AND (?3 IS NULL OR ?3 = '[]' OR (
                                 SELECT COUNT(*) FROM json_each(?3)
                                 WHERE json_each.value NOT IN (
                                     SELECT value FROM json_each(s.tags)
                                 )
                             ) = 0
                         )",
                        params![start_time, end_time, tags_json],
                        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
                )
                .unwrap_or((0, 0, 0.0, 0.0));

        let total_kills: i64 = conn
                .query_row(
                        "SELECT COUNT(*)
                         FROM kills k
                         JOIN sessions s ON s.uuid = k.session_uuid
                         WHERE (?1 IS NULL OR s.start_time >= ?1)
                             AND (?2 IS NULL OR s.start_time <= ?2)
                             AND (?3 IS NULL OR ?3 = '[]' OR (
                                 SELECT COUNT(*) FROM json_each(?3)
                                 WHERE json_each.value NOT IN (
                                     SELECT value FROM json_each(s.tags)
                                 )
                             ) = 0
                         )",
                        params![start_time, end_time, tags_json],
                        |row| row.get(0),
                )
                .unwrap_or(0);

    let total_duration_hours: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(
                MAX(
                    (
                        CASE
                            WHEN s.end_time IS NOT NULL THEN s.end_time - s.start_time
                            ELSE (strftime('%s','now') * 1000) - s.start_time
                        END
                    ) - (
                        COALESCE(s.total_paused_ms, 0) +
                        CASE
                            WHEN s.status = 'paused' AND s.paused_at IS NOT NULL
                                THEN (strftime('%s','now') * 1000) - s.paused_at
                            ELSE 0
                        END
                    ),
                    0
                )
            ), 0) / (1000.0 * 60.0 * 60.0)
             FROM sessions s
             WHERE (?1 IS NULL OR s.start_time >= ?1)
               AND (?2 IS NULL OR s.start_time <= ?2)
               AND (?3 IS NULL OR ?3 = '[]' OR (
                 SELECT COUNT(*) FROM json_each(?3)
                 WHERE json_each.value NOT IN (
                   SELECT value FROM json_each(s.tags)
                 )
               ) = 0
             )",
            params![start_time, end_time, tags_json],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    let global_drop_rate_per_kill = if total_kills > 0 {
        total_globals_count as f64 / total_kills as f64
    } else {
        0.0
    };

    let global_drop_rate_per_hour = if total_duration_hours > 0.0 {
        total_globals_count as f64 / total_duration_hours
    } else {
        0.0
    };

    let avg_minutes_per_loot: f64 = conn
        .query_row(
            "WITH session_loot AS (
                SELECT li.session_uuid, COUNT(*) AS loot_count
                FROM loot_items li
                GROUP BY li.session_uuid
             ),
             session_duration_min AS (
                SELECT
                    s.uuid AS session_uuid,
                    MAX(
                        (
                            CASE
                                WHEN s.end_time IS NOT NULL THEN s.end_time - s.start_time
                                ELSE (strftime('%s','now') * 1000) - s.start_time
                            END
                        ) - (
                            COALESCE(s.total_paused_ms, 0) +
                            CASE
                                WHEN s.status = 'paused' AND s.paused_at IS NOT NULL
                                    THEN (strftime('%s','now') * 1000) - s.paused_at
                                ELSE 0
                            END
                        ),
                        0
                    ) / (1000.0 * 60.0) AS duration_min
                FROM sessions s
                WHERE (?1 IS NULL OR s.start_time >= ?1)
                  AND (?2 IS NULL OR s.start_time <= ?2)
                  AND (?3 IS NULL OR ?3 = '[]' OR (SELECT COUNT(*) FROM json_each(?3) WHERE json_each.value NOT IN (SELECT value FROM json_each(s.tags))) = 0)
             )
             SELECT COALESCE(AVG(
                CASE
                    WHEN COALESCE(sl.loot_count, 0) > 0 THEN sd.duration_min / sl.loot_count
                    ELSE 0
                END
             ), 0)
             FROM session_duration_min sd
             LEFT JOIN session_loot sl ON sl.session_uuid = sd.session_uuid",
            params![start_time, end_time, tags_json],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

    let mut top_loot_items_stmt = conn
        .prepare(
            "SELECT
                li.name,
                COALESCE(SUM(li.total_value), 0) AS total_value,
                COALESCE(SUM(li.quantity), 0) AS quantity,
                COUNT(*) AS drops,
                COALESCE(AVG(li.total_value), 0) AS avg_value
             FROM loot_items li
             JOIN sessions s ON s.uuid = li.session_uuid
             WHERE (?1 IS NULL OR s.start_time >= ?1)
               AND (?2 IS NULL OR s.start_time <= ?2)
               AND (?3 IS NULL OR ?3 = '[]' OR (SELECT COUNT(*) FROM json_each(?3) WHERE json_each.value NOT IN (SELECT value FROM json_each(s.tags))) = 0)
             GROUP BY li.name
             ORDER BY total_value DESC
             LIMIT 20",
        )
        .map_err(|e| e.to_string())?;
    let top_loot_items_rows = top_loot_items_stmt
        .query_map(params![start_time, end_time, tags_json], |row| {
            Ok(json!({
                "name": row.get::<_, String>(0)?,
                "totalValue": row.get::<_, f64>(1)?,
                "quantity": row.get::<_, i64>(2)?,
                "drops": row.get::<_, i64>(3)?,
                "avgValue": row.get::<_, f64>(4)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    let mut top_loot_items = Vec::new();
    for row in top_loot_items_rows {
        top_loot_items.push(row.map_err(|e| e.to_string())?);
    }

    let mut globals_stmt = conn
        .prepare(
            "SELECT
                g.uuid,
                g.creature,
                g.value,
                g.is_hof,
                s.name,
                s.location,
                g.timestamp
             FROM globals g
             JOIN sessions s ON s.uuid = g.session_uuid
             WHERE (?1 IS NULL OR s.start_time >= ?1)
               AND (?2 IS NULL OR s.start_time <= ?2)
               AND (?3 IS NULL OR ?3 = '[]' OR (SELECT COUNT(*) FROM json_each(?3) WHERE json_each.value NOT IN (SELECT value FROM json_each(s.tags))) = 0)
             ORDER BY g.value DESC
             LIMIT 50",
        )
        .map_err(|e| e.to_string())?;
    let globals_rows = globals_stmt
        .query_map(params![start_time, end_time, tags_json], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "creature": row.get::<_, String>(1)?,
                "value": row.get::<_, f64>(2)?,
                "isHoF": row.get::<_, i64>(3)? != 0,
                "sessionName": row.get::<_, String>(4)?,
                "location": row.get::<_, Option<String>>(5)?,
                "timestamp": row.get::<_, i64>(6)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    let mut all_globals = Vec::new();
    for row in globals_rows {
        all_globals.push(row.map_err(|e| e.to_string())?);
    }

    let mut recent_sessions_stmt = conn
        .prepare(
            "WITH session_loot AS (
                SELECT session_uuid, COALESCE(SUM(total_value), 0) AS total_loot
                FROM loot_items
                GROUP BY session_uuid
             ),
             recent AS (
                SELECT
                    s.uuid,
                    s.start_time,
                    COALESCE(sl.total_loot, 0) AS total_loot,
                    (s.ammo_cost + s.weapon_decay + s.healing_cost + s.other_costs) AS total_cost
                FROM sessions s
                LEFT JOIN session_loot sl ON sl.session_uuid = s.uuid
                WHERE s.status = 'completed'
                  AND (?1 IS NULL OR s.start_time >= ?1)
                  AND (?2 IS NULL OR s.start_time <= ?2)
                  AND (?3 IS NULL OR ?3 = '[]' OR (SELECT COUNT(*) FROM json_each(?3) WHERE json_each.value NOT IN (SELECT value FROM json_each(s.tags))) = 0)
                ORDER BY s.start_time DESC
                LIMIT 30
             )
             SELECT
                start_time,
                CASE WHEN total_cost > 0 THEN (total_loot / total_cost) * 100 ELSE 0 END AS return_rate,
                (total_loot - total_cost) AS profit,
                total_loot
             FROM recent
             ORDER BY start_time ASC",
        )
        .map_err(|e| e.to_string())?;
    let recent_rows = recent_sessions_stmt
        .query_map(params![start_time, end_time, tags_json], |row| {
            Ok(json!({
                "startTime": row.get::<_, i64>(0)?,
                "returnRate": row.get::<_, f64>(1)?,
                "profit": row.get::<_, f64>(2)?,
                "loot": row.get::<_, f64>(3)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    let mut recent_sessions = Vec::new();
    for row in recent_rows {
        recent_sessions.push(row.map_err(|e| e.to_string())?);
    }

    let mut location_stmt = conn
        .prepare(
            "WITH session_loot AS (
                SELECT session_uuid, COALESCE(SUM(total_value), 0) AS total_loot
                FROM loot_items
                GROUP BY session_uuid
             ),
             session_globals AS (
                SELECT session_uuid, COUNT(*) AS globals_count
                FROM globals
                GROUP BY session_uuid
             )
             SELECT
                COALESCE(s.location, 'Unknown') AS location,
                COUNT(*) AS sessions,
                COALESCE(SUM(sl.total_loot), 0) AS loot,
                COALESCE(SUM(s.ammo_cost + s.weapon_decay + s.healing_cost + s.other_costs), 0) AS cost,
                COALESCE(SUM(sg.globals_count), 0) AS globals
             FROM sessions s
             LEFT JOIN session_loot sl ON sl.session_uuid = s.uuid
             LEFT JOIN session_globals sg ON sg.session_uuid = s.uuid
             WHERE (?1 IS NULL OR s.start_time >= ?1)
               AND (?2 IS NULL OR s.start_time <= ?2)
               AND (?3 IS NULL OR ?3 = '[]' OR (SELECT COUNT(*) FROM json_each(?3) WHERE json_each.value NOT IN (SELECT value FROM json_each(s.tags))) = 0)
             GROUP BY location
             ORDER BY loot DESC",
        )
        .map_err(|e| e.to_string())?;
    let location_rows = location_stmt
        .query_map(params![start_time, end_time, tags_json], |row| {
            let loot: f64 = row.get(2)?;
            let cost: f64 = row.get(3)?;
            Ok(json!({
                "location": row.get::<_, String>(0)?,
                "sessions": row.get::<_, i64>(1)?,
                "loot": loot,
                "cost": cost,
                "profit": loot - cost,
                "returnRate": if cost > 0.0 { (loot / cost) * 100.0 } else { 0.0 },
                "globals": row.get::<_, i64>(4)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    let mut location_data = Vec::new();
    for row in location_rows {
        location_data.push(row.map_err(|e| e.to_string())?);
    }

    let (ammo, weapon_decay, healing, other): (f64, f64, f64, f64) = conn
        .query_row(
            "SELECT
                COALESCE(SUM(s.ammo_cost), 0),
                COALESCE(SUM(s.weapon_decay), 0),
                COALESCE(SUM(s.healing_cost), 0),
                COALESCE(SUM(s.other_costs), 0)
             FROM sessions s
             WHERE (?1 IS NULL OR s.start_time >= ?1)
               AND (?2 IS NULL OR s.start_time <= ?2)
               AND (?3 IS NULL OR ?3 = '[]' OR (SELECT COUNT(*) FROM json_each(?3) WHERE json_each.value NOT IN (SELECT value FROM json_each(s.tags))) = 0)",
            params![start_time, end_time, tags_json],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .unwrap_or((0.0, 0.0, 0.0, 0.0));

    let cost_data = vec![
        json!({"name": "Ammo", "value": ammo, "color": "#EF4444"}),
        json!({"name": "Weapon Decay", "value": weapon_decay, "color": "#F59E0B"}),
        json!({"name": "Healing", "value": healing, "color": "#10B981"}),
        json!({"name": "Other", "value": other, "color": "#6B7280"}),
    ]
    .into_iter()
    .filter(|item| item["value"].as_f64().unwrap_or(0.0) > 0.0)
    .collect::<Vec<_>>();

    let mut weapon_stmt = conn
        .prepare(
            "WITH session_loot AS (
                SELECT session_uuid, COALESCE(SUM(total_value), 0) AS total_loot
                FROM loot_items
                GROUP BY session_uuid
             ),
             session_kills AS (
                SELECT session_uuid, COUNT(*) AS kill_count
                FROM kills
                GROUP BY session_uuid
             ),
             session_damage AS (
                SELECT session_uuid, COALESCE(SUM(damage), 0) AS damage_dealt
                FROM damage_events
                GROUP BY session_uuid
             )
             SELECT
                COALESCE(s.weapon, 'Unknown') AS weapon,
                COUNT(*) AS sessions,
                COALESCE(SUM(sl.total_loot), 0) AS total_loot,
                COALESCE(SUM(s.ammo_cost + s.weapon_decay + s.healing_cost + s.other_costs), 0) AS total_cost,
                COALESCE(SUM(sk.kill_count), 0) AS total_kills,
                COALESCE(SUM(sd.damage_dealt), 0) AS total_damage
             FROM sessions s
             LEFT JOIN session_loot sl ON sl.session_uuid = s.uuid
             LEFT JOIN session_kills sk ON sk.session_uuid = s.uuid
             LEFT JOIN session_damage sd ON sd.session_uuid = s.uuid
             WHERE (?1 IS NULL OR s.start_time >= ?1)
               AND (?2 IS NULL OR s.start_time <= ?2)
               AND (?3 IS NULL OR ?3 = '[]' OR (SELECT COUNT(*) FROM json_each(?3) WHERE json_each.value NOT IN (SELECT value FROM json_each(s.tags))) = 0)
             GROUP BY weapon
             ORDER BY total_cost DESC
             LIMIT 10",
        )
        .map_err(|e| e.to_string())?;
    let weapon_rows = weapon_stmt
        .query_map(params![start_time, end_time, tags_json], |row| {
            let total_loot: f64 = row.get(2)?;
            let total_cost: f64 = row.get(3)?;
            let total_kills: i64 = row.get(4)?;
            let total_damage: f64 = row.get(5)?;
            Ok(json!({
                "weapon": row.get::<_, String>(0)?,
                "sessions": row.get::<_, i64>(1)?,
                "returnRate": if total_cost > 0.0 { (total_loot / total_cost) * 100.0 } else { 0.0 },
                "totalLoot": total_loot,
                "totalCost": total_cost,
                "avgDamage": if total_kills > 0 { total_damage / total_kills as f64 } else { 0.0 },
                "totalDamage": total_damage,
                "totalKills": total_kills,
            }))
        })
        .map_err(|e| e.to_string())?;
    let mut weapon_data = Vec::new();
    for row in weapon_rows {
        weapon_data.push(row.map_err(|e| e.to_string())?);
    }

    let mut armor_stmt = conn
        .prepare(
            "WITH session_loot AS (
                SELECT session_uuid, COALESCE(SUM(total_value), 0) AS total_loot
                FROM loot_items
                GROUP BY session_uuid
             ),
             session_damage_taken AS (
                SELECT session_uuid, COALESCE(SUM(damage), 0) AS damage_taken
                FROM damage_taken_events
                GROUP BY session_uuid
             )
             SELECT
                COALESCE(s.armor, 'None') AS armor,
                COUNT(*) AS sessions,
                COALESCE(SUM(sl.total_loot), 0) AS total_loot,
                COALESCE(SUM(s.ammo_cost + s.weapon_decay + s.healing_cost + s.other_costs), 0) AS total_cost,
                COALESCE(SUM(dt.damage_taken), 0) AS total_damage_taken
             FROM sessions s
             LEFT JOIN session_loot sl ON sl.session_uuid = s.uuid
             LEFT JOIN session_damage_taken dt ON dt.session_uuid = s.uuid
             WHERE (?1 IS NULL OR s.start_time >= ?1)
               AND (?2 IS NULL OR s.start_time <= ?2)
               AND (?3 IS NULL OR ?3 = '[]' OR (SELECT COUNT(*) FROM json_each(?3) WHERE json_each.value NOT IN (SELECT value FROM json_each(s.tags))) = 0)
             GROUP BY armor
             ORDER BY sessions DESC
             LIMIT 10",
        )
        .map_err(|e| e.to_string())?;
    let armor_rows = armor_stmt
        .query_map(params![start_time, end_time, tags_json], |row| {
            let sessions_count: i64 = row.get(1)?;
            let total_loot: f64 = row.get(2)?;
            let total_cost: f64 = row.get(3)?;
            let total_damage_taken: f64 = row.get(4)?;
            Ok(json!({
                "armor": row.get::<_, String>(0)?,
                "sessions": sessions_count,
                "returnRate": if total_cost > 0.0 { (total_loot / total_cost) * 100.0 } else { 0.0 },
                "avgDamageTaken": if sessions_count > 0 { total_damage_taken / sessions_count as f64 } else { 0.0 },
            }))
        })
        .map_err(|e| e.to_string())?;
    let mut armor_data = Vec::new();
    for row in armor_rows {
        armor_data.push(row.map_err(|e| e.to_string())?);
    }

    let mut top_skills_stmt = conn
        .prepare(
            "SELECT
                sg.skill_name,
                COALESCE(SUM(sg.gain_amount), 0) AS total_gain
             FROM skill_gains sg
             JOIN sessions s ON s.uuid = sg.session_uuid
             WHERE (?1 IS NULL OR s.start_time >= ?1)
               AND (?2 IS NULL OR s.start_time <= ?2)
               AND (?3 IS NULL OR ?3 = '[]' OR (SELECT COUNT(*) FROM json_each(?3) WHERE json_each.value NOT IN (SELECT value FROM json_each(s.tags))) = 0)
             GROUP BY sg.skill_name
             ORDER BY total_gain DESC
             LIMIT 15",
        )
        .map_err(|e| e.to_string())?;
    let top_skills_rows = top_skills_stmt
        .query_map(params![start_time, end_time, tags_json], |row| {
            Ok(json!({
                "name": row.get::<_, String>(0)?,
                "total": row.get::<_, f64>(1)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    let mut top_skills = Vec::new();
    for row in top_skills_rows {
        top_skills.push(row.map_err(|e| e.to_string())?);
    }

    let mut loadout_stmt = conn
        .prepare(
            "SELECT
                COALESCE(k.loadout_id, '') AS loadout_id,
                COUNT(DISTINCT k.session_uuid) AS sessions,
                COALESCE(SUM(k.loot_value), 0) AS total_loot,
                COALESCE(SUM(k.cost), 0) AS total_cost,
                COUNT(*) AS total_kills
             FROM kills k
             JOIN sessions s ON s.uuid = k.session_uuid
             WHERE (?1 IS NULL OR s.start_time >= ?1)
               AND (?2 IS NULL OR s.start_time <= ?2)
               AND (?3 IS NULL OR ?3 = '[]' OR (SELECT COUNT(*) FROM json_each(?3) WHERE json_each.value NOT IN (SELECT value FROM json_each(s.tags))) = 0)
             GROUP BY k.loadout_id
             ORDER BY CASE WHEN total_cost > 0 THEN (total_loot / total_cost) ELSE 0 END DESC",
        )
        .map_err(|e| e.to_string())?;
    let loadout_rows = loadout_stmt
        .query_map(params![start_time, end_time, tags_json], |row| {
            let sessions_count: i64 = row.get(1)?;
            let total_loot: f64 = row.get(2)?;
            let total_cost: f64 = row.get(3)?;
            let total_kills: i64 = row.get(4)?;
            Ok(json!({
                "loadoutId": row.get::<_, String>(0)?,
                "sessions": sessions_count,
                "returnRate": if total_cost > 0.0 { (total_loot / total_cost) * 100.0 } else { 0.0 },
                "profit": total_loot - total_cost,
                "avgKills": if sessions_count > 0 { total_kills as f64 / sessions_count as f64 } else { 0.0 },
            }))
        })
        .map_err(|e| e.to_string())?;
    let mut loadout_data = Vec::new();
    for row in loadout_rows {
        let json_row = row.map_err(|e| e.to_string())?;
        if json_row["loadoutId"].as_str().unwrap_or("").is_empty() {
            continue;
        }
        loadout_data.push(json_row);
    }

    Ok(json!({
        "avgLootValue": avg_loot_value,
        "overallLootStdDev": overall_loot_std_dev,
        "largestDropValue": largest_drop_value,
        "avgMinutesPerLoot": avg_minutes_per_loot,
        "totalLootEvents": total_loot_events,
        "totalGlobalsCount": total_globals_count,
        "totalHoFsCount": total_hofs_count,
        "globalDropRatePerKill": global_drop_rate_per_kill,
        "globalDropRatePerHour": global_drop_rate_per_hour,
        "avgGlobalValue": avg_global_value,
        "bestGlobalValue": best_global_value,
        "topLootItems": top_loot_items,
        "allGlobals": all_globals,
        "recentSessions": recent_sessions,
        "locationData": location_data,
        "costData": cost_data,
        "weaponData": weapon_data,
        "topSkills": top_skills,
        "armorData": armor_data,
        "loadoutData": loadout_data
    }))
}

#[tauri::command]
pub fn db_get_analytics_advanced_data(
    params: AnalyticsStatsRangeParams,
    state: State<'_, DbState>,
) -> Result<JsonValue, String> {
    let conn = state.db.lock().unwrap();
    let start_time = params.start_time;
    let end_time = params.end_time;

    let tags = params.tags;
    let tags_json = tags.as_ref().map(|t| serde_json::to_string(t).unwrap_or("[]".to_string())).unwrap_or("[]".to_string());
    let mut sessions_stmt = conn
        .prepare(
            "WITH session_loot AS (
                SELECT session_uuid, COALESCE(SUM(total_value), 0) AS total_loot
                FROM loot_items
                GROUP BY session_uuid
             )
             SELECT
                s.uuid,
                s.start_time,
                COALESCE(sl.total_loot, 0) AS total_loot,
                (s.ammo_cost + s.weapon_decay + s.healing_cost + s.other_costs) AS total_cost,
                MAX(
                    (
                        CASE
                            WHEN s.end_time IS NOT NULL THEN s.end_time - s.start_time
                            ELSE (strftime('%s','now') * 1000) - s.start_time
                        END
                    ) - (
                        COALESCE(s.total_paused_ms, 0) +
                        CASE
                            WHEN s.status = 'paused' AND s.paused_at IS NOT NULL
                                THEN (strftime('%s','now') * 1000) - s.paused_at
                            ELSE 0
                        END
                    ),
                    0
                ) AS duration_ms
             FROM sessions s
             LEFT JOIN session_loot sl ON sl.session_uuid = s.uuid
             WHERE (?1 IS NULL OR s.start_time >= ?1)
               AND (?2 IS NULL OR s.start_time <= ?2)
               AND (?3 IS NULL OR ?3 = '[]' OR (
                 SELECT COUNT(*) FROM json_each(?3)
                 WHERE json_each.value NOT IN (
                   SELECT value FROM json_each(s.tags)
                 )
               ) = 0
             )
             ORDER BY s.start_time DESC",
        )
        .map_err(|e| e.to_string())?;
    let sessions_rows = sessions_stmt
        .query_map(params![start_time, end_time, tags_json], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, f64>(2)?,
                row.get::<_, f64>(3)?,
                row.get::<_, i64>(4)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut session_profits_desc: Vec<(i64, f64)> = Vec::new();
    let mut session_ids = std::collections::HashSet::new();
    let mut total_duration_hours = 0.0f64;
    let mut returns_by_hour: std::collections::BTreeMap<i64, (i64, f64)> = std::collections::BTreeMap::new();
    let mut chronological_start_times: Vec<i64> = Vec::new();
    for row in sessions_rows {
        let (uuid, start, loot, cost, duration_ms) = row.map_err(|e| e.to_string())?;
        let profit = loot - cost;
        let ret = if cost > 0.0 { (loot / cost) * 100.0 } else { 0.0 };
        session_profits_desc.push((start, profit));
        session_ids.insert(uuid);
        total_duration_hours += (duration_ms.max(0) as f64) / (1000.0 * 60.0 * 60.0);
        let hour = ((start / 1000) / 3600) % 24;
        let entry = returns_by_hour.entry(hour).or_insert((0, 0.0));
        entry.0 += 1;
        entry.1 += ret;
        chronological_start_times.push(start);
    }
    let total_sessions = session_profits_desc.len() as i64;
    let avg_session_hours = if total_sessions > 0 {
        total_duration_hours / total_sessions as f64
    } else {
        0.0
    };

    let profitable_count = session_profits_desc.iter().filter(|(_, p)| *p >= 0.0).count() as f64;
    let session_win_rate = if total_sessions > 0 {
        (profitable_count / total_sessions as f64) * 100.0
    } else {
        0.0
    };

    let mut current_streak = 0i64;
    let mut longest_streak = 0i64;
    for (_, profit) in &session_profits_desc {
        if *profit >= 0.0 {
            current_streak += 1;
            if current_streak > longest_streak {
                longest_streak = current_streak;
            }
        } else {
            current_streak = 0;
        }
    }

    let mut best_hour = -1i64;
    let mut best_hour_return_rate = 0.0f64;
    for (hour, (count, return_total)) in returns_by_hour {
        if count <= 0 {
            continue;
        }
        let avg = return_total / count as f64;
        if avg > best_hour_return_rate {
            best_hour = hour;
            best_hour_return_rate = avg;
        }
    }
    let best_hour_label = if best_hour >= 0 {
        format!("{}:00-{}:59", best_hour, best_hour)
    } else {
        "N/A".to_string()
    };

    chronological_start_times.sort();
    let mut total_gap_ms = 0i64;
    let mut gap_count = 0i64;
    for i in 1..chronological_start_times.len() {
        let gap = chronological_start_times[i] - chronological_start_times[i - 1];
        if gap > 0 {
            total_gap_ms += gap;
            gap_count += 1;
        }
    }
    let avg_gap_hours = if gap_count > 0 {
        total_gap_ms as f64 / gap_count as f64 / (1000.0 * 60.0 * 60.0)
    } else {
        0.0
    };

    let total_profit: f64 = session_profits_desc.iter().map(|(_, p)| *p).sum();
    let recent_n = std::cmp::min(10usize, session_profits_desc.len());
    let avg_recent_profit = if recent_n > 0 {
        session_profits_desc
            .iter()
            .take(recent_n)
            .map(|(_, p)| *p)
            .sum::<f64>()
            / recent_n as f64
    } else {
        0.0
    };
    let projected_lifetime_profit = total_profit + avg_recent_profit;
    let sessions_to_break_even = if total_profit >= 0.0 || avg_recent_profit <= 0.0 {
        JsonValue::Null
    } else {
        json!((total_profit.abs() / avg_recent_profit).ceil() as i64)
    };

    let mut creature_stmt = conn
        .prepare(
            "WITH kills_by_creature_session AS (
                SELECT
                    COALESCE(NULLIF(TRIM(k.creature_name), ''), 'Unknown') AS creature,
                    k.session_uuid,
                    COUNT(*) AS kill_count,
                    COALESCE(SUM(k.cost), 0) AS total_cost,
                    COALESCE(SUM(k.loot_value), 0) AS total_loot
                FROM kills k
                JOIN sessions s ON s.uuid = k.session_uuid
                WHERE (?1 IS NULL OR s.start_time >= ?1)
                  AND (?2 IS NULL OR s.start_time <= ?2)
                  AND (?3 IS NULL OR ?3 = '[]' OR (SELECT COUNT(*) FROM json_each(?3) WHERE json_each.value NOT IN (SELECT value FROM json_each(s.tags))) = 0)
                GROUP BY creature, k.session_uuid
            ),
            globals_by_session AS (
                SELECT session_uuid, COUNT(*) AS globals_count
                FROM globals
                GROUP BY session_uuid
            ),
            session_creature AS (
                SELECT s.uuid AS session_uuid, COALESCE(NULLIF(TRIM(s.creature), ''), 'Unknown') AS creature
                FROM sessions s
                WHERE (?1 IS NULL OR s.start_time >= ?1)
                  AND (?2 IS NULL OR s.start_time <= ?2)
                  AND (?3 IS NULL OR ?3 = '[]' OR (SELECT COUNT(*) FROM json_each(?3) WHERE json_each.value NOT IN (SELECT value FROM json_each(s.tags))) = 0)
            )
            SELECT
                kcs.creature,
                COUNT(DISTINCT kcs.session_uuid) AS sessions_count,
                COALESCE(SUM(kcs.total_loot), 0) AS total_loot,
                COALESCE(SUM(kcs.total_cost), 0) AS total_cost,
                COALESCE(SUM(kcs.kill_count), 0) AS total_kills,
                COALESCE(SUM(CASE WHEN sc.creature = kcs.creature THEN COALESCE(gs.globals_count, 0) ELSE 0 END), 0) AS total_globals
            FROM kills_by_creature_session kcs
            LEFT JOIN session_creature sc ON sc.session_uuid = kcs.session_uuid
            LEFT JOIN globals_by_session gs ON gs.session_uuid = kcs.session_uuid
            GROUP BY kcs.creature
            ORDER BY total_loot DESC",
        )
        .map_err(|e| e.to_string())?;
    let creature_rows = creature_stmt
        .query_map(params![start_time, end_time, tags_json], |row| {
            let total_loot: f64 = row.get(2)?;
            let total_cost: f64 = row.get(3)?;
            Ok(json!({
                "creature": row.get::<_, String>(0)?,
                "count": row.get::<_, i64>(1)?,
                "totalLoot": total_loot,
                "totalCost": total_cost,
                "profit": total_loot - total_cost,
                "returnRate": if total_cost > 0.0 { (total_loot / total_cost) * 100.0 } else { 0.0 },
                "totalKills": row.get::<_, i64>(4)?,
                "totalGlobals": row.get::<_, i64>(5)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    let mut creature_analysis = Vec::new();
    for row in creature_rows {
        creature_analysis.push(row.map_err(|e| e.to_string())?);
    }

    let mut skills_location_stmt = conn
        .prepare(
            "SELECT
                COALESCE(NULLIF(TRIM(s.location), ''), 'Unknown') AS location,
                COALESCE(SUM(sg.gain_amount), 0) AS skill_gains
             FROM sessions s
             LEFT JOIN skill_gains sg ON sg.session_uuid = s.uuid
             WHERE (?1 IS NULL OR s.start_time >= ?1)
               AND (?2 IS NULL OR s.start_time <= ?2)
               AND (?3 IS NULL OR ?3 = '[]' OR (SELECT COUNT(*) FROM json_each(?3) WHERE json_each.value NOT IN (SELECT value FROM json_each(s.tags))) = 0)
             GROUP BY location
             HAVING skill_gains > 0
             ORDER BY skill_gains DESC",
        )
        .map_err(|e| e.to_string())?;
    let skills_location_rows = skills_location_stmt
        .query_map(params![start_time, end_time, tags_json], |row| {
            Ok(json!({
                "location": row.get::<_, String>(0)?,
                "skillGains": row.get::<_, f64>(1)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    let mut skills_by_location = Vec::new();
    for row in skills_location_rows {
        skills_by_location.push(row.map_err(|e| e.to_string())?);
    }

    let mut skills_weapon_stmt = conn
        .prepare(
            "SELECT
                COALESCE(NULLIF(TRIM(s.weapon), ''), 'Unknown') AS weapon,
                COALESCE(SUM(sg.gain_amount), 0) AS skill_gains
             FROM sessions s
             LEFT JOIN skill_gains sg ON sg.session_uuid = s.uuid
             WHERE (?1 IS NULL OR s.start_time >= ?1)
               AND (?2 IS NULL OR s.start_time <= ?2)
               AND (?3 IS NULL OR ?3 = '[]' OR (SELECT COUNT(*) FROM json_each(?3) WHERE json_each.value NOT IN (SELECT value FROM json_each(s.tags))) = 0)
             GROUP BY weapon
             HAVING skill_gains > 0
             ORDER BY skill_gains DESC",
        )
        .map_err(|e| e.to_string())?;
    let skills_weapon_rows = skills_weapon_stmt
        .query_map(params![start_time, end_time, tags_json], |row| {
            Ok(json!({
                "weapon": row.get::<_, String>(0)?,
                "skillGains": row.get::<_, f64>(1)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    let mut skills_by_weapon = Vec::new();
    for row in skills_weapon_rows {
        skills_by_weapon.push(row.map_err(|e| e.to_string())?);
    }

    let mut skill_totals_stmt = conn
        .prepare(
            "SELECT s.uuid, COALESCE(SUM(sg.gain_amount), 0) AS total_gain
             FROM sessions s
             LEFT JOIN skill_gains sg ON sg.session_uuid = s.uuid
             WHERE (?1 IS NULL OR s.start_time >= ?1)
               AND (?2 IS NULL OR s.start_time <= ?2)
               AND (?3 IS NULL OR ?3 = '[]' OR (SELECT COUNT(*) FROM json_each(?3) WHERE json_each.value NOT IN (SELECT value FROM json_each(s.tags))) = 0)
             GROUP BY s.uuid",
        )
        .map_err(|e| e.to_string())?;
    let skill_totals_rows = skill_totals_stmt
        .query_map(params![start_time, end_time, tags_json], |row| row.get::<_, f64>(1))
        .map_err(|e| e.to_string())?;
    let mut skill_totals: Vec<f64> = Vec::new();
    for row in skill_totals_rows {
        skill_totals.push(row.map_err(|e| e.to_string())?);
    }
    let total_skill_gains: f64 = skill_totals.iter().sum();
    let skill_mean = if skill_totals.is_empty() {
        0.0
    } else {
        total_skill_gains / skill_totals.len() as f64
    };
    let skill_gain_variance = if skill_totals.len() < 2 {
        0.0
    } else {
        skill_totals
            .iter()
            .map(|v| {
                let d = *v - skill_mean;
                d * d
            })
            .sum::<f64>()
            / skill_totals.len() as f64
    };

    let total_cost: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(s.ammo_cost + s.weapon_decay + s.healing_cost + s.other_costs), 0)
             FROM sessions s
             WHERE (?1 IS NULL OR s.start_time >= ?1)
               AND (?2 IS NULL OR s.start_time <= ?2)
               AND (?3 IS NULL OR ?3 = '[]' OR (SELECT COUNT(*) FROM json_each(?3) WHERE json_each.value NOT IN (SELECT value FROM json_each(s.tags))) = 0)",
            params![start_time, end_time, tags_json],
            |row| row.get(0),
        )
        .unwrap_or(0.0);
    let skill_value_per_cost = if total_cost > 0.0 {
        total_skill_gains / total_cost
    } else {
        0.0
    };

    let mut attribute_map = std::collections::BTreeMap::new();
    for attr in ["Agility", "Health", "Intelligence", "Psyche", "Stamina", "Strength"] {
        attribute_map.insert(attr.to_string(), json!({"gains": 0.0, "count": 0}));
    }
    let mut attributes_stmt = conn
        .prepare(
            "SELECT sg.skill_name, COALESCE(SUM(sg.gain_amount), 0) AS gains, COUNT(*) AS count
             FROM skill_gains sg
             JOIN sessions s ON s.uuid = sg.session_uuid
             WHERE sg.skill_name IN ('Agility','Health','Intelligence','Psyche','Stamina','Strength')
               AND (?1 IS NULL OR s.start_time >= ?1)
               AND (?2 IS NULL OR s.start_time <= ?2)
               AND (?3 IS NULL OR ?3 = '[]' OR (SELECT COUNT(*) FROM json_each(?3) WHERE json_each.value NOT IN (SELECT value FROM json_each(s.tags))) = 0)
             GROUP BY sg.skill_name",
        )
        .map_err(|e| e.to_string())?;
    let attributes_rows = attributes_stmt
        .query_map(params![start_time, end_time, tags_json], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, f64>(1)?,
                row.get::<_, i64>(2)?,
            ))
        })
        .map_err(|e| e.to_string())?;
    for row in attributes_rows {
        let (name, gains, count) = row.map_err(|e| e.to_string())?;
        attribute_map.insert(name, json!({"gains": gains, "count": count}));
    }

    let mut all_skills_stmt = conn
        .prepare(
            "SELECT DISTINCT sg.skill_name
             FROM skill_gains sg
             JOIN sessions s ON s.uuid = sg.session_uuid
             WHERE (?1 IS NULL OR s.start_time >= ?1)
               AND (?2 IS NULL OR s.start_time <= ?2)
             ORDER BY sg.skill_name ASC",
        )
        .map_err(|e| e.to_string())?;
    let all_skills_rows = all_skills_stmt
        .query_map(params![start_time, end_time], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?;
    let mut all_skill_names = Vec::new();
    for row in all_skills_rows {
        all_skill_names.push(row.map_err(|e| e.to_string())?);
    }

    Ok(json!({
        "sessionWinRate": session_win_rate,
        "profitableStreaks": {
            "currentStreak": current_streak,
            "longestStreak": longest_streak
        },
        "temporalInsights": {
            "avgSessionHours": avg_session_hours,
            "bestHourLabel": best_hour_label,
            "bestHourReturnRate": best_hour_return_rate,
            "avgGapHours": avg_gap_hours
        },
        "creatureAnalysis": creature_analysis,
        "skillsByLocation": skills_by_location,
        "skillsByWeapon": skills_by_weapon,
        "lifetimeAttributeGains": attribute_map,
        "allSkillNames": all_skill_names,
        "skillGainVariance": skill_gain_variance,
        "skillValuePerCost": skill_value_per_cost,
        "totalSkillGains": total_skill_gains,
        "projectedLifetimeProfit": projected_lifetime_profit,
        "sessionsToBreakEven": sessions_to_break_even
    }))
}

#[derive(serde::Deserialize)]
pub struct AdvancedCreatureStatsParams {
    creature: String,
}

#[tauri::command]
pub fn db_get_advanced_creature_stats(
    params: AdvancedCreatureStatsParams,
    state: State<'_, DbState>,
) -> Result<JsonValue, String> {
    let conn = state.db.lock().unwrap();
    let creature = params.creature;

    // 1. Overall True Return and Total Kills
    let mut stats_stmt = conn.prepare(
        "WITH creature_sessions AS (
            SELECT
                s.uuid,
                s.start_time,
                (s.ammo_cost + s.weapon_decay + s.healing_cost + s.other_costs) as cost,
                MAX(
                    (
                        CASE
                            WHEN s.end_time IS NOT NULL THEN s.end_time - s.start_time
                            ELSE (strftime('%s','now') * 1000) - s.start_time
                        END
                    ) - (
                        COALESCE(s.total_paused_ms, 0) +
                        CASE
                            WHEN s.status = 'paused' AND s.paused_at IS NOT NULL
                                THEN (strftime('%s','now') * 1000) - s.paused_at
                            ELSE 0
                        END
                    ),
                    0
                ) / (1000.0 * 60.0 * 60.0) AS duration_hours
            FROM sessions s
            WHERE s.creature = ?1
               OR s.name LIKE '%' || ?1 || '%'
               OR EXISTS (SELECT 1 FROM kills k WHERE k.session_uuid = s.uuid AND k.creature_name = ?1)
        ),
        session_loot AS (
            SELECT session_uuid, COALESCE(SUM(total_value), 0) AS loot
            FROM loot_items
            GROUP BY session_uuid
        )
        SELECT 
            cs.uuid, 
            cs.start_time,
            cs.cost, 
            COALESCE(sl.loot, 0) as loot,
            cs.duration_hours
        FROM creature_sessions cs
        LEFT JOIN session_loot sl ON sl.session_uuid = cs.uuid
        ORDER BY cs.start_time ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stats_stmt.query_map(params![creature], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, i64>(1)?,
            row.get::<_, f64>(2)?,
            row.get::<_, f64>(3)?,
            row.get::<_, f64>(4)?,
        ))
    }).map_err(|e| e.to_string())?;

    let mut total_cost = 0.0;
    let mut total_loot = 0.0;
    let mut session_returns = Vec::new(); // Store returns as percentage
    let mut total_duration_hours = 0.0;

    let mut sessions = Vec::new();

    for row in rows {
        let (_uuid, start_time, cost, loot, duration) = row.map_err(|e| e.to_string())?;
        total_cost += cost;
        total_loot += loot;
        total_duration_hours += duration;
        
        if cost > 0.0 {
            let ret = (loot / cost) * 100.0;
            session_returns.push(ret);
            sessions.push((start_time, ret, cost, duration));
        }
    }

    let true_return_percent = if total_cost > 0.0 {
        (total_loot / total_cost) * 100.0
    } else {
        0.0
    };

    // Calculate Volatility (Coefficient of Variation) = StdDev(session returns) / Mean(session returns)
    let n = session_returns.len() as f64;
    let (volatility_cv, variance) = if n > 1.0 {
        let mean = session_returns.iter().sum::<f64>() / n;
        let variance = session_returns.iter().map(|value| {
            let diff = mean - *value;
            diff * diff
        }).sum::<f64>() / (n - 1.0);
        let std_dev = variance.sqrt();
        let cv = if mean > 0.0 { std_dev / mean } else { 0.0 };
        (cv, variance)
    } else {
        (0.0, 0.0)
    };

    // Cycle to Stabilize (Rough estimation using standard error)
    // To be 95% confident (Z=1.96) we are within E=5% of the true mean:
    // N (number of standard sessions needed) = (1.96 * StdDev / E)^2
    let standard_error_target = 5.0; // 5% error margin
    let cycle_to_stabilize = if n > 1.0 && variance > 0.0 {
        let std_dev = variance.sqrt();
        let sessions_needed = ((1.96 * std_dev) / standard_error_target).powi(2);
        let avg_cost_per_session = total_cost / n;
        sessions_needed * avg_cost_per_session
    } else {
        0.0
    };

    // Monthly Deposit (Loss Rate * Extrapolated Playtime)
    // Assume 30 days a month. Estimate playtime based on lifetime total over elapsed days.
    // If we only have little data, this will be highly inaccurate, so we cap/fallback logically.
    let deposit_per_month = if total_cost > total_loot && total_duration_hours > 0.0 {
        let loss_per_hour = (total_cost - total_loot) / total_duration_hours;
        // Let's assume a casual 20 hours a month if we can't extrapolate well, or use their actual rate if we have > 30 days of data.
        let hours_per_month = 20.0; // Hardcoded baseline for now, could be dynamic
        let monthly_loss_ped = loss_per_hour * hours_per_month;
        monthly_loss_ped / 10.0 // USD format (10 PED = $1)
    } else {
        0.0 // Profitable or no data
    };

    // Fatigue Dropoff: Compare first 20% of session durations to last 20% of session durations.
    // We don't have event-level granularity easily here without a massive join, so we analyze long vs short sessions instead.
    let fatigue_dropoff = {
        let mut short_sessions = Vec::new();
        let mut long_sessions = Vec::new();
        
        let avg_duration = if n > 0.0 { total_duration_hours / n } else { 0.0 };
        
        for &(_, ret, _, duration) in &sessions {
            if duration < avg_duration {
                short_sessions.push(ret);
            } else {
                long_sessions.push(ret);
            }
        }

        let short_avg = if !short_sessions.is_empty() { short_sessions.iter().sum::<f64>() / short_sessions.len() as f64 } else { 0.0 };
        let long_avg = if !long_sessions.is_empty() { long_sessions.iter().sum::<f64>() / long_sessions.len() as f64 } else { 0.0 };
        
        short_avg - long_avg // Positive means short sessions are better (fatigue exists). Negative means long sessions are better.
    };

    // Trend Analysis (Last 10 sessions, Last 50 sessions)
    let trend_10 = if sessions.len() >= 10 {
        let last_10: f64 = sessions.iter().rev().take(10).map(|s| s.1).sum();
        last_10 / 10.0
    } else {
        0.0
    };

    let trend_50 = if sessions.len() >= 50 {
        let last_50: f64 = sessions.iter().rev().take(50).map(|s| s.1).sum();
        last_50 / 50.0
    } else {
        0.0
    };

    Ok(json!({
        "creature": creature,
        "trueReturnPercent": true_return_percent,
        "volatilityCv": volatility_cv,
        "cycleToStabilize": cycle_to_stabilize,
        "depositPerMonthUSD": deposit_per_month,
        "fatigueDropoff": fatigue_dropoff,
        "trend10": trend_10,
        "trend50": trend_50,
        "dataPoints": n,
        "totalCost": total_cost,
        "totalLoot": total_loot
    }))
}

#[tauri::command]
pub fn db_get_analytics_factor_data(
    params: AnalyticsStatsRangeParams,
    state: State<'_, DbState>,
) -> Result<JsonValue, String> {
    let conn = state.db.lock().unwrap();
    let start_time = params.start_time;
    let end_time = params.end_time;
    let tags = params.tags;
    let tags_json = tags.as_ref().map(|t| serde_json::to_string(t).unwrap_or("[]".to_string())).unwrap_or("[]".to_string());

    // 1. Maturity Return Stats — GROUP BY creature_name, maturity
    let mut maturity_stmt = conn
        .prepare(
            "SELECT
                COALESCE(NULLIF(TRIM(k.creature_name), ''), 'Unknown') AS creature,
                COALESCE(NULLIF(TRIM(k.maturity), ''), 'Unknown') AS maturity,
                COUNT(*) AS total_kills,
                COALESCE(SUM(k.cost), 0) AS total_cost,
                COALESCE(SUM(k.loot_value), 0) AS total_loot
             FROM kills k
             JOIN sessions s ON s.uuid = k.session_uuid
             WHERE (?1 IS NULL OR s.start_time >= ?1)
               AND (?2 IS NULL OR s.start_time <= ?2)
               AND (?3 IS NULL OR ?3 = '[]' OR (SELECT COUNT(*) FROM json_each(?3) WHERE json_each.value NOT IN (SELECT value FROM json_each(s.tags))) = 0)
             GROUP BY creature, maturity
             HAVING total_kills >= 3
             ORDER BY total_kills DESC
             LIMIT 30",
        )
        .map_err(|e| e.to_string())?;
    let maturity_rows = maturity_stmt
        .query_map(params![start_time, end_time, tags_json], |row| {
            let total_cost: f64 = row.get(3)?;
            let total_loot: f64 = row.get(4)?;
            Ok(json!({
                "creature": row.get::<_, String>(0)?,
                "maturity": row.get::<_, String>(1)?,
                "totalKills": row.get::<_, i64>(2)?,
                "totalCost": total_cost,
                "totalLoot": total_loot,
                "returnRate": if total_cost > 0.0 { (total_loot / total_cost) * 100.0 } else { 0.0 },
                "profit": total_loot - total_cost,
            }))
        })
        .map_err(|e| e.to_string())?;
    let mut maturity_stats = Vec::new();
    for row in maturity_rows {
        maturity_stats.push(row.map_err(|e| e.to_string())?);
    }

    // 2. Hourly Heatmap — GROUP BY day-of-week, hour from session start_time
    //    SQLite: strftime('%w', ...) gives 0=Sunday..6=Saturday (on unix timestamp in seconds).
    //    We normalise start_time which may be in ms.
    let mut heatmap_stmt = conn
        .prepare(
            "WITH session_loot AS (
                SELECT session_uuid, COALESCE(SUM(total_value), 0) AS total_loot
                FROM loot_items
                GROUP BY session_uuid
             )
             SELECT
                CAST(strftime('%w', CASE WHEN s.start_time > 9999999999 THEN s.start_time / 1000 ELSE s.start_time END, 'unixepoch', 'localtime') AS INTEGER) AS day_of_week,
                CAST(strftime('%H', CASE WHEN s.start_time > 9999999999 THEN s.start_time / 1000 ELSE s.start_time END, 'unixepoch', 'localtime') AS INTEGER) AS hour,
                COUNT(*) AS sessions,
                COALESCE(AVG(
                    CASE WHEN (s.ammo_cost + s.weapon_decay + s.healing_cost + s.other_costs) > 0
                         THEN (COALESCE(sl.total_loot, 0) / (s.ammo_cost + s.weapon_decay + s.healing_cost + s.other_costs)) * 100
                         ELSE 0
                    END
                ), 0) AS avg_return_rate,
                COALESCE(AVG(COALESCE(sl.total_loot, 0) - (s.ammo_cost + s.weapon_decay + s.healing_cost + s.other_costs)), 0) AS avg_profit
             FROM sessions s
             LEFT JOIN session_loot sl ON sl.session_uuid = s.uuid
             WHERE s.status = 'completed'
               AND (?1 IS NULL OR s.start_time >= ?1)
               AND (?2 IS NULL OR s.start_time <= ?2)
               AND (?3 IS NULL OR ?3 = '[]' OR (SELECT COUNT(*) FROM json_each(?3) WHERE json_each.value NOT IN (SELECT value FROM json_each(s.tags))) = 0)
             GROUP BY day_of_week, hour
             ORDER BY day_of_week, hour",
        )
        .map_err(|e| e.to_string())?;
    let heatmap_rows = heatmap_stmt
        .query_map(params![start_time, end_time, tags_json], |row| {
            Ok(json!({
                "dayOfWeek": row.get::<_, i64>(0)?,
                "hour": row.get::<_, i64>(1)?,
                "sessions": row.get::<_, i64>(2)?,
                "avgReturnRate": row.get::<_, f64>(3)?,
                "avgProfit": row.get::<_, f64>(4)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    let mut hourly_heatmap = Vec::new();
    for row in heatmap_rows {
        hourly_heatmap.push(row.map_err(|e| e.to_string())?);
    }

    // 3. Kill Efficiency — GROUP BY creature_name
    let mut efficiency_stmt = conn
        .prepare(
            "SELECT
                COALESCE(NULLIF(TRIM(k.creature_name), ''), 'Unknown') AS creature,
                COUNT(*) AS total_kills,
                COALESCE(SUM(k.cost), 0) AS total_cost,
                COALESCE(SUM(k.loot_value), 0) AS total_loot,
                COALESCE(AVG(k.cost), 0) AS avg_cost_per_kill,
                COALESCE(AVG(k.loot_value), 0) AS avg_loot_per_kill
             FROM kills k
             JOIN sessions s ON s.uuid = k.session_uuid
             WHERE (?1 IS NULL OR s.start_time >= ?1)
               AND (?2 IS NULL OR s.start_time <= ?2)
               AND (?3 IS NULL OR ?3 = '[]' OR (SELECT COUNT(*) FROM json_each(?3) WHERE json_each.value NOT IN (SELECT value FROM json_each(s.tags))) = 0)
             GROUP BY creature
             HAVING total_kills >= 3
             ORDER BY total_kills DESC
             LIMIT 50",
        )
        .map_err(|e| e.to_string())?;
    let efficiency_rows = efficiency_stmt
        .query_map(params![start_time, end_time, tags_json], |row| {
            let total_cost: f64 = row.get(2)?;
            let total_loot: f64 = row.get(3)?;
            Ok(json!({
                "creature": row.get::<_, String>(0)?,
                "totalKills": row.get::<_, i64>(1)?,
                "totalCost": total_cost,
                "totalLoot": total_loot,
                "avgCostPerKill": row.get::<_, f64>(4)?,
                "avgLootPerKill": row.get::<_, f64>(5)?,
                "returnRate": if total_cost > 0.0 { (total_loot / total_cost) * 100.0 } else { 0.0 },
            }))
        })
        .map_err(|e| e.to_string())?;
    let mut kill_efficiency = Vec::new();
    for row in efficiency_rows {
        kill_efficiency.push(row.map_err(|e| e.to_string())?);
    }

    Ok(json!({
        "maturityStats": maturity_stats,
        "hourlyHeatmap": hourly_heatmap,
        "killEfficiency": kill_efficiency
    }))
}
