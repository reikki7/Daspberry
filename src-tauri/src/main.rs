// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::command;
use serde::Serialize;
use std::path::Path;
use serde_json::Value;

#[derive(serde::Serialize)]
struct Folder {
    name: String,
    last_modified: u64,
}

#[derive(serde::Serialize)]
struct MusicFile {
    name: String,
    path: String,
}

#[derive(Serialize)]
struct ProjectInfo {
    name: String,
    framework: Option<String>,
    languages: Vec<String>,
}

#[command]
fn get_project_folders(path: String) -> Result<Vec<Folder>, String> {
    let path = PathBuf::from(path);
    if !path.is_dir() {
        return Err("Path is not a directory".into());
    }

    let mut folders = Vec::new();
    for entry in fs::read_dir(path).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_dir() {
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                // Get the last modified time
                let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
                let last_modified = metadata
                    .modified()
                    .map_err(|e| e.to_string())?
                    .duration_since(std::time::UNIX_EPOCH)
                    .map_err(|e| e.to_string())?
                    .as_secs();

                folders.push(Folder {
                    name: name.to_string(),
                    last_modified,
                });
            }
        }
    }

    Ok(folders)
}

#[tauri::command]
async fn get_project_info(path: &str) -> Result<ProjectInfo, String> {
    let path = Path::new(path);

    let mut info = ProjectInfo {
        name: path.file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .into(),
        framework: None,
        languages: Vec::new(),
    };

    // Detect framework from package.json if it exists
    if path.join("package.json").exists() {
        if let Ok(content) = std::fs::read_to_string(path.join("package.json")) {
            if let Ok(json) = serde_json::from_str::<Value>(&content) {
                if let Some(deps) = json.get("dependencies")
                    .and_then(|d| d.as_object()) {
                    if deps.contains_key("next") {
                        info.framework = Some("Next.js".to_string());
                    } else if deps.contains_key("vue") {
                        info.framework = Some("Vue".to_string());
                    } else if deps.contains_key("react") {
                        info.framework = Some("React".to_string());
                    } else if deps.contains_key("svelte") {
                        info.framework = Some("Svelte".to_string());
                    }
                }
            }
        }
    }

    // Check for specific subfolders if no framework is detected
    if info.framework.is_none() {
        let has_frontend = path.join("frontend").exists() || path.join("client").exists();
        let has_backend = path.join("backend").exists() || path.join("server").exists();

        info.framework = match (has_frontend, has_backend) {
            (true, true) => Some("Full Stack".to_string()),
            (true, false) => Some("Frontend".to_string()),
            (false, true) => Some("Backend".to_string()),
            _ => None,
        };
    }

    // Detect languages by file extensions
    if let Ok(entries) = std::fs::read_dir(path) {
        let mut extensions = std::collections::HashSet::new();

        for entry in entries.flatten() {
            if let Some(ext) = entry.path().extension() {
                match ext.to_string_lossy().as_ref() {
                    "js" | "jsx" => { extensions.insert("JavaScript"); },
                    "ts" | "tsx" => { extensions.insert("TypeScript"); },
                    "py" => { extensions.insert("Python"); },
                    "rs" => { extensions.insert("Rust"); },
                    "go" => { extensions.insert("Go"); },
                    "java" => { extensions.insert("Java"); },
                    "kt" => { extensions.insert("Kotlin"); },
                    "cs" => { extensions.insert("C#"); },
                    "cpp" => { extensions.insert("C++"); },
                    "cc" | "c" => { extensions.insert("C"); },
                    _ => {},
                };
            }
        }

        info.languages = extensions.into_iter().map(String::from).collect();
    }

    Ok(info)
}


#[command]
fn open_folder_in_vscode(path: String) -> Result<(), String> {
    let vscode_path = "C:\\Users\\KidKat\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe";
    let output = Command::new(vscode_path)
        .arg(path)
        .output()
        .map_err(|e| e.to_string())?;
    
    if !output.status.success() {
        return Err("Failed to open folder in VSCode".into());
    }
    
    Ok(())
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

#[command]
fn cache_github_repos(data: String) -> Result<(), String> {
    let cache_path = dirs::data_local_dir()
        .ok_or_else(|| "Failed to get local data directory".to_string())?
        .join("github_repos_cache.json");
    
    fs::write(&cache_path, data).map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
fn read_github_repos_cache() -> Result<String, String> {
    let cache_path = dirs::data_local_dir()
        .ok_or_else(|| "Failed to get local data directory".to_string())?
        .join("github_repos_cache.json");

    if cache_path.exists() {
        let data = fs::read_to_string(&cache_path).map_err(|e| e.to_string())?;
        Ok(data)
    } else {
        Err("Cache file does not exist".to_string())
    }
}

#[command]
fn clear_github_cache() -> Result<(), String> {
    let cache_path = dirs::data_local_dir()
        .ok_or_else(|| "Failed to get local data directory".to_string())?
        .join("github_repos_cache.json");

    if cache_path.exists() {
        fs::remove_file(&cache_path).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Cache file does not exist".to_string())
    }
}


fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_project_folders, get_music_files, open_folder_in_vscode, get_project_info, cache_github_repos, read_github_repos_cache, clear_github_cache])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}