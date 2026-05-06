import { RefreshCw, Share2, UserCircle2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

type TopbarProps = {
  title: string;
  searchValue: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onShare: () => void | Promise<void>;
  onProfile: () => void;
};

export function Topbar({
  title,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  onRefresh,
  onShare,
  onProfile
}: TopbarProps) {
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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-[34px] w-[34px] rounded-[6px] text-[color:var(--text-muted)] hover:bg-[color:var(--surface-high)] hover:text-[color:var(--text)]"
          aria-label="Share"
          onClick={() => void onShare()}
        >
          <Share2 className="icon" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-[34px] w-[34px] rounded-[6px] border border-[color:var(--outline)] bg-[color:var(--surface-low)] text-[color:var(--text-muted)] hover:bg-[color:var(--surface-high)] hover:text-[color:var(--text)]"
          aria-label="Profile"
          onClick={onProfile}
        >
          <UserCircle2 className="icon" />
        </Button>
      </div>
    </header>
  );
}
