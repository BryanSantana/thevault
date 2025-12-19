import { db } from "../config/db.js";

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

export async function createDrop(dropId, title, passcodeHash, isPublic = false) {
  const result = await db.query(
    `
    INSERT INTO drops (drop_id, title, passcode_hash, is_live, is_public)
    VALUES ($1, $2, $3, true, $4)
    RETURNING *
    `,
    [dropId, title, passcodeHash, isPublic]
  );
  return result.rows[0];
}
