import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  toCollection,
  toImovel,
  toListingData,
  fetchCollections,
  fetchListings,
  createCollection,
  createListing,
  updateApiListing,
  deleteListing,
  parseListingWithAI,
  ApiError,
  ErrorCode,
  type ApiCollection,
  type ApiListing,
  type Imovel,
} from "./api"

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe("API Client", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("toCollection", () => {
    it("should convert API collection to frontend Collection format", () => {
      const apiCollection: ApiCollection = {
        id: "col-123",
        userId: "user-456",
        orgId: null,
        name: "Test Collection",
        isPublic: false,
        shareToken: null,
        isDefault: true,
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-02T00:00:00Z",
      }

      const result = toCollection(apiCollection)

      expect(result).toEqual({
        id: "col-123",
        label: "Test Collection",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-02T00:00:00Z",
        isDefault: true,
        isPublic: false,
        ownerName: undefined,
      })
    })
  })

  describe("toImovel", () => {
    it("should convert API listing to frontend Imovel format", () => {
      const apiListing: ApiListing = {
        id: "listing-123",
        collectionId: "col-456",
        data: {
          titulo: "Test Property",
          endereco: "Test Address",
          m2Totais: 100,
          m2Privado: 80,
          quartos: 3,
          suites: 1,
          banheiros: 2,
          garagem: 2,
          preco: 500000,
          precoM2: 5000,
          piscina: true,
          porteiro24h: false,
          academia: true,
          vistaLivre: false,
          piscinaTermica: null,
          link: "https://example.com",
          starred: true,
          addedAt: "2025-01-01",
        },
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-02T00:00:00Z",
      }

      const result = toImovel(apiListing)

      expect(result.id).toBe("listing-123")
      expect(result.titulo).toBe("Test Property")
      expect(result.endereco).toBe("Test Address")
      expect(result.preco).toBe(500000)
      expect(result.starred).toBe(true)
      expect(result.createdAt).toBe("2025-01-01T00:00:00Z")
    })
  })

  describe("toListingData", () => {
    it("should convert partial Imovel to ListingData format", () => {
      const imovel: Partial<Imovel> = {
        titulo: "Updated Title",
        preco: 600000,
        starred: true,
      }

      const result = toListingData(imovel)

      expect(result).toEqual({
        titulo: "Updated Title",
        preco: 600000,
        starred: true,
      })
    })

    it("should only include defined fields", () => {
      const imovel: Partial<Imovel> = {
        titulo: "Title",
      }

      const result = toListingData(imovel)

      expect(result).toEqual({ titulo: "Title" })
      expect(result).not.toHaveProperty("preco")
    })
  })

  describe("fetchCollections", () => {
    it("should fetch collections successfully", async () => {
      const mockCollections: ApiCollection[] = [
        {
          id: "col-1",
          userId: "user-1",
          orgId: null,
          name: "Collection 1",
          isPublic: false,
          shareToken: null,
          isDefault: true,
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:00:00Z",
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ collections: mockCollections }),
      })

      const result = await fetchCollections()

      expect(mockFetch).toHaveBeenCalledWith("/api/collections")
      expect(result).toHaveLength(1)
      expect(result[0].label).toBe("Collection 1")
    })

    it("should throw ApiError on failed fetch", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized", code: ErrorCode.UNAUTHORIZED }),
      })

      try {
        await fetchCollections()
        expect.fail("Should have thrown")
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).message).toBe("Unauthorized")
        expect((error as ApiError).status).toBe(401)
        expect((error as ApiError).code).toBe(ErrorCode.UNAUTHORIZED)
      }
    })
  })

  describe("createCollection", () => {
    it("should create collection successfully", async () => {
      const mockCollection: ApiCollection = {
        id: "col-new",
        userId: "user-1",
        orgId: null,
        name: "New Collection",
        isPublic: false,
        shareToken: null,
        isDefault: false,
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ collection: mockCollection }),
      })

      const result = await createCollection("New Collection", false)

      expect(mockFetch).toHaveBeenCalledWith("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Collection", isDefault: false }),
      })
      expect(result.label).toBe("New Collection")
    })
  })

  describe("fetchListings", () => {
    it("should fetch listings for a collection", async () => {
      const mockListings: ApiListing[] = [
        {
          id: "listing-1",
          collectionId: "col-1",
          data: {
            titulo: "Property 1",
            endereco: "Address 1",
            m2Totais: null,
            m2Privado: null,
            quartos: null,
            suites: null,
            banheiros: null,
            garagem: null,
            preco: 100000,
            precoM2: null,
            piscina: null,
            porteiro24h: null,
            academia: null,
            vistaLivre: null,
            piscinaTermica: null,
            link: null,
          },
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:00:00Z",
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ listings: mockListings }),
      })

      const result = await fetchListings("col-1")

      expect(mockFetch).toHaveBeenCalledWith("/api/collections/col-1/listings")
      expect(result).toHaveLength(1)
      expect(result[0].titulo).toBe("Property 1")
    })
  })

  describe("createListing", () => {
    it("should create listing successfully", async () => {
      const listingData = {
        titulo: "New Property",
        endereco: "New Address",
        m2Totais: null,
        m2Privado: null,
        quartos: null,
        suites: null,
        banheiros: null,
        garagem: null,
        preco: 200000,
        precoM2: null,
        piscina: null,
        porteiro24h: null,
        academia: null,
        vistaLivre: null,
        piscinaTermica: null,
        link: null,
      }

      const mockListing: ApiListing = {
        id: "listing-new",
        collectionId: "col-1",
        data: listingData,
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ listing: mockListing }),
      })

      const result = await createListing("col-1", listingData)

      expect(mockFetch).toHaveBeenCalledWith("/api/collections/col-1/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: listingData }),
      })
      expect(result.titulo).toBe("New Property")
    })
  })

  describe("updateApiListing", () => {
    it("should update listing successfully", async () => {
      const mockListing: ApiListing = {
        id: "listing-1",
        collectionId: "col-1",
        data: {
          titulo: "Updated Property",
          endereco: "Address",
          m2Totais: null,
          m2Privado: null,
          quartos: null,
          suites: null,
          banheiros: null,
          garagem: null,
          preco: 250000,
          precoM2: null,
          piscina: null,
          porteiro24h: null,
          academia: null,
          vistaLivre: null,
          piscinaTermica: null,
          link: null,
        },
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-02T00:00:00Z",
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ listing: mockListing }),
      })

      const result = await updateApiListing("col-1", "listing-1", { preco: 250000 })

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/collections/col-1/listings/listing-1",
        expect.objectContaining({
          method: "PUT",
        })
      )
      expect(result.preco).toBe(250000)
    })
  })

  describe("deleteListing", () => {
    it("should delete listing successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await deleteListing("col-1", "listing-1")

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/collections/col-1/listings/listing-1",
        { method: "DELETE" }
      )
    })
  })

  describe("parseListingWithAI", () => {
    it("should parse listing successfully", async () => {
      const mockData = {
        titulo: "Parsed Title",
        endereco: "Parsed Address",
        m2Totais: 150,
        m2Privado: 120,
        quartos: 3,
        suites: 1,
        banheiros: 2,
        garagem: 2,
        preco: 500000,
        precoM2: null,
        piscina: true,
        porteiro24h: false,
        academia: true,
        vistaLivre: false,
        piscinaTermica: null,
        link: null,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      })

      const result = await parseListingWithAI("Some raw listing text")

      expect(mockFetch).toHaveBeenCalledWith("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: "Some raw listing text" }),
      })
      expect(result.titulo).toBe("Parsed Title")
    })

    it("should throw ApiError for unauthorized user", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
      })

      try {
        await parseListingWithAI("text")
        expect.fail("Should have thrown")
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).message).toBe(
          "Você precisa estar logado para usar o parser de IA."
        )
        expect((error as ApiError).status).toBe(401)
        expect((error as ApiError).code).toBe(ErrorCode.UNAUTHORIZED)
      }
    })

    it("should throw ApiError for service unavailable", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: "Service unavailable" }),
      })

      try {
        await parseListingWithAI("text")
        expect.fail("Should have thrown")
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).message).toBe(
          "Serviço de IA não está disponível no momento."
        )
        expect((error as ApiError).status).toBe(503)
        expect((error as ApiError).code).toBe(ErrorCode.SERVICE_UNAVAILABLE)
      }
    })

    it("should throw ApiError for rate limiting", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: "Rate limited" }),
      })

      try {
        await parseListingWithAI("text")
        expect.fail("Should have thrown")
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).status).toBe(429)
        expect((error as ApiError).code).toBe(ErrorCode.RATE_LIMITED)
        expect((error as ApiError).isRetryable()).toBe(true)
      }
    })
  })
})
