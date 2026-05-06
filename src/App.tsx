import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
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
  Printer,
  RefreshCw,
  Search,
  Settings,
  Share2,
  SquareTerminal,
  Star,
  Trash2,
  UserCircle2,
  Warehouse
} from "lucide-react";
import { useWorkspace } from "./features/spaces/useWorkspace";

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

type RecentNote = {
  path: string;
  relativePath: string;
  spaceId: string;
  spaceName: string;
  openedAt: string;
};

type AppSettings = {
  theme: "dark" | "light";
  showToc: boolean;
  sourceWrap: boolean;
  autoRefreshMs: number;
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

const MarkdownPreview = lazy(() => import("./MarkdownPreview"));
const BOOKMARKS_KEY = "md-project-viewer:bookmarks";
const RECENT_NOTES_KEY = "md-project-viewer:recent-notes";
const SETTINGS_KEY = "md-project-viewer:settings";
const AUTO_REFRESH_MS = 4000;
const MAX_RECENT_NOTES = 8;
const RAIL_WIDTH = 80;
const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  showToc: true,
  sourceWrap: true,
  autoRefreshMs: AUTO_REFRESH_MS
};

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
  expanded: Set<string>;
  selectedPath: string | null;
  focusedPath: string | null;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  onFocus: (path: string) => void;
};

function TreeBranch({
  rows,
  expanded,
  selectedPath,
  focusedPath,
  onToggle,
  onSelect,
  onFocus
}: TreeProps) {
  return (
    <>
      {rows.map((row) => {
        const isSelected = selectedPath === row.path;
        const isFocused = focusedPath === row.path;
        const indent = { paddingLeft: `${row.depth * 18 + 14}px` };

        if (row.kind === "directory") {
          return (
            <button
              key={row.id}
              type="button"
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
            </button>
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
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const [activePanel, setActivePanel] = useState<"explorer" | "bookmarks" | "metadata">("explorer");
  const [viewMode, setViewMode] = useState<"preview" | "source">("preview");
  const [notice, setNotice] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [noteDialog, setNoteDialog] = useState<NoteDialogState>(null);
  const [cloneDialog, setCloneDialog] = useState<CloneDialogState | null>(null);
  const [notePathInput, setNotePathInput] = useState("");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [gitInfos, setGitInfos] = useState<Record<string, GitRepoInfo>>({});
  const resizeState = useRef<{ startX: number; startWidth: number } | null>(null);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);
  const hasAutoOpenedActiveSpace = useRef(false);
  const { hydrated, spaces, activeSpace, activeSpaceId, upsertSpace, setActiveSpaceId, clearWorkspace } =
    useWorkspace();

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
  const activeGitInfo = activeSpaceId ? gitInfos[activeSpaceId] : undefined;
  const projectName = useMemo(() => {
    if (activeSpace?.name) {
      return activeSpace.name;
    }

    if (!rootPath) {
      return "Project Root";
    }

    const pieces = rootPath.split(/[\\/]/).filter(Boolean);
    return pieces[pieces.length - 1] ?? rootPath;
  }, [activeSpace?.name, rootPath]);
  const isDirty = selectedFile !== null && draftContent !== content;

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
  }, [noteDialog]);

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
      void invoke<SearchResult[]>("search_markdown", { path: rootPath, query })
        .then((results) => setSearchResults(results))
        .catch((searchError) =>
          setError(searchError instanceof Error ? searchError.message : String(searchError))
        )
        .finally(() => setIsSearching(false));
    }, 160);

    return () => window.clearTimeout(timeoutId);
  }, [rootPath, searchQuery]);

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
        spaces.map(async (space) => {
          const results = await invoke<SearchResult[]>("search_markdown", {
            path: space.localPath,
            query
          });

          return {
            spaceId: space.id,
            spaceName: space.name,
            localPath: space.localPath,
            results
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
  }, [currentView, spaces, workspaceSearchQuery]);

  useEffect(() => {
    if (spaces.length === 0) {
      setSpaceSummaries({});
      return;
    }

    let cancelled = false;

    void Promise.all(
      spaces.map(async (space) => {
        const summary = await invoke<SpaceSummary>("summarize_space", { path: space.localPath });
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
    }
  ) {
    const preserveSelection = options?.preserveSelection ?? false;
    const resetSearch = options?.resetSearch ?? true;
    const silent = options?.silent ?? false;
    const allowDirty = options?.allowDirty ?? false;
    const activateView = options?.activateView ?? !silent;
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
      const scanned = await invoke<MdFile[]>("scan_directory", { path });
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

  function handleResizeStart(event: React.MouseEvent<HTMLButtonElement>) {
    resizeState.current = { startX: event.clientX, startWidth: sidebarWidth };

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!resizeState.current) {
        return;
      }

      const width = resizeState.current.startWidth + (moveEvent.clientX - resizeState.current.startX);
      setSidebarWidth(Math.max(280, Math.min(440, width)));
    };

    const onMouseUp = () => {
      resizeState.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
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

  async function handleSaveCurrentFile() {
    if (!selectedFile) {
      showNotice("Open a file first");
      return;
    }

    if (!isDirty) {
      showNotice("No changes to save");
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
      showNotice("Markdown saved");
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

    const suggestedPath =
      selectedFile?.relative_path.replace(/\.(md|markdown)$/i, "-copy.md") ?? "notes/untitled.md";

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

    const initialPath =
      template === "idea" ? `notes/ideas/${formatIsoDate()}-untitled.md` : `notes/meetings/${formatIsoDate()}-meeting.md`;

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

    setNoteDialog({
      mode: "journal",
      template: "journal",
      title: "Create Journal Entry",
      description: "Create a dated note inside the journal folder structure.",
      confirmLabel: "Create Entry",
      initialPath: formatTodayPath()
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

    const requestedPath = notePathInput.trim();
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
        gridTemplateColumns: `${RAIL_WIDTH}px ${sidebarWidth}px 8px minmax(0, 1fr)`
      }}
    >
      <aside className="design-rail">
        <button type="button" className={clsx("rail-brand", currentView === "home" && "active")} onClick={handleOpenHome}>
          <SquareTerminal className="icon" />
        </button>
        <nav className="rail-nav">
          <button
            type="button"
            className={clsx("rail-item", currentView === "home" && "active")}
            aria-label="Home"
            onClick={handleOpenHome}
          >
            <LayoutGrid className="icon" />
          </button>
          <button
            type="button"
            className={clsx("rail-item", currentView === "search" && "active")}
            aria-label="Search"
            onClick={handleOpenWorkspaceSearch}
          >
            <Search className="icon" />
          </button>
          <button
            type="button"
            className={clsx("rail-item", currentView === "space" && activePanel === "explorer" && "active")}
            aria-label="Explorer"
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
            onClick={() => {
              setCurrentView("space");
              setActivePanel("bookmarks");
            }}
          >
            <Bookmark className="icon" />
          </button>
          <button
            type="button"
            className={clsx("rail-item", currentView === "space" && activePanel === "metadata" && "active")}
            aria-label="Metadata"
            onClick={() => {
              setCurrentView("space");
              setActivePanel("metadata");
            }}
          >
            <Info className="icon" />
          </button>
        </nav>
        <div className="rail-footer">
          <button
            type="button"
            className="rail-item"
            aria-label="Settings"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings className="icon" />
          </button>
          <button
            type="button"
            className="rail-item"
            aria-label="Help"
            onClick={() => showNotice("Use arrows in the explorer and Enter to open")}
          >
            <HelpCircle className="icon" />
          </button>
        </div>
      </aside>

      <aside className="design-sidebar">
        <div className="design-sidebar-header">
          <div className="project-header">
            <div className="project-badge">
              <Folder className="icon" />
            </div>
            <div>
              <h1 className="project-title">{projectName}</h1>
              <p className="project-status">
                <span className="status-dot" />
                {isLoadingTree
                  ? "Scanning..."
                  : isLoadingFile
                    ? "Loading..."
                    : isAutoRefreshing
                      ? "Watching..."
                      : "Ready"}
              </p>
            </div>
          </div>

          <button type="button" className="folder-button" onClick={selectRootDirectory}>
            <Folder className="icon" />
            <span>Select Folder</span>
          </button>
        </div>

        <div className="design-sidebar-nav">
          <button
            type="button"
            className={clsx("sidebar-nav-item", activePanel === "explorer" && "active")}
            onClick={() => setActivePanel("explorer")}
          >
            <Folder className="icon" />
            <span>Explorer</span>
          </button>
          <button
            type="button"
            className={clsx("sidebar-nav-item", activePanel === "bookmarks" && "active")}
            onClick={() => setActivePanel("bookmarks")}
          >
            <Bookmark className="icon" />
            <span>Bookmarks</span>
          </button>
          <button
            type="button"
            className={clsx("sidebar-nav-item", activePanel === "metadata" && "active")}
            onClick={() => setActivePanel("metadata")}
          >
            <Info className="icon" />
            <span>Metadata</span>
          </button>
        </div>

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
                expanded={expanded}
                selectedPath={selectedFile?.relative_path ?? null}
                focusedPath={focusedPath}
                onToggle={handleToggle}
                onSelect={handleSelect}
                onFocus={setFocusedPath}
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
                  </button>
                ))
              ) : (
                <div className="explorer-empty">Bookmark a file to keep it here.</div>
              )
            ) : activePanel === "metadata" ? (
              <div className="metadata-panel">
                <div className="metadata-item">
                  <span>Project</span>
                  <strong>{projectName}</strong>
                </div>
                <div className="metadata-item">
                  <span>Root</span>
                  <strong>{rootPath || "Not selected"}</strong>
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
                  </>
                ) : null}
              </div>
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

        <div className="recent-roots-panel">
          <div className="recent-roots-header">
            <span>Spaces</span>
            {spaces.length > 0 ? (
              <button type="button" className="text-action" onClick={clearAllSpaces}>
                Clear
              </button>
            ) : null}
          </div>
          <div className="recent-roots-list">
            {spaces.length > 0 ? (
              spaces.map((space) => (
                <button
                  key={space.id}
                  type="button"
                  className={clsx("recent-root-item", activeSpace?.id === space.id && "active")}
                  onClick={() => handleOpenSpace(space.localPath)}
                >
                  <span className="recent-root-name">{space.name}</span>
                  <span className="recent-root-path">{space.localPath}</span>
                </button>
              ))
            ) : (
              <div className="recent-root-empty">No spaces added yet.</div>
            )}
          </div>
        </div>
      </aside>

      <button
        type="button"
        className="sidebar-resizer design-resizer"
        aria-label="Resize sidebar"
        onMouseDown={handleResizeStart}
      />

      <div className="workspace-shell">
        <header className="topbar">
          <div className="topbar-left">
            <h2 className="topbar-title">
              {currentView === "home"
                ? "Workspace Home"
                : currentView === "search"
                  ? "Workspace Search"
                  : "Markdown Viewer"}
            </h2>
          </div>

          <div className="topbar-right">
            <div className="topbar-search">
              <input
                type="search"
                value={currentView === "search" ? workspaceSearchQuery : searchQuery}
                onChange={(event) => {
                  if (currentView === "search") {
                    setWorkspaceSearchQuery(event.target.value);
                    return;
                  }

                  setSearchQuery(event.target.value);
                }}
                placeholder={currentView === "search" ? "Search across spaces..." : "Search files..."}
              />
            </div>
            <button type="button" className="icon-button" aria-label="Refresh" onClick={handleRefreshCurrent}>
              <RefreshCw className="icon" />
            </button>
            <button type="button" className="icon-button" aria-label="Share" onClick={() => void handleShare()}>
              <Share2 className="icon" />
            </button>
            <button
              type="button"
              className="avatar-chip"
              aria-label="Profile"
              onClick={() => showNotice("Local-only desktop viewer")}
            >
              <UserCircle2 className="icon" />
            </button>
          </div>
        </header>

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
                    {spaces.length > 0 ? (
                      spaces.map((space) => (
                        <button
                          key={space.id}
                          type="button"
                          className="home-space-card"
                          onClick={() => handleOpenSpace(space.localPath)}
                        >
                          <div className="home-space-topline">
                            <Folder className="icon" />
                            <span>{space.name}</span>
                          </div>
                          {gitInfos[space.id]?.is_repo ? (
                            <div className="home-space-badge">
                              Git repo{gitInfos[space.id]?.branch ? ` • ${gitInfos[space.id]?.branch}` : ""}
                            </div>
                          ) : null}
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
                        </button>
                      ))
                    ) : (
                      <div className="explorer-empty">Add your first space to start building the workspace.</div>
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
          <section className="preview-shell">
            <div className="preview-toolbar">
              <div className="preview-toggle">
                <button
                  type="button"
                  className={clsx(viewMode === "preview" && "active")}
                  onClick={() => setViewMode("preview")}
                >
                  Preview
                </button>
                <button
                  type="button"
                  className={clsx(viewMode === "source" && "active")}
                  onClick={() => setViewMode("source")}
                >
                  Source
                </button>
              </div>

              <div className="preview-toolbar-right">
                {selectedFile ? (
                  <button
                    type="button"
                    className={clsx("secondary-action toolbar-save", isDirty && "dirty")}
                    aria-label="Save"
                    onClick={() => void handleSaveCurrentFile()}
                    disabled={isSavingFile}
                  >
                    {isSavingFile ? "Saving..." : isDirty ? "Save" : "Saved"}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Create note"
                  onClick={() => void handleCreateNote()}
                >
                  <FilePlus2 className="icon" />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Create journal entry"
                  onClick={() => void handleCreateJournalEntry()}
                >
                  <CalendarDays className="icon" />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Rename note"
                  onClick={() => void handleRenameCurrentFile()}
                  disabled={!selectedFile || isDirty}
                >
                  <PencilLine className="icon" />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Edit"
                  onClick={() => setViewMode((current) => (current === "preview" ? "source" : "preview"))}
                >
                  <Pencil className="icon" />
                </button>
                <button type="button" className="icon-button" aria-label="Print" onClick={handlePrint}>
                  <Printer className="icon" />
                </button>
                <button type="button" className="icon-button" aria-label="Download" onClick={handleDownload}>
                  <Download className="icon" />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Delete note"
                  onClick={() => void handleDeleteCurrentFile()}
                  disabled={!selectedFile || isDirty}
                >
                  <Trash2 className="icon" />
                </button>
                <button
                  type="button"
                  className={clsx("icon-button", selectedFile && bookmarks.includes(selectedFile.path) && "toggled")}
                  aria-label="Bookmark"
                  onClick={() => toggleBookmark(selectedFile)}
                >
                  <Star
                    className="icon"
                    fill={selectedFile && bookmarks.includes(selectedFile.path) ? "currentColor" : "none"}
                  />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Open settings"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  <Settings className="icon" />
                </button>
                <span className="preview-meta">UTF-8 • Markdown</span>
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

              {settings.showToc ? (
                <aside className="toc-panel">
                <div className="toc-panel-header">Table Of Contents</div>
                {viewMode === "preview" && headings.length > 0 ? (
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
      {isSettingsOpen ? (
        <div className="settings-backdrop" onClick={() => setIsSettingsOpen(false)}>
          <section className="settings-modal" onClick={(event) => event.stopPropagation()}>
            <div className="settings-header">
              <div>
                <h3>Settings</h3>
                <p>Personalize the viewer without changing the core workflow.</p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Close settings"
                onClick={() => setIsSettingsOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="settings-grid">
              <label className="settings-field">
                <span>Theme</span>
                <select
                  value={settings.theme}
                  onChange={(event) =>
                    updateSettings({ theme: event.target.value as AppSettings["theme"] })
                  }
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                </select>
              </label>

              <label className="settings-field">
                <span>Auto-refresh</span>
                <select
                  value={String(settings.autoRefreshMs)}
                  onChange={(event) => updateSettings({ autoRefreshMs: Number(event.target.value) })}
                >
                  <option value="2000">2 seconds</option>
                  <option value="4000">4 seconds</option>
                  <option value="8000">8 seconds</option>
                  <option value="15000">15 seconds</option>
                </select>
              </label>

              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.showToc}
                  onChange={(event) => updateSettings({ showToc: event.target.checked })}
                />
                <div>
                  <strong>Show table of contents</strong>
                  <span>Keep the right-side outline visible while reading.</span>
                </div>
              </label>

              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={settings.sourceWrap}
                  onChange={(event) => updateSettings({ sourceWrap: event.target.checked })}
                />
                <div>
                  <strong>Wrap source lines</strong>
                  <span>Wrap long lines in source mode instead of horizontal scrolling.</span>
                </div>
              </label>

              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={viewMode === "source"}
                  onChange={(event) => setViewMode(event.target.checked ? "source" : "preview")}
                />
                <div>
                  <strong>Open in source mode</strong>
                  <span>Quickly inspect raw Markdown without switching manually.</span>
                </div>
              </label>
            </div>

            <div className="settings-footer">
              <button
                type="button"
                className="secondary-action"
                onClick={() => {
                  setSettings(DEFAULT_SETTINGS);
                  showNotice("Settings reset");
                }}
              >
                Reset defaults
              </button>
              <button type="button" className="primary-action" onClick={() => setIsSettingsOpen(false)}>
                Done
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {noteDialog ? (
        <div className="settings-backdrop" onClick={() => setNoteDialog(null)}>
          <section className="settings-modal note-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="settings-header">
              <div>
                <h3>{noteDialog.title}</h3>
                <p>{noteDialog.description}</p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Close note dialog"
                onClick={() => setNoteDialog(null)}
              >
                ×
              </button>
            </div>

            <div className="settings-grid">
              <label className="settings-field">
                <span>Markdown path</span>
                <input
                  type="text"
                  value={notePathInput}
                  onChange={(event) => setNotePathInput(event.target.value)}
                  placeholder="notes/untitled.md"
                  autoFocus
                />
              </label>
            </div>

            <div className="settings-footer">
              <button type="button" className="secondary-action" onClick={() => setNoteDialog(null)}>
                Cancel
              </button>
              <button type="button" className="primary-action" onClick={() => void handleSubmitNoteDialog()}>
                {noteDialog.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      ) : null}
      {cloneDialog ? (
        <div className="settings-backdrop" onClick={() => setCloneDialog(null)}>
          <section className="settings-modal note-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="settings-header">
              <div>
                <h3>Clone Repository</h3>
                <p>Clone a public or already-authenticated git repository into a local space.</p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Close clone dialog"
                onClick={() => setCloneDialog(null)}
              >
                ×
              </button>
            </div>

            <div className="settings-grid">
              <label className="settings-field">
                <span>Repository URL</span>
                <input
                  type="text"
                  value={cloneDialog.repoUrl}
                  onChange={(event) =>
                    setCloneDialog((current) => (current ? { ...current, repoUrl: event.target.value } : current))
                  }
                  placeholder="https://github.com/owner/repo.git"
                  autoFocus
                />
              </label>

              <label className="settings-field">
                <span>Destination Folder</span>
                <div className="inline-field">
                  <input
                    type="text"
                    value={cloneDialog.destinationParent}
                    onChange={(event) =>
                      setCloneDialog((current) =>
                        current ? { ...current, destinationParent: event.target.value } : current
                      )
                    }
                    placeholder="/Users/you/repos"
                  />
                  <button type="button" className="secondary-action" onClick={() => void chooseCloneDestination()}>
                    Choose
                  </button>
                </div>
              </label>

              <label className="settings-field">
                <span>Local Folder Name</span>
                <input
                  type="text"
                  value={cloneDialog.directoryName}
                  onChange={(event) =>
                    setCloneDialog((current) =>
                      current ? { ...current, directoryName: event.target.value } : current
                    )
                  }
                  placeholder="repo-name"
                />
              </label>
            </div>

            <div className="settings-footer">
              <button type="button" className="secondary-action" onClick={() => setCloneDialog(null)}>
                Cancel
              </button>
              <button type="button" className="primary-action" onClick={() => void handleSubmitCloneDialog()}>
                Clone Repository
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
