# Minha Casa - Product Requirements Document

## Overview

**Minha Casa** is a platform to help users manage real estate listings and plan their home purchase. The MVP focuses on the listings feature with user authentication and subscription management.

---

## Current State (What Already Exists)

### Technology Stack
- **Framework**: Next.js 16.0.10 (App Router)
- **Frontend**: React 19.2.1, TypeScript 5, Tailwind CSS v4
- **UI Components**: shadcn/ui (New York style), Radix UI primitives
- **Database**: Neon Database (PostgreSQL serverless) - currently only used for sharing
- **AI**: OpenAI SDK (gpt-4o-mini) - client-side API key
- **Maps**: Leaflet + Google Maps (dual provider)
- **3D**: Three.js with React Three Fiber

### Existing Pages

| Route | Feature | Status |
|-------|---------|--------|
| `/` | Landing page | Active |
| `/anuncios` | Listings parser & manager | Active (MVP focus) |
| `/casa` | Financing simulator | To be hidden |
| `/floodrisk` | 3D flood risk visualization | To be hidden |
| `/planos` | Pricing plans (static) | To be replaced |

### Listings Feature (`/anuncios`) - Current Capabilities

**AI-Powered Parsing:**
- Parse listing text using OpenAI to extract structured data
- Quick reparse for specific fields
- Full reparse with field selection

**Collection System:**
- Multiple collections support
- Create, edit, delete collections
- Default collection that cannot be deleted
- Collection selector to switch between collections

**Listings Management:**
- Full CRUD operations
- Sorting (title, m², rooms, price, price/m², date)
- Filtering (search, property type)
- Status toggles (starred, visited, strikethrough)
- Amenities tracking (pool, 24h doorman, gym, view)
- Manual editing of all fields

**Map View:**
- Dual map support (Google Maps / Leaflet)
- Clustering for nearby listings
- Geocoding via Nominatim
- Markers with popups

**Data Management:**
- Import from JSON/text
- Export collections as JSON
- URL-based sharing (compressed data)
- Database sharing (token-based, requires master password)

### Current Limitations

- **No Authentication**: Fully client-side, no user accounts
- **localStorage Only**: All data stored in browser, not synced
- **Client-side API Key**: Users must provide their own OpenAI key
- **No Organizations**: No way to share collections with teams
- **No Payments**: Plans page is static placeholder

---

## MVP Requirements

### Goals
1. Protect the platform behind user authentication
2. Sync collections to database per user
3. Enable subscription-based access (manual payment confirmation)
4. Support organizations for collection sharing
5. Hide non-MVP features behind feature flags

### Non-Goals (Out of Scope for MVP)
- Automated payment gateway integration
- OAuth providers (Google, GitHub)
- Financing simulator feature
- Flood forecast feature
- Mobile app

---

## Feature Specifications

### 1. Feature Flags

**Purpose**: Hide incomplete features without removing code.

**Flags:**
| Flag | Default | Description |
|------|---------|-------------|
| `financingSimulator` | `false` | Hide `/casa` route |
| `floodForecast` | `false` | Hide `/floodrisk` route |
| `organizations` | `true` | Enable organizations feature |
| `publicCollections` | `true` | Enable public collection sharing |

**Behavior:**
- Hidden routes redirect to home page
- Navigation links removed for hidden features
- Feature flag config in `lib/feature-flags.ts`

---

### 2. Authentication (BetterAuth)

**Provider**: BetterAuth with Neon Database adapter

**Auth Methods:**
- Email/password only (MVP)

**User Fields:**
- `id`: Unique identifier
- `email`: Unique email address
- `name`: Display name
- `password_hash`: Encrypted password
- `is_admin`: Admin flag for admin panel access
- `created_at`: Registration timestamp
- `updated_at`: Last update timestamp

**Auth Pages:**
- `/login` - Email/password login form
- `/signup` - Registration form with name, email, password

**Protected Routes:**
- All routes except `/login`, `/signup`, `/api/auth/*`
- Unauthenticated users redirected to `/login`
- Users without active subscription redirected to `/assinar`

---

### 3. Subscription Plans

**Plan Types:**

| Plan | Price | Description | Assignment |
|------|-------|-------------|------------|
| Teste | Free | Internal testing | Admin manual |
| Plus | R$20/month | Full access | Admin manual (after payment confirmation) |

**Subscription Fields:**
- `id`: Unique identifier
- `user_id`: Owner of subscription
- `plan_id`: Reference to plan
- `status`: `active`, `expired`, `cancelled`
- `starts_at`: Subscription start date
- `expires_at`: Subscription end date
- `granted_by`: Admin who granted access
- `notes`: Admin notes (e.g., payment reference)

**Plan Limits (Future-Ready):**
```json
{
  "collections_limit": null,
  "listings_per_collection": null,
  "ai_parses_per_month": null,
  "can_share": true,
  "can_create_org": true
}
```

**Subscribe Page (`/assinar`):**
- Display available plans with pricing
- Show current subscription status
- Instructions for manual payment
- Contact information for admin

---

### 4. Collections (Server-Synced)

**Migration from localStorage:**
- Collections stored in Neon Database
- Linked to user account
- Real-time sync across devices

**Collection Fields:**
- `id`: Unique identifier
- `user_id`: Owner (null if org-owned)
- `org_id`: Organization owner (null if user-owned)
- `name`: Collection name
- `is_public`: Public visibility flag
- `share_token`: Unique token for sharing
- `is_default`: Default collection flag
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

**Listing Fields:**
- `id`: Unique identifier
- `collection_id`: Parent collection
- `data`: JSON blob with all listing data
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

**API Endpoints:**
- `GET /api/collections` - List user's collections
- `POST /api/collections` - Create collection
- `GET /api/collections/[id]` - Get collection with listings
- `PUT /api/collections/[id]` - Update collection
- `DELETE /api/collections/[id]` - Delete collection
- `POST /api/listings` - Add listing (with AI parsing)
- `PUT /api/listings/[id]` - Update listing
- `DELETE /api/listings/[id]` - Delete listing

---

### 5. AI Parsing (Server-Side)

**Migration:**
- Move OpenAI API key from client localStorage to server environment variable
- Remove API key input from Settings modal
- All AI parsing done server-side

**Endpoint:**
- `POST /api/ai/parse` - Parse listing text, return structured data

**Benefits:**
- Users don't need their own API key
- Centralized usage tracking
- Cost control via subscription limits (future)

---

### 6. Organizations

**Purpose**: Allow users to create teams and share collections.

**Organization Fields:**
- `id`: Unique identifier
- `name`: Organization name
- `slug`: URL-friendly unique identifier
- `owner_id`: Creator/owner user
- `created_at`: Creation timestamp

**Membership Fields:**
- `id`: Unique identifier
- `org_id`: Organization reference
- `user_id`: Member user reference
- `role`: `owner`, `admin`, `member`
- `joined_at`: Join timestamp

**Roles & Permissions:**
| Role | View Collections | Edit Collections | Manage Members | Delete Org |
|------|-----------------|------------------|----------------|------------|
| member | ✓ | ✓ | ✗ | ✗ |
| admin | ✓ | ✓ | ✓ | ✗ |
| owner | ✓ | ✓ | ✓ | ✓ |

**API Endpoints:**
- `GET /api/organizations` - List user's organizations
- `POST /api/organizations` - Create organization
- `GET /api/organizations/[id]` - Get org details
- `PUT /api/organizations/[id]` - Update org (owner only)
- `DELETE /api/organizations/[id]` - Delete org (owner only)
- `POST /api/organizations/[id]/invite` - Invite member
- `POST /api/organizations/[id]/leave` - Leave org
- `DELETE /api/organizations/[id]/members/[userId]` - Remove member

**Organization UI:**
- Organization switcher in navbar
- Organization management page (`/organizacoes`)
- Member invitation flow

---

### 7. Public/Private Collections & Sharing

**Visibility Options:**
- **Private**: Only owner (or org members) can access
- **Public**: Anyone with URL can view (read-only)

**Share Token:**
- Each collection has unique `share_token`
- Public URL format: `/s/[token]`
- Public collections viewable without login
- Private shared collections require authentication

**Sharing Scenarios:**
1. **User shares public collection**: Anyone can view via URL
2. **User shares private collection**: Only authenticated users can view
3. **Org shares collection with member**: Member gets full access
4. **User exports collection**: JSON download for backup

**Import/Export:**
- Keep existing JSON export functionality
- Import creates new collection linked to user
- Maintain backwards compatibility with existing share URLs

---

### 8. Admin Panel

**Access**: Users with `is_admin = true`

**Dashboard (`/admin`):**
- Total users count
- Active subscriptions count
- New users this month
- Subscription breakdown by plan

**User Management (`/admin/users`):**
- List all users with search
- View user details:
  - Profile information
  - Collections count
  - AI usage count
  - Subscription status
- Actions:
  - Toggle admin status
  - View user's collections
  - Manage subscription

**Subscription Management (`/admin/subscriptions`):**
- Grant subscription to user
- Extend subscription expiry
- Cancel subscription
- Add notes (e.g., payment reference)
- View subscription history

**Plan Management (`/admin/plans`):**
- List all plans
- Create new plan
- Edit plan details
- Activate/deactivate plans
- Set plan limits

---

## Database Schema

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   users     │────<│ subscriptions│>────│   plans     │
└─────────────┘     └──────────────┘     └─────────────┘
       │
       │
       ├────────────────────┬──────────────────┐
       │                    │                  │
       ▼                    ▼                  ▼
┌─────────────┐     ┌──────────────┐    ┌─────────────┐
│ collections │     │organizations │    │  sessions   │
└─────────────┘     └──────────────┘    └─────────────┘
       │                    │
       │                    │
       ▼                    ▼
┌─────────────┐     ┌──────────────────────┐
│  listings   │     │ organization_members │
└─────────────┘     └──────────────────────┘
```

---

## User Flows

### New User Registration
1. User visits `/signup`
2. Fills registration form (name, email, password)
3. Account created, redirected to `/assinar`
4. User contacts admin for subscription
5. Admin grants subscription via admin panel
6. User can now access `/anuncios`

### Existing User Login
1. User visits `/login`
2. Enters email/password
3. If subscription active → redirect to `/anuncios`
4. If subscription expired → redirect to `/assinar`

### Creating Organization
1. User clicks "Create Organization" in org switcher
2. Enters organization name
3. Organization created, user becomes owner
4. Can invite members via email
5. Org collections visible to all members

### Sharing Collection
1. User opens collection settings
2. Toggles "Public" switch
3. Copies share URL
4. Recipients can view collection:
   - Public: No login required (read-only)
   - Private: Login required

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Neon PostgreSQL connection string | Yes |
| `BETTER_AUTH_SECRET` | Secret for session encryption | Yes |
| `OPENAI_API_KEY` | Server-side OpenAI API key | Yes |
| `NEXT_PUBLIC_APP_URL` | Public app URL | Yes |

---

## Success Metrics

- User registration rate
- Active subscription conversion rate
- Collections created per user
- Listings parsed per user
- Organization creation rate
- Public collection shares

---

## Implementation Phases

### Phase 1: Foundation
- [x] Feature flags system
- [x] Database schema & migrations
- [x] BetterAuth setup

### Phase 2: Core Auth
- [x] Login/signup pages
- [x] Auth middleware
- [x] Route protection

### Phase 3: Collections Migration
- [x] Collections API
- [x] Listings API
- [x] Server-side AI parsing
- [x] Frontend integration

### Phase 4: Subscriptions
- [x] Plans & subscriptions tables
- [x] Subscribe page
- [x] Subscription checks in middleware

### Phase 5: Admin Panel
- [x] Admin dashboard
- [x] User management
- [x] Subscription management

### Phase 6: Organizations
- [x] Organizations API
- [x] Member management
- [x] Shared collections
- [x] Organization UI

### Phase 7: Sharing
- [x] Public/private collections
- [x] Share page
- [x] Updated import/export

### Phase 8: Polish
- [x] Testing
- [x] Error handling
- [x] UI refinements
- [x] Documentation

---

## Open Questions (Resolved)

| Question | Decision |
|----------|----------|
| Payment provider? | Manual confirmation by admin |
| Auth methods? | Email/password only |
| Organizations in MVP? | Full implementation |

---

## Future Considerations (Post-MVP)

- Stripe/Mercado Pago payment integration
- Google/GitHub OAuth
- Financing simulator feature
- Flood forecast feature
- Mobile app
- Chrome extension for listing capture
- Automated usage limits enforcement
- Email notifications
- Activity audit log
