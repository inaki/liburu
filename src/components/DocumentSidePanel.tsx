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

  const metadataCardClassName =
    "grid min-w-0 gap-1 rounded-[6px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-3";
  const metadataLabelClassName =
    "text-[0.72rem] uppercase tracking-[0.08em] text-[color:var(--text-muted)]";
  const metadataValueClassName =
    "min-w-0 whitespace-normal break-words [overflow-wrap:anywhere] text-[0.84rem] text-[color:var(--text)]";

  return (
    <aside className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] border-l border-[color:var(--outline)] bg-[color:var(--panel-bg-strong)] max-[1200px]:hidden">
      <div className="px-[18px] pb-[14px] pt-7 text-[0.75rem] font-bold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
        {documentPanel === "metadata" ? "Document Metadata" : "Table Of Contents"}
      </div>
      {documentPanel === "metadata" ? (
        <div className="grid min-h-0 min-w-0 gap-2 overflow-y-auto overflow-x-hidden px-4 pb-6">
          <div className={metadataCardClassName}>
            <span className={metadataLabelClassName}>Project</span>
            <strong className={metadataValueClassName}>{projectName}</strong>
          </div>
          <div className={metadataCardClassName}>
            <span className={metadataLabelClassName}>Root</span>
            <strong className={metadataValueClassName}>
              {rootPath || "Not selected"}
            </strong>
          </div>
          <div className={metadataCardClassName}>
            <span className={metadataLabelClassName}>Excluded paths</span>
            <strong className={metadataValueClassName}>
              {activeExcludePaths.join(", ")}
            </strong>
          </div>
          <div className={metadataCardClassName}>
            <span className={metadataLabelClassName}>Markdown files</span>
            <strong className={metadataValueClassName}>{fileCount}</strong>
          </div>
          <div className={metadataCardClassName}>
            <span className={metadataLabelClassName}>Bookmarks</span>
            <strong className={metadataValueClassName}>{bookmarkCount}</strong>
          </div>
          <div className={metadataCardClassName}>
            <span className={metadataLabelClassName}>Current file</span>
            <strong className={metadataValueClassName}>
              {selectedFile?.relative_path || "None"}
            </strong>
          </div>
          <div className={metadataCardClassName}>
            <span className={metadataLabelClassName}>Git Status</span>
            <strong className={metadataValueClassName}>
              {selectedFile ? gitStatuses[selectedFile.relative_path] || "clean" : "None"}
            </strong>
          </div>
          <div className={metadataCardClassName}>
            <span className={metadataLabelClassName}>Title</span>
            <strong className={metadataValueClassName}>
              {frontmatter.title || prettifyNoteTitle(selectedFile?.relative_path || "") || "None"}
            </strong>
          </div>
          <div className={metadataCardClassName}>
            <span className={metadataLabelClassName}>Template</span>
            <strong className={metadataValueClassName}>{frontmatter.template || "None"}</strong>
          </div>
          <div className={metadataCardClassName}>
            <span className={metadataLabelClassName}>Date</span>
            <strong className={metadataValueClassName}>{frontmatter.date || "None"}</strong>
          </div>
          <div className={metadataCardClassName}>
            <span className={metadataLabelClassName}>Tags</span>
            <strong className={metadataValueClassName}>
              {frontmatter.tags.length > 0 ? frontmatter.tags.join(", ") : "None"}
            </strong>
          </div>
          <div className={metadataCardClassName}>
            <span className={metadataLabelClassName}>Repository</span>
            <strong className={metadataValueClassName}>
              {activeGitInfo?.is_repo ? "Git repository" : "Local folder"}
            </strong>
          </div>
          {activeGitInfo?.is_repo ? (
            <>
              <div className={metadataCardClassName}>
                <span className={metadataLabelClassName}>Branch</span>
                <strong className={metadataValueClassName}>
                  {activeGitInfo.branch || "Unknown"}
                </strong>
              </div>
              <div className={metadataCardClassName}>
                <span className={metadataLabelClassName}>Remote</span>
                <strong className={metadataValueClassName}>
                  {activeGitInfo.remote_url || "No origin remote"}
                </strong>
              </div>
              <div className="grid min-w-0 gap-2 rounded-[6px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-3">
                <span className={metadataLabelClassName}>Recent file history</span>
                {selectedFile ? (
                  fileHistory.length > 0 ? (
                    <div className="grid gap-2">
                      {fileHistory.map((entry) => (
                        <div
                          key={entry.commit_hash}
                          className="grid min-w-0 gap-1.5 rounded-[8px] border border-[color:var(--outline)] bg-[color:color-mix(in_srgb,var(--surface-low)_72%,transparent)] p-2.5"
                        >
                          <div className="flex min-w-0 flex-col gap-1.5">
                            <div className="flex min-w-0 items-start gap-2">
                              <strong className="min-w-0 flex-1 whitespace-normal break-words [overflow-wrap:anywhere] text-[0.8rem] text-[color:var(--text)]">
                                {entry.summary}
                              </strong>
                              <code className="shrink-0 rounded-full bg-[color:var(--surface-high)] px-1.5 py-0.5 text-[0.72rem] text-[color:var(--indigo-soft)]">
                                {entry.short_hash}
                              </code>
                            </div>
                          </div>
                          <div className="flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-[0.74rem] text-[color:var(--text-muted)]">
                            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{entry.author_name}</span>
                            <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                              {new Date(entry.committed_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <strong className={metadataValueClassName}>
                      No local commit history for this file yet.
                    </strong>
                  )
                ) : (
                  <strong className={metadataValueClassName}>
                    Open a Markdown file to inspect its local git history.
                  </strong>
                )}
              </div>
            </>
          ) : null}
        </div>
      ) : viewMode === "preview" && headings.length > 0 ? (
        <div className="min-h-0 overflow-y-auto overflow-x-hidden px-3 pb-6">
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
