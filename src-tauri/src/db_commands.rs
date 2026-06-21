//! Database command handlers for Orion Tauri backend
use rusqlite::params;
use rusqlite::Connection;
use rusqlite::OptionalExtension;
use serde_json::{json, Value as JsonValue};
use std::sync::{Arc, Mutex};
use tauri::State;

/// Shared database state for Tauri commands
pub struct DbState {
    pub db: Arc<Mutex<Connection>>,
}

fn clear_all_data(conn: &mut Connection) -> Result<(), rusqlite::Error> {
    let transaction = conn.transaction()?;

    transaction.execute_batch(
        "DELETE FROM damage_taken_events;
             DELETE FROM healing_events;
             DELETE FROM combat_events;
             DELETE FROM damage_events;
             DELETE FROM globals;
             DELETE FROM skill_gains;
             DELETE FROM loot_items;
             DELETE FROM kills;
             DELETE FROM sessions;
             DELETE FROM loadouts;
             DELETE FROM item_templates;
             DELETE FROM settings;
             DELETE FROM sqlite_sequence
             WHERE name IN (
                 'damage_taken_events',
                 'healing_events',
                 'combat_events',
                 'damage_events',
                 'globals',
                 'skill_gains',
                 'loot_items',
                 'kills',
                 'sessions',
                 'loadouts',
                 'item_templates'
             );",
    )?;

    transaction.commit()
}

#[tauri::command]
pub fn db_clear_all_data(state: State<'_, DbState>) -> Result<(), String> {
    let mut conn = state.db.lock().unwrap();
    clear_all_data(&mut conn).map_err(|e| e.to_string())
}

// Include submodules for DB command implementations
include!("db_commands/sessions.rs");
include!("db_commands/loot_stats.rs");
include!("db_commands/combat_tracking.rs");
include!("db_commands/templates_settings.rs");

#[cfg(test)]
mod clear_all_data_tests {
    use super::*;

    #[test]
    fn clears_every_user_data_table() {
        let mut conn = Connection::open_in_memory().expect("in-memory database");
        conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             CREATE TABLE sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, value TEXT);
             CREATE TABLE loot_items (id INTEGER PRIMARY KEY AUTOINCREMENT, value TEXT);
             CREATE TABLE skill_gains (id INTEGER PRIMARY KEY AUTOINCREMENT, value TEXT);
             CREATE TABLE globals (id INTEGER PRIMARY KEY AUTOINCREMENT, value TEXT);
             CREATE TABLE kills (id INTEGER PRIMARY KEY AUTOINCREMENT, value TEXT);
             CREATE TABLE damage_events (id INTEGER PRIMARY KEY AUTOINCREMENT, value TEXT);
             CREATE TABLE combat_events (id INTEGER PRIMARY KEY AUTOINCREMENT, value TEXT);
             CREATE TABLE healing_events (id INTEGER PRIMARY KEY AUTOINCREMENT, value TEXT);
             CREATE TABLE damage_taken_events (id INTEGER PRIMARY KEY AUTOINCREMENT, value TEXT);
             CREATE TABLE loadouts (id INTEGER PRIMARY KEY AUTOINCREMENT, value TEXT);
             CREATE TABLE item_templates (id INTEGER PRIMARY KEY AUTOINCREMENT, value TEXT);
             CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
             INSERT INTO sessions (value) VALUES ('session');
             INSERT INTO loot_items (value) VALUES ('loot');
             INSERT INTO skill_gains (value) VALUES ('skill');
             INSERT INTO globals (value) VALUES ('global');
             INSERT INTO kills (value) VALUES ('kill');
             INSERT INTO damage_events (value) VALUES ('damage');
             INSERT INTO combat_events (value) VALUES ('combat');
             INSERT INTO healing_events (value) VALUES ('healing');
             INSERT INTO damage_taken_events (value) VALUES ('damage taken');
             INSERT INTO loadouts (value) VALUES ('loadout');
             INSERT INTO item_templates (value) VALUES ('item');
             INSERT INTO settings (key, value) VALUES ('settings', '{}');",
        )
        .expect("test schema and data");

        clear_all_data(&mut conn).expect("clear all data");

        for table in [
            "sessions",
            "loot_items",
            "skill_gains",
            "globals",
            "kills",
            "damage_events",
            "combat_events",
            "healing_events",
            "damage_taken_events",
            "loadouts",
            "item_templates",
            "settings",
        ] {
            let count: i64 = conn
                .query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |row| {
                    row.get(0)
                })
                .expect("count rows");
            assert_eq!(count, 0, "{table} should be empty");
        }
    }
}
