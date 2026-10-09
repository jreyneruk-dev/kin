-- kin — Postgres schema (Supabase free tier friendly).
-- Apply with: npm run schema  (scripts/apply-schema.ts)
--
-- Data model:
--   people   — every individual, tagged with their research cluster
--   unions   — a couple (marriage/partnership); children link to a union
--              (both carry `cluster`: 'family' is the real tree, a speculative
--               line such as 'lissanoure' is excluded from family reads)
--   children — join table: which person is a child of which union
--   facts    — typed events (birth, marriage, death, residence…) with sources
--   comments — YouTube-style threaded comments on a person or a union
--   questions— open research questions, optionally tied to a person
--   users / sessions / invites — passphrase auth, DB-backed sessions, invite codes
--   activity — the change log

CREATE TABLE IF NOT EXISTS people (
  id           SERIAL PRIMARY KEY,
  full_name    TEXT NOT NULL,
  name_note    TEXT,
  sex          TEXT CHECK (sex IN ('f', 'm', 'x')),
  birth_date   TEXT,
  birth_place  TEXT,
  death_date   TEXT,
  death_place  TEXT,
  notes        TEXT,
  living       BOOLEAN NOT NULL DEFAULT FALSE,
  created_by   TEXT NOT NULL,
  created_at   BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS unions (
  id             SERIAL PRIMARY KEY,
  partner_a      INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  partner_b      INTEGER REFERENCES people(id) ON DELETE CASCADE,
  marriage_date  TEXT,
  marriage_place TEXT,
  created_by     TEXT NOT NULL,
  created_at     BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS children (
  union_id  INTEGER NOT NULL REFERENCES unions(id) ON DELETE CASCADE,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  PRIMARY KEY (union_id, person_id)
);

CREATE TABLE IF NOT EXISTS facts (
  id         SERIAL PRIMARY KEY,
  person_id  INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  detail     TEXT NOT NULL,
  source     TEXT,
  confidence TEXT NOT NULL DEFAULT 'documented' CHECK (confidence IN ('documented', 'likely', 'guess')),
  created_by TEXT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS facts_person_idx ON facts (person_id);

-- Phase 3: images — photos, certificates and registry screengrabs on a person.
-- The blob lives in its own table so listing a person's gallery (metadata only)
-- never drags megabytes over the pooler; swapping storage for Supabase Storage
-- later means changing only image_blobs.
CREATE TABLE IF NOT EXISTS images (
  id         SERIAL PRIMARY KEY,
  person_id  INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  mime       TEXT NOT NULL CHECK (mime IN ('image/png', 'image/jpeg', 'image/webp', 'image/gif')),
  bytes      INTEGER NOT NULL,
  width      INTEGER,
  height     INTEGER,
  caption    TEXT NOT NULL DEFAULT '',
  source     TEXT NOT NULL DEFAULT '',
  added_by   TEXT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS images_person_idx ON images (person_id);

CREATE TABLE IF NOT EXISTS image_blobs (
  image_id INTEGER PRIMARY KEY REFERENCES images(id) ON DELETE CASCADE,
  data     BYTEA NOT NULL
);

CREATE TABLE IF NOT EXISTS comments (
  id         SERIAL PRIMARY KEY,
  person_id  INTEGER REFERENCES people(id) ON DELETE CASCADE,
  union_id   INTEGER REFERENCES unions(id) ON DELETE CASCADE,
  author     TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  CONSTRAINT comments_target_ck CHECK (person_id IS NOT NULL OR union_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS comments_person_idx ON comments (person_id);
CREATE INDEX IF NOT EXISTS comments_union_idx ON comments (union_id);

CREATE TABLE IF NOT EXISTS questions (
  id         SERIAL PRIMARY KEY,
  person_id  INTEGER REFERENCES people(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  detail     TEXT,
  status     TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered')),
  raised_by  TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  answered_at BIGINT
);
CREATE INDEX IF NOT EXISTS questions_status_idx ON questions (status);

CREATE TABLE IF NOT EXISTS users (
  email           TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  password_hash   TEXT NOT NULL,
  created_at      BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  email       TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  created_at  BIGINT NOT NULL,
  expires_at  BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS invites (
  code        TEXT PRIMARY KEY,
  note        TEXT,
  created_by  TEXT NOT NULL,
  created_at  BIGINT NOT NULL,
  used_by     TEXT,
  used_at     BIGINT
);

CREATE TABLE IF NOT EXISTS activity (
  id         SERIAL PRIMARY KEY,
  actor      TEXT NOT NULL,
  verb       TEXT NOT NULL,
  target     TEXT NOT NULL,
  detail     TEXT,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS activity_created_idx ON activity (created_at DESC);

-- ---- migrations (idempotent; safe to re-run) ---------------------------------

-- Phase 1: sourced facts — a source URL next to the free-text source, and a
-- coarse source type. 'negative' marks a "searched, found nothing" fact,
-- which is itself a research finding worth recording (WikiTree's pertinent
-- negative).
ALTER TABLE facts ADD COLUMN IF NOT EXISTS source_url  TEXT;
ALTER TABLE facts ADD COLUMN IF NOT EXISTS source_kind TEXT NOT NULL DEFAULT 'unspecified'
  CHECK (source_kind IN ('primary', 'secondary', 'family-lore', 'negative', 'unspecified'));

-- Phase 1: name aliases (Eileen McCartney ↔ Macartney). Simple text array;
-- search checks full_name and every alias.
ALTER TABLE people ADD COLUMN IF NOT EXISTS aliases TEXT[] NOT NULL DEFAULT '{}';

-- Phase 3c: Alive tick box — new people default to alive; it goes clear as
-- soon as a death is recorded (the API derives the flag), and can be
-- unticked by hand while a death date is still unknown.
ALTER TABLE people ALTER COLUMN living SET DEFAULT TRUE;

-- Phase 4: clusters — one database, independent research lines. 'family' is the
-- real tree; a speculative line (e.g. 'lissanoure') sits in the same tables so
-- it can be researched here, and every family-facing read excludes it by
-- default (src/lib/clusters.ts). The default backfills existing rows as family.
ALTER TABLE people ADD COLUMN IF NOT EXISTS cluster TEXT NOT NULL DEFAULT 'family';
ALTER TABLE unions ADD COLUMN IF NOT EXISTS cluster TEXT NOT NULL DEFAULT 'family';
CREATE INDEX IF NOT EXISTS people_cluster_idx ON people (cluster);
CREATE INDEX IF NOT EXISTS unions_cluster_idx ON unions (cluster);
