CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  price_in_cents integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  limits jsonb DEFAULT '{"collectionsLimit": null, "listingsPerCollection": null, "aiParsesPerMonth": null, "canShare": true, "canCreateOrg": true}'::jsonb,
  stripe_price_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- migrate:split

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'active',
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  granted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  notes text,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_status text,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  last_payment_failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_status_check
    CHECK (status IN ('active', 'expired', 'cancelled'))
);
-- migrate:split

CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx ON subscriptions (user_id);
-- migrate:split
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions (status);
-- migrate:split
CREATE INDEX IF NOT EXISTS subscriptions_stripe_sub_id_idx
  ON subscriptions (stripe_subscription_id);
-- migrate:split
CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_id_idx
  ON subscriptions (stripe_customer_id);
-- migrate:split

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- migrate:split

CREATE UNIQUE INDEX IF NOT EXISTS organizations_slug_idx ON organizations (slug);
-- migrate:split
CREATE INDEX IF NOT EXISTS organizations_owner_id_idx ON organizations (owner_id);
-- migrate:split

CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_members_role_check CHECK (role IN ('owner', 'admin', 'member'))
);
-- migrate:split

CREATE UNIQUE INDEX IF NOT EXISTS organization_members_org_user_idx
  ON organization_members (org_id, user_id);
-- migrate:split
CREATE INDEX IF NOT EXISTS organization_members_user_id_idx
  ON organization_members (user_id);
-- migrate:split

CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  share_token text UNIQUE,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT collections_owner_check CHECK (
    (user_id IS NOT NULL AND org_id IS NULL) OR
    (user_id IS NULL AND org_id IS NOT NULL)
  )
);
-- migrate:split

CREATE INDEX IF NOT EXISTS collections_user_id_idx ON collections (user_id);
-- migrate:split
CREATE INDEX IF NOT EXISTS collections_org_id_idx ON collections (org_id);
-- migrate:split
CREATE UNIQUE INDEX IF NOT EXISTS collections_share_token_idx ON collections (share_token);
-- migrate:split

CREATE TABLE IF NOT EXISTS listings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- migrate:split

CREATE INDEX IF NOT EXISTS listings_collection_id_idx ON listings (collection_id);
-- migrate:split

INSERT INTO plans (name, slug, description, price_in_cents, is_active, limits)
VALUES
  ('Teste', 'teste', 'Plano de teste interno', 0, true,
   '{"collectionsLimit": null, "listingsPerCollection": null, "aiParsesPerMonth": null, "canShare": true, "canCreateOrg": true}'::jsonb),
  ('Plus', 'plus', 'Acesso completo à plataforma', 2000, true,
   '{"collectionsLimit": null, "listingsPerCollection": null, "aiParsesPerMonth": null, "canShare": true, "canCreateOrg": true}'::jsonb)
ON CONFLICT (slug) DO NOTHING;
-- migrate:split

DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
-- migrate:split
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- migrate:split
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
-- migrate:split
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- migrate:split
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
-- migrate:split
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- migrate:split
DROP TRIGGER IF EXISTS update_collections_updated_at ON collections;
-- migrate:split
CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- migrate:split
DROP TRIGGER IF EXISTS update_listings_updated_at ON listings;
-- migrate:split
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
