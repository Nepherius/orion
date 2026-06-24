use super::types::AnalyticsStatsRangeParams;
use crate::db_commands::DbState;
use rusqlite::params;
use serde_json::{json, Value as JsonValue};
use tauri::State;

#[tauri::command]
pub fn db_get_analytics_factor_data(
    params: AnalyticsStatsRangeParams,
    state: State<'_, DbState>,
) -> Result<JsonValue, String> {
    let conn = state.db.lock().unwrap();
    let start_time = params.start_time;
    let end_time = params.end_time;
    let tags = params.tags;
    let tags_json = match tags.as_ref() {
        Some(t) => serde_json::to_string(t).map_err(|e| e.to_string())?,
        None => "[]".to_string(),
    };

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
