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
// NORMALIZATION
// ============================================================================

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeSliderRange(value: unknown, fallback: SliderRange): SliderRange {
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const parsed = value as Partial<SliderRange>;
  return {
    min: finiteNumber(parsed.min, fallback.min),
    max: finiteNumber(parsed.max, fallback.max),
    step: finiteNumber(parsed.step, fallback.step)
  };
}

export function normalizeSettings(value: unknown): SimulatorSettings {
  if (!value || typeof value !== "object") {
    return DEFAULT_SETTINGS;
  }

  const parsed = value as Partial<SimulatorSettings>;
  const sliders = (parsed.sliders ?? {}) as Partial<SimulatorSettings["sliders"]>;

  return {
    cetAdditionalCost: finiteNumber(parsed.cetAdditionalCost, DEFAULT_SETTINGS.cetAdditionalCost),
    sliders: {
      taxaAnual: normalizeSliderRange(sliders.taxaAnual, DEFAULT_SETTINGS.sliders.taxaAnual),
      trMensal: normalizeSliderRange(sliders.trMensal, DEFAULT_SETTINGS.sliders.trMensal),
      aporteExtra: normalizeSliderRange(sliders.aporteExtra, DEFAULT_SETTINGS.sliders.aporteExtra),
      rendaMensal: normalizeSliderRange(sliders.rendaMensal, DEFAULT_SETTINGS.sliders.rendaMensal)
    }
  };
}

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

    return normalizeSettings(parsed);
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
