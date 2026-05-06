import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-semibold transition-[transform,box-shadow,background-color,color,border-color] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--indigo-soft)]/35 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[color:var(--indigo)] text-white hover:-translate-y-px hover:shadow-[0_10px_24px_color-mix(in_srgb,var(--indigo)_26%,transparent)]",
        secondary:
          "bg-[color:var(--surface-low)] text-[color:var(--text)] hover:bg-[color:var(--surface-lowest)]",
        outline:
          "border border-[color:var(--outline)] bg-[color:var(--surface-lowest)] text-[color:var(--text)] hover:border-[color:var(--outline-strong)] hover:bg-[color:var(--surface-low)]",
        ghost:
          "bg-transparent text-[color:var(--text-muted)] hover:bg-[color:var(--surface-low)] hover:text-[color:var(--text)]"
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-[8px] px-3",
        icon: "h-10 w-10 rounded-[10px]"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);

Button.displayName = "Button";

export { Button, buttonVariants };
