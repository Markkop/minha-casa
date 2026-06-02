import type { WorkspaceTableColumn } from "$lib/workspace/workspace-table";

export type CondominiumAddDraft = {
  name: string;
  city: string;
  neighborhood: string;
  address: string;
  propertyType: "" | "casa" | "apartamento";
  amenities: string;
  notes: string;
};

export const emptyAdd: CondominiumAddDraft = {
  name: "",
  city: "",
  neighborhood: "",
  address: "",
  propertyType: "" as "" | "casa" | "apartamento",
  amenities: "",
  notes: ""
};

export const condominiumColumns: WorkspaceTableColumn[] = [
  { id: "name", header: "Nome", width: "16%" },
  { id: "city", header: "Cidade", width: "11%" },
  { id: "neighborhood", header: "Bairro", width: "11%" },
  { id: "address", header: "Endereço", width: "14%" },
  { id: "propertyType", header: "Tipo", width: "9%" },
  { id: "amenities", header: "Comodidades", width: "18%" },
  { id: "notes", header: "Notas", width: "14%" },
  { id: "source", header: "Origem", width: "80px" }
];

export const condominiumSelectClass =
  "h-8 w-full min-w-0 rounded-md border border-app-border bg-white px-2 text-sm text-app-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent disabled:opacity-60 dark:bg-white";

export function amenitiesToString(amenities: string[]) {
  return amenities.join(", ");
}

export function parseAmenities(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
