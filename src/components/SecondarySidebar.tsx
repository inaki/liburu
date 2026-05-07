import clsx from "clsx";
import { Bookmark, CalendarDays, FilePlus2, FileText, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { OverlayScrollContainer } from "./ui/overlay-scrollbars";

type MdFile = {
  path: string;
  relative_path: string;
};

type SearchResult = {
  path: string;
  relative_path: string;
  snippet: string;
  matched_on_path: boolean;
};

type VisibleTreeRow = {
  id: string;
  name: string;
  path: string;
  kind: "directory" | "file";
  depth: number;
  isExpanded: boolean;
};

type SecondarySidebarProps = {
  rootPath: string;
  activePanel: "explorer" | "bookmarks";
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  isLoadingTree: boolean;
  isSearching: boolean;
  searchResults: SearchResult[];
  files: MdFile[];
  bookmarkedFiles: MdFile[];
  selectedFilePath: string | null;
  selectedRelativePath: string | null;
  focusedPath: string | null;
  dirtyRelativePath: string | null;
  gitStatuses: Record<string, string>;
  visibleRows: VisibleTreeRow[];
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (relativePath: string) => void;
  onFocus: (path: string | null) => void;
  onTreeKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onCreateJournalEntry: () => void | Promise<void>;
  onCreateNote: () => void | Promise<void>;
  onRefreshScan: () => void | Promise<void> | Promise<MdFile[]>;
  onCreateInDirectory: (path: string) => void;
  onCreateJournalInDirectory: (path: string) => void;
  isAutoRefreshing: boolean;
  TreeBranch: React.ComponentType<{
    rows: VisibleTreeRow[];
    gitStatuses: Record<string, string>;
    dirtyPath: string | null;
    expanded: Set<string>;
    selectedPath: string | null;
    focusedPath: string | null;
    onToggle: (path: string) => void;
    onSelect: (relativePath: string) => void;
    onFocus: (path: string | null) => void;
    onCreateInDirectory: (path: string) => void;
    onCreateJournalInDirectory: (path: string) => void;
  }>;
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

export function SecondarySidebar({
  rootPath,
  activePanel,
  searchQuery,
  onSearchQueryChange,
  isLoadingTree,
  isSearching,
  searchResults,
  files,
  bookmarkedFiles,
  selectedFilePath,
  selectedRelativePath,
  focusedPath,
  dirtyRelativePath,
  gitStatuses,
  visibleRows,
  expanded,
  onToggle,
  onSelect,
  onFocus,
  onTreeKeyDown,
  onCreateJournalEntry,
  onCreateNote,
  onRefreshScan,
  onCreateInDirectory,
  onCreateJournalInDirectory,
  isAutoRefreshing,
  TreeBranch
}: SecondarySidebarProps) {
  const contentFadeKey = [
    activePanel,
    searchQuery.trim(),
    isSearching ? "searching" : "idle",
    activePanel === "explorer" && searchQuery.trim()
      ? searchResults.length
      : activePanel === "bookmarks"
        ? bookmarkedFiles.length
        : visibleRows.length,
  ].join(":");

  return (
    <aside className="grid h-full min-h-0 min-w-0 grid-rows-[minmax(0,1fr)] overflow-hidden border-r border-[color:var(--outline)] bg-[color:var(--surface-low)]">
      <section className="grid min-h-0 overflow-hidden grid-rows-[auto_auto_minmax(0,1fr)_auto]">
        <div className="flex items-center justify-between px-4 pb-2.5 pt-[14px] text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
          <span>Workspace Files</span>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-[34px] w-[34px] rounded-[6px] text-[color:var(--text-muted)] hover:bg-[color:var(--surface-high)] hover:text-[color:var(--text)]"
              onClick={() => void onCreateJournalEntry()}
              disabled={!rootPath}
              aria-label="Create journal entry"
            >
              <CalendarDays className="icon" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-[34px] w-[34px] rounded-[6px] text-[color:var(--text-muted)] hover:bg-[color:var(--surface-high)] hover:text-[color:var(--text)]"
              onClick={() => void onCreateNote()}
              disabled={!rootPath}
              aria-label="Create note"
            >
              <FilePlus2 className="icon" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-[34px] w-[34px] rounded-[6px] text-[color:var(--text-muted)] hover:bg-[color:var(--surface-high)] hover:text-[color:var(--text)]"
              onClick={() => void onRefreshScan()}
              disabled={!rootPath || isLoadingTree}
              aria-label="Refresh scan"
            >
              <RefreshCw className="icon" />
            </Button>
          </div>
        </div>

        <div className="px-4 pb-3">
          <Input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder="Search project..."
            className="h-auto rounded-[6px] border-[color:var(--outline)] bg-[color:var(--surface-lowest)] px-3 py-2.5 text-[0.84rem]"
          />
        </div>

        <OverlayScrollContainer
          className="min-h-0"
          contentClassName="px-[10px] pb-[14px] outline-none"
          contentProps={{
            role: "tree",
            tabIndex: 0,
            "aria-label": "Markdown files",
            onKeyDown: onTreeKeyDown
          }}
        >
          <div key={contentFadeKey} className="animate-[sidebarFade_120ms_ease-out]">
            {activePanel === "explorer" && searchQuery.trim() ? (
              isSearching ? (
                <div className="explorer-empty">Searching notes…</div>
              ) : searchResults.length > 0 ? (
                <div className="grid gap-2.5 px-0 pb-[14px]">
                  {searchResults.map((result) => (
                    <button
                      key={result.path}
                      type="button"
                        className={clsx(
                          "grid w-full gap-1.5 rounded-[10px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-3 text-left text-[color:var(--text)] transition-colors hover:bg-[color:var(--surface-high)]",
                          selectedFilePath === result.path && "selected"
                        )}
                      onClick={() => onSelect(result.relative_path)}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <FileText className="icon h-4 w-4 shrink-0 text-[color:var(--indigo-soft)]" />
                        <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[0.83rem] font-semibold">
                          {result.relative_path}
                        </span>
                    </div>
                    <div className="text-[0.7rem] uppercase tracking-[0.06em] text-[color:var(--text-muted)]">
                      {result.matched_on_path ? "Path match" : "Content match"}
                    </div>
                    {result.snippet ? (
                      <div className="text-[0.8rem] leading-[1.5] text-[color:var(--text-muted)]">
                        {result.snippet}
                      </div>
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
                selectedPath={selectedRelativePath}
                focusedPath={focusedPath}
                onToggle={onToggle}
                onSelect={onSelect}
                onFocus={onFocus}
                onCreateInDirectory={onCreateInDirectory}
                onCreateJournalInDirectory={onCreateJournalInDirectory}
              />
            ) : activePanel === "bookmarks" ? (
              bookmarkedFiles.length > 0 ? (
                bookmarkedFiles.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    className={clsx(
                      "flex min-h-[var(--row-height)] w-full items-center gap-2.5 rounded-r-[6px] bg-transparent px-[var(--panel-padding)] py-1.5 text-left text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--surface-high)] hover:text-[color:var(--text)]",
                      selectedFilePath === file.path &&
                        "bg-[color:color-mix(in_srgb,var(--surface-highest)_88%,transparent)] text-[color:var(--text)] shadow-[inset_2px_0_0_var(--indigo)]"
                    )}
                    onClick={() => onSelect(file.relative_path)}
                  >
                    <span className="h-4 w-4 shrink-0" />
                    <Bookmark className="icon h-4 w-4 shrink-0 text-[color:var(--indigo-soft)]" />
                    <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                      {file.relative_path}
                    </span>
                    {dirtyRelativePath === file.relative_path ? (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full bg-[color:var(--indigo-soft)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--indigo-soft)_20%,transparent)]"
                        aria-label="Unsaved changes"
                      />
                    ) : null}
                    {gitStatuses[file.relative_path] ? (
                      <span className={getGitStatusBadgeClass(gitStatuses[file.relative_path])}>
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
        </OverlayScrollContainer>

        <div className="flex justify-between gap-2.5 border-t border-[color:var(--outline)] px-4 py-3 text-[0.72rem] text-[color:var(--text-muted)]">
          <span>{files.length} files found</span>
          <span>{isAutoRefreshing ? "Synced now" : "Local view"}</span>
        </div>
      </section>
    </aside>
  );
}
