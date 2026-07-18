import type { Property } from "$lib/listings/types";

export type EditModalFieldHandlers = {
  onInputChange: (field: keyof Property, value: string | number | boolean | null) => void;
  onNumberInputChange: (field: keyof Property, value: string) => void;
  onBooleanChange: (field: keyof Property, value: string) => void;
};

export type EditModalFieldProps = EditModalFieldHandlers & {
  formData: Partial<Property>;
};

export type UniqueContact = { name: string | null; number: string };
