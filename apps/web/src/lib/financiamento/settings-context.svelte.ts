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

export function createSettingsState() {
  let settings = $state<SimulatorSettings>(DEFAULT_SETTINGS);
  let isLoaded = $state(false);

  $effect(() => {
    if (!browser) {
      return;
    }
    settings = loadSettings();
    isLoaded = true;
  });

  const updateSettings = (newSettings: SimulatorSettings) => {
    settings = newSettings;
    saveSettings(newSettings);
  };

  const resetSettings = () => {
    settings = DEFAULT_SETTINGS;
    saveSettings(DEFAULT_SETTINGS);
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
