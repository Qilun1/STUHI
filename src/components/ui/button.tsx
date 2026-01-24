import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium uppercase tracking-wider border-2 transition-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0.5",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border-primary hover:bg-primary-foreground hover:text-primary",
        destructive: "bg-destructive text-white border-destructive hover:bg-white hover:text-destructive",
        outline: "border-border bg-transparent text-foreground hover:bg-foreground hover:text-background",
        secondary: "bg-secondary text-secondary-foreground border-border hover:bg-foreground hover:text-background",
        ghost: "border-transparent hover:bg-muted hover:border-border",
        link: "text-primary underline-offset-4 hover:underline border-transparent",
        split: "bg-split text-void border-split hover:bg-void hover:text-split",
        steal: "bg-steal text-white border-steal hover:bg-white hover:text-steal",
      },
      size: {
        default: "h-9 px-4 py-2",
        xs: "h-6 gap-1 px-2 text-xs",
        sm: "h-8 gap-1.5 px-3",
        lg: "h-10 px-6",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
