import { Home, Building } from "@lucide/svelte";
import type { Imovel } from "$lib/anuncios/types";

export type ImageColumnView = "image" | "map";

export type ListingsTableColumn =
  | "image"
  | "property"
  | "status"
  | "price"
  | "area"
  | "value"
  | "rooms"
  | "bathrooms"
  | "dates";

export type ListingStatus =
  | "analisando"
  | "considerando"
  | "marcando_visita"
  | "visita_marcada"
  | "visitando"
  | "visitado"
  | "negociando"
  | "proposta_enviada"
  | "em_espera"
  | "descartando"
  | "descartado"
  | "vendido";

export const LISTING_STATUS_OPTIONS: { value: ListingStatus; label: string; className: string }[] = [
  { value: "analisando", label: "Analisando", className: "border-sky-500/30 bg-sky-500/10 text-sky-700" },
  { value: "considerando", label: "Considerando", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" },
  { value: "marcando_visita", label: "Marcando visita", className: "border-amber-500/30 bg-amber-500/10 text-amber-700" },
  { value: "visita_marcada", label: "Visita marcada", className: "border-purple-500/30 bg-purple-500/10 text-purple-700" },
  { value: "visitando", label: "Visitando", className: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700" },
  { value: "visitado", label: "Visitado", className: "border-yellow-500/30 bg-yellow-500/10 text-yellow-700" },
  { value: "negociando", label: "Negociando", className: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700" },
  { value: "proposta_enviada", label: "Proposta enviada", className: "border-green-500/30 bg-green-500/10 text-green-700" },
  { value: "em_espera", label: "Em espera", className: "border-slate-500/30 bg-slate-500/10 text-slate-700" },
  { value: "descartando", label: "Descartando", className: "border-orange-500/30 bg-orange-500/10 text-orange-700" },
  { value: "descartado", label: "Descartado", className: "border-destructive/30 bg-destructive/10 text-destructive" },
  { value: "vendido", label: "Vendido", className: "border-slate-500/30 bg-slate-500/10 text-slate-600" }
];

const LISTING_STATUS_VALUES = new Set<ListingStatus>(LISTING_STATUS_OPTIONS.map((option) => option.value));
const STRIKETHROUGH_STATUSES = new Set<ListingStatus>(["descartado", "vendido"]);

export function isStrikethroughStatus(status: ListingStatus): boolean {
  return STRIKETHROUGH_STATUSES.has(status);
}

export const LISTING_THUMB_SIZE_CLASS = "h-20 w-20 flex-shrink-0 aspect-square";
export type TipoImovelValue = "casa" | "apartamento" | null;

export const TIPO_IMOVEL_OPTIONS = [
  { value: null as TipoImovelValue, label: "Não definido", Icon: Home },
  { value: "casa" as const, label: "Casa", Icon: Home },
  { value: "apartamento" as const, label: "Apartamento", Icon: Building }
];

export function normalizeTipoImovel(value: Imovel["tipoImovel"]): TipoImovelValue {
  if (value === "casa" || value === "apartamento") return value;
  return null;
}

export function getTipoImovelOption(value: Imovel["tipoImovel"]) {
  const normalized = normalizeTipoImovel(value);
  return TIPO_IMOVEL_OPTIONS.find((option) => option.value === normalized) ?? TIPO_IMOVEL_OPTIONS[0];
}

export function getListingStatus(imovel: Pick<Imovel, "listingStatus" | "strikethrough" | "visited">): ListingStatus {
  if (imovel.listingStatus && LISTING_STATUS_VALUES.has(imovel.listingStatus as ListingStatus)) {
    return imovel.listingStatus as ListingStatus;
  }
  if (imovel.strikethrough) return "descartado";
  if (imovel.visited) return "visitado";
  return "analisando";
}

export function getListingStatusOption(status: ListingStatus) {
  return LISTING_STATUS_OPTIONS.find((option) => option.value === status) ?? LISTING_STATUS_OPTIONS[0];
}

export const STATUS_TRIGGER_WIDTH = "w-[128px]";
export const ROW_ACTIONS_WIDTH = "w-[148px]";
export const ROW_ACTION_BTN_CLASS = "flex-shrink-0 p-0.5 transition-colors";
export const ROW_ACTION_ICON_CLASS = "h-3.5 w-3.5";
export const LISTING_MOBILE_EDGE_INSET_CLASS = "p-1";
export const LISTING_MOBILE_ROW_GAP_CLASS = "gap-0.5";
export const LISTING_MOBILE_TOOLBAR_GAP_CLASS = "gap-0.5";
export const LISTING_MOBILE_ICON_BTN_CLASS =
  "flex h-6 w-6 shrink-0 items-center justify-center transition-colors";
export const LISTING_MOBILE_ICON_CLASS = "h-3.5 w-3.5 shrink-0 stroke-[1.5]";

/** Deep-link flash from ?listing= (inset ring stays visible on overflow-hidden mobile cards). */
export const LISTING_DEEP_LINK_HIGHLIGHT_CLASS = "ring-2 ring-inset ring-primary/60";

const LISTING_DEEP_LINK_HIGHLIGHT_CLASSES = LISTING_DEEP_LINK_HIGHLIGHT_CLASS.split(/\s+/);

export function applyListingDeepLinkHighlight(element: HTMLElement): () => void {
  if (element instanceof HTMLTableRowElement) {
    for (const cell of element.cells) {
      cell.classList.add(...LISTING_DEEP_LINK_HIGHLIGHT_CLASSES);
    }
    return () => {
      for (const cell of element.cells) {
        cell.classList.remove(...LISTING_DEEP_LINK_HIGHLIGHT_CLASSES);
      }
    };
  }

  element.classList.add(...LISTING_DEEP_LINK_HIGHLIGHT_CLASSES);
  return () => element.classList.remove(...LISTING_DEEP_LINK_HIGHLIGHT_CLASSES);
}

/** Native status chip: matches Radix select trigger spacing and chevron. */
export const LISTING_STATUS_SELECT_APPEARANCE_CLASS =
  "cursor-pointer appearance-none bg-[length:0.75rem] bg-[position:right_0.35rem_center] bg-no-repeat pr-6 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%235a6578%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]";

export const LISTINGS_TABLE_COLUMNS: { id: ListingsTableColumn; label: string }[] = [
  { id: "image", label: "Imagem" },
  { id: "property", label: "Imóvel" },
  { id: "price", label: "Preço" },
  { id: "area", label: "Área" },
  { id: "value", label: "Valor" },
  { id: "rooms", label: "Quartos" },
  { id: "bathrooms", label: "WC" },
  { id: "dates", label: "Datas" },
  { id: "status", label: "Estado" }
];

export const HIDDEN_BY_DEFAULT_COLUMNS = new Set<ListingsTableColumn>(["rooms", "bathrooms", "dates"]);

export const DEFAULT_VISIBLE_COLUMNS = LISTINGS_TABLE_COLUMNS.reduce(
  (acc, column) => {
    acc[column.id] = !HIDDEN_BY_DEFAULT_COLUMNS.has(column.id);
    return acc;
  },
  {} as Record<ListingsTableColumn, boolean>
);

export const COLUMN_STORAGE_KEY = "minha-casa:listings-table-visible-columns";
export const IMAGE_COLUMN_VIEW_KEY = "minha-casa:listings-table-image-column-view";

export function normalizeVisibleColumns(value: unknown): Record<ListingsTableColumn, boolean> {
  if (!value || typeof value !== "object") return { ...DEFAULT_VISIBLE_COLUMNS };
  const raw = value as Partial<Record<ListingsTableColumn, unknown>>;
  return LISTINGS_TABLE_COLUMNS.reduce(
    (acc, column) => {
      const storedValue = raw[column.id];
      acc[column.id] = typeof storedValue === "boolean" ? storedValue : DEFAULT_VISIBLE_COLUMNS[column.id];
      return acc;
    },
    {} as Record<ListingsTableColumn, boolean>
  );
}

export function getInitialVisibleColumns(): Record<ListingsTableColumn, boolean> {
  if (typeof window === "undefined") return { ...DEFAULT_VISIBLE_COLUMNS };
  try {
    return normalizeVisibleColumns(JSON.parse(window.localStorage.getItem(COLUMN_STORAGE_KEY) || "null"));
  } catch {
    return { ...DEFAULT_VISIBLE_COLUMNS };
  }
}

export function getInitialImageColumnView(): ImageColumnView {
  if (typeof window === "undefined") return "image";
  try {
    const stored = window.localStorage.getItem(IMAGE_COLUMN_VIEW_KEY);
    return stored === "map" ? "map" : "image";
  } catch {
    return "image";
  }
}
