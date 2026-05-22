import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock environment variables
vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test")
vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-key-for-testing-only")
vi.stubEnv("OPENAI_API_KEY", "test-openai-api-key")

// Mock user data
const mockUser = {
  id: "user-123",
  email: "test@example.com",
  name: "Test User",
  isAdmin: false,
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockSession = {
  user: mockUser,
  session: {
    id: "session-123",
    userId: mockUser.id,
    token: "test-token",
    expiresAt: new Date(Date.now() + 86400000),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}

// Mock parsed listing response from OpenAI
const mockParsedResponse = {
  titulo: "Casa 3 quartos no Campeche",
  endereco: "Campeche, Florianópolis - SC",
  bairro: "Campeche",
  cidade: "Florianópolis",
  m2Totais: 450,
  m2Privado: 180,
  quartos: 3,
  suites: 1,
  banheiros: 2,
  garagem: 2,
  preco: 1500000,
  piscina: true,
  porteiro24h: false,
  academia: false,
  vistaLivre: true,
  piscinaTermica: false,
  tipoImovel: "casa",
  condominiumName: "Residencial Campeche",
  contactName: "João Silva",
  contactNumber: "48996792216",
}

// Mock getServerSession
vi.mock("@/lib/auth-server", () => ({
  getServerSession: vi.fn(),
}))

// Mock OpenAI
const mockCreate = vi.fn()

class MockAPIError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = "APIError"
  }
}

class MockOpenAI {
  static APIError = MockAPIError
  
  chat = {
    completions: {
      create: mockCreate,
    },
  }
}

vi.mock("openai", () => ({
  default: MockOpenAI,
  OpenAI: MockOpenAI,
}))

let pdfParseImportCount = 0

vi.mock("pdf-parse", () => {
  pdfParseImportCount += 1
  return {
    PDFParse: class MockPDFParse {
      constructor(_opts: { data: Buffer }) {}
      async getText() {
        return { text: "Texto extraído do PDF com conteúdo suficiente para parsing." }
      }
    },
  }
})

vi.mock("@/lib/scrapingant", () => ({
  scrapeUrlToMarkdown: vi.fn(),
  ScrapingAntError: class ScrapingAntError extends Error {
    statusCode: number
    constructor(message: string, statusCode = 502) {
      super(message)
      this.name = "ScrapingAntError"
      this.statusCode = statusCode
    }
  },
}))

describe("Parse API - POST /api/parse", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    pdfParseImportCount = 0
    vi.stubEnv("OPENAI_API_KEY", "test-openai-api-key")
  })

  it("parses listing from URL without loading pdf-parse", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    const { scrapeUrlToMarkdown } = await import("@/lib/scrapingant")
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    vi.mocked(scrapeUrlToMarkdown).mockResolvedValue({
      markdown:
        "# Apartamento VivaReal\n\n3 quartos, 2 banheiros, 120m², R$ 850.000 em Florianópolis.",
      sourceUrl: "https://www.vivareal.com.br/imovel/test",
    })

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockParsedResponse) } }],
    })

    const { POST } = await import("./route")
    const request = new NextRequest("http://localhost/api/parse", {
      method: "POST",
      body: JSON.stringify({
        kind: "url",
        url: "https://www.vivareal.com.br/imovel/test",
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.listings).toHaveLength(1)
    expect(json.listings[0].link).toBe("https://www.vivareal.com.br/imovel/test")
    expect(scrapeUrlToMarkdown).toHaveBeenCalledWith(
      "https://www.vivareal.com.br/imovel/test"
    )
    expect(pdfParseImportCount).toBe(0)
  })

  it("returns 401 when not authenticated", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(null)

    const { POST } = await import("./route")
    const request = new NextRequest("http://localhost/api/parse", {
      method: "POST",
      body: JSON.stringify({ rawText: "Test listing text" }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(401)
    expect(json.error).toBe("Unauthorized")
  })

  it("returns 400 when rawText is missing", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    const { POST } = await import("./route")
    const request = new NextRequest("http://localhost/api/parse", {
      method: "POST",
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toContain("Invalid request")
  })

  it("returns 400 when rawText is empty", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    const { POST } = await import("./route")
    const request = new NextRequest("http://localhost/api/parse", {
      method: "POST",
      body: JSON.stringify({ rawText: "   " }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toBe("Raw text cannot be empty")
  })

  it("returns 503 when OPENAI_API_KEY is not configured", async () => {
    vi.stubEnv("OPENAI_API_KEY", "")
    
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    const { POST } = await import("./route")
    const request = new NextRequest("http://localhost/api/parse", {
      method: "POST",
      body: JSON.stringify({ rawText: "Test listing text" }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(503)
    expect(json.error).toBe("OpenAI API key not configured on server")
  })

  it("parses listing successfully", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify(mockParsedResponse),
          },
        },
      ],
    })

    const { POST } = await import("./route")
    const request = new NextRequest("http://localhost/api/parse", {
      method: "POST",
      body: JSON.stringify({
        rawText: `
          Casa linda no Campeche
          3 quartos, 1 suíte, 2 banheiros
          450m² totais, 180m² privativos
          2 vagas de garagem
          R$ 1.500.000
          Piscina e vista livre
          Contato: João Silva (48) 99679-2216
        `,
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.listings).toHaveLength(1)
    expect(json.listings[0].titulo).toBe("Casa 3 quartos no Campeche")
    expect(json.listings[0].endereco).toBe("Campeche, Florianópolis - SC")
    expect(json.listings[0].bairro).toBe("Campeche")
    expect(json.listings[0].cidade).toBe("Florianópolis")
    expect(json.listings[0].m2Totais).toBe(450)
    expect(json.listings[0].m2Privado).toBe(180)
    expect(json.listings[0].quartos).toBe(3)
    expect(json.listings[0].suites).toBe(1)
    expect(json.listings[0].banheiros).toBe(2)
    expect(json.listings[0].garagem).toBe(2)
    expect(json.listings[0].preco).toBe(1500000)
    expect(json.listings[0].piscina).toBe(true)
    expect(json.listings[0].vistaLivre).toBe(true)
    expect(json.listings[0].tipoImovel).toBe("casa")
    expect(json.listings[0].condominiumName).toBe("Residencial Campeche")
    expect(json.listings[0].contactName).toBe("João Silva")
    expect(json.listings[0].contactNumber).toBe("48996792216")
    expect(json.listings[0].addedAt).toBeDefined()
    expect(json.listings[0].precoM2).toBeNull() // Calculated in UI
    expect(json.listings[0].link).toBeNull() // Added manually
  })

  it("returns 500 when AI returns empty response", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: null,
          },
        },
      ],
    })

    const { POST } = await import("./route")
    const request = new NextRequest("http://localhost/api/parse", {
      method: "POST",
      body: JSON.stringify({ rawText: "Test listing" }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toBe("Empty response from AI")
  })

  it("returns 500 when AI returns invalid JSON", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: "This is not valid JSON",
          },
        },
      ],
    })

    const { POST } = await import("./route")
    const request = new NextRequest("http://localhost/api/parse", {
      method: "POST",
      body: JSON.stringify({ rawText: "Test listing" }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toBe("Invalid JSON response from AI")
  })

  it("handles missing fields gracefully with defaults", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    // Response with minimal data
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              titulo: null,
              endereco: null,
              quartos: 2,
              preco: 300000,
            }),
          },
        },
      ],
    })

    const { POST } = await import("./route")
    const request = new NextRequest("http://localhost/api/parse", {
      method: "POST",
      body: JSON.stringify({ rawText: "Apartamento 2 quartos" }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.listings).toHaveLength(1)
    expect(json.listings[0].titulo).toBe("Sem título")
    expect(json.listings[0].endereco).toBe("Endereço não informado")
    expect(json.listings[0].quartos).toBe(2)
  })

  it("returns 400 for invalid request body without kind or rawText", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    const { POST } = await import("./route")
    const request = new NextRequest("http://localhost/api/parse", {
      method: "POST",
      body: JSON.stringify({ kind: "url" }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toContain("Invalid request")
  })

  it("returns 400 for unsupported image mime type", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    const { POST } = await import("./route")
    const request = new NextRequest("http://localhost/api/parse", {
      method: "POST",
      body: JSON.stringify({
        kind: "image",
        base64: Buffer.from("fake").toString("base64"),
        mimeType: "image/gif",
      }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error).toContain("Unsupported image type")
  })

  it("parses listing with kind text", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockParsedResponse) } }],
    })

    const { POST } = await import("./route")
    const request = new NextRequest("http://localhost/api/parse", {
      method: "POST",
      body: JSON.stringify({ kind: "text", rawText: "Casa 3 quartos" }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.listings).toHaveLength(1)
    expect(json.listings[0].titulo).toBe("Casa 3 quartos no Campeche")
  })

  it("parses multiple listings when AI returns listings array", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              listings: [
                mockParsedResponse,
                {
                  titulo: "Apartamento Centro",
                  endereco: "Centro, Florianópolis - SC",
                  preco: 650000,
                  quartos: 2,
                  tipoImovel: "apartamento",
                },
              ],
            }),
          },
        },
      ],
    })

    const { POST } = await import("./route")
    const request = new NextRequest("http://localhost/api/parse", {
      method: "POST",
      body: JSON.stringify({ rawText: "Dois anúncios colados" }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.listings).toHaveLength(2)
    expect(json.listings[0].titulo).toBe("Casa 3 quartos no Campeche")
    expect(json.listings[1].titulo).toBe("Apartamento Centro")
    expect(json.listings[1].tipoImovel).toBe("apartamento")
  })

  it("returns 500 when AI returns empty listings array", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ listings: [] }) } }],
    })

    const { POST } = await import("./route")
    const request = new NextRequest("http://localhost/api/parse", {
      method: "POST",
      body: JSON.stringify({ rawText: "Test" }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error).toBe("Invalid JSON response from AI")
  })

  it("handles apartment type correctly", async () => {
    const { getServerSession } = await import("@/lib/auth-server")
    vi.mocked(getServerSession).mockResolvedValue(mockSession)

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              titulo: "Apartamento Centro",
              endereco: "Centro, São Paulo",
              tipoImovel: "apartamento",
              quartos: 2,
              preco: 500000,
            }),
          },
        },
      ],
    })

    const { POST } = await import("./route")
    const request = new NextRequest("http://localhost/api/parse", {
      method: "POST",
      body: JSON.stringify({ rawText: "Apartamento no centro" }),
    })

    const response = await POST(request)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.listings).toHaveLength(1)
    expect(json.listings[0].titulo).toBe("Apartamento Centro")
  })
})
