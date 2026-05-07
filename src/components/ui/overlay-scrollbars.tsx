import * as React from "react";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import type { EventListeners, PartialOptions } from "overlayscrollbars";
import type { OverlayScrollbarsComponentRef } from "overlayscrollbars-react";
import { cn } from "../../lib/utils";

type OverlayScrollContainerProps = React.ComponentPropsWithoutRef<"div"> & {
  contentClassName?: string;
  contentProps?: React.ComponentPropsWithoutRef<"div">;
  contentRef?: React.Ref<HTMLDivElement>;
  options?: PartialOptions;
  events?: EventListeners;
};

const DEFAULT_OPTIONS: PartialOptions = {
  scrollbars: {
    autoHide: "scroll",
    autoHideDelay: 800,
    autoHideSuspend: true,
    theme: "liburu-scrollbars",
    visibility: "auto",
    clickScroll: false,
    pointers: ["mouse", "touch", "pen"]
  },
  overflow: {
    x: "hidden",
    y: "scroll"
  }
};

export const OverlayScrollContainer = React.forwardRef<
  OverlayScrollbarsComponentRef<"div">,
  OverlayScrollContainerProps
>(({ className, children, contentClassName, contentProps, contentRef, options, events, ...props }, ref) => (
  <OverlayScrollbarsComponent
    ref={ref}
    defer
    options={{
      ...DEFAULT_OPTIONS,
      ...options,
      scrollbars: {
        ...DEFAULT_OPTIONS.scrollbars,
        ...options?.scrollbars
      },
      overflow: {
        ...DEFAULT_OPTIONS.overflow,
        ...options?.overflow
      }
    }}
    events={events}
    className={cn("min-h-0 min-w-0", className)}
    {...props}
  >
    <div ref={contentRef} className={cn("min-h-full min-w-0", contentClassName)} {...contentProps}>
      {children}
    </div>
  </OverlayScrollbarsComponent>
));

OverlayScrollContainer.displayName = "OverlayScrollContainer";
