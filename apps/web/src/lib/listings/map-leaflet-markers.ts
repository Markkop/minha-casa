import type { DivIcon } from "leaflet"
import { formatCompactPrice } from "$lib/listings/map-shared"
import { markerColors } from "$lib/theme/colors"

export const LEAFLET_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
export const LEAFLET_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

/**
 * Create custom marker icon with color or star for starred listings (Leaflet DivIcon).
 */
export function createLeafletMarkerIcon(
  L: typeof import("leaflet"),
  color: string,
  price: number | null,
  starred?: boolean,
  hasCustomLoc?: boolean,
  borderColor?: string
): DivIcon {
  const priceLabel = formatCompactPrice(price)

  if (starred) {
    return L.divIcon({
      className: "custom-marker-starred",
      html: `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
        ">
          <div style="
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
          ">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                    fill="${markerColors.favoriteFill}"
                    stroke="${markerColors.favoriteStroke}"
                    stroke-width="1.5"
                    stroke-linejoin="round"/>
            </svg>
            ${
              hasCustomLoc
                ? `
              <div style="
                position: absolute;
                top: -2px;
                right: -2px;
                width: 10px;
                height: 10px;
                background-color: ${markerColors.customLocation};
                border: 2px solid ${markerColors.markerBorder};
                border-radius: 50%;
                box-shadow: 0 1px 2px rgba(0,0,0,0.3);
              "></div>
            `
                : ""
            }
          </div>
          ${
            priceLabel
              ? `
            <div style="
              margin-top: 2px;
              padding: 3px 6px;
              background-color: ${markerColors.labelBg};
              color: ${markerColors.labelFg};
              font-size: 13px;
              font-weight: bold;
              border-radius: 3px;
              white-space: nowrap;
              line-height: 1;
            ">${priceLabel}</div>
          `
              : ""
          }
        </div>
      `,
      iconSize: priceLabel ? [28, 44] : [28, 28],
      iconAnchor: [14, priceLabel ? 44 : 14],
      popupAnchor: [0, priceLabel ? -44 : -14]
    })
  }

  const circleBorderColor =
    borderColor ?? (hasCustomLoc ? markerColors.customLocation : markerColors.markerBorder)
  const borderWidth = hasCustomLoc ? "3px" : "2px"

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
      ">
        <div style="
          width: 20px;
          height: 20px;
          background-color: ${color};
          border: ${borderWidth} solid ${circleBorderColor};
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          position: relative;
        ">
          ${
            hasCustomLoc
              ? `
            <div style="
              position: absolute;
              top: -4px;
              right: -4px;
              width: 8px;
              height: 8px;
              background-color: ${markerColors.customLocation};
              border: 2px solid ${markerColors.markerBorder};
              border-radius: 50%;
              box-shadow: 0 1px 2px rgba(0,0,0,0.3);
            "></div>
          `
              : ""
          }
        </div>
        ${
          priceLabel
            ? `
          <div style="
            margin-top: 2px;
            padding: 3px 6px;
            background-color: ${markerColors.labelBg};
            color: ${markerColors.labelFg};
            font-size: 13px;
            font-weight: bold;
            border-radius: 3px;
            white-space: nowrap;
            line-height: 1;
          ">${priceLabel}</div>
        `
            : ""
        }
      </div>
    `,
    iconSize: priceLabel ? [20, 36] : [20, 20],
    iconAnchor: [10, priceLabel ? 36 : 10],
    popupAnchor: [0, priceLabel ? -36 : -10]
  })
}

export function createLeafletMiniMarkerIcon(
  L: typeof import("leaflet"),
  color: string,
  starred?: boolean,
  hasCustomLoc?: boolean,
  compact?: boolean
): DivIcon {
  const size = compact ? 14 : 20
  const borderColor = hasCustomLoc ? markerColors.customLocation : markerColors.markerBorder
  const borderWidth = hasCustomLoc ? "2px" : "1.5px"

  if (starred) {
    const svgSize = compact ? 16 : 22
    return L.divIcon({
      className: "custom-marker-mini-starred",
      html: `
        <div style="display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4));">
          <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
              fill="${markerColors.favoriteFill}" stroke="${markerColors.favoriteStroke}" stroke-width="1.5"/>
          </svg>
        </div>
      `,
      iconSize: [svgSize, svgSize],
      iconAnchor: [svgSize / 2, svgSize / 2]
    })
  }

  return L.divIcon({
    className: "custom-marker-mini",
    html: `
      <div style="
        width:${size}px;height:${size}px;
        background-color:${color};
        border:${borderWidth} solid ${borderColor};
        border-radius:50%;
        box-shadow:0 1px 3px rgba(0,0,0,0.35);
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  })
}
