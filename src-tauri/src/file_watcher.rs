use notify::{Watcher, RecursiveMode, Event, Result as NotifyResult};
use std::sync::mpsc::{channel, Receiver, Sender};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::thread;
use std::fs;
use tauri::Emitter;

pub struct FileWatcher {
    watcher: Arc<Mutex<Option<notify::RecommendedWatcher>>>,
    current_path: Arc<Mutex<Option<PathBuf>>>,
}

impl FileWatcher {
    pub fn new() -> Self {
        Self {
            watcher: Arc::new(Mutex::new(None)),
            current_path: Arc::new(Mutex::new(None)),
        }
    }
    
    pub fn watch_file<P: AsRef<Path>>(
        &self,
        path: P,
        app_handle: tauri::AppHandle,
    ) -> NotifyResult<()> {
        let path = path.as_ref().to_path_buf();
        let (tx, rx): (Sender<NotifyResult<Event>>, Receiver<NotifyResult<Event>>) = channel();
        
        let mut watcher = notify::recommended_watcher(move |res| {
            let _ = tx.send(res);
        })?;
        
        watcher.watch(&path, RecursiveMode::NonRecursive)?;
        
        // Store watcher
        *self.watcher.lock().unwrap() = Some(watcher);
        *self.current_path.lock().unwrap() = Some(path.clone());
        
        // Spawn thread to handle file changes
        let path_clone = path.clone();
        thread::spawn(move || {
            for res in rx {
                match res {
                    Ok(_event) => {
                        if let Ok(content) = fs::read_to_string(&path_clone) {
                            // Emit event to frontend
                            let _ = app_handle.emit("chat-log-updated", content);
                        }
                    }
                    Err(e) => {
                        eprintln!("Watch error: {:?}", e);
                    }
                }
            }
        });
        
        Ok(())
    }
    
    pub fn stop_watching(&self) {
        *self.watcher.lock().unwrap() = None;
        *self.current_path.lock().unwrap() = None;
    }
    
    pub fn is_watching(&self) -> bool {
        self.watcher.lock().unwrap().is_some()
    }
    
    pub fn current_path(&self) -> Option<PathBuf> {
        self.current_path.lock().unwrap().clone()
    }
}
