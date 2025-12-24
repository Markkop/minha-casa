"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

// ============================================================================
// TYPES
// ============================================================================

export interface SliderRange {
  min: number
  max: number
  step: number
}

export interface SimulatorSettings {
  // CET
  cetAdditionalCost: number // default: 0.02 (2%)

  // Prazos
  prazoOptions: number[] // default: [240, 300, 360, 420]

  // Slider ranges
  sliders: {
    taxaAnual: SliderRange
    trMensal: SliderRange
    haircut: SliderRange
    aporteExtra: SliderRange
    rendaMensal: SliderRange
  }
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_SETTINGS: SimulatorSettings = {
  cetAdditionalCost: 0.02,
  prazoOptions: [240, 300, 360, 420],
  sliders: {
    taxaAnual: { min: 9, max: 15, step: 0.1 },
    trMensal: { min: 0, max: 0.5, step: 0.01 },
    haircut: { min: 5, max: 30, step: 1 },
    aporteExtra: { min: 0, max: 30000, step: 1000 },
    rendaMensal: { min: 30000, max: 80000, step: 1000 },
  },
}

// ============================================================================
// LOCAL STORAGE
// ============================================================================

const STORAGE_KEY = "minha-casa-settings"

export const loadSettings = (): SimulatorSettings => {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return DEFAULT_SETTINGS
    }

    const parsed = JSON.parse(stored) as Partial<SimulatorSettings>
    
    // Deep merge with defaults to handle missing properties
    return {
      cetAdditionalCost: parsed.cetAdditionalCost ?? DEFAULT_SETTINGS.cetAdditionalCost,
      prazoOptions: parsed.prazoOptions ?? DEFAULT_SETTINGS.prazoOptions,
      sliders: {
        taxaAnual: { ...DEFAULT_SETTINGS.sliders.taxaAnual, ...parsed.sliders?.taxaAnual },
        trMensal: { ...DEFAULT_SETTINGS.sliders.trMensal, ...parsed.sliders?.trMensal },
        haircut: { ...DEFAULT_SETTINGS.sliders.haircut, ...parsed.sliders?.haircut },
        aporteExtra: { ...DEFAULT_SETTINGS.sliders.aporteExtra, ...parsed.sliders?.aporteExtra },
        rendaMensal: { ...DEFAULT_SETTINGS.sliders.rendaMensal, ...parsed.sliders?.rendaMensal },
      },
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export const saveSettings = (settings: SimulatorSettings): void => {
  if (typeof window === "undefined") {
    return
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    console.error("Failed to save settings to localStorage")
  }
}

// ============================================================================
// REACT CONTEXT
// ============================================================================

interface SettingsContextValue {
  settings: SimulatorSettings
  updateSettings: (settings: SimulatorSettings) => void
  resetSettings: () => void
  isLoaded: boolean
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export const useSettings = (): SettingsContextValue => {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}

interface SettingsProviderProps {
  children: ReactNode
}

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
  const [settings, setSettings] = useState<SimulatorSettings>(DEFAULT_SETTINGS)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load settings from localStorage on mount
  useEffect(() => {
    const loaded = loadSettings()
    setSettings(loaded)
    setIsLoaded(true)
  }, [])

  const updateSettings = (newSettings: SimulatorSettings) => {
    setSettings(newSettings)
    saveSettings(newSettings)
  }

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS)
    saveSettings(DEFAULT_SETTINGS)
  }

  return (
    <SettingsContext.Provider
      value={{ settings, updateSettings, resetSettings, isLoaded }}
    >
      {children}
    </SettingsContext.Provider>
  )
}


