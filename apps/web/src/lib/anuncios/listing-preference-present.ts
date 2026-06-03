import type { Component } from "svelte";
import {
  Circle,
  CircleDot,
  Diamond,
  Hexagon,
  Sparkles,
  Square,
  Star,
  Triangle
} from "@lucide/svelte";
import {
  getPreferenceIcon,
  getPreferenceIconClass
} from "$lib/anuncios/listing-preference-icons";
import type { ListingPreferenceOption } from "$lib/anuncios/listing-preferences";

export {
  APARTMENT_TOOLBAR_PREFERENCE_KEYS,
  EXTRA_SYSTEM_TOOLBAR_KEYS,
  MOBILE_AMENITY_KEYS,
  getToolbarPreferenceOptions,
  isApartmentOnlyPreferenceKey,
  shouldShowToolbarPreference
} from "$lib/anuncios/listing-preference-toolbar";

const CUSTOM_ICON_POOL: Component<{ class?: string }>[] = [
  Star,
  Sparkles,
  Diamond,
  Hexagon,
  Triangle,
  Square,
  Circle
];

const CUSTOM_COLOR_POOL = [
  "text-violet-500",
  "text-orange-500",
  "text-pink-500",
  "text-cyan-500",
  "text-amber-500",
  "text-fuchsia-500",
  "text-lime-600",
  "text-rose-500"
] as const;

function hashKey(key: string): number {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export type PreferencePresentation = {
  Icon: Component<{ class?: string }>;
  iconClass: string;
};

export function getCustomPreferencePresentation(key: string): PreferencePresentation {
  const hash = hashKey(key);
  return {
    Icon: CUSTOM_ICON_POOL[hash % CUSTOM_ICON_POOL.length],
    iconClass: CUSTOM_COLOR_POOL[hash % CUSTOM_COLOR_POOL.length]
  };
}

export function getPreferencePresentation(option: ListingPreferenceOption): PreferencePresentation {
  if (option.source === "custom") {
    return getCustomPreferencePresentation(option.key);
  }

  return {
    Icon: getPreferenceIcon(option.key) ?? CircleDot,
    iconClass: getPreferenceIconClass(option.key)
  };
}
