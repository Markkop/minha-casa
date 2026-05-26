import OpenAI from "openai"

const DEFAULT_MODEL = "gpt-5.4-mini"
const DEFAULT_REASONING_EFFORT = "low" as const

type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh"

export function getOpenAIModel(): string {
  return (
    process.env.OPENAI_MODEL?.trim() ||
    process.env.PROPERTY_AGENT_CHAT_MODEL?.trim() ||
    DEFAULT_MODEL
  )
}

export function getOpenAIReasoningEffort(): ReasoningEffort {
  const raw = process.env.OPENAI_REASONING_EFFORT?.trim() as
    | ReasoningEffort
    | undefined
  return raw || DEFAULT_REASONING_EFFORT
}

type JsonSchemaFormat = {
  type: "json_schema"
  name: string
  strict: true
  schema: Record<string, unknown>
}

type TextFormat = { type: "json_object" } | JsonSchemaFormat

export type ResponsesJsonOptions = {
  instructions: string
  input: string
  maxOutputTokens?: number
  reasoningEffort?: ReasoningEffort
  timeoutMs?: number
  schema?: { name: string; schema: Record<string, unknown> }
}

function textFormat(schema?: ResponsesJsonOptions["schema"]): TextFormat {
  if (schema) {
    return {
      type: "json_schema",
      name: schema.name,
      strict: true,
      schema: schema.schema,
    }
  }
  return { type: "json_object" }
}

export async function responsesJson<T extends Record<string, unknown>>(
  openai: OpenAI,
  opts: ResponsesJsonOptions
): Promise<T> {
  const response = await openai.responses.create(
    {
      model: getOpenAIModel(),
      instructions: opts.instructions,
      input: opts.input,
      store: false,
      reasoning: { effort: opts.reasoningEffort ?? getOpenAIReasoningEffort() },
      max_output_tokens: opts.maxOutputTokens ?? 2500,
      text: { format: textFormat(opts.schema) },
    },
    opts.timeoutMs ? { timeout: opts.timeoutMs } : undefined
  )

  if (response.status === "incomplete") {
    throw new Error("EMPTY_AI_RESPONSE")
  }

  const raw = response.output_text
  if (!raw?.trim()) {
    throw new Error("EMPTY_AI_RESPONSE")
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    throw new Error("INVALID_AI_JSON")
  }
}

export type ResponsesVisionJsonOptions = ResponsesJsonOptions & {
  imageDataUrl: string
  userText: string
}

export async function responsesVisionJson<T extends Record<string, unknown>>(
  openai: OpenAI,
  opts: ResponsesVisionJsonOptions
): Promise<T> {
  const response = await openai.responses.create(
    {
      model: getOpenAIModel(),
      instructions: opts.instructions,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: opts.userText },
            {
              type: "input_image",
              image_url: opts.imageDataUrl,
              detail: "auto",
            },
          ],
        },
      ],
      store: false,
      reasoning: { effort: opts.reasoningEffort ?? getOpenAIReasoningEffort() },
      max_output_tokens: opts.maxOutputTokens ?? 2500,
      text: { format: textFormat(opts.schema) },
    },
    opts.timeoutMs ? { timeout: opts.timeoutMs } : undefined
  )

  if (response.status === "incomplete") {
    throw new Error("EMPTY_AI_RESPONSE")
  }

  const raw = response.output_text
  if (!raw?.trim()) {
    throw new Error("EMPTY_AI_RESPONSE")
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    throw new Error("INVALID_AI_JSON")
  }
}
