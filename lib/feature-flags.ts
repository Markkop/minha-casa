/**
 * Feature Flags System
 *
 * A simple, type-safe feature flags system for Next.js applications.
 * Supports boolean flags and variant flags with multiple values.
 *
 * Configuration sources (in order of priority):
 * 1. Runtime overrides (for testing)
 * 2. Environment variables (NEXT_PUBLIC_FF_<FLAG_NAME>)
 * 3. Default values
 */

// Define available feature flags and their types
export interface FeatureFlags {
  // Route visibility flags
  financingSimulator: boolean;
  floodForecast: boolean;
  organizations: boolean;
  publicCollections: boolean;
  // Map provider
  mapProvider: "google" | "leaflet" | "auto";
}

// Default values for all feature flags
const defaultFlags: FeatureFlags = {
  financingSimulator: false, // Hide /casa route
  floodForecast: false, // Hide /floodrisk route
  organizations: true, // Enable organizations feature
  publicCollections: true, // Enable public collection sharing
  mapProvider: "auto",
};

// Runtime overrides storage (useful for testing and development)
let runtimeOverrides: Partial<FeatureFlags> = {};

/**
 * Convert a flag name to its environment variable name
 * e.g., "newDashboard" -> "NEXT_PUBLIC_FF_NEW_DASHBOARD"
 */
function toEnvVarName(flagName: string): string {
  return `NEXT_PUBLIC_FF_${flagName
    .replace(/([A-Z])/g, "_$1")
    .toUpperCase()}`;
}

/**
 * Parse a string value from environment variable to the appropriate type
 */
function parseEnvValue<K extends keyof FeatureFlags>(
  key: K,
  value: string | undefined
): FeatureFlags[K] | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }

  const defaultValue = defaultFlags[key];

  // Boolean parsing
  if (typeof defaultValue === "boolean") {
    const lowerValue = value.toLowerCase();
    if (lowerValue === "true" || lowerValue === "1" || lowerValue === "yes") {
      return true as FeatureFlags[K];
    }
    if (lowerValue === "false" || lowerValue === "0" || lowerValue === "no") {
      return false as FeatureFlags[K];
    }
    return undefined;
  }

  // String/variant parsing - return as-is if it's a valid option
  return value as FeatureFlags[K];
}

/**
 * Get the value of a single feature flag
 */
export function getFlag<K extends keyof FeatureFlags>(key: K): FeatureFlags[K] {
  // 1. Check runtime overrides first
  if (key in runtimeOverrides) {
    return runtimeOverrides[key] as FeatureFlags[K];
  }

  // 2. Check environment variables
  const envVarName = toEnvVarName(key);
  const envValue =
    typeof process !== "undefined" ? process.env[envVarName] : undefined;
  const parsedEnvValue = parseEnvValue(key, envValue);
  if (parsedEnvValue !== undefined) {
    return parsedEnvValue;
  }

  // 3. Return default value
  return defaultFlags[key];
}

/**
 * Get all feature flags with their current values
 */
export function getAllFlags(): FeatureFlags {
  const flags = {} as FeatureFlags;
  for (const key of Object.keys(defaultFlags) as Array<keyof FeatureFlags>) {
    (flags as any)[key] = getFlag(key);
  }
  return flags;
}

/**
 * Set runtime overrides for feature flags (useful for testing)
 */
export function setFlagOverrides(overrides: Partial<FeatureFlags>): void {
  runtimeOverrides = { ...runtimeOverrides, ...overrides };
}

/**
 * Clear all runtime overrides
 */
export function clearFlagOverrides(): void {
  runtimeOverrides = {};
}

/**
 * Check if a flag is enabled (for boolean flags)
 */
export function isEnabled(key: keyof FeatureFlags): boolean {
  const value = getFlag(key);
  return value === true;
}

/**
 * Get the list of all available flag names
 */
export function getFlagNames(): Array<keyof FeatureFlags> {
  return Object.keys(defaultFlags) as Array<keyof FeatureFlags>;
}

/**
 * Get the default value for a flag
 */
export function getDefaultValue<K extends keyof FeatureFlags>(
  key: K
): FeatureFlags[K] {
  return defaultFlags[key];
}

// Export types for external use
export type FlagName = keyof FeatureFlags;
export type FlagValue<K extends FlagName> = FeatureFlags[K];
