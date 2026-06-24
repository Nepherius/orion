use super::types::AnalyticsStatsRangeParams;
use crate::db_commands::DbState;
use rusqlite::params;
use serde_json::{json, Value as JsonValue};
use tauri::State;

#[tauri::command]
pub fn db_get_loot_theory_data(
    params: AnalyticsStatsRangeParams,
    state: State<'_, DbState>,
) -> Result<JsonValue, String> {
    let conn = state.db.lock().unwrap();
    let start_time = params.start_time;
    let end_time = params.end_time;
    let tags_json = match params.tags.as_ref() {
        Some(tags) => serde_json::to_string(tags).map_err(|e| e.to_string())?,
        None => "[]".to_string(),
    };

    let coverage: (i64, i64, i64, i64, i64, i64, i64, i64) = conn
        .query_row(
            "WITH filtered_sessions AS (
                SELECT
                    s.uuid,
                    (s.ammo_cost + s.weapon_decay + s.healing_cost + s.other_costs) AS session_cost
                FROM sessions s
                WHERE s.status = 'completed'
                  AND (?1 IS NULL OR s.start_time >= ?1)
                  AND (?2 IS NULL OR s.start_time <= ?2)
                  AND (?3 IS NULL OR ?3 = '[]' OR (
                    SELECT COUNT(*) FROM json_each(?3)
                    WHERE json_each.value NOT IN (SELECT value FROM json_each(s.tags))
                  ) = 0)
            ),
            kill_stats AS (
                SELECT
                    k.session_uuid,
                    COUNT(*) AS total_kills,
                    COALESCE(SUM(k.cost), 0) AS total_kill_cost
                FROM kills k
                JOIN filtered_sessions fs ON fs.uuid = k.session_uuid
                GROUP BY k.session_uuid
            ),
            loot_stats AS (
                SELECT
                    li.session_uuid,
                    COUNT(*) AS total_loot_rows,
                    COALESCE(SUM(CASE WHEN li.kill_uuid IS NOT NULL AND k.uuid IS NOT NULL THEN 1 ELSE 0 END), 0)
                        AS linked_loot_rows,
                    COUNT(DISTINCT CASE WHEN li.kill_uuid IS NOT NULL AND k.uuid IS NOT NULL THEN li.kill_uuid END)
                        AS kills_with_links
                FROM loot_items li
                JOIN filtered_sessions fs ON fs.uuid = li.session_uuid
                LEFT JOIN kills k ON k.uuid = li.kill_uuid
                GROUP BY li.session_uuid
            ),
            classified AS (
                SELECT
                    fs.uuid,
                    fs.session_cost,
                    COALESCE(ks.total_kills, 0) AS total_kills,
                    COALESCE(ks.total_kill_cost, 0) AS total_kill_cost,
                    COALESCE(ls.total_loot_rows, 0) AS total_loot_rows,
                    COALESCE(ls.linked_loot_rows, 0) AS linked_loot_rows,
                    COALESCE(ls.kills_with_links, 0) AS kills_with_links
                FROM filtered_sessions fs
                LEFT JOIN kill_stats ks ON ks.session_uuid = fs.uuid
                LEFT JOIN loot_stats ls ON ls.session_uuid = fs.uuid
            )
            SELECT
                COUNT(*) AS completed_sessions,
                COALESCE(SUM(total_kills), 0) AS total_kills,
                COALESCE(SUM(kills_with_links), 0) AS kills_with_links,
                COALESCE(SUM(total_loot_rows), 0) AS total_loot_rows,
                COALESCE(SUM(linked_loot_rows), 0) AS linked_loot_rows,
                COALESCE(SUM(CASE
                    WHEN total_kills > 0
                     AND total_loot_rows > 0
                     AND total_loot_rows = linked_loot_rows
                     AND total_kill_cost > 0
                     AND session_cost > 0
                    THEN 1 ELSE 0 END), 0) AS usable_sessions,
                COALESCE(SUM(CASE
                    WHEN total_kills > 0
                     AND total_loot_rows > 0
                     AND total_loot_rows != linked_loot_rows
                    THEN 1 ELSE 0 END), 0) AS incomplete_link_sessions,
                COALESCE(SUM(CASE
                    WHEN total_kills > 0
                     AND total_kill_cost > 0
                     AND session_cost > 0
                     AND ABS(total_kill_cost - session_cost) / session_cost > 0.05
                    THEN 1 ELSE 0 END), 0) AS cost_drift_sessions
            FROM classified",
            params![start_time, end_time, tags_json],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                    row.get(6)?,
                    row.get(7)?,
                ))
            },
        )
        .map_err(|e| e.to_string())?;

    let mut session_stmt = conn
        .prepare(
            "WITH session_loot AS (
                SELECT
                    session_uuid,
                    COALESCE(SUM(value * quantity), 0) AS tt_loot,
                    COALESCE(SUM(total_value), 0) AS adjusted_loot,
                    COALESCE(SUM(CASE
                        WHEN LOWER(TRIM(name)) LIKE '%shrapnel%' THEN value * quantity ELSE 0 END
                    ), 0) AS shrapnel_tt
                FROM loot_items
                GROUP BY session_uuid
            )
            SELECT
                s.uuid,
                s.start_time,
                COALESCE(NULLIF(TRIM(s.creature), ''), 'Unknown') AS creature,
                (s.ammo_cost + s.weapon_decay + s.healing_cost + s.other_costs) AS total_cost,
                COALESCE(sl.tt_loot, 0) AS tt_loot,
                COALESCE(sl.adjusted_loot, 0) AS adjusted_loot,
                COALESCE(sl.shrapnel_tt, 0) AS shrapnel_tt,
                s.weapon_efficiency_snapshot,
                s.dpp_snapshot,
                s.loadout_name_snapshot
            FROM sessions s
            LEFT JOIN session_loot sl ON sl.session_uuid = s.uuid
            WHERE s.status = 'completed'
              AND (?1 IS NULL OR s.start_time >= ?1)
              AND (?2 IS NULL OR s.start_time <= ?2)
              AND (?3 IS NULL OR ?3 = '[]' OR (
                SELECT COUNT(*) FROM json_each(?3)
                WHERE json_each.value NOT IN (SELECT value FROM json_each(s.tags))
              ) = 0)
            ORDER BY s.start_time ASC",
        )
        .map_err(|e| e.to_string())?;
    let session_rows = session_stmt
        .query_map(params![start_time, end_time, tags_json], |row| {
            Ok(json!({
                "sessionId": row.get::<_, String>(0)?,
                "startTime": row.get::<_, i64>(1)?,
                "creature": row.get::<_, String>(2)?,
                "totalCost": row.get::<_, f64>(3)?,
                "ttLoot": row.get::<_, f64>(4)?,
                "adjustedLoot": row.get::<_, f64>(5)?,
                "shrapnelTt": row.get::<_, f64>(6)?,
                "efficiency": row.get::<_, Option<f64>>(7)?,
                "dpp": row.get::<_, Option<f64>>(8)?,
                "loadoutName": row.get::<_, Option<String>>(9)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    let mut session_returns = Vec::new();
    for row in session_rows {
        session_returns.push(row.map_err(|e| e.to_string())?);
    }

    let mut event_stmt = conn
        .prepare(
            "WITH filtered_sessions AS (
                SELECT
                    s.uuid,
                    (s.ammo_cost + s.weapon_decay + s.healing_cost + s.other_costs) AS session_cost
                FROM sessions s
                WHERE s.status = 'completed'
                  AND (?1 IS NULL OR s.start_time >= ?1)
                  AND (?2 IS NULL OR s.start_time <= ?2)
                  AND (?3 IS NULL OR ?3 = '[]' OR (
                    SELECT COUNT(*) FROM json_each(?3)
                    WHERE json_each.value NOT IN (SELECT value FROM json_each(s.tags))
                  ) = 0)
            ),
            kill_stats AS (
                SELECT
                    k.session_uuid,
                    COUNT(*) AS total_kills,
                    COALESCE(SUM(k.cost), 0) AS total_kill_cost
                FROM kills k
                JOIN filtered_sessions fs ON fs.uuid = k.session_uuid
                GROUP BY k.session_uuid
            ),
            loot_stats AS (
                SELECT
                    li.session_uuid,
                    COUNT(*) AS total_loot_rows,
                    COALESCE(SUM(CASE WHEN li.kill_uuid IS NOT NULL AND k.uuid IS NOT NULL THEN 1 ELSE 0 END), 0)
                        AS linked_loot_rows
                FROM loot_items li
                JOIN filtered_sessions fs ON fs.uuid = li.session_uuid
                LEFT JOIN kills k ON k.uuid = li.kill_uuid
                GROUP BY li.session_uuid
            ),
            usable_sessions AS (
                SELECT
                    fs.uuid,
                    fs.session_cost,
                    ks.total_kill_cost
                FROM filtered_sessions fs
                JOIN kill_stats ks ON ks.session_uuid = fs.uuid
                JOIN loot_stats ls ON ls.session_uuid = fs.uuid
                WHERE ks.total_kills > 0
                  AND ks.total_kill_cost > 0
                  AND fs.session_cost > 0
                  AND ls.total_loot_rows > 0
                  AND ls.total_loot_rows = ls.linked_loot_rows
            ),
            kill_loot AS (
                SELECT
                    k.uuid,
                    k.session_uuid,
                    k.timestamp,
                    COALESCE(NULLIF(TRIM(k.creature_name), ''), 'Unknown') AS creature,
                    COALESCE(NULLIF(TRIM(k.maturity), ''), 'Unknown') AS maturity,
                    k.cost,
                    COALESCE(SUM(li.value * li.quantity), 0) AS tt_loot,
                    COALESCE(SUM(li.total_value), 0) AS adjusted_loot,
                    COUNT(li.uuid) AS item_rows
                FROM kills k
                JOIN usable_sessions us ON us.uuid = k.session_uuid
                LEFT JOIN loot_items li ON li.kill_uuid = k.uuid
                GROUP BY
                    k.uuid, k.session_uuid, k.timestamp, k.creature_name, k.maturity, k.cost
            )
            SELECT
                kl.uuid,
                kl.session_uuid,
                kl.timestamp,
                kl.creature,
                kl.maturity,
                kl.cost * us.session_cost / us.total_kill_cost AS normalized_cost,
                kl.tt_loot,
                kl.adjusted_loot,
                kl.item_rows
            FROM kill_loot kl
            JOIN usable_sessions us ON us.uuid = kl.session_uuid
            ORDER BY kl.timestamp ASC",
        )
        .map_err(|e| e.to_string())?;
    let event_rows = event_stmt
        .query_map(params![start_time, end_time, tags_json], |row| {
            Ok(json!({
                "killId": row.get::<_, String>(0)?,
                "sessionId": row.get::<_, String>(1)?,
                "timestamp": row.get::<_, i64>(2)?,
                "creature": row.get::<_, String>(3)?,
                "maturity": row.get::<_, String>(4)?,
                "cost": row.get::<_, f64>(5)?,
                "ttLoot": row.get::<_, f64>(6)?,
                "adjustedLoot": row.get::<_, f64>(7)?,
                "itemRows": row.get::<_, i64>(8)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    let mut kill_events = Vec::new();
    for row in event_rows {
        kill_events.push(row.map_err(|e| e.to_string())?);
    }

    Ok(json!({
        "linkCoverage": {
            "completedSessions": coverage.0,
            "totalKills": coverage.1,
            "killsWithLootLinks": coverage.2,
            "totalLootRows": coverage.3,
            "linkedLootRows": coverage.4,
            "usableSessions": coverage.5,
            "incompleteLinkSessions": coverage.6,
            "costDriftSessions": coverage.7
        },
        "sessionReturns": session_returns,
        "killEvents": kill_events
    }))
}
