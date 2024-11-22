// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::State;
use std::sync::Mutex;
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Track {
    path: String,
    name: String,
    metadata: Option<TrackMetadata>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct TrackMetadata {
    title: String,
    artist: String,
    cover_art: Option<String>,
}

struct MusicLibrary(Mutex<HashMap<String, Track>>);

#[tauri::command]
async fn scan_music_directory(library: State<'_, MusicLibrary>) -> Result<Vec<Track>, String> {
    let music_dir = dirs::audio_dir()
        .ok_or("Could not find music directory")?;
    
    let tracks = scan_directory(&music_dir)?;
    
    // Update library cache
    let mut library = library.0.lock().unwrap();
    for track in &tracks {
        library.insert(track.path.clone(), track.clone());
    }
    
    Ok(tracks)
}

fn scan_directory(dir: &PathBuf) -> Result<Vec<Track>, String> {
    let mut tracks = Vec::new();
    
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            
            if path.is_dir() {
                if let Ok(sub_tracks) = scan_directory(&path) {
                    tracks.extend(sub_tracks);
                }
            } else if let Some(ext) = path.extension() {
                if let Some(ext_str) = ext.to_str() {
                    if ["mp3", "wav", "m4a"].contains(&ext_str.to_lowercase().as_str()) {
                        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                            tracks.push(Track {
                                path: path.to_string_lossy().into_owned(),
                                name: name.to_owned(),
                                metadata: None,
                            });
                        }
                    }
                }
            }
        }
    }
    
    Ok(tracks)
}

#[tauri::command]
async fn load_track_metadata(path: String, library: State<'_, MusicLibrary>) -> Result<Track, String> {
    let mut library = library.0.lock().unwrap();
    
    if let Some(track) = library.get(&path) {
        if track.metadata.is_some() {
            return Ok(track.clone());
        }
    }
    
    // Here you would implement metadata extraction using a Rust ID3 tag reader
    // For now, we'll return basic metadata
    let track = Track {
        path: path.clone(),
        name: PathBuf::from(&path)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_owned(),
        metadata: Some(TrackMetadata {
            title: "Unknown Title".to_string(),
            artist: "Unknown Artist".to_string(),
            cover_art: None,
        }),
    };
    
    library.insert(path, track.clone());
    Ok(track)
}

fn main() {
    tauri::Builder::default()
        .manage(MusicLibrary(Mutex::new(HashMap::new())))
        .invoke_handler(tauri::generate_handler![
            scan_music_directory,
            load_track_metadata,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}