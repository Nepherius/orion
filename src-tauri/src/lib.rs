mod chat_parser;
mod file_watcher;

use chat_parser::{ChatLogParser, LootEvent};
use file_watcher::FileWatcher;
use std::fs;
use std::sync::{Arc, Mutex};
use tauri::State;

// State management
struct AppState {
    parser: ChatLogParser,
    watcher: Arc<Mutex<FileWatcher>>,
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
      Ok(())
    })
    .manage(AppState {
        parser: ChatLogParser::new(),
        watcher: Arc::new(Mutex::new(FileWatcher::new())),
    })
    .invoke_handler(tauri::generate_handler![
        parse_chat_log,
        read_chat_log,
        start_watching_file,
        stop_watching_file,
        is_watching,
        get_watched_path,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

