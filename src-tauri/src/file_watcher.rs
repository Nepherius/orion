use notify::{Event, RecursiveMode, Result as NotifyResult, Watcher};
use std::fs;
use std::fs::File;
use std::io::{Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::Emitter;

pub struct FileWatcher {
    watcher: Arc<Mutex<Option<notify::RecommendedWatcher>>>,
    current_path: Arc<Mutex<Option<PathBuf>>>,
    last_size: Arc<Mutex<u64>>,
}

impl FileWatcher {
    pub fn new() -> Self {
        Self {
            watcher: Arc::new(Mutex::new(None)),
            current_path: Arc::new(Mutex::new(None)),
            last_size: Arc::new(Mutex::new(0)),
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

        // If the path changed, reset last_size. Otherwise keep the previous
        // position so we only emit new lines on restart (e.g. HMR).
        {
            let mut cur = self.current_path.lock().unwrap();
            if cur.as_deref() != Some(&path) {
                *self.last_size.lock().unwrap() = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
                *cur = Some(path.clone());
            } else {
                // Same file – if the file grew while we weren't watching,
                // jump to the current end so we don't replay old data.
                let current_file_size = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
                let mut last = self.last_size.lock().unwrap();
                if current_file_size > *last {
                    // Skip any content that was written while we were stopped
                    *last = current_file_size;
                }
            }
        }

        // Clone the Arc for the thread
        let last_size = self.last_size.clone();

        // Spawn thread to handle file changes
        let path_clone = path.clone();
        thread::spawn(move || {
            for res in rx {
                match res {
                    Ok(event) => {
                        // More robust path matching: some platforms/reporters may
                        // provide different PathBuf forms or only file names. Compare
                        // by file name (case-insensitive on Windows) as a fallback.
                        let target_name = path_clone
                            .file_name()
                            .map(|n| n.to_string_lossy().to_lowercase());

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
                                let mut last = last_size.lock().unwrap();

                                if new_len == *last {
                                    // nothing new
                                    continue;
                                }

                                if new_len < *last {
                                    // file was truncated or rotated; read whole file
                                    match fs::read_to_string(&path_clone) {
                                        Ok(content) => {
                                            let _ = app_handle.emit("chat-log-updated", content);
                                        }
                                        Err(e) => eprintln!(
                                            "Failed to read watched file after rotation: {:?}",
                                            e
                                        ),
                                    }
                                    *last = new_len;
                                    continue;
                                }

                                // Read only appended bytes
                                match File::open(&path_clone) {
                                    Ok(mut f) => {
                                        if f.seek(SeekFrom::Start(*last)).is_ok() {
                                            use std::io::{BufRead, BufReader};
                                            let mut reader = BufReader::new(f);
                                            let mut complete_lines = String::new();
                                            let mut bytes_read_total = 0;

                                            loop {
                                                let mut line = String::new();
                                                match reader.read_line(&mut line) {
                                                    Ok(0) => break, // EOF
                                                    Ok(bytes) => {
                                                        // Only accept the line if it has a newline, ensuring it's complete
                                                        if line.ends_with('\n') {
                                                            complete_lines.push_str(&line);
                                                            bytes_read_total += bytes as u64;
                                                        } else {
                                                            // Incomplete line at EOF; stop reading and don't advance pointer
                                                            break;
                                                        }
                                                    }
                                                    Err(e) => {
                                                        eprintln!(
                                                            "Error reading file line: {:?}",
                                                            e
                                                        );
                                                        break;
                                                    }
                                                }
                                            }

                                            if !complete_lines.is_empty() {
                                                let _ = app_handle
                                                    .emit("chat-log-updated", complete_lines);
                                                // Safely advance parser EXACTLY the number of physical
                                                // bytes we consumed from the complete lines
                                                *last += bytes_read_total;
                                            }
                                        }
                                    }
                                    Err(e) => {
                                        eprintln!("Failed to open file for appended read: {:?}", e)
                                    }
                                }

                                // Don't update *last here - it's updated above only for complete lines
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
