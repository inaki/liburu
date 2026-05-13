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

export type SpaceRenameDialogState = {
  spaceId: string;
  currentLabel: string;
} | null;

type SpaceRenameDialogProps = {
  renameDialog: SpaceRenameDialogState;
  renameInput: string;
  onOpenChange: (open: boolean) => void;
  onRenameInputChange: (value: string) => void;
  onSubmit: () => void | Promise<void>;
};

export function SpaceRenameDialog({
  renameDialog,
  renameInput,
  onOpenChange,
  onRenameInputChange,
  onSubmit
}: SpaceRenameDialogProps) {
  return (
    <Dialog open={Boolean(renameDialog)} onOpenChange={onOpenChange}>
      {renameDialog ? (
        <DialogContent className="grid w-[min(520px,calc(100vw-2rem))] grid-rows-[auto_minmax(0,1fr)_auto] p-0">
          <DialogHeader>
            <div>
              <DialogTitle>Rename Space</DialogTitle>
              <DialogDescription>
                Set a custom label for this space without changing the folder name on disk.
              </DialogDescription>
            </div>
            <DialogIconClose />
          </DialogHeader>

          <div className="grid gap-4 p-5">
            <div className="grid gap-2.5 rounded-[10px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-[14px]">
              <Label>Space label</Label>
              <Input
                type="text"
                value={renameInput}
                onChange={(event) => onRenameInputChange(event.target.value)}
                placeholder={renameDialog.currentLabel}
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
              Save Label
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
