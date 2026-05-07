import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogIconClose,
  DialogTitle
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

type NoteDialogMode = "create" | "journal" | "rename";
type TemplateKind = "note" | "journal" | "idea" | "meeting";

type NoteDialogState =
  | {
      mode: NoteDialogMode;
      template: TemplateKind;
      title: string;
      description: string;
      confirmLabel: string;
      initialPath: string;
    }
  | null;

type NoteDialogProps = {
  noteDialog: NoteDialogState;
  notePathInput: string;
  noteDirectoryInput: string;
  noteNameInput: string;
  directoryOptions: string[];
  onOpenChange: (open: boolean) => void;
  onNotePathInputChange: (value: string) => void;
  onNoteDirectoryChange: (value: string) => void;
  onUseCurrentFolder: () => void;
  onNoteNameChange: (value: string) => void;
  onSubmit: () => void | Promise<void>;
};

const ROOT_DIRECTORY_VALUE = "__root__";

export function NoteDialog({
  noteDialog,
  notePathInput,
  noteDirectoryInput,
  noteNameInput,
  directoryOptions,
  onOpenChange,
  onNotePathInputChange,
  onNoteDirectoryChange,
  onUseCurrentFolder,
  onNoteNameChange,
  onSubmit
}: NoteDialogProps) {
  return (
    <Dialog open={Boolean(noteDialog)} onOpenChange={onOpenChange}>
      {noteDialog ? (
        <DialogContent className="grid w-[min(560px,calc(100vw-2rem))] grid-rows-[auto_minmax(0,1fr)_auto] p-0">
          <DialogHeader>
            <div>
              <DialogTitle>{noteDialog.title}</DialogTitle>
              <DialogDescription>{noteDialog.description}</DialogDescription>
            </div>
            <DialogIconClose />
          </DialogHeader>

          <div className="grid gap-4 p-5">
            {noteDialog.mode === "rename" ? (
              <div className="grid gap-2.5 rounded-[10px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-[14px]">
                <Label>Markdown path</Label>
                <Input
                  type="text"
                  value={notePathInput}
                  onChange={(event) => onNotePathInputChange(event.target.value)}
                  placeholder="notes/untitled.md"
                  autoFocus
                />
              </div>
            ) : (
              <>
                <div className="grid gap-2.5 rounded-[10px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-[14px]">
                  <Label>Parent folder</Label>
                  <Select
                    value={noteDirectoryInput || ROOT_DIRECTORY_VALUE}
                    onValueChange={(value) =>
                      onNoteDirectoryChange(value === ROOT_DIRECTORY_VALUE ? "" : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a folder" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ROOT_DIRECTORY_VALUE}>Root</SelectItem>
                      {directoryOptions
                        .filter((directory) => directory !== "")
                        .map((directory) => (
                          <SelectItem key={directory} value={directory}>
                            {directory}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2.5">
                    <Button type="button" variant="secondary" onClick={onUseCurrentFolder}>
                      Use current folder
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2.5 rounded-[10px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-[14px]">
                  <Label>Filename</Label>
                  <Input
                    type="text"
                    value={noteNameInput}
                    onChange={(event) => onNoteNameChange(event.target.value)}
                    placeholder="untitled.md"
                    autoFocus
                  />
                </div>
                <div className="grid gap-2.5 rounded-[10px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-[14px]">
                  <Label>Resulting path</Label>
                  <Input type="text" value={notePathInput} readOnly />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={() => void onSubmit()}>
              {noteDialog.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
