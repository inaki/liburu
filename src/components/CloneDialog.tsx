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

type CloneDialogState = {
  repoUrl: string;
  destinationParent: string;
  directoryName: string;
} | null;

type CloneDialogProps = {
  cloneDialog: CloneDialogState;
  onOpenChange: (open: boolean) => void;
  onRepoUrlChange: (value: string) => void;
  onDestinationParentChange: (value: string) => void;
  onChooseDestination: () => void | Promise<void>;
  onDirectoryNameChange: (value: string) => void;
  onSubmit: () => void | Promise<void>;
};

export function CloneDialog({
  cloneDialog,
  onOpenChange,
  onRepoUrlChange,
  onDestinationParentChange,
  onChooseDestination,
  onDirectoryNameChange,
  onSubmit
}: CloneDialogProps) {
  return (
    <Dialog open={Boolean(cloneDialog)} onOpenChange={onOpenChange}>
      {cloneDialog ? (
        <DialogContent className="grid w-[min(560px,calc(100vw-2rem))] grid-rows-[auto_minmax(0,1fr)_auto] p-0">
          <DialogHeader>
            <div>
              <DialogTitle>Clone Repository</DialogTitle>
              <DialogDescription>
                Clone a public or already-authenticated git repository into a local space.
              </DialogDescription>
            </div>
            <DialogIconClose />
          </DialogHeader>

          <div className="grid gap-4 p-5">
            <div className="grid gap-2.5 rounded-[10px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-[14px]">
              <Label>Repository URL</Label>
              <Input
                type="text"
                value={cloneDialog.repoUrl}
                onChange={(event) => onRepoUrlChange(event.target.value)}
                placeholder="https://github.com/owner/repo.git"
                autoFocus
              />
            </div>

            <div className="grid gap-2.5 rounded-[10px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-[14px]">
              <Label>Destination Folder</Label>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2.5">
                <Input
                  type="text"
                  value={cloneDialog.destinationParent}
                  onChange={(event) => onDestinationParentChange(event.target.value)}
                  placeholder="/Users/you/repos"
                />
                <Button type="button" variant="secondary" onClick={() => void onChooseDestination()}>
                  Choose
                </Button>
              </div>
            </div>

            <div className="grid gap-2.5 rounded-[10px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-[14px]">
              <Label>Local Folder Name</Label>
              <Input
                type="text"
                value={cloneDialog.directoryName}
                onChange={(event) => onDirectoryNameChange(event.target.value)}
                placeholder="repo-name"
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
              Clone Repository
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
