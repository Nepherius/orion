use crate::db_commands::DbState;
use rusqlite::params;
use serde_json::{json, Value as JsonValue};
use tauri::State;

#[derive(serde::Deserialize)]
pub struct AdvancedCreatureStatsParams {
    creature: String,
}

fn bankroll_runs_to_threshold(
    return_percent: f64,
    starting_bankroll: f64,
    threshold: f64,
) -> Option<u64> {
    if !return_percent.is_finite()
        || !starting_bankroll.is_finite()
        || !threshold.is_finite()
        || starting_bankroll <= 0.0
        || threshold < 0.0
    {
        return None;
    }
    if starting_bankroll <= threshold {
        return Some(0);
    }

    let multiplier = return_percent / 100.0;
    if multiplier >= 1.0 {
        return None;
    }
    if multiplier <= 0.0 {
        return Some(1);
    }

    let runs = (threshold / starting_bankroll).ln() / multiplier.ln();
    Some(runs.ceil().max(0.0) as u64)
}

#[derive(Debug)]
struct EventVolumeAnalysis {
    available: bool,
    sessions_analyzed: usize,
    low_average_events: f64,
    high_average_events: f64,
    low_return_percent: f64,
    high_return_percent: f64,
    difference_percent_points: f64,
}

#[derive(Debug, PartialEq)]
enum CreatureSessionAllocation {
    FullSession,
    LinkedMixed,
    ExcludedMixed,
}

fn classify_creature_session_allocation(
    is_selected_session: bool,
    total_kills: i64,
    selected_kills: i64,
    total_loot_rows: i64,
    linked_loot_rows: i64,
    total_kill_cost: f64,
) -> CreatureSessionAllocation {
    if (selected_kills > 0 && selected_kills == total_kills)
        || (total_kills == 0 && is_selected_session)
    {
        return CreatureSessionAllocation::FullSession;
    }

    if selected_kills > 0
        && total_kills > selected_kills
        && total_loot_rows == linked_loot_rows
        && total_kill_cost > 0.0
    {
        return CreatureSessionAllocation::LinkedMixed;
    }

    CreatureSessionAllocation::ExcludedMixed
}

fn calculate_event_volume_analysis(event_returns: &[(i64, f64)]) -> EventVolumeAnalysis {
    let mut sorted = event_returns.to_vec();
    sorted.sort_by_key(|(events, _)| *events);

    let unavailable = || EventVolumeAnalysis {
        available: false,
        sessions_analyzed: sorted.len(),
        low_average_events: 0.0,
        high_average_events: 0.0,
        low_return_percent: 0.0,
        high_return_percent: 0.0,
        difference_percent_points: 0.0,
    };

    let has_event_count_variation = match (sorted.first(), sorted.last()) {
        (Some(first), Some(last)) => first.0 != last.0,
        _ => false,
    };
    if sorted.len() < 4 || !has_event_count_variation {
        return unavailable();
    }

    let half = sorted.len() / 2;
    let low = &sorted[..half];
    let high = &sorted[sorted.len() - half..];
    let average_events = |values: &[(i64, f64)]| {
        values.iter().map(|value| value.0 as f64).sum::<f64>() / half as f64
    };
    let average_return =
        |values: &[(i64, f64)]| values.iter().map(|value| value.1).sum::<f64>() / half as f64;

    let low_average_events = average_events(low);
    let high_average_events = average_events(high);
    let low_return_percent = average_return(low);
    let high_return_percent = average_return(high);

    EventVolumeAnalysis {
        available: true,
        sessions_analyzed: low.len() + high.len(),
        low_average_events,
        high_average_events,
        low_return_percent,
        high_return_percent,
        difference_percent_points: low_return_percent - high_return_percent,
    }
}

#[tauri::command]
pub fn db_get_advanced_creature_stats(
    params: AdvancedCreatureStatsParams,
    state: State<'_, DbState>,
) -> Result<JsonValue, String> {
    let conn = state.db.lock().unwrap();
    let creature = params.creature;

    // Session totals remain authoritative. Complete loot-to-kill links allocate mixed-creature
    // sessions; single-creature and legacy sessions safely use their full session totals.
    let mut stats_stmt = conn.prepare(
        "WITH kill_stats AS (
            SELECT
                session_uuid,
                COUNT(*) AS total_kills,
                COALESCE(SUM(cost), 0) AS total_kill_cost,
                COALESCE(SUM(CASE WHEN creature_name = ?1 THEN 1 ELSE 0 END), 0) AS selected_kills,
                COALESCE(SUM(CASE WHEN creature_name = ?1 THEN cost ELSE 0 END), 0) AS selected_kill_cost
            FROM kills
            GROUP BY session_uuid
        ),
        session_loot AS (
            SELECT
                li.session_uuid,
                COUNT(*) AS total_loot_rows,
                COALESCE(SUM(li.value * li.quantity), 0) AS tt_loot,
                COALESCE(SUM(li.total_value), 0) AS adjusted_loot,
                COALESCE(SUM(CASE WHEN k.uuid IS NOT NULL THEN 1 ELSE 0 END), 0) AS linked_loot_rows,
                COALESCE(SUM(
                    CASE WHEN k.creature_name = ?1 THEN li.value * li.quantity ELSE 0 END
                ), 0) AS selected_tt_loot,
                COALESCE(SUM(
                    CASE WHEN k.creature_name = ?1 THEN li.total_value ELSE 0 END
                ), 0) AS selected_adjusted_loot
            FROM loot_items li
            LEFT JOIN kills k ON k.uuid = li.kill_uuid
            GROUP BY li.session_uuid
        ),
        creature_sessions AS (
            SELECT
                s.uuid,
                s.start_time,
                CASE WHEN s.creature = ?1 OR s.name LIKE '%' || ?1 || '%' THEN 1 ELSE 0 END
                    AS is_selected_session,
                (s.ammo_cost + s.weapon_decay + s.healing_cost + s.other_costs) AS cost,
                COALESCE(sl.tt_loot, 0) AS tt_loot,
                COALESCE(sl.adjusted_loot, 0) AS adjusted_loot,
                COALESCE(ks.total_kills, 0) AS total_kills,
                COALESCE(ks.total_kill_cost, 0) AS total_kill_cost,
                COALESCE(ks.selected_kills, 0) AS selected_kills,
                COALESCE(ks.selected_kill_cost, 0) AS selected_kill_cost,
                COALESCE(sl.total_loot_rows, 0) AS total_loot_rows,
                COALESCE(sl.linked_loot_rows, 0) AS linked_loot_rows,
                COALESCE(sl.selected_tt_loot, 0) AS selected_tt_loot,
                COALESCE(sl.selected_adjusted_loot, 0) AS selected_adjusted_loot,
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
            LEFT JOIN kill_stats ks ON ks.session_uuid = s.uuid
            LEFT JOIN session_loot sl ON sl.session_uuid = s.uuid
            WHERE s.status = 'completed'
              AND (
                s.creature = ?1
               OR s.name LIKE '%' || ?1 || '%'
               OR COALESCE(ks.selected_kills, 0) > 0
              )
        )
        SELECT 
            cs.uuid, 
            cs.start_time,
            cs.is_selected_session,
            cs.cost, 
            cs.tt_loot,
            cs.adjusted_loot,
            cs.duration_hours,
            cs.total_kills,
            cs.total_kill_cost,
            cs.selected_kills,
            cs.selected_kill_cost,
            cs.total_loot_rows,
            cs.linked_loot_rows,
            cs.selected_tt_loot,
            cs.selected_adjusted_loot
        FROM creature_sessions cs
        ORDER BY cs.start_time ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stats_stmt
        .query_map(params![creature], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, i64>(2)? != 0,
                row.get::<_, f64>(3)?,
                row.get::<_, f64>(4)?,
                row.get::<_, f64>(5)?,
                row.get::<_, f64>(6)?,
                row.get::<_, i64>(7)?,
                row.get::<_, f64>(8)?,
                row.get::<_, i64>(9)?,
                row.get::<_, f64>(10)?,
                row.get::<_, i64>(11)?,
                row.get::<_, i64>(12)?,
                row.get::<_, f64>(13)?,
                row.get::<_, f64>(14)?,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut total_cost = 0.0;
    let mut total_tt_loot = 0.0;
    let mut total_adjusted_loot = 0.0;
    let mut session_returns = Vec::new();
    let mut total_duration_hours = 0.0;
    let mut linked_mixed_sessions = 0;
    let mut full_session_fallbacks = 0;
    let mut excluded_mixed_sessions = 0;

    let mut sessions = Vec::new();

    for row in rows {
        let (
            _uuid,
            start_time,
            is_selected_session,
            session_cost,
            session_tt_loot,
            session_adjusted_loot,
            session_duration,
            total_kills,
            total_kill_cost,
            selected_kills,
            selected_kill_cost,
            total_loot_rows,
            linked_loot_rows,
            selected_tt_loot,
            selected_adjusted_loot,
        ) = row.map_err(|e| e.to_string())?;

        let allocation = classify_creature_session_allocation(
            is_selected_session,
            total_kills,
            selected_kills,
            total_loot_rows,
            linked_loot_rows,
            total_kill_cost,
        );

        let allocated = match allocation {
            CreatureSessionAllocation::FullSession => {
                full_session_fallbacks += 1;
                Some((
                    session_cost,
                    session_tt_loot,
                    session_adjusted_loot,
                    session_duration,
                ))
            }
            CreatureSessionAllocation::LinkedMixed => {
                linked_mixed_sessions += 1;
                let cost_share = (selected_kill_cost / total_kill_cost).clamp(0.0, 1.0);
                Some((
                    session_cost * cost_share,
                    selected_tt_loot,
                    selected_adjusted_loot,
                    session_duration * cost_share,
                ))
            }
            CreatureSessionAllocation::ExcludedMixed => {
                excluded_mixed_sessions += 1;
                None
            }
        };

        let Some((cost, tt_loot, adjusted_loot, duration)) = allocated else {
            continue;
        };

        total_cost += cost;
        total_tt_loot += tt_loot;
        total_adjusted_loot += adjusted_loot;
        total_duration_hours += duration;

        if cost > 0.0 {
            let tt_return = (tt_loot / cost) * 100.0;
            session_returns.push(tt_return);
            sessions.push((start_time, tt_return, selected_kills));
        }
    }

    let true_return_percent = if total_cost > 0.0 {
        (total_tt_loot / total_cost) * 100.0
    } else {
        0.0
    };
    let return_with_markup_percent = if total_cost > 0.0 {
        (total_adjusted_loot / total_cost) * 100.0
    } else {
        0.0
    };
    let effective_markup_percent = if total_tt_loot > 0.0 {
        (total_adjusted_loot / total_tt_loot) * 100.0
    } else {
        0.0
    };

    // Calculate Volatility (Coefficient of Variation) = StdDev(session returns) / Mean(session returns)
    let n = session_returns.len() as f64;
    let (volatility_cv, variance) = if n > 1.0 {
        let mean = session_returns.iter().sum::<f64>() / n;
        let variance = session_returns
            .iter()
            .map(|value| {
                let diff = mean - *value;
                diff * diff
            })
            .sum::<f64>()
            / (n - 1.0);
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
    let deposit_per_month = if total_cost > total_adjusted_loot && total_duration_hours > 0.0 {
        let loss_per_hour = (total_cost - total_adjusted_loot) / total_duration_hours;
        // Let's assume a casual 20 hours a month if we can't extrapolate well, or use their actual rate if we have > 30 days of data.
        let hours_per_month = 20.0; // Hardcoded baseline for now, could be dynamic
        let monthly_loss_ped = loss_per_hour * hours_per_month;
        monthly_loss_ped / 10.0 // USD format (10 PED = $1)
    } else {
        0.0 // Profitable or no data
    };

    let event_returns = sessions
        .iter()
        .filter(|session| session.2 > 0)
        .map(|session| (session.2, session.1))
        .collect::<Vec<_>>();
    let event_volume_analysis = calculate_event_volume_analysis(&event_returns);

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

    let bankroll_runs_at_tt = bankroll_runs_to_threshold(true_return_percent, 1000.0, 100.0);
    let bankroll_runs_with_markup =
        bankroll_runs_to_threshold(return_with_markup_percent, 1000.0, 100.0);

    Ok(json!({
        "creature": creature,
        "trueReturnPercent": true_return_percent,
        "returnWithMarkupPercent": return_with_markup_percent,
        "effectiveMarkupPercent": effective_markup_percent,
        "volatilityCv": volatility_cv,
        "cycleToStabilize": cycle_to_stabilize,
        "depositPerMonthUSD": deposit_per_month,
        "bankrollRunsAtTt": bankroll_runs_at_tt,
        "bankrollRunsWithMarkup": bankroll_runs_with_markup,
        "eventVolumeAnalysis": {
            "available": event_volume_analysis.available,
            "sessionsAnalyzed": event_volume_analysis.sessions_analyzed,
            "lowAverageEvents": event_volume_analysis.low_average_events,
            "highAverageEvents": event_volume_analysis.high_average_events,
            "lowReturnPercent": event_volume_analysis.low_return_percent,
            "highReturnPercent": event_volume_analysis.high_return_percent,
            "differencePercentPoints": event_volume_analysis.difference_percent_points
        },
        "allocationCoverage": {
            "linkedMixedSessions": linked_mixed_sessions,
            "fullSessionFallbacks": full_session_fallbacks,
            "excludedMixedSessions": excluded_mixed_sessions
        },
        "trend10": trend_10,
        "trend50": trend_50,
        "dataPoints": n,
        "totalCost": total_cost,
        "totalLoot": total_adjusted_loot,
        "totalTtLoot": total_tt_loot,
        "totalMarkupGain": total_adjusted_loot - total_tt_loot
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bankroll_projection_uses_compounded_returns() {
        assert_eq!(bankroll_runs_to_threshold(95.0, 1000.0, 100.0), Some(45));
        assert_eq!(bankroll_runs_to_threshold(95.95, 1000.0, 100.0), Some(56));
        assert_eq!(bankroll_runs_to_threshold(100.0, 1000.0, 100.0), None);
    }

    #[test]
    fn event_volume_analysis_compares_low_and_high_halves() {
        let analysis =
            calculate_event_volume_analysis(&[(10, 100.0), (20, 90.0), (50, 80.0), (60, 70.0)]);

        assert!(analysis.available);
        assert_eq!(analysis.sessions_analyzed, 4);
        assert_eq!(analysis.low_average_events, 15.0);
        assert_eq!(analysis.high_average_events, 55.0);
        assert_eq!(analysis.low_return_percent, 95.0);
        assert_eq!(analysis.high_return_percent, 75.0);
        assert_eq!(analysis.difference_percent_points, 20.0);
    }

    #[test]
    fn creature_allocation_uses_full_totals_for_single_creature_sessions() {
        assert_eq!(
            classify_creature_session_allocation(true, 100, 100, 120, 80, 50.0),
            CreatureSessionAllocation::FullSession
        );
        assert_eq!(
            classify_creature_session_allocation(true, 0, 0, 10, 0, 0.0),
            CreatureSessionAllocation::FullSession
        );
    }

    #[test]
    fn creature_allocation_requires_complete_links_for_mixed_sessions() {
        assert_eq!(
            classify_creature_session_allocation(false, 100, 40, 120, 120, 50.0),
            CreatureSessionAllocation::LinkedMixed
        );
        assert_eq!(
            classify_creature_session_allocation(false, 100, 40, 120, 119, 50.0),
            CreatureSessionAllocation::ExcludedMixed
        );
    }
}
