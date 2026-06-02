import type { z } from "zod";

export class ApiValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiValidationError";
  }
}

export function parseApiResponse<T>(schema: z.ZodType<T>, data: unknown, context: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[api] Invalid ${context}`, result.error.flatten());
    throw new ApiValidationError(`Resposta inválida de ${context}`);
  }
  return result.data;
}
