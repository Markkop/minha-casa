/**
 * Langfuse helpers for Next.js dev paths (parse fallback when Phoenix proxy is off).
 * Production listing parse proxies to Phoenix, which uses the Elixir Langfuse client.
 */
import { LangfuseClient } from "@langfuse/client"

const DEFAULT_HOST = "http://localhost:3100"

type PromptRef = { name: string; version: number }

const promptCache = new Map<string, { expiresAt: number; prompt: string; ref: PromptRef }>()
const CACHE_TTL_MS = 60_000

function isEnabled(): boolean {
  return (
    process.env.LANGFUSE_ENABLED === "true" &&
    Boolean(process.env.LANGFUSE_PUBLIC_KEY?.trim()) &&
    Boolean(process.env.LANGFUSE_SECRET_KEY?.trim())
  )
}

function getClient(): LangfuseClient | null {
  if (!isEnabled()) return null

  return new LangfuseClient({
    publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
    secretKey: process.env.LANGFUSE_SECRET_KEY!,
    baseUrl:
      process.env.LANGFUSE_BASE_URL?.trim() ||
      process.env.LANGFUSE_HOST?.trim() ||
      DEFAULT_HOST,
  })
}

function compileTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value),
    template
  )
}

export async function getLangfusePrompt(
  name: string,
  vars: Record<string, string> = {},
  label = process.env.LANGFUSE_PROMPT_LABEL?.trim() || "production"
): Promise<{ text: string; ref: PromptRef }> {
  const cacheKey = `${name}:${label}:${JSON.stringify(vars)}`
  const cached = promptCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return { text: cached.prompt, ref: cached.ref }
  }

  const client = getClient()
  if (!client) {
    throw new Error("LANGFUSE_NOT_CONFIGURED")
  }

  const prompt = await client.prompt.get(name, { label })
  const text = compileTemplate(prompt.prompt, vars)

  const ref = { name, version: prompt.version }
  promptCache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, prompt: text, ref })
  return { text, ref }
}

export type LangfuseTraceContext = {
  traceId: string
  name: string
  promptRef?: PromptRef
}
