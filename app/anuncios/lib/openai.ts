import OpenAI from "openai"
import { getApiKey, generateId, type Imovel } from "./storage"

// ============================================================================
// PARSING RESPONSE TYPE
// ============================================================================

interface ParsedImovelData {
  titulo: string
  endereco: string
  m2Totais: number | null
  m2Privado: number | null
  quartos: number | null
  suites: number | null
  banheiros: number | null
  preco: number | null
  piscina: boolean | null
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const SYSTEM_PROMPT = `Você é um especialista em extrair dados estruturados de anúncios de imóveis brasileiros.

Dado um texto de anúncio de imóvel (pode vir de sites como ZAP, OLX, VivaReal, QuintoAndar, etc.), extraia os seguintes dados:

1. **titulo**: Título ou descrição principal do imóvel
2. **endereco**: Endereço completo ou localização (bairro, cidade)
3. **m2Totais**: Área total do imóvel em metros quadrados (pode aparecer como "área total", "terreno", etc.)
4. **m2Privado**: Área privativa/útil em metros quadrados (pode aparecer como "área útil", "área privativa", etc.)
5. **quartos**: Número de quartos/dormitórios
6. **suites**: Número de suítes
7. **banheiros**: Número de banheiros
8. **preco**: Preço do imóvel em reais (apenas números, sem formatação)
9. **piscina**: Se o imóvel possui piscina (true/false)

Regras:
- Retorne SEMPRE um JSON válido
- Use null para campos não encontrados
- Para números, retorne apenas o valor numérico (sem R$, m², etc.)
- Para preço, considere valores como "1.500.000" ou "1500000" ou "1,5 milhão"
- Para m², considere variações como "150m²", "150 metros", "150 m2"
- Para quartos, considere "3 quartos", "3 dorms", "3 dormitórios"
- Para suítes, diferencie de quartos quando possível
- Piscina: procure por "piscina", "área de lazer com piscina", etc.

Responda APENAS com o JSON, sem explicações adicionais.

Exemplo de resposta:
{
  "titulo": "Casa 3 quartos no Campeche",
  "endereco": "Campeche, Florianópolis - SC",
  "m2Totais": 450,
  "m2Privado": 180,
  "quartos": 3,
  "suites": 1,
  "banheiros": 2,
  "preco": 1500000,
  "piscina": true
}`

// ============================================================================
// PARSE FUNCTION
// ============================================================================

export async function parseListingWithAI(rawText: string): Promise<Imovel> {
  const apiKey = getApiKey()
  
  if (!apiKey) {
    throw new Error("API key não configurada. Configure sua chave OpenAI nas configurações.")
  }

  const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true, // Required for client-side usage
  })

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: rawText },
    ],
    temperature: 0.1,
    max_tokens: 500,
    response_format: { type: "json_object" },
  })

  const content = response.choices[0]?.message?.content
  
  if (!content) {
    throw new Error("Resposta vazia da IA")
  }

  let parsed: ParsedImovelData
  try {
    parsed = JSON.parse(content) as ParsedImovelData
  } catch {
    throw new Error("Erro ao processar resposta da IA: JSON inválido")
  }

  // Build the Imovel object with calculated precoM2
  const imovel: Imovel = {
    id: generateId(),
    titulo: parsed.titulo || "Sem título",
    endereco: parsed.endereco || "Endereço não informado",
    m2Totais: parsed.m2Totais,
    m2Privado: parsed.m2Privado,
    quartos: parsed.quartos,
    suites: parsed.suites,
    banheiros: parsed.banheiros,
    preco: parsed.preco,
    precoM2: null, // Calculated dynamically in UI
    piscina: parsed.piscina,
    createdAt: new Date().toISOString(),
  }

  return imovel
}

// ============================================================================
// VALIDATE API KEY
// ============================================================================

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    })

    // Simple test call
    await openai.models.list()
    return true
  } catch {
    return false
  }
}

