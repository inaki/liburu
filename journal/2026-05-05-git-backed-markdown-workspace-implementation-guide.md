# Local-First Markdown Workspace

## Implementation Guide

This document defines the implementation direction for a **minimal and useful** version of the product.

The project should evolve into a:

**local-first Markdown workspace for journals, notes, and project documentation**

Not a GitHub client.
Not a sync engine.
Not a collaboration platform.

## Scope

We are intentionally keeping the product focused on:

- multiple local spaces
- journaling
- reading and editing Markdown
- optional local git awareness
- strong workspace UX

We are intentionally excluding from the current plan:

- GitHub auth
- writable/read-only remote repo modes
- pull/push sync
- conflict handling

## Product Goal

Build a desktop app where a user can organize multiple Markdown spaces such as:

- a personal journal
- a notes folder
- a project docs folder
- a local git-aware repository on disk

Each space is local.
The app reads and writes local files directly.

## Core Product Definition

A good short definition:

> A local-first Markdown workspace for journals, notes, and documentation libraries.

## Architectural Direction

### Source of Truth

The source of truth is always the **local filesystem**.

That means:

- spaces are local folders
- notes are Markdown files on disk
- the UI reads local files
- saving writes back to local files
- git awareness is optional and local only

### Storage Layers

Recommended layers:

1. **Filesystem layer**
   Markdown files and assets on disk.

2. **Local git-awareness layer**
   Optional branch/status/history information for folders that are already git repos.

3. **Index layer**
   Parsed metadata:
   - headings
   - tags
   - frontmatter
   - bookmarks
   - recent notes
   - search index

4. **Preferences/settings layer**
   App settings, per-space settings, and UI state.

## Domain Model

### Workspace

The app contains one workspace that holds many spaces.

Fields:

- `id`
- `name`
- `createdAt`
- `updatedAt`
- `spaces[]`
- `preferences`

Responsibilities:

- global search
- recent notes
- bookmarks
- workspace overview

### Space

A space is the main user-facing unit.

Kinds:

- `local`
- `git`

Fields:

- `id`
- `name`
- `slug`
- `kind`
- `localPath`
- `currentBranch?`
- `status`
- `lastIndexedAt?`

Responsibilities:

- file tree
- folder identity
- note organization
- local git metadata if available

### Note

A note is a Markdown file inside a space.

Fields:

- `id`
- `spaceId`
- `path`
- `name`
- `title`
- `content?`
- `excerpt?`
- `headings[]`
- `tags[]`
- `frontmatter`
- `createdAt?`
- `updatedAt?`
- `lastViewedAt?`
- `wordCount?`
- `gitStatus?`

## Recommended Screen Set

### 1. Workspace Home

Purpose:
show all spaces and recent activity.

Content:

- spaces
- pinned spaces
- recent notes
- bookmarks

Primary actions:

- add space
- create journal
- search

### 2. Space Overview

Purpose:
entry screen for a connected space.

Content:

- note count
- recent notes in the space
- top folders or categories
- optional branch/status if local git is detected

### 3. Note Workspace

Purpose:
main working surface for reading and writing.

Layout:

- explorer on the left
- editor/preview in the center
- outline/metadata on the right

Modes:

- preview
- source
- split later

### 4. Global Search

Purpose:
search across spaces.

Filters:

- current space
- all spaces
- title
- content
- tags
- bookmarked

### 5. Add Space Flow

Purpose:
onboard local folders only.

Options:

- open local folder
- create journal folder
- add local git-aware folder

### 6. Settings

Split into:

- app settings
- per-space settings

## User Flows

### Flow A: Add a Personal Journal Space

1. Open app
2. Click `Add Space`
3. Choose `Journal Space`
4. Create or pick a local folder
5. Index notes
6. Land in the new space
7. Create the first note

### Flow B: Add a Local Project Folder

1. Click `Add Space`
2. Choose `Local Folder`
3. Pick a folder
4. Index Markdown files
5. Browse and edit notes

### Flow C: Edit a Note

1. Open a space
2. Select a note
3. Edit source
4. Save locally
5. Update note metadata and recent activity

## MVP Roadmap

### Phase 1: Multi-Space Local Workspace

Ship:

- workspace home
- multiple connected spaces
- space switching
- local-only spaces
- bookmarks
- recent notes

### Phase 2: Writing Surface

Ship:

- source editing
- save to disk
- create note
- rename note
- delete note
- templates and daily notes

### Phase 3: Local Git Awareness

Ship:

- branch display
- changed/untracked state
- last commit metadata
- simple history hooks

### Phase 4: Search And Journal Polish

Ship:

- global search
- stronger indexing
- frontmatter support
- tag filters
- workspace polish

## UX Principles

### Local-First

Users should feel:

- their files are local
- their folders are theirs
- the app is predictable

### Git-Aware, Not Git-Centric

If git is present locally, surface helpful metadata.
Do not turn the app into a git console.

### One Content Model

Journal notes, project notes, and docs should all use the same internal note model.

## Hard Problems To Plan Early

### Search

Need indexing, not repeated full rescans for every search.

### Large Folders

Need include/exclude path rules and indexing boundaries.

### State Model

Once there are many spaces, recent notes, bookmarks, and per-space settings, the app needs a stronger internal app model than a single-screen state blob.

## Recommended Implementation Order

1. refactor current app into workspace + space model
2. add local note editing
3. add local git awareness
4. add search/indexing improvements
5. add journaling templates and polish

## Short Version

The right implementation strategy is:

- multi-space workspace model
- local folders as the content source
- note editor + reader as the central surface
- optional local git awareness as an enhancement

That keeps the product coherent, useful, and buildable.
