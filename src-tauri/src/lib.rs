mod chat_parser;
mod file_watcher;
mod language_patterns;

use chat_parser::{ChatLogParser, LootEvent};
use file_watcher::FileWatcher;
use std::fs;
use std::sync::{Arc, Mutex};
use tauri::{State, Manager};

use rusqlite::{params, Connection};
use serde_json::json;
use std::path::PathBuf;
use uuid::Uuid;

// State management
struct AppState {
    parser: ChatLogParser,
    watcher: Arc<Mutex<FileWatcher>>,
    db: Arc<Mutex<Connection>>,
}

fn ensure_db_schema(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch(
        "BEGIN;
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            weapon TEXT,
            armor TEXT,
            location TEXT,
            notes TEXT,
            start_time INTEGER NOT NULL,
            end_time INTEGER,
            status TEXT NOT NULL,
            ammo_cost REAL DEFAULT 0,
            repair_cost REAL DEFAULT 0,
            armor_decay REAL DEFAULT 0,
            healing_cost REAL DEFAULT 0,
            other_costs REAL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS combat_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            ts INTEGER NOT NULL,
            type TEXT NOT NULL,
            actor TEXT,
            target TEXT,
            weapon TEXT,
            amount REAL,
            qty INTEGER,
            value REAL,
            is_crit INTEGER DEFAULT 0,
            related_event_id INTEGER,
            raw_line TEXT,
            meta TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_events_session_ts ON combat_events(session_id, ts);
        COMMIT;"
    )
}

// Tauri commands
#[tauri::command]
fn parse_chat_log(content: String, state: State<AppState>) -> Result<Vec<LootEvent>, String> {
    Ok(state.parser.parse_file(&content))
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
fn start_watching_file(path: String, state: State<AppState>, app_handle: tauri::AppHandle) -> Result<(), String> {
    let watcher = state.watcher.lock().unwrap();
    watcher.watch_file(&path, app_handle).map_err(|e| e.to_string())
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
    Ok(watcher.current_path().map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
fn db_add_session(
    name: String,
    start_time: i64,
    status: String,
    notes: Option<String>,
    state: State<AppState>,
) -> Result<i64, String> {
    let conn = state.db.lock().unwrap();
    let uuid = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO sessions (uuid, name, start_time, status, notes) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![uuid, name, start_time, status, notes],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn db_add_event(
    session_id: i64,
    ts: i64,
    type_: String,
    actor: Option<String>,
    target: Option<String>,
    weapon: Option<String>,
    amount: Option<f64>,
    qty: Option<i64>,
    value: Option<f64>,
    is_crit: Option<bool>,
    raw_line: Option<String>,
    state: State<AppState>,
) -> Result<i64, String> {
    let conn = state.db.lock().unwrap();
    conn.execute(
        "INSERT INTO combat_events (session_id, ts, type, actor, target, weapon, amount, qty, value, is_crit, raw_line) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![session_id, ts, type_, actor, target, weapon, amount, qty, value, is_crit.map(|b| if b {1} else {0}), raw_line],
    )
    .map_err(|e| e.to_string())?;
    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn db_get_sessions(state: State<AppState>) -> Result<serde_json::Value, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT id, uuid, name, start_time, end_time, status FROM sessions ORDER BY start_time DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(json!({
                "id": row.get::<_, i64>(0)?,
                "uuid": row.get::<_, String>(1)?,
                "name": row.get::<_, String>(2)?,
                "start_time": row.get::<_, i64>(3)?,
                "end_time": row.get::<_, Option<i64>>(4)?,
                "status": row.get::<_, String>(5)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut v = vec![];
    for r in rows {
        v.push(r.map_err(|e| e.to_string())?);
    }
    Ok(json!(v))
}

#[tauri::command]
fn db_get_session_events(session_id: i64, state: State<AppState>) -> Result<serde_json::Value, String> {
    let conn = state.db.lock().unwrap();
    let mut stmt = conn
        .prepare("SELECT id, ts, type, actor, target, weapon, amount, qty, value, is_crit, raw_line FROM combat_events WHERE session_id = ?1 ORDER BY ts ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([session_id], |row| {
            Ok(json!({
                "id": row.get::<_, i64>(0)?,
                "ts": row.get::<_, i64>(1)?,
                "type": row.get::<_, String>(2)?,
                "actor": row.get::<_, Option<String>>(3)?,
                "target": row.get::<_, Option<String>>(4)?,
                "weapon": row.get::<_, Option<String>>(5)?,
                "amount": row.get::<_, Option<f64>>(6)?,
                "qty": row.get::<_, Option<i64>>(7)?,
                "value": row.get::<_, Option<f64>>(8)?,
                "is_crit": row.get::<_, Option<i64>>(9)?.map(|i| i != 0),
                "raw_line": row.get::<_, Option<String>>(10)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let mut v = vec![];
    for r in rows {
        v.push(r.map_err(|e| e.to_string())?);
    }
    Ok(json!(v))
}

#[tauri::command]
fn detect_chat_log_path() -> Result<Option<String>, String> {
    use std::path::Path;
    
    // Try common Entropia Universe chat.log locations
    let home = std::env::var("USERPROFILE").or_else(|_| std::env::var("HOME")).ok();
    
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
        let alt_path = PathBuf::from(&home_dir)
            .join("Documents")
            .join("chat.log");
        if alt_path.exists() {
            return Ok(Some(alt_path.to_string_lossy().to_string()));
        }
    }

    Ok(None)
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
        tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Initialize DB in app dir
            let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
            std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
            let db_path: PathBuf = app_dir.join("orion.db");
            let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
            ensure_db_schema(&conn).map_err(|e| e.to_string())?;

            app.manage(AppState {
                parser: ChatLogParser::new(),
                watcher: Arc::new(Mutex::new(FileWatcher::new())),
                db: Arc::new(Mutex::new(conn)),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
                parse_chat_log,
                read_chat_log,
                read_chat_log_tail,
                start_watching_file,
                stop_watching_file,
                is_watching,
                get_watched_path,
                detect_chat_log_path,
                db_add_session,
                db_add_event,
                db_get_sessions,
                db_get_session_events,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

