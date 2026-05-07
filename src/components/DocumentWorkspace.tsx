import { lazy, Suspense } from "react";
import clsx from "clsx";
import { Pencil, Star, Warehouse } from "lucide-react";
import { DocumentSidePanel } from "./DocumentSidePanel";
import { PreviewToolbar } from "./PreviewToolbar";
import { OverlayScrollContainer } from "./ui/overlay-scrollbars";

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

      <div className="grid min-h-0 min-w-0 grid-cols-[minmax(0,1fr)_260px] overflow-hidden max-[1200px]:grid-cols-[minmax(0,1fr)]">
        <section
          className="relative min-h-0 min-w-0 overflow-hidden bg-[color:var(--bg)]"
          style={{
            backgroundImage:
              "radial-gradient(circle at center, var(--page-dot) 1px, transparent 1px)",
            backgroundPosition: "0 0",
            backgroundSize: "24px 24px"
          }}
        >
          {error ? (
            <div className="mx-[42px] mt-[18px] rounded-[8px] border border-[rgba(255,180,171,0.28)] bg-[rgba(147,0,10,0.35)] px-[14px] py-3 text-[color:var(--danger)]">
              {error}
            </div>
          ) : null}

          {selectedFile ? (
            isLoadingFile ? (
              <div className="px-4 py-[18px] text-[0.84rem] text-[color:var(--text-muted)]">
                Loading file…
              </div>
            ) : (
              <OverlayScrollContainer
                className="h-full"
                contentClassName="px-[42px] pb-[42px] pt-[18px]"
                contentRef={previewScrollRef}
              >
                <div className="mb-5 flex items-center gap-2 text-[0.74rem] text-[color:var(--text-muted)]">
                  <Warehouse className="icon h-4 w-4" />
                  <span>/</span>
                  <span>{selectedFile.relative_path}</span>
                  {toolbar.bookmark ? (
                    <button
                      type="button"
                      className={clsx(
                        "ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full border-0 bg-transparent text-[color:var(--text-dim)] transition-[color,background-color,transform] hover:-translate-y-px hover:bg-[color:var(--surface-low)] hover:text-[color:var(--text)] focus-visible:-translate-y-px focus-visible:bg-[color:var(--surface-low)] focus-visible:text-[color:var(--text)] focus-visible:outline-none",
                        bookmarks.includes(selectedFile.path) && "text-[color:var(--indigo)]"
                      )}
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
                  <Suspense
                    fallback={
                      <div className="px-4 py-[18px] text-[0.84rem] text-[color:var(--text-muted)]">
                        Rendering preview…
                      </div>
                    }
                  >
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
              </OverlayScrollContainer>
            )
          ) : (
            <div className="grid h-full content-start justify-items-center gap-[18px] overflow-auto px-8 pb-12 pt-[84px] text-center">
              <div className="grid h-[122px] w-[122px] place-items-center rounded-[18px] border border-[color:var(--outline-strong)] bg-[color:var(--surface-highest)] text-[color:var(--indigo-soft)]">
                <Pencil className="icon h-8 w-8" />
              </div>
              <h3 className="m-0 text-2xl tracking-[-0.02em]">No file selected</h3>
              <p className="m-0 max-w-[640px] leading-[1.6] text-[color:var(--text-muted)]">
                Select a markdown file from the explorer on the left to start viewing its rendered
                content.
              </p>
              <div className="mt-2 grid grid-cols-[repeat(2,minmax(220px,310px))] gap-5 max-[960px]:grid-cols-[1fr]">
                <button
                  type="button"
                  className="grid gap-2 rounded-[12px] border border-[color:var(--outline-strong)] bg-[color:var(--empty-card-bg)] p-5 text-left text-[color:var(--text)]"
                  onClick={() => void onCreateNote()}
                >
                  <strong className="text-[0.95rem]">New Document</strong>
                  <span className="leading-[1.5] text-[color:var(--text-muted)]">
                    Create a new markdown note inside the current space.
                  </span>
                </button>
                <button
                  type="button"
                  className="grid gap-2 rounded-[12px] border border-[color:var(--outline-strong)] bg-[color:var(--empty-card-bg)] p-5 text-left text-[color:var(--text)]"
                  onClick={() => void onCreateJournal()}
                >
                  <strong className="text-[0.95rem]">Daily Journal</strong>
                  <span className="leading-[1.5] text-[color:var(--text-muted)]">
                    Create a dated note inside the journal folder structure.
                  </span>
                </button>
                <button
                  type="button"
                  className="grid gap-2 rounded-[12px] border border-[color:var(--outline-strong)] bg-[color:var(--empty-card-bg)] p-5 text-left text-[color:var(--text)]"
                  onClick={() =>
                    onShowNotice("Arrow keys move focus. Enter opens the selected file.")
                  }
                >
                  <strong className="text-[0.95rem]">Keyboard Shortcuts</strong>
                  <span className="leading-[1.5] text-[color:var(--text-muted)]">
                    Use arrow keys in the explorer and press Enter to open.
                  </span>
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
