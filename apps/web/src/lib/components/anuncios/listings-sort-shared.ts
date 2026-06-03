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

export function getListingsSortOptions(useCasaAreaLabels: boolean): { key: ListingsSortKey; label: string }[] {
  return [
    { key: "titulo", label: "Título" },
    { key: "preco", label: "Preço" },
    {
      key: "m2Totais",
      label: useCasaAreaLabels ? "Área terreno" : "Área total"
    },
    {
      key: "m2Privado",
      label: useCasaAreaLabels ? "Área construída" : "Área privada"
    },
    {
      key: "precoM2",
      label: useCasaAreaLabels ? "Preço/m² (terreno)" : "Preço/m² (total)"
    },
    {
      key: "precoM2Privado",
      label: useCasaAreaLabels ? "Preço/m² (construído)" : "Preço/m² (privado)"
    },
    { key: "quartos", label: "Quartos" },
    { key: "addedAt", label: "Data adicionado" }
  ];
}
