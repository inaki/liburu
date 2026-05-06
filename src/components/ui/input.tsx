import * as React from "react";
import { cn } from "../../lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-11 w-full rounded-[10px] border border-[color:var(--outline)] bg-[color:var(--surface-low)] px-4 py-2 text-sm text-[color:var(--text)] outline-none transition-[border-color,box-shadow,background-color] placeholder:text-[color:var(--text-dim)] focus-visible:border-[color:var(--outline-strong)] focus-visible:ring-4 focus-visible:ring-[color:var(--indigo-soft)]/20 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);

Input.displayName = "Input";

export { Input };
