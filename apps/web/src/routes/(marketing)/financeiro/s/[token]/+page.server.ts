import { error } from "@sveltejs/kit";
import { config } from "$lib/config";
import {
  normalizeSharedSnapshot,
  type FinanceiroSharedSnapshotResponse
} from "$lib/financiamento/shared-snapshot";

export const load = async ({ params, fetch }) => {
  const token = params.token?.trim();
  if (!token) {
    throw error(404, "Link não encontrado");
  }

  const response = await fetch(
    `${config.apiUrl}/api/financeiro/snapshots/${encodeURIComponent(token)}`
  );
  if (!response.ok) {
    throw error(response.status === 404 ? 404 : 500, "Link não encontrado");
  }

  const payload = (await response.json().catch(() => null)) as FinanceiroSharedSnapshotResponse | null;
  const snapshot = normalizeSharedSnapshot(payload?.snapshot);
  if (!snapshot) {
    throw error(500, "Snapshot inválido");
  }

  return { snapshot };
};
