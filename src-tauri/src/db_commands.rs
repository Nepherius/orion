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

// Include submodules for DB command implementations
include!("db_commands/sessions.rs");
include!("db_commands/loot_stats.rs");
include!("db_commands/combat_tracking.rs");
include!("db_commands/templates_settings.rs");
