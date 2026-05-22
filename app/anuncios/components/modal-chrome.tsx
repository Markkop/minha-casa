"use client"

import type { LucideIcon } from "lucide-react"
import { Loader2, X } from "lucide-react"
import { CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function ModalCloseButton({
  onClick,
  className,
}: {
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-muted-foreground hover:text-app-fg transition-colors",
        className
      )}
      aria-label="Fechar"
    >
      <X className="h-5 w-5" />
    </button>
  )
}

export function ModalHeaderTitle({
  icon: Icon,
  title,
}: {
  icon: LucideIcon
  title: string
}) {
  return (
    <CardTitle className="text-lg flex items-center gap-2">
      <Icon className="h-5 w-5 text-app-accent shrink-0" />
      <span>{title}</span>
    </CardTitle>
  )
}

export function LoadingLabel({ label }: { label: string }) {
  return (
    <>
      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      <span>{label}</span>
    </>
  )
}
