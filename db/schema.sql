-- Palawan Collective — site backend schema (Neon / Postgres)
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS theme_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  site_name TEXT NOT NULL DEFAULT 'Palawan Collective',
  site_tagline TEXT NOT NULL DEFAULT 'Slow and steady runs the business.',
  logo_svg TEXT,                       -- inline SVG markup or asset path
  colors JSONB NOT NULL DEFAULT '{"sand":"#efe8da","shell":"#e5dcc9","ink":"#141414","lagoon":"#0f5257","deep":"#0a3236","coral":"#e2725b","foam":"#cfe3d8"}'::jsonb,
  fonts JSONB NOT NULL DEFAULT '{"brand":"Orbitron","serif":"Fraunces","sans":"DM Sans","hand":"Caveat"}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS site_sections (
  key TEXT PRIMARY KEY,                -- 'header','hero','footer','weight','how','tuesday','stories'
  title TEXT,
  subtitle TEXT,
  body TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS faq_items (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL DEFAULT '',
  answer TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_items (
  id SERIAL PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('image','video','audio')),
  path TEXT NOT NULL,                  -- storage path / URL
  alt TEXT,
  caption TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the singleton theme (only if absent)
INSERT INTO theme_settings (id, site_name, site_tagline)
VALUES (1, 'Palawan Collective', 'Slow and steady runs the business.')
ON CONFLICT (id) DO NOTHING;

-- Seed singleton sections (only if absent)
INSERT INTO site_sections (key, title, subtitle, sort_order, content) VALUES
  ('header', 'The weight', 'What repetitive work costs you each week', 0,
   '{"links":[{"label":"The weight","href":"#weight"},{"label":"How it works","href":"#how"},{"label":"A Tuesday","href":"#tuesday"},{"label":"Stories","href":"#stories"}],"cta":{"label":"Say hello","href":"#hello"}}'),
  ('hero', 'Your business can swim on its own.', 'psst… you look tired.', 1,
   '{"kicker":"psst… you look tired.","heading":"Your business can swim on its own.","subheading":"We take the repetitive, every-single-day work off your shoulders, so you can get back to the part you actually love. Or go to the beach. We don''t judge.","cta":{"label":"Show me how light it gets","href":"#weight"},"note":"(no jargon, promise)"}'),
  ('footer', 'Slow and steady runs the business.', '', 2,
   '{"tagline":"Slow and steady runs the business.","copyright":"© 2026 Palawan Collective","contact":"agent@merqato.digital"}')
ON CONFLICT (key) DO NOTHING;

-- Media binary storage and section publishing, safe for existing installations.
ALTER TABLE site_sections ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT true;
CREATE TABLE IF NOT EXISTS uploaded_media (
 id BIGSERIAL PRIMARY KEY,
 filename TEXT NOT NULL,
 mime_type TEXT NOT NULL,
 alt_text TEXT NOT NULL DEFAULT '',
 bytes BYTEA NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Durable inbox for postcard inquiries. This is idempotent.
CREATE TABLE IF NOT EXISTS website_leads (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  business VARCHAR(160) NOT NULL DEFAULT '',
  email VARCHAR(254) NOT NULL,
  website VARCHAR(400) NOT NULL DEFAULT '',
  handoffs JSONB NOT NULL DEFAULT '[]'::jsonb,
  weekly_load VARCHAR(40) NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  email_notified BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS website_leads_received_idx ON website_leads (submitted_at DESC);
