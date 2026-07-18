import type { AcceptedImageMimeType, ParseRequest } from "./parse-input-types"
import {
  MAX_FILE_BYTES,
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  ACCEPTED_IMAGE_TYPES,
} from "./parse-input-types"

export type { ParseInputKind, ParseRequest, AcceptedImageMimeType } from "./parse-input-types"
export {
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  MAX_FILE_BYTES,
  ACCEPTED_IMAGE_TYPES,
} from "./parse-input-types"

export function validateFileSize(file: File, maxBytes: number): void {
  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024))
    throw new Error(`Arquivo muito grande. O limite é ${maxMb} MB.`)
  }
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== "string") {
        reject(new Error("Erro ao ler o arquivo"))
        return
      }
      const base64 = result.includes(",") ? result.split(",")[1] : result
      resolve(base64)
    }
    reader.onerror = () => reject(new Error("Erro ao ler o arquivo"))
    reader.readAsDataURL(file)
  })
}

export function readClipboardFile(event: ClipboardEvent): File | null {
  const items = event.clipboardData?.items
  if (!items) return null

  for (const item of items) {
    if (item.kind === "file") {
      const file = item.getAsFile()
      if (file) return file
    }
  }
  return null
}

function isAcceptedImageType(mimeType: string): mimeType is AcceptedImageMimeType {
  return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(mimeType)
}

export async function buildParseRequestFromFile(file: File): Promise<ParseRequest> {
  validateFileSize(file, MAX_FILE_BYTES)

  if (file.type.startsWith("image/")) {
    if (!isAcceptedImageType(file.type)) {
      throw new Error("Imagem não suportada. Use JPEG, PNG ou WebP.")
    }
    validateFileSize(file, MAX_IMAGE_BYTES)
    const base64 = await fileToBase64(file)
    return { kind: "image", base64, mimeType: file.type }
  }

  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    validateFileSize(file, MAX_PDF_BYTES)
    const base64 = await fileToBase64(file)
    return { kind: "pdf", base64 }
  }

  throw new Error(
    "Formato de arquivo ainda não suportado. Cole texto, imagem ou PDF."
  )
}

/** @deprecated Use buildParseRequestFromFile */
export async function buildImageParseRequest(file: File): Promise<ParseRequest> {
  return buildParseRequestFromFile(file)
}

/** @deprecated Use buildParseRequestFromFile */
export async function buildPdfParseRequest(file: File): Promise<ParseRequest> {
  return buildParseRequestFromFile(file)
}
