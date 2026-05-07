import * as React from "react";
import { GripVertical } from "lucide-react";
import { Group, type GroupProps, Panel, type PanelProps, Separator, type SeparatorProps } from "react-resizable-panels";
import { cn } from "../../lib/utils";

const ResizablePanelGroup = React.forwardRef<
  React.ElementRef<typeof Group>,
  GroupProps
>(({ className, ...props }, ref) => (
  <Group
    elementRef={ref}
    className={cn("flex h-full w-full data-[orientation=vertical]:flex-col", className)}
    {...props}
  />
));

ResizablePanelGroup.displayName = "ResizablePanelGroup";

const ResizablePanel = (props: PanelProps) => <Panel {...props} />;

const ResizableHandle = React.forwardRef<
  React.ElementRef<typeof Separator>,
  SeparatorProps & { withHandle?: boolean }
>(({ className, withHandle, ...props }, ref) => (
  <Separator
    elementRef={ref}
    className={cn(
      "group relative flex shrink-0 basis-0 items-center justify-center bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--indigo-soft)]/35 data-[orientation=vertical]:h-2 data-[orientation=vertical]:w-full data-[orientation=horizontal]:h-full data-[orientation=horizontal]:w-2",
      className
    )}
    {...props}
  >
    {withHandle ? (
      <div className="z-10 flex h-10 w-[3px] items-center justify-center rounded-full bg-[color:var(--outline)] text-[color:var(--text-muted)] transition-colors group-hover:bg-[color:var(--outline-strong)] group-hover:text-[color:var(--text)] data-[orientation=vertical]:h-[3px] data-[orientation=vertical]:w-10">
        <GripVertical className="absolute h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100 data-[orientation=vertical]:rotate-90" />
      </div>
    ) : null}
  </Separator>
));

ResizableHandle.displayName = "ResizableHandle";

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
