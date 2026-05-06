import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import clsx from "clsx";
import {
  Bookmark,
  Download,
  FileText,
  Folder,
  HelpCircle,
  Info,
  Pencil,
  Printer,
  RefreshCw,
  Settings,
  Share2,
  SquareTerminal,
  Star,
  UserCircle2
} from "lucide-react";

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

type AppSettings = {
  theme: "dark" | "light";
  showToc: boolean;
  sourceWrap: boolean;
  autoRefreshMs: number;
};

const MarkdownPreview = lazy(() => import("./MarkdownPreview"));
const RECENT_ROOTS_KEY = "md-project-viewer:recent-roots";
const BOOKMARKS_KEY = "md-project-viewer:bookmarks";
const SETTINGS_KEY = "md-project-viewer:settings";
const MAX_RECENT_ROOTS = 6;
const AUTO_REFRESH_MS = 4000;
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
              <span className="explorer-row-icon explorer-chevron">
                {expanded.has(row.path) ? "⌄" : "›"}
              </span>
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
            {isSelected ? <span className="explorer-row-dot" /> : null}
          </button>
        );
      })}
    </>
  );
}

export default function App() {
  const [rootPath, setRootPath] = useState("");
  const [files, setFiles] = useState<MdFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<MdFile | null>(null);
  const [content, setContent] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [recentRoots, setRecentRoots] = useState<string[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [focusedPath, setFocusedPath] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const [activePanel, setActivePanel] = useState<"explorer" | "bookmarks" | "metadata">("explorer");
  const [activeTopTab, setActiveTopTab] = useState<"docs" | "github" | "marketplace">("docs");
  const [viewMode, setViewMode] = useState<"preview" | "source">("preview");
  const [notice, setNotice] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const resizeState = useRef<{ startX: number; startWidth: number } | null>(null);
  const previewScrollRef = useRef<HTMLDivElement | null>(null);

  const tree = useMemo(() => buildTree(files), [files]);
  const visibleRows = useMemo(
    () => flattenVisibleTree(tree, expanded, searchQuery.trim().toLowerCase()),
    [expanded, searchQuery, tree]
  );
  const headings = useMemo(() => extractHeadings(content), [content]);
  const bookmarkedFiles = useMemo(
    () => files.filter((file) => bookmarks.includes(file.path)),
    [bookmarks, files]
  );
  const projectName = useMemo(() => {
    if (!rootPath) {
      return "Project Root";
    }

    const pieces = rootPath.split(/[\\/]/).filter(Boolean);
    return pieces[pieces.length - 1] ?? rootPath;
  }, [rootPath]);

  useEffect(() => {
    const stored = window.localStorage.getItem(RECENT_ROOTS_KEY);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as string[];
      setRecentRoots(Array.isArray(parsed) ? parsed : []);
    } catch {
      window.localStorage.removeItem(RECENT_ROOTS_KEY);
    }
  }, []);

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
    if (recentRoots.length === 0) {
      return;
    }

    window.localStorage.setItem(RECENT_ROOTS_KEY, JSON.stringify(recentRoots));
  }, [recentRoots]);

  useEffect(() => {
    window.localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  }, [bookmarks]);

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
    if (!rootPath) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (document.hidden) {
        return;
      }

      void scanRoot(rootPath, {
        preserveSelection: true,
        resetSearch: false,
        silent: true
      });
    }, settings.autoRefreshMs);

    return () => window.clearInterval(intervalId);
  }, [expanded, rootPath, selectedFile?.relative_path, settings.autoRefreshMs]);

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
    }
  ) {
    const preserveSelection = options?.preserveSelection ?? false;
    const resetSearch = options?.resetSearch ?? true;
    const silent = options?.silent ?? false;
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
      setRecentRoots((current) => {
        const next = [path, ...current.filter((item) => item !== path)];
        return next.slice(0, MAX_RECENT_ROOTS);
      });

      if (nextSelectedFile) {
        await loadFile(nextSelectedFile, { silent });
      } else {
        setContent("");
      }
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : String(scanError));
      setFiles([]);
      setSelectedFile(null);
      setContent("");
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

  function clearRecentRoots() {
    setRecentRoots([]);
    window.localStorage.removeItem(RECENT_ROOTS_KEY);
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
    if (!rootPath) {
      void selectRootDirectory();
      return;
    }

    void scanRoot(rootPath, { preserveSelection: true, resetSearch: false });
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

    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
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

  return (
    <div
      className="app-shell design-shell"
      style={{
        gridTemplateColumns: `${RAIL_WIDTH}px ${sidebarWidth}px 8px minmax(0, 1fr)`
      }}
    >
      <aside className="design-rail">
        <div className="rail-brand">
          <SquareTerminal className="icon" />
        </div>
        <nav className="rail-nav">
          <button
            type="button"
            className={clsx("rail-item", activePanel === "explorer" && "active")}
            aria-label="Explorer"
            onClick={() => setActivePanel("explorer")}
          >
            <Folder className="icon" />
          </button>
          <button
            type="button"
            className={clsx("rail-item", activePanel === "bookmarks" && "active")}
            aria-label="Bookmarks"
            onClick={() => setActivePanel("bookmarks")}
          >
            <Bookmark className="icon" />
          </button>
          <button
            type="button"
            className={clsx("rail-item", activePanel === "metadata" && "active")}
            aria-label="Metadata"
            onClick={() => setActivePanel("metadata")}
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
            {activePanel === "explorer" && files.length > 0 ? (
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
            <span>Recent Projects</span>
            {recentRoots.length > 0 ? (
              <button type="button" className="text-action" onClick={clearRecentRoots}>
                Clear
              </button>
            ) : null}
          </div>
          <div className="recent-roots-list">
            {recentRoots.length > 0 ? (
              recentRoots.map((recentRoot) => (
                <button
                  key={recentRoot}
                  type="button"
                  className={clsx("recent-root-item", recentRoot === rootPath && "active")}
                  onClick={() => void scanRoot(recentRoot)}
                >
                  <span className="recent-root-name">
                    {recentRoot.split(/[\\/]/).filter(Boolean).slice(-1)[0] ?? recentRoot}
                  </span>
                  <span className="recent-root-path">{recentRoot}</span>
                </button>
              ))
            ) : (
              <div className="recent-root-empty">No recent projects yet.</div>
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
            <h2 className="topbar-title">Markdown Viewer</h2>
            <nav className="topbar-nav">
              <button
                type="button"
                className={clsx(activeTopTab === "docs" && "active")}
                onClick={() => setActiveTopTab("docs")}
              >
                Docs
              </button>
              <button
                type="button"
                className={clsx(activeTopTab === "github" && "active")}
                onClick={() => setActiveTopTab("github")}
              >
                GitHub
              </button>
              <button
                type="button"
                className={clsx(activeTopTab === "marketplace" && "active")}
                onClick={() => setActiveTopTab("marketplace")}
              >
                Marketplace
              </button>
            </nav>
          </div>

          <div className="topbar-right">
            <div className="topbar-search">
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search files..."
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
                  className={clsx("icon-button", selectedFile && bookmarks.includes(selectedFile.path) && "toggled")}
                  aria-label="Bookmark"
                  onClick={() => toggleBookmark(selectedFile)}
                >
                  <Star className="icon" />
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
                        <span>⌂</span>
                        <span>/</span>
                        <span>{selectedFile.relative_path}</span>
                      </div>
                      {viewMode === "preview" ? (
                        <Suspense fallback={<div className="design-empty-state">Rendering preview…</div>}>
                          <MarkdownPreview content={content} />
                        </Suspense>
                      ) : (
                        <pre className={clsx("source-view", settings.sourceWrap && "wrap")}>
                          <code>{content}</code>
                        </pre>
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
                      <button type="button" className="empty-card" onClick={selectRootDirectory}>
                        <strong>New Document</strong>
                        <span>Create or scan a project root to begin.</span>
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
    </div>
  );
}
