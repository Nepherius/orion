// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// Main entry point for the Tauri Rust backend
fn main() {
    app_lib::run();
}
