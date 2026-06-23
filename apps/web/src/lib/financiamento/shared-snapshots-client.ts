import { api } from "$lib/api/client";
import {
  buildSharedSnapshotPayload,
  normalizeSharedSnapshot,
  type FinanceiroSharedSnapshot,
  type FinanceiroSharedSnapshotResponse
} from "$lib/financiamento/shared-snapshot";
import type { SimulatorParams } from "$lib/components/financiamento/financiamento-parameter-types";
import type { SimulatorSettings } from "$lib/financiamento/settings";

function localizeShareUrl(shareUrl: string): string {
  if (typeof window === "undefined") {
    return shareUrl;
  }

  try {
    const url = new URL(shareUrl);
    return `${window.location.origin}${url.pathname}${url.search}${url.hash}`;
  } catch {
    return shareUrl;
  }
}

export async function createFinanceiroSharedSnapshot({
  title,
  params,
  settings
}: {
  title: string;
  params: SimulatorParams;
  settings: SimulatorSettings;
}): Promise<{ snapshot: FinanceiroSharedSnapshot; shareUrl: string }> {
  const result = await api.post<FinanceiroSharedSnapshotResponse>("/financeiro/snapshots", {
    title,
    payload: buildSharedSnapshotPayload(params, settings)
  });

  const snapshot = normalizeSharedSnapshot(result.snapshot);
  if (!snapshot || !result.shareUrl) {
    throw new Error("Resposta inválida ao criar link compartilhável");
  }

  return { snapshot, shareUrl: localizeShareUrl(result.shareUrl) };
}
