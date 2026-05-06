import { lazy, Suspense } from "react";
import clsx from "clsx";
import { Pencil, Star, Warehouse } from "lucide-react";
import { DocumentSidePanel } from "./DocumentSidePanel";
import { PreviewToolbar } from "./PreviewToolbar";

const MarkdownPreview = lazy(() => import("../MarkdownPreview"));

type HeadingItem = {
  id: string;
  label: string;
  level: number;
};

type MdFile = {
  path: string;
  name: string;
  relative_path: string;
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

type ToolbarSettings = {
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

type DocumentWorkspaceProps = {
  viewMode: "preview" | "source";
  onSetViewMode: (mode: "preview" | "source" | ((current: "preview" | "source") => "preview" | "source")) => void;
  selectedFile: MdFile | null;
  isDirty: boolean;
  isSavingFile: boolean;
  autosave: boolean;
  toolbar: ToolbarSettings;
  documentPanel: "toc" | "metadata";
  onSave: () => void | Promise<void>;
  onCreateNote: () => void | Promise<void>;
  onCreateJournal: () => void | Promise<void>;
  onRename: () => void | Promise<void>;
  onPrint: () => void;
  onDownload: () => void;
  onToggleMetadata: () => void;
  onDelete: () => void | Promise<void>;
  onOpenSettings: () => void;
  error: string;
  isLoadingFile: boolean;
  previewScrollRef: React.RefObject<HTMLDivElement | null>;
  settingsShowToc: boolean;
  settingsSourceWrap: boolean;
  headings: HeadingItem[];
  onScrollToHeading: (id: string) => void;
  projectName: string;
  rootPath: string;
  activeExcludePaths: string[];
  fileCount: number;
  bookmarkCount: number;
  gitStatuses: Record<string, string>;
  frontmatter: FrontmatterData;
  prettifyNoteTitle: (value: string) => string;
  activeGitInfo?: GitRepoInfo;
  fileHistory: GitFileHistoryEntry[];
  bookmarks: string[];
  onToggleBookmark: (file: MdFile | null) => void;
  draftContent: string;
  onDraftContentChange: (value: string) => void;
  onShowNotice: (message: string) => void;
};

export function DocumentWorkspace({
  viewMode,
  onSetViewMode,
  selectedFile,
  isDirty,
  isSavingFile,
  autosave,
  toolbar,
  documentPanel,
  onSave,
  onCreateNote,
  onCreateJournal,
  onRename,
  onPrint,
  onDownload,
  onToggleMetadata,
  onDelete,
  onOpenSettings,
  error,
  isLoadingFile,
  previewScrollRef,
  settingsShowToc,
  settingsSourceWrap,
  headings,
  onScrollToHeading,
  projectName,
  rootPath,
  activeExcludePaths,
  fileCount,
  bookmarkCount,
  gitStatuses,
  frontmatter,
  prettifyNoteTitle,
  activeGitInfo,
  fileHistory,
  bookmarks,
  onToggleBookmark,
  draftContent,
  onDraftContentChange,
  onShowNotice
}: DocumentWorkspaceProps) {
  return (
    <section className="grid h-full min-h-0 grid-rows-[58px_minmax(0,1fr)]">
      <PreviewToolbar
        viewMode={viewMode}
        onSetViewMode={onSetViewMode}
        selectedFile={Boolean(selectedFile)}
        isDirty={isDirty}
        isSavingFile={isSavingFile}
        autosave={autosave}
        toolbar={toolbar}
        documentPanel={documentPanel}
        onSave={onSave}
        onCreateNote={onCreateNote}
        onCreateJournal={onCreateJournal}
        onRename={onRename}
        onToggleEditMode={() =>
          onSetViewMode((current) => (current === "preview" ? "source" : "preview"))
        }
        onPrint={onPrint}
        onDownload={onDownload}
        onToggleMetadata={onToggleMetadata}
        onDelete={onDelete}
        onOpenSettings={onOpenSettings}
      />

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
                  {toolbar.bookmark ? (
                    <button
                      type="button"
                      className={clsx("breadcrumb-bookmark", bookmarks.includes(selectedFile.path) && "active")}
                      aria-label="Bookmark"
                      onClick={() => onToggleBookmark(selectedFile)}
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
                    className={clsx("source-editor", settingsSourceWrap && "wrap")}
                    value={draftContent}
                    onChange={(event) => onDraftContentChange(event.target.value)}
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
                Select a markdown file from the explorer on the left to start viewing its rendered
                content.
              </p>
              <div className="empty-hero-grid">
                <button type="button" className="empty-card" onClick={() => void onCreateNote()}>
                  <strong>New Document</strong>
                  <span>Create a new markdown note inside the current space.</span>
                </button>
                <button type="button" className="empty-card" onClick={() => void onCreateJournal()}>
                  <strong>Daily Journal</strong>
                  <span>Create a dated note inside the journal folder structure.</span>
                </button>
                <button
                  type="button"
                  className="empty-card"
                  onClick={() =>
                    onShowNotice("Arrow keys move focus. Enter opens the selected file.")
                  }
                >
                  <strong>Keyboard Shortcuts</strong>
                  <span>Use arrow keys in the explorer and press Enter to open.</span>
                </button>
              </div>
            </div>
          )}
        </section>

        <DocumentSidePanel
          showToc={settingsShowToc}
          documentPanel={documentPanel}
          viewMode={viewMode}
          headings={headings}
          onScrollToHeading={onScrollToHeading}
          projectName={projectName}
          rootPath={rootPath}
          activeExcludePaths={activeExcludePaths}
          fileCount={fileCount}
          bookmarkCount={bookmarkCount}
          selectedFile={selectedFile}
          gitStatuses={gitStatuses}
          frontmatter={frontmatter}
          prettifyNoteTitle={prettifyNoteTitle}
          activeGitInfo={activeGitInfo}
          fileHistory={fileHistory}
        />
      </div>
    </section>
  );
}
