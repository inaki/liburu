<p align="center">
  <img src="./assets/logo-small.svg" alt="Liburu logo" width="84" />
</p>

# Liburu

<p align="center">
  <a href="https://inaki.github.io/liburu/">Website</a> ·
  <a href="https://github.com/inaki/liburu/releases">Releases</a> ·
  <a href="https://github.com/inaki/liburu/releases/latest/download/Liburu-macOS.zip">Download macOS ZIP</a>
</p>

A lightweight desktop app for browsing Markdown documentation inside real project folders.

Built with `Tauri 2`, `React`, and `TypeScript`, this app lets you select a local root directory, recursively discover Markdown files, and read them in a clean, developer-focused interface with GitHub-flavored rendering and syntax highlighting.

## Why This Exists

Most Markdown viewers are optimized for single files, editors, or browser tabs. This project is optimized for a different workflow:

- open a project folder
- scan everything recursively
- browse docs like a file explorer
- preview Markdown quickly without leaving a lightweight desktop app

It is designed for documentation-heavy repos, notes folders, internal playbooks, specs, changelogs, and any project where Markdown is part of the working surface.

## What It Does

- Select a local root folder with a native dialog
- Recursively scan subdirectories for `.md` and `.markdown` files
- Browse files in a structured explorer
- Render Markdown with GitHub-flavored features
- Highlight fenced code blocks
- Switch between preview mode and source mode
- Bookmark files
- Persist recent projects locally
- Auto-refresh the current project on an interval
- Show a table of contents for heading-based navigation
- Export raw Markdown files
- Toggle app settings like light/dark theme and source wrapping

## Current Stack

- `Tauri 2`
- `React 19`
- `TypeScript`
- `Vite`
- `react-markdown`
- `remark-gfm`
- `highlight.js`
- `lucide-react`

## Screens

The repo includes design exploration assets under [`design/`](./design), and the current app implements that general visual direction in code.

## Getting Started

### Prerequisites

You will need:

- `Node.js` 20+
- `npm`
- `Rust`
- Tauri system prerequisites for your OS

If you have not used Tauri before, make sure your local machine can build Tauri desktop apps first.

### Install

```bash
npm install
```

### Run In Development

```bash
npm run tauri dev
```

This launches the desktop app with the Vite frontend and live reload.

### Build The App

```bash
npm run tauri build
```

For local macOS release builds, the generated app bundle is written under:

```bash
src-tauri/target/release/bundle/macos/
```

## macOS Release Distribution

If you want to share the app through GitHub Releases without joining the Apple Developer Program yet, the practical release artifact is a zipped `.app`.

Current macOS release artifacts:

```bash
dist-release/Liburu-macOS.zip
```

### Recommended GitHub Release Upload

Upload:

- `Liburu-macOS.zip`

This is the easiest unsigned macOS artifact for users to download and install.

### Unsigned macOS Notice

This app is currently:

- unsigned
- not notarized

That means macOS will show a security warning on first launch.

### First Launch Instructions For Users

1. Download `Liburu-macOS-vX.X.X.dmg`
2. Open the DMG and drag `Liburu.app` into `Applications`
3. Try to open Liburu — macOS will block it on first launch
4. Open **System Settings → Privacy & Security** and scroll to the bottom
5. Click **Open Anyway** next to the Liburu entry
6. Enter your password and confirm

After the first successful launch, users can open it normally.

### Why This Happens

GitHub Releases are fine for distributing the app, but without Apple code signing and notarization macOS Gatekeeper treats it as an unverified application.

You do **not** need the Apple Developer Program to publish the app publicly.
You **do** need it later if you want:

- proper code signing
- notarization
- a smoother install/open experience for end users

## Project Structure

```text
.
├── src/                 # React UI
├── src-tauri/           # Tauri + Rust backend
├── design/              # Design exploration assets and references
├── package.json
└── vite.config.ts
```

## Security Model

This app is local-first.

- Directory selection happens through the native file picker
- Markdown discovery is performed in Rust
- File reads are constrained to the currently selected root
- Paths are canonicalized before access
- The app refuses to read files outside the chosen root

## Implemented Features

- Native folder selection
- Recursive Markdown scan
- Safe file read command
- Keyboard-friendly explorer navigation
- Independent sidebar/content scrolling
- Preview/source toggle
- Bookmarks
- Recent projects
- Light and dark themes
- Settings modal
- Table of contents panel
- Resizable explorer column

## Roadmap Ideas

- Per-project saved preferences
- Native filesystem watching instead of interval refresh
- Full-text search across Markdown content
- Better export formats
- Packaging polish for all desktop targets
- Signed and notarized macOS builds later
- Stronger accessibility pass
- Optional multi-root workspace support

## Development Notes

This repository intentionally keeps the frontend lightweight and avoids pulling in a large component framework. Most of the UI is custom and theme-driven.

If you want to customize the app:

- explorer and shell layout: [`src/App.tsx`](./src/App.tsx)
- Markdown rendering: [`src/MarkdownPreview.tsx`](./src/MarkdownPreview.tsx)
- visual system and theming: [`src/styles.css`](./src/styles.css)
- backend commands: [`src-tauri/src/lib.rs`](./src-tauri/src/lib.rs)

## Status

This project is functional and already useful, but still early-stage. Expect ongoing UI refinement and feature polish.

## License

No license file is included yet.

If you plan to publish this publicly, add a license before distribution.
