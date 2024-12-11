// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::command;
use std::path::Path;
use serde_json::Value;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tauri::Manager;
use std::env;

const REDIRECT_URI: &str = "http://localhost:1";

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

#[derive(Serialize, Deserialize)]
struct AuthUrlResponse {
    url: String,
}

#[derive(Serialize, Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: String,
    expires_in: u64,
    token_type: String,
}

#[derive(Serialize, Deserialize)]
struct CalendarEvent {
    summary: String,
    start: Option<String>,
    end: Option<String>,
    description: Option<String>,
    location: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
struct Task {
    id: String,
    title: String,
    date: String,
    description: String,
    completed: bool,
    completed_on: Option<String>,
}

#[derive(Serialize, Deserialize)]
struct NewTask {
    name: String,
    notes: Option<String>,
    due_on: Option<String>,
    workspace: String,
}

#[derive(Serialize, Deserialize)]
struct CreateTaskResponse {
    data: Value,
}

fn get_google_client_id() -> String {
    std::env::var("GOOGLE_CLIENT_ID").expect("GOOGLE_CLIENT_ID is not set")
}

fn get_google_client_secret() -> String {
    std::env::var("GOOGLE_CLIENT_SECRET").expect("GOOGLE_CLIENT_SECRET is not set")
}


#[command]
fn get_google_auth_url() -> String {
    format!(
        "https://accounts.google.com/o/oauth2/auth?client_id={}&redirect_uri={}&response_type=code&scope=https://www.googleapis.com/auth/calendar.events",
        get_google_client_id(), REDIRECT_URI
    )
}

#[command]
async fn get_google_tokens(code: String) -> Result<TokenResponse, String> {
    let client = Client::new();
    let params = [
        ("code", code),
        ("client_id", get_google_client_id().to_string()),
        ("client_secret", get_google_client_secret().to_string()),
        ("redirect_uri", REDIRECT_URI.to_string()),
        ("grant_type", "authorization_code".to_string()),
    ];

    let response = client
        .post("https://oauth2.googleapis.com/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if response.status().is_success() {
        let token_data: TokenResponse = response.json().await.map_err(|e| e.to_string())?;
        Ok(token_data)
    } else {
        Err("Failed to retrieve tokens".to_string())
    }
}

#[command]
async fn fetch_google_calendar_events(access_token: String) -> Result<Vec<CalendarEvent>, String> {
    let client = reqwest::Client::new();
    let one_month_before_now = (chrono::Utc::now() - chrono::Duration::days(30)).to_rfc3339();

    let response = client
        .get("https://www.googleapis.com/calendar/v3/calendars/primary/events")
        .bearer_auth(access_token)
        .query(&[
            ("timeMin", one_month_before_now.as_str()), // Set timeMin to one month before now
            ("singleEvents", "true"), 
            ("orderBy", "startTime")
        ])
        .send()
        .await
        .map_err(|e| format!("Request error: {}", e))?;

    if response.status().is_success() {
        let events: serde_json::Value = response.json().await.map_err(|e| format!("JSON parse error: {}", e))?;
        let items = events["items"]
            .as_array()
            .unwrap_or(&vec![])
            .iter()
            .filter(|item| item["summary"].is_string() && !item["summary"].as_str().unwrap().is_empty())
            .map(|item| {
                let meeting_link = item["hangoutLink"]
                    .as_str()
                    .or_else(|| {
                        item["conferenceData"]["entryPoints"]
                            .as_array()
                            .and_then(|entry_points| {
                                entry_points
                                    .iter()
                                    .find(|point| {
                                        point["entryPointType"].as_str() == Some("video")
                                    })
                                    .and_then(|point| point["uri"].as_str())
                            })
                    })
                    .or_else(|| item["location"].as_str())
                    .map(String::from);

                CalendarEvent {
                    summary: item["summary"].as_str().unwrap().to_string(),
                    start: item["start"]["dateTime"]
                        .as_str()
                        .or(item["start"]["date"].as_str())
                        .map(String::from),
                    end: item["end"]["dateTime"]
                        .as_str()
                        .or(item["end"]["date"].as_str())
                        .map(String::from),
                    description: item["description"].as_str().map(String::from),
                    location: meeting_link,
                }
            })
            .collect();

        Ok(items)
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        Err(format!("Failed to fetch events: {} - {}", status, error_text))
    }
}
#[tauri::command]
fn handle_oauth_callback(app_handle: tauri::AppHandle, url: String) -> Result<(), String> {
    println!("Received callback URL: {}", url);

    if url.starts_with(REDIRECT_URI) {
        let code = url
            .split("code=")
            .nth(1)
            .and_then(|s| s.split('&').next())
            .ok_or_else(|| "Authorization code not found in URL".to_string())?;

        println!("Extracted code: {}", code);

        app_handle
            .emit_all("auth-complete", code)
            .map_err(|e| format!("Failed to emit auth-complete event: {}", e))?;

        Ok(())
    } else {
        Err("Invalid redirect URI".to_string())
    }
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

#[command]
fn cache_asana_tasks(data: String) -> Result<(), String> {
    let cache_path = dirs::data_local_dir()
        .ok_or_else(|| "Failed to get local data directory".to_string())?
        .join("asana_tasks_cache.json");
    
    fs::write(&cache_path, data).map_err(|e| e.to_string())?;
    Ok(())
}

#[command]
fn read_asana_tasks_cache() -> Result<String, String> {
    let cache_path = dirs::data_local_dir()
        .ok_or_else(|| "Failed to get local data directory".to_string())?
        .join("asana_tasks_cache.json");

    if cache_path.exists() {
        let data = fs::read_to_string(&cache_path).map_err(|e| e.to_string())?;
        Ok(data)
    } else {
        Err("Asana tasks cache file does not exist".to_string())
    }
}

#[command]
fn cache_asana_user_details(data: String) -> Result<(), String> {
  let cache_path = dirs::data_local_dir()
    .ok_or_else(|| "Failed to get local data directory".to_string())?
    .join("asana_user_details_cache.json");

  fs::write(&cache_path, data).map_err(|e| e.to_string())?;
  Ok(())
}

#[command]
fn read_asana_user_details_cache() -> Result<String, String> {
  let cache_path = dirs::data_local_dir()
    .ok_or_else(|| "Failed to get local data directory".to_string())?
    .join("asana_user_details_cache.json");

  if cache_path.exists() {
    let data = fs::read_to_string(&cache_path).map_err(|e| e.to_string())?;
    Ok(data)
  } else {
    Err("Asana user details cache file does not exist".to_string())
  }
}

#[command]
fn save_local_tasks(tasks: Vec<Task>) -> Result<(), String> {
    let tasks_json = serde_json::to_string(&tasks)
        .map_err(|e| format!("Failed to serialize tasks: {}", e))?;
    
    let cache_path = dirs::data_local_dir()
        .ok_or_else(|| "Failed to get local data directory".to_string())?
        .join("local_tasks_cache.json");
    
    fs::write(&cache_path, tasks_json)
        .map_err(|e| format!("Failed to write tasks to file: {}", e))?;
    
    Ok(())
}

#[command]
fn load_local_tasks() -> Result<Vec<Task>, String> {
    let cache_path = dirs::data_local_dir()
        .ok_or_else(|| "Failed to get local data directory".to_string())?
        .join("local_tasks_cache.json");

    if !cache_path.exists() {
        return Ok(Vec::new());
    }

    let tasks_json = fs::read_to_string(&cache_path)
        .map_err(|e| format!("Failed to read tasks file: {}", e))?;
    
    let tasks: Vec<Task> = serde_json::from_str(&tasks_json)
        .map_err(|e| format!("Failed to deserialize tasks: {}", e))?;
    
    Ok(tasks)
}

fn main() {
    dotenv::dotenv().ok(); 

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_project_folders, get_music_files, open_folder_in_vscode, get_project_info, cache_github_repos, read_github_repos_cache, clear_github_cache, cache_asana_tasks, read_asana_tasks_cache, cache_asana_user_details, read_asana_user_details_cache, get_google_auth_url, get_google_tokens, fetch_google_calendar_events, handle_oauth_callback, save_local_tasks, load_local_tasks])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}