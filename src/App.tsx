import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import clsx from "clsx";
import {
  Bookmark,
  CalendarDays,
  ChevronUp,
  Copy,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  HelpCircle,
  LayoutGrid,
  Pin,
  PencilLine,
  PenTool,
  Search,
  Star,
  TerminalSquare,
  Trash2,
  Archive,
  ArchiveRestore,
  UserCircle2,
  Warehouse
} from "lucide-react";
import { PreviewToolbar } from "./components/PreviewToolbar";
import { Topbar } from "./components/Topbar";
import { Button } from "./components/ui/button";
import { Checkbox } from "./components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogIconClose,
  DialogTitle
} from "./components/ui/dialog";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { ScrollArea } from "./components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "./components/ui/select";
import { Textarea } from "./components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "./components/ui/tooltip";
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

const MarkdownPreview = lazy(() => import("./MarkdownPreview"));
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

        if (row.kind === "directory") {
          return (
            <div
              key={row.id}
              role="button"
              tabIndex={-1}
              className={clsx("explorer-row explorer-row-directory", isFocused && "focused")}
              style={indent}
              onClick={() => {
                onFocus(row.path);
                onToggle(row.path);
              }}
            >
              {expanded.has(row.path) ? (
                <ChevronDown className="icon explorer-row-icon explorer-chevron" />
              ) : (
                <ChevronRight className="icon explorer-row-icon explorer-chevron" />
              )}
              <Folder className="icon explorer-row-icon folder" />
              <span className="explorer-row-label">{row.name}</span>
              <span className="explorer-row-actions">
                <button
                  type="button"
                  className="row-action-button"
                  aria-label="Create note in folder"
                  onClick={(event) => {
                    event.stopPropagation();
                    onCreateInDirectory(row.path);
                  }}
                >
                  <FilePlus2 className="icon" />
                </button>
                {row.path === "journal" || row.path.startsWith("journal/") ? (
                  <button
                    type="button"
                    className="row-action-button"
                    aria-label="Create journal entry in folder"
                    onClick={(event) => {
                      event.stopPropagation();
                      onCreateJournalInDirectory(row.path);
                    }}
                  >
                    <CalendarDays className="icon" />
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
            className={clsx(
              "explorer-row explorer-row-file",
              isSelected && "selected",
              isFocused && "focused"
            )}
            style={indent}
            onClick={() => {
              onFocus(row.path);
              onSelect(row.path);
            }}
          >
            <span className="explorer-row-icon spacer" />
            <FileText className="icon explorer-row-icon file" />
            <span className="explorer-row-label">{row.name}</span>
            {isDirty ? <span className="dirty-indicator" aria-label="Unsaved changes" /> : null}
            {gitStatuses[row.path] ? (
              <span className={clsx("git-status-badge", `git-status-${gitStatuses[row.path]}`)}>
                {gitStatuses[row.path]}
              </span>
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
  ) {
    const preserveSelection = options?.preserveSelection ?? false;
    const resetSearch = options?.resetSearch ?? true;
    const silent = options?.silent ?? false;
    const allowDirty = options?.allowDirty ?? false;
    const activateView = options?.activateView ?? !silent;
    const excludePathsOverride = options?.excludePathsOverride;
    if (isDirty && !allowDirty) {
      if (silent) {
        return;
      }

      const shouldDiscard = window.confirm(
        "You have unsaved changes in the current note. Discard them and switch spaces?"
      );

      if (!shouldDiscard) {
        return;
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
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : String(scanError));
      setFiles([]);
      setSelectedFile(null);
      setContent("");
      setDraftContent("");
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

  function handleOpenSpace(localPath: string) {
    const space = spaces.find((candidate) => candidate.localPath === localPath);
    if (space) {
      setActiveSpaceId(space.id);
    }

    setCurrentView("space");
    void scanRoot(localPath, { preserveSelection: true, resetSearch: false });
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

  function handleOpenRecentNote(note: RecentNote) {
    const space = spaces.find((item) => item.id === note.spaceId);
    if (!space) {
      showNotice("This space is no longer available");
      return;
    }

    handleOpenSpace(space.localPath);
    window.setTimeout(() => handleSelect(note.relativePath), 0);
  }

  function handleOpenWorkspaceSearchResult(group: WorkspaceSearchGroup, result: SearchResult) {
    handleOpenSpace(group.localPath);
    window.setTimeout(() => handleSelect(result.relative_path), 0);
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
      className="app-shell design-shell"
      style={{
        gridTemplateColumns: showSecondarySidebar
          ? `${RAIL_WIDTH}px ${SIDEBAR_WIDTH}px minmax(0, 1fr)`
          : `${RAIL_WIDTH}px minmax(0, 1fr)`
      }}
    >
      <aside className="design-rail">
        <button
          type="button"
          className={clsx("rail-brand", currentView === "home" && "active")}
          data-tooltip="Workspace Home"
          onClick={handleOpenHome}
        >
          {settings.brandLogoDataUrl ? (
            <img src={settings.brandLogoDataUrl} alt="App logo" className="rail-brand-image" />
          ) : (
            <PenTool className="icon" />
          )}
        </button>
        <nav className="rail-nav">
          <button
            type="button"
            className={clsx("rail-item", currentView === "home" && "active")}
            aria-label="Home"
            data-tooltip="Home"
            onClick={handleOpenHome}
          >
            <LayoutGrid className="icon" />
          </button>
          <button
            type="button"
            className={clsx("rail-item", currentView === "search" && "active")}
            aria-label="Search"
            data-tooltip="Search"
            onClick={handleOpenWorkspaceSearch}
          >
            <Search className="icon" />
          </button>
          <button
            type="button"
            className={clsx("rail-item", currentView === "space" && activePanel === "explorer" && "active")}
            aria-label="Explorer"
            data-tooltip="Explorer"
            onClick={() => {
              setCurrentView("space");
              setActivePanel("explorer");
            }}
          >
            <Folder className="icon" />
          </button>
          <button
            type="button"
            className={clsx("rail-item", currentView === "space" && activePanel === "bookmarks" && "active")}
            aria-label="Bookmarks"
            data-tooltip="Bookmarks"
            onClick={() => {
              setCurrentView("space");
              setActivePanel("bookmarks");
            }}
          >
            <Bookmark className="icon" />
          </button>
        </nav>
        <div className="rail-footer">
          <button
            type="button"
            className="rail-item"
            aria-label="Settings"
            data-tooltip="Settings"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings className="icon" />
          </button>
          <button
            type="button"
            className="rail-item"
            aria-label="Help"
            data-tooltip="Help"
            onClick={() => showNotice("Use arrows in the explorer and Enter to open")}
          >
            <HelpCircle className="icon" />
          </button>
        </div>
      </aside>

      {showSecondarySidebar ? (
      <aside className="design-sidebar">
        <section className="explorer-panel">
          <div className="explorer-panel-header">
            <span>Workspace Files</span>
            <div className="explorer-panel-actions">
              <button
                type="button"
                className="icon-button"
                onClick={() => void handleCreateJournalEntry()}
                disabled={!rootPath}
                aria-label="Create journal entry"
              >
                <CalendarDays className="icon" />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => void handleCreateNote()}
                disabled={!rootPath}
                aria-label="Create note"
              >
                <FilePlus2 className="icon" />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => void scanRoot(rootPath, { preserveSelection: true, resetSearch: false })}
                disabled={!rootPath || isLoadingTree}
                aria-label="Refresh scan"
              >
                <RefreshCw className="icon" />
              </button>
            </div>
          </div>

          <div className="explorer-search">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search project..."
            />
          </div>

          <div
            className="explorer-tree"
            role="tree"
            tabIndex={0}
            aria-label="Markdown files"
            onKeyDown={handleTreeKeyDown}
          >
            {activePanel === "explorer" && searchQuery.trim() ? (
              isSearching ? (
                <div className="explorer-empty">Searching notes…</div>
              ) : searchResults.length > 0 ? (
                <div className="search-results">
                  {searchResults.map((result) => (
                    <button
                      key={result.path}
                      type="button"
                      className={clsx(
                        "search-result-item",
                        selectedFile?.path === result.path && "selected"
                      )}
                      onClick={() => handleSelect(result.relative_path)}
                    >
                      <div className="search-result-topline">
                        <FileText className="icon explorer-row-icon file" />
                        <span className="search-result-name">{result.relative_path}</span>
                      </div>
                      <div className="search-result-meta">
                        {result.matched_on_path ? "Path match" : "Content match"}
                      </div>
                      {result.snippet ? (
                        <div className="search-result-snippet">{result.snippet}</div>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="explorer-empty">No notes matched this search.</div>
              )
            ) : activePanel === "explorer" && files.length > 0 ? (
              <TreeBranch
                rows={visibleRows}
                gitStatuses={gitStatuses}
                dirtyPath={dirtyRelativePath}
                expanded={expanded}
                selectedPath={selectedFile?.relative_path ?? null}
                focusedPath={focusedPath}
                onToggle={handleToggle}
                onSelect={handleSelect}
                onFocus={setFocusedPath}
                onCreateInDirectory={handleCreateNoteInDirectory}
                onCreateJournalInDirectory={handleCreateJournalInDirectory}
              />
            ) : activePanel === "bookmarks" ? (
              bookmarkedFiles.length > 0 ? (
                bookmarkedFiles.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    className={clsx(
                      "explorer-row explorer-row-file",
                      selectedFile?.path === file.path && "selected"
                    )}
                    onClick={() => handleSelect(file.relative_path)}
                  >
                    <span className="explorer-row-icon spacer" />
                    <Bookmark className="icon explorer-row-icon file" />
                    <span className="explorer-row-label">{file.relative_path}</span>
                    {dirtyRelativePath === file.relative_path ? (
                      <span className="dirty-indicator" aria-label="Unsaved changes" />
                    ) : null}
                    {gitStatuses[file.relative_path] ? (
                      <span className={clsx("git-status-badge", `git-status-${gitStatuses[file.relative_path]}`)}>
                        {gitStatuses[file.relative_path]}
                      </span>
                    ) : null}
                  </button>
                ))
              ) : (
                <div className="explorer-empty">Bookmark a file to keep it here.</div>
              )
            ) : (
              <div className="explorer-empty">
                {isLoadingTree ? "Scanning project…" : "No Markdown files loaded yet."}
              </div>
            )}
          </div>

          <div className="explorer-footer">
            <span>{files.length} files found</span>
            <span>{isAutoRefreshing ? "Synced now" : "Local view"}</span>
          </div>
        </section>

      </aside>
      ) : null}

      <div className="workspace-shell">
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

        <main className="workspace-main">
          {currentView === "home" ? (
            <section className="workspace-home">
              <div className="home-hero">
                <div>
                  <p className="home-kicker">Local-first workspace</p>
                  <h1>Spaces, recent notes, and fast entry points.</h1>
                  <p className="home-copy">
                    Open multiple markdown spaces, jump back into recent notes, and start a new note or
                    journal entry without digging through folders first.
                  </p>
                </div>
                <div className="home-actions">
                  <button type="button" className="primary-action" onClick={selectRootDirectory}>
                    Add Space
                  </button>
                  <button type="button" className="secondary-action" onClick={openCloneDialog}>
                    Clone Repository
                  </button>
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => {
                      if (activeSpace?.localPath) {
                        setCurrentView("space");
                        void handleCreateJournalEntry();
                        return;
                      }
                      showNotice("Open a space first to create a journal entry");
                    }}
                  >
                    New Journal Entry
                  </button>
                </div>
              </div>

              <div className="home-grid">
                <section className="home-panel">
                  <div className="home-panel-header">
                    <span>Spaces</span>
                    <strong>{spaces.length}</strong>
                  </div>
                  <div className="home-space-list">
                    {orderedVisibleSpaces.length > 0 ? (
                      orderedVisibleSpaces.map((space, index) => (
                        <div key={space.id} className="home-space-card">
                          <div className="home-space-head">
                            <button
                              type="button"
                              className="home-space-main"
                              onClick={() => handleOpenSpace(space.localPath)}
                            >
                              <div className="home-space-topline">
                                <Folder className="icon" />
                                <span>{getSpaceLabel(space)}</span>
                              </div>
                            </button>
                            <div className="home-card-actions">
                              <button
                                type="button"
                                className={clsx("mini-icon-button", space.isPinned && "active")}
                                aria-label={space.isPinned ? "Unpin space" : "Pin space"}
                                onClick={() => handleTogglePinnedSpace(space.id)}
                              >
                                <Pin className="icon" />
                              </button>
                              <button
                                type="button"
                                className="mini-icon-button"
                                aria-label="Move space up"
                                disabled={index === 0}
                                onClick={() => handleMoveSpace(space.id, -1)}
                              >
                                <ChevronUp className="icon" />
                              </button>
                              <button
                                type="button"
                                className="mini-icon-button"
                                aria-label="Move space down"
                                disabled={index === orderedVisibleSpaces.length - 1}
                                onClick={() => handleMoveSpace(space.id, 1)}
                              >
                                <ChevronDown className="icon" />
                              </button>
                              <button
                                type="button"
                                className="mini-icon-button"
                                aria-label="Reveal space in Finder"
                                onClick={() => void handleRevealSpace(space.id)}
                              >
                                <FolderOpen className="icon" />
                              </button>
                              <button
                                type="button"
                                className="mini-icon-button"
                                aria-label="Open space in Terminal"
                                onClick={() => void handleOpenSpaceTerminal(space.id)}
                              >
                                <TerminalSquare className="icon" />
                              </button>
                              <button
                                type="button"
                                className="mini-icon-button"
                                aria-label="Copy space path"
                                onClick={() => void handleCopySpacePath(space.id)}
                              >
                                <Copy className="icon" />
                              </button>
                              <button
                                type="button"
                                className="mini-icon-button"
                                aria-label="Rename space"
                                onClick={() => handleRenameSpace(space.id)}
                              >
                                <PencilLine className="icon" />
                              </button>
                              <button
                                type="button"
                                className="mini-icon-button"
                                aria-label={space.isArchived ? "Restore space" : "Archive space"}
                                onClick={() => handleToggleArchivedSpace(space.id)}
                              >
                                <Archive className="icon" />
                              </button>
                              <button
                                type="button"
                                className="mini-icon-button"
                                aria-label="Remove space"
                                onClick={() => handleRemoveSpace(space.id)}
                              >
                                <Trash2 className="icon" />
                              </button>
                            </div>
                          </div>
                          {gitInfos[space.id]?.is_repo ? (
                            <div className="home-space-badge">
                              Git repo{gitInfos[space.id]?.branch ? ` • ${gitInfos[space.id]?.branch}` : ""}
                            </div>
                          ) : null}
                          {space.isPinned ? <div className="home-space-badge home-space-badge-secondary">Pinned</div> : null}
                          <div className="home-space-path">{space.localPath}</div>
                          <div className="home-space-stats">
                            <span>{spaceSummaries[space.id]?.note_count ?? 0} notes</span>
                            <span>
                              {spaceSummaries[space.id]?.latest_modified_at
                                ? `Updated ${new Date(spaceSummaries[space.id].latest_modified_at!).toLocaleDateString()}`
                                : "No recent edits"}
                            </span>
                          </div>
                          <div className="home-space-meta">
                            Last opened {new Date(space.lastOpenedAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="explorer-empty">Add your first space to start building the workspace.</div>
                    )}
                  </div>
                </section>

                <section className="home-panel">
                  <div className="home-panel-header">
                    <span>Archived Spaces</span>
                    <strong>{archivedSpaces.length}</strong>
                  </div>
                  <div className="home-space-list">
                    {archivedSpaces.length > 0 ? (
                      archivedSpaces.map((space) => (
                        <div key={`archived:${space.id}`} className="home-space-card">
                          <div className="home-space-head">
                            <button
                              type="button"
                              className="home-space-main"
                              onClick={() => handleOpenSpace(space.localPath)}
                            >
                              <div className="home-space-topline">
                                <Folder className="icon" />
                                <span>{getSpaceLabel(space)}</span>
                              </div>
                            </button>
                            <div className="home-card-actions">
                              <button
                                type="button"
                                className="mini-icon-button"
                                aria-label="Restore space"
                                onClick={() => handleToggleArchivedSpace(space.id)}
                              >
                                <ArchiveRestore className="icon" />
                              </button>
                            </div>
                          </div>
                          <div className="home-space-path">{space.localPath}</div>
                        </div>
                      ))
                    ) : (
                      <div className="explorer-empty">Archived spaces stay here until you restore them.</div>
                    )}
                  </div>
                </section>

                <section className="home-panel">
                  <div className="home-panel-header">
                    <span>Recent Notes</span>
                    <strong>{recentNotes.length}</strong>
                  </div>
                  <div className="home-note-list">
                    {recentNotes.length > 0 ? (
                      recentNotes.map((note) => (
                        <button
                          key={`${note.spaceId}:${note.path}`}
                          type="button"
                          className="home-note-card"
                          onClick={() => handleOpenRecentNote(note)}
                        >
                          <div className="home-note-title">{note.relativePath}</div>
                          <div className="home-note-meta">{note.spaceName}</div>
                        </button>
                      ))
                    ) : (
                      <div className="explorer-empty">Open a few notes and they will appear here.</div>
                    )}
                  </div>
                </section>

                <section className="home-panel">
                  <div className="home-panel-header">
                    <span>Bookmarked Notes</span>
                    <strong>{homeBookmarkedNotes.length}</strong>
                  </div>
                  <div className="home-note-list">
                    {homeBookmarkedNotes.length > 0 ? (
                      homeBookmarkedNotes.map((note) => (
                        <button
                          key={`bookmark:${note.spaceId}:${note.path}`}
                          type="button"
                          className="home-note-card"
                          onClick={() => handleOpenRecentNote(note)}
                        >
                          <div className="home-note-title">{note.relativePath}</div>
                          <div className="home-note-meta">{note.spaceName}</div>
                        </button>
                      ))
                    ) : (
                      <div className="explorer-empty">Bookmark notes to pin them on the workspace home.</div>
                    )}
                  </div>
                </section>

                <section className="home-panel">
                  <div className="home-panel-header">
                    <span>Create From Template</span>
                    <strong>4</strong>
                  </div>
                  <div className="home-template-list">
                    <button type="button" className="home-template-card" onClick={() => void handleCreateNote()}>
                      <strong>Blank Note</strong>
                      <span>General markdown note with basic frontmatter.</span>
                    </button>
                    <button
                      type="button"
                      className="home-template-card"
                      onClick={() => void handleCreateJournalEntry()}
                    >
                      <strong>Daily Journal</strong>
                      <span>Dated entry with notes, wins, and next sections.</span>
                    </button>
                    <button
                      type="button"
                      className="home-template-card"
                      onClick={() => void handleCreateTemplateNote("idea")}
                    >
                      <strong>Idea Note</strong>
                      <span>Capture a problem, approach, and open questions.</span>
                    </button>
                    <button
                      type="button"
                      className="home-template-card"
                      onClick={() => void handleCreateTemplateNote("meeting")}
                    >
                      <strong>Meeting Note</strong>
                      <span>Track attendees, agenda, decisions, and follow-ups.</span>
                    </button>
                  </div>
                </section>
              </div>
            </section>
          ) : currentView === "search" ? (
            <section className="workspace-search">
              <div className="search-hero">
                <p className="home-kicker">Across all spaces</p>
                <h1>Find notes by path or content.</h1>
                <p className="home-copy">
                  Search every connected space at once, then jump straight into the matching note.
                </p>
                <div className="search-filters">
                  <div className="search-filter">
                    <Label>Scope</Label>
                    <Select
                      value={workspaceSearchScope}
                      onValueChange={(value) => setWorkspaceSearchScope(value as WorkspaceSearchScope)}
                    >
                      <SelectTrigger className="h-10 min-w-[160px] rounded-[8px] bg-[color:var(--surface-lowest)]">
                        <SelectValue placeholder="Choose scope" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All spaces</SelectItem>
                        <SelectItem value="current">Current space</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="search-filter-toggle">
                    <Checkbox
                      checked={workspaceSearchBookmarksOnly}
                      onCheckedChange={(checked) =>
                        setWorkspaceSearchBookmarksOnly(checked === true)
                      }
                    />
                    <span>Bookmarked notes only</span>
                  </label>
                </div>
              </div>

              {workspaceSearchQuery.trim() ? (
                isWorkspaceSearching ? (
                  <div className="explorer-empty">Searching across spaces…</div>
                ) : workspaceSearchGroups.length > 0 ? (
                  <div className="workspace-search-groups">
                    {workspaceSearchGroups.map((group) => (
                      <section key={group.spaceId} className="workspace-search-group">
                        <div className="workspace-search-group-header">
                          <div className="home-space-topline">
                            <Folder className="icon" />
                            <span>{group.spaceName}</span>
                          </div>
                          <strong>{group.results.length} matches</strong>
                        </div>
                        <div className="workspace-search-group-results">
                          {group.results.map((result) => (
                            <button
                              key={`${group.spaceId}:${result.path}`}
                              type="button"
                              className="search-result-item"
                              onClick={() => handleOpenWorkspaceSearchResult(group, result)}
                            >
                              <div className="search-result-topline">
                                <FileText className="icon explorer-row-icon file" />
                                <span className="search-result-name">
                                  {highlightParts(result.relative_path, workspaceSearchQuery).map((part, index) => (
                                    <mark
                                      key={`${result.path}:path:${index}`}
                                      className={clsx("search-highlight", !part.match && "plain")}
                                    >
                                      {part.text}
                                    </mark>
                                  ))}
                                </span>
                              </div>
                              <div className="search-result-meta">
                                {result.matched_on_path ? "Path match" : "Content match"}
                              </div>
                              {result.snippet ? (
                                <div className="search-result-snippet">
                                  {highlightParts(result.snippet, workspaceSearchQuery).map((part, index) => (
                                    <mark
                                      key={`${result.path}:snippet:${index}`}
                                      className={clsx("search-highlight", !part.match && "plain")}
                                    >
                                      {part.text}
                                    </mark>
                                  ))}
                                </div>
                              ) : null}
                            </button>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <div className="explorer-empty">No notes matched this workspace search.</div>
                )
              ) : (
                <div className="search-empty-grid">
                  <div className="home-template-card">
                    <strong>Search all spaces</strong>
                    <span>Use the top bar to search note paths and content across your connected workspaces.</span>
                  </div>
                  <div className="home-template-card">
                    <strong>Jump back faster</strong>
                    <span>Results are grouped by space so it is easy to orient yourself before opening a note.</span>
                  </div>
                </div>
              )}
            </section>
          ) : (
          <section className="grid h-full min-h-0 grid-rows-[58px_minmax(0,1fr)]">
            <div className="flex items-center justify-between gap-4 border-b border-[color:var(--outline)] bg-[color:var(--toolbar-bg)] px-5">
              <div className="inline-flex gap-1 rounded-[8px] bg-[color:var(--surface-highest)] p-1">
                <Button
                  type="button"
                  variant="ghost"
                  className={clsx(
                    "h-auto rounded-[6px] px-4 py-1.5 text-[0.76rem] font-bold text-[color:var(--text-muted)] hover:bg-transparent hover:text-[color:var(--text)]",
                    viewMode === "preview" && "bg-[color:var(--bg)] text-[color:var(--text)] hover:bg-[color:var(--bg)]"
                  )}
                  onClick={() => setViewMode("preview")}
                >
                  Preview
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className={clsx(
                    "h-auto rounded-[6px] px-4 py-1.5 text-[0.76rem] font-bold text-[color:var(--text-muted)] hover:bg-transparent hover:text-[color:var(--text)]",
                    viewMode === "source" && "bg-[color:var(--bg)] text-[color:var(--text)] hover:bg-[color:var(--bg)]"
                  )}
                  onClick={() => setViewMode("source")}
                >
                  Source
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {settings.toolbar.save && selectedFile ? (
                  <Button
                    type="button"
                    variant={isDirty ? "default" : "secondary"}
                    className="min-w-[72px] px-[14px] py-2 text-[0.76rem] font-bold"
                    aria-label="Save"
                    onClick={() => void handleSaveCurrentFile()}
                    disabled={isSavingFile}
                  >
                    {isSavingFile
                      ? settings.autosave && isDirty
                        ? "Autosaving..."
                        : "Saving..."
                      : isDirty
                        ? settings.autosave
                          ? "Autosave on"
                          : "Save"
                        : "Saved"}
                  </Button>
                ) : null}
                {settings.toolbar.createNote ? <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-[34px] w-[34px] rounded-[6px] text-[color:var(--text-muted)] hover:bg-[color:var(--surface-high)] hover:text-[color:var(--text)]"
                  aria-label="Create note"
                  onClick={() => void handleCreateNote()}
                >
                  <FilePlus2 className="icon" />
                </Button> : null}
                {settings.toolbar.createJournal ? <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-[34px] w-[34px] rounded-[6px] text-[color:var(--text-muted)] hover:bg-[color:var(--surface-high)] hover:text-[color:var(--text)]"
                  aria-label="Create journal entry"
                  onClick={() => void handleCreateJournalEntry()}
                >
                  <CalendarDays className="icon" />
                </Button> : null}
                {settings.toolbar.rename ? <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-[34px] w-[34px] rounded-[6px] text-[color:var(--text-muted)] hover:bg-[color:var(--surface-high)] hover:text-[color:var(--text)]"
                  aria-label="Rename note"
                  onClick={() => void handleRenameCurrentFile()}
                  disabled={!selectedFile || isDirty}
                >
                  <PencilLine className="icon" />
                </Button> : null}
                {settings.toolbar.editMode ? <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-[34px] w-[34px] rounded-[6px] text-[color:var(--text-muted)] hover:bg-[color:var(--surface-high)] hover:text-[color:var(--text)]"
                  aria-label="Edit"
                  onClick={() => setViewMode((current) => (current === "preview" ? "source" : "preview"))}
                >
                  <Pencil className="icon" />
                </Button> : null}
                {settings.toolbar.print ? <Button type="button" variant="ghost" size="icon" className="h-[34px] w-[34px] rounded-[6px] text-[color:var(--text-muted)] hover:bg-[color:var(--surface-high)] hover:text-[color:var(--text)]" aria-label="Print" onClick={handlePrint}>
                  <Printer className="icon" />
                </Button> : null}
                {settings.toolbar.download ? <Button type="button" variant="ghost" size="icon" className="h-[34px] w-[34px] rounded-[6px] text-[color:var(--text-muted)] hover:bg-[color:var(--surface-high)] hover:text-[color:var(--text)]" aria-label="Download" onClick={handleDownload}>
                  <Download className="icon" />
                </Button> : null}
                {settings.toolbar.metadata ? <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={clsx(
                    "h-[34px] w-[34px] rounded-[6px] text-[color:var(--text-muted)] hover:bg-[color:var(--surface-high)] hover:text-[color:var(--text)]",
                    documentPanel === "metadata" && "text-[color:var(--indigo-soft)]"
                  )}
                  aria-label="Document metadata"
                  onClick={() =>
                    setDocumentPanel((current) => (current === "metadata" ? "toc" : "metadata"))
                  }
                >
                  <Info className="icon" />
                </Button> : null}
                {settings.toolbar.delete ? <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-[34px] w-[34px] rounded-[6px] text-[color:var(--text-muted)] hover:bg-[color:var(--surface-high)] hover:text-[color:var(--text)]"
                  aria-label="Delete note"
                  onClick={() => void handleDeleteCurrentFile()}
                  disabled={!selectedFile || isDirty}
                >
                  <Trash2 className="icon" />
                </Button> : null}
                {settings.toolbar.settings ? <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-[34px] w-[34px] rounded-[6px] text-[color:var(--text-muted)] hover:bg-[color:var(--surface-high)] hover:text-[color:var(--text)]"
                  aria-label="Open settings"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  <Settings className="icon" />
                </Button> : null}
                <Separator orientation="vertical" className="mx-1 h-5 bg-[color:var(--outline)]" />
                <span className="pl-0 text-[0.72rem] text-[color:var(--text-muted)]">UTF-8 • Markdown</span>
              </div>
            </div>

            <div className="preview-content-shell">
              <section className="preview-canvas">
                {error ? <div className="error-banner">{error}</div> : null}

                {selectedFile ? (
                  isLoadingFile ? (
                    <div className="design-empty-state">Loading file…</div>
                  ) : (
                    <div className="preview-scroll" ref={previewScrollRef}>
                      <div className="preview-breadcrumb">
                        <Warehouse className="icon" />
                        <span>/</span>
                        <span>{selectedFile.relative_path}</span>
                        {settings.toolbar.bookmark ? (
                          <button
                            type="button"
                            className={clsx(
                              "breadcrumb-bookmark",
                              bookmarks.includes(selectedFile.path) && "active"
                            )}
                            aria-label="Bookmark"
                            onClick={() => toggleBookmark(selectedFile)}
                          >
                            <Star
                              className="icon"
                              fill={bookmarks.includes(selectedFile.path) ? "currentColor" : "none"}
                            />
                          </button>
                        ) : null}
                      </div>
                      {viewMode === "preview" ? (
                        <Suspense fallback={<div className="design-empty-state">Rendering preview…</div>}>
                          <MarkdownPreview content={draftContent} />
                        </Suspense>
                      ) : (
                        <textarea
                          className={clsx("source-editor", settings.sourceWrap && "wrap")}
                          value={draftContent}
                          onChange={(event) => setDraftContent(event.target.value)}
                          spellCheck={false}
                        />
                      )}
                    </div>
                  )
                ) : (
                  <div className="design-empty-hero">
                    <div className="empty-hero-icon">
                      <Pencil className="icon" />
                    </div>
                    <h3>No file selected</h3>
                    <p>
                      Select a markdown file from the explorer on the left to start
                      viewing its rendered content.
                    </p>
                    <div className="empty-hero-grid">
                      <button type="button" className="empty-card" onClick={() => void handleCreateNote()}>
                        <strong>New Document</strong>
                        <span>Create a new markdown note inside the current space.</span>
                      </button>
                      <button type="button" className="empty-card" onClick={() => void handleCreateJournalEntry()}>
                        <strong>Daily Journal</strong>
                        <span>Create a dated note inside the journal folder structure.</span>
                      </button>
                      <button
                        type="button"
                        className="empty-card"
                        onClick={() => showNotice("Arrow keys move focus. Enter opens the selected file.")}
                      >
                        <strong>Keyboard Shortcuts</strong>
                        <span>Use arrow keys in the explorer and press Enter to open.</span>
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {settings.showToc || documentPanel === "metadata" ? (
                <aside className="toc-panel">
                <div className="toc-panel-header">
                  {documentPanel === "metadata" ? "Document Metadata" : "Table Of Contents"}
                </div>
                {documentPanel === "metadata" ? (
                  <div className="metadata-panel metadata-panel-document">
                    <div className="metadata-item">
                      <span>Project</span>
                      <strong>{projectName}</strong>
                    </div>
                    <div className="metadata-item">
                      <span>Root</span>
                      <strong>{rootPath || "Not selected"}</strong>
                    </div>
                    <div className="metadata-item">
                      <span>Excluded paths</span>
                      <strong>{activeExcludePaths.join(", ")}</strong>
                    </div>
                    <div className="metadata-item">
                      <span>Markdown files</span>
                      <strong>{files.length}</strong>
                    </div>
                    <div className="metadata-item">
                      <span>Bookmarks</span>
                      <strong>{bookmarkedFiles.length}</strong>
                    </div>
                    <div className="metadata-item">
                      <span>Current file</span>
                      <strong>{selectedFile?.relative_path || "None"}</strong>
                    </div>
                    <div className="metadata-item">
                      <span>Git Status</span>
                      <strong>
                        {selectedFile ? gitStatuses[selectedFile.relative_path] || "clean" : "None"}
                      </strong>
                    </div>
                    <div className="metadata-item">
                      <span>Title</span>
                      <strong>{frontmatter.title || prettifyNoteTitle(selectedFile?.relative_path || "") || "None"}</strong>
                    </div>
                    <div className="metadata-item">
                      <span>Template</span>
                      <strong>{frontmatter.template || "None"}</strong>
                    </div>
                    <div className="metadata-item">
                      <span>Date</span>
                      <strong>{frontmatter.date || "None"}</strong>
                    </div>
                    <div className="metadata-item">
                      <span>Tags</span>
                      <strong>{frontmatter.tags.length > 0 ? frontmatter.tags.join(", ") : "None"}</strong>
                    </div>
                    <div className="metadata-item">
                      <span>Repository</span>
                      <strong>{activeGitInfo?.is_repo ? "Git repository" : "Local folder"}</strong>
                    </div>
                    {activeGitInfo?.is_repo ? (
                      <>
                        <div className="metadata-item">
                          <span>Branch</span>
                          <strong>{activeGitInfo.branch || "Unknown"}</strong>
                        </div>
                        <div className="metadata-item">
                          <span>Remote</span>
                          <strong>{activeGitInfo.remote_url || "No origin remote"}</strong>
                        </div>
                        <div className="metadata-item metadata-history">
                          <span>Recent file history</span>
                          {selectedFile ? (
                            fileHistory.length > 0 ? (
                              <div className="history-list">
                                {fileHistory.map((entry) => (
                                  <div key={entry.commit_hash} className="history-entry">
                                    <div className="history-entry-topline">
                                      <strong>{entry.summary}</strong>
                                      <code>{entry.short_hash}</code>
                                    </div>
                                    <div className="history-entry-meta">
                                      <span>{entry.author_name}</span>
                                      <span>{new Date(entry.committed_at).toLocaleString()}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <strong>No local commit history for this file yet.</strong>
                            )
                          ) : (
                            <strong>Open a Markdown file to inspect its local git history.</strong>
                          )}
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : viewMode === "preview" && headings.length > 0 ? (
                  <div className="toc-list">
                    {headings.map((heading, index) => (
                      <button
                        key={`${heading.id}-${index}`}
                        type="button"
                        className="toc-item"
                        onClick={() => scrollToHeading(heading.id)}
                        style={{ paddingLeft: `${(heading.level - 1) * 18 + 12}px` }}
                      >
                        {heading.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="toc-empty">
                    {viewMode === "source"
                      ? "Switch to preview to use the outline."
                      : "Open a markdown file with headings to populate this outline."}
                  </div>
                )}
                </aside>
              ) : null}
            </div>
          </section>
          )}
        </main>
      </div>
      {notice ? <div className="app-notice">{notice}</div> : null}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="grid grid-rows-[auto_minmax(0,1fr)_auto] p-0">
          <DialogHeader className="settings-header-shadcn">
            <div>
              <DialogTitle>Settings</DialogTitle>
              <DialogDescription>
                Personalize the viewer without changing the core workflow.
              </DialogDescription>
            </div>
            <DialogIconClose />
          </DialogHeader>

          <ScrollArea className="settings-body">
            <div className="settings-grid">
              <div className="settings-field">
                <span>Theme</span>
                <Select
                  value={settings.theme}
                  onValueChange={(value) =>
                    updateSettings({ theme: value as AppSettings["theme"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="settings-field">
                <span>Brand logo</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="settings-brand-preview"
                    onClick={handlePickBrandLogo}
                    aria-label="Choose custom brand logo"
                  >
                    {settings.brandLogoDataUrl ? (
                      <img
                        src={settings.brandLogoDataUrl}
                        alt="Selected brand logo"
                        className="settings-brand-preview-image"
                      />
                    ) : (
                      <PenTool className="icon" />
                    )}
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={handlePickBrandLogo}>
                      Upload logo
                    </Button>
                    {settings.brandLogoDataUrl ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => updateSettings({ brandLogoDataUrl: "" })}
                      >
                        Reset
                      </Button>
                    ) : null}
                  </div>
                </div>
                <small>Uses a simple pen icon by default. Upload a square logo to personalize the rail brand.</small>
                <input
                  ref={brandLogoInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleBrandLogoSelected}
                />
              </div>

              <div className="settings-field">
                <span>Auto-refresh</span>
                <Select
                  value={String(settings.autoRefreshMs)}
                  onValueChange={(value) =>
                    updateSettings({ autoRefreshMs: Number(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select refresh interval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2000">2 seconds</SelectItem>
                    <SelectItem value="4000">4 seconds</SelectItem>
                    <SelectItem value="8000">8 seconds</SelectItem>
                    <SelectItem value="15000">15 seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <label className="settings-toggle">
                <Checkbox
                  checked={settings.showToc}
                  onCheckedChange={(checked) =>
                    updateSettings({ showToc: checked === true })
                  }
                />
                <div>
                  <strong>Show table of contents</strong>
                  <span>Keep the right-side outline visible while reading.</span>
                </div>
              </label>

              <label className="settings-toggle">
                <Checkbox
                  checked={settings.sourceWrap}
                  onCheckedChange={(checked) =>
                    updateSettings({ sourceWrap: checked === true })
                  }
                />
                <div>
                  <strong>Wrap source lines</strong>
                  <span>Wrap long lines in source mode instead of horizontal scrolling.</span>
                </div>
              </label>

              <label className="settings-toggle">
                <Checkbox
                  checked={settings.autosave}
                  onCheckedChange={(checked) =>
                    updateSettings({ autosave: checked === true })
                  }
                />
                <div>
                  <strong>Autosave changes</strong>
                  <span>Save the current note automatically after a short pause while editing.</span>
                </div>
              </label>

              <label className="settings-toggle">
                <Checkbox
                  checked={viewMode === "source"}
                  onCheckedChange={(checked) =>
                    setViewMode(checked === true ? "source" : "preview")
                  }
                />
                <div>
                  <strong>Open in source mode</strong>
                  <span>Quickly inspect raw Markdown without switching manually.</span>
                </div>
              </label>

              <div className="settings-field settings-field-wide">
                <span>Toolbar items</span>
                <div className="settings-toolbar-grid">
                  <TooltipProvider delayDuration={120}>
                    {TOOLBAR_ITEM_OPTIONS.map((item) => {
                      const Icon = item.icon;
                      const isSelected = settings.toolbar[item.key];
                      return (
                        <button
                          key={item.key}
                          type="button"
                          className="settings-toolbar-item"
                          aria-pressed={isSelected}
                          onClick={() =>
                            updateSettings({
                              toolbar: {
                                ...settings.toolbar,
                                [item.key]: !settings.toolbar[item.key]
                              }
                            })
                          }
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={clsx(
                                  "settings-toolbar-icon",
                                  isSelected && "settings-toolbar-icon-selected"
                                )}
                                aria-hidden="true"
                              >
                                <Icon className="h-4.5 w-4.5" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="grid gap-0.5">
                                <span>{item.label}</span>
                                <span className="text-[color:var(--text-muted)]">
                                  {item.description}
                                </span>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </button>
                      );
                    })}
                  </TooltipProvider>
                </div>
              </div>

              {activeSpace ? (
                <div className="settings-field settings-field-wide">
                  <span>Space excludes</span>
                  <Textarea
                    value={excludePathsInput}
                    onChange={(event) => setExcludePathsInput(event.target.value)}
                    placeholder={DEFAULT_SPACE_EXCLUDES.join("\n")}
                    className="min-h-[140px] resize-y"
                  />
                  <small>
                    One path per line. Matching folders are skipped during scan, search,
                    summaries, and git badges.
                  </small>
                </div>
              ) : null}
            </div>
          </ScrollArea>

          <DialogFooter className="settings-footer-shadcn justify-between">
            <div>
              {activeSpace ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSaveSpaceExcludes}
                >
                  Save space excludes
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSettings(DEFAULT_SETTINGS);
                  showNotice("Settings reset");
                }}
              >
                Reset defaults
              </Button>
              <Button type="button" onClick={() => setIsSettingsOpen(false)}>
                Done
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(noteDialog)} onOpenChange={(open) => !open && setNoteDialog(null)}>
        {noteDialog ? (
          <DialogContent className="note-dialog grid grid-rows-[auto_minmax(0,1fr)_auto] p-0">
            <DialogHeader className="settings-header-shadcn">
              <div>
                <DialogTitle>{noteDialog.title}</DialogTitle>
                <DialogDescription>{noteDialog.description}</DialogDescription>
              </div>
              <DialogIconClose />
            </DialogHeader>

            <div className="settings-grid">
              {noteDialog.mode === "rename" ? (
                <div className="settings-field">
                  <Label>Markdown path</Label>
                  <Input
                    type="text"
                    value={notePathInput}
                    onChange={(event) => setNotePathInput(event.target.value)}
                    placeholder="notes/untitled.md"
                    autoFocus
                  />
                </div>
              ) : (
                <>
                  <div className="settings-field">
                    <Label>Parent folder</Label>
                    <Select
                      value={noteDirectoryInput}
                      onValueChange={handleNoteDirectoryChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a folder" />
                      </SelectTrigger>
                      <SelectContent>
                        {directoryOptions.map((directory) => (
                          <SelectItem key={directory || "root"} value={directory}>
                            {directory || "Root"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="inline-field">
                      <Button type="button" variant="secondary" onClick={handleUseCurrentFolder}>
                        Use current folder
                      </Button>
                    </div>
                  </div>
                  <div className="settings-field">
                    <Label>Filename</Label>
                    <Input
                      type="text"
                      value={noteNameInput}
                      onChange={(event) => handleNoteNameChange(event.target.value)}
                      placeholder="untitled.md"
                      autoFocus
                    />
                  </div>
                  <div className="settings-field settings-field-wide">
                    <Label>Resulting path</Label>
                    <Input type="text" value={notePathInput} readOnly />
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="settings-footer-shadcn">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="button" onClick={() => void handleSubmitNoteDialog()}>
                {noteDialog.confirmLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
      <Dialog open={Boolean(cloneDialog)} onOpenChange={(open) => !open && setCloneDialog(null)}>
        {cloneDialog ? (
          <DialogContent className="note-dialog grid grid-rows-[auto_minmax(0,1fr)_auto] p-0">
            <DialogHeader className="settings-header-shadcn">
              <div>
                <DialogTitle>Clone Repository</DialogTitle>
                <DialogDescription>
                  Clone a public or already-authenticated git repository into a local space.
                </DialogDescription>
              </div>
              <DialogIconClose />
            </DialogHeader>

            <div className="settings-grid">
              <div className="settings-field">
                <Label>Repository URL</Label>
                <Input
                  type="text"
                  value={cloneDialog.repoUrl}
                  onChange={(event) =>
                    setCloneDialog((current) => (current ? { ...current, repoUrl: event.target.value } : current))
                  }
                  placeholder="https://github.com/owner/repo.git"
                  autoFocus
                />
              </div>

              <div className="settings-field">
                <Label>Destination Folder</Label>
                <div className="inline-field">
                  <Input
                    type="text"
                    value={cloneDialog.destinationParent}
                    onChange={(event) =>
                      setCloneDialog((current) =>
                        current ? { ...current, destinationParent: event.target.value } : current
                      )
                    }
                    placeholder="/Users/you/repos"
                  />
                  <Button type="button" variant="secondary" onClick={() => void chooseCloneDestination()}>
                    Choose
                  </Button>
                </div>
              </div>

              <div className="settings-field">
                <Label>Local Folder Name</Label>
                <Input
                  type="text"
                  value={cloneDialog.directoryName}
                  onChange={(event) =>
                    setCloneDialog((current) =>
                      current ? { ...current, directoryName: event.target.value } : current
                    )
                  }
                  placeholder="repo-name"
                />
              </div>
            </div>

            <DialogFooter className="settings-footer-shadcn">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="button" onClick={() => void handleSubmitCloneDialog()}>
                Clone Repository
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
