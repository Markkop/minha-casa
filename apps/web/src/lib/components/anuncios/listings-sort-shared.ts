export type ListingsSortKey =
  | "titulo"
  | "m2Totais"
  | "m2Privado"
  | "quartos"
  | "preco"
  | "precoM2"
  | "precoM2Privado"
  | "addedAt";

export type ListingsSortDirection = "asc" | "desc";

export interface ListingsSortState {
  key: ListingsSortKey;
  direction: ListingsSortDirection;
}

export const LISTINGS_SORT_OPTIONS: { key: ListingsSortKey; label: string }[] = [
  { key: "titulo", label: "Título" },
  { key: "preco", label: "Preço" },
  { key: "m2Totais", label: "Área total" },
  { key: "m2Privado", label: "Área privada" },
  { key: "precoM2", label: "Preço/m² (total)" },
  { key: "precoM2Privado", label: "Preço/m² (privado)" },
  { key: "quartos", label: "Quartos" },
  { key: "addedAt", label: "Data adicionado" }
];
