import type { Component } from "svelte";
import {
  Building2,
  Dumbbell,
  Flower2,
  Home,
  Mountain,
  Shield,
  Sun,
  Waves,
  WavesLadder
} from "@lucide/svelte";

const PREFERENCE_ICON_MAP: Record<string, Component<{ class?: string }>> = {
  piscina: WavesLadder,
  academia: Dumbbell,
  portaria: Shield,
  vista_livre: Mountain,
  piscina_termica: Waves,
  esquina: Building2,
  cobertura: Home,
  jardim: Flower2,
  terrea: Sun
};

const PREFERENCE_ICON_CLASS: Record<string, string> = {
  piscina: "text-blue-500",
  academia: "text-yellow-500",
  portaria: "text-red-500",
  vista_livre: "text-green-500",
  piscina_termica: "text-blue-500"
};

export function getPreferenceIcon(key: string): Component<{ class?: string }> | null {
  return PREFERENCE_ICON_MAP[key] ?? null;
}

export function getPreferenceIconClass(key: string): string {
  return PREFERENCE_ICON_CLASS[key] ?? "text-app-fg";
}
