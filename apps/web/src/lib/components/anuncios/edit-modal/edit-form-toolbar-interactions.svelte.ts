import type { Imovel } from "$lib/anuncios/types";
import {
  applyPreferencePatch,
  getPreferenceValue,
  togglePreferenceValue,
  type ListingPreferenceOption
} from "$lib/anuncios/listing-preferences";
import {
  clampListingCount,
  type ListingCountField
} from "$lib/anuncios/listing-count-field";
import type { TipoImovelValue } from "$lib/components/anuncios/listings-table-shared";

export function createEditFormToolbarInteractions(options: {
  getDraft: () => Partial<Imovel>;
  patchDraft: (updates: Partial<Imovel>) => void;
  getPreferenceCatalog: () => ListingPreferenceOption[];
}) {
  let tipoImovelPopoverOpen = $state(false);

  function setNumericField(field: ListingCountField, nextValue: number) {
    const draft = options.getDraft();
    const current = (draft[field] as number | null | undefined) ?? 0;
    const clamped = clampListingCount(field, nextValue);
    if (clamped === current) return;
    options.patchDraft({ [field]: clamped } as Partial<Imovel>);
  }

  return {
    get tipoImovelPopoverOpen() {
      return tipoImovelPopoverOpen;
    },
    set tipoImovelPopoverOpen(value: boolean) {
      tipoImovelPopoverOpen = value;
    },
    async handleSetTipoImovel(tipo: TipoImovelValue) {
      options.patchDraft({ tipoImovel: tipo });
      tipoImovelPopoverOpen = false;
    },
    async handleTogglePreference(key: string) {
      const catalog = options.getPreferenceCatalog();
      const draft = options.getDraft();
      const current = getPreferenceValue(draft, key, catalog);
      const next = togglePreferenceValue(current);
      options.patchDraft(applyPreferencePatch(draft, key, next, catalog));
    },
    async handleSetCount(field: ListingCountField, nextValue: number) {
      setNumericField(field, nextValue);
    }
  };
}

export type EditFormToolbarInteractions = ReturnType<typeof createEditFormToolbarInteractions>;
