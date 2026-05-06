import clsx from "clsx";
import { PenTool, type LucideIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogIconClose,
  DialogTitle
} from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

type AppSettings = {
  theme: "dark" | "light";
  brandLogoDataUrl: string;
  showToc: boolean;
  sourceWrap: boolean;
  autosave: boolean;
  autoRefreshMs: number;
  toolbar: {
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
};

type ToolbarItemOption = {
  key: keyof AppSettings["toolbar"];
  label: string;
  description: string;
  icon: LucideIcon;
};

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  viewMode: "preview" | "source";
  onSetViewMode: (mode: "preview" | "source") => void;
  toolbarItemOptions: ToolbarItemOption[];
  brandLogoInputRef: React.RefObject<HTMLInputElement | null>;
  onPickBrandLogo: () => void;
  onBrandLogoSelected: (event: React.ChangeEvent<HTMLInputElement>) => void;
  activeSpace: { id: string } | null;
  excludePathsInput: string;
  onExcludePathsInputChange: (value: string) => void;
  defaultSpaceExcludes: string[];
  onSaveSpaceExcludes: () => void;
  onResetDefaults: () => void;
};

export function SettingsDialog({
  open,
  onOpenChange,
  settings,
  onUpdateSettings,
  viewMode,
  onSetViewMode,
  toolbarItemOptions,
  brandLogoInputRef,
  onPickBrandLogo,
  onBrandLogoSelected,
  activeSpace,
  excludePathsInput,
  onExcludePathsInputChange,
  defaultSpaceExcludes,
  onSaveSpaceExcludes,
  onResetDefaults
}: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid grid-rows-[auto_minmax(0,1fr)_auto] p-0">
        <DialogHeader>
          <div>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Personalize the viewer without changing the core workflow.
            </DialogDescription>
          </div>
          <DialogIconClose />
        </DialogHeader>

        <ScrollArea className="min-h-0">
          <div className="grid gap-4 p-5">
            <div className="grid gap-2.5 rounded-[10px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-[14px]">
              <span className="text-[color:var(--text)]">Theme</span>
              <Select
                value={settings.theme}
                onValueChange={(value) => onUpdateSettings({ theme: value as AppSettings["theme"] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2.5 rounded-[10px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-[14px]">
              <span className="text-[color:var(--text)]">Brand logo</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="grid h-12 w-12 place-items-center overflow-hidden rounded-[12px] border border-[color:var(--outline)] bg-[color:var(--surface-low)] text-[color:var(--indigo)] transition-[border-color,background-color,transform] hover:-translate-y-px hover:border-[color:var(--outline-strong)] hover:bg-[color:var(--surface-lowest)] focus-visible:outline-none"
                  onClick={onPickBrandLogo}
                  aria-label="Choose custom brand logo"
                >
                  {settings.brandLogoDataUrl ? (
                    <img
                      src={settings.brandLogoDataUrl}
                      alt="Selected brand logo"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <PenTool className="icon h-[1.2rem] w-[1.2rem]" />
                  )}
                </button>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" onClick={onPickBrandLogo}>
                    Upload logo
                  </Button>
                  {settings.brandLogoDataUrl ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onUpdateSettings({ brandLogoDataUrl: "" })}
                    >
                      Reset
                    </Button>
                  ) : null}
                </div>
              </div>
              <small className="text-[0.78rem] leading-[1.5] text-[color:var(--text-muted)]">
                Uses a simple pen icon by default. Upload a square logo to personalize the rail brand.
              </small>
              <input
                ref={brandLogoInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onBrandLogoSelected}
              />
            </div>

            <div className="grid gap-2.5 rounded-[10px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-[14px]">
              <span className="text-[color:var(--text)]">Auto-refresh</span>
              <Select
                value={String(settings.autoRefreshMs)}
                onValueChange={(value) => onUpdateSettings({ autoRefreshMs: Number(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select refresh interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2000">2 seconds</SelectItem>
                  <SelectItem value="4000">4 seconds</SelectItem>
                  <SelectItem value="8000">8 seconds</SelectItem>
                  <SelectItem value="15000">15 seconds</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <label className="grid grid-cols-[auto_1fr] items-start gap-2.5 rounded-[10px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-[14px]">
              <Checkbox
                checked={settings.showToc}
                onCheckedChange={(checked) => onUpdateSettings({ showToc: checked === true })}
              />
              <div>
                <strong className="text-[color:var(--text)]">Show table of contents</strong>
                <span className="mt-1 block text-[0.82rem] leading-[1.5] text-[color:var(--text-muted)]">
                  Keep the right-side outline visible while reading.
                </span>
              </div>
            </label>

            <label className="grid grid-cols-[auto_1fr] items-start gap-2.5 rounded-[10px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-[14px]">
              <Checkbox
                checked={settings.sourceWrap}
                onCheckedChange={(checked) => onUpdateSettings({ sourceWrap: checked === true })}
              />
              <div>
                <strong className="text-[color:var(--text)]">Wrap source lines</strong>
                <span className="mt-1 block text-[0.82rem] leading-[1.5] text-[color:var(--text-muted)]">
                  Wrap long lines in source mode instead of horizontal scrolling.
                </span>
              </div>
            </label>

            <label className="grid grid-cols-[auto_1fr] items-start gap-2.5 rounded-[10px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-[14px]">
              <Checkbox
                checked={settings.autosave}
                onCheckedChange={(checked) => onUpdateSettings({ autosave: checked === true })}
              />
              <div>
                <strong className="text-[color:var(--text)]">Autosave changes</strong>
                <span className="mt-1 block text-[0.82rem] leading-[1.5] text-[color:var(--text-muted)]">
                  Save the current note automatically after a short pause while editing.
                </span>
              </div>
            </label>

            <label className="grid grid-cols-[auto_1fr] items-start gap-2.5 rounded-[10px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-[14px]">
              <Checkbox
                checked={viewMode === "source"}
                onCheckedChange={(checked) => onSetViewMode(checked === true ? "source" : "preview")}
              />
              <div>
                <strong className="text-[color:var(--text)]">Open in source mode</strong>
                <span className="mt-1 block text-[0.82rem] leading-[1.5] text-[color:var(--text-muted)]">
                  Quickly inspect raw Markdown without switching manually.
                </span>
              </div>
            </label>

            <div className="grid gap-2.5 rounded-[10px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-[14px]">
              <span className="text-[color:var(--text)]">Toolbar items</span>
              <div className="flex flex-wrap gap-3">
                <TooltipProvider delayDuration={120}>
                  {toolbarItemOptions.map((item) => {
                    const Icon = item.icon;
                    const isSelected = settings.toolbar[item.key];
                    return (
                      <button
                        key={item.key}
                        type="button"
                        className="group inline-flex items-center justify-center bg-transparent p-0 focus-visible:outline-none"
                        aria-pressed={isSelected}
                        onClick={() =>
                          onUpdateSettings({
                            toolbar: {
                              ...settings.toolbar,
                              [item.key]: !settings.toolbar[item.key]
                            }
                          })
                        }
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className={clsx(
                                "inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[color:var(--outline)] bg-[color:var(--surface-low)] text-[color:var(--text-muted)] transition-[transform,box-shadow,background-color,border-color,color]",
                                "group-hover:-translate-y-px group-hover:border-[color:var(--outline-strong)] group-hover:bg-[color:var(--surface-lowest)] group-hover:text-[color:var(--text)] group-focus-visible:-translate-y-px group-focus-visible:border-[color:var(--outline-strong)] group-focus-visible:bg-[color:var(--surface-lowest)] group-focus-visible:text-[color:var(--text)]",
                                isSelected &&
                                  "border-[color:var(--indigo)] bg-[color:var(--indigo)] text-white shadow-[0_10px_22px_color-mix(in_srgb,var(--indigo)_24%,transparent)]"
                              )}
                              aria-hidden="true"
                            >
                              <Icon className="h-[1.125rem] w-[1.125rem]" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="grid gap-0.5">
                              <span>{item.label}</span>
                              <span className="text-[color:var(--text-muted)]">{item.description}</span>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </button>
                    );
                  })}
                </TooltipProvider>
              </div>
            </div>

            {activeSpace ? (
              <div className="grid gap-2.5 rounded-[10px] border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] p-[14px]">
                <span className="text-[color:var(--text)]">Space excludes</span>
                <Textarea
                  value={excludePathsInput}
                  onChange={(event) => onExcludePathsInputChange(event.target.value)}
                  placeholder={defaultSpaceExcludes.join("\n")}
                  className="min-h-[140px] resize-y"
                />
                <small className="text-[0.78rem] leading-[1.5] text-[color:var(--text-muted)]">
                  One path per line. Matching folders are skipped during scan, search, summaries,
                  and git badges.
                </small>
              </div>
            ) : null}
          </div>
        </ScrollArea>

        <DialogFooter className="justify-between">
          <div>
            {activeSpace ? (
              <Button type="button" variant="secondary" onClick={onSaveSpaceExcludes}>
                Save space excludes
              </Button>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" onClick={onResetDefaults}>
              Reset defaults
            </Button>
            <Button type="button" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
