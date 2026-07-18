/**
 * Client-side feature flags.
 *
 * Priority: runtime overrides → PUBLIC_FF_* env → defaults.
 */

export interface FeatureFlags {
  publicCollections: boolean;
  mapProvider: "google" | "leaflet" | "auto";
}

const defaultFlags: FeatureFlags = {
  publicCollections: true,
  mapProvider: "auto"
};

let runtimeOverrides: Partial<FeatureFlags> = {};

function toEnvVarName(flagName: string): string {
  return `PUBLIC_FF_${flagName.replace(/([A-Z])/g, "_$1").toUpperCase()}`;
}

function parseEnvValue<K extends keyof FeatureFlags>(
  key: K,
  value: string | undefined
): FeatureFlags[K] | undefined {
  if (value === undefined || value === "") return undefined;

  const defaultValue = defaultFlags[key];
  if (typeof defaultValue === "boolean") {
    const lower = value.toLowerCase();
    if (lower === "true" || lower === "1" || lower === "yes") return true as FeatureFlags[K];
    if (lower === "false" || lower === "0" || lower === "no") return false as FeatureFlags[K];
    return undefined;
  }

  return value as FeatureFlags[K];
}

export function getFlag<K extends keyof FeatureFlags>(key: K): FeatureFlags[K] {
  if (key in runtimeOverrides) {
    return runtimeOverrides[key] as FeatureFlags[K];
  }

  const envValue = import.meta.env[toEnvVarName(key)] as string | undefined;
  const parsed = parseEnvValue(key, envValue);
  if (parsed !== undefined) return parsed;

  return defaultFlags[key];
}

export function getAllFlags(): FeatureFlags {
  return {
    publicCollections: getFlag("publicCollections"),
    mapProvider: getFlag("mapProvider")
  };
}

export function setFlagOverrides(overrides: Partial<FeatureFlags>): void {
  runtimeOverrides = { ...runtimeOverrides, ...overrides };
}

export function clearFlagOverrides(): void {
  runtimeOverrides = {};
}

export function isEnabled(key: keyof FeatureFlags): boolean {
  return getFlag(key) === true;
}
