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

const FEATURE_ICON_MAP: Record<string, Component<{ class?: string }>> = {
  pool: WavesLadder,
  gym: Dumbbell,
  doorman24h: Shield,
  unobstructedView: Mountain,
  heatedPool: Waves,
  cornerLot: Building2,
  penthouse: Home,
  garden: Flower2,
  singleStory: Sun
};

const FEATURE_ICON_CLASS: Record<string, string> = {
  pool: "text-blue-500",
  gym: "text-yellow-500",
  doorman24h: "text-red-500",
  unobstructedView: "text-green-500",
  heatedPool: "text-blue-500"
};

export function getFeatureIcon(key: string): Component<{ class?: string }> | null {
  return FEATURE_ICON_MAP[key] ?? null;
}

export function getFeatureIconClass(key: string): string {
  return FEATURE_ICON_CLASS[key] ?? "text-app-fg";
}
