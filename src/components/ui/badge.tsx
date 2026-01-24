import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center border px-2 py-0.5 text-xs font-medium font-mono rounded-md w-fit whitespace-nowrap shrink-0 transition-colors backdrop-blur-sm",
  {
    variants: {
      variant: {
        default: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
        secondary: "bg-zinc-800/50 text-zinc-400 border-zinc-700/50",
        destructive: "bg-red-500/10 text-red-400 border-red-500/30",
        outline: "border-zinc-700 text-zinc-400 bg-transparent",
        ghost: "border-transparent text-zinc-500 bg-transparent",
        // Game state badges
        split: "bg-green-500/10 text-green-400 border-green-500/30",
        steal: "bg-red-500/10 text-red-400 border-red-500/30",
        negotiate: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        evolve: "bg-purple-500/10 text-purple-400 border-purple-500/30",
        // Agent badges with glass morphism
        diplomat: "bg-green-500/10 border-green-500/30 text-green-400",
        shark: "bg-rose-500/10 border-rose-500/30 text-rose-400",
        saint: "bg-amber-500/10 border-amber-500/30 text-amber-400",
        grudger: "bg-violet-500/10 border-violet-500/30 text-violet-400",
        analyst: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400",
        charmer: "bg-pink-500/10 border-pink-500/30 text-pink-400",
        paranoid: "bg-slate-500/10 border-slate-500/30 text-slate-400",
        healer: "bg-sky-500/10 border-sky-500/30 text-sky-400",
        wildcard: "bg-orange-500/10 border-orange-500/30 text-orange-400",
        mirror: "bg-lime-500/10 border-lime-500/30 text-lime-400",
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
