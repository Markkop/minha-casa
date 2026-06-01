import type { Imovel } from "$lib/anuncios/types";
import type { ListingData } from "$lib/workspace/client";
import { workspaceApi } from "$lib/workspace/client";
import type { FieldChange } from "$lib/components/anuncios/QuickReparseModal.svelte";
import type { QuickReparseResult } from "$lib/components/anuncios/listing-row-interactions.svelte";

type ComparableScalar = string | number | boolean | null | undefined;

const COMPARABLE_FIELDS = [
  "titulo",
  "endereco",
  "m2Totais",
  "m2Privado",
  "quartos",
  "suites",
  "banheiros",
  "garagem",
  "preco",
  "piscina",
  "porteiro24h",
  "academia",
  "vistaLivre",
  "piscinaTermica",
  "sitePublishedAt",
  "siteUpdatedAt"
] as const satisfies readonly (keyof Imovel & keyof ListingData)[];

const FIELD_LABELS: Partial<Record<(typeof COMPARABLE_FIELDS)[number], string>> = {
  titulo: "Título",
  endereco: "Endereço",
  m2Totais: "m² total",
  m2Privado: "m² privado",
  quartos: "Quartos",
  suites: "Suítes",
  banheiros: "Banheiros",
  garagem: "Garagem",
  preco: "Preço",
  piscina: "Piscina",
  porteiro24h: "Porteiro 24h",
  academia: "Academia",
  vistaLivre: "Vista livre",
  piscinaTermica: "Piscina térmica",
  sitePublishedAt: "Publicado no site",
  siteUpdatedAt: "Atualizado no site"
};

function valuesAreDifferent(current: ComparableScalar, newVal: ComparableScalar): boolean {
  if ((current === null || current === undefined) && (newVal === null || newVal === undefined)) {
    return false;
  }
  return current !== newVal;
}

export async function handleQuickReparseRequest(
  listing: Imovel,
  input: string
): Promise<QuickReparseResult> {
  if (!input.trim()) {
    return { outcome: "error", message: "Cole o texto do anúncio" };
  }

  try {
    const parsedList = await workspaceApi.parseListings({ kind: "text", rawText: input });
    const parsed = parsedList.listings[0];
    if (!parsed) {
      return { outcome: "error", message: "Nenhum imóvel encontrado no conteúdo" };
    }

    const detectedChanges: FieldChange[] = [];

    for (const field of COMPARABLE_FIELDS) {
      const currentValue = listing[field] as ComparableScalar;
      const newValue = parsed[field] as ComparableScalar;

      if (valuesAreDifferent(currentValue, newValue)) {
        detectedChanges.push({
          field,
          label: FIELD_LABELS[field] || field,
          currentValue,
          newValue,
          selected: true
        });
      }
    }

    if (detectedChanges.length === 0) {
      return { outcome: "no-changes" };
    }

    return { outcome: "changes", changes: detectedChanges };
  } catch (err) {
    console.error("Error parsing listing:", err);
    return {
      outcome: "error",
      message: err instanceof Error ? err.message : "Erro ao processar anúncio"
    };
  }
}

export function extractUniqueContacts(listings: Imovel[]) {
  const contactMap = new Map<string, { name: string | null; number: string }>();

  for (const listing of listings) {
    if (listing.contactNumber) {
      const normalized = listing.contactNumber.replace(/\D/g, "");
      if (normalized && !contactMap.has(normalized)) {
        contactMap.set(normalized, {
          name: listing.contactName || null,
          number: listing.contactNumber
        });
      }
    }
  }

  return Array.from(contactMap.values()).sort((a, b) => {
    const nameA = a.name || a.number;
    const nameB = b.name || b.number;
    return nameA.localeCompare(nameB);
  });
}
