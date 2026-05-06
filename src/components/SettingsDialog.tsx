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
        <DialogHeader className="settings-header-shadcn">
          <div>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Personalize the viewer without changing the core workflow.
            </DialogDescription>
          </div>
          <DialogIconClose />
        </DialogHeader>

        <ScrollArea className="settings-body">
          <div className="settings-grid">
            <div className="settings-field">
              <span>Theme</span>
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

            <div className="settings-field">
              <span>Brand logo</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="settings-brand-preview"
                  onClick={onPickBrandLogo}
                  aria-label="Choose custom brand logo"
                >
                  {settings.brandLogoDataUrl ? (
                    <img
                      src={settings.brandLogoDataUrl}
                      alt="Selected brand logo"
                      className="settings-brand-preview-image"
                    />
                  ) : (
                    <PenTool className="icon" />
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
              <small>Uses a simple pen icon by default. Upload a square logo to personalize the rail brand.</small>
              <input
                ref={brandLogoInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onBrandLogoSelected}
              />
            </div>

            <div className="settings-field">
              <span>Auto-refresh</span>
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

            <label className="settings-toggle">
              <Checkbox
                checked={settings.showToc}
                onCheckedChange={(checked) => onUpdateSettings({ showToc: checked === true })}
              />
              <div>
                <strong>Show table of contents</strong>
                <span>Keep the right-side outline visible while reading.</span>
              </div>
            </label>

            <label className="settings-toggle">
              <Checkbox
                checked={settings.sourceWrap}
                onCheckedChange={(checked) => onUpdateSettings({ sourceWrap: checked === true })}
              />
              <div>
                <strong>Wrap source lines</strong>
                <span>Wrap long lines in source mode instead of horizontal scrolling.</span>
              </div>
            </label>

            <label className="settings-toggle">
              <Checkbox
                checked={settings.autosave}
                onCheckedChange={(checked) => onUpdateSettings({ autosave: checked === true })}
              />
              <div>
                <strong>Autosave changes</strong>
                <span>Save the current note automatically after a short pause while editing.</span>
              </div>
            </label>

            <label className="settings-toggle">
              <Checkbox
                checked={viewMode === "source"}
                onCheckedChange={(checked) => onSetViewMode(checked === true ? "source" : "preview")}
              />
              <div>
                <strong>Open in source mode</strong>
                <span>Quickly inspect raw Markdown without switching manually.</span>
              </div>
            </label>

            <div className="settings-field settings-field-wide">
              <span>Toolbar items</span>
              <div className="settings-toolbar-grid">
                <TooltipProvider delayDuration={120}>
                  {toolbarItemOptions.map((item) => {
                    const Icon = item.icon;
                    const isSelected = settings.toolbar[item.key];
                    return (
                      <button
                        key={item.key}
                        type="button"
                        className="settings-toolbar-item"
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
                                "settings-toolbar-icon",
                                isSelected && "settings-toolbar-icon-selected"
                              )}
                              aria-hidden="true"
                            >
                              <Icon className="h-4.5 w-4.5" />
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
              <div className="settings-field settings-field-wide">
                <span>Space excludes</span>
                <Textarea
                  value={excludePathsInput}
                  onChange={(event) => onExcludePathsInputChange(event.target.value)}
                  placeholder={defaultSpaceExcludes.join("\n")}
                  className="min-h-[140px] resize-y"
                />
                <small>
                  One path per line. Matching folders are skipped during scan, search, summaries,
                  and git badges.
                </small>
              </div>
            ) : null}
          </div>
        </ScrollArea>

        <DialogFooter className="settings-footer-shadcn justify-between">
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
