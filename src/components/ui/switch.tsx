import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "../../lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 appearance-none items-center rounded-full border border-[color:var(--outline)] bg-[color:var(--surface-high)] p-0.5 shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--indigo-soft)]/35 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-[color:var(--indigo)] data-[state=checked]:bg-[color:var(--indigo)]",
      className
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-[color:var(--surface-lowest)] shadow-sm transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
      )}
    />
  </SwitchPrimitive.Root>
));

Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
