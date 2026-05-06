import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";
import { cn } from "../../lib/utils";

type CheckboxProps = React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>;

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-4 w-4 shrink-0 appearance-none items-center justify-center rounded-[4px] border border-[var(--outline)] bg-[var(--surface-low)] p-0 align-middle leading-none text-[color:var(--text-muted)] shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--indigo-soft)]/35 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-[color:var(--indigo)] data-[state=checked]:bg-[color:var(--indigo)] data-[state=checked]:text-white",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="inline-flex items-center justify-center text-white">
      <CheckIcon className="h-3.5 w-3.5" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));

Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
