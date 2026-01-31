"use client"

import { useRouter } from "next/navigation"
import { useAddons } from "@/lib/use-addons"
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
 * A price display component that becomes clickable when the user has access
 * to the "financiamento" addon. When clicked, navigates to the financing
 * calculator with the price pre-filled.
 *
 * @example
 * ```tsx
 * <ClickablePrice price={500000} />
 * ```
 */
export function ClickablePrice({
  price,
  strikethrough = false,
  className,
}: ClickablePriceProps) {
  const router = useRouter()
  const { hasAddon } = useAddons()

  const hasFinanciamentoAddon = hasAddon("financiamento")
  const isClickable = hasFinanciamentoAddon && price !== null

  const handleClick = () => {
    if (isClickable) {
      router.push(`/casa?price=${price}`)
    }
  }

  const formattedPrice = formatCurrency(price)

  // When addon is not available, show simple price without click behavior
  if (!hasFinanciamentoAddon) {
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

  // When addon is available, show clickable price with tooltip
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          onClick={handleClick}
          className={cn(
            "font-mono text-sm text-primary cursor-pointer hover:text-primary/80 transition-colors",
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
        className="bg-raisinBlack border border-brightGrey text-white"
      >
        Simular financiamento
      </TooltipContent>
    </Tooltip>
  )
}
