import type { Imovel } from "$lib/anuncios/types"
import { formatCompactPrice } from "$lib/anuncios/map-shared"
import { markerColors } from "$lib/theme/colors"

export function buildGoogleMarkerContent(
  listing: Imovel,
  color: string,
  borderColor: string,
  customLoc: boolean
): HTMLElement {
  const priceLabel = formatCompactPrice(listing.preco)
  const root = document.createElement("div")
  root.className = "flex flex-col items-center"

  if (listing.starred) {
    root.style.filter = "drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
    const starWrap = document.createElement("div")
    starWrap.className = "w-7 h-7 flex items-center justify-center relative"
    starWrap.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
          fill="${markerColors.favoriteFill}" stroke="${markerColors.favoriteStroke}" stroke-width="1.5" stroke-linejoin="round"/>
      </svg>
    `
    if (customLoc) {
      const dot = document.createElement("div")
      dot.className =
        "absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-app-accent border-2 border-app-surface rounded-full"
      dot.style.boxShadow = "0 1px 2px rgba(0,0,0,0.3)"
      starWrap.appendChild(dot)
    }
    root.appendChild(starWrap)
  } else {
    const borderWidth = customLoc ? "3px" : "2px"
    const circleWrap = document.createElement("div")
    circleWrap.className = "w-5 h-5 rounded-full relative"
    circleWrap.style.backgroundColor = color
    circleWrap.style.border = `${borderWidth} solid ${borderColor}`
    circleWrap.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)"
    if (customLoc) {
      const dot = document.createElement("div")
      dot.className =
        "absolute -top-1 -right-1 w-2 h-2 bg-app-accent border-2 border-app-surface rounded-full"
      dot.style.boxShadow = "0 1px 2px rgba(0,0,0,0.3)"
      circleWrap.appendChild(dot)
    }
    root.appendChild(circleWrap)
  }

  if (priceLabel) {
    const label = document.createElement("div")
    label.className =
      "mt-0.5 px-1.5 py-0.5 bg-app-fg/75 text-app-surface text-xs font-bold rounded whitespace-nowrap"
    label.style.lineHeight = "1"
    label.textContent = priceLabel
    root.appendChild(label)
  }

  return root
}

export function buildGoogleMiniMarkerContent(
  listing: Imovel,
  color: string,
  customLoc: boolean,
  compact: boolean
): HTMLElement {
  const size = compact ? 14 : 22
  const borderColor = customLoc ? markerColors.customLocation : markerColors.markerBorder
  const borderWidth = customLoc ? 2 : 1.5
  const root = document.createElement("div")

  if (listing.starred) {
    root.className = "flex items-center justify-center"
    root.style.filter = "drop-shadow(0 1px 2px rgba(0,0,0,0.4))"
    root.innerHTML = `
      <svg width="${size + 4}" height="${size + 4}" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
          fill="${markerColors.favoriteFill}" stroke="${markerColors.favoriteStroke}" stroke-width="1.5"/>
      </svg>
    `
    return root
  }

  root.className = "rounded-full"
  root.style.width = `${size}px`
  root.style.height = `${size}px`
  root.style.backgroundColor = color
  root.style.border = `${borderWidth}px solid ${borderColor}`
  root.style.boxShadow = "0 1px 3px rgba(0,0,0,0.35)"
  return root
}
