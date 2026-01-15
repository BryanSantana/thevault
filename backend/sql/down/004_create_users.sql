CREATE INDEX IF NOT EXISTS idx_drops_user_id ON drops(user_id);
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);

DROP INDEX IF EXISTS idx_users_phone_number;
DROP INDEX IF EXISTS idx_drops_user_id;
ALTER TABLE IF EXISTS drops DROP COLUMN IF EXISTS user_id;

DROP TABLE IF EXISTS users;
