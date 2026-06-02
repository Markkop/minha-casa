import type { Imovel } from "$lib/anuncios/types";
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

  function cycleNumericField(field: "quartos" | "banheiros" | "garagem" | "andar", max: number) {
    const draft = options.getDraft();
    const current = (draft[field] as number | null | undefined) ?? 0;
    const nextValue = current >= max ? 0 : current + 1;
    options.patchDraft({ [field]: nextValue } as Partial<Imovel>);
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
    async handleCycleQuartos() {
      cycleNumericField("quartos", 6);
    },
    async handleCycleBanheiros() {
      cycleNumericField("banheiros", 6);
    },
    async handleCycleGaragem() {
      cycleNumericField("garagem", 4);
    },
    async handleCycleAndar() {
      cycleNumericField("andar", 10);
    }
  };
}

export type EditFormToolbarInteractions = ReturnType<typeof createEditFormToolbarInteractions>;
