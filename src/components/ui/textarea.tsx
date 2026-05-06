import * as React from "react";
import { cn } from "../../lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[120px] w-full rounded-[10px] border border-[color:var(--outline)] bg-[color:var(--surface-low)] px-4 py-3 text-sm text-[color:var(--text)] outline-none transition-[border-color,box-shadow,background-color] placeholder:text-[color:var(--text-dim)] focus-visible:border-[color:var(--outline-strong)] focus-visible:ring-4 focus-visible:ring-[color:var(--indigo-soft)]/20 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";

export { Textarea };
