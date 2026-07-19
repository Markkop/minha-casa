export type FormatApiErrorOptions = {
  action?: string;
};

type ApiErrorPayload = {
  error?: string;
  detail?: string;
  hint?: string;
  code?: string;
};

const GENERIC = "Não foi possível completar esta ação. Tente novamente.";

const CODE_MESSAGES: Record<string, string> = {
  workspace_frozen: "Seu perfil está em modo somente leitura.",
  collection_limit: "Você atingiu o limite de coleções do seu plano.",
  listing_limit: "Você atingiu o limite de imóveis do seu plano.",
  limit_reached: "Limite de uso atingido. Tente novamente mais tarde.",
  plan_conflict: "Esta imobiliária já possui uma assinatura ativa."
};

const ACTION_FALLBACKS: Record<string, string> = {
  carregar: "Não foi possível carregar os dados.",
  excluir: "Não foi possível excluir.",
  "iniciar pagamento": "Não foi possível iniciar o pagamento.",
  salvar: "Não foi possível salvar.",
  "salvar imóvel": "Não foi possível salvar o imóvel.",
  "salvar imovel": "Não foi possível salvar o imóvel.",
  "atualizar organização": "Não foi possível atualizar a imobiliária selecionada.",
  "atualizar organizacao": "Não foi possível atualizar a imobiliária selecionada."
};

const ENGLISH_MESSAGES: Record<string, string> = {
  "not found": "Conteúdo não encontrado.",
  unauthorized: "Sessão expirada. Faça login novamente.",
  forbidden: "Você não tem permissão para esta ação.",
  "invalid or missing authentication token": "Sessão expirada. Faça login novamente.",
  "you do not have access to this workspace":
    "Você não tem acesso a este perfil de trabalho.",
  "external access is limited to granted collections":
    "Seu acesso é limitado às coleções compartilhadas com você.",
  "workspace is read-only":
    "Seu perfil está em modo somente leitura. Renove a assinatura para editar.",
  "listing not found": "Imóvel não encontrado.",
  "collection not found": "Coleção não encontrada.",
  "share not found": "Compartilhamento não encontrado.",
  "invite not found": "Convite não encontrado.",
  "invite has expired": "Este convite expirou.",
  "invite is no longer available": "Este convite não está mais disponível.",
  "organization not found": "Imobiliária não encontrada.",
  "agency not found": "Imobiliária não encontrada.",
  "analysis not found": "Análise não encontrada.",
  "portal search not found": "Busca não encontrada.",
  "invalid listing data": "Alguns dados do imóvel são inválidos. Revise e tente novamente.",
  "listing title and address are required": "Informe título e endereço do imóvel.",
  "listing data is required": "Informe os dados do imóvel.",
  "token is required": "Link de compartilhamento inválido.",
  "invalid share": "Compartilhamento inválido.",
  "this invitation was sent to another email": "Este convite foi enviado para outro e-mail.",
  "invitation is no longer available": "Este convite não está mais disponível.",
  "editable sharing is not available for this plan":
    "Compartilhamento com edição não está disponível no seu plano.",
  "payment system is not configured":
    "Pagamentos temporariamente indisponíveis. Tente novamente mais tarde.",
  "plan not found": "Plano não encontrado.",
  "plan is not available": "Este plano não está disponível.",
  "planid is required": "Selecione um plano para continuar.",
  "this agency already has an active subscription.":
    "Esta imobiliária já possui uma assinatura ativa.",
  "an agency owned by the billing user is required.":
    "É necessário ter uma imobiliária vinculada para assinar.",
  "no stripe customer on file. subscribe once through checkout first.":
    "Conclua uma assinatura antes de acessar o portal de cobrança.",
  "user not found": "Usuário não encontrado.",
  "invalid image index": "Imagem não encontrada.",
  "image not found": "Imagem não encontrada.",
  "invalid data": "Verifique os dados informados e tente novamente.",
  "missing profile":
    "Perfil de trabalho não encontrado. Selecione um perfil e tente novamente.",
  "collection limit reached": "Você atingiu o limite de coleções do seu plano.",
  "listing limit reached": "Você atingiu o limite de imóveis do seu plano.",
  "duplicate candidates found": "Encontramos imóveis parecidos. Escolha como deseja continuar.",
  "name must have between 2 and 100 characters":
    "O nome deve ter entre 2 e 100 caracteres.",
  "only owners and admins can rename an agency":
    "Somente proprietários e administradores podem renomear a imobiliária.",
  "only owners and admins can manage invites":
    "Somente proprietários e administradores podem gerenciar convites.",
  "a user can belong to only one family":
    "Cada usuário pode pertencer a apenas um grupo familiar.",
  "invalid json body": "Não foi possível processar os dados enviados.",
  "failed to update organization context": "Não foi possível atualizar a imobiliária selecionada."
};

const TECHNICAL_PATTERNS: RegExp[] = [
  /^:/,
  /\binspect\b/i,
  /\bphoenix\b/i,
  /\bstripe\b/i,
  /\bopenai\b/i,
  /\bhermes\b/i,
  /\bminio\b/i,
  /\bdocker\b/i,
  /\.env\b/i,
  /cannot reach/i,
  /fetch failed/i,
  /econnrefused/i,
  /enotfound/i,
  /network error/i,
  /stack\s*trace/i,
  /ecto\.changeset/i,
  /can't be blank/i,
  /is invalid/i,
  /is not a supported/i,
  /\bHTTP\s+\d{3}\b/i,
  /\boban_/i,
  /\battachment\b/i,
  /\bworkspace\b/i,
  /\bparsing\b/i,
  /failed to /i,
  /internal server/i,
  /\bunauthorized\b/i,
  /\[validation:/i,
  /docker compose/i,
  /localhost:\d+/i
];

function asPayload(data: unknown): ApiErrorPayload {
  if (data && typeof data === "object") return data as ApiErrorPayload;
  return {};
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

function actionFallback(options?: FormatApiErrorOptions): string {
  const action = options?.action?.trim().toLowerCase();
  if (!action) return GENERIC;
  return ACTION_FALLBACKS[action] ?? `Não foi possível ${options!.action!.trim()}. Tente novamente.`;
}

function isTechnicalMessage(text: string): boolean {
  return TECHNICAL_PATTERNS.some((pattern) => pattern.test(text));
}

function sanitizeMessage(
  text: string | undefined | null,
  _options?: FormatApiErrorOptions
): string | null {
  if (!text?.trim()) return null;

  const trimmed = text.trim();
  const mapped = ENGLISH_MESSAGES[trimmed.toLowerCase()];
  if (mapped) return mapped;

  if (isTechnicalMessage(trimmed)) return null;

  return trimmed;
}

function statusFallback(status: number, options?: FormatApiErrorOptions): string {
  switch (status) {
    case 0:
      return "Sem conexão com o servidor. Verifique sua internet ou tente novamente.";
    case 401:
      return "Sessão expirada ou não autorizado. Faça login novamente.";
    case 403:
      return "Você não tem permissão para esta ação.";
    case 404:
      return "Recurso não encontrado.";
    case 502:
      return "Não foi possível conectar ao servidor. Tente novamente em instantes.";
    case 503:
      return "Serviço temporariamente indisponível.";
    case 504:
      return "A operação demorou demais. Tente novamente.";
    default:
      return actionFallback(options);
  }
}

function formatApiErrorPayload(
  status: number,
  payload: ApiErrorPayload,
  options?: FormatApiErrorOptions
): string {
  const code = payload.code?.trim();
  if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code];

  if (status === 502 || status === 0) {
    const sanitized = sanitizeMessage(payload.error, options);
    if (sanitized) return sanitized;
    return statusFallback(status, options);
  }

  const sanitizedError = sanitizeMessage(payload.error, options);
  if (sanitizedError) return sanitizedError;

  const sanitizedDetail = sanitizeMessage(payload.detail, options);
  if (sanitizedDetail) return sanitizedDetail;

  if (status >= 400) return statusFallback(status, options);

  return actionFallback(options);
}

/** Maps API and validation errors to user-facing Portuguese text. */
export function formatApiError(error: unknown, options?: FormatApiErrorOptions): string {
  if (isApiError(error)) {
    return formatApiErrorPayload(error.status, asPayload(error.data), options);
  }

  if (error instanceof Error && error.message.trim() !== "") {
    const sanitized = sanitizeMessage(error.message, options);
    if (sanitized) return sanitized;
    return actionFallback(options);
  }

  if (typeof error === "string" && error.trim() !== "") {
    const sanitized = sanitizeMessage(error, options);
    if (sanitized) return sanitized;
    return actionFallback(options);
  }

  return actionFallback(options);
}
