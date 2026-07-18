CREATE TABLE IF NOT EXISTS addons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- migrate:split
CREATE UNIQUE INDEX IF NOT EXISTS addons_slug_idx ON addons (slug);
-- migrate:split

CREATE TABLE IF NOT EXISTS user_addons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addon_slug text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  enabled boolean NOT NULL DEFAULT true,
  expires_at timestamptz
);
-- migrate:split
CREATE INDEX IF NOT EXISTS user_addons_user_id_idx ON user_addons (user_id);
-- migrate:split
CREATE INDEX IF NOT EXISTS user_addons_addon_slug_idx ON user_addons (addon_slug);
-- migrate:split
CREATE UNIQUE INDEX IF NOT EXISTS user_addons_user_addon_idx
  ON user_addons (user_id, addon_slug);
-- migrate:split

CREATE TABLE IF NOT EXISTS organization_addons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  addon_slug text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  enabled boolean NOT NULL DEFAULT true,
  expires_at timestamptz
);
-- migrate:split
CREATE INDEX IF NOT EXISTS organization_addons_org_id_idx
  ON organization_addons (organization_id);
-- migrate:split
CREATE INDEX IF NOT EXISTS organization_addons_addon_slug_idx
  ON organization_addons (addon_slug);
-- migrate:split
CREATE UNIQUE INDEX IF NOT EXISTS organization_addons_org_addon_idx
  ON organization_addons (organization_id, addon_slug);
-- migrate:split

CREATE TABLE IF NOT EXISTS saved_links (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saved_links_owner_check CHECK (
    (user_id IS NOT NULL AND org_id IS NULL) OR
    (user_id IS NULL AND org_id IS NOT NULL)
  )
);
-- migrate:split
CREATE INDEX IF NOT EXISTS saved_links_user_id_idx ON saved_links (user_id);
-- migrate:split
CREATE INDEX IF NOT EXISTS saved_links_org_id_idx ON saved_links (org_id);
-- migrate:split

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text,
  phone text,
  normalized_phone text,
  email text,
  notes text,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contacts_owner_check CHECK (
    (user_id IS NOT NULL AND org_id IS NULL) OR
    (user_id IS NULL AND org_id IS NOT NULL)
  ),
  CONSTRAINT contacts_source_check CHECK (source IN ('manual', 'listing'))
);
-- migrate:split
CREATE INDEX IF NOT EXISTS contacts_user_id_idx ON contacts (user_id);
-- migrate:split
CREATE INDEX IF NOT EXISTS contacts_org_id_idx ON contacts (org_id);
-- migrate:split
CREATE INDEX IF NOT EXISTS contacts_normalized_phone_idx ON contacts (normalized_phone);
-- migrate:split

CREATE TABLE IF NOT EXISTS regions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  city text NOT NULL,
  neighborhood text NOT NULL,
  property_type text NOT NULL,
  price_per_m2 integer NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT regions_owner_check CHECK (
    (user_id IS NOT NULL AND org_id IS NULL) OR
    (user_id IS NULL AND org_id IS NOT NULL)
  ),
  CONSTRAINT regions_property_type_check CHECK (property_type IN ('casa', 'apartamento')),
  CONSTRAINT regions_price_per_m2_check CHECK (price_per_m2 >= 0)
);
-- migrate:split
CREATE INDEX IF NOT EXISTS regions_user_id_idx ON regions (user_id);
-- migrate:split
CREATE INDEX IF NOT EXISTS regions_org_id_idx ON regions (org_id);
-- migrate:split
CREATE INDEX IF NOT EXISTS regions_lookup_idx
  ON regions (city, neighborhood, property_type);
-- migrate:split

CREATE TABLE IF NOT EXISTS condominiums (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  city text,
  neighborhood text,
  address text,
  property_type text,
  amenities jsonb DEFAULT '[]'::jsonb,
  notes text,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT condominiums_owner_check CHECK (
    (user_id IS NOT NULL AND org_id IS NULL) OR
    (user_id IS NULL AND org_id IS NOT NULL)
  ),
  CONSTRAINT condominiums_property_type_check CHECK (
    property_type IS NULL OR property_type IN ('casa', 'apartamento')
  ),
  CONSTRAINT condominiums_source_check CHECK (source IN ('manual', 'listing'))
);
-- migrate:split
CREATE INDEX IF NOT EXISTS condominiums_user_id_idx ON condominiums (user_id);
-- migrate:split
CREATE INDEX IF NOT EXISTS condominiums_org_id_idx ON condominiums (org_id);
-- migrate:split
CREATE INDEX IF NOT EXISTS condominiums_name_idx ON condominiums (name);
-- migrate:split

CREATE TABLE IF NOT EXISTS listing_comparison_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  pros jsonb NOT NULL DEFAULT '[]'::jsonb,
  cons jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- migrate:split
CREATE UNIQUE INDEX IF NOT EXISTS listing_comparison_notes_listing_id_idx
  ON listing_comparison_notes (listing_id);
-- migrate:split

INSERT INTO addons (name, slug, description)
VALUES
  ('Risco de Enchente', 'flood', 'Análise de risco de enchente com visualização 3D'),
  ('Financeiro', 'financiamento',
   'Planejamento da compra do imóvel com cenários de financiamento, reformas e fluxo mensal')
ON CONFLICT (slug) DO NOTHING;
-- migrate:split

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'saved_links', 'contacts', 'regions', 'condominiums', 'listing_comparison_notes'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I',
      'update_' || table_name || '_updated_at', table_name);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      'update_' || table_name || '_updated_at', table_name);
  END LOOP;
END
$$;
