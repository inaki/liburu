import clsx from "clsx";
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronUp,
  Folder,
  LoaderCircle,
  Pin,
  Trash2
} from "lucide-react";
import { Button } from "./ui/button";
import type { Space } from "../features/spaces/models";
import { getSpaceLabel } from "../features/spaces/storage";

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

type SpaceSummary = {
  note_count: number;
  latest_modified_at: string | null;
};

type WorkspaceHomeProps = {
  activeSpace: Space | null;
  spaces: Space[];
  orderedVisibleSpaces: Space[];
  archivedSpaces: Space[];
  recentNotes: RecentNote[];
  homeBookmarkedNotes: RecentNote[];
  spaceSummaries: Record<string, SpaceSummary>;
  gitInfos: Record<string, GitRepoInfo>;
  openingSpacePath: string | null;
  openingRecentNoteKey: string | null;
  onSelectRootDirectory: () => void | Promise<void>;
  onOpenCloneDialog: () => void;
  onCreateJournalEntry: () => void | Promise<void>;
  onCreateNote: () => void | Promise<void>;
  onCreateTemplateNote: (kind: "idea" | "meeting") => void | Promise<void>;
  onShowNotice: (message: string) => void;
  onOpenSpace: (path: string) => void | Promise<unknown>;
  onTogglePinnedSpace: (id: string) => void;
  onMoveSpace: (id: string, direction: 1 | -1) => void;
  onToggleArchivedSpace: (id: string) => void;
  onRemoveSpace: (id: string) => void;
  onOpenRecentNote: (note: RecentNote) => void | Promise<void>;
};

export function WorkspaceHome({
  activeSpace,
  spaces,
  orderedVisibleSpaces,
  archivedSpaces,
  recentNotes,
  homeBookmarkedNotes,
  spaceSummaries,
  gitInfos,
  openingSpacePath,
  openingRecentNoteKey,
  onSelectRootDirectory,
  onOpenCloneDialog,
  onCreateJournalEntry,
  onCreateNote,
  onCreateTemplateNote,
  onShowNotice,
  onOpenSpace,
  onTogglePinnedSpace,
  onMoveSpace,
  onToggleArchivedSpace,
  onRemoveSpace,
  onOpenRecentNote
}: WorkspaceHomeProps) {
  const homePanelClass =
    "grid min-h-[320px] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[16px] border border-[color:var(--outline)] bg-[color:color-mix(in_srgb,var(--surface-low)_96%,transparent)]";
  const homePanelHeaderClass =
    "flex items-center justify-between border-b border-[color:var(--outline)] px-[18px] pb-3 pt-[18px] text-[0.76rem] font-bold uppercase tracking-[0.12em] text-[color:var(--text-muted)]";
  const homeListClass = "grid content-start gap-2.5 overflow-auto p-4";
  const baseCardClass =
    "grid w-full gap-2 rounded-[12px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-[14px] text-left text-[color:var(--text)] transition-colors hover:bg-[color:var(--surface-high)] cursor-pointer";
  const badgeClass =
    "inline-flex w-fit rounded-full bg-[color:color-mix(in_srgb,var(--indigo-soft)_18%,transparent)] px-2 py-1 text-[0.7rem] font-bold uppercase tracking-[0.04em] text-[color:var(--indigo-soft)]";
  const loadingBadgeClass =
    "inline-flex w-fit items-center gap-1.5 rounded-full bg-[color:color-mix(in_srgb,var(--surface-highest)_82%,transparent)] px-2 py-1 text-[0.7rem] font-bold uppercase tracking-[0.04em] text-[color:var(--text)]";
  const secondaryBadgeClass =
    "inline-flex w-fit rounded-full bg-[color:color-mix(in_srgb,var(--surface-highest)_88%,transparent)] px-2 py-1 text-[0.7rem] font-bold uppercase tracking-[0.04em] text-[color:var(--text-muted)]";
  const utilityActionButtonClass =
    "h-7 w-7 rounded-[8px] text-[color:var(--text-muted)] hover:bg-[color:var(--surface-high)] hover:text-[color:var(--text)]";
  const templateCardClass =
    "grid w-full cursor-pointer gap-1.5 rounded-[12px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-[14px] text-left text-[color:var(--text)] transition-colors hover:bg-[color:var(--surface-high)]";

  return (
    <section className="workspace-home">
      <div className="mb-[26px] flex flex-wrap items-end justify-between gap-5 rounded-[18px] border border-[color:var(--outline)] bg-[color:color-mix(in_srgb,var(--surface-low)_94%,transparent)] p-6 max-[960px]:items-start">
        <div>
          <p className="mb-2.5 text-[0.72rem] uppercase tracking-[0.14em] text-[color:var(--indigo-soft)]">
            Local-first workspace
          </p>
          <h1 className="m-0 text-[2rem] tracking-[-0.03em]">Spaces, recent notes, and fast entry points.</h1>
          <p className="mt-3 max-w-[760px] leading-[1.65] text-[color:var(--text-muted)]">
            Open multiple markdown spaces, jump back into recent notes, and start a new note or
            journal entry without digging through folders first.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            className="rounded-[8px] bg-[color:var(--indigo)] px-[14px] py-2.5 font-bold text-white transition hover:-translate-y-px hover:shadow-[0_10px_24px_color-mix(in_srgb,var(--indigo)_26%,transparent)]"
            onClick={() => void onSelectRootDirectory()}
          >
            Add Space
          </button>
          <button
            type="button"
            className="rounded-[8px] bg-[color:var(--surface-high)] px-[14px] py-2.5 text-[color:var(--text)] transition hover:-translate-y-px hover:bg-[color:var(--surface-highest)] hover:shadow-[0_8px_20px_color-mix(in_srgb,var(--outline-strong)_16%,transparent)]"
            onClick={onOpenCloneDialog}
          >
            Clone Repository
          </button>
          <button
            type="button"
            className="rounded-[8px] bg-[color:var(--surface-high)] px-[14px] py-2.5 text-[color:var(--text)] transition hover:-translate-y-px hover:bg-[color:var(--surface-highest)] hover:shadow-[0_8px_20px_color-mix(in_srgb,var(--outline-strong)_16%,transparent)]"
            onClick={() => void onCreateJournalEntry()}
          >
            New Journal Entry
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-[18px] max-[1200px]:grid-cols-1">
        <section className={homePanelClass}>
          <div className={homePanelHeaderClass}>
            <span>Spaces</span>
            <strong>{spaces.length}</strong>
          </div>
          <div className={homeListClass}>
            {orderedVisibleSpaces.length > 0 ? (
              orderedVisibleSpaces.map((space, index) => (
                <div
                  key={space.id}
                  role="button"
                  tabIndex={openingSpacePath === space.localPath ? -1 : 0}
                  className={clsx(
                    baseCardClass,
                    openingSpacePath === space.localPath && "cursor-progress opacity-90 pointer-events-none"
                  )}
                  onClick={() => void onOpenSpace(space.localPath)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      void onOpenSpace(space.localPath);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 font-bold">
                      <Folder className="icon" />
                      <span>{getSpaceLabel(space)}</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={clsx(
                          utilityActionButtonClass,
                          space.isPinned &&
                            "bg-[color:color-mix(in_srgb,var(--indigo-soft)_14%,transparent)] text-[color:var(--indigo-soft)]"
                        )}
                        disabled={openingSpacePath === space.localPath}
                        aria-label={space.isPinned ? "Unpin space" : "Pin space"}
                        onClick={(event) => {
                          event.stopPropagation();
                          onTogglePinnedSpace(space.id);
                        }}
                      >
                        <Pin className="icon" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={utilityActionButtonClass}
                        disabled={openingSpacePath === space.localPath || index === 0}
                        aria-label="Move space up"
                        onClick={(event) => {
                          event.stopPropagation();
                          onMoveSpace(space.id, -1);
                        }}
                      >
                        <ChevronUp className="icon" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={utilityActionButtonClass}
                        disabled={openingSpacePath === space.localPath || index === orderedVisibleSpaces.length - 1}
                        aria-label="Move space down"
                        onClick={(event) => {
                          event.stopPropagation();
                          onMoveSpace(space.id, 1);
                        }}
                      >
                        <ChevronDown className="icon" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={utilityActionButtonClass}
                        disabled={openingSpacePath === space.localPath}
                        aria-label={space.isArchived ? "Restore space" : "Archive space"}
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleArchivedSpace(space.id);
                        }}
                      >
                        <Archive className="icon" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={utilityActionButtonClass}
                        disabled={openingSpacePath === space.localPath}
                        aria-label="Remove space"
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemoveSpace(space.id);
                        }}
                      >
                        <Trash2 className="icon" />
                      </Button>
                    </div>
                  </div>
                  {gitInfos[space.id]?.is_repo ? (
                    <div className={badgeClass}>
                      Git repo{gitInfos[space.id]?.branch ? ` • ${gitInfos[space.id]?.branch}` : ""}
                    </div>
                  ) : null}
                  {openingSpacePath === space.localPath ? (
                    <div className={loadingBadgeClass}>
                      <LoaderCircle className="icon h-3.5 w-3.5 animate-spin" />
                      <span>Opening…</span>
                    </div>
                  ) : null}
                  {space.isPinned ? <div className={secondaryBadgeClass}>Pinned</div> : null}
                  <div className="break-words text-[0.78rem] leading-[1.45] text-[color:var(--text-muted)]">
                    {space.localPath}
                  </div>
                  <div className="flex flex-wrap gap-x-[14px] gap-y-2 text-[0.74rem] text-[color:var(--text-muted)]">
                    <span>{spaceSummaries[space.id]?.note_count ?? 0} notes</span>
                    <span>
                      {spaceSummaries[space.id]?.latest_modified_at
                        ? `Updated ${new Date(spaceSummaries[space.id].latest_modified_at!).toLocaleDateString()}`
                        : "No recent edits"}
                    </span>
                  </div>
                  <div className="text-[0.74rem] text-[color:var(--indigo-soft)]">
                    Last opened {new Date(space.lastOpenedAt).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="explorer-empty">Add your first space to start building the workspace.</div>
            )}
          </div>
        </section>

        <section className={homePanelClass}>
          <div className={homePanelHeaderClass}>
            <span>Create From Template</span>
            <strong>4</strong>
          </div>
          <div className="grid content-start gap-2.5 p-4">
            <button type="button" className={templateCardClass} onClick={() => void onCreateNote()}>
              <strong className="text-[0.92rem]">Blank Note</strong>
              <span className="text-[0.8rem] leading-[1.5] text-[color:var(--text-muted)]">
                General markdown note with basic frontmatter.
              </span>
            </button>
            <button type="button" className={templateCardClass} onClick={() => void onCreateJournalEntry()}>
              <strong className="text-[0.92rem]">Daily Journal</strong>
              <span className="text-[0.8rem] leading-[1.5] text-[color:var(--text-muted)]">
                Dated entry with notes, wins, and next sections.
              </span>
            </button>
            <button type="button" className={templateCardClass} onClick={() => void onCreateTemplateNote("idea")}>
              <strong className="text-[0.92rem]">Idea Note</strong>
              <span className="text-[0.8rem] leading-[1.5] text-[color:var(--text-muted)]">
                Capture a problem, approach, and open questions.
              </span>
            </button>
            <button
              type="button"
              className={templateCardClass}
              onClick={() => void onCreateTemplateNote("meeting")}
            >
              <strong className="text-[0.92rem]">Meeting Note</strong>
              <span className="text-[0.8rem] leading-[1.5] text-[color:var(--text-muted)]">
                Track attendees, agenda, decisions, and follow-ups.
              </span>
            </button>
          </div>
        </section>

        <section className={homePanelClass}>
          <div className={homePanelHeaderClass}>
            <span>Recent Notes</span>
            <strong>{recentNotes.length}</strong>
          </div>
          <div className={homeListClass}>
            {recentNotes.length > 0 ? (
              recentNotes.map((note) => (
                <button
                  key={`${note.spaceId}:${note.path}`}
                  type="button"
                  className={clsx(
                    baseCardClass,
                    openingRecentNoteKey === `${note.spaceId}:${note.path}` &&
                      "cursor-progress opacity-90 pointer-events-none"
                  )}
                  disabled={openingRecentNoteKey === `${note.spaceId}:${note.path}`}
                  onClick={() => void onOpenRecentNote(note)}
                >
                  <div className="break-words text-[0.9rem] font-bold">{note.relativePath}</div>
                  <div className="break-words text-[0.78rem] leading-[1.45] text-[color:var(--text-muted)]">
                    {note.spaceName}
                  </div>
                  {openingRecentNoteKey === `${note.spaceId}:${note.path}` ? (
                    <div className={loadingBadgeClass}>
                      <LoaderCircle className="icon h-3.5 w-3.5 animate-spin" />
                      <span>Opening…</span>
                    </div>
                  ) : null}
                </button>
              ))
            ) : (
              <div className="explorer-empty">Open a few notes and they will appear here.</div>
            )}
          </div>
        </section>

        <section className={homePanelClass}>
          <div className={homePanelHeaderClass}>
            <span>Bookmarked Notes</span>
            <strong>{homeBookmarkedNotes.length}</strong>
          </div>
          <div className={homeListClass}>
            {homeBookmarkedNotes.length > 0 ? (
              homeBookmarkedNotes.map((note) => (
                <button
                  key={`bookmark:${note.spaceId}:${note.path}`}
                  type="button"
                  className={clsx(
                    baseCardClass,
                    openingRecentNoteKey === `${note.spaceId}:${note.path}` &&
                      "cursor-progress opacity-90 pointer-events-none"
                  )}
                  disabled={openingRecentNoteKey === `${note.spaceId}:${note.path}`}
                  onClick={() => void onOpenRecentNote(note)}
                >
                  <div className="break-words text-[0.9rem] font-bold">{note.relativePath}</div>
                  <div className="break-words text-[0.78rem] leading-[1.45] text-[color:var(--text-muted)]">
                    {note.spaceName}
                  </div>
                  {openingRecentNoteKey === `${note.spaceId}:${note.path}` ? (
                    <div className={loadingBadgeClass}>
                      <LoaderCircle className="icon h-3.5 w-3.5 animate-spin" />
                      <span>Opening…</span>
                    </div>
                  ) : null}
                </button>
              ))
            ) : (
              <div className="explorer-empty">Bookmark notes to pin them on the workspace home.</div>
            )}
          </div>
        </section>

        <section className={homePanelClass}>
          <div className={homePanelHeaderClass}>
            <span>Archived Spaces</span>
            <strong>{archivedSpaces.length}</strong>
          </div>
          <div className={homeListClass}>
            {archivedSpaces.length > 0 ? (
              archivedSpaces.map((space) => (
                <div
                  key={`archived:${space.id}`}
                  role="button"
                  tabIndex={openingSpacePath === space.localPath ? -1 : 0}
                  className={clsx(
                    baseCardClass,
                    openingSpacePath === space.localPath && "cursor-progress opacity-90 pointer-events-none"
                  )}
                  onClick={() => void onOpenSpace(space.localPath)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      void onOpenSpace(space.localPath);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 font-bold">
                      <Folder className="icon" />
                      <span>{getSpaceLabel(space)}</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={utilityActionButtonClass}
                        disabled={openingSpacePath === space.localPath}
                        aria-label="Restore space"
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleArchivedSpace(space.id);
                        }}
                      >
                        <ArchiveRestore className="icon" />
                      </Button>
                    </div>
                  </div>
                  {openingSpacePath === space.localPath ? (
                    <div className={loadingBadgeClass}>
                      <LoaderCircle className="icon h-3.5 w-3.5 animate-spin" />
                      <span>Opening…</span>
                    </div>
                  ) : null}
                  <div className="break-words text-[0.78rem] leading-[1.45] text-[color:var(--text-muted)]">
                    {space.localPath}
                  </div>
                </div>
              ))
            ) : (
              <div className="explorer-empty">Archived spaces stay here until you restore them.</div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
