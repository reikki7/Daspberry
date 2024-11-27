// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// src-tauri/src/main.rs
use std::path::PathBuf;
use std::fs;
use serde::Serialize;
use tauri::command;

#[derive(Serialize)]
struct MusicFile {
    name: String,
    path: String,
}

#[command]
fn get_music_files() -> Result<Vec<MusicFile>, String> {
    let music_dir = dirs::audio_dir()
        .ok_or_else(|| "Could not find music directory".to_string())?;
    
    let mut music_files = Vec::new();
    
    visit_dirs(&music_dir, &mut music_files)
        .map_err(|e| e.to_string())?;
    
    Ok(music_files)
}

fn visit_dirs(dir: &PathBuf, music_files: &mut Vec<MusicFile>) -> std::io::Result<()> {
    if dir.is_dir() {
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            
            if path.is_dir() {
                visit_dirs(&path, music_files)?;
            } else {
                if let Some(extension) = path.extension() {
                    if extension == "mp3" || extension == "wav" {
                        if let (Some(file_name), Some(path_str)) = (path.file_name(), path.to_str().map(|s| s.to_owned())) {
                        music_files.push(MusicFile {
                            name: file_name.to_string_lossy().into_owned(),
                            path: path_str,
                        });
                        }
                    }
                }
            }
        }
    }
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_music_files])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}