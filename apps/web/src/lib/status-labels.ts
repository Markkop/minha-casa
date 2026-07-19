import type { StreamStatus } from "$lib/explorar/types";

export function subscriptionStatusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Ativo";
    case "expired":
      return "Expirado";
    case "cancelled":
      return "Cancelado";
    default:
      return status;
  }
}

export function explorarRunStatusLabel(status: string): string {
  switch (status) {
    case "queued":
      return "Na fila";
    case "running":
      return "Em andamento";
    case "completed":
      return "Concluída";
    case "failed":
      return "Falhou";
    default:
      return status;
  }
}

export function explorarTargetStatusLabel(status: string): string {
  switch (status) {
    case "queued":
      return "na fila";
    case "running":
      return "coletando";
    case "completed":
      return "concluído";
    case "failed":
      return "falhou";
    default:
      return status;
  }
}

export function explorarStreamStatusNote(status: StreamStatus): string | null {
  switch (status) {
    case "connected":
      return "atualização em tempo real";
    case "fallback":
      return "atualização periódica";
    default:
      return null;
  }
}
