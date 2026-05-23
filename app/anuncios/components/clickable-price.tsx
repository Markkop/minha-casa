"use client"

import { useRouter } from "next/navigation"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// ============================================================================
// Types
// ============================================================================

export interface ClickablePriceProps {
  /** The price value in cents/units */
  price: number | null
  /** Whether the item is marked as strikethrough */
  strikethrough?: boolean
  /** Custom class name for the container */
  className?: string
}

// ============================================================================
// Helper Functions
// ============================================================================

const formatCurrency = (value: number | null): string => {
  if (value === null) return "—"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value)
}

// ============================================================================
// ClickablePrice Component
// ============================================================================

/**
 * ClickablePrice
 *
 * Displays the property total price. When price is set, click navigates to the
 * financing simulator with the value pre-filled.
 */
export function ClickablePrice({
  price,
  strikethrough = false,
  className,
}: ClickablePriceProps) {
  const router = useRouter()
  const isClickable = price !== null

  const handleClick = () => {
    if (isClickable) {
      router.push(`/financiamento?price=${price}`)
    }
  }

  const formattedPrice = formatCurrency(price)

  if (!isClickable) {
    return (
      <span
        className={cn(
          "font-mono text-sm",
          strikethrough && "line-through opacity-50",
          className
        )}
        data-testid="price-display"
      >
        {formattedPrice}
      </span>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          onClick={handleClick}
          className={cn(
            "font-mono text-sm text-app-accent cursor-pointer hover:text-app-accent/80 transition-colors",
            strikethrough && "line-through opacity-50",
            className
          )}
          data-testid="clickable-price"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              handleClick()
            }
          }}
        >
          {formattedPrice}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        sideOffset={4}
        className="bg-app-surface border border-app-border text-app-fg"
      >
        Simular financiamento
      </TooltipContent>
    </Tooltip>
  )
}
