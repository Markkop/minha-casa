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
  garagem: number | null
  preco: number | null
  piscina: boolean | null
  porteiro24h: boolean | null
  academia: boolean | null
  vistaLivre: boolean | null
  piscinaTermica: boolean | null
  tipoImovel: "casa" | "apartamento" | null
  contactName: string | null
  contactNumber: string | null
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
8. **garagem**: Número de vagas de garagem
9. **preco**: Preço do imóvel em reais (apenas números, sem formatação)
10. **piscina**: Se o imóvel possui piscina (true/false)
11. **porteiro24h**: Se o imóvel possui porteiro 24 horas (true/false)
12. **academia**: Se o imóvel possui academia (true/false)
13. **vistaLivre**: Se o imóvel possui vista livre (true/false)
14. **piscinaTermica**: Se o imóvel possui piscina térmica (true/false)
15. **tipoImovel**: Tipo do imóvel ("casa" ou "apartamento")
16. **contactName**: Nome do contato/corretor (se mencionado no anúncio)
17. **contactNumber**: Número de telefone/WhatsApp do contato (formato: apenas dígitos, ex: "48996792216" para (48) 99679-2216)

Regras:
- Retorne SEMPRE um JSON válido
- Use null para campos não encontrados
- Para números, retorne apenas o valor numérico (sem R$, m², etc.)
- Para preço, considere valores como "1.500.000" ou "1500000" ou "1,5 milhão"
- Para m², considere variações como "150m²", "150 metros", "150 m2"
- Para quartos, considere "3 quartos", "3 dorms", "3 dormitórios"
- Para suítes, diferencie de quartos quando possível
- Para garagem, considere "X vagas", "garagem para X carros", "X vaga de garagem", "X vagas de garagem"
- Piscina: procure por "piscina", "área de lazer com piscina", etc.
- Porteiro 24h: procure por "porteiro 24h", "porteiro 24 horas", "portaria 24h", "portaria 24 horas", "vigilância 24h"
- Academia: procure por "academia", "academia de ginástica", "sala de ginástica", "fitness"
- Vista livre: procure por "vista livre", "vista desimpedida", "sem prédios na frente", "vista panorâmica"
- Piscina térmica: procure por "piscina térmica", "piscina aquecida", "piscina com aquecimento"
- tipoImovel: infira se é "casa" ou "apartamento" baseado em palavras-chave:
  - "casa": casa, sobrado, residência, terreno com casa, chalé
  - "apartamento": apartamento, apto, ap., flat, studio, kitnet, cobertura, loft
  - Se não for possível determinar, use null
- Contact Name: procure por nomes de corretores, imobiliárias, ou contatos mencionados (ex: "Fale com João", "Contato: Maria Silva")
- Contact Number: procure por números de telefone ou WhatsApp mencionados no anúncio. Normalize removendo espaços, parênteses, hífens e outros caracteres não numéricos. Mantenha apenas os dígitos (ex: "(48) 99679-2216" vira "48996792216", "+55 48 99679-2216" vira "48996792216"). Se o número já começar com 55, remova esse prefixo pois será adicionado automaticamente na URL do WhatsApp.

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
  "garagem": 2,
  "preco": 1500000,
  "piscina": true,
  "porteiro24h": true,
  "academia": false,
  "vistaLivre": true,
  "piscinaTermica": false,
  "tipoImovel": "casa",
  "contactName": "João Silva",
  "contactNumber": "48996792216"
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
    garagem: parsed.garagem,
    preco: parsed.preco,
    precoM2: null, // Calculated dynamically in UI
    piscina: parsed.piscina,
    porteiro24h: parsed.porteiro24h,
    academia: parsed.academia,
    vistaLivre: parsed.vistaLivre,
    piscinaTermica: parsed.piscinaTermica,
    tipoImovel: parsed.tipoImovel,
    contactName: parsed.contactName,
    contactNumber: parsed.contactNumber,
    link: null, // User must add link manually via edit modal
    createdAt: new Date().toISOString(),
    addedAt: new Date().toISOString().split('T')[0], // "2025-12-31" format
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

