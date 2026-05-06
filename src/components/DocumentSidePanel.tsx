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
            <strong>{fileCount}</strong>
          </div>
          <div className="metadata-item">
            <span>Bookmarks</span>
            <strong>{bookmarkCount}</strong>
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
            <strong>
              {frontmatter.title || prettifyNoteTitle(selectedFile?.relative_path || "") || "None"}
            </strong>
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
              onClick={() => onScrollToHeading(heading.id)}
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
  );
}
