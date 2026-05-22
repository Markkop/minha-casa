"use client"

import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { type ButtonHTMLAttributes, type ReactNode } from "react"

import { cn } from "@/lib/utils"

const pageToolbarButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-app-action text-app-action-foreground hover:bg-app-action-hover",
        secondary:
          "border border-app-border bg-app-surface text-app-fg hover:border-app-border-strong hover:bg-app-bg",
        destructive:
          "border border-app-border bg-app-surface text-app-fg hover:border-destructive hover:text-destructive",
        ghost: "text-app-muted hover:bg-app-bg hover:text-app-fg",
        active:
          "border border-app-action bg-app-action text-app-action-foreground",
      },
      size: {
        default: "h-7 px-2.5",
        icon: "h-7 w-7 p-0",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "default",
    },
  }
)

export function PageToolbar({
  children,
  className,
  maxWidthClassName = "max-w-7xl",
}: {
  children: ReactNode
  className?: string
  maxWidthClassName?: string
}) {
  return (
    <header
      className={cn(
        "border-b border-app-border bg-app-surface",
        className
      )}
    >
      <div
        className={cn(
          "mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-4 py-1.5",
          maxWidthClassName
        )}
      >
        {children}
      </div>
    </header>
  )
}

export function PageToolbarStart({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-wrap items-center gap-2",
        className
      )}
    >
      {children}
    </div>
  )
}

export function PageToolbarEnd({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-wrap items-center justify-end gap-1.5",
        className
      )}
    >
      {children}
    </div>
  )
}

export interface PageToolbarButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof pageToolbarButtonVariants> {
  asChild?: boolean
}

export function PageToolbarButton({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: PageToolbarButtonProps) {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(pageToolbarButtonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export function PageToolbarIconButton({
  className,
  variant = "secondary",
  ...props
}: Omit<PageToolbarButtonProps, "size">) {
  return (
    <PageToolbarButton
      size="icon"
      variant={variant}
      className={className}
      {...props}
    />
  )
}
