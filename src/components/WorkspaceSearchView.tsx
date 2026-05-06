import clsx from "clsx";
import { FileText, Folder } from "lucide-react";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

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

type WorkspaceSearchViewProps = {
  workspaceSearchScope: "all" | "current";
  onWorkspaceSearchScopeChange: (value: "all" | "current") => void;
  workspaceSearchBookmarksOnly: boolean;
  onWorkspaceSearchBookmarksOnlyChange: (checked: boolean) => void;
  workspaceSearchQuery: string;
  isWorkspaceSearching: boolean;
  workspaceSearchGroups: WorkspaceSearchGroup[];
  onOpenWorkspaceSearchResult: (
    group: WorkspaceSearchGroup,
    result: SearchResult
  ) => void | Promise<void>;
  highlightParts: (text: string, query: string) => Array<{ text: string; match: boolean }>;
};

export function WorkspaceSearchView({
  workspaceSearchScope,
  onWorkspaceSearchScopeChange,
  workspaceSearchBookmarksOnly,
  onWorkspaceSearchBookmarksOnlyChange,
  workspaceSearchQuery,
  isWorkspaceSearching,
  workspaceSearchGroups,
  onOpenWorkspaceSearchResult,
  highlightParts
}: WorkspaceSearchViewProps) {
  const emptyCardClass =
    "grid gap-1.5 rounded-[12px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-[14px] text-left text-[color:var(--text)]";

  return (
    <section className="workspace-search">
      <div className="mb-6 rounded-[18px] border border-[color:var(--outline)] bg-[color:color-mix(in_srgb,var(--surface-low)_94%,transparent)] p-6">
        <p className="mb-2.5 text-[0.72rem] uppercase tracking-[0.14em] text-[color:var(--indigo-soft)]">
          Across all spaces
        </p>
        <h1 className="m-0 text-[2rem] tracking-[-0.03em]">Find notes by path or content.</h1>
        <p className="mt-3 max-w-[760px] leading-[1.65] text-[color:var(--text-muted)]">
          Search every connected space at once, then jump straight into the matching note.
        </p>
        <div className="mt-[18px] flex flex-wrap items-end gap-[14px]">
          <div className="grid gap-2">
            <Label>Scope</Label>
            <Select
              value={workspaceSearchScope}
              onValueChange={(value) => onWorkspaceSearchScopeChange(value as "all" | "current")}
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
          <label className="inline-flex min-h-10 items-center gap-2 text-[color:var(--text-muted)]">
            <Checkbox
              checked={workspaceSearchBookmarksOnly}
              onCheckedChange={(checked) => onWorkspaceSearchBookmarksOnlyChange(checked === true)}
            />
            <span>Bookmarked notes only</span>
          </label>
        </div>
      </div>

      {workspaceSearchQuery.trim() ? (
        isWorkspaceSearching ? (
          <div className="explorer-empty">Searching across spaces…</div>
        ) : workspaceSearchGroups.length > 0 ? (
          <div className="grid gap-[18px]">
            {workspaceSearchGroups.map((group) => (
              <section
                key={group.spaceId}
                className="overflow-hidden rounded-[16px] border border-[color:var(--outline)] bg-[color:color-mix(in_srgb,var(--surface-low)_96%,transparent)]"
              >
                <div className="flex items-center justify-between gap-4 border-b border-[color:var(--outline)] p-[18px]">
                  <div className="flex items-center gap-2.5 font-bold">
                    <Folder className="icon" />
                    <span>{group.spaceName}</span>
                  </div>
                  <strong className="text-[0.78rem] text-[color:var(--text-muted)]">
                    {group.results.length} matches
                  </strong>
                </div>
                <div className="grid gap-2.5 p-4">
                  {group.results.map((result) => (
                    <button
                      key={`${group.spaceId}:${result.path}`}
                      type="button"
                      className="grid w-full gap-1.5 rounded-[10px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-3 text-left text-[color:var(--text)] transition-colors hover:bg-[color:var(--surface-high)]"
                      onClick={() => onOpenWorkspaceSearchResult(group, result)}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <FileText className="icon explorer-row-icon file" />
                        <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[0.83rem] font-semibold">
                          {highlightParts(result.relative_path, workspaceSearchQuery).map((part, index) => (
                            <mark
                              key={`${result.path}:path:${index}`}
                              className={clsx(
                                "rounded-[4px] px-px text-inherit",
                                part.match
                                  ? "bg-[color:color-mix(in_srgb,var(--indigo-soft)_28%,transparent)]"
                                  : "bg-transparent px-0"
                              )}
                            >
                              {part.text}
                            </mark>
                          ))}
                        </span>
                      </div>
                      <div className="text-[0.7rem] uppercase tracking-[0.06em] text-[color:var(--text-muted)]">
                        {result.matched_on_path ? "Path match" : "Content match"}
                      </div>
                      {result.snippet ? (
                        <div className="text-[0.8rem] leading-[1.5] text-[color:var(--text-muted)]">
                          {highlightParts(result.snippet, workspaceSearchQuery).map((part, index) => (
                            <mark
                              key={`${result.path}:snippet:${index}`}
                              className={clsx(
                                "rounded-[4px] px-px text-inherit",
                                part.match
                                  ? "bg-[color:color-mix(in_srgb,var(--indigo-soft)_28%,transparent)]"
                                  : "bg-transparent px-0"
                              )}
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
        <div className="grid grid-cols-2 gap-4 max-[1200px]:grid-cols-1">
          <div className={emptyCardClass}>
            <strong className="text-[0.92rem]">Search all spaces</strong>
            <span className="text-[0.8rem] leading-[1.5] text-[color:var(--text-muted)]">
              Use the top bar to search note paths and content across your connected workspaces.
            </span>
          </div>
          <div className={emptyCardClass}>
            <strong className="text-[0.92rem]">Jump back faster</strong>
            <span className="text-[0.8rem] leading-[1.5] text-[color:var(--text-muted)]">
              Results are grouped by space so it is easy to orient yourself before opening a note.
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
