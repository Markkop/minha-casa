import type { Imovel } from "$lib/anuncios/types";
import {
  clampListingCount,
  type ListingCountField
} from "$lib/anuncios/listing-count-field";
import type { TipoImovelValue } from "$lib/components/anuncios/listings-table-shared";

export function createEditFormToolbarInteractions(options: {
  getDraft: () => Partial<Imovel>;
  patchDraft: (updates: Partial<Imovel>) => void;
}) {
  let tipoImovelPopoverOpen = $state(false);

  function patchFromToggle<K extends keyof Imovel>(field: K) {
    const current = options.getDraft()[field];
    options.patchDraft({ [field]: current === true ? false : true } as Partial<Imovel>);
  }

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
    async handleTogglePiscina() {
      patchFromToggle("piscina");
    },
    async handleTogglePiscinaTermica() {
      patchFromToggle("piscinaTermica");
    },
    async handleTogglePorteiro24h() {
      patchFromToggle("porteiro24h");
    },
    async handleToggleAcademia() {
      patchFromToggle("academia");
    },
    async handleToggleVistaLivre() {
      patchFromToggle("vistaLivre");
    },
    async handleSetCount(field: ListingCountField, nextValue: number) {
      setNumericField(field, nextValue);
    }
  };
}

export type EditFormToolbarInteractions = ReturnType<typeof createEditFormToolbarInteractions>;
