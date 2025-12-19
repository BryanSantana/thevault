CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE drops (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  drop_id         TEXT NOT NULL UNIQUE,     -- used in URLs + S3 prefix
  title           TEXT NOT NULL,            -- album name shown to users

  passcode_hash   TEXT NOT NULL,            -- bcrypt hash
  is_live         BOOLEAN NOT NULL DEFAULT TRUE,

  release_at      TIMESTAMPTZ,               -- optional scheduling
  expires_at      TIMESTAMPTZ,               -- optional expiration

  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
