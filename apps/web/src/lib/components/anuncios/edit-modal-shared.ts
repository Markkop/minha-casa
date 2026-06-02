import type { Imovel } from "$lib/anuncios/types";

export const EDIT_MODAL_INPUT_CLASS =
  "h-9 min-h-0 bg-app-surface-muted border-app-border py-1 text-app-fg shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

export const EDIT_MODAL_SELECT_CLASS =
  "h-9 w-full appearance-none rounded-md border border-app-border bg-app-surface-muted bg-[length:1rem] bg-[position:right_0.5rem_center] bg-no-repeat px-3 py-1 pr-8 text-sm text-app-fg shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]";

export function boolSelectValue(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return "null";
  return value ? "true" : "false";
}

export function applyInputChange(
  formData: Partial<Imovel>,
  field: keyof Imovel,
  value: string | number | boolean | null
): Partial<Imovel> {
  return { ...formData, [field]: value === "" ? null : value };
}

export function applyNumberInputChange(
  formData: Partial<Imovel>,
  field: keyof Imovel,
  value: string
): Partial<Imovel> {
  if (value === "") return applyInputChange(formData, field, null);
  const numValue = parseFloat(value);
  if (!Number.isNaN(numValue)) return applyInputChange(formData, field, numValue);
  return formData;
}
