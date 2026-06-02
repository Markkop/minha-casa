import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uuid,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// ============================================================================
// Users (BetterAuth compatible — IDs are UUID in DB; string in app/TS)
// ============================================================================
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    name: text("name").notNull(),
    image: text("image"),
    isAdmin: boolean("is_admin").default(false).notNull(),
    stripeCustomerId: text("stripe_customer_id"), // Stripe customer ID for reuse across subscriptions
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("users_email_idx").on(table.email),
  ]
)

// ============================================================================
// Accounts (BetterAuth - for OAuth providers, stores password hash for email/password)
// ============================================================================
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(), // "credential" for email/password
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"), // Hashed password for credential provider
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("accounts_user_id_idx").on(table.userId),
    uniqueIndex("accounts_provider_account_idx").on(table.providerId, table.accountId),
  ]
)

// ============================================================================
// Sessions (BetterAuth)
// ============================================================================
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    uniqueIndex("sessions_token_idx").on(table.token),
  ]
)

// ============================================================================
// Verification Tokens (BetterAuth - for email verification, password reset)
// ============================================================================
export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(), // email address
    value: text("value").notNull(), // verification token
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("verifications_identifier_idx").on(table.identifier),
  ]
)

// ============================================================================
// JWKS (Better Auth JWT plugin — signing keys for /api/auth/token and /api/auth/jwks)
// ============================================================================
export const jwks = pgTable("jwks", {
  id: text("id").primaryKey(),
  publicKey: text("public_key").notNull(),
  privateKey: text("private_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  alg: text("alg"),
  crv: text("crv"),
})

// ============================================================================
// Plans
// ============================================================================
export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(), // "Teste", "Plus"
  slug: text("slug").notNull().unique(), // "teste", "plus"
  description: text("description"),
  priceInCents: integer("price_in_cents").notNull().default(0), // Price in BRL cents
  isActive: boolean("is_active").default(true).notNull(),
  stripePriceId: text("stripe_price_id"), // Stripe Price ID for checkout
  limits: jsonb("limits").$type<PlanLimits>().default({
    collectionsLimit: null,
    listingsPerCollection: null,
    aiParsesPerMonth: null,
    canShare: true,
    canCreateOrg: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

export interface PlanLimits {
  collectionsLimit: number | null
  listingsPerCollection: number | null
  aiParsesPerMonth: number | null
  canShare: boolean
  canCreateOrg: boolean
}

// ============================================================================
// Subscriptions
// ============================================================================
export const subscriptionStatusEnum = ["active", "expired", "cancelled"] as const
export type SubscriptionStatus = (typeof subscriptionStatusEnum)[number]

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "restrict" }),
    status: text("status").$type<SubscriptionStatus>().notNull().default("active"),
    startsAt: timestamp("starts_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    grantedBy: uuid("granted_by").references(() => users.id, { onDelete: "set null" }),
    notes: text("notes"),
    // Stripe fields (nullable for manual grants)
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    stripeStatus: text("stripe_status"), // Raw Stripe status for debugging
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
    lastPaymentFailedAt: timestamp("last_payment_failed_at", { withTimezone: true }), // Track payment failures
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("subscriptions_user_id_idx").on(table.userId),
    index("subscriptions_status_idx").on(table.status),
    index("subscriptions_stripe_sub_id_idx").on(table.stripeSubscriptionId),
    index("subscriptions_stripe_customer_id_idx").on(table.stripeCustomerId),
  ]
)

// ============================================================================
// Organizations
// ============================================================================
export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("organizations_slug_idx").on(table.slug),
    index("organizations_owner_id_idx").on(table.ownerId),
  ]
)

// ============================================================================
// Organization Members
// ============================================================================
export const orgMemberRoleEnum = ["owner", "admin", "member"] as const
export type OrgMemberRole = (typeof orgMemberRoleEnum)[number]

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").$type<OrgMemberRole>().notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("organization_members_org_user_idx").on(table.orgId, table.userId),
    index("organization_members_user_id_idx").on(table.userId),
  ]
)

// ============================================================================
// Collections
// ============================================================================
export const collections = pgTable(
  "collections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    isPublic: boolean("is_public").default(false).notNull(),
    shareToken: text("share_token").unique(),
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("collections_user_id_idx").on(table.userId),
    index("collections_org_id_idx").on(table.orgId),
    uniqueIndex("collections_share_token_idx").on(table.shareToken),
  ]
)

// ============================================================================
// Processed Webhook Events (for idempotency)
// ============================================================================
export const processedWebhookEvents = pgTable(
  "processed_webhook_events",
  {
    id: text("id").primaryKey(), // Stripe event ID (evt_...)
    eventType: text("event_type").notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("processed_webhook_events_type_idx").on(table.eventType),
    index("processed_webhook_events_processed_at_idx").on(table.processedAt),
  ]
)

// ============================================================================
// Addons
// ============================================================================
export const addons = pgTable(
  "addons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("addons_slug_idx").on(table.slug),
  ]
)

// ============================================================================
// User Addons (tracks which addons are granted to users)
// ============================================================================
export const userAddons = pgTable(
  "user_addons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    addonSlug: text("addon_slug").notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true }).defaultNow().notNull(),
    grantedBy: uuid("granted_by").references(() => users.id, { onDelete: "set null" }),
    enabled: boolean("enabled").default(true).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [
    index("user_addons_user_id_idx").on(table.userId),
    index("user_addons_addon_slug_idx").on(table.addonSlug),
    uniqueIndex("user_addons_user_addon_idx").on(table.userId, table.addonSlug),
  ]
)

// ============================================================================
// Organization Addons (tracks which addons are granted to organizations)
// ============================================================================
export const organizationAddons = pgTable(
  "organization_addons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    addonSlug: text("addon_slug").notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true }).defaultNow().notNull(),
    grantedBy: uuid("granted_by").references(() => users.id, { onDelete: "set null" }),
    enabled: boolean("enabled").default(true).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => [
    index("organization_addons_org_id_idx").on(table.organizationId),
    index("organization_addons_addon_slug_idx").on(table.addonSlug),
    uniqueIndex("organization_addons_org_addon_idx").on(table.organizationId, table.addonSlug),
  ]
)

// ============================================================================
// Listings
// ============================================================================
export type ListingImageCategoryKey =
  | `quarto-${number}`
  | `banheiro-${number}`
  | "sala"
  | "fachada"
  | "areaExterna"

export interface ListingData {
  titulo: string
  /** When set, auto title generation is skipped; titulo mirrors this value. */
  tituloManual?: string | null
  endereco: string
  bairro?: string | null
  cidade?: string | null
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
  andar?: number | null
  tipoImovel?: "casa" | "apartamento" | null
  link: string | null
  imageUrl?: string | null
  imageUrls?: string[] | null
  imageStorageKeys?: string[] | null
  imageCoverIndex?: number | null
  imageCategories?: Record<string, ListingImageCategoryKey> | null
  imageIngestionStatus?: "idle" | "pending" | "processing" | "ready" | "failed" | null
  imageIngestionError?: string | null
  contactName?: string | null
  contactNumber?: string | null
  condominiumName?: string | null
  condominiumId?: string | null
  regionId?: string | null
  starred?: boolean
  visited?: boolean
  strikethrough?: boolean
  discardedReason?: string | null
  listingStatus?: string | null
  customLat?: number | null
  customLng?: number | null
  addedAt?: string
  sitePublishedAt?: string | null
  siteUpdatedAt?: string | null
}

export const listings = pgTable(
  "listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    data: jsonb("data").$type<ListingData>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("listings_collection_id_idx").on(table.collectionId),
  ]
)

export type ListingAnalysisStatus = "queued" | "running" | "completed" | "failed"

export interface ListingAnalysisStepError {
  reason: string
  occurredAt: string
}

export interface ListingAnalysisResult {
  schemaVersion: 6
  completedSteps: string[]
  failedSteps?: string[]
  runningSteps?: string[]
  stepErrors?: Record<string, ListingAnalysisStepError>
  clima?: Record<string, unknown>
  riscos?: Record<string, unknown>
  mercado?: Record<string, unknown>
  ambientes?: Record<string, unknown>
  idade?: Record<string, unknown>
}

export const listingAnalyses = pgTable(
  "listing_analyses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    workflowRunId: uuid("workflow_run_id"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    status: text("status").$type<ListingAnalysisStatus>().notNull().default("queued"),
    input: jsonb("input").$type<Record<string, unknown>>().notNull().default({}),
    result: jsonb("result").$type<ListingAnalysisResult | null>(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("listing_analyses_listing_id_idx").on(table.listingId),
    index("listing_analyses_user_id_idx").on(table.userId),
    index("listing_analyses_org_id_idx").on(table.orgId),
    index("listing_analyses_status_idx").on(table.status),
    index("listing_analyses_listing_status_idx").on(table.listingId, table.status),
  ]
)

// ============================================================================
// Workspace Decision Data
// ============================================================================
export const profileSourceEnum = ["manual", "listing"] as const
export type ProfileSource = (typeof profileSourceEnum)[number]

export const propertyTypeEnum = ["casa", "apartamento"] as const
export type PropertyType = (typeof propertyTypeEnum)[number]

export const savedLinks = pgTable(
  "saved_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    url: text("url").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("saved_links_user_id_idx").on(table.userId),
    index("saved_links_org_id_idx").on(table.orgId),
  ]
)

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name"),
    phone: text("phone"),
    normalizedPhone: text("normalized_phone"),
    email: text("email"),
    notes: text("notes"),
    source: text("source").$type<ProfileSource>().notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("contacts_user_id_idx").on(table.userId),
    index("contacts_org_id_idx").on(table.orgId),
    index("contacts_normalized_phone_idx").on(table.normalizedPhone),
  ]
)

export const regions = pgTable(
  "regions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    city: text("city").notNull(),
    neighborhood: text("neighborhood").notNull(),
    propertyType: text("property_type").$type<PropertyType>().notNull(),
    pricePerM2: integer("price_per_m2").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("regions_user_id_idx").on(table.userId),
    index("regions_org_id_idx").on(table.orgId),
    index("regions_lookup_idx").on(table.city, table.neighborhood, table.propertyType),
  ]
)

export const condominiums = pgTable(
  "condominiums",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    city: text("city"),
    neighborhood: text("neighborhood"),
    address: text("address"),
    propertyType: text("property_type").$type<PropertyType>(),
    amenities: jsonb("amenities").$type<string[]>().default([]),
    notes: text("notes"),
    source: text("source").$type<ProfileSource>().notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("condominiums_user_id_idx").on(table.userId),
    index("condominiums_org_id_idx").on(table.orgId),
    index("condominiums_name_idx").on(table.name),
  ]
)

export const listingComparisonNotes = pgTable(
  "listing_comparison_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    pros: jsonb("pros").$type<string[]>().default([]).notNull(),
    cons: jsonb("cons").$type<string[]>().default([]).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("listing_comparison_notes_listing_id_idx").on(table.listingId),
  ]
)

// ============================================================================
// Relations
// ============================================================================
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  subscriptions: many(subscriptions),
  grantedSubscriptions: many(subscriptions, { relationName: "grantedBy" }),
  ownedOrganizations: many(organizations),
  organizationMemberships: many(organizationMembers),
  collections: many(collections),
  userAddons: many(userAddons),
  savedLinks: many(savedLinks),
  contacts: many(contacts),
  regions: many(regions),
  condominiums: many(condominiums),
  grantedUserAddons: many(userAddons, { relationName: "grantedBy" }),
  grantedOrganizationAddons: many(organizationAddons, { relationName: "grantedBy" }),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

export const plansRelations = relations(plans, ({ many }) => ({
  subscriptions: many(subscriptions),
}))

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  plan: one(plans, {
    fields: [subscriptions.planId],
    references: [plans.id],
  }),
  grantedByUser: one(users, {
    fields: [subscriptions.grantedBy],
    references: [users.id],
    relationName: "grantedBy",
  }),
}))

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  owner: one(users, {
    fields: [organizations.ownerId],
    references: [users.id],
  }),
  members: many(organizationMembers),
  collections: many(collections),
  organizationAddons: many(organizationAddons),
  savedLinks: many(savedLinks),
  contacts: many(contacts),
  regions: many(regions),
  condominiums: many(condominiums),
}))

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.orgId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
}))

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  user: one(users, {
    fields: [collections.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [collections.orgId],
    references: [organizations.id],
  }),
  listings: many(listings),
}))

export const listingShortLinks = pgTable(
  "listing_short_links",
  {
    shortId: text("short_id").primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("listing_short_links_listing_id_idx").on(table.listingId),
    index("listing_short_links_collection_id_idx").on(table.collectionId),
  ]
)

export const listingsRelations = relations(listings, ({ one }) => ({
  collection: one(collections, {
    fields: [listings.collectionId],
    references: [collections.id],
  }),
  comparisonNotes: one(listingComparisonNotes, {
    fields: [listings.id],
    references: [listingComparisonNotes.listingId],
  }),
  shortLink: one(listingShortLinks, {
    fields: [listings.id],
    references: [listingShortLinks.listingId],
  }),
}))

export const listingShortLinksRelations = relations(listingShortLinks, ({ one }) => ({
  listing: one(listings, {
    fields: [listingShortLinks.listingId],
    references: [listings.id],
  }),
  collection: one(collections, {
    fields: [listingShortLinks.collectionId],
    references: [collections.id],
  }),
}))

export const savedLinksRelations = relations(savedLinks, ({ one }) => ({
  user: one(users, {
    fields: [savedLinks.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [savedLinks.orgId],
    references: [organizations.id],
  }),
}))

export const contactsRelations = relations(contacts, ({ one }) => ({
  user: one(users, {
    fields: [contacts.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [contacts.orgId],
    references: [organizations.id],
  }),
}))

export const regionsRelations = relations(regions, ({ one }) => ({
  user: one(users, {
    fields: [regions.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [regions.orgId],
    references: [organizations.id],
  }),
}))

export const condominiumsRelations = relations(condominiums, ({ one }) => ({
  user: one(users, {
    fields: [condominiums.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [condominiums.orgId],
    references: [organizations.id],
  }),
}))

export const listingComparisonNotesRelations = relations(listingComparisonNotes, ({ one }) => ({
  listing: one(listings, {
    fields: [listingComparisonNotes.listingId],
    references: [listings.id],
  }),
}))

export const userAddonsRelations = relations(userAddons, ({ one }) => ({
  user: one(users, {
    fields: [userAddons.userId],
    references: [users.id],
  }),
  grantedByUser: one(users, {
    fields: [userAddons.grantedBy],
    references: [users.id],
    relationName: "grantedBy",
  }),
}))

export const organizationAddonsRelations = relations(organizationAddons, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationAddons.organizationId],
    references: [organizations.id],
  }),
  grantedByUser: one(users, {
    fields: [organizationAddons.grantedBy],
    references: [users.id],
    relationName: "grantedBy",
  }),
}))

// ============================================================================
// WhatsApp linking (Cloud API bot ↔ minha-casa user)
// ============================================================================
export const whatsappLinkCodes = pgTable(
  "whatsapp_link_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    waId: text("wa_id").notNull(),
    phone: text("phone"),
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedByUserId: uuid("consumed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    insertedAt: timestamp("inserted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("whatsapp_link_codes_code_idx").on(table.code),
    index("whatsapp_link_codes_wa_id_idx").on(table.waId),
  ]
)

export const whatsappIdentities = pgTable(
  "whatsapp_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    waId: text("wa_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    phone: text("phone"),
    linkedAt: timestamp("linked_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("whatsapp_identities_wa_id_idx").on(table.waId),
    index("whatsapp_identities_user_id_idx").on(table.userId),
  ]
)

export const whatsappLinkCodesRelations = relations(whatsappLinkCodes, ({ one }) => ({
  consumedByUser: one(users, {
    fields: [whatsappLinkCodes.consumedByUserId],
    references: [users.id],
  }),
}))

export const whatsappIdentitiesRelations = relations(whatsappIdentities, ({ one }) => ({
  user: one(users, {
    fields: [whatsappIdentities.userId],
    references: [users.id],
  }),
}))

// ============================================================================
// Telegram linking (Bot API ↔ minha-casa user)
// ============================================================================
export const telegramLinkCodes = pgTable(
  "telegram_link_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    chatId: text("chat_id").notNull(),
    telegramUserId: text("telegram_user_id"),
    status: text("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedByUserId: uuid("consumed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    insertedAt: timestamp("inserted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("telegram_link_codes_code_idx").on(table.code),
    index("telegram_link_codes_chat_id_idx").on(table.chatId),
  ]
)

export const telegramIdentities = pgTable(
  "telegram_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: text("chat_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    telegramUserId: text("telegram_user_id"),
    linkedAt: timestamp("linked_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("telegram_identities_chat_id_idx").on(table.chatId),
    index("telegram_identities_user_id_idx").on(table.userId),
  ]
)

export const telegramLinkCodesRelations = relations(telegramLinkCodes, ({ one }) => ({
  consumedByUser: one(users, {
    fields: [telegramLinkCodes.consumedByUserId],
    references: [users.id],
  }),
}))

export const telegramIdentitiesRelations = relations(telegramIdentities, ({ one }) => ({
  user: one(users, {
    fields: [telegramIdentities.userId],
    references: [users.id],
  }),
}))
