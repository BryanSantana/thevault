CREATE TABLE media (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  drop_id       UUID NOT NULL
                REFERENCES drops(id)
                ON DELETE CASCADE,

  s3_key        TEXT NOT NULL UNIQUE,        -- exact S3 object key
  media_type    TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),

  position      INT NOT NULL,                -- ordering inside album
  caption       TEXT,

  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_media_drop_id ON media (drop_id);
CREATE INDEX idx_media_order ON media (drop_id, position);
