import clsx from "clsx";
import {
  CalendarDays,
  Download,
  FilePlus2,
  Info,
  Pencil,
  PencilLine,
  Printer,
  Settings,
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
  onOpenSettings
}: PreviewToolbarProps) {
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
            className={documentPanel === "metadata" ? "text-[color:var(--indigo-soft)]" : undefined}
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
