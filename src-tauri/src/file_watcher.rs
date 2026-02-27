use notify::{Watcher, RecursiveMode, Event, Result as NotifyResult};
use std::sync::mpsc::{channel, Receiver, Sender};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::thread;
use std::fs;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
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
        
        // Watch the parent directory instead of the file itself. Some programs
        // (including game clients) replace the log file atomically which can
        // result in missing events when watching the file path directly. By
        // watching the parent directory we receive create/rename events and
        // can then filter to the target file.
        let watch_target = path
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or(path.clone());
        watcher.watch(&watch_target, RecursiveMode::NonRecursive)?;
        
        // Store watcher
        *self.watcher.lock().unwrap() = Some(watcher);
        *self.current_path.lock().unwrap() = Some(path.clone());
        
        // Track last-read size so we only read appended data. This avoids
        // reparsing the entire log on each filesystem event.
        let initial_size = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
        let last_size = Arc::new(Mutex::new(initial_size));

        // Spawn thread to handle file changes
        let path_clone = path.clone();
        let last_size_thread = last_size.clone();
        thread::spawn(move || {
            for res in rx {
                match res {
                    Ok(event) => {
                        // More robust path matching: some platforms/reporters may
                        // provide different PathBuf forms or only file names. Compare
                        // by file name (case-insensitive on Windows) as a fallback.
                        let target_name = path_clone.file_name().map(|n| n.to_string_lossy().to_lowercase());

                        let affected = event.paths.iter().any(|p| {
                            if p == &path_clone {
                                return true;
                            }
                            if let Some(fname) = p.file_name() {
                                if let Some(ref t) = target_name {
                                    return fname.to_string_lossy().to_lowercase() == *t;
                                }
                            }
                            false
                        });

                        if !affected && !event.paths.is_empty() {
                            continue;
                        }

                        // Use metadata to determine how much to read
                        match fs::metadata(&path_clone) {
                            Ok(meta) => {
                                let new_len = meta.len();
                                let mut last = last_size_thread.lock().unwrap();

                                if new_len == *last {
                                    // nothing new
                                    continue;
                                }

                                if new_len < *last {
                                    // file was truncated or rotated; read whole file
                                    eprintln!("Detected truncation/rotation of {} (old={}, new={}), reading full file", path_clone.display(), *last, new_len);
                                    match fs::read_to_string(&path_clone) {
                                        Ok(content) => {
                                            eprintln!("Emitting full content for {} ({} bytes)", path_clone.display(), content.len());
                                            eprintln!("-- last lines (most recent first) --");
                                            for l in content.lines().rev().take(50) {
                                                eprintln!("{}", l);
                                            }
                                            eprintln!("-- end recent lines --");
                                            let _ = app_handle.emit("chat-log-updated", content);
                                        }
                                        Err(e) => eprintln!("Failed to read watched file after rotation: {:?}", e),
                                    }
                                    *last = new_len;
                                    continue;
                                }

                                // Read only appended bytes
                                match File::open(&path_clone) {
                                    Ok(mut f) => {
                                        if f.seek(SeekFrom::Start(*last)).is_ok() {
                                            let mut buf = String::new();
                                            match f.read_to_string(&mut buf) {
                                                Ok(_) => {
                                                    if !buf.is_empty() {
                                                        eprintln!("Emitting appended content for {} ({} bytes)", path_clone.display(), buf.len());
                                                        for l in buf.lines().take(50) {
                                                            eprintln!("{}", l);
                                                        }
                                                        let _ = app_handle.emit("chat-log-updated", buf);
                                                    }
                                                }
                                                Err(e) => eprintln!("Failed to read appended data: {:?}", e),
                                            }
                                        }
                                    }
                                    Err(e) => eprintln!("Failed to open file for appended read: {:?}", e),
                                }

                                *last = new_len;
                            }
                            Err(e) => eprintln!("Failed to stat watched file: {:?}", e),
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
