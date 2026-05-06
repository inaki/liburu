import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import clsx from "clsx";
import {
  Bookmark,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  FilePlus2,
  Folder,
  HelpCircle,
  Info,
  LayoutGrid,
  Pencil,
  PencilLine,
  PenTool,
  Printer,
  RefreshCw,
  Search,
  Settings,
  Star,
  Trash2,
  UserCircle2,
} from "lucide-react";
import { CloneDialog } from "./components/CloneDialog";
import { DocumentWorkspace } from "./components/DocumentWorkspace";
import { NoteDialog } from "./components/NoteDialog";
import { SecondarySidebar } from "./components/SecondarySidebar";
import { SettingsDialog } from "./components/SettingsDialog";
import { Topbar } from "./components/Topbar";
import { WorkspaceHome } from "./components/WorkspaceHome";
import { WorkspaceSearchView } from "./components/WorkspaceSearchView";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/ui/tooltip";
import { useWorkspace } from "./features/spaces/useWorkspace";
import { DEFAULT_SPACE_EXCLUDES, getSpaceLabel, normalizeExcludePaths } from "./features/spaces/storage";

type MdFile = {
  path: string;
  name: string;
  relative_path: string;
};

type TreeNode = {
  id: string;
  name: string;
  path: string;
  kind: "directory" | "file";
  children: TreeNode[];
};

type VisibleTreeRow = {
  id: string;
  name: string;
  path: string;
  kind: "directory" | "file";
  depth: number;
  isExpanded: boolean;
};

type HeadingItem = {
  id: string;
  label: string;
  level: number;
};

type SearchResult = {
  path: string;
  name: string;
  relative_path: string;
  snippet: string;
  matched_on_path: boolean;
};

type WorkspaceSearchGroup = {
  spaceId: string;
  spaceName: string;
  localPath: string;
  results: SearchResult[];
};

type GitRepoInfo = {
  is_repo: boolean;
  branch: string | null;
  remote_url: string | null;
};

type GitFileStatus = {
  relative_path: string;
  status: string;
};

type GitFileHistoryEntry = {
  commit_hash: string;
  short_hash: string;
  author_name: string;
  committed_at: string;
  summary: string;
};

type RecentNote = {
  path: string;
  relativePath: string;
  spaceId: string;
  spaceName: string;
  openedAt: string;
};

type AppSettings = {
  theme: "dark" | "light";
  brandLogoDataUrl: string;
  showToc: boolean;
  sourceWrap: boolean;
  autosave: boolean;
  autoRefreshMs: number;
  toolbar: {
    save: boolean;
    createNote: boolean;
    createJournal: boolean;
    rename: boolean;
    editMode: boolean;
    print: boolean;
    download: boolean;
    metadata: boolean;
    delete: boolean;
    bookmark: boolean;
    settings: boolean;
  };
};

type FrontmatterData = {
  title?: string;
  date?: string;
  tags: string[];
  status?: string;
  template?: string;
};

type TemplateKind = "note" | "journal" | "idea" | "meeting";

type NoteDialogMode = "create" | "journal" | "rename";

type NoteDialogState =
  | {
      mode: NoteDialogMode;
      template: TemplateKind;
      title: string;
      description: string;
      confirmLabel: string;
      initialPath: string;
    }
  | null;

type SpaceSummary = {
  note_count: number;
  latest_modified_at: string | null;
};

type CloneDialogState = {
  repoUrl: string;
  destinationParent: string;
  directoryName: string;
};

type CloneResult = {
  path: string;
  name: string;
};

type WorkspaceSearchScope = "all" | "current";

const BOOKMARKS_KEY = "md-project-viewer:bookmarks";
const RECENT_NOTES_KEY = "md-project-viewer:recent-notes";
const SETTINGS_KEY = "md-project-viewer:settings";
const AUTO_REFRESH_MS = 4000;
const MAX_RECENT_NOTES = 8;
const RAIL_WIDTH = 80;
const SIDEBAR_WIDTH = 350;
const DEFAULT_SETTINGS: AppSettings = {
  theme: "light",
  brandLogoDataUrl: "",
  showToc: true,
  sourceWrap: true,
  autosave: false,
  autoRefreshMs: AUTO_REFRESH_MS,
  toolbar: {
    save: true,
    createNote: true,
    createJournal: true,
    rename: true,
    editMode: true,
    print: true,
    download: true,
    metadata: true,
    delete: true,
    bookmark: true,
    settings: true
  }
};

const TOOLBAR_ITEM_OPTIONS: Array<{
  key: keyof AppSettings["toolbar"];
  label: string;
  description: string;
  icon: typeof FileText;
}> = [
  { key: "save", label: "Save", description: "Save or show current save state.", icon: FileText },
  { key: "createNote", label: "New Note", description: "Create a new markdown note.", icon: FilePlus2 },
  { key: "createJournal", label: "Journal", description: "Create a journal entry.", icon: CalendarDays },
  { key: "rename", label: "Rename", description: "Rename the current note.", icon: PencilLine },
  { key: "editMode", label: "Preview/Source", description: "Toggle between preview and source quickly.", icon: Pencil },
  { key: "print", label: "Print", description: "Print the current document.", icon: Printer },
  { key: "download", label: "Download", description: "Export the current markdown file.", icon: Download },
  { key: "metadata", label: "Metadata", description: "Toggle the document metadata panel.", icon: Info },
  { key: "delete", label: "Delete", description: "Delete the current note.", icon: Trash2 },
  { key: "bookmark", label: "Bookmark", description: "Bookmark the current note.", icon: Star },
  { key: "settings", label: "Toolbar Settings", description: "Open settings from the toolbar.", icon: Settings }
];

const EMPTY_ROOT: TreeNode = {
  id: "root",
  name: "Project",
  path: "",
  kind: "directory",
  children: []
};

function getGitStatusBadgeClass(status: string) {
  return clsx(
    "ml-auto whitespace-nowrap rounded-full px-[7px] py-[3px] text-[0.67rem] font-bold uppercase tracking-[0.04em]",
    (status === "modified" || status === "changed") && "bg-amber-500/15 text-amber-600",
    (status === "untracked" || status === "added") && "bg-emerald-500/15 text-emerald-600",
    (status === "deleted" || status === "conflict") && "bg-red-500/15 text-red-600",
    status === "renamed" && "bg-indigo-500/15 text-[color:var(--indigo-soft)]"
  );
}

const railButtonClassName =
  "grid h-[42px] w-[42px] place-items-center rounded-[6px] bg-transparent text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--surface-highest)] hover:text-[color:var(--text)]";

function formatTodayPath(date = new Date()) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `journal/${year}/${month}/${year}-${month}-${day}.md`;
}

function splitNotePath(path: string) {
  const normalized = path.trim().replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length === 0) {
    return { directory: "", name: "" };
  }

  const name = parts.pop() ?? "";
  return {
    directory: parts.join("/"),
    name
  };
}

function joinNotePath(directory: string, name: string) {
  const normalizedDirectory = directory.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const normalizedName = name.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalizedDirectory) {
    return normalizedName;
  }

  return normalizedName ? `${normalizedDirectory}/${normalizedName}` : normalizedDirectory;
}

function getParentDirectory(path: string | null | undefined) {
  if (!path) {
    return "";
  }

  const normalized = path.replace(/\\/g, "/").replace(/\/+$/g, "");
  const index = normalized.lastIndexOf("/");
  return index === -1 ? "" : normalized.slice(0, index);
}

function listDirectoryOptions(files: MdFile[]) {
  const directories = new Set<string>(["", "notes", "journal", "notes/ideas", "notes/meetings"]);

  for (const file of files) {
    const segments = file.relative_path.split("/").filter(Boolean);
    segments.pop();
    let current = "";
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      directories.add(current);
    }
  }

  return Array.from(directories).sort((left, right) => left.localeCompare(right));
}

function highlightParts(text: string, query: string) {
  const needle = query.trim();
  if (!needle) {
    return [{ text, match: false }];
  }

  const lower = text.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  const parts: Array<{ text: string; match: boolean }> = [];
  let cursor = 0;

  while (cursor < text.length) {
    const index = lower.indexOf(lowerNeedle, cursor);
    if (index === -1) {
      parts.push({ text: text.slice(cursor), match: false });
      break;
    }

    if (index > cursor) {
      parts.push({ text: text.slice(cursor, index), match: false });
    }

    parts.push({ text: text.slice(index, index + needle.length), match: true });
    cursor = index + needle.length;
  }

  return parts.filter((part) => part.text.length > 0);
}

function prettifyNoteTitle(path: string) {
  return (
    path
      .split("/")
      .filter(Boolean)
      .pop()
      ?.replace(/\.(md|markdown)$/i, "")
      .replace(/[-_]+/g, " ") || "Untitled"
  );
}

function formatIsoDate(date = new Date()) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildNoteTemplate(path: string) {
  const title = prettifyNoteTitle(path);
  const today = formatIsoDate();

  return `---
title: ${title}
created: ${today}
tags: []
template: note
---

# ${title}

`;
}

function buildJournalTemplate(path: string) {
  const title = prettifyNoteTitle(path);
  const today = formatIsoDate();

  return `---
title: ${title}
date: ${today}
tags: [journal]
status: active
template: journal
---

# ${title}

## Notes

## Wins

## Next

`;
}

function formatExcludePathsInput(value: string) {
  return normalizeExcludePaths(
    value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function buildIdeaTemplate(path: string) {
  const title = prettifyNoteTitle(path);
  const today = formatIsoDate();

  return `---
title: ${title}
created: ${today}
tags: [idea]
template: idea
---

# ${title}

## Problem

## Approach

## Open Questions

`;
}

function buildMeetingTemplate(path: string) {
  const title = prettifyNoteTitle(path);
  const today = formatIsoDate();

  return `---
title: ${title}
date: ${today}
tags: [meeting]
template: meeting
---

# ${title}

## Attendees

## Agenda

## Decisions

## Follow-ups

`;
}

function parseFrontmatter(content: string): FrontmatterData {
  if (!content.startsWith("---\n")) {
    return { tags: [] };
  }

  const endIndex = content.indexOf("\n---\n", 4);
  if (endIndex === -1) {
    return { tags: [] };
  }

  const raw = content.slice(4, endIndex);
  const data: FrontmatterData = { tags: [] };

  for (const line of raw.split("\n")) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (key === "tags") {
      const normalized = value.replace(/^\[/, "").replace(/\]$/, "");
      data.tags = normalized
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      continue;
    }

    if (key === "title") data.title = value;
    if (key === "date") data.date = value;
    if (key === "status") data.status = value;
    if (key === "template") data.template = value;
  }

  return data;
}

function buildTree(files: MdFile[]): TreeNode {
  const root: TreeNode = { ...EMPTY_ROOT, children: [] };

  for (const file of files) {
    const parts = file.relative_path.split("/").filter(Boolean);
    let cursor = root;

    parts.forEach((part, index) => {
      const joinedPath = parts.slice(0, index + 1).join("/");
      const isFile = index === parts.length - 1;
      const existing = cursor.children.find((child) => child.path === joinedPath);

      if (existing) {
        cursor = existing;
        return;
      }

      const nextNode: TreeNode = {
        id: joinedPath,
        name: part,
        path: joinedPath,
        kind: isFile ? "file" : "directory",
        children: []
      };

      cursor.children.push(nextNode);
      cursor.children.sort((left, right) => {
        if (left.kind !== right.kind) {
          return left.kind === "directory" ? -1 : 1;
        }
        return left.name.localeCompare(right.name);
      });
      cursor = nextNode;
    });
  }

  return root;
}

function collectMatches(node: TreeNode, query: string): boolean {
  if (!query) {
    return true;
  }

  if (node.kind === "file") {
    return node.path.toLowerCase().includes(query);
  }

  return node.children.some((child) => collectMatches(child, query));
}

function flattenVisibleTree(
  node: TreeNode,
  expanded: Set<string>,
  query: string,
  depth = 0
): VisibleTreeRow[] {
  const rows: VisibleTreeRow[] = [];

  for (const child of node.children) {
    if (!collectMatches(child, query)) {
      continue;
    }

    const isExpanded = expanded.has(child.path);
    rows.push({
      id: child.id,
      name: child.name,
      path: child.path,
      kind: child.kind,
      depth,
      isExpanded
    });

    if (child.kind === "directory" && isExpanded) {
      rows.push(...flattenVisibleTree(child, expanded, query, depth + 1));
    }
  }

  return rows;
}

function makeHeadingId(label: string) {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function extractHeadings(content: string): HeadingItem[] {
  const headings = content
    .split("\n")
    .map((line) => /^(#{1,3})\s+(.+)$/.exec(line))
    .filter((match): match is RegExpExecArray => Boolean(match))
    .map((match) => ({
      id: makeHeadingId(match[2]),
      label: match[2].trim(),
      level: match[1].length
    }));

  const seen = new Map<string, number>();
  return headings.map((heading) => {
    const count = seen.get(heading.id) ?? 0;
    seen.set(heading.id, count + 1);
    return {
      ...heading,
      id: count === 0 ? heading.id : `${heading.id}-${count + 1}`
    };
  });
}

type TreeProps = {
  rows: VisibleTreeRow[];
  gitStatuses: Record<string, string>;
  dirtyPath: string | null;
  expanded: Set<string>;
  selectedPath: string | null;
  focusedPath: string | null;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  onFocus: (path: string) => void;
  onCreateInDirectory: (path: string) => void;
  onCreateJournalInDirectory: (path: string) => void;
};

function TreeBranch({
  rows,
  gitStatuses,
  dirtyPath,
  expanded,
  selectedPath,
  focusedPath,
  onToggle,
  onSelect,
  onFocus,
  onCreateInDirectory,
  onCreateJournalInDirectory
}: TreeProps) {
  return (
    <>
      {rows.map((row) => {
        const isSelected = selectedPath === row.path;
        const isFocused = focusedPath === row.path;
        const isDirty = dirtyPath === row.path;
        const indent = { paddingLeft: `${row.depth * 18 + 14}px` };
        const rowClassName = clsx(
          "group flex min-h-[var(--row-height)] w-full items-center gap-2.5 rounded-r-[6px] bg-transparent px-[var(--panel-padding)] py-1.5 text-left text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--surface-high)] hover:text-[color:var(--text)]",
          isFocused && "bg-[color:var(--surface-high)] text-[color:var(--text)]",
          isSelected &&
            "bg-[color:color-mix(in_srgb,var(--surface-highest)_88%,transparent)] text-[color:var(--text)] shadow-[inset_2px_0_0_var(--indigo)]"
        );

        if (row.kind === "directory") {
          return (
            <div
              key={row.id}
              role="button"
              tabIndex={-1}
              className={rowClassName}
              style={indent}
              onClick={() => {
                onFocus(row.path);
                onToggle(row.path);
              }}
            >
              {expanded.has(row.path) ? (
                <ChevronDown className="icon h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
              ) : (
                <ChevronRight className="icon h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
              )}
              <Folder className="icon h-4 w-4 shrink-0 text-[color:var(--indigo-soft)]" />
              <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{row.name}</span>
              <span
                className={clsx(
                  "ml-auto inline-flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100",
                  isFocused && "opacity-100"
                )}
              >
                <button
                  type="button"
                  className="grid h-6 w-6 place-items-center rounded-[6px] bg-transparent text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--surface-highest)] hover:text-[color:var(--text)]"
                  aria-label="Create note in folder"
                  onClick={(event) => {
                    event.stopPropagation();
                    onCreateInDirectory(row.path);
                  }}
                >
                  <FilePlus2 className="icon h-[0.85rem] w-[0.85rem]" />
                </button>
                {row.path === "journal" || row.path.startsWith("journal/") ? (
                  <button
                    type="button"
                    className="grid h-6 w-6 place-items-center rounded-[6px] bg-transparent text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--surface-highest)] hover:text-[color:var(--text)]"
                    aria-label="Create journal entry in folder"
                    onClick={(event) => {
                      event.stopPropagation();
                      onCreateJournalInDirectory(row.path);
                    }}
                  >
                    <CalendarDays className="icon h-[0.85rem] w-[0.85rem]" />
                  </button>
                ) : null}
              </span>
            </div>
          );
        }

        return (
          <button
            key={row.id}
            type="button"
            className={rowClassName}
            style={indent}
            onClick={() => {
              onFocus(row.path);
              onSelect(row.path);
            }}
          >
            <span className="h-4 w-4 shrink-0" />
            <FileText className="icon h-4 w-4 shrink-0 text-[color:var(--indigo-soft)]" />
            <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">{row.name}</span>
            {isDirty ? (
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-[color:var(--indigo-soft)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--indigo-soft)_20%,transparent)]"
                aria-label="Unsaved changes"
              />
            ) : null}
            {gitStatuses[row.path] ? (
              <span className={getGitStatusBadgeClass(gitStatuses[row.path])}>{gitStatuses[row.path]}</span>
            ) : null}
          </button>
        );
      })}
    </>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState<"home" | "space" | "search">("home");
  const [rootPath, setRootPath] = useState("");
  const [files, setFiles] = useState<MdFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<MdFile | null>(null);
  const [content, setContent] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [workspaceSearchQuery, setWorkspaceSearchQuery] = useState("");
  const [workspaceSearchScope, setWorkspaceSearchScope] = useState<WorkspaceSearchScope>("all");
  const [workspaceSearchBookmarksOnly, setWorkspaceSearchBookmarksOnly] = useState(false);
  const [workspaceSearchGroups, setWorkspaceSearchGroups] = useState<WorkspaceSearchGroup[]>([]);
  const [isWorkspaceSearching, setIsWorkspaceSearching] = useState(false);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [openingSpacePath, setOpeningSpacePath] = useState<string | null>(null);
  const [openingRecentNoteKey, setOpeningRecentNoteKey] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isSavingFile, setIsSavingFile] = useState(false);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [recentNotes, setRecentNotes] = useState<RecentNote[]>([]);
  const [spaceSummaries, setSpaceSummaries] = useState<Record<string, SpaceSummary>>({});
  const [focusedPath, setFocusedPath] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"explorer" | "bookmarks">("explorer");
  const [documentPanel, setDocumentPanel] = useState<"toc" | "metadata">("toc");
  const [viewMode, setViewMode] = useState<"preview" | "source">("preview");
  const [notice, setNotice] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [noteDialog, setNoteDialog] = useState<NoteDialogState>(null);
  const [cloneDialog, setCloneDialog] = useState<CloneDialogState | null>(null);
  const [notePathInput, setNotePathInput] = useState("");
  const [noteDirectoryInput, setNoteDirectoryInput] = useState("");
  const [noteNameInput, setNoteNameInput] = useState("");
  const [excludePathsInput, setExcludePathsInput] = useState("");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const brandLogoInputRef = useRef<HTMLInputElement | null>(null);
  const [gitInfos, setGitInfos] = useState<Record<string, GitRepoInfo>>({});
  const [gitStatuses, setGitStatuses] = useState<Record<string, string>>({});
  const [fileHistory, setFileHistory] = useState<GitFileHistoryEntry[]>([]);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);
  const hasAutoOpenedActiveSpace = useRef(false);
  const {
    hydrated,
    spaces,
    activeSpace,
    activeSpaceId,
    upsertSpace,
    setActiveSpaceId,
    renameSpace,
    togglePinned,
    toggleArchived,
    moveSpace,
    updateSpaceExcludes,
    removeSpace,
    clearWorkspace
  } = useWorkspace();

  const tree = useMemo(() => buildTree(files), [files]);
  const visibleRows = useMemo(
    () => flattenVisibleTree(tree, expanded, searchQuery.trim().toLowerCase()),
    [expanded, searchQuery, tree]
  );
  const headings = useMemo(() => extractHeadings(draftContent), [draftContent]);
  const frontmatter = useMemo(() => parseFrontmatter(draftContent), [draftContent]);
  const bookmarkedFiles = useMemo(
    () => files.filter((file) => bookmarks.includes(file.path)),
    [bookmarks, files]
  );
  const homeBookmarkedNotes = useMemo(
    () => recentNotes.filter((note) => bookmarks.includes(note.path)).slice(0, 6),
    [bookmarks, recentNotes]
  );
  const visibleSpaces = useMemo(
    () => spaces.filter((space) => !space.isArchived),
    [spaces]
  );
  const archivedSpaces = useMemo(
    () => spaces.filter((space) => space.isArchived),
    [spaces]
  );
  const orderedVisibleSpaces = useMemo(
    () => [
      ...visibleSpaces.filter((space) => space.isPinned),
      ...visibleSpaces.filter((space) => !space.isPinned)
    ],
    [visibleSpaces]
  );
  const activeGitInfo = activeSpaceId ? gitInfos[activeSpaceId] : undefined;
  const activeExcludePaths = activeSpace?.excludePaths ?? DEFAULT_SPACE_EXCLUDES;
  const showSecondarySidebar = currentView === "space";
  const focusedRow = useMemo(
    () => visibleRows.find((row) => row.path === focusedPath) ?? null,
    [focusedPath, visibleRows]
  );
  const currentFolder = useMemo(() => {
    if (focusedRow?.kind === "directory") {
      return focusedRow.path;
    }

    if (selectedFile?.relative_path) {
      return getParentDirectory(selectedFile.relative_path);
    }

    return "";
  }, [focusedRow, selectedFile]);
  const directoryOptions = useMemo(() => {
    const options = new Set(listDirectoryOptions(files));
    if (currentFolder) {
      options.add(currentFolder);
    }
    return Array.from(options).sort((left, right) => left.localeCompare(right));
  }, [currentFolder, files]);
  const projectName = useMemo(() => {
    if (activeSpace) {
      return getSpaceLabel(activeSpace);
    }

    if (!rootPath) {
      return "Project Root";
    }

    const pieces = rootPath.split(/[\\/]/).filter(Boolean);
    return pieces[pieces.length - 1] ?? rootPath;
  }, [activeSpace, rootPath]);
  const isDirty = selectedFile !== null && draftContent !== content;
  const dirtyRelativePath = isDirty ? selectedFile?.relative_path ?? null : null;
  const workspaceSearchSpaces = useMemo(() => {
    if (workspaceSearchScope === "current") {
      return activeSpace ? [activeSpace] : [];
    }
    return visibleSpaces;
  }, [activeSpace, visibleSpaces, workspaceSearchScope]);

  useEffect(() => {
    const stored = window.localStorage.getItem(BOOKMARKS_KEY);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as string[];
      setBookmarks(Array.isArray(parsed) ? parsed : []);
    } catch {
      window.localStorage.removeItem(BOOKMARKS_KEY);
    }
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(RECENT_NOTES_KEY);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as RecentNote[];
      setRecentNotes(Array.isArray(parsed) ? parsed : []);
    } catch {
      window.localStorage.removeItem(RECENT_NOTES_KEY);
    }
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(SETTINGS_KEY);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as Partial<AppSettings>;
      setSettings({
        ...DEFAULT_SETTINGS,
        ...parsed
      });
    } catch {
      window.localStorage.removeItem(SETTINGS_KEY);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || hasAutoOpenedActiveSpace.current || !activeSpace?.localPath) {
      return;
    }

    hasAutoOpenedActiveSpace.current = true;
    setCurrentView("space");
    void scanRoot(activeSpace.localPath, {
      preserveSelection: true,
      resetSearch: false,
      silent: true
    });
  }, [activeSpace, hydrated]);

  useEffect(() => {
    window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
    window.localStorage.setItem(RECENT_NOTES_KEY, JSON.stringify(recentNotes));
  }, [recentNotes]);

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    document.documentElement.dataset.theme = settings.theme;
  }, [settings]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeoutId = window.setTimeout(() => setNotice(""), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  useEffect(() => {
    if (!noteDialog) {
      return;
    }

    setNotePathInput(noteDialog.initialPath);
    const parts = splitNotePath(noteDialog.initialPath);
    setNoteDirectoryInput(parts.directory);
    setNoteNameInput(parts.name);
  }, [noteDialog]);

  useEffect(() => {
    setExcludePathsInput(activeExcludePaths.join("\n"));
  }, [activeExcludePaths]);

  useEffect(() => {
    if (spaces.length === 0) {
      setGitInfos({});
      return;
    }

    let cancelled = false;

    void Promise.all(
      spaces.map(async (space) => {
        const info = await invoke<GitRepoInfo>("get_git_info", { path: space.localPath });
        return [space.id, info] as const;
      })
    )
      .then((entries) => {
        if (!cancelled) {
          setGitInfos(Object.fromEntries(entries));
        }
      })
      .catch((gitError) => {
        if (!cancelled) {
          setError(gitError instanceof Error ? gitError.message : String(gitError));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [spaces]);

  useEffect(() => {
    if (!rootPath) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsSearching(true);
      void invoke<SearchResult[]>("search_markdown", {
        path: rootPath,
        query,
        excludePaths: activeExcludePaths
      })
        .then((results) => setSearchResults(results))
        .catch((searchError) =>
          setError(searchError instanceof Error ? searchError.message : String(searchError))
        )
        .finally(() => setIsSearching(false));
    }, 160);

    return () => window.clearTimeout(timeoutId);
  }, [activeExcludePaths, rootPath, searchQuery]);

  useEffect(() => {
    if (!rootPath) {
      setGitStatuses({});
      return;
    }

    let cancelled = false;

    void invoke<GitFileStatus[]>("get_git_statuses", { path: rootPath, excludePaths: activeExcludePaths })
      .then((results) => {
        if (cancelled) {
          return;
        }

        setGitStatuses(Object.fromEntries(results.map((item) => [item.relative_path, item.status])));
      })
      .catch((statusError) => {
        if (!cancelled) {
          setError(statusError instanceof Error ? statusError.message : String(statusError));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeExcludePaths, rootPath, files.length, content]);

  useEffect(() => {
    if (!selectedFile || !activeGitInfo?.is_repo) {
      setFileHistory([]);
      return;
    }

    let cancelled = false;

    void invoke<GitFileHistoryEntry[]>("get_file_history", { path: selectedFile.path })
      .then((results) => {
        if (!cancelled) {
          setFileHistory(results);
        }
      })
      .catch((historyError) => {
        if (!cancelled) {
          setError(historyError instanceof Error ? historyError.message : String(historyError));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeGitInfo?.is_repo, selectedFile?.path, content]);

  useEffect(() => {
    if (currentView !== "search") {
      return;
    }

    const query = workspaceSearchQuery.trim();
    if (!query) {
      setWorkspaceSearchGroups([]);
      setIsWorkspaceSearching(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setIsWorkspaceSearching(true);

      void Promise.all(
        workspaceSearchSpaces.map(async (space) => {
          const results = await invoke<SearchResult[]>("search_markdown", {
            path: space.localPath,
            query,
            excludePaths: space.excludePaths
          });

          return {
            spaceId: space.id,
            spaceName: getSpaceLabel(space),
            localPath: space.localPath,
            results: workspaceSearchBookmarksOnly
              ? results.filter((result) => bookmarks.includes(result.path))
              : results
          } satisfies WorkspaceSearchGroup;
        })
      )
        .then((groups) => {
          if (cancelled) {
            return;
          }

          setWorkspaceSearchGroups(groups.filter((group) => group.results.length > 0));
        })
        .catch((searchError) => {
          if (!cancelled) {
            setError(searchError instanceof Error ? searchError.message : String(searchError));
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsWorkspaceSearching(false);
          }
        });
    }, 160);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [bookmarks, currentView, workspaceSearchBookmarksOnly, workspaceSearchQuery, workspaceSearchSpaces]);

  useEffect(() => {
    if (spaces.length === 0) {
      setSpaceSummaries({});
      return;
    }

    let cancelled = false;

    void Promise.all(
      spaces.map(async (space) => {
        const summary = await invoke<SpaceSummary>("summarize_space", {
          path: space.localPath,
          excludePaths: space.excludePaths
        });
        return [space.id, summary] as const;
      })
    )
      .then((entries) => {
        if (cancelled) {
          return;
        }

        setSpaceSummaries(Object.fromEntries(entries));
      })
      .catch((summaryError) => {
        if (!cancelled) {
          setError(summaryError instanceof Error ? summaryError.message : String(summaryError));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [spaces]);

  useEffect(() => {
    if (!rootPath) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (document.hidden || isDirty) {
        return;
      }

      void scanRoot(rootPath, {
        preserveSelection: true,
        resetSearch: false,
        silent: true
      });
    }, settings.autoRefreshMs);

    return () => window.clearInterval(intervalId);
  }, [isDirty, rootPath, selectedFile?.relative_path, settings.autoRefreshMs]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isSaveShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s";
      if (!isSaveShortcut) {
        return;
      }

      event.preventDefault();
      void handleSaveCurrentFile();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [draftContent, content, selectedFile]);

  useEffect(() => {
    if (!settings.autosave || !isDirty || !selectedFile || isSavingFile) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void handleSaveCurrentFile({ silent: true });
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [draftContent, isDirty, isSavingFile, selectedFile, settings.autosave]);

  async function selectRootDirectory() {
    setError("");
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Choose a project root"
    });

    if (!selected || Array.isArray(selected)) {
      return;
    }

    await scanRoot(selected);
  }

  async function scanRoot(
    path: string,
    options?: {
      preserveSelection?: boolean;
      resetSearch?: boolean;
      silent?: boolean;
      allowDirty?: boolean;
      activateView?: boolean;
      excludePathsOverride?: string[];
    }
  ): Promise<MdFile[]> {
    const preserveSelection = options?.preserveSelection ?? false;
    const resetSearch = options?.resetSearch ?? true;
    const silent = options?.silent ?? false;
    const allowDirty = options?.allowDirty ?? false;
    const activateView = options?.activateView ?? !silent;
    const excludePathsOverride = options?.excludePathsOverride;
    if (isDirty && !allowDirty) {
      if (silent) {
        return [];
      }

      const shouldDiscard = window.confirm(
        "You have unsaved changes in the current note. Discard them and switch spaces?"
      );

      if (!shouldDiscard) {
        return [];
      }
    }

    const previousSelectedPath = selectedFile?.relative_path ?? null;
    const previousExpanded = expanded;

    if (silent) {
      setIsAutoRefreshing(true);
    } else {
      setIsLoadingTree(true);
    }

    if (resetSearch) {
      setSearchQuery("");
    }

    try {
      const spaceForPath = spaces.find((space) => space.localPath === path);
      const scanned = await invoke<MdFile[]>("scan_directory", {
        path,
        excludePaths: excludePathsOverride ?? spaceForPath?.excludePaths ?? DEFAULT_SPACE_EXCLUDES
      });
      const nextSelectedFile = preserveSelection
        ? scanned.find((file) => file.relative_path === previousSelectedPath) ?? scanned[0] ?? null
        : scanned[0] ?? null;

      setRootPath(path);
      if (activateView) {
        setCurrentView("space");
      }
      setFiles(scanned);
      setSelectedFile(nextSelectedFile);
      setFocusedPath(nextSelectedFile?.relative_path ?? null);
      setExpanded(() => {
        if (preserveSelection) {
          const nextExpanded = new Set(previousExpanded);
          expandParents(nextSelectedFile?.relative_path).forEach((item) => nextExpanded.add(item));
          return nextExpanded;
        }

        return expandParents(nextSelectedFile?.relative_path);
      });
      upsertSpace(path, new Date().toISOString());

      if (nextSelectedFile) {
        await loadFile(nextSelectedFile, { silent });
      } else {
        setContent("");
        setDraftContent("");
      }

      return scanned;
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : String(scanError));
      setFiles([]);
      setSelectedFile(null);
      setContent("");
      setDraftContent("");
      return [];
    } finally {
      if (silent) {
        setIsAutoRefreshing(false);
      } else {
        setIsLoadingTree(false);
      }
    }
  }

  function handleSaveSpaceExcludes() {
    if (!activeSpace) {
      showNotice("Open a space first");
      return;
    }

    const nextExcludes = formatExcludePathsInput(excludePathsInput);
    updateSpaceExcludes(activeSpace.id, nextExcludes);
    if (rootPath === activeSpace.localPath) {
      void scanRoot(activeSpace.localPath, {
        preserveSelection: true,
        resetSearch: false,
        allowDirty: true,
        silent: true,
        excludePathsOverride: nextExcludes
      });
    }
    showNotice("Space excludes updated");
  }

  function handleNoteDirectoryChange(nextDirectory: string) {
    setNoteDirectoryInput(nextDirectory);
    setNotePathInput(joinNotePath(nextDirectory, noteNameInput));
  }

  function handleNoteNameChange(nextName: string) {
    setNoteNameInput(nextName);
    setNotePathInput(joinNotePath(noteDirectoryInput, nextName));
  }

  function handleUseCurrentFolder() {
    handleNoteDirectoryChange(currentFolder);
  }

  async function loadFile(file: MdFile, options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;

    if (!silent) {
      setIsLoadingFile(true);
    }

    setError("");

    try {
      const fileContent = await invoke<string>("read_md_file", { path: file.path });
      setSelectedFile(file);
      setContent(fileContent);
      setDraftContent(fileContent);
      if (activeSpaceId) {
        setRecentNotes((current) => {
          const next = [
            {
              path: file.path,
              relativePath: file.relative_path,
              spaceId: activeSpaceId,
              spaceName: activeSpace?.name ?? projectName,
              openedAt: new Date().toISOString()
            },
            ...current.filter((item) => item.path !== file.path)
          ];

          return next.slice(0, MAX_RECENT_NOTES);
        });
      }
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : String(readError));
    } finally {
      if (!silent) {
        setIsLoadingFile(false);
      }
    }
  }

  function expandParents(relativePath?: string): Set<string> {
    if (!relativePath) {
      return new Set();
    }

    const segments = relativePath.split("/").filter(Boolean);
    const nextExpanded = new Set<string>();

    for (let index = 0; index < segments.length - 1; index += 1) {
      nextExpanded.add(segments.slice(0, index + 1).join("/"));
    }

    return nextExpanded;
  }

  function handleSelect(relativePath: string) {
    if (isDirty) {
      const shouldDiscard = window.confirm(
        "You have unsaved changes in the current note. Discard them and open another file?"
      );

      if (!shouldDiscard) {
        return;
      }
    }

    const nextFile = files.find((file) => file.relative_path === relativePath);
    if (!nextFile) {
      return;
    }

    setExpanded((current) => {
      const nextExpanded = new Set(current);
      expandParents(relativePath).forEach((item) => nextExpanded.add(item));
      return nextExpanded;
    });
    setFocusedPath(relativePath);
    void loadFile(nextFile);
  }

  function handleToggle(path: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  function clearAllSpaces() {
    if (isDirty) {
      const shouldDiscard = window.confirm(
        "You have unsaved changes in the current note. Discard them and clear all spaces?"
      );

      if (!shouldDiscard) {
        return;
      }
    }

    clearWorkspace();
    setCurrentView("home");
    setRootPath("");
    setFiles([]);
    setSelectedFile(null);
    setContent("");
    setDraftContent("");
    setExpanded(new Set());
    setFocusedPath(null);
    setSearchQuery("");
  }

  function showNotice(message: string) {
    setNotice(message);
  }

  function toggleBookmark(file: MdFile | null) {
    if (!file) {
      return;
    }

    setBookmarks((current) => {
      const exists = current.includes(file.path);
      const next = exists ? current.filter((path) => path !== file.path) : [file.path, ...current];
      showNotice(exists ? "Bookmark removed" : "Bookmark added");
      return next;
    });
  }

  async function copyText(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      showNotice(successMessage);
    } catch {
      showNotice("Clipboard unavailable");
    }
  }

  function handleRefreshCurrent() {
    if (isDirty) {
      showNotice("Save or discard your changes before refreshing");
      return;
    }

    if (!activeSpace?.localPath) {
      void selectRootDirectory();
      return;
    }

    void scanRoot(activeSpace.localPath, { preserveSelection: true, resetSearch: false });
  }

  async function handleShare() {
    if (selectedFile) {
      await copyText(selectedFile.path, "File path copied");
      return;
    }

    if (rootPath) {
      await copyText(rootPath, "Project path copied");
      return;
    }

    showNotice("Select a project first");
  }

  function handlePrint() {
    if (!selectedFile) {
      showNotice("Open a file first");
      return;
    }

    window.print();
  }

  function handleDownload() {
    if (!selectedFile) {
      showNotice("Open a file first");
      return;
    }

    const blob = new Blob([draftContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = selectedFile.name;
    anchor.click();
    URL.revokeObjectURL(url);
    showNotice("Markdown exported");
  }

  function scrollToHeading(id: string) {
    const container = previewScrollRef.current;
    if (!container) {
      return;
    }

    const target = container.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
    if (!target) {
      return;
    }

    target.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function updateSettings(patch: Partial<AppSettings>) {
    setSettings((current) => ({ ...current, ...patch }));
  }

  function handlePickBrandLogo() {
    brandLogoInputRef.current?.click();
  }

  function handleBrandLogoSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateSettings({ brandLogoDataUrl: typeof reader.result === "string" ? reader.result : "" });
      showNotice("Custom logo updated");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function moveFocus(direction: -1 | 1) {
    if (visibleRows.length === 0) {
      return;
    }

    const currentIndex = visibleRows.findIndex((row) => row.path === focusedPath);
    const nextIndex =
      currentIndex === -1
        ? 0
        : Math.max(0, Math.min(visibleRows.length - 1, currentIndex + direction));
    setFocusedPath(visibleRows[nextIndex]?.path ?? null);
  }

  function handleTreeKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (visibleRows.length === 0) {
      return;
    }

    const activeRow = visibleRows.find((row) => row.path === focusedPath) ?? visibleRows[0];
    if (!activeRow) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveFocus(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveFocus(-1);
      return;
    }

    if (event.key === "ArrowRight" && activeRow.kind === "directory") {
      event.preventDefault();
      if (!activeRow.isExpanded) {
        handleToggle(activeRow.path);
      }
      return;
    }

    if (event.key === "ArrowLeft" && activeRow.kind === "directory") {
      event.preventDefault();
      if (activeRow.isExpanded) {
        handleToggle(activeRow.path);
      }
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (activeRow.kind === "directory") {
        handleToggle(activeRow.path);
      } else {
        handleSelect(activeRow.path);
      }
    }
  }

  async function handleOpenSpace(localPath: string): Promise<MdFile[]> {
    const space = spaces.find((candidate) => candidate.localPath === localPath);
    if (space) {
      setActiveSpaceId(space.id);
    }

    setOpeningSpacePath(localPath);
    setCurrentView("space");
    try {
      return await scanRoot(localPath, { preserveSelection: true, resetSearch: false });
    } finally {
      setOpeningSpacePath((current) => (current === localPath ? null : current));
    }
  }

  function handleOpenHome() {
    setCurrentView("home");
  }

  function handleCreateNoteInDirectory(path: string) {
    if (!rootPath) {
      showNotice("Select a folder first");
      return;
    }

    setFocusedPath(path);
    setNoteDialog({
      mode: "create",
      template: "note",
      title: "Create Note",
      description: "Create a markdown note directly in the selected folder.",
      confirmLabel: "Create Note",
      initialPath: joinNotePath(path, "untitled.md")
    });
  }

  function handleCreateJournalInDirectory(path: string) {
    if (!rootPath) {
      showNotice("Select a folder first");
      return;
    }

    const todayName = splitNotePath(formatTodayPath()).name;
    setFocusedPath(path);
    setNoteDialog({
      mode: "journal",
      template: "journal",
      title: "Create Journal Entry",
      description: "Create a dated journal entry in the selected journal folder.",
      confirmLabel: "Create Entry",
      initialPath: joinNotePath(path, todayName)
    });
  }

  function handleRenameSpace(spaceId: string) {
    const space = spaces.find((item) => item.id === spaceId);
    if (!space) {
      return;
    }

    const nextLabel = window.prompt("Space label", getSpaceLabel(space));
    if (nextLabel === null) {
      return;
    }

    renameSpace(spaceId, nextLabel);
    showNotice("Space label updated");
  }

  function handleTogglePinnedSpace(spaceId: string) {
    const space = spaces.find((item) => item.id === spaceId);
    if (!space) {
      return;
    }

    togglePinned(spaceId);
    showNotice(space.isPinned ? "Space unpinned" : "Space pinned");
  }

  function handleToggleArchivedSpace(spaceId: string) {
    const space = spaces.find((item) => item.id === spaceId);
    if (!space) {
      return;
    }

    toggleArchived(spaceId);
    if (activeSpaceId === spaceId && !space.isArchived) {
      setCurrentView("home");
    }
    showNotice(space.isArchived ? "Space restored" : "Space archived");
  }

  function handleMoveSpace(spaceId: string, direction: -1 | 1) {
    moveSpace(spaceId, direction);
  }

  function handleRemoveSpace(spaceId: string) {
    const space = spaces.find((item) => item.id === spaceId);
    if (!space) {
      return;
    }

    const shouldRemove = window.confirm(
      `Remove "${getSpaceLabel(space)}" from the app? Local files will stay on disk.`
    );
    if (!shouldRemove) {
      return;
    }

    const removingActive = activeSpaceId === spaceId;
    removeSpace(spaceId);

    if (removingActive) {
      setCurrentView("home");
      setRootPath("");
      setFiles([]);
      setSelectedFile(null);
      setContent("");
      setDraftContent("");
      setExpanded(new Set());
      setFocusedPath(null);
      setSearchQuery("");
    }

    showNotice("Space removed");
  }

  async function handleRevealSpace(spaceId: string) {
    const space = spaces.find((item) => item.id === spaceId);
    if (!space) {
      return;
    }

    try {
      await invoke("reveal_in_file_manager", { path: space.localPath });
      showNotice("Opened in Finder");
    } catch (revealError) {
      setError(revealError instanceof Error ? revealError.message : String(revealError));
    }
  }

  async function handleOpenSpaceTerminal(spaceId: string) {
    const space = spaces.find((item) => item.id === spaceId);
    if (!space) {
      return;
    }

    try {
      await invoke("open_space_in_terminal", { path: space.localPath });
      showNotice("Opened in Terminal");
    } catch (terminalError) {
      setError(terminalError instanceof Error ? terminalError.message : String(terminalError));
    }
  }

  async function handleCopySpacePath(spaceId: string) {
    const space = spaces.find((item) => item.id === spaceId);
    if (!space) {
      return;
    }

    await copyText(space.localPath, "Space path copied");
  }

  function handleOpenWorkspaceSearch() {
    setCurrentView("search");
  }

  async function handleOpenRecentNote(note: RecentNote) {
    const space = spaces.find((item) => item.id === note.spaceId);
    if (!space) {
      showNotice("This space is no longer available");
      return;
    }

    const noteKey = `${note.spaceId}:${note.path}`;
    setOpeningRecentNoteKey(noteKey);
    try {
      const scanned = await handleOpenSpace(space.localPath);
      const nextFile = scanned.find((file) => file.relative_path === note.relativePath);
      if (nextFile) {
        await loadFile(nextFile);
      }
    } finally {
      setOpeningRecentNoteKey((current) => (current === noteKey ? null : current));
    }
  }

  async function handleOpenWorkspaceSearchResult(group: WorkspaceSearchGroup, result: SearchResult) {
    const scanned = await handleOpenSpace(group.localPath);
    const nextFile = scanned.find((file) => file.relative_path === result.relative_path);
    if (nextFile) {
      await loadFile(nextFile);
    }
  }

  async function handleSaveCurrentFile(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;

    if (!selectedFile) {
      if (!silent) {
        showNotice("Open a file first");
      }
      return;
    }

    if (!isDirty) {
      if (!silent) {
        showNotice("No changes to save");
      }
      return;
    }

    setIsSavingFile(true);
    setError("");

    try {
      await invoke("write_md_file", {
        path: selectedFile.path,
        content: draftContent
      });
      setContent(draftContent);
      if (!silent) {
        showNotice("Markdown saved");
      }
    } catch (writeError) {
      setError(writeError instanceof Error ? writeError.message : String(writeError));
    } finally {
      setIsSavingFile(false);
    }
  }

  async function handleCreateNote() {
    if (!rootPath) {
      showNotice("Select a folder first");
      return;
    }

    if (isDirty) {
      const shouldDiscard = window.confirm(
        "You have unsaved changes in the current note. Discard them and create a new note?"
      );

      if (!shouldDiscard) {
        return;
      }
    }

    const suggestedPath = joinNotePath(currentFolder || "notes", "untitled.md");

    setNoteDialog({
      mode: "create",
      template: "note",
      title: "Create Note",
      description: "Choose where the new markdown note should live inside this space.",
      confirmLabel: "Create Note",
      initialPath: suggestedPath
    });
  }

  async function handleCreateTemplateNote(template: "idea" | "meeting") {
    if (!rootPath) {
      showNotice("Select a folder first");
      return;
    }

    if (isDirty) {
      const shouldDiscard = window.confirm(
        "You have unsaved changes in the current note. Discard them and create a new note?"
      );

      if (!shouldDiscard) {
        return;
      }
    }

    const defaultDirectory =
      template === "idea"
        ? currentFolder.includes("ideas")
          ? currentFolder
          : "notes/ideas"
        : currentFolder.includes("meet")
          ? currentFolder
          : "notes/meetings";
    const defaultName =
      template === "idea" ? `${formatIsoDate()}-untitled.md` : `${formatIsoDate()}-meeting.md`;
    const initialPath = joinNotePath(defaultDirectory, defaultName);

    setNoteDialog({
      mode: "create",
      template,
      title: template === "idea" ? "Create Idea Note" : "Create Meeting Note",
      description:
        template === "idea"
          ? "Create an idea note with a lightweight problem and approach template."
          : "Create a meeting note with attendees, agenda, decisions, and follow-ups.",
      confirmLabel: template === "idea" ? "Create Idea" : "Create Meeting Note",
      initialPath
    });
  }

  async function handleRenameCurrentFile() {
    if (!selectedFile) {
      showNotice("Open a file first");
      return;
    }

    if (isDirty) {
      showNotice("Save or discard your changes before renaming");
      return;
    }

    setNoteDialog({
      mode: "rename",
      template: frontmatter.template === "journal" ? "journal" : "note",
      title: "Rename Note",
      description: "Move the current note to a new markdown path inside this space.",
      confirmLabel: "Rename Note",
      initialPath: selectedFile.relative_path
    });
  }

  async function handleCreateJournalEntry() {
    if (!rootPath) {
      showNotice("Select a folder first");
      return;
    }

    if (isDirty) {
      const shouldDiscard = window.confirm(
        "You have unsaved changes in the current note. Discard them and create a journal entry?"
      );

      if (!shouldDiscard) {
        return;
      }
    }

    const todayPath = formatTodayPath();
    const defaultJournalDirectory = currentFolder.startsWith("journal/")
      ? currentFolder
      : getParentDirectory(todayPath);

    setNoteDialog({
      mode: "journal",
      template: "journal",
      title: "Create Journal Entry",
      description: "Create a dated note inside the journal folder structure.",
      confirmLabel: "Create Entry",
      initialPath: joinNotePath(defaultJournalDirectory, splitNotePath(todayPath).name)
    });
  }

  async function handleDeleteCurrentFile() {
    if (!selectedFile) {
      showNotice("Open a file first");
      return;
    }

    if (isDirty) {
      showNotice("Save or discard your changes before deleting");
      return;
    }

    const shouldDelete = window.confirm(`Delete "${selectedFile.relative_path}"?`);
    if (!shouldDelete) {
      return;
    }

    setError("");

    try {
      await invoke("delete_md_file", { path: selectedFile.path });
      await scanRoot(rootPath, { preserveSelection: false, resetSearch: false });
      showNotice("Note deleted");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : String(deleteError));
    }
  }

  async function handleSubmitNoteDialog() {
    if (!noteDialog) {
      return;
    }

    const requestedPath =
      noteDialog.mode === "rename"
        ? notePathInput.trim()
        : joinNotePath(noteDirectoryInput, noteNameInput).trim();
    if (!requestedPath) {
      setError("A file path is required");
      return;
    }

    setError("");

    try {
      if (noteDialog.mode === "rename") {
        if (!selectedFile) {
          showNotice("Open a file first");
          return;
        }

        const renamedFile = await invoke<MdFile>("rename_md_file", {
          path: selectedFile.path,
          nextRelativePath: requestedPath
        });

        await scanRoot(rootPath, { preserveSelection: false, resetSearch: false });
        setFocusedPath(renamedFile.relative_path);
        await loadFile(renamedFile);
        setNoteDialog(null);
        showNotice("Note renamed");
        return;
      }

      const initialContent =
        noteDialog.template === "journal"
          ? buildJournalTemplate(requestedPath)
          : noteDialog.template === "idea"
            ? buildIdeaTemplate(requestedPath)
            : noteDialog.template === "meeting"
              ? buildMeetingTemplate(requestedPath)
              : buildNoteTemplate(requestedPath);

      const createdFile = await invoke<MdFile>("create_md_file", {
        relativePath: requestedPath,
        content: initialContent
      });

      await scanRoot(rootPath, {
        preserveSelection: false,
        resetSearch: false,
        allowDirty: true
      });
      setFocusedPath(createdFile.relative_path);
      await loadFile(createdFile);
      setViewMode("source");
      setNoteDialog(null);
      showNotice(
        noteDialog.template === "journal"
          ? "Journal entry created"
          : noteDialog.template === "idea"
            ? "Idea note created"
            : noteDialog.template === "meeting"
              ? "Meeting note created"
              : "Note created"
      );
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
    }
  }

  function openCloneDialog() {
    setCloneDialog({
      repoUrl: "",
      destinationParent: "",
      directoryName: ""
    });
  }

  async function chooseCloneDestination() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Choose where to clone the repository"
    });

    if (!selected || Array.isArray(selected)) {
      return;
    }

    setCloneDialog((current) =>
      current
        ? {
            ...current,
            destinationParent: selected
          }
        : current
    );
  }

  async function handleSubmitCloneDialog() {
    if (!cloneDialog) {
      return;
    }

    if (!cloneDialog.repoUrl.trim()) {
      setError("A repository URL is required");
      return;
    }

    if (!cloneDialog.destinationParent.trim()) {
      setError("Choose a destination folder");
      return;
    }

    if (!cloneDialog.directoryName.trim()) {
      setError("A local folder name is required");
      return;
    }

    setError("");

    try {
      const cloned = await invoke<CloneResult>("clone_repository", {
        repoUrl: cloneDialog.repoUrl.trim(),
        destinationParent: cloneDialog.destinationParent.trim(),
        directoryName: cloneDialog.directoryName.trim()
      });
      setCloneDialog(null);
      await scanRoot(cloned.path, { preserveSelection: true, resetSearch: false });
      showNotice("Repository cloned locally");
    } catch (cloneError) {
      setError(cloneError instanceof Error ? cloneError.message : String(cloneError));
    }
  }

  return (
    <div
      className="app-shell grid h-screen overflow-hidden bg-[color:var(--bg)] max-[960px]:grid-cols-[1fr] max-[960px]:[&>.app-rail]:hidden"
      style={{
        gridTemplateColumns: showSecondarySidebar
          ? `${RAIL_WIDTH}px ${SIDEBAR_WIDTH}px minmax(0, 1fr)`
          : `${RAIL_WIDTH}px minmax(0, 1fr)`
      }}
    >
      <TooltipProvider delayDuration={150}>
        <aside className="app-rail flex flex-col items-center justify-between border-r border-[color:var(--outline)] bg-[color:var(--surface-low)] px-0 pb-5 pt-[18px]">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={clsx(
                  "grid h-[42px] w-[42px] place-items-center overflow-hidden rounded-[6px] border border-[color:var(--outline-strong)] bg-[color:var(--surface-high)] font-bold text-[color:var(--indigo)]"
                )}
                onClick={handleOpenHome}
              >
                {settings.brandLogoDataUrl ? (
                  <img src={settings.brandLogoDataUrl} alt="App logo" className="h-full w-full object-cover" />
                ) : (
                  <PenTool className="icon h-5 w-5" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Workspace Home</TooltipContent>
          </Tooltip>

          <nav className="flex flex-col items-center gap-[14px]">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={clsx(
                    railButtonClassName,
                    currentView === "home" && "bg-[color:var(--surface-highest)] text-[color:var(--indigo)]"
                  )}
                  aria-label="Home"
                  onClick={handleOpenHome}
                >
                  <LayoutGrid className="icon h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Home</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={clsx(
                    railButtonClassName,
                    currentView === "search" && "bg-[color:var(--surface-highest)] text-[color:var(--indigo)]"
                  )}
                  aria-label="Search"
                  onClick={handleOpenWorkspaceSearch}
                >
                  <Search className="icon h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Search</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={clsx(
                    railButtonClassName,
                    currentView === "space" &&
                      activePanel === "explorer" &&
                      "bg-[color:var(--surface-highest)] text-[color:var(--indigo)]"
                  )}
                  aria-label="Explorer"
                  onClick={() => {
                    setCurrentView("space");
                    setActivePanel("explorer");
                  }}
                >
                  <Folder className="icon h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Explorer</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={clsx(
                    railButtonClassName,
                    currentView === "space" &&
                      activePanel === "bookmarks" &&
                      "bg-[color:var(--surface-highest)] text-[color:var(--indigo)]"
                  )}
                  aria-label="Bookmarks"
                  onClick={() => {
                    setCurrentView("space");
                    setActivePanel("bookmarks");
                  }}
                >
                  <Bookmark className="icon h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Bookmarks</TooltipContent>
            </Tooltip>
          </nav>

          <div className="flex flex-col items-center gap-[14px]">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={railButtonClassName}
                  aria-label="Settings"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  <Settings className="icon h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Settings</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={railButtonClassName}
                  aria-label="Help"
                  onClick={() => showNotice("Use arrows in the explorer and Enter to open")}
                >
                  <HelpCircle className="icon h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Help</TooltipContent>
            </Tooltip>
          </div>
        </aside>
      </TooltipProvider>

      {showSecondarySidebar ? (
        <SecondarySidebar
          rootPath={rootPath}
          activePanel={activePanel}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          isLoadingTree={isLoadingTree}
          isSearching={isSearching}
          searchResults={searchResults}
          files={files}
          bookmarkedFiles={bookmarkedFiles}
          selectedFilePath={selectedFile?.path ?? null}
          selectedRelativePath={selectedFile?.relative_path ?? null}
          focusedPath={focusedPath}
          dirtyRelativePath={dirtyRelativePath}
          gitStatuses={gitStatuses}
          visibleRows={visibleRows}
          expanded={expanded}
          onToggle={handleToggle}
          onSelect={handleSelect}
          onFocus={setFocusedPath}
          onTreeKeyDown={handleTreeKeyDown}
          onCreateJournalEntry={handleCreateJournalEntry}
          onCreateNote={handleCreateNote}
          onRefreshScan={() => scanRoot(rootPath, { preserveSelection: true, resetSearch: false })}
          onCreateInDirectory={handleCreateNoteInDirectory}
          onCreateJournalInDirectory={handleCreateJournalInDirectory}
          isAutoRefreshing={isAutoRefreshing}
          TreeBranch={TreeBranch}
        />
      ) : null}

      <div className="grid min-h-0 min-w-0 grid-rows-[56px_minmax(0,1fr)] overflow-hidden">
        <Topbar
          title={
            currentView === "home"
              ? "Workspace Home"
              : currentView === "search"
                ? "Workspace Search"
                : "Markdown Viewer"
          }
          searchValue={currentView === "search" ? workspaceSearchQuery : searchQuery}
          searchPlaceholder={currentView === "search" ? "Search across spaces..." : "Search files..."}
          onSearchChange={(value) => {
            if (currentView === "search") {
              setWorkspaceSearchQuery(value);
              return;
            }
            setSearchQuery(value);
          }}
          onRefresh={handleRefreshCurrent}
          onShare={handleShare}
          onProfile={() => showNotice("Local-only desktop viewer")}
        />

        <main className="min-h-0 min-w-0 overflow-hidden">
          {currentView === "home" ? (
            <WorkspaceHome
              activeSpace={activeSpace}
              spaces={spaces}
              orderedVisibleSpaces={orderedVisibleSpaces}
              archivedSpaces={archivedSpaces}
              recentNotes={recentNotes}
              homeBookmarkedNotes={homeBookmarkedNotes}
              spaceSummaries={spaceSummaries}
              gitInfos={gitInfos}
              openingSpacePath={openingSpacePath}
              openingRecentNoteKey={openingRecentNoteKey}
              onSelectRootDirectory={selectRootDirectory}
              onOpenCloneDialog={openCloneDialog}
              onCreateJournalEntry={handleCreateJournalEntry}
              onCreateNote={handleCreateNote}
              onCreateTemplateNote={handleCreateTemplateNote}
              onShowNotice={showNotice}
              onOpenSpace={handleOpenSpace}
              onTogglePinnedSpace={handleTogglePinnedSpace}
              onMoveSpace={handleMoveSpace}
              onToggleArchivedSpace={handleToggleArchivedSpace}
              onRemoveSpace={handleRemoveSpace}
              onOpenRecentNote={handleOpenRecentNote}
              onEnterSpaceView={() => setCurrentView("space")}
            />
          ) : currentView === "search" ? (
            <WorkspaceSearchView
              workspaceSearchScope={workspaceSearchScope}
              onWorkspaceSearchScopeChange={setWorkspaceSearchScope}
              workspaceSearchBookmarksOnly={workspaceSearchBookmarksOnly}
              onWorkspaceSearchBookmarksOnlyChange={setWorkspaceSearchBookmarksOnly}
              workspaceSearchQuery={workspaceSearchQuery}
              isWorkspaceSearching={isWorkspaceSearching}
              workspaceSearchGroups={workspaceSearchGroups}
              onOpenWorkspaceSearchResult={handleOpenWorkspaceSearchResult}
              highlightParts={highlightParts}
            />
          ) : (
          <DocumentWorkspace
            viewMode={viewMode}
            onSetViewMode={setViewMode}
            selectedFile={selectedFile}
            isDirty={isDirty}
            isSavingFile={isSavingFile}
            autosave={settings.autosave}
            toolbar={settings.toolbar}
            documentPanel={documentPanel}
            onSave={handleSaveCurrentFile}
            onCreateNote={handleCreateNote}
            onCreateJournal={handleCreateJournalEntry}
            onRename={handleRenameCurrentFile}
            onPrint={handlePrint}
            onDownload={handleDownload}
            onToggleMetadata={() =>
              setDocumentPanel((current) => (current === "metadata" ? "toc" : "metadata"))
            }
            onDelete={handleDeleteCurrentFile}
            onOpenSettings={() => setIsSettingsOpen(true)}
            error={error}
            isLoadingFile={isLoadingFile}
            previewScrollRef={previewScrollRef}
            settingsShowToc={settings.showToc}
            settingsSourceWrap={settings.sourceWrap}
            headings={headings}
            onScrollToHeading={scrollToHeading}
            projectName={projectName}
            rootPath={rootPath}
            activeExcludePaths={activeExcludePaths}
            fileCount={files.length}
            bookmarkCount={bookmarkedFiles.length}
            gitStatuses={gitStatuses}
            frontmatter={frontmatter}
            prettifyNoteTitle={prettifyNoteTitle}
            activeGitInfo={activeGitInfo}
            fileHistory={fileHistory}
            bookmarks={bookmarks}
            onToggleBookmark={toggleBookmark}
            draftContent={draftContent}
            onDraftContentChange={setDraftContent}
            onShowNotice={showNotice}
          />
          )}
        </main>
      </div>
      {notice ? <div className="app-notice">{notice}</div> : null}
      <SettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        settings={settings}
        onUpdateSettings={updateSettings}
        viewMode={viewMode}
        onSetViewMode={setViewMode}
        toolbarItemOptions={TOOLBAR_ITEM_OPTIONS}
        brandLogoInputRef={brandLogoInputRef}
        onPickBrandLogo={handlePickBrandLogo}
        onBrandLogoSelected={handleBrandLogoSelected}
        activeSpace={activeSpace}
        excludePathsInput={excludePathsInput}
        onExcludePathsInputChange={setExcludePathsInput}
        defaultSpaceExcludes={DEFAULT_SPACE_EXCLUDES}
        onSaveSpaceExcludes={handleSaveSpaceExcludes}
        onResetDefaults={() => {
          setSettings(DEFAULT_SETTINGS);
          showNotice("Settings reset");
        }}
      />
      <NoteDialog
        noteDialog={noteDialog}
        notePathInput={notePathInput}
        noteDirectoryInput={noteDirectoryInput}
        noteNameInput={noteNameInput}
        directoryOptions={directoryOptions}
        onOpenChange={(open) => !open && setNoteDialog(null)}
        onNotePathInputChange={setNotePathInput}
        onNoteDirectoryChange={handleNoteDirectoryChange}
        onUseCurrentFolder={handleUseCurrentFolder}
        onNoteNameChange={handleNoteNameChange}
        onSubmit={handleSubmitNoteDialog}
      />
      <CloneDialog
        cloneDialog={cloneDialog}
        onOpenChange={(open) => !open && setCloneDialog(null)}
        onRepoUrlChange={(value) =>
          setCloneDialog((current) => (current ? { ...current, repoUrl: value } : current))
        }
        onDestinationParentChange={(value) =>
          setCloneDialog((current) => (current ? { ...current, destinationParent: value } : current))
        }
        onChooseDestination={chooseCloneDestination}
        onDirectoryNameChange={(value) =>
          setCloneDialog((current) => (current ? { ...current, directoryName: value } : current))
        }
        onSubmit={handleSubmitCloneDialog}
      />
    </div>
  );
}
