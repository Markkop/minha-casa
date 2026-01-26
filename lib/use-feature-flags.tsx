"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import {
  type FeatureFlags,
  type FlagName,
  getFlag,
  getAllFlags,
  setFlagOverrides,
  clearFlagOverrides,
} from "./feature-flags";

// Context type
interface FeatureFlagsContextType {
  flags: FeatureFlags;
  getFlag: <K extends FlagName>(key: K) => FeatureFlags[K];
  isEnabled: (key: FlagName) => boolean;
  setOverrides: (overrides: Partial<FeatureFlags>) => void;
  clearOverrides: () => void;
}

// Create context with undefined default (must be used within provider)
const FeatureFlagsContext = createContext<FeatureFlagsContextType | undefined>(
  undefined
);

// Provider props
interface FeatureFlagsProviderProps {
  children: ReactNode;
  initialOverrides?: Partial<FeatureFlags>;
}

/**
 * Feature Flags Provider
 *
 * Wrap your app or a section of your app with this provider to access
 * feature flags via the useFeatureFlags hook.
 *
 * @example
 * ```tsx
 * // In your layout or app root
 * <FeatureFlagsProvider>
 *   <App />
 * </FeatureFlagsProvider>
 *
 * // With initial overrides (useful for testing)
 * <FeatureFlagsProvider initialOverrides={{ newDashboard: true }}>
 *   <App />
 * </FeatureFlagsProvider>
 * ```
 */
export function FeatureFlagsProvider({
  children,
  initialOverrides,
}: FeatureFlagsProviderProps) {
  // Initialize with any provided overrides
  const [flags, setFlags] = useState<FeatureFlags>(() => {
    if (initialOverrides) {
      setFlagOverrides(initialOverrides);
    }
    return getAllFlags();
  });

  // Get a single flag value
  const getFlagValue = useCallback(
    <K extends FlagName>(key: K): FeatureFlags[K] => {
      return flags[key];
    },
    [flags]
  );

  // Check if a boolean flag is enabled
  const isEnabled = useCallback(
    (key: FlagName): boolean => {
      return flags[key] === true;
    },
    [flags]
  );

  // Set runtime overrides and update state
  const setOverrides = useCallback((overrides: Partial<FeatureFlags>) => {
    setFlagOverrides(overrides);
    setFlags(getAllFlags());
  }, []);

  // Clear all overrides and reset to defaults/env vars
  const clearOverrides = useCallback(() => {
    clearFlagOverrides();
    setFlags(getAllFlags());
  }, []);

  // Memoize context value
  const contextValue = useMemo(
    () => ({
      flags,
      getFlag: getFlagValue,
      isEnabled,
      setOverrides,
      clearOverrides,
    }),
    [flags, getFlagValue, isEnabled, setOverrides, clearOverrides]
  );

  return (
    <FeatureFlagsContext.Provider value={contextValue}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

/**
 * Hook to access feature flags
 *
 * Must be used within a FeatureFlagsProvider.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isEnabled, getFlag } = useFeatureFlags();
 *
 *   if (isEnabled('newDashboard')) {
 *     return <NewDashboard />;
 *   }
 *
 *   const mapProvider = getFlag('mapProvider');
 *   // ...
 * }
 * ```
 */
export function useFeatureFlags(): FeatureFlagsContextType {
  const context = useContext(FeatureFlagsContext);

  if (context === undefined) {
    throw new Error(
      "useFeatureFlags must be used within a FeatureFlagsProvider"
    );
  }

  return context;
}

/**
 * Hook to get a single feature flag value
 *
 * Convenience hook for accessing a single flag.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const newDashboardEnabled = useFlag('newDashboard');
 *   const mapProvider = useFlag('mapProvider');
 *
 *   if (newDashboardEnabled) {
 *     return <NewDashboard mapProvider={mapProvider} />;
 *   }
 *   return <OldDashboard />;
 * }
 * ```
 */
export function useFlag<K extends FlagName>(key: K): FeatureFlags[K] {
  const { getFlag } = useFeatureFlags();
  return getFlag(key);
}

/**
 * Hook to check if a boolean flag is enabled
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const showNewFeature = useFlagEnabled('experimentalParser');
 *
 *   return showNewFeature ? <NewFeature /> : <OldFeature />;
 * }
 * ```
 */
export function useFlagEnabled(key: FlagName): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(key);
}

/**
 * Standalone hook that doesn't require a provider
 *
 * Uses the module-level feature flags directly. Useful for simple cases
 * where you don't need runtime updates or context.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const flags = useStandaloneFeatureFlags();
 *   return flags.newDashboard ? <New /> : <Old />;
 * }
 * ```
 */
export function useStandaloneFeatureFlags() {
  const [flags] = useState(getAllFlags);
  return flags;
}

/**
 * Get a single flag without using context (standalone)
 */
export function useStandaloneFlag<K extends FlagName>(key: K): FeatureFlags[K] {
  const [value] = useState(() => getFlag(key));
  return value;
}
