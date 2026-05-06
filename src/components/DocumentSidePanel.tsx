type HeadingItem = {
  id: string;
  label: string;
  level: number;
};

type FrontmatterData = {
  title?: string;
  date?: string;
  tags: string[];
  status?: string;
  template?: string;
};

type GitRepoInfo = {
  is_repo: boolean;
  branch: string | null;
  remote_url: string | null;
};

type GitFileHistoryEntry = {
  commit_hash: string;
  short_hash: string;
  author_name: string;
  committed_at: string;
  summary: string;
};

type MdFile = {
  relative_path: string;
};

type DocumentSidePanelProps = {
  showToc: boolean;
  documentPanel: "toc" | "metadata";
  viewMode: "preview" | "source";
  headings: HeadingItem[];
  onScrollToHeading: (id: string) => void;
  projectName: string;
  rootPath: string;
  activeExcludePaths: string[];
  fileCount: number;
  bookmarkCount: number;
  selectedFile: MdFile | null;
  gitStatuses: Record<string, string>;
  frontmatter: FrontmatterData;
  prettifyNoteTitle: (value: string) => string;
  activeGitInfo?: GitRepoInfo;
  fileHistory: GitFileHistoryEntry[];
};

export function DocumentSidePanel({
  showToc,
  documentPanel,
  viewMode,
  headings,
  onScrollToHeading,
  projectName,
  rootPath,
  activeExcludePaths,
  fileCount,
  bookmarkCount,
  selectedFile,
  gitStatuses,
  frontmatter,
  prettifyNoteTitle,
  activeGitInfo,
  fileHistory
}: DocumentSidePanelProps) {
  if (!showToc && documentPanel !== "metadata") {
    return null;
  }

  return (
    <aside className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] border-l border-[color:var(--outline)] bg-[color:var(--panel-bg-strong)] max-[1200px]:hidden">
      <div className="px-[18px] pb-[14px] pt-7 text-[0.75rem] font-bold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
        {documentPanel === "metadata" ? "Document Metadata" : "Table Of Contents"}
      </div>
      {documentPanel === "metadata" ? (
        <div className="grid min-h-0 gap-2.5 overflow-auto px-4 pb-10">
          <div className="grid gap-1 rounded-[6px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-3">
            <span className="text-[0.72rem] uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Project</span>
            <strong className="overflow-wrap-anywhere text-[0.84rem] text-[color:var(--text)]">{projectName}</strong>
          </div>
          <div className="grid gap-1 rounded-[6px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-3">
            <span className="text-[0.72rem] uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Root</span>
            <strong className="overflow-wrap-anywhere text-[0.84rem] text-[color:var(--text)]">
              {rootPath || "Not selected"}
            </strong>
          </div>
          <div className="grid gap-1 rounded-[6px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-3">
            <span className="text-[0.72rem] uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Excluded paths</span>
            <strong className="overflow-wrap-anywhere text-[0.84rem] text-[color:var(--text)]">
              {activeExcludePaths.join(", ")}
            </strong>
          </div>
          <div className="grid gap-1 rounded-[6px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-3">
            <span className="text-[0.72rem] uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Markdown files</span>
            <strong className="overflow-wrap-anywhere text-[0.84rem] text-[color:var(--text)]">{fileCount}</strong>
          </div>
          <div className="grid gap-1 rounded-[6px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-3">
            <span className="text-[0.72rem] uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Bookmarks</span>
            <strong className="overflow-wrap-anywhere text-[0.84rem] text-[color:var(--text)]">{bookmarkCount}</strong>
          </div>
          <div className="grid gap-1 rounded-[6px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-3">
            <span className="text-[0.72rem] uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Current file</span>
            <strong className="overflow-wrap-anywhere text-[0.84rem] text-[color:var(--text)]">
              {selectedFile?.relative_path || "None"}
            </strong>
          </div>
          <div className="grid gap-1 rounded-[6px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-3">
            <span className="text-[0.72rem] uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Git Status</span>
            <strong className="overflow-wrap-anywhere text-[0.84rem] text-[color:var(--text)]">
              {selectedFile ? gitStatuses[selectedFile.relative_path] || "clean" : "None"}
            </strong>
          </div>
          <div className="grid gap-1 rounded-[6px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-3">
            <span className="text-[0.72rem] uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Title</span>
            <strong className="overflow-wrap-anywhere text-[0.84rem] text-[color:var(--text)]">
              {frontmatter.title || prettifyNoteTitle(selectedFile?.relative_path || "") || "None"}
            </strong>
          </div>
          <div className="grid gap-1 rounded-[6px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-3">
            <span className="text-[0.72rem] uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Template</span>
            <strong className="overflow-wrap-anywhere text-[0.84rem] text-[color:var(--text)]">{frontmatter.template || "None"}</strong>
          </div>
          <div className="grid gap-1 rounded-[6px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-3">
            <span className="text-[0.72rem] uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Date</span>
            <strong className="overflow-wrap-anywhere text-[0.84rem] text-[color:var(--text)]">{frontmatter.date || "None"}</strong>
          </div>
          <div className="grid gap-1 rounded-[6px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-3">
            <span className="text-[0.72rem] uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Tags</span>
            <strong className="overflow-wrap-anywhere text-[0.84rem] text-[color:var(--text)]">
              {frontmatter.tags.length > 0 ? frontmatter.tags.join(", ") : "None"}
            </strong>
          </div>
          <div className="grid gap-1 rounded-[6px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-3">
            <span className="text-[0.72rem] uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Repository</span>
            <strong className="overflow-wrap-anywhere text-[0.84rem] text-[color:var(--text)]">
              {activeGitInfo?.is_repo ? "Git repository" : "Local folder"}
            </strong>
          </div>
          {activeGitInfo?.is_repo ? (
            <>
              <div className="grid gap-1 rounded-[6px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-3">
                <span className="text-[0.72rem] uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Branch</span>
                <strong className="overflow-wrap-anywhere text-[0.84rem] text-[color:var(--text)]">
                  {activeGitInfo.branch || "Unknown"}
                </strong>
              </div>
              <div className="grid gap-1 rounded-[6px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-3">
                <span className="text-[0.72rem] uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Remote</span>
                <strong className="overflow-wrap-anywhere text-[0.84rem] text-[color:var(--text)]">
                  {activeGitInfo.remote_url || "No origin remote"}
                </strong>
              </div>
              <div className="grid gap-2.5 rounded-[6px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-3">
                <span className="text-[0.72rem] uppercase tracking-[0.08em] text-[color:var(--text-muted)]">Recent file history</span>
                {selectedFile ? (
                  fileHistory.length > 0 ? (
                    <div className="grid gap-2">
                      {fileHistory.map((entry) => (
                        <div
                          key={entry.commit_hash}
                          className="grid gap-1 rounded-[8px] border border-[color:var(--outline)] bg-[color:color-mix(in_srgb,var(--surface-low)_72%,transparent)] p-2.5"
                        >
                          <div className="flex items-start justify-between gap-2.5">
                            <strong className="text-[0.8rem] text-[color:var(--text)]">{entry.summary}</strong>
                            <code className="rounded-full bg-[color:var(--surface-high)] px-1.5 py-0.5 text-[0.72rem] text-[color:var(--indigo-soft)]">
                              {entry.short_hash}
                            </code>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[0.74rem] text-[color:var(--text-muted)]">
                            <span>{entry.author_name}</span>
                            <span>{new Date(entry.committed_at).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <strong className="overflow-wrap-anywhere text-[0.84rem] text-[color:var(--text)]">
                      No local commit history for this file yet.
                    </strong>
                  )
                ) : (
                  <strong className="overflow-wrap-anywhere text-[0.84rem] text-[color:var(--text)]">
                    Open a Markdown file to inspect its local git history.
                  </strong>
                )}
              </div>
            </>
          ) : null}
        </div>
      ) : viewMode === "preview" && headings.length > 0 ? (
        <div className="min-h-0 overflow-auto px-3 pb-6">
          {headings.map((heading, index) => (
            <button
              key={`${heading.id}-${index}`}
              type="button"
              className={index === 0
                ? "block w-full border-l-2 border-[color:var(--indigo)] bg-transparent px-3 py-2 text-left text-[0.84rem] text-[color:var(--text)]"
                : "block w-full border-l-2 border-transparent bg-transparent px-3 py-2 text-left text-[0.84rem] text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text)]"}
              onClick={() => onScrollToHeading(heading.id)}
              style={{ paddingLeft: `${(heading.level - 1) * 18 + 12}px` }}
            >
              {heading.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="px-4 py-[18px] text-[0.84rem] text-[color:var(--text-muted)]">
          {viewMode === "source"
            ? "Switch to preview to use the outline."
            : "Open a markdown file with headings to populate this outline."}
        </div>
      )}
    </aside>
  );
}
