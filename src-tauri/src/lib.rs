use std::{
    collections::HashMap,
    path::{Path, PathBuf},
    process::Command,
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

#[derive(Serialize, Clone)]
struct SpaceSummary {
    note_count: usize,
    latest_modified_at: Option<String>,
}

#[derive(Serialize, Clone)]
struct GitRepoInfo {
    is_repo: bool,
    branch: Option<String>,
    remote_url: Option<String>,
}

#[derive(Serialize, Clone)]
struct CloneResult {
    path: String,
    name: String,
}

#[derive(Serialize, Clone)]
struct GitFileStatus {
    relative_path: String,
    status: String,
}

#[derive(Serialize, Clone)]
struct GitFileHistoryEntry {
    commit_hash: String,
    short_hash: String,
    author_name: String,
    committed_at: String,
    summary: String,
}

#[command]
fn scan_directory(
    path: String,
    exclude_paths: Option<Vec<String>>,
    state: State<'_, AppState>,
) -> Result<Vec<MdFile>, String> {
    let root = canonicalize_directory(Path::new(&path))?;
    let excludes = normalize_excludes(exclude_paths);
    let mut files = Vec::new();

    for entry in WalkDir::new(&root)
        .follow_links(false)
        .into_iter()
        .filter_map(Result::ok)
    {
        if should_skip_path(&root, entry.path(), &excludes) {
            continue;
        }

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
fn search_markdown(
    path: String,
    query: String,
    exclude_paths: Option<Vec<String>>,
) -> Result<Vec<SearchResult>, String> {
    let root = canonicalize_directory(Path::new(&path))?;
    let excludes = normalize_excludes(exclude_paths);
    let needle = query.trim();

    if needle.is_empty() {
        return Ok(Vec::new());
    }

    let files = collect_markdown_files(&root, &excludes)?;
    let query_lower = needle.to_lowercase();
    let mut results_by_path: HashMap<String, SearchResult> = HashMap::new();

    for file in &files {
        if file.relative_path.to_lowercase().contains(&query_lower) {
            results_by_path.insert(
                file.relative_path.clone(),
                SearchResult {
                    path: file.path.to_string_lossy().to_string(),
                    name: file.name.clone(),
                    relative_path: file.relative_path.clone(),
                    snippet: String::new(),
                    matched_on_path: true,
                },
            );
        }
    }

    let content_matches = search_markdown_with_ripgrep(&root, needle, &excludes)
        .or_else(|_| search_markdown_with_fallback(&files, &query_lower));

    for (relative_path, snippet) in content_matches? {
        if let Some(existing) = results_by_path.get_mut(&relative_path) {
            if existing.snippet.is_empty() {
                existing.snippet = snippet;
            }
            continue;
        }

        if let Some(file) = files.iter().find(|file| file.relative_path == relative_path) {
            results_by_path.insert(
                relative_path.clone(),
                SearchResult {
                    path: file.path.to_string_lossy().to_string(),
                    name: file.name.clone(),
                    relative_path,
                    snippet,
                    matched_on_path: false,
                },
            );
        }
    }

    let mut results = results_by_path.into_values().collect::<Vec<_>>();
    results.sort_by(|left, right| left.relative_path.cmp(&right.relative_path));

    Ok(results)
}

#[command]
fn summarize_space(
    path: String,
    exclude_paths: Option<Vec<String>>,
) -> Result<SpaceSummary, String> {
    let root = canonicalize_directory(Path::new(&path))?;
    let excludes = normalize_excludes(exclude_paths);
    let mut note_count = 0usize;
    let mut latest_modified_at: Option<std::time::SystemTime> = None;

    for entry in WalkDir::new(&root)
        .follow_links(false)
        .into_iter()
        .filter_map(Result::ok)
    {
        if should_skip_path(&root, entry.path(), &excludes) {
            continue;
        }

        if !entry.file_type().is_file() || !is_markdown_path(entry.path()) {
            continue;
        }

        note_count += 1;

        if let Ok(metadata) = entry.metadata() {
            if let Ok(modified_at) = metadata.modified() {
                latest_modified_at = Some(
                    latest_modified_at
                        .map(|current| current.max(modified_at))
                        .unwrap_or(modified_at),
                );
            }
        }
    }

    Ok(SpaceSummary {
        note_count,
        latest_modified_at: latest_modified_at.map(|value| {
            chrono::DateTime::<chrono::Utc>::from(value).to_rfc3339()
        }),
    })
}

#[command]
fn get_git_info(path: String) -> Result<GitRepoInfo, String> {
    let root = canonicalize_directory(Path::new(&path))?;

    let inside_output = Command::new("git")
        .args(["-C", &root.to_string_lossy(), "rev-parse", "--is-inside-work-tree"])
        .output()
        .map_err(|error| format!("Failed to run git: {error}"))?;

    if !inside_output.status.success()
        || String::from_utf8_lossy(&inside_output.stdout).trim() != "true"
    {
        return Ok(GitRepoInfo {
            is_repo: false,
            branch: None,
            remote_url: None,
        });
    }

    let branch = Command::new("git")
        .args(["-C", &root.to_string_lossy(), "branch", "--show-current"])
        .output()
        .ok()
        .filter(|output| output.status.success())
        .map(|output| String::from_utf8_lossy(&output.stdout).trim().to_string())
        .filter(|value| !value.is_empty());

    let remote_url = Command::new("git")
        .args(["-C", &root.to_string_lossy(), "remote", "get-url", "origin"])
        .output()
        .ok()
        .filter(|output| output.status.success())
        .map(|output| String::from_utf8_lossy(&output.stdout).trim().to_string())
        .filter(|value| !value.is_empty());

    Ok(GitRepoInfo {
        is_repo: true,
        branch,
        remote_url,
    })
}

#[command]
fn clone_repository(
    repo_url: String,
    destination_parent: String,
    directory_name: String,
    state: State<'_, AppState>,
) -> Result<CloneResult, String> {
    let parent = canonicalize_directory(Path::new(&destination_parent))?;
    let name = directory_name.trim();

    if name.is_empty() {
        return Err("A destination folder name is required".to_string());
    }

    if name.contains('/') || name.contains('\\') {
        return Err("Folder name cannot contain path separators".to_string());
    }

    let target = parent.join(name);
    if target.exists() {
        return Err(format!("{} already exists", target.display()));
    }

    let output = Command::new("git")
        .args([
            "clone",
            &repo_url,
            target.to_string_lossy().as_ref(),
        ])
        .output()
        .map_err(|error| format!("Failed to run git clone: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            "git clone failed".to_string()
        } else {
            stderr
        });
    }

    let canonical_target = canonicalize_directory(&target)?;

    let mut selected_root = state
        .selected_root
        .lock()
        .map_err(|_| "Failed to access application state".to_string())?;
    *selected_root = Some(canonical_target.clone());

    Ok(CloneResult {
        path: canonical_target.to_string_lossy().to_string(),
        name: canonical_target
            .file_name()
            .map(|value| value.to_string_lossy().to_string())
            .unwrap_or_else(|| name.to_string()),
    })
}

#[command]
fn get_git_statuses(path: String, exclude_paths: Option<Vec<String>>) -> Result<Vec<GitFileStatus>, String> {
    let root = canonicalize_directory(Path::new(&path))?;
    let excludes = normalize_excludes(exclude_paths);

    let inside_output = Command::new("git")
        .args(["-C", &root.to_string_lossy(), "rev-parse", "--is-inside-work-tree"])
        .output()
        .map_err(|error| format!("Failed to run git: {error}"))?;

    if !inside_output.status.success()
        || String::from_utf8_lossy(&inside_output.stdout).trim() != "true"
    {
        return Ok(Vec::new());
    }

    let output = Command::new("git")
        .args(["-C", &root.to_string_lossy(), "status", "--short", "--untracked-files=all"])
        .output()
        .map_err(|error| format!("Failed to run git status: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            "git status failed".to_string()
        } else {
            stderr
        });
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut results = Vec::new();

    for line in stdout.lines() {
        if line.len() < 4 {
            continue;
        }

        let raw_status = line[..2].trim().to_string();
        let path_part = line[3..].trim();
        let relative_path = path_part
            .split(" -> ")
            .last()
            .unwrap_or(path_part)
            .replace('\\', "/");

        if should_skip_relative_path(&relative_path, &excludes) {
            continue;
        }

        if !relative_path.ends_with(".md") && !relative_path.ends_with(".markdown") {
            continue;
        }

        results.push(GitFileStatus {
            relative_path,
            status: normalize_git_status(&raw_status),
        });
    }

    Ok(results)
}

#[command]
fn get_file_history(path: String, state: State<'_, AppState>) -> Result<Vec<GitFileHistoryEntry>, String> {
    let root = selected_root(&state, "Select a root folder before checking file history")?;
    let file_path = canonicalize_file(Path::new(&path))?;

    if !file_path.starts_with(&root) {
        return Err("Refusing to inspect files outside the selected root".to_string());
    }

    if !is_markdown_path(&file_path) {
        return Err("Only Markdown files are supported".to_string());
    }

    let inside_output = Command::new("git")
        .args(["-C", &root.to_string_lossy(), "rev-parse", "--is-inside-work-tree"])
        .output()
        .map_err(|error| format!("Failed to run git: {error}"))?;

    if !inside_output.status.success()
        || String::from_utf8_lossy(&inside_output.stdout).trim() != "true"
    {
        return Ok(Vec::new());
    }

    let relative_path = file_path
        .strip_prefix(&root)
        .map_err(|_| "Failed to compute file path relative to selected root".to_string())?
        .to_string_lossy()
        .replace('\\', "/");

    let output = Command::new("git")
        .args([
            "-C",
            &root.to_string_lossy(),
            "log",
            "--follow",
            "--format=%H%x1f%h%x1f%an%x1f%aI%x1f%s",
            "-n",
            "8",
            "--",
            &relative_path,
        ])
        .output()
        .map_err(|error| format!("Failed to run git log: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            "git log failed".to_string()
        } else {
            stderr
        });
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let entries = stdout
        .lines()
        .filter_map(|line| {
            let mut parts = line.split('\x1f');
            let commit_hash = parts.next()?.trim().to_string();
            let short_hash = parts.next()?.trim().to_string();
            let author_name = parts.next()?.trim().to_string();
            let committed_at = parts.next()?.trim().to_string();
            let summary = parts.next()?.trim().to_string();

            Some(GitFileHistoryEntry {
                commit_hash,
                short_hash,
                author_name,
                committed_at,
                summary,
            })
        })
        .collect();

    Ok(entries)
}

#[command]
fn reveal_in_file_manager(path: String) -> Result<(), String> {
    let target = canonicalize_directory(Path::new(&path))?;

    #[cfg(target_os = "macos")]
    let mut command = {
        let mut command = Command::new("open");
        command.arg(&target);
        command
    };

    #[cfg(target_os = "linux")]
    let mut command = {
        let mut command = Command::new("xdg-open");
        command.arg(&target);
        command
    };

    #[cfg(target_os = "windows")]
    let mut command = {
        let mut command = Command::new("explorer");
        command.arg(&target);
        command
    };

    command
        .spawn()
        .map_err(|error| format!("Failed to open file manager: {error}"))?;

    Ok(())
}

#[command]
fn open_space_in_terminal(path: String) -> Result<(), String> {
    let target = canonicalize_directory(Path::new(&path))?;

    #[cfg(target_os = "macos")]
    let mut command = {
        let mut command = Command::new("open");
        command.args(["-a", "Terminal"]);
        command.arg(&target);
        command
    };

    #[cfg(target_os = "linux")]
    let mut command = {
        let mut command = Command::new("x-terminal-emulator");
        command.current_dir(&target);
        command
    };

    #[cfg(target_os = "windows")]
    let mut command = {
        let mut command = Command::new("cmd");
        command.args(["/C", "start"]);
        command.current_dir(&target);
        command
    };

    command
        .spawn()
        .map_err(|error| format!("Failed to open terminal: {error}"))?;

    Ok(())
}

#[command]
fn export_directory_zip(
    path: String,
    destination_path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let root = selected_root(&state, "Select a root folder before exporting")?;
    let source = canonicalize_directory(Path::new(&path))?;

    if !source.starts_with(&root) {
        return Err("Refusing to export directories outside the selected root".to_string());
    }

    let destination = PathBuf::from(destination_path.trim());
    if destination.as_os_str().is_empty() {
        return Err("A destination path is required".to_string());
    }

    let parent = destination
        .parent()
        .ok_or_else(|| "Destination must include a parent directory".to_string())?;
    let parent = canonicalize_directory(parent)?;

    let mut filename = destination
        .file_name()
        .ok_or_else(|| "Destination must include a file name".to_string())?
        .to_string_lossy()
        .to_string();
    if !filename.to_ascii_lowercase().ends_with(".zip") {
        filename.push_str(".zip");
    }

    let output_path = parent.join(filename);

    if output_path.exists() {
        std::fs::remove_file(&output_path)
            .map_err(|error| format!("Failed to replace {}: {error}", output_path.display()))?;
    }

    #[cfg(target_os = "macos")]
    let output = Command::new("ditto")
        .args([
            "-c",
            "-k",
            "--sequesterRsrc",
            "--keepParent",
            source.to_string_lossy().as_ref(),
            output_path.to_string_lossy().as_ref(),
        ])
        .output()
        .map_err(|error| format!("Failed to run ditto: {error}"))?;

    #[cfg(target_os = "linux")]
    let output = Command::new("zip")
        .args([
            "-r",
            output_path.to_string_lossy().as_ref(),
            source
                .file_name()
                .and_then(|value| value.to_str())
                .ok_or_else(|| "Failed to resolve folder name".to_string())?,
        ])
        .current_dir(
            source
                .parent()
                .ok_or_else(|| "Failed to resolve source parent directory".to_string())?,
        )
        .output()
        .map_err(|error| format!("Failed to run zip: {error}"))?;

    #[cfg(target_os = "windows")]
    let output = Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            &format!(
                "Compress-Archive -Path '{}' -DestinationPath '{}' -Force",
                source.display(),
                output_path.display()
            ),
        ])
        .output()
        .map_err(|error| format!("Failed to run Compress-Archive: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if stderr.is_empty() {
            "Failed to export zip".to_string()
        } else {
            stderr
        });
    }

    Ok(())
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

#[derive(Clone)]
struct MarkdownFileEntry {
    path: PathBuf,
    name: String,
    relative_path: String,
}

fn is_markdown_path(path: &Path) -> bool {
    match path.extension().and_then(|extension| extension.to_str()) {
        Some(extension) => matches!(extension.to_ascii_lowercase().as_str(), "md" | "markdown"),
        None => false,
    }
}

fn collect_markdown_files(root: &Path, excludes: &[String]) -> Result<Vec<MarkdownFileEntry>, String> {
    let mut files = Vec::new();

    for entry in WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_map(Result::ok)
    {
        if should_skip_path(root, entry.path(), excludes) {
            continue;
        }

        if !entry.file_type().is_file() || !is_markdown_path(entry.path()) {
            continue;
        }

        let relative_path = entry
            .path()
            .strip_prefix(root)
            .map_err(|_| "Failed to compute file path relative to selected root".to_string())?
            .to_string_lossy()
            .replace('\\', "/");

        files.push(MarkdownFileEntry {
            path: entry.path().to_path_buf(),
            name: entry.file_name().to_string_lossy().to_string(),
            relative_path,
        });
    }

    Ok(files)
}

fn normalize_excludes(exclude_paths: Option<Vec<String>>) -> Vec<String> {
    exclude_paths
        .unwrap_or_default()
        .into_iter()
        .map(|value| value.trim().replace('\\', "/"))
        .filter(|value| !value.is_empty())
        .collect()
}

fn should_skip_path(root: &Path, path: &Path, excludes: &[String]) -> bool {
    let relative_path = match path.strip_prefix(root) {
        Ok(value) => value.to_string_lossy().replace('\\', "/"),
        Err(_) => return false,
    };

    should_skip_relative_path(&relative_path, excludes)
}

fn should_skip_relative_path(relative_path: &str, excludes: &[String]) -> bool {
    let normalized = relative_path.trim_matches('/');
    if normalized.is_empty() {
        return false;
    }

    let segments = normalized.split('/').collect::<Vec<_>>();

    excludes.iter().any(|exclude| {
        let candidate = exclude.trim().trim_matches('/');
        if candidate.is_empty() {
            return false;
        }

        let candidate_segments = candidate.split('/').collect::<Vec<_>>();
        if candidate_segments.len() == 1 {
            return segments.iter().any(|segment| segment == &candidate);
        }

        if normalized == candidate {
            return true;
        }

        normalized.starts_with(&format!("{candidate}/"))
    })
}

fn build_search_snippet(content: &str, _content_lower: &str, needle: &str) -> String {
    for line in content.lines() {
        let normalized = line.split_whitespace().collect::<Vec<_>>().join(" ");
        if normalized.is_empty() {
            continue;
        }

        if normalized.to_lowercase().contains(needle) {
            let snippet = normalized.chars().take(160).collect::<String>();
            return if normalized.chars().count() > 160 {
                format!("{snippet}...")
            } else {
                snippet
            };
        }
    }

    content
        .split_whitespace()
        .take(24)
        .collect::<Vec<_>>()
        .join(" ")
}

fn search_markdown_with_fallback(
    files: &[MarkdownFileEntry],
    query_lower: &str,
) -> Result<Vec<(String, String)>, String> {
    let mut matches = Vec::new();

    for file in files {
        let content = std::fs::read_to_string(&file.path)
            .map_err(|error| format!("Failed to read {}: {error}", file.path.display()))?;
        let content_lower = content.to_lowercase();

        if !content_lower.contains(query_lower) {
            continue;
        }

        matches.push((
            file.relative_path.clone(),
            build_search_snippet(&content, &content_lower, query_lower),
        ));
    }

    Ok(matches)
}

fn search_markdown_with_ripgrep(
    root: &Path,
    query: &str,
    excludes: &[String],
) -> Result<Vec<(String, String)>, String> {
    let mut command = Command::new("rg");
    command
        .current_dir(root)
        .args([
            "--ignore-case",
            "--line-number",
            "--no-heading",
            "--color",
            "never",
            "--max-count",
            "1",
            "--hidden",
            "--no-ignore",
            "--glob",
            "*.md",
            "--glob",
            "*.markdown",
            query,
            ".",
        ]);

    for exclude in excludes {
        let pattern = if exclude.contains('/') {
            format!("!{exclude}/**")
        } else {
            format!("!**/{exclude}/**")
        };
        command.args(["--glob", &pattern]);
    }

    let output = command
        .output()
        .map_err(|error| format!("Failed to run ripgrep: {error}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&output.stdout);
        if output.status.code() == Some(1) && stdout.trim().is_empty() {
            return Ok(Vec::new());
        }
        return Err(if stderr.is_empty() {
            "ripgrep search failed".to_string()
        } else {
            stderr
        });
    }

    let mut matches = Vec::new();
    for line in String::from_utf8_lossy(&output.stdout).lines() {
        let mut parts = line.splitn(3, ':');
        let relative_path = parts
            .next()
            .unwrap_or_default()
            .trim_start_matches("./")
            .replace('\\', "/");
        let _line_number = parts.next();
        let text = parts.next().unwrap_or_default().trim();

        if relative_path.is_empty() {
            continue;
        }

        matches.push((relative_path, text.to_string()));
    }

    Ok(matches)
}

fn normalize_git_status(raw_status: &str) -> String {
    if raw_status.contains('U') {
        return "conflict".to_string();
    }
    if raw_status == "??" {
        return "untracked".to_string();
    }
    if raw_status.contains('A') {
        return "added".to_string();
    }
    if raw_status.contains('D') {
        return "deleted".to_string();
    }
    if raw_status.contains('R') {
        return "renamed".to_string();
    }
    if raw_status.contains('M') {
        return "modified".to_string();
    }

    "changed".to_string()
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
            search_markdown,
            summarize_space,
            get_git_info,
            clone_repository,
            get_git_statuses,
            get_file_history,
            reveal_in_file_manager,
            open_space_in_terminal,
            export_directory_zip
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
