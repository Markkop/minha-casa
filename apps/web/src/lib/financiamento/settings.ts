// ============================================================================
// TYPES
// ============================================================================

export interface SliderRange {
  min: number;
  max: number;
  step: number;
}

export interface SimulatorSettings {
  /** default: 0.02 (2%) */
  cetAdditionalCost: number;
  sliders: {
    taxaAnual: SliderRange;
    trMensal: SliderRange;
    aporteExtra: SliderRange;
    rendaMensal: SliderRange;
  };
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_SETTINGS: SimulatorSettings = {
  cetAdditionalCost: 0.02,
  sliders: {
    taxaAnual: { min: 9, max: 15, step: 0.1 },
    trMensal: { min: 0, max: 0.5, step: 0.01 },
    aporteExtra: { min: 0, max: 30000, step: 1000 },
    rendaMensal: { min: 30000, max: 80000, step: 1000 }
  }
};

// ============================================================================
// LOCAL STORAGE
// ============================================================================

const STORAGE_KEY = "minha-casa-settings";

export function loadSettings(): SimulatorSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(stored) as Partial<SimulatorSettings> & {
      prazoOptions?: number[];
      sliders?: Partial<SimulatorSettings["sliders"]> & { haircut?: SliderRange };
    };

    return {
      cetAdditionalCost: parsed.cetAdditionalCost ?? DEFAULT_SETTINGS.cetAdditionalCost,
      sliders: {
        taxaAnual: { ...DEFAULT_SETTINGS.sliders.taxaAnual, ...parsed.sliders?.taxaAnual },
        trMensal: { ...DEFAULT_SETTINGS.sliders.trMensal, ...parsed.sliders?.trMensal },
        aporteExtra: { ...DEFAULT_SETTINGS.sliders.aporteExtra, ...parsed.sliders?.aporteExtra },
        rendaMensal: { ...DEFAULT_SETTINGS.sliders.rendaMensal, ...parsed.sliders?.rendaMensal }
      }
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: SimulatorSettings): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    console.error("Failed to save settings to localStorage");
  }
}
