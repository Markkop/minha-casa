import { api } from "$lib/api/client";

export interface SavedLink {
  id: string;
  userId: string | null;
  orgId: string | null;
  title: string;
  url: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  userId: string | null;
  orgId: string | null;
  name: string | null;
  phone: string | null;
  normalizedPhone: string | null;
  email: string | null;
  notes: string | null;
  source: "manual" | "listing";
  listings?: { id: string; title: string | null }[];
  createdAt: string;
  updatedAt: string;
}

export interface Region {
  id: string;
  userId: string | null;
  orgId: string | null;
  city: string;
  neighborhood: string;
  propertyType: "casa" | "apartamento";
  pricePerM2: number;
  notes: string | null;
  listingCount?: number;
  favoriteAveragePricePerM2?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Condominium {
  id: string;
  userId: string | null;
  orgId: string | null;
  name: string;
  city: string | null;
  neighborhood: string | null;
  address: string | null;
  propertyType: "casa" | "apartamento" | null;
  amenities: string[];
  notes: string | null;
  source: "manual" | "listing";
  listingCount?: number;
  listings?: { id: string; title: string | null }[];
  createdAt: string;
  updatedAt: string;
}

export interface ComparisonNote {
  id: string;
  listingId: string;
  pros: string[];
  cons: string[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListingData {
  titulo?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  tipoImovel?: "casa" | "apartamento" | string;
  quartos?: number | null;
  suites?: number | null;
  banheiros?: number | null;
  garagem?: number | null;
  preco?: number | null;
  m2Totais?: number | null;
  m2Privado?: number | null;
  link?: string;
  corretor?: string;
  telefone?: string;
  condominioNome?: string;
  observacoes?: string;
  starred?: boolean;
  strikethrough?: boolean;
  addedAt?: string;
  [key: string]: unknown;
}

export interface Collection {
  id: string;
  userId: string | null;
  orgId: string | null;
  name: string;
  isPublic: boolean;
  shareToken: string | null;
  isDefault: boolean;
  listingsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Listing {
  id: string;
  collectionId: string;
  data: ListingData;
  createdAt: string;
  updatedAt: string;
}

export type WhatsAppStatus =
  | { linked: false }
  | { linked: true; linkedAt: string; waId: string; phone: string | null };

export type TelegramStatus =
  | { linked: false }
  | { linked: true; linkedAt: string; chatId: string; telegramUserId: string | null };

export type ListingAnalysisStatus = "queued" | "running" | "completed" | "failed";

export interface ListingAnalysis {
  id: string;
  listingId: string;
  workflowRunId: string | null;
  status: ListingAnalysisStatus;
  input: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  insertedAt: string;
  updatedAt: string;
}

export const PORTALS = ["zap", "vivareal", "olx", "chavesnamao", "imovelweb"] as const;
export type Portal = (typeof PORTALS)[number];

export interface PortalFilterSet {
  transacao: "venda" | "aluguel";
  uf: string;
  cidade: string;
  bairros: string[];
  tiposImovel: string[];
  quartos: number[];
  banheiros: number[];
  vagas: number[];
  suites: number[];
  precoMin: number | null;
  precoMax: number | null;
  areaMin: number | null;
  areaMax: number | null;
  condominioMax: number | null;
  amenidades: string[];
  estagio: string[];
}

export interface PortalSearch {
  id: string;
  name: string;
  filterSet: PortalFilterSet;
  enabledPortals: Portal[];
  maxPages: number;
  lastRunId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortalSearchRun {
  id: string;
  portalSearchId: string;
  status: "queued" | "running" | "completed" | "failed";
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
  totals: Record<string, unknown> | null;
  traceId?: string | null;
  refresh?: boolean;
}

export interface PortalSearchTarget {
  id: string;
  portal: string;
  bairroSlug: string | null;
  page: number | null;
  url: string | null;
  status: string;
  cardsCount: number | null;
  cacheHit: boolean | null;
  error: string | null;
}

export interface ShortListing {
  id: string;
  portal: Portal;
  sourceUrl: string;
  title: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  tipoImovel: string | null;
  quartos: number | null;
  banheiros: number | null;
  vagas: number | null;
  suites: number | null;
  areaTotal: number | null;
  areaPrivada: number | null;
  preco: number | null;
  precoCondominio: number | null;
  precoM2: number | null;
  amenidades: string[];
  thumbnailUrl: string | null;
  postedAt: string | null;
  rank?: number | null;
  cacheOrigin?: string | null;
}

export interface SharedCollection {
  success: true;
  collection: Pick<Collection, "id" | "name" | "createdAt" | "updatedAt">;
  listings: Listing[];
  metadata: {
    totalListings: number;
  };
}

export type OrganizationRole = "owner" | "admin" | "member";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  role: OrganizationRole;
  userRole: OrganizationRole;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  collectionsCount: number;
  listingsCount: number;
}

export interface OrganizationMember {
  id: string;
  userId: string;
  role: OrganizationRole;
  joinedAt: string;
  userName: string;
  userEmail: string;
  userImage: string | null;
}

export const workspaceApi = {
  fetchOrganizations: () => api.get<{ organizations: Organization[] }>("/organizations"),
  createOrganization: (input: { name: string; slug?: string }) =>
    api.post<{ organization: Organization }>("/organizations", input),
  updateOrganization: (id: string, input: { name: string }) =>
    api.put<{ organization: Organization }>(`/organizations/${id}`, input),
  deleteOrganization: (id: string) => api.delete<{ success: true }>(`/organizations/${id}`),
  fetchOrganizationMembers: (id: string) => api.get<{ members: OrganizationMember[] }>(`/organizations/${id}/members`),
  addOrganizationMember: (id: string, input: { email: string; role: OrganizationRole }) =>
    api.post<{ member: OrganizationMember }>(`/organizations/${id}/members`, input),
  updateOrganizationMember: (id: string, userId: string, input: { role: OrganizationRole }) =>
    api.put<{ member: OrganizationMember }>(`/organizations/${id}/members/${userId}`, input),
  removeOrganizationMember: (id: string, userId: string) =>
    api.delete<{ success: true }>(`/organizations/${id}/members/${userId}`),

  fetchCollections: () => api.get<{ collections: Collection[] }>("/collections"),
  createCollection: (input: { name: string; isDefault?: boolean }) =>
    api.post<{ collection: Collection }>("/collections", input),
  updateCollection: (id: string, input: { name?: string; isDefault?: boolean; isPublic?: boolean }) =>
    api.put<{ collection: Collection }>(`/collections/${id}`, input),
  deleteCollection: (id: string) => api.delete<{ success: true }>(`/collections/${id}`),
  shareCollection: (id: string) => api.post<{ collection: Collection; shareUrl: string }>(`/collections/${id}/share`, {}),
  revokeCollectionShare: (id: string) => api.delete<{ collection: Collection; success: true }>(`/collections/${id}/share`),
  fetchListings: (collectionId: string) => api.get<{ listings: Listing[] }>(`/collections/${collectionId}/listings`),
  createListing: (collectionId: string, data: ListingData) =>
    api.post<{ listing: Listing }>(`/collections/${collectionId}/listings`, { data }),
  updateListing: (collectionId: string, listingId: string, data: Partial<ListingData>) =>
    api.put<{ listing: Listing }>(`/collections/${collectionId}/listings/${listingId}`, { data }),
  deleteListing: (collectionId: string, listingId: string) =>
    api.delete<{ success: true }>(`/collections/${collectionId}/listings/${listingId}`),

  fetchWhatsAppStatus: () => api.get<WhatsAppStatus>("/whatsapp/status"),
  linkWhatsApp: (code: string) => api.post<{ ok: true; linkedAt: string; waId: string }>("/whatsapp/link", { code }),
  fetchTelegramStatus: () => api.get<TelegramStatus>("/telegram/status"),
  linkTelegram: (code: string) =>
    api.post<{ ok: true; linkedAt: string; chatId: string; telegramUserId?: string }>("/telegram/link", { code }),

  fetchLatestListingAnalysis: (listingId: string) =>
    api.get<{ analysis: ListingAnalysis | null }>(`/listings/${listingId}/analyses/latest`),
  fetchPropertyAnalysis: (analysisId: string) =>
    api.get<{ analysis: ListingAnalysis; workflow: unknown }>(`/property-analyses/${analysisId}`),
  startListingAnalysis: (
    listingId: string,
    input?: { addressOverride?: string; collectionId?: string; force?: boolean }
  ) =>
    api.post<{ analysis: ListingAnalysis }>("/property-analyses", {
      listingId,
      addressOverride: input?.addressOverride,
      collectionId: input?.collectionId,
      force: input?.force ?? true
    }),
  retryAnalysisStep: (analysisId: string, step: string) =>
    api.post<{ analysis: ListingAnalysis }>(`/property-analyses/${analysisId}/steps/${step}/retry`, {}),

  fetchPortalSearches: () => api.get<{ searches: PortalSearch[] }>("/portal-searches"),
  createPortalSearch: (input: {
    name: string;
    filterSet: PortalFilterSet;
    enabledPortals: Portal[];
    maxPages?: number;
  }) => api.post<{ search: PortalSearch }>("/portal-searches", input),
  updatePortalSearch: (
    id: string,
    input: {
      name?: string;
      filterSet?: PortalFilterSet;
      enabledPortals?: Portal[];
      maxPages?: number;
    }
  ) => api.patch<{ search: PortalSearch }>(`/portal-searches/${id}`, input),
  fetchPortalSearch: (id: string) =>
    api.get<{ search: PortalSearch; latestRun?: PortalSearchRun }>(`/portal-searches/${id}`),
  startPortalSearchRun: (id: string, input?: { refresh?: boolean }) =>
    api.post<{ run: PortalSearchRun }>(`/portal-searches/${id}/runs`, input ?? {}),
  fetchPortalSearchRun: (searchId: string, runId: string) =>
    api.get<{ run: PortalSearchRun; targets: PortalSearchTarget[] }>(`/portal-searches/${searchId}/runs/${runId}`),
  fetchPortalSearchCards: (searchId: string, runId: string) =>
    api.get<{ cards: ShortListing[] }>(`/portal-searches/${searchId}/runs/${runId}/cards`),
  fetchPortalSearchCost: (searchId: string, runId: string) =>
    api.get<{ cost: Record<string, unknown> }>(`/portal-searches/${searchId}/runs/${runId}/cost`),

  fetchSharedCollection: (token: string) =>
    api.get<SharedCollection>(`/shared/${encodeURIComponent(token)}`, { auth: false }),

  fetchSavedLinks: () => api.get<{ links: SavedLink[] }>("/workspace/saved-links"),
  createSavedLink: (input: { title?: string; url: string; description?: string | null }) =>
    api.post<{ link: SavedLink }>("/workspace/saved-links", input),
  updateSavedLink: (id: string, input: { title: string; url: string; description?: string | null }) =>
    api.put<{ link: SavedLink }>(`/workspace/saved-links/${id}`, input),
  deleteSavedLink: (id: string) => api.delete<{ success: true }>(`/workspace/saved-links/${id}`),
  enrichSavedLink: (id: string) => api.post<{ link: SavedLink }>(`/workspace/saved-links/${id}/enrich`, {}),

  fetchContacts: () => api.get<{ contacts: Contact[] }>("/workspace/contacts"),
  saveContact: (input: Partial<Contact>, id?: string) =>
    id
      ? api.put<{ contact: Contact }>(`/workspace/contacts/${id}`, input)
      : api.post<{ contact: Contact }>("/workspace/contacts", input),
  deleteContact: (id: string) => api.delete<{ success: true }>(`/workspace/contacts/${id}`),

  fetchRegions: () => api.get<{ regions: Region[] }>("/workspace/regions"),
  saveRegion: (input: Partial<Region>, id?: string) =>
    id
      ? api.put<{ region: Region }>(`/workspace/regions/${id}`, input)
      : api.post<{ region: Region }>("/workspace/regions", input),
  deleteRegion: (id: string) => api.delete<{ success: true }>(`/workspace/regions/${id}`),

  fetchCondominiums: () => api.get<{ condominiums: Condominium[] }>("/workspace/condominiums"),
  saveCondominium: (input: Partial<Condominium>, id?: string) =>
    id
      ? api.put<{ condominium: Condominium }>(`/workspace/condominiums/${id}`, input)
      : api.post<{ condominium: Condominium }>("/workspace/condominiums", input),
  deleteCondominium: (id: string) => api.delete<{ success: true }>(`/workspace/condominiums/${id}`),

  fetchComparisonNotes: () => api.get<{ notes: ComparisonNote[] }>("/workspace/comparison-notes"),
  saveComparisonNote: (input: Pick<ComparisonNote, "listingId" | "pros" | "cons"> & { notes?: string | null }) =>
    api.post<{ note: ComparisonNote }>("/workspace/comparison-notes", input)
};
