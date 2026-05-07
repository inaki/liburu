import { useEffect, useRef, useState, type ComponentType } from "react";
import { Copy, Download, FolderArchive, RefreshCw, Share2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type ShareAction = {
  key: string;
  label: string;
  description?: string;
  icon: ComponentType<{ className?: string }>;
  disabled?: boolean;
  onSelect: () => void | Promise<void>;
};

type TopbarProps = {
  title: string;
  searchValue: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  shareActions: ShareAction[];
  onProfile: () => void;
};

export function Topbar({
  title,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  onRefresh,
  shareActions,
  onProfile
}: TopbarProps) {
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
    <header className="flex items-center justify-between gap-5 border-b border-[color:var(--outline)] bg-[color:var(--bg)] px-5">
      <div className="flex items-center gap-6">
        <h2 className="m-0 text-base font-bold tracking-tight">{title}</h2>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="w-[320px]">
          <Input
            type="search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 rounded-[6px] bg-[color:var(--surface-lowest)] px-3 text-[0.82rem]"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-[34px] w-[34px] rounded-[6px] text-[color:var(--text-muted)] hover:bg-[color:var(--surface-high)] hover:text-[color:var(--text)]"
          aria-label="Refresh"
          onClick={onRefresh}
        >
          <RefreshCw className="icon" />
        </Button>
        <div ref={shareMenuRef} className="relative">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-[34px] w-[34px] rounded-[6px] text-[color:var(--text-muted)] hover:bg-[color:var(--surface-high)] hover:text-[color:var(--text)]"
            aria-label="Share"
            aria-haspopup="menu"
            aria-expanded={isShareOpen}
            onClick={() => setIsShareOpen((current) => !current)}
          >
            <Share2 className="icon" />
          </Button>
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
        {/* <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-[34px] w-[34px] rounded-[6px] bg-transparent text-[color:var(--text-muted)] hover:bg-[color:var(--surface-high)] hover:text-[color:var(--text)]"
          aria-label="Profile"
          onClick={onProfile}
        >
          <UserCircle2 className="icon" />
        </Button> */}
      </div>
    </header>
  );
}

export const topbarShareIcons = {
  copy: Copy,
  download: Download,
  zip: FolderArchive,
};
