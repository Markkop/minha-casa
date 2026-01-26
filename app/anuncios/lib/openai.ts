import { generateId, type Imovel } from "./storage"

// ============================================================================
// SERVER-SIDE PARSING API (calls /api/parse)
// ============================================================================

interface ParseApiResponse {
  data?: {
    titulo: string
    endereco: string
    m2Totais: number | null
    m2Privado: number | null
    quartos: number | null
    suites: number | null
    banheiros: number | null
    garagem: number | null
    preco: number | null
    precoM2: number | null
    piscina: boolean | null
    porteiro24h: boolean | null
    academia: boolean | null
    vistaLivre: boolean | null
    piscinaTermica: boolean | null
    link: string | null
    contactName?: string | null
    contactNumber?: string | null
    addedAt?: string
  }
  error?: string
}

/**
 * Parse a listing using the server-side AI parsing API.
 * This calls /api/parse which uses the server-configured OpenAI API key.
 */
export async function parseListingWithAI(rawText: string): Promise<Imovel> {
  const response = await fetch("/api/parse", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rawText }),
  })

  const result: ParseApiResponse = await response.json()

  if (!response.ok) {
    // Map server error messages to user-friendly Portuguese messages
    const errorMessage = result.error || "Erro desconhecido"
    
    if (response.status === 401) {
      throw new Error("Você precisa estar logado para usar o parser de IA.")
    }
    if (response.status === 503) {
      throw new Error("Serviço de IA não está disponível no momento.")
    }
    if (response.status === 429) {
      throw new Error("Limite de requisições excedido. Tente novamente mais tarde.")
    }
    
    throw new Error(errorMessage)
  }

  if (!result.data) {
    throw new Error("Resposta inválida do servidor")
  }

  // Build the Imovel object from the API response
  const imovel: Imovel = {
    id: generateId(),
    titulo: result.data.titulo,
    endereco: result.data.endereco,
    m2Totais: result.data.m2Totais,
    m2Privado: result.data.m2Privado,
    quartos: result.data.quartos,
    suites: result.data.suites,
    banheiros: result.data.banheiros,
    garagem: result.data.garagem,
    preco: result.data.preco,
    precoM2: result.data.precoM2,
    piscina: result.data.piscina,
    porteiro24h: result.data.porteiro24h,
    academia: result.data.academia,
    vistaLivre: result.data.vistaLivre,
    piscinaTermica: result.data.piscinaTermica,
    contactName: result.data.contactName,
    contactNumber: result.data.contactNumber,
    link: result.data.link,
    createdAt: new Date().toISOString(),
    addedAt: result.data.addedAt || new Date().toISOString().split("T")[0],
  }

  return imovel
}

// ============================================================================
// API AVAILABILITY CHECK
// ============================================================================

/**
 * Check if the server-side parsing API is available.
 * Since the API key is managed server-side, this always returns true
 * for authenticated users - actual availability is checked when parsing.
 */
export function isParsingAvailable(): boolean {
  // Server-side API handles the key, so parsing is available for logged-in users
  return true
}

