export type ListingsSortKey =
  | "title"
  | "totalAreaM2"
  | "privateAreaM2"
  | "bedrooms"
  | "price"
  | "pricePerM2"
  | "precoM2Privado"
  | "addedAt";

export type ListingsSortDirection = "asc" | "desc";

export interface ListingsSortState {
  key: ListingsSortKey;
  direction: ListingsSortDirection;
}

export function getListingsSortOptions(useCasaAreaLabels: boolean): { key: ListingsSortKey; label: string }[] {
  return [
    { key: "title", label: "Título" },
    { key: "price", label: "Preço" },
    {
      key: "totalAreaM2",
      label: useCasaAreaLabels ? "Área terreno" : "Área total"
    },
    {
      key: "privateAreaM2",
      label: useCasaAreaLabels ? "Área construída" : "Área privada"
    },
    {
      key: "pricePerM2",
      label: useCasaAreaLabels ? "Preço/m² (terreno)" : "Preço/m² (total)"
    },
    {
      key: "precoM2Privado",
      label: useCasaAreaLabels ? "Preço/m² (construído)" : "Preço/m² (privado)"
    },
    { key: "bedrooms", label: "Quartos" },
    { key: "addedAt", label: "Data adicionado" }
  ];
}
