use super::types::AnalyticsStatsRangeParams;
use crate::db_commands::DbState;
use rusqlite::{params, Connection};
use serde_json::{json, Value as JsonValue};
use tauri::State;

fn query_all_skill_names(
    conn: &Connection,
    start_time: Option<i64>,
    end_time: Option<i64>,
    tags_json: &str,
) -> Result<Vec<String>, String> {
    let mut all_skills_stmt = conn
        .prepare(
            "SELECT DISTINCT sg.skill_name
             FROM skill_gains sg
             JOIN sessions s ON s.uuid = sg.session_uuid
             WHERE (?1 IS NULL OR s.start_time >= ?1)
               AND (?2 IS NULL OR s.start_time <= ?2)
               AND (?3 IS NULL OR ?3 = '[]' OR (SELECT COUNT(*) FROM json_each(?3) WHERE json_each.value NOT IN (SELECT value FROM json_each(s.tags))) = 0)
             ORDER BY sg.skill_name ASC",
        )
        .map_err(|e| e.to_string())?;
    let all_skills_rows = all_skills_stmt
        .query_map(params![start_time, end_time, tags_json], |row| {
            row.get::<_, String>(0)
        })
        .map_err(|e| e.to_string())?;
    let mut all_skill_names = Vec::new();
    for row in all_skills_rows {
        all_skill_names.push(row.map_err(|e| e.to_string())?);
    }
    Ok(all_skill_names)
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
    let tags_json = match tags.as_ref() {
        Some(t) => serde_json::to_string(t).map_err(|e| e.to_string())?,
        None => "[]".to_string(),
    };
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
             WHERE s.status = 'completed'
               AND (?1 IS NULL OR s.start_time >= ?1)
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
    let mut returns_by_hour: std::collections::BTreeMap<i64, (i64, f64)> =
        std::collections::BTreeMap::new();
    let mut chronological_start_times: Vec<i64> = Vec::new();
    for row in sessions_rows {
        let (uuid, start, loot, cost, duration_ms) = row.map_err(|e| e.to_string())?;
        let profit = loot - cost;
        let ret = if cost > 0.0 {
            (loot / cost) * 100.0
        } else {
            0.0
        };
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

    let profitable_count = session_profits_desc
        .iter()
        .filter(|(_, p)| *p >= 0.0)
        .count() as f64;
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
        .query_map(params![start_time, end_time, tags_json], |row| {
            row.get::<_, f64>(1)
        })
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
    for attr in [
        "Agility",
        "Health",
        "Intelligence",
        "Psyche",
        "Stamina",
        "Strength",
    ] {
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

    let all_skill_names = query_all_skill_names(&conn, start_time, end_time, &tags_json)?;

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

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_conn() -> Connection {
        let conn = Connection::open_in_memory().expect("in-memory db");
        conn.execute_batch(
            "CREATE TABLE sessions (
                uuid TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                weapon TEXT,
                armor TEXT,
                location TEXT,
                creature TEXT,
                notes TEXT,
                start_time INTEGER NOT NULL,
                end_time INTEGER,
                status TEXT NOT NULL,
                paused_at INTEGER,
                total_paused_ms INTEGER DEFAULT 0,
                loadout_id TEXT,
                ammo_cost REAL DEFAULT 0,
                weapon_decay REAL DEFAULT 0,
                healing_cost REAL DEFAULT 0,
                other_costs REAL DEFAULT 0,
                tags TEXT
            );
            CREATE TABLE skill_gains (
                uuid TEXT PRIMARY KEY,
                session_uuid TEXT NOT NULL,
                skill_name TEXT NOT NULL,
                gain_amount REAL NOT NULL,
                timestamp INTEGER NOT NULL
            );",
        )
        .expect("schema");
        conn
    }

    #[test]
    fn all_skill_names_respects_tags_and_time_range() {
        let conn = setup_conn();
        conn.execute(
            "INSERT INTO sessions (uuid, name, start_time, status, tags)
             VALUES (?1, ?2, ?3, 'completed', ?4)",
            params!["tagged", "Tagged", 1000_i64, "[\"team\"]"],
        )
        .expect("insert tagged session");
        conn.execute(
            "INSERT INTO sessions (uuid, name, start_time, status, tags)
             VALUES (?1, ?2, ?3, 'completed', ?4)",
            params!["untagged", "Untagged", 2000_i64, "[]"],
        )
        .expect("insert untagged session");
        conn.execute(
            "INSERT INTO skill_gains (uuid, session_uuid, skill_name, gain_amount, timestamp)
             VALUES (?1, ?2, ?3, 1.0, 1000)",
            params!["skill-1", "tagged", "Rifle"],
        )
        .expect("insert tagged skill");
        conn.execute(
            "INSERT INTO skill_gains (uuid, session_uuid, skill_name, gain_amount, timestamp)
             VALUES (?1, ?2, ?3, 1.0, 2000)",
            params!["skill-2", "untagged", "Pistol"],
        )
        .expect("insert untagged skill");

        let tagged = query_all_skill_names(&conn, None, None, "[\"team\"]").expect("tagged query");
        assert_eq!(tagged, vec!["Rifle"]);

        let ranged = query_all_skill_names(&conn, Some(1500), None, "[]").expect("range query");
        assert_eq!(ranged, vec!["Pistol"]);
    }
}
