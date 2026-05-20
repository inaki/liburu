# CLAUDE.md

This file provides guidance to CLAUDE when working with this repository.

## Project overview

Liburu is a lightweight desktop application for browsing and managing Markdown documentation within project folders. It is designed for developers and teams who work with documentation-heavy repositories, knowledge bases, internal playbooks, and note collections. The app solves the problem of fragmented documentation viewing by providing a single, integrated interface to recursively discover, organize, and read Markdown files from any local directory with syntax highlighting, GitHub-flavored rendering, and persistent bookmarks—eliminating the need to switch between multiple tools or open files individually in an editor.

## Architecture & module map

Liburu is organized as a Tauri desktop application with a clear separation between the backend (Rust) and frontend (React/TypeScript). The system comprises two main deployable units: the Tauri core runtime and the React web interface. The Tauri backend handles system operations like native file dialogs, directory scanning, and file I/O, while the React frontend manages the user interface, state, and Markdown rendering. Both units are developed and bundled together; the build process compiles the Rust backend and packages it with the built React assets into a single distributable desktop application for macOS, Windows, or Linux.

The repository structure is organized as follows:

- **`src/`** — Frontend source code
  - `components/` — React components for the file explorer, Markdown viewer, settings panel, and UI elements
  - `lib/` — Utility functions, hooks, and helper modules for state management and file handling
  - `pages/` — Top-level page or layout components
  - `App.tsx` — Main React application entry point
  - `main.tsx` — React DOM render target

- **`src-tauri/`** — Tauri backend source code
  - `src/` — Rust source files for system operations, file scanning, and IPC command handlers
  - `tauri.conf.json` — Tauri configuration and build settings

- **`public/`** — Static assets served by Vite

- **`design/`** — Design exploration assets and visual direction reference

The frontend communicates with the Tauri backend through the Tauri IPC bridge, invoking Rust commands for operations like opening file dialogs, scanning directories for Markdown files, reading file contents, and managing application state persistence.

## Build / install

Liburu is built with Tauri 2, React, and TypeScript. To set up a working development environment, ensure you have Node.js 20 or later, npm, Rust, and the Tauri system prerequisites for your operating system installed. If you are new to Tauri, verify that your machine can build Tauri applications before proceeding.

Install dependencies and run the development server with these commands:

```bash
npm install
npm run tauri dev
```

The `npm run tauri dev` command launches the desktop app with the Vite frontend and enables live reload during development. To build a production release, use `npm run tauri build`.

## Testing

How to run tests and where they live.

## Code conventions

Liburu follows a consistent structure across its TypeScript and React codebase to ensure maintainability and clarity for all contributors. The frontend is built with React 19 and TypeScript, and uses functional components with hooks as the standard pattern. File naming uses kebab-case for component files and directories, while TypeScript interfaces and types use PascalCase. All exports from modules should be named exports rather than default exports, making it explicit what is being imported and reducing ambiguity across the codebase.

Component files are colocated with their styling and related utilities. Import statements should be organized in the following order: React and external libraries first, then internal components and utilities, then styles. Comments should explain the *why* behind complex logic rather than restating what the code does; use JSDoc comments for exported functions and component props. Keep components focused and single-purpose; extract reusable logic into custom hooks or utility functions rather than duplicating code across multiple components.

```typescript
// Good: named exports, organized imports, clear prop documentation
import React from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useFileNavigation } from '../hooks/useFileNavigation';
import styles from './FileExplorer.module.css';

/**
 * Renders the file tree and handles navigation state.
 * @param rootPath - The root directory path selected by the user
 * @param onSelectFile - Callback fired when a file is selected
 */
export const FileExplorer: React.FC<FileExplorerProps> = ({
  rootPath,
  onSelectFile,
}) => {
  // implementation
};
```

Avoid deep nesting in conditional logic; prefer early returns to keep functions readable. When working with Tauri command invocations, always handle potential errors and provide meaningful feedback to the user. Configuration and constants should be defined in a dedicated `config.ts` or `constants.ts` file rather than scattered throughout the codebase.

## Entry points / key files

Start here to understand the application structure and how the frontend and backend communicate. The entry points below will give you a clear picture of how Liburu initializes, renders its interface, and handles file discovery and Markdown rendering.

- **`src-tauri/src/main.rs`** — The Tauri backend entry point. Initializes the desktop application window, sets up IPC commands, and handles file system operations like directory scanning and Markdown file discovery.
- **`src/main.tsx`** — The React frontend entry point. Bootstraps the React application, mounts the root component, and connects to the Tauri backend via IPC invocations.
- **`src/App.tsx`** — The main application component. Orchestrates the layout with the file explorer sidebar, Markdown preview pane, and settings. This is where top-level state management and routing between different views happens.
- **`src/components/MarkdownRenderer.tsx`** — Renders Markdown content using `react-markdown` with GitHub-flavored extensions and `highlight.js` for syntax highlighting. Core to the preview experience.
- **`src/components/FileExplorer.tsx`** — Displays the recursive directory tree of discovered Markdown files. Handles file selection and navigation within the current project.
- **`vite.config.ts`** — Build configuration for the frontend. Integrates Vite with Tauri, defines output paths, and configures the development server for live reload.

## Common tasks / recipes

The most frequent development tasks in Liburu involve working with the Markdown renderer, file discovery system, and UI components. Here are the core workflows you will encounter when making changes to the application.

**Start the development environment** to test changes with live reload enabled:

```bash
npm install
npm run tauri dev
```

**Add or modify Markdown rendering features** by editing the rendering pipeline in the React components that consume `react-markdown` and `remark-gfm`. The highlighting integration uses `highlight.js` for syntax coloring, so check that module when adjusting code block display.

**Update the file discovery logic** to change how Liburu recursively scans directories for `.md` and `.markdown` files. This logic lives in the Rust backend where the native file system calls are made, and results are passed to the frontend through Tauri's command bridge.

**Adjust the UI theme or layout** by modifying the React components and their styling. Remember that the app supports both light and dark themes, so test changes in both modes. The `lucide-react` icon library provides all interface icons.

**Build a production release** for distribution across macOS, Windows, or Linux:

```bash
npm run tauri build
```

This compiles both the Rust backend and the TypeScript/React frontend into a standalone desktop application for your target platform.

## External APIs & integrations

Liburu has minimal external API dependencies by design, as it operates entirely on local files and does not require authentication or remote service integrations. The application uses the following key outbound libraries and protocols:

**Markdown rendering and processing:**
- `react-markdown` handles Markdown-to-React conversion in the preview pane
- `remark-gfm` extends the parser to support GitHub-flavored Markdown syntax, including tables, strikethrough, and task lists

**Code syntax highlighting:**
- `highlight.js` provides client-side syntax highlighting for fenced code blocks across multiple programming languages

**UI and icon rendering:**
- `lucide-react` supplies a lightweight icon library used throughout the interface for file explorers, navigation, and toolbar buttons

**Local file system access:**
The Tauri backend exposes file system operations through secure IPC commands, allowing the React frontend to read directory structures and Markdown file contents from the user's local machine. These operations are sandboxed by Tauri's security model and do not connect to external services.

**No credentials or authentication:**
Liburu does not require API keys, user accounts, or remote authentication. All functionality operates on user-selected local directories and persists data (recent projects, bookmarks, preferences) to the local filesystem via Tauri's storage APIs.

## Directory structure

The repository is organized as a Tauri desktop application with frontend and backend code separated into distinct directories. Each top-level folder serves a specific purpose in the development and build process. The structure supports both local development with live reload and production builds for macOS, Windows, and Linux.

```
liburu/
├── src/                    React frontend source code and components
├── src-tauri/              Tauri backend Rust code and configuration
├── design/                 Design exploration assets and visual direction
├── assets/                 Images, logos, and static application resources
├── public/                 Static files served by the development server
├── dist/                   Built frontend assets (generated during build)
├── node_modules/           npm dependencies (generated after install)
└── package.json            npm configuration and scripts
```

The `src/` directory contains all React and TypeScript code for the user interface, including components, pages, utilities, and hooks. The `src-tauri/` directory houses the Rust backend that handles native system operations, file I/O, and inter-process communication between the frontend and the operating system. The `design/` folder preserves design exploration work that informed the current visual implementation. During development, `npm run tauri dev` watches both directories and hot-reloads changes; during production builds, `npm run tauri build` compiles the Rust backend and bundles it with the optimized frontend assets into platform-specific installers.

## Deployment / ops

Liburu is distributed as a compiled desktop application binary for macOS, Windows, and Linux. The build pipeline is triggered locally using npm scripts and Tauri's CLI, which orchestrates both the Rust backend compilation and React frontend bundling before packaging the final application artifact.

To build a production release, run the following command from the repository root:

```bash
npm run tauri build
```

This command compiles the Rust backend with optimizations, bundles the React frontend assets, and generates platform-specific installers and portable binaries in the `src-tauri/target/release/bundle/` directory. Each platform produces its own output format: macOS generates `.dmg` and `.app` bundles, Windows produces `.msi` and portable `.exe` files, and Linux generates `.deb` and `.AppImage` formats.

Development builds are created with `npm run tauri dev`, which launches the app with live reload enabled for both the frontend and backend during active development. There is no separate staging environment; the application runs locally on the developer's machine before release builds are created. Releases are published manually by uploading compiled binaries to the GitHub Releases page, where users can download pre-built versions for their operating system.
