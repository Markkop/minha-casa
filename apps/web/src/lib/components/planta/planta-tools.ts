import { Grid3X3, Hand, Minus, MousePointer2, Square } from "@lucide/svelte";
import type { PlantaTool } from "$lib/components/planta/types";

export const PLANTA_TOOLS: Array<{
  id: PlantaTool;
  label: string;
  icon: typeof MousePointer2;
}> = [
  { id: "select", label: "Selecionar", icon: MousePointer2 },
  { id: "pan", label: "Mover tela", icon: Hand },
  { id: "line", label: "Linha", icon: Minus },
  { id: "rect", label: "Retangulo", icon: Square },
  { id: "square", label: "Quadrado", icon: Grid3X3 }
];
