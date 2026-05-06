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

#[derive(Serialize, Clone)]
struct SearchResult {
    path: String,
    name: String,
    relative_path: String,
    snippet: String,
    matched_on_path: bool,
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

#[command]
fn write_md_file(path: String, content: String, state: State<'_, AppState>) -> Result<(), String> {
    let root = {
        let selected_root = state
            .selected_root
            .lock()
            .map_err(|_| "Failed to access application state".to_string())?;
        selected_root
            .clone()
            .ok_or_else(|| "Select a root folder before saving files".to_string())?
    };

    let file_path = canonicalize_file(Path::new(&path))?;

    if !file_path.starts_with(&root) {
        return Err("Refusing to write files outside the selected root".to_string());
    }

    if !is_markdown_path(&file_path) {
        return Err("Only Markdown files can be saved".to_string());
    }

    std::fs::write(&file_path, content)
        .map_err(|error| format!("Failed to write {}: {error}", file_path.display()))
}

#[command]
fn create_md_file(relative_path: String, content: String, state: State<'_, AppState>) -> Result<MdFile, String> {
    let root = selected_root(&state, "Select a root folder before creating files")?;
    let file_path = resolve_new_markdown_path(&root, &relative_path)?;

    if file_path.exists() {
        return Err(format!("{} already exists", file_path.display()));
    }

    if let Some(parent) = file_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| format!("Failed to create {}: {error}", parent.display()))?;
    }

    std::fs::write(&file_path, content)
        .map_err(|error| format!("Failed to write {}: {error}", file_path.display()))?;

    let relative_path = file_path
        .strip_prefix(&root)
        .map_err(|_| "Failed to compute file path relative to selected root".to_string())?
        .to_string_lossy()
        .replace('\\', "/");

    Ok(MdFile {
        path: file_path.to_string_lossy().to_string(),
        name: file_path
            .file_name()
            .map(|value| value.to_string_lossy().to_string())
            .unwrap_or_else(|| "untitled.md".to_string()),
        relative_path,
    })
}

#[command]
fn rename_md_file(path: String, next_relative_path: String, state: State<'_, AppState>) -> Result<MdFile, String> {
    let root = selected_root(&state, "Select a root folder before renaming files")?;
    let current_path = canonicalize_file(Path::new(&path))?;

    if !current_path.starts_with(&root) {
        return Err("Refusing to rename files outside the selected root".to_string());
    }

    if !is_markdown_path(&current_path) {
        return Err("Only Markdown files can be renamed".to_string());
    }

    let next_path = resolve_new_markdown_path(&root, &next_relative_path)?;

    if next_path == current_path {
        let relative_path = current_path
            .strip_prefix(&root)
            .map_err(|_| "Failed to compute file path relative to selected root".to_string())?
            .to_string_lossy()
            .replace('\\', "/");

        return Ok(MdFile {
            path: current_path.to_string_lossy().to_string(),
            name: current_path
                .file_name()
                .map(|value| value.to_string_lossy().to_string())
                .unwrap_or_else(|| "untitled.md".to_string()),
            relative_path,
        });
    }

    if next_path.exists() {
        return Err(format!("{} already exists", next_path.display()));
    }

    if let Some(parent) = next_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|error| format!("Failed to create {}: {error}", parent.display()))?;
    }

    std::fs::rename(&current_path, &next_path)
        .map_err(|error| format!("Failed to rename {}: {error}", current_path.display()))?;

    let relative_path = next_path
        .strip_prefix(&root)
        .map_err(|_| "Failed to compute file path relative to selected root".to_string())?
        .to_string_lossy()
        .replace('\\', "/");

    Ok(MdFile {
        path: next_path.to_string_lossy().to_string(),
        name: next_path
            .file_name()
            .map(|value| value.to_string_lossy().to_string())
            .unwrap_or_else(|| "untitled.md".to_string()),
        relative_path,
    })
}

#[command]
fn delete_md_file(path: String, state: State<'_, AppState>) -> Result<(), String> {
    let root = selected_root(&state, "Select a root folder before deleting files")?;
    let file_path = canonicalize_file(Path::new(&path))?;

    if !file_path.starts_with(&root) {
        return Err("Refusing to delete files outside the selected root".to_string());
    }

    if !is_markdown_path(&file_path) {
        return Err("Only Markdown files can be deleted".to_string());
    }

    std::fs::remove_file(&file_path)
        .map_err(|error| format!("Failed to delete {}: {error}", file_path.display()))
}

#[command]
fn search_markdown(path: String, query: String, state: State<'_, AppState>) -> Result<Vec<SearchResult>, String> {
    let root = canonicalize_directory(Path::new(&path))?;
    let needle = query.trim().to_lowercase();

    if needle.is_empty() {
        return Ok(Vec::new());
    }

    let mut results = Vec::new();

    for entry in WalkDir::new(&root)
        .follow_links(false)
        .into_iter()
        .filter_map(Result::ok)
    {
        if !entry.file_type().is_file() || !is_markdown_path(entry.path()) {
            continue;
        }

        let relative_path = entry
            .path()
            .strip_prefix(&root)
            .map_err(|_| "Failed to compute file path relative to selected root".to_string())?
            .to_string_lossy()
            .replace('\\', "/");
        let matched_on_path = relative_path.to_lowercase().contains(&needle);

        let content = std::fs::read_to_string(entry.path()).unwrap_or_default();
        let content_lower = content.to_lowercase();

        if !matched_on_path && !content_lower.contains(&needle) {
            continue;
        }

        results.push(SearchResult {
            path: entry.path().to_string_lossy().to_string(),
            name: entry.file_name().to_string_lossy().to_string(),
            relative_path,
            snippet: build_search_snippet(&content, &content_lower, &needle),
            matched_on_path,
        });
    }

    results.sort_by(|left, right| left.relative_path.cmp(&right.relative_path));

    let mut selected_root = state
        .selected_root
        .lock()
        .map_err(|_| "Failed to access application state".to_string())?;
    *selected_root = Some(root);

    Ok(results)
}

fn selected_root(state: &State<'_, AppState>, message: &str) -> Result<PathBuf, String> {
    let selected_root = state
        .selected_root
        .lock()
        .map_err(|_| "Failed to access application state".to_string())?;

    selected_root
        .clone()
        .ok_or_else(|| message.to_string())
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

fn build_search_snippet(content: &str, content_lower: &str, needle: &str) -> String {
    if let Some(index) = content_lower.find(needle) {
        let start = index.saturating_sub(48);
        let end = (index + needle.len() + 88).min(content.len());
        let snippet = content[start..end].replace('\n', " ");
        return snippet.split_whitespace().collect::<Vec<_>>().join(" ");
    }

    String::new()
}

fn resolve_new_markdown_path(root: &Path, relative_path: &str) -> Result<PathBuf, String> {
    let trimmed = relative_path.trim().replace('\\', "/");

    if trimmed.is_empty() {
        return Err("A file path is required".to_string());
    }

    let normalized = if trimmed.ends_with(".md") || trimmed.ends_with(".markdown") {
        trimmed
    } else {
        format!("{trimmed}.md")
    };

    let candidate = root.join(&normalized);

    if !candidate.starts_with(root) {
        return Err("Refusing to create files outside the selected root".to_string());
    }

    if candidate
        .components()
        .any(|component| matches!(component, std::path::Component::ParentDir))
    {
        return Err("Parent directory segments are not allowed".to_string());
    }

    if !is_markdown_path(&candidate) {
        return Err("Only Markdown files are supported".to_string());
    }

    Ok(candidate)
}

pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            scan_directory,
            read_md_file,
            write_md_file,
            create_md_file,
            rename_md_file,
            delete_md_file,
            search_markdown
        ])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_title("Markdown Project Viewer");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
