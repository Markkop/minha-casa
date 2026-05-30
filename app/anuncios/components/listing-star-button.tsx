"use client"

import { Star } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  LISTING_MOBILE_ICON_BTN_CLASS,
  LISTING_MOBILE_ICON_CLASS,
} from "@/app/anuncios/components/listings-table-shared"

export function ListingStarButton({
  starred,
  onToggle,
  variant = "default",
}: {
  starred?: boolean
  onToggle: () => void
  variant?: "default" | "on-media"
}) {
  const isStarred = starred ?? false

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          data-testid="listing-star-button"
          onClick={() => void onToggle()}
          className={cn(
            variant === "on-media" ? LISTING_MOBILE_ICON_BTN_CLASS : "flex-shrink-0 p-1",
            "transition-colors",
            variant === "on-media"
              ? isStarred
                ? "text-yellow hover:text-yellow/80"
                : "text-white/85 hover:text-yellow"
              : isStarred
                ? "text-yellow hover:text-yellow/80"
                : "text-muted-foreground hover:text-yellow"
          )}
        >
          <Star
            className={cn(
              variant === "on-media" ? LISTING_MOBILE_ICON_CLASS : "h-4 w-4",
              isStarred && variant === "on-media" && "fill-current"
            )}
            fill={isStarred ? "currentColor" : "none"}
            strokeWidth={variant === "on-media" ? 1.5 : undefined}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        sideOffset={4}
        className="border border-app-border bg-app-surface text-app-fg"
      >
        {isStarred ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      </TooltipContent>
    </Tooltip>
  )
}
