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
        <DialogContent className="note-dialog grid grid-rows-[auto_minmax(0,1fr)_auto] p-0">
          <DialogHeader className="settings-header-shadcn">
            <div>
              <DialogTitle>{noteDialog.title}</DialogTitle>
              <DialogDescription>{noteDialog.description}</DialogDescription>
            </div>
            <DialogIconClose />
          </DialogHeader>

          <div className="settings-grid">
            {noteDialog.mode === "rename" ? (
              <div className="settings-field">
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
                <div className="settings-field">
                  <Label>Parent folder</Label>
                  <Select value={noteDirectoryInput} onValueChange={onNoteDirectoryChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a folder" />
                    </SelectTrigger>
                    <SelectContent>
                      {directoryOptions.map((directory) => (
                        <SelectItem key={directory || "root"} value={directory}>
                          {directory || "Root"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="inline-field">
                    <Button type="button" variant="secondary" onClick={onUseCurrentFolder}>
                      Use current folder
                    </Button>
                  </div>
                </div>
                <div className="settings-field">
                  <Label>Filename</Label>
                  <Input
                    type="text"
                    value={noteNameInput}
                    onChange={(event) => onNoteNameChange(event.target.value)}
                    placeholder="untitled.md"
                    autoFocus
                  />
                </div>
                <div className="settings-field settings-field-wide">
                  <Label>Resulting path</Label>
                  <Input type="text" value={notePathInput} readOnly />
                </div>
              </>
            )}
          </div>

          <DialogFooter className="settings-footer-shadcn">
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
