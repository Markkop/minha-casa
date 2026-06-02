export type EditModalTabId = "basic" | "location" | "details" | "contact" | "dates";

export const EDIT_MODAL_TABS: { id: EditModalTabId; label: string }[] = [
  { id: "basic", label: "Básico" },
  { id: "location", label: "Localização" },
  { id: "details", label: "Detalhes" },
  { id: "contact", label: "Contato" },
  { id: "dates", label: "Datas" }
];
