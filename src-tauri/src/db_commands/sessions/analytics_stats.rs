use super::types::AnalyticsStatsRangeParams;
use crate::db_commands::DbState;
use rusqlite::params;
use serde_json::{json, Value as JsonValue};
use tauri::State;

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
    let tags_json = match tags.as_ref() {
        Some(t) => serde_json::to_string(t).map_err(|e| e.to_string())?,
        None => "[]".to_string(),
    };
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
        .map_err(|e| e.to_string())?;

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
        .map_err(|e| e.to_string())?;

    // Get total loot accounting for sessions in range.
    let (total_tt_loot, total_adjusted_loot, total_markup_gain, total_fixed_gain): (
        f64,
        f64,
        f64,
        f64,
    ) = conn
        .query_row(
            "SELECT
                COALESCE(SUM(li.value * li.quantity), 0),
                COALESCE(SUM(li.total_value), 0),
                COALESCE(SUM(CASE
                    WHEN li.fixed_value IS NOT NULL AND li.fixed_value > 0 THEN 0
                    ELSE li.total_value - (li.value * li.quantity)
                END), 0),
                COALESCE(SUM(CASE
                    WHEN li.fixed_value IS NOT NULL AND li.fixed_value > 0 THEN li.fixed_value * li.quantity
                    ELSE 0
                END), 0)
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
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .map_err(|e| e.to_string())?;

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
        .query_row(params![start_time, end_time, tags_json], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })
        .map_err(|e| e.to_string())?;

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
        .map_err(|e| e.to_string())?;

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
        .map_err(|e| e.to_string())?;

    Ok(json!({
        "totalLoot": total_adjusted_loot,
        "totalTtLoot": total_tt_loot,
        "totalAdjustedLoot": total_adjusted_loot,
        "totalMarkupGain": total_markup_gain,
        "totalFixedGain": total_fixed_gain,
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
