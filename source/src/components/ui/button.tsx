import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[opacity,transform,background-color,color] duration-150 ease-out active:not-disabled:scale-[0.96] disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
  {
    variants: {
      variant: {
        solid:
          "bg-accent text-accent-fg hover:opacity-90",
        ghost:
          "bg-transparent text-fg border border-border hover:bg-surface-2",
        muted: "bg-surface-2 text-fg hover:bg-surface",
      },
      size: {
        lg: "h-12 px-6 text-sm rounded-md",
        md: "h-11 px-5 text-sm rounded-sm",
        sm: "h-9 px-3 text-xs rounded-sm",
        icon: "size-11 rounded-sm",
      },
    },
    defaultVariants: { variant: "solid", size: "lg" },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
