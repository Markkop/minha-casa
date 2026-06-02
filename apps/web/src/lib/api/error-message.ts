type ApiErrorPayload = {
  error?: string;
  detail?: string;
  hint?: string;
};

function asPayload(data: unknown): ApiErrorPayload {
  if (data && typeof data === "object") return data as ApiErrorPayload;
  return {};
}

function isServerUnreachableMessage(error: string): boolean {
  const lower = error.toLowerCase();
  return (
    lower.includes("cannot reach phoenix") ||
    lower.includes("phoenix at") ||
    lower.startsWith("cannot reach ")
  );
}

function formatApiErrorPayload(status: number, payload: ApiErrorPayload): string {
  const serverError = payload.error?.trim();

  if (status === 502) {
    if (serverError && isServerUnreachableMessage(serverError)) {
      const hint = payload.hint?.trim();
      const base = "Não foi possível conectar ao servidor. Verifique se a API está rodando.";
      return hint ? `${base} (${hint})` : base;
    }
    if (serverError) return serverError;
    return "Não foi possível completar a requisição. Tente novamente.";
  }

  if (status === 0) {
    const detail = payload.detail?.trim();
    if (serverError && isServerUnreachableMessage(serverError)) {
      return detail
        ? `Sem conexão com o servidor. ${detail}`
        : "Sem conexão com o servidor. Verifique sua internet ou tente novamente.";
    }
    if (serverError) return serverError;
    return detail
      ? `Sem conexão com o servidor. ${detail}`
      : "Sem conexão com o servidor. Verifique sua internet ou tente novamente.";
  }

  if (serverError) return serverError;

  switch (status) {
    case 401:
      return "Sessão expirada ou não autorizado. Faça login novamente.";
    case 403:
      return "Você não tem permissão para esta ação.";
    case 404:
      return "Recurso não encontrado.";
    case 503:
      return "Serviço temporariamente indisponível.";
    case 504:
      return "A operação demorou demais. Tente novamente.";
    default:
      return `Erro na API (${status}).`;
  }
}

function isApiError(error: unknown): error is { status: number; data: unknown } {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number" &&
    "data" in error
  );
}

/** Maps API and validation errors to user-facing Portuguese text. */
export function formatApiError(error: unknown): string {
  if (isApiError(error)) {
    return formatApiErrorPayload(error.status, asPayload(error.data));
  }

  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }

  return "Ocorreu um erro inesperado. Tente novamente.";
}
