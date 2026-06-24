use super::types::AnalyticsStatsRangeParams;
use crate::db_commands::DbState;
use rusqlite::params;
use serde_json::{json, Value as JsonValue};
use tauri::State;

#[tauri::command]
pub fn db_get_analytics_performance_data(
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
        .map_err(|e| e.to_string())?;
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
        .map_err(|e| e.to_string())?;

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
        .map_err(|e| e.to_string())?;

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
        .map_err(|e| e.to_string())?;

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
        .map_err(|e| e.to_string())?;

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
        .map_err(|e| e.to_string())?;

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
             SELECT COALESCE(AVG(sd.duration_min / sl.loot_count), 0)
             FROM session_duration_min sd
             JOIN session_loot sl ON sl.session_uuid = sd.session_uuid
             WHERE sl.loot_count > 0",
            params![start_time, end_time, tags_json],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

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
        .map_err(|e| e.to_string())?;

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
