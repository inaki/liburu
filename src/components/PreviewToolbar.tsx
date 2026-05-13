import { useEffect, useRef, useState, type ComponentType } from "react";
import clsx from "clsx";
import {
  CalendarDays,
  Copy,
  Download,
  FilePlus2,
  FolderArchive,
  Info,
  Maximize2,
  Pencil,
  PencilLine,
  Printer,
  Settings,
  Share2,
  Trash2
} from "lucide-react";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";

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

export type ShareAction = {
  key: string;
  label: string;
  description?: string;
  icon: ComponentType<{ className?: string }>;
  disabled?: boolean;
  onSelect: () => void | Promise<void>;
};

export const previewToolbarShareIcons = {
  copy: Copy,
  download: Download,
  zip: FolderArchive,
};

type PreviewToolbarProps = {
  viewMode: "preview" | "source";
  onSetViewMode: (mode: "preview" | "source") => void;
  selectedFile: boolean;
  isDirty: boolean;
  isSavingFile: boolean;
  autosave: boolean;
  toolbar: ToolbarSettings;
  documentPanel: "toc" | "metadata";
  onSave: () => void | Promise<void>;
  onCreateNote: () => void | Promise<void>;
  onCreateJournal: () => void | Promise<void>;
  onRename: () => void | Promise<void>;
  onToggleEditMode: () => void;
  onPrint: () => void;
  onDownload: () => void;
  onToggleMetadata: () => void;
  onDelete: () => void | Promise<void>;
  onOpenSettings: () => void;
  onOpenZenMode: () => void;
  shareActions: ShareAction[];
};

export function PreviewToolbar({
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
  onToggleEditMode,
  onPrint,
  onDownload,
  onToggleMetadata,
  onDelete,
  onOpenSettings,
  onOpenZenMode,
  shareActions
}: PreviewToolbarProps) {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement | null>(null);
  const enabledShareActions = shareActions.filter((action) => !action.disabled);

  useEffect(() => {
    if (!isShareOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!shareMenuRef.current?.contains(event.target as Node)) {
        setIsShareOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsShareOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isShareOpen]);

  return (
    <div className="flex items-center justify-between gap-4 border-b border-[color:var(--outline)] bg-[color:var(--toolbar-bg)] px-5">
      <div className="inline-flex gap-1 rounded-[8px] bg-[color:var(--surface-highest)] p-1">
        <Button
          type="button"
          variant="ghost"
          className={clsx(
            "h-auto rounded-[6px] px-4 py-1.5 text-[0.76rem] font-bold text-[color:var(--text-muted)] hover:bg-transparent hover:text-[color:var(--text)]",
            viewMode === "preview" && "bg-[color:var(--bg)] text-[color:var(--text)] hover:bg-[color:var(--bg)]"
          )}
          onClick={() => onSetViewMode("preview")}
        >
          Preview
        </Button>
        <Button
          type="button"
          variant="ghost"
          className={clsx(
            "h-auto rounded-[6px] px-4 py-1.5 text-[0.76rem] font-bold text-[color:var(--text-muted)] hover:bg-transparent hover:text-[color:var(--text)]",
            viewMode === "source" && "bg-[color:var(--bg)] text-[color:var(--text)] hover:bg-[color:var(--bg)]"
          )}
          onClick={() => onSetViewMode("source")}
        >
          Source
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {toolbar.save && selectedFile ? (
          <Button
            type="button"
            variant={isDirty ? "default" : "secondary"}
            className="min-w-[72px] px-[14px] py-2 text-[0.76rem] font-bold"
            aria-label="Save"
            onClick={() => void onSave()}
            disabled={isSavingFile}
          >
            {isSavingFile
              ? autosave && isDirty
                ? "Autosaving..."
                : "Saving..."
              : isDirty
                ? autosave
                  ? "Autosave on"
                  : "Save"
                : "Saved"}
          </Button>
        ) : null}
        {toolbar.createNote ? (
          <ToolbarIconButton ariaLabel="Create note" onClick={onCreateNote}>
            <FilePlus2 className="icon" />
          </ToolbarIconButton>
        ) : null}
        {toolbar.createJournal ? (
          <ToolbarIconButton ariaLabel="Create journal entry" onClick={onCreateJournal}>
            <CalendarDays className="icon" />
          </ToolbarIconButton>
        ) : null}
        {toolbar.rename ? (
          <ToolbarIconButton ariaLabel="Rename note" onClick={onRename} disabled={!selectedFile || isDirty}>
            <PencilLine className="icon" />
          </ToolbarIconButton>
        ) : null}
        {toolbar.editMode ? (
          <ToolbarIconButton ariaLabel="Edit" onClick={onToggleEditMode}>
            <Pencil className="icon" />
          </ToolbarIconButton>
        ) : null}
        {toolbar.print ? (
          <ToolbarIconButton ariaLabel="Print" onClick={onPrint}>
            <Printer className="icon" />
          </ToolbarIconButton>
        ) : null}
        {toolbar.download ? (
          <ToolbarIconButton ariaLabel="Download" onClick={onDownload}>
            <Download className="icon" />
          </ToolbarIconButton>
        ) : null}
        {toolbar.metadata ? (
          <ToolbarIconButton
            ariaLabel="Document metadata"
            onClick={onToggleMetadata}
            className={
              documentPanel === "metadata"
                ? "!bg-transparent !text-[color:var(--indigo)] hover:!bg-[color:var(--surface-high)]"
                : undefined
            }
          >
            <Info className="icon" />
          </ToolbarIconButton>
        ) : null}
        {toolbar.delete ? (
          <ToolbarIconButton ariaLabel="Delete note" onClick={onDelete} disabled={!selectedFile || isDirty}>
            <Trash2 className="icon" />
          </ToolbarIconButton>
        ) : null}
        {toolbar.settings ? (
          <ToolbarIconButton ariaLabel="Open settings" onClick={onOpenSettings}>
            <Settings className="icon" />
          </ToolbarIconButton>
        ) : null}
        <ToolbarIconButton ariaLabel="Open zen mode" onClick={onOpenZenMode} disabled={!selectedFile}>
          <Maximize2 className="icon" />
        </ToolbarIconButton>
        <div ref={shareMenuRef} className="relative">
          <ToolbarIconButton
            ariaLabel="Share"
            onClick={() => setIsShareOpen((current) => !current)}
            className={isShareOpen ? "!bg-[color:var(--surface-high)] !text-[color:var(--text)]" : undefined}
          >
            <Share2 className="icon" />
          </ToolbarIconButton>
          {isShareOpen ? (
            <div className="absolute right-0 top-[calc(100%+10px)] z-40 grid min-w-[260px] gap-1 rounded-[12px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-2 shadow-[var(--panel-shadow)]">
              {shareActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.key}
                    type="button"
                    role="menuitem"
                    disabled={action.disabled}
                    className="grid min-w-0 cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-[10px] border border-transparent bg-transparent px-3 py-2 text-left transition-colors hover:border-[color:var(--outline)] hover:bg-[color:color-mix(in_srgb,var(--surface-low)_38%,transparent)] disabled:cursor-not-allowed disabled:opacity-45"
                    onClick={() => {
                      setIsShareOpen(false);
                      void action.onSelect();
                    }}
                  >
                    <Icon className="icon mt-0.5 h-4 w-4 text-[color:var(--text-muted)]" />
                    <span className="grid min-w-0 gap-0.5">
                      <span className="text-[0.82rem] font-semibold text-[color:var(--text)]">
                        {action.label}
                      </span>
                      {action.description ? (
                        <span className="text-[0.74rem] text-[color:var(--text-muted)]">
                          {action.description}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
              {enabledShareActions.length === 0 ? (
                <div className="rounded-[10px] px-3 py-2 text-[0.78rem] text-[color:var(--text-muted)]">
                  Open a space or markdown file first.
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <Separator orientation="vertical" className="mx-1 h-5 bg-[color:var(--outline)]" />
        <span className="pl-0 text-[0.72rem] text-[color:var(--text-muted)]">UTF-8 • Markdown</span>
      </div>
    </div>
  );
}

function ToolbarIconButton({
  ariaLabel,
  onClick,
  className,
  disabled,
  children
}: {
  ariaLabel: string;
  onClick: () => void | Promise<void>;
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={clsx(
        "h-[34px] w-[34px] rounded-[6px] text-[color:var(--text-muted)] hover:bg-[color:var(--surface-high)] hover:text-[color:var(--text)]",
        className
      )}
      aria-label={ariaLabel}
      onClick={() => void onClick()}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}
