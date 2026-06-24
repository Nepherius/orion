//! Main library for Orion Tauri backend
//! Contains state management, parsing, and DB logic

mod chat_parser;
mod db_commands;
mod file_watcher;
mod language_patterns;

use chat_parser::{
    ChatLogParser, CombatEvent, DamageEvent, DamageTakenEvent, HealingEvent, LootEvent, SkillGain,
};
use db_commands::DbState;
use file_watcher::FileWatcher;
use serde::{Deserialize, Serialize};
use std::fs;
use std::sync::{Arc, Mutex};
use tauri::{Manager, State};

use rusqlite::Connection;
use std::path::PathBuf;

/// Struct holding all parsed results from a chat log
#[derive(Debug, Serialize, Deserialize)]
pub struct ParseResult {
    pub loot_events: Vec<LootEvent>,
    pub damage_events: Vec<DamageEvent>,
    pub combat_events: Vec<CombatEvent>,
    pub healing_events: Vec<HealingEvent>,
    pub damage_taken_events: Vec<DamageTakenEvent>,
    pub skill_gains: Vec<SkillGain>,
}

/// State management for the Tauri backend
struct AppState {
    parser: ChatLogParser,
    watcher: Arc<Mutex<FileWatcher>>,
}

/// Check if sessions table has all required columns
fn check_schema_version(conn: &Connection) -> bool {
    // Try to query a column that should exist in the current schema
    let result = conn.query_row("SELECT loadout_id FROM sessions LIMIT 1", [], |_| Ok(()));

    // If the query succeeds or returns no rows, schema is valid
    // If it fails with "no such column", schema is outdated
    match result {
        Ok(_) => true,
        Err(rusqlite::Error::QueryReturnedNoRows) => true,
        Err(_) => false,
    }
}

fn ensure_db_schema(conn: &Connection) -> Result<(), rusqlite::Error> {
    // Check if schema is outdated
    if !check_schema_version(conn) {
        println!("[DB] Outdated schema detected. Recreating database tables...");
        // Drop all tables to start fresh
        conn.execute_batch(
            "DROP TABLE IF EXISTS damage_taken_events;
             DROP TABLE IF EXISTS healing_events;
             DROP TABLE IF EXISTS combat_events;
             DROP TABLE IF EXISTS damage_events;
             DROP TABLE IF EXISTS globals;
             DROP TABLE IF EXISTS skill_gains;
             DROP TABLE IF EXISTS loot_items;
             DROP TABLE IF EXISTS sessions;
             DROP TABLE IF EXISTS loadouts;
             DROP TABLE IF EXISTS item_templates;",
        )?;
        println!("[DB] Old tables dropped. Creating fresh schema...");
    }

    // Create tables with IF NOT EXISTS
    conn.execute_batch(
        "BEGIN;
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL UNIQUE,
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
            weapon_efficiency_snapshot REAL,
            dpp_snapshot REAL,
            loadout_name_snapshot TEXT,
            ammo_cost REAL DEFAULT 0,
            weapon_decay REAL DEFAULT 0,
            healing_cost REAL DEFAULT 0,
            other_costs REAL DEFAULT 0,
            tags TEXT
        );

        CREATE TABLE IF NOT EXISTS loot_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL UNIQUE,
            session_uuid TEXT NOT NULL,
            name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            value REAL NOT NULL,
            markup REAL NOT NULL,
            fixed_value REAL,
            total_value REAL NOT NULL,
            timestamp INTEGER NOT NULL,
            FOREIGN KEY (session_uuid) REFERENCES sessions(uuid) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS skill_gains (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL UNIQUE,
            session_uuid TEXT NOT NULL,
            skill_name TEXT NOT NULL,
            gain_amount REAL NOT NULL,
            timestamp INTEGER NOT NULL,
            FOREIGN KEY (session_uuid) REFERENCES sessions(uuid) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS globals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL UNIQUE,
            session_uuid TEXT NOT NULL,
            creature TEXT NOT NULL,
            value REAL NOT NULL,
            is_hof INTEGER NOT NULL DEFAULT 0,
            timestamp INTEGER NOT NULL,
            FOREIGN KEY (session_uuid) REFERENCES sessions(uuid) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS kills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL UNIQUE,
            session_uuid TEXT NOT NULL,
            creature_name TEXT NOT NULL,
            maturity TEXT,
            hp_dealt REAL NOT NULL,
            cost REAL NOT NULL,
            loot_value REAL NOT NULL,
            timestamp INTEGER NOT NULL,
            loadout_id TEXT,
            FOREIGN KEY (session_uuid) REFERENCES sessions(uuid) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS damage_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL UNIQUE,
            session_uuid TEXT NOT NULL,
            damage REAL NOT NULL,
            is_critical INTEGER NOT NULL DEFAULT 0,
            timestamp INTEGER NOT NULL,
            FOREIGN KEY (session_uuid) REFERENCES sessions(uuid) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS combat_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL UNIQUE,
            session_uuid TEXT NOT NULL,
            type TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            FOREIGN KEY (session_uuid) REFERENCES sessions(uuid) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS healing_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL UNIQUE,
            session_uuid TEXT NOT NULL,
            amount REAL NOT NULL,
            timestamp INTEGER NOT NULL,
            FOREIGN KEY (session_uuid) REFERENCES sessions(uuid) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS damage_taken_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL UNIQUE,
            session_uuid TEXT NOT NULL,
            damage REAL NOT NULL,
            is_critical INTEGER NOT NULL DEFAULT 0,
            timestamp INTEGER NOT NULL,
            FOREIGN KEY (session_uuid) REFERENCES sessions(uuid) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS loadouts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            weapon TEXT,
            weapon_tt REAL DEFAULT 0,
            amp TEXT,
            amp_tt REAL DEFAULT 0,
            sight TEXT,
            sight_tt REAL DEFAULT 0,
            scope TEXT,
            scope_tt REAL DEFAULT 0,
            armor TEXT,
            notes TEXT,
            is_favorite INTEGER NOT NULL DEFAULT 0,
            is_active INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS item_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            default_tt_value REAL NOT NULL,
            default_markup REAL NOT NULL,
            default_fixed_value REAL,
            description TEXT
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_loot_session ON loot_items(session_uuid);
        CREATE INDEX IF NOT EXISTS idx_skills_session ON skill_gains(session_uuid);
        CREATE INDEX IF NOT EXISTS idx_globals_session ON globals(session_uuid);
        CREATE INDEX IF NOT EXISTS idx_kills_session ON kills(session_uuid);
        CREATE INDEX IF NOT EXISTS idx_kills_creature ON kills(creature_name);
        CREATE INDEX IF NOT EXISTS idx_kills_timestamp ON kills(timestamp);
        CREATE INDEX IF NOT EXISTS idx_damage_session ON damage_events(session_uuid);
        CREATE INDEX IF NOT EXISTS idx_combat_session ON combat_events(session_uuid);
        CREATE INDEX IF NOT EXISTS idx_healing_session ON healing_events(session_uuid);
        CREATE INDEX IF NOT EXISTS idx_damage_taken_session ON damage_taken_events(session_uuid);
        COMMIT;",
    )?;

    // Handle migrations for existing databases that were created before certain columns were added
    // Ignore errors for these as they will fail if the column already exists
    let _ = conn.execute("ALTER TABLE sessions ADD COLUMN creature TEXT", []);
    let _ = conn.execute(
        "ALTER TABLE sessions ADD COLUMN weapon_efficiency_snapshot REAL",
        [],
    );
    let _ = conn.execute("ALTER TABLE sessions ADD COLUMN dpp_snapshot REAL", []);
    let _ = conn.execute(
        "ALTER TABLE sessions ADD COLUMN loadout_name_snapshot TEXT",
        [],
    );
    let _ = conn.execute("ALTER TABLE loadouts ADD COLUMN armor TEXT", []);
    let _ = conn.execute("ALTER TABLE loot_items ADD COLUMN fixed_value REAL", []);
    let _ = conn.execute("ALTER TABLE loot_items ADD COLUMN kill_uuid TEXT", []);
    let _ = conn.execute(
        "ALTER TABLE item_templates ADD COLUMN default_fixed_value REAL",
        [],
    );

    // Create kills table if it doesn't exist (migration for existing databases)
    let _ = conn.execute(
        "CREATE TABLE IF NOT EXISTS kills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL UNIQUE,
            session_uuid TEXT NOT NULL,
            creature_name TEXT NOT NULL,
            maturity TEXT,
            hp_dealt REAL NOT NULL,
            cost REAL NOT NULL,
            loot_value REAL NOT NULL,
            timestamp INTEGER NOT NULL,
            FOREIGN KEY (session_uuid) REFERENCES sessions(uuid) ON DELETE CASCADE
        )",
        [],
    );
    let _ = conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_kills_session ON kills(session_uuid)",
        [],
    );
    let _ = conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_kills_creature ON kills(creature_name)",
        [],
    );
    let _ = conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_kills_timestamp ON kills(timestamp)",
        [],
    );
    let _ = conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_loot_kill ON loot_items(kill_uuid)",
        [],
    );

    // Add loadout_id to kills table (migration for existing databases)
    let _ = conn.execute("ALTER TABLE kills ADD COLUMN loadout_id TEXT", []);

    conn.execute_batch(
        "DELETE FROM loot_items WHERE session_uuid NOT IN (SELECT uuid FROM sessions);
         DELETE FROM skill_gains WHERE session_uuid NOT IN (SELECT uuid FROM sessions);
         DELETE FROM globals WHERE session_uuid NOT IN (SELECT uuid FROM sessions);
         DELETE FROM kills WHERE session_uuid NOT IN (SELECT uuid FROM sessions);
         DELETE FROM damage_events WHERE session_uuid NOT IN (SELECT uuid FROM sessions);
         DELETE FROM combat_events WHERE session_uuid NOT IN (SELECT uuid FROM sessions);
         DELETE FROM healing_events WHERE session_uuid NOT IN (SELECT uuid FROM sessions);
         DELETE FROM damage_taken_events WHERE session_uuid NOT IN (SELECT uuid FROM sessions);",
    )?;

    Ok(())
}

// Tauri commands
#[tauri::command]
fn parse_chat_log(content: String, state: State<AppState>) -> Result<ParseResult, String> {
    let (
        loot_events,
        damage_events,
        combat_events,
        healing_events,
        damage_taken_events,
        skill_gains,
    ) = state.parser.parse_file_with_damage(&content);
    Ok(ParseResult {
        loot_events,
        damage_events,
        combat_events,
        healing_events,
        damage_taken_events,
        skill_gains,
    })
}

#[tauri::command]
fn read_chat_log(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_chat_log_tail(path: String, lines: usize) -> Result<String, String> {
    use std::fs::File;
    use std::io::{Read, Seek, SeekFrom};

    let mut file = File::open(&path).map_err(|e| e.to_string())?;
    let mut buf = Vec::new();

    // Read from the end in chunks until we have enough lines or reach start
    let mut pos = file.seek(SeekFrom::End(0)).map_err(|e| e.to_string())?;
    let mut _read_bytes = 0usize;
    let chunk_size: u64 = 8 * 1024;

    loop {
        if pos == 0 {
            break;
        }

        let to_read = if pos > chunk_size { chunk_size } else { pos };
        pos = pos.saturating_sub(to_read);
        file.seek(SeekFrom::Start(pos)).map_err(|e| e.to_string())?;

        let mut tmp = vec![0u8; to_read as usize];
        let n = file.read(&mut tmp).map_err(|e| e.to_string())?;
        _read_bytes += n;

        // Prepend tmp to buf
        let mut new_buf = tmp;
        new_buf.extend_from_slice(&buf);
        buf = new_buf;

        // Count lines
        let s = String::from_utf8_lossy(&buf);
        let line_count = s.lines().count();
        if line_count > lines + 5 || pos == 0 {
            break;
        }
        if pos == 0 {
            break;
        }
    }

    let s = String::from_utf8_lossy(&buf).to_string();
    let v: Vec<&str> = s.lines().collect();
    let start = if v.len() > lines { v.len() - lines } else { 0 };
    let tail = v[start..].join("\n");
    Ok(tail)
}

#[tauri::command]
fn validate_chat_log_path(path: String) -> Result<(), String> {
    let trimmed_path = path.trim();
    if trimmed_path.is_empty() {
        return Err("No chat log path is configured.".to_string());
    }

    let chat_log_path = PathBuf::from(trimmed_path);
    let metadata = fs::metadata(&chat_log_path)
        .map_err(|error| format!("Chat log not found at \"{}\": {}", trimmed_path, error))?;

    if !metadata.is_file() {
        return Err(format!(
            "The configured chat log path is not a file: \"{}\"",
            trimmed_path
        ));
    }

    Ok(())
}

#[tauri::command]
fn start_watching_file(
    path: String,
    state: State<AppState>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let watcher = state.watcher.lock().unwrap();
    watcher
        .watch_file(&path, app_handle)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn stop_watching_file(state: State<AppState>) -> Result<(), String> {
    let watcher = state.watcher.lock().unwrap();
    watcher.stop_watching();
    Ok(())
}

#[tauri::command]
fn is_watching(state: State<AppState>) -> Result<bool, String> {
    let watcher = state.watcher.lock().unwrap();
    Ok(watcher.is_watching())
}

#[tauri::command]
fn get_watched_path(state: State<AppState>) -> Result<Option<String>, String> {
    let watcher = state.watcher.lock().unwrap();
    Ok(watcher
        .current_path()
        .map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
fn detect_chat_log_path() -> Result<Option<String>, String> {
    // Try common Entropia Universe chat.log locations
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .ok();

    if let Some(home_dir) = home {
        // Windows: C:\Users\[Name]\Documents\Entropia Universe\chat.log
        let windows_path = PathBuf::from(&home_dir)
            .join("Documents")
            .join("Entropia Universe")
            .join("chat.log");
        if windows_path.exists() {
            return Ok(Some(windows_path.to_string_lossy().to_string()));
        }

        // Alternative: Documents only
        let alt_path = PathBuf::from(&home_dir).join("Documents").join("chat.log");
        if alt_path.exists() {
            return Ok(Some(alt_path.to_string_lossy().to_string()));
        }
    }

    Ok(None)
}

#[tauri::command]
async fn show_overlay(
    app_handle: tauri::AppHandle,
    x: Option<f64>,
    y: Option<f64>,
    width: Option<f64>,
    height: Option<f64>,
) -> Result<(), String> {
    use tauri::Manager;

    // Check if overlay window already exists
    if let Some(window) = app_handle.get_webview_window("overlay") {
        if cfg!(target_os = "linux") {
            let _ = window.set_visible_on_all_workspaces(true);
            let _ = window.set_always_on_top(true);
        }

        window.show().map_err(|e| e.to_string())?;
        if cfg!(target_os = "windows") {
            window.set_focus().map_err(|e| e.to_string())?;
        }
        return Ok(());
    }

    // Use provided values or defaults
    let pos_x = x.unwrap_or(20.0);
    let pos_y = y.unwrap_or(20.0);
    let mut win_width = width.unwrap_or(750.0);
    let mut win_height = height.unwrap_or(56.0);

    if win_width <= 0.0 {
        win_width = 750.0;
    }
    if win_height <= 0.0 {
        win_height = 56.0;
    }

    // Create new overlay window
    let overlay_window = tauri::WebviewWindowBuilder::new(
        &app_handle,
        "overlay",
        tauri::WebviewUrl::App("index.html#/overlay".into()),
    )
    .title("ORION Overlay")
    .inner_size(win_width, win_height)
    .position(pos_x, pos_y)
    .decorations(false)
    .resizable(true)
    .always_on_top(true)
    .transparent(true)
    .visible_on_all_workspaces(true)
    .build()
    .map_err(|e| e.to_string())?;

    if cfg!(target_os = "linux") {
        let _ = overlay_window.set_visible_on_all_workspaces(true);
        overlay_window
            .set_always_on_top(true)
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
async fn hide_overlay(app_handle: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;

    if let Some(window) = app_handle.get_webview_window("overlay") {
        window.hide().map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
async fn is_overlay_visible(app_handle: tauri::AppHandle) -> Result<bool, String> {
    use tauri::Manager;

    if let Some(window) = app_handle.get_webview_window("overlay") {
        window.is_visible().map_err(|e| e.to_string())
    } else {
        Ok(false)
    }
}

#[derive(Serialize)]
struct OverlayGeometry {
    x: Option<f64>,
    y: Option<f64>,
    width: f64,
    height: f64,
}

#[tauri::command]
async fn get_overlay_geometry(
    app_handle: tauri::AppHandle,
) -> Result<Option<OverlayGeometry>, String> {
    use tauri::Manager;

    if let Some(window) = app_handle.get_webview_window("overlay") {
        let is_wayland = get_linux_display_server() == Some("wayland".to_string());

        let position = if is_wayland {
            None
        } else {
            window.outer_position().ok()
        };

        // Window size usually works on all platforms, fallback to 0,0 just in case
        let size = window
            .inner_size()
            .unwrap_or(tauri::PhysicalSize::new(0, 0));

        Ok(Some(OverlayGeometry {
            x: position.map(|p| p.x as f64),
            y: position.map(|p| p.y as f64),
            width: size.width as f64,
            height: size.height as f64,
        }))
    } else {
        Ok(None)
    }
}

#[tauri::command]
async fn refresh_overlay_topmost(app_handle: tauri::AppHandle) -> Result<(), String> {
    use tauri::Manager;

    if !cfg!(target_os = "linux") {
        return Ok(());
    }

    if let Some(window) = app_handle.get_webview_window("overlay") {
        let _ = window.set_visible_on_all_workspaces(true);
        let _ = window.show();
        window.set_always_on_top(true).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn get_linux_display_server() -> Option<String> {
    if !cfg!(target_os = "linux") {
        return None;
    }

    if std::env::var("WAYLAND_DISPLAY")
        .map(|value| !value.is_empty())
        .unwrap_or(false)
    {
        return Some("wayland".to_string());
    }

    if std::env::var("DISPLAY")
        .map(|value| !value.is_empty())
        .unwrap_or(false)
    {
        return Some("x11".to_string());
    }

    std::env::var("XDG_SESSION_TYPE")
        .ok()
        .map(|value| value.trim().to_lowercase())
        .filter(|value| !value.is_empty())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .level_for(
                            "tao::platform_impl::platform::event_loop::runner",
                            log::LevelFilter::Error,
                        )
                        .build(),
                )?;
            }

            // Initialize DB in app dir
            let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
            std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
            let db_path: PathBuf = app_dir.join("orion.db");

            // Log database location for debugging (console and file)
            println!("[DB] Database path: {:?}", db_path);
            println!("[DB] Database exists: {}", db_path.exists());

            // Also append to a debug log file in the app data dir
            use std::fs::OpenOptions;
            use std::io::Write;
            let log_path = app_dir.join("orion-debug.log");
            if let Ok(mut log_file) = OpenOptions::new().create(true).append(true).open(&log_path) {
                let _ = writeln!(log_file, "[DB] Database path: {:?}", db_path);
                let _ = writeln!(log_file, "[DB] Database exists: {}", db_path.exists());
                let _ = writeln!(
                    log_file,
                    "[DB] Log time: {:?}",
                    std::time::SystemTime::now()
                );
            }

            let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
            conn.execute("PRAGMA foreign_keys = ON", [])
                .map_err(|e| e.to_string())?;
            ensure_db_schema(&conn).map_err(|e| e.to_string())?;

            let db_arc = Arc::new(Mutex::new(conn));

            app.manage(AppState {
                parser: ChatLogParser::new(),
                watcher: Arc::new(Mutex::new(FileWatcher::new())),
            });

            app.manage(DbState { db: db_arc });

            // Close overlay when main window closes
            let app_handle = app.handle().clone();
            if let Some(main_window) = app.get_webview_window("main") {
                main_window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { .. } = event {
                        // Close overlay window if it exists
                        if let Some(overlay) = app_handle.get_webview_window("overlay") {
                            let _ = overlay.close();
                        }
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            parse_chat_log,
            read_chat_log,
            read_chat_log_tail,
            validate_chat_log_path,
            start_watching_file,
            stop_watching_file,
            is_watching,
            get_watched_path,
            detect_chat_log_path,
            show_overlay,
            hide_overlay,
            is_overlay_visible,
            get_overlay_geometry,
            get_linux_display_server,
            refresh_overlay_topmost,
            db_commands::db_create_session,
            db_commands::db_update_session,
            db_commands::db_delete_session,
            db_commands::db_get_all_sessions,
            db_commands::db_get_all_sessions_summary,
            db_commands::db_clear_all_data,
            db_commands::db_get_session_stats,
            db_commands::db_get_lifetime_stats,
            db_commands::db_get_analytics_stats,
            db_commands::db_get_analytics_performance_data,
            db_commands::db_get_analytics_advanced_data,
            db_commands::db_get_advanced_creature_stats,
            db_commands::db_get_analytics_factor_data,
            db_commands::db_get_loot_theory_data,
            db_commands::db_add_loot,
            db_commands::db_update_loot,
            db_commands::db_delete_loot,
            db_commands::db_get_session_loot,
            db_commands::db_get_session_loot_grouped,
            db_commands::db_add_skill,
            db_commands::db_get_session_skills,
            db_commands::db_add_global,
            db_commands::db_get_session_globals,
            db_commands::db_add_kill,
            db_commands::db_get_session_kills,
            db_commands::db_add_damage_event,
            db_commands::db_get_session_damage_events,
            db_commands::db_add_combat_event,
            db_commands::db_get_session_combat_events,
            db_commands::db_add_healing_event,
            db_commands::db_get_session_healing_events,
            db_commands::db_add_damage_taken_event,
            db_commands::db_get_session_damage_taken_events,
            db_commands::db_create_loadout,
            db_commands::db_delete_loadout,
            db_commands::db_get_all_loadouts,
            db_commands::db_add_item_template,
            db_commands::db_delete_item_template,
            db_commands::db_get_all_item_templates,
            db_commands::db_set_setting,
            db_commands::db_get_setting,
            db_commands::db_get_all_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
