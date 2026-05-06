# Local-First Markdown Workspace

## Implementation Backlog For This Repo

This document converts the product direction into a practical implementation backlog for the current codebase.

It assumes the project remains:

- local-first
- multi-space
- Markdown-focused
- source-editing-first
- optionally git-aware only at the local level

It does **not** include:

- GitHub auth
- remote sync
- repo permissions
- conflict handling

## Current Baseline

The app already has:

- Tauri shell
- local directory selection
- recursive Markdown scan
- Markdown preview
- source/preview mode
- bookmarks
- recent roots
- settings modal
- table of contents
- multi-pane workspace UI

What it does **not** have yet:

- true multi-space home model
- persistent space registry
- note editing and save
- note create/rename/delete
- global search
- journaling flows
- local git-awareness

## Recommended Module Direction

The app is starting to outgrow a single `App.tsx`.

Recommended future structure:

```text
src/
├── app/
│   ├── state/
│   ├── models/
│   └── persistence/
├── features/
│   ├── spaces/
│   ├── notes/
│   ├── search/
│   ├── settings/
│   ├── journal/
│   └── git/
├── components/
├── lib/
├── App.tsx
└── MarkdownPreview.tsx
```

### Suggested responsibility split

- `features/spaces`: space registry, space switching, onboarding local folders
- `features/notes`: open note, edit note, save note, note file operations
- `features/search`: indexing state and search UI
- `features/settings`: app settings and per-space settings
- `features/journal`: daily notes, templates, journal helpers
- `features/git`: optional local repo detection and status metadata

## Milestone 1: Space Model

### Goal

Replace the single-root mental model with a real workspace/space model.

### User outcome

The user can manage multiple spaces instead of only re-opening one folder at a time.

### Tasks

1. Introduce a `Space` model in frontend state
   Suggested fields:
   - `id`
   - `name`
   - `localPath`
   - `kind`
   - `lastOpenedAt`
   - `lastIndexedAt`

2. Introduce a `WorkspaceState`
   Suggested fields:
   - `spaces[]`
   - `activeSpaceId`
   - `recentNoteIds[]`
   - `bookmarks[]`

3. Replace `recent roots` with `spaces`
   Current recent-roots UI can become the first version of a space registry.

4. Add “Add Space” flow
   For now:
   - local folder only
   - create journal folder later

5. Add active space switching
   Selecting a space should trigger scan/index for that space.

### Code areas

- [src/App.tsx](/Users/inaki/repos/journal/src/App.tsx)
- new:
  - `src/features/spaces/models.ts`
  - `src/features/spaces/useSpaces.ts`
  - `src/features/spaces/storage.ts`

### Notes

This is the most important refactor. Do this before adding more features.

## Milestone 2: Persistent Workspace Registry

### Goal

Persist spaces and active selection in a cleaner way than ad hoc localStorage keys.

### User outcome

The app reopens into a stable workspace instead of feeling stateless between launches.

### Tasks

1. Create a single persisted app state entry
   Example:
   - `md-project-viewer:workspace`

2. Migrate old keys if needed
   Existing:
   - bookmarks
   - recent roots
   - settings

3. Persist:
   - spaces
   - active space
   - bookmarks
   - UI settings

### Code areas

- `src/app/persistence/workspaceStorage.ts`
- `src/features/spaces/storage.ts`

## Milestone 3: Note Editing And Save

### Goal

Turn the viewer into a usable local writing surface.

### User outcome

Users can edit Markdown notes and save them back to disk.

### Tasks

1. Add a writable source editor
   Start with a plain textarea or code editor surface.

2. Add save command in Rust
   Proposed backend command:
   - `write_md_file(path, content)`

3. Track dirty state
   Show:
   - clean
   - modified
   - saving
   - save error

4. Add keyboard shortcut
   - `Cmd/Ctrl + S`

5. Preserve current preview mode
   Preview should rerender after save.

### Code areas

- [src-tauri/src/lib.rs](/Users/inaki/repos/journal/src-tauri/src/lib.rs)
- `src/features/notes/useNoteEditor.ts`
- `src/features/notes/NoteEditor.tsx`
- `src/App.tsx`

### Rust tasks

Add safe write support:

- canonicalize file path
- confirm path stays inside active space root
- only allow `.md` and `.markdown`
- write file contents safely

## Milestone 4: Note File Operations

### Goal

Support real note management.

### User outcome

Users can create, rename, move, and delete notes.

### Tasks

1. Create note
   - blank note
   - optional folder target

2. Rename note
   - preserve selection
   - refresh tree

3. Delete note
   - confirm destructive action

4. Move note
   - later if needed

### Proposed backend commands

- `create_md_file`
- `rename_md_file`
- `delete_md_file`

### Code areas

- [src-tauri/src/lib.rs](/Users/inaki/repos/journal/src-tauri/src/lib.rs)
- `src/features/notes/fileActions.ts`
- `src/features/notes/NewNoteModal.tsx`

## Milestone 5: Global Search

### Goal

Make the multi-space model useful at scale.

### User outcome

Users can search notes across the current space and later all spaces.

### Tasks

1. Start with in-memory per-space search
   Index:
   - title
   - path
   - raw content

2. Add result grouping
   - current space
   - by folder

3. Add global workspace search later

4. Support filters:
   - bookmarks
   - current space
   - title only

### Code areas

- `src/features/search/useSearchIndex.ts`
- `src/features/search/SearchPanel.tsx`
- `src/features/search/searchTypes.ts`

## Milestone 6: Journal Flows

### Goal

Make the app genuinely good for personal journaling.

### User outcome

Users can create daily notes quickly and keep journal spaces organized.

### Tasks

1. Create `New Daily Note`
   Naming suggestions:
   - `YYYY-MM-DD.md`
   - `journal/YYYY/MM/YYYY-MM-DD.md`

2. Add simple template support
   For example:
   - title
   - date
   - prompts

3. Add journal-space presets
   When creating a space:
   - `Journal`
   - `Notes`
   - `Docs`

4. Add “open today’s note”

### Code areas

- `src/features/journal/templates.ts`
- `src/features/journal/dailyNotes.ts`
- `src/features/journal/spacePresets.ts`

## Milestone 7: Local Git Awareness

### Goal

Add value for project docs folders that already live inside git repos.

### User outcome

Users see useful local git context without introducing remote complexity.

### Tasks

1. Detect whether a space is inside a git repo

2. Surface:
   - current branch
   - modified/untracked note state
   - last commit info for selected note

3. Keep this read-only
   No pull/push.
   No auth.
   No repo onboarding.

### Likely approach

Use local git commands or a Rust git library.

For MVP, shelling out may be simplest if kept scoped and safe.

### Code areas

- `src/features/git/useGitInfo.ts`
- `src/features/git/gitTypes.ts`
- possible Rust additions in [src-tauri/src/lib.rs](/Users/inaki/repos/journal/src-tauri/src/lib.rs)

## Milestone 8: UI Refactor

### Goal

Move from one growing file to maintainable feature modules.

### Tasks

1. Split `App.tsx` into:
   - workspace shell
   - sidebar
   - note workspace
   - settings modal

2. Extract models and hooks

3. Introduce typed view state

4. Reduce cross-cutting UI state in the root component

### Strong recommendation

Do this before Milestone 6 or 7 if `App.tsx` keeps growing quickly.

## Suggested Technical Backlog Order

### Backlog order for actual implementation

1. Space model
2. Persistent workspace registry
3. Note editing and save
4. Note file operations
5. Search
6. Journal flows
7. Local git awareness
8. UI refactor/polish

## Concrete Next Step For This Repo

If implementation starts immediately, the next best coding task is:

### Task 1
Create `Space` and `WorkspaceState` models and move “recent roots” into a real space registry.

Then:

### Task 2
Add note editing and a safe `write_md_file` command in Rust.

Those two tasks unlock the rest of the roadmap.

## Effort Estimate For This Backlog

For one strong engineer:

- Milestone 1: 3 to 5 days
- Milestone 2: 1 to 2 days
- Milestone 3: 3 to 5 days
- Milestone 4: 3 to 5 days
- Milestone 5: 3 to 5 days
- Milestone 6: 2 to 4 days
- Milestone 7: 3 to 5 days
- Milestone 8: ongoing / 2 to 4 days focused

Rough total:

**5 to 8 weeks**

for a polished, local-first, multi-space Markdown workspace MVP.
