export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_PDF_BYTES = 10 * 1024 * 1024
export const MAX_FILE_BYTES = 10 * 1024 * 1024

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

export type AcceptedImageMimeType = (typeof ACCEPTED_IMAGE_TYPES)[number]

export type ParseInputKind = "text" | "image" | "pdf" | "url"

export type ParseRequest =
  | { kind: "text"; rawText: string }
  | { kind: "image"; base64: string; mimeType: AcceptedImageMimeType }
  | { kind: "pdf"; base64: string }
  | { kind: "url"; url: string }
