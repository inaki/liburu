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

export type AddSpaceDialogState = {
  path: string;
  label: string;
} | null;

type AddSpaceDialogProps = {
  addSpaceDialog: AddSpaceDialogState;
  onOpenChange: (open: boolean) => void;
  onPathChange: (value: string) => void;
  onLabelChange: (value: string) => void;
  onChooseDirectory: () => void | Promise<void>;
  onSubmit: () => void | Promise<void>;
};

export function AddSpaceDialog({
  addSpaceDialog,
  onOpenChange,
  onPathChange,
  onLabelChange,
  onChooseDirectory,
  onSubmit
}: AddSpaceDialogProps) {
  return (
    <Dialog open={Boolean(addSpaceDialog)} onOpenChange={onOpenChange}>
      {addSpaceDialog ? (
        <DialogContent className="grid w-[min(560px,calc(100vw-2rem))] grid-rows-[auto_minmax(0,1fr)_auto] p-0">
          <DialogHeader>
            <div>
              <DialogTitle>Add Space</DialogTitle>
              <DialogDescription>
                Choose a local folder and optionally set a custom label for the space.
              </DialogDescription>
            </div>
            <DialogIconClose />
          </DialogHeader>

          <div className="grid gap-4 p-5">
            <div className="grid gap-2.5 rounded-[10px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-[14px]">
              <Label>Folder</Label>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2.5">
                <Input
                  type="text"
                  value={addSpaceDialog.path}
                  onChange={(event) => onPathChange(event.target.value)}
                  placeholder="/Users/you/projects/my-space"
                />
                <Button type="button" variant="secondary" onClick={() => void onChooseDirectory()}>
                  Choose
                </Button>
              </div>
            </div>

            <div className="grid gap-2.5 rounded-[10px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-[14px]">
              <Label>Space Label</Label>
              <Input
                type="text"
                value={addSpaceDialog.label}
                onChange={(event) => onLabelChange(event.target.value)}
                placeholder="My Space"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={() => void onSubmit()}>
              Add Space
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
