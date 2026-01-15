-- Drop dependent indexes first (optional, see note below)
DROP INDEX IF EXISTS idx_media_order;
DROP INDEX IF EXISTS idx_media_drop_id;

-- Drop the table
DROP TABLE IF EXISTS media;
