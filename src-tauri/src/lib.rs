use std::{
    path::{Path, PathBuf},
    sync::Mutex,
};

use serde::Serialize;
use tauri::{command, Manager, State};
use walkdir::WalkDir;

#[derive(Default)]
struct AppState {
    selected_root: Mutex<Option<PathBuf>>,
}

#[derive(Serialize, Clone)]
struct MdFile {
    path: String,
    name: String,
    relative_path: String,
}

#[command]
fn scan_directory(path: String, state: State<'_, AppState>) -> Result<Vec<MdFile>, String> {
    let root = canonicalize_directory(Path::new(&path))?;
    let mut files = Vec::new();

    for entry in WalkDir::new(&root)
        .follow_links(false)
        .into_iter()
        .filter_map(Result::ok)
    {
        if !entry.file_type().is_file() {
            continue;
        }

        if !is_markdown_path(entry.path()) {
            continue;
        }

        let relative_path = entry
            .path()
            .strip_prefix(&root)
            .map_err(|_| "Failed to compute file path relative to selected root".to_string())?
            .to_string_lossy()
            .replace('\\', "/");

        files.push(MdFile {
            path: entry.path().to_string_lossy().to_string(),
            name: entry.file_name().to_string_lossy().to_string(),
            relative_path,
        });
    }

    files.sort_by(|left, right| left.relative_path.cmp(&right.relative_path));

    let mut selected_root = state
        .selected_root
        .lock()
        .map_err(|_| "Failed to access application state".to_string())?;
    *selected_root = Some(root);

    Ok(files)
}

#[command]
fn read_md_file(path: String, state: State<'_, AppState>) -> Result<String, String> {
    let root = {
        let selected_root = state
            .selected_root
            .lock()
            .map_err(|_| "Failed to access application state".to_string())?;
        selected_root
            .clone()
            .ok_or_else(|| "Select a root folder before opening files".to_string())?
    };

    let file_path = canonicalize_file(Path::new(&path))?;

    if !file_path.starts_with(&root) {
        return Err("Refusing to read files outside the selected root".to_string());
    }

    if !is_markdown_path(&file_path) {
        return Err("Only Markdown files can be opened".to_string());
    }

    std::fs::read_to_string(&file_path)
        .map_err(|error| format!("Failed to read {}: {error}", file_path.display()))
}

fn canonicalize_directory(path: &Path) -> Result<PathBuf, String> {
    let canonical = path
        .canonicalize()
        .map_err(|error| format!("Failed to resolve directory {}: {error}", path.display()))?;

    if !canonical.is_dir() {
        return Err(format!("{} is not a directory", canonical.display()));
    }

    Ok(canonical)
}

fn canonicalize_file(path: &Path) -> Result<PathBuf, String> {
    let canonical = path
        .canonicalize()
        .map_err(|error| format!("Failed to resolve file {}: {error}", path.display()))?;

    if !canonical.is_file() {
        return Err(format!("{} is not a file", canonical.display()));
    }

    Ok(canonical)
}

fn is_markdown_path(path: &Path) -> bool {
    match path.extension().and_then(|extension| extension.to_str()) {
        Some(extension) => matches!(extension.to_ascii_lowercase().as_str(), "md" | "markdown"),
        None => false,
    }
}

pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![scan_directory, read_md_file])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_title("Markdown Project Viewer");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
