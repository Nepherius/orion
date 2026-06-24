use crate::db_commands::DbState;
use serde_json::{json, Value as JsonValue};
use tauri::State;

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
        .map_err(|e| e.to_string())?;

    // Get total loot across all loot_items
    let total_loot: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(total_value), 0) FROM loot_items",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

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
