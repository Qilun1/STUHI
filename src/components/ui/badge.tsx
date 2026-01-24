import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center border-2 px-2 py-0.5 text-xs font-bold font-mono uppercase tracking-wider w-fit whitespace-nowrap shrink-0 transition-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border-primary",
        secondary: "bg-secondary text-secondary-foreground border-border",
        destructive: "bg-destructive text-white border-destructive",
        outline: "border-border text-foreground bg-transparent",
        ghost: "border-transparent text-muted-foreground",
        // Game state badges
        split: "bg-split text-void border-split",
        steal: "bg-steal text-white border-steal",
        negotiate: "bg-negotiate text-void border-negotiate",
        evolve: "bg-evolve text-white border-evolve",
        // Agent badges - each agent gets their color
        diplomat: "bg-transparent border-[#4ade80] text-[#4ade80]",
        shark: "bg-transparent border-[#f43f5e] text-[#f43f5e]",
        saint: "bg-transparent border-[#fbbf24] text-[#fbbf24]",
        grudger: "bg-transparent border-[#8b5cf6] text-[#8b5cf6]",
        analyst: "bg-transparent border-[#06b6d4] text-[#06b6d4]",
        charmer: "bg-transparent border-[#ec4899] text-[#ec4899]",
        paranoid: "bg-transparent border-[#64748b] text-[#64748b]",
        healer: "bg-transparent border-[#22d3ee] text-[#22d3ee]",
        wildcard: "bg-transparent border-[#f97316] text-[#f97316]",
        mirror: "bg-transparent border-[#a3e635] text-[#a3e635]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
