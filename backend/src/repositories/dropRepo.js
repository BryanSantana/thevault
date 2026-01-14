import { db } from "../config/db.js";

export async function ensureDropAuxColumns() {
  // Ensure analytics and owner-passcode visibility columns exist without failing if already added
  await db.query(`
    ALTER TABLE drops
    ADD COLUMN IF NOT EXISTS unlock_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS passcode_plain TEXT;
  `);
  await db.query(`
    ALTER TABLE drops
    ALTER COLUMN passcode_hash DROP NOT NULL;
  `);
}

export async function findDropByDropId(dropId) {
  const result = await db.query(
    `
    SELECT *
    FROM drops
    WHERE drop_id = $1
    LIMIT 1
    `,
    [dropId]
  );
  return result.rows[0] ?? null;
}

export async function createDrop(dropId, title, passcodeHash, isPublic = false, userId = null, passcodePlain = null) {
  const result = await db.query(
    `
    INSERT INTO drops (drop_id, title, passcode_hash, passcode_plain, is_live, is_public, user_id)
    VALUES ($1, $2, $3, $4, true, $5, $6)
    RETURNING *
    `,
    [dropId, title, passcodeHash, passcodePlain, isPublic, userId]
  );
  return result.rows[0];
}

export async function incrementUnlockCount(dropId) {
  const result = await db.query(
    `
    UPDATE drops
    SET unlock_count = COALESCE(unlock_count, 0) + 1
    WHERE drop_id = $1
    RETURNING unlock_count
    `,
    [dropId]
  );
  return result.rows[0]?.unlock_count ?? 0;
}

export async function deleteDropById(dropUuid) {
  await db.query(
    `
    DELETE FROM drops
    WHERE id = $1
    `,
    [dropUuid]
  );
}
