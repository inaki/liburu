# Local-First Markdown Workspace

## Product Model And Design Direction

This document captures the product definition and design direction for the **minimal, useful** version of the app.

## Product Idea

The strongest direction now is:

> Obsidian-like local-first Markdown workspace for journals, notes, and documentation libraries.

This version does **not** aim to be:

- a GitHub client
- a sync platform
- a remote collaboration product

It should be excellent at:

- local journaling
- reading Markdown across multiple folders
- editing notes
- organizing spaces
- optionally surfacing local git context

## Core Concept

The central object is a **space**.

A space can represent:

- a local notes folder
- a personal journal folder
- a project docs folder
- a local git-aware workspace

The app itself is a **workspace of spaces**.

## User Value

This product should help users:

- write Markdown daily
- keep notes durable and organized
- browse project documentation comfortably
- work across multiple note spaces
- stay local-first

## Design Positioning

The design language should feel:

- calm
- technical
- dependable
- uncluttered
- locally grounded

The visual direction should continue to emphasize:

- compact workspace surfaces
- strong navigation
- note-first reading and writing
- clear local ownership

## UX Model

### Workspace

The app home is a library of connected spaces.

It should show:

- all spaces
- recent notes
- pinned spaces
- bookmarks

### Space

A space has its own:

- explorer
- note list
- editor/preview
- metadata
- optional local git info

### Note

A note is a Markdown document in a space, enriched with:

- headings
- frontmatter
- tags
- bookmarks
- optional local git status

## Space Types

### Personal Journal Space

Characteristics:

- local
- writable
- optimized for daily note creation

### Project Documentation Space

Characteristics:

- local
- folder-based
- useful for reading and editing docs in an existing project

### Notes Library Space

Characteristics:

- local
- Markdown-focused
- useful for long-form notes and research

### Local Git-Aware Space

Characteristics:

- local filesystem first
- shows branch/status/history if the folder is a git repo
- does not depend on remote sync features

## Design Structure

The app should be organized around three levels:

### Level 1: Workspace Shell

Global navigation:

- Home
- Search
- Settings

### Level 2: Space Shell

Per-space navigation:

- Notes
- Bookmarks
- Metadata
- Settings

### Level 3: Note Surface

Working area:

- source
- preview
- split later
- outline
- contextual metadata

## Key UX Principles

### 1. Local-First

Users should feel that their files are theirs.

The app should never feel like:

- a browser tab for remote content
- a thin wrapper around an API

### 2. Git-Aware, Not Git-Dominated

Git concepts should support the workflow, not define the whole UI.

User-facing language should prefer:

- Save
- History
- Workspace
- Journal
- Recent notes

### 3. Reading And Writing Are Equal

This is not just a note editor and not just a viewer.

It should be strong at:

- reading project docs
- writing personal notes
- moving between spaces fluidly

### 4. Multi-Space Is Native

The app should not assume one folder forever.

Users should be able to move between:

- their journal
- a project notes folder
- a docs folder
- a research folder

without losing context.

## Screen Direction

### Workspace Home

Should feel like a library dashboard.

Needs:

- spaces grid/list
- recent notes
- quick add

### Space Overview

Should feel like entering a focused note environment.

Needs:

- space identity
- note counts
- recent notes in space
- top folders or collections

### Note Workspace

Should be the main workbench.

Needs:

- explorer
- content area
- outline / metadata rail

## Why This Is Distinct

Compared with traditional Markdown viewers:

- it is multi-space
- it is journaling-friendly
- it treats folders as a workspace, not just a file picker

Compared with Obsidian:

- it stays closer to folder/project workflows
- it is simpler
- it can surface local git context without trying to become a sync platform

## Product Summary

The product should be framed as:

**A local-first Markdown workspace for journals, notes, and documentation libraries.**

That is the clearest direction for the system right now.
