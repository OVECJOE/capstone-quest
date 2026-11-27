import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl border-3 border-ink font-display font-semibold whitespace-nowrap text-ink transition-all outline-none focus-visible:outline-4 focus-visible:outline-offset-3 focus-visible:outline-ink disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-green shadow-[0_6px_0_var(--color-ink)] hover:bg-lime active:translate-y-1 active:shadow-[0_2px_0_var(--color-ink)]",
        outline: "bg-cream shadow-[0_4px_0_var(--color-ink)] hover:bg-lime active:translate-y-0.5 active:shadow-[0_2px_0_var(--color-ink)]",
        ghost: "border-transparent hover:bg-lime",
        dark: "bg-ink text-cream hover:bg-deep",
        link: "border-transparent underline underline-offset-4 hover:text-deep",
      },
      size: {
        default: "min-h-12 px-5 py-2 text-lg",
        sm: "min-h-11 rounded-xl px-4 py-1.5 text-base",
        lg: "min-h-15 rounded-[18px] px-8 py-2 text-[22px]",
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
  const Comp = asChild ? Slot.Root : "button"

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
