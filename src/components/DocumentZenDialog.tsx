import { Suspense, lazy, useMemo, useRef } from "react";
import { BookOpenText, Warehouse } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogIconClose,
  DialogTitle
} from "./ui/dialog";
import { OverlayScrollContainer } from "./ui/overlay-scrollbars";

const MarkdownPreview = lazy(() => import("../MarkdownPreview"));

type HeadingItem = {
  id: string;
  label: string;
  level: number;
};

type MdFile = {
  relative_path: string;
};

type DocumentZenDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFile: MdFile | null;
  draftContent: string;
  headings: HeadingItem[];
};

export function DocumentZenDialog({
  open,
  onOpenChange,
  selectedFile,
  draftContent,
  headings
}: DocumentZenDialogProps) {
  const previewScrollRef = useRef<HTMLDivElement | null>(null);
  const title = useMemo(
    () => (selectedFile ? `Zen mode for ${selectedFile.relative_path}` : "Zen mode"),
    [selectedFile]
  );

  function scrollToHeading(id: string) {
    const container = previewScrollRef.current;
    if (!container) {
      return;
    }

    const target = container.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
    if (!target) {
      return;
    }

    target.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-0 left-0 top-0 z-50 h-screen w-screen max-h-none max-w-none translate-x-0 translate-y-0 grid-cols-[minmax(0,1fr)_320px] grid-rows-[minmax(0,1fr)] gap-0 rounded-none border-0 bg-[color:var(--bg)] p-0 shadow-none max-[1100px]:grid-cols-[minmax(0,1fr)_260px] max-[820px]:grid-cols-[minmax(0,1fr)]">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">
          Focused markdown preview with table of contents.
        </DialogDescription>

        <section
          className="relative min-h-0 min-w-0 overflow-hidden"
          style={{
            backgroundImage:
              "radial-gradient(circle at center, var(--page-dot) 1px, transparent 1px)",
            backgroundPosition: "0 0",
            backgroundSize: "24px 24px"
          }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-[color:var(--bg)] via-[color:var(--bg)]/86 to-transparent" />
          <div className="absolute right-6 top-5 z-20">
            <DialogIconClose />
          </div>

          <OverlayScrollContainer
            className="h-full"
            contentClassName="px-[48px] pb-16 pt-12 max-[820px]:px-6"
            contentRef={previewScrollRef}
          >
            <div className="mb-6 flex items-center gap-2 pr-16 text-[0.74rem] text-[color:var(--text-muted)]">
              <Warehouse className="icon h-4 w-4" />
              <span>/</span>
              <span>{selectedFile?.relative_path ?? "No file selected"}</span>
            </div>

            {selectedFile ? (
              <Suspense
                fallback={
                  <div className="px-4 py-[18px] text-[0.84rem] text-[color:var(--text-muted)]">
                    Rendering preview…
                  </div>
                }
              >
                <MarkdownPreview content={draftContent} />
              </Suspense>
            ) : (
              <div className="px-4 py-[18px] text-[0.84rem] text-[color:var(--text-muted)]">
                Open a markdown file to use zen mode.
              </div>
            )}
          </OverlayScrollContainer>
        </section>

        <aside className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] border-l border-[color:var(--outline)] bg-[color:var(--panel-bg-strong)] max-[820px]:hidden">
          <div className="flex items-center gap-2 px-[18px] pb-[14px] pt-7 text-[0.75rem] font-bold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
            <BookOpenText className="icon h-4 w-4" />
            <span>Table Of Contents</span>
          </div>
          {headings.length > 0 ? (
            <OverlayScrollContainer
              className="min-h-0"
              contentClassName="px-3 pb-6"
              options={{ overflow: { x: "hidden", y: "scroll" } }}
            >
              {headings.map((heading, index) => (
                <button
                  key={`${heading.id}-${index}`}
                  type="button"
                  className={
                    index === 0
                      ? "block w-full cursor-pointer border-l-2 border-[color:var(--indigo)] bg-transparent px-3 py-2 text-left text-[0.84rem] text-[color:var(--text)]"
                      : "block w-full cursor-pointer border-l-2 border-transparent bg-transparent px-3 py-2 text-left text-[0.84rem] text-[color:var(--text-muted)] transition-colors hover:text-[color:var(--text)]"
                  }
                  onClick={() => scrollToHeading(heading.id)}
                  style={{ paddingLeft: `${(heading.level - 1) * 18 + 12}px` }}
                >
                  {heading.label}
                </button>
              ))}
            </OverlayScrollContainer>
          ) : (
            <div className="px-4 py-[18px] text-[0.84rem] text-[color:var(--text-muted)]">
              Open a markdown file with headings to populate this outline.
            </div>
          )}
        </aside>
      </DialogContent>
    </Dialog>
  );
}
