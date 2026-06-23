import { createContext } from "svelte";
import { browser } from "$app/environment";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type SimulatorSettings
} from "$lib/financiamento/settings";

export type { SimulatorSettings, SliderRange } from "$lib/financiamento/settings";
export { DEFAULT_SETTINGS } from "$lib/financiamento/settings";

export interface SettingsContextValue {
  settings: SimulatorSettings;
  updateSettings: (settings: SimulatorSettings) => void;
  resetSettings: () => void;
  isLoaded: boolean;
}

export const [getSettingsContext, setSettingsContext] = createContext<SettingsContextValue>();

export function createSettingsState(options?: {
  initialSettings?: SimulatorSettings;
  persist?: boolean;
}) {
  const persist = options?.persist ?? true;
  let settings = $state<SimulatorSettings>(
    options?.initialSettings ?? (browser && persist ? loadSettings() : DEFAULT_SETTINGS)
  );
  const isLoaded = $state(browser);

  const updateSettings = (newSettings: SimulatorSettings) => {
    settings = newSettings;
    if (persist) saveSettings(newSettings);
  };

  const resetSettings = () => {
    settings = DEFAULT_SETTINGS;
    if (persist) saveSettings(DEFAULT_SETTINGS);
  };

  return {
    get settings() {
      return settings;
    },
    get isLoaded() {
      return isLoaded;
    },
    updateSettings,
    resetSettings
  };
}
