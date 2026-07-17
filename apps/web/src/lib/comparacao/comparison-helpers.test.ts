import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Imovel } from "$lib/anuncios/types";
import type { ComparisonSlot } from "./comparison-helpers";

vi.mock("@lucide/svelte", () => {
  const Icon = () => null;
  return {
    Building2: Icon,
    CircleDot: Icon,
    Dumbbell: Icon,
    Flower2: Icon,
    Home: Icon,
    Mountain: Icon,
    Shield: Icon,
    Sun: Icon,
    Waves: Icon,
    WavesLadder: Icon
  };
});

let helpers: typeof import("./comparison-helpers");

beforeAll(async () => {
  helpers = await import("./comparison-helpers");
});

function listing(id: string, options: Partial<Imovel> = {}): Imovel {
  return {
    id,
    titulo: id,
    endereco: "",
    m2Totais: null,
    m2Privado: null,
    quartos: null,
    suites: null,
    banheiros: null,
    garagem: null,
    anoConstrucao: null,
    preco: null,
    precoM2: null,
    piscina: null,
    porteiro24h: null,
    academia: null,
    vistaLivre: null,
    piscinaTermica: null,
    link: null,
    createdAt: "",
    ...options
  };
}

describe("comparison-helpers", () => {
  it("swaps two comparison slot placements", () => {
    const slots: ComparisonSlot[] = ["a", "b", "c"];

    expect(helpers.swapComparisonSlots(slots, 0, 2)).toEqual(["c", "b", "a"]);
  });

  it("returns other placed listings as swap candidates, including struck-through listings", () => {
    const listings = [
      listing("a"),
      listing("b", { strikethrough: true }),
      listing("c"),
      listing("unused")
    ];
    const slots: ComparisonSlot[] = ["a", "b", null, "c"];

    expect(helpers.getSwapCandidatesForSlot(listings, slots, 0).map((item) => item.id)).toEqual([
      "b",
      "c"
    ]);
  });
});
