import type { Imovel } from "$lib/anuncios/types";

export type EditModalFieldHandlers = {
  onInputChange: (field: keyof Imovel, value: string | number | boolean | null) => void;
  onNumberInputChange: (field: keyof Imovel, value: string) => void;
  onBooleanChange: (field: keyof Imovel, value: string) => void;
};

export type EditModalFieldProps = EditModalFieldHandlers & {
  formData: Partial<Imovel>;
};

export type UniqueContact = { name: string | null; number: string };
